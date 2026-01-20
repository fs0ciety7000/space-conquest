use actix_web::{web, HttpResponse, HttpRequest};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set, DbErr};
use chrono::{Utc, Duration};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::auth::verify_token;
use crate::entities::{prelude::*, planet, sabotage_effect};
use crate::AppState;
use crate::messaging::create_message;

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
pub async fn attempt_sabotage(
    state: web::Data<AppState>,
    req: HttpRequest,
    payload: web::Json<SabotagePayload>,
) -> HttpResponse {
    // Vérifier l'authentification
    let user_id = match verify_token(&req, &state.db).await {
        Ok(id) => id,
        Err(_) => return HttpResponse::Unauthorized().json(json!({"error": "Non authentifié"})),
    };

    let target_planet_id = match Uuid::parse_str(&payload.target_planet_id) {
        Ok(id) => id,
        Err(_) => return HttpResponse::BadRequest().json(json!({"error": "ID planète invalide"})),
    };

    // Récupérer la planète cible
    let target_planet = match Planet::find_by_id(target_planet_id)
        .one(&state.db)
        .await
    {
        Ok(Some(p)) => p,
        Ok(None) => return HttpResponse::NotFound().json(json!({"error": "Planète non trouvée"})),
        Err(_) => return HttpResponse::InternalServerError().json(json!({"error": "Erreur DB"})),
    };

    // Empêcher de se saboter soi-même
    if target_planet.user_id == user_id {
        return HttpResponse::BadRequest().json(json!({"error": "Impossible de vous saboter vous-même"}));
    }

    // Récupérer la planète de l'attaquant (première planète trouvée)
    let attacker_planet = match Planet::find()
        .filter(planet::Column::UserId.eq(user_id))
        .one(&state.db)
        .await
    {
        Ok(Some(p)) => p,
        Ok(None) => return HttpResponse::NotFound().json(json!({"error": "Aucune planète trouvée"})),
        Err(_) => return HttpResponse::InternalServerError().json(json!({"error": "Erreur DB"})),
    };

    // Vérifier la différence de tech espionnage
    let attacker_spy_level = attacker_planet.espionage_tech_level.unwrap_or(0);
    let defender_spy_level = target_planet.espionage_tech_level.unwrap_or(0);
    let tech_difference = attacker_spy_level - defender_spy_level;

    if tech_difference < 1 {
        return HttpResponse::BadRequest().json(json!({
            "error": "Avantage technologique insuffisant",
            "required": "Niveau espionnage supérieur d'au moins 1"
        }));
    }

    // Calculer la probabilité de détection
    // Base: 30%, -5% par niveau de différence (minimum 5%)
    let detection_chance = (30.0 - (tech_difference as f64 * 5.0)).max(5.0);
    let detected = rand::random::<f64>() * 100.0 < detection_chance;

    // Si détecté
    if detected {
        // Envoyer notification à la victime
        let message = format!(
            "⚠️ ALERTE SÉCURITÉ: Une sonde ennemie a été détectée en train de tenter un sabotage sur votre planète {}. L'intrus a été identifié!",
            target_planet.name
        );

        let _ = create_message(
            &state.db,
            "SYSTEM",
            &target_planet.user_id.to_string(),
            &message,
        ).await;

        // TODO: Accorder Casus Belli (implémenter dans une table dédiée)

        return HttpResponse::Ok().json(SabotageResponse {
            success: false,
            detected: true,
            message: "Sabotage détecté ! Votre sonde a été identifiée et la cible a été alertée.".to_string(),
            casus_belli: Some(true),
        });
    }

    // Sabotage réussi, non détecté
    let effect_duration = match payload.action_type.as_str() {
        "disable_mine" => 3600, // 1 heure en secondes
        "steal_tech" => 86400 * 7, // 7 jours (jusqu'à utilisation)
        _ => return HttpResponse::BadRequest().json(json!({"error": "Type d'action invalide"})),
    };

    let expires_at = Utc::now() + Duration::seconds(effect_duration);

    // Créer l'effet de sabotage
    let sabotage_id = Uuid::new_v4();
    let sabotage_model = sabotage_effect::ActiveModel {
        id: Set(sabotage_id),
        target_planet_id: Set(target_planet_id),
        attacker_user_id: Set(Some(user_id)), // Stocké mais pas révélé
        effect_type: Set(payload.action_type.clone()),
        created_at: Set(Utc::now()),
        expires_at: Set(expires_at),
        was_detected: Set(false),
        metadata: Set(None),
    };

    if let Err(_) = sabotage_model.insert(&state.db).await {
        return HttpResponse::InternalServerError().json(json!({"error": "Échec de l'application du sabotage"}));
    }

    // Message de succès selon le type
    let success_message = match payload.action_type.as_str() {
        "disable_mine" => "Sabotage réussi ! Une mine ennemie a été désactivée (-50% production pendant 1h).",
        "steal_tech" => "Espionnage industriel réussi ! Vous avez volé des données techniques (-20% temps recherche suivante).",
        _ => "Sabotage réussi",
    };

    // Notification non détaillée à la victime (pour disable_mine seulement)
    if payload.action_type == "disable_mine" {
        let _ = create_message(
            &state.db,
            "SYSTEM",
            &target_planet.user_id.to_string(),
            &format!("⚠️ ANOMALIE: Production réduite détectée sur {}. Cause inconnue.", target_planet.name),
        ).await;
    }

    HttpResponse::Ok().json(SabotageResponse {
        success: true,
        detected: false,
        message: success_message.to_string(),
        casus_belli: None,
    })
}

