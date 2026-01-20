use serde::{Deserialize, Serialize};
use rand::Rng;
use std::collections::HashMap;
use sea_orm::DatabaseConnection;

// --- STRUCTURES DE DONNÉES ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CombatReport {
    pub log: Vec<String>,       // Le journal du combat (ex: "Tour 1: 500 dégâts infligés")
    pub winner: String,         // "player", "pirates", or "draw"
    pub loot_metal: f64,        // Gain en cas de victoire
    pub remaining_ships: HashMap<String, i32>, // All remaining ships by ship_key
}

/// Ship stats loaded from database
#[derive(Debug, Clone)]
pub struct ShipStats {
    pub attack: i32,
    pub shield: i32,
    pub hull: i32,
    pub display_name: String,
}

/// Cache of ship stats for combat calculations
pub type ShipStatsCache = HashMap<String, ShipStats>;

/// Rapid fire rules: (attacker_ship_key, target_ship_key) -> multiplier
/// Example: ("destroyer", "light_hunter") -> 5 means destroyers fire 5x against light hunters
pub type RapidFireCache = HashMap<(String, String), i32>;

/// Load ship stats from database into a cache
pub async fn load_ship_stats_cache(db: &DatabaseConnection) -> Result<ShipStatsCache, sea_orm::DbErr> {
    use sea_orm::EntityTrait;
    use crate::entities::prelude::ShipType;

    let all_ships = ShipType::find().all(db).await?;

    let mut cache = HashMap::new();
    for ship in all_ships {
        cache.insert(
            ship.ship_key.clone(),
            ShipStats {
                attack: ship.attack,
                shield: ship.shield,
                hull: ship.hull,
                display_name: ship.display_name,
            },
        );
    }

    Ok(cache)
}

/// Load rapid fire rules from database
pub async fn load_rapid_fire_cache(db: &DatabaseConnection) -> Result<RapidFireCache, sea_orm::DbErr> {
    use sea_orm::EntityTrait;
    use crate::entities::prelude::{RapidFireRule, ShipType};

    let all_rules = RapidFireRule::find().all(db).await?;

    let mut cache = HashMap::new();
    for rule in all_rules {
        // Get ship keys from ship_type_id
        if let (Some(attacker), Some(target)) = (
            ShipType::find_by_id(rule.attacker_ship_id).one(db).await?,
            ShipType::find_by_id(rule.target_id).one(db).await?,
        ) {
            cache.insert(
                (attacker.ship_key, target.ship_key),
                rule.rapid_fire_value,
            );
        }
    }

    Ok(cache)
}

#[derive(Debug, Clone)]
struct Fleet {
    ships: HashMap<String, i32>,
}

impl Fleet {
    fn new() -> Self {
        Fleet {
            ships: HashMap::new(),
        }
    }

    fn set_ship_count(&mut self, ship_type: &str, count: i32) {
        if count > 0 {
            self.ships.insert(ship_type.to_string(), count);
        }
    }

    fn get_ship_count(&self, ship_type: &str) -> i32 {
        *self.ships.get(ship_type).unwrap_or(&0)
    }

    fn get_all_ships(&self) -> &HashMap<String, i32> {
        &self.ships
    }

    // Calcul de la puissance de feu totale (dynamique avec stats DB)
    fn get_total_attack(&self, stats_cache: &ShipStatsCache) -> f64 {
        let mut total = 0.0;
        for (ship_key, count) in &self.ships {
            if let Some(stats) = stats_cache.get(ship_key) {
                total += *count as f64 * stats.attack as f64;
            }
        }
        total
    }

    // Calculate damage dealt to target fleet with rapid fire rules
    fn calculate_damage_to_fleet(
        &self,
        target: &Fleet,
        stats_cache: &ShipStatsCache,
        rapid_fire_cache: &RapidFireCache,
    ) -> f64 {
        let mut total_damage = 0.0;

        // For each attacking ship type
        for (attacker_key, attacker_count) in &self.ships {
            if let Some(attacker_stats) = stats_cache.get(attacker_key) {
                let base_attack = attacker_stats.attack as f64 * (*attacker_count as f64);

                // Calculate effective damage considering rapid fire against each target type
                let mut effective_damage = 0.0;
                let target_ship_count = target.ships.len() as f64;

                if target_ship_count > 0.0 {
                    for (target_key, target_count) in &target.ships {
                        // Check for rapid fire rule
                        let rapid_fire_mult = rapid_fire_cache
                            .get(&(attacker_key.clone(), target_key.clone()))
                            .copied()
                            .unwrap_or(1);

                        // Weight by target proportion in enemy fleet
                        let target_proportion = (*target_count as f64) / target.ships.values().sum::<i32>() as f64;
                        effective_damage += base_attack * (rapid_fire_mult as f64) * target_proportion;
                    }
                } else {
                    effective_damage = base_attack;
                }

                total_damage += effective_damage;
            }
        }

        total_damage
    }

