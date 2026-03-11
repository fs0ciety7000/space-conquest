use axum::{
    extract::{Path, State},
    http::{StatusCode, HeaderMap},
    response::{IntoResponse, Json},
};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, Set, DbErr, PaginatorTrait, Condition, TransactionTrait};
use chrono::{Utc, Duration};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::entities::{prelude::*, planet, user, sabotage_effect, casus_belli, combat_log, construction_queue};
use crate::AppState;

/// Helper: extraire user_id depuis le header Authorization
fn extract_user_id_from_headers(headers: &HeaderMap) -> Result<Uuid, StatusCode> {
    let auth_header = headers
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // Format: "Bearer jwt-{uuid}"
    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // Token format: "jwt-{uuid}"
    let user_id = token
        .strip_prefix("jwt-")
        .and_then(|id| Uuid::parse_str(id).ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    Ok(user_id)
}

#[derive(Deserialize)]
pub struct SabotagePayload {
    pub target_planet_id: String,
    pub action_type: String, // "disable_mine", "steal_tech", "jam_construction", "steal_credits", "corrupt_fleet", "sabotage_research", "planet_lock"
    pub mine_target: Option<String>, // Pour "disable_mine" : "metal_mine" | "crystal_mine" | "deuterium_mine"
}

#[derive(Serialize)]
pub struct SabotageResponse {
    pub success: bool,
    pub detected: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub casus_belli: Option<bool>,
}

/// Calcule la probabilité de détection selon le type d'effet et l'avantage tech (BE-2)
pub fn detection_prob_for_effect(effect_type: &str, tech_diff_eff: i32) -> f64 {
    let p_base: f64 = match effect_type {
        "disable_mine"      => 0.25,
        "jam_construction"  => 0.20,
        "steal_credits"     => 0.35,
        "corrupt_fleet"     => 0.40,
        "steal_tech"        => 0.25,
        "sabotage_research" => 0.30,
        "planet_lock"       => 0.60,
        "blackout"          => 0.70,
        _                   => 0.30,
    };
    let adjusted = p_base * (1.0 - tech_diff_eff as f64 * 0.12);
    adjusted.clamp(0.05, 0.95)
}

/// Endpoint pour tenter une action de sabotage
/// POST /sabotage
pub async fn attempt_sabotage(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<SabotagePayload>,
) -> impl IntoResponse {
    // Vérifier l'authentification
    let user_id = match extract_user_id_from_headers(&headers) {
        Ok(id) => id,
        Err(status) => return (status, Json(json!({"error": "Non authentifié"}))).into_response(),
    };

    let target_planet_id = match Uuid::parse_str(&payload.target_planet_id) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error": "ID planète invalide"}))).into_response(),
    };

    // Valider le type d'action (Sprint 3)
    let valid_actions = [
        "disable_mine", "steal_tech", "jam_construction",
        "steal_credits", "corrupt_fleet", "sabotage_research", "planet_lock",
    ];
    if !valid_actions.contains(&payload.action_type.as_str()) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Type d'action invalide"}))).into_response();
    }

    // Récupérer la planète cible
    let target_planet = match Planet::find_by_id(target_planet_id)
        .one(&state.db)
        .await
    {
        Ok(Some(p)) => p,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète non trouvée"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response(),
    };

    // Empêcher de se saboter soi-même
    if target_planet.owner_id == user_id {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Impossible de vous saboter vous-même"}))).into_response();
    }

    // Récupérer la planète de l'attaquant (première planète trouvée)
    let attacker_planet = match Planet::find()
        .filter(planet::Column::OwnerId.eq(user_id))
        .one(&state.db)
        .await
    {
        Ok(Some(p)) => p,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Aucune planète trouvée"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response(),
    };

    // Récupérer le nom d'utilisateur de l'attaquant pour les notifications et le cooldown
    let attacker_user = match User::find_by_id(user_id).one(&state.db).await {
        Ok(Some(u)) => u,
        _ => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Utilisateur non trouvé"}))).into_response(),
    };

    // Récupérer les niveaux d'espionnage pour la détection dynamique (BE-2)
    let att_espionage_level = crate::tech_tree::get_planet_tech_level(&state.db, attacker_planet.id, "espionage_tech")
        .await.unwrap_or(0);
    let def_espionage_level = crate::tech_tree::get_planet_tech_level(&state.db, target_planet_id, "espionage_tech")
        .await.unwrap_or(0);
    let tech_diff_eff = att_espionage_level - def_espionage_level;

    // Vérification niveau espionnage requis (Sprint 3 — BE-8)
    let required_spy_level: i32 = match payload.action_type.as_str() {
        "disable_mine" | "jam_construction"                                                  => 5,
        "steal_credits" | "corrupt_fleet" | "steal_tech" | "sabotage_research"              => 8,
        "planet_lock"                                                                        => 13,
        _                                                                                    => 99,
    };
    if att_espionage_level < required_spy_level {
        return (StatusCode::FORBIDDEN, Json(json!({
            "error": format!("Espionnage niveau {} requis", required_spy_level)
        }))).into_response();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COOLDOWN SABOTAGE - configurable, par paire attaquant/planète cible
    // Exceptions : contre-attaque en combat du défenseur
    // ═══════════════════════════════════════════════════════════════════════════
    let sabotage_cooldown_hours = state.config.read().unwrap().get_config("sabotage_cooldown_hours", 2.0) as i64;
    let now_dt = Utc::now().naive_utc();

    let existing_cooldown = SabotageEffect::find()
        .filter(sabotage_effect::Column::AttackerUserId.eq(user_id))
        .filter(sabotage_effect::Column::TargetPlanetId.eq(target_planet_id))
        .filter(sabotage_effect::Column::EffectType.eq("sabotage_cooldown"))
        .filter(sabotage_effect::Column::ExpiresAt.gt(now_dt))
        .one(&state.db)
        .await
        .unwrap_or(None);

    if let Some(ref cooldown) = existing_cooldown {
        // Exception : le défenseur a contre-attaqué en combat depuis la mise en place du cooldown
        let defender_user = User::find_by_id(target_planet.owner_id)
            .one(&state.db).await.unwrap_or(None)
            .map(|u| u.username).unwrap_or_default();

        let counter = CombatLog::find()
            .filter(combat_log::Column::PlanetId.eq(attacker_planet.id))
            .filter(combat_log::Column::OpponentUsername.eq(&defender_user))
            .filter(combat_log::Column::MissionType.eq("defense"))
            .filter(combat_log::Column::Date.gt(cooldown.created_at))
            .count(&state.db)
            .await
            .unwrap_or(0);

        if counter == 0 {
            let remaining = cooldown.expires_at - now_dt;
            let hours = remaining.num_hours().max(0);
            let minutes = (remaining.num_minutes().max(0)) % 60;
            return (StatusCode::TOO_MANY_REQUESTS, Json(json!({
                "error": format!("Délai de sabotage non écoulé. Prochain créneau dans {}h {}min.", hours, minutes),
                "cooldown_remaining_minutes": remaining.num_minutes().max(0)
            }))).into_response();
        }

        // Contre-attaque détectée : supprimer l'ancien cooldown et autoriser
        let _ = SabotageEffect::delete_by_id(cooldown.id).exec(&state.db).await;
    }

    // Insérer le marqueur de cooldown (couvre cet essai, qu'il réussisse ou soit détecté)
    let _ = sabotage_effect::ActiveModel {
        id: Set(Uuid::new_v4()),
        target_planet_id: Set(target_planet_id),
        attacker_user_id: Set(Some(user_id)),
        effect_type: Set("sabotage_cooldown".to_string()),
        created_at: Set(now_dt),
        expires_at: Set(now_dt + Duration::hours(sabotage_cooldown_hours)),
        was_detected: Set(false),
        metadata: Set(None),
    }.insert(&state.db).await;

    // Détection dynamique selon type et avantage tech (BE-2)
    let p_detect = detection_prob_for_effect(&payload.action_type, tech_diff_eff);
    let detected = rand::random::<f64>() < p_detect;

    // Si détecté
    if detected {
        // Accorder Casus Belli à la victime (avec type "sabotage_detected")
        if let Err(e) = grant_casus_belli(&state.db, target_planet.owner_id, user_id, "sabotage_detected").await {
            eprintln!("Erreur lors de l'attribution du Casus Belli: {:?}", e);
        }

        // Notifier via WebSocket: sabotage détecté + casus belli accordé
        if let Some(ref ws) = state.ws {
            let reason = format!("Sabotage détecté sur planète {}", target_planet.name);
            crate::websocket::notify_sabotage_detected(
                ws,
                target_planet.owner_id,
                &attacker_user.username,
                &target_planet.name,
                &payload.action_type,
            ).await;

            crate::websocket::notify_casus_belli_granted(
                ws,
                target_planet.owner_id,
                &attacker_user.username,
                &reason,
            ).await;
        }

        return (StatusCode::OK, Json(SabotageResponse {
            success: false,
            detected: true,
            message: "Sabotage détecté ! Votre sonde a été identifiée et la cible a été alertée.".to_string(),
            casus_belli: Some(true),
        })).into_response();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDATION SPÉCIFIQUE PAR TYPE + EFFETS INSTANTANÉS (Sprint 3)
    // ═══════════════════════════════════════════════════════════════════════════

    // disable_mine : valider mine_target (BE-3)
    if payload.action_type == "disable_mine" {
        let mine = payload.mine_target.as_deref().unwrap_or("");
        if !["metal_mine", "crystal_mine", "deuterium_mine"].contains(&mine) {
            return (StatusCode::BAD_REQUEST, Json(json!({
                "error": "mine_target doit être 'metal_mine', 'crystal_mine' ou 'deuterium_mine'"
            }))).into_response();
        }
    }

    // jam_construction : vérifier qu'il y a une construction en cours (BE-8)
    if payload.action_type == "jam_construction" {
        use crate::entities::prelude::ConstructionQueue;
        use crate::entities::construction_queue as cq;
        let has_queue = ConstructionQueue::find()
            .filter(cq::Column::PlanetId.eq(target_planet_id))
            .count(&state.db)
            .await
            .unwrap_or(0);
        if has_queue == 0 {
            return (StatusCode::UNPROCESSABLE_ENTITY, Json(json!({
                "error": "La cible n'a aucune construction en cours"
            }))).into_response();
        }
    }

    // steal_credits : effet instantané — transférer 10-30% des crédits Syndicat (BE-8)
    if payload.action_type == "steal_credits" {
        let victim_user = match User::find_by_id(target_planet.owner_id).one(&state.db).await {
            Ok(Some(u)) => u,
            _ => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response(),
        };
        if victim_user.syndicate_credits <= 0.0 {
            return (StatusCode::BAD_REQUEST, Json(json!({
                "error": "La cible n'a pas de crédits Syndicat"
            }))).into_response();
        }
        let stolen_pct = 0.10 + rand::random::<f64>() * 0.20;
        let stolen_amount = (victim_user.syndicate_credits * stolen_pct).round();

        let attacker_id_copy = user_id;
        let victim_id_copy = target_planet.owner_id;
        let stolen = stolen_amount;

        let txn_result = state.db.transaction::<_, (), sea_orm::DbErr>(|txn| {
            Box::pin(async move {
                // Déduire les crédits de la victime
                let victim_model = User::find_by_id(victim_id_copy).one(txn).await?
                    .ok_or(sea_orm::DbErr::RecordNotFound("victim user".to_string()))?;
                let mut victim_active: user::ActiveModel = victim_model.into();
                victim_active.syndicate_credits = Set(
                    (victim_active.syndicate_credits.as_ref() - stolen).max(0.0)
                );
                victim_active.update(txn).await?;

                // Créditer l'attaquant
                let att_model = User::find_by_id(attacker_id_copy).one(txn).await?
                    .ok_or(sea_orm::DbErr::RecordNotFound("attacker user".to_string()))?;
                let mut att_active: user::ActiveModel = att_model.into();
                att_active.syndicate_credits = Set(att_active.syndicate_credits.as_ref() + stolen);
                att_active.update(txn).await?;

                Ok(())
            })
        }).await;

        if txn_result.is_err() {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur lors du transfert de crédits"}))).into_response();
        }

        // Créer un log sans effet durable
        let _ = sabotage_effect::ActiveModel {
            id: Set(Uuid::new_v4()),
            target_planet_id: Set(target_planet_id),
            attacker_user_id: Set(Some(user_id)),
            effect_type: Set("steal_credits".to_string()),
            created_at: Set(now_dt),
            expires_at: Set(now_dt + Duration::seconds(1)),
            was_detected: Set(false),
            metadata: Set(Some(json!({ "amount": stolen_amount }))),
        }.insert(&state.db).await;

        return (StatusCode::OK, Json(SabotageResponse {
            success: true,
            detected: false,
            message: format!("Vol de crédits réussi ! Vous avez dérobé {:.0} crédits Syndicat.", stolen_amount),
            casus_belli: None,
        })).into_response();
    }

    // corrupt_fleet : effet instantané — détruire 5-15% d'une escadrille aléatoire (BE-8)
    if payload.action_type == "corrupt_fleet" {
        let ships = crate::tech_tree::get_all_planet_ship_counts(&state.db, target_planet_id)
            .await
            .unwrap_or_default();
        let non_empty: Vec<(&String, &i32)> = ships.iter().filter(|(_, &c)| c > 0).collect();
        if non_empty.is_empty() {
            return (StatusCode::BAD_REQUEST, Json(json!({
                "error": "La cible n'a aucun vaisseau"
            }))).into_response();
        }

        let idx = (rand::random::<f64>() * non_empty.len() as f64) as usize;
        let idx = idx.min(non_empty.len() - 1);
        let (ship_key, &ship_count) = non_empty[idx];
        let destroyed_pct = 0.05 + rand::random::<f64>() * 0.10;
        let destroyed = ((ship_count as f64 * destroyed_pct).floor() as i32).max(0);

        if destroyed > 0 {
            let _ = crate::tech_tree::deduct_ships(&state.db, target_planet_id, ship_key, destroyed).await;
        }

        let _ = sabotage_effect::ActiveModel {
            id: Set(Uuid::new_v4()),
            target_planet_id: Set(target_planet_id),
            attacker_user_id: Set(Some(user_id)),
            effect_type: Set("corrupt_fleet".to_string()),
            created_at: Set(now_dt),
            expires_at: Set(now_dt + Duration::seconds(1)),
            was_detected: Set(false),
            metadata: Set(Some(json!({ "ship_key": ship_key, "destroyed": destroyed }))),
        }.insert(&state.db).await;

        return (StatusCode::OK, Json(SabotageResponse {
            success: true,
            detected: false,
            message: format!("Corruption de flotte réussie ! {} {} détruits.", destroyed, ship_key),
            casus_belli: None,
        })).into_response();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EFFETS DURABLES — insérer un sabotage_effect avec expiration
    // ═══════════════════════════════════════════════════════════════════════════
    let effect_duration: i64 = match payload.action_type.as_str() {
        "disable_mine"      => 7200,       // 2h (BE-3)
        "steal_tech"        => 604800,     // 7 jours
        "jam_construction"  => 3600,       // 1h
        "sabotage_research" => 14400,      // 4h
        "planet_lock"       => 3600,       // 1h
        _                   => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Type d'action invalide"}))).into_response(),
    };

    let expires_at = now_dt + Duration::seconds(effect_duration);

    // Métadonnée pour disable_mine : quelle mine est ciblée (BE-3)
    let metadata = if payload.action_type == "disable_mine" {
        let mine = payload.mine_target.as_deref().unwrap_or("metal_mine");
        Some(json!({ "mine": mine }))
    } else {
        None
    };

    let sabotage_model = sabotage_effect::ActiveModel {
        id: Set(Uuid::new_v4()),
        target_planet_id: Set(target_planet_id),
        attacker_user_id: Set(Some(user_id)),
        effect_type: Set(payload.action_type.clone()),
        created_at: Set(now_dt),
        expires_at: Set(expires_at),
        was_detected: Set(false),
        metadata: Set(metadata),
    };

    if let Err(_) = sabotage_model.insert(&state.db).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Échec de l'application du sabotage"}))).into_response();
    }

    // Message de succès selon le type
    let success_message = match payload.action_type.as_str() {
        "disable_mine" => {
            let mine = payload.mine_target.as_deref().unwrap_or("metal_mine");
            format!("Sabotage réussi ! La {} ennemie a été désactivée (-50% production pendant 2h).", mine)
        },
        "steal_tech"        => "Espionnage industriel réussi ! Vous avez volé des données techniques (-20% temps recherche suivante).".to_string(),
        "jam_construction"  => "Sabotage réussi ! La file de construction ennemie est bloquée pendant 1h.".to_string(),
        "sabotage_research" => "Sabotage réussi ! Le temps de recherche ennemi est majoré de 40% pendant 4h.".to_string(),
        "planet_lock"       => "Sabotage réussi ! La production ennemie est totalement suspendue pendant 1h.".to_string(),
        _                   => "Sabotage réussi".to_string(),
    };

    // Notifier silencieusement la victime (sans révéler l'attaquant)
    if let Some(ref ws) = state.ws {
        let expires_str = expires_at.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
        crate::websocket::notify_sabotage_applied(
            ws,
            target_planet.owner_id,
            &target_planet.name,
            &payload.action_type,
            &expires_str,
        ).await;
    }

    (StatusCode::OK, Json(SabotageResponse {
        success: true,
        detected: false,
        message: success_message,
        casus_belli: None,
    })).into_response()
}

/// Récupérer les sabotages actifs sur une planète
/// GET /planets/:id/sabotages
pub async fn get_active_sabotages(
    Path(planet_id): Path<String>,
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Vérifier l'authentification
    let user_id = match extract_user_id_from_headers(&headers) {
        Ok(id) => id,
        Err(status) => return (status, Json(json!({"error": "Non authentifié"}))).into_response(),
    };

    let planet_uuid = match Uuid::parse_str(&planet_id) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error": "ID invalide"}))).into_response(),
    };

    // Vérifier que la planète appartient à l'utilisateur
    let _planet = match Planet::find_by_id(planet_uuid).one(&state.db).await {
        Ok(Some(p)) if p.owner_id == user_id => p,
        Ok(Some(_)) => return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"}))).into_response(),
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète non trouvée"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response(),
    };

    // Récupérer les effets actifs non expirés (excl. cooldown markers)
    let now = Utc::now().naive_utc();
    let active_effects = match SabotageEffect::find()
        .filter(sabotage_effect::Column::TargetPlanetId.eq(planet_uuid))
        .filter(sabotage_effect::Column::ExpiresAt.gt(now))
        .filter(sabotage_effect::Column::EffectType.ne("sabotage_cooldown"))
        .all(&state.db)
        .await
    {
        Ok(effects) => effects,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response(),
    };

    (StatusCode::OK, Json(json!({
        "sabotages": active_effects,
    }))).into_response()
}

