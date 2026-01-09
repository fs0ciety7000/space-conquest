use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Planet::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Planet::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Planet::Name).string().not_null())
                    .col(ColumnDef::new(Planet::MetalAmount).double().default(500.0).not_null())
                    .col(ColumnDef::new(Planet::MetalMineLevel).integer().default(1).not_null())
                    .col(ColumnDef::new(Planet::LastUpdate).timestamp().default(Expr::current_timestamp()).not_null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(Planet::Table).to_owned()).await
    }
}

#[derive(DeriveIden)]
enum Planet {
    Table,
    Id,
    Name,
    MetalAmount,
    MetalMineLevel,
    LastUpdate,
}