/// Récupérer les sabotages actifs sur une planète
pub async fn get_active_sabotages(
    state: web::Data<AppState>,
    req: HttpRequest,
    planet_id: web::Path<String>,
) -> HttpResponse {
    // Vérifier l'authentification
    let user_id = match verify_token(&req, &state.db).await {
        Ok(id) => id,
        Err(_) => return HttpResponse::Unauthorized().json(json!({"error": "Non authentifié"})),
    };

    let planet_uuid = match Uuid::parse_str(&planet_id) {
        Ok(id) => id,
        Err(_) => return HttpResponse::BadRequest().json(json!({"error": "ID invalide"})),
    };

    // Vérifier que la planète appartient à l'utilisateur
    let planet = match Planet::find_by_id(planet_uuid).one(&state.db).await {
        Ok(Some(p)) if p.user_id == user_id => p,
        Ok(Some(_)) => return HttpResponse::Forbidden().json(json!({"error": "Accès refusé"})),
        Ok(None) => return HttpResponse::NotFound().json(json!({"error": "Planète non trouvée"})),
        Err(_) => return HttpResponse::InternalServerError().json(json!({"error": "Erreur DB"})),
    };

    // Récupérer les effets actifs non expirés
    let now = Utc::now();
    let active_effects = match SabotageEffect::find()
        .filter(sabotage_effect::Column::TargetPlanetId.eq(planet_uuid))
        .filter(sabotage_effect::Column::ExpiresAt.gt(now))
        .all(&state.db)
        .await
    {
        Ok(effects) => effects,
        Err(_) => return HttpResponse::InternalServerError().json(json!({"error": "Erreur DB"})),
    };

    HttpResponse::Ok().json(json!({
        "sabotages": active_effects,
    }))
}

/// Nettoyer les sabotages expirés (à appeler périodiquement ou à chaque calcul de production)
pub async fn cleanup_expired_sabotages(db: &sea_orm::DatabaseConnection) -> Result<u64, DbErr> {
    let now = Utc::now();

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
    let now = Utc::now();

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
    let now = Utc::now();

    // Trouver un effet steal_tech actif pour cet utilisateur (sur n'importe quelle planète)
    let planets = Planet::find()
        .filter(planet::Column::UserId.eq(user_id))
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