/// Nettoyer les sabotages expirés (à appeler périodiquement ou à chaque calcul de production)
pub async fn cleanup_expired_sabotages(db: &sea_orm::DatabaseConnection) -> Result<u64, DbErr> {
    let now = Utc::now().naive_utc();

    let result = SabotageEffect::delete_many()
        .filter(sabotage_effect::Column::ExpiresAt.lt(now))
        .exec(db)
        .await?;

    Ok(result.rows_affected)
}

/// Vérifier si une planète a un sabotage actif d'un type spécifique
pub async fn has_active_sabotage(
    db: &sea_orm::DatabaseConnection,
    planet_id: Uuid,
    effect_type: &str,
) -> Result<bool, DbErr> {
    let now = Utc::now().naive_utc();

    let count = SabotageEffect::find()
        .filter(sabotage_effect::Column::TargetPlanetId.eq(planet_id))
        .filter(sabotage_effect::Column::EffectType.eq(effect_type))
        .filter(sabotage_effect::Column::ExpiresAt.gt(now))
        .count(db)
        .await?;

    Ok(count > 0)
}

/// Appliquer le malus de production si sabotage "disable_mine" actif
/// Retourne le multiplicateur de production (0.5 si sabotage actif, 1.0 sinon)
pub async fn get_production_multiplier(
    db: &sea_orm::DatabaseConnection,
    planet_id: Uuid,
) -> Result<f64, DbErr> {
    if has_active_sabotage(db, planet_id, "disable_mine").await? {
        Ok(0.5) // -50% production
    } else {
        Ok(1.0) // Production normale
    }
}

