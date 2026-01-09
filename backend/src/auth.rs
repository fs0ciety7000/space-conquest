use axum::{Json, http::StatusCode, extract::State};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sea_orm::{EntityTrait, Set, ActiveModelTrait, QueryFilter, ColumnTrait};
use uuid::Uuid;
use chrono::Utc;
use bcrypt::{DEFAULT_COST, hash, verify}; // Import bcrypt

use crate::{AppState, entities::planet};

#[derive(Deserialize)]
pub struct AuthPayload {
    pub username: String,
    pub password: String, // On reçoit le mot de passe
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub planet_id: String,
}

pub async fn register_handler(
    State(state): State<AppState>,
    Json(payload): Json<AuthPayload>,
) -> Result<Json<AuthResponse>, (StatusCode, Json<serde_json::Value>)> {
    
    // 1. Vérifier si le pseudo existe déjà
    let exists = planet::Entity::find()
        .filter(planet::Column::Name.eq(&payload.username))
        .one(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))))?;

    if exists.is_some() {
        return Err((StatusCode::CONFLICT, Json(json!({"error": "Ce commandant existe déjà"}))));
    }

    // 2. Hacher le mot de passe
    let hashed_password = hash(payload.password, DEFAULT_COST)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur sécurité"}))))?;

    // 3. Créer la planète
    let new_id = Uuid::new_v4();
    let new_planet = planet::ActiveModel {
        id: Set(new_id),
        owner_id: Set(Uuid::new_v4()),
        name: Set(payload.username),
        password: Set(hashed_password), // On stocke le hash
        metal_mine_level: Set(1),
        crystal_mine_level: Set(1),
        deuterium_mine_level: Set(1),
        last_update: Set(Utc::now().naive_utc()),
        ..Default::default()
    };

    new_planet.insert(&state.db).await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Impossible de créer la colonie"}))))?;

    // 4. Token (Simplifié : ID de la planète)
    Ok(Json(AuthResponse {
        token: "fake-jwt-token".to_string(),
        planet_id: new_id.to_string(),
    }))
}

pub async fn login_handler(
    State(state): State<AppState>,
    Json(payload): Json<AuthPayload>,
) -> Result<Json<AuthResponse>, (StatusCode, Json<serde_json::Value>)> {
    
    // 1. Chercher l'utilisateur
    let planet = planet::Entity::find()
        .filter(planet::Column::Name.eq(&payload.username))
        .one(&state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))))?
        .ok_or((StatusCode::UNAUTHORIZED, Json(json!({"error": "Commandant inconnu"}))))?;

    // 2. Vérifier le mot de passe (Hash vs Input)
    let valid = verify(payload.password, &planet.password)
        .unwrap_or(false);

    if !valid {
        return Err((StatusCode::UNAUTHORIZED, Json(json!({"error": "Mot de passe incorrect"}))));
    }

    // 3. Succès
    Ok(Json(AuthResponse {
        token: "fake-jwt-token".to_string(),
        planet_id: planet.id.to_string(),
    }))
}