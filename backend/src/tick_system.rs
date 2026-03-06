/// Tick System - Auto-completion of research and construction tasks
///
/// This module handles the automatic completion of time-based game mechanics:
/// - Technology research completion
/// - Ship construction completion
/// - Defense construction completion

use chrono::Utc;
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait, Set, ActiveModelTrait};
use crate::entities::{prelude::*, planet_technology, planet_ship, planet_defense, construction_queue, building_type, technology, planet_building, planet};
use crate::protection;

/// Process all completed research tasks
///
/// This function checks all ongoing research (where research_end_time is set)
/// and completes those that have reached their end time.
///
/// Returns the number of research tasks completed
pub async fn process_research_completion(db: &DatabaseConnection) -> Result<usize, sea_orm::DbErr> {
    let now = Utc::now().naive_utc();

    // Find all research that should be completed (research_end_time <= now)
    let completed_research = PlanetTechnology::find()
        .filter(planet_technology::Column::ResearchEndTime.is_not_null())
        .filter(planet_technology::Column::ResearchEndTime.lte(now))
        .all(db)
        .await?;

    let mut count = 0;

    for research in completed_research {
        // Complete the research
        if let Some(new_level) = research.researching_to_level {
            let planet_id = research.planet_id;
            let tech_id = research.tech_id;

            let mut active: planet_technology::ActiveModel = research.into();
            active.current_level = Set(new_level);
            active.researching_to_level = Set(None);
            active.research_end_time = Set(None);

            if let Ok(_) = active.update(db).await {
                count += 1;
                println!("✅ Research completed: Planet {:?} -> Tech {} -> Level {}",
                    planet_id, tech_id, new_level);
            }
        }
    }

    Ok(count)
}

/// Process all completed ship building tasks
///
/// This function checks all ongoing ship builds (where build_end_time is set)
/// and completes those that have reached their end time.
///
/// Returns the number of ship builds completed
pub async fn process_ship_building_completion(db: &DatabaseConnection) -> Result<usize, sea_orm::DbErr> {
    let now = Utc::now().naive_utc();

    // Find all ship builds that should be completed (build_end_time <= now)
    let completed_builds = PlanetShip::find()
        .filter(planet_ship::Column::BuildEndTime.is_not_null())
        .filter(planet_ship::Column::BuildEndTime.lte(now))
        .filter(planet_ship::Column::BuildingCount.is_not_null())
        .all(db)
        .await?;

    let mut count = 0;

    for build in completed_builds {
        // Complete the ship building
        if let Some(building_count) = build.building_count {
            if building_count > 0 {
                let planet_id = build.planet_id;
                let ship_type_id = build.ship_type_id;
                let new_count = build.count + building_count;

                let mut active: planet_ship::ActiveModel = build.into();
                active.count = Set(new_count);
                active.building_count = Set(None);
                active.build_end_time = Set(None);

                if let Ok(_) = active.update(db).await {
                    count += 1;
                    println!("✅ Ship building completed: Planet {:?} -> Ship Type {} -> Count +{}",
                        planet_id, ship_type_id, building_count);
                }
            }
        }
    }

    Ok(count)
}

/// Process all completed defense building tasks
///
/// This function checks all ongoing defense builds (where build_end_time is set)
/// and completes those that have reached their end time.
///
/// Returns the number of defense builds completed
pub async fn process_defense_building_completion(db: &DatabaseConnection) -> Result<usize, sea_orm::DbErr> {
    let now = Utc::now().naive_utc();

    // Find all defense builds that should be completed (build_end_time <= now)
    let completed_builds = PlanetDefense::find()
        .filter(planet_defense::Column::BuildEndTime.is_not_null())
        .filter(planet_defense::Column::BuildEndTime.lte(now))
        .filter(planet_defense::Column::BuildingCount.is_not_null())
        .all(db)
        .await?;

    let mut count = 0;

    for build in completed_builds {
        // Complete the defense building
        if let Some(building_count) = build.building_count {
            if building_count > 0 {
                let planet_id = build.planet_id;
                let defense_type_id = build.defense_type_id;
                let new_count = build.count + building_count;

                let mut active: planet_defense::ActiveModel = build.into();
                active.count = Set(new_count);
                active.building_count = Set(None);
                active.build_end_time = Set(None);

                if let Ok(_) = active.update(db).await {
                    count += 1;
                    println!("✅ Defense building completed: Planet {:?} -> Defense Type {} -> Count +{}",
                        planet_id, defense_type_id, building_count);
                }
            }
        }
    }

    Ok(count)
}

