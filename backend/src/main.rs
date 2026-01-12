use axum::{
    extract::{Path, State, Query},
    http::{Method, StatusCode},
    response::{IntoResponse, Json},
    routing::{get, post, delete},
    Router,
};
use sea_orm::{
    ActiveModelTrait, Database, DatabaseConnection,
    EntityTrait, Set, IntoActiveModel, 
    QueryFilter, QueryOrder, ColumnTrait, QuerySelect, Condition 
};
use serde::{Deserialize, Serialize};
use serde_json::{json, to_string};
use std::net::SocketAddr;
use std::collections::HashMap;
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;
use chrono::{Utc, Duration};
use rand::Rng;
use sea_orm::PaginatorTrait;

mod auth;
mod game_logic;
mod combat;
mod entities; 

// --- IMPORT DU PRELUDE (CRUCIAL POUR EVITER LES ERREURS DE TYPE) ---
use entities::prelude::*;
// On garde les modules pour accéder aux colonnes spécifiques (ex: planet::Column)
use entities::{planet, user, combat_log, fleet_mission, transport_log, message};

#[derive(Clone)]
struct AppState {
    db: DatabaseConnection,
}

#[derive(Serialize)]
struct RankItem {
   rank: usize,
    username: String,
    planet_name: String,
    total_score: i32,
    economy_score: i32,
    military_score: i32,
    is_me: bool,
    id: Uuid,
    owner_id: Uuid,
}

#[derive(Deserialize)]
struct AttackPayload {
    target_planet_id: Uuid,
    hunters: i32,
    cruisers: i32,
}

#[derive(Deserialize)]
struct SendMessagePayload {
    recipient_name: String,
    subject: String,
    content: String,
}

#[derive(Serialize)]
struct MessageDisplay {
    id: Uuid,
    sender_id: Uuid,
    sender_name: String,
    subject: String,
    content: String,
    is_read: bool,
    created_at: chrono::NaiveDateTime,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db = Database::connect(&db_url).await.unwrap();

    let state = AppState { db };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::DELETE])
        .allow_headers(Any);
 
    let app = Router::new()
        // Auth
        .route("/register", post(auth::register_handler))
        .route("/login", post(auth::login_handler))
        // Config
        .route("/config", get(get_game_config_handler))
        // Planets
        .route("/planets/:id", get(get_planet_handler))
        .route("/planets/:id/upgrade/:type", post(upgrade_mine_handler))
        .route("/planets/:id/build-fleet/:type/:qty", post(build_fleet_handler))
        .route("/planets/:id/expedition", post(expedition_handler))
        .route("/planets/:id/clear-report", post(clear_report_handler))
        .route("/planets/:id/reports", get(get_reports_handler))
        .route("/planets/:id/transport-logs", get(get_transport_logs_handler))
        .route("/planets/:id/rename", post(rename_planet_handler))
        .route("/my-planets", get(get_my_planets_handler))
        // Actions
        .route("/attack", post(attack_handler))
        .route("/spy", post(spy_handler))
        .route("/recycle", post(recycle_handler))
        .route("/transport", post(transport_handler))
        .route("/colonize", post(colonize_handler))
        // Galaxy & Ranking
        .route("/ranking", get(get_ranking_handler))
        .route("/galaxy/:galaxy/:system", get(get_galaxy_handler))
        .route("/galaxy/:galaxy/scan", get(get_galaxy_scan_handler))
        // Messagerie
        .route("/messages", get(get_messages_handler))
        .route("/messages/send", post(send_message_handler))
        .route("/messages/:id", delete(delete_message_handler))
        .route("/messages/:id/read", post(mark_message_read_handler))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("🚀 SPEED_GAME Backend opérationnel sur http://{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// --- HANDLERS MESSAGERIE ---

async fn get_messages_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "User ID invalide"}))).into_response(),
    };

    // Utilisation de Message (du prelude) au lieu de message::Entity
    let messages = Message::find()
        .filter(message::Column::ReceiverId.eq(user_id))
        .order_by_desc(message::Column::CreatedAt)
        .all(&state.db)
        .await
        .unwrap_or_default();

    let sender_ids: Vec<Uuid> = messages.iter().map(|m| m.sender_id).collect();
    
    if sender_ids.is_empty() {
        return Json(Vec::<MessageDisplay>::new()).into_response();
    }

    let senders = User::find()
        .filter(user::Column::Id.is_in(sender_ids))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let sender_map: HashMap<Uuid, String> = senders.into_iter().map(|u| (u.id, u.username)).collect();

    let display_list: Vec<MessageDisplay> = messages.into_iter().map(|m| {
        let sender_name = sender_map.get(&m.sender_id).cloned().unwrap_or("Inconnu".to_string());
        MessageDisplay {
            id: m.id,
            sender_id: m.sender_id,
            sender_name,
            subject: m.subject,
            content: m.content,
            is_read: m.is_read,
            created_at: m.created_at,
        }
    }).collect();

    Json(display_list).into_response()
}

