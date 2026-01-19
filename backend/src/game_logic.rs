use serde::Serialize;
use rand::Rng;
use crate::entities::planet;

// ⚡ VITESSE DU JEU (200 = x2, 500 = x5)
pub const SPEED_FACTOR: f64 = 500.0;

#[derive(Serialize, Clone)]
pub struct Cost {
    pub metal: f64,
    pub crystal: f64,
    pub deuterium: f64,
}

#[derive(Serialize)]
pub struct PvpReport {
    pub winner: String,
    pub log: Vec<String>,
    pub loot: Cost,
    pub debris: Cost,
    pub attacker_losses: i32,
    pub defender_losses: i32,
    pub lost_missiles: i32,
    pub lost_plasmas: i32,
}

pub struct CombatResult {
    pub victory: bool,
    pub message: String,
    pub ships_lost: i32,
}

pub struct CombatTechs {
    pub laser: i32,
    pub energy: i32,
    pub armour: i32,
}

#[derive(Clone, Copy)]
pub struct UnitStats {
    pub attack: f64,
    pub shield: f64,
    pub hull: f64,
}

// 📊 DIVISEUR DE COÛT BASÉ SUR VITESSE
fn cost_scaling() -> f64 {
    (SPEED_FACTOR / 100.0).max(1.0)
}

// --- COÛTS DE BASE DES UNITÉS ---
pub fn get_unit_cost(unit_type: &str) -> (f64, f64) {
    let base = match unit_type {
        // 🚀 Vaisseaux de guerre
        "light_hunter" => (3000.0, 1000.0),      // Chasseur léger (rapide, fragile)
        "cruiser" => (20000.0, 7000.0),          // Croiseur (équilibré)
        
        // 🛠️ Vaisseaux utilitaires
        "transporter" => (4000.0, 4000.0),       // Transporteur (capacité)
        "recycler" => (10000.0, 6000.0),         // Recycleur (débris)
        "spy_probe" => (1000.0, 0.0),            // Sonde (reconnaissance)
        "colony_ship" => (10000.0, 20000.0),     // Vaisseau de colonisation
        
        // 🛡️ Défenses
        "missile_launcher" => (10000.0, 2500.0),     // Lance-missiles (bon marché)
        "plasma_turret" => (50000.0, 50000.0),   // Tourelle plasma (puissante)
        
        _ => (0.0, 0.0),
    };
    
    let divider = cost_scaling();
    (base.0 / divider, base.1 / divider)
}

// --- VÉRIFICATION DES PRÉREQUIS ---
pub fn check_prerequisites(planet: &planet::Model, item_type: &str) -> Result<(), String> {
    match item_type {
        // 🔬 Technologies
        "energy_tech" => {
            if planet.research_lab_level < 1 { 
                return Err("Laboratoire de Recherche niveau 1 requis".to_string()); 
            }
        },
        "laser" => {
            if planet.research_lab_level < 1 { 
                return Err("Laboratoire de Recherche niveau 1 requis".to_string()); 
            }
            if planet.energy_tech_level < 2 { 
                return Err("Technologie Énergie niveau 2 requise".to_string()); 
            }
        },
        "espionage" => {
            if planet.research_lab_level < 3 { 
                return Err("Laboratoire de Recherche niveau 3 requis".to_string()); 
            }
        },
        "armour" => {
            if planet.research_lab_level < 2 { 
                return Err("Laboratoire de Recherche niveau 2 requis".to_string()); 
            }
        },
        
        // 🚀 Vaisseaux
        "light_hunter" => {
            if planet.shipyard_level < 1 { 
                return Err("Chantier Spatial niveau 1 requis".to_string()); 
            }
        },
        "cruiser" => {
            if planet.shipyard_level < 5 { 
                return Err("Chantier Spatial niveau 5 requis".to_string()); 
            }
            if planet.energy_tech_level < 3 { 
                return Err("Technologie Énergie niveau 3 requise".to_string()); 
            }
        },
        "colony_ship" => {
            if planet.shipyard_level < 4 { 
                return Err("Chantier Spatial niveau 4 requis".to_string()); 
            }
        },
        "recycler" => {
            if planet.shipyard_level < 4 { 
                return Err("Chantier Spatial niveau 4 requis".to_string()); 
            }
        },
        
        // 🛡️ Défenses
        "plasma_turret" => {
            if planet.shipyard_level < 8 { 
                return Err("Chantier Spatial niveau 8 requis".to_string()); 
            }
            if planet.energy_tech_level < 6 { 
                return Err("Technologie Énergie niveau 6 requise".to_string()); 
            }
            if planet.laser_battery_level < 5 { 
                return Err("Technologie Laser niveau 5 requise".to_string()); 
            }
        },
        
        _ => {},
    }
    Ok(())
}

