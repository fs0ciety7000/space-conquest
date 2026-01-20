use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ========== EXPANSION 2.0: CONFIG KEYS ==========

        // ===== ENERGY SYSTEM =====
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([108.into(), "energy_prod_solar_base".into(), "20".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([109.into(), "energy_cons_metal".into(), "10".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([110.into(), "energy_cons_crystal".into(), "10".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([111.into(), "energy_cons_deuterium".into(), "20".into()])
                .to_owned()
        ).await?;

        // ===== TECH BONUSES =====
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([112.into(), "tech_bonus_cargo".into(), "0.05".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([113.into(), "tech_bonus_plasma_prod".into(), "0.01".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([114.into(), "tech_bonus_shield".into(), "0.1".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([115.into(), "tech_bonus_weapons".into(), "0.1".into()])
                .to_owned()
        ).await?;

        // ===== HEAVY HUNTER (Chasseur Lourd) =====
        // Costs
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([116.into(), "cost_heavy_hunter_metal".into(), "6000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([117.into(), "cost_heavy_hunter_crystal".into(), "4000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([118.into(), "cost_heavy_hunter_deuterium".into(), "1000".into()])
                .to_owned()
        ).await?;

        // Stats
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([119.into(), "combat_heavy_hunter_attack".into(), "150".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([120.into(), "combat_heavy_hunter_shield".into(), "25".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([121.into(), "combat_heavy_hunter_hull".into(), "1000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([122.into(), "cargo_heavy_hunter".into(), "100".into()])
                .to_owned()
        ).await?;

        // ===== BATTLESHIP (Vaisseau de Bataille) =====
        // Costs
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([123.into(), "cost_battleship_metal".into(), "45000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([124.into(), "cost_battleship_crystal".into(), "15000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([125.into(), "cost_battleship_deuterium".into(), "5000".into()])
                .to_owned()
        ).await?;

        // Stats
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([126.into(), "combat_battleship_attack".into(), "1000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([127.into(), "combat_battleship_shield".into(), "200".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([128.into(), "combat_battleship_hull".into(), "6000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([129.into(), "cargo_battleship".into(), "1500".into()])
                .to_owned()
        ).await?;

        // ===== BOMBER (Bombardier) =====
        // Costs
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([130.into(), "cost_bomber_metal".into(), "50000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([131.into(), "cost_bomber_crystal".into(), "25000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([132.into(), "cost_bomber_deuterium".into(), "15000".into()])
                .to_owned()
        ).await?;

        // Stats
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([133.into(), "combat_bomber_attack".into(), "1000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([134.into(), "combat_bomber_shield".into(), "500".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([135.into(), "combat_bomber_hull".into(), "7500".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([136.into(), "cargo_bomber".into(), "500".into()])
                .to_owned()
        ).await?;

        // ===== DESTROYER (Destructeur) =====
        // Costs
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([137.into(), "cost_destroyer_metal".into(), "60000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([138.into(), "cost_destroyer_crystal".into(), "50000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([139.into(), "cost_destroyer_deuterium".into(), "15000".into()])
                .to_owned()
        ).await?;

        // Stats
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([140.into(), "combat_destroyer_attack".into(), "2000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([141.into(), "combat_destroyer_shield".into(), "500".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([142.into(), "combat_destroyer_hull".into(), "11000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([143.into(), "cargo_destroyer".into(), "2000".into()])
                .to_owned()
        ).await?;

        // ===== RAPID FIRE (NEW SHIPS) =====
        // Heavy Hunter RF
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([144.into(), "combat_rf_heavy_hunter_vs_spy_probe".into(), "5".into()])
                .to_owned()
        ).await?;

        // Battleship RF
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([145.into(), "combat_rf_battleship_vs_light_hunter".into(), "4".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([146.into(), "combat_rf_battleship_vs_heavy_hunter".into(), "3".into()])
                .to_owned()
        ).await?;

        // Bomber RF (vs defenses)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([147.into(), "combat_rf_bomber_vs_missile_launcher".into(), "20".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([148.into(), "combat_rf_bomber_vs_plasma_turret".into(), "10".into()])
                .to_owned()
        ).await?;

        // Destroyer RF (anti-bomber)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([149.into(), "combat_rf_destroyer_vs_battleship".into(), "2".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([150.into(), "combat_rf_destroyer_vs_bomber".into(), "5".into()])
                .to_owned()
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Delete all configs added (IDs 108-150)
        for id in 108..=150 {
            manager.exec_stmt(
                Query::delete()
                    .from_table(Alias::new("server_config"))
                    .and_where(Expr::col(Alias::new("id")).eq(id))
                    .to_owned()
            ).await?;
        }

        Ok(())
    }
}
