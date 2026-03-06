use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260306_000005_planetary_biomes"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE planet ADD COLUMN IF NOT EXISTS biome VARCHAR(32);
                -- Homeworld planets get "tellurique" by default
                UPDATE planet SET biome = 'tellurique' WHERE biome IS NULL;
                "#,
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("ALTER TABLE planet DROP COLUMN IF EXISTS biome;")
            .await?;
        Ok(())
    }
}
