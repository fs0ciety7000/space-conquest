//! Combat Simulator — outil de debug pour simuler des combats PvP avec les vraies stats DB.
//!
//! Usage:
//!   cargo run --bin combat_sim -- --help
//!   cargo run --bin combat_sim -- --att "light_hunter=50,cruiser=10" --def "light_hunter=80" --def-def "rocket_launcher=20"
//!   cargo run --bin combat_sim -- --att "battleship=5" --att-weapons 5 --def "battleship=5" --def-shield 3 --def-armour 3
//!   cargo run --bin combat_sim -- --list-ships     # afficher tous les types de vaisseaux et stats
//!
//! DATABASE_URL doit être défini dans l'environnement ou dans .env

use std::collections::HashMap;
use sea_orm::{Database, EntityTrait};
use backend::combat::{
    load_ship_stats_cache, load_defense_stats_into_cache, load_rapid_fire_cache,
    simulate_pvp_combat, CombatBonuses,
};

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let args: Vec<String> = std::env::args().collect();

    // --- Parse arguments ---
    let mut att_fleet_str   = String::new();
    let mut def_fleet_str   = String::new();
    let mut def_defenses_str = String::new();
    let mut att_weapons = 0i32;
    let mut att_shield  = 0i32;
    let mut att_armour  = 0i32;
    let mut def_weapons = 0i32;
    let mut def_shield  = 0i32;
    let mut def_armour  = 0i32;
    let mut list_ships  = false;
    let mut resources   = (100_000.0f64, 50_000.0f64, 20_000.0f64);

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--att"          => { i += 1; att_fleet_str    = args[i].clone(); }
            "--def"          => { i += 1; def_fleet_str    = args[i].clone(); }
            "--def-def"      => { i += 1; def_defenses_str = args[i].clone(); }
            "--att-weapons"  => { i += 1; att_weapons = args[i].parse().unwrap_or(0); }
            "--att-shield"   => { i += 1; att_shield  = args[i].parse().unwrap_or(0); }
            "--att-armour"   => { i += 1; att_armour  = args[i].parse().unwrap_or(0); }
            "--def-weapons"  => { i += 1; def_weapons = args[i].parse().unwrap_or(0); }
            "--def-shield"   => { i += 1; def_shield  = args[i].parse().unwrap_or(0); }
            "--def-armour"   => { i += 1; def_armour  = args[i].parse().unwrap_or(0); }
            "--resources"    => {
                i += 1;
                let parts: Vec<f64> = args[i].split(',').filter_map(|s| s.parse().ok()).collect();
                if parts.len() == 3 { resources = (parts[0], parts[1], parts[2]); }
            }
            "--list-ships"   => { list_ships = true; }
            "--help" | "-h"  => { print_help(); return; }
            _ => {}
        }
        i += 1;
    }

    // --- Connect to DB ---
    let db_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set (or use a .env file)");

    let db = Database::connect(&db_url).await
        .expect("Failed to connect to database");

    // --- Load ship & defense stats ---
    let mut stats = load_ship_stats_cache(&db).await.expect("Failed to load ship stats");
    load_defense_stats_into_cache(&db, &mut stats).await.expect("Failed to load defense stats");
    let rf = load_rapid_fire_cache(&db).await.expect("Failed to load rapid fire rules");

    // --- List ships mode ---
    if list_ships {
        println!("\n=== VAISSEAUX ===");
        let mut ships: Vec<_> = stats.iter()
            .filter(|(k, _)| !k.starts_with("def_"))
            .collect();
        ships.sort_by_key(|(k, _)| k.as_str());
        println!("{:<25} {:>8} {:>8} {:>8}", "ship_key", "attack", "shield", "hull");
        println!("{}", "-".repeat(55));
        for (key, s) in &ships {
            println!("{:<25} {:>8} {:>8} {:>8}", key, s.attack, s.shield, s.hull);
        }

        println!("\n=== DÉFENSES (préfixe 'def_' pour --def-def) ===");
        let mut defs: Vec<_> = stats.iter()
            .filter(|(k, _)| k.starts_with("def_"))
            .collect();
        defs.sort_by_key(|(k, _)| k.as_str());
        println!("{:<30} {:>8} {:>8} {:>8}", "defense_key (sans 'def_')", "attack", "shield", "hull");
        println!("{}", "-".repeat(60));
        for (key, s) in &defs {
            println!("{:<30} {:>8} {:>8} {:>8}",
                key.strip_prefix("def_").unwrap_or(key), s.attack, s.shield, s.hull);
        }
        return;
    }

    if att_fleet_str.is_empty() && def_fleet_str.is_empty() {
        print_help();
        return;
    }

    // --- Parse fleet strings ---
    let att_ships    = parse_fleet(&att_fleet_str);
    let def_ships    = parse_fleet(&def_fleet_str);
    let def_defenses = parse_fleet_prefixed(&def_defenses_str, "def_");

    let att_bonuses = CombatBonuses {
        weapons_mult: 1.0 + att_weapons as f64 * 0.1,
        shield_mult:  1.0 + att_shield  as f64 * 0.1,
        armour_mult:  1.0 + att_armour  as f64 * 0.1,
    };
    let def_bonuses = CombatBonuses {
        weapons_mult: 1.0 + def_weapons as f64 * 0.1,
        shield_mult:  1.0 + def_shield  as f64 * 0.1,
        armour_mult:  1.0 + def_armour  as f64 * 0.1,
    };

    // --- Print scenario ---
    println!("\n╔══════════════════════════════════════╗");
    println!("║      SIMULATION DE COMBAT PvP        ║");
    println!("╚══════════════════════════════════════╝\n");

    println!("ATTAQUANT  (armes×{:.1} bouclier×{:.1} blindage×{:.1})",
        att_bonuses.weapons_mult, att_bonuses.shield_mult, att_bonuses.armour_mult);
    for (k, v) in &att_ships {
        let name = stats.get(k).map(|s| s.display_name.as_str()).unwrap_or(k);
        println!("  {:>6}× {}", v, name);
    }

    println!("\nDÉFENSEUR  (armes×{:.1} bouclier×{:.1} blindage×{:.1})",
        def_bonuses.weapons_mult, def_bonuses.shield_mult, def_bonuses.armour_mult);
    for (k, v) in &def_ships {
        let name = stats.get(k).map(|s| s.display_name.as_str()).unwrap_or(k);
        println!("  {:>6}× {}", v, name);
    }
    if !def_defenses.is_empty() {
        println!("  Défenses planétaires :");
        for (k, v) in &def_defenses {
            let name = stats.get(k).map(|s| s.display_name.as_str()).unwrap_or(k);
            println!("  {:>6}× {}", v, name);
        }
    }
    println!("\nRessources défenseur : métal={:.0}  cristal={:.0}  deutérium={:.0}",
        resources.0, resources.1, resources.2);
    println!("\n{}", "─".repeat(50));

    // --- Run simulation ---
    let report = simulate_pvp_combat(
        &stats, &rf,
        att_ships.clone(), att_bonuses,
        def_ships.clone(), def_defenses.clone(),
        def_bonuses,
        resources,
    );

    // --- Print log ---
    for line in &report.log {
        println!("{}", line);
    }

    println!("\n{}", "─".repeat(50));
    println!("RÉSULTAT FINAL : {}", report.winner.to_uppercase());

    if !report.attacker_remaining.is_empty() {
        println!("\nSurvivants ATTAQUANT :");
        for (k, v) in &report.attacker_remaining {
            let name = stats.get(k).map(|s| s.display_name.as_str()).unwrap_or(k);
            println!("  {:>6}× {}", v, name);
        }
    } else {
        println!("\nSurvivants ATTAQUANT : aucun");
    }

    let def_ships_remaining: HashMap<_, _> = report.defender_remaining.iter()
        .filter(|(k, _)| !k.starts_with("def_"))
        .collect();
    let def_defs_remaining: HashMap<_, _> = report.defender_remaining.iter()
        .filter(|(k, _)| k.starts_with("def_"))
        .collect();

    if !def_ships_remaining.is_empty() {
        println!("\nSurvivants DÉFENSEUR (vaisseaux) :");
        for (k, v) in &def_ships_remaining {
            let name = stats.get(*k).map(|s| s.display_name.as_str()).unwrap_or(k);
            println!("  {:>6}× {}", v, name);
        }
    } else {
        println!("\nSurvivants DÉFENSEUR (vaisseaux) : aucun");
    }

    if !def_defs_remaining.is_empty() {
        println!("\nSurvivants DÉFENSEUR (défenses) :");
        for (k, v) in &def_defs_remaining {
            let name = stats.get(*k).map(|s| s.display_name.as_str()).unwrap_or(k);
            println!("  {:>6}× {}", v, name);
        }
    }

    if report.winner == "attacker" {
        println!("\nBUTIN : métal={:.0}  cristal={:.0}  deutérium={:.0}",
            report.loot.0, report.loot.1, report.loot.2);
    }
}

