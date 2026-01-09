use axum::{Json, http::StatusCode, extract::State};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sea_orm::{EntityTrait, Set, ActiveModelTrait, QueryFilter, ColumnTrait, QueryOrder};
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

    // --- CALCUL DE LA PROCHAINE POSITION LIBRE ---
    // On cherche la dernière planète créée pour savoir où se placer
    let last_planet = planet::Entity::find()
        .order_by_desc(planet::Column::Id) // Ou trier par date si tu as un champ created_at
        .one(&state.db)
        .await
        .unwrap_or(None);

    let (mut g, mut s, mut p) = (1, 1, 1);

    if let Some(last) = last_planet {
        g = last.galaxy;
        s = last.system;
        p = last.position + 1; // On prend la place suivante

        if p > 15 { // Si le système est plein (15 planètes max)
            p = 1;
            s += 1; // On passe au système suivant
        }
        if s > 499 { // Limite arbitraire de 499 systèmes par galaxie
            s = 1;
            g += 1;
        }
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

        // Attribution des coords
        galaxy: Set(g),
        system: Set(s),
        position: Set(p),


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