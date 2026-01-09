use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
};
use jsonwebtoken::{encode, decode, Header, EncodingKey, DecodingKey, Validation};
use serde::{Serialize, Deserialize};
use serde_json::json;
use chrono::{Utc, Duration};
use uuid::Uuid;
use sea_orm::*;

// On importe AppState et entities depuis la racine du crate
use crate::AppState;
use crate::entities::planet;
use crate::entities::planet::Entity as Planet;

const JWT_SECRET: &[u8] = b"votre_cle_secrete_ultra_secure_123";

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

#[derive(Deserialize)]
pub struct AuthPayload {
    username: String,
}

pub fn create_jwt(user_id: &str) -> String {
    let expiration = Utc::now() + Duration::hours(24);
    let claims = Claims {
        sub: user_id.to_owned(),
        exp: expiration.timestamp() as usize,
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(JWT_SECRET)).unwrap()
}

pub fn validate_jwt(token: &str) -> Option<String> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(JWT_SECRET),
        &Validation::default(),
    )
    .map(|data| data.claims.sub)
    .ok()
}

pub async fn register_handler(
    State(state): State<AppState>,
    Json(payload): Json<AuthPayload>,
) -> impl IntoResponse {
    let user_id = Uuid::new_v4();
    let planet_id = Uuid::new_v4();

    let new_planet = planet::ActiveModel {
        id: Set(planet_id),
        owner_id: Set(user_id),
        name: Set(format!("Colonie de {}", payload.username)),
        metal_amount: Set(1000.0),
        crystal_amount: Set(500.0),
        last_update: Set(Utc::now().naive_utc()),
        ..Default::default()
    };

    let res = Planet::insert(new_planet).exec(&state.db).await;

    match res {
        Ok(_) => {
            let token = create_jwt(&user_id.to_string());
            (StatusCode::CREATED, Json(json!({ "token": token, "planet_id": planet_id })))
        }
        Err(e) => {
            println!("Erreur création: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Erreur création" })))
        }
    }
}

pub async fn login_handler(
    State(state): State<AppState>,
    Json(payload): Json<AuthPayload>,
) -> impl IntoResponse {
    let planet = Planet::find()
        .filter(planet::Column::Name.contains(&payload.username))
        .one(&state.db)
        .await;

    match planet {
        Ok(Some(p)) => {
            let token = create_jwt(&p.owner_id.to_string());
            (StatusCode::OK, Json(json!({ "token": token, "planet_id": p.id })))
        }
        Ok(None) => (StatusCode::UNAUTHORIZED, Json(json!({ "error": "Utilisateur inconnu" }))),
        Err(e) => {
            println!("Erreur Login: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Erreur DB" })))
        }
    }
}