    // Calcul des points de vie totaux (Shield + Hull)
    fn get_total_defense(&self, stats_cache: &ShipStatsCache) -> f64 {
        let mut total = 0.0;
        for (ship_key, count) in &self.ships {
            if let Some(stats) = stats_cache.get(ship_key) {
                // Defense = shield + hull
                let defense = stats.shield + stats.hull;
                total += *count as f64 * defense as f64;
            }
        }
        total
    }

    // Appliquer les dégâts : On réduit le nombre de vaisseaux au prorata des dégâts reçus
    fn take_damage(&mut self, damage: f64, stats_cache: &ShipStatsCache) {
        let total_def = self.get_total_defense(stats_cache);
        if total_def <= 0.0 { return; }

        // Si la flotte prend 1000 dégâts sur 10000 PV, elle perd 10% de ses vaisseaux
        let loss_ratio = damage / total_def;

        // Apply losses to all ship types
        let ship_types: Vec<String> = self.ships.keys().cloned().collect();
        for ship_type in ship_types {
            if let Some(count) = self.ships.get_mut(&ship_type) {
                *count = (*count as f64 * (1.0 - loss_ratio)).floor() as i32;
                if *count <= 0 {
                    self.ships.remove(&ship_type);
                }
            }
        }
    }

    fn is_destroyed(&self) -> bool {
        self.ships.is_empty() || self.ships.values().all(|&count| count <= 0)
    }
}

// --- MOTEUR DE COMBAT PRINCIPAL (DATABASE VERSION) ---

/// Resolve expedition combat using database ship stats
pub async fn resolve_expedition_combat(
    db: &DatabaseConnection,
    player_ships: HashMap<String, i32>,
) -> Result<CombatReport, sea_orm::DbErr> {
    let mut logs = Vec::new();

    // Load ship stats and rapid fire rules from database
    let stats_cache = load_ship_stats_cache(db).await?;
    let rapid_fire_cache = load_rapid_fire_cache(db).await?;

    // 1. Initialize player fleet
    let mut player_fleet = Fleet::new();
    for (ship_key, count) in &player_ships {
        player_fleet.set_ship_count(ship_key, *count);
    }

    // 2. Generate pirate fleet (scaling factor 50% to 110% of player strength)
    let scaling_factor = 0.5 + (rand::random::<f64>() * 0.6); // Random value between 0.5 and 1.1
    let mut pirate_fleet = Fleet::new();

    // Pirates mirror player fleet composition with scaling
    for (ship_key, count) in &player_ships {
        if *count > 0 {
            // Apply different scaling for different ship types
            let type_scaling = match ship_key.as_str() {
                "heavy_hunter" => 0.7,
                "battleship" => 0.6,
                "bomber" => 0.5,
                "destroyer" => 0.5,
                _ => 1.0,
            };
            let pirate_count = (*count as f64 * scaling_factor * type_scaling).ceil() as i32;
            if pirate_count > 0 {
                pirate_fleet.set_ship_count(ship_key, pirate_count);
            }
        }
    }

    // Ensure pirates always have at least some ships
    if pirate_fleet.is_destroyed() {
        let count = 1 + (rand::random::<f64>() * 2.0).floor() as i32; // Random 1 or 2
        pirate_fleet.set_ship_count("light_hunter", count);
    }

    logs.push(format!(
        "ALERTE : Flotte Pirate interceptée ! (Force estimée: {:.0}%)",
        scaling_factor * 100.0
    ));

    // Log pirate fleet composition
    let mut hostile_desc = String::from("HOSTILES : ");
    let mut ship_descriptions = Vec::new();

    for (ship_key, count) in pirate_fleet.get_all_ships() {
        if *count > 0 {
            let name = stats_cache
                .get(ship_key)
                .map(|s| s.display_name.as_str())
                .unwrap_or("Vaisseaux");
            ship_descriptions.push(format!("{} {}", count, name));
        }
    }
    hostile_desc.push_str(&ship_descriptions.join(", "));
    logs.push(hostile_desc);

    // 3. Combat loop (Max 6 rounds)
    let mut round = 1;
    let mut winner = "draw".to_string();

    while round <= 6 {
        // Calculate firepower for this round (with rapid fire rules)
        let player_dmg = player_fleet.calculate_damage_to_fleet(&pirate_fleet, &stats_cache, &rapid_fire_cache);
        let pirate_dmg = pirate_fleet.calculate_damage_to_fleet(&player_fleet, &stats_cache, &rapid_fire_cache);

        // Apply simultaneous damage
        pirate_fleet.take_damage(player_dmg, &stats_cache);
        player_fleet.take_damage(pirate_dmg, &stats_cache);

        logs.push(format!(
            "TOUR {}: Nous infligeons {:.0} dmg. Pirates ripostent avec {:.0} dmg.",
            round, player_dmg, pirate_dmg
        ));

        // Check victory conditions
        if player_fleet.is_destroyed() && pirate_fleet.is_destroyed() {
            winner = "draw".to_string();
            logs.push("DESTRUCTION MUTUELLE : Aucune flotte n'a survécu.".to_string());
            break;
        } else if pirate_fleet.is_destroyed() {
            winner = "player".to_string();
            logs.push("VICTOIRE : La flotte pirate a été annihilée.".to_string());
            break;
        } else if player_fleet.is_destroyed() {
            winner = "pirates".to_string();
            logs.push("DÉFAITE : Contact perdu avec notre flotte.".to_string());
            break;
        }

        round += 1;
    }

    if round > 6 {
        logs.push("FUITE : Le combat s'éternise, les flottes se désengagent.".to_string());
    }

    // 4. Calculate loot (only on victory)
    let mut loot = 0.0;
    if winner == "player" {
        // Loot based on defeated pirate strength
        loot = (pirate_fleet.get_total_attack(&stats_cache) * 10.0) + 5000.0;
        logs.push(format!("EPAVE FOUILLÉE : +{:.0} Métal récupéré.", loot));
    }

    // Build remaining ships map
    let mut remaining_ships = HashMap::new();
    for (ship_key, count) in player_fleet.get_all_ships() {
        remaining_ships.insert(ship_key.clone(), *count);
    }

    Ok(CombatReport {
        log: logs,
        winner,
        loot_metal: loot,
        remaining_ships,
    })
}

