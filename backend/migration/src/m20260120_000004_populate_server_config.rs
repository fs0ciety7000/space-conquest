use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // ==================================================================
        // CONFIGS EXISTANTES (s'assurer qu'elles existent)
        // ==================================================================

        // Speed factor global (déjà existe normalement)
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (1, 'speed_factor', '500.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        // Construction speed multiplier
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (2, 'construction_speed_multiplier', '1.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        // Mining speed multiplier
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (3, 'mining_speed_multiplier', '1.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        // ==================================================================
        // COÛTS DES VAISSEAUX (metal, crystal)
        // ==================================================================

        // Chasseur léger
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (10, 'ship_light_hunter_metal', '3000.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (11, 'ship_light_hunter_crystal', '1000.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        // Croiseur
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (12, 'ship_cruiser_metal', '20000.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (13, 'ship_cruiser_crystal', '7000.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        // Transporteur
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (14, 'ship_transporter_metal', '4000.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (15, 'ship_transporter_crystal', '4000.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        // Recycleur
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (16, 'ship_recycler_metal', '10000.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (17, 'ship_recycler_crystal', '6000.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        // Sonde d'espionnage
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (18, 'ship_spy_probe_metal', '1000.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (19, 'ship_spy_probe_crystal', '0.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        // Vaisseau de colonisation
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (20, 'ship_colony_ship_metal', '10000.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (21, 'ship_colony_ship_crystal', '20000.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        // ==================================================================
        // COÛTS DES DÉFENSES
        // ==================================================================

        // Lanceur de missiles
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (30, 'defense_missile_launcher_metal', '10000.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (31, 'defense_missile_launcher_crystal', '2500.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        // Tourelle plasma
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (32, 'defense_plasma_turret_metal', '50000.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (33, 'defense_plasma_turret_crystal', '50000.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        // ==================================================================
        // FACTEURS DE PRODUCTION DE RESSOURCES
        // ==================================================================

        // Production de base (ratios 3:2:1)
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (40, 'production_metal_base', '30.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (41, 'production_crystal_base', '20.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (42, 'production_deuterium_base', '10.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        // Facteurs de croissance exponentielle
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (43, 'production_metal_growth', '1.1', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (44, 'production_crystal_growth', '1.1', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (45, 'production_deuterium_growth', '1.05', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        // ==================================================================
        // FACTEURS ÉNERGÉTIQUES
        // ==================================================================

        // Production centrale solaire
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (50, 'energy_solar_base', '60.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (51, 'energy_solar_growth', '1.1', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (52, 'energy_tech_bonus', '0.10', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        // Consommation des mines
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (53, 'energy_mine_consumption_base', '10.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (54, 'energy_mine_consumption_growth', '1.1', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (id, config_key, config_value, updated_at)
             VALUES (55, 'energy_deuterium_extra_consumption', '20.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Pas de rollback - les configs peuvent rester en DB
        Ok(())
    }
}
