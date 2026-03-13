/// Cancel handlers for ship and defense builds
///
/// These handlers allow users to cancel ongoing ship/defense constructions
/// and receive a partial refund based on remaining build time.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set, TransactionTrait};
use serde_json::json;
use uuid::Uuid;

use crate::entities::{prelude::*, planet, planet_defense, planet_ship, planet_technology, technology};
use crate::{AppState, game_logic};
use crate::tech_tree;

/// Cancel an ongoing ship build
///
/// DELETE /planets/:id/cancel-ship-build/:ship_key
///
/// Cancels the current ship build for the given ship key and refunds resources
/// based on remaining build time (up to 95% refund).
/// The cancel and refund are wrapped in a DB transaction to prevent double-refund exploits.
#[axum::debug_handler]
pub async fn cancel_ship_build_handler(
    Path((planet_id, ship_key)): Path<(Uuid, String)>,
    State(state): State<AppState>,
) -> Response {
    use crate::entities::ship_type;

    // Get planet (read-only pre-check)
    // Verify planet exists before proceeding
    match Planet::find_by_id(planet_id).one(&state.db).await {
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planet not found"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Database error"}))).into_response(),
        Ok(Some(_)) => {}
    }

    // Get ship type
    let ship = match ShipType::find()
        .filter(ship_type::Column::ShipKey.eq(&ship_key))
        .one(&state.db)
        .await
    {
        Ok(Some(s)) => s,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Ship type not found"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Database error"}))).into_response(),
    };

    // Find the active build
    let build = match PlanetShip::find()
        .filter(planet_ship::Column::PlanetId.eq(planet_id))
        .filter(planet_ship::Column::ShipTypeId.eq(ship.id))
        .filter(planet_ship::Column::BuildingCount.is_not_null())
        .filter(planet_ship::Column::BuildEndTime.is_not_null())
        .one(&state.db)
        .await
    {
        Ok(Some(b)) => b,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "No active build found"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Database error"}))).into_response(),
    };

    // Calculate refund (outside transaction — read-only computation)
    let building_count = build.building_count.unwrap_or(0);
    if building_count <= 0 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "No units being built"}))).into_response();
    }

    let now = Utc::now().naive_utc();
    let end_time = match build.build_end_time {
        Some(t) => t,
        None => return (StatusCode::BAD_REQUEST, Json(json!({"error": "No build in progress"}))).into_response(),
    };

    let total_cost_metal = ship.cost_metal * building_count;
    let total_cost_crystal = ship.cost_crystal * building_count;
    let total_cost_deuterium = ship.cost_deuterium * building_count;

    let config = state.config.read().unwrap_or_else(|e| e.into_inner()).clone();
    let build_time_per_ship = ship.build_time_seconds as f64 / (config.building_speed);
    let total_duration = (build_time_per_ship * building_count as f64) as i64;
    let remaining_seconds = (end_time - now).num_seconds().max(0);
    let refund_ratio = (remaining_seconds as f64 / total_duration as f64).clamp(0.0, 0.95);

    let refund_metal = (total_cost_metal as f64 * refund_ratio) as i32;
    let refund_crystal = (total_cost_crystal as f64 * refund_ratio) as i32;
    let refund_deuterium = (total_cost_deuterium as f64 * refund_ratio) as i32;

    let ship_type_id = ship.id;

    // TRANSACTION: cancel first (idempotency guard), then credit resources
    // Re-reads build inside the transaction to prevent concurrent double-cancel.
    let txn_result = state.db.transaction::<_, (), sea_orm::DbErr>(|txn| {
        Box::pin(async move {
            // Re-read the build inside the transaction to ensure it's still active
            let build_current = PlanetShip::find()
                .filter(planet_ship::Column::PlanetId.eq(planet_id))
                .filter(planet_ship::Column::ShipTypeId.eq(ship_type_id))
                .filter(planet_ship::Column::BuildingCount.is_not_null())
                .one(txn)
                .await?;

            let build_current = match build_current {
                Some(b) if b.building_count.is_some() => b,
                _ => return Err(sea_orm::DbErr::Custom("Build already cancelled or not found".into())),
            };

            // 1. Cancel the build (idempotency key — must succeed first)
            let mut active_build: planet_ship::ActiveModel = build_current.into();
            active_build.building_count = Set(None);
            active_build.build_end_time = Set(None);
            active_build.update(txn).await?;

            // 2. Refund resources to planet (only if cancel succeeded)
            let planet_current = Planet::find_by_id(planet_id).one(txn).await?
                .ok_or_else(|| sea_orm::DbErr::Custom("Planet not found in transaction".into()))?;
            let cur_m = planet_current.metal_amount;
            let cur_c = planet_current.crystal_amount;
            let cur_d = planet_current.deuterium_amount;
            let mut active_planet: planet::ActiveModel = planet_current.into();
            active_planet.metal_amount = Set(cur_m + refund_metal as f64);
            active_planet.crystal_amount = Set(cur_c + refund_crystal as f64);
            active_planet.deuterium_amount = Set(cur_d + refund_deuterium as f64);
            active_planet.update(txn).await?;

            Ok(())
        })
    }).await;

    match txn_result {
        Err(sea_orm::TransactionError::Transaction(e)) if e.to_string().contains("already cancelled") => {
            return (StatusCode::CONFLICT, Json(json!({"error": "Build already cancelled"}))).into_response();
        }
        Err(e) => {
            eprintln!("[cancel_ship_build] transaction failed: {:?}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Transaction failed"}))).into_response();
        }
        Ok(_) => {}
    }

    Json(json!({
        "success": true,
        "refund_metal": refund_metal,
        "refund_crystal": refund_crystal,
        "refund_deuterium": refund_deuterium,
        "refund_ratio": refund_ratio
    })).into_response()
}

