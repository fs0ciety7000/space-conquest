use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ========== TECH TREE SYSTEM - RELATIONAL ARCHITECTURE ==========

        // Table 1: Technologies (données de référence)
        manager
            .create_table(
                Table::create()
                    .table(Technologies::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Technologies::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Technologies::TechKey)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Technologies::Name).string().not_null())
                    .col(ColumnDef::new(Technologies::Category).string().not_null()) // "weapons", "propulsion", "research", "defense"
                    .col(ColumnDef::new(Technologies::BaseCostMetal).integer().not_null().default(0))
                    .col(ColumnDef::new(Technologies::BaseCostCrystal).integer().not_null().default(0))
                    .col(ColumnDef::new(Technologies::BaseCostDeuterium).integer().not_null().default(0))
                    .col(ColumnDef::new(Technologies::CostMultiplier).double().not_null().default(2.0)) // Exponentiel
                    .col(ColumnDef::new(Technologies::ResearchLabRequired).integer().not_null().default(0))
                    .col(ColumnDef::new(Technologies::Description).text())
                    .col(
                        ColumnDef::new(Technologies::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Table 2: Technology Requirements (dépendances du tech tree)
        manager
            .create_table(
                Table::create()
                    .table(TechnologyRequirements::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TechnologyRequirements::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(TechnologyRequirements::TechId).integer().not_null())
                    .col(ColumnDef::new(TechnologyRequirements::RequiredTechId).integer().not_null())
                    .col(ColumnDef::new(TechnologyRequirements::RequiredLevel).integer().not_null().default(1))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tech_requirements_tech_id")
                            .from(TechnologyRequirements::Table, TechnologyRequirements::TechId)
                            .to(Technologies::Table, Technologies::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tech_requirements_required_tech_id")
                            .from(TechnologyRequirements::Table, TechnologyRequirements::RequiredTechId)
                            .to(Technologies::Table, Technologies::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Index pour performance
        manager
            .create_index(
                Index::create()
                    .name("idx_tech_requirements_tech_id")
                    .table(TechnologyRequirements::Table)
                    .col(TechnologyRequirements::TechId)
                    .to_owned(),
            )
            .await?;

        // Table 3: Planet Technologies (niveaux de tech PAR planète)
        manager
            .create_table(
                Table::create()
                    .table(PlanetTechnologies::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(PlanetTechnologies::PlanetId).uuid().not_null())
                    .col(ColumnDef::new(PlanetTechnologies::TechId).integer().not_null())
                    .col(ColumnDef::new(PlanetTechnologies::Level).integer().not_null().default(0))
                    .col(
                        ColumnDef::new(PlanetTechnologies::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .primary_key(
                        Index::create()
                            .col(PlanetTechnologies::PlanetId)
                            .col(PlanetTechnologies::TechId),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_planet_technologies_planet_id")
                            .from(PlanetTechnologies::Table, PlanetTechnologies::PlanetId)
                            .to(Alias::new("planet"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_planet_technologies_tech_id")
                            .from(PlanetTechnologies::Table, PlanetTechnologies::TechId)
                            .to(Technologies::Table, Technologies::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Index pour performance
        manager
            .create_index(
                Index::create()
                    .name("idx_planet_technologies_planet_id")
                    .table(PlanetTechnologies::Table)
                    .col(PlanetTechnologies::PlanetId)
                    .to_owned(),
            )
            .await?;

        // Table 4: Ship Types (données de référence)
        manager
            .create_table(
                Table::create()
                    .table(ShipTypes::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ShipTypes::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ShipTypes::ShipKey)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(ShipTypes::Name).string().not_null())
                    .col(ColumnDef::new(ShipTypes::Category).string().not_null()) // "combat", "utility", "defense"
                    .col(ColumnDef::new(ShipTypes::BaseCostMetal).integer().not_null().default(0))
                    .col(ColumnDef::new(ShipTypes::BaseCostCrystal).integer().not_null().default(0))
                    .col(ColumnDef::new(ShipTypes::BaseCostDeuterium).integer().not_null().default(0))
                    .col(ColumnDef::new(ShipTypes::Attack).integer().not_null().default(0))
                    .col(ColumnDef::new(ShipTypes::Shield).integer().not_null().default(0))
                    .col(ColumnDef::new(ShipTypes::Hull).integer().not_null().default(0))
                    .col(ColumnDef::new(ShipTypes::CargoCapacity).integer().not_null().default(0))
                    .col(ColumnDef::new(ShipTypes::Speed).integer().not_null().default(0))
                    .col(ColumnDef::new(ShipTypes::FuelConsumption).integer().not_null().default(0))
                    .col(ColumnDef::new(ShipTypes::ShipyardRequired).integer().not_null().default(0))
                    .col(ColumnDef::new(ShipTypes::Description).text())
                    .col(
                        ColumnDef::new(ShipTypes::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Table 5: Ship Requirements (prérequis pour construire un vaisseau)
        manager
            .create_table(
                Table::create()
                    .table(ShipRequirements::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ShipRequirements::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(ShipRequirements::ShipTypeId).integer().not_null())
                    .col(ColumnDef::new(ShipRequirements::RequiredTechId).integer().not_null())
                    .col(ColumnDef::new(ShipRequirements::RequiredLevel).integer().not_null().default(1))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_ship_requirements_ship_type_id")
                            .from(ShipRequirements::Table, ShipRequirements::ShipTypeId)
                            .to(ShipTypes::Table, ShipTypes::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_ship_requirements_tech_id")
                            .from(ShipRequirements::Table, ShipRequirements::RequiredTechId)
                            .to(Technologies::Table, Technologies::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Index pour performance
        manager
            .create_index(
                Index::create()
                    .name("idx_ship_requirements_ship_type_id")
                    .table(ShipRequirements::Table)
                    .col(ShipRequirements::ShipTypeId)
                    .to_owned(),
            )
            .await?;

        // Table 6: Planet Ships (compte de vaisseaux PAR planète)
        manager
            .create_table(
                Table::create()
                    .table(PlanetShips::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(PlanetShips::PlanetId).uuid().not_null())
                    .col(ColumnDef::new(PlanetShips::ShipTypeId).integer().not_null())
                    .col(ColumnDef::new(PlanetShips::Count).integer().not_null().default(0))
                    .col(
                        ColumnDef::new(PlanetShips::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .primary_key(
                        Index::create()
                            .col(PlanetShips::PlanetId)
                            .col(PlanetShips::ShipTypeId),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_planet_ships_planet_id")
                            .from(PlanetShips::Table, PlanetShips::PlanetId)
                            .to(Alias::new("planet"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_planet_ships_ship_type_id")
                            .from(PlanetShips::Table, PlanetShips::ShipTypeId)
                            .to(ShipTypes::Table, ShipTypes::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Index pour performance
        manager
            .create_index(
                Index::create()
                    .name("idx_planet_ships_planet_id")
                    .table(PlanetShips::Table)
                    .col(PlanetShips::PlanetId)
                    .to_owned(),
            )
            .await?;

        // Table 7: Rapid Fire Rules (définitions des rapid fire entre vaisseaux)
        manager
            .create_table(
                Table::create()
                    .table(RapidFireRules::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(RapidFireRules::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(RapidFireRules::AttackerShipTypeId).integer().not_null())
                    .col(ColumnDef::new(RapidFireRules::TargetShipTypeId).integer().not_null())
                    .col(ColumnDef::new(RapidFireRules::RapidFireValue).integer().not_null().default(0))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_rapid_fire_attacker")
                            .from(RapidFireRules::Table, RapidFireRules::AttackerShipTypeId)
                            .to(ShipTypes::Table, ShipTypes::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_rapid_fire_target")
                            .from(RapidFireRules::Table, RapidFireRules::TargetShipTypeId)
                            .to(ShipTypes::Table, ShipTypes::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop tables in reverse order (respect foreign keys)
        manager
            .drop_table(Table::drop().table(RapidFireRules::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(PlanetShips::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(ShipRequirements::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(ShipTypes::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(PlanetTechnologies::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(TechnologyRequirements::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(Technologies::Table).to_owned())
            .await?;

        Ok(())
    }
}

// ========== TABLE DEFINITIONS ==========

#[derive(DeriveIden)]
enum Technologies {
    Table,
    Id,
    TechKey,
    Name,
    Category,
    BaseCostMetal,
    BaseCostCrystal,
    BaseCostDeuterium,
    CostMultiplier,
    ResearchLabRequired,
    Description,
    CreatedAt,
}

#[derive(DeriveIden)]
enum TechnologyRequirements {
    Table,
    Id,
    TechId,
    RequiredTechId,
    RequiredLevel,
}

#[derive(DeriveIden)]
enum PlanetTechnologies {
    Table,
    PlanetId,
    TechId,
    Level,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ShipTypes {
    Table,
    Id,
    ShipKey,
    Name,
    Category,
    BaseCostMetal,
    BaseCostCrystal,
    BaseCostDeuterium,
    Attack,
    Shield,
    Hull,
    CargoCapacity,
    Speed,
    FuelConsumption,
    ShipyardRequired,
    Description,
    CreatedAt,
}

#[derive(DeriveIden)]
enum ShipRequirements {
    Table,
    Id,
    ShipTypeId,
    RequiredTechId,
    RequiredLevel,
}

#[derive(DeriveIden)]
enum PlanetShips {
    Table,
    PlanetId,
    ShipTypeId,
    Count,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum RapidFireRules {
    Table,
    Id,
    AttackerShipTypeId,
    TargetShipTypeId,
    RapidFireValue,
}