/// Appliquer le bonus de recherche si sabotage "steal_tech" disponible
/// Retourne le multiplicateur de temps (0.8 si bonus actif, 1.0 sinon)
/// ET supprime l'effet après utilisation
pub async fn apply_research_bonus(
    db: &sea_orm::DatabaseConnection,
    user_id: Uuid,
) -> Result<f64, DbErr> {
    let now = Utc::now().naive_utc();

    // Trouver un effet steal_tech actif pour cet utilisateur (sur n'importe quelle planète)
    let planets = Planet::find()
        .filter(planet::Column::OwnerId.eq(user_id))
        .all(db)
        .await?;

    for planet in planets {
        let effect = SabotageEffect::find()
            .filter(sabotage_effect::Column::TargetPlanetId.eq(planet.id))
            .filter(sabotage_effect::Column::EffectType.eq("steal_tech"))
            .filter(sabotage_effect::Column::ExpiresAt.gt(now))
            .one(db)
            .await?;

        if let Some(steal_tech_effect) = effect {
            // Supprimer l'effet (consommé)
            SabotageEffect::delete_by_id(steal_tech_effect.id)
                .exec(db)
                .await?;

            return Ok(0.8); // -20% temps de recherche
        }
    }

    Ok(1.0) // Pas de bonus
}

