use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use chrono::{Duration, Utc};
use sea_orm::*;
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;
use axum::http::StatusCode;

use crate::{AppState, ServerConfigCache, game_logic};
use crate::entities::{
    prelude::*,
    planet, planet_ship, planet_defense, planet_technology,
    ship_type, defense_type, technology, building_type, construction_queue,
};
use crate::tech_tree;

// ── Category helpers ─────────────────────────────────────────────────────────

const RESOURCE_BUILDING_KEYS: &[&str] = &[
    "metal_mine", "crystal_mine", "deuterium_mine", "solar_plant", "fusion_plant",
];

const ALL_CATEGORIES: &[&str] = &["research", "ships", "defenses", "resources", "facilities"];

fn is_resource_building(key: &str) -> bool {
    RESOURCE_BUILDING_KEYS.contains(&key)
}

pub fn building_category(key: &str) -> &'static str {
    if is_resource_building(key) { "resources" } else { "facilities" }
}

// ── Slot computation ─────────────────────────────────────────────────────────

pub async fn get_category_slots(
    db: &DatabaseConnection,
    config: &ServerConfigCache,
    planet_id: Uuid,
    category: &str,
) -> i32 {
    let base = config.get_config(&format!("queue_slots_{}_base", category), 1.0) as i32;
    let bonus = match category {
        "research" => {
            let lab = tech_tree::get_planet_building_level(db, planet_id, "research_lab")
                .await.unwrap_or(0);
            let per_slot = config.get_config("queue_research_lab_levels_per_slot", 10.0) as i32;
            if per_slot > 0 { lab / per_slot } else { 0 }
        }
        "ships" => {
            let shipyard = tech_tree::get_planet_building_level(db, planet_id, "shipyard")
                .await.unwrap_or(0);
            let per_slot = config.get_config("queue_shipyard_levels_per_slot", 5.0) as i32;
            if per_slot > 0 { shipyard / per_slot } else { 0 }
        }
        "facilities" => {
            let nanite = tech_tree::get_planet_building_level(db, planet_id, "nanite_factory")
                .await.unwrap_or(0);
            let per_slot = config.get_config("queue_nanite_factory_per_slot", 1.0) as i32;
            nanite * per_slot
        }
        _ => 0,
    };
    (base + bonus).max(1)
}

// ── Active build counting ────────────────────────────────────────────────────

pub async fn count_active_in_category(
    db: &DatabaseConnection,
    planet_id: Uuid,
    category: &str,
) -> Result<i64, DbErr> {
    match category {
        "research" => {
            // New relational system
            let c1 = PlanetTechnology::find()
                .filter(planet_technology::Column::PlanetId.eq(planet_id))
                .filter(planet_technology::Column::ResearchingToLevel.is_not_null())
                .count(db)
                .await? as i64;
            // Legacy construction_queue entries that are technologies
            let rows = db.query_all(Statement::from_sql_and_values(
                DbBackend::Postgres,
                r#"SELECT COUNT(*) AS cnt FROM construction_queue cq
                   JOIN technologies t ON t.tech_key = cq.building_type
                   WHERE cq.planet_id = $1"#,
                [planet_id.into()],
            )).await?;
            let c2 = rows.first()
                .and_then(|r| r.try_get::<i64>("", "cnt").ok())
                .unwrap_or(0);
            Ok(c1 + c2)
        }
        "ships" => {
            Ok(PlanetShip::find()
                .filter(planet_ship::Column::PlanetId.eq(planet_id))
                .filter(planet_ship::Column::BuildingCount.is_not_null())
                .filter(planet_ship::Column::BuildEndTime.is_not_null())
                .count(db)
                .await? as i64)
        }
        "defenses" => {
            Ok(PlanetDefense::find()
                .filter(planet_defense::Column::PlanetId.eq(planet_id))
                .filter(planet_defense::Column::BuildingCount.is_not_null())
                .filter(planet_defense::Column::BuildEndTime.is_not_null())
                .count(db)
                .await? as i64)
        }
        "resources" => {
            let keys_in = RESOURCE_BUILDING_KEYS.iter()
                .map(|k| format!("'{}'", k)).collect::<Vec<_>>().join(",");
            let sql = format!(
                "SELECT COUNT(*) AS cnt FROM construction_queue WHERE planet_id = $1 AND building_type IN ({})",
                keys_in
            );
            let rows = db.query_all(Statement::from_sql_and_values(
                DbBackend::Postgres, &sql, [planet_id.into()]
            )).await?;
            Ok(rows.first().and_then(|r| r.try_get::<i64>("", "cnt").ok()).unwrap_or(0))
        }
        "facilities" => {
            let keys_in = RESOURCE_BUILDING_KEYS.iter()
                .map(|k| format!("'{}'", k)).collect::<Vec<_>>().join(",");
            let sql = format!(
                r#"SELECT COUNT(*) AS cnt FROM construction_queue cq
                   WHERE cq.planet_id = $1
                     AND cq.building_type NOT IN ({})
                     AND NOT EXISTS (
                         SELECT 1 FROM technologies t WHERE t.tech_key = cq.building_type
                     )"#,
                keys_in
            );
            let rows = db.query_all(Statement::from_sql_and_values(
                DbBackend::Postgres, &sql, [planet_id.into()]
            )).await?;
            Ok(rows.first().and_then(|r| r.try_get::<i64>("", "cnt").ok()).unwrap_or(0))
        }
        _ => Ok(0),
    }
}

