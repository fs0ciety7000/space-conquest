use axum::{
    extract::{Path, State},
    http::{Method, StatusCode},
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, Database, DatabaseConnection, DbErr,
    EntityTrait, Set, Statement,
};
use serde_json::{json, Value};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;
use chrono::{Utc, Duration};
use rand::Rng;

// --- MODULES ---
mod auth;
mod game_logic; // On charge ton fichier game_logic
mod entities;
// Note: Si tu as encore combat.rs séparé, garde 'mod combat;', sinon on utilise game_logic

use entities::planet;
use entities::planet::Entity as Planet;
use game_logic::ResourceType; // On utilise tes types

#[derive(Clone)]
struct AppState {
    db: DatabaseConnection,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db = Database::connect(&db_url).await.unwrap();

    // Migration
    let backend = db.get_database_backend();
    let _ = db.execute(Statement::from_string(
        backend,
        r#"CREATE TABLE IF NOT EXISTS planet (
            id UUID PRIMARY KEY,
            owner_id UUID NOT NULL,
            name TEXT NOT NULL,
            metal_mine_level INTEGER NOT NULL DEFAULT 1,
            crystal_mine_level INTEGER NOT NULL DEFAULT 1,
            deuterium_mine_level INTEGER NOT NULL DEFAULT 1,
            metal_amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            crystal_amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            deuterium_amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            last_update TIMESTAMP NOT NULL DEFAULT NOW(),
            construction_end TIMESTAMP,
            construction_type TEXT,
            shipyard_construction_end TIMESTAMP,
            pending_fleet_type TEXT,
            pending_fleet_count INTEGER NOT NULL DEFAULT 0,
            light_hunter_count INTEGER NOT NULL DEFAULT 0,
            cruiser_count INTEGER NOT NULL DEFAULT 0,
            recycler_count INTEGER NOT NULL DEFAULT 0,
            energy_tech_level INTEGER NOT NULL DEFAULT 0,
            research_lab_level INTEGER NOT NULL DEFAULT 0,
            laser_battery_level INTEGER NOT NULL DEFAULT 0,
            expedition_end TIMESTAMP
        );"#.to_owned(),
    )).await;

    let state = AppState { db };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers(Any);

    let app = Router::new()
        .route("/register", post(auth::register_handler))
        .route("/login", post(auth::login_handler))
        .route("/planets/:id", get(get_planet_handler))
        .route("/planets/:id/upgrade/:type", post(upgrade_mine_handler))
        .route("/planets/:id/build-fleet/:type/:qty", post(build_fleet_handler))
        .route("/planets/:id/expedition", post(expedition_handler))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("🚀 SPEED_GAME Backend opérationnel sur http://{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// --- HANDLERS QUI UTILISENT GAME_LOGIC ---

async fn get_planet_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<Json<planet::Model>, StatusCode> {
    
    let p_opt = planet::Entity::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let p = p_opt.ok_or(StatusCode::NOT_FOUND)?;
    
    let now = Utc::now().naive_utc();
    let mut active: planet::ActiveModel = p.clone().into();

    // 1. UTILISATION DE GAME_LOGIC POUR LES RESSOURCES
    // On calcule ce qui a été produit depuis la dernière fois
    // game_logic::calculate_resources prend en compte ton SPEED_FACTOR
    let new_metal = game_logic::calculate_resources(ResourceType::Metal, p.metal_mine_level, p.metal_amount, p.last_update);
    let new_crystal = game_logic::calculate_resources(ResourceType::Crystal, p.crystal_mine_level, p.crystal_amount, p.last_update);
    let new_deut = game_logic::calculate_resources(ResourceType::Deuterium, p.deuterium_mine_level, p.deuterium_amount, p.last_update);

    active.metal_amount = Set(new_metal);
    active.crystal_amount = Set(new_crystal);
    active.deuterium_amount = Set(new_deut);
    active.last_update = Set(now);

    // 2. Gestion des constructions terminées (reste identique)
    if let Some(end_date) = p.construction_end {
        if now >= end_date {
            let type_str = p.construction_type.clone().unwrap_or_default();
            match type_str.as_str() {
                "metal" => active.metal_mine_level = Set(p.metal_mine_level + 1),
                "crystal" => active.crystal_mine_level = Set(p.crystal_mine_level + 1),
                "deuterium" => active.deuterium_mine_level = Set(p.deuterium_mine_level + 1),
                "energy_tech" => active.energy_tech_level = Set(p.energy_tech_level + 1),
                "research" => active.research_lab_level = Set(p.research_lab_level + 1),
                "laser" => active.laser_battery_level = Set(p.laser_battery_level + 1),
                _ => {}
            }
            active.construction_end = Set(None);
            active.construction_type = Set(None);
        }
    }

    if let Some(fleet_end) = p.shipyard_construction_end {
        if now >= fleet_end {
            let fleet_str = p.pending_fleet_type.clone().unwrap_or_default();
            let qty = p.pending_fleet_count;
            match fleet_str.as_str() {
                "light_hunter" => active.light_hunter_count = Set(p.light_hunter_count + qty),
                "cruiser" => active.cruiser_count = Set(p.cruiser_count + qty),
                "recycler" => active.recycler_count = Set(p.recycler_count + qty),
                _ => {}
            }
            active.shipyard_construction_end = Set(None);
            active.pending_fleet_type = Set(None);
            active.pending_fleet_count = Set(0);
        }
    }
    
    if let Some(exp_end) = p.expedition_end {
        if now >= exp_end {
            active.expedition_end = Set(None);
        }
    }

    let updated_model = active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(updated_model))
}

