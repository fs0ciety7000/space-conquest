// backend/src/tech_tree.rs
// Tech Tree System - Dynamic relational database queries

use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait, QuerySelect};
use crate::entities::{prelude::*, technology, planet_technology, ship_type, planet_ship, technology_requirement, ship_requirement};
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use uuid::Uuid;

// ========== STRUCTURES ==========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechInfo {
    pub id: i32,
    pub tech_key: String,
    pub display_name: String,
    pub description: Option<String>,
    pub base_cost_metal: i32,
    pub base_cost_crystal: i32,
    pub base_cost_deuterium: i32,
    pub base_time_seconds: i32,
    pub cost_multiplier: f64,
    pub current_level: i32,
    pub requirements: Vec<TechRequirement>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechRequirement {
    pub required_tech_key: String,
    pub required_tech_name: String,
    pub required_level: i32,
    pub current_level: i32,
    pub met: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShipTypeInfo {
    pub id: i32,
    pub ship_key: String,
    pub display_name: String,
    pub description: Option<String>,
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
    pub current_count: i32,
    pub requirements: Vec<ShipRequirementInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShipRequirementInfo {
    pub requirement_type: String, // "tech" or "building"
    pub tech_key: Option<String>,
    pub tech_name: Option<String>,
    pub building_name: Option<String>,
    pub required_level: i32,
    pub current_level: i32,
    pub met: bool,
}

// ========== TECH QUERIES ==========

/// Get tech level for a planet
pub async fn get_planet_tech_level(
    db: &DatabaseConnection,
    planet_id: Uuid,
    tech_key: &str,
) -> Result<i32, sea_orm::DbErr> {
    // First get the tech id
    let tech = Technology::find()
        .filter(technology::Column::TechKey.eq(tech_key))
        .one(db)
        .await?;

    let tech_id = match tech {
        Some(t) => t.id,
        None => return Ok(0), // Tech doesn't exist, return 0
    };

    // Then get planet tech level
    let planet_tech = PlanetTechnology::find()
        .filter(planet_technology::Column::PlanetId.eq(planet_id))
        .filter(planet_technology::Column::TechId.eq(tech_id))
        .one(db)
        .await?;

    Ok(planet_tech.map(|pt| pt.current_level).unwrap_or(0))
}

/// Get all tech levels for a planet as a HashMap
pub async fn get_all_planet_tech_levels(
    db: &DatabaseConnection,
    planet_id: Uuid,
) -> Result<HashMap<String, i32>, sea_orm::DbErr> {
    let planet_techs = PlanetTechnology::find()
        .filter(planet_technology::Column::PlanetId.eq(planet_id))
        .all(db)
        .await?;

    let mut result = HashMap::new();

    for pt in planet_techs {
        // Get tech_key from tech_id
        if let Some(tech) = Technology::find_by_id(pt.tech_id).one(db).await? {
            result.insert(tech.tech_key, pt.current_level);
        }
    }

    Ok(result)
}

/// Get all technologies with their requirements for a planet
pub async fn get_tech_tree_for_planet(
    db: &DatabaseConnection,
    planet_id: Uuid,
) -> Result<Vec<TechInfo>, sea_orm::DbErr> {
    // Get all technologies
    let all_techs = Technology::find().all(db).await?;

    // Get planet's current tech levels
    let planet_tech_levels = get_all_planet_tech_levels(db, planet_id).await?;

    let mut result = Vec::new();

    for tech in all_techs {
        let current_level = *planet_tech_levels.get(&tech.tech_key).unwrap_or(&0);

        // Get requirements for this tech
        let requirements = get_tech_requirements(db, tech.id, planet_id).await?;

        result.push(TechInfo {
            id: tech.id,
            tech_key: tech.tech_key,
            display_name: tech.display_name,
            description: tech.description,
            base_cost_metal: tech.base_cost_metal,
            base_cost_crystal: tech.base_cost_crystal,
            base_cost_deuterium: tech.base_cost_deuterium,
            base_time_seconds: tech.base_time_seconds,
            cost_multiplier: tech.cost_multiplier,
            current_level,
            requirements,
        });
    }

    Ok(result)
}

/// Get requirements for a specific tech
async fn get_tech_requirements(
    db: &DatabaseConnection,
    tech_id: i32,
    planet_id: Uuid,
) -> Result<Vec<TechRequirement>, sea_orm::DbErr> {
    let requirements = TechnologyRequirement::find()
        .filter(technology_requirement::Column::TechId.eq(tech_id))
        .all(db)
        .await?;

    let mut result = Vec::new();

    for req in requirements {
        if let Some(required_tech) = Technology::find_by_id(req.required_tech_id).one(db).await? {
            let current_level = get_planet_tech_level(db, planet_id, &required_tech.tech_key).await?;

            result.push(TechRequirement {
                required_tech_key: required_tech.tech_key.clone(),
                required_tech_name: required_tech.display_name,
                required_level: req.required_level,
                current_level,
                met: current_level >= req.required_level,
            });
        }
    }

    Ok(result)
}

/// Check if a tech can be researched (all requirements met)
pub async fn can_research_tech(
    db: &DatabaseConnection,
    planet_id: Uuid,
    tech_key: &str,
) -> Result<bool, sea_orm::DbErr> {
    // Get tech
    let tech = Technology::find()
        .filter(technology::Column::TechKey.eq(tech_key))
        .one(db)
        .await?;

    let tech_id = match tech {
        Some(t) => t.id,
        None => return Ok(false),
    };

    // Get requirements
    let requirements = get_tech_requirements(db, tech_id, planet_id).await?;

    // Check if all requirements are met
    Ok(requirements.iter().all(|req| req.met))
}

// ========== SHIP QUERIES ==========

/// Get ship count for a planet
pub async fn get_planet_ship_count(
    db: &DatabaseConnection,
    planet_id: Uuid,
    ship_key: &str,
) -> Result<i32, sea_orm::DbErr> {
    // Get ship type id
    let ship_type = ShipType::find()
        .filter(ship_type::Column::ShipKey.eq(ship_key))
        .one(db)
        .await?;

    let ship_type_id = match ship_type {
        Some(st) => st.id,
        None => return Ok(0),
    };

    // Get planet ship count
    let planet_ship = PlanetShip::find()
        .filter(planet_ship::Column::PlanetId.eq(planet_id))
        .filter(planet_ship::Column::ShipTypeId.eq(ship_type_id))
        .one(db)
        .await?;

    Ok(planet_ship.map(|ps| ps.count).unwrap_or(0))
}

/// Get all ship counts for a planet as a HashMap
pub async fn get_all_planet_ship_counts(
    db: &DatabaseConnection,
    planet_id: Uuid,
) -> Result<HashMap<String, i32>, sea_orm::DbErr> {
    let planet_ships = PlanetShip::find()
        .filter(planet_ship::Column::PlanetId.eq(planet_id))
        .all(db)
        .await?;

    let mut result = HashMap::new();

    for ps in planet_ships {
        // Get ship_key from ship_type_id
        if let Some(ship_type) = ShipType::find_by_id(ps.ship_type_id).one(db).await? {
            result.insert(ship_type.ship_key, ps.count);
        }
    }

    Ok(result)
}

/// Get all ship counts with detailed info for a planet (for frontend display)
pub async fn get_all_planet_ship_details(
    db: &DatabaseConnection,
    planet_id: Uuid,
) -> Result<HashMap<String, serde_json::Value>, sea_orm::DbErr> {
    let planet_ships = PlanetShip::find()
        .filter(planet_ship::Column::PlanetId.eq(planet_id))
        .all(db)
        .await?;

    let mut result = HashMap::new();

    for ps in planet_ships {
        // Get ship_key and display_name from ship_type_id
        if let Some(ship_type) = ShipType::find_by_id(ps.ship_type_id).one(db).await? {
            result.insert(
                ship_type.ship_key.clone(),
                serde_json::json!({
                    "count": ps.count,
                    "display_name": ship_type.display_name,
                    "attack": ship_type.attack,
                    "shield": ship_type.shield,
                    "hull": ship_type.hull
                })
            );
        }
    }

    Ok(result)
}

/// Get all ship types with their requirements for a planet
pub async fn get_ship_types_for_planet(
    db: &DatabaseConnection,
    planet_id: Uuid,
) -> Result<Vec<ShipTypeInfo>, sea_orm::DbErr> {
    // Get all ship types
    let all_ships = ShipType::find().all(db).await?;

    // Get planet's current ship counts
    let planet_ship_counts = get_all_planet_ship_counts(db, planet_id).await?;

    let mut result = Vec::new();

    for ship in all_ships {
        let current_count = *planet_ship_counts.get(&ship.ship_key).unwrap_or(&0);

        // Get requirements for this ship
        let requirements = get_ship_requirements(db, ship.id, planet_id).await?;

        result.push(ShipTypeInfo {
            id: ship.id,
            ship_key: ship.ship_key,
            display_name: ship.display_name,
            description: ship.description,
            cost_metal: ship.cost_metal,
            cost_crystal: ship.cost_crystal,
            cost_deuterium: ship.cost_deuterium,
            build_time_seconds: ship.build_time_seconds,
            attack: ship.attack,
            shield: ship.shield,
            hull: ship.hull,
            cargo_capacity: ship.cargo_capacity,
            base_speed: ship.base_speed,
            fuel_consumption: ship.fuel_consumption,
            current_count,
            requirements,
        });
    }

    Ok(result)
}

/// Get requirements for a specific ship
async fn get_ship_requirements(
    db: &DatabaseConnection,
    ship_type_id: i32,
    planet_id: Uuid,
) -> Result<Vec<ShipRequirementInfo>, sea_orm::DbErr> {
    let requirements = ShipRequirement::find()
        .filter(ship_requirement::Column::ShipTypeId.eq(ship_type_id))
        .all(db)
        .await?;

    let mut result = Vec::new();

    for req in requirements {
        if let Some(required_tech) = Technology::find_by_id(req.required_tech_id).one(db).await? {
            let current_level = get_planet_tech_level(db, planet_id, &required_tech.tech_key).await?;

            result.push(ShipRequirementInfo {
                requirement_type: "tech".to_string(),
                tech_key: Some(required_tech.tech_key.clone()),
                tech_name: Some(required_tech.display_name),
                building_name: None,
                required_level: req.required_level,
                current_level,
                met: current_level >= req.required_level,
            });
        }
    }

    Ok(result)
}

/// Check if a ship can be built (all requirements met)
pub async fn can_build_ship(
    db: &DatabaseConnection,
    planet_id: Uuid,
    ship_key: &str,
) -> Result<bool, sea_orm::DbErr> {
    // Get ship type
    let ship_type = ShipType::find()
        .filter(ship_type::Column::ShipKey.eq(ship_key))
        .one(db)
        .await?;

    let ship_type_id = match ship_type {
        Some(st) => st.id,
        None => return Ok(false),
    };

    // Get requirements
    let requirements = get_ship_requirements(db, ship_type_id, planet_id).await?;

    // Check if all requirements are met
    Ok(requirements.iter().all(|req| req.met))
}

/// Get ship stats by ship_key
pub async fn get_ship_stats(
    db: &DatabaseConnection,
    ship_key: &str,
) -> Result<Option<ship_type::Model>, sea_orm::DbErr> {
    ShipType::find()
        .filter(ship_type::Column::ShipKey.eq(ship_key))
        .one(db)
        .await
}

// ========== UTILITY FUNCTIONS ==========

/// Calculate cost for a tech at a specific level (exponential growth)
pub fn calculate_tech_cost(base_cost: i32, multiplier: f64, current_level: i32) -> i32 {
    (base_cost as f64 * multiplier.powi(current_level)).ceil() as i32
}

/// Calculate time for a tech at a specific level
pub fn calculate_tech_time(base_time: i32, multiplier: f64, current_level: i32) -> i32 {
    (base_time as f64 * multiplier.powi(current_level)).ceil() as i32
}
