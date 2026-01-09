use axum::{
    extract::{Path, State, Query},
    http::{Method, StatusCode},
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, Database, DatabaseConnection, DbErr,
    EntityTrait, Set, Statement, 
    // 👇 TOUS LES TRAITS NÉCESSAIRES SONT LÀ 👇
    QueryFilter, QueryOrder, ColumnTrait, QuerySelect, 
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value, to_string};
use std::net::SocketAddr;
use std::collections::HashMap;
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;
use chrono::{Utc, Duration};
use rand::Rng;

mod auth;
mod game_logic;
mod combat;
mod entities; 

use entities::planet;
use entities::planet::Entity as Planet;
use entities::combat_log;

const PRODUCTION_SPEED: f64 = 1000.0;

#[derive(Clone)]
struct AppState {
    db: DatabaseConnection,
}

#[derive(Serialize)]
struct RankItem {
    rank: usize,
    planet_name: String,
    score: i32,
    is_me: bool,
    id: Uuid, 
}

#[derive(Deserialize)]
struct AttackPayload {
    target_planet_id: Uuid,
    hunters: i32,
    cruisers: i32,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db = Database::connect(&db_url).await.unwrap();

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
        .route("/planets/:id/clear-report", post(clear_report_handler))
        .route("/ranking", get(get_ranking_handler))
        .route("/attack", post(attack_handler))
        .route("/planets/:id/reports", get(get_reports_handler))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("🚀 SPEED_GAME Backend opérationnel sur http://{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// --- HANDLERS ---

async fn get_ranking_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    
    let current_planet_id = params.get("current_planet_id")
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_default();

    let planets = planet::Entity::find().all(&state.db).await.unwrap_or_default();

    let mut ranked_planets: Vec<RankItem> = planets.into_iter().map(|p| {
        let score = (p.metal_mine_level + p.crystal_mine_level + p.deuterium_mine_level 
                     + p.energy_tech_level + p.research_lab_level + p.laser_battery_level) * 100
                     + (p.light_hunter_count + p.cruiser_count + p.recycler_count) * 10;
        
        RankItem {
            rank: 0, 
            planet_name: p.name,
            score,
            is_me: p.id == current_planet_id,
            id: p.id,
        }
    }).collect();

    ranked_planets.sort_by(|a, b| b.score.cmp(&a.score));

    for (i, item) in ranked_planets.iter_mut().enumerate() {
        item.rank = i + 1;
    }

    Json(ranked_planets)
}

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
    let elapsed = now.signed_duration_since(p.last_update).num_seconds();

    let mut active: planet::ActiveModel = p.clone().into();

    if elapsed > 0 {
        let new_metal = game_logic::calculate_resources(game_logic::ResourceType::Metal, p.metal_mine_level, p.metal_amount, p.last_update);
        let new_crystal = game_logic::calculate_resources(game_logic::ResourceType::Crystal, p.crystal_mine_level, p.crystal_amount, p.last_update);
        let new_deut = game_logic::calculate_resources(game_logic::ResourceType::Deuterium, p.deuterium_mine_level, p.deuterium_amount, p.last_update);

        active.metal_amount = Set(new_metal);
        active.crystal_amount = Set(new_crystal);
        active.deuterium_amount = Set(new_deut);
        active.last_update = Set(now);
    }

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

async fn clear_report_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let p = match planet::Entity::find_by_id(id).one(&state.db).await {
        Ok(Some(p)) => p,
        _ => return StatusCode::NOT_FOUND,
    };

    let mut active: planet::ActiveModel = p.into();
    active.unread_report = Set(None);
    
    let _ = active.update(&state.db).await;
    StatusCode::OK
}

