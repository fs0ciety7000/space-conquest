// ─────────────────────────────────────────────────────────────────────────────
// handlers/ranking.rs — Game config, ranking, unit costs, and planet handlers
//
// Extracted from main.rs (~lines 1078–2041, 4537–4564).
// Exposes a `router()` function to be merged into the main Axum app.
// ─────────────────────────────────────────────────────────────────────────────

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use sea_orm::{ColumnTrait, Condition, DatabaseConnection, EntityTrait, QueryFilter};
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;

use backend::{game_logic, AppState};
use backend::entities::{
    prelude::{BuildingType, Planet, PlanetBuilding},
    building_type, planet, planet_building,
};

use crate::models::{PlanetInfo, RankItem};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get building level from planet_buildings table
// ─────────────────────────────────────────────────────────────────────────────

async fn get_building_level(db: &DatabaseConnection, planet_id: Uuid, building_key: &str) -> i32 {
    let building_type = BuildingType::find()
        .filter(building_type::Column::BuildingKey.eq(building_key))
        .one(db)
        .await;

    let building_type_id = match building_type {
        Ok(Some(bt)) => bt.id,
        _ => return 0,
    };

    let planet_building = PlanetBuilding::find()
        .filter(planet_building::Column::PlanetId.eq(planet_id))
        .filter(planet_building::Column::BuildingTypeId.eq(building_type_id))
        .one(db)
        .await;

    match planet_building {
        Ok(Some(building)) => building.level,
        _ => 0,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: count unread messages for a user
// ─────────────────────────────────────────────────────────────────────────────

async fn count_unread_messages(user_id: Uuid, db: &DatabaseConnection) -> i32 {
    use backend::entities::prelude::Conversation;
    use backend::entities::conversation;

    let convs = Conversation::find()
        .filter(
            Condition::any()
                .add(conversation::Column::User1Id.eq(user_id))
                .add(conversation::Column::User2Id.eq(user_id)),
        )
        .all(db)
        .await
        .unwrap_or_default();

    let mut total_unread = 0;
    for conv in convs {
        if conv.user1_id == user_id && !conv.user1_archived {
            total_unread += conv.user1_unread_count;
        } else if conv.user2_id == user_id && !conv.user2_archived {
            total_unread += conv.user2_unread_count;
        }
    }

    total_unread
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /config
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_game_config_handler(State(state): State<AppState>) -> impl IntoResponse {
    let config = state.config.read().unwrap().clone();

    // Normaliser speed_factor pour le frontend (500 → 5, 1000 → 10, etc.)
    let normalized_speed_factor = config.production_speed;

    // Diviser les coûts par le cost_scaling (basé sur speed_factor)
    let cost_divider = (config.production_speed).max(1.0);

    // Renvoyer toutes les config nécessaires pour les calculs frontend
    Json(json!({
        "speed_factor": normalized_speed_factor,
        "production_metal_base": config.get_config("production_metal_base", 30.0),
        "production_crystal_base": config.get_config("production_crystal_base", 20.0),
        "production_deuterium_base": config.get_config("production_deuterium_base", 10.0),
        "production_metal_growth": config.get_config("production_metal_growth", 1.1),
        "production_crystal_growth": config.get_config("production_crystal_growth", 1.1),
        "production_deuterium_growth": config.get_config("production_deuterium_growth", 1.05),
        "energy_tech_bonus": config.get_config("energy_tech_bonus", 0.01),
        "energy_solar_base": config.get_config("energy_solar_base", 20.0),
        "energy_solar_growth": config.get_config("energy_solar_growth", 1.1),
        "energy_mine_consumption_base": config.get_config("energy_mine_consumption_base", 10.0),
        "energy_mine_consumption_growth": config.get_config("energy_mine_consumption_growth", 1.1),
        "energy_deuterium_extra_consumption": config.get_config("energy_deuterium_extra_consumption", 20.0),
        "mining_speed_multiplier": config.mining_speed,
        "construction_speed_multiplier": config.construction_speed,
        "cost_divider": cost_divider,
        // Coûts des vaisseaux (déjà divisés par cost_scaling)
        "ship_light_hunter_metal": config.get_config("ship_light_hunter_metal", 3000.0) / cost_divider,
        "ship_light_hunter_crystal": config.get_config("ship_light_hunter_crystal", 1000.0) / cost_divider,
        "ship_cruiser_metal": config.get_config("ship_cruiser_metal", 20000.0) / cost_divider,
        "ship_cruiser_crystal": config.get_config("ship_cruiser_crystal", 7000.0) / cost_divider,
        "ship_transporter_metal": config.get_config("ship_transporter_metal", 4000.0) / cost_divider,
        "ship_transporter_crystal": config.get_config("ship_transporter_crystal", 4000.0) / cost_divider,
        "ship_recycler_metal": config.get_config("ship_recycler_metal", 10000.0) / cost_divider,
        "ship_recycler_crystal": config.get_config("ship_recycler_crystal", 6000.0) / cost_divider,
        "ship_spy_probe_metal": config.get_config("ship_spy_probe_metal", 1000.0) / cost_divider,
        "ship_spy_probe_crystal": config.get_config("ship_spy_probe_crystal", 0.0) / cost_divider,
        "ship_colony_ship_metal": config.get_config("ship_colony_ship_metal", 10000.0) / cost_divider,
        "ship_colony_ship_crystal": config.get_config("ship_colony_ship_crystal", 20000.0) / cost_divider,
        // Coûts des défenses (déjà divisés par cost_scaling)
        "defense_missile_launcher_metal": config.get_config("defense_missile_launcher_metal", 10000.0) / cost_divider,
        "defense_missile_launcher_crystal": config.get_config("defense_missile_launcher_crystal", 2500.0) / cost_divider,
        "defense_plasma_turret_metal": config.get_config("defense_plasma_turret_metal", 50000.0) / cost_divider,
        "defense_plasma_turret_crystal": config.get_config("defense_plasma_turret_crystal", 50000.0) / cost_divider,
        // Combat stats
        "combat_light_hunter_attack": config.get_config("combat_light_hunter_attack", 50.0),
        "combat_light_hunter_shield": config.get_config("combat_light_hunter_shield", 10.0),
        "combat_light_hunter_hull": config.get_config("combat_light_hunter_hull", 400.0),
        "combat_cruiser_attack": config.get_config("combat_cruiser_attack", 400.0),
        "combat_cruiser_shield": config.get_config("combat_cruiser_shield", 50.0),
        "combat_cruiser_hull": config.get_config("combat_cruiser_hull", 2700.0),
        "combat_missile_launcher_attack": config.get_config("combat_missile_launcher_attack", 80.0),
        "combat_missile_launcher_shield": config.get_config("combat_missile_launcher_shield", 20.0),
        "combat_missile_launcher_hull": config.get_config("combat_missile_launcher_hull", 200.0),
        "combat_plasma_turret_attack": config.get_config("combat_plasma_turret_attack", 3000.0),
        "combat_plasma_turret_shield": config.get_config("combat_plasma_turret_shield", 300.0),
        "combat_plasma_turret_hull": config.get_config("combat_plasma_turret_hull", 10000.0),
        // Rapid fire
        "combat_rf_cruiser_vs_light_hunter": config.get_config("combat_rf_cruiser_vs_light_hunter", 6.0),
        "combat_rf_cruiser_vs_missile_launcher": config.get_config("combat_rf_cruiser_vs_missile_launcher", 10.0),
        "combat_rf_plasma_vs_light_hunter": config.get_config("combat_rf_plasma_vs_light_hunter", 5.0),
        "combat_rf_plasma_vs_cruiser": config.get_config("combat_rf_plasma_vs_cruiser", 3.0),
        // Tech bonuses
        "combat_tech_laser_bonus": config.get_config("combat_tech_laser_bonus", 0.1),
        "combat_tech_energy_bonus": config.get_config("combat_tech_energy_bonus", 0.1),
        "combat_tech_armour_bonus": config.get_config("combat_tech_armour_bonus", 0.1),
        // Loot mechanics
        "loot_percentage": config.get_config("loot_percentage", 0.5),
        "loot_max_per_resource": config.get_config("loot_max_per_resource", 50000.0),
        "debris_percentage": config.get_config("debris_percentage", 0.3),
        // Cargo capacities
        "cargo_light_hunter": config.get_config("cargo_light_hunter", 50.0),
        "cargo_cruiser": config.get_config("cargo_cruiser", 800.0),
        "cargo_transporter_base": config.get_config("cargo_transporter_base", 10000.0),
        "cargo_transporter_bonus_per_hangar": config.get_config("cargo_transporter_bonus_per_hangar", 0.05),
        "cargo_transporter_bonus_per_computer_tech": config.get_config("cargo_transporter_bonus_per_computer_tech", 0.1),
        // Cooldowns
        "attack_cooldown_hours": config.get_config("attack_cooldown_hours", 2.0),
        "sabotage_cooldown_hours": config.get_config("sabotage_cooldown_hours", 2.0),
        // Expedition mechanics
        "expedition_combat_chance": config.get_config("expedition_combat_chance", 0.3),
        "expedition_deuterium_chance": config.get_config("expedition_deuterium_chance", 0.5),
        "expedition_recycler_bonus_multiplier": config.get_config("expedition_recycler_bonus_multiplier", 2.0),
        "expedition_calm_sector_bonus": config.get_config("expedition_calm_sector_bonus", 1.2),
        "expedition_base_duration": config.get_config("expedition_base_duration", 600.0),
        "expedition_hunter_metal_min": config.get_config("expedition_hunter_metal_min", 50.0),
        "expedition_hunter_metal_range": config.get_config("expedition_hunter_metal_range", 50.0),
        "expedition_hunter_crystal_min": config.get_config("expedition_hunter_crystal_min", 20.0),
        "expedition_hunter_crystal_range": config.get_config("expedition_hunter_crystal_range", 30.0),
        "expedition_hunter_deut_min": config.get_config("expedition_hunter_deut_min", 10.0),
        "expedition_hunter_deut_range": config.get_config("expedition_hunter_deut_range", 15.0),
        "expedition_cruiser_metal_min": config.get_config("expedition_cruiser_metal_min", 150.0),
        "expedition_cruiser_metal_range": config.get_config("expedition_cruiser_metal_range", 100.0),
        "expedition_cruiser_crystal_min": config.get_config("expedition_cruiser_crystal_min", 60.0),
        "expedition_cruiser_crystal_range": config.get_config("expedition_cruiser_crystal_range", 40.0),
        "expedition_cruiser_deut_min": config.get_config("expedition_cruiser_deut_min", 30.0),
        "expedition_cruiser_deut_range": config.get_config("expedition_cruiser_deut_range", 30.0),
        "expedition_pirate_strength_min": config.get_config("expedition_pirate_strength_min", 10.0),
        "expedition_pirate_strength_max": config.get_config("expedition_pirate_strength_max", 100.0),
        "expedition_defense_bonus_multiplier": config.get_config("expedition_defense_bonus_multiplier", 5.0),
        "expedition_victory_loss_min": config.get_config("expedition_victory_loss_min", 0.03),
        "expedition_victory_loss_max": config.get_config("expedition_victory_loss_max", 0.15),
        "expedition_victory_loss_variation": config.get_config("expedition_victory_loss_variation", 0.1),
        "expedition_defeat_loss_min": config.get_config("expedition_defeat_loss_min", 0.30),
        "expedition_defeat_loss_max": config.get_config("expedition_defeat_loss_max", 0.60),
        "expedition_defeat_loss_variation": config.get_config("expedition_defeat_loss_variation", 0.15),
        "expedition_hunter_vulnerability": config.get_config("expedition_hunter_vulnerability", 1.0),
        "expedition_cruiser_vulnerability": config.get_config("expedition_cruiser_vulnerability", 0.5),
        // Structure capacities
        "hangar_capacity_base": config.get_config("hangar_capacity_base", 500.0),
        "hangar_capacity_per_level": config.get_config("hangar_capacity_per_level", 500.0),
        "storage_capacity_base": config.get_config("storage_capacity_base", 600000.0),
        "storage_capacity_growth": config.get_config("storage_capacity_growth", 1.6),
        "slot_bonus_per_slot": config.get_config("slot_bonus_per_slot", 0.5),
        // Trade routes
        "trade_route_interval_hours": config.get_config("trade_route_interval_hours", 24.0),
        "trade_route_piracy_chance": config.get_config("trade_route_piracy_chance", 0.10),
        "grand_cargo_capacity": config.get_config("grand_cargo_capacity", 1_000_000.0),
        "grand_cargo_attack": config.get_config("grand_cargo_attack", 50.0),
        "grand_cargo_shield": config.get_config("grand_cargo_shield", 100.0),
        "grand_cargo_hull": config.get_config("grand_cargo_hull", 15000.0),
        "grand_cargo_speed": config.get_config("grand_cargo_speed", 5000.0),
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /ranking
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_ranking_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    use sea_orm::ConnectionTrait;

    let current_planet_id = params
        .get("current_planet_id")
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_default();

    let sort_type = params.get("type").map(|s| s.as_str()).unwrap_or("general");
    let page: u64 = params.get("page").and_then(|s| s.parse().ok()).unwrap_or(1);
    let limit: u64 = params
        .get("limit")
        .and_then(|s| s.parse().ok())
        .unwrap_or(50);
    let offset = (page - 1) * limit;

    let db = &state.db;

    // Trouver l'owner_id de la planète courante (pour is_me)
    let current_owner_id: Option<Uuid> = Planet::find_by_id(current_planet_id)
        .one(db)
        .await
        .ok()
        .flatten()
        .map(|p| p.owner_id);

    // Colonne de tri
    let order_col = match sort_type {
        "economy" => "economy_score",
        "military" => "military_score",
        _ => "total_score",
    };

    // Total d'utilisateurs (pour la pagination)
    let total_row = db
        .query_one(sea_orm::Statement::from_string(
            sea_orm::DatabaseBackend::Postgres,
            r#"SELECT COUNT(*) AS cnt FROM "user""#.to_owned(),
        ))
        .await
        .ok()
        .flatten();
    let total: u64 = total_row
        .and_then(|r| r.try_get::<i64>("", "cnt").ok())
        .unwrap_or(0) as u64;

    // Récupérer la page de joueurs triée par score (SQL ORDER BY + LIMIT + OFFSET)
    let user_rows = db
        .query_all(sea_orm::Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            &format!(
                r#"SELECT id, username, display_name, total_score, economy_score, military_score,
                          avatar_url, protection_until
                   FROM "user"
                   ORDER BY {} DESC
                   LIMIT $1 OFFSET $2"#,
                order_col
            ),
            [limit.into(), offset.into()],
        ))
        .await
        .unwrap_or_default();

    let config = state.config.read().unwrap().clone();
    let mut ranked_users: Vec<RankItem> = Vec::new();

    for (idx, row) in user_rows.iter().enumerate() {
        let owner_id: Uuid = row.try_get("", "id").unwrap_or_default();
        let username: String = row.try_get("", "username").unwrap_or_default();
        let display_name: String = row
            .try_get::<Option<String>>("", "display_name")
            .ok()
            .flatten()
            .unwrap_or_else(|| username.clone());
        let total_score: i32 = row.try_get("", "total_score").unwrap_or(0);
        let economy_score: i32 = row.try_get("", "economy_score").unwrap_or(0);
        let military_score: i32 = row.try_get("", "military_score").unwrap_or(0);
        let avatar_url: Option<String> = row.try_get("", "avatar_url").ok().flatten();
        let protection_until: Option<String> =
            row.try_get::<Option<chrono::NaiveDateTime>>("", "protection_until")
                .ok()
                .flatten()
                .map(|dt| dt.to_string());

        // Planètes de cet utilisateur (pour la page courante seulement)
        let user_planets = Planet::find()
            .filter(planet::Column::OwnerId.eq(owner_id))
            .all(db)
            .await
            .unwrap_or_default();

        let mut planet_infos: Vec<PlanetInfo> = Vec::new();
        let galaxy = user_planets.first().map(|p| p.galaxy);

        for p in &user_planets {
            let (pt, pe, pm) = game_logic::calculate_planet_points(p, db, &config).await;
            planet_infos.push(PlanetInfo {
                id: p.id,
                name: p.name.clone(),
                total_score: pt,
                economy_score: pe,
                military_score: pm,
                galaxy: p.galaxy,
                system: p.system,
                position: p.position,
            });
        }

        let is_me = current_owner_id
            .map(|id| id == owner_id)
            .unwrap_or(false);
        let rank_badge = game_logic::get_rank_badge(total_score);
        let is_online = state
            .ws
            .as_ref()
            .map(|ws| ws.is_user_online(owner_id))
            .unwrap_or(false);

        ranked_users.push(RankItem {
            rank: (offset as usize) + idx + 1,
            username,
            display_name,
            total_score,
            economy_score,
            military_score,
            is_me,
            owner_id,
            planets: planet_infos,
            rank_badge: rank_badge.to_string(),
            protection_until,
            galaxy,
            avatar_url,
            is_online,
        });
    }

    Json(json!({
        "data": ranked_users,
        "total": total,
        "page": page,
        "limit": limit,
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /unit-costs
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_unit_costs_handler(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let config = state.config.read().unwrap().clone();
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
        let (metal, crystal) = game_logic::get_unit_cost(unit, &config);
        costs.insert(
            unit.to_string(),
            json!({
                "metal": metal,
                "crystal": crystal,
            }),
        );
    }

    Ok(Json(json!(costs)))
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: get_planet_handler est volontairement laissé dans main.rs pour l'instant.
// Il sera déplacé dans handlers/planets.rs lors de la prochaine session.
// TODO (antigravity): créer handlers/planets.rs et y déplacer get_planet_handler.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

pub fn router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/config", get(get_game_config_handler))
        .route("/ranking", get(get_ranking_handler))
        .route("/unit-costs", get(get_unit_costs_handler))
        .with_state(state)
}