/// Cancel an ongoing defense build
///
/// DELETE /planets/:id/cancel-defense-build/:defense_key
///
/// Cancels the current defense build for the given defense key and refunds resources
/// based on remaining build time (up to 95% refund).
/// Atomic transaction: cancel first, then refund.
#[axum::debug_handler]
pub async fn cancel_defense_build_handler(
    Path((planet_id, defense_key)): Path<(Uuid, String)>,
    State(state): State<AppState>,
) -> Response {
    use crate::entities::defense_type;

    // Get planet (read-only pre-check)
    match Planet::find_by_id(planet_id).one(&state.db).await {
        Ok(Some(_)) => {},
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planet not found"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Database error"}))).into_response(),
    };

    // Get defense type
    let defense = match DefenseType::find()
        .filter(defense_type::Column::DefenseKey.eq(&defense_key))
        .one(&state.db)
        .await
    {
        Ok(Some(d)) => d,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Defense type not found"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Database error"}))).into_response(),
    };

    // Find the active build
    let build = match PlanetDefense::find()
        .filter(planet_defense::Column::PlanetId.eq(planet_id))
        .filter(planet_defense::Column::DefenseTypeId.eq(defense.id))
        .filter(planet_defense::Column::BuildingCount.is_not_null())
        .filter(planet_defense::Column::BuildEndTime.is_not_null())
        .one(&state.db)
        .await
    {
        Ok(Some(b)) => b,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "No active build found"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Database error"}))).into_response(),
    };

    let building_count = build.building_count.unwrap_or(0);
    if building_count <= 0 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "No units being built"}))).into_response();
    }

    let now = Utc::now().naive_utc();
    let end_time = match build.build_end_time {
        Some(t) => t,
        None => return (StatusCode::BAD_REQUEST, Json(json!({"error": "No build in progress"}))).into_response(),
    };

    let total_cost_metal = defense.base_cost_metal * building_count;
    let total_cost_crystal = defense.base_cost_crystal * building_count;
    let total_cost_deuterium = defense.base_cost_deuterium * building_count;

    let config = state.config.read().unwrap_or_else(|e| e.into_inner()).clone();
    let build_time_per_defense = defense.build_time_seconds as f64 / (config.building_speed);
    let total_duration = (build_time_per_defense * building_count as f64) as i64;
    let remaining_seconds = (end_time - now).num_seconds().max(0);
    let refund_ratio = (remaining_seconds as f64 / total_duration as f64).clamp(0.0, 0.95);

    let refund_metal = (total_cost_metal as f64 * refund_ratio) as i32;
    let refund_crystal = (total_cost_crystal as f64 * refund_ratio) as i32;
    let refund_deuterium = (total_cost_deuterium as f64 * refund_ratio) as i32;

    let defense_type_id = defense.id;

    // TRANSACTION: cancel first, then refund
    let txn_result = state.db.transaction::<_, (), sea_orm::DbErr>(|txn| {
        Box::pin(async move {
            let build_current = PlanetDefense::find()
                .filter(planet_defense::Column::PlanetId.eq(planet_id))
                .filter(planet_defense::Column::DefenseTypeId.eq(defense_type_id))
                .filter(planet_defense::Column::BuildingCount.is_not_null())
                .one(txn)
                .await?;

            let build_current = match build_current {
                Some(b) if b.building_count.is_some() => b,
                _ => return Err(sea_orm::DbErr::Custom("Build already cancelled or not found".into())),
            };

            // 1. Cancel first
            let mut active_build: planet_defense::ActiveModel = build_current.into();
            active_build.building_count = Set(None);
            active_build.build_end_time = Set(None);
            active_build.update(txn).await?;

            // 2. Refund resources
            let planet_current = Planet::find_by_id(planet_id).one(txn).await?
                .ok_or_else(|| sea_orm::DbErr::Custom("Planet not found in transaction".into()))?;
            let cur_m = planet_current.metal_amount;
            let cur_c = planet_current.crystal_amount;
            let cur_d = planet_current.deuterium_amount;
            let mut active_planet: planet::ActiveModel = planet_current.into();
            active_planet.metal_amount = Set(cur_m + refund_metal as f64);
            active_planet.crystal_amount = Set(cur_c + refund_crystal as f64);
            active_planet.deuterium_amount = Set(cur_d + refund_deuterium as f64);
            active_planet.update(txn).await?;

            Ok(())
        })
    }).await;

    match txn_result {
        Err(sea_orm::TransactionError::Transaction(e)) if e.to_string().contains("already cancelled") => {
            return (StatusCode::CONFLICT, Json(json!({"error": "Build already cancelled"}))).into_response();
        }
        Err(e) => {
            eprintln!("[cancel_defense_build] transaction failed: {:?}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Transaction failed"}))).into_response();
        }
        Ok(_) => {}
    }

    Json(json!({
        "success": true,
        "refund_metal": refund_metal,
        "refund_crystal": refund_crystal,
        "refund_deuterium": refund_deuterium,
        "refund_ratio": refund_ratio
    })).into_response()
}