// ── Start a build immediately (slot known to be free) ────────────────────────

async fn start_item_immediately(
    db: &DatabaseConnection,
    config: &ServerConfigCache,
    planet_id: Uuid,
    category: &str,
    item_key: &str,
    quantity: i32,
    target_level: Option<i32>,
) -> Result<String, DbErr> {
    let now = Utc::now().naive_utc();
    let speed = config.building_speed;

    match category {
        "ships" => {
            let ship = ShipType::find()
                .filter(ship_type::Column::ShipKey.eq(item_key))
                .one(db).await?
                .ok_or_else(|| DbErr::Custom("Ship type not found".into()))?;

            let build_time = ((ship.build_time_seconds as f64 / speed) * quantity as f64) as i64;
            let end_time = now + Duration::seconds(build_time);

            let existing = PlanetShip::find()
                .filter(planet_ship::Column::PlanetId.eq(planet_id))
                .filter(planet_ship::Column::ShipTypeId.eq(ship.id))
                .one(db).await?;

            if let Some(ps) = existing {
                let mut active: planet_ship::ActiveModel = ps.into();
                active.building_count = Set(Some(quantity));
                active.build_end_time = Set(Some(end_time));
                active.update(db).await?;
            } else {
                let new_ps = planet_ship::ActiveModel {
                    planet_id: Set(planet_id),
                    ship_type_id: Set(ship.id),
                    count: Set(0),
                    building_count: Set(Some(quantity)),
                    build_end_time: Set(Some(end_time)),
                };
                new_ps.insert(db).await?;
            }
            Ok(end_time.format("%Y-%m-%dT%H:%M:%S").to_string())
        }
        "defenses" => {
            let defense = DefenseType::find()
                .filter(defense_type::Column::DefenseKey.eq(item_key))
                .one(db).await?
                .ok_or_else(|| DbErr::Custom("Defense type not found".into()))?;

            let build_time = ((defense.build_time_seconds as f64 / speed) * quantity as f64) as i64;
            let end_time = now + Duration::seconds(build_time);

            let existing = PlanetDefense::find()
                .filter(planet_defense::Column::PlanetId.eq(planet_id))
                .filter(planet_defense::Column::DefenseTypeId.eq(defense.id))
                .one(db).await?;

            if let Some(pd) = existing {
                let mut active: planet_defense::ActiveModel = pd.into();
                active.building_count = Set(Some(quantity));
                active.build_end_time = Set(Some(end_time));
                active.update(db).await?;
            } else {
                let new_pd = planet_defense::ActiveModel {
                    planet_id: Set(planet_id),
                    defense_type_id: Set(defense.id),
                    count: Set(0),
                    building_count: Set(Some(quantity)),
                    build_end_time: Set(Some(end_time)),
                    updated_at: NotSet,
                };
                new_pd.insert(db).await?;
            }
            Ok(end_time.format("%Y-%m-%dT%H:%M:%S").to_string())
        }
        "research" => {
            let tech = Technology::find()
                .filter(technology::Column::TechKey.eq(item_key))
                .one(db).await?
                .ok_or_else(|| DbErr::Custom("Technology not found".into()))?;

            let current_level = tech_tree::get_planet_tech_level(db, planet_id, item_key)
                .await.unwrap_or(0);
            let next_level = target_level.unwrap_or(current_level + 1);
            // Formule polynomiale (level^1.5) avec diviseur research_speed
            let lab_level = tech_tree::get_planet_building_level(db, planet_id, "research_lab")
                .await.unwrap_or(0);
            let research_time = game_logic::get_research_time(item_key, next_level, lab_level, config);
            let end_time = now + Duration::seconds(research_time);

            let existing = PlanetTechnology::find()
                .filter(planet_technology::Column::PlanetId.eq(planet_id))
                .filter(planet_technology::Column::TechId.eq(tech.id))
                .one(db).await?;

            if let Some(pt) = existing {
                let mut active: planet_technology::ActiveModel = pt.into();
                active.researching_to_level = Set(Some(next_level));
                active.research_end_time = Set(Some(end_time));
                active.update(db).await?;
            } else {
                let new_pt = planet_technology::ActiveModel {
                    planet_id: Set(planet_id),
                    tech_id: Set(tech.id),
                    current_level: Set(0),
                    researching_to_level: Set(Some(next_level)),
                    research_end_time: Set(Some(end_time)),
                };
                new_pt.insert(db).await?;
            }
            Ok(end_time.format("%Y-%m-%dT%H:%M:%S").to_string())
        }
        "resources" | "facilities" => {
            let building = BuildingType::find()
                .filter(building_type::Column::BuildingKey.eq(item_key))
                .one(db).await?
                .ok_or_else(|| DbErr::Custom("Building type not found".into()))?;

            // Count queued items for same building to determine effective current level
            let active_count_rows = db.query_all(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT COUNT(*) AS cnt FROM construction_queue WHERE planet_id = $1 AND building_type = $2",
                [planet_id.into(), item_key.into()],
            )).await?;
            let active_in_cq = active_count_rows.first()
                .and_then(|r| r.try_get::<i64>("", "cnt").ok())
                .unwrap_or(0) as i32;

            let current_level = tech_tree::get_planet_building_level(db, planet_id, item_key)
                .await.unwrap_or(0);
            let effective_level = current_level + active_in_cq;
            let new_level = target_level.unwrap_or(effective_level + 1);

            // Calculate cost at effective level for build time
            let cost_m = tech_tree::calculate_building_cost(building.base_cost_metal, building.cost_multiplier, effective_level);
            let cost_c = tech_tree::calculate_building_cost(building.base_cost_crystal, building.cost_multiplier, effective_level);

            // Determine facility level for build time formula
            let facility_key = if category == "resources" { "shipyard" } else { "shipyard" };
            let facility_level = tech_tree::get_planet_building_level(db, planet_id, facility_key)
                .await.unwrap_or(0);
            let nanite_level = tech_tree::get_planet_building_level(db, planet_id, "nanite_factory")
                .await.unwrap_or(0);
            let build_time = crate::game_logic::get_build_time_with_nanite(new_level, facility_level, nanite_level, crate::game_logic::building_category_factor(item_key), config);
            let end_time = now + Duration::seconds(build_time);

            let item = construction_queue::ActiveModel {
                id: Set(Uuid::new_v4()),
                planet_id: Set(planet_id),
                building_type: Set(item_key.to_string()),
                level: Set(new_level),
                end_time: Set(end_time),
            };
            item.insert(db).await?;
            Ok(end_time.format("%Y-%m-%dT%H:%M:%S").to_string())
        }
        _ => Err(DbErr::Custom("Unknown category".into())),
    }
}

