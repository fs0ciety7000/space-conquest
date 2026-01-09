use serde::{Deserialize, Serialize};
use rand::Rng;

// --- STRUCTURES DE DONNÉES ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CombatReport {
    pub log: Vec<String>,       // Le journal du combat (ex: "Tour 1: 500 dégâts infligés")
    pub winner: String,         // "player", "pirates", or "draw"
    pub loot_metal: f64,        // Gain en cas de victoire
    pub remaining_hunters: i32, // Vaisseaux restants après le combat
    pub remaining_cruisers: i32,
    pub remaining_recyclers: i32,
}

#[derive(Debug, Clone)]
struct Fleet {
    hunters: i32,
    cruisers: i32,
    recyclers: i32,
}

impl Fleet {
    // Calcul de la puissance de feu totale
    fn get_total_attack(&self) -> f64 {
        (self.hunters as f64 * 50.0) +      // Stats du Frontend: 50 Atk
        (self.cruisers as f64 * 400.0) +    // Stats du Frontend: 400 Atk
        (self.recyclers as f64 * 1.0)       // Stats du Frontend: 1 Atk
    }

    // Calcul des points de vie totaux (Structure + Bouclier)
    fn get_total_defense(&self) -> f64 {
        (self.hunters as f64 * 400.0) +     // Stats du Frontend: 400 Def
        (self.cruisers as f64 * 2700.0) +   // Stats du Frontend: 2700 Def
        (self.recyclers as f64 * 1600.0)    // Stats du Frontend: 1600 Def
    }

    // Appliquer les dégâts : On réduit le nombre de vaisseaux au prorata des dégâts reçus
    fn take_damage(&mut self, damage: f64) {
        let total_def = self.get_total_defense();
        if total_def <= 0.0 { return; }

        // Si la flotte prend 1000 dégâts sur 10000 PV, elle perd 10% de ses vaisseaux
        let loss_ratio = damage / total_def; 
        
        // On applique le ratio, mais on s'assure qu'au moins 1 vaisseau survit si le ratio n'est pas 100%
        // Sauf si les dégâts sont massifs.
        
        self.hunters = (self.hunters as f64 * (1.0 - loss_ratio)).floor() as i32;
        self.cruisers = (self.cruisers as f64 * (1.0 - loss_ratio)).floor() as i32;
        self.recyclers = (self.recyclers as f64 * (1.0 - loss_ratio)).floor() as i32;
    }

    fn is_destroyed(&self) -> bool {
        self.hunters <= 0 && self.cruisers <= 0 && self.recyclers <= 0
    }
}

// --- MOTEUR DE COMBAT PRINCIPAL ---

pub fn resolve_expedition_combat(
    p_hunters: i32, 
    p_cruisers: i32, 
    p_recyclers: i32
) -> CombatReport {
    let mut rng = rand::thread_rng();
    let mut logs = Vec::new();

    // 1. Initialisation de la flotte du Joueur
    let mut player_fleet = Fleet {
        hunters: p_hunters,
        cruisers: p_cruisers,
        recyclers: p_recyclers,
    };

    // 2. Génération de la flotte Pirate (Scaling)
    // Les pirates ont entre 50% et 110% de la force du joueur pour que ce soit risqué
    let scaling_factor = rng.gen_range(0.5..1.1); 
    
    let mut pirate_fleet = Fleet {
        hunters: (p_hunters as f64 * scaling_factor).ceil() as i32,
        cruisers: (p_cruisers as f64 * scaling_factor).ceil() as i32,
        recyclers: 0, // Les pirates n'utilisent pas de recycleurs
    };
    
    // Ajout d'un petit bonus pirate aléatoire pour ne pas avoir 0 vaisseaux si le joueur envoie 1 seul chasseur
    if pirate_fleet.is_destroyed() {
        pirate_fleet.hunters = rng.gen_range(1..3);
    }

    logs.push(format!("ALERTE : Flotte Pirate interceptée ! (Force estimée: {:.0}%)", scaling_factor * 100.0));
    logs.push(format!("HOSTILES : {} Chasseurs, {} Croiseurs", pirate_fleet.hunters, pirate_fleet.cruisers));

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
        remaining_hunters: player_fleet.hunters,
        remaining_cruisers: player_fleet.cruisers,
        remaining_recyclers: player_fleet.recyclers,
    }
}