// --- CALCULS RESSOURCES (Ratio 3:2:1) ---
pub enum ResourceType { Metal, Crystal, Deuterium }

pub fn calculate_resources(
    res_type: ResourceType, 
    level: i32, 
    current_amount: f64, 
    last_update: chrono::NaiveDateTime,
    energy_tech_level: i32
) -> f64 {
    let now = chrono::Utc::now().naive_utc();
    let duration = now.signed_duration_since(last_update).num_seconds() as f64;
    
    // 💡 Bonus technologie énergie (+1% par niveau)
    let tech_bonus = 1.0 + (energy_tech_level as f64 * 0.01);
    
    // 📊 Production de base (ratio 3:2:1)
    let base_production = match res_type {
        ResourceType::Metal => 30.0 * (level as f64) * 1.1f64.powi(level),      // Base x3
        ResourceType::Crystal => 20.0 * (level as f64) * 1.1f64.powi(level),    // Base x2
        ResourceType::Deuterium => 10.0 * (level as f64) * 1.05f64.powi(level), // Base x1 (plus rare)
    };
    
    let production_per_sec = (base_production * tech_bonus / 3600.0) * (SPEED_FACTOR / 100.0);
    current_amount + (production_per_sec * duration)
}

// --- CALCULS ÉNERGIE ---

/// Calcule la production d'énergie totale du solar plant
pub fn calculate_energy_production(solar_plant_level: i32, energy_tech_level: i32) -> f64 {
    if solar_plant_level == 0 {
        return 0.0;
    }

    // Production augmentée x3 pour meilleur équilibre énergétique
    let base_production = 60.0 * (solar_plant_level as f64) * 1.1f64.powi(solar_plant_level);
    let tech_bonus = 1.0 + (energy_tech_level as f64 * 0.10); // +10% par niveau (augmenté de 5%)
    base_production * tech_bonus
}

/// Calcule la consommation d'énergie totale des mines
pub fn calculate_energy_consumption(metal_mine_level: i32, crystal_mine_level: i32, deuterium_mine_level: i32) -> f64 {
    let metal_cons = 10.0 * (metal_mine_level as f64) * 1.1f64.powi(metal_mine_level);
    let crystal_cons = 10.0 * (crystal_mine_level as f64) * 1.1f64.powi(crystal_mine_level);
    let deut_cons = 20.0 * (deuterium_mine_level as f64) * 1.1f64.powi(deuterium_mine_level);
    metal_cons + crystal_cons + deut_cons
}

/// Calcule le ratio énergétique (production / consommation)
/// Retourne un ratio entre 0.0 et 1.0 (ou plus si surplus)
pub fn calculate_energy_ratio(solar_plant_level: i32, energy_tech_level: i32,
                                metal_mine_level: i32, crystal_mine_level: i32,
                                deuterium_mine_level: i32) -> f64 {
    let production = calculate_energy_production(solar_plant_level, energy_tech_level);
    let consumption = calculate_energy_consumption(metal_mine_level, crystal_mine_level, deuterium_mine_level);

    if consumption == 0.0 {
        return 1.0; // Pas de consommation = 100%
    }

    (production / consumption).min(1.0) // Max 100%
}

/// Calcule la production horaire d'une ressource (en unités/heure)
pub fn calculate_resource_production(
    res_type: ResourceType,
    level: i32,
    energy_tech_level: i32,
    energy_ratio: f64
) -> f64 {
    if level == 0 {
        return 0.0;
    }

    // Bonus technologie énergie (+1% par niveau)
    let tech_bonus = 1.0 + (energy_tech_level as f64 * 0.01);

    // Production de base (ratio 3:2:1)
    let base_production = match res_type {
        ResourceType::Metal => 30.0 * (level as f64) * 1.1f64.powi(level),
        ResourceType::Crystal => 20.0 * (level as f64) * 1.1f64.powi(level),
        ResourceType::Deuterium => 10.0 * (level as f64) * 1.05f64.powi(level),
    };

    // Production par heure avec tous les bonus
    base_production * tech_bonus * energy_ratio * (SPEED_FACTOR / 100.0)
}

