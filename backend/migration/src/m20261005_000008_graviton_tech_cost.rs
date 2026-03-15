use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // BALANCE-2-B: Graviton Tech deuterium cost.
        // m20260127_000002_fix_graviton_costs set crystal=5000, deuterium=3000.
        // This sprint raises deuterium to 100_000 to make Graviton a true
        // end-game technology that cannot be unlocked without sustained deuterium
        // production. Prevents early cheap graviton rushes.
        manager
            .get_connection()
            .execute_unprepared(
                "UPDATE technologies SET base_cost_deuterium = 100000 WHERE tech_key = 'graviton_tech'"
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Revert to the value set by m20260127_000002_fix_graviton_costs.
        manager
            .get_connection()
            .execute_unprepared(
                "UPDATE technologies SET base_cost_deuterium = 3000 WHERE tech_key = 'graviton_tech'"
            )
            .await?;

        Ok(())
    }
}
