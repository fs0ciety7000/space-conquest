use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // BALANCE-2-A: Unify crystal_mine cost_factor between DB and fallback code.
        // The seed (m20260125_200002) inserted cost_multiplier = 1.6 for crystal_mine,
        // but the fallback function get_upgrade_cost() used 1.5. This migration aligns
        // the DB to 1.5 so both paths produce consistent costs.
        manager
            .get_connection()
            .execute_unprepared(
                "UPDATE building_types SET cost_multiplier = 1.5 WHERE building_key = 'crystal_mine'"
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                "UPDATE building_types SET cost_multiplier = 1.6 WHERE building_key = 'crystal_mine'"
            )
            .await?;

        Ok(())
    }
}
