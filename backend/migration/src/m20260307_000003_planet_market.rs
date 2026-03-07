use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS planet_listings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                planet_id UUID NOT NULL UNIQUE REFERENCES planet(id) ON DELETE CASCADE,
                seller_id UUID NOT NULL REFERENCES \"user\"(id) ON DELETE CASCADE,
                listing_type VARCHAR(10) NOT NULL DEFAULT 'player'
                    CHECK (listing_type IN ('npc', 'player')),
                asking_price_metal BIGINT NOT NULL DEFAULT 0,
                asking_price_crystal BIGINT NOT NULL DEFAULT 0,
                asking_price_deuterium BIGINT NOT NULL DEFAULT 0,
                suggested_price_metal BIGINT NOT NULL DEFAULT 0,
                suggested_price_crystal BIGINT NOT NULL DEFAULT 0,
                suggested_price_deuterium BIGINT NOT NULL DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                listed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )"
        ).await?;

        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_planet_listings_seller ON planet_listings(seller_id) WHERE is_active = true"
        ).await?;

        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_planet_listings_active ON planet_listings(is_active) WHERE is_active = true"
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection()
            .execute_unprepared("DROP TABLE IF EXISTS planet_listings")
            .await?;
        Ok(())
    }
}
