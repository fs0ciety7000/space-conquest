use sea_orm_migration::prelude::*;

/// Migration: table planet_combat_zone
/// Permet aux joueurs de pré-assigner des vaisseaux à la ZAC (Zone Aérienne de Combat).
/// Seuls ces vaisseaux (+ les défenses planétaires) participent à la défense lors d'une attaque.
/// Si la ZAC est vide, TOUS les vaisseaux de la planète défendent (comportement par défaut).

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS planet_combat_zone (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                planet_id UUID NOT NULL REFERENCES planet(id) ON DELETE CASCADE,
                ship_key VARCHAR(100) NOT NULL,
                assigned_count INTEGER NOT NULL DEFAULT 0 CHECK (assigned_count >= 0),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(planet_id, ship_key)
            );
            CREATE INDEX IF NOT EXISTS idx_pcz_planet ON planet_combat_zone(planet_id);"
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared("DROP TABLE IF EXISTS planet_combat_zone;").await?;
        Ok(())
    }
}
