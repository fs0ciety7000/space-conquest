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
                    .add_column(ColumnDef::new(Planet::ResearchLabLevel).integer().not_null().default(0))
                    .add_column(ColumnDef::new(Planet::LaserBatteryLevel).integer().not_null().default(0))
                    .add_column(ColumnDef::new(Planet::EnergyTechLevel).integer().not_null().default(0))
                    .add_column(ColumnDef::new(Planet::ExpeditionEnd).date_time().null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Planet::Table)
                    .drop_column(Planet::ResearchLabLevel)
                    .drop_column(Planet::LaserBatteryLevel)
                    .drop_column(Planet::EnergyTechLevel)
                    .drop_column(Planet::ExpeditionEnd)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Planet {
    Table,
    #[sea_orm(iden = "research_lab_level")] ResearchLabLevel,
    #[sea_orm(iden = "laser_battery_level")] LaserBatteryLevel,
    #[sea_orm(iden = "energy_tech_level")] EnergyTechLevel,
    #[sea_orm(iden = "expedition_end")] ExpeditionEnd,
}