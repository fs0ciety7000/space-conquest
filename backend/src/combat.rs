use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use sea_orm::DatabaseConnection;
use crate::ServerConfigCache;

// --- STRUCTURES DE DONNÉES ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CombatReport {
    pub log: Vec<String>,       // Le journal du combat (ex: "Tour 1: 500 dégâts infligés")
    pub winner: String,         // "player", "pirates", or "draw"
    pub loot_metal: f64,        // Gain en cas de victoire
    pub remaining_ships: HashMap<String, i32>, // All remaining ships by ship_key
}

/// Ship stats loaded from database (also used for defense units with "def_" prefix)
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
pub type RapidFireCache = HashMap<(String, String), i32>;

/// Technology bonuses applied during combat
#[derive(Debug, Clone)]
pub struct CombatBonuses {
    pub weapons_mult: f64, // 1.0 + weapons_tech_level * 0.1  (+10% attack per level)
    pub shield_mult: f64,  // 1.0 + shield_tech_level  * 0.1  (+10% shield per level)
    pub armour_mult: f64,  // 1.0 + armour_tech_level  * 0.1  (+10% hull per level)
}

impl Default for CombatBonuses {
    fn default() -> Self {
        CombatBonuses { weapons_mult: 1.0, shield_mult: 1.0, armour_mult: 1.0 }
    }
}

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

/// Load defense structure stats from database and merge into an existing ShipStatsCache.
/// Defense units are keyed as "def_{defense_key}" to avoid collision with ship keys.
pub async fn load_defense_stats_into_cache(
    db: &DatabaseConnection,
    cache: &mut ShipStatsCache,
) -> Result<(), sea_orm::DbErr> {
    use sea_orm::EntityTrait;
    use crate::entities::prelude::DefenseType;

    let all_defenses = DefenseType::find().all(db).await?;
    for defense in all_defenses {
        cache.insert(
            format!("def_{}", defense.defense_key),
            ShipStats {
                attack: defense.attack,
                shield: defense.shield,
                hull: defense.hull,
                display_name: defense.name,
            },
        );
    }

    Ok(())
}

/// Load rapid fire rules from database.
/// CMB-005: Pre-load all ShipType rows into a HashMap to avoid N+1 queries.
/// Previously this issued 2 queries per rule row; now it issues exactly 2 queries total.
pub async fn load_rapid_fire_cache(db: &DatabaseConnection) -> Result<RapidFireCache, sea_orm::DbErr> {
    use sea_orm::EntityTrait;
    use crate::entities::prelude::{RapidFireRule, ShipType};

    // Single query: load all ship types keyed by their numeric id
    let all_ships = ShipType::find().all(db).await?;
    let ship_key_by_id: HashMap<i32, String> = all_ships
        .into_iter()
        .map(|s| (s.id, s.ship_key))
        .collect();

    let all_rules = RapidFireRule::find().all(db).await?;

    let mut cache = HashMap::new();
    for rule in all_rules {
        if let (Some(attacker_key), Some(target_key)) = (
            ship_key_by_id.get(&rule.attacker_ship_type_id).cloned(),
            ship_key_by_id.get(&rule.target_ship_type_id).cloned(),
        ) {
            cache.insert((attacker_key, target_key), rule.rapid_fire_value);
        }
    }

    Ok(cache)
}

/// BALANCE-0-A — Load ship-vs-defense rapid fire rules from `rapid_fire_defense_rules`
/// and merge them into an existing `RapidFireCache`.
///
/// Defense units in combat are keyed as `"def_{defense_key}"` (e.g., `"def_rocket_launcher"`).
/// To reuse `calculate_damage_to_fleet` without modification, we store rules with the
/// `"def_"` prefix on the target key so the lookup `(attacker_key, "def_<defense_key>")` hits.
///
/// Uses exactly 3 queries total (ship_types, defense_types, rapid_fire_defense_rules).
pub async fn load_defense_rapid_fire_into_cache(
    db: &DatabaseConnection,
    cache: &mut RapidFireCache,
) -> Result<(), sea_orm::DbErr> {
    use sea_orm::EntityTrait;
    use crate::entities::prelude::{DefenseType, RapidFireDefenseRule, ShipType};

    let all_ships = ShipType::find().all(db).await?;
    let ship_key_by_id: HashMap<i32, String> = all_ships
        .into_iter()
        .map(|s| (s.id, s.ship_key))
        .collect();

    let all_defenses = DefenseType::find().all(db).await?;
    let defense_key_by_id: HashMap<i32, String> = all_defenses
        .into_iter()
        .map(|d| (d.id, d.defense_key))
        .collect();

    let all_rules = RapidFireDefenseRule::find().all(db).await?;

    for rule in all_rules {
        if let (Some(ship_key), Some(defense_key)) = (
            ship_key_by_id.get(&rule.attacker_ship_type_id).cloned(),
            defense_key_by_id.get(&rule.target_defense_type_id).cloned(),
        ) {
            // Insert with "def_" prefix on the target so it matches how defenses are
            // keyed in the Fleet HashMap during combat.
            cache.insert(
                (ship_key, format!("def_{}", defense_key)),
                rule.rapid_fire_value,
            );
        }
    }

    Ok(())
}

#[derive(Debug, Clone)]
struct Fleet {
    ships: HashMap<String, i32>,
}

impl Fleet {
    fn new() -> Self {
        Fleet { ships: HashMap::new() }
    }

