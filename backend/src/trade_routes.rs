/// Trade Routes — Routes Commerciales
///
/// Allows players to set up automated resource transfers between their own planets.
/// Routes run on a configurable interval (default: 24h).
/// Enemy fleets in "piracy" ambush can intercept and steal a portion of the cargo.

use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use sea_orm::{
    ActiveModelTrait, DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait,
    Set, QueryOrder, QuerySelect,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;
use chrono::{Utc, Duration};

use crate::AppState;
use crate::entities::{prelude::*, planet, fleet_mission};

// ─── DTOs ─────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CreateRoutePayload {
    pub owner_id: Uuid,
    pub name: String,
    pub source_planet_id: Uuid,
    pub target_planet_id: Uuid,
    pub ship_count: i32,
    pub metal_ratio: f64,
    pub crystal_ratio: f64,
    pub deuterium_ratio: f64,
}

#[derive(Deserialize)]
pub struct UpdateRoutePayload {
    pub name: Option<String>,
    pub ship_count: Option<i32>,
    pub metal_ratio: Option<f64>,
    pub crystal_ratio: Option<f64>,
    pub deuterium_ratio: Option<f64>,
    pub is_active: Option<bool>,
}

#[derive(Serialize)]
struct RouteLog {
    id: String,
    executed_at: String,
    metal_transferred: f64,
    crystal_transferred: f64,
    deuterium_transferred: f64,
    status: String,
    piracy_loss_ratio: Option<f64>,
    source_planet_name: Option<String>,
    target_planet_name: Option<String>,
}

// ─── Sea-ORM entity stubs (raw SQL is simpler here since tables are new) ──────
// We use execute_unprepared for inserts/updates and SELECT via raw query.

fn compute_travel_time_seconds(
    src: (i32, i32, i32),
    tgt: (i32, i32, i32),
    flight_speed: f64,
    hyperspace_level: i32,
) -> i64 {
    let dist = crate::game_logic::calculate_distance(src, tgt);
    let base_time = crate::game_logic::calculate_flight_time(dist, flight_speed);
    // Hyperspace tech: each level gives +10% speed → reduce time
    let bonus = 1.0 + hyperspace_level as f64 * 0.10;
    ((base_time as f64) / bonus).max(1.0) as i64
}

async fn route_to_json(db: &DatabaseConnection, route_id: &str, flight_speed: f64) -> Option<serde_json::Value> {
    use sea_orm::ConnectionTrait;
    let row = db.query_one(sea_orm::Statement::from_string(
        sea_orm::DbBackend::Postgres,
        format!(
            "SELECT tr.id, tr.owner_id, tr.name, tr.source_planet_id, tr.target_planet_id, \
             tr.ship_count, tr.metal_ratio, tr.crystal_ratio, tr.deuterium_ratio, \
             tr.is_active, tr.next_run_at, tr.created_at, \
             ps.name AS source_name, pt.name AS target_name, \
             ps.galaxy AS src_galaxy, ps.system AS src_system, ps.position AS src_position, \
             pt.galaxy AS tgt_galaxy, pt.system AS tgt_system, pt.position AS tgt_position \
             FROM trade_route tr \
             JOIN planet ps ON ps.id = tr.source_planet_id \
             JOIN planet pt ON pt.id = tr.target_planet_id \
             WHERE tr.id = '{}'", route_id
        ),
    )).await.ok()??;

    let src = (
        row.try_get::<i32>("", "src_galaxy").unwrap_or(1),
        row.try_get::<i32>("", "src_system").unwrap_or(1),
        row.try_get::<i32>("", "src_position").unwrap_or(1),
    );
    let tgt = (
        row.try_get::<i32>("", "tgt_galaxy").unwrap_or(1),
        row.try_get::<i32>("", "tgt_system").unwrap_or(1),
        row.try_get::<i32>("", "tgt_position").unwrap_or(1),
    );
    let travel_time_seconds = compute_travel_time_seconds(src, tgt, flight_speed, 0);

    Some(json!({
        "id": row.try_get::<String>("", "id").ok()?,
        "owner_id": row.try_get::<String>("", "owner_id").ok()?,
        "name": row.try_get::<String>("", "name").ok()?,
        "source_planet_id": row.try_get::<String>("", "source_planet_id").ok()?,
        "target_planet_id": row.try_get::<String>("", "target_planet_id").ok()?,
        "source_planet_name": row.try_get::<String>("", "source_name").ok(),
        "target_planet_name": row.try_get::<String>("", "target_name").ok(),
        "ship_count": row.try_get::<i32>("", "ship_count").ok()?,
        "metal_ratio": row.try_get::<f64>("", "metal_ratio").ok()?,
        "crystal_ratio": row.try_get::<f64>("", "crystal_ratio").ok()?,
        "deuterium_ratio": row.try_get::<f64>("", "deuterium_ratio").ok()?,
        "is_active": row.try_get::<bool>("", "is_active").ok()?,
        "next_run_at": row.try_get::<chrono::NaiveDateTime>("", "next_run_at").ok()
            .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string()),
        "created_at": row.try_get::<chrono::NaiveDateTime>("", "created_at").ok()
            .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string()),
        "travel_time_seconds": travel_time_seconds,
    }))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/// How many routes can a player create on a given planet based on logistics_hub level?