// ═══════════════════════════════════════════════════════════════════════════
// SYSTÈME CASUS BELLI
// ═══════════════════════════════════════════════════════════════════════════

/// Créer un casus belli quand un saboteur est détecté ou un espionnage est répété
/// victim_user_id : le joueur qui a détecté le sabotage (qui gagne le droit d'attaque)
/// aggressor_user_id : le saboteur attrapé
/// cb_type : "sabotage_detected" | "spy_harassment"
pub async fn grant_casus_belli(
    db: &sea_orm::DatabaseConnection,
    victim_user_id: Uuid,
    aggressor_user_id: Uuid,
    cb_type: &str,
) -> Result<(), DbErr> {
    // Compter les CB existants en 7j pour escalade de tension (BE-6)
    let recent_count = CasusBelli::find()
        .filter(casus_belli::Column::VictimUserId.eq(victim_user_id))
        .filter(casus_belli::Column::AggressorUserId.eq(aggressor_user_id))
        .filter(casus_belli::Column::CreatedAt.gt(Utc::now().naive_utc() - Duration::days(7)))
        .count(db)
        .await
        .unwrap_or(0);

    let (tension_level, duration_hours, is_multi_use, uses_remaining) = match recent_count {
        0 | 1 => (1i32, 48i64,  false, 1i32),
        2     => (2i32, 72i64,  true,  3i32),
        _     => (3i32, 168i64, true,  i32::MAX),
    };

    let now_dt = Utc::now().naive_utc();
    let expires_at = now_dt + Duration::hours(duration_hours);
    let reason = format!("CB niveau {} — {}", tension_level, cb_type);

    let casus_belli_model = casus_belli::ActiveModel {
        id: Set(Uuid::new_v4()),
        victim_user_id: Set(victim_user_id),
        aggressor_user_id: Set(aggressor_user_id),
        reason: Set(reason),
        created_at: Set(now_dt),
        expires_at: Set(expires_at),
        was_used: Set(false),
        tension_level: Set(tension_level),
        cb_type: Set(cb_type.to_string()),
        is_multi_use: Set(is_multi_use),
        uses_remaining: Set(uses_remaining),
    };

    casus_belli_model.insert(db).await?;

    Ok(())
}

