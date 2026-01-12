use serde::Serialize;
use rand::Rng;
use crate::entities::planet;

pub const SPEED_FACTOR: f64 = 100.0; // Vitesse du jeu

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

// --- COÛTS DE BASE DES UNITÉS ---
pub fn get_unit_cost(unit_type: &str) -> (f64, f64) {
    match unit_type {
        "light_hunter" => (3000.0, 1000.0),
        "cruiser" => (20000.0, 7000.0),
        "transporter" => (4000.0, 2000.0),
        "colony_ship" => (10000.0, 20000.0),
        "recycler" => (10000.0, 6000.0),
        "spy_probe" => (0.0, 1000.0),
        "missile_launcher" => (2000.0, 0.0),
        "plasma_turret" => (50000.0, 50000.0),
        _ => (0.0, 0.0),
    }
}

// --- VERIFICATION DES PREREQUIS ---
pub fn check_prerequisites(planet: &planet::Model, item_type: &str) -> Result<(), String> {
    match item_type {
        "energy_tech" => {
            if planet.research_lab_level < 1 { return Err("Laboratoire de Recherche niveau 1 requis".to_string()); }
            Ok(())
        },
        "laser" => {
            if planet.research_lab_level < 1 { return Err("Laboratoire de Recherche niveau 1 requis".to_string()); }
            if planet.energy_tech_level < 2 { return Err("Technologie Énergie niveau 2 requise".to_string()); }
            Ok(())
        },
        "espionage" => {
            if planet.research_lab_level < 3 { return Err("Laboratoire de Recherche niveau 3 requis".to_string()); }
            Ok(())
        },
        "armour" => {
            if planet.research_lab_level < 2 { return Err("Laboratoire de Recherche niveau 2 requis".to_string()); }
            Ok(())
        },
        "light_hunter" => {
            if planet.shipyard_level < 1 { return Err("Chantier Spatial niveau 1 requis".to_string()); }
            Ok(())
        },
        "cruiser" => {
            if planet.shipyard_level < 5 { return Err("Chantier Spatial niveau 5 requis".to_string()); }
            if planet.energy_tech_level < 4 { return Err("Technologie Énergie niveau 4 requise".to_string()); }
            Ok(())
        },
        "plasma_turret" => {
            if planet.shipyard_level < 6 { return Err("Chantier Spatial niveau 6 requis".to_string()); }
            if planet.energy_tech_level < 6 { return Err("Technologie Énergie niveau 6 requise".to_string()); }
            if planet.laser_battery_level < 3 { return Err("Technologie Laser niveau 3 requise".to_string()); }
            Ok(())
        },
        _ => Ok(()), 
    }
}

// --- CALCULS RESSOURCES ---
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
    let tech_bonus = 1.0 + (energy_tech_level as f64 * 0.05);

    let base_production = match res_type {
        ResourceType::Metal => 30.0 * (level as f64) * 1.1f64.powi(level),
        ResourceType::Crystal => 20.0 * (level as f64) * 1.1f64.powi(level),
        ResourceType::Deuterium => 10.0 * (level as f64) * 1.1f64.powi(level),
    };

    let production_per_sec = (base_production * tech_bonus / 3600.0) * SPEED_FACTOR;
    current_amount + (production_per_sec * duration)
}

// --- COÛTS & STATS ---
pub fn get_upgrade_cost(building_type: &str, level: i32) -> Cost {
    let factor_mines = 1.5f64.powi(level - 1); 
    let factor_tech = 2.0f64.powi(level - 1);  
    match building_type {
        "metal" => Cost { metal: 60.0 * factor_mines, crystal: 15.0 * factor_mines, deuterium: 0.0 },
        "crystal" => Cost { metal: 48.0 * 1.6f64.powi(level - 1), crystal: 24.0 * 1.6f64.powi(level - 1), deuterium: 0.0 },
        "shipyard" => Cost { metal: 400.0 * factor_tech, crystal: 200.0 * factor_tech, deuterium: 100.0 * factor_tech },
        "energy_tech" => Cost { metal: 0.0, crystal: 800.0 * factor_tech, deuterium: 400.0 * factor_tech },
        "armour" => Cost { metal: 1000.0 * factor_tech, crystal: 0.0, deuterium: 0.0 },
        _ => Cost { metal: 0.0, crystal: 0.0, deuterium: 0.0 },
    }
}

pub fn get_build_time(metal_cost: f64, crystal_cost: f64, facility_level: i32) -> i64 {
    let reduction_factor = 1.0 + (facility_level as f64);
    let seconds = ((metal_cost + crystal_cost) / 2500.0) / (SPEED_FACTOR * reduction_factor) * 3600.0;
    std::cmp::max(2, seconds as i64)
}

pub fn get_ship_production_time(qty: i32) -> i64 {
    std::cmp::max(1, (20.0 / SPEED_FACTOR * qty as f64) as i64)
}

pub fn get_light_hunter_stats() -> (f64, f64) { get_unit_cost("light_hunter") }
pub fn get_fleet_capacity(hangar_level: i32) -> i32 { 500 + (hangar_level * 500) }
pub const TRANSPORTER_CAPACITY: f64 = 10000.0;

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

    log.push("--- Début de l'engagement orbital ---".to_string());

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
        log.push(format!("Round {}: Dégâts infligés A: {:.0} | D: {:.0}", round, att_dmg, def_dmg));
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

    let loot = if winner == "attacker" {
        Cost { metal: def_resources.metal * 0.5, crystal: def_resources.crystal * 0.5, deuterium: def_resources.deuterium * 0.5 }
    } else { Cost { metal: 0.0, crystal: 0.0, deuterium: 0.0 } };

    // --- CALCUL DU CHAMP DE DÉBRIS (CDR) ---
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
        log.push(format!("Champ de débris généré : {:.0} Métal, {:.0} Cristal.", debris_m, debris_c));
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
    let pirates = rng.gen_range(10..100);
    let player = fleet_size + (defense_bonus * 5);
    if player > pirates {
        let lost = (fleet_size as f64 * rng.gen_range(0.0..0.2)) as i32;
        CombatResult { victory: true, message: "Victoire spatiale !".into(), ships_lost: lost }
    } else {
        let lost = (fleet_size as f64 * rng.gen_range(0.4..0.9)) as i32;
        CombatResult { victory: false, message: "Défaite cuisante...".into(), ships_lost: lost }
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
    // Formule adaptée pour un Speed Game : plus c'est loin, plus c'est long, mais bridé par le facteur vitesse
    let base_time = 10.0 + (dist.sqrt() / 2.0);
    let seconds = (base_time * 100.0) / speed_factor;
    seconds.max(5.0) as i64 // Minimum 5 secondes de vol
}