/// Cancel an ongoing research
///
/// DELETE /planets/:id/cancel-research/:tech_key
///
/// Cancels the current research for the given tech key and refunds resources
/// based on remaining research time (up to 95% refund).
/// Atomic transaction: cancel first, then refund.
#[axum::debug_handler]
pub async fn cancel_research_handler(
    Path((planet_id, tech_key)): Path<(Uuid, String)>,
    State(state): State<AppState>,
) -> Response {
    // Get planet (read-only pre-check)
    match Planet::find_by_id(planet_id).one(&state.db).await {
        Ok(Some(_)) => {},
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planet not found"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Database error"}))).into_response(),
    };

    // Get tech type
    let tech = match Technology::find()
        .filter(technology::Column::TechKey.eq(&tech_key))
        .one(&state.db)
        .await
    {
        Ok(Some(t)) => t,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Technology not found"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Database error"}))).into_response(),
    };

    // Find active research
    let research = match PlanetTechnology::find()
        .filter(planet_technology::Column::PlanetId.eq(planet_id))
        .filter(planet_technology::Column::TechId.eq(tech.id))
        .filter(planet_technology::Column::ResearchingToLevel.is_not_null())
        .one(&state.db)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "No active research found"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Database error"}))).into_response(),
    };

    let now = chrono::Utc::now().naive_utc();
    let end_time = match research.research_end_time {
        Some(t) => t,
        None => return (StatusCode::BAD_REQUEST, Json(json!({"error": "No research end time"}))).into_response(),
    };

    let current_level = research.current_level;
    let cost_metal = tech_tree::calculate_tech_cost(tech.base_cost_metal, tech.cost_multiplier, current_level);
    let cost_crystal = tech_tree::calculate_tech_cost(tech.base_cost_crystal, tech.cost_multiplier, current_level);
    let cost_deuterium = tech_tree::calculate_tech_cost(tech.base_cost_deuterium, tech.cost_multiplier, current_level);

    let config = state.config.read().unwrap_or_else(|e| e.into_inner()).clone();
    let lab_level = tech_tree::get_planet_building_level(&state.db, planet_id, "research_lab")
        .await.unwrap_or(0);
    let target_level = research.researching_to_level.unwrap_or(current_level + 1);
    let total_duration = game_logic::get_research_time(&tech.tech_key, target_level, lab_level, &config);
    let remaining_seconds = (end_time - now).num_seconds().max(0);
    let refund_ratio = if total_duration > 0 {
        (remaining_seconds as f64 / total_duration as f64).clamp(0.0, 0.95)
    } else {
        0.0
    };

    let refund_metal = (cost_metal as f64 * refund_ratio) as i32;
    let refund_crystal = (cost_crystal as f64 * refund_ratio) as i32;
    let refund_deuterium = (cost_deuterium as f64 * refund_ratio) as i32;

    let tech_id = tech.id;

    // TRANSACTION: cancel first, then refund
    let txn_result = state.db.transaction::<_, (), sea_orm::DbErr>(|txn| {
        Box::pin(async move {
            let research_current = PlanetTechnology::find()
                .filter(planet_technology::Column::PlanetId.eq(planet_id))
                .filter(planet_technology::Column::TechId.eq(tech_id))
                .filter(planet_technology::Column::ResearchingToLevel.is_not_null())
                .one(txn)
                .await?;

            let research_current = match research_current {
                Some(r) if r.researching_to_level.is_some() => r,
                _ => return Err(sea_orm::DbErr::Custom("Research already cancelled or not found".into())),
            };

            // 1. Cancel the research first
            let mut active_research: planet_technology::ActiveModel = research_current.into();
            active_research.researching_to_level = Set(None);
            active_research.research_end_time = Set(None);
            active_research.update(txn).await?;

            // 2. Refund resources
            let planet_current = Planet::find_by_id(planet_id).one(txn).await?
                .ok_or_else(|| sea_orm::DbErr::Custom("Planet not found in transaction".into()))?;
            let cur_m = planet_current.metal_amount;
            let cur_c = planet_current.crystal_amount;
            let cur_d = planet_current.deuterium_amount;
            let mut active_planet: planet::ActiveModel = planet_current.into();
            active_planet.metal_amount = Set(cur_m + refund_metal as f64);
            active_planet.crystal_amount = Set(cur_c + refund_crystal as f64);
            active_planet.deuterium_amount = Set(cur_d + refund_deuterium as f64);
            active_planet.update(txn).await?;

            Ok(())
        })
    }).await;

    match txn_result {
        Err(sea_orm::TransactionError::Transaction(e)) if e.to_string().contains("already cancelled") => {
            return (StatusCode::CONFLICT, Json(json!({"error": "Research already cancelled"}))).into_response();
        }
        Err(e) => {
            eprintln!("[cancel_research] transaction failed: {:?}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Transaction failed"}))).into_response();
        }
        Ok(_) => {}
    }

    Json(json!({
        "success": true,
        "refund_metal": refund_metal,
        "refund_crystal": refund_crystal,
        "refund_deuterium": refund_deuterium,
        "refund_ratio": refund_ratio
    })).into_response()
}
