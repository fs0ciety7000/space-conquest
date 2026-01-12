use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set, Condition};
use serde::{Deserialize};
use serde_json::json;
use uuid::Uuid;
use rand::Rng;

use crate::{entities::{planet, user}, AppState};

#[derive(Deserialize)]
pub struct RegisterPayload {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct LoginPayload {
    pub identifier: String,
    pub password: String,
}

fn generate_random_planet_name() -> String {
    let prefixes = ["Orion", "Vega", "Terra", "Centauri", "Kepler", "Sirius", "Andromeda", "Vulcan", "Kronos"];
    let suffixes = ["Prime", "Major", "Alpha", "Beta", "Gamma", "X", "IX", "V", "Nova"];
    let mut rng = rand::thread_rng();
    let prefix = prefixes[rng.gen_range(0..prefixes.len())];
    if rng.gen_bool(0.8) {
        let suffix = suffixes[rng.gen_range(0..suffixes.len())];
        format!("{} {}", prefix, suffix)
    } else {
        let num = rng.gen_range(1..999);
        format!("{}-{}", prefix, num)
    }
}

pub async fn register_handler(
    State(state): State<AppState>,
    Json(payload): Json<RegisterPayload>,
) -> impl IntoResponse {
    if payload.username.len() < 3 || payload.password.len() < 6 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Pseudo (3+) ou mot de passe (6+) trop court"}))).into_response();
    }

    let existing_user = user::Entity::find()
        .filter(Condition::any().add(user::Column::Username.eq(&payload.username)).add(user::Column::Email.eq(&payload.email)))
        .one(&state.db).await.unwrap();

    if existing_user.is_some() {
        return (StatusCode::CONFLICT, Json(json!({"error": "Pseudo ou Email déjà utilisé"}))).into_response();
    }

    let hashed_password = hash(payload.password, DEFAULT_COST).unwrap();
    let new_user_id = Uuid::new_v4();

    let new_user = user::ActiveModel {
        id: Set(new_user_id),
        username: Set(payload.username.clone()),
        email: Set(payload.email.clone()),
        password: Set(hashed_password),
    };

    let new_planet = planet::ActiveModel {
        id: Set(Uuid::new_v4()),
        owner_id: Set(new_user_id),
        name: Set(generate_random_planet_name()),
        metal_mine_level: Set(1),
        crystal_mine_level: Set(1),
        deuterium_mine_level: Set(1),
        metal_amount: Set(2000.0),
        crystal_amount: Set(1000.0),
        deuterium_amount: Set(500.0),
        last_update: Set(Utc::now().naive_utc()),
        galaxy: Set(1),
        system: Set(rand::thread_rng().gen_range(1..=50)),
        position: Set(rand::thread_rng().gen_range(1..=12)),
        ..Default::default()
    };

    if let Err(_) = new_user.insert(&state.db).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur création User"}))).into_response();
    }
    if let Err(_) = new_planet.insert(&state.db).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur création Planète"}))).into_response();
    }

    (StatusCode::CREATED, Json(json!({"message": "Compte créé", "user_id": new_user_id}))).into_response()
}

pub async fn login_handler(
    State(state): State<AppState>,
    Json(payload): Json<LoginPayload>,
) -> impl IntoResponse {
    let user = match user::Entity::find()
        .filter(Condition::any().add(user::Column::Username.eq(&payload.identifier)).add(user::Column::Email.eq(&payload.identifier)))
        .one(&state.db).await.unwrap() 
    {
        Some(u) => u,
        None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Identifiants incorrects"}))).into_response(),
    };

    if !verify(&payload.password, &user.password).unwrap_or(false) {
        return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Identifiants incorrects"}))).into_response();
    }

    let planet = planet::Entity::find().filter(planet::Column::OwnerId.eq(user.id)).one(&state.db).await.unwrap();
    let planet_id = match planet {
        Some(p) => p.id,
        None => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Aucune planète trouvée"}))).into_response(),
    };

    // --- ICI : On renvoie le user_id ---
    (StatusCode::OK, Json(json!({
        "token": "fake-jwt-token",
        "planet_id": planet_id,
        "user_id": user.id, 
        "username": user.username,
        "email": user.email
    }))).into_response()
}