/// Vérifier si un joueur a le droit d'attaquer un autre (casus belli actif)
/// attacker: le joueur qui veut attaquer
/// defender: le joueur ciblé
pub async fn has_casus_belli(
    db: &sea_orm::DatabaseConnection,
    attacker_user_id: Uuid,
    defender_user_id: Uuid,
) -> Result<bool, DbErr> {
    let now = Utc::now().naive_utc();

    // Le casus belli permet à la victime (victim) d'attaquer l'agresseur (aggressor)
    // Pour les multi-usage, uses_remaining > 0 (was_used reste false tant qu'il reste des usages)
    let found = CasusBelli::find()
        .filter(casus_belli::Column::VictimUserId.eq(attacker_user_id))
        .filter(casus_belli::Column::AggressorUserId.eq(defender_user_id))
        .filter(casus_belli::Column::ExpiresAt.gt(now))
        .filter(casus_belli::Column::WasUsed.eq(false))
        .one(db)
        .await?;

    Ok(found.is_some())
}

/// Marquer un casus belli comme utilisé après une attaque (supporte multi-usage)
pub async fn consume_casus_belli(
    db: &sea_orm::DatabaseConnection,
    attacker_user_id: Uuid,
    defender_user_id: Uuid,
) -> Result<(), DbErr> {
    let now = Utc::now().naive_utc();

    if let Some(cb) = CasusBelli::find()
        .filter(casus_belli::Column::VictimUserId.eq(attacker_user_id))
        .filter(casus_belli::Column::AggressorUserId.eq(defender_user_id))
        .filter(casus_belli::Column::ExpiresAt.gt(now))
        .filter(casus_belli::Column::WasUsed.eq(false))
        .one(db)
        .await?
    {
        let mut active_cb: casus_belli::ActiveModel = cb.into();
        if *active_cb.is_multi_use.as_ref() {
            let remaining = active_cb.uses_remaining.as_ref() - 1;
            active_cb.uses_remaining = Set(remaining);
            if remaining <= 0 {
                active_cb.was_used = Set(true);
            }
        } else {
            active_cb.was_used = Set(true);
            active_cb.uses_remaining = Set(0);
        }
        active_cb.update(db).await?;
    }

    Ok(())
}