/// 0→0, 1→2, 2→4, 3→6, 4→9, 5→12, 6+→12+(level-5)*3
pub fn max_routes_for_hub_level(level: i32) -> i32 {
    match level {
        0 => 0,
        1 => 2,
        2 => 4,
        3 => 6,
        4 => 9,
        5 => 12,
        n => 12 + (n - 5) * 3,
    }
}

fn clamp_ratio(v: f64) -> f64 {
    v.max(0.0).min(1.0)
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/// GET /trade-routes?user_id=<uuid>
pub async fn list_routes_handler(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    use sea_orm::ConnectionTrait;
    let db = &state.db;

    let user_id = match params.get("user_id").and_then(|s| Uuid::parse_str(s).ok()) {
        Some(id) => id,
        None => return (StatusCode::BAD_REQUEST, Json(json!({"error": "user_id required"}))).into_response(),
    };

    let flight_speed = state.config.read().unwrap().get_config("flight_speed_multiplier", 5.0);

    let rows = db.query_all(sea_orm::Statement::from_string(
        sea_orm::DbBackend::Postgres,
        format!(
            "SELECT tr.id, tr.owner_id, tr.name, tr.source_planet_id, tr.target_planet_id, \
             tr.ship_count, tr.metal_ratio, tr.crystal_ratio, tr.deuterium_ratio, \
             tr.is_active, tr.next_run_at, tr.created_at, \
             ps.name AS source_name, pt.name AS target_name, \
             ps.galaxy AS src_galaxy, ps.system AS src_system, ps.position AS src_position, \
             pt.galaxy AS tgt_galaxy, pt.system AS tgt_system, pt.position AS tgt_position \
             FROM trade_route tr \
             JOIN planet ps ON ps.id = tr.source_planet_id \
             JOIN planet pt ON pt.id = tr.target_planet_id \
             WHERE tr.owner_id = '{}' \
             ORDER BY tr.created_at DESC",
            user_id
        ),
    )).await.unwrap_or_default();

    // Get hyperspace_tech level for this player (from any of their planets)
    let hyperspace_level: i32 = db.query_one(sea_orm::Statement::from_string(
        sea_orm::DbBackend::Postgres,
        format!(
            "SELECT COALESCE(MAX(pt.current_level), 0) AS lvl \
             FROM planet_technologies pt \
             JOIN technologies t ON t.id = pt.tech_id \
             JOIN planet p ON p.id = pt.planet_id \
             WHERE t.tech_key = 'hyperspace_tech' AND p.owner_id = '{}'",
            user_id
        ),
    )).await.unwrap_or(None)
      .and_then(|r| r.try_get::<i64>("", "lvl").ok())
      .unwrap_or(0) as i32;

    let routes: Vec<serde_json::Value> = rows.iter().filter_map(|row| {
        let src = (
            row.try_get::<i32>("", "src_galaxy").unwrap_or(1),
            row.try_get::<i32>("", "src_system").unwrap_or(1),
            row.try_get::<i32>("", "src_position").unwrap_or(1),
        );
        let tgt = (
            row.try_get::<i32>("", "tgt_galaxy").unwrap_or(1),
            row.try_get::<i32>("", "tgt_system").unwrap_or(1),
            row.try_get::<i32>("", "tgt_position").unwrap_or(1),
        );
        let travel_time_seconds = compute_travel_time_seconds(src, tgt, flight_speed, hyperspace_level);

        Some(json!({
            "id": row.try_get::<String>("", "id").ok()?,
            "name": row.try_get::<String>("", "name").ok()?,
            "source_planet_id": row.try_get::<String>("", "source_planet_id").ok()?,
            "target_planet_id": row.try_get::<String>("", "target_planet_id").ok()?,
            "source_planet_name": row.try_get::<String>("", "source_name").ok(),
            "target_planet_name": row.try_get::<String>("", "target_name").ok(),
            "ship_count": row.try_get::<i32>("", "ship_count").ok()?,
            "metal_ratio": row.try_get::<f64>("", "metal_ratio").ok()?,
            "crystal_ratio": row.try_get::<f64>("", "crystal_ratio").ok()?,
            "deuterium_ratio": row.try_get::<f64>("", "deuterium_ratio").ok()?,
            "is_active": row.try_get::<bool>("", "is_active").ok()?,
            "next_run_at": row.try_get::<chrono::NaiveDateTime>("", "next_run_at").ok()
                .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string()),
            "created_at": row.try_get::<chrono::NaiveDateTime>("", "created_at").ok()
                .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string()),
            "travel_time_seconds": travel_time_seconds,
        }))
    }).collect();

    Json(json!({ "routes": routes })).into_response()
}

