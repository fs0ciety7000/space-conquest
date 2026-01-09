use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("combat_log"))
                    .if_not_exists()
                    .col(ColumnDef::new(Alias::new("id")).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Alias::new("planet_id")).uuid().not_null()) // À qui appartient ce log
                    .col(ColumnDef::new(Alias::new("target_name")).string().not_null()) // Nom de l'ennemi ou "Expédition"
                    .col(ColumnDef::new(Alias::new("mission_type")).string().not_null()) // "attack", "defense", "expedition"
                    .col(ColumnDef::new(Alias::new("result")).string().not_null()) // "victory", "defeat"
                    .col(ColumnDef::new(Alias::new("loot_metal")).double().default(0.0))
                    .col(ColumnDef::new(Alias::new("loot_crystal")).double().default(0.0))
                    .col(ColumnDef::new(Alias::new("ships_lost")).integer().default(0))
                    .col(ColumnDef::new(Alias::new("date")).timestamp().default(Expr::current_timestamp()))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Alias::new("combat_log")).to_owned())
            .await
    }
}