    fn set_ship_count(&mut self, ship_type: &str, count: i32) {
        if count > 0 {
            self.ships.insert(ship_type.to_string(), count);
        }
    }

    fn get_all_ships(&self) -> &HashMap<String, i32> {
        &self.ships
    }

    fn get_total_attack(&self, stats_cache: &ShipStatsCache) -> f64 {
        let mut total = 0.0;
        for (ship_key, count) in &self.ships {
            if let Some(stats) = stats_cache.get(ship_key) {
                total += *count as f64 * stats.attack as f64;
            }
        }
        total
    }

    /// Calculate damage dealt to target fleet.
    /// weapons_mult: attacker's weapons tech multiplier (1.0 + level * 0.1)
    fn calculate_damage_to_fleet(
        &self,
        target: &Fleet,
        stats_cache: &ShipStatsCache,
        rapid_fire_cache: &RapidFireCache,
        weapons_mult: f64,
    ) -> f64 {
        let mut total_damage = 0.0;
        let total_target_units: i32 = target.ships.values().sum();

        for (attacker_key, attacker_count) in &self.ships {
            if let Some(attacker_stats) = stats_cache.get(attacker_key) {
                let base_attack = attacker_stats.attack as f64 * (*attacker_count as f64) * weapons_mult;

                if total_target_units > 0 {
                    let mut effective_damage = 0.0;
                    for (target_key, target_count) in &target.ships {
                        let rapid_fire_mult = rapid_fire_cache
                            .get(&(attacker_key.clone(), target_key.clone()))
                            .copied()
                            .unwrap_or(1);
                        let target_proportion = (*target_count as f64) / total_target_units as f64;
                        effective_damage += base_attack * (rapid_fire_mult as f64) * target_proportion;
                    }
                    total_damage += effective_damage;
                } else {
                    total_damage += base_attack;
                }
            }
        }

        total_damage
    }

    /// Calculate total defense points (shield × shield_mult + hull × armour_mult).
    fn get_total_defense(&self, stats_cache: &ShipStatsCache, shield_mult: f64, armour_mult: f64) -> f64 {
        let mut total = 0.0;
        for (ship_key, count) in &self.ships {
            if let Some(stats) = stats_cache.get(ship_key) {
                let defense = (stats.shield as f64 * shield_mult) + (stats.hull as f64 * armour_mult);
                total += *count as f64 * defense;
            }
        }
        total
    }

