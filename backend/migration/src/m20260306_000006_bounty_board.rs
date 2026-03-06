use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260306_000006_bounty_board"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                CREATE TABLE IF NOT EXISTS bounty (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    poster_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                    target_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                    mercenary_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
                    reward_metal DOUBLE PRECISION NOT NULL DEFAULT 0,
                    reward_crystal DOUBLE PRECISION NOT NULL DEFAULT 0,
                    reward_deuterium DOUBLE PRECISION NOT NULL DEFAULT 0,
                    reason TEXT,
                    status VARCHAR(16) NOT NULL DEFAULT 'open',
                    -- status: 'open' | 'accepted' | 'completed' | 'cancelled' | 'expired'
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    completed_at TIMESTAMP,
                    CONSTRAINT bounty_different_players CHECK (poster_id != target_id)
                );
                CREATE INDEX IF NOT EXISTS idx_bounty_target_id ON bounty(target_id);
                CREATE INDEX IF NOT EXISTS idx_bounty_poster_id ON bounty(poster_id);
                CREATE INDEX IF NOT EXISTS idx_bounty_status ON bounty(status);
                "#,
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("DROP TABLE IF EXISTS bounty;")
            .await?;
        Ok(())
    }
}
