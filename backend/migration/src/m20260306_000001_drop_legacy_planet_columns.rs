use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

/// Drops all legacy direct columns from the `planet` table.
/// Data was already migrated to relational tables:
///   - Buildings → planet_buildings
///   - Technologies → planet_technologies
///   - Ships → planet_ships
///   - Defenses → planet_defenses
#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let legacy_columns = [
            // Building levels
            "metal_mine_level",
            "crystal_mine_level",
            "deuterium_mine_level",
            "solar_plant_level",
            "shipyard_level",
            "research_lab_level",
            "hangar_level",
            "resource_storage_level",
            // Technology levels
            "energy_tech_level",
            "laser_battery_level",
            "espionage_tech_level",
            "armour_tech_level",
            // Ship counts
            "light_hunter_count",
            "cruiser_count",
            "recycler_count",
            "spy_probe_count",
            "colony_ship_count",
            "transporter_count",
            // Defense counts
            "missile_launcher_count",
            "plasma_turret_count",
            // Legacy construction/pending fields
            "construction_end",
            "construction_type",
            "shipyard_construction_end",
            "pending_fleet_type",
            "pending_fleet_count",
        ];

        for col in legacy_columns {
            // Use IF EXISTS to be safe in case some columns were never added
            let sql = format!(
                "ALTER TABLE planet DROP COLUMN IF EXISTS {}",
                col
            );
            manager.get_connection().execute_unprepared(&sql).await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Re-add dropped columns as nullable (data is gone, but structure is restored)
        let sql = "
            ALTER TABLE planet
                ADD COLUMN IF NOT EXISTS metal_mine_level INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS crystal_mine_level INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS deuterium_mine_level INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS solar_plant_level INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS shipyard_level INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS research_lab_level INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS hangar_level INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS resource_storage_level INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS energy_tech_level INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS laser_battery_level INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS espionage_tech_level INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS armour_tech_level INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS light_hunter_count INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS cruiser_count INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS recycler_count INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS spy_probe_count INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS colony_ship_count INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS transporter_count INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS missile_launcher_count INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS plasma_turret_count INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS construction_end TIMESTAMP NULL,
                ADD COLUMN IF NOT EXISTS construction_type TEXT NULL,
                ADD COLUMN IF NOT EXISTS shipyard_construction_end TIMESTAMP NULL,
                ADD COLUMN IF NOT EXISTS pending_fleet_type TEXT NULL,
                ADD COLUMN IF NOT EXISTS pending_fleet_count INTEGER NULL
        ";
        manager.get_connection().execute_unprepared(sql).await?;
        Ok(())
    }
}