async fn upgrade_mine_handler(
    Path((id, type_mine)): Path<(Uuid, String)>,
    State(state): State<AppState>,
) -> Result<StatusCode, StatusCode> {
    let p = planet::Entity::find_by_id(id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?.ok_or(StatusCode::NOT_FOUND)?;

    if p.construction_end.is_some() { return Err(StatusCode::CONFLICT); }

    let current_level = match type_mine.as_str() {
        "metal" => p.metal_mine_level,
        "crystal" => p.crystal_mine_level,
        "deuterium" => p.deuterium_mine_level,
        "energy_tech" => p.energy_tech_level,
        "research" => p.research_lab_level,
        "laser" => p.laser_battery_level,
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    let cost = game_logic::get_upgrade_cost(&type_mine, current_level + 1);

    if p.metal_amount < cost.metal || p.crystal_amount < cost.crystal || p.deuterium_amount < cost.deuterium {
        return Err(StatusCode::BAD_REQUEST);
    }

    let build_time = game_logic::get_build_time(current_level + 1);

    let mut active: planet::ActiveModel = p.into();
    active.metal_amount = Set(active.metal_amount.unwrap() - cost.metal);
    active.crystal_amount = Set(active.crystal_amount.unwrap() - cost.crystal);
    active.deuterium_amount = Set(active.deuterium_amount.unwrap() - cost.deuterium);
    active.construction_type = Set(Some(type_mine));
    active.construction_end = Set(Some(Utc::now().naive_utc() + Duration::seconds(build_time)));

    active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::OK)
}

async fn build_fleet_handler(
    Path((id, type_ship, qty)): Path<(Uuid, String, i32)>,
    State(state): State<AppState>,
) -> Result<StatusCode, StatusCode> {
    let p = planet::Entity::find_by_id(id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?.ok_or(StatusCode::NOT_FOUND)?;

    if p.shipyard_construction_end.is_some() || qty <= 0 { return Err(StatusCode::CONFLICT); }

    let (cost_m, cost_c) = match type_ship.as_str() {
        "light_hunter" => { let s = game_logic::get_light_hunter_stats(); (s.0, s.1) },
        "cruiser" => (20000.0, 7000.0),
        "recycler" => (10000.0, 6000.0),
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    let total_m = cost_m * qty as f64;
    let total_c = cost_c * qty as f64;

    if p.metal_amount < total_m || p.crystal_amount < total_c { return Err(StatusCode::BAD_REQUEST); }

    let build_time = game_logic::get_ship_production_time(qty);

    let mut active: planet::ActiveModel = p.into();
    active.metal_amount = Set(active.metal_amount.unwrap() - total_m);
    active.crystal_amount = Set(active.crystal_amount.unwrap() - total_c);
    active.pending_fleet_type = Set(Some(type_ship));
    active.pending_fleet_count = Set(qty);
    active.shipyard_construction_end = Set(Some(Utc::now().naive_utc() + Duration::seconds(build_time)));

    active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::OK)
}

async fn attack_handler(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<HashMap<String, String>>,
    Json(payload): Json<AttackPayload>,
) -> impl IntoResponse {
    
    let attacker_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let attacker_id = match Uuid::parse_str(&attacker_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "ID Attaquant invalide"}))).into_response(),
    };

    if attacker_id == payload.target_planet_id {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Impossible de s'attaquer soi-même"}))).into_response();
    }

    let att_planet = match planet::Entity::find_by_id(attacker_id).one(&state.db).await {
        Ok(Some(p)) => p,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Attaquant introuvable"}))).into_response(),
    };

    let def_planet = match planet::Entity::find_by_id(payload.target_planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Cible introuvable"}))).into_response(),
    };

    if payload.hunters > att_planet.light_hunter_count || payload.cruisers > att_planet.cruiser_count {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Flotte insuffisante"}))).into_response();
    }
    
    if payload.hunters <= 0 && payload.cruisers <= 0 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Aucune flotte envoyée"}))).into_response();
    }

    let def_resources = game_logic::Cost {
        metal: def_planet.metal_amount,
        crystal: def_planet.crystal_amount,
        deuterium: def_planet.deuterium_amount,
    };

    let result = game_logic::resolve_pvp(
        payload.hunters, 
        payload.cruisers, 
        def_planet.light_hunter_count, 
        def_planet.cruiser_count, 
        def_planet.laser_battery_level,
        def_resources
    );

    // --- LOG POUR LE DÉFENSEUR ---
    let log_def = combat_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        planet_id: Set(def_planet.id),
        target_name: Set(att_planet.name.clone()),
        mission_type: Set("defense".to_string()),
        result: Set(if result.winner == "defender" { "victory".to_string() } else { "defeat".to_string() }),
        loot_metal: Set(-result.loot.metal),
        loot_crystal: Set(-result.loot.crystal),
        ships_lost: Set(result.defender_losses),
        date: Set(Utc::now().naive_utc()),
    };
    let _ = log_def.insert(&state.db).await;

    // Mise à jour Défenseur
    let mut def_active: planet::ActiveModel = def_planet.clone().into();
    def_active.metal_amount = Set(def_active.metal_amount.unwrap() - result.loot.metal);
    def_active.crystal_amount = Set(def_active.crystal_amount.unwrap() - result.loot.crystal);
    def_active.light_hunter_count = Set(std::cmp::max(0, def_active.light_hunter_count.unwrap() - result.defender_losses));
    
    let defender_report = json!({
        "winner": result.winner, 
        "log": result.log,
        "loot": result.loot.metal + result.loot.crystal,
        "losses": { "light_hunter": result.defender_losses, "cruiser": 0 },
        "is_defense": true
    });
    def_active.unread_report = Set(Some(to_string(&defender_report).unwrap()));
    let _ = def_active.update(&state.db).await;

    // --- LOG POUR L'ATTAQUANT ---
    let log_att = combat_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        planet_id: Set(att_planet.id),
        target_name: Set(def_planet.name.clone()),
        mission_type: Set("attack".to_string()),
        result: Set(if result.winner == "attacker" { "victory".to_string() } else { "defeat".to_string() }),
        loot_metal: Set(result.loot.metal),
        loot_crystal: Set(result.loot.crystal),
        ships_lost: Set(result.attacker_losses),
        date: Set(Utc::now().naive_utc()),
    };
    let _ = log_att.insert(&state.db).await;

    // Mise à jour Attaquant
    let mut att_active: planet::ActiveModel = att_planet.into();
    att_active.metal_amount = Set(att_active.metal_amount.unwrap() + result.loot.metal);
    att_active.crystal_amount = Set(att_active.crystal_amount.unwrap() + result.loot.crystal);
    att_active.light_hunter_count = Set(att_active.light_hunter_count.unwrap() - result.attacker_losses);
    let _ = att_active.update(&state.db).await;

    (StatusCode::OK, Json(json!({ "status": "success", "report": result }))).into_response()
}