/// Calcule les ressources avec prise en compte du ratio énergétique
pub fn calculate_resources_with_energy(
    res_type: ResourceType,
    level: i32,
    current_amount: f64,
    last_update: chrono::NaiveDateTime,
    energy_tech_level: i32,
    energy_ratio: f64 // Entre 0.0 et 1.0
) -> f64 {
    let now = chrono::Utc::now().naive_utc();
    let duration = now.signed_duration_since(last_update).num_seconds() as f64;

    // Bonus technologie énergie (+1% par niveau)
    let tech_bonus = 1.0 + (energy_tech_level as f64 * 0.01);

    // Production de base (ratio 3:2:1)
    let base_production = match res_type {
        ResourceType::Metal => 30.0 * (level as f64) * 1.1f64.powi(level),
        ResourceType::Crystal => 20.0 * (level as f64) * 1.1f64.powi(level),
        ResourceType::Deuterium => 10.0 * (level as f64) * 1.05f64.powi(level),
    };

    // Application du ratio énergétique
    let production_per_sec = (base_production * tech_bonus * energy_ratio / 3600.0) * (SPEED_FACTOR / 100.0);
    current_amount + (production_per_sec * duration)
}

// --- COÛTS DES BÂTIMENTS (Exponentiel) ---
pub fn get_upgrade_cost(building_type: &str, level: i32) -> Cost {
    let base_cost = match building_type {
        // 🏭 MINES (multiplicateur 1.5)
        "metal" => Cost {
            metal: 60.0 * 1.5f64.powi(level - 1),
            crystal: 15.0 * 1.5f64.powi(level - 1),
            deuterium: 0.0,
        },
        "crystal" => Cost {
            metal: 48.0 * 1.6f64.powi(level - 1),
            crystal: 24.0 * 1.6f64.powi(level - 1),
            deuterium: 0.0,
        },
        "deuterium" => Cost {
            metal: 225.0 * 1.5f64.powi(level - 1),
            crystal: 75.0 * 1.5f64.powi(level - 1),
            deuterium: 0.0,
        },
        
        // ⚡ ÉNERGIE (multiplicateur 1.5)
        "solar_plant" => Cost {
            metal: 75.0 * 1.5f64.powi(level - 1),
            crystal: 30.0 * 1.5f64.powi(level - 1),
            deuterium: 0.0,
        },
        
        // 🏗️ INFRASTRUCTURES (multiplicateur 2.0)
        "shipyard" => Cost {
            metal: 400.0 * 2.0f64.powi(level - 1),
            crystal: 200.0 * 2.0f64.powi(level - 1),
            deuterium: 100.0 * 2.0f64.powi(level - 1),
        },
        "research" => Cost {
            metal: 200.0 * 2.0f64.powi(level - 1),
            crystal: 400.0 * 2.0f64.powi(level - 1),
            deuterium: 200.0 * 2.0f64.powi(level - 1),
        },
        "hangar" => Cost {
            metal: 400.0 * 2.0f64.powi(level - 1),
            crystal: 200.0 * 2.0f64.powi(level - 1),
            deuterium: 100.0 * 2.0f64.powi(level - 1),
        },
        
        // 🔬 TECHNOLOGIES (multiplicateur 2.0)
        "energy_tech" => Cost {
            metal: 0.0,
            crystal: 800.0 * 2.0f64.powi(level - 1),
            deuterium: 400.0 * 2.0f64.powi(level - 1),
        },
        "laser" => Cost {
            metal: 200.0 * 2.0f64.powi(level - 1),
            crystal: 100.0 * 2.0f64.powi(level - 1),
            deuterium: 0.0,
        },
        "espionage" => Cost {
            metal: 200.0 * 2.0f64.powi(level - 1),
            crystal: 1000.0 * 2.0f64.powi(level - 1),
            deuterium: 200.0 * 2.0f64.powi(level - 1),
        },
        "armour" => Cost {
            metal: 1000.0 * 2.0f64.powi(level - 1),
            crystal: 0.0,
            deuterium: 0.0,
        },
        
        _ => Cost { metal: 0.0, crystal: 0.0, deuterium: 0.0 },
    };
    
    // ✅ Applique le scaling de vitesse
    let divider = cost_scaling();
    Cost {
        metal: base_cost.metal / divider,
        crystal: base_cost.crystal / divider,
        deuterium: base_cost.deuterium / divider,
    }
}

