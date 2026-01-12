use serde::Serialize;
use rand::Rng;
use crate::entities::planet;

pub const SPEED_FACTOR: f64 = 1.0; // Vitesse du jeu

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
}

pub struct CombatResult {
    pub victory: bool,
    pub message: String,
    pub ships_lost: i32,
}

// Nouvelle structure pour passer les techs au combat
pub struct CombatTechs {
    pub laser: i32,
    pub energy: i32,
    pub armour: i32, // Réservé pour futur usage (Coque)
}

// --- VERIFICATION DES PREREQUIS ---
pub fn check_prerequisites(planet: &planet::Model, item_type: &str) -> Result<(), String> {
    match item_type {
        // BÂTIMENTS
        "crystal" | "deuterium" | "solar_plant" => Ok(()), 
        "research" => Ok(()), 
        "shipyard" => Ok(()),

        // RECHERCHES
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

        // FLOTTE
        "light_hunter" => {
            if planet.shipyard_level < 1 { return Err("Chantier Spatial niveau 1 requis".to_string()); }
            Ok(())
        },
        "cruiser" => {
            if planet.shipyard_level < 5 { return Err("Chantier Spatial niveau 5 requis".to_string()); }
            if planet.energy_tech_level < 4 { return Err("Technologie Énergie niveau 4 requise (Propulsion)".to_string()); }
            Ok(())
        },
        "recycler" => {
            if planet.shipyard_level < 4 { return Err("Chantier Spatial niveau 4 requis".to_string()); }
            if planet.energy_tech_level < 3 { return Err("Technologie Énergie niveau 3 requise".to_string()); }
            Ok(())
        },
        "spy_probe" => {
            if planet.shipyard_level < 1 { return Err("Chantier Spatial niveau 1 requis".to_string()); }
            if planet.espionage_tech_level < 1 { return Err("Technologie Espionnage niveau 1 requise".to_string()); }
            Ok(())
        },
        "colony_ship" => {
            if planet.shipyard_level < 4 { return Err("Chantier Spatial niveau 4 requis".to_string()); }
            if planet.energy_tech_level < 3 { return Err("Technologie Énergie niveau 3 requise".to_string()); }
            Ok(())
        },
        "transporter" => {
            if planet.shipyard_level < 2 { return Err("Chantier Spatial niveau 2 requis".to_string()); }
            Ok(())
        },

        // DÉFENSES
        "missile_launcher" => {
            if planet.shipyard_level < 1 { return Err("Chantier Spatial niveau 1 requis".to_string()); }
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

pub enum ResourceType {
    Metal,
    Crystal,
    Deuterium,
}

pub fn calculate_resources(
    res_type: ResourceType, 
    level: i32, 
    current_amount: f64, 
    last_update: chrono::NaiveDateTime,
    energy_tech_level: i32 // <-- Nouveau paramètre pour le bonus
) -> f64 {
    let now = chrono::Utc::now().naive_utc();
    let duration = now.signed_duration_since(last_update).num_seconds() as f64;
    
    // Bonus Tech Énergie : +5% par niveau
    let tech_bonus = 1.0 + (energy_tech_level as f64 * 0.05);

    // Formule de base : 30 * level * 1.1^level
    let base_production = match res_type {
        ResourceType::Metal => 30.0 * (level as f64) * 1.1f64.powi(level),
        ResourceType::Crystal => 20.0 * (level as f64) * 1.1f64.powi(level),
        ResourceType::Deuterium => 10.0 * (level as f64) * 1.1f64.powi(level),
    };

    // Production avec bonus
    let total_production = base_production * tech_bonus;

    // Production par seconde * Speed Factor
    let production_per_sec = (total_production / 3600.0) * SPEED_FACTOR;
    
    current_amount + (production_per_sec * duration)
}

// --- COÛTS & UPGRADES ---

pub fn get_upgrade_cost(building_type: &str, level: i32) -> Cost {
    let factor_mines = 1.5f64.powi(level - 1); 
    let factor_tech = 2.0f64.powi(level - 1);  

    match building_type {
        // Mines
        "metal" => Cost {
            metal: 60.0 * factor_mines,
            crystal: 15.0 * factor_mines,
            deuterium: 0.0,
        },
        "crystal" => Cost {
            metal: 48.0 * 1.6f64.powi(level - 1), 
            crystal: 24.0 * 1.6f64.powi(level - 1),
            deuterium: 0.0,
        },
        "deuterium" => Cost {
            metal: 225.0 * factor_mines,
            crystal: 75.0 * factor_mines,
            deuterium: 0.0,
        },
        "solar_plant" => Cost {
            metal: 75.0 * factor_mines,
            crystal: 30.0 * factor_mines,
            deuterium: 0.0,
        },
        
        // Installations
        "shipyard" => Cost {
            metal: 400.0 * factor_tech,
            crystal: 200.0 * factor_tech,
            deuterium: 100.0 * factor_tech,
        },
        "research" => Cost {
            metal: 200.0 * factor_tech,
            crystal: 400.0 * factor_tech,
            deuterium: 200.0 * factor_tech,
        },
        "hangar" => Cost {
            metal: 500.0 * factor_tech,
            crystal: 250.0 * factor_tech,
            deuterium: 100.0 * factor_tech,
        },

        // Technologies
        "energy_tech" => Cost {
            metal: 0.0,
            crystal: 800.0 * factor_tech,
            deuterium: 400.0 * factor_tech,
        },
        "laser" => Cost {
            metal: 200.0 * factor_tech,
            crystal: 100.0 * factor_tech,
            deuterium: 0.0,
        },
        "espionage" => Cost { 
            metal: 200.0 * factor_tech, 
            crystal: 1000.0 * factor_tech, 
            deuterium: 200.0 * factor_tech
        },
        _ => Cost { metal: 0.0, crystal: 0.0, deuterium: 0.0 },
    }
}

// --- TEMPS DE CONSTRUCTION ---

// Prend en compte le niveau de l'installation (Labo ou Chantier)
pub fn get_build_time(metal_cost: f64, crystal_cost: f64, facility_level: i32) -> i64 {
    let total_cost = metal_cost + crystal_cost;
    
    // Le temps est réduit par le niveau du bâtiment (Robot/Chantier ou Labo)
    // Formule : Temps / (1 + niveau)
    let reduction_factor = 1.0 + (facility_level as f64);
    
    let hours = (total_cost / 2500.0) / (SPEED_FACTOR * reduction_factor); 
    let seconds = (hours * 3600.0) as i64;
    
    std::cmp::max(2, seconds)
}

// Pour la flotte
pub fn get_ship_production_time(qty: i32) -> i64 {
    let base_time_per_unit = 20.0 / SPEED_FACTOR; 
    std::cmp::max(1, (base_time_per_unit * qty as f64) as i64)
}

// --- STATS FLOTTE & DÉFENSES (Metal, Crystal) ---

pub fn get_light_hunter_stats() -> (f64, f64) { (3000.0, 1000.0) }
pub fn get_colony_ship_stats() -> (f64, f64) { (10000.0, 20000.0) }
pub fn get_transporter_stats() -> (f64, f64) { (4000.0, 2000.0) }
pub fn get_spy_probe_stats() -> (f64, f64) { (0.0, 1000.0) }
pub fn get_missile_launcher_stats() -> (f64, f64) { (2000.0, 0.0) }
pub fn get_plasma_turret_stats() -> (f64, f64) { (50000.0, 50000.0) }

pub fn get_fleet_capacity(hangar_level: i32) -> i32 {
    // Base 500 places + 500 par niveau de hangar
    500 + (hangar_level * 500)
}

pub const TRANSPORTER_CAPACITY: f64 = 10000.0;

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
    att_hunters: i32, att_cruisers: i32, att_techs: CombatTechs,
    def_hunters: i32, def_cruisers: i32, 
    def_lasers: i32, def_missiles: i32, def_plasmas: i32, 
    def_techs: CombatTechs,
    def_resources: Cost   
) -> PvpReport {
    let mut log = Vec::new();

    // 1. CALCUL DES BONUS TECH (Laser +10% par niveau)
    let att_dmg_mult = 1.0 + (att_techs.laser as f64 * 0.10);
    let def_dmg_mult = 1.0 + (def_techs.laser as f64 * 0.10);

    // 2. CALCUL PUISSANCE DE FEU
    let att_power = ((att_hunters as f64 * 50.0) + (att_cruisers as f64 * 400.0)) * att_dmg_mult;
    
    let def_power = ((def_hunters as f64 * 50.0) 
                  + (def_cruisers as f64 * 400.0) 
                  + (def_lasers as f64 * 100.0)      
                  + (def_missiles as f64 * 80.0) 
                  + (def_plasmas as f64 * 2000.0)) * def_dmg_mult;

    log.push(format!("Analyse : Force Attaque {:.0} (Bonus Laser +{}%) vs Force Défense {:.0} (Bonus Laser +{}%)", 
        att_power, (att_techs.laser * 10), def_power, (def_techs.laser * 10)));

    let winner;
    let loot;
    let attacker_losses;
    let defender_losses;
    let defense_struct_lost; 

    // PERTES
    let att_lost_hunters;
    let att_lost_cruisers;
    let def_lost_hunters;
    let def_lost_cruisers;

   if att_power > def_power {
        winner = "attacker".to_string();
        log.push("VICTOIRE : Défenses percées.".to_string());
        
        let ratio = if att_power > 0.0 { def_power / att_power } else { 0.0 };
        let loss_percent = 0.1 + (0.4 * ratio);
        
        att_lost_hunters = (att_hunters as f64 * loss_percent) as i32;
        att_lost_cruisers = (att_cruisers as f64 * loss_percent) as i32;
        
        attacker_losses = att_lost_hunters + att_lost_cruisers;

        def_lost_hunters = (def_hunters as f64 * 0.8) as i32;
        def_lost_cruisers = (def_cruisers as f64 * 0.8) as i32;
        
        defender_losses = def_lost_hunters + def_lost_cruisers;
        defense_struct_lost = (def_missiles as f64 * 0.6) as i32;

        loot = Cost {
            metal: def_resources.metal * 0.5,
            crystal: def_resources.crystal * 0.5,
            deuterium: def_resources.deuterium * 0.5,
        };

    } else {
        winner = "defender".to_string();
        log.push("DÉFAITE : La forteresse a tenu bon.".to_string());
        
        att_lost_hunters = (att_hunters as f64 * 0.8) as i32;
        att_lost_cruisers = (att_cruisers as f64 * 0.8) as i32;
        attacker_losses = att_lost_hunters + att_lost_cruisers;

        def_lost_hunters = (def_hunters as f64 * 0.1) as i32;
        def_lost_cruisers = (def_cruisers as f64 * 0.1) as i32;
        defender_losses = def_lost_hunters + def_lost_cruisers;
        
        defense_struct_lost = (def_missiles as f64 * 0.1) as i32;
        
        loot = Cost { metal: 0.0, crystal: 0.0, deuterium: 0.0 };
    }

    // CALCUL DU CDR (CHAMP DE DÉBRIS)
    let (hunter_m, hunter_c) = get_light_hunter_stats();
    let (cruiser_m, cruiser_c) = (20000.0, 7000.0);

    let debris_metal = ((att_lost_hunters + def_lost_hunters) as f64 * hunter_m * 0.3) 
                     + ((att_lost_cruisers + def_lost_cruisers) as f64 * cruiser_m * 0.3);
    
    let debris_crystal = ((att_lost_hunters + def_lost_hunters) as f64 * hunter_c * 0.3) 
                       + ((att_lost_cruisers + def_lost_cruisers) as f64 * cruiser_c * 0.3);

    if debris_metal > 0.0 || debris_crystal > 0.0 {
        log.push(format!("DÉBRIS : Un champ de débris s'est formé ({:.0} M, {:.0} C).", debris_metal, debris_crystal));
    }

    PvpReport {
        winner,
        log,
        loot,
        debris: Cost { metal: debris_metal, crystal: debris_crystal, deuterium: 0.0 },
        attacker_losses,
        defender_losses: defender_losses + defense_struct_lost
    }
}