// ── Per-planet build lock ─────────────────────────────────────────────────────

/// Acquires a per-planet async mutex to serialize concurrent build slot checks.
/// Returns a guard that releases the lock when dropped.
async fn acquire_planet_build_lock(
    state: &AppState,
    planet_id: Uuid,
) -> tokio::sync::OwnedMutexGuard<()> {
    let lock = state.build_locks
        .entry(planet_id)
        .or_insert_with(|| std::sync::Arc::new(tokio::sync::Mutex::new(())))
        .clone();
    lock.lock_owned().await
}

/// Public alias for use in main.rs handlers.
pub async fn acquire_planet_build_lock_pub(
    state: &AppState,
    planet_id: Uuid,
) -> tokio::sync::OwnedMutexGuard<()> {
    acquire_planet_build_lock(state, planet_id).await
}

// ── HTTP Handlers ─────────────────────────────────────────────────────────────

/// GET /planets/:id/build-queue — queue items and slot status per category
pub async fn get_queue_status_handler(
    Path(planet_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let config = state.config.read().unwrap().clone();

    let rows = match state.db.query_all(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"SELECT id, planet_id, category, item_key, quantity, target_level, queue_position, created_at
           FROM build_queue_item
           WHERE planet_id = $1
           ORDER BY category, queue_position ASC"#,
        [planet_id.into()],
    )).await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("Error fetching build queue: {:?}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "DB error"}))).into_response();
        }
    };

    let mut pending = Vec::new();
    for row in &rows {
        let id: Uuid = row.try_get("", "id").unwrap_or_default();
        let category: String = row.try_get("", "category").unwrap_or_default();
        let item_key: String = row.try_get("", "item_key").unwrap_or_default();
        let quantity: i32 = row.try_get("", "quantity").unwrap_or(1);
        let target_level: Option<i32> = row.try_get("", "target_level").ok().flatten();
        let queue_position: i32 = row.try_get("", "queue_position").unwrap_or(0);
        let created_at: chrono::NaiveDateTime = row.try_get("", "created_at").unwrap_or_default();

        pending.push(json!({
            "id": id,
            "category": category,
            "item_key": item_key,
            "quantity": quantity,
            "target_level": target_level,
            "queue_position": queue_position,
            "created_at": created_at.format("%Y-%m-%dT%H:%M:%S").to_string(),
        }));
    }

    let mut categories_status = serde_json::Map::new();
    for cat in ALL_CATEGORIES {
        let slots_total = get_category_slots(&state.db, &config, planet_id, cat).await;
        let slots_used = count_active_in_category(&state.db, planet_id, cat).await.unwrap_or(0);
        let pending_count = rows.iter().filter(|r| {
            r.try_get::<String>("", "category").unwrap_or_default().as_str() == *cat
        }).count() as i64;

        categories_status.insert((*cat).to_string(), json!({
            "slots_total": slots_total,
            "slots_used": slots_used,
            "slots_free": (slots_total as i64 - slots_used).max(0),
            "pending_count": pending_count,
        }));
    }

    Json(json!({
        "pending_items": pending,
        "categories": categories_status,
    })).into_response()
}