// ⏱️ TEMPS DE CONSTRUCTION PROGRESSIF
pub fn get_build_time(metal_cost: f64, crystal_cost: f64, facility_level: i32) -> i64 {
    let total_resources = metal_cost + crystal_cost;
    let base_time = (total_resources / 2500.0 * 3600.0) as i64; // En secondes
    
    // 🏗️ Réduction selon niveau du chantier (max -50%)
    let time_reduction = 1.0 - (facility_level as f64 * 0.05).min(0.5);
    let final_time = (base_time as f64 * time_reduction) as i64;
    
    // ⚡ Ajusté au SPEED_FACTOR
    std::cmp::max(10, final_time / (SPEED_FACTOR / 100.0) as i64)
}

pub fn get_ship_production_time(qty: i32) -> i64 {
    let base_time = 30 * qty; // 30 secondes par unité
    std::cmp::max(5, (base_time as f64 / (SPEED_FACTOR / 100.0)) as i64)
}

// 📦 CAPACITÉS
pub fn get_fleet_capacity(hangar_level: i32) -> i32 {
    500 + (hangar_level * 500)
}

// Capacité transporteur évolutive basée sur niveau hangar
// Base: 10000, +5% par niveau de hangar
pub fn get_transporter_capacity(hangar_level: i32) -> f64 {
    let base_capacity = 10000.0;
    let bonus_per_level = 0.05; // +5% par niveau
    base_capacity * (1.0 + (hangar_level as f64 * bonus_per_level))
}

pub const TRANSPORTER_CAPACITY: f64 = 10000.0; // Deprecated: utilisez get_transporter_capacity()

// Helper functions
pub fn get_light_hunter_stats() -> (f64, f64) { get_unit_cost("light_hunter") }
pub fn get_cruiser_stats() -> (f64, f64) { get_unit_cost("cruiser") }
pub fn get_recycler_stats() -> (f64, f64) { get_unit_cost("recycler") }
pub fn get_spy_probe_stats() -> (f64, f64) { get_unit_cost("spy_probe") }
pub fn get_missile_launcher_stats() -> (f64, f64) { get_unit_cost("missile_launcher") }
pub fn get_plasma_turret_stats() -> (f64, f64) { get_unit_cost("plasma_turret") }
pub fn get_colony_ship_stats() -> (f64, f64) { get_unit_cost("colony_ship") }
pub fn get_transporter_stats() -> (f64, f64) { get_unit_cost("transporter") }

// --- MOTEUR DE COMBAT ---
pub fn get_unit_base_stats(unit_type: &str) -> UnitStats {
    match unit_type {
        "light_hunter" => UnitStats { attack: 50.0, shield: 10.0, hull: 400.0 },
        "cruiser" => UnitStats { attack: 400.0, shield: 50.0, hull: 2700.0 },
        "missile_launcher" => UnitStats { attack: 80.0, shield: 20.0, hull: 200.0 },
        "plasma_turret" => UnitStats { attack: 3000.0, shield: 300.0, hull: 10000.0 },
        _ => UnitStats { attack: 1.0, shield: 1.0, hull: 10.0 },
    }
}

pub fn get_rapid_fire(attacker: &str, target: &str) -> i32 {
    match (attacker, target) {
        ("cruiser", "light_hunter") => 6,
        ("cruiser", "missile_launcher") => 10,
        ("plasma_turret", "light_hunter") => 5,
        ("plasma_turret", "cruiser") => 3,
        _ => 0,
    }
}

fn apply_losses(fleet: &mut Vec<(&str, i32, UnitStats)>, damage: f64) {
    let total_hull: f64 = fleet.iter().map(|(_, qty, stats)| *qty as f64 * stats.hull).sum();
    if total_hull > 0.0 {
        let loss_ratio = (damage / total_hull).min(1.0);
        for (_, qty, _) in fleet.iter_mut() {
            *qty = (*qty as f64 * (1.0 - loss_ratio)).floor() as i32;
        }
    }
}

