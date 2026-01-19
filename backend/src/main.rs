use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post, delete, patch},
    Router,
};
use sea_orm::{
    ActiveModelTrait, 
    DatabaseConnection,
    Database,
    EntityTrait, 
    Set, 
    IntoActiveModel,     // ✅ Ajoute celui-ci
    QueryFilter, 
    QueryOrder, 
    QuerySelect,         // ✅ Ajoute celui-ci
    ColumnTrait, 
    Condition,
    PaginatorTrait,      // ✅ Ajoute celui-ci
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
mod messaging;
mod market;
use config::Config;
use backend::AppState;

// ✅ IMPORTS EXPLICITES
use entities::{
    prelude::{Planet, User, CombatLog, FleetMission, TransportLog, ConstructionQueue, MarketListing, MarketTransaction, MarketPriceHistory},
    planet, user, combat_log, fleet_mission, transport_log, construction_queue, market_listing, market_transaction, market_price_history
};

#[derive(Serialize, Clone)]
struct PlanetInfo {
    id: Uuid,
    name: String,
    total_score: i32,
    economy_score: i32,
    military_score: i32,
    galaxy: i32,
    system: i32,
    position: i32,
}

#[derive(Serialize)]
struct RankItem {
    rank: usize,
    username: String,
    total_score: i32,
    economy_score: i32,
    military_score: i32,
    is_me: bool,
    owner_id: Uuid,
    planets: Vec<PlanetInfo>,
    rank_badge: String,
}

#[derive(Deserialize)]
struct AttackPayload {
    target_planet_id: Uuid,
    hunters: i32,
    cruisers: i32,
}

#[derive(Deserialize)]
struct ColonizePayload {
    galaxy: i32,
    system: i32,
    position: i32,
}

#[derive(Deserialize)]
struct ExpeditionPayload {
    hunters: i32,
    cruisers: i32,
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

#[derive(Serialize)]
pub struct UserResponse {
    id: Uuid,
    username: String,
    email: String,
    
}


#[tokio::main]
async fn main() {
    let config = Config::from_env();
    
    let db = Database::connect(&config.database_url)
        .await
        .expect("Failed to connect to database");

    println!("🔄 Exécution des migrations...");
    match migration::Migrator::up(&db, None).await {
        Ok(_) => println!("✅ Migrations réussies !"),
        Err(e) => eprintln!("❌ Erreur migrations : {:?}", e),
    }

    let state = AppState { db };
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
        .route("/planets/:id/expedition/scout", post(scout_expedition_handler))
        .route("/planets/:id/clear-report", post(clear_report_handler))
        .route("/planets/:id/reports", get(get_reports_handler))
        .route("/combat-reports/:id/detail", get(get_combat_report_detail_handler))
        .route("/planets/:id/transport-logs", get(get_transport_logs_handler))
        .route("/planets/:id/rename", post(rename_planet_handler))
        .route("/planets/:id/resource-slots", get(get_resource_slots_handler))
        .route("/planets/:id/resource-slots/:slot_number", patch(update_resource_slot_handler))
        .route("/planets/:id/resource-slots/:slot_number/toggle", post(toggle_resource_slot_handler))
        .route("/my-planets", get(get_my_planets_handler))
        // Actions
        .route("/attack", post(attack_handler))
        .route("/spy", post(spy_handler))
        .route("/recycle", post(recycle_handler))
        .route("/transport", post(transport_handler))
        .route("/colonize", post(colonize_handler))

        //UNITS
        .route("/unit-costs", get(get_unit_costs_handler))
        // Galaxy & Ranking
        .route("/ranking", get(get_ranking_handler))
        .route("/galaxy/:galaxy/:system", get(get_galaxy_handler))
        .route("/galaxy/:galaxy/scan", get(get_galaxy_scan_handler))
        // Messagerie V2 (via module)
        // Dans la section des routes de messagerie
.route("/conversations", get(messaging::get_conversations_handler))
.route("/conversations/:id/messages", get(messaging::get_thread_messages_handler))
.route("/conversations/:id/read", post(messaging::mark_conversation_read_handler))
.route("/conversations/:id/archive", post(messaging::toggle_archive_conversation_handler)) // ✅ AJOUT
.route("/conversations/:id", delete(messaging::delete_conversation_handler))
.route("/send-message-v2", post(messaging::send_message_v2_handler))

.route("/users/:id", get(get_user_handler))
.route("/users/:id/username", patch(update_username_handler))
.route("/players/:user_id/profile", get(get_player_profile_handler))
        // Market
        .route("/market/listings", get(get_market_listings_handler))
        .route("/market/listings", post(create_market_listing_handler))
        .route("/market/listings/:id", delete(cancel_market_listing_handler))
        .route("/market/buy", post(buy_from_listing_handler))
        .route("/market/npc/buy", post(buy_from_npc_handler))
        .route("/market/transactions", get(get_market_transactions_handler))
        .route("/market/stats", get(get_market_stats_handler))
        .route("/market/prices/history", get(get_price_history_handler))
        // Changelog
        .route("/changelog", get(get_changelog_handler))
        // Admin
        .route("/admin/players", get(admin::get_all_players_handler))
        .route("/admin/planet/:id", get(admin::get_planet_admin_handler))
        .route("/admin/planet/:id", patch(admin::update_planet_admin_handler))
        .route("/admin/stats", get(admin::get_server_stats_handler))
        .route("/admin/config", get(admin::get_server_config_handler))
        .route("/admin/config", patch(admin::update_server_config_handler))
        .route("/admin/user/:id/role", patch(admin::update_user_role_handler))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);
    
    let addr: SocketAddr = config.bind_address()
        .parse()
        .expect("Invalid bind address");
    
    println!("🚀 SPEED_GAME Backend opérationnel sur http://{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}


fn extract_user_id_from_token(token: &str) -> Option<Uuid> {
    // Token format: "jwt-{uuid}"
    token.strip_prefix("jwt-")
        .and_then(|id| Uuid::parse_str(id).ok())
}

// --- COMBAT RESOLUTION ---

async fn resolve_attack_mission(
    db: &DatabaseConnection,
    mission: fleet_mission::Model,
) -> Result<(), StatusCode> {
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

    let att_techs = game_logic::CombatTechs { 
        laser: att_planet.laser_battery_level, energy: att_planet.energy_tech_level, armour: att_planet.armour_tech_level 
    };
    let def_techs = game_logic::CombatTechs { 
        laser: def_planet.laser_battery_level, energy: def_planet.energy_tech_level, armour: def_planet.armour_tech_level 
    };

    let result = game_logic::resolve_pvp(
        att_hunters, att_cruisers, att_techs,
        def_planet.light_hunter_count, def_planet.cruiser_count, 0, 
        def_planet.missile_launcher_count, def_planet.plasma_turret_count, 
        def_techs, 
        game_logic::Cost { metal: def_planet.metal_amount, crystal: def_planet.crystal_amount, deuterium: def_planet.deuterium_amount }
    );

    let mut def_active: planet::ActiveModel = def_planet_raw.clone().into();
    let mut planet_conquered = false;
    let mut conquest_notification = String::new();

    if result.winner == "attacker" {
        // Calculer le pourcentage de ressources volées
        let total_resources_before = def_planet.metal_amount + def_planet.crystal_amount + def_planet.deuterium_amount;
        let total_loot = result.loot.metal + result.loot.crystal + result.loot.deuterium;
        let loot_percentage = if total_resources_before > 0.0 {
            (total_loot / total_resources_before) * 100.0
        } else {
            0.0
        };

        // Vérifier si c'est une conquête de planète (99% des ressources volées)
        if loot_percentage >= 99.0 {
            // Vérifier combien de planètes possède le défenseur
            let defender_planets = Planet::find()
                .filter(planet::Column::OwnerId.eq(def_user.id))
                .count(db)
                .await
                .unwrap_or(0);

            // On ne peut conquérir que si le défenseur a plus d'une planète
            if defender_planets > 1 {
                planet_conquered = true;
                conquest_notification = format!("🎯 CONQUÊTE ! Vous avez conquis la planète {} !", def_planet.name);

                // Transférer la propriété
                def_active.owner_id = Set(att_user.id);

                // Notification pour le défenseur
                let defender_notif = json!({
                    "type": "planet_lost",
                    "message": format!("⚠️ ALERTE CRITIQUE ! Votre planète {} a été conquise par {} !", def_planet.name, att_user.username)
                });
                // On stocke cette notification dans unread_report
            }
        }

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

    let def_rep_json = if planet_conquered {
        json!({
            "type": "planet_lost",
            "message": format!("⚠️ ALERTE CRITIQUE ! Votre planète {} a été conquise par {} !", def_planet.name, att_user.username),
            "winner": result.winner,
            "log": result.log,
            "loot": result.loot,
            "debris": result.debris,
            "losses": { "ships": result.defender_losses, "missiles": result.lost_missiles, "plasmas": result.lost_plasmas },
            "is_defense": true,
            "opponent_name": att_user.username,
            "conquered": true
        })
    } else {
        json!({
            "winner": result.winner, "log": result.log, "loot": result.loot, "debris": result.debris,
            "losses": { "ships": result.defender_losses, "missiles": result.lost_missiles, "plasmas": result.lost_plasmas },
            "is_defense": true, "opponent_name": att_user.username,
            "conquered": false
        })
    };
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

    let att_rep_json = if planet_conquered {
        json!({
            "type": "planet_conquered",
            "message": format!("🎯 CONQUÊTE RÉUSSIE ! Vous avez conquis la planète {} de {} !", def_planet.name, def_user.username),
            "winner": result.winner,
            "log": result.log,
            "loot": result.loot,
            "debris": result.debris,
            "losses": { "ships": result.attacker_losses },
            "is_defense": false,
            "opponent_name": def_user.username,
            "conquered": true,
            "conquered_planet_id": def_planet.id,
            "conquered_planet_name": def_planet.name.clone()
        })
    } else {
        json!({
            "winner": result.winner, "log": result.log, "loot": result.loot, "debris": result.debris,
            "losses": { "ships": result.attacker_losses }, "is_defense": false, "opponent_name": def_user.username,
            "conquered": false
        })
    };
    att_active.unread_report = Set(Some(to_string(&att_rep_json).unwrap()));
    att_active.update(db).await.unwrap();

    // Combat log pour le défenseur
    let _ = combat_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        planet_id: Set(mission.target_planet_id),
        target_name: Set(att_planet.name.clone()),
        opponent_username: Set(Some(att_user.username.clone())),
        mission_type: Set(if planet_conquered { "planet_lost".into() } else { "defense".into() }),
        result: Set(if result.winner == "defender" { "victory".into() } else { "defeat".into() }),
        loot_metal: Set(-result.loot.metal),
        loot_crystal: Set(-result.loot.crystal),
        ships_lost: Set(result.defender_losses),
        date: Set(now),
        detailed_report: Set(Some(def_rep_json.clone())),
    }.insert(db).await;

    // Combat log pour l'attaquant
    let _ = combat_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        planet_id: Set(mission.source_planet_id),
        target_name: Set(def_planet.name.clone()),
        opponent_username: Set(Some(def_user.username.clone())),
        mission_type: Set(if planet_conquered { "planet_conquered".into() } else { "attack".into() }),
        result: Set(if result.winner == "attacker" { "victory".into() } else { "defeat".into() }),
        loot_metal: Set(result.loot.metal),
        loot_crystal: Set(result.loot.crystal),
        ships_lost: Set(result.attacker_losses),
        date: Set(now),
        detailed_report: Set(Some(att_rep_json.clone())),
    }.insert(db).await;

    FleetMission::delete_by_id(mission.id).exec(db).await.unwrap();
    Ok(())
}

// --- GAME HANDLERS ---

async fn get_game_config_handler() -> impl IntoResponse {
    Json(json!({ "speed_factor": game_logic::SPEED_FACTOR }))
}

async fn get_ranking_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {

    let current_planet_id = params.get("current_planet_id")
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_default();

    let sort_type = params.get("type").map(|s| s.as_str()).unwrap_or("general");

    let planets = Planet::find().all(&state.db).await.unwrap_or_default();
    let users = User::find().all(&state.db).await.unwrap_or_default();

    // Créer un map utilisateur -> nom
    let user_map: HashMap<Uuid, String> = users.iter()
        .map(|u| (u.id, u.username.clone()))
        .collect();

    // Trouver l'owner_id de la planète actuelle pour "is_me"
    let current_owner_id = planets.iter()
        .find(|p| p.id == current_planet_id)
        .map(|p| p.owner_id);

    // Grouper les planètes par propriétaire
    let mut user_planets: HashMap<Uuid, Vec<planet::Model>> = HashMap::new();
    for planet in planets {
        user_planets.entry(planet.owner_id).or_insert_with(Vec::new).push(planet);
    }

    // Créer les RankItems (un par joueur)
    let mut ranked_users: Vec<RankItem> = user_planets.into_iter().map(|(owner_id, planets)| {
        let mut total_score = 0;
        let mut total_economy = 0;
        let mut total_military = 0;

        let planet_infos: Vec<PlanetInfo> = planets.iter().map(|p| {
            let (total, economy, military) = game_logic::calculate_planet_points(p);
            total_score += total;
            total_economy += economy;
            total_military += military;

            PlanetInfo {
                id: p.id,
                name: p.name.clone(),
                total_score: total,
                economy_score: economy,
                military_score: military,
                galaxy: p.galaxy,
                system: p.system,
                position: p.position,
            }
        }).collect();

        let username = user_map.get(&owner_id).cloned().unwrap_or("Inconnu".to_string());
        let is_me = current_owner_id.map(|id| id == owner_id).unwrap_or(false);
        let rank_badge = game_logic::get_rank_badge(total_score);

        RankItem {
            rank: 0,
            username,
            total_score,
            economy_score: total_economy,
            military_score: total_military,
            is_me,
            owner_id,
            planets: planet_infos,
            rank_badge: rank_badge.to_string(),
        }
    }).collect();

    // Tri selon le type demandé
    match sort_type {
        "economy" => ranked_users.sort_by(|a, b| b.economy_score.cmp(&a.economy_score)),
        "military" => ranked_users.sort_by(|a, b| b.military_score.cmp(&a.military_score)),
        _ => ranked_users.sort_by(|a, b| b.total_score.cmp(&a.total_score)),
    }

    // Assigner les rangs
    for (i, item) in ranked_users.iter_mut().enumerate() {
        item.rank = i + 1;
    }

    Json(ranked_users)
}


async fn get_planet_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    use entities::{prelude::ResourceSlot, resource_slot};

    let p = Planet::find_by_id(id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?.ok_or(StatusCode::NOT_FOUND)?;
    let now = Utc::now().naive_utc();
    let mut active: planet::ActiveModel = p.clone().into();

    // Récupérer les slots bonus (5-8) depuis la table resource_slots
    let slots = ResourceSlot::find()
        .filter(resource_slot::Column::PlanetId.eq(id))
        .filter(resource_slot::Column::SlotNumber.gte(5))
        .filter(resource_slot::Column::IsActive.eq(true))
        .filter(resource_slot::Column::IsLocked.eq(false))
        .all(&state.db)
        .await
        .unwrap_or_default();

    // Convertir en format Option<String> pour compatibilité avec les fonctions existantes
    let slot_1: Option<String> = slots.iter().find(|s| s.slot_number == 5).map(|s| s.resource_type.clone());
    let slot_2: Option<String> = slots.iter().find(|s| s.slot_number == 6).map(|s| s.resource_type.clone());
    let slot_3: Option<String> = slots.iter().find(|s| s.slot_number == 7).map(|s| s.resource_type.clone());
    let slot_4: Option<String> = slots.iter().find(|s| s.slot_number == 8).map(|s| s.resource_type.clone());

    // Calculate energy ratio
    let energy_ratio = game_logic::calculate_energy_ratio(
        p.solar_plant_level,
        p.energy_tech_level,
        p.metal_mine_level,
        p.crystal_mine_level,
        p.deuterium_mine_level
    );

    let elapsed = now.signed_duration_since(p.last_update).num_seconds();
    if elapsed > 0 {
        // Utiliser la nouvelle fonction avec prise en compte des slots
        active.metal_amount = Set(game_logic::calculate_resources_with_slots(
            game_logic::ResourceType::Metal, p.metal_mine_level, p.metal_amount, p.last_update,
            p.energy_tech_level, energy_ratio, &slot_1, &slot_2, &slot_3, &slot_4
        ));
        active.crystal_amount = Set(game_logic::calculate_resources_with_slots(
            game_logic::ResourceType::Crystal, p.crystal_mine_level, p.crystal_amount, p.last_update,
            p.energy_tech_level, energy_ratio, &slot_1, &slot_2, &slot_3, &slot_4
        ));
        active.deuterium_amount = Set(game_logic::calculate_resources_with_slots(
            game_logic::ResourceType::Deuterium, p.deuterium_mine_level, p.deuterium_amount, p.last_update,
            p.energy_tech_level, energy_ratio, &slot_1, &slot_2, &slot_3, &slot_4
        ));
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
            "spy_probe" => active.spy_probe_count = Set(active.spy_probe_count.unwrap() + item.level),
            "transporter" => active.transporter_count = Set(active.transporter_count.unwrap() + item.level),
            "colony_ship" => active.colony_ship_count = Set(active.colony_ship_count.unwrap() + item.level),
            "recycler" => active.recycler_count = Set(active.recycler_count.unwrap() + item.level),
            _ => {}
        }
        let _ = ConstructionQueue::delete_by_id(item.id).exec(&state.db).await;
    }

    let arrived = FleetMission::find()
        .filter(Condition::any().add(fleet_mission::Column::TargetPlanetId.eq(id)).add(fleet_mission::Column::SourcePlanetId.eq(id)))
        .filter(fleet_mission::Column::ArrivalTime.lte(now))
        .all(&state.db).await.unwrap_or_default();

    for m in arrived {
        if m.mission_type == "attack" {
            let _ = resolve_attack_mission(&state.db, m).await;
        } else if m.mission_type == "transport" {
            // Si c'est la planète cible, on crédite les ressources
            if m.target_planet_id == id {
                active.metal_amount = Set(active.metal_amount.clone().unwrap() + m.metal);
                active.crystal_amount = Set(active.crystal_amount.clone().unwrap() + m.crystal);
                active.deuterium_amount = Set(active.deuterium_amount.clone().unwrap() + m.deuterium);
            }

            // Retourner les transporteurs à la planète source
            if let Ok(Some(mut source_planet)) = Planet::find_by_id(m.source_planet_id).one(&state.db).await {
                let mut source_active: planet::ActiveModel = source_planet.into();
                source_active.transporter_count = Set(source_active.transporter_count.clone().unwrap() + m.ships_count);
                let _ = source_active.update(&state.db).await;
            }

            let _ = FleetMission::delete_by_id(m.id).exec(&state.db).await;
        }
    }

    let incoming_raw = FleetMission::find().filter(fleet_mission::Column::TargetPlanetId.eq(id)).all(&state.db).await.unwrap_or_default();
    let outgoing_raw = FleetMission::find().filter(fleet_mission::Column::SourcePlanetId.eq(id)).all(&state.db).await.unwrap_or_default();

    let mut outgoing_detailed = Vec::new();
    for m in outgoing_raw {
        let target_p = Planet::find_by_id(m.target_planet_id).one(&state.db).await.ok().flatten();
        let mut val = serde_json::to_value(&m).unwrap();
        if let Some(tp) = target_p {
            if let Some(obj) = val.as_object_mut() {
                obj.insert("target_name".into(), json!(tp.name));
                obj.insert("coords".into(), json!(format!("[{}:{}:{}]", tp.galaxy, tp.system, tp.position)));
            }
        }
        outgoing_detailed.push(val);
    }

    let updated_model = active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Calculate energy using new functions with slots
    let energy_prod = game_logic::calculate_energy_production_with_slots(
        updated_model.solar_plant_level, updated_model.energy_tech_level,
        &slot_1, &slot_2, &slot_3, &slot_4
    );
    let energy_cons = game_logic::calculate_energy_consumption(updated_model.metal_mine_level, updated_model.crystal_mine_level, updated_model.deuterium_mine_level);
    let energy_ratio_percent = (energy_ratio * 100.0) as i32; // Convert to percentage

    // Calculer les infos sur les slots
    let next_slot = game_logic::get_next_slot_to_unlock(&slot_1, &slot_2, &slot_3, &slot_4);
    let next_slot_cost = next_slot.map(game_logic::get_slot_unlock_cost);

    // ✅ AJOUT : Calculer les messages non lus
    let unread_messages = count_unread_messages(p.owner_id, &state.db).await;

    let mut json_response = serde_json::to_value(&updated_model).unwrap();
    if let Some(obj) = json_response.as_object_mut() {
        obj.insert("incoming_missions".into(), json!(incoming_raw));
        obj.insert("outgoing_missions".into(), json!(outgoing_detailed));
        obj.insert("energy".into(), json!(energy_prod as i32 - energy_cons as i32));
        obj.insert("energy_production".into(), json!(energy_prod as i32));
        obj.insert("energy_consumption".into(), json!(energy_cons as i32));
        obj.insert("energy_ratio".into(), json!(energy_ratio_percent));
        obj.insert("unread_messages".into(), json!(unread_messages));
        let active_queue = ConstructionQueue::find().filter(construction_queue::Column::PlanetId.eq(p.id)).order_by_asc(construction_queue::Column::EndTime).all(&state.db).await.unwrap_or_default();
        obj.insert("constructions".into(), json!(active_queue));

        // Infos sur les slots de production
        obj.insert("next_slot_to_unlock".into(), json!(next_slot));
        if let Some(cost) = next_slot_cost {
            obj.insert("next_slot_cost".into(), json!({
                "metal": cost.metal,
                "crystal": cost.crystal,
                "deuterium": cost.deuterium
            }));
        }

        // Bonus de production par slots
        let metal_slots = game_logic::count_slots_for_resource(&slot_1, &slot_2, &slot_3, &slot_4, "metal");
        let crystal_slots = game_logic::count_slots_for_resource(&slot_1, &slot_2, &slot_3, &slot_4, "crystal");
        let energy_slots = game_logic::count_slots_for_resource(&slot_1, &slot_2, &slot_3, &slot_4, "energy");
        let deuterium_slots = game_logic::count_slots_for_resource(&slot_1, &slot_2, &slot_3, &slot_4, "deuterium");

        obj.insert("slot_bonuses".into(), json!({
            "metal": format!("+{}%", metal_slots * 50),
            "crystal": format!("+{}%", crystal_slots * 50),
            "energy": format!("+{}%", energy_slots * 50),
            "deuterium": format!("+{}%", deuterium_slots * 50)
        }));
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

    let active_constructions = ConstructionQueue::find()
        .filter(construction_queue::Column::PlanetId.eq(p.id))
        .count(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if active_constructions >= 3 {
        return Err(StatusCode::CONFLICT);
    }

    let in_queue_count = ConstructionQueue::find()
        .filter(construction_queue::Column::PlanetId.eq(p.id))
        .filter(construction_queue::Column::BuildingType.eq(&type_mine))
        .count(&state.db)
        .await
        .unwrap_or(0);

    let base_level = match type_mine.as_str() {
        "metal" => p.metal_mine_level,
        "crystal" => p.crystal_mine_level,
        "deuterium" => p.deuterium_mine_level,
        "energy_tech" => p.energy_tech_level,
        "research" => p.research_lab_level,
        "solar_plant" => p.solar_plant_level,
        "shipyard" => p.shipyard_level,
        "laser" => p.laser_battery_level,
        "espionage" => p.espionage_tech_level,
        "armour" => p.armour_tech_level,
        "hangar" => p.hangar_level,
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    let target_level = base_level + (in_queue_count as i32) + 1;
    let cost = game_logic::get_upgrade_cost(&type_mine, target_level);

    if p.metal_amount < cost.metal || p.crystal_amount < cost.crystal || p.deuterium_amount < cost.deuterium {
        return Err(StatusCode::BAD_REQUEST);
    }

    let facility_level = match type_mine.as_str() {
        "research" | "energy_tech" | "laser" | "espionage" | "armour" => p.research_lab_level,
        _ => p.shipyard_level,
    };

    let build_time = game_logic::get_build_time(cost.metal, cost.crystal, facility_level);
    
    let mut active: planet::ActiveModel = p.clone().into();
    active.metal_amount = Set(active.metal_amount.unwrap() - cost.metal);
    active.crystal_amount = Set(active.crystal_amount.unwrap() - cost.crystal);
    active.deuterium_amount = Set(active.deuterium_amount.unwrap() - cost.deuterium);
    active.update(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let queue_item = construction_queue::ActiveModel {
        id: Set(Uuid::new_v4()),
        planet_id: Set(p.id),
        building_type: Set(type_mine),
        level: Set(target_level),
        end_time: Set(Utc::now().naive_utc() + Duration::seconds(build_time)),
    };
    
    queue_item.insert(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}

async fn build_fleet_handler(
    Path((id, type_ship, qty)): Path<(Uuid, String, i32)>,
    State(state): State<AppState>,
) -> Result<StatusCode, StatusCode> {
    let p = Planet::find_by_id(id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?.ok_or(StatusCode::NOT_FOUND)?;

    if qty <= 0 { return Err(StatusCode::BAD_REQUEST); }

    // Vérifier le nombre de constructions actives (max 3 pour vaisseaux, illimité pour défenses)
    let is_defense = ["missile_launcher", "plasma_turret"].contains(&type_ship.as_str());

    if !is_defense {
        let active_ship_constructions = ConstructionQueue::find()
            .filter(construction_queue::Column::PlanetId.eq(p.id))
            .all(&state.db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .iter()
            .filter(|c| !["missile_launcher", "plasma_turret"].contains(&c.building_type.as_str()))
            .count();

        if active_ship_constructions >= 3 { return Err(StatusCode::CONFLICT); }
    }

    if !is_defense {
        let current_fleet_size = p.light_hunter_count + p.cruiser_count + p.recycler_count 
                               + p.spy_probe_count + p.colony_ship_count + p.transporter_count;
        let max_capacity = game_logic::get_fleet_capacity(p.hangar_level);
        
        let pending_in_queue: i32 = ConstructionQueue::find()
            .filter(construction_queue::Column::PlanetId.eq(p.id))
            .all(&state.db)
            .await
            .unwrap_or_default()
            .iter()
            .filter(|i| ["light_hunter", "cruiser", "transporter", "colony_ship", "recycler", "spy_probe"].contains(&i.building_type.as_str()))
            .map(|i| i.level) 
            .sum();

        if (current_fleet_size + pending_in_queue + qty) > max_capacity { 
            return Err(StatusCode::CONFLICT); 
        }
    }
    
    if game_logic::check_prerequisites(&p, &type_ship).is_err() { return Err(StatusCode::FORBIDDEN); }

    let (cost_m, cost_c) = match type_ship.as_str() {
        "light_hunter" => game_logic::get_light_hunter_stats(),
        "cruiser" => game_logic::get_cruiser_stats(),
        "recycler" => game_logic::get_recycler_stats(),
        "spy_probe" => game_logic::get_spy_probe_stats(),
        "missile_launcher" => game_logic::get_missile_launcher_stats(),
        "plasma_turret" => game_logic::get_plasma_turret_stats(),
        "colony_ship" => game_logic::get_colony_ship_stats(),
        "transporter" => game_logic::get_transporter_stats(),
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

    let queue_item = construction_queue::ActiveModel {
        id: Set(Uuid::new_v4()),
        planet_id: Set(p.id),
        building_type: Set(type_ship),
        level: Set(qty), 
        end_time: Set(Utc::now().naive_utc() + Duration::seconds(build_time)),
    };
    
    queue_item.insert(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
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

    let att_planet = match Planet::find_by_id(attacker_id).one(&state.db).await {
        Ok(Some(p)) => p, 
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Attaquant introuvable"}))).into_response(),
    };

    let target_planet = match Planet::find_by_id(payload.target_planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Cible introuvable"}))).into_response(),
    };

    if payload.hunters > att_planet.light_hunter_count || payload.cruisers > att_planet.cruiser_count {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Flotte insuffisante"}))).into_response();
    }

    let dist = game_logic::calculate_distance(
        (att_planet.galaxy, att_planet.system, att_planet.position),
        (target_planet.galaxy, target_planet.system, target_planet.position)
    );
    let travel_time = game_logic::calculate_flight_time(dist, game_logic::SPEED_FACTOR);
    let arrival = Utc::now().naive_utc() + Duration::seconds(travel_time);

    let mut att_active: planet::ActiveModel = att_planet.into();
    att_active.light_hunter_count = Set(att_active.light_hunter_count.unwrap() - payload.hunters);
    att_active.cruiser_count = Set(att_active.cruiser_count.unwrap() - payload.cruisers);
    att_active.update(&state.db).await.unwrap();

    let new_mission = fleet_mission::ActiveModel {
        id: Set(Uuid::new_v4()),
        source_planet_id: Set(attacker_id),
        target_planet_id: Set(payload.target_planet_id),
        mission_type: Set("attack".to_string()),
        arrival_time: Set(arrival),
        metal: Set(payload.hunters as f64),
        crystal: Set(payload.cruisers as f64),
        ships_count: Set(payload.hunters + payload.cruisers),
        ..Default::default()
    };
    new_mission.insert(&state.db).await.unwrap();

    (StatusCode::OK, Json(json!({ 
        "status": "success", 
        "message": "Flotte en route",
        "arrival": arrival 
    }))).into_response()
}

async fn expedition_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<ExpeditionPayload>,
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

    // Validation du nombre de vaisseaux
    let hunters = payload.hunters;
    let cruisers = payload.cruisers;
    if hunters + cruisers <= 0 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Nombre de vaisseaux invalide"}))).into_response();
    }
    if hunters > p.light_hunter_count {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Pas assez de chasseurs"}))).into_response();
    }
    if cruisers > p.cruiser_count {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Pas assez de croiseurs"}))).into_response();
    }

    let mut active: planet::ActiveModel = p.clone().into();
    let mut logs: Vec<String> = Vec::new();
    let winner;
    let mut lost_hunters = 0;
    let mut lost_cruisers = 0;

    let combat_triggered = rand::thread_rng().gen_bool(0.3);

    // Calcul des gains basé sur la taille et type de flotte
    // Chasseurs: 50-100 métal, 20-50 cristal, 10-25 deutérium (50% chance)
    // Croiseurs: 150-250 métal, 60-100 cristal, 30-60 deutérium (50% chance)
    let base_metal_per_hunter = 50.0 + rand::thread_rng().gen_range(0.0..=50.0);
    let base_crystal_per_hunter = 20.0 + rand::thread_rng().gen_range(0.0..=30.0);
    let base_deut_per_hunter = 10.0 + rand::thread_rng().gen_range(0.0..=15.0);
    let base_metal_per_cruiser = 150.0 + rand::thread_rng().gen_range(0.0..=100.0);
    let base_crystal_per_cruiser = 60.0 + rand::thread_rng().gen_range(0.0..=40.0);
    let base_deut_per_cruiser = 30.0 + rand::thread_rng().gen_range(0.0..=30.0);

    // 50% de chance de trouver du deutérium
    let found_deuterium = rand::thread_rng().gen_bool(0.5);

    let total_ships = hunters + cruisers;

    let (loot_metal, loot_crystal, loot_deuterium) = if combat_triggered {
        logs.push("⚠️ RADAR : Signature hostile détectée.".to_string());
        let combat_res = game_logic::simulate_combat(total_ships, p.laser_battery_level);

        if combat_res.victory {
            winner = "player";
            // Gains proportionnels au nombre et type de vaisseaux
            let metal = (base_metal_per_hunter * hunters as f64 + base_metal_per_cruiser * cruisers as f64) * (game_logic::SPEED_FACTOR / 100.0);
            let crystal = (base_crystal_per_hunter * hunters as f64 + base_crystal_per_cruiser * cruisers as f64) * (game_logic::SPEED_FACTOR / 100.0);
            let deuterium = if found_deuterium {
                (base_deut_per_hunter * hunters as f64 + base_deut_per_cruiser * cruisers as f64) * (game_logic::SPEED_FACTOR / 100.0)
            } else {
                0.0
            };

            logs.push(format!("RESULTAT : {}", combat_res.message));
            if deuterium > 0.0 {
                logs.push(format!("PILLAGE : +{:.0} Métal, +{:.0} Cristal, +{:.0} Deutérium récupérés.", metal, crystal, deuterium));
            } else {
                logs.push(format!("PILLAGE : +{:.0} Métal, +{:.0} Cristal récupérés.", metal, crystal));
            }

            // Répartir les pertes : les croiseurs sont plus résistants (50% moins de pertes)
            // On distribue les pertes en tenant compte de la résistance de chaque type
            let hunter_vulnerability = hunters as f64 * 1.0; // Chasseurs: vulnérabilité normale
            let cruiser_vulnerability = cruisers as f64 * 0.5; // Croiseurs: 2x plus résistants
            let total_vulnerability = hunter_vulnerability + cruiser_vulnerability;

            if total_vulnerability > 0.0 {
                let hunter_loss_ratio = hunter_vulnerability / total_vulnerability;
                lost_hunters = (combat_res.ships_lost as f64 * hunter_loss_ratio).ceil() as i32;
                lost_cruisers = (combat_res.ships_lost as f64 * (1.0 - hunter_loss_ratio)).floor() as i32;

                // Assurer qu'on ne perd pas plus que ce qu'on a
                if lost_hunters > hunters { lost_hunters = hunters; }
                if lost_cruisers > cruisers { lost_cruisers = cruisers; }

                // Log des pertes
                if lost_hunters > 0 || lost_cruisers > 0 {
                    let mut loss_msg = "PERTES : ".to_string();
                    if lost_hunters > 0 { loss_msg.push_str(&format!("{} Chasseur(s)", lost_hunters)); }
                    if lost_hunters > 0 && lost_cruisers > 0 { loss_msg.push_str(", "); }
                    if lost_cruisers > 0 { loss_msg.push_str(&format!("{} Croiseur(s)", lost_cruisers)); }
                    logs.push(loss_msg);
                }
            }

            active.metal_amount = Set(p.metal_amount + metal);
            active.crystal_amount = Set(p.crystal_amount + crystal);
            if deuterium > 0.0 {
                active.deuterium_amount = Set(p.deuterium_amount + deuterium);
            }
            (metal, crystal, deuterium)
        } else {
            winner = "pirates";
            logs.push(format!("RESULTAT : {}", combat_res.message));

            // En cas de défaite, pertes très lourdes avec même distribution
            let hunter_vulnerability = hunters as f64 * 1.0;
            let cruiser_vulnerability = cruisers as f64 * 0.5; // Croiseurs toujours plus résistants
            let total_vulnerability = hunter_vulnerability + cruiser_vulnerability;

            if total_vulnerability > 0.0 {
                let hunter_loss_ratio = hunter_vulnerability / total_vulnerability;
                lost_hunters = (combat_res.ships_lost as f64 * hunter_loss_ratio).ceil() as i32;
                lost_cruisers = (combat_res.ships_lost as f64 * (1.0 - hunter_loss_ratio)).floor() as i32;

                // Assurer qu'on ne perd pas plus que ce qu'on a
                if lost_hunters > hunters { lost_hunters = hunters; }
                if lost_cruisers > cruisers { lost_cruisers = cruisers; }

                // En cas de défaite avec 1 seul vaisseau, on le perd
                if total_ships == 1 {
                    if hunters == 1 { lost_hunters = 1; }
                    if cruisers == 1 { lost_cruisers = 1; }
                }

                // Log des pertes (défaite = pertes lourdes)
                if lost_hunters > 0 || lost_cruisers > 0 {
                    let mut loss_msg = "PERTES LOURDES : ".to_string();
                    if lost_hunters > 0 { loss_msg.push_str(&format!("{} Chasseur(s)", lost_hunters)); }
                    if lost_hunters > 0 && lost_cruisers > 0 { loss_msg.push_str(", "); }
                    if lost_cruisers > 0 { loss_msg.push_str(&format!("{} Croiseur(s)", lost_cruisers)); }
                    logs.push(loss_msg);
                }
            }

            (0.0, 0.0, 0.0)
        }
    } else {
        winner = "player";
        // Gains proportionnels au nombre et type de vaisseaux (bonus pour secteur calme: x1.2)
        let metal = (base_metal_per_hunter * hunters as f64 + base_metal_per_cruiser * cruisers as f64) * 1.2 * (game_logic::SPEED_FACTOR / 100.0);
        let crystal = (base_crystal_per_hunter * hunters as f64 + base_crystal_per_cruiser * cruisers as f64) * 1.2 * (game_logic::SPEED_FACTOR / 100.0);
        let deuterium = if found_deuterium {
            (base_deut_per_hunter * hunters as f64 + base_deut_per_cruiser * cruisers as f64) * 1.2 * (game_logic::SPEED_FACTOR / 100.0)
        } else {
            0.0
        };

        logs.push("SCAN : Secteur calme.".to_string());
        if deuterium > 0.0 {
            logs.push(format!("DECOUVERTE : +{:.0} Métal, +{:.0} Cristal, +{:.0} Deutérium.", metal, crystal, deuterium));
        } else {
            logs.push(format!("DECOUVERTE : +{:.0} Métal, +{:.0} Cristal.", metal, crystal));
        }

        active.metal_amount = Set(p.metal_amount + metal);
        active.crystal_amount = Set(p.crystal_amount + crystal);
        if deuterium > 0.0 {
            active.deuterium_amount = Set(p.deuterium_amount + deuterium);
        }
        (metal, crystal, deuterium)
    };
    
    active.light_hunter_count = Set(p.light_hunter_count - lost_hunters);
    active.cruiser_count = Set(p.cruiser_count - lost_cruisers);

    let duration = std::cmp::max(1, (600.0 / game_logic::SPEED_FACTOR) as i64);
    active.expedition_end = Set(Some(Utc::now().naive_utc() + Duration::seconds(duration)));
    
    if active.update(&state.db).await.is_err() {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "DB Update Error"}))).into_response();
    }
    
    let updated_planet = Planet::find_by_id(id).one(&state.db).await.unwrap().unwrap();

    // Créer le rapport détaillé pour l'expédition
    let expedition_report = json!({
        "winner": winner,
        "log": logs,
        "loot": {
            "metal": loot_metal,
            "crystal": loot_crystal,
            "deuterium": loot_deuterium
        },
        "attacker_losses": lost_hunters + lost_cruisers,
        "defender_losses": 0,
        "lost_missiles": 0,
        "lost_plasmas": 0,
        "mission_type": "expedition"
    });

    let log_exp = combat_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        planet_id: Set(id),
        target_name: Set("Secteur Inconnu".to_string()),
        opponent_username: Set(None),
        mission_type: Set("expedition".to_string()),
        result: Set(winner.to_string()),
        loot_metal: Set(loot_metal),
        loot_crystal: Set(loot_crystal),
        ships_lost: Set(lost_hunters + lost_cruisers),
        date: Set(Utc::now().naive_utc()),
        detailed_report: Set(Some(expedition_report.clone())),
    };
    let _ = log_exp.insert(&state.db).await;

   let response = json!({
    "planet": updated_planet,
    "report": expedition_report
});

    (StatusCode::OK, Json(response)).into_response()
}

async fn scout_expedition_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<ExpeditionPayload>,
) -> impl IntoResponse {
    let p_res = Planet::find_by_id(id).one(&state.db).await;
    let p = match p_res {
        Ok(Some(found)) => found,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planet not found"}))).into_response(),
    };

    let hunters = payload.hunters;
    let cruisers = payload.cruisers;
    let total_ships = hunters + cruisers;

    if total_ships <= 0 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Nombre de vaisseaux invalide"}))).into_response();
    }
    if hunters > p.light_hunter_count {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Pas assez de chasseurs"}))).into_response();
    }
    if cruisers > p.cruiser_count {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Pas assez de croiseurs"}))).into_response();
    }

    // Simulation du scan (aléatoire mais basé sur la force de la flotte)
    let mut rng = rand::thread_rng();
    let base_danger = rng.gen_range(0..100);

    let (danger_level, color, probability, recommendation) = if base_danger < 30 {
        (
            "FAIBLE",
            "green",
            rng.gen_range(85..95),
            "Secteur relativement sûr. Expédition recommandée."
        )
    } else if base_danger < 70 {
        (
            "MOYEN",
            "orange",
            rng.gen_range(60..85),
            "Présence hostile possible. Envoyez une flotte suffisante."
        )
    } else {
        (
            "ÉLEVÉ",
            "red",
            rng.gen_range(30..60),
            "ATTENTION : Zone très hostile détectée. Risque élevé de pertes."
        )
    };

    // Ajustement de la probabilité en fonction du nombre total de vaisseaux
    let adjusted_probability = if total_ships >= 10 {
        std::cmp::min(95, probability + 10)
    } else if total_ships >= 5 {
        probability
    } else {
        std::cmp::max(20, probability - 10)
    };

    // Calcul des gains estimés (basé sur le même calcul que l'expédition réelle)
    // Chasseurs: 50-100 métal (moy 75), 20-50 cristal (moy 35), 10-25 deutérium (moy 17.5, 50% chance)
    // Croiseurs: 150-250 métal (moy 200), 60-100 cristal (moy 80), 30-60 deutérium (moy 45, 50% chance)
    let avg_metal_per_hunter = 75.0;
    let avg_crystal_per_hunter = 35.0;
    let avg_deut_per_hunter = 17.5 * 0.5; // 50% chance, donc moyenne divisée par 2
    let avg_metal_per_cruiser = 200.0;
    let avg_crystal_per_cruiser = 80.0;
    let avg_deut_per_cruiser = 45.0 * 0.5; // 50% chance

    // Min/Max avec variation de ±30%
    let base_metal = avg_metal_per_hunter * hunters as f64 + avg_metal_per_cruiser * cruisers as f64;
    let base_crystal = avg_crystal_per_hunter * hunters as f64 + avg_crystal_per_cruiser * cruisers as f64;
    let base_deut = avg_deut_per_hunter * hunters as f64 + avg_deut_per_cruiser * cruisers as f64;

    let estimated_metal_min = (base_metal * 0.7) * (game_logic::SPEED_FACTOR / 100.0);
    let estimated_metal_max = (base_metal * 1.5) * (game_logic::SPEED_FACTOR / 100.0);
    let estimated_crystal_min = (base_crystal * 0.7) * (game_logic::SPEED_FACTOR / 100.0);
    let estimated_crystal_max = (base_crystal * 1.5) * (game_logic::SPEED_FACTOR / 100.0);
    // Pour deutérium: min à 0 (50% chance de rien), max basé sur la formule normale
    let estimated_deut_min = 0;
    let estimated_deut_max = (base_deut * 3.0) * (game_logic::SPEED_FACTOR / 100.0); // x3 car la moyenne inclut 50% de 0

    Json(json!({
        "danger": danger_level,
        "color": color,
        "probability": adjusted_probability,
        "recommendation": recommendation,
        "estimated_loot": {
            "metal_min": estimated_metal_min as i32,
            "metal_max": estimated_metal_max as i32,
            "crystal_min": estimated_crystal_min as i32,
            "crystal_max": estimated_crystal_max as i32,
            "deuterium_min": estimated_deut_min,
            "deuterium_max": estimated_deut_max as i32
        }
    })).into_response()
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

// Récupérer le rapport détaillé d'un combat
async fn get_combat_report_detail_handler(
    Path(report_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let report = CombatLog::find_by_id(report_id)
        .one(&state.db)
        .await
        .unwrap_or(None);

    match report {
        Some(log) => {
            if let Some(detailed) = log.detailed_report {
                (StatusCode::OK, Json(detailed)).into_response()
            } else {
                (StatusCode::NOT_FOUND, Json(json!({"error": "Aucun détail disponible pour ce rapport"}))).into_response()
            }
        }
        None => {
            (StatusCode::NOT_FOUND, Json(json!({"error": "Rapport introuvable"}))).into_response()
        }
    }
}

async fn get_transport_logs_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> Json<Vec<serde_json::Value>> {
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

    let logs_json: Vec<serde_json::Value> = logs.into_iter().map(|log| {
        let opponent_username = if log.target_planet_id == id {
            log.source_owner_name.clone()
        } else {
            log.target_owner_name.clone()
        };

        json!({
            "id": log.id,
            "target_planet_id": log.target_planet_id,
            "target_planet_name": log.target_planet_name,
            "source_planet_id": log.source_planet_id,
            "source_planet_name": log.source_planet_name,
            "opponent_username": opponent_username,
            "metal": log.metal,
            "crystal": log.crystal,
            "deuterium": log.deuterium,
            "date": log.date
        })
    }).collect();

    Json(logs_json)
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

    // Notify the defender that they were spied on
    let mut def_active: planet::ActiveModel = def_planet.clone().into();
    def_active.unread_report = Set(Some(json!({
        "type": "spy_alert",
        "message": "Votre planète a été espionnée !"
    }).to_string()));
    let _ = def_active.update(&state.db).await;

    // Create a spy report in combat_log for the defender
    let att_user = User::find_by_id(att_planet.owner_id).one(&state.db).await.unwrap();
    let attacker_username = att_user.map(|u| u.username).unwrap_or("Inconnu".to_string());

    let spy_log = combat_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        planet_id: Set(def_planet.id),
        target_name: Set(att_planet.name.clone()),
        opponent_username: Set(Some(attacker_username)),
        mission_type: Set("spy_defense".to_string()),
        result: Set("alert".to_string()),
        loot_metal: Set(0.0),
        loot_crystal: Set(0.0),
        ships_lost: Set(0),
        date: Set(Utc::now().naive_utc()),
        detailed_report: Set(None), // Pas de détails de combat pour l'espionnage
    };
    let _ = spy_log.insert(&state.db).await;

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

async fn recycle_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<RecyclePayload>,
) -> impl IntoResponse {
    
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();

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
         return (StatusCode::OK, Json(json!({ "status": "empty", "message": "Aucun débris à recycler." }))).into_response();
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

async fn get_galaxy_handler(
    Path((galaxy_id, system_id)): Path<(i32, i32)>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();
    let current_planet_opt = Planet::find_by_id(current_id).one(&state.db).await.unwrap_or(None);
    let my_owner_id = current_planet_opt.map(|p| p.owner_id).unwrap_or_default();

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
                debris_metal: p.debris_metal, 
                debris_crystal: p.debris_crystal,
                is_me: p.id == current_id,
                is_my_planet: p.owner_id == my_owner_id
            });
        } else {
            slots.push(GalaxySlot {
                position: pos, planet_id: None, planet_name: None, owner_name: None, owner_id: None, debris_metal: 0.0, debris_crystal: 0.0, is_me: false, is_my_planet: false
            });
        }
    }
    Json(slots)
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
    if ships < 1 { return (StatusCode::BAD_REQUEST, Json(json!({"error": "Aucun vaisseau de colonisation disponible"}))).into_response(); }

    let exists = Planet::find()
        .filter(planet::Column::Galaxy.eq(payload.galaxy))
        .filter(planet::Column::System.eq(payload.system))
        .filter(planet::Column::Position.eq(payload.position))
        .one(&state.db)
        .await
        .unwrap();

    if exists.is_some() { return (StatusCode::CONFLICT, Json(json!({"error": "Cet emplacement est déjà occupé"}))).into_response(); }

    let owner_id = att_planet.owner_id.clone().unwrap();
    let password = att_planet.password.clone().unwrap();
    let colony_name = generate_colony_name();
    let new_id = Uuid::new_v4();
    
    let new_planet = planet::ActiveModel {
        id: Set(new_id), owner_id: Set(owner_id), name: Set(colony_name), password: Set(password), galaxy: Set(payload.galaxy), system: Set(payload.system), position: Set(payload.position),
        metal_mine_level: Set(1), crystal_mine_level: Set(1), deuterium_mine_level: Set(1), metal_amount: Set(500.0), crystal_amount: Set(500.0), last_update: Set(Utc::now().naive_utc()),
        created_at: Set(Utc::now().naive_utc()),
        ..Default::default()
    };

    att_planet.colony_ship_count = Set(ships - 1);
    let _ = att_planet.update(&state.db).await;
    let _ = new_planet.insert(&state.db).await;

    // Créer les 8 slots de ressources pour la nouvelle planète
    use entities::{prelude::ResourceSlot, resource_slot};

    // Slots 1-4 : verrouillés avec les ressources de base
    let slots_init = vec![
        (1, "metal", 1, true),
        (2, "crystal", 1, true),
        (3, "deuterium", 1, true),
        (4, "energy", 0, true),
        (5, "metal", 0, false),
        (6, "metal", 0, false),
        (7, "metal", 0, false),
        (8, "metal", 0, false),
    ];

    for (slot_num, res_type, level, is_locked) in slots_init {
        let slot = resource_slot::ActiveModel {
            planet_id: Set(new_id),
            slot_number: Set(slot_num),
            resource_type: Set(res_type.to_string()),
            level: Set(level),
            is_locked: Set(is_locked),
            is_active: Set(is_locked), // Les slots locked sont actifs, les autres non
            ..Default::default()
        };
        let _ = slot.insert(&state.db).await;
    }

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
        let my_planets = Planet::find().filter(planet::Column::OwnerId.eq(p.owner_id)).all(&state.db).await.unwrap_or_default();
        let list: Vec<serde_json::Value> = my_planets.into_iter().map(|mp| json!({
            "id": mp.id, "name": mp.name, "galaxy": mp.galaxy, "system": mp.system, "position": mp.position, "is_current": mp.id == current_id
        })).collect();
        return Json(list).into_response();
    }
    (StatusCode::UNAUTHORIZED, Json(json!({"error": "Planète introuvable"}))).into_response()
}

