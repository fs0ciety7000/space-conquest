use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::{IntoResponse, Json, Response},
    routing::{get, post, delete, patch},
    Router,
};
use sea_orm::{
    ActiveModelTrait, Database, DatabaseConnection,
    EntityTrait, Set, IntoActiveModel, 
    QueryFilter, QueryOrder, ColumnTrait, QuerySelect, Condition,
    PaginatorTrait
};
use serde::{Deserialize, Serialize};
use serde_json::{json, to_string};
use std::net::SocketAddr;
use std::collections::HashMap;
use tower_http::{
    cors::CorsLayer,
    trace::TraceLayer,
};
use uuid::Uuid;
use chrono::{Utc, Duration};
use rand::Rng;

use sea_orm_migration::MigratorTrait;

mod auth;
mod game_logic;
mod combat;
mod entities;
mod config;
mod admin;

use config::Config;
use backend::AppState;

// ✅ IMPORTS EXPLICITES
use entities::{
    prelude::{Planet, User, CombatLog, FleetMission, TransportLog, Message, ConstructionQueue},
    planet, user, combat_log, fleet_mission, transport_log, message, construction_queue
};

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

#[derive(Deserialize)]
struct AdminResPayload {
    metal: f64,
    crystal: f64,
    deuterium: f64,
}

#[derive(Deserialize)]
struct ColonizePayload {
    galaxy: i32,
    system: i32,
    position: i32,
}

#[derive(Deserialize)]
struct TransportPayload {
    target_planet_id: Uuid,
    transporters: i32,
    metal: f64,
    crystal: f64,
    deuterium: f64,
}

#[derive(Deserialize)]
struct RenamePlanetPayload {
    new_name: String,
}

#[derive(Deserialize)]
struct SpyPayload {
    target_planet_id: Uuid,
}

#[derive(Deserialize)]
struct RecyclePayload {
    target_planet_id: Uuid,
    recyclers: i32,
}

#[derive(Serialize)]
struct GalaxySlot {
    position: i32,
    planet_id: Option<Uuid>,
    planet_name: Option<String>,
    owner_name: Option<String>,
    owner_id: Option<Uuid>, 
    debris_metal: f64,    
    debris_crystal: f64, 
    is_me: bool,
    is_my_planet: bool
}

#[derive(Serialize)]
struct SystemSummary {
    system: i32,
    planet_count: i64,
    has_me: bool,
}

// 🎯 FONCTION CALCUL SCORE GLOBAL (DRY)
fn calculate_planet_scores(p: &planet::Model) -> (i32, i32, i32) {
    // 📊 SCORE ÉCONOMIQUE : Infrastructures + Technologies
    let infrastructure_score = (p.metal_mine_level + p.crystal_mine_level + p.deuterium_mine_level) * 80;
    let tech_score = (p.energy_tech_level + p.research_lab_level + p.laser_battery_level + p.espionage_tech_level + p.armour_tech_level) * 120;
    let facility_score = (p.solar_plant_level + p.shipyard_level + p.hangar_level) * 60;
    let economy = infrastructure_score + tech_score + facility_score;
    
    // ⚔️ SCORE MILITAIRE : Flotte + Défenses
    let fleet_score = (p.light_hunter_count + p.cruiser_count) * 15 
                    + (p.recycler_count + p.transporter_count) * 8
                    + (p.colony_ship_count * 50) 
                    + (p.spy_probe_count * 5);
    let defense_score = (p.missile_launcher_count * 25) + (p.plasma_turret_count * 40);
    let military = fleet_score + defense_score;
    
    let total = economy + military;
    (total, economy, military)
}