pub fn resolve_pvp(
    att_hunters: i32, att_cruisers: i32, att_techs: CombatTechs,
    def_hunters: i32, def_cruisers: i32, 
    _def_lasers: i32, 
    def_missiles: i32, def_plasmas: i32, 
    def_techs: CombatTechs,
    def_resources: Cost   
) -> PvpReport {
    let mut log = Vec::new();
    let mut rng = rand::thread_rng();

    let apply_techs = |base: UnitStats, techs: &CombatTechs| -> UnitStats {
        UnitStats {
            attack: base.attack * (1.0 + techs.laser as f64 * 0.1),
            shield: base.shield * (1.0 + techs.energy as f64 * 0.1),
            hull: base.hull * (1.0 + techs.armour as f64 * 0.1),
        }
    };

    let mut attacker_fleet = vec![
        ("light_hunter", att_hunters, apply_techs(get_unit_base_stats("light_hunter"), &att_techs)),
        ("cruiser", att_cruisers, apply_techs(get_unit_base_stats("cruiser"), &att_techs)),
    ];

    let mut defender_fleet = vec![
        ("light_hunter", def_hunters, apply_techs(get_unit_base_stats("light_hunter"), &def_techs)),
        ("cruiser", def_cruisers, apply_techs(get_unit_base_stats("cruiser"), &def_techs)),
        ("missile_launcher", def_missiles, apply_techs(get_unit_base_stats("missile_launcher"), &def_techs)),
        ("plasma_turret", def_plasmas, apply_techs(get_unit_base_stats("plasma_turret"), &def_techs)),
    ];

    log.push("⚔️ Début de l'engagement orbital".to_string());

    for round in 1..=6 {
        let mut att_dmg = 0.0;
        let mut def_dmg = 0.0;

        // Attaquant tire
        for (a_type, qty, a_stats) in attacker_fleet.clone() {
            for _ in 0..qty {
                let mut re_fire = true;
                while re_fire {
                    let target_idx = rng.gen_range(0..defender_fleet.len());
                    let (d_type, d_qty, d_stats) = &defender_fleet[target_idx];
                    if *d_qty > 0 {
                        att_dmg += (a_stats.attack - d_stats.shield).max(a_stats.attack * 0.01);
                        let rf = get_rapid_fire(a_type, d_type);
                        re_fire = rf > 0 && rng.gen_range(0..rf) > 0;
                    } else { re_fire = false; }
                }
            }
        }

        // Défenseur tire
        for (d_type, qty, d_stats) in defender_fleet.clone() {
            for _ in 0..qty {
                let mut re_fire = true;
                while re_fire {
                    let target_idx = rng.gen_range(0..attacker_fleet.len());
                    let (a_type, a_qty, a_stats) = &attacker_fleet[target_idx];
                    if *a_qty > 0 {
                        def_dmg += (d_stats.attack - a_stats.shield).max(d_stats.attack * 0.01);
                        let rf = get_rapid_fire(d_type, a_type);
                        re_fire = rf > 0 && rng.gen_range(0..rf) > 0;
                    } else { re_fire = false; }
                }
            }
        }

        apply_losses(&mut defender_fleet, att_dmg);
        apply_losses(&mut attacker_fleet, def_dmg);
        log.push(format!("Round {}: Dégâts A: {:.0} | D: {:.0}", round, att_dmg, def_dmg));
        if attacker_fleet.iter().all(|f| f.1 <= 0) || defender_fleet.iter().all(|f| f.1 <= 0) { break; }
    }

    let f_att_h = attacker_fleet.iter().find(|(t,_,_)| *t=="light_hunter").map(|f| f.1).unwrap_or(0);
    let f_att_c = attacker_fleet.iter().find(|(t,_,_)| *t=="cruiser").map(|f| f.1).unwrap_or(0);
    let f_def_h = defender_fleet.iter().find(|(t,_,_)| *t=="light_hunter").map(|f| f.1).unwrap_or(0);
    let f_def_c = defender_fleet.iter().find(|(t,_,_)| *t=="cruiser").map(|f| f.1).unwrap_or(0);
    let f_miss = defender_fleet.iter().find(|(t,_,_)| *t=="missile_launcher").map(|f| f.1).unwrap_or(0);
    let f_plas = defender_fleet.iter().find(|(t,_,_)| *t=="plasma_turret").map(|f| f.1).unwrap_or(0);

    let winner = if f_def_h+f_def_c+f_miss+f_plas <= 0 { "attacker".into() } 
                 else if f_att_h+f_att_c <= 0 { "defender".into() } 
                 else { "draw".into() };

    // 💰 BUTIN (50% des ressources)
    let loot = if winner == "attacker" {
        Cost { 
            metal: (def_resources.metal * 0.5).min(50000.0 * cost_scaling()), 
            crystal: (def_resources.crystal * 0.5).min(50000.0 * cost_scaling()), 
            deuterium: (def_resources.deuterium * 0.5).min(50000.0 * cost_scaling()) 
        }
    } else { Cost { metal: 0.0, crystal: 0.0, deuterium: 0.0 } };

    // 🛠️ CHAMP DE DÉBRIS (30% des pertes)
    let att_h_lost = att_hunters - f_att_h;
    let att_c_lost = att_cruisers - f_att_c;
    let def_h_lost = def_hunters - f_def_h;
    let def_c_lost = def_cruisers - f_def_c;

    let (h_m, h_c) = get_unit_cost("light_hunter");
    let (c_m, c_c) = get_unit_cost("cruiser");

    let total_metal_lost = (att_h_lost + def_h_lost) as f64 * h_m + (att_c_lost + def_c_lost) as f64 * c_m;
    let total_crystal_lost = (att_h_lost + def_h_lost) as f64 * h_c + (att_c_lost + def_c_lost) as f64 * c_c;

    let debris_m = total_metal_lost * 0.3;
    let debris_c = total_crystal_lost * 0.3;

    if debris_m > 0.0 {
        log.push(format!("🛠️ Débris : {:.0}M / {:.0}C", debris_m, debris_c));
    }

    PvpReport {
        winner, log, loot,
        debris: Cost { metal: debris_m, crystal: debris_c, deuterium: 0.0 },
        attacker_losses: att_h_lost + att_c_lost,
        defender_losses: def_h_lost + def_c_lost,
        lost_missiles: def_missiles - f_miss,
        lost_plasmas: def_plasmas - f_plas,
    }
}

