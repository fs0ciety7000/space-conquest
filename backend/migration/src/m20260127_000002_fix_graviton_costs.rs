use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Fix Graviton technology costs - they were incorrectly set to 0
        // This caused infinite free upgrades (0 * multiplier = 0)
        //
        // New values: Crystal: 5000, Deuterium: 3000
        // With 3.0 multiplier, costs will scale properly:
        // Level 1: 5000 C, 3000 D
        // Level 2: 15000 C, 9000 D
        // Level 3: 45000 C, 27000 D
        // etc.
        let db = manager.get_connection();

        // Calculate base_time_seconds: (metal + crystal) / 2500 * 3600 = (0 + 5000) / 2500 * 3600 = 7200
        db.execute_unprepared(
            "UPDATE technologies SET \
             base_cost_metal = 0, \
             base_cost_crystal = 5000, \
             base_cost_deuterium = 3000, \
             base_time_seconds = 7200 \
             WHERE tech_key = 'graviton_tech'"
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Revert to original (broken) values
        let db = manager.get_connection();

        db.execute_unprepared(
            "UPDATE technologies SET \
             base_cost_metal = 0, \
             base_cost_crystal = 0, \
             base_cost_deuterium = 0, \
             base_time_seconds = 0 \
             WHERE tech_key = 'graviton_tech'"
        ).await?;

        Ok(())
    }
}