#[derive(Deserialize)]
pub struct AddToQueueBody {
    pub category: String,
    pub item_key: String,
    pub quantity: Option<i32>,
}

/// POST /planets/:id/build-queue — add to queue (starts immediately if slot free)
pub async fn add_to_queue_handler(
    Path(planet_id): Path<Uuid>,
    State(state): State<AppState>,
    Json(body): Json<AddToQueueBody>,
) -> impl IntoResponse {
    let config = state.config.read().unwrap().clone();
    let quantity = body.quantity.unwrap_or(1).max(1);

    if !ALL_CATEGORIES.contains(&body.category.as_str()) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid category"}))).into_response();
    }

    let planet = match Planet::find_by_id(planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planet not found"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "DB error"}))).into_response(),
    };

    // Compute cost + validate requirements
    let (cost_metal, cost_crystal, cost_deuterium, target_level) =
        match compute_cost_and_validate(&state.db, planet_id, &body.category, &body.item_key, quantity).await {
            Ok(v) => v,
            Err(e) => return e,
        };

    // Check resources
    if planet.metal_amount < cost_metal as f64
        || planet.crystal_amount < cost_crystal as f64
        || planet.deuterium_amount < cost_deuterium as f64
    {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Insufficient resources"}))).into_response();
    }

    // Deduct resources
    let planet_owner_id = planet.owner_id;
    let planet_name = planet.name.clone();
    let mut active_planet: planet::ActiveModel = planet.into();
    active_planet.metal_amount = Set(active_planet.metal_amount.unwrap() - cost_metal as f64);
    active_planet.crystal_amount = Set(active_planet.crystal_amount.unwrap() - cost_crystal as f64);
    active_planet.deuterium_amount = Set(active_planet.deuterium_amount.unwrap() - cost_deuterium as f64);
    if let Err(_) = active_planet.update(&state.db).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to deduct resources"}))).into_response();
    }

    // Log economy event
    {
        let category_label = match body.category.as_str() {
            "research" => "Technologie",
            "ships" => "Vaisseau",
            "defenses" => "Défense",
            "resources" => "Bâtiment",
            "facilities" => "Installation",
            _ => "Construction",
        };
        let desc = if quantity > 1 {
            format!("{} × {} {}", quantity, category_label, body.item_key)
        } else {
            format!("{} {}", category_label, body.item_key)
        };
        let db_clone = state.db.clone();
        let item_key = body.item_key.clone();
        tokio::spawn(async move {
            crate::economy_log::log_event(
                &db_clone,
                planet_owner_id,
                "construction",
                "build",
                &desc,
                -(cost_metal as f64),
                -(cost_crystal as f64),
                -(cost_deuterium as f64),
                0.0,
                Some(&planet_name),
                None,
                Some(&item_key),
            ).await;
        });
    }

    // Acquire per-planet lock to serialize concurrent slot checks (prevents race conditions)
    let _build_guard = acquire_planet_build_lock(&state, planet_id).await;

    // Check if a slot is immediately free
    let slots_total = get_category_slots(&state.db, &config, planet_id, &body.category).await;
    let slots_used = count_active_in_category(&state.db, planet_id, &body.category).await.unwrap_or(0);

    if slots_used < slots_total as i64 {
        match start_item_immediately(
            &state.db, &config, planet_id,
            &body.category, &body.item_key, quantity, target_level,
        ).await {
            Ok(end_time) => {
                return Json(json!({
                    "success": true,
                    "queued": false,
                    "end_time": end_time,
                    "message": "Build started immediately",
                })).into_response();
            }
            Err(e) => {
                eprintln!("Failed to start build immediately: {:?}", e);
                // Fall through to queue
            }
        }
    }

    // Determine next position in queue for this planet+category
    let max_pos_rows = state.db.query_all(Statement::from_sql_and_values(
        DbBackend::Postgres,
        "SELECT COALESCE(MAX(queue_position), -1) AS max_pos FROM build_queue_item WHERE planet_id = $1 AND category = $2",
        [planet_id.into(), body.category.as_str().into()],
    )).await.unwrap_or_default();
    let max_pos = max_pos_rows.first()
        .and_then(|r| r.try_get::<i64>("", "max_pos").ok())
        .unwrap_or(-1);

    let item_id = Uuid::new_v4();
    let now = Utc::now().naive_utc();

    let target_sql = match target_level {
        Some(l) => l.to_string(),
        None => "NULL".to_string(),
    };

    if let Err(e) = state.db.execute_unprepared(&format!(
        "INSERT INTO build_queue_item (id, planet_id, category, item_key, quantity, target_level, queue_position, created_at) \
         VALUES ('{}', '{}', '{}', '{}', {}, {}, {}, '{}')",
        item_id, planet_id, body.category, body.item_key,
        quantity, target_sql, max_pos + 1,
        now.format("%Y-%m-%d %H:%M:%S")
    )).await {
        eprintln!("Failed to insert queue item: {:?}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to queue item"}))).into_response();
    }

    Json(json!({
        "success": true,
        "queued": true,
        "queue_id": item_id,
        "queue_position": max_pos + 1,
        "message": "Added to build queue",
    })).into_response()
}