pub fn simulate_combat(fleet_size: i32, defense_bonus: i32) -> CombatResult {
    let mut rng = rand::thread_rng();

    // Niveau pirate aléatoire (10-100) avec forte variation
    let pirate_strength = rng.gen_range(10..100);
    let player_strength = fleet_size + (defense_bonus * 5);

    if player_strength > pirate_strength {
        // VICTOIRE : Pertes réduites (3-15% avec variation ±10%)
        let base_loss_rate = rng.gen_range(0.03..0.15);
        let variation = rng.gen_range(-0.1..0.1);
        let loss_rate = (base_loss_rate * (1.0_f64 + variation)).clamp(0.01_f64, 0.20_f64);

        let lost = (fleet_size as f64 * loss_rate).ceil() as i32; // ceil() garantit au moins 1 si fleet > 0
        let lost = lost.max(0).min(fleet_size); // Clamp entre 0 et fleet_size

        CombatResult {
            victory: true,
            message: format!("Victoire ! Pirates éliminés (force: {})", pirate_strength),
            ships_lost: lost
        }
    } else {
        // DÉFAITE : Pertes modérées (30-60% avec variation ±15%)
        let base_loss_rate = rng.gen_range(0.30..0.60);
        let variation = rng.gen_range(-0.15..0.15);
        let loss_rate = (base_loss_rate * (1.0_f64 + variation)).clamp(0.25_f64, 0.70_f64);

        let lost = (fleet_size as f64 * loss_rate).ceil() as i32; // ceil() garantit au moins 1
        let lost = lost.max(1).min(fleet_size); // Minimum 1 perte en cas de défaite

        CombatResult {
            victory: false,
            message: format!("Défaite ! Retraite forcée (pirates: {})", pirate_strength),
            ships_lost: lost
        }
    }
}

// --- NAVIGATION GALACTIQUE ---
pub fn calculate_distance(start: (i32, i32, i32), end: (i32, i32, i32)) -> f64 {
    let (g1, s1, p1) = start;
    let (g2, s2, p2) = end;

    if g1 != g2 {
        return (g1 - g2).abs() as f64 * 20000.0;
    }
    if s1 != s2 {
        return (s1 - s2).abs() as f64 * 2000.0 + 2700.0;
    }
    if p1 != p2 {
        return (p1 - p2).abs() as f64 * 5.0 + 1000.0;
    }
    5.0 // Même planète
}

pub fn calculate_flight_time(dist: f64, speed_factor: f64) -> i64 {
    let base_time = 10.0 + (dist.sqrt() / 2.0);
    let seconds = (base_time * 100.0) / speed_factor;
    seconds.max(5.0) as i64
}