async fn upgrade_mine_handler(
    Path((id, type_mine)): Path<(Uuid, String)>,
    State(state): State<AppState>,
) -> Result<StatusCode, StatusCode> {
    let p = planet::Entity::find_by_id(id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    if p.construction_end.is_some() {
        return Err(StatusCode::CONFLICT);
    }

    // Déterminer le niveau actuel
    let current_level = match type_mine.as_str() {
        "metal" => p.metal_mine_level,
        "crystal" => p.crystal_mine_level,
        "deuterium" => p.deuterium_mine_level,
        "energy_tech" => p.energy_tech_level,
        "research" => p.research_lab_level,
        "laser" => p.laser_battery_level,
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    // 1. UTILISATION DE GAME_LOGIC POUR LES COÛTS
    let cost = game_logic::get_upgrade_cost(&type_mine, current_level + 1);

    if p.metal_amount < cost.metal || p.crystal_amount < cost.crystal || p.deuterium_amount < cost.deuterium {
        return Err(StatusCode::BAD_REQUEST);
    }

    // 2. UTILISATION DE GAME_LOGIC POUR LE TEMPS (SPEED FACTOR)
    let build_time = game_logic::get_build_time(current_level + 1);

    let mut active: planet::ActiveModel = p.clone().into();
    active.metal_amount = Set(p.metal_amount - cost.metal);
    active.crystal_amount = Set(p.crystal_amount - cost.crystal);
    active.deuterium_amount = Set(p.deuterium_amount - cost.deuterium);
    
    active.construction_type = Set(Some(type_mine));
    active.construction_end = Set(Some(Utc::now().naive_utc() + Duration::seconds(build_time)));

    active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::OK)
}

async fn build_fleet_handler(
    Path((id, type_ship, qty)): Path<(Uuid, String, i32)>,
    State(state): State<AppState>,
) -> Result<StatusCode, StatusCode> {
    let p = planet::Entity::find_by_id(id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    if p.shipyard_construction_end.is_some() || qty <= 0 {
        return Err(StatusCode::CONFLICT);
    }

    // Ici on garde les coûts simples pour l'exemple, ou tu peux ajouter get_ship_cost dans game_logic
    let (cost_m, cost_c) = match type_ship.as_str() {
        "light_hunter" => {
            let stats = game_logic::get_light_hunter_stats();
            (stats.0, stats.1)
        },
        "cruiser" => (20000.0, 7000.0),
        "recycler" => (10000.0, 6000.0),
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    let total_m = cost_m * qty as f64;
    let total_c = cost_c * qty as f64;

    if p.metal_amount < total_m || p.crystal_amount < total_c {
        return Err(StatusCode::BAD_REQUEST);
    }

    // UTILISATION DE GAME_LOGIC POUR LE TEMPS DE FLOTTE (SPEED FACTOR)
    let build_time = game_logic::get_ship_production_time(qty);

    let mut active: planet::ActiveModel = p.clone().into();
    active.metal_amount = Set(p.metal_amount - total_m);
    active.crystal_amount = Set(p.crystal_amount - total_c);
    active.pending_fleet_type = Set(Some(type_ship));
    active.pending_fleet_count = Set(qty);
    active.shipyard_construction_end = Set(Some(Utc::now().naive_utc() + Duration::seconds(build_time)));

    active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::OK)
}

async fn expedition_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse { 
    
    let p_res = planet::Entity::find_by_id(id).one(&state.db).await;
    
    let p = match p_res {
        Ok(Some(found)) => found,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planet not found"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "DB Error"}))).into_response(),
    };

    if let Some(date) = p.expedition_end {
        if date > Utc::now().naive_utc() {
             return (StatusCode::BAD_REQUEST, Json(json!({"error": "Expedition active"}))).into_response();
        }
    }

    let mut active: planet::ActiveModel = p.clone().into();
    let mut loot = 0.0;
    let mut logs: Vec<String> = Vec::new();
    let mut winner = "none";
    
    // Variables pour stocker les pertes précises
    let mut lost_hunters = 0;
    let mut lost_cruisers = 0;

    let combat_triggered = rand::thread_rng().gen_bool(0.3);

    if combat_triggered {
        logs.push("⚠️ RADAR : Signature hostile détectée.".to_string());
        
        // Simulation via game_logic
        let combat_res = game_logic::simulate_combat(
            p.light_hunter_count + p.cruiser_count, 
            p.laser_battery_level
        );

        if combat_res.victory {
            winner = "player";
            loot = 5000.0 * (game_logic::SPEED_FACTOR / 100.0);
            
            logs.push("ENGAGEMENT : Les systèmes de défense ouvrent le feu.".to_string());
            logs.push(format!("RESULTAT : {}", combat_res.message));
            logs.push(format!("PILLAGE : +{:.0} Métal récupéré.", loot));

            // VICTOIRE : On perd quelques chasseurs (chair à canon)
            lost_hunters = combat_res.ships_lost; 
            
            // On s'assure de ne pas enlever plus que ce qu'on a
            if lost_hunters > p.light_hunter_count {
                lost_hunters = p.light_hunter_count;
            }
        } else {
            winner = "pirates";
            logs.push("ALERTE CRITIQUE : Boucliers percés.".to_string());
            logs.push(format!("RESULTAT : {}", combat_res.message));
            
            // DÉFAITE : Pertes massives en pourcentage
            lost_hunters = (p.light_hunter_count as f64 * 0.5) as i32; // 50% perte
            lost_cruisers = (p.cruiser_count as f64 * 0.3) as i32;     // 30% perte
        }
        
        // Application des pertes à la DB
        active.light_hunter_count = Set(p.light_hunter_count - lost_hunters);
        active.cruiser_count = Set(p.cruiser_count - lost_cruisers);
        active.metal_amount = Set(p.metal_amount + loot);

    } else {
        winner = "player"; 
        loot = 50000.0; 
        logs.push("SCAN : Secteur calme.".to_string());
        logs.push("EXPLORATION : Gisement massif trouvé.".to_string());
        active.metal_amount = Set(p.metal_amount + loot);
    }

    let duration = std::cmp::max(1, (600.0 / game_logic::SPEED_FACTOR) as i64);
    active.expedition_end = Set(Some(Utc::now().naive_utc() + Duration::seconds(duration)));
    
    if let Err(e) = active.update(&state.db).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "DB Update Error"}))).into_response();
    }
    
    let updated_planet = planet::Entity::find_by_id(id).one(&state.db).await.unwrap().unwrap();

    // --- CONSTRUCTION RÉPONSE AVEC PERTES DÉTAILLÉES ---
    let response = json!({
        "planet": updated_planet,
        "report": {
            "winner": winner,
            "log": logs,
            "loot": loot,
            "losses": {
                "light_hunter": lost_hunters,
                "cruiser": lost_cruisers
            }
        }
    });

    (StatusCode::OK, Json(response)).into_response()
}