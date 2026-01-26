use axum::{
    extract::{Path, State},
    http::{StatusCode, HeaderMap},
    response::{IntoResponse, Json},
};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, Set, DbErr, PaginatorTrait};
use chrono::{Utc, Duration};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::entities::{prelude::*, planet, sabotage_effect};
use crate::AppState;
use crate::tech_tree;

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
    pub action_type: String, // "disable_mine" ou "steal_tech"
}

#[derive(Serialize)]
pub struct SabotageResponse {
    pub success: bool,
    pub detected: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub casus_belli: Option<bool>,
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

    // Vérifier la différence de tech espionnage (utilise le système relational tech_tree)
    let attacker_spy_level = tech_tree::get_planet_tech_level(&state.db, attacker_planet.id, "espionage")
        .await
        .unwrap_or(0);
    let defender_spy_level = tech_tree::get_planet_tech_level(&state.db, target_planet.id, "espionage")
        .await
        .unwrap_or(0);
    let tech_difference = attacker_spy_level - defender_spy_level;

    if tech_difference < 1 {
        return (StatusCode::BAD_REQUEST, Json(json!({
            "error": "Avantage technologique insuffisant",
            "required": "Niveau espionnage supérieur d'au moins 1"
        }))).into_response();
    }

    // Récupérer le nom d'utilisateur de l'attaquant pour les notifications
    let attacker_user = match User::find_by_id(user_id).one(&state.db).await {
        Ok(Some(u)) => u,
        _ => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Utilisateur non trouvé"}))).into_response(),
    };

    // Calculer la probabilité de détection
    // Base: 30%, -5% par niveau de différence (minimum 5%)
    let detection_chance = (30.0_f64 - (tech_difference as f64 * 5.0)).max(5.0_f64);
    let detected = rand::random::<f64>() * 100.0 < detection_chance;