/// Nettoyer les casus belli expirés (à appeler périodiquement)
pub async fn cleanup_expired_casus_belli(db: &sea_orm::DatabaseConnection) -> Result<u64, DbErr> {
    let now = Utc::now().naive_utc();

    let result = CasusBelli::delete_many()
        .filter(casus_belli::Column::ExpiresAt.lt(now))
        .exec(db)
        .await?;

    Ok(result.rows_affected)
}

/// Récupérer tous les casus belli actifs pour un joueur (qu'il peut utiliser)
pub async fn get_active_casus_belli(
    db: &sea_orm::DatabaseConnection,
    user_id: Uuid,
) -> Result<Vec<crate::entities::casus_belli::Model>, DbErr> {
    let now = Utc::now().naive_utc();

    CasusBelli::find()
        .filter(casus_belli::Column::VictimUserId.eq(user_id))
        .filter(casus_belli::Column::ExpiresAt.gt(now))
        .filter(casus_belli::Column::WasUsed.eq(false))
        .all(db)
        .await
}

// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINTS API POUR UI DASHBOARDS
// ═══════════════════════════════════════════════════════════════════════════

/// Endpoint: Récupérer tous mes sabotages actifs (sur toutes les planètes)
/// GET /sabotage/my-sabotages
pub async fn get_my_sabotages_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Vérifier l'authentification
    let user_id = match extract_user_id_from_headers(&headers) {
        Ok(id) => id,
        Err(status) => return (status, Json(json!({"error": "Non authentifié"}))).into_response(),
    };

    let now = Utc::now().naive_utc();

    // Récupérer tous les sabotages actifs que j'ai effectués (excl. cooldown markers)
    let sabotages = match SabotageEffect::find()
        .filter(sabotage_effect::Column::AttackerUserId.eq(user_id))
        .filter(sabotage_effect::Column::ExpiresAt.gt(now))
        .filter(sabotage_effect::Column::EffectType.ne("sabotage_cooldown"))
        .all(&state.db)
        .await
    {
        Ok(s) => s,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response(),
    };

    // Pour chaque sabotage, récupérer le nom de la planète cible
    let mut sabotages_with_planet_info = Vec::new();

    for sabotage in sabotages {
        let planet = match Planet::find_by_id(sabotage.target_planet_id).one(&state.db).await {
            Ok(Some(p)) => p,
            _ => continue, // Planète supprimée, skip
        };

        sabotages_with_planet_info.push(json!({
            "id": sabotage.id,
            "target_planet_id": sabotage.target_planet_id,
            "target_planet_name": planet.name,
            "target_owner_id": planet.owner_id,
            "effect_type": sabotage.effect_type,
            "created_at": sabotage.created_at,
            "expires_at": sabotage.expires_at,
            "was_detected": sabotage.was_detected,
        }));
    }

    (StatusCode::OK, Json(json!({
        "sabotages": sabotages_with_planet_info
    }))).into_response()
}

