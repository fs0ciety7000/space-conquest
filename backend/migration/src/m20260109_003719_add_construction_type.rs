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
        .add_column(ColumnDef::new(Alias::new("construction_type")).string().null())
        .to_owned()
).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
       manager.alter_table(
    Table::alter()
        .table(Planet::Table)
        .drop_column(Alias::new("construction_type"))
        .to_owned()
).await
    }
}

#[derive(DeriveIden)]
enum Planet {
    Table,
}