use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Créer la table resource_slots
        manager
            .create_table(
                Table::create()
                    .table(ResourceSlots::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ResourceSlots::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(ResourceSlots::PlanetId).uuid().not_null())
                    .col(ColumnDef::new(ResourceSlots::SlotNumber).integer().not_null())
                    .col(ColumnDef::new(ResourceSlots::ResourceType).string().not_null())
                    .col(ColumnDef::new(ResourceSlots::Level).integer().not_null().default(0))
                    .col(ColumnDef::new(ResourceSlots::IsLocked).boolean().not_null().default(false))
                    .col(ColumnDef::new(ResourceSlots::IsActive).boolean().not_null().default(true))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_resource_slots_planet")
                            .from(ResourceSlots::Table, ResourceSlots::PlanetId)
                            .to(Planet::Table, Planet::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Créer un index unique sur (planet_id, slot_number)
        manager
            .create_index(
                Index::create()
                    .name("idx_resource_slots_planet_slot")
                    .table(ResourceSlots::Table)
                    .col(ResourceSlots::PlanetId)
                    .col(ResourceSlots::SlotNumber)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Initialiser les slots pour toutes les planètes existantes
        manager
            .exec_stmt(
                Query::insert()
                    .into_table(ResourceSlots::Table)
                    .columns([
                        ResourceSlots::PlanetId,
                        ResourceSlots::SlotNumber,
                        ResourceSlots::ResourceType,
                        ResourceSlots::Level,
                        ResourceSlots::IsLocked,
                        ResourceSlots::IsActive,
                    ])
                    .select_from(
                        Query::select()
                            .expr(Expr::col((Planet::Table, Planet::Id)))
                            .expr(Expr::val(1))
                            .expr(Expr::val("metal"))
                            .expr(Expr::col((Planet::Table, Planet::MetalMineLevel)))
                            .expr(Expr::val(true))
                            .expr(Expr::val(true))
                            .from(Planet::Table)
                            .to_owned(),
                    )
                    .unwrap()
                    .to_owned(),
            )
            .await?;

        manager
            .exec_stmt(
                Query::insert()
                    .into_table(ResourceSlots::Table)
                    .columns([
                        ResourceSlots::PlanetId,
                        ResourceSlots::SlotNumber,
                        ResourceSlots::ResourceType,
                        ResourceSlots::Level,
                        ResourceSlots::IsLocked,
                        ResourceSlots::IsActive,
                    ])
                    .select_from(
                        Query::select()
                            .expr(Expr::col((Planet::Table, Planet::Id)))
                            .expr(Expr::val(2))
                            .expr(Expr::val("crystal"))
                            .expr(Expr::col((Planet::Table, Planet::CrystalMineLevel)))
                            .expr(Expr::val(true))
                            .expr(Expr::val(true))
                            .from(Planet::Table)
                            .to_owned(),
                    )
                    .unwrap()
                    .to_owned(),
            )
            .await?;

        manager
            .exec_stmt(
                Query::insert()
                    .into_table(ResourceSlots::Table)
                    .columns([
                        ResourceSlots::PlanetId,
                        ResourceSlots::SlotNumber,
                        ResourceSlots::ResourceType,
                        ResourceSlots::Level,
                        ResourceSlots::IsLocked,
                        ResourceSlots::IsActive,
                    ])
                    .select_from(
                        Query::select()
                            .expr(Expr::col((Planet::Table, Planet::Id)))
                            .expr(Expr::val(3))
                            .expr(Expr::val("deuterium"))
                            .expr(Expr::col((Planet::Table, Planet::DeuteriumMineLevel)))
                            .expr(Expr::val(true))
                            .expr(Expr::val(true))
                            .from(Planet::Table)
                            .to_owned(),
                    )
                    .unwrap()
                    .to_owned(),
            )
            .await?;

        manager
            .exec_stmt(
                Query::insert()
                    .into_table(ResourceSlots::Table)
                    .columns([
                        ResourceSlots::PlanetId,
                        ResourceSlots::SlotNumber,
                        ResourceSlots::ResourceType,
                        ResourceSlots::Level,
                        ResourceSlots::IsLocked,
                        ResourceSlots::IsActive,
                    ])
                    .select_from(
                        Query::select()
                            .expr(Expr::col((Planet::Table, Planet::Id)))
                            .expr(Expr::val(4))
                            .expr(Expr::val("energy"))
                            .expr(Expr::col((Planet::Table, Planet::SolarPlantLevel)))
                            .expr(Expr::val(true))
                            .expr(Expr::val(true))
                            .from(Planet::Table)
                            .to_owned(),
                    )
                    .unwrap()
                    .to_owned(),
            )
            .await?;

        // Créer les 4 slots configurables (vides initialement)
        for slot_num in 5..=8 {
            manager
                .exec_stmt(
                    Query::insert()
                        .into_table(ResourceSlots::Table)
                        .columns([
                            ResourceSlots::PlanetId,
                            ResourceSlots::SlotNumber,
                            ResourceSlots::ResourceType,
                            ResourceSlots::Level,
                            ResourceSlots::IsLocked,
                            ResourceSlots::IsActive,
                        ])
                        .select_from(
                            Query::select()
                                .expr(Expr::col((Planet::Table, Planet::Id)))
                                .expr(Expr::val(slot_num))
                                .expr(Expr::val("metal")) // Type par défaut
                                .expr(Expr::val(0))
                                .expr(Expr::val(false))
                                .expr(Expr::val(false)) // Inactifs par défaut
                                .from(Planet::Table)
                                .to_owned(),
                        )
                        .unwrap()
                        .to_owned(),
                )
                .await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(ResourceSlots::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum ResourceSlots {
    Table,
    Id,
    PlanetId,
    SlotNumber,
    ResourceType,
    Level,
    IsLocked,
    IsActive,
}

#[derive(DeriveIden)]
enum Planet {
    Table,
    Id,
    MetalMineLevel,
    CrystalMineLevel,
    DeuteriumMineLevel,
    SolarPlantLevel,
}
