use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Planet::Table)
                .add_column(ColumnDef::new(Planet::HangarLevel).integer().not_null().default(0))
                .to_owned(),
        ).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Planet::Table)
                .drop_column(Planet::HangarLevel)
                .to_owned(),
        ).await
    }
}

#[derive(DeriveIden)]
enum Planet { Table, HangarLevel }