async fn expedition_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse { 
    
    let p_res = planet::Entity::find_by_id(id).one(&state.db).await;
    let p = match p_res {
        Ok(Some(found)) => found,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planet not found"}))).into_response(),
    };

    if let Some(date) = p.expedition_end {
        if date > Utc::now().naive_utc() {
             return (StatusCode::BAD_REQUEST, Json(json!({"error": "Expedition active"}))).into_response();
        }
    }

    let mut active: planet::ActiveModel = p.clone().into();
    let mut loot = 0.0;
    let mut logs: Vec<String> = Vec::new();
    let winner; 
    let mut lost_hunters = 0;
    let mut lost_cruisers = 0;

    let combat_triggered = rand::thread_rng().gen_bool(0.3);

    if combat_triggered {
        logs.push("⚠️ RADAR : Signature hostile détectée.".to_string());
        
        let combat_res = game_logic::simulate_combat(
            p.light_hunter_count + p.cruiser_count, 
            p.laser_battery_level
        );

        if combat_res.victory {
            winner = "player";
            loot = 5000.0 * (game_logic::SPEED_FACTOR / 100.0);
            logs.push(format!("RESULTAT : {}", combat_res.message));
            logs.push(format!("PILLAGE : +{:.0} Métal récupéré.", loot));

            lost_hunters = combat_res.ships_lost; 
            if lost_hunters > p.light_hunter_count { lost_hunters = p.light_hunter_count; }
        } else {
            winner = "pirates";
            logs.push(format!("RESULTAT : {}", combat_res.message));
            lost_hunters = (p.light_hunter_count as f64 * 0.5) as i32; 
            lost_cruisers = (p.cruiser_count as f64 * 0.3) as i32;     
        }
        
        active.light_hunter_count = Set(p.light_hunter_count - lost_hunters);
        active.cruiser_count = Set(p.cruiser_count - lost_cruisers);
        active.metal_amount = Set(p.metal_amount + loot);

    } else {
        winner = "player"; 
        loot = 50000.0; 
        logs.push("SCAN : Secteur calme.".to_string());
        logs.push(format!("DECOUVERTE : Gisement trouvé (+{:.0} Métal).", loot));
        active.metal_amount = Set(p.metal_amount + loot);
    }

    let duration = std::cmp::max(1, (600.0 / game_logic::SPEED_FACTOR) as i64);
    active.expedition_end = Set(Some(Utc::now().naive_utc() + Duration::seconds(duration)));
    
    if let Err(_) = active.update(&state.db).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "DB Update Error"}))).into_response();
    }
    
    let updated_planet = planet::Entity::find_by_id(id).one(&state.db).await.unwrap().unwrap();

    let log_exp = combat_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        planet_id: Set(id),
        target_name: Set("Secteur Inconnu".to_string()),
        mission_type: Set("expedition".to_string()),
        result: Set(winner.to_string()),
        loot_metal: Set(loot),
        loot_crystal: Set(0.0),
        ships_lost: Set(lost_hunters + lost_cruisers),
        date: Set(Utc::now().naive_utc()),
    };
    let _ = log_exp.insert(&state.db).await;

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

async fn get_reports_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> Json<Vec<combat_log::Model>> {
    let logs = combat_log::Entity::find()
        .filter(combat_log::Column::PlanetId.eq(id))
        .order_by_desc(combat_log::Column::Date)
        .limit(50)
        .all(&state.db)
        .await
        .unwrap_or_default();

    Json(logs)
}