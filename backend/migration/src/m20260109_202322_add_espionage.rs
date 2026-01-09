use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Alias::new("planet"))
                .add_column(ColumnDef::new(Alias::new("spy_probe_count")).integer().not_null().default(0))
                .add_column(ColumnDef::new(Alias::new("espionage_tech_level")).integer().not_null().default(0))
                .to_owned(),
        ).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Alias::new("planet"))
                .drop_column(Alias::new("spy_probe_count"))
                .drop_column(Alias::new("espionage_tech_level"))
                .to_owned(),
        ).await
    }
}