/// DELETE /build-queue/:item_id?planet_id=... — remove pending item and refund resources
pub async fn remove_from_queue_handler(
    Path(item_id): Path<Uuid>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let planet_id = match params.get("planet_id").and_then(|s| Uuid::parse_str(s).ok()) {
        Some(id) => id,
        None => return (StatusCode::BAD_REQUEST, Json(json!({"error": "planet_id required"}))).into_response(),
    };

    // Fetch the queue item
    let rows = match state.db.query_all(Statement::from_sql_and_values(
        DbBackend::Postgres,
        "SELECT id, planet_id, category, item_key, quantity, target_level FROM build_queue_item WHERE id = $1 AND planet_id = $2",
        [item_id.into(), planet_id.into()],
    )).await {
        Ok(r) => r,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "DB error"}))).into_response(),
    };

    let row = match rows.first() {
        Some(r) => r,
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Queue item not found"}))).into_response(),
    };

    let category: String = row.try_get("", "category").unwrap_or_default();
    let item_key: String = row.try_get("", "item_key").unwrap_or_default();
    let quantity: i32 = row.try_get("", "quantity").unwrap_or(1);
    let target_level: Option<i32> = row.try_get("", "target_level").ok().flatten();

    // Calculate refund amount (same formula as when queued)
    let (cost_metal, cost_crystal, cost_deuterium, _) =
        match compute_cost_for_refund(&state.db, planet_id, &category, &item_key, quantity, target_level).await {
            Ok(v) => v,
            Err(_) => (0, 0, 0, None),
        };

    // Delete queue item
    if let Err(_) = state.db.execute_unprepared(&format!(
        "DELETE FROM build_queue_item WHERE id = '{}'", item_id
    )).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to remove item"}))).into_response();
    }

    // Refund resources to planet
    if cost_metal > 0 || cost_crystal > 0 || cost_deuterium > 0 {
        let _ = state.db.execute_unprepared(&format!(
            "UPDATE planet SET metal_amount = metal_amount + {}, crystal_amount = crystal_amount + {}, deuterium_amount = deuterium_amount + {} WHERE id = '{}'",
            cost_metal, cost_crystal, cost_deuterium, planet_id
        )).await;
    }

    Json(json!({ "success": true, "refunded": { "metal": cost_metal, "crystal": cost_crystal, "deuterium": cost_deuterium } })).into_response()
}

