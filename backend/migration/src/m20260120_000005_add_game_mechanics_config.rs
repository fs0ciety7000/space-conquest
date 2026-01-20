use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Insérer toutes les configurations de mécaniques de jeu

        // ========== COMBAT STATS ==========
        // Light Hunter
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([60.into(), "combat_light_hunter_attack".into(), "50".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([61.into(), "combat_light_hunter_shield".into(), "10".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([62.into(), "combat_light_hunter_hull".into(), "400".into()])
                .to_owned()
        ).await?;

        // Cruiser
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([63.into(), "combat_cruiser_attack".into(), "400".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([64.into(), "combat_cruiser_shield".into(), "50".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([65.into(), "combat_cruiser_hull".into(), "2700".into()])
                .to_owned()
        ).await?;

        // Missile Launcher
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([66.into(), "combat_missile_launcher_attack".into(), "80".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([67.into(), "combat_missile_launcher_shield".into(), "20".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([68.into(), "combat_missile_launcher_hull".into(), "200".into()])
                .to_owned()
        ).await?;

        // Plasma Turret
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([69.into(), "combat_plasma_turret_attack".into(), "3000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([70.into(), "combat_plasma_turret_shield".into(), "300".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([71.into(), "combat_plasma_turret_hull".into(), "10000".into()])
                .to_owned()
        ).await?;

        // ========== RAPID FIRE ==========
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([72.into(), "combat_rf_cruiser_vs_light_hunter".into(), "6".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([73.into(), "combat_rf_cruiser_vs_missile_launcher".into(), "10".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([74.into(), "combat_rf_plasma_vs_light_hunter".into(), "5".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([75.into(), "combat_rf_plasma_vs_cruiser".into(), "3".into()])
                .to_owned()
        ).await?;

        // ========== TECH BONUSES ==========
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([76.into(), "combat_laser_tech_bonus".into(), "0.1".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([77.into(), "combat_armour_tech_bonus".into(), "0.1".into()])
                .to_owned()
        ).await?;

        // ========== LOOT & PILLAGE ==========
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([78.into(), "combat_loot_percentage".into(), "0.5".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([79.into(), "combat_loot_cap_per_resource".into(), "50000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([80.into(), "combat_debris_percentage".into(), "0.3".into()])
                .to_owned()
        ).await?;

        // ========== CARGO CAPACITIES ==========
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([81.into(), "cargo_light_hunter".into(), "50".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([82.into(), "cargo_cruiser".into(), "800".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([83.into(), "cargo_transporter_base".into(), "10000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([84.into(), "cargo_transporter_bonus_per_hangar".into(), "0.05".into()])
                .to_owned()
        ).await?;

        // ========== EXPEDITION ==========
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([85.into(), "expedition_combat_chance".into(), "0.3".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([86.into(), "expedition_max_rounds".into(), "6".into()])
                .to_owned()
        ).await?;

        // Hunter rewards
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([87.into(), "expedition_hunter_metal_min".into(), "50".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([88.into(), "expedition_hunter_metal_max".into(), "100".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([89.into(), "expedition_hunter_crystal_min".into(), "20".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([90.into(), "expedition_hunter_crystal_max".into(), "50".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([91.into(), "expedition_hunter_deuterium_min".into(), "10".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([92.into(), "expedition_hunter_deuterium_max".into(), "25".into()])
                .to_owned()
        ).await?;

        // Cruiser rewards
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([93.into(), "expedition_cruiser_metal_min".into(), "150".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([94.into(), "expedition_cruiser_metal_max".into(), "250".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([95.into(), "expedition_cruiser_crystal_min".into(), "60".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([96.into(), "expedition_cruiser_crystal_max".into(), "100".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([97.into(), "expedition_cruiser_deuterium_min".into(), "30".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([98.into(), "expedition_cruiser_deuterium_max".into(), "60".into()])
                .to_owned()
        ).await?;

        // Pirate combat
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([99.into(), "expedition_pirate_scaling_min".into(), "0.5".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([100.into(), "expedition_pirate_scaling_max".into(), "1.1".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([101.into(), "expedition_pirate_loot_multiplier".into(), "10".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([102.into(), "expedition_pirate_loot_base".into(), "5000".into()])
                .to_owned()
        ).await?;

        // ========== STRUCTURES & CAPACITIES ==========
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([103.into(), "hangar_capacity_base".into(), "500".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([104.into(), "hangar_capacity_per_level".into(), "500".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([105.into(), "storage_capacity_base".into(), "600000".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([106.into(), "storage_capacity_growth".into(), "1.6".into()])
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("server_config"))
                .columns([Alias::new("id"), Alias::new("config_key"), Alias::new("config_value")])
                .values_panic([107.into(), "slot_bonus_per_slot".into(), "0.5".into()])
                .to_owned()
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Supprimer toutes les configs ajoutées (IDs 60-107)
        for id in 60..=107 {
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
