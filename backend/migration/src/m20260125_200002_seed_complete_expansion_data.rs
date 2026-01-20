use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // ==================== CLEAR EXISTING DATA ====================
        // Delete existing data from previous migrations to avoid conflicts
        // Order matters due to foreign key constraints
        db.execute_unprepared("DELETE FROM defense_requirements WHERE 1=1").await.ok();
        db.execute_unprepared("DELETE FROM building_requirements WHERE 1=1").await.ok();
        db.execute_unprepared("DELETE FROM ship_requirements WHERE 1=1").await.ok();
        db.execute_unprepared("DELETE FROM technology_requirements WHERE 1=1").await.ok();
        db.execute_unprepared("DELETE FROM rapid_fire_rules WHERE 1=1").await.ok();
        db.execute_unprepared("DELETE FROM planet_ships WHERE 1=1").await.ok();
        db.execute_unprepared("DELETE FROM planet_technologies WHERE 1=1").await.ok();
        db.execute_unprepared("DELETE FROM planet_buildings WHERE 1=1").await.ok();
        db.execute_unprepared("DELETE FROM planet_defenses WHERE 1=1").await.ok();
        db.execute_unprepared("DELETE FROM defense_types WHERE 1=1").await.ok();
        db.execute_unprepared("DELETE FROM building_types WHERE 1=1").await.ok();
        db.execute_unprepared("DELETE FROM ship_types WHERE 1=1").await.ok();
        db.execute_unprepared("DELETE FROM technologies WHERE 1=1").await.ok();

        // Reset sequences to start from 1
        db.execute_unprepared("ALTER SEQUENCE IF EXISTS technologies_id_seq RESTART WITH 1").await.ok();
        db.execute_unprepared("ALTER SEQUENCE IF EXISTS ship_types_id_seq RESTART WITH 1").await.ok();
        db.execute_unprepared("ALTER SEQUENCE IF EXISTS building_types_id_seq RESTART WITH 1").await.ok();
        db.execute_unprepared("ALTER SEQUENCE IF EXISTS defense_types_id_seq RESTART WITH 1").await.ok();

        // ==================== TECHNOLOGIES ====================
        // Base de données complète des technologies du jeu

        let technologies = vec![
            // === ÉNERG IES & RESSOURCES ===
            ("energy_tech", "Technologie Énergie", "energy", 0, 800, 400, 2.0, 1, "Améliore la production d'énergie des centrales solaires"),
            ("laser_tech", "Technologie Laser", "weapons", 200, 100, 0, 2.0, 1, "Technologie de base pour les armes à énergie"),
            ("ion_tech", "Technologie Ions", "weapons", 1000, 300, 100, 2.0, 4, "Technologie avancée d'armes ioniques"),
            ("plasma_tech", "Technologie Plasma", "weapons", 2000, 4000, 1000, 2.0, 4, "Technologie ultra-avancée d'armes plasma"),

            // === BOUCLIERS ===
            ("shield_tech", "Technologie Bouclier", "defense", 200, 600, 0, 2.0, 6, "Technologie de boucliers énergétiques"),

            // === ARMURE ===
            ("armour_tech", "Technologie Armure", "defense", 1000, 0, 0, 2.0, 2, "Améliore la résistance des coques de vaisseaux"),

            // === PROPULSION ===
            ("combustion_drive", "Réacteur à Combustion", "propulsion", 400, 0, 600, 2.0, 1, "Propulsion chimique de base"),
            ("impulse_drive", "Réacteur à Impulsion", "propulsion", 2000, 4000, 600, 2.0, 1, "Propulsion à impulsion avancée"),
            ("hyperspace_drive", "Propulseur Hyperespace", "propulsion", 10000, 20000, 6000, 2.0, 7, "Permet les voyages interstellaires rapides"),

            // === ESPIONNAGE & COMPUTER ===
            ("espionage_tech", "Technologie Espionnage", "research", 200, 1000, 200, 2.0, 3, "Améliore les capacités de reconnaissance"),
            ("computer_tech", "Technologie Ordinateur", "research", 0, 400, 600, 2.0, 1, "Améliore la gestion de flotte"),

            // === ASTROPHYSIQUE ===
            ("astrophysics", "Astrophysique", "research", 4000, 8000, 4000, 1.75, 3, "Permet de coloniser plus de planètes"),

            // === ARMES AVANCÉES ===
            ("weapons_tech", "Technologie Armement", "weapons", 800, 200, 0, 2.0, 4, "Améliore la puissance de feu générale"),
            ("hyperspace_tech", "Technologie Hyperespace", "research", 0, 4000, 2000, 2.0, 7, "Recherches sur l'hyperespace"),
            ("graviton_tech", "Technologie Graviton", "research", 0, 0, 0, 3.0, 1, "Technologie expérimentale de manipulation gravitationnelle"),
        ];

        for (key, name, category, metal, crystal, deut, mult, lab_req, desc) in technologies {
            let time = ((metal + crystal) as f64 / 2500.0 * 3600.0) as i32;
            db.execute_unprepared(&format!(
                "INSERT INTO technologies (tech_key, name, category, base_cost_metal, base_cost_crystal, base_cost_deuterium, base_time_seconds, cost_multiplier, research_lab_required, description) \
                 VALUES ('{}', '{}', '{}', {}, {}, {}, {}, {}, {}, '{}') ON CONFLICT (tech_key) DO NOTHING",
                key, name.replace("'", "''"), category, metal, crystal, deut, time, mult, lab_req, desc.replace("'", "''")
            )).await?;
        }

        // ==================== TECHNOLOGY REQUIREMENTS ====================
        let tech_reqs: Vec<(&str, &str, i32)> = vec![
            // Ion Tech requires Laser Tech 5 + Energy Tech 4
            ("ion_tech", "laser_tech", 5),
            ("ion_tech", "energy_tech", 4),

            // Plasma requires Ion 5 + Energy 8
            ("plasma_tech", "ion_tech", 5),
            ("plasma_tech", "energy_tech", 8),

            // Shields require Energy 3
            ("shield_tech", "energy_tech", 3),

            // Impulse Drive requires Energy 1
            ("impulse_drive", "energy_tech", 1),

            // Hyperspace Drive requires Hyperspace Tech 3 + Impulse 5
            ("hyperspace_drive", "hyperspace_tech", 3),
            ("hyperspace_drive", "impulse_drive", 5),

            // Computer requires nothing (base tech)
            // Espionage requires Computer 1
            ("espionage_tech", "computer_tech", 1),

            // Weapons requires Energy 4
            ("weapons_tech", "energy_tech", 4),

            // Hyperspace Tech requires Energy 5 + Shield 5
            ("hyperspace_tech", "energy_tech", 5),
            ("hyperspace_tech", "shield_tech", 5),

            // Astrophysics requires Impulse 3 + Espionage 4 + Computer 4
            ("astrophysics", "impulse_drive", 3),
            ("astrophysics", "espionage_tech", 4),
            ("astrophysics", "computer_tech", 3),

            // Graviton requires Hyperspace Drive 1 + Hyperspace Tech 3
            ("graviton_tech", "hyperspace_drive", 1),
            ("graviton_tech", "hyperspace_tech", 3),
        ];

        for (tech_key, req_key, level) in tech_reqs {
            db.execute_unprepared(&format!(
                "INSERT INTO technology_requirements (tech_id, required_tech_id, required_level) \
                 SELECT t1.id, t2.id, {} FROM technologies t1, technologies t2 \
                 WHERE t1.tech_key = '{}' AND t2.tech_key = '{}' \
                 ON CONFLICT DO NOTHING",
                level, tech_key, req_key
            )).await?;
        }

        // ==================== SHIP TYPES (Extended) ====================
        let ships = vec![
            // Combat Ships
            ("light_hunter", "Chasseur Léger", "fighter", 3000, 1000, 0, 10, 50, 400, 0, 12500, 10, 1),
            ("heavy_hunter", "Chasseur Lourd", "fighter", 6000, 4000, 0, 25, 150, 800, 50, 10000, 25, 3),
            ("cruiser", "Croiseur", "combat", 20000, 7000, 2000, 400, 50, 2700, 800, 15000, 300, 4),
            ("battleship", "Vaisseau de Guerre", "combat", 45000, 15000, 0, 1000, 200, 6000, 1500, 10000, 500, 7),
            ("destroyer", "Destructeur", "combat", 60000, 50000, 15000, 2000, 500, 11000, 2000, 50000, 1000, 6),
            ("bomber", "Bombardier", "special", 50000, 25000, 15000, 1000, 75, 7500, 500, 5000, 700, 8),
            ("deathstar", "Étoile de la Mort", "ultimate", 5000000, 4000000, 1000000, 200000, 1000, 9000000, 50000, 1000000, 1, 12),

            // Utility Ships
            ("spy_probe", "Sonde Espionnage", "utility", 0, 1000, 0, 5, 0, 100, 0, 100000000, 1, 3),
            ("transporter", "Transporteur", "utility", 4000, 4000, 0, 5, 10, 400, 5000, 5000, 50, 2),
            ("colony_ship", "Vaisseau de Colonisation", "utility", 10000, 20000, 10000, 2500, 50, 3000, 7500, 2500, 1, 4),
            ("recycler", "Recycleur", "utility", 10000, 6000, 2000, 1000, 10, 1600, 20000, 2000, 1, 6),
        ];

        for (key, name, category, metal, crystal, deut, attack, shield, hull, cargo, speed, fuel, shipyard) in ships {
            let time = ((metal + crystal) as f64 / 2500.0 * 3600.0) as i32;
            db.execute_unprepared(&format!(
                "INSERT INTO ship_types (ship_key, name, category, base_cost_metal, base_cost_crystal, base_cost_deuterium, build_time_seconds, attack, shield, hull, cargo_capacity, speed, fuel_consumption, shipyard_required, description) \
                 VALUES ('{}', '{}', '{}', {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, 'Vaisseau de combat spatial') ON CONFLICT (ship_key) DO NOTHING",
                key, name.replace("'", "''"), category, metal, crystal, deut, time, attack, shield, hull, cargo, speed, fuel, shipyard
            )).await?;
        }

        // ==================== SHIP REQUIREMENTS ====================
        let ship_reqs: Vec<(&str, Option<&str>, Option<&str>, i32)> = vec![
            // Light Hunter: Combustion 1 + Shipyard 1
            ("light_hunter", Some("combustion_drive"), None, 1),

            // Heavy Hunter: Impulse 2 + Armour 2
            ("heavy_hunter", Some("impulse_drive"), None, 2),
            ("heavy_hunter", Some("armour_tech"), None, 2),

            // Cruiser: Ion Tech 2 + Impulse 4
            ("cruiser", Some("ion_tech"), None, 2),
            ("cruiser", Some("impulse_drive"), None, 4),

            // Battleship: Hyperspace Drive 4 + Weapons Tech 6
            ("battleship", Some("hyperspace_drive"), None, 4),
            ("battleship", Some("weapons_tech"), None, 6),

            // Destroyer: Hyperspace 6 + Weapons 10
            ("destroyer", Some("hyperspace_drive"), None, 6),
            ("destroyer", Some("weapons_tech"), None, 10),

            // Bomber: Plasma 5 + Impulse 6
            ("bomber", Some("plasma_tech"), None, 5),
            ("bomber", Some("impulse_drive"), None, 6),

            // Deathstar: Hyperspace 7 + Hyperspace Tech 6 + Graviton 1
            ("deathstar", Some("hyperspace_drive"), None, 7),
            ("deathstar", Some("hyperspace_tech"), None, 6),
            ("deathstar", Some("graviton_tech"), None, 1),

            // Spy Probe: Combustion 3 + Espionage 2
            ("spy_probe", Some("combustion_drive"), None, 3),
            ("spy_probe", Some("espionage_tech"), None, 2),

            // Transporter: Combustion 2
            ("transporter", Some("combustion_drive"), None, 2),

            // Colony Ship: Impulse 3
            ("colony_ship", Some("impulse_drive"), None, 3),

            // Recycler: Combustion 6 + Shield 2
            ("recycler", Some("combustion_drive"), None, 6),
            ("recycler", Some("shield_tech"), None, 2),
        ];

        for (ship_key, tech_key, _building_key, level) in ship_reqs {
            if let Some(tech) = tech_key {
                db.execute_unprepared(&format!(
                    "INSERT INTO ship_requirements (ship_type_id, required_tech_id, required_level) \
                     SELECT s.id, t.id, {} FROM ship_types s, technologies t \
                     WHERE s.ship_key = '{}' AND t.tech_key = '{}' \
                     ON CONFLICT DO NOTHING",
                    level, ship_key, tech
                )).await?;
            }
        }

        // ==================== BUILDING TYPES ====================
        let buildings = vec![
            // Resource Buildings
            ("metal_mine", "Mine de Métal", "resource", 60, 15, 0, 1.5, "Extrait le métal des astéroïdes"),
            ("crystal_mine", "Mine de Cristal", "resource", 48, 24, 0, 1.6, "Collecte les cristaux précieux"),
            ("deuterium_mine", "Synthétiseur de Deutérium", "resource", 225, 75, 0, 1.5, "Produit du deutérium"),
            ("solar_plant", "Centrale Solaire", "resource", 75, 30, 0, 1.5, "Génère de l'énergie"),
            ("fusion_plant", "Centrale à Fusion", "resource", 900, 360, 180, 1.8, "Centrale énergétique avancée"),

            // Facilities
            ("research_lab", "Laboratoire de Recherche", "facility", 200, 400, 200, 2.0, "Permet les recherches technologiques"),
            ("shipyard", "Chantier Spatial", "facility", 400, 200, 100, 2.0, "Construit des vaisseaux"),
            ("hangar", "Hangar", "facility", 200, 0, 50, 2.0, "Stocke les vaisseaux"),
            ("resource_storage", "Stockage de Ressources", "facility", 1000, 0, 0, 2.0, "Augmente la capacité de stockage"),
            ("alliance_depot", "Dépôt d'Alliance", "facility", 20000, 40000, 0, 2.0, "Permet le ravitaillement allié"),
            ("missile_silo", "Silo à Missiles", "facility", 20000, 20000, 1000, 2.0, "Lance des missiles interplanétaires"),
            ("nanite_factory", "Usine de Nanites", "facility", 1000000, 500000, 100000, 2.0, "Accélère toutes les constructions"),
            ("terraformer", "Terraformeur", "facility", 0, 50000, 100000, 2.0, "Augmente les cases de construction"),
        ];

        for (key, name, category, metal, crystal, deut, mult, desc) in buildings {
            let time = ((metal + crystal) as f64 / 2500.0 * 3600.0) as i32;
            db.execute_unprepared(&format!(
                "INSERT INTO building_types (building_key, name, category, base_cost_metal, base_cost_crystal, base_cost_deuterium, base_time_seconds, cost_multiplier, description) \
                 VALUES ('{}', '{}', '{}', {}, {}, {}, {}, {}, '{}') ON CONFLICT (building_key) DO NOTHING",
                key, name.replace("'", "''"), category, metal, crystal, deut, time, mult, desc.replace("'", "''")
            )).await?;
        }

        // ==================== BUILDING REQUIREMENTS ====================
        let building_reqs: Vec<(&str, Option<&str>, Option<&str>, i32)> = vec![
            // Fusion Plant requires Deuterium Mine 5 + Energy Tech 3
            ("fusion_plant", Some("energy_tech"), None, 3),

            // Research Lab requires nothing (base)

            // Shipyard requires nothing (base)

            // Hangar requires Shipyard 1
            ("hangar", None, Some("shipyard"), 2),

            // Alliance Depot requires nothing special

            // Missile Silo requires Shipyard 1
            ("missile_silo", None, Some("shipyard"), 1),

            // Nanite Factory requires Computer 10 + Shipyard 10
            ("nanite_factory", Some("computer_tech"), None, 10),
            ("nanite_factory", None, Some("shipyard"), 10),

            // Terraformer requires Energy Tech 12
            ("terraformer", Some("energy_tech"), None, 12),
        ];

        for (building_key, tech_key, dep_building_key, level) in building_reqs {
            if let Some(tech) = tech_key {
                db.execute_unprepared(&format!(
                    "INSERT INTO building_requirements (building_type_id, required_tech_id, required_level) \
                     SELECT b.id, t.id, {} FROM building_types b, technologies t \
                     WHERE b.building_key = '{}' AND t.tech_key = '{}' \
                     ON CONFLICT DO NOTHING",
                    level, building_key, tech
                )).await?;
            }
            if let Some(dep_building) = dep_building_key {
                db.execute_unprepared(&format!(
                    "INSERT INTO building_requirements (building_type_id, required_building_id, required_level) \
                     SELECT b1.id, b2.id, {} FROM building_types b1, building_types b2 \
                     WHERE b1.building_key = '{}' AND b2.building_key = '{}' \
                     ON CONFLICT DO NOTHING",
                    level, building_key, dep_building
                )).await?;
            }
        }

        // ==================== DEFENSE TYPES ====================
        let defenses = vec![
            ("rocket_launcher", "Lance-Roquettes", "light", 2000, 0, 0, 80, 20, 200, 2000, "Défense anti-vaisseau légère"),
            ("light_laser", "Laser Léger", "light", 1500, 500, 0, 100, 25, 100, 2000, "Défense laser rapide"),
            ("heavy_laser", "Laser Lourd", "heavy", 6000, 2000, 0, 250, 100, 800, 8000, "Défense laser lourde"),
            ("gauss_cannon", "Canon de Gauss", "heavy", 20000, 15000, 2000, 1100, 200, 3500, 35000, "Canon électromagnétique puissant"),
            ("ion_cannon", "Canon à Ions", "heavy", 5000, 3000, 0, 150, 500, 800, 8000, "Neutralise les boucliers"),
            ("plasma_turret", "Tourelle à Plasma", "heavy", 50000, 50000, 30000, 3000, 300, 10000, 100000, "Défense plasma dévastatrice"),
            ("small_shield", "Petit Bouclier", "shield", 10000, 10000, 0, 1, 2000, 20000, 0, "Bouclier planétaire léger"),
            ("large_shield", "Grand Bouclier", "shield", 50000, 50000, 0, 1, 10000, 100000, 0, "Bouclier planétaire lourd"),
            ("anti_missile", "Missile Anti-Balistique", "special", 8000, 0, 2000, 1, 1, 800, 8000, "Intercepte les missiles"),
            ("interplanetary_missile", "Missile Interplanétaire", "special", 12500, 2500, 10000, 12000, 1, 15000, 120000, "Attaque à distance"),
        ];

        for (key, name, category, metal, crystal, deut, attack, shield, hull, time, desc) in defenses {
            db.execute_unprepared(&format!(
                "INSERT INTO defense_types (defense_key, name, category, base_cost_metal, base_cost_crystal, base_cost_deuterium, build_time_seconds, attack, shield, hull, description) \
                 VALUES ('{}', '{}', '{}', {}, {}, {}, {}, {}, {}, {}, '{}') ON CONFLICT (defense_key) DO NOTHING",
                key, name.replace("'", "''"), category, metal, crystal, deut, time, attack, shield, hull, desc.replace("'", "''")
            )).await?;
        }

        // ==================== DEFENSE REQUIREMENTS ====================
        let defense_reqs: Vec<(&str, Option<&str>, i32)> = vec![
            // Rocket Launcher: Shipyard 1
            ("rocket_launcher", Some("shipyard"), 1),

            // Light Laser: Energy 1 + Laser Tech 3
            ("light_laser", Some("energy_tech"), 2),
            ("light_laser", Some("laser_tech"), 3),

            // Heavy Laser: Energy 3 + Laser Tech 6 + Shipyard 2
            ("heavy_laser", Some("energy_tech"), 3),
            ("heavy_laser", Some("laser_tech"), 6),
            ("heavy_laser", Some("shipyard"), 4),

            // Gauss Cannon: Energy 6 + Weapons Tech 3 + Shield Tech 1
            ("gauss_cannon", Some("energy_tech"), 6),
            ("gauss_cannon", Some("weapons_tech"), 3),
            ("gauss_cannon", Some("shield_tech"), 1),

            // Ion Cannon: Ion Tech 4
            ("ion_cannon", Some("ion_tech"), 4),

            // Plasma Turret: Plasma Tech 7 (REQUIS!)
            ("plasma_turret", Some("plasma_tech"), 7),

            // Small Shield: Shield Tech 2
            ("small_shield", Some("shield_tech"), 2),

            // Large Shield: Shield Tech 6
            ("large_shield", Some("shield_tech"), 6),

            // Anti-Missile: Missile Silo building
            ("anti_missile", Some("shipyard"), 2),

            // Interplanetary Missile: Missile Silo + Impulse Drive 1
            ("interplanetary_missile", Some("impulse_drive"), 1),
            ("interplanetary_missile", Some("shipyard"), 4),
        ];

        for (defense_key, tech_or_building, level) in defense_reqs {
            if let Some(req) = tech_or_building {
                // Try as tech first
                db.execute_unprepared(&format!(
                    "INSERT INTO defense_requirements (defense_type_id, required_tech_id, required_level) \
                     SELECT d.id, t.id, {} FROM defense_types d, technologies t \
                     WHERE d.defense_key = '{}' AND t.tech_key = '{}' \
                     ON CONFLICT DO NOTHING",
                    level, defense_key, req
                )).await.ok();

                // Try as building
                db.execute_unprepared(&format!(
                    "INSERT INTO defense_requirements (defense_type_id, required_building_id, required_level) \
                     SELECT d.id, b.id, {} FROM defense_types d, building_types b \
                     WHERE d.defense_key = '{}' AND b.building_key = '{}' \
                     ON CONFLICT DO NOTHING",
                    level, defense_key, req
                )).await.ok();
            }
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Clean up in reverse order
        db.execute_unprepared("DELETE FROM defense_requirements").await?;
        db.execute_unprepared("DELETE FROM building_requirements").await?;
        db.execute_unprepared("DELETE FROM ship_requirements").await?;
        db.execute_unprepared("DELETE FROM technology_requirements").await?;
        db.execute_unprepared("DELETE FROM defense_types").await?;
        db.execute_unprepared("DELETE FROM building_types").await?;
        db.execute_unprepared("DELETE FROM ship_types WHERE ship_key IN ('heavy_hunter', 'battleship', 'destroyer', 'bomber', 'deathstar')").await?;
        db.execute_unprepared("DELETE FROM technologies WHERE tech_key IN ('ion_tech', 'plasma_tech', 'shield_tech', 'combustion_drive', 'impulse_drive', 'hyperspace_drive', 'computer_tech', 'astrophysics', 'weapons_tech', 'hyperspace_tech', 'graviton_tech')").await?;

        Ok(())
    }
}