#[derive(Deserialize)]
pub struct ReorderBody {
    pub category: String,
    pub ordered_ids: Vec<Uuid>,
}

/// PUT /planets/:id/build-queue/reorder — drag/drop reorder within a category
pub async fn reorder_queue_handler(
    Path(planet_id): Path<Uuid>,
    State(state): State<AppState>,
    Json(body): Json<ReorderBody>,
) -> impl IntoResponse {
    for (pos, item_id) in body.ordered_ids.iter().enumerate() {
        let _ = state.db.execute_unprepared(&format!(
            "UPDATE build_queue_item SET queue_position = {} WHERE id = '{}' AND planet_id = '{}' AND category = '{}'",
            pos, item_id, planet_id, body.category
        )).await;
    }
    Json(json!({ "success": true })).into_response()
}

// ── Tick integration ─────────────────────────────────────────────────────────

/// Called from process_tick after build completions — starts pending queue items when slots free.
pub async fn process_build_queue(db: &DatabaseConnection, config: &ServerConfigCache) -> usize {
    // Find distinct planet_ids with pending queue items
    let planet_rows = match db.query_all(Statement::from_string(
        DbBackend::Postgres,
        "SELECT DISTINCT planet_id FROM build_queue_item".to_string(),
    )).await {
        Ok(r) => r,
        Err(e) => { eprintln!("build_queue tick error: {:?}", e); return 0; }
    };

    let mut started = 0usize;

    for planet_row in &planet_rows {
        let planet_id: Uuid = match planet_row.try_get("", "planet_id") {
            Ok(id) => id,
            Err(_) => continue,
        };

        for category in ALL_CATEGORIES {
            let slots_total = get_category_slots(db, config, planet_id, category).await;
            let slots_used = count_active_in_category(db, planet_id, category).await.unwrap_or(slots_total as i64);
            let free_slots = (slots_total as i64 - slots_used).max(0);

            if free_slots == 0 { continue; }

            // Fetch next pending items ordered by queue_position
            let items = match db.query_all(Statement::from_sql_and_values(
                DbBackend::Postgres,
                r#"SELECT id, item_key, quantity, target_level FROM build_queue_item
                   WHERE planet_id = $1 AND category = $2
                   ORDER BY queue_position ASC
                   LIMIT $3"#,
                [planet_id.into(), (*category).into(), free_slots.into()],
            )).await {
                Ok(r) => r,
                Err(_) => continue,
            };

            // Track which item_keys have already been started in this batch
            // to prevent starting multiple levels of the same building simultaneously.
            let mut started_keys_this_batch: std::collections::HashSet<String> = std::collections::HashSet::new();

            for item_row in &items {
                let item_id: Uuid = match item_row.try_get("", "id") {
                    Ok(id) => id,
                    Err(_) => continue,
                };
                let item_key: String = item_row.try_get("", "item_key").unwrap_or_default();
                let quantity: i32 = item_row.try_get("", "quantity").unwrap_or(1);
                let target_level: Option<i32> = item_row.try_get("", "target_level").ok().flatten();

                // For buildings (resources/facilities): enforce sequential upgrades.
                // Don't start niv. N+1 if niv. N is already building (same item_key).
                if *category == "resources" || *category == "facilities" {
                    // Skip if already started this key in the current batch
                    if started_keys_this_batch.contains(&item_key) {
                        continue;
                    }
                    // Skip if already an active build for this key in construction_queue
                    let already_active = db.query_one(Statement::from_sql_and_values(
                        DbBackend::Postgres,
                        "SELECT 1 FROM construction_queue WHERE planet_id = $1 AND building_type = $2 LIMIT 1",
                        [planet_id.into(), item_key.clone().into()],
                    )).await.unwrap_or(None).is_some();
                    if already_active {
                        continue;
                    }
                }

                match start_item_immediately(db, config, planet_id, category, &item_key, quantity, target_level).await {
                    Ok(_) => {
                        let _ = db.execute_unprepared(&format!(
                            "DELETE FROM build_queue_item WHERE id = '{}'", item_id
                        )).await;
                        started_keys_this_batch.insert(item_key.clone());
                        started += 1;
                        println!("✅ Build queue: started {} ({}) for planet {}", item_key, category, planet_id);
                    }
                    Err(e) => {
                        eprintln!("❌ Build queue: failed to start {} for planet {}: {:?}", item_key, planet_id, e);
                    }
                }
            }
        }
    }

    started
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/// Compute cost for adding an item to the queue (also validates requirements).
/// Returns (metal, crystal, deuterium, target_level) or an IntoResponse error.
async fn compute_cost_and_validate(
    db: &DatabaseConnection,
    planet_id: Uuid,
    category: &str,
    item_key: &str,
    quantity: i32,
) -> Result<(i32, i32, i32, Option<i32>), axum::response::Response> {
    match category {
        "ships" => {
            let ship = ShipType::find()
                .filter(ship_type::Column::ShipKey.eq(item_key))
                .one(db).await
                .ok().flatten()
                .ok_or_else(|| (StatusCode::NOT_FOUND, Json(json!({"error": "Ship type not found"}))).into_response())?;

            let reqs = tech_tree::get_ship_requirements(db, ship.id, planet_id)
                .await.unwrap_or_default();
            if reqs.iter().any(|r| !r.met) {
                return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Requirements not met"}))).into_response());
            }
            Ok((ship.cost_metal * quantity, ship.cost_crystal * quantity, ship.cost_deuterium * quantity, None))
        }
        "defenses" => {
            let defense = DefenseType::find()
                .filter(defense_type::Column::DefenseKey.eq(item_key))
                .one(db).await
                .ok().flatten()
                .ok_or_else(|| (StatusCode::NOT_FOUND, Json(json!({"error": "Defense type not found"}))).into_response())?;

            let reqs = tech_tree::get_defense_requirements(db, defense.id, planet_id)
                .await.unwrap_or_default();
            if reqs.iter().any(|r| !r.met) {
                return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Requirements not met"}))).into_response());
            }
            Ok((defense.base_cost_metal * quantity, defense.base_cost_crystal * quantity, defense.base_cost_deuterium * quantity, None))
        }
        "research" => {
            let tech = Technology::find()
                .filter(technology::Column::TechKey.eq(item_key))
                .one(db).await
                .ok().flatten()
                .ok_or_else(|| (StatusCode::NOT_FOUND, Json(json!({"error": "Technology not found"}))).into_response())?;

            let reqs = tech_tree::get_tech_requirements(db, tech.id, planet_id)
                .await.unwrap_or_default();
            if reqs.iter().any(|r| !r.met) {
                return Err((StatusCode::FORBIDDEN, Json(json!({"error": "Requirements not met"}))).into_response());
            }

            // Only allow 1 pending per tech (prevents exploit)
            let already_pending = db.query_all(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT COUNT(*) AS cnt FROM build_queue_item WHERE planet_id = $1 AND item_key = $2 AND category = 'research'",
                [planet_id.into(), item_key.into()],
            )).await.ok().and_then(|r| r.first().and_then(|row| row.try_get::<i64>("", "cnt").ok())).unwrap_or(0);

            let already_active = PlanetTechnology::find()
                .filter(planet_technology::Column::PlanetId.eq(planet_id))
                .filter(planet_technology::Column::TechId.eq(tech.id))
                .one(db).await.ok().flatten()
                .and_then(|pt| pt.researching_to_level).is_some();

            if already_active || already_pending >= 1 {
                return Err((StatusCode::CONFLICT, Json(json!({"error": "Already researching or queued"}))).into_response());
            }

            let current_level = tech_tree::get_planet_tech_level(db, planet_id, item_key).await.unwrap_or(0);
            let target = current_level + 1;
            let cm = tech_tree::calculate_tech_cost(tech.base_cost_metal, tech.cost_multiplier, current_level);
            let cc = tech_tree::calculate_tech_cost(tech.base_cost_crystal, tech.cost_multiplier, current_level);
            let cd = tech_tree::calculate_tech_cost(tech.base_cost_deuterium, tech.cost_multiplier, current_level);
            Ok((cm, cc, cd, Some(target)))
        }
        "resources" | "facilities" => {
            let building = BuildingType::find()
                .filter(building_type::Column::BuildingKey.eq(item_key))
                .one(db).await
                .ok().flatten()
                .ok_or_else(|| (StatusCode::NOT_FOUND, Json(json!({"error": "Building type not found"}))).into_response())?;

            // Count items already queued/active for this building to compute target level
            let active_cq = db.query_all(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT COUNT(*) AS cnt FROM construction_queue WHERE planet_id = $1 AND building_type = $2",
                [planet_id.into(), item_key.into()],
            )).await.ok().and_then(|r| r.first().and_then(|row| row.try_get::<i64>("", "cnt").ok())).unwrap_or(0);

            let pending_q = db.query_all(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "SELECT COUNT(*) AS cnt FROM build_queue_item WHERE planet_id = $1 AND item_key = $2",
                [planet_id.into(), item_key.into()],
            )).await.ok().and_then(|r| r.first().and_then(|row| row.try_get::<i64>("", "cnt").ok())).unwrap_or(0);

            let current_level = tech_tree::get_planet_building_level(db, planet_id, item_key).await.unwrap_or(0);
            let effective_level = current_level + active_cq as i32 + pending_q as i32;
            let target = effective_level + 1;

            let cm = tech_tree::calculate_building_cost(building.base_cost_metal, building.cost_multiplier, effective_level);
            let cc = tech_tree::calculate_building_cost(building.base_cost_crystal, building.cost_multiplier, effective_level);
            let cd = tech_tree::calculate_building_cost(building.base_cost_deuterium, building.cost_multiplier, effective_level);
            Ok((cm, cc, cd, Some(target)))
        }
        _ => Err((StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid category"}))).into_response()),
    }
}