fn parse_fleet(s: &str) -> HashMap<String, i32> {
    if s.is_empty() { return HashMap::new(); }
    s.split(',')
        .filter_map(|part| {
            let mut kv = part.trim().splitn(2, '=');
            let key   = kv.next()?.trim().to_string();
            let count = kv.next()?.trim().parse::<i32>().ok()?;
            if count > 0 { Some((key, count)) } else { None }
        })
        .collect()
}

fn parse_fleet_prefixed(s: &str, prefix: &str) -> HashMap<String, i32> {
    parse_fleet(s)
        .into_iter()
        .map(|(k, v)| (format!("{}{}", prefix, k), v))
        .collect()
}

fn print_help() {
    println!(r#"
combat_sim — Simulateur de combat PvP (Space Conquest)

USAGE:
  cargo run --bin combat_sim -- [OPTIONS]

OPTIONS:
  --att   "ship_key=count,..."     Flotte attaquant (ex: "light_hunter=50,cruiser=10")
  --def   "ship_key=count,..."     Flotte défenseur
  --def-def "key=count,..."        Défenses planétaires défenseur (ex: "rocket_launcher=20")
  --att-weapons <level>            Niveau weapons_tech attaquant (défaut: 0)
  --att-shield  <level>            Niveau shield_tech attaquant
  --att-armour  <level>            Niveau armour_tech attaquant
  --def-weapons <level>            Niveau weapons_tech défenseur
  --def-shield  <level>            Niveau shield_tech défenseur
  --def-armour  <level>            Niveau armour_tech défenseur
  --resources "metal,crystal,deut" Ressources défenseur (défaut: 100000,50000,20000)
  --list-ships                     Lister tous les types de vaisseaux et défenses avec leurs stats
  --help                           Afficher cette aide

EXEMPLES:
  # Combat simple
  cargo run --bin combat_sim -- --att "light_hunter=100" --def "light_hunter=80"

  # Avec technologie supérieure pour le défenseur
  cargo run --bin combat_sim -- --att "battleship=10" --def "battleship=10" --def-weapons 5 --def-armour 3

  # Avec défenses planétaires
  cargo run --bin combat_sim -- --att "cruiser=20" --def "light_hunter=10" --def-def "rocket_launcher=50,laser_cannon=20"

  # Lister les vaisseaux disponibles
  cargo run --bin combat_sim -- --list-ships

VARIABLES D'ENVIRONNEMENT:
  DATABASE_URL   URL de connexion PostgreSQL (ou utiliser un fichier .env)
"#);
}
