use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260313_000001_notification_report_id_mission_departure"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add report_id to notification (nullable FK to combat_log)
        manager.get_connection().execute_unprepared(
            "ALTER TABLE notification ADD COLUMN IF NOT EXISTS report_id UUID NULL REFERENCES combat_log(id) ON DELETE SET NULL;"
        ).await?;

        // Add departure_time to fleet_mission
        manager.get_connection().execute_unprepared(
            "ALTER TABLE fleet_mission ADD COLUMN IF NOT EXISTS departure_time TIMESTAMP NOT NULL DEFAULT NOW();"
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            "ALTER TABLE notification DROP COLUMN IF EXISTS report_id;"
        ).await?;
        manager.get_connection().execute_unprepared(
            "ALTER TABLE fleet_mission DROP COLUMN IF EXISTS departure_time;"
        ).await?;
        Ok(())
    }
}