/// POST /trade-routes
pub async fn create_route_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateRoutePayload>,
) -> impl IntoResponse {
    use sea_orm::ConnectionTrait;
    let db = &state.db;

    // Validate ratios
    if payload.metal_ratio < 0.0 || payload.crystal_ratio < 0.0 || payload.deuterium_ratio < 0.0
        || payload.metal_ratio > 1.0 || payload.crystal_ratio > 1.0 || payload.deuterium_ratio > 1.0
    {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Ratios must be between 0 and 1"}))).into_response();
    }
    if payload.ship_count < 1 || payload.ship_count > 500 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "ship_count must be between 1 and 500"}))).into_response();
    }
    if payload.source_planet_id == payload.target_planet_id {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Source and target planets must be different"}))).into_response();
    }

    // Verify both planets belong to the owner
    let source = match Planet::find_by_id(payload.source_planet_id).one(db).await {
        Ok(Some(p)) if p.owner_id == payload.owner_id => p,
        _ => return (StatusCode::FORBIDDEN, Json(json!({"error": "Source planet not found or not yours"}))).into_response(),
    };
    let _target = match Planet::find_by_id(payload.target_planet_id).one(db).await {
        Ok(Some(p)) if p.owner_id == payload.owner_id => p,
        _ => return (StatusCode::FORBIDDEN, Json(json!({"error": "Target planet not found or not yours"}))).into_response(),
    };

    // Check logistics hub level on source planet
    let hub_level = crate::tech_tree::get_planet_building_level(db, source.id, "logistics_hub").await.unwrap_or(0);
    let max_routes = max_routes_for_hub_level(hub_level);

    // Count existing routes from this source planet
    let row = db.query_one(sea_orm::Statement::from_string(
        sea_orm::DbBackend::Postgres,
        format!(
            "SELECT COUNT(*) AS cnt FROM trade_route WHERE owner_id = '{}' AND source_planet_id = '{}'",
            payload.owner_id, payload.source_planet_id
        ),
    )).await.unwrap_or(None);

    let existing_count: i64 = row.as_ref()
        .and_then(|r| r.try_get::<i64>("", "cnt").ok())
        .unwrap_or(0);

    if existing_count >= max_routes as i64 {
        return (StatusCode::CONFLICT, Json(json!({
            "error": format!("Hub Logistique niveau {} permet {} route(s) max depuis cette planète. Améliorez votre Hub pour en créer davantage.", hub_level, max_routes)
        }))).into_response();
    }

    // Check player has enough grand_cargo ships on source planet
    let cargo_count = crate::tech_tree::get_planet_ship_count(db, source.id, "grand_cargo").await.unwrap_or(0);
    if cargo_count < payload.ship_count {
        return (StatusCode::BAD_REQUEST, Json(json!({
            "error": format!("Pas assez de Grands Cargos : {} disponibles, {} demandés", cargo_count, payload.ship_count)
        }))).into_response();
    }

    // Determine first run: in <interval_hours>
    let config = state.config.read().unwrap().clone();
    let interval_hours = config.get_config("trade_route_interval_hours", 24.0) as i64;
    let flight_speed = config.get_config("flight_speed_multiplier", 5.0);
    let now = Utc::now().naive_utc();
    let next_run = now + Duration::hours(interval_hours);
    let route_id = Uuid::new_v4();

    let name_escaped = payload.name.replace('\'', "''");
    db.execute_unprepared(&format!(
        "INSERT INTO trade_route (id, owner_id, name, source_planet_id, target_planet_id, ship_count, \
         metal_ratio, crystal_ratio, deuterium_ratio, is_active, next_run_at, created_at) \
         VALUES ('{}', '{}', '{}', '{}', '{}', {}, {}, {}, {}, true, '{}', '{}')",
        route_id, payload.owner_id, name_escaped,
        payload.source_planet_id, payload.target_planet_id,
        payload.ship_count,
        clamp_ratio(payload.metal_ratio), clamp_ratio(payload.crystal_ratio), clamp_ratio(payload.deuterium_ratio),
        next_run.format("%Y-%m-%d %H:%M:%S"),
        now.format("%Y-%m-%d %H:%M:%S"),
    )).await.ok();

    match route_to_json(db, &route_id.to_string(), flight_speed).await {
        Some(r) => (StatusCode::CREATED, Json(json!({"route": r}))).into_response(),
        None => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// PATCH /trade-routes/:id
pub async fn update_route_handler(
    Path(route_id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<UpdateRoutePayload>,
) -> impl IntoResponse {
    use sea_orm::ConnectionTrait;
    let db = &state.db;

    // Build SET clause
    let mut sets: Vec<String> = Vec::new();

    if let Some(name) = &payload.name {
        sets.push(format!("name = '{}'", name.replace('\'', "''")));
    }
    if let Some(count) = payload.ship_count {
        if count < 1 || count > 500 {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "ship_count must be 1-500"}))).into_response();
        }
        sets.push(format!("ship_count = {}", count));
    }
    if let Some(v) = payload.metal_ratio {
        sets.push(format!("metal_ratio = {}", clamp_ratio(v)));
    }
    if let Some(v) = payload.crystal_ratio {
        sets.push(format!("crystal_ratio = {}", clamp_ratio(v)));
    }
    if let Some(v) = payload.deuterium_ratio {
        sets.push(format!("deuterium_ratio = {}", clamp_ratio(v)));
    }
    if let Some(active) = payload.is_active {
        sets.push(format!("is_active = {}", active));
        // If reactivating, set next_run to now + interval
        if active {
            let config = state.config.read().unwrap().clone();
            let interval_hours = config.get_config("trade_route_interval_hours", 24.0) as i64;
            let next = Utc::now().naive_utc() + Duration::hours(interval_hours);
            sets.push(format!("next_run_at = '{}'", next.format("%Y-%m-%d %H:%M:%S")));
        }
    }

    if sets.is_empty() {
        return StatusCode::BAD_REQUEST.into_response();
    }

    let sql = format!(
        "UPDATE trade_route SET {} WHERE id = '{}'",
        sets.join(", "), route_id
    );
    let _ = db.execute_unprepared(&sql).await;

    let flight_speed = state.config.read().unwrap().get_config("flight_speed_multiplier", 5.0);
    match route_to_json(db, &route_id.to_string(), flight_speed).await {
        Some(r) => Json(json!({"route": r})).into_response(),
        None => StatusCode::NOT_FOUND.into_response(),
    }
}

