/// Tick System - Auto-completion of research and construction tasks
///
/// This module handles the automatic completion of time-based game mechanics:
/// - Technology research completion
/// - Ship construction completion
/// - Defense construction completion

use chrono::Utc;
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait, Set, ActiveModelTrait};
use crate::entities::{prelude::*, planet_technology, planet_ship, planet_defense};

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

    Ok(TickStats {
        research_completed,
        ships_completed,
        defenses_completed,
    })
}

#[derive(Debug, Clone)]
pub struct TickStats {
    pub research_completed: usize,
    pub ships_completed: usize,
    pub defenses_completed: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    // Add tests here when needed
}
