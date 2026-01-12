use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(ConstructionQueue::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(ConstructionQueue::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(ConstructionQueue::PlanetId).uuid().not_null())
                    .col(ColumnDef::new(ConstructionQueue::BuildingType).string().not_null())
                    .col(ColumnDef::new(ConstructionQueue::Level).integer().not_null())
                    .col(ColumnDef::new(ConstructionQueue::EndTime).date_time().not_null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(ConstructionQueue::Table).to_owned()).await
    }
}

#[derive(DeriveIden)]
enum ConstructionQueue {
    Table,
    Id,
    PlanetId,
    BuildingType,
    Level,
    EndTime,
}