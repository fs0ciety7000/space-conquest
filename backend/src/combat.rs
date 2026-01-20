use serde::{Deserialize, Serialize};
use rand::Rng;
use std::collections::HashMap;

// --- STRUCTURES DE DONNÉES ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CombatReport {
    pub log: Vec<String>,       // Le journal du combat (ex: "Tour 1: 500 dégâts infligés")
    pub winner: String,         // "player", "pirates", or "draw"
    pub loot_metal: f64,        // Gain en cas de victoire
    pub remaining_hunters: i32, // Vaisseaux restants après le combat
    pub remaining_cruisers: i32,
    pub remaining_recyclers: i32,
    // Add remaining counts for new ships
    pub remaining_heavy_hunters: i32,
    pub remaining_battleships: i32,
    pub remaining_bombers: i32,
    pub remaining_destroyers: i32,
}

#[derive(Debug, Clone)]
struct Fleet {
    // Use a generic HashMap for ship types - makes it easier to extend
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

    // Calcul de la puissance de feu totale
    fn get_total_attack(&self) -> f64 {
        let mut total = 0.0;
        for (ship_type, count) in &self.ships {
            let attack = match ship_type.as_str() {
                "light_hunter" => 50.0,
                "heavy_hunter" => 150.0,
                "cruiser" => 400.0,
                "battleship" => 1000.0,
                "bomber" => 1000.0,
                "destroyer" => 2000.0,
                "recycler" => 1.0,
                _ => 1.0,
            };
            total += *count as f64 * attack;
        }
        total
    }

    // Calcul des points de vie totaux (Structure + Bouclier)
    fn get_total_defense(&self) -> f64 {
        let mut total = 0.0;
        for (ship_type, count) in &self.ships {
            let defense = match ship_type.as_str() {
                "light_hunter" => 400.0,
                "heavy_hunter" => 1000.0,
                "cruiser" => 2700.0,
                "battleship" => 6000.0,
                "bomber" => 7500.0,
                "destroyer" => 11000.0,
                "recycler" => 1600.0,
                _ => 10.0,
            };
            total += *count as f64 * defense;
        }
        total
    }

    // Appliquer les dégâts : On réduit le nombre de vaisseaux au prorata des dégâts reçus
    fn take_damage(&mut self, damage: f64) {
        let total_def = self.get_total_defense();
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

// --- MOTEUR DE COMBAT PRINCIPAL ---

pub fn resolve_expedition_combat(
    p_hunters: i32,
    p_cruisers: i32,
    p_recyclers: i32,
    p_heavy_hunters: i32,
    p_battleships: i32,
    p_bombers: i32,
    p_destroyers: i32,
) -> CombatReport {
    let mut rng = rand::thread_rng();
    let mut logs = Vec::new();

    // 1. Initialisation de la flotte du Joueur
    let mut player_fleet = Fleet::new();
    player_fleet.set_ship_count("light_hunter", p_hunters);
    player_fleet.set_ship_count("cruiser", p_cruisers);
    player_fleet.set_ship_count("recycler", p_recyclers);
    player_fleet.set_ship_count("heavy_hunter", p_heavy_hunters);
    player_fleet.set_ship_count("battleship", p_battleships);
    player_fleet.set_ship_count("bomber", p_bombers);
    player_fleet.set_ship_count("destroyer", p_destroyers);

    // 2. Génération de la flotte Pirate (Scaling)
    // Les pirates ont entre 50% et 110% de la force du joueur pour que ce soit risqué
    let scaling_factor = rng.gen_range(0.5..1.1);

    let mut pirate_fleet = Fleet::new();

    // Pirates use a mix of ship types based on player fleet composition
    if p_hunters > 0 {
        pirate_fleet.set_ship_count("light_hunter", (p_hunters as f64 * scaling_factor).ceil() as i32);
    }
    if p_cruisers > 0 {
        pirate_fleet.set_ship_count("cruiser", (p_cruisers as f64 * scaling_factor).ceil() as i32);
    }
    if p_heavy_hunters > 0 {
        pirate_fleet.set_ship_count("heavy_hunter", (p_heavy_hunters as f64 * scaling_factor * 0.7).ceil() as i32);
    }
    if p_battleships > 0 {
        pirate_fleet.set_ship_count("battleship", (p_battleships as f64 * scaling_factor * 0.6).ceil() as i32);
    }
    if p_bombers > 0 {
        pirate_fleet.set_ship_count("bomber", (p_bombers as f64 * scaling_factor * 0.5).ceil() as i32);
    }
    if p_destroyers > 0 {
        pirate_fleet.set_ship_count("destroyer", (p_destroyers as f64 * scaling_factor * 0.5).ceil() as i32);
    }

    // Ajout d'un petit bonus pirate aléatoire pour ne pas avoir 0 vaisseaux si le joueur envoie 1 seul chasseur
    if pirate_fleet.is_destroyed() {
        pirate_fleet.set_ship_count("light_hunter", rng.gen_range(1..3));
    }

    logs.push(format!("ALERTE : Flotte Pirate interceptée ! (Force estimée: {:.0}%)", scaling_factor * 100.0));

    // Log pirate fleet composition
    let mut hostile_desc = String::from("HOSTILES : ");
    let mut ship_descriptions = Vec::new();

    for (ship_type, count) in &pirate_fleet.ships {
        if *count > 0 {
            let name = match ship_type.as_str() {
                "light_hunter" => "Chasseurs",
                "heavy_hunter" => "Chasseurs Lourds",
                "cruiser" => "Croiseurs",
                "battleship" => "Vaisseaux de Bataille",
                "bomber" => "Bombardiers",
                "destroyer" => "Destructeurs",
                _ => "Vaisseaux",
            };
            ship_descriptions.push(format!("{} {}", count, name));
        }
    }
    hostile_desc.push_str(&ship_descriptions.join(", "));
    logs.push(hostile_desc);

    // 3. Boucle de Combat (Max 6 Tours)
    let mut round = 1;
    let mut winner = "draw".to_string();

    while round <= 6 {
        // Puissance de feu pour ce tour
        let player_dmg = player_fleet.get_total_attack();
        let pirate_dmg = pirate_fleet.get_total_attack();

        // Application des dégâts simultanés
        pirate_fleet.take_damage(player_dmg);
        player_fleet.take_damage(pirate_dmg);

        logs.push(format!(
            "TOUR {}: Nous infligeons {:.0} dmg. Pirates ripostent avec {:.0} dmg.",
            round, player_dmg, pirate_dmg
        ));

        // Vérification des conditions de victoire
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

    // 4. Calcul du butin (Seulement si victoire)
    let mut loot = 0.0;
    if winner == "player" {
        // Butin basé sur la force des pirates vaincus
        loot = (pirate_fleet.get_total_attack() * 10.0) + 5000.0;
        logs.push(format!("EPAVE FOUILLÉE : +{:.0} Métal récupéré.", loot));
    }

    CombatReport {
        log: logs,
        winner,
        loot_metal: loot,
        remaining_hunters: player_fleet.get_ship_count("light_hunter"),
        remaining_cruisers: player_fleet.get_ship_count("cruiser"),
        remaining_recyclers: player_fleet.get_ship_count("recycler"),
        remaining_heavy_hunters: player_fleet.get_ship_count("heavy_hunter"),
        remaining_battleships: player_fleet.get_ship_count("battleship"),
        remaining_bombers: player_fleet.get_ship_count("bomber"),
        remaining_destroyers: player_fleet.get_ship_count("destroyer"),
    }
}