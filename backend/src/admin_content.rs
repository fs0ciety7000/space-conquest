use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use sea_orm::{
    ActiveModelTrait, EntityTrait, Set, QueryFilter, ColumnTrait, ActiveValue
};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::entities::{
    prelude::*,
    ship_type, building_type, defense_type, ship_requirement, building_requirement,
    defense_requirement, technology, officer_template,
};
use crate::AppState;

// ==================== SHIP TYPES ====================

#[derive(Deserialize)]
pub struct CreateShipType {
    pub ship_key: String,
    pub name: String,
    pub category: String,
    pub cost_metal: i32,
    pub cost_crystal: i32,
    pub cost_deuterium: i32,
    pub build_time_seconds: i32,
    pub attack: i32,
    pub shield: i32,
    pub hull: i32,
    pub cargo_capacity: i32,
    pub base_speed: i32,
    pub fuel_consumption: i32,
    pub shipyard_required: i32,
    pub description: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateShipRequirement {
    pub ship_type_id: i32,
    pub required_tech_id: i32,
    pub required_level: i32,
}

pub async fn list_ship_types_handler(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let ships = ShipType::find()
        .all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({ "ships": ships })))
}

pub async fn create_ship_type_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateShipType>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let new_ship = ship_type::ActiveModel {
        ship_key: Set(payload.ship_key),
        display_name: Set(payload.name),
        category: Set(payload.category),
        cost_metal: Set(payload.cost_metal),
        cost_crystal: Set(payload.cost_crystal),
        cost_deuterium: Set(payload.cost_deuterium),
        build_time_seconds: Set(payload.build_time_seconds),
        attack: Set(payload.attack),
        shield: Set(payload.shield),
        hull: Set(payload.hull),
        cargo_capacity: Set(payload.cargo_capacity),
        base_speed: Set(payload.base_speed),
        fuel_consumption: Set(payload.fuel_consumption),
        shipyard_required: Set(payload.shipyard_required),
        description: Set(payload.description),
        ..Default::default()
    };

    let result = new_ship.insert(&state.db).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({
        "status": "success",
        "ship": result
    })))
}

pub async fn update_ship_type_handler(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<CreateShipType>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let ship = ShipType::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let mut ship_active: ship_type::ActiveModel = ship.into();
    ship_active.ship_key = Set(payload.ship_key);
    ship_active.display_name = Set(payload.name);
    ship_active.category = Set(payload.category);
    ship_active.cost_metal = Set(payload.cost_metal);
    ship_active.cost_crystal = Set(payload.cost_crystal);
    ship_active.cost_deuterium = Set(payload.cost_deuterium);
    ship_active.build_time_seconds = Set(payload.build_time_seconds);
    ship_active.attack = Set(payload.attack);
    ship_active.shield = Set(payload.shield);
    ship_active.hull = Set(payload.hull);
    ship_active.cargo_capacity = Set(payload.cargo_capacity);
    ship_active.base_speed = Set(payload.base_speed);
    ship_active.fuel_consumption = Set(payload.fuel_consumption);
    ship_active.shipyard_required = Set(payload.shipyard_required);
    ship_active.description = Set(payload.description);

    let result = ship_active.update(&state.db).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({
        "status": "success",
        "ship": result
    })))
}

pub async fn delete_ship_type_handler(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<StatusCode, StatusCode> {
    ShipType::delete_by_id(id)
        .exec(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

// ==================== BUILDING TYPES ====================

#[derive(Deserialize)]
pub struct CreateBuildingType {
    pub building_key: String,
    pub name: String,
    pub category: String,
    pub base_cost_metal: i32,
    pub base_cost_crystal: i32,
    pub base_cost_deuterium: i32,
    pub base_time_seconds: i32,
    pub cost_multiplier: f64,
    pub description: Option<String>,
}

pub async fn list_building_types_handler(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let buildings = BuildingType::find()
        .all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({ "buildings": buildings })))
}

pub async fn create_building_type_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateBuildingType>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let new_building = building_type::ActiveModel {
        building_key: Set(payload.building_key),
        name: Set(payload.name),
        category: Set(payload.category),
        base_cost_metal: Set(payload.base_cost_metal),
        base_cost_crystal: Set(payload.base_cost_crystal),
        base_cost_deuterium: Set(payload.base_cost_deuterium),
        base_time_seconds: Set(payload.base_time_seconds),
        cost_multiplier: Set(payload.cost_multiplier),
        description: Set(payload.description),
        ..Default::default()
    };

    let result = new_building.insert(&state.db).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({
        "status": "success",
        "building": result
    })))
}

pub async fn update_building_type_handler(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<CreateBuildingType>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let building = BuildingType::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let mut building_active: building_type::ActiveModel = building.into();
    building_active.building_key = Set(payload.building_key);
    building_active.name = Set(payload.name);
    building_active.category = Set(payload.category);
    building_active.base_cost_metal = Set(payload.base_cost_metal);
    building_active.base_cost_crystal = Set(payload.base_cost_crystal);
    building_active.base_cost_deuterium = Set(payload.base_cost_deuterium);
    building_active.base_time_seconds = Set(payload.base_time_seconds);
    building_active.cost_multiplier = Set(payload.cost_multiplier);
    building_active.description = Set(payload.description);

    let result = building_active.update(&state.db).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({
        "status": "success",
        "building": result
    })))
}