    /// Apply damage to fleet proportionally.
    /// loss_ratio is clamped to 1.0 so a fleet can never lose more than 100% in one round.
    fn take_damage(&mut self, damage: f64, stats_cache: &ShipStatsCache, shield_mult: f64, armour_mult: f64) {
        let total_def = self.get_total_defense(stats_cache, shield_mult, armour_mult);
        if total_def <= 0.0 {
            return;
        }

        // Bug fix: clamp to 1.0 — can't lose more than 100% of ships in one round
        let loss_ratio = (damage / total_def).min(1.0);

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

// --- MOTEUR DE COMBAT PRINCIPAL ---

/// Resolve expedition combat using database ship stats (no tech bonuses for pirates)
pub async fn resolve_expedition_combat(
    db: &DatabaseConnection,
    player_ships: HashMap<String, i32>,
) -> Result<CombatReport, sea_orm::DbErr> {
    let mut logs = Vec::new();

    let stats_cache = load_ship_stats_cache(db).await?;
    let rapid_fire_cache = load_rapid_fire_cache(db).await?;

    let mut player_fleet = Fleet::new();
    for (ship_key, count) in &player_ships {
        player_fleet.set_ship_count(ship_key, *count);
    }

    let scaling_factor = 0.5 + (rand::random::<f64>() * 0.6);
    let mut pirate_fleet = Fleet::new();

    for (ship_key, count) in &player_ships {
        if *count > 0 {
            let type_scaling = match ship_key.as_str() {
                "heavy_hunter" => 0.7,
                "battleship"   => 0.6,
                "bomber"       => 0.5,
                "destroyer"    => 0.5,
                _              => 1.0,
            };
            let pirate_count = (*count as f64 * scaling_factor * type_scaling).ceil() as i32;
            if pirate_count > 0 {
                pirate_fleet.set_ship_count(ship_key, pirate_count);
            }
        }
    }

    if pirate_fleet.is_destroyed() {
        let count = 1 + (rand::random::<f64>() * 2.0).floor() as i32;
        pirate_fleet.set_ship_count("light_hunter", count);
    }

    logs.push(format!(
        "ALERTE : Flotte Pirate interceptée ! (Force estimée: {:.0}%)",
        scaling_factor * 100.0
    ));

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

    let mut round = 1;
    let mut winner = "draw".to_string();

    while round <= 6 {
        // Simultaneous damage — no tech bonuses for pirate expeditions
        let player_dmg = player_fleet.calculate_damage_to_fleet(&pirate_fleet, &stats_cache, &rapid_fire_cache, 1.0);
        let pirate_dmg = pirate_fleet.calculate_damage_to_fleet(&player_fleet, &stats_cache, &rapid_fire_cache, 1.0);

        pirate_fleet.take_damage(player_dmg, &stats_cache, 1.0, 1.0);
        player_fleet.take_damage(pirate_dmg, &stats_cache, 1.0, 1.0);

        logs.push(format!(
            "TOUR {}: Nous infligeons {:.0} dmg. Pirates ripostent avec {:.0} dmg.",
            round, player_dmg, pirate_dmg
        ));

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

    let mut loot = 0.0;
    if winner == "player" {
        loot = (pirate_fleet.get_total_attack(&stats_cache) * 10.0) + 5000.0;
        logs.push(format!("EPAVE FOUILLÉE : +{:.0} Métal récupéré.", loot));
    }

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

/// Resolve PvP combat with:
/// - Tech bonuses (weapons/shield/armour) for both sides
/// - Planetary defenses included in the defender fleet
/// - Simultaneous damage (both sides fire at the same time each round)
/// - loss_ratio clamped to 1.0 to prevent negative ship counts
/// Résout un combat PvP complet avec support du rapport détaillé et du loot capping.
///
/// # Paramètres
/// - `config` : configuration serveur (pour le loot capping via cargo capacity)
/// - `attacker_tech_levels` : (weapons, shield, armour) niveaux de tech pour BonusSummary
/// - `defender_tech_levels` : idem pour le défenseur
///
/// TODO (antigravity): Si tu veux afficher le BonusSummary dans le frontend,
/// passe les niveaux de tech via `attacker_tech_levels` et `defender_tech_levels`.
pub async fn resolve_pvp_combat(
    db: &DatabaseConnection,
    attacker_ships: HashMap<String, i32>,
    attacker_bonuses: CombatBonuses,
    defender_ships: HashMap<String, i32>,
    defender_defenses: HashMap<String, i32>, // keys: "def_{defense_key}"
    defender_bonuses: CombatBonuses,
    defender_resources: (f64, f64, f64),
    config: Option<&ServerConfigCache>,
    attacker_tech_levels: Option<(i32, i32, i32)>, // (weapons, shield, armour)
    defender_tech_levels: Option<(i32, i32, i32)>,
) -> Result<PvpCombatReport, sea_orm::DbErr> {
    let mut logs = Vec::new();

    // Load ship + defense stats into a unified cache
    let mut stats_cache = load_ship_stats_cache(db).await?;
    load_defense_stats_into_cache(db, &mut stats_cache).await?;

    // BALANCE-0-A: merge ship-vs-defense rapid fire rules (e.g. cruiser -> def_rocket_launcher)
    // into the same RapidFireCache used by calculate_damage_to_fleet so they are applied
    // automatically when the attacker targets defense units keyed as "def_*".
    let mut rapid_fire_cache = load_rapid_fire_cache(db).await?;
    load_defense_rapid_fire_into_cache(db, &mut rapid_fire_cache).await?;

    // Build attacker fleet from ships only
    let mut attacker_fleet = Fleet::new();
    for (ship_key, count) in &attacker_ships {
        attacker_fleet.set_ship_count(ship_key, *count);
    }

    // Build defender fleet: ships + planetary defenses (defenses don't leave the planet)
    let mut defender_fleet = Fleet::new();
    for (ship_key, count) in &defender_ships {
        defender_fleet.set_ship_count(ship_key, *count);
    }
    for (defense_key, count) in &defender_defenses {
        defender_fleet.set_ship_count(defense_key, *count);
    }

    logs.push(format!(
        "ENGAGEMENT PvP | ATT armes×{:.1} bouclier×{:.1} blindage×{:.1} | DEF armes×{:.1} bouclier×{:.1} blindage×{:.1}",
        attacker_bonuses.weapons_mult, attacker_bonuses.shield_mult, attacker_bonuses.armour_mult,
        defender_bonuses.weapons_mult, defender_bonuses.shield_mult, defender_bonuses.armour_mult,
    ));

    let max_rounds = 6;
    let mut winner = "draw";
    let mut rounds_played: u8 = 0;
    let mut total_att_damage: f64 = 0.0;
    let mut total_def_damage: f64 = 0.0;
    let mut round_logs: Vec<RoundLog> = Vec::new();

    for round in 1..=max_rounds {
        if attacker_fleet.is_destroyed() || defender_fleet.is_destroyed() {
            break;
        }
        rounds_played = round;

        logs.push(format!("--- ROUND {} ---", round));

        // Snapshot avant le round pour calculer les pertes par type
        let att_before: HashMap<String, i32> = attacker_fleet.get_all_ships().clone();
        let def_before: HashMap<String, i32> = defender_fleet.get_all_ships().clone();

        // Bug fix: calculate BOTH sides' damage before applying (simultaneous fire)
        let attacker_damage = attacker_fleet.calculate_damage_to_fleet(
            &defender_fleet, &stats_cache, &rapid_fire_cache, attacker_bonuses.weapons_mult,
        );
        let defender_damage = defender_fleet.calculate_damage_to_fleet(
            &attacker_fleet, &stats_cache, &rapid_fire_cache, defender_bonuses.weapons_mult,
        );

        // Apply simultaneously — neither side gets an unfair first-shot advantage
        defender_fleet.take_damage(attacker_damage, &stats_cache, defender_bonuses.shield_mult, defender_bonuses.armour_mult);
        attacker_fleet.take_damage(defender_damage, &stats_cache, attacker_bonuses.shield_mult, attacker_bonuses.armour_mult);

        total_att_damage += attacker_damage;
        total_def_damage += defender_damage;

        logs.push(format!(
            "ATT inflige {:.0} dmg | DEF inflige {:.0} dmg",
            attacker_damage, defender_damage
        ));

        // Pertes par type ce round
        let att_after = attacker_fleet.get_all_ships();
        let def_after = defender_fleet.get_all_ships();

        let attacker_unit_losses: HashMap<String, i32> = att_before.iter()
            .filter_map(|(k, &before)| {
                let after = att_after.get(k).copied().unwrap_or(0);
                let lost = (before - after).max(0);
                if lost > 0 { Some((k.clone(), lost)) } else { None }
            })
            .collect();

        let defender_unit_losses: HashMap<String, i32> = def_before.iter()
            .filter_map(|(k, &before)| {
                let after = def_after.get(k).copied().unwrap_or(0);
                let lost = (before - after).max(0);
                if lost > 0 { Some((k.clone(), lost)) } else { None }
            })
            .collect();

        // Générer les événements narratifs par type d'unité
        let mut events: Vec<String> = Vec::new();
        for (k, &lost) in &attacker_unit_losses {
            let name = stats_cache.get(k).map(|s| s.display_name.as_str()).unwrap_or(k.as_str());
            events.push(format!("⚔️ Attaquant: {} {} détruits", lost, name));
        }
        for (k, &lost) in &defender_unit_losses {
            let name = stats_cache.get(k).map(|s| s.display_name.as_str()).unwrap_or(k.as_str());
            if k.starts_with("def_") {
                events.push(format!("🛡️ Défenseur: {} {} neutralisés", lost, name));
            } else {
                events.push(format!("🛡️ Défenseur: {} {} détruits", lost, name));
            }
        }

        let att_lost_this_round: i32 = attacker_unit_losses.values().sum();
        let def_ships_lost_this_round: i32 = defender_unit_losses.iter()
            .filter(|(k, _)| !k.starts_with("def_")).map(|(_, v)| v).sum();
        let def_defs_lost_this_round: i32 = defender_unit_losses.iter()
            .filter(|(k, _)| k.starts_with("def_")).map(|(_, v)| v).sum();

        round_logs.push(RoundLog {
            round: round as u8,
            attacker_damage,
            defender_damage,
            attacker_ships_lost_this_round: att_lost_this_round,
            defender_ships_lost_this_round: def_ships_lost_this_round,
            defender_defenses_lost_this_round: def_defs_lost_this_round,
            narrative: format!(
                "Tour {} : ATT inflige {:.0} dmg (perd {} vaisseaux) | DEF inflige {:.0} dmg (perd {} vaisseaux, {} défenses)",
                round, attacker_damage, att_lost_this_round,
                defender_damage, def_ships_lost_this_round, def_defs_lost_this_round
            ),
            attacker_unit_losses,
            defender_unit_losses,
            events,
        });

        if attacker_fleet.is_destroyed() && defender_fleet.is_destroyed() {
            logs.push("Destruction mutuelle !".to_string());
            break;
        } else if defender_fleet.is_destroyed() {
            winner = "attacker";
            logs.push("Défenseur détruit !".to_string());
            break;
        } else if attacker_fleet.is_destroyed() {
            winner = "defender";
            logs.push("Attaquant détruit !".to_string());
            break;
        }
    }

    logs.push(format!("RÉSULTAT: {}", match winner {
        "attacker" => "VICTOIRE ATTAQUANT",
        "defender" => "VICTOIRE DÉFENSEUR",
        _          => "MATCH NUL",
    }));

    // ── Loot capping via cargo capacity ────────────────────────────────────────
    // TODO (antigravity): le loot est maintenant plafonné par la capacité cargo
    // des vaisseaux survivants de l'attaquant. Metal en priorité, puis crystal, deuterium.
    let (loot_metal, loot_crystal, loot_deuterium) = if winner == "attacker" {
        let raw_metal = defender_resources.0 * 0.5;
        let raw_crystal = defender_resources.1 * 0.5;
        let raw_deuterium = defender_resources.2 * 0.5;

        if let Some(cfg) = config {
            // Calculer la capacité cargo totale des survivants attaquants
            let cargo_cap: f64 = attacker_fleet.get_all_ships()
                .iter()
                .filter(|(k, _)| !k.starts_with("def_"))
                .map(|(k, count)| crate::game_logic::get_ship_cargo_capacity(k, cfg) * (*count as f64))
                .sum();

            // Loot proportionnel : métal en priorité
            let loot_m = raw_metal.min(cargo_cap);
            let remaining_cap = (cargo_cap - loot_m).max(0.0);
            let loot_c = raw_crystal.min(remaining_cap);
            let remaining_cap2 = (remaining_cap - loot_c).max(0.0);
            let loot_d = raw_deuterium.min(remaining_cap2);
            (loot_m, loot_c, loot_d)
        } else {
            (raw_metal, raw_crystal, raw_deuterium)
        }
    } else {
        (0.0, 0.0, 0.0)
    };

    // ── Calcul des débris (30% métal + cristal des vaisseaux perdus) ───────────
    // Note: les défenses détruites NE génèrent PAS de débris
    let (debris_metal, debris_crystal) = if let Some(cfg) = config {
        let debris_factor_metal = cfg.get_config("debris_factor_metal", 0.30);
        let debris_factor_crystal = cfg.get_config("debris_factor_crystal", 0.30);

        let calc_debris = |initial: &HashMap<String, i32>, remaining: &HashMap<String, i32>| -> (f64, f64) {
            let mut dm = 0.0f64;
            let mut dc = 0.0f64;
            for (ship_key, &initial_count) in initial {
                if ship_key.starts_with("def_") { continue; } // Les défenses ne génèrent pas de débris
                let remaining_count = remaining.get(ship_key).copied().unwrap_or(0);
                let lost = (initial_count - remaining_count).max(0) as f64;
                let (cost_m, cost_c) = crate::game_logic::get_unit_cost(ship_key, cfg);
                dm += lost * cost_m * debris_factor_metal;
                dc += lost * cost_c * debris_factor_crystal;
            }
            (dm, dc)
        };

        let (att_dm, att_dc) = calc_debris(&attacker_ships, attacker_fleet.get_all_ships());
        let (def_dm, def_dc) = calc_debris(&defender_ships, defender_fleet.get_all_ships());
        (att_dm + def_dm, att_dc + def_dc)
    } else {
        (0.0, 0.0)
    };

    // ── Rapport détaillé ────────────────────────────────────────────────────────
    let details = {
        let (att_weapons, att_shield, att_armour) = attacker_tech_levels.unwrap_or((0, 0, 0));
        let (def_weapons, def_shield, def_armour) = defender_tech_levels.unwrap_or((0, 0, 0));

        let make_lost_map = |initial: &HashMap<String, i32>, remaining: &HashMap<String, i32>| -> HashMap<String, i32> {
            initial.iter()
                .map(|(k, &ic)| (k.clone(), (ic - remaining.get(k).copied().unwrap_or(0)).max(0)))
                .collect()
        };

        let attacker_remaining_map: HashMap<String, i32> = attacker_fleet.get_all_ships().clone();
        let defender_remaining_map: HashMap<String, i32> = defender_fleet.get_all_ships().clone();

        let attacker_fleet_lost = make_lost_map(&attacker_ships, &attacker_remaining_map);
        let defender_fleet_lost = make_lost_map(&defender_ships, &defender_remaining_map);
        let defender_def_lost = make_lost_map(&defender_defenses, &defender_remaining_map);

        let att_ships_lost: i32 = attacker_fleet_lost.values().sum();
        let def_ships_lost: i32 = defender_fleet_lost.values().sum();
        let def_defs_lost: i32 = defender_def_lost.values().sum();

        Some(DetailedCombatReport {
            winner: winner.to_string(),
            rounds_played: rounds_played,
            attacker_stats: CombatantStats {
                fleet_initial: attacker_ships.clone(),
                defense_initial: HashMap::new(),
                fleet_remaining: attacker_remaining_map.iter().filter(|(k, _)| !k.starts_with("def_")).map(|(k,v)|(k.clone(),*v)).collect(),
                defense_remaining: HashMap::new(),
                fleet_lost: attacker_fleet_lost,
                defense_lost: HashMap::new(),
                total_ships_lost: att_ships_lost,
                total_defenses_lost: 0,
                total_damage_dealt: total_att_damage,
                total_damage_taken: total_def_damage,
                shields_absorbed: 0.0, // TODO: track shield absorption per round
            },
            defender_stats: CombatantStats {
                fleet_initial: defender_ships.clone(),
                defense_initial: defender_defenses.clone(),
                fleet_remaining: defender_remaining_map.iter().filter(|(k, _)| !k.starts_with("def_")).map(|(k,v)|(k.clone(),*v)).collect(),
                defense_remaining: defender_remaining_map.iter().filter(|(k, _)| k.starts_with("def_")).map(|(k,v)|(k.clone(),*v)).collect(),
                fleet_lost: defender_fleet_lost,
                defense_lost: defender_def_lost,
                total_ships_lost: def_ships_lost,
                total_defenses_lost: def_defs_lost,
                total_damage_dealt: total_def_damage,
                total_damage_taken: total_att_damage,
                shields_absorbed: 0.0,
            },
            loot: ResourceTriple { metal: loot_metal, crystal: loot_crystal, deuterium: loot_deuterium },
            debris: ResourcePair { metal: debris_metal, crystal: debris_crystal },
            rounds: round_logs,
            attacker_bonuses: BonusSummary {
                weapons_mult: attacker_bonuses.weapons_mult,
                shield_mult: attacker_bonuses.shield_mult,
                armour_mult: attacker_bonuses.armour_mult,
                weapons_tech_level: att_weapons,
                shield_tech_level: att_shield,
                armour_tech_level: att_armour,
            },
            defender_bonuses: BonusSummary {
                weapons_mult: defender_bonuses.weapons_mult,
                shield_mult: defender_bonuses.shield_mult,
                armour_mult: defender_bonuses.armour_mult,
                weapons_tech_level: def_weapons,
                shield_tech_level: def_shield,
                armour_tech_level: def_armour,
            },
        })
    };

    Ok(PvpCombatReport {
        log: logs,
        winner: winner.to_string(),
        attacker_initial: attacker_ships.clone(),
        attacker_remaining: attacker_fleet.get_all_ships().clone(),
        defender_initial: defender_ships.clone(),
        defender_defenses_initial: defender_defenses.clone(),
        defender_remaining: defender_fleet.get_all_ships().clone(),
        loot: (loot_metal, loot_crystal, loot_deuterium),
        debris: (debris_metal, debris_crystal),
        details,
    })
}

/// Pure-logic combat resolution using pre-loaded caches (no DB required).
/// Used by unit tests and the combat_sim binary.
pub fn simulate_pvp_combat(
    stats_cache: &ShipStatsCache,
    rapid_fire_cache: &RapidFireCache,
    attacker_ships: HashMap<String, i32>,
    attacker_bonuses: CombatBonuses,
    defender_ships: HashMap<String, i32>,
    defender_defenses: HashMap<String, i32>,
    defender_bonuses: CombatBonuses,
    defender_resources: (f64, f64, f64),
) -> PvpCombatReport {
    let mut logs = Vec::new();

    let mut attacker_fleet = Fleet::new();
    for (k, v) in &attacker_ships { attacker_fleet.set_ship_count(k, *v); }

    let mut defender_fleet = Fleet::new();
    for (k, v) in &defender_ships  { defender_fleet.set_ship_count(k, *v); }
    for (k, v) in &defender_defenses { defender_fleet.set_ship_count(k, *v); }

    logs.push(format!(
        "SIMULATION | ATT armes×{:.1} bouclier×{:.1} blindage×{:.1} | DEF armes×{:.1} bouclier×{:.1} blindage×{:.1}",
        attacker_bonuses.weapons_mult, attacker_bonuses.shield_mult, attacker_bonuses.armour_mult,
        defender_bonuses.weapons_mult, defender_bonuses.shield_mult, defender_bonuses.armour_mult,
    ));

    let mut winner = "draw";

    for round in 1..=6 {
        if attacker_fleet.is_destroyed() || defender_fleet.is_destroyed() { break; }
        logs.push(format!("--- ROUND {} ---", round));

        let att_dmg = attacker_fleet.calculate_damage_to_fleet(&defender_fleet, stats_cache, rapid_fire_cache, attacker_bonuses.weapons_mult);
        let def_dmg = defender_fleet.calculate_damage_to_fleet(&attacker_fleet, stats_cache, rapid_fire_cache, defender_bonuses.weapons_mult);

        defender_fleet.take_damage(att_dmg, stats_cache, defender_bonuses.shield_mult, defender_bonuses.armour_mult);
        attacker_fleet.take_damage(def_dmg, stats_cache, attacker_bonuses.shield_mult, attacker_bonuses.armour_mult);

        logs.push(format!("ATT inflige {:.0} dmg | DEF inflige {:.0} dmg", att_dmg, def_dmg));

        if attacker_fleet.is_destroyed() && defender_fleet.is_destroyed() { logs.push("Destruction mutuelle !".into()); break; }
        else if defender_fleet.is_destroyed() { winner = "attacker"; logs.push("Défenseur détruit !".into()); break; }
        else if attacker_fleet.is_destroyed() { winner = "defender"; logs.push("Attaquant détruit !".into()); break; }
    }

    logs.push(format!("RÉSULTAT: {}", match winner {
        "attacker" => "VICTOIRE ATTAQUANT",
        "defender" => "VICTOIRE DÉFENSEUR",
        _          => "MATCH NUL",
    }));

    let (loot_metal, loot_crystal, loot_deuterium) = if winner == "attacker" {
        (defender_resources.0 * 0.5, defender_resources.1 * 0.5, defender_resources.2 * 0.5)
    } else { (0.0, 0.0, 0.0) };

    PvpCombatReport {
        log: logs,
        winner: winner.to_string(),
        attacker_initial: attacker_ships.clone(),
        attacker_remaining: attacker_fleet.get_all_ships().clone(),
        defender_initial: defender_ships.clone(),
        defender_defenses_initial: defender_defenses.clone(),
        defender_remaining: defender_fleet.get_all_ships().clone(),
        loot: (loot_metal, loot_crystal, loot_deuterium),
        debris: (0.0, 0.0),
        details: None, // simulate_pvp_combat is used for tests/sim — no detailed report
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PvpCombatReport {
    pub log: Vec<String>,
    pub winner: String,
    pub attacker_initial: HashMap<String, i32>,
    pub attacker_remaining: HashMap<String, i32>,
    pub defender_initial: HashMap<String, i32>,
    pub defender_defenses_initial: HashMap<String, i32>,
    pub defender_remaining: HashMap<String, i32>, // ships + "def_" defenses mixed
    pub loot: (f64, f64, f64),
    pub debris: (f64, f64),
    /// Rapport enrichi — rempli si config allow_detailed_report = 1 (défaut: toujours)
    /// TODO (antigravity): afficher dans ReportsTerminal si Some — voir CLAUDE_HANDOFF.md section Expansion 5.0
    pub details: Option<DetailedCombatReport>,
}

// ═══════════════════════════════════════════════════════════════════════════════
// RAPPORT DE COMBAT DÉTAILLÉ — Expansion 5.0
// TODO (antigravity): Le frontend ReportsTerminal.tsx doit afficher ce rapport
// quand `details` est Some. Voir CLAUDE_HANDOFF.md pour la maquette UI complète.
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetailedCombatReport {
    pub winner: String,
    pub rounds_played: u8,
    pub attacker_stats: CombatantStats,
    pub defender_stats: CombatantStats,
    pub loot: ResourceTriple,
    /// 30% métal + 30% cristal des vaisseaux détruits (les deux camps)
    pub debris: ResourcePair,
    pub rounds: Vec<RoundLog>,
    pub attacker_bonuses: BonusSummary,
    pub defender_bonuses: BonusSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CombatantStats {
    pub fleet_initial: HashMap<String, i32>,
    pub defense_initial: HashMap<String, i32>,
    pub fleet_remaining: HashMap<String, i32>,
    pub defense_remaining: HashMap<String, i32>,
    pub fleet_lost: HashMap<String, i32>,
    pub defense_lost: HashMap<String, i32>,
    pub total_ships_lost: i32,
    pub total_defenses_lost: i32,
    pub total_damage_dealt: f64,
    pub total_damage_taken: f64,
    pub shields_absorbed: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoundLog {
    pub round: u8,
    pub attacker_damage: f64,
    pub defender_damage: f64,
    pub attacker_ships_lost_this_round: i32,
    pub defender_ships_lost_this_round: i32,
    pub defender_defenses_lost_this_round: i32,
    pub narrative: String,
    /// Pertes par type de vaisseau pour l'attaquant ce round (ship_key → count)
    pub attacker_unit_losses: HashMap<String, i32>,
    /// Pertes par type (vaisseaux + défenses "def_*") pour le défenseur ce round
    pub defender_unit_losses: HashMap<String, i32>,
    /// Événements narratifs détaillés (ex: "5 Croiseurs détruits", "3 Tourelles Plasma neutralisées")
    pub events: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BonusSummary {
    pub weapons_mult: f64,
    pub shield_mult: f64,
    pub armour_mult: f64,
    pub weapons_tech_level: i32,
    pub shield_tech_level: i32,
    pub armour_tech_level: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceTriple {
    pub metal: f64,
    pub crystal: f64,
    pub deuterium: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcePair {
    pub metal: f64,
    pub crystal: f64,
}

// =============================================================================
// TESTS UNITAIRES
// Les tests utilisent des stats mockées — aucune connexion DB requise.
// Lancer avec : cargo test -p backend
// =============================================================================
#[cfg(test)]
mod tests {
    use super::*;

    // --- Helpers ---

    fn cache(entries: &[(&str, i32, i32, i32)]) -> ShipStatsCache {
        entries.iter().map(|(key, atk, shld, hull)| {
            (key.to_string(), ShipStats {
                attack: *atk,
                shield: *shld,
                hull: *hull,
                display_name: key.to_string(),
            })
        }).collect()
    }

    fn no_rf() -> RapidFireCache { HashMap::new() }
    fn no_bonus() -> CombatBonuses { CombatBonuses::default() }

    fn fleet(entries: &[(&str, i32)]) -> Fleet {
        let mut f = Fleet::new();
        for (k, v) in entries { f.set_ship_count(k, *v); }
        f
    }

    fn run_combat(
        cache: &ShipStatsCache,
        rf: &RapidFireCache,
        att: &mut Fleet, att_b: &CombatBonuses,
        def: &mut Fleet, def_b: &CombatBonuses,
    ) -> &'static str {
        let mut winner = "draw";
        for _ in 1..=6 {
            if att.is_destroyed() || def.is_destroyed() { break; }
            let att_dmg = att.calculate_damage_to_fleet(def, cache, rf, att_b.weapons_mult);
            let def_dmg = def.calculate_damage_to_fleet(att, cache, rf, def_b.weapons_mult);
            def.take_damage(att_dmg, cache, def_b.shield_mult, def_b.armour_mult);
            att.take_damage(def_dmg, cache, att_b.shield_mult, att_b.armour_mult);
            if att.is_destroyed() && def.is_destroyed() { break; }
            else if def.is_destroyed() { winner = "attacker"; break; }
            else if att.is_destroyed() { winner = "defender"; break; }
        }
        winner
    }

    // -------------------------------------------------------------------------
    // Test 1: Dégâts simultanés — le défenseur riposte toujours
    // Si les dégâts étaient séquentiels, le défenseur ne ferait jamais de dégâts
    // lorsqu'il est détruit au round 1. Avec la correction, l'attaquant subit
    // des pertes même si le défenseur meurt au même round.
    // -------------------------------------------------------------------------
    #[test]
    fn test_simultaneous_damage_defender_fires_back() {
        // attacker: 10 ships × 100 atk = 1000 dmg  (annihile le défenseur en 1 round)
        // defender: 5 ships  × 100 atk = 500 dmg   (devrait quand même toucher l'attaquant)
        let c = cache(&[("ship", 100, 0, 100)]);
        // defender total HP = 5 * 100 = 500, attacker total HP = 10 * 100 = 1000
        // att_dmg = 10*100 = 1000 → loss_ratio = min(1000/500, 1.0) = 1.0 → defender destroyed
        // def_dmg = 5*100  = 500  → loss_ratio = 500/1000 = 0.5 → attacker loses 50%

        let mut att = fleet(&[("ship", 10)]);
        let mut def = fleet(&[("ship", 5)]);

        let att_dmg = att.calculate_damage_to_fleet(&def, &c, &no_rf(), 1.0);
        let def_dmg = def.calculate_damage_to_fleet(&att, &c, &no_rf(), 1.0);

        def.take_damage(att_dmg, &c, 1.0, 1.0);
        att.take_damage(def_dmg, &c, 1.0, 1.0);

        assert!(def.is_destroyed(), "Defender should be wiped out");
        assert!(!att.is_destroyed(), "Attacker should survive (simultaneous fire)");

        let remaining: i32 = att.get_all_ships().values().sum();
        assert!(remaining < 10, "Attacker should have taken losses from simultaneous fire");
        assert_eq!(remaining, 5, "Attacker should have lost 50% (500 dmg / 1000 HP)");
    }

    // -------------------------------------------------------------------------
    // Test 2: Bonus technologie armes multiplie bien l'attaque
    // -------------------------------------------------------------------------
    #[test]
    fn test_weapons_tech_bonus() {
        let c = cache(&[("ship", 100, 0, 1000)]);
        let att = fleet(&[("ship", 1)]);
        let target = fleet(&[("ship", 1)]);

        let dmg_base = att.calculate_damage_to_fleet(&target, &c, &no_rf(), 1.0);
        let dmg_tech5 = att.calculate_damage_to_fleet(&target, &c, &no_rf(), 1.5);

        assert!((dmg_base - 100.0).abs() < 0.01, "Base damage should be 100");
        assert!((dmg_tech5 - 150.0).abs() < 0.01, "Tech 5 should give 150 dmg (+50%)");
    }

    // -------------------------------------------------------------------------
    // Test 3: Bonus bouclier/blindage augmente la défense
    // -------------------------------------------------------------------------
    #[test]
    fn test_shield_armour_tech_increases_defense() {
        let c = cache(&[("ship", 0, 100, 100)]);
        let f = fleet(&[("ship", 10)]);

        let def_base   = f.get_total_defense(&c, 1.0, 1.0); // 10 * (100 + 100) = 2000
        let def_tech5  = f.get_total_defense(&c, 1.5, 1.5); // 10 * (150 + 150) = 3000

        assert!((def_base  - 2000.0).abs() < 0.01);
        assert!((def_tech5 - 3000.0).abs() < 0.01);
        assert!(def_tech5 > def_base, "Tech bonuses should increase total defense");
    }

    // -------------------------------------------------------------------------
    // Test 4: loss_ratio est plafonné à 1.0 (jamais de counts négatifs)
    // -------------------------------------------------------------------------
    #[test]
    fn test_loss_ratio_clamped_to_one() {
        let c = cache(&[("ship", 0, 0, 100)]); // 100 HP chacun
        let mut f = fleet(&[("ship", 10)]); // total HP = 1000

        // 10× plus de dégâts que de HP
        f.take_damage(10_000.0, &c, 1.0, 1.0);

        assert!(f.is_destroyed(), "Fleet should be fully destroyed");
        // Pas de count négatif possible
        for &count in f.get_all_ships().values() {
            assert!(count >= 0, "Ship count must never be negative");
        }
    }

    // -------------------------------------------------------------------------
    // Test 5: Combat symétrique — même flotte → même résultat des deux côtés
    // -------------------------------------------------------------------------
    #[test]
    fn test_symmetric_equal_fleets() {
        let c = cache(&[("ship", 100, 50, 200)]);
        let b = no_bonus();
        let mut att = fleet(&[("ship", 100)]);
        let mut def = fleet(&[("ship", 100)]);

        run_combat(&c, &no_rf(), &mut att, &b, &mut def, &b);

        let remaining_att: i32 = att.get_all_ships().values().sum();
        let remaining_def: i32 = def.get_all_ships().values().sum();
        assert_eq!(remaining_att, remaining_def, "Equal fleets should suffer equal losses");
    }

    // -------------------------------------------------------------------------
    // Test 6: Défenseur avec tech supérieure bat un attaquant plus grand
    // -------------------------------------------------------------------------
    #[test]
    fn test_defender_wins_with_superior_tech() {
        // Attaquant: 100 vaisseaux, pas de tech
        // Défenseur: 70 vaisseaux, weapons/shield/armour tech niveau 5 (×1.5)
        let c = cache(&[("ship", 100, 100, 100)]);
        let att_b = no_bonus();
        let def_b = CombatBonuses { weapons_mult: 1.5, shield_mult: 1.5, armour_mult: 1.5 };

        let mut att = fleet(&[("ship", 100)]);
        let mut def = fleet(&[("ship", 70)]);

        let result = run_combat(&c, &no_rf(), &mut att, &att_b, &mut def, &def_b);

        assert_eq!(result, "defender", "Defender with tech 5 should beat a larger attacker");
    }

    // -------------------------------------------------------------------------
    // Test 7: Défenses planétaires contribuent à la défense
    // -------------------------------------------------------------------------
    #[test]
    fn test_planetary_defenses_contribute() {
        // Sans défenses : attaquant gagne
        let c = cache(&[("ship", 200, 0, 100), ("def_cannon", 50, 0, 500)]);
        let b = no_bonus();

        let mut att1 = fleet(&[("ship", 10)]);
        let mut def1 = fleet(&[("ship", 3)]);
        let result_no_def = run_combat(&c, &no_rf(), &mut att1, &b, &mut def1, &b);

        // Avec défenses : défenseur résiste
        let mut att2 = fleet(&[("ship", 10)]);
        let mut def2 = fleet(&[("ship", 3), ("def_cannon", 20)]);
        let result_with_def = run_combat(&c, &no_rf(), &mut att2, &b, &mut def2, &b);

        assert_eq!(result_no_def, "attacker", "Attacker should win without defenses");
        assert_ne!(result_with_def, result_no_def, "Defenses should change the outcome");
    }

    // -------------------------------------------------------------------------
    // Test 8: simulate_pvp_combat — API publique, aucune DB
    // -------------------------------------------------------------------------
    #[test]
    fn test_simulate_pvp_combat_api() {
        let c = cache(&[("fighter", 150, 10, 200)]);
        let rf = no_rf();

        let report = simulate_pvp_combat(
            &c, &rf,
            [("fighter".to_string(), 50)].into(),
            CombatBonuses { weapons_mult: 1.2, shield_mult: 1.0, armour_mult: 1.0 },
            [("fighter".to_string(), 50)].into(),
            HashMap::new(),
            no_bonus(),
            (100_000.0, 50_000.0, 20_000.0),
        );

        assert!(!report.log.is_empty(), "Report should have logs");
        assert!(
            report.winner == "attacker" || report.winner == "defender" || report.winner == "draw",
            "Winner must be a valid value"
        );
        // Attaquant avec weapons_mult 1.2 devrait gagner à égalité numérique
        assert_eq!(report.winner, "attacker", "Attacker with +20% weapons tech should win equal fight");
    }
}