async fn transport_handler(
    State(state): State<AppState>, Query(params): Query<HashMap<String, String>>, Json(payload): Json<TransportPayload>,
) -> impl IntoResponse {
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();
    if current_id == payload.target_planet_id { return (StatusCode::BAD_REQUEST, Json(json!({"error": "Impossible de transporter vers la même planète"}))).into_response(); }

    let source_model = match Planet::find_by_id(current_id).one(&state.db).await.unwrap() {
        Some(p) => p, None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Planète source inconnue"}))).into_response(),
    };
    let target_model = match Planet::find_by_id(payload.target_planet_id).one(&state.db).await.unwrap() {
        Some(p) => p, None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète cible inconnue"}))).into_response(),
    };

    let source_user = User::find_by_id(source_model.owner_id).one(&state.db).await.unwrap().unwrap();
    let target_user = User::find_by_id(target_model.owner_id).one(&state.db).await.unwrap().unwrap();

    let source_name = source_model.name.clone();
    let source_id = source_model.id;
    let target_name = target_model.name.clone();
    let target_id = target_model.id;

    if payload.transporters > source_model.transporter_count || payload.transporters <= 0 { return (StatusCode::BAD_REQUEST, Json(json!({"error": "Transporteurs insuffisants"}))).into_response(); }
    if payload.metal > source_model.metal_amount || payload.crystal > source_model.crystal_amount || payload.deuterium > source_model.deuterium_amount { return (StatusCode::BAD_REQUEST, Json(json!({"error": "Ressources insuffisantes"}))).into_response(); }

    let total_load = payload.metal + payload.crystal + payload.deuterium;
    // Capacité évolutive: +5% par niveau de hangar
    let transporter_capacity = game_logic::get_transporter_capacity(source_model.hangar_level);
    let capacity = payload.transporters as f64 * transporter_capacity;
    if total_load > capacity { return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Surcharge ! Capacité max: {:.0}", capacity)}))).into_response(); }

    // Calcul du temps de vol avec les vraies coordonnées 3D
    let dist = game_logic::calculate_distance(
        (source_model.galaxy, source_model.system, source_model.position),
        (target_model.galaxy, target_model.system, target_model.position)
    );
    let flight_duration = game_logic::calculate_flight_time(dist, game_logic::SPEED_FACTOR);
    let arrival = Utc::now().naive_utc() + Duration::seconds(flight_duration);

    let mut source: planet::ActiveModel = source_model.into();
    source.metal_amount = Set(source.metal_amount.unwrap() - payload.metal);
    source.crystal_amount = Set(source.crystal_amount.unwrap() - payload.crystal);
    source.deuterium_amount = Set(source.deuterium_amount.unwrap() - payload.deuterium);
    source.transporter_count = Set(source.transporter_count.unwrap() - payload.transporters);

    let mission = fleet_mission::ActiveModel {
        id: Set(Uuid::new_v4()), source_planet_id: Set(source_id), target_planet_id: Set(target_id), mission_type: Set("transport".to_string()), arrival_time: Set(arrival),
        metal: Set(payload.metal), crystal: Set(payload.crystal), deuterium: Set(payload.deuterium), ships_count: Set(payload.transporters),
    };

    let log = transport_log::ActiveModel {
        id: Set(Uuid::new_v4()), target_planet_id: Set(target_id), target_planet_name: Set(target_name), target_owner_name: Set(Some(target_user.username)),
        source_planet_id: Set(source_id), source_planet_name: Set(source_name), source_owner_name: Set(Some(source_user.username)),
        metal: Set(payload.metal), crystal: Set(payload.crystal), deuterium: Set(payload.deuterium), date: Set(Utc::now().naive_utc()),
    };

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

async fn cancel_construction_handler(
    Path((planet_id, queue_id)): Path<(Uuid, Uuid)>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, StatusCode> {
    let item = ConstructionQueue::find_by_id(queue_id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?.ok_or(StatusCode::NOT_FOUND)?;
    if item.planet_id != planet_id { return Err(StatusCode::FORBIDDEN); }
    let p = Planet::find_by_id(planet_id).one(&state.db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?.ok_or(StatusCode::NOT_FOUND)?;

    let (base_m, base_c, base_d) = match item.building_type.as_str() {
        "light_hunter" | "cruiser" | "recycler" | "spy_probe" | "colony_ship" | "transporter" | "missile_launcher" | "plasma_turret" => {
            let (m, c) = match item.building_type.as_str() {
                "light_hunter" => game_logic::get_light_hunter_stats(),
                "cruiser" => game_logic::get_cruiser_stats(),
                "recycler" => game_logic::get_recycler_stats(),
                "spy_probe" => game_logic::get_spy_probe_stats(),
                "colony_ship" => game_logic::get_colony_ship_stats(),
                "transporter" => game_logic::get_transporter_stats(),
                "missile_launcher" => game_logic::get_missile_launcher_stats(),
                "plasma_turret" => game_logic::get_plasma_turret_stats(),
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
        "light_hunter" | "cruiser" | "recycler" | "spy_probe" | "colony_ship" | "transporter" | "missile_launcher" | "plasma_turret" => {
             game_logic::get_ship_production_time(item.level) as f64
        },
        _ => {
            let facility_level = match item.building_type.as_str() {
                "research" | "energy_tech" | "laser" | "espionage" | "armour" => p.research_lab_level,
                _ => p.shipyard_level,
            };
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

    Ok(Json(json!({
        "refund_metal": refund_m, "refund_crystal": refund_c, "refund_deuterium": refund_d, "ratio": refund_ratio
    })))
}

// Fonction helper pour compter les messages non lus (à ajouter dans votre code backend)
async fn count_unread_messages(user_id: Uuid, db: &DatabaseConnection) -> i32 {
    use crate::entities::prelude::Conversation;
    use crate::entities::conversation;
    
    let convs = Conversation::find()
        .filter(
            Condition::any()
                .add(conversation::Column::User1Id.eq(user_id))
                .add(conversation::Column::User2Id.eq(user_id))
        )
        .all(db)
        .await
        .unwrap_or_default();
    
    let mut total_unread = 0;
    for conv in convs {
        // Ne compter que les conversations non archivées
        if conv.user1_id == user_id && !conv.user1_archived {
            total_unread += conv.user1_unread_count;
        } else if conv.user2_id == user_id && !conv.user2_archived {
            total_unread += conv.user2_unread_count;
        }
    }
    
    total_unread
}

// Handler pour récupérer un utilisateur par ID
pub async fn get_user_by_id(
    Path(user_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let user = User::find_by_id(user_id)
        .one(&state.db)
        .await
        .ok()
        .flatten();

    match user {
        Some(u) => {
            let response = UserResponse {
                id: u.id,
                username: u.username,
                email: u.email,
               
            };
            (StatusCode::OK, Json(response)).into_response()
        }
        None => {
            (StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))).into_response()
        }
    }
}

// Handler pour récupérer les infos utilisateur
async fn get_user_handler(
    Path(user_id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user = User::find_by_id(user_id)
        .one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    
    // Ne pas exposer le mot de passe
    let response = json!({
        "id": user.id,
        "username": user.username,
        "email": user.email,
    });
    
    Ok(Json(response))
}

#[derive(Deserialize)]
struct UpdateUsernamePayload {
    new_username: String,
}

// Handler pour mettre à jour le nom d'utilisateur
async fn update_username_handler(
    Path(user_id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<UpdateUsernamePayload>,
) -> impl IntoResponse {
    // Validation : username non vide et longueur raisonnable
    let new_username = payload.new_username.trim();
    if new_username.is_empty() || new_username.len() > 50 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Le nom d'utilisateur doit contenir entre 1 et 50 caractères"}))
        ).into_response();
    }

    // Vérifier que l'utilisateur existe
    let user = match User::find_by_id(user_id).one(&state.db).await {
        Ok(Some(u)) => u,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Utilisateur introuvable"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response(),
    };

    // Vérifier l'unicité du nouveau nom d'utilisateur
    if let Ok(Some(_)) = User::find()
        .filter(user::Column::Username.eq(new_username))
        .filter(user::Column::Id.ne(user_id))
        .one(&state.db)
        .await
    {
        return (
            StatusCode::CONFLICT,
            Json(json!({"error": "Ce nom d'utilisateur est déjà utilisé"}))
        ).into_response();
    }

    // Mettre à jour le nom d'utilisateur
    let mut active_user: user::ActiveModel = user.into();
    active_user.username = Set(new_username.to_string());

    match active_user.update(&state.db).await {
        Ok(updated) => Json(json!({
            "success": true,
            "message": "Nom d'utilisateur mis à jour",
            "username": updated.username
        })).into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Erreur lors de la mise à jour"}))
        ).into_response(),
    }
}

// Handler pour récupérer les coûts des défenses/vaisseaux
async fn get_unit_costs_handler() -> Result<Json<serde_json::Value>, StatusCode> {
    let units = vec![
        "light_hunter",
        "cruiser",
        "transporter",
        "recycler",
        "spy_probe",
        "colony_ship",
        "missile_launcher",
        "plasma_turret",
    ];
    
    let mut costs = serde_json::Map::new();
    
    for unit in units {
        let (metal, crystal) = game_logic::get_unit_cost(unit);
        costs.insert(
            unit.to_string(),
            json!({
                "metal": metal,
                "crystal": crystal,
            })
        );
    }
    
    Ok(Json(json!(costs)))
}

async fn get_player_profile_handler(
    Path(user_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    use crate::entities::{prelude::*, user, planet, fleet_mission};
    
    // ✅ Récupérer l'ID de l'utilisateur qui consulte (viewer)
    let viewer_id = params.get("viewer_id")
        .and_then(|s| Uuid::parse_str(s).ok());
    
    let is_own_profile = viewer_id.map(|v| v == user_id).unwrap_or(false);
    
    // ✅ Calculer le niveau d'espionnage du viewer
    let espionage_level = if !is_own_profile && viewer_id.is_some() {
        let viewer_planets = Planet::find()
            .filter(planet::Column::OwnerId.eq(viewer_id.unwrap()))
            .all(&state.db)
            .await
            .unwrap_or_default();
        
        viewer_planets.iter()
            .map(|p| p.espionage_tech_level)
            .max()
            .unwrap_or(0)
    } else {
        999 // Niveau infini pour son propre profil
    };
    
    // Récupérer l'utilisateur
    let user = User::find_by_id(user_id)
        .one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    
    // Récupérer toutes les planètes du joueur
    let planets = Planet::find()
        .filter(planet::Column::OwnerId.eq(user_id))
        .all(&state.db)
        .await
        .unwrap_or_default();
    
    // Calculer les points de toutes les planètes
    let mut total_points = 0;
    let mut total_economy = 0;
    let mut total_military = 0;
    
    for p in &planets {
        let (pts, eco, mil) = game_logic::calculate_planet_points(p);
        total_points += pts;
        total_economy += eco;
        total_military += mil;
    }
    
    let planet_count = planets.len();
    
    // ✅ Fonctions helper pour masquer les données
    fn mask_value(value: serde_json::Value, condition: bool) -> serde_json::Value {
        if condition {
            value
        } else {
            json!("█████")
        }
    }
    
    fn mask_number(value: i32, condition: bool) -> serde_json::Value {
        if condition {
            json!(value)
        } else {
            json!("███")
        }
    }
    
    // ✅ Déterminer ce qui est visible selon le niveau d'espionnage
    let show_basic = espionage_level >= 0;
    let show_points = espionage_level >= 3;
    let show_economy = espionage_level >= 5;
    let show_military = espionage_level >= 7;
    let show_fleet = espionage_level >= 10;
    let show_defenses = espionage_level >= 12;
    let show_buildings = espionage_level >= 15;
    let show_techs = espionage_level >= 18;
    let show_all = is_own_profile;
    
    // Flotte totale
    let total_fleet = planets.iter().fold(0, |acc, p| {
        acc + p.light_hunter_count + p.cruiser_count + p.transporter_count 
            + p.colony_ship_count + p.recycler_count + p.spy_probe_count
    });
    
    // Défenses totales
    let total_defenses = planets.iter().fold(0, |acc, p| {
        acc + p.missile_launcher_count + p.plasma_turret_count
    });
    
    // Compter missions accomplies
    let planet_ids: Vec<Uuid> = planets.iter().map(|p| p.id).collect();
    let completed_missions = if !planet_ids.is_empty() {
        FleetMission::find()
            .filter(fleet_mission::Column::SourcePlanetId.is_in(planet_ids))
            .filter(fleet_mission::Column::ArrivalTime.lt(chrono::Utc::now().naive_utc()))
            .count(&state.db)
            .await
            .unwrap_or(0) as i32
    } else {
        0
    };

    // Statistiques de combat (72 dernières heures)
    use crate::entities::{combat_log, prelude::CombatLog};
    let (combat_victories, combat_defeats, combat_total, combat_win_rate) = if !planet_ids.is_empty() {
        let now = chrono::Utc::now().naive_utc();
        let seventy_two_hours_ago = now - chrono::Duration::hours(72);

        let combat_logs = CombatLog::find()
            .filter(combat_log::Column::PlanetId.is_in(planet_ids.clone()))
            .filter(combat_log::Column::Date.gte(seventy_two_hours_ago))
            .all(&state.db)
            .await
            .unwrap_or_default();

        let total = combat_logs.len();
        let victories = combat_logs.iter()
            .filter(|log| log.result == "victory" || log.result == "player")
            .count();
        let defeats = combat_logs.iter()
            .filter(|log| log.result == "defeat" || log.result == "defender")
            .count();
        let win_rate = if total > 0 {
            (victories as f64 / total as f64 * 100.0) as i32
        } else {
            0
        };

        (victories as i32, defeats as i32, total as i32, win_rate)
    } else {
        (0, 0, 0, 0)
    };

    // Planète principale (= la plus ancienne, planète mère)
    let main_planet_with_points: Option<(&planet::Model, i32, i32, i32)> = planets.iter()
        .map(|p| {
            let (pts, eco, mil) = game_logic::calculate_planet_points(p);
            (p, pts, eco, mil)
        })
        .min_by_key(|(p, _, _, _)| p.created_at); // Planète la plus ancienne
    
    // Badge de rang
    let rank_badge = game_logic::get_rank_badge(total_points);
    
    // ✅ Formater created_at en ISO 8601 avec Z pour UTC
    let created_at_utc = user.created_at.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    // ✅ Construire la réponse avec masquage progressif
    let response = json!({
        "user_id": user.id,
        "username": user.username,
        "created_at": if show_all { json!(created_at_utc) } else { json!(null) },
        "is_own_profile": is_own_profile,
        "espionage_level": espionage_level,
        
        // Points (selon niveau)
        "total_points": mask_number(total_points, show_points || show_all),
        "economy_points": mask_number(total_economy, show_economy || show_all),
        "military_points": mask_number(total_military, show_military || show_all),
        "rank_badge": if show_points || show_all { json!(rank_badge) } else { json!("CLASSIFIÉ") },
        
        // Statistiques de base
        "planet_count": planet_count,
        "total_fleet": mask_number(total_fleet, show_fleet || show_all),
        "total_defenses": mask_number(total_defenses, show_defenses || show_all),
        "completed_missions": mask_number(completed_missions, show_military || show_all),

        // Statistiques de combat (72h)
        "combat_stats_72h": if show_military || show_all {
            json!({
                "total_battles": combat_total,
                "victories": combat_victories,
                "defeats": combat_defeats,
                "win_rate": combat_win_rate
            })
        } else {
            json!({
                "total_battles": "███",
                "victories": "███",
                "defeats": "███",
                "win_rate": "███"
            })
        },

        // Planète principale
        "main_planet": main_planet_with_points.map(|(p, points, _, _)| json!({
            "name": p.name,
            "galaxy": p.galaxy,
            "system": p.system,
            "position": p.position,
            "points": mask_number(points, show_points || show_all),
        })),
        
        // Bâtiments (niveau 15+)
        "top_buildings": if show_buildings || show_all {
            main_planet_with_points.map(|(p, _, _, _)| json!({
                "metal_mine": p.metal_mine_level,
                "crystal_mine": p.crystal_mine_level,
                "shipyard": p.shipyard_level,
                "research_lab": p.research_lab_level,
            }))
        } else {
            Some(json!({
                "metal_mine": "███",
                "crystal_mine": "███",
                "shipyard": "███",
                "research_lab": "███",
            }))
        },
        
        // Technologies (niveau 18+)
        "top_techs": if show_techs || show_all {
            main_planet_with_points.map(|(p, _, _, _)| json!({
                "energy": p.energy_tech_level,
                "laser": p.laser_battery_level,
                "espionage": p.espionage_tech_level,
                "armour": p.armour_tech_level,
            }))
        } else {
            Some(json!({
                "energy": "███",
                "laser": "███",
                "espionage": "███",
                "armour": "███",
            }))
        },
        
        // Liste des planètes
        "planets": planets.iter().map(|p| {
            let (points, _, _) = game_logic::calculate_planet_points(p);
            json!({
                "name": p.name,
                "coords": format!("[{}:{}:{}]", p.galaxy, p.system, p.position),
                "points": mask_number(points, show_points || show_all),
            })
        }).collect::<Vec<_>>(),
        
        // ✅ Message d'information sur le niveau requis
        "access_info": if !show_all {
            json!({
                "message": "Certaines informations sont classifiées. Améliorez votre technologie d'espionnage pour en savoir plus.",
                "unlocks": {
                    "level_3": "Points totaux et rang",
                    "level_5": "Points économie",
                    "level_7": "Points militaire et missions",
                    "level_10": "Taille de la flotte",
                    "level_12": "Défenses",
                    "level_15": "Détails des bâtiments",
                    "level_18": "Détails des technologies"
                }
            })
        } else {
            json!(null)
        },
    });

    Ok(Json(response))
}

// ========== MARKET HANDLERS ==========

#[derive(Deserialize)]
struct CreateListingPayload {
    planet_id: Uuid,
    user_id: Uuid,
    resource_type: String,
    quantity: f64,
    price_per_unit: f64,
    target_resource: String,
}

#[derive(Deserialize)]
struct BuyFromListingPayload {
    listing_id: Uuid,
    buyer_planet_id: Uuid,
    buyer_user_id: Uuid,
    quantity: f64,
}

#[derive(Deserialize)]
struct BuyFromNpcPayload {
    planet_id: Uuid,
    user_id: Uuid,
    sell_resource: String,
    sell_quantity: f64,
    buy_resource: String,
}

#[derive(Deserialize)]
struct MarketListingsQuery {
    resource_type: Option<String>,
    target_resource: Option<String>,
    limit: Option<u64>,
}

// GET /market/listings - Get all active market listings
async fn get_market_listings_handler(
    State(state): State<AppState>,
    Query(query): Query<MarketListingsQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let db = &state.db;
    let now = Utc::now().naive_utc();

    // First, expire old listings
    let expired_listings = MarketListing::find()
        .filter(market_listing::Column::IsActive.eq(true))
        .filter(market_listing::Column::ExpiresAt.lte(now))
        .all(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Return resources for expired listings
    for listing in expired_listings {
        // Return resources to seller
        let planet = Planet::find_by_id(listing.seller_planet_id)
            .one(db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .ok_or(StatusCode::NOT_FOUND)?;

        let mut active_planet = planet.clone().into_active_model();
        match listing.resource_type.as_str() {
            "metal" => active_planet.metal_amount = Set(planet.metal_amount + listing.quantity),
            "crystal" => active_planet.crystal_amount = Set(planet.crystal_amount + listing.quantity),
            "deuterium" => active_planet.deuterium_amount = Set(planet.deuterium_amount + listing.quantity),
            _ => {}
        }
        active_planet.update(db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        // Mark listing as inactive
        let mut active_listing = listing.into_active_model();
        active_listing.is_active = Set(false);
        active_listing.update(db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // Build query
    let mut query_builder = MarketListing::find()
        .filter(market_listing::Column::IsActive.eq(true))
        .filter(market_listing::Column::ExpiresAt.gt(now))
        .order_by_asc(market_listing::Column::PricePerUnit);

    if let Some(resource_type) = query.resource_type {
        query_builder = query_builder.filter(market_listing::Column::ResourceType.eq(resource_type));
    }

    if let Some(target_resource) = query.target_resource {
        query_builder = query_builder.filter(market_listing::Column::TargetResource.eq(target_resource));
    }

    let limit = query.limit.unwrap_or(50);
    let listings = query_builder
        .limit(limit)
        .all(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Get seller usernames
    let mut enriched_listings = Vec::new();
    for listing in listings {
        let seller = User::find_by_id(listing.seller_user_id)
            .one(db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let seller_username = seller.map(|u| u.username).unwrap_or_else(|| "Unknown".to_string());

        enriched_listings.push(json!({
            "id": listing.id,
            "seller_planet_id": listing.seller_planet_id,
            "seller_user_id": listing.seller_user_id,
            "seller_username": seller_username,
            "resource_type": listing.resource_type,
            "quantity": listing.quantity,
            "price_per_unit": listing.price_per_unit,
            "target_resource": listing.target_resource,
            "created_at": listing.created_at,
            "expires_at": listing.expires_at,
        }));
    }

    Ok(Json(json!({
        "listings": enriched_listings,
    })))
}

// POST /market/listings - Create a new market listing
async fn create_market_listing_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateListingPayload>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let db = &state.db;

    // Validate resource types
    if market::ResourceType::from_str(&payload.resource_type).is_none() {
        return Err(StatusCode::BAD_REQUEST);
    }
    if market::ResourceType::from_str(&payload.target_resource).is_none() {
        return Err(StatusCode::BAD_REQUEST);
    }
    if payload.resource_type == payload.target_resource {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Get planet
    let planet = Planet::find_by_id(payload.planet_id)
        .one(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    // Verify ownership
    if planet.owner_id != payload.user_id {
        return Err(StatusCode::FORBIDDEN);
    }

    // Check if planet has enough resources
    let current_amount = match payload.resource_type.as_str() {
        "metal" => planet.metal_amount,
        "crystal" => planet.crystal_amount,
        "deuterium" => planet.deuterium_amount,
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    if current_amount < payload.quantity {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Deduct resources immediately
    let mut active_planet = planet.clone().into_active_model();
    match payload.resource_type.as_str() {
        "metal" => active_planet.metal_amount = Set(planet.metal_amount - payload.quantity),
        "crystal" => active_planet.crystal_amount = Set(planet.crystal_amount - payload.quantity),
        "deuterium" => active_planet.deuterium_amount = Set(planet.deuterium_amount - payload.quantity),
        _ => return Err(StatusCode::BAD_REQUEST),
    }
    let updated_planet = active_planet.update(db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Create listing
    let now = Utc::now().naive_utc();
    let expires_at = now + Duration::days(7);

    let listing = market_listing::ActiveModel {
        id: Set(Uuid::new_v4()),
        seller_planet_id: Set(payload.planet_id),
        seller_user_id: Set(payload.user_id),
        resource_type: Set(payload.resource_type.clone()),
        quantity: Set(payload.quantity),
        price_per_unit: Set(payload.price_per_unit),
        target_resource: Set(payload.target_resource.clone()),
        created_at: Set(now),
        expires_at: Set(expires_at),
        is_active: Set(true),
    };

    let created = listing.insert(db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({
        "listing": {
            "id": created.id,
            "seller_planet_id": created.seller_planet_id,
            "seller_user_id": created.seller_user_id,
            "resource_type": created.resource_type,
            "quantity": created.quantity,
            "price_per_unit": created.price_per_unit,
            "target_resource": created.target_resource,
            "created_at": created.created_at,
            "expires_at": created.expires_at,
        },
        "planet": {
            "metal_amount": updated_planet.metal_amount,
            "crystal_amount": updated_planet.crystal_amount,
            "deuterium_amount": updated_planet.deuterium_amount,
        }
    })))
}

// DELETE /market/listings/:id - Cancel a listing
async fn cancel_market_listing_handler(
    Path(listing_id): Path<Uuid>,
    State(state): State<AppState>,
    headers: axum::http::HeaderMap, // ← Ajoutez headers
) -> Result<Json<serde_json::Value>, StatusCode> {
    let db = &state.db;

     // Extraire le token du header Authorization
    let auth_header = headers
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // Format: "Bearer jwt-{uuid}"
    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // Extraire user_id du token
    let user_id = extract_user_id_from_token(token)
        .ok_or(StatusCode::UNAUTHORIZED)?;

    println!("🗑️  User {} deleting listing {}", user_id, listing_id);

    // Get listing
    let listing = MarketListing::find_by_id(listing_id)
        .one(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    // Verify ownership
    if listing.seller_user_id != user_id {
        return Err(StatusCode::FORBIDDEN);
    }

    // Check if already inactive
    if !listing.is_active {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Return resources to seller
    let planet = Planet::find_by_id(listing.seller_planet_id)
        .one(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let mut active_planet = planet.clone().into_active_model();
    match listing.resource_type.as_str() {
        "metal" => active_planet.metal_amount = Set(planet.metal_amount + listing.quantity),
        "crystal" => active_planet.crystal_amount = Set(planet.crystal_amount + listing.quantity),
        "deuterium" => active_planet.deuterium_amount = Set(planet.deuterium_amount + listing.quantity),
        _ => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
    let updated_planet = active_planet.update(db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Mark listing as inactive
    let mut active_listing = listing.into_active_model();
    active_listing.is_active = Set(false);
    active_listing.update(db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({
        "message": "Listing cancelled",
        "planet": {
            "metal_amount": updated_planet.metal_amount,
            "crystal_amount": updated_planet.crystal_amount,
            "deuterium_amount": updated_planet.deuterium_amount,
        }
    })))
}

// POST /market/buy - Buy from player listing
async fn buy_from_listing_handler(
    State(state): State<AppState>,
    Json(payload): Json<BuyFromListingPayload>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let db = &state.db;

    // Get listing
    let listing = MarketListing::find_by_id(payload.listing_id)
        .one(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    // Verify listing is active and not expired
    let now = Utc::now().naive_utc();
    if !listing.is_active || listing.expires_at < now {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Check quantity available
    if payload.quantity > listing.quantity {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Get buyer planet
    let buyer_planet = Planet::find_by_id(payload.buyer_planet_id)
        .one(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    // Verify buyer ownership
    if buyer_planet.owner_id != payload.buyer_user_id {
        return Err(StatusCode::FORBIDDEN);
    }

    // Cannot buy from yourself
    if listing.seller_user_id == payload.buyer_user_id {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Calculate cost
    let total_cost = payload.quantity * listing.price_per_unit;

    // Check if buyer has enough of target resource
    let buyer_resource_amount = match listing.target_resource.as_str() {
        "metal" => buyer_planet.metal_amount,
        "crystal" => buyer_planet.crystal_amount,
        "deuterium" => buyer_planet.deuterium_amount,
        _ => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    if buyer_resource_amount < total_cost {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Calculate tax (on what seller receives)
    let (seller_receives, tax_amount) = market::apply_market_tax(total_cost);

    // Get seller planet
    let seller_planet = Planet::find_by_id(listing.seller_planet_id)
        .one(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    // Execute transaction atomically
    // 1. Buyer loses target resource
    let mut active_buyer = buyer_planet.clone().into_active_model();
    match listing.target_resource.as_str() {
        "metal" => active_buyer.metal_amount = Set(buyer_planet.metal_amount - total_cost),
        "crystal" => active_buyer.crystal_amount = Set(buyer_planet.crystal_amount - total_cost),
        "deuterium" => active_buyer.deuterium_amount = Set(buyer_planet.deuterium_amount - total_cost),
        _ => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    }

    // 2. Buyer gains sold resource
    match listing.resource_type.as_str() {
        "metal" => {
            let current = match listing.target_resource.as_str() {
                "metal" => buyer_planet.metal_amount - total_cost,
                _ => buyer_planet.metal_amount,
            };
            active_buyer.metal_amount = Set(current + payload.quantity);
        },
        "crystal" => {
            let current = match listing.target_resource.as_str() {
                "crystal" => buyer_planet.crystal_amount - total_cost,
                _ => buyer_planet.crystal_amount,
            };
            active_buyer.crystal_amount = Set(current + payload.quantity);
        },
        "deuterium" => {
            let current = match listing.target_resource.as_str() {
                "deuterium" => buyer_planet.deuterium_amount - total_cost,
                _ => buyer_planet.deuterium_amount,
            };
            active_buyer.deuterium_amount = Set(current + payload.quantity);
        },
        _ => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
    let updated_buyer = active_buyer.update(db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // 3. Seller gains target resource (minus tax)
    let mut active_seller = seller_planet.clone().into_active_model();
    match listing.target_resource.as_str() {
        "metal" => active_seller.metal_amount = Set(seller_planet.metal_amount + seller_receives),
        "crystal" => active_seller.crystal_amount = Set(seller_planet.crystal_amount + seller_receives),
        "deuterium" => active_seller.deuterium_amount = Set(seller_planet.deuterium_amount + seller_receives),
        _ => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
    let _updated_seller = active_seller.update(db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // 4. Update or delete listing
    if payload.quantity >= listing.quantity {
        // Full purchase - mark inactive
        let mut active_listing = listing.clone().into_active_model();
        active_listing.is_active = Set(false);
        active_listing.update(db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    } else {
        // Partial purchase - update quantity
        let mut active_listing = listing.clone().into_active_model();
        active_listing.quantity = Set(listing.quantity - payload.quantity);
        active_listing.update(db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // 5. Record transaction
    let transaction = market_transaction::ActiveModel {
        id: Set(Uuid::new_v4()),
        seller_planet_id: Set(listing.seller_planet_id),
        seller_user_id: Set(listing.seller_user_id),
        buyer_planet_id: Set(payload.buyer_planet_id),
        buyer_user_id: Set(payload.buyer_user_id),
        resource_sold: Set(listing.resource_type.clone()),
        resource_paid: Set(listing.target_resource.clone()),
        quantity_sold: Set(payload.quantity),
        quantity_paid: Set(total_cost),
        price_per_unit: Set(listing.price_per_unit),
        tax_amount: Set(tax_amount),
        transaction_type: Set("player".to_string()),
        created_at: Set(now),
    };
    transaction.insert(db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // 6. Update server stats
    let totals = market::calculate_server_resource_totals(db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    market::update_server_resource_stats(db, &totals).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({
        "message": "Purchase successful",
        "buyer_planet": {
            "metal_amount": updated_buyer.metal_amount,
            "crystal_amount": updated_buyer.crystal_amount,
            "deuterium_amount": updated_buyer.deuterium_amount,
        },
        "seller_received": seller_receives,
        "tax_paid": tax_amount,
    })))
}

// POST /market/npc/buy - Exchange with NPC
async fn buy_from_npc_handler(
    State(state): State<AppState>,
    Json(payload): Json<BuyFromNpcPayload>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let db = &state.db;

    // Validate resource types
    let sell_resource = market::ResourceType::from_str(&payload.sell_resource)
        .ok_or(StatusCode::BAD_REQUEST)?;
    let buy_resource = market::ResourceType::from_str(&payload.buy_resource)
        .ok_or(StatusCode::BAD_REQUEST)?;

    if sell_resource == buy_resource {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Get planet
    let planet = Planet::find_by_id(payload.planet_id)
        .one(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    // Verify ownership
    if planet.owner_id != payload.user_id {
        return Err(StatusCode::FORBIDDEN);
    }

    // Check if planet has enough to sell
    let current_amount = match payload.sell_resource.as_str() {
        "metal" => planet.metal_amount,
        "crystal" => planet.crystal_amount,
        "deuterium" => planet.deuterium_amount,
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    if current_amount < payload.sell_quantity {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Calculate exchange rate
    let exchange_rate = market::calculate_exchange_rate(db, sell_resource.clone(), buy_resource.clone())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Calculate what player receives (no tax for NPC trades, only NPC margin)
    let gross_amount = payload.sell_quantity * exchange_rate;
    // Apply NPC buy margin (NPC pays 85% of market price)
    let final_amount = gross_amount * market::NPC_BUY_MARGIN;
    let tax_amount = 0.0; // No tax for NPC trades

    // Execute transaction
    let mut active_planet = planet.clone().into_active_model();

    // Deduct sold resource
    match payload.sell_resource.as_str() {
        "metal" => active_planet.metal_amount = Set(planet.metal_amount - payload.sell_quantity),
        "crystal" => active_planet.crystal_amount = Set(planet.crystal_amount - payload.sell_quantity),
        "deuterium" => active_planet.deuterium_amount = Set(planet.deuterium_amount - payload.sell_quantity),
        _ => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    }

    // Add bought resource
    match payload.buy_resource.as_str() {
        "metal" => {
            let current = match payload.sell_resource.as_str() {
                "metal" => planet.metal_amount - payload.sell_quantity,
                _ => planet.metal_amount,
            };
            active_planet.metal_amount = Set(current + final_amount);
        },
        "crystal" => {
            let current = match payload.sell_resource.as_str() {
                "crystal" => planet.crystal_amount - payload.sell_quantity,
                _ => planet.crystal_amount,
            };
            active_planet.crystal_amount = Set(current + final_amount);
        },
        "deuterium" => {
            let current = match payload.sell_resource.as_str() {
                "deuterium" => planet.deuterium_amount - payload.sell_quantity,
                _ => planet.deuterium_amount,
            };
            active_planet.deuterium_amount = Set(current + final_amount);
        },
        _ => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    }

    let updated_planet = active_planet.update(db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Record transaction
    let now = Utc::now().naive_utc();
    let transaction = market_transaction::ActiveModel {
        id: Set(Uuid::new_v4()),
        seller_planet_id: Set(payload.planet_id),
        seller_user_id: Set(payload.user_id),
        buyer_planet_id: Set(Uuid::nil()), // NPC
        buyer_user_id: Set(Uuid::nil()),   // NPC
        resource_sold: Set(payload.sell_resource.clone()),
        resource_paid: Set(payload.buy_resource.clone()),
        quantity_sold: Set(payload.sell_quantity),
        quantity_paid: Set(final_amount),
        price_per_unit: Set(exchange_rate),
        tax_amount: Set(tax_amount),
        transaction_type: Set("npc".to_string()),
        created_at: Set(now),
    };
    transaction.insert(db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Update server stats
    let totals = market::calculate_server_resource_totals(db).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    market::update_server_resource_stats(db, &totals).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({
        "message": "NPC exchange successful",
        "planet": {
            "metal_amount": updated_planet.metal_amount,
            "crystal_amount": updated_planet.crystal_amount,
            "deuterium_amount": updated_planet.deuterium_amount,
        },
        "exchanged": {
            "sold_resource": payload.sell_resource,
            "sold_quantity": payload.sell_quantity,
            "bought_resource": payload.buy_resource,
            "bought_quantity": final_amount,
            "exchange_rate": exchange_rate,
            "tax_paid": tax_amount,
        }
    })))
}

// GET /market/transactions - Get transaction history
async fn get_market_transactions_handler(
    State(state): State<AppState>,
    Query(user_query): Query<HashMap<String, String>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let db = &state.db;

    let user_id = user_query.get("user_id")
        .and_then(|s| Uuid::parse_str(s).ok());

    let mut query_builder = MarketTransaction::find()
        .order_by_desc(market_transaction::Column::CreatedAt)
        .limit(100);

    // Filter by user if provided
    if let Some(uid) = user_id {
        query_builder = query_builder.filter(
            Condition::any()
                .add(market_transaction::Column::SellerUserId.eq(uid))
                .add(market_transaction::Column::BuyerUserId.eq(uid))
        );
    }

    let transactions = query_builder
        .all(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let result: Vec<_> = transactions.iter().map(|t| json!({
        "id": t.id,
        "seller_user_id": t.seller_user_id,
        "buyer_user_id": t.buyer_user_id,
        "resource_sold": t.resource_sold,
        "resource_paid": t.resource_paid,
        "quantity_sold": t.quantity_sold,
        "quantity_paid": t.quantity_paid,
        "price_per_unit": t.price_per_unit,
        "tax_amount": t.tax_amount,
        "transaction_type": t.transaction_type,
        "created_at": t.created_at,
    })).collect();

    Ok(Json(json!({
        "transactions": result,
    })))
}

// GET /market/stats - Get market statistics
async fn get_market_stats_handler(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let db = &state.db;

    // Get server resource stats
    let totals = market::calculate_server_resource_totals(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Get NPC prices
    let npc_prices = market::get_all_npc_prices(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Count active listings
    let now = Utc::now().naive_utc();
    let active_listings_count = MarketListing::find()
        .filter(market_listing::Column::IsActive.eq(true))
        .filter(market_listing::Column::ExpiresAt.gt(now))
        .count(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let prices: Vec<_> = npc_prices.iter().map(|p| json!({
        "resource_type": p.resource_type.to_str(),
        "market_price": p.market_price,
        "npc_buy_price": p.buy_price,
        "npc_sell_price": p.sell_price,
    })).collect();

    Ok(Json(json!({
        "server_totals": {
            "metal": totals.metal_total,
            "crystal": totals.crystal_total,
            "deuterium": totals.deuterium_total,
            "total": totals.total,
        },
        "npc_prices": prices,
        "active_listings_count": active_listings_count,
    })))
}

// GET /market/prices/history - Get price history
async fn get_price_history_handler(
    State(state): State<AppState>,
    Query(query): Query<HashMap<String, String>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let db = &state.db;

    let resource_type = query.get("resource_type").map(|s| s.as_str());
    let limit: u64 = query.get("limit")
        .and_then(|s| s.parse().ok())
        .unwrap_or(100);

    let mut query_builder = MarketPriceHistory::find()
        .order_by_desc(market_price_history::Column::RecordedAt)
        .limit(limit);

    if let Some(resource) = resource_type {
        query_builder = query_builder.filter(market_price_history::Column::ResourceType.eq(resource));
    }

    let history = query_builder
        .all(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let result: Vec<_> = history.iter().map(|h| json!({
        "resource_type": h.resource_type,
        "npc_buy_price": h.npc_buy_price,
        "npc_sell_price": h.npc_sell_price,
        "avg_player_price": h.avg_player_price,
        "player_listings_count": h.player_listings_count,
        "recorded_at": h.recorded_at,
    })).collect();

    Ok(Json(json!({
        "history": result,
    })))
}

// GET /changelog - Récupère le contenu du fichier CHANGELOG.md
async fn get_changelog_handler() -> Result<impl IntoResponse, StatusCode> {
    // Essayer plusieurs chemins possibles
    let paths = ["../CHANGELOG.md", "CHANGELOG.md", "./CHANGELOG.md", "/app/CHANGELOG.md"];

    for path in paths {
        if let Ok(content) = tokio::fs::read_to_string(path).await {
            return Ok((StatusCode::OK, content));
        }
    }

    // Si aucun chemin ne fonctionne, retourner un message d'erreur
    Err(StatusCode::NOT_FOUND)
}

// ===== RESOURCE SLOTS HANDLERS =====

// GET /planets/:id/resource-slots - Récupérer les slots d'une planète
async fn get_resource_slots_handler(
    Path(planet_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    use entities::{prelude::ResourceSlot, resource_slot};

    match ResourceSlot::find()
        .filter(resource_slot::Column::PlanetId.eq(planet_id))
        .order_by_asc(resource_slot::Column::SlotNumber)
        .all(&state.db)
        .await
    {
        Ok(slots) => Json(slots).into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Erreur lors de la récupération des slots"})),
        )
            .into_response(),
    }
}

#[derive(Deserialize)]
struct UpdateSlotPayload {
    resource_type: Option<String>,
    level: Option<i32>,
}

// PATCH /planets/:id/resource-slots/:slot_number - Modifier un slot
async fn update_resource_slot_handler(
    Path((planet_id, slot_number)): Path<(Uuid, i32)>,
    State(state): State<AppState>,
    Json(payload): Json<UpdateSlotPayload>,
) -> impl IntoResponse {
    use entities::{prelude::ResourceSlot, resource_slot};

    // Récupérer le slot
    let slot = match ResourceSlot::find()
        .filter(resource_slot::Column::PlanetId.eq(planet_id))
        .filter(resource_slot::Column::SlotNumber.eq(slot_number))
        .one(&state.db)
        .await
    {
        Ok(Some(s)) => s,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Slot introuvable"})),
            )
                .into_response()
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Erreur DB"})),
            )
                .into_response()
        }
    };

    // Vérifier si le slot est verrouillé et qu'on essaie de changer le type
    if slot.is_locked && payload.resource_type.is_some() {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({"error": "Ce slot est verrouillé et son type ne peut pas être modifié"})),
        )
            .into_response();
    }

    // Valider le resource_type si fourni
    if let Some(ref res_type) = payload.resource_type {
        if !["metal", "crystal", "deuterium", "energy"].contains(&res_type.as_str()) {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "Type de ressource invalide"})),
            )
                .into_response();
        }
    }

    // Mettre à jour le slot
    let mut active: resource_slot::ActiveModel = slot.into();
    if let Some(res_type) = payload.resource_type {
        active.resource_type = Set(res_type);
    }
    if let Some(level) = payload.level {
        active.level = Set(level);
    }

    match active.update(&state.db).await {
        Ok(updated) => Json(updated).into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Erreur lors de la mise à jour"})),
        )
            .into_response(),
    }
}

// POST /planets/:id/resource-slots/:slot_number/toggle - Activer/désactiver un slot
async fn toggle_resource_slot_handler(
    Path((planet_id, slot_number)): Path<(Uuid, i32)>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    use entities::{prelude::ResourceSlot, resource_slot};

    // Récupérer la planète
    let planet = match Planet::find_by_id(planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète introuvable"}))).into_response()
        }
        Err(_) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response()
        }
    };

    // Récupérer le slot
    let slot = match ResourceSlot::find()
        .filter(resource_slot::Column::PlanetId.eq(planet_id))
        .filter(resource_slot::Column::SlotNumber.eq(slot_number))
        .one(&state.db)
        .await
    {
        Ok(Some(s)) => s,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(json!({"error": "Slot introuvable"}))).into_response()
        }
        Err(_) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response()
        }
    };

    // Les slots verrouillés sont toujours actifs
    if slot.is_locked {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Les slots verrouillés ne peuvent pas être désactivés"}))).into_response();
    }

    let new_state = !slot.is_active;

    // Si on active le slot, il y a un coût (exponentiel par numéro de slot)
    // Slot 5 = 5000/2500/1250, Slot 6 = 10000/5000/2500, Slot 7 = 20000/10000/5000, Slot 8 = 40000/20000/10000
    if new_state {
        let slot_index = slot_number - 5; // 0, 1, 2, 3
        let base_metal = 5000.0 * (2.0_f64).powi(slot_index);
        let base_crystal = 2500.0 * (2.0_f64).powi(slot_index);
        let base_deuterium = 1250.0 * (2.0_f64).powi(slot_index);

        if planet.metal_amount < base_metal || planet.crystal_amount < base_crystal || planet.deuterium_amount < base_deuterium {
            return (StatusCode::BAD_REQUEST, Json(json!({
                "error": "Ressources insuffisantes",
                "cost": {
                    "metal": base_metal,
                    "crystal": base_crystal,
                    "deuterium": base_deuterium
                }
            }))).into_response();
        }

        // Déduire les ressources
        let mut planet_active: planet::ActiveModel = planet.clone().into();
        planet_active.metal_amount = Set(planet.metal_amount - base_metal);
        planet_active.crystal_amount = Set(planet.crystal_amount - base_crystal);
        planet_active.deuterium_amount = Set(planet.deuterium_amount - base_deuterium);
        planet_active.last_update = Set(Utc::now().naive_utc());

        if planet_active.update(&state.db).await.is_err() {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur lors de la déduction des ressources"}))).into_response();
        }
    }

    // Toggle l'état du slot
    let mut active: resource_slot::ActiveModel = slot.into();
    active.is_active = Set(new_state);

    match active.update(&state.db).await {
        Ok(updated) => {
            // Récupérer la planète mise à jour pour retourner les nouvelles ressources
            let updated_planet = Planet::find_by_id(planet_id).one(&state.db).await.unwrap().unwrap();
            Json(json!({
                "slot": updated,
                "planet": {
                    "metal_amount": updated_planet.metal_amount,
                    "crystal_amount": updated_planet.crystal_amount,
                    "deuterium_amount": updated_planet.deuterium_amount
                }
            })).into_response()
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur lors de la mise à jour"}))).into_response(),
    }
}
