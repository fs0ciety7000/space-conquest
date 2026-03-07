use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // ==================== INDUSTRIAL TECH ====================
        db.execute_unprepared(
            "INSERT INTO technologies (tech_key, name, category, base_cost_metal, base_cost_crystal, base_cost_deuterium, base_time_seconds, cost_multiplier, research_lab_required, description) \
             VALUES ('industrial_tech', 'Technologie Industrielle', 'research', 5000, 5000, 2000, 7200, 2.0, 5, 'Maîtrise des processus industriels à grande échelle. Permet la construction du Hub Logistique.') \
             ON CONFLICT (tech_key) DO NOTHING"
        ).await?;

        // Industrial Tech requires: Computer 4, Armour 5, Hyperspace 1
        db.execute_unprepared(
            "INSERT INTO technology_requirements (tech_id, required_tech_id, required_level) \
             SELECT t1.id, t2.id, 4 FROM technologies t1, technologies t2 \
             WHERE t1.tech_key = 'industrial_tech' AND t2.tech_key = 'computer_tech' \
             ON CONFLICT DO NOTHING"
        ).await?;
        db.execute_unprepared(
            "INSERT INTO technology_requirements (tech_id, required_tech_id, required_level) \
             SELECT t1.id, t2.id, 5 FROM technologies t1, technologies t2 \
             WHERE t1.tech_key = 'industrial_tech' AND t2.tech_key = 'armour_tech' \
             ON CONFLICT DO NOTHING"
        ).await?;
        db.execute_unprepared(
            "INSERT INTO technology_requirements (tech_id, required_tech_id, required_level) \
             SELECT t1.id, t2.id, 1 FROM technologies t1, technologies t2 \
             WHERE t1.tech_key = 'industrial_tech' AND t2.tech_key = 'hyperspace_tech' \
             ON CONFLICT DO NOTHING"
        ).await?;

        // ==================== LOGISTICS HUB BUILDING ====================
        db.execute_unprepared(
            "INSERT INTO building_types (building_key, name, category, base_cost_metal, base_cost_crystal, base_cost_deuterium, base_time_seconds, cost_multiplier, description) \
             VALUES ('logistics_hub', 'Hub Logistique', 'facility', 80000, 60000, 20000, 86400, 2.0, 'Permet de créer des routes commerciales automatisées. Chaque niveau débloque des emplacements supplémentaires.') \
             ON CONFLICT (building_key) DO NOTHING"
        ).await?;

        // Logistics Hub requires: Hangar 20, Resource Storage 15, Industrial Tech 3
        db.execute_unprepared(
            "INSERT INTO building_requirements (building_type_id, required_building_id, required_level) \
             SELECT b1.id, b2.id, 20 FROM building_types b1, building_types b2 \
             WHERE b1.building_key = 'logistics_hub' AND b2.building_key = 'hangar' \
             ON CONFLICT DO NOTHING"
        ).await?;
        db.execute_unprepared(
            "INSERT INTO building_requirements (building_type_id, required_building_id, required_level) \
             SELECT b1.id, b2.id, 15 FROM building_types b1, building_types b2 \
             WHERE b1.building_key = 'logistics_hub' AND b2.building_key = 'resource_storage' \
             ON CONFLICT DO NOTHING"
        ).await?;
        db.execute_unprepared(
            "INSERT INTO building_requirements (building_type_id, required_tech_id, required_level) \
             SELECT b.id, t.id, 3 FROM building_types b, technologies t \
             WHERE b.building_key = 'logistics_hub' AND t.tech_key = 'industrial_tech' \
             ON CONFLICT DO NOTHING"
        ).await?;

        // ==================== GRAND CARGO SHIP ====================
        // cargo=1000000, speed=5000, attack=50, shield=100, hull=15000
        db.execute_unprepared(
            "INSERT INTO ship_types (ship_key, name, category, base_cost_metal, base_cost_crystal, base_cost_deuterium, build_time_seconds, attack, shield, hull, cargo_capacity, speed, fuel_consumption, shipyard_required, description) \
             VALUES ('grand_cargo', 'Grand Cargo', 'utility', 80000, 40000, 20000, 14400, 50, 100, 15000, 1000000, 5000, 500, 10, 'Cargo massif dédié aux routes commerciales automatisées. Prérequis: Chantier spatial 10, Technologie Industrielle 2.') \
             ON CONFLICT (ship_key) DO NOTHING"
        ).await?;

        // Grand Cargo requires: Shipyard 10, Industrial Tech 2, Hyperspace Drive 3
        db.execute_unprepared(
            "INSERT INTO ship_requirements (ship_type_id, required_tech_id, required_level) \
             SELECT s.id, t.id, 2 FROM ship_types s, technologies t \
             WHERE s.ship_key = 'grand_cargo' AND t.tech_key = 'industrial_tech' \
             ON CONFLICT DO NOTHING"
        ).await?;
        db.execute_unprepared(
            "INSERT INTO ship_requirements (ship_type_id, required_tech_id, required_level) \
             SELECT s.id, t.id, 3 FROM ship_types s, technologies t \
             WHERE s.ship_key = 'grand_cargo' AND t.tech_key = 'hyperspace_drive' \
             ON CONFLICT DO NOTHING"
        ).await?;

        // ==================== TRADE ROUTE TABLE ====================
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("trade_route"))
                    .if_not_exists()
                    .col(ColumnDef::new(Alias::new("id")).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Alias::new("owner_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("name")).string().not_null())
                    .col(ColumnDef::new(Alias::new("source_planet_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("target_planet_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("ship_count")).integer().not_null().default(50))
                    // Ratios 0.0-1.0: what fraction of available resources to transfer
                    .col(ColumnDef::new(Alias::new("metal_ratio")).double().not_null().default(1.0))
                    .col(ColumnDef::new(Alias::new("crystal_ratio")).double().not_null().default(1.0))
                    .col(ColumnDef::new(Alias::new("deuterium_ratio")).double().not_null().default(0.0))
                    .col(ColumnDef::new(Alias::new("is_active")).boolean().not_null().default(true))
                    // 'interval' = every N hours, 'daily' = every day at daily_hour UTC
                    .col(ColumnDef::new(Alias::new("schedule_type")).string().not_null().default("interval"))
                    .col(ColumnDef::new(Alias::new("interval_hours")).integer().not_null().default(24))
                    // 0-23, only used when schedule_type = 'daily'
                    .col(ColumnDef::new(Alias::new("daily_hour")).integer().null())
                    .col(ColumnDef::new(Alias::new("next_run_at")).timestamp().not_null())
                    .col(ColumnDef::new(Alias::new("created_at")).timestamp().not_null())
                    .to_owned(),
            )
            .await?;

        // ==================== TRADE ROUTE LOG TABLE ====================
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("trade_route_log"))
                    .if_not_exists()
                    .col(ColumnDef::new(Alias::new("id")).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Alias::new("trade_route_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("executed_at")).timestamp().not_null())
                    .col(ColumnDef::new(Alias::new("metal_transferred")).double().not_null().default(0.0))
                    .col(ColumnDef::new(Alias::new("crystal_transferred")).double().not_null().default(0.0))
                    .col(ColumnDef::new(Alias::new("deuterium_transferred")).double().not_null().default(0.0))
                    // 'success', 'intercepted', 'no_resources', 'paused'
                    .col(ColumnDef::new(Alias::new("status")).string().not_null().default("success"))
                    // If intercepted: fraction of cargo lost (0.0-1.0)
                    .col(ColumnDef::new(Alias::new("piracy_loss_ratio")).double().null())
                    // Planet name snapshot for display
                    .col(ColumnDef::new(Alias::new("source_planet_name")).string().null())
                    .col(ColumnDef::new(Alias::new("target_planet_name")).string().null())
                    .to_owned(),
            )
            .await?;

        // Indexes
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_trade_route_owner ON trade_route(owner_id)"
        ).await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_trade_route_next_run ON trade_route(next_run_at) WHERE is_active = true"
        ).await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_trade_route_log_route ON trade_route_log(trade_route_id)"
        ).await?;

        // Config keys
        let insert_config = |key: &str, value: &str| -> String {
            format!(
                "INSERT INTO server_config (config_key, config_value) VALUES ('{}', '{}') ON CONFLICT (config_key) DO NOTHING",
                key, value
            )
        };
        db.execute_unprepared(&insert_config("trade_route_interval_hours", "24")).await?;
        db.execute_unprepared(&insert_config("trade_route_piracy_chance", "0.10")).await?;
        // Grand cargo stats (configurable from admin panel)
        db.execute_unprepared(&insert_config("grand_cargo_capacity", "1000000")).await?;
        db.execute_unprepared(&insert_config("grand_cargo_attack", "50")).await?;
        db.execute_unprepared(&insert_config("grand_cargo_shield", "100")).await?;
        db.execute_unprepared(&insert_config("grand_cargo_hull", "15000")).await?;
        db.execute_unprepared(&insert_config("grand_cargo_speed", "5000")).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(Alias::new("trade_route_log")).if_exists().to_owned()).await?;
        manager.drop_table(Table::drop().table(Alias::new("trade_route")).if_exists().to_owned()).await?;
        Ok(())
    }
}
