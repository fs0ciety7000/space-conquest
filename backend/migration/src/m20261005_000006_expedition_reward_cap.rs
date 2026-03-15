use sea_orm_migration::prelude::*;

/// BALANCE-1-E — Add server_config key for expedition reward cap (MED-003).
///
/// Inserts `max_expedition_reward_per_slot = 500000` so the expedition handler
/// can clamp each resource reward per-slot without hard-coding the value.
/// ON CONFLICT DO NOTHING ensures idempotency on re-apply.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            "INSERT INTO server_config (key, value, description) \
             VALUES ('max_expedition_reward_per_slot', '500000', \
                     'Cap max ressources par expédition par slot') \
             ON CONFLICT (key) DO NOTHING",
        )
        .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            "DELETE FROM server_config WHERE key = 'max_expedition_reward_per_slot'",
        )
        .await?;
        Ok(())
    }
}