/// Endpoint: Récupérer tous mes casus belli actifs (qui je peux attaquer)
/// GET /casus-belli/active
pub async fn get_casus_belli_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Vérifier l'authentification
    let user_id = match extract_user_id_from_headers(&headers) {
        Ok(id) => id,
        Err(status) => return (status, Json(json!({"error": "Non authentifié"}))).into_response(),
    };

    // Récupérer les casus belli actifs
    let casus_belli_list = match get_active_casus_belli(&state.db, user_id).await {
        Ok(cb) => cb,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response(),
    };

    // Enrichir avec les informations de l'agresseur
    let mut casus_belli_with_info = Vec::new();

    for cb in casus_belli_list {
        let aggressor = match User::find_by_id(cb.aggressor_user_id).one(&state.db).await {
            Ok(Some(u)) => u,
            _ => continue, // Utilisateur supprimé, skip
        };

        casus_belli_with_info.push(json!({
            "id": cb.id,
            "aggressor_user_id": cb.aggressor_user_id,
            "aggressor_username": aggressor.username,
            "reason": cb.reason,
            "created_at": cb.created_at,
            "expires_at": cb.expires_at,
            "was_used": cb.was_used,
            // Champs Sprint 2 (BE-7)
            "tension_level": cb.tension_level,
            "cb_type": cb.cb_type,
            "is_multi_use": cb.is_multi_use,
            "uses_remaining": cb.uses_remaining,
        }));
    }

    (StatusCode::OK, Json(json!({
        "casus_belli": casus_belli_with_info
    }))).into_response()
}