/// Process all completed building/tech constructions from construction_queue
///
/// This function checks all items in construction_queue (where end_time <= now)
/// and completes those constructions, updating planet_buildings or planet_technologies.
///
/// Returns the number of constructions completed
pub async fn process_construction_queue_completion(db: &DatabaseConnection) -> Result<usize, sea_orm::DbErr> {
    let now = Utc::now().naive_utc();

    // Find all constructions that should be completed (end_time <= now)
    let finished_constructions = ConstructionQueue::find()
        .filter(construction_queue::Column::EndTime.lte(now))
        .all(db)
        .await?;

    let mut count = 0;

    for item in finished_constructions {
        let planet_id = item.planet_id;
        let building_type_str = item.building_type.clone();
        let target_level = item.level;

        // Check if this is a technology from the new tech tree system
        let tech = Technology::find()
            .filter(technology::Column::TechKey.eq(&building_type_str))
            .one(db)
            .await?;

        if let Some(tech_data) = tech {
            // NEW TECH TREE SYSTEM - Update planet_technologies table
            let existing = PlanetTechnology::find()
                .filter(planet_technology::Column::PlanetId.eq(planet_id))
                .filter(planet_technology::Column::TechId.eq(tech_data.id))
                .one(db)
                .await?;

            if let Some(existing_tech) = existing {
                // Update existing tech level
                let mut tech_active: planet_technology::ActiveModel = existing_tech.into();
                tech_active.current_level = Set(target_level);
                tech_active.update(db).await?;
            } else {
                // Insert new tech level
                let new_tech = planet_technology::ActiveModel {
                    planet_id: Set(planet_id),
                    tech_id: Set(tech_data.id),
                    current_level: Set(target_level),
                    researching_to_level: Set(None),
                    research_end_time: Set(None),
                };
                new_tech.insert(db).await?;
            }

            count += 1;
            println!("✅ Technology construction completed: Planet {:?} -> {} -> Level {}",
                planet_id, building_type_str, target_level);
        } else {
            // Check if this is a building from the new system (excluding ships/defenses)
            let is_ship_or_defense = matches!(
                building_type_str.as_str(),
                "light_hunter" | "cruiser" | "missile_launcher" | "plasma_turret" |
                "spy_probe" | "transporter" | "colony_ship" | "recycler"
            );

            if !is_ship_or_defense {
                let building = BuildingType::find()
                    .filter(building_type::Column::BuildingKey.eq(&building_type_str))
                    .one(db)
                    .await?;

                if let Some(building_data) = building {
                    // NEW BUILDING SYSTEM - Update planet_buildings table
                    let existing = PlanetBuilding::find()
                        .filter(planet_building::Column::PlanetId.eq(planet_id))
                        .filter(planet_building::Column::BuildingTypeId.eq(building_data.id))
                        .one(db)
                        .await?;

                    if let Some(existing_building) = existing {
                        // Update existing building level
                        let mut building_active: planet_building::ActiveModel = existing_building.into();
                        building_active.level = Set(target_level);
                        building_active.upgrading_to_level = Set(None);
                        building_active.upgrade_end_time = Set(None);
                        building_active.update(db).await?;
                    } else {
                        // Insert new building level
                        let new_building = planet_building::ActiveModel {
                            planet_id: Set(planet_id),
                            building_type_id: Set(building_data.id),
                            level: Set(target_level),
                            upgrading_to_level: Set(None),
                            upgrade_end_time: Set(None),
                            updated_at: Set(Some(now)),
                        };
                        new_building.insert(db).await?;
                    }

                    count += 1;
                    println!("✅ Building construction completed: Planet {:?} -> {} -> Level {}",
                        planet_id, building_type_str, target_level);
                }

            }
            // Note: Ships and defenses in construction_queue are legacy
            // They should use the new planet_ships/planet_defenses tables instead
        }

        // Delete the completed construction from the queue
        let construction_to_delete: construction_queue::ActiveModel = item.into();
        construction_to_delete.delete(db).await?;
    }

    Ok(count)
}

/// Update all users' total points
///
/// This function recalculates and updates the total_points field for all users
/// based on their resources, buildings, ships, and defenses.
///
/// Returns the number of users updated
pub async fn update_all_user_points(db: &DatabaseConnection) -> Result<usize, sea_orm::DbErr> {
    // Get all users
    let users = User::find().all(db).await?;
    let mut count = 0;

    for user in users {
        // Update points for this user
        if let Ok(_) = protection::update_user_points(db, user.id).await {
            count += 1;
        }
    }

    Ok(count)
}

/// Process all tick-based game mechanics
///
/// This is the main tick function that should be called periodically
/// (e.g., every 10 seconds via a background task or cron job)
///
/// Returns statistics about what was processed
pub async fn process_tick(db: &DatabaseConnection) -> Result<TickStats, sea_orm::DbErr> {
    let research_completed = process_research_completion(db).await?;
    let ships_completed = process_ship_building_completion(db).await?;
    let defenses_completed = process_defense_building_completion(db).await?;
    let buildings_completed = process_construction_queue_completion(db).await?;

    // Update all user points after processing completions
    let points_updated = update_all_user_points(db).await.unwrap_or(0);

    Ok(TickStats {
        research_completed,
        ships_completed,
        defenses_completed,
        buildings_completed,
        points_updated,
    })
}

#[derive(Debug, Clone)]
pub struct TickStats {
    pub research_completed: usize,
    pub ships_completed: usize,
    pub defenses_completed: usize,
    pub buildings_completed: usize,
    pub points_updated: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    // Add tests here when needed
}
