use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ==================== BUILDING TYPES ====================
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("building_types"))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("building_key"))
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Alias::new("name")).string().not_null())
                    .col(ColumnDef::new(Alias::new("category")).string().not_null()) // resource, facility, defense
                    .col(ColumnDef::new(Alias::new("base_cost_metal")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("base_cost_crystal")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("base_cost_deuterium")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("cost_multiplier")).double().not_null())
                    .col(ColumnDef::new(Alias::new("description")).string().null())
                    .col(
                        ColumnDef::new(Alias::new("created_at"))
                            .timestamp()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // ==================== DEFENSE TYPES ====================
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("defense_types"))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("defense_key"))
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Alias::new("name")).string().not_null())
                    .col(ColumnDef::new(Alias::new("category")).string().not_null()) // light, heavy, special
                    .col(ColumnDef::new(Alias::new("base_cost_metal")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("base_cost_crystal")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("base_cost_deuterium")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("build_time_seconds")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("attack")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("shield")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("hull")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("description")).string().null())
                    .col(
                        ColumnDef::new(Alias::new("created_at"))
                            .timestamp()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // ==================== BUILDING REQUIREMENTS ====================
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("building_requirements"))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alias::new("building_type_id")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("required_tech_id")).integer().null())
                    .col(ColumnDef::new(Alias::new("required_building_id")).integer().null())
                    .col(ColumnDef::new(Alias::new("required_level")).integer().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .from(Alias::new("building_requirements"), Alias::new("building_type_id"))
                            .to(Alias::new("building_types"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(Alias::new("building_requirements"), Alias::new("required_tech_id"))
                            .to(Alias::new("technologies"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(Alias::new("building_requirements"), Alias::new("required_building_id"))
                            .to(Alias::new("building_types"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // ==================== DEFENSE REQUIREMENTS ====================
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("defense_requirements"))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alias::new("defense_type_id")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("required_tech_id")).integer().null())
                    .col(ColumnDef::new(Alias::new("required_building_id")).integer().null())
                    .col(ColumnDef::new(Alias::new("required_level")).integer().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .from(Alias::new("defense_requirements"), Alias::new("defense_type_id"))
                            .to(Alias::new("defense_types"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(Alias::new("defense_requirements"), Alias::new("required_tech_id"))
                            .to(Alias::new("technologies"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(Alias::new("defense_requirements"), Alias::new("required_building_id"))
                            .to(Alias::new("building_types"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // ==================== PLANET BUILDINGS ====================
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("planet_buildings"))
                    .if_not_exists()
                    .col(ColumnDef::new(Alias::new("planet_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("building_type_id")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("level")).integer().not_null().default(0))
                    .col(ColumnDef::new(Alias::new("upgrading_to_level")).integer().null())
                    .col(ColumnDef::new(Alias::new("upgrade_end_time")).timestamp().null())
                    .col(
                        ColumnDef::new(Alias::new("updated_at"))
                            .timestamp()
                            .default(Expr::current_timestamp()),
                    )
                    .primary_key(
                        Index::create()
                            .col(Alias::new("planet_id"))
                            .col(Alias::new("building_type_id")),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(Alias::new("planet_buildings"), Alias::new("building_type_id"))
                            .to(Alias::new("building_types"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // ==================== PLANET DEFENSES ====================
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("planet_defenses"))
                    .if_not_exists()
                    .col(ColumnDef::new(Alias::new("planet_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("defense_type_id")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("count")).integer().not_null().default(0))
                    .col(ColumnDef::new(Alias::new("building_count")).integer().null())
                    .col(ColumnDef::new(Alias::new("build_end_time")).timestamp().null())
                    .col(
                        ColumnDef::new(Alias::new("updated_at"))
                            .timestamp()
                            .default(Expr::current_timestamp()),
                    )
                    .primary_key(
                        Index::create()
                            .col(Alias::new("planet_id"))
                            .col(Alias::new("defense_type_id")),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(Alias::new("planet_defenses"), Alias::new("defense_type_id"))
                            .to(Alias::new("defense_types"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Alias::new("planet_defenses")).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Alias::new("planet_buildings")).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Alias::new("defense_requirements")).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Alias::new("building_requirements")).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Alias::new("defense_types")).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Alias::new("building_types")).to_owned())
            .await?;
        Ok(())
    }
}