/// DELETE /trade-routes/:id
pub async fn delete_route_handler(
    Path(route_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    use sea_orm::ConnectionTrait;
    let db = &state.db;

    let user_id = match params.get("user_id").and_then(|s| Uuid::parse_str(s).ok()) {
        Some(id) => id,
        None => return StatusCode::UNAUTHORIZED.into_response(),
    };

    // Verify ownership
    let row = db.query_one(sea_orm::Statement::from_string(
        sea_orm::DbBackend::Postgres,
        format!("SELECT owner_id FROM trade_route WHERE id = '{}'", route_id),
    )).await.unwrap_or(None);

    let owner_id: Uuid = row.as_ref()
        .and_then(|r| r.try_get::<Uuid>("", "owner_id").ok())
        .unwrap_or_default();

    if owner_id != user_id {
        return StatusCode::FORBIDDEN.into_response();
    }

    let _ = db.execute_unprepared(&format!(
        "DELETE FROM trade_route_log WHERE trade_route_id = '{}'", route_id
    )).await;
    let _ = db.execute_unprepared(&format!(
        "DELETE FROM trade_route WHERE id = '{}'", route_id
    )).await;

    StatusCode::NO_CONTENT.into_response()
}

/// GET /trade-routes/:id/logs
pub async fn get_route_logs_handler(
    Path(route_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    use sea_orm::ConnectionTrait;
    let db = &state.db;

    let rows = db.query_all(sea_orm::Statement::from_string(
        sea_orm::DbBackend::Postgres,
        format!(
            "SELECT id, executed_at, metal_transferred, crystal_transferred, deuterium_transferred, \
             status, piracy_loss_ratio, source_planet_name, target_planet_name \
             FROM trade_route_log WHERE trade_route_id = '{}' ORDER BY executed_at DESC LIMIT 50",
            route_id
        ),
    )).await.unwrap_or_default();

    let logs: Vec<serde_json::Value> = rows.iter().filter_map(|row| {
        Some(json!({
            "id": row.try_get::<String>("", "id").ok()?,
            "executed_at": row.try_get::<chrono::NaiveDateTime>("", "executed_at").ok()
                .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string()),
            "metal_transferred": row.try_get::<f64>("", "metal_transferred").ok().unwrap_or(0.0),
            "crystal_transferred": row.try_get::<f64>("", "crystal_transferred").ok().unwrap_or(0.0),
            "deuterium_transferred": row.try_get::<f64>("", "deuterium_transferred").ok().unwrap_or(0.0),
            "status": row.try_get::<String>("", "status").ok().unwrap_or_default(),
            "piracy_loss_ratio": row.try_get::<f64>("", "piracy_loss_ratio").ok(),
            "source_planet_name": row.try_get::<String>("", "source_planet_name").ok(),
            "target_planet_name": row.try_get::<String>("", "target_planet_name").ok(),
        }))
    }).collect();

    Json(json!({ "logs": logs })).into_response()
}

/// GET /trade-routes/hub-info?planet_id=<uuid>
/// Returns logistics_hub level and max routes for this planet
pub async fn get_hub_info_handler(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let planet_id = match params.get("planet_id").and_then(|s| Uuid::parse_str(s).ok()) {
        Some(id) => id,
        None => return (StatusCode::BAD_REQUEST, Json(json!({"error": "planet_id required"}))).into_response(),
    };
    let db = &state.db;
    let hub_level = crate::tech_tree::get_planet_building_level(db, planet_id, "logistics_hub").await.unwrap_or(0);
    let max_routes = max_routes_for_hub_level(hub_level);
    Json(json!({
        "hub_level": hub_level,
        "max_routes": max_routes,
        "planet_id": planet_id,
    })).into_response()
}

// ─── Background execution ──────────────────────────────────────────────────────

/// Called by the background task every hour. Processes all due trade routes.
pub async fn process_due_trade_routes(db: &DatabaseConnection, config: &crate::ServerConfigCache) {
    use sea_orm::ConnectionTrait;
    let now = Utc::now().naive_utc();

    let rows = match db.query_all(sea_orm::Statement::from_string(
        sea_orm::DbBackend::Postgres,
        format!(
            "SELECT tr.id, tr.owner_id, tr.name, tr.source_planet_id, tr.target_planet_id, \
             tr.ship_count, tr.metal_ratio, tr.crystal_ratio, tr.deuterium_ratio \
             FROM trade_route tr \
             WHERE tr.is_active = true AND tr.next_run_at <= '{}' \
             ORDER BY tr.next_run_at ASC",
            now.format("%Y-%m-%d %H:%M:%S")
        ),
    )).await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("Trade route query error: {:?}", e);
            return;
        }
    };

    let interval_hours = config.get_config("trade_route_interval_hours", 24.0) as i64;
    let piracy_chance = config.get_config("trade_route_piracy_chance", 0.10);

    for row in rows {
        let route_id: String = match row.try_get("", "id") {
            Ok(v) => v,
            Err(_) => continue,
        };
        let owner_id: Uuid = match row.try_get::<Uuid>("", "owner_id") {
            Ok(v) => v,
            Err(_) => continue,
        };
        let route_name: String = row.try_get::<String>("", "name").unwrap_or_else(|_| "Route".to_string());
        let source_id: String = match row.try_get("", "source_planet_id") {
            Ok(v) => v,
            Err(_) => continue,
        };
        let target_id: String = match row.try_get("", "target_planet_id") {
            Ok(v) => v,
            Err(_) => continue,
        };
        let ship_count: i32 = row.try_get("", "ship_count").unwrap_or(50);
        let metal_ratio: f64 = row.try_get("", "metal_ratio").unwrap_or(1.0);
        let crystal_ratio: f64 = row.try_get("", "crystal_ratio").unwrap_or(1.0);
        let deuterium_ratio: f64 = row.try_get("", "deuterium_ratio").unwrap_or(0.0);

        let source_uuid = match Uuid::parse_str(&source_id) { Ok(v) => v, Err(_) => continue };
        let target_uuid = match Uuid::parse_str(&target_id) { Ok(v) => v, Err(_) => continue };
        let route_uuid = match Uuid::parse_str(&route_id) { Ok(v) => v, Err(_) => continue };

        execute_trade_route(
            db, config,
            route_uuid, owner_id, route_name, source_uuid, target_uuid,
            ship_count, metal_ratio, crystal_ratio, deuterium_ratio,
            interval_hours, piracy_chance, now,
        ).await;
    }
}

