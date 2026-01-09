use chrono::{Utc, NaiveDateTime};
use serde::Serialize;

// TON SPEED FACTOR EST ICI
pub const SPEED_FACTOR: f64 = 400000.0; 

#[derive(Debug, Serialize, Clone, Copy)]
pub enum ResourceType { Metal, Crystal, Deuterium }

#[derive(Debug, Serialize)]
pub struct Cost { pub metal: f64, pub crystal: f64, pub deuterium: f64 }

#[derive(Serialize)]
pub struct CombatReport {
    pub victory: bool,
    pub ships_lost: i32,
    pub message: String,
}

#[derive(Serialize)]
pub struct PvpReport {
    pub winner: String, // "attacker" ou "defender"
    pub log: Vec<String>,
    pub loot: Cost,
    pub attacker_losses: i32,
    pub defender_losses: i32,
}


/// Résout un combat PvP (Attaquant vs Défenseur)
pub fn resolve_pvp(
    att_hunters: i32, 
    att_cruisers: i32,
    def_hunters: i32, 
    def_cruisers: i32, 
    def_lasers: i32,
    def_resources: Cost
) -> PvpReport {
    let mut log = Vec::new();
    
    // 1. Calcul de la puissance de feu (Valeurs arbitraires pour l'équilibrage)
    // Chasseur = 10 pts, Croiseur = 50 pts
    let att_power = (att_hunters * 10) + (att_cruisers * 50);
    
    // Défenseur : Flotte + Lasers (Laser = 20 pts)
    let def_power = (def_hunters * 10) + (def_cruisers * 50) + (def_lasers * 20);

    log.push(format!("Analyse Tactique : Force Attaquante {} vs Force Défensive {}", att_power, def_power));

    let winner;
    let loot;
    let attacker_losses;
    let defender_losses;

    if att_power > def_power {
        // VICTOIRE ATTAQUANT
        winner = "attacker".to_string();
        log.push("VICTOIRE : La défense ennemie a cédé.".to_string());
        
        // Calcul des pertes (L'attaquant perd un % basé sur la résistance ennemie)
        // Si la défense était faible, peu de pertes. Si forte, plus de pertes.
        let resistance_ratio = if att_power > 0 { def_power as f64 / att_power as f64 } else { 0.0 };
        let loss_percent = 0.1 + (0.4 * resistance_ratio); // Entre 10% et 50% de pertes
        
        attacker_losses = (att_hunters as f64 * loss_percent) as i32;
        defender_losses = (def_hunters as f64 * 0.8) as i32; // Le défenseur perd 80% de sa flotte en cas de défaite

        // Pillages (50% des ressources disponibles)
        loot = Cost {
            metal: def_resources.metal * 0.5,
            crystal: def_resources.crystal * 0.5,
            deuterium: def_resources.deuterium * 0.5,
        };
        log.push(format!("PILLAGE : {:.0} Métal, {:.0} Cristal volés.", loot.metal, loot.crystal));

    } else {
        // DÉFAITE ATTAQUANT
        winner = "defender".to_string();
        log.push("ECHEC : La flotte attaquante a été repoussée.".to_string());
        
        attacker_losses = (att_hunters as f64 * 0.7) as i32; // L'attaquant perd 70% en fuyant
        defender_losses = (def_hunters as f64 * 0.2) as i32; // Le défenseur perd un peu
        
        loot = Cost { metal: 0.0, crystal: 0.0, deuterium: 0.0 };
    }

    PvpReport {
        winner,
        log,
        loot,
        attacker_losses,
        defender_losses
    }
}

pub fn get_production_per_hour(resource_type: ResourceType, level: i32) -> f64 {
    let base_prod = match resource_type {
        ResourceType::Metal => 30.0,
        ResourceType::Crystal => 20.0,
        ResourceType::Deuterium => 10.0,
    };
    base_prod * (level as f64) * (1.1f64.powi(level)) * SPEED_FACTOR
}