/// Endpoint: Récupérer tous les sabotages subis (sur mes planètes)
/// GET /sabotage/suffered
pub async fn get_sabotages_suffered_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Vérifier l'authentification
    let user_id = match extract_user_id_from_headers(&headers) {
        Ok(id) => id,
        Err(status) => return (status, Json(json!({"error": "Non authentifié"}))).into_response(),
    };

    // Récupérer toutes mes planètes
    let my_planets = match Planet::find()
        .filter(planet::Column::OwnerId.eq(user_id))
        .all(&state.db)
        .await
    {
        Ok(planets) => planets,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response(),
    };

    let planet_ids: Vec<Uuid> = my_planets.iter().map(|p| p.id).collect();

    // Récupérer tous les sabotages actifs et expirés sur mes planètes (historique complet, excl. cooldown markers)
    let sabotages = match SabotageEffect::find()
        .filter(sabotage_effect::Column::TargetPlanetId.is_in(planet_ids.clone()))
        .filter(sabotage_effect::Column::EffectType.ne("sabotage_cooldown"))
        .order_by_desc(sabotage_effect::Column::CreatedAt)
        .all(&state.db)
        .await
    {
        Ok(s) => s,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response(),
    };

    // Pour chaque sabotage, récupérer les informations de l'attaquant et de la planète
    use crate::entities::prelude::User;
    let mut sabotages_with_info = Vec::new();

    for sabotage in sabotages {
        let planet = my_planets.iter().find(|p| p.id == sabotage.target_planet_id);
        let attacker = match sabotage.attacker_user_id {
            Some(attacker_id) => match User::find_by_id(attacker_id).one(&state.db).await {
                Ok(Some(u)) => u,
                _ => continue, // Utilisateur supprimé, skip
            },
            None => continue, // Pas d'attaquant, skip
        };

        let now = Utc::now().naive_utc();
        let is_active = sabotage.expires_at > now;

        sabotages_with_info.push(json!({
            "id": sabotage.id,
            "attacker_user_id": sabotage.attacker_user_id,
            "attacker_username": attacker.username,
            "target_planet_id": sabotage.target_planet_id,
            "target_planet_name": planet.map(|p| p.name.as_str()).unwrap_or("Planète inconnue"),
            "effect_type": sabotage.effect_type,
            "created_at": sabotage.created_at,
            "expires_at": sabotage.expires_at,
            "was_detected": sabotage.was_detected,
            "is_active": is_active,
        }));
    }

    (StatusCode::OK, Json(json!({
        "sabotages": sabotages_with_info
    }))).into_response()
}

// ═══════════════════════════════════════════════════════════════════════════
// EFFETS DE PRODUCTION — Sprint 3 (BE-9)
// ═══════════════════════════════════════════════════════════════════════════

/// Effets de sabotage actifs affectant la production et la construction d'une planète
pub struct SabotageProductionEffects {
    pub metal_mult: f64,
    pub crystal_mult: f64,
    pub deuterium_mult: f64,
    pub research_time_mult: f64,
    pub construction_blocked: bool,
    pub disabled_mine: Option<String>,
}

/// Calculer tous les effets de sabotage actifs sur une planète (hors cooldown markers)
pub async fn get_sabotage_effects(
    db: &sea_orm::DatabaseConnection,
    planet_id: Uuid,
) -> SabotageProductionEffects {
    let effects = SabotageEffect::find()
        .filter(sabotage_effect::Column::TargetPlanetId.eq(planet_id))
        .filter(sabotage_effect::Column::ExpiresAt.gt(Utc::now().naive_utc()))
        .filter(sabotage_effect::Column::EffectType.ne("sabotage_cooldown"))
        .all(db)
        .await
        .unwrap_or_default();

    let mut result = SabotageProductionEffects {
        metal_mult: 1.0,
        crystal_mult: 1.0,
        deuterium_mult: 1.0,
        research_time_mult: 1.0,
        construction_blocked: false,
        disabled_mine: None,
    };

    for effect in &effects {
        match effect.effect_type.as_str() {
            "disable_mine" => {
                let mine = effect
                    .metadata
                    .as_ref()
                    .and_then(|m| m["mine"].as_str().map(String::from))
                    .unwrap_or_else(|| "metal_mine".to_string());
                result.disabled_mine = Some(mine.clone());
                match mine.as_str() {
                    "metal_mine"     => result.metal_mult = 0.5,
                    "crystal_mine"   => result.crystal_mult = 0.5,
                    "deuterium_mine" => result.deuterium_mult = 0.5,
                    _ => {}
                }
            }
            "planet_lock" => {
                result.metal_mult = 0.0;
                result.crystal_mult = 0.0;
                result.deuterium_mult = 0.0;
            }
            "sabotage_research" => {
                result.research_time_mult = 1.4;
            }
            "jam_construction" => {
                result.construction_blocked = true;
            }
            _ => {}
        }
    }

    result
}
