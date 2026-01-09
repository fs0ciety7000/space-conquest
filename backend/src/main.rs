use axum::{
    routing::{get, post},
    Router,
    extract::{State, Path},
    Json,
    http::{StatusCode, header, Method, HeaderValue},
};
use sea_orm::{entity::prelude::*, *};
use tower_http::cors::CorsLayer;
use uuid::Uuid;
use chrono::{Duration, Utc};
use serde::{Serialize, Deserialize};
use bcrypt::{hash, verify, DEFAULT_COST};

mod auth;
mod game_logic;
mod entities;

use entities::prelude::*;
use entities::{planet, user};
use crate::game_logic::*;

#[derive(Clone)]
struct AppState {
    db: DatabaseConnection,
}

#[derive(Deserialize)]
struct AuthRequest {
    username: String,
    password: String,
}

#[derive(Serialize)]
struct AuthResponse {
    token: String,
    user_id: Uuid,
    planet_id: Uuid,
}

// --- HANDLERS D'AUTHENTIFICATION ---

async fn register_handler(
    State(state): State<AppState>,
    Json(payload): Json<AuthRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    let hashed = hash(payload.password, DEFAULT_COST).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let user_id = Uuid::new_v4();
    let planet_id = Uuid::new_v4();

    // 1. Création de l'utilisateur
    let new_user = user::ActiveModel {
        id: Set(user_id),
        username: Set(payload.username),
        password_hash: Set(hashed),
    };
    new_user.insert(&state.db).await.map_err(|_| StatusCode::CONFLICT)?;

    // 2. Création de la planète avec TOUS les champs initialisés
    let starting_planet = planet::ActiveModel {
        id: Set(planet_id),
        name: Set("Colonie Initiale".into()),
        owner_id: Set(Some(user_id)),
        metal_amount: Set(1000.0),
        crystal_amount: Set(500.0),
        deuterium_amount: Set(0.0),
        metal_mine_level: Set(1),
        crystal_mine_level: Set(1),
        deuterium_mine_level: Set(1),
        light_hunter_count: Set(0),
        cruiser_count: Set(0),
        recycler_count: Set(0),
        pending_fleet_count: Set(0),
        last_update: Set(Utc::now().naive_utc()),
        research_lab_level: Set(0),
        laser_battery_level: Set(0),
        energy_tech_level: Set(0),
        shipyard_level: Set(1), // Ajouté pour correspondre à ton entité
        ..Default::default()
    };
    
    starting_planet.insert(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(AuthResponse {
        token: auth::create_jwt(&user_id.to_string()),
        user_id,
        planet_id,
    }))
}

async fn login_handler(
    State(state): State<AppState>,
    Json(payload): Json<AuthRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    let u = User::find()
        .filter(user::Column::Username.eq(payload.username))
        .one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::UNAUTHORIZED)?;

    if verify(payload.password, &u.password_hash).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)? {
        let p = Planet::find()
            .filter(planet::Column::OwnerId.eq(u.id))
            .one(&state.db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .ok_or(StatusCode::NOT_FOUND)?;

        Ok(Json(AuthResponse {
            token: auth::create_jwt(&u.id.to_string()),
            user_id: u.id,
            planet_id: p.id,
        }))
    } else {
        Err(StatusCode::UNAUTHORIZED)
    }
}

// --- HANDLERS DE JEU ---

