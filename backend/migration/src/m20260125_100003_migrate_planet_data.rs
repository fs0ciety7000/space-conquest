use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ========== MIGRATION: Copy existing planet data to relational tables ==========

        // === MIGRATE TECHNOLOGIES ===

        // Energy Tech (id=1)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("planet_technologies"))
                .columns([
                    Alias::new("planet_id"),
                    Alias::new("tech_id"),
                    Alias::new("level"),
                ])
                .select_from(
                    Query::select()
                        .column(Alias::new("id"))
                        .expr(Expr::value(1))
                        .column(Alias::new("energy_tech_level"))
                        .from(Alias::new("planet"))
                        .and_where(Expr::col(Alias::new("energy_tech_level")).gt(0))
                        .to_owned()
                )
                .unwrap()
                .to_owned()
        ).await?;

        // Laser Tech (id=2)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("planet_technologies"))
                .columns([
                    Alias::new("planet_id"),
                    Alias::new("tech_id"),
                    Alias::new("level"),
                ])
                .select_from(
                    Query::select()
                        .column(Alias::new("id"))
                        .expr(Expr::value(2))
                        .column(Alias::new("laser_tech_level"))
                        .from(Alias::new("planet"))
                        .and_where(Expr::col(Alias::new("laser_tech_level")).gt(0))
                        .to_owned()
                )
                .unwrap()
                .to_owned()
        ).await?;

        // Espionage Tech (id=3)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("planet_technologies"))
                .columns([
                    Alias::new("planet_id"),
                    Alias::new("tech_id"),
                    Alias::new("level"),
                ])
                .select_from(
                    Query::select()
                        .column(Alias::new("id"))
                        .expr(Expr::value(3))
                        .column(Alias::new("espionage_tech_level"))
                        .from(Alias::new("planet"))
                        .and_where(Expr::col(Alias::new("espionage_tech_level")).gt(0))
                        .to_owned()
                )
                .unwrap()
                .to_owned()
        ).await?;

        // Armour Tech (id=4)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("planet_technologies"))
                .columns([
                    Alias::new("planet_id"),
                    Alias::new("tech_id"),
                    Alias::new("level"),
                ])
                .select_from(
                    Query::select()
                        .column(Alias::new("id"))
                        .expr(Expr::value(4))
                        .column(Alias::new("armour_tech_level"))
                        .from(Alias::new("planet"))
                        .and_where(Expr::col(Alias::new("armour_tech_level")).gt(0))
                        .to_owned()
                )
                .unwrap()
                .to_owned()
        ).await?;

        // Ion Tech (id=5) - new tech, should be 0 for all planets
        // No migration needed as it doesn't exist in old schema

        // Plasma Tech (id=6) - new tech, should be 0 for all planets
        // No migration needed as it doesn't exist in old schema

        // Shield Tech (id=7) - new tech, should be 0 for all planets
        // No migration needed as it doesn't exist in old schema

        // Weapons Tech (id=8) - new tech, should be 0 for all planets
        // No migration needed as it doesn't exist in old schema

        // Computer Tech (id=9) - new tech, should be 0 for all planets
        // No migration needed as it doesn't exist in old schema

        // Combustion Drive (id=10) - new tech, should be 0 for all planets
        // No migration needed as it doesn't exist in old schema

        // Impulse Drive (id=11) - new tech, should be 0 for all planets
        // No migration needed as it doesn't exist in old schema

        // Hyperspace Drive (id=12) - new tech, should be 0 for all planets
        // No migration needed as it doesn't exist in old schema

        // Astrophysics (id=13) - new tech, should be 0 for all planets
        // No migration needed as it doesn't exist in old schema

        // === MIGRATE SHIPS ===

        // Light Hunter (id=1)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("planet_ships"))
                .columns([
                    Alias::new("planet_id"),
                    Alias::new("ship_type_id"),
                    Alias::new("count"),
                ])
                .select_from(
                    Query::select()
                        .column(Alias::new("id"))
                        .expr(Expr::value(1))
                        .column(Alias::new("light_hunter_count"))
                        .from(Alias::new("planet"))
                        .and_where(Expr::col(Alias::new("light_hunter_count")).gt(0))
                        .to_owned()
                )
                .unwrap()
                .to_owned()
        ).await?;

        // Cruiser (id=2)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("planet_ships"))
                .columns([
                    Alias::new("planet_id"),
                    Alias::new("ship_type_id"),
                    Alias::new("count"),
                ])
                .select_from(
                    Query::select()
                        .column(Alias::new("id"))
                        .expr(Expr::value(2))
                        .column(Alias::new("cruiser_count"))
                        .from(Alias::new("planet"))
                        .and_where(Expr::col(Alias::new("cruiser_count")).gt(0))
                        .to_owned()
                )
                .unwrap()
                .to_owned()
        ).await?;

        // Heavy Hunter (id=3) - new ship, should be 0 for all planets
        // No migration needed as it doesn't exist in old schema

        // Battleship (id=4) - new ship, should be 0 for all planets
        // No migration needed as it doesn't exist in old schema

        // Bomber (id=5) - new ship, should be 0 for all planets
        // No migration needed as it doesn't exist in old schema

        // Destroyer (id=6) - new ship, should be 0 for all planets
        // No migration needed as it doesn't exist in old schema

        // Recycler (id=7)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("planet_ships"))
                .columns([
                    Alias::new("planet_id"),
                    Alias::new("ship_type_id"),
                    Alias::new("count"),
                ])
                .select_from(
                    Query::select()
                        .column(Alias::new("id"))
                        .expr(Expr::value(7))
                        .column(Alias::new("recycler_count"))
                        .from(Alias::new("planet"))
                        .and_where(Expr::col(Alias::new("recycler_count")).gt(0))
                        .to_owned()
                )
                .unwrap()
                .to_owned()
        ).await?;

        // Spy Probe (id=8)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("planet_ships"))
                .columns([
                    Alias::new("planet_id"),
                    Alias::new("ship_type_id"),
                    Alias::new("count"),
                ])
                .select_from(
                    Query::select()
                        .column(Alias::new("id"))
                        .expr(Expr::value(8))
                        .column(Alias::new("spy_probe_count"))
                        .from(Alias::new("planet"))
                        .and_where(Expr::col(Alias::new("spy_probe_count")).gt(0))
                        .to_owned()
                )
                .unwrap()
                .to_owned()
        ).await?;

        // Colony Ship (id=9)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("planet_ships"))
                .columns([
                    Alias::new("planet_id"),
                    Alias::new("ship_type_id"),
                    Alias::new("count"),
                ])
                .select_from(
                    Query::select()
                        .column(Alias::new("id"))
                        .expr(Expr::value(9))
                        .column(Alias::new("colony_ship_count"))
                        .from(Alias::new("planet"))
                        .and_where(Expr::col(Alias::new("colony_ship_count")).gt(0))
                        .to_owned()
                )
                .unwrap()
                .to_owned()
        ).await?;

        // Transporter (id=10)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("planet_ships"))
                .columns([
                    Alias::new("planet_id"),
                    Alias::new("ship_type_id"),
                    Alias::new("count"),
                ])
                .select_from(
                    Query::select()
                        .column(Alias::new("id"))
                        .expr(Expr::value(10))
                        .column(Alias::new("transporter_count"))
                        .from(Alias::new("planet"))
                        .and_where(Expr::col(Alias::new("transporter_count")).gt(0))
                        .to_owned()
                )
                .unwrap()
                .to_owned()
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Delete all migrated data from relational tables
        manager.exec_stmt(
            Query::delete()
                .from_table(Alias::new("planet_technologies"))
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::delete()
                .from_table(Alias::new("planet_ships"))
                .to_owned()
        ).await?;

        Ok(())
    }
}
