use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(FleetMission::Table)
                    .add_column(
                        ColumnDef::new(FleetMission::FleetData)
                            .text()
                            .null()
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(FleetMission::Table)
                    .drop_column(FleetMission::FleetData)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum FleetMission {
    Table,
    FleetData,
}
