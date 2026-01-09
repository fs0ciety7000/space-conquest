use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Alias::new("planet"))
                .add_column(ColumnDef::new(Alias::new("galaxy")).integer().not_null().default(1))
                .add_column(ColumnDef::new(Alias::new("system")).integer().not_null().default(1))
                .add_column(ColumnDef::new(Alias::new("position")).integer().not_null().default(1))
                .to_owned(),
        ).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Alias::new("planet"))
                .drop_column(Alias::new("galaxy"))
                .drop_column(Alias::new("system"))
                .drop_column(Alias::new("position"))
                .to_owned(),
        ).await
    }
}