use sea_orm_migration::prelude::*;

/// Adds user profile fields (avatar, bio, last_login) and creates the friendships table.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ── 1. Profile columns on user ──────────────────────────────────────
        manager.get_connection().execute_unprepared(
            r#"
            ALTER TABLE "user"
                ADD COLUMN IF NOT EXISTS avatar_url TEXT,
                ADD COLUMN IF NOT EXISTS bio TEXT,
                ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
            "#
        ).await?;

        // ── 2. friendships table ────────────────────────────────────────────
        manager.get_connection().execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS friendship (
                id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sender_id   UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                receiver_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                status      VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
                CONSTRAINT friendship_unique UNIQUE (sender_id, receiver_id),
                CONSTRAINT friendship_no_self CHECK (sender_id != receiver_id)
            );
            CREATE INDEX IF NOT EXISTS idx_friendship_sender   ON friendship(sender_id);
            CREATE INDEX IF NOT EXISTS idx_friendship_receiver ON friendship(receiver_id);
            "#
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            r#"
            DROP TABLE IF EXISTS friendship;
            ALTER TABLE "user"
                DROP COLUMN IF EXISTS avatar_url,
                DROP COLUMN IF EXISTS bio,
                DROP COLUMN IF EXISTS last_login;
            "#
        ).await?;
        Ok(())
    }
}
