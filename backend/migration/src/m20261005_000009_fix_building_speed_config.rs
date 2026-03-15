use sea_orm_migration::prelude::*;

/// BALANCE-HOTFIX — Force-correct building/research speed multipliers.
///
/// The migration m20260312_000001_refactor_speed_config used ON CONFLICT DO NOTHING,
/// meaning it did NOT overwrite pre-existing values from the old speed_factor system
/// (e.g. building_speed_multiplier = 500). Any value > ~180 causes get_build_time_with_nanite
/// to hit the 10-second floor for all buildings regardless of level.
///
/// This migration uses ON CONFLICT DO UPDATE to force the correct values:
///   building_speed_multiplier  = 50   (= 30 min base at L1, ~3.4h ROI)
///   research_speed_multiplier  = 25
///   production_speed_multiplier = 250
///   ship_build_speed_multiplier = 100
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            "INSERT INTO server_config (config_key, config_value) VALUES
               ('building_speed_multiplier',   '50.0'),
               ('research_speed_multiplier',   '25.0'),
               ('production_speed_multiplier', '250.0'),
               ('ship_build_speed_multiplier', '100.0')
             ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value",
        )
        .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // No-op on down: we can't know the previous value. Admin can adjust via panel.
        let _ = manager;
        Ok(())
    }
}
