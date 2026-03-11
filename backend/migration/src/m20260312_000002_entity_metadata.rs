use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ship_types: add ship_class, icon_name, sort_order
        manager.get_connection().execute_unprepared(
            "ALTER TABLE ship_types
             ADD COLUMN IF NOT EXISTS ship_class TEXT NOT NULL DEFAULT '',
             ADD COLUMN IF NOT EXISTS icon_name TEXT NOT NULL DEFAULT '',
             ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;"
        ).await?;

        // building_types: add icon_name, sort_order, max_level
        manager.get_connection().execute_unprepared(
            "ALTER TABLE building_types
             ADD COLUMN IF NOT EXISTS icon_name TEXT NOT NULL DEFAULT '',
             ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0,
             ADD COLUMN IF NOT EXISTS max_level INT;"
        ).await?;

        // defense_types: add icon_name, sort_order
        manager.get_connection().execute_unprepared(
            "ALTER TABLE defense_types
             ADD COLUMN IF NOT EXISTS icon_name TEXT NOT NULL DEFAULT '',
             ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;"
        ).await?;

        // Populate ship_class values
        manager.get_connection().execute_unprepared("
            UPDATE ship_types SET ship_class = CASE ship_key
                WHEN 'light_hunter'      THEN 'Chasseur Léger'
                WHEN 'heavy_hunter'      THEN 'Chasseur Lourd'
                WHEN 'cruiser'           THEN 'Croiseur'
                WHEN 'battleship'        THEN 'Cuirassé'
                WHEN 'bomber'            THEN 'Bombardier'
                WHEN 'destroyer'         THEN 'Destroyer'
                WHEN 'transporter'       THEN 'Cargo Standard'
                WHEN 'large_transporter' THEN 'Cargo Lourd'
                WHEN 'colony_ship'       THEN 'Vaisseau Colonial'
                WHEN 'recycler'          THEN 'Recycleur'
                WHEN 'spy_probe'         THEN 'Sonde Espion'
                WHEN 'solar_satellite'   THEN 'Satellite Solaire'
                ELSE ship_key
            END;
        ").await?;

        // Populate icon_name for ships (lucide icon names)
        manager.get_connection().execute_unprepared("
            UPDATE ship_types SET icon_name = CASE ship_key
                WHEN 'light_hunter'      THEN 'crosshair'
                WHEN 'heavy_hunter'      THEN 'target'
                WHEN 'cruiser'           THEN 'shield'
                WHEN 'battleship'        THEN 'shield-alert'
                WHEN 'bomber'            THEN 'bomb'
                WHEN 'destroyer'         THEN 'flame'
                WHEN 'transporter'       THEN 'package'
                WHEN 'large_transporter' THEN 'container'
                WHEN 'colony_ship'       THEN 'globe'
                WHEN 'recycler'          THEN 'recycle'
                WHEN 'spy_probe'         THEN 'eye'
                WHEN 'solar_satellite'   THEN 'sun'
                ELSE 'star'
            END;
        ").await?;

        // Populate sort_order for ships
        manager.get_connection().execute_unprepared("
            UPDATE ship_types SET sort_order = CASE ship_key
                WHEN 'light_hunter'      THEN 10
                WHEN 'heavy_hunter'      THEN 20
                WHEN 'cruiser'           THEN 30
                WHEN 'battleship'        THEN 40
                WHEN 'bomber'            THEN 50
                WHEN 'destroyer'         THEN 60
                WHEN 'transporter'       THEN 70
                WHEN 'large_transporter' THEN 80
                WHEN 'recycler'          THEN 90
                WHEN 'spy_probe'         THEN 100
                WHEN 'colony_ship'       THEN 110
                WHEN 'solar_satellite'   THEN 120
                ELSE 999
            END;
        ").await?;

        // Populate icon_name for buildings
        manager.get_connection().execute_unprepared("
            UPDATE building_types SET icon_name = CASE building_key
                WHEN 'metal_mine'       THEN 'pickaxe'
                WHEN 'crystal_mine'     THEN 'gem'
                WHEN 'deuterium_mine'   THEN 'droplets'
                WHEN 'solar_plant'      THEN 'sun'
                WHEN 'shipyard'         THEN 'wrench'
                WHEN 'research_lab'     THEN 'flask-conical'
                WHEN 'hangar'           THEN 'warehouse'
                WHEN 'resource_storage' THEN 'database'
                ELSE 'building'
            END;
        ").await?;

        // Populate sort_order for buildings
        manager.get_connection().execute_unprepared("
            UPDATE building_types SET sort_order = CASE building_key
                WHEN 'metal_mine'       THEN 10
                WHEN 'crystal_mine'     THEN 20
                WHEN 'deuterium_mine'   THEN 30
                WHEN 'solar_plant'      THEN 40
                WHEN 'shipyard'         THEN 50
                WHEN 'research_lab'     THEN 60
                WHEN 'hangar'           THEN 70
                WHEN 'resource_storage' THEN 80
                ELSE 999
            END;
        ").await?;

        // max_level for buildings (NULL = unlimited)
        manager.get_connection().execute_unprepared("
            UPDATE building_types SET max_level = 1 WHERE building_key = 'resource_storage';
        ").await?;

        // Populate icon_name for defenses
        manager.get_connection().execute_unprepared("
            UPDATE defense_types SET icon_name = CASE defense_key
                WHEN 'rocket_launcher' THEN 'zap'
                WHEN 'light_laser'     THEN 'scan-line'
                WHEN 'heavy_laser'     THEN 'scan'
                WHEN 'gauss_cannon'    THEN 'circle-dot'
                WHEN 'ion_cannon'      THEN 'activity'
                WHEN 'plasma_turret'   THEN 'sparkles'
                WHEN 'small_shield'    THEN 'shield'
                WHEN 'large_shield'    THEN 'shield-check'
                ELSE 'shield-alert'
            END;
        ").await?;

        // Populate sort_order for defenses
        manager.get_connection().execute_unprepared("
            UPDATE defense_types SET sort_order = CASE defense_key
                WHEN 'rocket_launcher' THEN 10
                WHEN 'light_laser'     THEN 20
                WHEN 'heavy_laser'     THEN 30
                WHEN 'gauss_cannon'    THEN 40
                WHEN 'ion_cannon'      THEN 50
                WHEN 'plasma_turret'   THEN 60
                WHEN 'small_shield'    THEN 70
                WHEN 'large_shield'    THEN 80
                ELSE 999
            END;
        ").await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            "ALTER TABLE ship_types
             DROP COLUMN IF EXISTS ship_class,
             DROP COLUMN IF EXISTS icon_name,
             DROP COLUMN IF EXISTS sort_order;"
        ).await?;
        manager.get_connection().execute_unprepared(
            "ALTER TABLE building_types
             DROP COLUMN IF EXISTS icon_name,
             DROP COLUMN IF EXISTS sort_order,
             DROP COLUMN IF EXISTS max_level;"
        ).await?;
        manager.get_connection().execute_unprepared(
            "ALTER TABLE defense_types
             DROP COLUMN IF EXISTS icon_name,
             DROP COLUMN IF EXISTS sort_order;"
        ).await?;
        Ok(())
    }
}