async fn execute_trade_route(
    db: &DatabaseConnection,
    config: &crate::ServerConfigCache,
    route_id: Uuid,
    owner_id: Uuid,
    route_name: String,
    source_id: Uuid,
    target_id: Uuid,
    ship_count: i32,
    metal_ratio: f64,
    crystal_ratio: f64,
    deuterium_ratio: f64,
    interval_hours: i64,
    piracy_chance: f64,
    now: chrono::NaiveDateTime,
) {
    use sea_orm::ConnectionTrait;

    // Load planets
    let source_planet = match Planet::find_by_id(source_id).one(db).await {
        Ok(Some(p)) => p,
        _ => {
            // Planet gone, deactivate route
            let _ = db.execute_unprepared(&format!(
                "UPDATE trade_route SET is_active = false WHERE id = '{}'", route_id
            )).await;
            return;
        }
    };
    let target_planet = match Planet::find_by_id(target_id).one(db).await {
        Ok(Some(p)) => p,
        _ => {
            let _ = db.execute_unprepared(&format!(
                "UPDATE trade_route SET is_active = false WHERE id = '{}'", route_id
            )).await;
            return;
        }
    };

    // Calculate cargo capacity for this run (configurable via admin)
    let cargo_per_ship = config.get_config("grand_cargo_capacity", 1_000_000.0);
    let total_capacity = ship_count as f64 * cargo_per_ship;

    // Determine how much to transfer per resource
    let metal_avail = source_planet.metal_amount * metal_ratio;
    let crystal_avail = source_planet.crystal_amount * crystal_ratio;
    let deuterium_avail = source_planet.deuterium_amount * deuterium_ratio;
    let total_requested = metal_avail + crystal_avail + deuterium_avail;

    if total_requested < 1.0 {
        // Nothing to transfer
        log_and_advance_route(db, route_id, now, interval_hours, 0.0, 0.0, 0.0, "no_resources", None,
            Some(&source_planet.name), Some(&target_planet.name)).await;
        return;
    }

    // Cap by cargo capacity (proportional distribution)
    let scale = if total_requested > total_capacity { total_capacity / total_requested } else { 1.0 };
    let mut metal_to_transfer = (metal_avail * scale).floor();
    let mut crystal_to_transfer = (crystal_avail * scale).floor();
    let mut deuterium_to_transfer = (deuterium_avail * scale).floor();

    // Check for piracy interception
    let piracy_loss_ratio = check_piracy_interception(db, source_id, target_id, piracy_chance).await;

    let status = if piracy_loss_ratio > 0.0 { "intercepted" } else { "success" };

    // Apply piracy losses
    let keep = 1.0 - piracy_loss_ratio;
    metal_to_transfer = (metal_to_transfer * keep).floor();
    crystal_to_transfer = (crystal_to_transfer * keep).floor();
    deuterium_to_transfer = (deuterium_to_transfer * keep).floor();

    // Deduct from source
    let new_source_metal = (source_planet.metal_amount - metal_avail * scale).max(0.0);
    let new_source_crystal = (source_planet.crystal_amount - crystal_avail * scale).max(0.0);
    let new_source_deuterium = (source_planet.deuterium_amount - deuterium_avail * scale).max(0.0);

    // Add to target (uncapped — overflow is fine, storage limit is soft in the game)
    let new_target_metal = target_planet.metal_amount + metal_to_transfer;
    let new_target_crystal = target_planet.crystal_amount + crystal_to_transfer;
    let new_target_deuterium = target_planet.deuterium_amount + deuterium_to_transfer;

    let _ = db.execute_unprepared(&format!(
        "UPDATE planet SET metal_amount = {}, crystal_amount = {}, deuterium_amount = {} WHERE id = '{}'",
        new_source_metal, new_source_crystal, new_source_deuterium, source_id
    )).await;

    let _ = db.execute_unprepared(&format!(
        "UPDATE planet SET metal_amount = {}, crystal_amount = {}, deuterium_amount = {} WHERE id = '{}'",
        new_target_metal, new_target_crystal, new_target_deuterium, target_id
    )).await;

    log_and_advance_route(
        db, route_id, now, interval_hours,
        metal_to_transfer, crystal_to_transfer, deuterium_to_transfer,
        status,
        if piracy_loss_ratio > 0.0 { Some(piracy_loss_ratio) } else { None },
        Some(&source_planet.name),
        Some(&target_planet.name),
    ).await;

    // Send logistique notification to route owner
    {
        use sea_orm::ConnectionTrait;
        let system_id = Uuid::nil();
        let piracy_note = if piracy_loss_ratio > 0.0 {
            format!("\n\n⚠️ Une flotte ennemie a intercepté **{:.0}%** du cargo en route !", piracy_loss_ratio * 100.0)
        } else {
            String::new()
        };
        let content = format!(
            "Votre route commerciale **{}** ({} → {}) a transféré :\n\
             • **{:.0}** métal\n\
             • **{:.0}** cristal\n\
             • **{:.0}** deutérium{}",
            route_name,
            source_planet.name, target_planet.name,
            metal_to_transfer, crystal_to_transfer, deuterium_to_transfer,
            piracy_note
        );
        let subject = format!("Logistique — {}", route_name);
        let _ = db.execute_unprepared(&format!(
            "INSERT INTO message (id, sender_id, recipient_id, subject, content, sent_at, is_read) \
             VALUES ('{}', '{}', '{}', '{}', '{}', '{}', false)",
            Uuid::new_v4(), system_id, owner_id,
            subject.replace('\'', "''"),
            content.replace('\'', "''"),
            now.format("%Y-%m-%d %H:%M:%S")
        )).await;
    }

    println!(
        "🚚 Trade route {}: {:.0} métal, {:.0} cristal, {:.0} deutérium transférés ({}) - perte piraterie: {:.0}%",
        route_id, metal_to_transfer, crystal_to_transfer, deuterium_to_transfer,
        status, piracy_loss_ratio * 100.0
    );
}