pub fn calculate_resources(res_type: ResourceType, level: i32, amount: f64, last_update: NaiveDateTime) -> f64 {
    let now = Utc::now().naive_utc();
    let duration = now.signed_duration_since(last_update);
    let seconds = duration.num_seconds() as f64;
    
    if seconds <= 0.0 { return amount; }
    
    let prod_per_hour = get_production_per_hour(res_type, level);
    let added_res = (prod_per_hour * seconds) / 3600.0;

    let total = amount + added_res;

    if total.is_nan() || total.is_infinite() { amount } else { total }
}

pub fn get_upgrade_cost(r_type: &str, next_level: i32) -> Cost {
    let factor = next_level - 1;
    match r_type {
        "metal" => Cost { 
            metal: 60.0 * 1.5f64.powi(factor), 
            crystal: 15.0 * 1.5f64.powi(factor), 
            deuterium: 0.0 
        },
        "crystal" => Cost { 
            metal: 48.0 * 1.6f64.powi(factor), 
            crystal: 24.0 * 1.6f64.powi(factor), 
            deuterium: 0.0 
        },
        "deuterium" => Cost { 
            metal: 225.0 * 1.5f64.powi(factor), 
            crystal: 75.0 * 1.5f64.powi(factor), 
            deuterium: 0.0 
        },
        "research" => Cost { 
            metal: 200.0 * 2.0f64.powi(factor), 
            crystal: 400.0 * 2.0f64.powi(factor), 
            deuterium: 200.0 * 2.0f64.powi(factor)
        },
        "laser" => Cost { 
            metal: 500.0 * 1.8f64.powi(factor), 
            crystal: 250.0 * 1.8f64.powi(factor), 
            deuterium: 0.0 
        },
        "energy_tech" => Cost { 
            metal: 0.0, 
            crystal: 800.0 * 2.0f64.powi(factor), 
            deuterium: 400.0 * 2.0f64.powi(factor) 
        },
        _ => Cost { metal: 100.0, crystal: 100.0, deuterium: 0.0 }
    }
}

pub fn get_energy_consumption(m_lvl: i32, c_lvl: i32, d_lvl: i32) -> f64 {
    (10.0 * m_lvl as f64 * 1.1f64.powi(m_lvl)) + 
    (10.0 * c_lvl as f64 * 1.1f64.powi(c_lvl)) + 
    (12.0 * d_lvl as f64 * 1.1f64.powi(d_lvl))
}

pub fn simulate_combat(player_ships: i32, laser_level: i32) -> CombatReport {
    let enemy_power = 8;
    let strength = player_ships + (laser_level * 2);
    
    if strength >= enemy_power {
        let lost = (2 - (laser_level / 2)).max(0);
        CombatReport { 
            victory: true, 
            ships_lost: lost.min(player_ships), 
            message: format!("Victoire ! Vos systèmes de défense (Niv. {}) ont repoussé l'ennemi.", laser_level) 
        }
    } else {
        CombatReport { 
            victory: false, 
            ships_lost: player_ships, 
            message: "Défaite ! Votre flotte a été pulvérisée et vos entrepôts pillés.".into() 
        }
    }
}

pub fn get_light_hunter_stats() -> (f64, f64) { 
    (3000.0, 1000.0) // (Coût Métal, Coût Cristal)
}

pub fn get_ship_production_time(qty: i32) -> i64 { 
    // Utilise le SPEED_FACTOR pour réduire le temps
    let raw_time = (qty as f64 * 20.0) / SPEED_FACTOR;
    std::cmp::max(1, raw_time as i64) // Minimum 1 seconde
}

pub fn get_build_time(next_level: i32) -> i64 { 
    // Utilise le SPEED_FACTOR pour réduire le temps
    let raw_time = (next_level as f64 * 15.0) / SPEED_FACTOR;
    std::cmp::max(1, raw_time as i64) // Minimum 1 seconde
}