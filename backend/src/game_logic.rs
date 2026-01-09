use serde::Serialize;
use rand::Rng;

pub const SPEED_FACTOR: f64 = 500.0; // Vitesse du jeu

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
    pub attacker_losses: i32,
    pub defender_losses: i32,
}

pub struct CombatResult {
    pub victory: bool,
    pub message: String,
    pub ships_lost: i32,
}

// --- CALCULS RESSOURCES ---

pub enum ResourceType {
    Metal,
    Crystal,
    Deuterium,
}

pub fn calculate_resources(res_type: ResourceType, level: i32, current_amount: f64, last_update: chrono::NaiveDateTime) -> f64 {
    let now = chrono::Utc::now().naive_utc();
    let duration = now.signed_duration_since(last_update).num_seconds() as f64;
    
    // Formule OGame style : 30 * level * 1.1^level
    let base_production = match res_type {
        ResourceType::Metal => 30.0 * (level as f64) * 1.1f64.powi(level),
        ResourceType::Crystal => 20.0 * (level as f64) * 1.1f64.powi(level),
        ResourceType::Deuterium => 10.0 * (level as f64) * 1.1f64.powi(level),
    };

    // Production par seconde * Speed Factor
    let production_per_sec = (base_production / 3600.0) * SPEED_FACTOR;
    
    current_amount + (production_per_sec * duration)
}

// --- COÛTS ---

pub fn get_upgrade_cost(building_type: &str, level: i32) -> Cost {
    let factor = 2.0f64.powi(level - 1); // Coût double à chaque niveau

    match building_type {
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
        "energy_tech" => Cost {
            metal: 0.0,
            crystal: 800.0 * factor,
            deuterium: 400.0 * factor,
        },
        "research" => Cost {
            metal: 200.0 * factor,
            crystal: 400.0 * factor,
            deuterium: 200.0 * factor,
        },
        "laser" => Cost {
            metal: 1500.0 * factor,
            crystal: 500.0 * factor,
            deuterium: 100.0 * factor,
        },
        "espionage" => Cost { 
            metal: 200.0 * factor, 
            crystal: 1000.0 * factor, 
            deuterium: 200.0 * factor
        },
        _ => Cost { metal: 0.0, crystal: 0.0, deuterium: 0.0 },
    }
}

// --- TEMPS DE CONSTRUCTION ---

// Pour les bâtiments (basé sur le coût)
pub fn get_build_time(metal_cost: f64, crystal_cost: f64) -> i64 {
    let total_cost = metal_cost + crystal_cost;
    let hours = (total_cost / 2500.0) / SPEED_FACTOR; 
    let seconds = (hours * 3600.0) as i64;
    std::cmp::max(2, seconds)
}

// Pour la flotte (basé sur la quantité et vitesse de base) - C'EST CELLE QUI MANQUAIT
pub fn get_ship_production_time(qty: i32) -> i64 {
    let base_time_per_unit = 20.0 / SPEED_FACTOR; 
    std::cmp::max(1, (base_time_per_unit * qty as f64) as i64)
}

// --- STATS FLOTTE & DÉFENSES ---

pub fn get_light_hunter_stats() -> (f64, f64) {
    (3000.0, 1000.0) // Metal, Crystal
}

pub fn get_spy_probe_stats() -> (f64, f64) {
    (0.0, 1000.0)
}

pub fn get_missile_launcher_stats() -> (f64, f64) {
    (2000.0, 0.0)
}

pub fn get_plasma_turret_stats() -> (f64, f64) {
    (50000.0, 50000.0)
}

// --- COMBAT & LOGIQUE ---

pub fn simulate_combat(fleet_size: i32, defense_bonus: i32) -> CombatResult {
    let mut rng = rand::thread_rng();
    let pirates_strength = rng.gen_range(10..100);
    let player_strength = fleet_size + (defense_bonus * 5);

    if player_strength > pirates_strength {
        let loss_percent = rng.gen_range(0.0..0.2);
        let ships_lost = (fleet_size as f64 * loss_percent) as i32;
        
        CombatResult {
            victory: true,
            message: format!("Victoire ! L'ennemi (Force {}) a été écrasé.", pirates_strength),
            ships_lost,
        }
    } else {
        let loss_percent = rng.gen_range(0.3..0.8);
        let ships_lost = (fleet_size as f64 * loss_percent) as i32;
        
        CombatResult {
            victory: false,
            message: format!("Défaite... Les pirates (Force {}) étaient trop nombreux.", pirates_strength),
            ships_lost,
        }
    }
}

pub fn resolve_pvp(
    att_hunters: i32, 
    att_cruisers: i32,
    def_hunters: i32, 
    def_cruisers: i32, 
    def_lasers: i32,      
    def_missiles: i32,    
    def_plasmas: i32,     
    def_resources: Cost   
) -> PvpReport {
    let mut log = Vec::new();
    
    // ATTAQUANT
    let att_power = (att_hunters * 10) + (att_cruisers * 50);
    
    // DÉFENSEUR
    let def_power = (def_hunters * 10) 
                  + (def_cruisers * 50) 
                  + (def_lasers * 20)      
                  + (def_missiles * 20) 
                  + (def_plasmas * 200);

    log.push(format!("Analyse : Force Attaque {} vs Force Défense {}", att_power, def_power));

    let winner;
    let loot;
    let attacker_losses;
    let defender_losses;
    let defense_struct_lost; 

    if att_power > def_power {
        winner = "attacker".to_string();
        log.push("VICTOIRE : Défenses percées.".to_string());
        
        let ratio = if att_power > 0 { def_power as f64 / att_power as f64 } else { 0.0 };
        let loss_percent = 0.1 + (0.4 * ratio);
        
        attacker_losses = (att_hunters as f64 * loss_percent) as i32;
        defender_losses = (def_hunters as f64 * 0.8) as i32;
        defense_struct_lost = (def_missiles as f64 * 0.6) as i32;

        loot = Cost {
            metal: def_resources.metal * 0.5,
            crystal: def_resources.crystal * 0.5,
            deuterium: def_resources.deuterium * 0.5,
        };
        log.push(format!("DÉFENSES DÉTRUITES : {} Lanceurs, {} Plasmas", defense_struct_lost, (def_plasmas as f64 * 0.6) as i32));

    } else {
        winner = "defender".to_string();
        log.push("DÉFAITE : La forteresse a tenu bon.".to_string());
        
        attacker_losses = (att_hunters as f64 * 0.8) as i32;
        defender_losses = (def_hunters as f64 * 0.1) as i32;
        defense_struct_lost = (def_missiles as f64 * 0.1) as i32;
        
        loot = Cost { metal: 0.0, crystal: 0.0, deuterium: 0.0 };
    }

    PvpReport {
        winner,
        log,
        loot,
        attacker_losses,
        defender_losses: defender_losses + defense_struct_lost
    }
}