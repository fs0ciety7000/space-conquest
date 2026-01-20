use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use axum::debug_handler;


use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set, Condition};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;
use rand::Rng;

use crate::{
    entities::{planet, user, prelude::{Planet, User}},
    missions,
    AppState
};

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

async fn find_free_slot(db: &sea_orm::DatabaseConnection, galaxy: i32) -> (i32, i32) {
    for _ in 0..100 {
        let (system, position) = {
            let mut rng = rand::thread_rng();
            (
                rng.gen_range(1..=100),
                rng.gen_range(1..=15),
            )
        };

        let occupied = Planet::find()
            .filter(planet::Column::Galaxy.eq(galaxy))
            .filter(planet::Column::System.eq(system))
            .filter(planet::Column::Position.eq(position))
            .one(db)
            .await
            .unwrap_or(None);

        if occupied.is_none() {
            return (system, position);
        }
    }

    // fallback SAFE
    {
        let mut rng = rand::thread_rng();
        (
            rng.gen_range(1..=100),
            rng.gen_range(1..=15),
        )
    }
}


fn create_jwt(user_id: String) -> String {
    format!("jwt-{}", user_id)
}


fn extract_user_id_from_token(token: &str) -> Option<Uuid> {
    // Token format: "jwt-{uuid}"
    token.strip_prefix("jwt-")
        .and_then(|id| Uuid::parse_str(id).ok())
} 

#[debug_handler]
pub async fn register_handler(
    State(state): State<AppState>,
    Json(payload): Json<RegisterPayload>,
) -> impl IntoResponse {
    // Validation
    if payload.username.is_empty() || payload.password.is_empty() || payload.email.is_empty() {
        return (
            StatusCode::BAD_REQUEST, 
            Json(json!({"error": "Tous les champs sont requis"}))
        );
    }

    // Vérifier si l'utilisateur existe déjà
    let existing_user = User::find()
        .filter(user::Column::Username.eq(&payload.username))
        .one(&state.db)
        .await
        .unwrap_or(None);

    if existing_user.is_some() {
        return (
            StatusCode::CONFLICT, 
            Json(json!({"error": "Nom d'utilisateur déjà pris"}))
        );
    }

    // Hasher le mot de passe
    let hashed = match hash(&payload.password, DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Erreur de hashage"}))
        ),
    };
    
    let user_id = Uuid::new_v4();

    // Créer l'utilisateur avec created_at = maintenant
    let new_user = user::ActiveModel {
        id: Set(user_id),
        username: Set(payload.username.clone()),
        password: Set(hashed),
        email: Set(payload.email.clone()),
        created_at: Set(Utc::now().naive_utc()),
        role: Set("user".to_string()),
    };

    if new_user.insert(&state.db).await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR, 
            Json(json!({"error": "Erreur lors de la création du compte"}))
        );
    }

    // Générer coordonnées aléatoires
    let galaxy = 1;

let (system, position) = {
    let mut rng = rand::thread_rng();
    (
        rng.gen_range(1..=100),
        rng.gen_range(1..=15),
    )
};

    // Vérifier disponibilité
    let occupied = Planet::find()
        .filter(planet::Column::Galaxy.eq(galaxy))
        .filter(planet::Column::System.eq(system))
        .filter(planet::Column::Position.eq(position))
        .one(&state.db)
        .await
        .unwrap_or(None);

    let (final_system, final_position) = if occupied.is_some() {
        find_free_slot(&state.db, galaxy).await
    } else {
        (system, position)
    };

    // Créer la planète
    let planet_id = Uuid::new_v4();
    let new_planet = planet::ActiveModel {
        id: Set(planet_id),
        owner_id: Set(user_id),
        name: Set(generate_random_planet_name()),
        password: Set("".to_string()),
        galaxy: Set(galaxy),
        system: Set(final_system),
        position: Set(final_position),
        metal_mine_level: Set(1),
        crystal_mine_level: Set(1),
        deuterium_mine_level: Set(1),
        solar_plant_level: Set(3), // Niveau 3 = ~240 énergie, garantit le minimum de 150
        shipyard_level: Set(1),
        metal_amount: Set(2000.0),
        crystal_amount: Set(1000.0),
        deuterium_amount: Set(500.0),
        last_update: Set(Utc::now().naive_utc()),
        created_at: Set(Utc::now().naive_utc()),
        ..Default::default()
    };

    if new_planet.insert(&state.db).await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Erreur lors de la création de la planète"}))
        );
    }

    // Créer les 8 slots de ressources pour la nouvelle planète
    use crate::entities::resource_slot;

    let slots_init = vec![
        (1, "metal", 1, true),
        (2, "crystal", 1, true),
        (3, "deuterium", 1, true),
        (4, "energy", 1, true),
        (5, "metal", 0, false),
        (6, "metal", 0, false),
        (7, "metal", 0, false),
        (8, "metal", 0, false),
    ];

    for (slot_num, res_type, level, is_locked) in slots_init {
        let slot = resource_slot::ActiveModel {
            planet_id: Set(planet_id),
            slot_number: Set(slot_num),
            resource_type: Set(res_type.to_string()),
            level: Set(level),
            is_locked: Set(is_locked),
            is_active: Set(is_locked), // Les slots locked sont actifs, les autres non
            ..Default::default()
        };
        let _ = slot.insert(&state.db).await;
    }

    // Générer JWT
    let token = create_jwt(user_id.to_string());

    (
        StatusCode::CREATED, 
        Json(json!({
            "token": token,
            "user_id": user_id,
            "username": payload.username,
            "planet_id": planet_id,
            "email": payload.email
        }))
    )
}

pub async fn login_handler(
    State(state): State<AppState>,
    Json(payload): Json<LoginPayload>,
) -> impl IntoResponse {
    let user = match User::find()
        .filter(
            Condition::any()
                .add(user::Column::Username.eq(&payload.identifier))
                .add(user::Column::Email.eq(&payload.identifier))
        )
        .one(&state.db)
        .await
        .unwrap() 
    {
        Some(u) => u,
        None => return (
            StatusCode::UNAUTHORIZED, 
            Json(json!({"error": "Identifiants incorrects"}))
        ),
    };

    if !verify(&payload.password, &user.password).unwrap_or(false) {
        return (
            StatusCode::UNAUTHORIZED, 
            Json(json!({"error": "Identifiants incorrects"}))
        );
    }

    let planet = Planet::find()
        .filter(planet::Column::OwnerId.eq(user.id))
        .one(&state.db)
        .await
        .unwrap();
    
    let planet_id = match planet {
        Some(p) => p.id,
        None => return (
            StatusCode::INTERNAL_SERVER_ERROR, 
            Json(json!({"error": "Aucune planète trouvée"}))
        ),
    };

    let token = create_jwt(user.id.to_string());

    // ═══════════════════════════════════════════════════════════════════════════
    // MISE À JOUR DU LOGIN STREAK
    // ═══════════════════════════════════════════════════════════════════════════
    missions::update_login_streak(&state, user.id).await;

    (
        StatusCode::OK, 
        Json(json!({
            "token": token,
            "planet_id": planet_id,
            "user_id": user.id, 
            "username": user.username,
            "email": user.email
        }))
    )
}

