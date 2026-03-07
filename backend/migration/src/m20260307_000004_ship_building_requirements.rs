use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260307_000004_ship_building_requirements"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Create ship_building_requirements table
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS ship_building_requirements (
                id SERIAL PRIMARY KEY,
                ship_type_id INTEGER NOT NULL REFERENCES ship_types(id) ON DELETE CASCADE,
                required_building_type_id INTEGER NOT NULL REFERENCES building_types(id) ON DELETE CASCADE,
                required_level INTEGER NOT NULL DEFAULT 1,
                UNIQUE (ship_type_id, required_building_type_id)
            )"
        ).await?;

        // Grand Cargo requires: Hub Logistique niveau 1
        db.execute_unprepared(
            "INSERT INTO ship_building_requirements (ship_type_id, required_building_type_id, required_level) \
             SELECT s.id, b.id, 1 FROM ship_types s, building_types b \
             WHERE s.ship_key = 'grand_cargo' AND b.building_key = 'logistics_hub' \
             ON CONFLICT DO NOTHING"
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("DROP TABLE IF EXISTS ship_building_requirements")
            .await?;
        Ok(())
    }
}