/// Check if an enemy fleet in "piracy" mission is lurking in the target solar system.
/// Returns the fraction of cargo lost (0.0 = no interception, 0.0-0.8 = partial, etc.).
async fn check_piracy_interception(
    db: &DatabaseConnection,
    _source_id: Uuid,
    target_id: Uuid,
    base_chance: f64,
) -> f64 {
    // Find the target planet's system
    let target_planet = match Planet::find_by_id(target_id).one(db).await {
        Ok(Some(p)) => p,
        _ => return 0.0,
    };

    // Check for any "piracy" fleet missions targeting any planet in this system
    let piracy_missions = FleetMission::find()
        .filter(fleet_mission::Column::MissionType.eq("piracy"))
        .all(db)
        .await
        .unwrap_or_default();

    // Filter for missions targeting a planet in the same galaxy/system
    let mut interceptors = 0;
    for mission in &piracy_missions {
        if let Ok(Some(target_planet_mission)) = Planet::find_by_id(mission.target_planet_id).one(db).await {
            if target_planet_mission.galaxy == target_planet.galaxy
                && target_planet_mission.system == target_planet.system
            {
                interceptors += 1;
            }
        }
    }

    if interceptors == 0 {
        return 0.0;
    }

    // Roll for interception
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let roll: f64 = rng.gen();

    if roll < base_chance * interceptors as f64 {
        // Intercepted — random loss between 30% and 80% per interceptor
        let loss: f64 = rng.gen_range(0.3_f64..0.8_f64);
        return loss.min(1.0);
    }

    0.0
}

