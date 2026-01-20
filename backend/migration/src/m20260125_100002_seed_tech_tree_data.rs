use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ========== SEED TECH TREE DATA ==========

        // ==================== TECHNOLOGIES ====================

        // ID 1: Energy Tech (Base)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technologies"))
                .columns([
                    Alias::new("id"), Alias::new("tech_key"), Alias::new("name"),
                    Alias::new("category"), Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"),
                    Alias::new("base_cost_deuterium"), Alias::new("cost_multiplier"), Alias::new("research_lab_required")
                ])
                .values_panic([
                    1.into(), "energy_tech".into(), "Technologie Énergie".into(),
                    "research".into(), 0.into(), 800.into(),
                    400.into(), 2.0.into(), 1.into()
                ])
                .to_owned()
        ).await?;

        // ID 2: Laser Tech
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technologies"))
                .columns([
                    Alias::new("id"), Alias::new("tech_key"), Alias::new("name"),
                    Alias::new("category"), Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"),
                    Alias::new("base_cost_deuterium"), Alias::new("cost_multiplier"), Alias::new("research_lab_required")
                ])
                .values_panic([
                    2.into(), "laser".into(), "Technologie Laser".into(),
                    "weapons".into(), 200.into(), 100.into(),
                    0.into(), 2.0.into(), 1.into()
                ])
                .to_owned()
        ).await?;

        // ID 3: Espionage Tech
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technologies"))
                .columns([
                    Alias::new("id"), Alias::new("tech_key"), Alias::new("name"),
                    Alias::new("category"), Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"),
                    Alias::new("base_cost_deuterium"), Alias::new("cost_multiplier"), Alias::new("research_lab_required")
                ])
                .values_panic([
                    3.into(), "espionage".into(), "Technologie Espionnage".into(),
                    "research".into(), 200.into(), 1000.into(),
                    200.into(), 2.0.into(), 3.into()
                ])
                .to_owned()
        ).await?;

        // ID 4: Armour Tech
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technologies"))
                .columns([
                    Alias::new("id"), Alias::new("tech_key"), Alias::new("name"),
                    Alias::new("category"), Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"),
                    Alias::new("base_cost_deuterium"), Alias::new("cost_multiplier"), Alias::new("research_lab_required")
                ])
                .values_panic([
                    4.into(), "armour".into(), "Technologie Blindage".into(),
                    "defense".into(), 1000.into(), 0.into(),
                    0.into(), 2.0.into(), 2.into()
                ])
                .to_owned()
        ).await?;

        // ID 5: Ion Tech (EXPANSION 2.0)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technologies"))
                .columns([
                    Alias::new("id"), Alias::new("tech_key"), Alias::new("name"),
                    Alias::new("category"), Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"),
                    Alias::new("base_cost_deuterium"), Alias::new("cost_multiplier"), Alias::new("research_lab_required")
                ])
                .values_panic([
                    5.into(), "ion_tech".into(), "Technologie Ion".into(),
                    "weapons".into(), 1000.into(), 300.into(),
                    100.into(), 2.0.into(), 4.into()
                ])
                .to_owned()
        ).await?;

        // ID 6: Plasma Tech (EXPANSION 2.0)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technologies"))
                .columns([
                    Alias::new("id"), Alias::new("tech_key"), Alias::new("name"),
                    Alias::new("category"), Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"),
                    Alias::new("base_cost_deuterium"), Alias::new("cost_multiplier"), Alias::new("research_lab_required")
                ])
                .values_panic([
                    6.into(), "plasma_tech".into(), "Technologie Plasma".into(),
                    "weapons".into(), 2000.into(), 4000.into(),
                    1000.into(), 2.0.into(), 4.into()
                ])
                .to_owned()
        ).await?;

        // ID 7: Shield Tech (EXPANSION 2.0)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technologies"))
                .columns([
                    Alias::new("id"), Alias::new("tech_key"), Alias::new("name"),
                    Alias::new("category"), Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"),
                    Alias::new("base_cost_deuterium"), Alias::new("cost_multiplier"), Alias::new("research_lab_required")
                ])
                .values_panic([
                    7.into(), "shield_tech".into(), "Technologie Bouclier".into(),
                    "defense".into(), 200.into(), 600.into(),
                    0.into(), 2.0.into(), 6.into()
                ])
                .to_owned()
        ).await?;

        // ID 8: Weapons Tech (EXPANSION 2.0)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technologies"))
                .columns([
                    Alias::new("id"), Alias::new("tech_key"), Alias::new("name"),
                    Alias::new("category"), Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"),
                    Alias::new("base_cost_deuterium"), Alias::new("cost_multiplier"), Alias::new("research_lab_required")
                ])
                .values_panic([
                    8.into(), "weapons_tech".into(), "Technologie Armes".into(),
                    "weapons".into(), 800.into(), 200.into(),
                    0.into(), 2.0.into(), 4.into()
                ])
                .to_owned()
        ).await?;

        // ID 9: Computer Tech (EXPANSION 2.0)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technologies"))
                .columns([
                    Alias::new("id"), Alias::new("tech_key"), Alias::new("name"),
                    Alias::new("category"), Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"),
                    Alias::new("base_cost_deuterium"), Alias::new("cost_multiplier"), Alias::new("research_lab_required")
                ])
                .values_panic([
                    9.into(), "computer_tech".into(), "Technologie Informatique".into(),
                    "research".into(), 0.into(), 400.into(),
                    600.into(), 2.0.into(), 1.into()
                ])
                .to_owned()
        ).await?;

        // ID 10: Combustion Drive (EXPANSION 2.0)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technologies"))
                .columns([
                    Alias::new("id"), Alias::new("tech_key"), Alias::new("name"),
                    Alias::new("category"), Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"),
                    Alias::new("base_cost_deuterium"), Alias::new("cost_multiplier"), Alias::new("research_lab_required")
                ])
                .values_panic([
                    10.into(), "combustion_drive".into(), "Réacteur à Combustion".into(),
                    "propulsion".into(), 400.into(), 0.into(),
                    600.into(), 2.0.into(), 1.into()
                ])
                .to_owned()
        ).await?;

        // ID 11: Impulse Drive (EXPANSION 2.0)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technologies"))
                .columns([
                    Alias::new("id"), Alias::new("tech_key"), Alias::new("name"),
                    Alias::new("category"), Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"),
                    Alias::new("base_cost_deuterium"), Alias::new("cost_multiplier"), Alias::new("research_lab_required")
                ])
                .values_panic([
                    11.into(), "impulse_drive".into(), "Propulsion à Impulsion".into(),
                    "propulsion".into(), 2000.into(), 4000.into(),
                    600.into(), 2.0.into(), 2.into()
                ])
                .to_owned()
        ).await?;

        // ID 12: Hyperspace Drive (EXPANSION 2.0)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technologies"))
                .columns([
                    Alias::new("id"), Alias::new("tech_key"), Alias::new("name"),
                    Alias::new("category"), Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"),
                    Alias::new("base_cost_deuterium"), Alias::new("cost_multiplier"), Alias::new("research_lab_required")
                ])
                .values_panic([
                    12.into(), "hyperspace_drive".into(), "Propulsion Hyperespace".into(),
                    "propulsion".into(), 10000.into(), 20000.into(),
                    6000.into(), 2.0.into(), 7.into()
                ])
                .to_owned()
        ).await?;

        // ID 13: Astrophysics (EXPANSION 2.0)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technologies"))
                .columns([
                    Alias::new("id"), Alias::new("tech_key"), Alias::new("name"),
                    Alias::new("category"), Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"),
                    Alias::new("base_cost_deuterium"), Alias::new("cost_multiplier"), Alias::new("research_lab_required")
                ])
                .values_panic([
                    13.into(), "astrophysics".into(), "Astrophysique".into(),
                    "research".into(), 4000.into(), 8000.into(),
                    4000.into(), 2.0.into(), 3.into()
                ])
                .to_owned()
        ).await?;

        // ID 14: Logistics Tech (EXPANSION 2.0)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technologies"))
                .columns([
                    Alias::new("id"), Alias::new("tech_key"), Alias::new("name"),
                    Alias::new("category"), Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"),
                    Alias::new("base_cost_deuterium"), Alias::new("cost_multiplier"), Alias::new("research_lab_required")
                ])
                .values_panic([
                    14.into(), "logistics_tech".into(), "Technologie Logistique".into(),
                    "research".into(), 1000.into(), 1000.into(),
                    1000.into(), 2.0.into(), 1.into()
                ])
                .to_owned()
        ).await?;

        // ==================== TECHNOLOGY REQUIREMENTS ====================

        // Laser Tech requires Energy Tech level 2
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technology_requirements"))
                .columns([Alias::new("tech_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([2.into(), 1.into(), 2.into()]) // laser requires energy_tech lvl 2
                .to_owned()
        ).await?;

        // Ion Tech requires Energy Tech level 4 AND Laser Tech level 5
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technology_requirements"))
                .columns([Alias::new("tech_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([5.into(), 1.into(), 4.into()]) // ion_tech requires energy_tech lvl 4
                .to_owned()
        ).await?;
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technology_requirements"))
                .columns([Alias::new("tech_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([5.into(), 2.into(), 5.into()]) // ion_tech requires laser lvl 5
                .to_owned()
        ).await?;

        // Plasma Tech requires Energy Tech level 8, Laser Tech level 10, Ion Tech level 5
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technology_requirements"))
                .columns([Alias::new("tech_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([6.into(), 1.into(), 8.into()]) // plasma_tech requires energy_tech lvl 8
                .to_owned()
        ).await?;
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technology_requirements"))
                .columns([Alias::new("tech_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([6.into(), 2.into(), 10.into()]) // plasma_tech requires laser lvl 10
                .to_owned()
        ).await?;
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technology_requirements"))
                .columns([Alias::new("tech_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([6.into(), 5.into(), 5.into()]) // plasma_tech requires ion_tech lvl 5
                .to_owned()
        ).await?;

        // Shield Tech requires Energy Tech level 3
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technology_requirements"))
                .columns([Alias::new("tech_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([7.into(), 1.into(), 3.into()]) // shield_tech requires energy_tech lvl 3
                .to_owned()
        ).await?;

        // Combustion Drive requires Energy Tech level 1
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technology_requirements"))
                .columns([Alias::new("tech_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([10.into(), 1.into(), 1.into()]) // combustion_drive requires energy_tech lvl 1
                .to_owned()
        ).await?;

        // Impulse Drive requires Energy Tech level 1
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technology_requirements"))
                .columns([Alias::new("tech_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([11.into(), 1.into(), 1.into()]) // impulse_drive requires energy_tech lvl 1
                .to_owned()
        ).await?;

        // Hyperspace Drive requires Energy Tech level 5 AND Shield Tech level 5
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technology_requirements"))
                .columns([Alias::new("tech_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([12.into(), 1.into(), 5.into()]) // hyperspace_drive requires energy_tech lvl 5
                .to_owned()
        ).await?;
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technology_requirements"))
                .columns([Alias::new("tech_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([12.into(), 7.into(), 5.into()]) // hyperspace_drive requires shield_tech lvl 5
                .to_owned()
        ).await?;

        // Astrophysics requires Espionage level 4 AND Impulse Drive level 3
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technology_requirements"))
                .columns([Alias::new("tech_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([13.into(), 3.into(), 4.into()]) // astrophysics requires espionage lvl 4
                .to_owned()
        ).await?;
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("technology_requirements"))
                .columns([Alias::new("tech_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([13.into(), 11.into(), 3.into()]) // astrophysics requires impulse_drive lvl 3
                .to_owned()
        ).await?;

        // ==================== SHIP TYPES ====================

        // ID 1: Light Hunter (existing)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_types"))
                .columns([
                    Alias::new("id"), Alias::new("ship_key"), Alias::new("name"), Alias::new("category"),
                    Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"), Alias::new("base_cost_deuterium"),
                    Alias::new("attack"), Alias::new("shield"), Alias::new("hull"), Alias::new("cargo_capacity"),
                    Alias::new("speed"), Alias::new("fuel_consumption"), Alias::new("shipyard_required")
                ])
                .values_panic([
                    1.into(), "light_hunter".into(), "Chasseur Léger".into(), "combat".into(),
                    3000.into(), 1000.into(), 0.into(),
                    50.into(), 10.into(), 400.into(), 50.into(),
                    12500.into(), 10.into(), 1.into()
                ])
                .to_owned()
        ).await?;

        // ID 2: Cruiser (existing)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_types"))
                .columns([
                    Alias::new("id"), Alias::new("ship_key"), Alias::new("name"), Alias::new("category"),
                    Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"), Alias::new("base_cost_deuterium"),
                    Alias::new("attack"), Alias::new("shield"), Alias::new("hull"), Alias::new("cargo_capacity"),
                    Alias::new("speed"), Alias::new("fuel_consumption"), Alias::new("shipyard_required")
                ])
                .values_panic([
                    2.into(), "cruiser".into(), "Croiseur".into(), "combat".into(),
                    20000.into(), 7000.into(), 0.into(),
                    400.into(), 50.into(), 2700.into(), 800.into(),
                    15000.into(), 30.into(), 5.into()
                ])
                .to_owned()
        ).await?;

        // ID 3: Heavy Hunter (EXPANSION 2.0)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_types"))
                .columns([
                    Alias::new("id"), Alias::new("ship_key"), Alias::new("name"), Alias::new("category"),
                    Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"), Alias::new("base_cost_deuterium"),
                    Alias::new("attack"), Alias::new("shield"), Alias::new("hull"), Alias::new("cargo_capacity"),
                    Alias::new("speed"), Alias::new("fuel_consumption"), Alias::new("shipyard_required")
                ])
                .values_panic([
                    3.into(), "heavy_hunter".into(), "Chasseur Lourd".into(), "combat".into(),
                    6000.into(), 4000.into(), 1000.into(),
                    150.into(), 25.into(), 1000.into(), 100.into(),
                    10000.into(), 25.into(), 3.into()
                ])
                .to_owned()
        ).await?;

        // ID 4: Battleship (EXPANSION 2.0)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_types"))
                .columns([
                    Alias::new("id"), Alias::new("ship_key"), Alias::new("name"), Alias::new("category"),
                    Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"), Alias::new("base_cost_deuterium"),
                    Alias::new("attack"), Alias::new("shield"), Alias::new("hull"), Alias::new("cargo_capacity"),
                    Alias::new("speed"), Alias::new("fuel_consumption"), Alias::new("shipyard_required")
                ])
                .values_panic([
                    4.into(), "battleship".into(), "Vaisseau de Bataille".into(), "combat".into(),
                    45000.into(), 15000.into(), 5000.into(),
                    1000.into(), 200.into(), 6000.into(), 1500.into(),
                    10000.into(), 50.into(), 7.into()
                ])
                .to_owned()
        ).await?;

        // ID 5: Bomber (EXPANSION 2.0)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_types"))
                .columns([
                    Alias::new("id"), Alias::new("ship_key"), Alias::new("name"), Alias::new("category"),
                    Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"), Alias::new("base_cost_deuterium"),
                    Alias::new("attack"), Alias::new("shield"), Alias::new("hull"), Alias::new("cargo_capacity"),
                    Alias::new("speed"), Alias::new("fuel_consumption"), Alias::new("shipyard_required")
                ])
                .values_panic([
                    5.into(), "bomber".into(), "Bombardier".into(), "combat".into(),
                    50000.into(), 25000.into(), 15000.into(),
                    1000.into(), 500.into(), 7500.into(), 500.into(),
                    4000.into(), 700.into(), 8.into()
                ])
                .to_owned()
        ).await?;

        // ID 6: Destroyer (EXPANSION 2.0)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_types"))
                .columns([
                    Alias::new("id"), Alias::new("ship_key"), Alias::new("name"), Alias::new("category"),
                    Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"), Alias::new("base_cost_deuterium"),
                    Alias::new("attack"), Alias::new("shield"), Alias::new("hull"), Alias::new("cargo_capacity"),
                    Alias::new("speed"), Alias::new("fuel_consumption"), Alias::new("shipyard_required")
                ])
                .values_panic([
                    6.into(), "destroyer".into(), "Destructeur".into(), "combat".into(),
                    60000.into(), 50000.into(), 15000.into(),
                    2000.into(), 500.into(), 11000.into(), 2000.into(),
                    5000.into(), 1000.into(), 9.into()
                ])
                .to_owned()
        ).await?;

        // Utility Ships
        // ID 7: Transporter
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_types"))
                .columns([
                    Alias::new("id"), Alias::new("ship_key"), Alias::new("name"), Alias::new("category"),
                    Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"), Alias::new("base_cost_deuterium"),
                    Alias::new("attack"), Alias::new("shield"), Alias::new("hull"), Alias::new("cargo_capacity"),
                    Alias::new("speed"), Alias::new("fuel_consumption"), Alias::new("shipyard_required")
                ])
                .values_panic([
                    7.into(), "transporter".into(), "Transporteur".into(), "utility".into(),
                    4000.into(), 4000.into(), 0.into(),
                    5.into(), 10.into(), 400.into(), 10000.into(),
                    5000.into(), 50.into(), 2.into()
                ])
                .to_owned()
        ).await?;

        // ID 8: Recycler
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_types"))
                .columns([
                    Alias::new("id"), Alias::new("ship_key"), Alias::new("name"), Alias::new("category"),
                    Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"), Alias::new("base_cost_deuterium"),
                    Alias::new("attack"), Alias::new("shield"), Alias::new("hull"), Alias::new("cargo_capacity"),
                    Alias::new("speed"), Alias::new("fuel_consumption"), Alias::new("shipyard_required")
                ])
                .values_panic([
                    8.into(), "recycler".into(), "Recycleur".into(), "utility".into(),
                    10000.into(), 6000.into(), 0.into(),
                    1.into(), 10.into(), 1600.into(), 20000.into(),
                    2000.into(), 300.into(), 4.into()
                ])
                .to_owned()
        ).await?;

        // ID 9: Spy Probe
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_types"))
                .columns([
                    Alias::new("id"), Alias::new("ship_key"), Alias::new("name"), Alias::new("category"),
                    Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"), Alias::new("base_cost_deuterium"),
                    Alias::new("attack"), Alias::new("shield"), Alias::new("hull"), Alias::new("cargo_capacity"),
                    Alias::new("speed"), Alias::new("fuel_consumption"), Alias::new("shipyard_required")
                ])
                .values_panic([
                    9.into(), "spy_probe".into(), "Sonde Espionnage".into(), "utility".into(),
                    1000.into(), 0.into(), 0.into(),
                    0.into(), 0.into(), 100.into(), 0.into(),
                    100000000.into(), 1.into(), 1.into()
                ])
                .to_owned()
        ).await?;

        // ID 10: Colony Ship
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_types"))
                .columns([
                    Alias::new("id"), Alias::new("ship_key"), Alias::new("name"), Alias::new("category"),
                    Alias::new("base_cost_metal"), Alias::new("base_cost_crystal"), Alias::new("base_cost_deuterium"),
                    Alias::new("attack"), Alias::new("shield"), Alias::new("hull"), Alias::new("cargo_capacity"),
                    Alias::new("speed"), Alias::new("fuel_consumption"), Alias::new("shipyard_required")
                ])
                .values_panic([
                    10.into(), "colony_ship".into(), "Vaisseau de Colonisation".into(), "utility".into(),
                    10000.into(), 20000.into(), 0.into(),
                    50.into(), 100.into(), 3000.into(), 7500.into(),
                    2500.into(), 1000.into(), 4.into()
                ])
                .to_owned()
        ).await?;

        // ==================== SHIP REQUIREMENTS ====================

        // Cruiser requires Energy Tech level 3
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_requirements"))
                .columns([Alias::new("ship_type_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([2.into(), 1.into(), 3.into()]) // cruiser requires energy_tech lvl 3
                .to_owned()
        ).await?;

        // Heavy Hunter requires Armour level 3 AND Impulse Drive level 1
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_requirements"))
                .columns([Alias::new("ship_type_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([3.into(), 4.into(), 3.into()]) // heavy_hunter requires armour lvl 3
                .to_owned()
        ).await?;
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_requirements"))
                .columns([Alias::new("ship_type_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([3.into(), 11.into(), 1.into()]) // heavy_hunter requires impulse_drive lvl 1
                .to_owned()
        ).await?;

        // Battleship requires Hyperspace Drive level 4
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_requirements"))
                .columns([Alias::new("ship_type_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([4.into(), 12.into(), 4.into()]) // battleship requires hyperspace_drive lvl 4
                .to_owned()
        ).await?;

        // Bomber requires Plasma Tech level 5 AND Impulse Drive level 6
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_requirements"))
                .columns([Alias::new("ship_type_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([5.into(), 6.into(), 5.into()]) // bomber requires plasma_tech lvl 5
                .to_owned()
        ).await?;
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_requirements"))
                .columns([Alias::new("ship_type_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([5.into(), 11.into(), 6.into()]) // bomber requires impulse_drive lvl 6
                .to_owned()
        ).await?;

        // Destroyer requires Hyperspace Drive level 6 AND Astrophysics level 5
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_requirements"))
                .columns([Alias::new("ship_type_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([6.into(), 12.into(), 6.into()]) // destroyer requires hyperspace_drive lvl 6
                .to_owned()
        ).await?;
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_requirements"))
                .columns([Alias::new("ship_type_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([6.into(), 13.into(), 5.into()]) // destroyer requires astrophysics lvl 5
                .to_owned()
        ).await?;

        // Spy Probe requires Espionage level 1
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("ship_requirements"))
                .columns([Alias::new("ship_type_id"), Alias::new("required_tech_id"), Alias::new("required_level")])
                .values_panic([9.into(), 3.into(), 1.into()]) // spy_probe requires espionage lvl 1
                .to_owned()
        ).await?;

        // ==================== RAPID FIRE RULES ====================

        // Cruiser RF
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("rapid_fire_rules"))
                .columns([Alias::new("attacker_ship_type_id"), Alias::new("target_ship_type_id"), Alias::new("rapid_fire_value")])
                .values_panic([2.into(), 1.into(), 6.into()]) // cruiser vs light_hunter = 6 RF
                .to_owned()
        ).await?;

        // Heavy Hunter RF
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("rapid_fire_rules"))
                .columns([Alias::new("attacker_ship_type_id"), Alias::new("target_ship_type_id"), Alias::new("rapid_fire_value")])
                .values_panic([3.into(), 9.into(), 5.into()]) // heavy_hunter vs spy_probe = 5 RF
                .to_owned()
        ).await?;

        // Battleship RF
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("rapid_fire_rules"))
                .columns([Alias::new("attacker_ship_type_id"), Alias::new("target_ship_type_id"), Alias::new("rapid_fire_value")])
                .values_panic([4.into(), 1.into(), 4.into()]) // battleship vs light_hunter = 4 RF
                .to_owned()
        ).await?;
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("rapid_fire_rules"))
                .columns([Alias::new("attacker_ship_type_id"), Alias::new("target_ship_type_id"), Alias::new("rapid_fire_value")])
                .values_panic([4.into(), 3.into(), 3.into()]) // battleship vs heavy_hunter = 3 RF
                .to_owned()
        ).await?;

        // Destroyer RF (anti-capital)
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("rapid_fire_rules"))
                .columns([Alias::new("attacker_ship_type_id"), Alias::new("target_ship_type_id"), Alias::new("rapid_fire_value")])
                .values_panic([6.into(), 4.into(), 2.into()]) // destroyer vs battleship = 2 RF
                .to_owned()
        ).await?;
        manager.exec_stmt(
            Query::insert()
                .into_table(Alias::new("rapid_fire_rules"))
                .columns([Alias::new("attacker_ship_type_id"), Alias::new("target_ship_type_id"), Alias::new("rapid_fire_value")])
                .values_panic([6.into(), 5.into(), 5.into()]) // destroyer vs bomber = 5 RF
                .to_owned()
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Clear all data (CASCADE will handle relationships)
        manager.exec_stmt(
            Query::delete()
                .from_table(Alias::new("rapid_fire_rules"))
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::delete()
                .from_table(Alias::new("ship_requirements"))
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::delete()
                .from_table(Alias::new("ship_types"))
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::delete()
                .from_table(Alias::new("technology_requirements"))
                .to_owned()
        ).await?;

        manager.exec_stmt(
            Query::delete()
                .from_table(Alias::new("technologies"))
                .to_owned()
        ).await?;

        Ok(())
    }
}