// 📊 CALCUL DES POINTS D'UNE PLANÈTE (utilisé par leaderboard et profil)
pub fn calculate_planet_points(p: &crate::entities::planet::Model) -> (i32, i32, i32) {
    // Points économie (bâtiments) - DRASTIQUEMENT réduit
    let buildings =
        (p.metal_mine_level * p.metal_mine_level * 10) +      // 50 → 10
        (p.crystal_mine_level * p.crystal_mine_level * 15) +  // 80 → 15
        (p.deuterium_mine_level * p.deuterium_mine_level * 25) + // 150 → 25
        (p.solar_plant_level * p.solar_plant_level * 5) +     // 30 → 5
        (p.shipyard_level * p.shipyard_level * 40) +          // 200 → 40
        (p.research_lab_level * p.research_lab_level * 50) +  // 300 → 50
        (p.hangar_level * p.hangar_level * 35);               // 180 → 35

    // Points recherche (technologies) - DRASTIQUEMENT réduit
    let research =
        (p.energy_tech_level * p.energy_tech_level * 50) +      // 400 → 50
        (p.laser_battery_level * p.laser_battery_level * 40) +  // 350 → 40
        (p.espionage_tech_level * p.espionage_tech_level * 60) + // 500 → 60
        (p.armour_tech_level * p.armour_tech_level * 70);       // 600 → 70

    // Points militaire (flotte + défenses) - DRASTIQUEMENT réduit
    let military =
        (p.light_hunter_count * 5) +            // 40 → 5
        (p.cruiser_count * 30) +                // 270 → 30
        (p.recycler_count * 20) +               // 160 → 20
        (p.transporter_count * 10) +            // 80 → 10
        (p.spy_probe_count * 1) +               // 10 → 1
        (p.colony_ship_count * 40) +            // 300 → 40
        (p.missile_launcher_count * 2) +        // 20 → 2
        (p.plasma_turret_count * 100);          // 1000 → 100

    // Points production (basé sur la production horaire)
    // Calculer la production horaire avec tous les bonus
    let energy_ratio = calculate_energy_ratio(
        p.solar_plant_level,
        p.energy_tech_level,
        p.metal_mine_level,
        p.crystal_mine_level,
        p.deuterium_mine_level
    );

    // Production de base avec bonus tech et énergie (slots non pris en compte ici car on n'a pas accès)
    let prod_metal = calculate_resource_production(
        ResourceType::Metal,
        p.metal_mine_level,
        p.energy_tech_level,
        energy_ratio
    );
    let prod_crystal = calculate_resource_production(
        ResourceType::Crystal,
        p.crystal_mine_level,
        p.energy_tech_level,
        energy_ratio
    );
    let prod_deuterium = calculate_resource_production(
        ResourceType::Deuterium,
        p.deuterium_mine_level,
        p.energy_tech_level,
        energy_ratio
    );

    // 1 point par tranche de 1000 ressources produites par heure
    // Pondération : métal x1, cristal x1.5, deutérium x2 (rareté)
    let production_points = (
        (prod_metal / 1000.0) +
        (prod_crystal / 1000.0 * 1.5) +
        (prod_deuterium / 1000.0 * 2.0)
    ) as i32;

    let economy = buildings + research + production_points;
    let total = economy + military;

    (total, economy, military)
}

// Fonction pour obtenir le badge de rang - PROGRESSION LENTE
pub fn get_rank_badge(total_points: i32) -> &'static str {
    if total_points >= 1000000 { "Empereur Galactique" }       // Objectif ultime
    else if total_points >= 500000 { "Seigneur de Guerre" }    // Très haut niveau
    else if total_points >= 250000 { "Grand Amiral" }          // Elite
    else if total_points >= 100000 { "Amiral" }                // Haut niveau
    else if total_points >= 50000 { "Vice-Amiral" }            // Niveau avancé
    else if total_points >= 25000 { "Commandant" }             // Joueur sérieux
    else if total_points >= 12000 { "Capitaine" }              // Niveau intermédiaire
    else if total_points >= 6000 { "Lieutenant" }              // Progression solide
    else if total_points >= 3000 { "Sous-Lieutenant" }         // Débutant avancé
    else if total_points >= 1500 { "Officier" }                // Early game
    else if total_points >= 800 { "Sergent" }                  // Tout début
    else if total_points >= 300 { "Caporal" }                  // Premier rang
    else { "Recrue" }                                          // Début
}

// ========================
// 🎰 SYSTÈME DE SLOTS DE PRODUCTION
// ========================

/// Compte le nombre de slots assignés à un type de ressource
/// Renvoie le nombre de slots actifs pour metal, crystal, energy, deuterium
pub fn count_slots_for_resource(
    slot_1: &Option<String>,
    slot_2: &Option<String>,
    slot_3: &Option<String>,
    slot_4: &Option<String>,
    resource_type: &str
) -> i32 {
    let slots = [slot_1, slot_2, slot_3, slot_4];
    slots.iter()
        .filter(|s| s.as_ref().map(|v| v == resource_type).unwrap_or(false))
        .count() as i32
}