async fn log_and_advance_route(
    db: &DatabaseConnection,
    route_id: Uuid,
    now: chrono::NaiveDateTime,
    interval_hours: i64,
    metal: f64,
    crystal: f64,
    deuterium: f64,
    status: &str,
    piracy_loss_ratio: Option<f64>,
    source_name: Option<&str>,
    target_name: Option<&str>,
) {
    use sea_orm::ConnectionTrait;
    let log_id = Uuid::new_v4();
    let next_run = now + Duration::hours(interval_hours);
    let piracy_str = piracy_loss_ratio.map(|v| v.to_string()).unwrap_or("NULL".to_string());
    let src = source_name.map(|s| format!("'{}'", s.replace('\'', "''"))).unwrap_or("NULL".to_string());
    let tgt = target_name.map(|s| format!("'{}'", s.replace('\'', "''"))).unwrap_or("NULL".to_string());

    let _ = db.execute_unprepared(&format!(
        "INSERT INTO trade_route_log (id, trade_route_id, executed_at, metal_transferred, crystal_transferred, \
         deuterium_transferred, status, piracy_loss_ratio, source_planet_name, target_planet_name) \
         VALUES ('{}', '{}', '{}', {}, {}, {}, '{}', {}, {}, {})",
        log_id, route_id,
        now.format("%Y-%m-%d %H:%M:%S"),
        metal, crystal, deuterium,
        status, piracy_str, src, tgt
    )).await;

    let _ = db.execute_unprepared(&format!(
        "UPDATE trade_route SET next_run_at = '{}' WHERE id = '{}'",
        next_run.format("%Y-%m-%d %H:%M:%S"), route_id
    )).await;
}