/// Resolve PvP combat using database ship stats
/// Returns combat report with winner, remaining ships, loot, and debris
pub async fn resolve_pvp_combat(
    db: &DatabaseConnection,
    attacker_ships: HashMap<String, i32>,
    defender_ships: HashMap<String, i32>,
    defender_resources: (f64, f64, f64), // (metal, crystal, deuterium)
) -> Result<PvpCombatReport, sea_orm::DbErr> {
    let mut logs = Vec::new();

    // Load ship stats and rapid fire rules from database
    let stats_cache = load_ship_stats_cache(db).await?;
    let rapid_fire_cache = load_rapid_fire_cache(db).await?;

    // 1. Initialize attacker fleet
    let mut attacker_fleet = Fleet::new();
    for (ship_key, count) in &attacker_ships {
        attacker_fleet.set_ship_count(ship_key, *count);
    }

    // 2. Initialize defender fleet
    let mut defender_fleet = Fleet::new();
    for (ship_key, count) in &defender_ships {
        defender_fleet.set_ship_count(ship_key, *count);
    }

    logs.push("⚔️ ENGAGEMENT DE COMBAT PvP".to_string());

    // 3. Combat simulation (max 6 rounds)
    let max_rounds = 6;
    let mut winner = "draw";

    for round in 1..=max_rounds {
        if attacker_fleet.is_destroyed() || defender_fleet.is_destroyed() {
            break;
        }

        logs.push(format!("--- ROUND {} ---", round));

        // Attacker shoots first
        let attacker_damage = attacker_fleet.calculate_damage_to_fleet(&defender_fleet, &stats_cache, &rapid_fire_cache);
        defender_fleet.take_damage(attacker_damage, &stats_cache);

        if attacker_damage > 0.0 {
            logs.push(format!("Attaquant inflige {:.0} dégâts", attacker_damage));
        }

        if defender_fleet.is_destroyed() {
            winner = "attacker";
            logs.push("Défenseur détruit !".to_string());
            break;
        }

        // Defender shoots back
        let defender_damage = defender_fleet.calculate_damage_to_fleet(&attacker_fleet, &stats_cache, &rapid_fire_cache);
        attacker_fleet.take_damage(defender_damage, &stats_cache);

        if defender_damage > 0.0 {
            logs.push(format!("Défenseur inflige {:.0} dégâts", defender_damage));
        }

        if attacker_fleet.is_destroyed() {
            winner = "defender";
            logs.push("Attaquant détruit !".to_string());
            break;
        }
    }

    // Calculate loot (50% of resources if attacker wins)
    let (loot_metal, loot_crystal, loot_deuterium) = if winner == "attacker" {
        (
            defender_resources.0 * 0.5,
            defender_resources.1 * 0.5,
            defender_resources.2 * 0.5,
        )
    } else {
        (0.0, 0.0, 0.0)
    };

    // Calculate debris (30% of destroyed ships value)
    let debris_metal = 0.0; // Simplified for now
    let debris_crystal = 0.0;

    logs.push(format!("RÉSULTAT: {}", match winner {
        "attacker" => "VICTOIRE ATTAQUANT",
        "defender" => "VICTOIRE DÉFENSEUR",
        _ => "MATCH NUL"
    }));

    Ok(PvpCombatReport {
        log: logs,
        winner: winner.to_string(),
        attacker_remaining: attacker_fleet.get_all_ships().clone(),
        defender_remaining: defender_fleet.get_all_ships().clone(),
        loot: (loot_metal, loot_crystal, loot_deuterium),
        debris: (debris_metal, debris_crystal),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PvpCombatReport {
    pub log: Vec<String>,
    pub winner: String,
    pub attacker_remaining: HashMap<String, i32>,
    pub defender_remaining: HashMap<String, i32>,
    pub loot: (f64, f64, f64), // (metal, crystal, deuterium)
    pub debris: (f64, f64),    // (metal, crystal)
}
