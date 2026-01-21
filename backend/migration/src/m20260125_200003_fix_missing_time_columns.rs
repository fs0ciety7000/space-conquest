use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add base_time_seconds to building_types if it doesn't exist
        // This is a safety migration to fix missing columns
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE building_types ADD COLUMN IF NOT EXISTS base_time_seconds INTEGER NOT NULL DEFAULT 0"
            )
            .await?;

        // Ensure defense_types has build_time_seconds (should already exist)
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE defense_types ADD COLUMN IF NOT EXISTS build_time_seconds INTEGER NOT NULL DEFAULT 0"
            )
            .await?;

        // Update building_types with calculated base times based on costs
        manager
            .get_connection()
            .execute_unprepared(
                "UPDATE building_types
                 SET base_time_seconds = CAST((base_cost_metal + base_cost_crystal) / 2500.0 * 3600.0 AS INTEGER)
                 WHERE base_time_seconds = 0"
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Don't remove columns in down migration for safety
        // If you really need to rollback, do it manually
        Ok(())
    }
}