/// Calcule le bonus de production basé sur les slots (+50% par slot)
pub fn get_slot_bonus(slots_count: i32) -> f64 {
    1.0 + (slots_count as f64 * 0.5) // +50% par slot
}

/// Coût progressif pour débloquer un slot (slot_number de 1 à 4)
pub fn get_slot_unlock_cost(slot_number: i32) -> Cost {
    let base_cost = Cost {
        metal: 5000.0,
        crystal: 3000.0,
        deuterium: 1000.0,
    };

    let multiplier = slot_number as f64; // x1, x2, x3, x4
    let divider = cost_scaling();

    Cost {
        metal: (base_cost.metal * multiplier) / divider,
        crystal: (base_cost.crystal * multiplier) / divider,
        deuterium: (base_cost.deuterium * multiplier) / divider,
    }
}

/// Retourne le numéro du prochain slot à débloquer (1-4) ou None si tous débloqués
pub fn get_next_slot_to_unlock(
    slot_1: &Option<String>,
    slot_2: &Option<String>,
    slot_3: &Option<String>,
    slot_4: &Option<String>,
) -> Option<i32> {
    if slot_1.is_none() { return Some(1); }
    if slot_2.is_none() { return Some(2); }
    if slot_3.is_none() { return Some(3); }
    if slot_4.is_none() { return Some(4); }
    None // Tous les slots sont déjà débloqués
}

/// Vérifie si un slot est débloqué (valeur "none" ou une ressource assignée)
pub fn is_slot_unlocked(slot: &Option<String>) -> bool {
    slot.is_some()
}

/// Calcule les ressources avec prise en compte des slots de production
pub fn calculate_resources_with_slots(
    res_type: ResourceType,
    level: i32,
    current_amount: f64,
    last_update: chrono::NaiveDateTime,
    energy_tech_level: i32,
    energy_ratio: f64,
    slot_1: &Option<String>,
    slot_2: &Option<String>,
    slot_3: &Option<String>,
    slot_4: &Option<String>,
    speed_factor: f64,
) -> f64 {
    let now = chrono::Utc::now().naive_utc();
    let duration = now.signed_duration_since(last_update).num_seconds() as f64;

    // Bonus technologie énergie (+1% par niveau)
    let tech_bonus = 1.0 + (energy_tech_level as f64 * 0.01);

    // Déterminer le type de ressource pour compter les slots
    let resource_key = match res_type {
        ResourceType::Metal => "metal",
        ResourceType::Crystal => "crystal",
        ResourceType::Deuterium => "deuterium",
    };

    // Bonus des slots (+50% par slot assigné)
    let slots_count = count_slots_for_resource(slot_1, slot_2, slot_3, slot_4, resource_key);
    let slot_bonus = get_slot_bonus(slots_count);

    // Production de base (ratio 3:2:1)
    let base_production = match res_type {
        ResourceType::Metal => 30.0 * (level as f64) * 1.1f64.powi(level),
        ResourceType::Crystal => 20.0 * (level as f64) * 1.1f64.powi(level),
        ResourceType::Deuterium => 10.0 * (level as f64) * 1.05f64.powi(level),
    };

    // Application du ratio énergétique, slots et speed_factor dynamique
    let production_per_sec = (base_production * tech_bonus * energy_ratio * slot_bonus / 3600.0) * (speed_factor / 100.0);
    current_amount + (production_per_sec * duration)
}

/// Calcule le bonus d'énergie avec les slots assignés à "energy"
pub fn calculate_energy_production_with_slots(
    solar_plant_level: i32,
    energy_tech_level: i32,
    slot_1: &Option<String>,
    slot_2: &Option<String>,
    slot_3: &Option<String>,
    slot_4: &Option<String>,
) -> f64 {
    if solar_plant_level == 0 {
        return 0.0;
    }

    // Bonus des slots énergie
    let slots_count = count_slots_for_resource(slot_1, slot_2, slot_3, slot_4, "energy");
    let slot_bonus = get_slot_bonus(slots_count);

    let base_production = 60.0 * (solar_plant_level as f64) * 1.1f64.powi(solar_plant_level);
    let tech_bonus = 1.0 + (energy_tech_level as f64 * 0.10);
    base_production * tech_bonus * slot_bonus
}
