use sea_orm_migration::prelude::*;

/// BALANCE-1-B — Rebalance Heavy Hunter attack (REC-09).
///
/// The Heavy Hunter's 25 attack made it statistically inferior to the Light
/// Hunter for its cost. Raising it to 75 brings it in line with the mid-tier
/// role intended by the tech tree position.
///
///   - attack : 25 → 75
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            "UPDATE ship_types SET attack = 75 WHERE ship_key = 'heavy_hunter'",
        )
        .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            "UPDATE ship_types SET attack = 25 WHERE ship_key = 'heavy_hunter'",
        )
        .await?;
        Ok(())
    }
}
