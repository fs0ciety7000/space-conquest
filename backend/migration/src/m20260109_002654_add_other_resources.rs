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
        .add_column(ColumnDef::new(Alias::new("crystal_amount")).double().default(300.0).not_null())
        .add_column(ColumnDef::new(Alias::new("crystal_mine_level")).integer().default(1).not_null())
        .add_column(ColumnDef::new(Alias::new("deuterium_amount")).double().default(100.0).not_null())
        .add_column(ColumnDef::new(Alias::new("deuterium_mine_level")).integer().default(0).not_null())
        .to_owned()
).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Planet::Table)
                    .drop_column(Alias::new("crystal_amount"))
                    .drop_column(Alias::new("crystal_mine_level"))
                    .drop_column(Alias::new("deuterium_amount"))
                    .drop_column(Alias::new("deuterium_mine_level"))
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Planet {
    Table,
}