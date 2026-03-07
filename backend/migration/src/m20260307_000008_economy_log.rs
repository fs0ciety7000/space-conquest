use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260307_000008_economy_log"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared("
            CREATE TABLE IF NOT EXISTS economy_log (
                id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id          UUID NOT NULL,
                category         TEXT NOT NULL,
                action           TEXT NOT NULL,
                description      TEXT NOT NULL,
                metal            DOUBLE PRECISION NOT NULL DEFAULT 0,
                crystal          DOUBLE PRECISION NOT NULL DEFAULT 0,
                deuterium        DOUBLE PRECISION NOT NULL DEFAULT 0,
                syndicate_credits DOUBLE PRECISION NOT NULL DEFAULT 0,
                planet_name      TEXT,
                counterparty_username TEXT,
                item_key         TEXT,
                created_at       TIMESTAMP NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_economy_log_user_date
                ON economy_log(user_id, created_at DESC);
        ").await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            "DROP TABLE IF EXISTS economy_log;"
        ).await?;
        Ok(())
    }
}