pub async fn delete_building_type_handler(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<StatusCode, StatusCode> {
    BuildingType::delete_by_id(id)
        .exec(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

// ==================== DEFENSE TYPES ====================

#[derive(Deserialize)]
pub struct CreateDefenseType {
    pub defense_key: String,
    pub name: String,
    pub category: String,
    pub base_cost_metal: i32,
    pub base_cost_crystal: i32,
    pub base_cost_deuterium: i32,
    pub build_time_seconds: i32,
    pub attack: i32,
    pub shield: i32,
    pub hull: i32,
    pub description: Option<String>,
}

pub async fn list_defense_types_handler(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let defenses = DefenseType::find()
        .all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({ "defenses": defenses })))
}

pub async fn create_defense_type_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateDefenseType>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let new_defense = defense_type::ActiveModel {
        defense_key: Set(payload.defense_key),
        name: Set(payload.name),
        category: Set(payload.category),
        base_cost_metal: Set(payload.base_cost_metal),
        base_cost_crystal: Set(payload.base_cost_crystal),
        base_cost_deuterium: Set(payload.base_cost_deuterium),
        build_time_seconds: Set(payload.build_time_seconds),
        attack: Set(payload.attack),
        shield: Set(payload.shield),
        hull: Set(payload.hull),
        description: Set(payload.description),
        ..Default::default()
    };

    let result = new_defense.insert(&state.db).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({
        "status": "success",
        "defense": result
    })))
}

pub async fn update_defense_type_handler(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<CreateDefenseType>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let defense = DefenseType::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let mut defense_active: defense_type::ActiveModel = defense.into();
    defense_active.defense_key = Set(payload.defense_key);
    defense_active.name = Set(payload.name);
    defense_active.category = Set(payload.category);
    defense_active.base_cost_metal = Set(payload.base_cost_metal);
    defense_active.base_cost_crystal = Set(payload.base_cost_crystal);
    defense_active.base_cost_deuterium = Set(payload.base_cost_deuterium);
    defense_active.build_time_seconds = Set(payload.build_time_seconds);
    defense_active.attack = Set(payload.attack);
    defense_active.shield = Set(payload.shield);
    defense_active.hull = Set(payload.hull);
    defense_active.description = Set(payload.description);

    let result = defense_active.update(&state.db).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({
        "status": "success",
        "defense": result
    })))
}

pub async fn delete_defense_type_handler(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<StatusCode, StatusCode> {
    DefenseType::delete_by_id(id)
        .exec(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

// ==================== REQUIREMENTS ====================

pub async fn list_ship_requirements_handler(
    State(state): State<AppState>,
    Path(ship_type_id): Path<i32>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let requirements = ShipRequirement::find()
        .filter(ship_requirement::Column::ShipTypeId.eq(ship_type_id))
        .all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({ "requirements": requirements })))
}

pub async fn create_ship_requirement_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateShipRequirement>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let new_req = ship_requirement::ActiveModel {
        ship_type_id: Set(payload.ship_type_id),
        required_tech_id: Set(payload.required_tech_id),
        required_level: Set(payload.required_level),
        ..Default::default()
    };

    let result = new_req.insert(&state.db).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({
        "status": "success",
        "requirement": result
    })))
}

pub async fn delete_ship_requirement_handler(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<StatusCode, StatusCode> {
    ShipRequirement::delete_by_id(id)
        .exec(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

// Building Requirements
#[derive(Deserialize)]
pub struct CreateBuildingRequirement {
    pub building_type_id: i32,
    pub required_tech_id: Option<i32>,
    pub required_building_id: Option<i32>,
    pub required_level: i32,
}

pub async fn list_building_requirements_handler(
    State(state): State<AppState>,
    Path(building_type_id): Path<i32>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let requirements = BuildingRequirement::find()
        .filter(building_requirement::Column::BuildingTypeId.eq(building_type_id))
        .all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({ "requirements": requirements })))
}

pub async fn create_building_requirement_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateBuildingRequirement>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let new_req = building_requirement::ActiveModel {
        building_type_id: Set(payload.building_type_id),
        required_tech_id: Set(payload.required_tech_id),
        required_building_id: Set(payload.required_building_id),
        required_level: Set(payload.required_level),
        ..Default::default()
    };

    let result = new_req.insert(&state.db).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({
        "status": "success",
        "requirement": result
    })))
}

pub async fn delete_building_requirement_handler(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<StatusCode, StatusCode> {
    BuildingRequirement::delete_by_id(id)
        .exec(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

// Defense Requirements
#[derive(Deserialize)]
pub struct CreateDefenseRequirement {
    pub defense_type_id: i32,
    pub required_tech_id: Option<i32>,
    pub required_building_id: Option<i32>,
    pub required_level: i32,
}

pub async fn list_defense_requirements_handler(
    State(state): State<AppState>,
    Path(defense_type_id): Path<i32>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let requirements = DefenseRequirement::find()
        .filter(defense_requirement::Column::DefenseTypeId.eq(defense_type_id))
        .all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({ "requirements": requirements })))
}

pub async fn create_defense_requirement_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateDefenseRequirement>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let new_req = defense_requirement::ActiveModel {
        defense_type_id: Set(payload.defense_type_id),
        required_tech_id: Set(payload.required_tech_id),
        required_building_id: Set(payload.required_building_id),
        required_level: Set(payload.required_level),
        ..Default::default()
    };

    let result = new_req.insert(&state.db).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({
        "status": "success",
        "requirement": result
    })))
}

pub async fn delete_defense_requirement_handler(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<StatusCode, StatusCode> {
    DefenseRequirement::delete_by_id(id)
        .exec(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

// ==================== TECHNOLOGIES (for reference) ====================

pub async fn list_technologies_handler(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let technologies = Technology::find()
        .all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({ "technologies": technologies })))
}