#[tokio::main]
async fn main() {
    let config = Config::from_env();
    let db = Database::connect(&config.database_url).await.expect("Failed to connect to database");

    println!("🔄 Exécution des migrations...");
    match migration::Migrator::up(&db, None).await {
        Ok(_) => println!("✅ Migrations réussies !"),
        Err(e) => eprintln!("❌ Erreur migrations : {:?}", e),
    }

    let state = AppState { db };
    let cors = CorsLayer::permissive();

    let app = Router::new()
        .route("/register", post(auth::register_handler))
        .route("/login", post(auth::login_handler))
        .route("/config", get(get_game_config_handler))
        .route("/planets/:id", get(get_planet_handler))
        .route("/planets/:id/upgrade/:type", post(upgrade_mine_handler))
        .route("/planets/:id/cancel-construction/:queue_id", delete(cancel_construction_handler))
        .route("/planets/:id/build-fleet/:type/:qty", post(build_fleet_handler))
        .route("/planets/:id/expedition", post(expedition_handler))
        .route("/planets/:id/clear-report", post(clear_report_handler))
        .route("/planets/:id/reports", get(get_reports_handler))
        .route("/planets/:id/transport-logs", get(get_transport_logs_handler))
        .route("/planets/:id/rename", post(rename_planet_handler))
        .route("/my-planets", get(get_my_planets_handler))
        .route("/attack", post(attack_handler))
        .route("/spy", post(spy_handler))
        .route("/recycle", post(recycle_handler))
        .route("/transport", post(transport_handler))
        .route("/colonize", post(colonize_handler))
        .route("/ranking", get(get_ranking_handler))
        .route("/galaxy/:galaxy/:system", get(get_galaxy_handler))
        .route("/galaxy/:galaxy/scan", get(get_galaxy_scan_handler))
        .route("/messages", get(get_messages_handler))
        .route("/messages/send", post(send_message_handler))
        .route("/messages/:id", delete(delete_message_handler))
        .route("/messages/:id/read", post(mark_message_read_handler))
        .route("/admin/players", get(admin::get_all_players_handler))
        .route("/admin/planet/:id", get(admin::get_planet_admin_handler))
        .route("/admin/planet/:id", patch(admin::update_planet_admin_handler))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);
    
    let addr: SocketAddr = config.bind_address().parse().expect("Invalid bind address");
    println!("🚀 SPEED_GAME Backend opérationnel sur http://{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn resolve_attack_mission(db: &DatabaseConnection, mission: fleet_mission::Model) -> Result<(), StatusCode> {
    let now = Utc::now().naive_utc();
    let att_planet = Planet::find_by_id(mission.source_planet_id).one(db).await.unwrap().ok_or(StatusCode::NOT_FOUND)?;
    let att_user = User::find_by_id(att_planet.owner_id).one(db).await.unwrap().ok_or(StatusCode::NOT_FOUND)?;
    let def_planet_raw = Planet::find_by_id(mission.target_planet_id).one(db).await.unwrap().ok_or(StatusCode::NOT_FOUND)?;
    let def_user = User::find_by_id(def_planet_raw.owner_id).one(db).await.unwrap().ok_or(StatusCode::NOT_FOUND)?;

    let mut def_planet = def_planet_raw.clone();
    def_planet.metal_amount = game_logic::calculate_resources(game_logic::ResourceType::Metal, def_planet_raw.metal_mine_level, def_planet_raw.metal_amount, def_planet_raw.last_update, def_planet_raw.energy_tech_level);
    def_planet.crystal_amount = game_logic::calculate_resources(game_logic::ResourceType::Crystal, def_planet_raw.crystal_mine_level, def_planet_raw.crystal_amount, def_planet_raw.last_update, def_planet_raw.energy_tech_level);
    def_planet.deuterium_amount = game_logic::calculate_resources(game_logic::ResourceType::Deuterium, def_planet_raw.deuterium_mine_level, def_planet_raw.deuterium_amount, def_planet_raw.last_update, def_planet_raw.energy_tech_level);

    let att_hunters = mission.metal as i32; 
    let att_cruisers = mission.crystal as i32;
    let att_techs = game_logic::CombatTechs { laser: att_planet.laser_battery_level, energy: att_planet.energy_tech_level, armour: att_planet.armour_tech_level };
    let def_techs = game_logic::CombatTechs { laser: def_planet.laser_battery_level, energy: def_planet.energy_tech_level, armour: def_planet.armour_tech_level };

    let result = game_logic::resolve_pvp(
        att_hunters, att_cruisers, att_techs,
        def_planet.light_hunter_count, def_planet.cruiser_count, 0, 
        def_planet.missile_launcher_count, def_planet.plasma_turret_count, 
        def_techs, 
        game_logic::Cost { metal: def_planet.metal_amount, crystal: def_planet.crystal_amount, deuterium: def_planet.deuterium_amount }
    );

    let mut def_active: planet::ActiveModel = def_planet_raw.into();
    if result.winner == "attacker" {
        def_active.metal_amount = Set((def_planet.metal_amount - result.loot.metal).max(0.0));
        def_active.crystal_amount = Set((def_planet.crystal_amount - result.loot.crystal).max(0.0));
        def_active.deuterium_amount = Set((def_planet.deuterium_amount - result.loot.deuterium).max(0.0));
    }
    def_active.debris_metal = Set(def_planet.debris_metal + result.debris.metal);
    def_active.debris_crystal = Set(def_planet.debris_crystal + result.debris.crystal);
    def_active.light_hunter_count = Set((def_planet.light_hunter_count - (result.defender_losses / 2)).max(0));
    def_active.cruiser_count = Set((def_planet.cruiser_count - (result.defender_losses / 2)).max(0));
    def_active.missile_launcher_count = Set((def_planet.missile_launcher_count - result.lost_missiles).max(0));
    def_active.plasma_turret_count = Set((def_planet.plasma_turret_count - result.lost_plasmas).max(0));
    def_active.last_update = Set(now);

    let def_rep_json = json!({"winner": result.winner, "log": result.log, "loot": result.loot, "debris": result.debris, "losses": { "ships": result.defender_losses, "missiles": result.lost_missiles, "plasmas": result.lost_plasmas }, "is_defense": true, "opponent_name": att_user.username});
    def_active.unread_report = Set(Some(to_string(&def_rep_json).unwrap()));
    def_active.update(db).await.unwrap();

    let mut att_active: planet::ActiveModel = att_planet.clone().into();
    if result.winner == "attacker" {
        att_active.metal_amount = Set(att_planet.metal_amount + result.loot.metal);
        att_active.crystal_amount = Set(att_planet.crystal_amount + result.loot.crystal);
        att_active.deuterium_amount = Set(att_planet.deuterium_amount + result.loot.deuterium);
    }
    
    let total_sent = (att_hunters + att_cruisers).max(1);
    let lost_h = (att_hunters as f64 * (result.attacker_losses as f64 / total_sent as f64)) as i32;
    let lost_c = result.attacker_losses - lost_h;
    att_active.light_hunter_count = Set(att_planet.light_hunter_count + (att_hunters - lost_h));
    att_active.cruiser_count = Set(att_planet.cruiser_count + (att_cruisers - lost_c));

    let att_rep_json = json!({"winner": result.winner, "log": result.log, "loot": result.loot, "debris": result.debris, "losses": { "ships": result.attacker_losses }, "is_defense": false, "opponent_name": def_user.username});
    att_active.unread_report = Set(Some(to_string(&att_rep_json).unwrap()));
    att_active.update(db).await.unwrap();

    let _ = combat_log::ActiveModel {id: Set(Uuid::new_v4()), planet_id: Set(mission.target_planet_id), target_name: Set(att_planet.name.clone()), opponent_username: Set(Some(att_user.username.clone())), mission_type: Set("defense".into()), result: Set(if result.winner == "defender" { "victory".into() } else { "defeat".into() }), loot_metal: Set(-result.loot.metal), loot_crystal: Set(-result.loot.crystal), ships_lost: Set(result.defender_losses), date: Set(now)}.insert(db).await;
    let _ = combat_log::ActiveModel {id: Set(Uuid::new_v4()), planet_id: Set(mission.source_planet_id), target_name: Set(def_planet.name.clone()), opponent_username: Set(Some(def_user.username.clone())), mission_type: Set("attack".into()), result: Set(if result.winner == "attacker" { "victory".into() } else { "defeat".into() }), loot_metal: Set(result.loot.metal), loot_crystal: Set(result.loot.crystal), ships_lost: Set(result.attacker_losses), date: Set(now)}.insert(db).await;

    FleetMission::delete_by_id(mission.id).exec(db).await.unwrap();
    Ok(())
}

async fn get_messages_handler(State(state): State<AppState>, Query(params): Query<HashMap<String, String>>) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) { Ok(id) => id, Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "User ID invalide"}))).into_response() };

    let messages = Message::find().filter(message::Column::ReceiverId.eq(user_id)).order_by_desc(message::Column::CreatedAt).all(&state.db).await.unwrap_or_default();
    let sender_ids: Vec<Uuid> = messages.iter().map(|m| m.sender_id).collect();
    if sender_ids.is_empty() { return Json(Vec::<MessageDisplay>::new()).into_response(); }

    let senders = User::find().filter(user::Column::Id.is_in(sender_ids)).all(&state.db).await.unwrap_or_default();
    let sender_map: HashMap<Uuid, String> = senders.into_iter().map(|u| (u.id, u.username)).collect();

    let display_list: Vec<MessageDisplay> = messages.into_iter().map(|m| {
        let sender_name = sender_map.get(&m.sender_id).cloned().unwrap_or("Inconnu".to_string());
        MessageDisplay { id: m.id, sender_id: m.sender_id, sender_name, subject: m.subject, content: m.content, is_read: m.is_read, created_at: m.created_at }
    }).collect();
    Json(display_list).into_response()
}