/// Compute refund amounts for a queued item that is being cancelled.
/// Uses stored target_level to reconstruct the cost that was paid at enqueue time.
async fn compute_cost_for_refund(
    db: &DatabaseConnection,
    planet_id: Uuid,
    category: &str,
    item_key: &str,
    quantity: i32,
    target_level: Option<i32>,
) -> Result<(i32, i32, i32, Option<i32>), DbErr> {
    match category {
        "ships" => {
            let ship = ShipType::find()
                .filter(ship_type::Column::ShipKey.eq(item_key))
                .one(db).await?.ok_or_else(|| DbErr::Custom("not found".into()))?;
            Ok((ship.cost_metal * quantity, ship.cost_crystal * quantity, ship.cost_deuterium * quantity, None))
        }
        "defenses" => {
            let defense = DefenseType::find()
                .filter(defense_type::Column::DefenseKey.eq(item_key))
                .one(db).await?.ok_or_else(|| DbErr::Custom("not found".into()))?;
            Ok((defense.base_cost_metal * quantity, defense.base_cost_crystal * quantity, defense.base_cost_deuterium * quantity, None))
        }
        "research" => {
            let tech = Technology::find()
                .filter(technology::Column::TechKey.eq(item_key))
                .one(db).await?.ok_or_else(|| DbErr::Custom("not found".into()))?;
            let level_for_cost = target_level.unwrap_or(1) - 1;
            let cm = tech_tree::calculate_tech_cost(tech.base_cost_metal, tech.cost_multiplier, level_for_cost);
            let cc = tech_tree::calculate_tech_cost(tech.base_cost_crystal, tech.cost_multiplier, level_for_cost);
            let cd = tech_tree::calculate_tech_cost(tech.base_cost_deuterium, tech.cost_multiplier, level_for_cost);
            Ok((cm, cc, cd, target_level))
        }
        "resources" | "facilities" => {
            let building = BuildingType::find()
                .filter(building_type::Column::BuildingKey.eq(item_key))
                .one(db).await?.ok_or_else(|| DbErr::Custom("not found".into()))?;
            let level_for_cost = target_level.unwrap_or(1) - 1;
            let cm = tech_tree::calculate_building_cost(building.base_cost_metal, building.cost_multiplier, level_for_cost);
            let cc = tech_tree::calculate_building_cost(building.base_cost_crystal, building.cost_multiplier, level_for_cost);
            let cd = tech_tree::calculate_building_cost(building.base_cost_deuterium, building.cost_multiplier, level_for_cost);
            Ok((cm, cc, cd, target_level))
        }
        _ => Ok((0, 0, 0, None)),
    }
}