    // Si détecté
    if detected {
        // Accorder Casus Belli à la victime
        let reason = format!("Sabotage détecté sur planète {}", target_planet.name);
        if let Err(e) = grant_casus_belli(&state.db, target_planet.owner_id, user_id, &reason).await {
            eprintln!("⚠️ Erreur lors de l'attribution du Casus Belli: {:?}", e);
        }

        // Notifier via WebSocket: sabotage détecté + casus belli accordé
        if let Some(ref ws) = state.ws {
            // 1. Notifier la victime que son système de défense a détecté un sabotage
            crate::websocket::notify_sabotage_detected(
                ws,
                target_planet_id,
                &attacker_user.username, // Nom de l'attaquant révélé car détecté
                &target_planet.name,
                &payload.action_type,
            );

            // 2. Notifier la victime qu'elle a obtenu un Casus Belli
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

    // Sabotage réussi, non détecté
    let effect_duration = match payload.action_type.as_str() {
        "disable_mine" => 3600, // 1 heure en secondes
        "steal_tech" => 86400 * 7, // 7 jours (jusqu'à utilisation)
        _ => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Type d'action invalide"}))).into_response(),
    };

    let expires_at = Utc::now().naive_utc() + Duration::seconds(effect_duration);

    // Créer l'effet de sabotage
    let sabotage_id = Uuid::new_v4();
    let sabotage_model = sabotage_effect::ActiveModel {
        id: Set(sabotage_id),
        target_planet_id: Set(target_planet_id),
        attacker_user_id: Set(Some(user_id)), // Stocké mais pas révélé
        effect_type: Set(payload.action_type.clone()),
        created_at: Set(Utc::now().naive_utc()),
        expires_at: Set(expires_at),
        was_detected: Set(false),
        metadata: Set(None),
    };

    if let Err(_) = sabotage_model.insert(&state.db).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Échec de l'application du sabotage"}))).into_response();
    }

    // Message de succès selon le type
    let success_message = match payload.action_type.as_str() {
        "disable_mine" => "Sabotage réussi ! Une mine ennemie a été désactivée (-50% production pendant 1h).",
        "steal_tech" => "Espionnage industriel réussi ! Vous avez volé des données techniques (-20% temps recherche suivante).",
        _ => "Sabotage réussi",
    };

    // TODO: Notification non détaillée à la victime (pour disable_mine seulement)
    // if payload.action_type == "disable_mine" {
    //     send_message(...);
    // }

    (StatusCode::OK, Json(SabotageResponse {
        success: true,
        detected: false,
        message: success_message.to_string(),
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

    // Récupérer les effets actifs non expirés
    let now = Utc::now().naive_utc();
    let active_effects = match SabotageEffect::find()
        .filter(sabotage_effect::Column::TargetPlanetId.eq(planet_uuid))
        .filter(sabotage_effect::Column::ExpiresAt.gt(now))
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

/// Créer un casus belli quand un saboteur est détecté
/// victim_user_id: le joueur qui a détecté le sabotage (qui gagne le droit d'attaque)
/// aggressor_user_id: le saboteur attrapé
pub async fn grant_casus_belli(
    db: &sea_orm::DatabaseConnection,
    victim_user_id: Uuid,
    aggressor_user_id: Uuid,
    reason: &str,
) -> Result<(), DbErr> {
    use crate::entities::casus_belli;

    // Durée de validité: 48 heures
    let expires_at = Utc::now().naive_utc() + Duration::hours(48);

    let casus_belli_model = casus_belli::ActiveModel {
        id: Set(Uuid::new_v4()),
        victim_user_id: Set(victim_user_id),
        aggressor_user_id: Set(aggressor_user_id),
        reason: Set(reason.to_string()),
        created_at: Set(Utc::now().naive_utc()),
        expires_at: Set(expires_at),
        was_used: Set(false),
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
    use crate::entities::{prelude::CasusBelli, casus_belli};

    let now = Utc::now().naive_utc();

    // Le casus belli permet à la victime (victim) d'attaquer l'agresseur (aggressor)
    let count = CasusBelli::find()
        .filter(casus_belli::Column::VictimUserId.eq(attacker_user_id))
        .filter(casus_belli::Column::AggressorUserId.eq(defender_user_id))
        .filter(casus_belli::Column::ExpiresAt.gt(now))
        .filter(casus_belli::Column::WasUsed.eq(false))
        .count(db)
        .await?;

    Ok(count > 0)
}

/// Marquer un casus belli comme utilisé après une attaque
pub async fn consume_casus_belli(
    db: &sea_orm::DatabaseConnection,
    attacker_user_id: Uuid,
    defender_user_id: Uuid,
) -> Result<(), DbErr> {
    use crate::entities::{prelude::CasusBelli, casus_belli};

    let now = Utc::now().naive_utc();

    // Trouver le premier casus belli actif
    if let Some(cb) = CasusBelli::find()
        .filter(casus_belli::Column::VictimUserId.eq(attacker_user_id))
        .filter(casus_belli::Column::AggressorUserId.eq(defender_user_id))
        .filter(casus_belli::Column::ExpiresAt.gt(now))
        .filter(casus_belli::Column::WasUsed.eq(false))
        .one(db)
        .await?
    {
        // Marquer comme utilisé
        let mut active_cb: casus_belli::ActiveModel = cb.into();
        active_cb.was_used = Set(true);
        active_cb.update(db).await?;
    }

    Ok(())
}

/// Nettoyer les casus belli expirés (à appeler périodiquement)
pub async fn cleanup_expired_casus_belli(db: &sea_orm::DatabaseConnection) -> Result<u64, DbErr> {
    use crate::entities::{prelude::CasusBelli, casus_belli};

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
    use crate::entities::{prelude::CasusBelli, casus_belli};

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

    // Récupérer tous les sabotages actifs que j'ai effectués
    let sabotages = match SabotageEffect::find()
        .filter(sabotage_effect::Column::AttackerUserId.eq(user_id))
        .filter(sabotage_effect::Column::ExpiresAt.gt(now))
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
    use crate::entities::prelude::User;
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

    // Récupérer tous les sabotages actifs et expirés sur mes planètes (historique complet)
    let sabotages = match SabotageEffect::find()
        .filter(sabotage_effect::Column::TargetPlanetId.is_in(planet_ids.clone()))
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
