use chrono::{Utc, NaiveDateTime};
use serde::Serialize;

const SPEED_FACTOR: f64 = 10.0; 

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

/// Calcule la production théorique par heure pour un type et un niveau donné
pub fn get_production_per_hour(resource_type: ResourceType, level: i32) -> f64 {
    let base_prod = match resource_type {
        ResourceType::Metal => 30.0,
        ResourceType::Crystal => 20.0,
        ResourceType::Deuterium => 10.0,
    };
    // Formule : Base * Niveau * 1.1^Niveau * Vitesse du serveur
    base_prod * (level as f64) * (1.1f64.powi(level)) * SPEED_FACTOR
}

/// Calcule les ressources accumulées entre le dernier rafraîchissement et maintenant
pub fn calculate_resources(res_type: ResourceType, level: i32, amount: f64, last_update: NaiveDateTime) -> f64 {
    let now = Utc::now().naive_utc();
    let duration = now.signed_duration_since(last_update);
    let seconds = duration.num_seconds() as f64;
    
    // Si le temps écoulé est incohérent, on ne produit rien
    if seconds <= 0.0 { return amount; }
    
    let prod_per_hour = get_production_per_hour(res_type, level);
    let added_res = (prod_per_hour * seconds) / 3600.0;

    let total = amount + added_res;

    // Protection finale contre le NaN avant envoi au JSON
    if total.is_nan() || total.is_infinite() { amount } else { total }
}

/// Définit les coûts d'amélioration pour chaque structure et technologie
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

/// Calcule la consommation totale d'énergie de la planète
pub fn get_energy_consumption(m_lvl: i32, c_lvl: i32, d_lvl: i32) -> f64 {
    (10.0 * m_lvl as f64 * 1.1f64.powi(m_lvl)) + 
    (10.0 * c_lvl as f64 * 1.1f64.powi(c_lvl)) + 
    (12.0 * d_lvl as f64 * 1.1f64.powi(d_lvl))
}

/// Simule un combat contre une force ennemie
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

// --- STATISTIQUES UNITÉS ET TEMPS ---

pub fn get_light_hunter_stats() -> (f64, f64) { 
    (3000.0, 1000.0) // (Coût Métal, Coût Cristal)
}

pub fn get_ship_production_time(qty: i32) -> i64 { 
    // 20 secondes de base par vaisseau, réduit par le facteur vitesse
    ((qty as f64 * 20.0) / SPEED_FACTOR) as i64 
}

pub fn get_build_time(next_level: i32) -> i64 { 
    // 15 secondes par niveau, réduit par le facteur vitesse
    ((next_level as f64 * 15.0) / SPEED_FACTOR) as i64 
}