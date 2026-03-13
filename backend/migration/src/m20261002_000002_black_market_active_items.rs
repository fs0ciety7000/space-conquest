use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20261002_000002_black_market_active_items"
    }
}

/// Adds `expires_at` and `activated_at` to `user_inventory` so that timed
/// black-market effects (resource_boost, stealth) can be tracked without a
/// separate table. Also drops the UNIQUE constraint on (user_id, item_id)
/// because a player may own multiple independent active instances of the same
/// item (e.g. two overlapping resource_boost charges).
///
/// Adds `fleet_mission.mission_type = 'piracy'` support: no schema change
/// needed for fleet_mission itself since the text column already accepts any
/// value, but we add the new mission_type to the allowed values via a comment.
#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                -- Add timed-effect columns to user_inventory.
                -- Both are nullable: NULL means the item is in the inventory
                -- but not yet activated (e.g. orbital_strike token).
                ALTER TABLE user_inventory
                    ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP,
                    ADD COLUMN IF NOT EXISTS expires_at   TIMESTAMP;

                -- The old unique constraint prevented stacking multiple uses
                -- of the same item. Drop it so players can have N active boosts.
                DROP INDEX IF EXISTS idx_user_inventory_unique;

                -- New index for fast look-up of active (non-expired) effects.
                CREATE INDEX IF NOT EXISTS idx_user_inventory_active_effects
                    ON user_inventory(user_id, expires_at)
                    WHERE expires_at IS NOT NULL;
                "#,
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                DROP INDEX IF EXISTS idx_user_inventory_active_effects;
                ALTER TABLE user_inventory
                    DROP COLUMN IF EXISTS expires_at,
                    DROP COLUMN IF EXISTS activated_at;
                -- Restore unique constraint (best-effort; may fail if duplicates exist)
                CREATE UNIQUE INDEX IF NOT EXISTS idx_user_inventory_unique
                    ON user_inventory(user_id, item_id);
                "#,
            )
            .await?;
        Ok(())
    }
}