async fn get_planet_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<Json<planet::Model>, StatusCode> {
    let mut p = Planet::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let now = Utc::now().naive_utc();

    // 1. Mise à jour des bâtiments
    if p.construction_end.map_or(false, |e| now >= e) {
        let mut active: planet::ActiveModel = p.clone().into();
        match p.construction_type.as_deref() {
            Some("metal") => active.metal_mine_level = Set(p.metal_mine_level + 1),
            Some("crystal") => active.crystal_mine_level = Set(p.crystal_mine_level + 1),
            Some("deuterium") => active.deuterium_mine_level = Set(p.deuterium_mine_level + 1),
            _ => {}
        }
        active.construction_end = Set(None);
        active.last_update = Set(now);
        p = active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // 2. Mise à jour de la flotte
    if let Some(end_time) = p.shipyard_construction_end {
        if now >= end_time {
            let mut active: planet::ActiveModel = p.clone().into();
            let qty = p.pending_fleet_count;
            
            match p.pending_fleet_type.as_deref() {
                Some("light_hunter") => active.light_hunter_count = Set(p.light_hunter_count + qty),
                Some("cruiser") => active.cruiser_count = Set(p.cruiser_count + qty),
                Some("recycler") => active.recycler_count = Set(p.recycler_count + qty),
                _ => {}
            }
            active.pending_fleet_count = Set(0);
            active.pending_fleet_type = Set(None);
            active.shipyard_construction_end = Set(None);
            p = active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        }
    }

   // 3. FIN D'EXPÉDITION (CORRECTION DU CALCUL ET RAPPORT)
if let Some(exp_end) = p.expedition_end {
    if now >= exp_end {
        let mut active: planet::ActiveModel = p.clone().into();
        
        // Calcul du gain
        let gain = 15000.0;
        let message = format!("L'expédition est revenue ! Butin : {} métal.", gain);
        
        // IMPORTANT : On met à jour le montant ET le last_update 
        // pour que calculate_resources reparte de cette nouvelle base.
        active.metal_amount = Set(p.metal_amount + gain);
        active.last_update = Set(now); 
        active.expedition_end = Set(None);
        
        // On stocke le rapport dans un champ de la planète (à ajouter en DB si besoin ou utiliser une réponse JSON)
        // Pour l'instant, on met à jour p pour la réponse immédiate
        p = active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        println!("Expédition terminée : +{} métal", gain);
    }
}

    // 3. Calcul des ressources pour l'affichage (Protection Anti-NaN)
    let mut p_final = p.clone();
    let metal = calculate_resources(ResourceType::Metal, p.metal_mine_level, p.metal_amount, p.last_update);
    let crystal = calculate_resources(ResourceType::Crystal, p.crystal_mine_level, p.crystal_amount, p.last_update);
    let deut = calculate_resources(ResourceType::Deuterium, p.deuterium_mine_level, p.deuterium_amount, p.last_update);

    p_final.metal_amount = if metal.is_nan() { p.metal_amount } else { metal };
    p_final.crystal_amount = if crystal.is_nan() { p.crystal_amount } else { crystal };
    p_final.deuterium_amount = if deut.is_nan() { p.deuterium_amount } else { deut };

    Ok(Json(p_final))
}

async fn build_fleet_handler(
    Path((id, ship_type, qty)): Path<(Uuid, String, i32)>,
    State(state): State<AppState>,
) -> Result<Json<planet::Model>, StatusCode> {
    let p = Planet::find_by_id(id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?.ok_or(StatusCode::NOT_FOUND)?;
    
    if p.shipyard_construction_end.is_some() {
        return Err(StatusCode::CONFLICT);
    }

    let (m_cost, c_cost, unit_time) = match ship_type.as_str() {
        "light_hunter" => (3000.0, 1000.0, 20),
        "cruiser" => (20000.0, 7000.0, 60),
        "recycler" => (10000.0, 6000.0, 40),
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    let m_total = m_cost * qty as f64;
    let c_total = c_cost * qty as f64;
    
    let m_now = calculate_resources(ResourceType::Metal, p.metal_mine_level, p.metal_amount, p.last_update);
    let c_now = calculate_resources(ResourceType::Crystal, p.crystal_mine_level, p.crystal_amount, p.last_update);

    if m_now >= m_total && c_now >= c_total {
        let mut active: planet::ActiveModel = p.clone().into();
        active.metal_amount = Set(m_now - m_total);
        active.crystal_amount = Set(c_now - c_total);
        active.pending_fleet_count = Set(qty);
        active.pending_fleet_type = Set(Some(ship_type));
        active.shipyard_construction_end = Set(Some(Utc::now().naive_utc() + Duration::seconds(unit_time * qty as i64)));
        active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }
    
    get_planet_handler(Path(id), State(state)).await
}

// Dans src/main.rs
async fn expedition_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<Json<planet::Model>, StatusCode> {
    let p = Planet::find_by_id(id).one(&state.db).await.unwrap().ok_or(StatusCode::NOT_FOUND)?;
    
    if p.light_hunter_count > 0 && p.expedition_end.is_none() {
        let mut active: planet::ActiveModel = p.clone().into();
        active.light_hunter_count = Set(p.light_hunter_count - 1);
        // On fixe la fin à +60 secondes
        active.expedition_end = Set(Some(Utc::now().naive_utc() + Duration::seconds(60)));
        
        // IMPORTANT : On sauvegarde en base
        active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // IMPORTANT : On appelle get_planet_handler pour renvoyer la donnée FRAÎCHE
    get_planet_handler(Path(id), State(state)).await
}


async fn upgrade_handler(
    Path((id, m_type)): Path<(Uuid, String)>,
    State(state): State<AppState>,
) -> Result<Json<planet::Model>, StatusCode> {
    let p = Planet::find_by_id(id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?.ok_or(StatusCode::NOT_FOUND)?;
    
    let next_lv = match m_type.as_str() {
        "metal" => p.metal_mine_level + 1,
        "crystal" => p.crystal_mine_level + 1,
        _ => p.deuterium_mine_level + 1,
    };

    let cost = get_upgrade_cost(&m_type, next_lv);
    let m_now = calculate_resources(ResourceType::Metal, p.metal_mine_level, p.metal_amount, p.last_update);
    let c_now = calculate_resources(ResourceType::Crystal, p.crystal_mine_level, p.crystal_amount, p.last_update);

    if m_now >= cost.metal && c_now >= cost.crystal {
        let mut active: planet::ActiveModel = p.clone().into();
        active.construction_end = Set(Some(Utc::now().naive_utc() + Duration::seconds(get_build_time(next_lv))));
        active.construction_type = Set(Some(m_type));
        active.metal_amount = Set(m_now - cost.metal);
        active.crystal_amount = Set(c_now - cost.crystal);
        active.last_update = Set(Utc::now().naive_utc());
        active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }
    
    get_planet_handler(Path(id), State(state)).await
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db = Database::connect(db_url).await.expect("Impossible de se connecter à la DB");

    let cors = CorsLayer::new()
        .allow_origin("http://localhost:5173".parse::<HeaderValue>().unwrap())
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    let app = Router::new()
        .route("/auth/register", post(register_handler))
        .route("/auth/login", post(login_handler))
        .route("/planets/:id", get(get_planet_handler))
        .route("/planets/:id/upgrade/:m_type", post(upgrade_handler))
        .route("/planets/:id/build-fleet/:ship_type/:qty", post(build_fleet_handler))
        .route("/planets/:id/expedition", post(expedition_handler))
        .layer(cors)
        .with_state(AppState { db });

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    println!("🚀 Backend spatial opérationnel sur http://localhost:8080");
    axum::serve(listener, app).await.unwrap();
}