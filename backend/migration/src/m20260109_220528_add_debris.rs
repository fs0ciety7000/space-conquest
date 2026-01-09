use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Alias::new("planet"))
                .add_column(ColumnDef::new(Alias::new("debris_metal")).double().not_null().default(0.0))
                .add_column(ColumnDef::new(Alias::new("debris_crystal")).double().not_null().default(0.0))
                .to_owned(),
        ).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Alias::new("planet"))
                .drop_column(Alias::new("debris_metal"))
                .drop_column(Alias::new("debris_crystal"))
                .to_owned(),
        ).await
    }
}