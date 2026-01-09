use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
       // Dans la fonction up()
manager.alter_table(
    Table::alter()
        .table(Planet::Table)
        .add_column(ColumnDef::new(Alias::new("shipyard_level")).integer().not_null().default(0))
        .add_column(ColumnDef::new(Alias::new("light_hunter_count")).integer().not_null().default(0))
        .add_column(ColumnDef::new(Alias::new("shipyard_construction_end")).timestamp().null())
        .to_owned()
).await
    }

   
}

#[derive(DeriveIden)]
enum Planet {
    Table,
}