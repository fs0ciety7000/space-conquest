use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Planet::Table)
                    .add_column(ColumnDef::new(Planet::PendingFleetCount).integer().not_null().default(0))
                    .add_column(ColumnDef::new(Planet::PendingFleetType).string().null())
                    .add_column(ColumnDef::new(Planet::CruiserCount).integer().not_null().default(0))
                    .add_column(ColumnDef::new(Planet::RecyclerCount).integer().not_null().default(0))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Planet::Table)
                    .drop_column(Planet::PendingFleetCount)
                    .drop_column(Planet::PendingFleetType)
                    .drop_column(Planet::CruiserCount)
                    .drop_column(Planet::RecyclerCount)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Planet {
    Table,
    PendingFleetCount,
    PendingFleetType,
    CruiserCount,
    RecyclerCount,
}