async fn send_message_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<SendMessagePayload>,
) -> impl IntoResponse {
    
    let sender_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let sender_id = match Uuid::parse_str(&sender_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Expéditeur invalide"}))).into_response(),
    };

// 1. Trouver l'ID du destinataire à partir du nom
    let recipient = User::find()
        .filter(user::Column::Username.eq(&payload.recipient_name))
        .one(&state.db)
        .await
        .unwrap_or(None);

    let recipient_id = match recipient {
        Some(u) => u.id,
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Commandant introuvable"}))).into_response(),
    };

 // 2. Créer le message
    let new_message = message::ActiveModel {
        id: Set(Uuid::new_v4()),
        sender_id: Set(sender_id),
        receiver_id: Set(recipient_id),
        subject: Set(payload.subject),
        content: Set(payload.content),
        created_at: Set(Utc::now().naive_utc()),
        is_read: Set(false),
    };

    if let Err(e) = new_message.insert(&state.db).await {
        println!("Erreur envoi message: {:?}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur envoi"}))).into_response();
    }

    StatusCode::OK.into_response()
}

async fn mark_message_read_handler(
    Path(message_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let msg = Message::find_by_id(message_id).one(&state.db).await.unwrap_or(None);
    if let Some(m) = msg {
        let mut active = m.into_active_model();
        active.is_read = Set(true);
        let _ = active.update(&state.db).await;
    }
    StatusCode::OK.into_response()
}

async fn delete_message_handler(
    Path(message_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let _ = Message::delete_by_id(message_id).exec(&state.db).await;
    StatusCode::OK.into_response()
}

// --- HANDLERS JEU ---

async fn get_game_config_handler() -> impl IntoResponse {
    Json(json!({ "speed_factor": game_logic::SPEED_FACTOR }))
}

async fn get_ranking_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    
    let current_planet_id = params.get("current_planet_id").and_then(|s| Uuid::parse_str(s).ok()).unwrap_or_default();
    // Récupérer le type de tri (general, economy, military)
    let sort_type = params.get("type").map(|s| s.as_str()).unwrap_or("general");

    let planets = Planet::find().all(&state.db).await.unwrap_or_default();
    let users = User::find().all(&state.db).await.unwrap_or_default();
    
    let user_map: HashMap<Uuid, String> = users.into_iter()
        .map(|u| (u.id, u.username))
        .collect();

    let mut ranked_planets: Vec<RankItem> = planets.into_iter().map(|p| {
        // Calcul des scores détaillés
        let economy = (p.metal_mine_level + p.crystal_mine_level + p.deuterium_mine_level 
                     + p.energy_tech_level + p.research_lab_level) * 100;
        
        let military = (p.light_hunter_count + p.cruiser_count + p.recycler_count + p.colony_ship_count + p.transporter_count + p.spy_probe_count) * 10
                     + (p.missile_launcher_count + p.plasma_turret_count) * 20
                     + (p.laser_battery_level * 50);

        let total = economy + military;
        
        let username = user_map.get(&p.owner_id).cloned().unwrap_or("Inconnu".to_string());

 RankItem {
            rank: 0, 
            username,
            planet_name: p.name,
            total_score: total,
            economy_score: economy,
            military_score: military,
            is_me: p.id == current_planet_id,
            id: p.id,
            owner_id: p.owner_id,
        }
    }).collect();

 // Tri selon le type demandé
    match sort_type {
        "economy" => ranked_planets.sort_by(|a, b| b.economy_score.cmp(&a.economy_score)),
        "military" => ranked_planets.sort_by(|a, b| b.military_score.cmp(&a.military_score)),
        _ => ranked_planets.sort_by(|a, b| b.total_score.cmp(&a.total_score)),
    }

    for (i, item) in ranked_planets.iter_mut().enumerate() { item.rank = i + 1; }
    Json(ranked_planets)
}

async fn get_planet_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    
    let p_opt = Planet::find_by_id(id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let p = p_opt.ok_or(StatusCode::NOT_FOUND)?;
    
    let now = Utc::now().naive_utc();
    let elapsed = now.signed_duration_since(p.last_update).num_seconds();

    let mut active: planet::ActiveModel = p.clone().into();

    // 1. Mise à jour des Ressources
    if elapsed > 0 {
        let new_metal = game_logic::calculate_resources(game_logic::ResourceType::Metal, p.metal_mine_level, p.metal_amount, p.last_update);
        let new_crystal = game_logic::calculate_resources(game_logic::ResourceType::Crystal, p.crystal_mine_level, p.crystal_amount, p.last_update);
        let new_deut = game_logic::calculate_resources(game_logic::ResourceType::Deuterium, p.deuterium_mine_level, p.deuterium_amount, p.last_update);

        active.metal_amount = Set(new_metal);
        active.crystal_amount = Set(new_crystal);
        active.deuterium_amount = Set(new_deut);
        active.last_update = Set(now);
    }

    // 2. Fin de construction Bâtiments
    if let Some(end_date) = p.construction_end {
        if now >= end_date {
            let type_str = p.construction_type.clone().unwrap_or_default();
            match type_str.as_str() {
                "metal" => active.metal_mine_level = Set(p.metal_mine_level + 1),
                "crystal" => active.crystal_mine_level = Set(p.crystal_mine_level + 1),
                "deuterium" => active.deuterium_mine_level = Set(p.deuterium_mine_level + 1),
                "energy_tech" => active.energy_tech_level = Set(p.energy_tech_level + 1),
                "research" => active.research_lab_level = Set(p.research_lab_level + 1),
                "solar_plant" => active.solar_plant_level = Set(p.solar_plant_level + 1),
                "laser" => active.laser_battery_level = Set(p.laser_battery_level + 1),
                "espionage" => active.espionage_tech_level = Set(p.espionage_tech_level + 1),
                _ => {}
            }
            active.construction_end = Set(None);
            active.construction_type = Set(None);
        }
    }

    // 3. Fin de construction Flotte / Défense
    if let Some(fleet_end) = p.shipyard_construction_end {
        if now >= fleet_end {
            let fleet_str = p.pending_fleet_type.clone().unwrap_or_default();
            let qty = p.pending_fleet_count;
            match fleet_str.as_str() {
                "light_hunter" => active.light_hunter_count = Set(p.light_hunter_count + qty),
                "cruiser" => active.cruiser_count = Set(p.cruiser_count + qty),
                "recycler" => active.recycler_count = Set(p.recycler_count + qty),
                "spy_probe" => active.spy_probe_count = Set(p.spy_probe_count + qty),
                "missile_launcher" => active.missile_launcher_count = Set(p.missile_launcher_count + qty),
                "plasma_turret" => active.plasma_turret_count = Set(p.plasma_turret_count + qty),
                "colony_ship" => active.colony_ship_count = Set(p.colony_ship_count + qty),
                "transporter" => active.transporter_count = Set(p.transporter_count + qty),
                _ => {}
            }
            active.shipyard_construction_end = Set(None);
            active.pending_fleet_type = Set(None);
            active.pending_fleet_count = Set(0);
        }
    }
    
    // 4. Fin Expédition
    if let Some(exp_end) = p.expedition_end {
        if now >= exp_end {
            active.expedition_end = Set(None);
        }
    }

    // 5. Arrivée des Transports (Fleet Missions)
    let missions = FleetMission::find()
        .filter(fleet_mission::Column::TargetPlanetId.eq(id))
        .filter(fleet_mission::Column::ArrivalTime.lte(now))
        .all(&state.db)
        .await
        .unwrap_or_default();

    for m in missions {
        let source_planet = Planet::find_by_id(m.source_planet_id).one(&state.db).await.ok().flatten();
        let sender_name = source_planet.map(|sp| sp.name).unwrap_or("Inconnu".to_string());

        let current_m = active.metal_amount.clone().unwrap();
        let current_c = active.crystal_amount.clone().unwrap();
        let current_d = active.deuterium_amount.clone().unwrap();
        let current_ships = active.transporter_count.clone().unwrap();

        active.metal_amount = Set(current_m + m.metal);
        active.crystal_amount = Set(current_c + m.crystal);
        active.deuterium_amount = Set(current_d + m.deuterium);
        active.transporter_count = Set(current_ships + m.ships_count);

        // Notification
        let report = json!({
            "type": "transport_arrival",
            "sender_name": sender_name,
            "metal": m.metal,
            "crystal": m.crystal,
            "deuterium": m.deuterium,
            "ships": m.ships_count
        });
        active.unread_report = Set(Some(to_string(&report).unwrap()));

        // Suppression de la mission
        let _ = FleetMission::delete_by_id(m.id).exec(&state.db).await;
    }

 // Sauvegarde finale
    let updated_model = active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

// --- CALCUL ÉNERGIE (CORRIGÉ) ---
    // 1. Production Solaire de base
    let solar_lvl = updated_model.solar_plant_level as f64;
    let base_production = 20.0 * solar_lvl * 1.1f64.powf(solar_lvl);

    // 2. Bonus Tech
    let energy_tech = updated_model.energy_tech_level as f64;
    let tech_bonus = 1.0 + (energy_tech * 0.05);

    let production = base_production * tech_bonus;

    // 3. Consommation
    let metal_lvl = updated_model.metal_mine_level as f64;
    let crystal_lvl = updated_model.crystal_mine_level as f64;
    let deut_lvl = updated_model.deuterium_mine_level as f64;

    let consumption = (10.0 * metal_lvl * 1.1f64.powf(metal_lvl))
                    + (10.0 * crystal_lvl * 1.1f64.powf(crystal_lvl))
                    + (20.0 * deut_lvl * 1.1f64.powf(deut_lvl));

    let net_energy = (production - consumption).floor() as i32;

    // --- NOUVEAU : Compter les messages non lus ---
    let unread_count = Message::find()
        .filter(message::Column::ReceiverId.eq(updated_model.owner_id))
        .filter(message::Column::IsRead.eq(false))
        .count(&state.db)
        .await
        .unwrap_or(0);

    // Conversion en JSON dynamique pour ajouter le champ
    let mut json_response = serde_json::to_value(updated_model).unwrap();
    
    // On injecte le compte
  if let Some(obj) = json_response.as_object_mut() {
        obj.insert("unread_messages".to_string(), json!(unread_count));
        obj.insert("energy".to_string(), json!(net_energy)); // <-- L'énergie calculée par le serveur
    }
    Ok(Json(json_response))
}

async fn clear_report_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let p = match Planet::find_by_id(id).one(&state.db).await {
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
    let p = Planet::find_by_id(id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?.ok_or(StatusCode::NOT_FOUND)?;

    if p.construction_end.is_some() { return Err(StatusCode::CONFLICT); }

    let current_level = match type_mine.as_str() {
        "metal" => p.metal_mine_level,
        "crystal" => p.crystal_mine_level,
        "deuterium" => p.deuterium_mine_level,
        "energy_tech" => p.energy_tech_level,
        "research" => p.research_lab_level,
        "solar_plant" => p.solar_plant_level,
        "laser" => p.laser_battery_level,
        "espionage" => p.espionage_tech_level,
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    let cost = game_logic::get_upgrade_cost(&type_mine, current_level + 1);

    if p.metal_amount < cost.metal || p.crystal_amount < cost.crystal || p.deuterium_amount < cost.deuterium {
        return Err(StatusCode::BAD_REQUEST);
    }

    let build_time = game_logic::get_build_time(cost.metal, cost.crystal);

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
    let p = Planet::find_by_id(id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?.ok_or(StatusCode::NOT_FOUND)?;

    if p.shipyard_construction_end.is_some() || qty <= 0 { return Err(StatusCode::CONFLICT); }

    let (cost_m, cost_c) = match type_ship.as_str() {
        "light_hunter" => { let s = game_logic::get_light_hunter_stats(); (s.0, s.1) },
        "cruiser" => (20000.0, 7000.0),
        "recycler" => (10000.0, 6000.0),
        "spy_probe" => { let s = game_logic::get_spy_probe_stats(); (s.0, s.1) },
        "missile_launcher" => { let s = game_logic::get_missile_launcher_stats(); (s.0, s.1) },
        "plasma_turret" => { let s = game_logic::get_plasma_turret_stats(); (s.0, s.1) },
        "colony_ship" => { let s = game_logic::get_colony_ship_stats(); (s.0, s.1) },
        "transporter" => { let s = game_logic::get_transporter_stats(); (s.0, s.1) },
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

    let att_planet = match Planet::find_by_id(attacker_id).one(&state.db).await {
        Ok(Some(p)) => p,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Attaquant introuvable"}))).into_response(),
    };

    let def_planet = match Planet::find_by_id(payload.target_planet_id).one(&state.db).await {
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
        def_planet.missile_launcher_count, 
        def_planet.plasma_turret_count, 
        def_resources 
    );

    // Log Défenseur
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
    
    let percent_loss = if result.winner == "attacker" { 0.6 } else { 0.1 };
    def_active.missile_launcher_count = Set((def_planet.missile_launcher_count as f64 * (1.0 - percent_loss)) as i32);
    def_active.plasma_turret_count = Set((def_planet.plasma_turret_count as f64 * (1.0 - percent_loss)) as i32);

    // Débris
    def_active.debris_metal = Set(def_planet.debris_metal + result.debris.metal);
    def_active.debris_crystal = Set(def_planet.debris_crystal + result.debris.crystal);

    let defender_report = json!({
        "winner": result.winner, 
        "log": result.log,
        "loot": result.loot.metal + result.loot.crystal,
        "losses": { "light_hunter": result.defender_losses, "cruiser": 0 },
        "is_defense": true
    });
    def_active.unread_report = Set(Some(to_string(&defender_report).unwrap()));
    let _ = def_active.update(&state.db).await;

    // Log Attaquant
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
    
    let p_res = Planet::find_by_id(id).one(&state.db).await;
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
    
    let updated_planet = Planet::find_by_id(id).one(&state.db).await.unwrap().unwrap();

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
    let logs = CombatLog::find()
        .filter(combat_log::Column::PlanetId.eq(id))
        .order_by_desc(combat_log::Column::Date)
        .limit(50)
        .all(&state.db)
        .await
        .unwrap_or_default();

    Json(logs)
}

async fn get_transport_logs_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> Json<Vec<transport_log::Model>> {
    let logs = TransportLog::find()
        .filter(
            Condition::any()
                .add(transport_log::Column::TargetPlanetId.eq(id))
                .add(transport_log::Column::SourcePlanetId.eq(id))
        )
        .order_by_desc(transport_log::Column::Date)
        .limit(50)
        .all(&state.db)
        .await
        .unwrap_or_default();

    Json(logs)
}

#[derive(Deserialize)]
struct SpyPayload {
    target_planet_id: Uuid,
}

fn calculate_flight_time(source_sys: i32, target_sys: i32, speed_factor: f64) -> i64 {
    let distance = (source_sys - target_sys).abs() as f64;
    let base_time = 30.0 + (distance * 10.0); 
    let final_time = base_time / speed_factor;
    std::cmp::max(10, final_time as i64)
}

async fn spy_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<SpyPayload>,
) -> impl IntoResponse {
    
    let attacker_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let attacker_id = Uuid::parse_str(&attacker_id_str).unwrap_or_default();
    
    let att_planet_opt = Planet::find_by_id(attacker_id).one(&state.db).await.unwrap();
    let def_planet_opt = Planet::find_by_id(payload.target_planet_id).one(&state.db).await.unwrap();

    let att_planet = match att_planet_opt { Some(p) => p, None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Attaquant inconnu"}))).into_response() };
    let def_planet = match def_planet_opt { Some(p) => p, None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Cible inconnue"}))).into_response() };

    if att_planet.spy_probe_count < 1 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Aucune sonde disponible"}))).into_response();
    }

    let mut att_active: planet::ActiveModel = att_planet.clone().into();
    att_active.spy_probe_count = Set(att_planet.spy_probe_count - 1);
    let _ = att_active.update(&state.db).await;

    let tech_diff = att_planet.espionage_tech_level - def_planet.espionage_tech_level;
    
    let mut detection = "none";
    let mut resources = None;
    let mut fleet = None;
    let mut defense = None;

    if tech_diff >= -1 { 
        detection = "resources";
        resources = Some(game_logic::Cost {
            metal: def_planet.metal_amount,
            crystal: def_planet.crystal_amount,
            deuterium: def_planet.deuterium_amount
        });
    }
    
    if tech_diff >= 1 { 
        detection = "fleet";
        let mut fleet_map = HashMap::new();
        fleet_map.insert("light_hunter".to_string(), def_planet.light_hunter_count);
        fleet_map.insert("cruiser".to_string(), def_planet.cruiser_count);
        fleet_map.insert("recycler".to_string(), def_planet.recycler_count);
        fleet_map.insert("spy_probe".to_string(), def_planet.spy_probe_count);
        fleet = Some(fleet_map);
    }

    if tech_diff >= 2 { 
        detection = "full";
        defense = Some(def_planet.missile_launcher_count + def_planet.plasma_turret_count); 
    }

    (StatusCode::OK, Json(json!({
        "status": "success",
        "report": {
            "success": true,
            "tech_difference": tech_diff,
            "detection_level": detection,
            "resources": resources,
            "fleet": fleet,
            "defense": defense
        }
    }))).into_response()
}

#[derive(Deserialize)]
struct RecyclePayload {
    target_planet_id: Uuid,
    recyclers: i32,
}

async fn recycle_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<RecyclePayload>,
) -> impl IntoResponse {
    
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();

    // Utilisation de Planet::find_by_id
    let mut att_planet = match Planet::find_by_id(current_id).one(&state.db).await.unwrap() {
        Some(p) => p.into_active_model(),
        None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Planète inconnue"}))).into_response(),
    };

    let target_res = Planet::find_by_id(payload.target_planet_id).one(&state.db).await.unwrap();
    let mut target_planet = match target_res {
        Some(p) => p.into_active_model(),
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Cible inconnue"}))).into_response(),
    };

    let current_recyclers = att_planet.recycler_count.clone().unwrap();
    if payload.recyclers > current_recyclers || payload.recyclers <= 0 {
         return (StatusCode::BAD_REQUEST, Json(json!({"error": "Recycleurs insuffisants"}))).into_response();
    }

    let capacity = (payload.recyclers as f64) * 20000.0;
    let debris_m = target_planet.debris_metal.clone().unwrap();
    let debris_c = target_planet.debris_crystal.clone().unwrap();
    let total_debris = debris_m + debris_c;

    if total_debris <= 0.0 {
         return (StatusCode::OK, Json(json!({
             "status": "empty",
             "message": "Aucun débris à recycler."
         }))).into_response();
    }

    let mut harvested_m = 0.0;
    let mut harvested_c = 0.0;
    let mut remaining_capacity = capacity;

    if debris_m > 0.0 {
        let take = f64::min(debris_m, remaining_capacity);
        harvested_m = take;
        remaining_capacity -= take;
        target_planet.debris_metal = Set(debris_m - take);
    }
    if debris_c > 0.0 && remaining_capacity > 0.0 {
        let take = f64::min(debris_c, remaining_capacity);
        harvested_c = take;
        target_planet.debris_crystal = Set(debris_c - take);
    }

    att_planet.metal_amount = Set(att_planet.metal_amount.unwrap() + harvested_m);
    att_planet.crystal_amount = Set(att_planet.crystal_amount.unwrap() + harvested_c);

    let _ = att_planet.update(&state.db).await;
    let _ = target_planet.update(&state.db).await;

    (StatusCode::OK, Json(json!({
        "status": "success",
        "message": format!("Recyclage terminé. +{:.0} Métal, +{:.0} Cristal", harvested_m, harvested_c),
        "harvested": { "metal": harvested_m, "crystal": harvested_c }
    }))).into_response()
}

// --- GALAXY SLOTS ---
#[derive(Serialize)]
struct GalaxySlot {
    position: i32,
    planet_id: Option<Uuid>,
    planet_name: Option<String>,
    owner_name: Option<String>,
    owner_id: Option<Uuid>, 
    has_debris: bool,
    is_me: bool,
}

async fn get_galaxy_handler(
    Path((galaxy_id, system_id)): Path<(i32, i32)>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();

    let planets = Planet::find()
        .filter(planet::Column::Galaxy.eq(galaxy_id))
        .filter(planet::Column::System.eq(system_id))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let mut slots: Vec<GalaxySlot> = Vec::new();

    for pos in 1..=15 {
        if let Some(p) = planets.iter().find(|p| p.position == pos) {
            slots.push(GalaxySlot {
                position: pos,
                planet_id: Some(p.id),
                planet_name: Some(p.name.clone()),
                owner_name: Some(p.name.clone()),
                owner_id: Some(p.owner_id),
                has_debris: p.debris_metal > 0.0 || p.debris_crystal > 0.0,
                is_me: p.id == current_id,
            });
        } else {
            slots.push(GalaxySlot {
                position: pos,
                planet_id: None,
                planet_name: None,
                owner_name: None,
                owner_id: None,
                has_debris: false,
                is_me: false,
            });
        }
    }

    Json(slots)
}

#[derive(Serialize)]
struct SystemSummary {
    system: i32,
    planet_count: i64,
    has_me: bool,
}

async fn get_galaxy_scan_handler(
    Path(galaxy_id): Path<i32>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();

    let planets = Planet::find()
        .filter(planet::Column::Galaxy.eq(galaxy_id))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let mut systems_map: HashMap<i32, SystemSummary> = HashMap::new();

    for p in planets {
        let entry = systems_map.entry(p.system).or_insert(SystemSummary {
            system: p.system,
            planet_count: 0,
            has_me: false,
        });
        entry.planet_count += 1;
        if p.id == current_id {
            entry.has_me = true;
        }
    }

    let results: Vec<SystemSummary> = systems_map.into_values().collect();
    Json(results)
}

fn generate_colony_name() -> String {
    let prefixes = ["Néo", "Alpha", "Terra", "Nova", "Proxima", "Sector", "Base", "Outpost"];
    let suffixes = ["Prime", "Secundus", "X", "Y", "Z", "Major", "Minor", "Delta", "Omicron"];
    let mut rng = rand::thread_rng();
    let prefix = prefixes[rng.gen_range(0..prefixes.len())];
    let suffix = suffixes[rng.gen_range(0..suffixes.len())];
    let num = rng.gen_range(1..999);
    format!("{} {} {}", prefix, suffix, num)
}

#[derive(Deserialize)]
struct ColonizePayload {
    galaxy: i32,
    system: i32,
    position: i32,
}

async fn colonize_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<ColonizePayload>,
) -> impl IntoResponse {
    
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();

    let mut att_planet = match Planet::find_by_id(current_id).one(&state.db).await.unwrap() {
        Some(p) => p.into_active_model(),
        None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Planète inconnue"}))).into_response(),
    };

    let ships = att_planet.colony_ship_count.clone().unwrap();
    if ships < 1 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Aucun vaisseau de colonisation disponible"}))).into_response();
    }

    let exists = Planet::find()
        .filter(planet::Column::Galaxy.eq(payload.galaxy))
        .filter(planet::Column::System.eq(payload.system))
        .filter(planet::Column::Position.eq(payload.position))
        .one(&state.db)
        .await
        .unwrap();

    if exists.is_some() {
        return (StatusCode::CONFLICT, Json(json!({"error": "Cet emplacement est déjà occupé"}))).into_response();
    }

    let owner_id = att_planet.owner_id.clone().unwrap();
    let password = att_planet.password.clone().unwrap();
    let colony_name = generate_colony_name();
    let new_id = Uuid::new_v4();
    
    let new_planet = planet::ActiveModel {
        id: Set(new_id),
        owner_id: Set(owner_id),
        name: Set(colony_name),
        password: Set(password), 
        galaxy: Set(payload.galaxy),
        system: Set(payload.system),
        position: Set(payload.position),
        metal_mine_level: Set(1),
        crystal_mine_level: Set(1),
        deuterium_mine_level: Set(1),
        metal_amount: Set(500.0),
        crystal_amount: Set(500.0),
        last_update: Set(Utc::now().naive_utc()),
        ..Default::default()
    };

    att_planet.colony_ship_count = Set(ships - 1);

    let _ = att_planet.update(&state.db).await;
    let _ = new_planet.insert(&state.db).await;

    (StatusCode::OK, Json(json!({
        "status": "success",
        "message": format!("Colonisation réussie en [{}:{}:{}]", payload.galaxy, payload.system, payload.position),
        "new_planet_id": new_id
    }))).into_response()
}

async fn get_my_planets_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();
    let current = Planet::find_by_id(current_id).one(&state.db).await.unwrap();
    
    if let Some(p) = current {
        let my_planets = Planet::find()
            .filter(planet::Column::OwnerId.eq(p.owner_id))
            .all(&state.db)
            .await
            .unwrap_or_default();
            
        let list: Vec<serde_json::Value> = my_planets.into_iter().map(|mp| json!({
            "id": mp.id,
            "name": mp.name,
            "galaxy": mp.galaxy,
            "system": mp.system,
            "position": mp.position,
            "is_current": mp.id == current_id
        })).collect();

        return Json(list).into_response();
    }
    
    (StatusCode::UNAUTHORIZED, Json(json!({"error": "Planète introuvable"}))).into_response()
}

#[derive(Deserialize)]
struct TransportPayload {
    target_planet_id: Uuid,
    transporters: i32,
    metal: f64,
    crystal: f64,
    deuterium: f64,
}

async fn transport_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<TransportPayload>,
) -> impl IntoResponse {
    
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();

    if current_id == payload.target_planet_id {
         return (StatusCode::BAD_REQUEST, Json(json!({"error": "Impossible de transporter vers la même planète"}))).into_response();
    }

    let source_model = match Planet::find_by_id(current_id).one(&state.db).await.unwrap() {
        Some(p) => p,
        None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Planète source inconnue"}))).into_response(),
    };

    let target_model = match Planet::find_by_id(payload.target_planet_id).one(&state.db).await.unwrap() {
        Some(p) => p,
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète cible inconnue"}))).into_response(),
    };

    let source_name = source_model.name.clone();
    let source_id = source_model.id;
    let target_name = target_model.name.clone();
    let target_id = target_model.id;

    if payload.transporters > source_model.transporter_count || payload.transporters <= 0 {
         return (StatusCode::BAD_REQUEST, Json(json!({"error": "Transporteurs insuffisants"}))).into_response();
    }

    if payload.metal > source_model.metal_amount || payload.crystal > source_model.crystal_amount || payload.deuterium > source_model.deuterium_amount {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Ressources insuffisantes"}))).into_response();
    }
    
    let total_load = payload.metal + payload.crystal + payload.deuterium;
    let capacity = payload.transporters as f64 * game_logic::TRANSPORTER_CAPACITY;

    if total_load > capacity {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Surcharge !"}))).into_response();
    }

    let flight_duration = calculate_flight_time(source_model.system, target_model.system, game_logic::SPEED_FACTOR);
    let arrival = Utc::now().naive_utc() + Duration::seconds(flight_duration);

    let mut source: planet::ActiveModel = source_model.into();
    source.metal_amount = Set(source.metal_amount.unwrap() - payload.metal);
    source.crystal_amount = Set(source.crystal_amount.unwrap() - payload.crystal);
    source.deuterium_amount = Set(source.deuterium_amount.unwrap() - payload.deuterium);
    source.transporter_count = Set(source.transporter_count.unwrap() - payload.transporters);

    let mission = fleet_mission::ActiveModel {
        id: Set(Uuid::new_v4()),
        source_planet_id: Set(source_id),
        target_planet_id: Set(target_id),
        mission_type: Set("transport".to_string()),
        arrival_time: Set(arrival),
        metal: Set(payload.metal),
        crystal: Set(payload.crystal),
        deuterium: Set(payload.deuterium),
        ships_count: Set(payload.transporters),
    };

    let log = transport_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        target_planet_id: Set(target_id),
        target_planet_name: Set(target_name),
        source_planet_id: Set(source_id),
        source_planet_name: Set(source_name),
        metal: Set(payload.metal),
        crystal: Set(payload.crystal),
        deuterium: Set(payload.deuterium),
        date: Set(Utc::now().naive_utc()),
    };

    let _ = source.update(&state.db).await;
    let _ = mission.insert(&state.db).await;
    let _ = log.insert(&state.db).await;

    (StatusCode::OK, Json(json!({
        "status": "success",
        "message": format!("Flotte lancée ! Arrivée dans {}s", flight_duration)
    }))).into_response()
}

// --- STRUCTURE MANQUANTE AJOUTÉE ICI ---
#[derive(Deserialize)]
struct RenamePlanetPayload {
    new_name: String,
}

async fn rename_planet_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<RenamePlanetPayload>,
) -> impl IntoResponse {
    let p_opt = Planet::find_by_id(id).one(&state.db).await.unwrap();
    
    if let Some(p) = p_opt {
        if payload.new_name.trim().is_empty() || payload.new_name.len() > 20 {
             return (StatusCode::BAD_REQUEST, Json(json!({"error": "Nom invalide (1-20 caractères)"}))).into_response();
        }

        let mut active: planet::ActiveModel = p.into();
        active.name = Set(payload.new_name);
        
        if let Err(_) = active.update(&state.db).await {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response();
        }
        
        return StatusCode::OK.into_response();
    }
    
    StatusCode::NOT_FOUND.into_response()
}