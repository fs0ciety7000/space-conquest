use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
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

// ✅ IMPORTS EXPLICITES
use entities::{
    prelude::{Planet, User, CombatLog, FleetMission, TransportLog, Message, ConstructionQueue},
    planet, user, combat_log, fleet_mission, transport_log, message, construction_queue
};

#[derive(Clone)]
struct AppState {
    db: DatabaseConnection,  // ✅ SeaORM utilise DatabaseConnection
}

// ❌ SUPPRIMÉ impl AppState::new() buggé

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



#[tokio::main]
async fn main() {
    // Charge la configuration depuis les variables d'environnement
    let config = Config::from_env();
    
    // Connexion à la base de données
    let db = Database::connect(&config.database_url)
        .await
        .expect("Failed to connect to database");

    // Exécution des migrations
    println!("🔄 Exécution des migrations...");
    match migration::Migrator::up(&db, None).await {
        Ok(_) => println!("✅ Migrations réussies !"),
        Err(e) => eprintln!("❌ Erreur migrations : {:?}", e),
    }

    // ✅ DIRECT - pas de .new()
    let state = AppState { db };

    // ✅ CORS permissive (auto OPTIONS)
    let cors = CorsLayer::permissive();

    let app = Router::new()
        // Auth
        .route("/register", post(auth::register_handler))
        .route("/login", post(auth::login_handler))
        .route("/config", get(get_game_config_handler))
        
        // Planets
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
        
        // 🔵 ADMIN ROUTES (NOUVEAU)
        .route("/admin/players", get(admin::get_all_players_handler))
        .route("/admin/planet/:id", get(admin::get_planet_admin_handler))
        .route("/admin/planet/:id", patch(admin::update_planet_admin_handler))
        
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);
    
   // Utilisation de l'adresse depuis la configuration
    let addr: SocketAddr = config.bind_address()
        .parse()
        .expect("Invalid bind address");
    
    println!("🚀 SPEED_GAME Backend opérationnel sur http://{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// --- HANDLERS MESSAGERIE ---

async fn resolve_attack_mission(
    db: &DatabaseConnection,
    mission: fleet_mission::Model,
) -> Result<(), StatusCode> {
    let now = Utc::now().naive_utc();
    
    // 1. Récupération des entités
    let att_planet = Planet::find_by_id(mission.source_planet_id).one(db).await.unwrap().ok_or(StatusCode::NOT_FOUND)?;
    let att_user = User::find_by_id(att_planet.owner_id).one(db).await.unwrap().ok_or(StatusCode::NOT_FOUND)?;
    let def_planet_raw = Planet::find_by_id(mission.target_planet_id).one(db).await.unwrap().ok_or(StatusCode::NOT_FOUND)?;
    let def_user = User::find_by_id(def_planet_raw.owner_id).one(db).await.unwrap().ok_or(StatusCode::NOT_FOUND)?;

    // 2. Calcul production défenseur
    let mut def_planet = def_planet_raw.clone();
    def_planet.metal_amount = game_logic::calculate_resources(game_logic::ResourceType::Metal, def_planet_raw.metal_mine_level, def_planet_raw.metal_amount, def_planet_raw.last_update, def_planet_raw.energy_tech_level);
    def_planet.crystal_amount = game_logic::calculate_resources(game_logic::ResourceType::Crystal, def_planet_raw.crystal_mine_level, def_planet_raw.crystal_amount, def_planet_raw.last_update, def_planet_raw.energy_tech_level);
    def_planet.deuterium_amount = game_logic::calculate_resources(game_logic::ResourceType::Deuterium, def_planet_raw.deuterium_mine_level, def_planet_raw.deuterium_amount, def_planet_raw.last_update, def_planet_raw.energy_tech_level);

    // 3. Préparation Combat (Variables renommées pour correspondre à la suite)
    let att_hunters = mission.metal as i32; 
    let att_cruisers = mission.crystal as i32;

    let att_techs = game_logic::CombatTechs { 
        laser: att_planet.laser_battery_level, energy: att_planet.energy_tech_level, armour: att_planet.armour_tech_level 
    };
    let def_techs = game_logic::CombatTechs { 
        laser: def_planet.laser_battery_level, energy: def_planet.energy_tech_level, armour: def_planet.armour_tech_level 
    };

    // 4. Appel moteur
    let result = game_logic::resolve_pvp(
        att_hunters, att_cruisers, att_techs,
        def_planet.light_hunter_count, def_planet.cruiser_count, 0, 
        def_planet.missile_launcher_count, def_planet.plasma_turret_count, 
        def_techs, 
        game_logic::Cost { metal: def_planet.metal_amount, crystal: def_planet.crystal_amount, deuterium: def_planet.deuterium_amount }
    );

    // 5. MISE À JOUR DÉFENSEUR
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

    let def_rep_json = json!({
        "winner": result.winner, "log": result.log, "loot": result.loot, "debris": result.debris,
        "losses": { "ships": result.defender_losses, "missiles": result.lost_missiles, "plasmas": result.lost_plasmas },
        "is_defense": true, "opponent_name": att_user.username
    });
    def_active.unread_report = Set(Some(to_string(&def_rep_json).unwrap()));
    def_active.update(db).await.unwrap();

    // 6. MISE À JOUR ATTAQUANT (Butin + Survivants + Rapport)
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

    let att_rep_json = json!({
        "winner": result.winner, "log": result.log, "loot": result.loot, "debris": result.debris,
        "losses": { "ships": result.attacker_losses }, "is_defense": false, "opponent_name": def_user.username
    });
    att_active.unread_report = Set(Some(to_string(&att_rep_json).unwrap()));
    att_active.update(db).await.unwrap();

    // 7. Logs Historiques
    let _ = combat_log::ActiveModel {
        id: Set(Uuid::new_v4()), planet_id: Set(mission.target_planet_id), target_name: Set(att_planet.name.clone()),
        opponent_username: Set(Some(att_user.username.clone())), mission_type: Set("defense".into()),
        result: Set(if result.winner == "defender" { "victory".into() } else { "defeat".into() }),
        loot_metal: Set(-result.loot.metal), loot_crystal: Set(-result.loot.crystal), ships_lost: Set(result.defender_losses), date: Set(now),
    }.insert(db).await;

    let _ = combat_log::ActiveModel {
        id: Set(Uuid::new_v4()), planet_id: Set(mission.source_planet_id), target_name: Set(def_planet.name.clone()),
        opponent_username: Set(Some(def_user.username.clone())), mission_type: Set("attack".into()),
        result: Set(if result.winner == "attacker" { "victory".into() } else { "defeat".into() }),
        loot_metal: Set(result.loot.metal), loot_crystal: Set(result.loot.crystal), ships_lost: Set(result.attacker_losses), date: Set(now),
    }.insert(db).await;

    // 8. Suppression mission
    FleetMission::delete_by_id(mission.id).exec(db).await.unwrap();
    Ok(())
}

async fn get_messages_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "User ID invalide"}))).into_response(),
    };

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
    
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let _sender_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();

    let sender_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Expéditeur invalide"}))).into_response(),
    };

    let recipient = User::find()
        .filter(user::Column::Username.eq(&payload.recipient_name))
        .one(&state.db)
        .await
        .unwrap_or(None);

    let recipient_id = match recipient {
        Some(u) => u.id,
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Commandant introuvable"}))).into_response(),
    };

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
    let sort_type = params.get("type").map(|s| s.as_str()).unwrap_or("general");

    let planets = Planet::find().all(&state.db).await.unwrap_or_default();
    let users = User::find().all(&state.db).await.unwrap_or_default();
    
    let user_map: HashMap<Uuid, String> = users.into_iter()
        .map(|u| (u.id, u.username))
        .collect();

    let mut ranked_planets: Vec<RankItem> = planets.into_iter().map(|p| {
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

    match sort_type {
        "economy" => ranked_planets.sort_by(|a, b| b.economy_score.cmp(&a.economy_score)),
        "military" => ranked_planets.sort_by(|a, b| b.military_score.cmp(&a.military_score)),
        _ => ranked_planets.sort_by(|a, b| b.total_score.cmp(&a.total_score)),
    }

    for (i, item) in ranked_planets.iter_mut().enumerate() { item.rank = i + 1; }
    Json(ranked_planets)
}

// Reste des handlers identiques (get_planet, upgrade_mine, attack, etc. - tronqué pour la taille du message)
// Le fichier complet est disponible dans le repo

// ... (Tous les autres handlers restent identiques)
