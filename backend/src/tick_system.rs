/// Tick System - Auto-completion of research and construction tasks
///
/// This module handles the automatic completion of time-based game mechanics:
/// - Technology research completion
/// - Ship construction completion (future)
/// - Building construction completion (future)

use chrono::Utc;
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait, Set, ActiveModelTrait};
use crate::entities::{prelude::*, planet_technology};

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

/// Process all tick-based game mechanics
///
/// This is the main tick function that should be called periodically
/// (e.g., every 10 seconds via a background task or cron job)
///
/// Returns statistics about what was processed
pub async fn process_tick(db: &DatabaseConnection) -> Result<TickStats, sea_orm::DbErr> {
    let research_completed = process_research_completion(db).await?;

    Ok(TickStats {
        research_completed,
    })
}

#[derive(Debug, Clone)]
pub struct TickStats {
    pub research_completed: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    // Add tests here when needed
}
