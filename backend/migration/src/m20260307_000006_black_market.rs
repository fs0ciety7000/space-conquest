use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260307_000006_black_market"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                -- Black market items catalogue (admin-managed)
                CREATE TABLE IF NOT EXISTS black_market_item (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(128) NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    image_key VARCHAR(64) NOT NULL DEFAULT 'placeholder',
                    effect_type VARCHAR(64) NOT NULL,
                    -- effect_type values: 'orbital_strike', 'resource_boost', 'shield_boost', etc.
                    effect_params JSONB NOT NULL DEFAULT '{}',
                    base_price DOUBLE PRECISION NOT NULL,
                    current_price DOUBLE PRECISION NOT NULL,
                    price_last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                );

                -- Player inventory
                CREATE TABLE IF NOT EXISTS user_inventory (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                    item_id UUID NOT NULL REFERENCES black_market_item(id) ON DELETE CASCADE,
                    quantity INTEGER NOT NULL DEFAULT 1,
                    acquired_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    CONSTRAINT user_inventory_positive_qty CHECK (quantity > 0)
                );

                CREATE INDEX IF NOT EXISTS idx_user_inventory_user ON user_inventory(user_id);
                CREATE INDEX IF NOT EXISTS idx_user_inventory_item ON user_inventory(item_id);
                CREATE UNIQUE INDEX IF NOT EXISTS idx_user_inventory_unique ON user_inventory(user_id, item_id);

                -- Pirate extortion events (from orbital strike token)
                CREATE TABLE IF NOT EXISTS pirate_extortion (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    attacker_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                    target_user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                    target_planet_id UUID NOT NULL REFERENCES planet(id) ON DELETE CASCADE,
                    arrival_time TIMESTAMP NOT NULL,
                    status VARCHAR(32) NOT NULL DEFAULT 'incoming',
                    -- status: 'incoming' | 'resolved_passive' | 'resolved_tribute' | 'resolved_retaliate'
                    tribute_amount DOUBLE PRECISION,        -- credits paid for tribute
                    retaliate_cost DOUBLE PRECISION,        -- credits paid to retaliate
                    resolved_at TIMESTAMP,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                );

                CREATE INDEX IF NOT EXISTS idx_pirate_extortion_target ON pirate_extortion(target_user_id);
                CREATE INDEX IF NOT EXISTS idx_pirate_extortion_status ON pirate_extortion(status);
                CREATE INDEX IF NOT EXISTS idx_pirate_extortion_arrival ON pirate_extortion(arrival_time);
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
                DROP TABLE IF EXISTS pirate_extortion;
                DROP TABLE IF EXISTS user_inventory;
                DROP TABLE IF EXISTS black_market_item;
                "#,
            )
            .await?;
        Ok(())
    }
}
