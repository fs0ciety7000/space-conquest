use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.create_table(
            Table::create()
                .table(Alias::new("fleet_mission"))
                .if_not_exists()
                .col(ColumnDef::new(Alias::new("id")).uuid().not_null().primary_key())
                .col(ColumnDef::new(Alias::new("source_planet_id")).uuid().not_null())
                .col(ColumnDef::new(Alias::new("target_planet_id")).uuid().not_null())
                .col(ColumnDef::new(Alias::new("mission_type")).string().not_null()) // "transport", "attack", etc.
                .col(ColumnDef::new(Alias::new("arrival_time")).date_time().not_null())
                .col(ColumnDef::new(Alias::new("metal")).double().not_null().default(0.0))
                .col(ColumnDef::new(Alias::new("crystal")).double().not_null().default(0.0))
                .col(ColumnDef::new(Alias::new("deuterium")).double().not_null().default(0.0))
                .col(ColumnDef::new(Alias::new("ships_count")).integer().not_null().default(0))
                .to_owned(),
        ).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(Alias::new("fleet_mission")).to_owned()).await
    }
}