async fn send_message_handler(State(state): State<AppState>, Query(params): Query<HashMap<String, String>>, Json(payload): Json<SendMessagePayload>) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let sender_id = match Uuid::parse_str(&user_id_str) { Ok(id) => id, Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Expéditeur invalide"}))).into_response() };

    let recipient = User::find().filter(user::Column::Username.eq(&payload.recipient_name)).one(&state.db).await.unwrap_or(None);
    let recipient_id = match recipient { Some(u) => u.id, None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Commandant introuvable"}))).into_response() };

    let new_message = message::ActiveModel { id: Set(Uuid::new_v4()), sender_id: Set(sender_id), receiver_id: Set(recipient_id), subject: Set(payload.subject), content: Set(payload.content), created_at: Set(Utc::now().naive_utc()), is_read: Set(false) };
    if let Err(e) = new_message.insert(&state.db).await { println!("Erreur envoi message: {:?}", e); return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur envoi"}))).into_response(); }
    StatusCode::OK.into_response()
}

async fn mark_message_read_handler(Path(message_id): Path<Uuid>, State(state): State<AppState>) -> impl IntoResponse {
    let msg = Message::find_by_id(message_id).one(&state.db).await.unwrap_or(None);
    if let Some(m) = msg { let mut active = m.into_active_model(); active.is_read = Set(true); let _ = active.update(&state.db).await; }
    StatusCode::OK.into_response()
}

async fn delete_message_handler(Path(message_id): Path<Uuid>, State(state): State<AppState>) -> impl IntoResponse {
    let _ = Message::delete_by_id(message_id).exec(&state.db).await;
    StatusCode::OK.into_response()
}

async fn get_game_config_handler() -> impl IntoResponse { Json(json!({ "speed_factor": game_logic::SPEED_FACTOR })) }

async fn get_ranking_handler(State(state): State<AppState>, Query(params): Query<HashMap<String, String>>) -> impl IntoResponse {
    let current_planet_id = params.get("current_planet_id").and_then(|s| Uuid::parse_str(s).ok()).unwrap_or_default();
    let sort_type = params.get("type").map(|s| s.as_str()).unwrap_or("general");

    let planets = Planet::find().all(&state.db).await.unwrap_or_default();
    let users = User::find().all(&state.db).await.unwrap_or_default();
    let user_map: HashMap<Uuid, String> = users.into_iter().map(|u| (u.id, u.username)).collect();

    let mut ranked_planets: Vec<RankItem> = planets.into_iter().map(|p| {
        let (total, economy, military) = calculate_planet_scores(&p);
        let username = user_map.get(&p.owner_id).cloned().unwrap_or("Inconnu".to_string());
        RankItem { rank: 0, username, planet_name: p.name, total_score: total, economy_score: economy, military_score: military, is_me: p.id == current_planet_id, id: p.id, owner_id: p.owner_id }
    }).collect();

    match sort_type {
        "economy" => ranked_planets.sort_by(|a, b| b.economy_score.cmp(&a.economy_score)),
        "military" => ranked_planets.sort_by(|a, b| b.military_score.cmp(&a.military_score)),
        _ => ranked_planets.sort_by(|a, b| b.total_score.cmp(&a.total_score)),
    }
    for (i, item) in ranked_planets.iter_mut().enumerate() { item.rank = i + 1; }
    Json(ranked_planets)
}

async fn get_planet_handler(Path(id): Path<Uuid>, State(state): State<AppState>) -> Result<Json<serde_json::Value>, StatusCode> {
    let p = Planet::find_by_id(id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?.ok_or(StatusCode::NOT_FOUND)?;
    let now = Utc::now().naive_utc();
    let mut active: planet::ActiveModel = p.clone().into();

    let elapsed = now.signed_duration_since(p.last_update).num_seconds();
    if elapsed > 0 {
        active.metal_amount = Set(game_logic::calculate_resources(game_logic::ResourceType::Metal, p.metal_mine_level, p.metal_amount, p.last_update, p.energy_tech_level));
        active.crystal_amount = Set(game_logic::calculate_resources(game_logic::ResourceType::Crystal, p.crystal_mine_level, p.crystal_amount, p.last_update, p.energy_tech_level));
        active.deuterium_amount = Set(game_logic::calculate_resources(game_logic::ResourceType::Deuterium, p.deuterium_mine_level, p.deuterium_amount, p.last_update, p.energy_tech_level));
        active.last_update = Set(now);
    }

    let finished = ConstructionQueue::find().filter(construction_queue::Column::PlanetId.eq(p.id)).filter(construction_queue::Column::EndTime.lte(now)).all(&state.db).await.unwrap_or_default();
    for item in finished {
        match item.building_type.as_str() {
            "metal" => active.metal_mine_level = Set(item.level),
            "crystal" => active.crystal_mine_level = Set(item.level),
            "deuterium" => active.deuterium_mine_level = Set(item.level),
            "solar_plant" => active.solar_plant_level = Set(item.level),
            "shipyard" => active.shipyard_level = Set(item.level),
            "research" => active.research_lab_level = Set(item.level),
            "hangar" => active.hangar_level = Set(item.level),
            "energy_tech" => active.energy_tech_level = Set(item.level),
            "laser" => active.laser_battery_level = Set(item.level),
            "espionage" => active.espionage_tech_level = Set(item.level),
            "armour" => active.armour_tech_level = Set(item.level),
            "light_hunter" => active.light_hunter_count = Set(active.light_hunter_count.unwrap() + item.level),
            "cruiser" => active.cruiser_count = Set(active.cruiser_count.unwrap() + item.level),
            "missile_launcher" => active.missile_launcher_count = Set(active.missile_launcher_count.unwrap() + item.level),
            "plasma_turret" => active.plasma_turret_count = Set(active.plasma_turret_count.unwrap() + item.level),
            _ => {}
        }
        let _ = ConstructionQueue::delete_by_id(item.id).exec(&state.db).await;
    }

    let arrived = FleetMission::find().filter(Condition::any().add(fleet_mission::Column::TargetPlanetId.eq(id)).add(fleet_mission::Column::SourcePlanetId.eq(id))).filter(fleet_mission::Column::ArrivalTime.lte(now)).all(&state.db).await.unwrap_or_default();
    for m in arrived {
        if m.mission_type == "attack" { let _ = resolve_attack_mission(&state.db, m).await; } 
        else if m.mission_type == "transport" {
            active.metal_amount = Set(active.metal_amount.clone().unwrap() + m.metal);
            active.crystal_amount = Set(active.crystal_amount.clone().unwrap() + m.crystal);
            active.deuterium_amount = Set(active.deuterium_amount.clone().unwrap() + m.deuterium);
            let _ = FleetMission::delete_by_id(m.id).exec(&state.db).await;
        }
    }

    let incoming_raw = FleetMission::find().filter(fleet_mission::Column::TargetPlanetId.eq(id)).all(&state.db).await.unwrap_or_default();
    let outgoing_raw = FleetMission::find().filter(fleet_mission::Column::SourcePlanetId.eq(id)).all(&state.db).await.unwrap_or_default();
    let mut outgoing_detailed = Vec::new();
    for m in outgoing_raw {
        let target_p = Planet::find_by_id(m.target_planet_id).one(&state.db).await.ok().flatten();
        let mut val = serde_json::to_value(&m).unwrap();
        if let Some(tp) = target_p { if let Some(obj) = val.as_object_mut() { obj.insert("target_name".into(), json!(tp.name)); obj.insert("coords".into(), json!(format!("[{}:{}:{}]", tp.galaxy, tp.system, tp.position))); } }
        outgoing_detailed.push(val);
    }

    let updated_model = active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let energy_prod = (20.0 * updated_model.solar_plant_level as f64 * 1.1f64.powf(updated_model.solar_plant_level as f64) * (1.0 + (updated_model.energy_tech_level as f64 * 0.05))) as i32;
    let energy_cons = (10.0 * updated_model.metal_mine_level as f64 * 1.1f64.powf(updated_model.metal_mine_level as f64)) as i32;
    let unread_count = Message::find().filter(message::Column::ReceiverId.eq(updated_model.owner_id)).filter(message::Column::IsRead.eq(false)).count(&state.db).await.unwrap_or(0);

    let mut json_response = serde_json::to_value(updated_model).unwrap();
    if let Some(obj) = json_response.as_object_mut() {
        obj.insert("incoming_missions".into(), json!(incoming_raw));
        obj.insert("outgoing_missions".into(), json!(outgoing_detailed));
        obj.insert("energy".into(), json!(energy_prod - energy_cons));
        obj.insert("unread_messages".into(), json!(unread_count));
        let active_queue = ConstructionQueue::find().filter(construction_queue::Column::PlanetId.eq(p.id)).order_by_asc(construction_queue::Column::EndTime).all(&state.db).await.unwrap_or_default();
        obj.insert("constructions".into(), json!(active_queue));
    }
    Ok(Json(json_response))
}

async fn clear_report_handler(Path(id): Path<Uuid>, State(state): State<AppState>) -> impl IntoResponse {
    let p = match Planet::find_by_id(id).one(&state.db).await { Ok(Some(p)) => p, _ => return StatusCode::NOT_FOUND };
    let mut active: planet::ActiveModel = p.into();
    active.unread_report = Set(None);
    let _ = active.update(&state.db).await;
    StatusCode::OK
}

async fn upgrade_mine_handler(Path((id, type_mine)): Path<(Uuid, String)>, State(state): State<AppState>) -> Result<StatusCode, StatusCode> {
    let p = Planet::find_by_id(id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?.ok_or(StatusCode::NOT_FOUND)?;
    let active_constructions = ConstructionQueue::find().filter(construction_queue::Column::PlanetId.eq(p.id)).count(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    if active_constructions >= 3 { return Err(StatusCode::CONFLICT); }

    let in_queue_count = ConstructionQueue::find().filter(construction_queue::Column::PlanetId.eq(p.id)).filter(construction_queue::Column::BuildingType.eq(&type_mine)).count(&state.db).await.unwrap_or(0);
    let base_level = match type_mine.as_str() {
        "metal" => p.metal_mine_level, "crystal" => p.crystal_mine_level, "deuterium" => p.deuterium_mine_level, "energy_tech" => p.energy_tech_level,
        "research" => p.research_lab_level, "solar_plant" => p.solar_plant_level, "shipyard" => p.shipyard_level, "laser" => p.laser_battery_level,
        "espionage" => p.espionage_tech_level, "armour" => p.armour_tech_level, "hangar" => p.hangar_level,
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    let target_level = base_level + (in_queue_count as i32) + 1;
    let cost = game_logic::get_upgrade_cost(&type_mine, target_level);
    if p.metal_amount < cost.metal || p.crystal_amount < cost.crystal || p.deuterium_amount < cost.deuterium { return Err(StatusCode::BAD_REQUEST); }

    let facility_level = match type_mine.as_str() { "research" | "energy_tech" | "laser" | "espionage" | "armour" => p.research_lab_level, _ => p.shipyard_level };
    let build_time = game_logic::get_build_time(cost.metal, cost.crystal, facility_level);
    
    let mut active: planet::ActiveModel = p.clone().into();
    active.metal_amount = Set(active.metal_amount.unwrap() - cost.metal);
    active.crystal_amount = Set(active.crystal_amount.unwrap() - cost.crystal);
    active.deuterium_amount = Set(active.deuterium_amount.unwrap() - cost.deuterium);
    active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let queue_item = construction_queue::ActiveModel { id: Set(Uuid::new_v4()), planet_id: Set(p.id), building_type: Set(type_mine), level: Set(target_level), end_time: Set(Utc::now().naive_utc() + Duration::seconds(build_time)) };
    queue_item.insert(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::OK)
}

async fn build_fleet_handler(Path((id, type_ship, qty)): Path<(Uuid, String, i32)>, State(state): State<AppState>) -> Result<StatusCode, StatusCode> {
    let p = Planet::find_by_id(id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?.ok_or(StatusCode::NOT_FOUND)?;
    if qty <= 0 { return Err(StatusCode::BAD_REQUEST); }

    let active_constructions = ConstructionQueue::find().filter(construction_queue::Column::PlanetId.eq(p.id)).count(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    if active_constructions >= 3 { return Err(StatusCode::CONFLICT); }

    let current_fleet_size = p.light_hunter_count + p.cruiser_count + p.recycler_count + p.spy_probe_count + p.colony_ship_count + p.transporter_count;
    let max_capacity = game_logic::get_fleet_capacity(p.hangar_level);
    let pending_in_queue: i32 = ConstructionQueue::find().filter(construction_queue::Column::PlanetId.eq(p.id)).all(&state.db).await.unwrap_or_default().iter().filter(|i| ["light_hunter", "cruiser", "transporter", "colony_ship", "recycler", "spy_probe"].contains(&i.building_type.as_str())).map(|i| i.level).sum();
    if (current_fleet_size + pending_in_queue + qty) > max_capacity { return Err(StatusCode::CONFLICT); }

    if let Err(_) = game_logic::check_prerequisites(&p, &type_ship) { return Err(StatusCode::FORBIDDEN); }

    let (cost_m, cost_c) = match type_ship.as_str() {
        "light_hunter" => game_logic::get_light_hunter_stats(), "cruiser" => game_logic::get_unit_cost("cruiser"),
        "recycler" => game_logic::get_unit_cost("recycler"), "spy_probe" => game_logic::get_spy_probe_stats(),
        "missile_launcher" => game_logic::get_missile_launcher_stats(), "plasma_turret" => game_logic::get_plasma_turret_stats(),
        "colony_ship" => game_logic::get_colony_ship_stats(), "transporter" => game_logic::get_transporter_stats(),
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    let total_m = cost_m * qty as f64;
    let total_c = cost_c * qty as f64;
    if p.metal_amount < total_m || p.crystal_amount < total_c { return Err(StatusCode::BAD_REQUEST); }

    let build_time = game_logic::get_ship_production_time(qty);
    let mut active: planet::ActiveModel = p.clone().into();
    active.metal_amount = Set(active.metal_amount.unwrap() - total_m);
    active.crystal_amount = Set(active.crystal_amount.unwrap() - total_c);
    active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let queue_item = construction_queue::ActiveModel { id: Set(Uuid::new_v4()), planet_id: Set(p.id), building_type: Set(type_ship), level: Set(qty), end_time: Set(Utc::now().naive_utc() + Duration::seconds(build_time)) };
    queue_item.insert(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::OK)
}

async fn attack_handler(State(state): State<AppState>, axum::extract::Query(params): axum::extract::Query<HashMap<String, String>>, Json(payload): Json<AttackPayload>) -> impl IntoResponse {
    let attacker_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let attacker_id = match Uuid::parse_str(&attacker_id_str) { Ok(id) => id, Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "ID Attaquant invalide"}))).into_response() };

    let att_planet = match Planet::find_by_id(attacker_id).one(&state.db).await { Ok(Some(p)) => p, _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Attaquant introuvable"}))).into_response() };
    let target_planet = match Planet::find_by_id(payload.target_planet_id).one(&state.db).await { Ok(Some(p)) => p, _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Cible introuvable"}))).into_response() };
    if payload.hunters > att_planet.light_hunter_count || payload.cruisers > att_planet.cruiser_count { return (StatusCode::BAD_REQUEST, Json(json!({"error": "Flotte insuffisante"}))).into_response(); }

    let dist = game_logic::calculate_distance((att_planet.galaxy, att_planet.system, att_planet.position), (target_planet.galaxy, target_planet.system, target_planet.position));
    let travel_time = game_logic::calculate_flight_time(dist, game_logic::SPEED_FACTOR);
    let arrival = Utc::now().naive_utc() + Duration::seconds(travel_time);

    let mut att_active: planet::ActiveModel = att_planet.into();
    att_active.light_hunter_count = Set(att_active.light_hunter_count.unwrap() - payload.hunters);
    att_active.cruiser_count = Set(att_active.cruiser_count.unwrap() - payload.cruisers);
    att_active.update(&state.db).await.unwrap();

    let new_mission = fleet_mission::ActiveModel { id: Set(Uuid::new_v4()), source_planet_id: Set(attacker_id), target_planet_id: Set(payload.target_planet_id), mission_type: Set("attack".to_string()), arrival_time: Set(arrival), metal: Set(payload.hunters as f64), crystal: Set(payload.cruisers as f64), ships_count: Set(payload.hunters + payload.cruisers), ..Default::default() };
    new_mission.insert(&state.db).await.unwrap();
    (StatusCode::OK, Json(json!({ "status": "success", "message": "Flotte en route", "arrival": arrival }))).into_response()
}

async fn expedition_handler(Path(id): Path<Uuid>, State(state): State<AppState>) -> Response {
    let p_res = Planet::find_by_id(id).one(&state.db).await;
    let p = match p_res { Ok(Some(found)) => found, _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planet not found"}))).into_response() };

    if let Some(date) = p.expedition_end { if date > Utc::now().naive_utc() { return (StatusCode::BAD_REQUEST, Json(json!({"error": "Expedition active"}))).into_response(); } }

    let mut active: planet::ActiveModel = p.clone().into();
    let mut rng = rand::thread_rng();
    let mut loot_metal = 0.0;
    let mut loot_crystal = 0.0;
    let mut logs: Vec<String> = Vec::new();
    let winner; 
    let mut lost_hunters = 0;
    let mut lost_cruisers = 0;

    let combat_triggered = rng.gen_bool(0.3);
    if combat_triggered {
        logs.push("⚠️ RADAR : Signature hostile détectée.".to_string());
        let combat_res = game_logic::simulate_combat(p.light_hunter_count + p.cruiser_count, p.laser_battery_level);
        if combat_res.victory {
            winner = "player";
            loot_metal = rng.gen_range(10000.0..100000.0) * (game_logic::SPEED_FACTOR / 100.0);
            loot_crystal = rng.gen_range(5000.0..50000.0) * (game_logic::SPEED_FACTOR / 100.0);
            logs.push(format!("RESULTAT : {}", combat_res.message));
            logs.push(format!("PILLAGE : +{:.0} Métal, +{:.0} Cristal récupérés.", loot_metal, loot_crystal));
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
    } else {
        winner = "player"; 
        loot_metal = rng.gen_range(20000.0..150000.0) * (game_logic::SPEED_FACTOR / 100.0);
        loot_crystal = rng.gen_range(10000.0..75000.0) * (game_logic::SPEED_FACTOR / 100.0);
        logs.push("SCAN : Secteur calme.".to_string());
        logs.push(format!("DECOUVERTE : Gisement trouvé (+{:.0} Métal, +{:.0} Cristal).", loot_metal, loot_crystal));
    }

    active.metal_amount = Set(p.metal_amount + loot_metal);
    active.crystal_amount = Set(p.crystal_amount + loot_crystal);
    let duration = std::cmp::max(1, (600.0 / game_logic::SPEED_FACTOR) as i64);
    active.expedition_end = Set(Some(Utc::now().naive_utc() + Duration::seconds(duration)));
    if let Err(_) = active.update(&state.db).await { return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "DB Update Error"}))).into_response(); }
    
    let updated_planet = Planet::find_by_id(id).one(&state.db).await.unwrap().unwrap();
    let log_exp = combat_log::ActiveModel { id: Set(Uuid::new_v4()), planet_id: Set(id), target_name: Set("Secteur Inconnu".to_string()), opponent_username: Set(None), mission_type: Set("expedition".to_string()), result: Set(winner.to_string()), loot_metal: Set(loot_metal), loot_crystal: Set(loot_crystal), ships_lost: Set(lost_hunters + lost_cruisers), date: Set(Utc::now().naive_utc()) };
    let _ = log_exp.insert(&state.db).await;

    let response = json!({ "planet": updated_planet, "report": { "winner": winner, "log": logs, "loot": { "metal": loot_metal, "crystal": loot_crystal }, "losses": { "light_hunter": lost_hunters, "cruiser": lost_cruisers } } });
    (StatusCode::OK, Json(response)).into_response()
}

async fn get_reports_handler(Path(id): Path<Uuid>, State(state): State<AppState>) -> Json<Vec<combat_log::Model>> {
    let logs = CombatLog::find().filter(combat_log::Column::PlanetId.eq(id)).order_by_desc(combat_log::Column::Date).limit(50).all(&state.db).await.unwrap_or_default();
    Json(logs)
}

async fn get_transport_logs_handler(Path(id): Path<Uuid>, State(state): State<AppState>) -> Json<Vec<serde_json::Value>> {
    let logs = TransportLog::find().filter(Condition::any().add(transport_log::Column::TargetPlanetId.eq(id)).add(transport_log::Column::SourcePlanetId.eq(id))).order_by_desc(transport_log::Column::Date).limit(50).all(&state.db).await.unwrap_or_default();
    let logs_json: Vec<serde_json::Value> = logs.into_iter().map(|log| {
        let opponent_username = if log.target_planet_id == id { log.source_owner_name.clone() } else { log.target_owner_name.clone() };
        json!({ "id": log.id, "target_planet_id": log.target_planet_id, "target_planet_name": log.target_planet_name, "source_planet_id": log.source_planet_id, "source_planet_name": log.source_planet_name, "opponent_username": opponent_username, "metal": log.metal, "crystal": log.crystal, "deuterium": log.deuterium, "date": log.date })
    }).collect();
    Json(logs_json)
}

fn calculate_flight_time(source_sys: i32, target_sys: i32, speed_factor: f64) -> i64 {
    let distance = (source_sys - target_sys).abs() as f64;
    let base_time = 30.0 + (distance * 10.0); 
    let final_time = base_time / speed_factor;
    std::cmp::max(10, final_time as i64)
}

async fn spy_handler(State(state): State<AppState>, Query(params): Query<HashMap<String, String>>, Json(payload): Json<SpyPayload>) -> impl IntoResponse {
    let attacker_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let attacker_id = Uuid::parse_str(&attacker_id_str).unwrap_or_default();
    let att_planet_opt = Planet::find_by_id(attacker_id).one(&state.db).await.unwrap();
    let def_planet_opt = Planet::find_by_id(payload.target_planet_id).one(&state.db).await.unwrap();

    let att_planet = match att_planet_opt { Some(p) => p, None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Attaquant inconnu"}))).into_response() };
    let def_planet = match def_planet_opt { Some(p) => p, None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Cible inconnue"}))).into_response() };
    if att_planet.spy_probe_count < 1 { return (StatusCode::BAD_REQUEST, Json(json!({"error": "Aucune sonde disponible"}))).into_response(); }

    let mut att_active: planet::ActiveModel = att_planet.clone().into();
    att_active.spy_probe_count = Set(att_planet.spy_probe_count - 1);
    let _ = att_active.update(&state.db).await;

    let tech_diff = att_planet.espionage_tech_level - def_planet.espionage_tech_level;
    let mut detection = "none";
    let mut resources = None;
    let mut fleet = None;
    let mut defense = None;

    if tech_diff >= -1 { detection = "resources"; resources = Some(game_logic::Cost { metal: def_planet.metal_amount, crystal: def_planet.crystal_amount, deuterium: def_planet.deuterium_amount }); }
    if tech_diff >= 1 { detection = "fleet"; let mut fleet_map = HashMap::new(); fleet_map.insert("light_hunter".to_string(), def_planet.light_hunter_count); fleet_map.insert("cruiser".to_string(), def_planet.cruiser_count); fleet_map.insert("recycler".to_string(), def_planet.recycler_count); fleet_map.insert("spy_probe".to_string(), def_planet.spy_probe_count); fleet = Some(fleet_map); }
    if tech_diff >= 2 { detection = "full"; defense = Some(def_planet.missile_launcher_count + def_planet.plasma_turret_count); }

    (StatusCode::OK, Json(json!({ "status": "success", "report": { "success": true, "tech_difference": tech_diff, "detection_level": detection, "resources": resources, "fleet": fleet, "defense": defense } }))).into_response()
}

async fn recycle_handler(State(state): State<AppState>, Query(params): Query<HashMap<String, String>>, Json(payload): Json<RecyclePayload>) -> impl IntoResponse {
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();

    let mut att_planet = match Planet::find_by_id(current_id).one(&state.db).await.unwrap() { Some(p) => p.into_active_model(), None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Planète inconnue"}))).into_response() };
    let target_res = Planet::find_by_id(payload.target_planet_id).one(&state.db).await.unwrap();
    let mut target_planet = match target_res { Some(p) => p.into_active_model(), None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Cible inconnue"}))).into_response() };

    let current_recyclers = att_planet.recycler_count.clone().unwrap();
    if payload.recyclers > current_recyclers || payload.recyclers <= 0 { return (StatusCode::BAD_REQUEST, Json(json!({"error": "Recycleurs insuffisants"}))).into_response(); }

    let capacity = (payload.recyclers as f64) * 20000.0;
    let debris_m = target_planet.debris_metal.clone().unwrap();
    let debris_c = target_planet.debris_crystal.clone().unwrap();
    let total_debris = debris_m + debris_c;
    if total_debris <= 0.0 { return (StatusCode::OK, Json(json!({ "status": "empty", "message": "Aucun débris à recycler." }))).into_response(); }

    let mut harvested_m = 0.0;
    let mut harvested_c = 0.0;
    let mut remaining_capacity = capacity;
    if debris_m > 0.0 { let take = f64::min(debris_m, remaining_capacity); harvested_m = take; remaining_capacity -= take; target_planet.debris_metal = Set(debris_m - take); }
    if debris_c > 0.0 && remaining_capacity > 0.0 { let take = f64::min(debris_c, remaining_capacity); harvested_c = take; target_planet.debris_crystal = Set(debris_c - take); }

    att_planet.metal_amount = Set(att_planet.metal_amount.unwrap() + harvested_m);
    att_planet.crystal_amount = Set(att_planet.crystal_amount.unwrap() + harvested_c);
    let _ = att_planet.update(&state.db).await;
    let _ = target_planet.update(&state.db).await;

    (StatusCode::OK, Json(json!({ "status": "success", "message": format!("Recyclage terminé. +{:.0} Métal, +{:.0} Cristal", harvested_m, harvested_c), "harvested": { "metal": harvested_m, "crystal": harvested_c } }))).into_response()
}

async fn get_galaxy_handler(Path((galaxy_id, system_id)): Path<(i32, i32)>, State(state): State<AppState>, Query(params): Query<HashMap<String, String>>) -> impl IntoResponse {
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();
    let current_planet_opt = Planet::find_by_id(current_id).one(&state.db).await.unwrap_or(None);
    let my_owner_id = current_planet_opt.map(|p| p.owner_id).unwrap_or_default();

    let planets = Planet::find().filter(planet::Column::Galaxy.eq(galaxy_id)).filter(planet::Column::System.eq(system_id)).all(&state.db).await.unwrap_or_default();
    let mut slots: Vec<GalaxySlot> = Vec::new();
    for pos in 1..=15 {
        if let Some(p) = planets.iter().find(|p| p.position == pos) {
            slots.push(GalaxySlot { position: pos, planet_id: Some(p.id), planet_name: Some(p.name.clone()), owner_name: Some(p.name.clone()), owner_id: Some(p.owner_id), debris_metal: p.debris_metal, debris_crystal: p.debris_crystal, is_me: p.id == current_id, is_my_planet: p.owner_id == my_owner_id });
        } else {
            slots.push(GalaxySlot { position: pos, planet_id: None, planet_name: None, owner_name: None, owner_id: None, debris_metal: 0.0, debris_crystal: 0.0, is_me: false, is_my_planet: false });
        }
    }
    Json(slots)
}

async fn get_galaxy_scan_handler(Path(galaxy_id): Path<i32>, State(state): State<AppState>, Query(params): Query<HashMap<String, String>>) -> impl IntoResponse {
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();

    let planets = Planet::find().filter(planet::Column::Galaxy.eq(galaxy_id)).all(&state.db).await.unwrap_or_default();
    let mut systems_map: HashMap<i32, SystemSummary> = HashMap::new();
    for p in planets {
        let entry = systems_map.entry(p.system).or_insert(SystemSummary { system: p.system, planet_count: 0, has_me: false });
        entry.planet_count += 1;
        if p.id == current_id { entry.has_me = true; }
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

async fn colonize_handler(State(state): State<AppState>, Query(params): Query<HashMap<String, String>>, Json(payload): Json<ColonizePayload>) -> impl IntoResponse {
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();

    let mut att_planet = match Planet::find_by_id(current_id).one(&state.db).await.unwrap() { Some(p) => p.into_active_model(), None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Planète inconnue"}))).into_response() };
    let ships = att_planet.colony_ship_count.clone().unwrap();
    if ships < 1 { return (StatusCode::BAD_REQUEST, Json(json!({"error": "Aucun vaisseau de colonisation disponible"}))).into_response(); }

    let exists = Planet::find().filter(planet::Column::Galaxy.eq(payload.galaxy)).filter(planet::Column::System.eq(payload.system)).filter(planet::Column::Position.eq(payload.position)).one(&state.db).await.unwrap();
    if exists.is_some() { return (StatusCode::CONFLICT, Json(json!({"error": "Cet emplacement est déjà occupé"}))).into_response(); }

    let owner_id = att_planet.owner_id.clone().unwrap();
    let password = att_planet.password.clone().unwrap();
    let colony_name = generate_colony_name();
    let new_id = Uuid::new_v4();
    
    let new_planet = planet::ActiveModel { id: Set(new_id), owner_id: Set(owner_id), name: Set(colony_name), password: Set(password), galaxy: Set(payload.galaxy), system: Set(payload.system), position: Set(payload.position), metal_mine_level: Set(1), crystal_mine_level: Set(1), deuterium_mine_level: Set(1), metal_amount: Set(500.0), crystal_amount: Set(500.0), last_update: Set(Utc::now().naive_utc()), ..Default::default() };
    att_planet.colony_ship_count = Set(ships - 1);
    let _ = att_planet.update(&state.db).await;
    let _ = new_planet.insert(&state.db).await;

    (StatusCode::OK, Json(json!({ "status": "success", "message": format!("Colonisation réussie en [{}:{}:{}]", payload.galaxy, payload.system, payload.position), "new_planet_id": new_id }))).into_response()
}

async fn get_my_planets_handler(State(state): State<AppState>, Query(params): Query<HashMap<String, String>>) -> impl IntoResponse {
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();
    let current = Planet::find_by_id(current_id).one(&state.db).await.unwrap();
    if let Some(p) = current {
        let my_planets = Planet::find().filter(planet::Column::OwnerId.eq(p.owner_id)).all(&state.db).await.unwrap_or_default();
        let list: Vec<serde_json::Value> = my_planets.into_iter().map(|mp| json!({ "id": mp.id, "name": mp.name, "galaxy": mp.galaxy, "system": mp.system, "position": mp.position, "is_current": mp.id == current_id })).collect();
        return Json(list).into_response();
    }
    (StatusCode::UNAUTHORIZED, Json(json!({"error": "Planète introuvable"}))).into_response()
}

async fn transport_handler(State(state): State<AppState>, Query(params): Query<HashMap<String, String>>, Json(payload): Json<TransportPayload>) -> impl IntoResponse {
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();
    if current_id == payload.target_planet_id { return (StatusCode::BAD_REQUEST, Json(json!({"error": "Impossible de transporter vers la même planète"}))).into_response(); }

    let source_model = match Planet::find_by_id(current_id).one(&state.db).await.unwrap() { Some(p) => p, None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Planète source inconnue"}))).into_response() };
    let target_model = match Planet::find_by_id(payload.target_planet_id).one(&state.db).await.unwrap() { Some(p) => p, None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète cible inconnue"}))).into_response() };

    let source_user = User::find_by_id(source_model.owner_id).one(&state.db).await.unwrap().unwrap();
    let target_user = User::find_by_id(target_model.owner_id).one(&state.db).await.unwrap().unwrap();

    let source_name = source_model.name.clone();
    let source_id = source_model.id;
    let target_name = target_model.name.clone();
    let target_id = target_model.id;

    if payload.transporters > source_model.transporter_count || payload.transporters <= 0 { return (StatusCode::BAD_REQUEST, Json(json!({"error": "Transporteurs insuffisants"}))).into_response(); }
    if payload.metal > source_model.metal_amount || payload.crystal > source_model.crystal_amount || payload.deuterium > source_model.deuterium_amount { return (StatusCode::BAD_REQUEST, Json(json!({"error": "Ressources insuffisantes"}))).into_response(); }
    
    let total_load = payload.metal + payload.crystal + payload.deuterium;
    let capacity = payload.transporters as f64 * game_logic::TRANSPORTER_CAPACITY;
    if total_load > capacity { return (StatusCode::BAD_REQUEST, Json(json!({"error": "Surcharge !"}))).into_response(); }

    let flight_duration = calculate_flight_time(source_model.system, target_model.system, game_logic::SPEED_FACTOR);
    let arrival = Utc::now().naive_utc() + Duration::seconds(flight_duration);

    let mut source: planet::ActiveModel = source_model.into();
    source.metal_amount = Set(source.metal_amount.unwrap() - payload.metal);
    source.crystal_amount = Set(source.crystal_amount.unwrap() - payload.crystal);
    source.deuterium_amount = Set(source.deuterium_amount.unwrap() - payload.deuterium);
    source.transporter_count = Set(source.transporter_count.unwrap() - payload.transporters);

    let mission = fleet_mission::ActiveModel { id: Set(Uuid::new_v4()), source_planet_id: Set(source_id), target_planet_id: Set(target_id), mission_type: Set("transport".to_string()), arrival_time: Set(arrival), metal: Set(payload.metal), crystal: Set(payload.crystal), deuterium: Set(payload.deuterium), ships_count: Set(payload.transporters) };
    let log = transport_log::ActiveModel { id: Set(Uuid::new_v4()), target_planet_id: Set(target_id), target_planet_name: Set(target_name), target_owner_name: Set(Some(target_user.username)), source_planet_id: Set(source_id), source_planet_name: Set(source_name), source_owner_name: Set(Some(source_user.username)), metal: Set(payload.metal), crystal: Set(payload.crystal), deuterium: Set(payload.deuterium), date: Set(Utc::now().naive_utc()) };

    let _ = source.update(&state.db).await;
    let _ = mission.insert(&state.db).await;
    let _ = log.insert(&state.db).await;

    (StatusCode::OK, Json(json!({ "status": "success", "message": format!("Flotte lancée ! Arrivée dans {}s", flight_duration) }))).into_response()
}

async fn rename_planet_handler(Path(id): Path<Uuid>, State(state): State<AppState>, Json(payload): Json<RenamePlanetPayload>) -> impl IntoResponse {
    let p_opt = Planet::find_by_id(id).one(&state.db).await.unwrap();
    if let Some(p) = p_opt {
        if payload.new_name.trim().is_empty() || payload.new_name.len() > 20 { return (StatusCode::BAD_REQUEST, Json(json!({"error": "Nom invalide"}))).into_response(); }
        let mut active: planet::ActiveModel = p.into();
        active.name = Set(payload.new_name);
        let _ = active.update(&state.db).await;
        return StatusCode::OK.into_response();
    }
    StatusCode::NOT_FOUND.into_response()
}

async fn cancel_construction_handler(Path((planet_id, queue_id)): Path<(Uuid, Uuid)>, State(state): State<AppState>) -> Result<impl IntoResponse, StatusCode> {
    let item = ConstructionQueue::find_by_id(queue_id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?.ok_or(StatusCode::NOT_FOUND)?;
    if item.planet_id != planet_id { return Err(StatusCode::FORBIDDEN); }
    let p = Planet::find_by_id(planet_id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?.ok_or(StatusCode::NOT_FOUND)?;

    let (base_m, base_c, base_d) = match item.building_type.as_str() {
        "light_hunter" | "cruiser" | "recycler" | "spy_probe" | "colony_ship" | "transporter" | "missile_launcher" | "plasma_turret" => {
            let (m, c) = match item.building_type.as_str() {
                "light_hunter" => game_logic::get_light_hunter_stats(), "cruiser" => game_logic::get_unit_cost("cruiser"),
                "recycler" => game_logic::get_unit_cost("recycler"), "spy_probe" => game_logic::get_spy_probe_stats(),
                "colony_ship" => game_logic::get_colony_ship_stats(), "transporter" => game_logic::get_transporter_stats(),
                "missile_launcher" => game_logic::get_missile_launcher_stats(), "plasma_turret" => game_logic::get_plasma_turret_stats(),
                _ => (0.0, 0.0),
            };
            (m * item.level as f64, c * item.level as f64, 0.0)
        },
        _ => {
            let cost = game_logic::get_upgrade_cost(&item.building_type, item.level);
            (cost.metal, cost.crystal, cost.deuterium)
        }
    };

    let total_duration = match item.building_type.as_str() {
        "light_hunter" | "cruiser" | "recycler" | "spy_probe" | "colony_ship" | "transporter" | "missile_launcher" | "plasma_turret" => game_logic::get_ship_production_time(item.level) as f64,
        _ => {
            let facility_level = match item.building_type.as_str() { "research" | "energy_tech" | "laser" | "espionage" | "armour" => p.research_lab_level, _ => p.shipyard_level };
            game_logic::get_build_time(base_m, base_c, facility_level) as f64
        }
    };

    let now = Utc::now().naive_utc();
    let time_left = item.end_time.signed_duration_since(now).num_seconds() as f64;
    let refund_ratio = (time_left / total_duration).clamp(0.0, 0.95); 

    let refund_m = base_m * refund_ratio;
    let refund_c = base_c * refund_ratio;
    let refund_d = base_d * refund_ratio;

    let mut active: planet::ActiveModel = p.into();
    active.metal_amount = Set(active.metal_amount.unwrap() + refund_m);
    active.crystal_amount = Set(active.crystal_amount.unwrap() + refund_c);
    active.deuterium_amount = Set(active.deuterium_amount.unwrap() + refund_d);

    active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    ConstructionQueue::delete_by_id(queue_id).exec(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({ "refund_metal": refund_m, "refund_crystal": refund_c, "refund_deuterium": refund_d, "ratio": refund_ratio })))
}
