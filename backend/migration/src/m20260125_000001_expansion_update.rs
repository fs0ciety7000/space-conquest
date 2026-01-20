use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ========== EXPANSION 2.0: TECH TREE & NEW SHIPS ==========

        // Add new technology columns to planet table
        manager.alter_table(
            Table::alter()
                .table(Planet::Table)
                // Tech Tree - Propulsion
                .add_column_if_not_exists(ColumnDef::new(Planet::CombustionDriveLevel).integer().not_null().default(0))
                .add_column_if_not_exists(ColumnDef::new(Planet::ImpulseDriveLevel).integer().not_null().default(0))
                .add_column_if_not_exists(ColumnDef::new(Planet::HyperspaceDriveLevel).integer().not_null().default(0))
                // Tech Tree - Combat
                .add_column_if_not_exists(ColumnDef::new(Planet::IonTechLevel).integer().not_null().default(0))
                .add_column_if_not_exists(ColumnDef::new(Planet::PlasmaTechLevel).integer().not_null().default(0))
                .add_column_if_not_exists(ColumnDef::new(Planet::ShieldTechLevel).integer().not_null().default(0))
                .add_column_if_not_exists(ColumnDef::new(Planet::WeaponsTechLevel).integer().not_null().default(0))
                // Tech Tree - Research
                .add_column_if_not_exists(ColumnDef::new(Planet::ComputerTechLevel).integer().not_null().default(0))
                .add_column_if_not_exists(ColumnDef::new(Planet::AstrophysicsLevel).integer().not_null().default(0))
                .add_column_if_not_exists(ColumnDef::new(Planet::LogisticsTechLevel).integer().not_null().default(0))
                // Building - Deuterium Synthesizer
                .add_column_if_not_exists(ColumnDef::new(Planet::DeuteriumSynthesizerLevel).integer().not_null().default(0))
                .to_owned(),
        ).await?;

        // Add new ship columns to planet table
        manager.alter_table(
            Table::alter()
                .table(Planet::Table)
                .add_column_if_not_exists(ColumnDef::new(Planet::HeavyHunterCount).integer().not_null().default(0))
                .add_column_if_not_exists(ColumnDef::new(Planet::BattleshipCount).integer().not_null().default(0))
                .add_column_if_not_exists(ColumnDef::new(Planet::BomberCount).integer().not_null().default(0))
                .add_column_if_not_exists(ColumnDef::new(Planet::DestroyerCount).integer().not_null().default(0))
                .to_owned(),
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop technology columns
        manager.alter_table(
            Table::alter()
                .table(Planet::Table)
                .drop_column(Planet::CombustionDriveLevel)
                .drop_column(Planet::ImpulseDriveLevel)
                .drop_column(Planet::HyperspaceDriveLevel)
                .drop_column(Planet::IonTechLevel)
                .drop_column(Planet::PlasmaTechLevel)
                .drop_column(Planet::ShieldTechLevel)
                .drop_column(Planet::WeaponsTechLevel)
                .drop_column(Planet::ComputerTechLevel)
                .drop_column(Planet::AstrophysicsLevel)
                .drop_column(Planet::LogisticsTechLevel)
                .drop_column(Planet::DeuteriumSynthesizerLevel)
                .to_owned(),
        ).await?;

        // Drop ship columns
        manager.alter_table(
            Table::alter()
                .table(Planet::Table)
                .drop_column(Planet::HeavyHunterCount)
                .drop_column(Planet::BattleshipCount)
                .drop_column(Planet::BomberCount)
                .drop_column(Planet::DestroyerCount)
                .to_owned(),
        ).await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum Planet {
    Table,
    // Technologies - Propulsion
    CombustionDriveLevel,
    ImpulseDriveLevel,
    HyperspaceDriveLevel,
    // Technologies - Combat
    IonTechLevel,
    PlasmaTechLevel,
    ShieldTechLevel,
    WeaponsTechLevel,
    // Technologies - Research
    ComputerTechLevel,
    AstrophysicsLevel,
    LogisticsTechLevel,
    // Building
    DeuteriumSynthesizerLevel,
    // Ships
    HeavyHunterCount,
    BattleshipCount,
    BomberCount,
    DestroyerCount,
}
