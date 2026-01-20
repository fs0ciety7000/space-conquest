use axum::{
    extract::{Path, State},
    http::{StatusCode, HeaderMap},
    response::{IntoResponse, Json},
};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set, DbErr, PaginatorTrait};
use chrono::{Utc, Duration};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::entities::{prelude::*, planet, sabotage_effect};
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

    // Vérifier la différence de tech espionnage
    let attacker_spy_level = attacker_planet.espionage_tech_level;
    let defender_spy_level = target_planet.espionage_tech_level;
    let tech_difference = attacker_spy_level - defender_spy_level;

    if tech_difference < 1 {
        return (StatusCode::BAD_REQUEST, Json(json!({
            "error": "Avantage technologique insuffisant",
            "required": "Niveau espionnage supérieur d'au moins 1"
        }))).into_response();
    }

    // Calculer la probabilité de détection
    // Base: 30%, -5% par niveau de différence (minimum 5%)
    let detection_chance = (30.0_f64 - (tech_difference as f64 * 5.0)).max(5.0_f64);
    let detected = rand::random::<f64>() * 100.0 < detection_chance;

    // Si détecté
    if detected {
        // TODO: Envoyer notification à la victime via WebSocket ou messaging system

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
