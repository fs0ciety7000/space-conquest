use serde::Serialize;
use rand::Rng;
use crate::entities::planet;
use crate::ServerConfigCache;

// ═══════════════════════════════════════════════════════════════════════════
// PLANETARY BIOMES
// ═══════════════════════════════════════════════════════════════════════════

pub const BIOMES: &[&str] = &[
    "tellurique",   // Équilibré
    "volcanique",   // +30% metal, -10% crystal/deuterium
    "glaciaire",    // +50% deuterium, -15% metal, -10% crystal
    "desertique",   // +25% crystal, -20% deuterium
    "oceanique",    // +20% crystal, +20% deuterium, -15% metal
    "aride",        // +20% metal, +10% crystal, -20% deuterium
];

pub struct BiomeMultipliers {
    pub metal: f64,
    pub crystal: f64,
    pub deuterium: f64,
}

pub fn get_biome_multipliers(biome: Option<&str>) -> BiomeMultipliers {
    match biome.unwrap_or("tellurique") {
        "volcanique" => BiomeMultipliers { metal: 1.30, crystal: 0.90, deuterium: 0.90 },
        "glaciaire"  => BiomeMultipliers { metal: 0.85, crystal: 0.90, deuterium: 1.50 },
        "desertique" => BiomeMultipliers { metal: 0.90, crystal: 1.25, deuterium: 0.80 },
        "oceanique"  => BiomeMultipliers { metal: 0.85, crystal: 1.20, deuterium: 1.20 },
        "aride"      => BiomeMultipliers { metal: 1.20, crystal: 1.10, deuterium: 0.80 },
        _            => BiomeMultipliers { metal: 1.00, crystal: 1.00, deuterium: 1.00 },
    }
}

pub fn biome_display_name(biome: &str) -> &'static str {
    match biome {
        "volcanique" => "Volcanique",
        "glaciaire"  => "Glaciaire",
        "desertique" => "Désertique",
        "oceanique"  => "Océanique",
        "aride"      => "Aride",
        _            => "Tellurique",
    }
}

pub fn biome_description(biome: &str) -> &'static str {
    match biome {
        "volcanique" => "Riche en métaux (+30%), mais les éruptions réduisent la production de cristal et deutérium (-10%).",
        "glaciaire"  => "Réservoirs de glace massifs (+50% deutérium), mais extraction minérale difficile (-15% métal, -10% cristal).",
        "desertique" => "Sous-sol cristallin abondant (+25% cristal), déshydratation sévère (-20% deutérium).",
        "oceanique"  => "Océans riches en cristaux et deutérium (+20% chacun), mais forage métallique limité (-15% métal).",
        "aride"      => "Plaines rocheuses riches (+20% métal, +10% cristal), mais manque d'eau (-20% deutérium).",
        _            => "Planète équilibrée, pas de bonus ni malus particuliers.",
    }
}

pub fn random_biome() -> &'static str {
    let mut rng = rand::thread_rng();
    BIOMES[rng.gen_range(0..BIOMES.len())]
}

// SPEED_FACTOR supprimé (v9.1) — utiliser config.production_speed / building_speed / etc.

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
    pub cargo_capacity: f64,
}

pub struct TechBonuses {
    pub weapons_multiplier: f64,  // 1.0 + (weapons_tech * 0.1)
    pub shield_multiplier: f64,   // 1.0 + (shield_tech * 0.1)
    pub armour_multiplier: f64,   // 1.0 + (armour_tech * 0.1)
    pub cargo_multiplier: f64,    // 1.0 + (logistics_tech * 0.05)
}

// --- COÛTS DE BASE DES UNITÉS ---
/// Retourne (métal, cristal) depuis la config DB, sans aucun scaling vitesse.
/// Les coûts sont les valeurs brutes définies dans server_config.
pub fn get_unit_cost(unit_type: &str, config: &ServerConfigCache) -> (f64, f64) {
    let (base_metal, base_crystal) = config.get_unit_cost(unit_type);

    if base_metal == 0.0 && base_crystal == 0.0 {
        // Fallback hardcodé si absent de la DB
        match unit_type {
            "light_hunter"      => (3000.0, 1000.0),
            "cruiser"           => (20000.0, 7000.0),
            "heavy_hunter"      => (6000.0, 4000.0),
            "battleship"        => (45000.0, 15000.0),
            "bomber"            => (50000.0, 25000.0),
            "destroyer"         => (60000.0, 50000.0),
            "transporter"       => (4000.0, 4000.0),
            "recycler"          => (10000.0, 6000.0),
            "spy_probe"         => (1000.0, 0.0),
            "colony_ship"       => (10000.0, 20000.0),
            "missile_launcher"  => (10000.0, 2500.0),
            "plasma_turret"     => (50000.0, 50000.0),
            _                   => (0.0, 0.0),
        }
    } else {
        (base_metal, base_crystal)
    }
}

// --- CALCULS RESSOURCES (Ratio 3:2:1) ---
pub enum ResourceType { Metal, Crystal, Deuterium }

pub fn calculate_resources(
    res_type: ResourceType,
    level: i32,
    current_amount: f64,
    last_update: chrono::NaiveDateTime,
    energy_tech_level: i32,
    plasma_tech_level: i32,
    solar_plant_level: i32,
    metal_mine_level: i32,
    crystal_mine_level: i32,
    deuterium_mine_level: i32,
    config: &ServerConfigCache
) -> f64 {
    let now = chrono::Utc::now().naive_utc();
    let duration = now.signed_duration_since(last_update).num_seconds() as f64;

    // Bonus technologie énergie (+1% par niveau)
    let tech_bonus_factor = config.get_config("energy_tech_bonus", 0.01);
    let tech_bonus = 1.0 + (energy_tech_level as f64 * tech_bonus_factor);

    // Bonus Plasma Tech (+1% production Métal/Cristal par niveau)
    let plasma_bonus_factor = config.get_config("tech_bonus_plasma_prod", 0.01);
    let plasma_bonus = 1.0 + (plasma_tech_level as f64 * plasma_bonus_factor);

    // CALCUL DU RATIO ÉNERGÉTIQUE
    let energy_production = calculate_energy_production(solar_plant_level, energy_tech_level, config);
    let energy_consumption = calculate_energy_consumption(metal_mine_level, crystal_mine_level, deuterium_mine_level, config);

    let efficiency = if energy_consumption == 0.0 {
        1.0
    } else {
        (energy_production / energy_consumption).min(1.0).max(0.0)
    };

    // Production de base (ratio 3:2:1) - lire depuis config
    let base_production = match res_type {
        ResourceType::Metal => {
            let base = config.get_config("production_metal_base", 30.0);
            let growth = config.get_config("production_metal_growth", 1.1);
            base * (level as f64) * growth.powi(level) * plasma_bonus
        },
        ResourceType::Crystal => {
            let base = config.get_config("production_crystal_base", 20.0);
            let growth = config.get_config("production_crystal_growth", 1.1);
            base * (level as f64) * growth.powi(level) * plasma_bonus
        },
        ResourceType::Deuterium => {
            let base = config.get_config("production_deuterium_base", 15.0);
            let growth = config.get_config("production_deuterium_growth", 1.1);
            base * (level as f64) * growth.powi(level) * plasma_bonus
        },
    };

    // Production avec bonus tech, plasma, et efficacité énergétique
    let production_per_sec = (base_production * tech_bonus * efficiency / 3600.0) * config.production_speed;
    current_amount + (production_per_sec * duration)
}

// --- CALCULS ÉNERGIE ---

/// Calcule la production d'énergie du solar plant uniquement (sans fusion_plant)
pub fn calculate_energy_production(solar_plant_level: i32, energy_tech_level: i32, config: &ServerConfigCache) -> f64 {
    if solar_plant_level == 0 {
        return 0.0;
    }

    let base = config.get_config("energy_solar_base", 60.0);
    let growth = config.get_config("energy_solar_growth", 1.1);
    let tech_bonus_factor = config.get_config("energy_tech_solar_bonus", 0.10);

    let base_production = base * (solar_plant_level as f64) * growth.powi(solar_plant_level);
    let tech_bonus = 1.0 + (energy_tech_level as f64 * tech_bonus_factor);
    base_production * tech_bonus
}

/// Calcule la production d'énergie de la fusion_plant
/// Formule : level * 50 unités par niveau (configurable via energy_fusion_per_level)
pub fn calculate_fusion_energy(fusion_plant_level: i32, config: &ServerConfigCache) -> f64 {
    if fusion_plant_level == 0 {
        return 0.0;
    }
    let per_level = config.get_config("energy_fusion_per_level", 50.0);
    fusion_plant_level as f64 * per_level
}

/// Calcule la consommation d'énergie totale des mines
pub fn calculate_energy_consumption(metal_mine_level: i32, crystal_mine_level: i32, deuterium_mine_level: i32, config: &ServerConfigCache) -> f64 {
    let base_cons = config.get_config("energy_mine_consumption_base", 10.0);
    let growth = config.get_config("energy_mine_consumption_growth", 1.1);
    let deut_extra = config.get_config("energy_deuterium_extra_consumption", 12.0);

    let metal_cons = base_cons * (metal_mine_level as f64) * growth.powi(metal_mine_level);
    let crystal_cons = base_cons * (crystal_mine_level as f64) * growth.powi(crystal_mine_level);
    let deut_cons = deut_extra * (deuterium_mine_level as f64) * growth.powi(deuterium_mine_level);
    metal_cons + crystal_cons + deut_cons
}

/// Calcule le ratio énergétique (production / consommation), fusion_plant incluse
/// Retourne un ratio entre 0.0 et 1.0 (ou plus si surplus)
pub fn calculate_energy_ratio(solar_plant_level: i32, energy_tech_level: i32,
                                metal_mine_level: i32, crystal_mine_level: i32,
                                deuterium_mine_level: i32, config: &ServerConfigCache) -> f64 {
    calculate_energy_ratio_with_fusion(solar_plant_level, energy_tech_level, 0,
        metal_mine_level, crystal_mine_level, deuterium_mine_level, config)
}

/// Calcule le ratio énergétique avec la contribution de la fusion_plant
pub fn calculate_energy_ratio_with_fusion(solar_plant_level: i32, energy_tech_level: i32,
                                           fusion_plant_level: i32,
                                           metal_mine_level: i32, crystal_mine_level: i32,
                                           deuterium_mine_level: i32, config: &ServerConfigCache) -> f64 {
    let solar_production = calculate_energy_production(solar_plant_level, energy_tech_level, config);
    let fusion_production = calculate_fusion_energy(fusion_plant_level, config);
    let total_production = solar_production + fusion_production;
    let consumption = calculate_energy_consumption(metal_mine_level, crystal_mine_level, deuterium_mine_level, config);

    if consumption == 0.0 {
        return 1.0; // Pas de consommation = 100%
    }

    (total_production / consumption).min(1.0) // Max 100%
}

/// Calcule la production horaire d'une ressource (en unités/heure)
pub fn calculate_resource_production(
    res_type: ResourceType,
    level: i32,
    energy_tech_level: i32,
    plasma_tech_level: i32,
    energy_ratio: f64,
    config: &ServerConfigCache
) -> f64 {
    // TODO (antigravity): production passive minimale même sans mines (niveau 0).
    // Garantit que les nouveaux joueurs ne restent pas bloqués sans ressources.
    // Configurable via server_config : production_metal_passive, _crystal_passive, _deuterium_passive
    if level == 0 {
        let passive = match res_type {
            ResourceType::Metal => config.get_config("production_metal_passive", 20.0),
            ResourceType::Crystal => config.get_config("production_crystal_passive", 10.0),
            ResourceType::Deuterium => config.get_config("production_deuterium_passive", 5.0),
        };
        return passive * config.production_speed;
    }

    // Bonus technologie énergie (+1% par niveau)
    let tech_bonus_factor = config.get_config("energy_tech_bonus", 0.01);
    let tech_bonus = 1.0 + (energy_tech_level as f64 * tech_bonus_factor);

    // Bonus Plasma Tech (+1% production Métal/Cristal par niveau)
    let plasma_bonus_factor = config.get_config("tech_bonus_plasma_prod", 0.01);
    let plasma_bonus = 1.0 + (plasma_tech_level as f64 * plasma_bonus_factor);

    // Production de base (ratio 3:2:1) - lire depuis config
    let base_production = match res_type {
        ResourceType::Metal => {
            let base = config.get_config("production_metal_base", 30.0);
            let growth = config.get_config("production_metal_growth", 1.1);
            base * (level as f64) * growth.powi(level) * plasma_bonus
        },
        ResourceType::Crystal => {
            let base = config.get_config("production_crystal_base", 20.0);
            let growth = config.get_config("production_crystal_growth", 1.1);
            base * (level as f64) * growth.powi(level) * plasma_bonus
        },
        ResourceType::Deuterium => {
            let base = config.get_config("production_deuterium_base", 15.0);
            let growth = config.get_config("production_deuterium_growth", 1.1);
            base * (level as f64) * growth.powi(level) * plasma_bonus
        },
    };

    // Production par heure avec tous les bonus
    base_production * tech_bonus * energy_ratio * config.production_speed
}

/// Calcule les ressources avec prise en compte du ratio énergétique
pub fn calculate_resources_with_energy(
    res_type: ResourceType,
    level: i32,
    current_amount: f64,
    last_update: chrono::NaiveDateTime,
    energy_tech_level: i32,
    plasma_tech_level: i32,
    energy_ratio: f64, // Entre 0.0 et 1.0
    config: &ServerConfigCache
) -> f64 {
    let now = chrono::Utc::now().naive_utc();
    let duration = now.signed_duration_since(last_update).num_seconds() as f64;

    // Bonus technologie énergie (+1% par niveau)
    let tech_bonus_factor = config.get_config("energy_tech_bonus", 0.01);
    let tech_bonus = 1.0 + (energy_tech_level as f64 * tech_bonus_factor);

    // Bonus Plasma Tech (+1% production Métal/Cristal par niveau)
    let plasma_bonus_factor = config.get_config("tech_bonus_plasma_prod", 0.01);
    let plasma_bonus = 1.0 + (plasma_tech_level as f64 * plasma_bonus_factor);

    // Production de base (ratio 3:2:1) - lire depuis config
    let base_production = match res_type {
        ResourceType::Metal => {
            let base = config.get_config("production_metal_base", 30.0);
            let growth = config.get_config("production_metal_growth", 1.1);
            base * (level as f64) * growth.powi(level) * plasma_bonus
        },
        ResourceType::Crystal => {
            let base = config.get_config("production_crystal_base", 20.0);
            let growth = config.get_config("production_crystal_growth", 1.1);
            base * (level as f64) * growth.powi(level) * plasma_bonus
        },
        ResourceType::Deuterium => {
            let base = config.get_config("production_deuterium_base", 15.0);
            let growth = config.get_config("production_deuterium_growth", 1.1);
            base * (level as f64) * growth.powi(level) * plasma_bonus
        },
    };

    // Application du ratio énergétique
    let production_per_sec = (base_production * tech_bonus * energy_ratio / 3600.0) * config.production_speed;
    current_amount + (production_per_sec * duration)
}

// --- COÛTS DES BÂTIMENTS (Exponentiel) ---
pub fn get_upgrade_cost(building_type: &str, level: i32, config: &ServerConfigCache) -> Cost {
    let base_cost = match building_type {
        // MINES (multiplicateur 1.5)
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

        // ÉNERGIE (multiplicateur 1.5)
        "solar_plant" => Cost {
            metal: 75.0 * 1.5f64.powi(level - 1),
            crystal: 30.0 * 1.5f64.powi(level - 1),
            deuterium: 0.0,
        },

        // INFRASTRUCTURES (multiplicateur 2.0)
        "shipyard" => Cost {
            metal: 400.0 * 1.5f64.powi(level - 1),
            crystal: 200.0 * 1.5f64.powi(level - 1),
            deuterium: 100.0 * 1.5f64.powi(level - 1),
        },
        "research" => Cost {
            metal: 200.0 * 1.5f64.powi(level - 1),
            crystal: 400.0 * 1.5f64.powi(level - 1),
            deuterium: 200.0 * 1.5f64.powi(level - 1),
        },
        "hangar" => Cost {
            metal: 400.0 * 1.5f64.powi(level - 1),
            crystal: 200.0 * 1.5f64.powi(level - 1),
            deuterium: 100.0 * 1.5f64.powi(level - 1),
        },
        "resource_storage" => Cost {
            metal: 1000.0 * 1.5f64.powi(level - 1),
            crystal: 500.0 * 1.5f64.powi(level - 1),
            deuterium: 0.0,
        },

        // TECHNOLOGIES DE BASE (multiplicateur 2.0)
        "energy_tech" => Cost {
            metal: 0.0,
            crystal: 800.0 * 2.0f64.powi(level - 1),
            deuterium: 400.0 * 2.0f64.powi(level - 1),
        },
        "laser" => Cost {
            metal: 200.0 * 2.0f64.powi(level - 1),
            crystal: 100.0 * 2.0f64.powi(level - 1),
            deuterium: 0.0,
        },
        "espionage" => Cost {
            metal: 200.0 * 2.0f64.powi(level - 1),
            crystal: 1000.0 * 2.0f64.powi(level - 1),
            deuterium: 200.0 * 2.0f64.powi(level - 1),
        },
        "armour" => Cost {
            metal: 1000.0 * 2.0f64.powi(level - 1),
            crystal: 0.0,
            deuterium: 0.0,
        },

        // TECHNOLOGIES AVANCÉES - EXPANSION 2.0 (multiplicateur 2.0)
        "ion_tech" => Cost {
            metal: 1000.0 * 2.0f64.powi(level - 1),
            crystal: 300.0 * 2.0f64.powi(level - 1),
            deuterium: 100.0 * 2.0f64.powi(level - 1),
        },
        "plasma_tech" => Cost {
            metal: 2000.0 * 2.0f64.powi(level - 1),
            crystal: 4000.0 * 2.0f64.powi(level - 1),
            deuterium: 1000.0 * 2.0f64.powi(level - 1),
        },
        "shield_tech" => Cost {
            metal: 200.0 * 2.0f64.powi(level - 1),
            crystal: 600.0 * 2.0f64.powi(level - 1),
            deuterium: 0.0,
        },
        "weapons_tech" => Cost {
            metal: 800.0 * 2.0f64.powi(level - 1),
            crystal: 200.0 * 2.0f64.powi(level - 1),
            deuterium: 0.0,
        },
        "computer_tech" => Cost {
            metal: 0.0,
            crystal: 400.0 * 2.0f64.powi(level - 1),
            deuterium: 600.0 * 2.0f64.powi(level - 1),
        },
        "combustion_drive" => Cost {
            metal: 400.0 * 2.0f64.powi(level - 1),
            crystal: 0.0,
            deuterium: 600.0 * 2.0f64.powi(level - 1),
        },
        "impulse_drive" => Cost {
            metal: 2000.0 * 2.0f64.powi(level - 1),
            crystal: 4000.0 * 2.0f64.powi(level - 1),
            deuterium: 600.0 * 2.0f64.powi(level - 1),
        },
        "hyperspace_drive" => Cost {
            metal: 10000.0 * 2.0f64.powi(level - 1),
            crystal: 20000.0 * 2.0f64.powi(level - 1),
            deuterium: 6000.0 * 2.0f64.powi(level - 1),
        },
        "astrophysics" => Cost {
            metal: 4000.0 * 2.0f64.powi(level - 1),
            crystal: 8000.0 * 2.0f64.powi(level - 1),
            deuterium: 4000.0 * 2.0f64.powi(level - 1),
        },
        "logistics_tech" => Cost {
            metal: 1000.0 * 2.0f64.powi(level - 1),
            crystal: 1000.0 * 2.0f64.powi(level - 1),
            deuterium: 1000.0 * 2.0f64.powi(level - 1),
        },

        _ => Cost { metal: 0.0, crystal: 0.0, deuterium: 0.0 },
    };

    base_cost
}

/// Temps de recherche basé sur le niveau cible, avec bonus du laboratoire.
/// Formule : BASE_TECH_TIME * level^TECH_EXPONENT * category_factor
/// Réduction : -7% par niveau de labo, max -55%.
pub fn get_research_time(tech_key: &str, level: i32, lab_level: i32, config: &ServerConfigCache) -> i64 {
    const BASE_TECH_TIME: f64 = 2400.0;   // 40 min à L1
    const TECH_EXPONENT: f64 = 1.50;
    const LAB_REDUCTION: f64 = 0.07;
    const MAX_REDUCTION: f64 = 0.55;

    let category_factor: f64 = match tech_key {
        "graviton_tech" | "astrophysics" => 2.5,
        "plasma_tech" | "hyperspace_tech" | "computer_tech" | "espionage_tech" => 1.5,
        _ => 1.0,
    };

    let base = BASE_TECH_TIME * (level as f64).powf(TECH_EXPONENT) * category_factor;
    let reduction_factor = 1.0 - (lab_level as f64 * LAB_REDUCTION).min(MAX_REDUCTION);
    let final_time = base * reduction_factor / config.research_speed;
    std::cmp::max(10, final_time as i64)
}

/// Détermine le category_factor d'un bâtiment pour get_build_time.
/// Mines et énergie : 1.0 — Infrastructures : 1.8
pub fn building_category_factor(building_key: &str) -> f64 {
    match building_key {
        "metal_mine" | "crystal_mine" | "deuterium_mine" | "solar_plant" | "fusion_plant" => 1.0,
        _ => 1.8, // shipyard, research_lab, hangar, resource_storage, nanite_factory...
    }
}

// TEMPS DE CONSTRUCTION PROGRESSIF
/// Formule : BASE_TIME * level^EXPONENT * category_factor
/// Réduction chantier : -8% par niveau, max -60%.
/// Délègue à get_build_time_with_nanite avec nanite_level=0.
pub fn get_build_time(level: i32, facility_level: i32, category_factor: f64, config: &ServerConfigCache) -> i64 {
    get_build_time_with_nanite(level, facility_level, 0, category_factor, config)
}

/// Variante de get_build_time incluant la réduction de la nanite_factory.
/// nanite_level : chaque niveau divise le temps final par 2 (formule : time / 2^nanite_level).
pub fn get_build_time_with_nanite(level: i32, facility_level: i32, nanite_level: i32, category_factor: f64, config: &ServerConfigCache) -> i64 {
    const BASE_TIME: f64 = 1800.0;   // 30 min à L1
    const EXPONENT: f64 = 1.40;
    const REDUCTION_PER_LEVEL: f64 = 0.08;
    const MAX_REDUCTION: f64 = 0.60;

    let base = BASE_TIME * (level as f64).powf(EXPONENT) * category_factor;
    let reduction_factor = 1.0 - (facility_level as f64 * REDUCTION_PER_LEVEL).min(MAX_REDUCTION);
    let raw_time = base * reduction_factor / config.building_speed;
    // nanite_factory : chaque niveau divise le temps par 2
    let nanite_divisor = (2_f64).powi(nanite_level);
    std::cmp::max(10, (raw_time / nanite_divisor) as i64)
}

/// Temps de production d'un vaisseau/défense, basé sur son coût réel.
/// Formule : (metal + crystal) / (BUILD_RATE x shipyard_factor) * 3600 / ship_build_speed
/// BUILD_RATE x5 par rapport à l'ancienne formule pour éviter des temps absurdes.
pub fn get_ship_production_time(ship_type: &str, qty: i32, shipyard_level: i32, config: &ServerConfigCache) -> i64 {
    // BUILD_RATE en ressources/heure — doit être identique à la formule dans handlers/shipyard.rs
    const BUILD_RATE: f64 = 3600.0;
    const SHIPYARD_BONUS: f64 = 0.10;
    const MIN_SECS_PER_UNIT: i64 = 5;

    let (metal, crystal) = get_unit_cost(ship_type, config);
    let cost_per_unit = metal + crystal;
    let effective_rate = BUILD_RATE * (1.0 + shipyard_level as f64 * SHIPYARD_BONUS);
    // Temps brut sans diviseur de vitesse (en secondes)
    let secs_per_unit = ((cost_per_unit / effective_rate) * 3600.0) as i64;
    let secs_per_unit = secs_per_unit.max(MIN_SECS_PER_UNIT);
    let total_secs = secs_per_unit * qty as i64;
    std::cmp::max(MIN_SECS_PER_UNIT * qty as i64, (total_secs as f64 / config.ship_build_speed) as i64)
}

// CAPACITÉS
pub fn get_fleet_capacity(hangar_level: i32, config: &ServerConfigCache) -> i32 {
    let base = config.get_config("hangar_capacity_base", 500.0) as i32;
    let per_level = config.get_config("hangar_capacity_per_level", 500.0) as i32;
    base + (hangar_level * per_level)
}

/// Capacité transporteur par unité.
/// Formule : base * (1 + hangar_level * bonus_hangar) * (1 + computer_tech_level * bonus_computer)
/// Les bonus supplémentaires pourront être ajoutés via config sans changer la signature.
pub fn get_transporter_capacity(hangar_level: i32, config: &ServerConfigCache) -> f64 {
    get_transporter_capacity_with_tech(hangar_level, 0, config)
}

pub fn get_transporter_capacity_with_tech(hangar_level: i32, computer_tech_level: i32, config: &ServerConfigCache) -> f64 {
    let base_capacity = config.get_config("cargo_transporter_base", 10000.0);
    let bonus_per_hangar = config.get_config("cargo_transporter_bonus_per_hangar", 0.05);
    let bonus_per_computer_tech = config.get_config("cargo_transporter_bonus_per_computer_tech", 0.1);
    base_capacity
        * (1.0 + (hangar_level as f64 * bonus_per_hangar))
        * (1.0 + (computer_tech_level as f64 * bonus_per_computer_tech))
}

pub const TRANSPORTER_CAPACITY: f64 = 10000.0; // Deprecated: utilisez get_transporter_capacity()

/// Applique le cap de stockage à un montant de ressource.
/// À appeler après chaque mise à jour de ressources (tick ou GET planet).
/// TODO (antigravity): intégrer dans tick_system.rs + calculate_resources() callers
pub fn apply_storage_cap(amount: f64, storage_level: i32, config: &ServerConfigCache) -> f64 {
    let cap = get_storage_capacity(storage_level, config);
    amount.min(cap)
}

// Capacité de stockage des ressources (exponentielle par niveau)
pub fn get_storage_capacity(storage_level: i32, config: &ServerConfigCache) -> f64 {
    let base_capacity = config.get_config("storage_capacity_base", 600000.0);
    if storage_level == 0 {
        base_capacity
    } else {
        let growth = config.get_config("storage_capacity_growth", 1.6);
        base_capacity * growth.powi(storage_level)
    }
}

// Capacité de cargo des vaisseaux de combat (pour le butin des attaques)
pub fn get_ship_cargo_capacity(ship_type: &str, config: &ServerConfigCache) -> f64 {
    match ship_type {
        "light_hunter" => config.get_config("cargo_light_hunter", 50.0),
        "cruiser" => config.get_config("cargo_cruiser", 800.0),
        "heavy_hunter" => config.get_config("cargo_heavy_hunter", 100.0),
        "battleship" => config.get_config("cargo_battleship", 1500.0),
        "bomber" => config.get_config("cargo_bomber", 500.0),
        "destroyer" => config.get_config("cargo_destroyer", 2000.0),
        "transporter" => config.get_config("cargo_transporter_base", 10000.0),
        _ => 0.0,
    }
}

// Helper functions
pub fn get_light_hunter_stats(config: &ServerConfigCache) -> (f64, f64) { get_unit_cost("light_hunter", config) }
pub fn get_cruiser_stats(config: &ServerConfigCache) -> (f64, f64) { get_unit_cost("cruiser", config) }
pub fn get_recycler_stats(config: &ServerConfigCache) -> (f64, f64) { get_unit_cost("recycler", config) }
pub fn get_spy_probe_stats(config: &ServerConfigCache) -> (f64, f64) { get_unit_cost("spy_probe", config) }
pub fn get_missile_launcher_stats(config: &ServerConfigCache) -> (f64, f64) { get_unit_cost("missile_launcher", config) }
pub fn get_plasma_turret_stats(config: &ServerConfigCache) -> (f64, f64) { get_unit_cost("plasma_turret", config) }
pub fn get_colony_ship_stats(config: &ServerConfigCache) -> (f64, f64) { get_unit_cost("colony_ship", config) }
pub fn get_transporter_stats(config: &ServerConfigCache) -> (f64, f64) { get_unit_cost("transporter", config) }

// --- MOTEUR DE COMBAT ---
pub fn get_unit_base_stats(unit_type: &str, config: &ServerConfigCache) -> UnitStats {
    match unit_type {
        // Vaisseaux de Base
        "light_hunter" => UnitStats {
            attack: config.get_config("combat_light_hunter_attack", 50.0),
            shield: config.get_config("combat_light_hunter_shield", 10.0),
            hull: config.get_config("combat_light_hunter_hull", 400.0),
            cargo_capacity: config.get_config("cargo_light_hunter", 50.0),
        },
        "cruiser" => UnitStats {
            attack: config.get_config("combat_cruiser_attack", 400.0),
            shield: config.get_config("combat_cruiser_shield", 50.0),
            hull: config.get_config("combat_cruiser_hull", 2700.0),
            cargo_capacity: config.get_config("cargo_cruiser", 800.0),
        },

        // Vaisseaux Avancés - EXPANSION 2.0
        "heavy_hunter" => UnitStats {
            attack: config.get_config("combat_heavy_hunter_attack", 150.0),
            shield: config.get_config("combat_heavy_hunter_shield", 25.0),
            hull: config.get_config("combat_heavy_hunter_hull", 1000.0),
            cargo_capacity: config.get_config("cargo_heavy_hunter", 100.0),
        },
        "battleship" => UnitStats {
            attack: config.get_config("combat_battleship_attack", 1000.0),
            shield: config.get_config("combat_battleship_shield", 200.0),
            hull: config.get_config("combat_battleship_hull", 6000.0),
            cargo_capacity: config.get_config("cargo_battleship", 1500.0),
        },
        "bomber" => UnitStats {
            attack: config.get_config("combat_bomber_attack", 1000.0),
            shield: config.get_config("combat_bomber_shield", 500.0),
            hull: config.get_config("combat_bomber_hull", 7500.0),
            cargo_capacity: config.get_config("cargo_bomber", 500.0),
        },
        "destroyer" => UnitStats {
            attack: config.get_config("combat_destroyer_attack", 2000.0),
            shield: config.get_config("combat_destroyer_shield", 500.0),
            hull: config.get_config("combat_destroyer_hull", 11000.0),
            cargo_capacity: config.get_config("cargo_destroyer", 2000.0),
        },

        // Défenses
        "missile_launcher" => UnitStats {
            attack: config.get_config("combat_missile_launcher_attack", 80.0),
            shield: config.get_config("combat_missile_launcher_shield", 20.0),
            hull: config.get_config("combat_missile_launcher_hull", 200.0),
            cargo_capacity: 0.0,
        },
        "plasma_turret" => UnitStats {
            attack: config.get_config("combat_plasma_turret_attack", 3000.0),
            shield: config.get_config("combat_plasma_turret_shield", 300.0),
            hull: config.get_config("combat_plasma_turret_hull", 10000.0),
            cargo_capacity: 0.0,
        },

        // Default
        _ => UnitStats {
            attack: 1.0,
            shield: 1.0,
            hull: 10.0,
            cargo_capacity: 0.0,
        },
    }
}

/// Apply tech bonuses to base stats
pub fn apply_tech_bonuses(base_stats: UnitStats, bonuses: &TechBonuses) -> UnitStats {
    UnitStats {
        attack: base_stats.attack * bonuses.weapons_multiplier,
        shield: base_stats.shield * bonuses.shield_multiplier,
        hull: base_stats.hull * bonuses.armour_multiplier,
        cargo_capacity: base_stats.cargo_capacity * bonuses.cargo_multiplier,
    }
}

/// Create tech bonuses from tech levels
pub fn create_tech_bonuses(
    weapons_tech: i32,
    shield_tech: i32,
    armour_tech: i32,
    logistics_tech: i32,
    config: &ServerConfigCache
) -> TechBonuses {
    let weapons_bonus = config.get_config("tech_bonus_weapons", 0.1);
    let shield_bonus = config.get_config("tech_bonus_shield", 0.1);
    let armour_bonus = config.get_config("combat_armour_tech_bonus", 0.1);
    let cargo_bonus = config.get_config("tech_bonus_cargo", 0.05);

    TechBonuses {
        weapons_multiplier: 1.0 + (weapons_tech as f64 * weapons_bonus),
        shield_multiplier: 1.0 + (shield_tech as f64 * shield_bonus),
        armour_multiplier: 1.0 + (armour_tech as f64 * armour_bonus),
        cargo_multiplier: 1.0 + (logistics_tech as f64 * cargo_bonus),
    }
}

pub fn get_rapid_fire(attacker: &str, target: &str, config: &ServerConfigCache) -> i32 {
    match (attacker, target) {
        // Existing Rapid Fire
        ("cruiser", "light_hunter") => config.get_config("combat_rf_cruiser_vs_light_hunter", 6.0) as i32,
        ("cruiser", "missile_launcher") => config.get_config("combat_rf_cruiser_vs_missile_launcher", 10.0) as i32,
        ("plasma_turret", "light_hunter") => config.get_config("combat_rf_plasma_vs_light_hunter", 5.0) as i32,
        ("plasma_turret", "cruiser") => config.get_config("combat_rf_plasma_vs_cruiser", 3.0) as i32,

        // NEW SHIPS RAPID FIRE - EXPANSION 2.0
        // Heavy Hunter
        ("heavy_hunter", "spy_probe") => config.get_config("combat_rf_heavy_hunter_vs_spy_probe", 5.0) as i32,

        // Battleship
        ("battleship", "light_hunter") => config.get_config("combat_rf_battleship_vs_light_hunter", 4.0) as i32,
        ("battleship", "heavy_hunter") => config.get_config("combat_rf_battleship_vs_heavy_hunter", 3.0) as i32,

        // Bomber (anti-defense specialist)
        ("bomber", "missile_launcher") => config.get_config("combat_rf_bomber_vs_missile_launcher", 20.0) as i32,
        ("bomber", "plasma_turret") => config.get_config("combat_rf_bomber_vs_plasma_turret", 10.0) as i32,

        // Destroyer (anti-large-ship)
        ("destroyer", "battleship") => config.get_config("combat_rf_destroyer_vs_battleship", 2.0) as i32,
        ("destroyer", "bomber") => config.get_config("combat_rf_destroyer_vs_bomber", 5.0) as i32,

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
    att_hunters: i32, att_cruisers: i32, att_transporters: i32, att_hangar_level: i32, att_techs: CombatTechs,
    def_hunters: i32, def_cruisers: i32,
    _def_lasers: i32,
    def_missiles: i32, def_plasmas: i32,
    def_techs: CombatTechs,
    def_resources: Cost,
    config: &ServerConfigCache
) -> PvpReport {
    let mut log = Vec::new();
    let mut rng = rand::thread_rng();

    // Tech bonuses from config
    let laser_bonus = config.get_config("combat_laser_tech_bonus", 0.1);
    let armour_bonus = config.get_config("combat_armour_tech_bonus", 0.1);

    let apply_techs = |base: UnitStats, techs: &CombatTechs| -> UnitStats {
        UnitStats {
            attack: base.attack * (1.0 + techs.laser as f64 * laser_bonus),
            shield: base.shield, // Pas de tech bouclier pour l'instant
            hull: base.hull * (1.0 + techs.armour as f64 * armour_bonus),
            cargo_capacity: base.cargo_capacity, // Cargo not affected by these techs
        }
    };

    let mut attacker_fleet = vec![
        ("light_hunter", att_hunters, apply_techs(get_unit_base_stats("light_hunter", config), &att_techs)),
        ("cruiser", att_cruisers, apply_techs(get_unit_base_stats("cruiser", config), &att_techs)),
    ];

    let mut defender_fleet = vec![
        ("light_hunter", def_hunters, apply_techs(get_unit_base_stats("light_hunter", config), &def_techs)),
        ("cruiser", def_cruisers, apply_techs(get_unit_base_stats("cruiser", config), &def_techs)),
        ("missile_launcher", def_missiles, apply_techs(get_unit_base_stats("missile_launcher", config), &def_techs)),
        ("plasma_turret", def_plasmas, apply_techs(get_unit_base_stats("plasma_turret", config), &def_techs)),
    ];

    log.push("Début de l'engagement orbital".to_string());

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
                        let rf = get_rapid_fire(a_type, d_type, config);
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
                        let rf = get_rapid_fire(d_type, a_type, config);
                        re_fire = rf > 0 && rng.gen_range(0..rf) > 0;
                    } else { re_fire = false; }
                }
            }
        }

        apply_losses(&mut defender_fleet, att_dmg);
        apply_losses(&mut attacker_fleet, def_dmg);
        log.push(format!("Round {}: Dégâts A: {:.0} | D: {:.0}", round, att_dmg, def_dmg));
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

    // BUTIN (configurable % des ressources, limité par la capacité de cargo des vaisseaux survivants)
    let loot = if winner == "attacker" {
        // Calculer la capacité de cargo totale des vaisseaux survivants
        // Les transporteurs ne participent pas au combat, donc ils survivent tous
        let transporter_capacity = att_transporters as f64 * get_transporter_capacity(att_hangar_level, config);
        let combat_ships_capacity = (f_att_h as f64 * get_ship_cargo_capacity("light_hunter", config))
                                   + (f_att_c as f64 * get_ship_cargo_capacity("cruiser", config));
        let total_cargo_capacity = transporter_capacity + combat_ships_capacity;

        // Lire les paramètres de butin depuis la config
        let loot_percentage = config.get_config("combat_loot_percentage", 0.5);

        // Butin = 50% des ressources défenseur — seul le cargo est limitant (v9.1)
        let potential_metal     = def_resources.metal     * loot_percentage;
        let potential_crystal   = def_resources.crystal   * loot_percentage;
        let potential_deuterium = def_resources.deuterium * loot_percentage;
        let total_potential_loot = potential_metal + potential_crystal + potential_deuterium;

        // Si le butin potentiel dépasse la capacité, le réduire proportionnellement
        let actual_loot_ratio = if total_potential_loot > total_cargo_capacity && total_cargo_capacity > 0.0 {
            log.push(format!("Cargo insuffisant ! Capacité: {:.0} / Butin disponible: {:.0}", total_cargo_capacity, total_potential_loot));
            total_cargo_capacity / total_potential_loot
        } else {
            1.0
        };

        let final_loot = Cost {
            metal: (potential_metal * actual_loot_ratio).min(def_resources.metal),
            crystal: (potential_crystal * actual_loot_ratio).min(def_resources.crystal),
            deuterium: (potential_deuterium * actual_loot_ratio).min(def_resources.deuterium)
        };

        if final_loot.metal > 0.0 || final_loot.crystal > 0.0 || final_loot.deuterium > 0.0 {
            log.push(format!("Butin récupéré : {:.0}M / {:.0}C / {:.0}D", final_loot.metal, final_loot.crystal, final_loot.deuterium));
        }

        final_loot
    } else { Cost { metal: 0.0, crystal: 0.0, deuterium: 0.0 } };

    // CHAMP DE DÉBRIS (configurable % des pertes)
    let att_h_lost = att_hunters - f_att_h;
    let att_c_lost = att_cruisers - f_att_c;
    let def_h_lost = def_hunters - f_def_h;
    let def_c_lost = def_cruisers - f_def_c;

    let (h_m, h_c) = get_unit_cost("light_hunter", config);
    let (c_m, c_c) = get_unit_cost("cruiser", config);

    let total_metal_lost = (att_h_lost + def_h_lost) as f64 * h_m + (att_c_lost + def_c_lost) as f64 * c_m;
    let total_crystal_lost = (att_h_lost + def_h_lost) as f64 * h_c + (att_c_lost + def_c_lost) as f64 * c_c;

    let debris_percentage = config.get_config("combat_debris_percentage", 0.3);
    let debris_m = total_metal_lost * debris_percentage;
    let debris_c = total_crystal_lost * debris_percentage;

    if debris_m > 0.0 {
        log.push(format!("Débris : {:.0}M / {:.0}C", debris_m, debris_c));
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

pub fn calculate_flight_time(dist: f64, flight_speed_multiplier: f64) -> i64 {
    // Calculate base time based on distance ranges for more realistic travel times
    let base_time = if dist < 1000.0 {
        // Same system, different position: 30s to 2 minutes
        dist / 10.0 + 30.0
    } else if dist < 10000.0 {
        // Same galaxy, different system: 5-15 minutes
        dist / 5.0 + 200.0
    } else {
        // Different galaxy: 30 minutes to 1+ hour
        dist / 2.0 + 500.0
    };

    // Apply flight speed multiplier (higher = faster travel)
    let seconds = base_time / flight_speed_multiplier;
    seconds.max(5.0) as i64
}


// CALCUL DES POINTS D'UNE PLANÈTE (utilisé par leaderboard et profil)
// Uses relational tables (planet_buildings, planet_technologies, planet_ships, planet_defenses)
pub async fn calculate_planet_points(p: &crate::entities::planet::Model, db: &sea_orm::DatabaseConnection, config: &ServerConfigCache) -> (i32, i32, i32) {
    use crate::tech_tree;

    // Load all relational data
    let building_levels = tech_tree::get_all_planet_building_levels(db, p.id)
        .await
        .unwrap_or_default();
    let tech_levels = tech_tree::get_all_planet_tech_levels(db, p.id)
        .await
        .unwrap_or_default();
    let defense_counts = tech_tree::get_all_planet_defense_counts(db, p.id)
        .await
        .unwrap_or_default();

    // Points économie (bâtiments)
    let get_bl = |key: &str| *building_levels.get(key).unwrap_or(&0);
    let buildings =
        (get_bl("metal_mine") * get_bl("metal_mine") * 10) +
        (get_bl("crystal_mine") * get_bl("crystal_mine") * 15) +
        (get_bl("deuterium_mine") * get_bl("deuterium_mine") * 25) +
        (get_bl("solar_plant") * get_bl("solar_plant") * 5) +
        (get_bl("shipyard") * get_bl("shipyard") * 40) +
        (get_bl("research_lab") * get_bl("research_lab") * 50) +
        (get_bl("hangar") * get_bl("hangar") * 35);

    // Points recherche (technologies) — clés correspondant à la DB
    let tech_base_points: std::collections::HashMap<&str, i32> = [
        ("energy_tech", 50),
        ("laser_tech", 40),
        ("espionage_tech", 60),
        ("armour_tech", 70),
        ("ion_tech", 80),
        ("plasma_tech", 100),
        ("shield_tech", 75),
        ("weapons_tech", 85),
        ("computer_tech", 45),
        ("combustion_drive", 55),
        ("impulse_drive", 65),
        ("hyperspace_drive", 90),
        ("hyperspace_tech", 90),
        ("astrophysics", 95),
        ("logistics_tech", 50),
        ("intergalactic_network", 100),
        ("graviton_tech", 150),
    ].iter().copied().collect();

    let mut research = 0;
    for (tech_key, level) in &tech_levels {
        let base = tech_base_points.get(tech_key.as_str()).unwrap_or(&50);
        research += level * level * base;
    }

    // Points militaire — défenses uniquement (vaisseaux exclus : trop volatils)
    // Formule: (attack + shield/2 + hull/10) / 1000 par unité
    use crate::entities::prelude::DefenseType;
    use sea_orm::EntityTrait;

    let all_defense_types = DefenseType::find().all(db).await.unwrap_or_default();
    let defense_stats: std::collections::HashMap<String, (i32, i32, i32)> = all_defense_types
        .iter()
        .map(|d| (d.defense_key.clone(), (d.attack, d.shield, d.hull)))
        .collect();

    let mut defense_points: i64 = 0;
    for (def_key, count) in &defense_counts {
        let (atk, shd, hul) = defense_stats.get(def_key.as_str()).copied().unwrap_or((10, 5, 100));
        let unit_value = (atk as i64) + (shd as i64 / 2) + (hul as i64 / 10);
        defense_points += (*count as i64) * unit_value / 1000;
    }
    let military = defense_points as i32;

    // Points production (basé sur la production horaire)
    let energy_tech_level = *tech_levels.get("energy_tech").unwrap_or(&0);
    let plasma_tech_level = *tech_levels.get("plasma_tech").unwrap_or(&0);
    let metal_level = get_bl("metal_mine");
    let crystal_level = get_bl("crystal_mine");
    let deuterium_level = get_bl("deuterium_mine");
    let solar_level = get_bl("solar_plant");
    let fusion_level = get_bl("fusion_plant");

    let energy_ratio = calculate_energy_ratio_with_fusion(
        solar_level,
        energy_tech_level,
        fusion_level,
        metal_level,
        crystal_level,
        deuterium_level,
        config
    );

    // Production de base avec bonus tech et énergie
    let prod_metal = calculate_resource_production(
        ResourceType::Metal,
        metal_level,
        energy_tech_level,
        plasma_tech_level,
        energy_ratio,
        config
    );
    let prod_crystal = calculate_resource_production(
        ResourceType::Crystal,
        crystal_level,
        energy_tech_level,
        plasma_tech_level,
        energy_ratio,
        config
    );
    let prod_deuterium = calculate_resource_production(
        ResourceType::Deuterium,
        deuterium_level,
        energy_tech_level,
        plasma_tech_level,
        energy_ratio,
        config
    );

    // 1 point par tranche de 1000 ressources produites par heure
    // Pondération : métal x1, cristal x1.5, deutérium x2 (rareté)
    let production_points = (
        (prod_metal / 1000.0) +
        (prod_crystal / 1000.0 * 1.5) +
        (prod_deuterium / 1000.0 * 2.0)
    ) as i32;

    // Points ressources stockées (1 pt par tranche de 50k — encourage à collecter)
    let stored_points = (
        (p.metal_amount / 50000.0) +
        (p.crystal_amount / 50000.0 * 1.5) +
        (p.deuterium_amount / 50000.0 * 2.0)
    ) as i32;

    let economy = buildings + research + production_points + stored_points;
    let total = economy + military;

    (total, economy, military)
}

// Fonction pour obtenir le badge de rang - PROGRESSION LENTE
pub fn get_rank_badge(total_points: i32) -> &'static str {
    if total_points >= 1000000 { "Empereur Galactique" }       // Objectif ultime
    else if total_points >= 500000 { "Seigneur de Guerre" }    // Très haut niveau
    else if total_points >= 250000 { "Grand Amiral" }          // Elite
    else if total_points >= 100000 { "Amiral" }                // Haut niveau
    else if total_points >= 50000 { "Vice-Amiral" }            // Niveau avancé
    else if total_points >= 25000 { "Commandant" }             // Joueur sérieux
    else if total_points >= 12000 { "Capitaine" }              // Niveau intermédiaire
    else if total_points >= 6000 { "Lieutenant" }              // Progression solide
    else if total_points >= 3000 { "Sous-Lieutenant" }         // Débutant avancé
    else if total_points >= 1500 { "Officier" }                // Early game
    else if total_points >= 800 { "Sergent" }                  // Tout début
    else if total_points >= 300 { "Caporal" }                  // Premier rang
    else { "Recrue" }                                          // Début
}

// ========================
// SYSTÈME DE SLOTS DE PRODUCTION
// ========================

/// Compte le nombre de slots assignés à un type de ressource
/// Renvoie le nombre de slots actifs pour metal, crystal, energy, deuterium
pub fn count_slots_for_resource(
    slot_1: &Option<String>,
    slot_2: &Option<String>,
    slot_3: &Option<String>,
    slot_4: &Option<String>,
    resource_type: &str
) -> i32 {
    let slots = [slot_1, slot_2, slot_3, slot_4];
    slots.iter()
        .filter(|s| s.as_ref().map(|v| v == resource_type).unwrap_or(false))
        .count() as i32
}

/// Calcule le bonus de production basé sur les slots (configurable)
pub fn get_slot_bonus(slots_count: i32, config: &ServerConfigCache) -> f64 {
    let bonus_per_slot = config.get_config("slot_bonus_per_slot", 0.5);
    1.0 + (slots_count as f64 * bonus_per_slot)
}

/// Coût progressif pour débloquer un slot (slot_number de 1 à 4)
pub fn get_slot_unlock_cost(slot_number: i32, config: &ServerConfigCache) -> Cost {
    let base_cost = Cost {
        metal: 5000.0,
        crystal: 3000.0,
        deuterium: 1000.0,
    };

    let multiplier = slot_number as f64; // x1, x2, x3, x4
    Cost {
        metal:     base_cost.metal     * multiplier,
        crystal:   base_cost.crystal   * multiplier,
        deuterium: base_cost.deuterium * multiplier,
    }
}

/// Retourne le numéro du prochain slot à débloquer (1-4) ou None si tous débloqués
pub fn get_next_slot_to_unlock(
    slot_1: &Option<String>,
    slot_2: &Option<String>,
    slot_3: &Option<String>,
    slot_4: &Option<String>,
) -> Option<i32> {
    if slot_1.is_none() { return Some(1); }
    if slot_2.is_none() { return Some(2); }
    if slot_3.is_none() { return Some(3); }
    if slot_4.is_none() { return Some(4); }
    None // Tous les slots sont déjà débloqués
}

/// Vérifie si un slot est débloqué (valeur "none" ou une ressource assignée)
pub fn is_slot_unlocked(slot: &Option<String>) -> bool {
    slot.is_some()
}

/// Calcule les ressources avec prise en compte des slots de production
pub fn calculate_resources_with_slots(
    res_type: ResourceType,
    level: i32,
    current_amount: f64,
    last_update: chrono::NaiveDateTime,
    energy_tech_level: i32,
    plasma_tech_level: i32,
    energy_ratio: f64,
    slot_1: &Option<String>,
    slot_2: &Option<String>,
    slot_3: &Option<String>,
    slot_4: &Option<String>,
    config: &ServerConfigCache,
) -> f64 {
    let now = chrono::Utc::now().naive_utc();
    let duration = now.signed_duration_since(last_update).num_seconds() as f64;

    // Bonus technologie énergie (+1% par niveau)
    let tech_bonus_factor = config.get_config("energy_tech_bonus", 0.01);
    let tech_bonus = 1.0 + (energy_tech_level as f64 * tech_bonus_factor);

    // Bonus Plasma Tech (+1% production Métal/Cristal par niveau)
    let plasma_bonus_factor = config.get_config("tech_bonus_plasma_prod", 0.01);
    let plasma_bonus = 1.0 + (plasma_tech_level as f64 * plasma_bonus_factor);

    // Déterminer le type de ressource pour compter les slots
    let resource_key = match res_type {
        ResourceType::Metal => "metal",
        ResourceType::Crystal => "crystal",
        ResourceType::Deuterium => "deuterium",
    };

    // Bonus des slots (+50% par slot assigné)
    let slots_count = count_slots_for_resource(slot_1, slot_2, slot_3, slot_4, resource_key);
    let slot_bonus = get_slot_bonus(slots_count, config);

    // Production de base (ratio 3:2:1) - lire depuis config
    let base_production = match res_type {
        ResourceType::Metal => {
            let base = config.get_config("production_metal_base", 30.0);
            let growth = config.get_config("production_metal_growth", 1.1);
            base * (level as f64) * growth.powi(level) * plasma_bonus
        },
        ResourceType::Crystal => {
            let base = config.get_config("production_crystal_base", 20.0);
            let growth = config.get_config("production_crystal_growth", 1.1);
            base * (level as f64) * growth.powi(level) * plasma_bonus
        },
        ResourceType::Deuterium => {
            let base = config.get_config("production_deuterium_base", 15.0);
            let growth = config.get_config("production_deuterium_growth", 1.1);
            base * (level as f64) * growth.powi(level) * plasma_bonus
        },
    };

    // Application du ratio énergétique, slots et production_speed
    let production_per_sec = (base_production * tech_bonus * energy_ratio * slot_bonus / 3600.0) * config.production_speed;
    current_amount + (production_per_sec * duration)
}

/// Calcule le bonus d'énergie avec les slots assignés à "energy"
pub fn calculate_energy_production_with_slots(
    solar_plant_level: i32,
    energy_tech_level: i32,
    slot_1: &Option<String>,
    slot_2: &Option<String>,
    slot_3: &Option<String>,
    slot_4: &Option<String>,
    config: &ServerConfigCache
) -> f64 {
    if solar_plant_level == 0 {
        return 0.0;
    }

    // Bonus des slots énergie
    let slots_count = count_slots_for_resource(slot_1, slot_2, slot_3, slot_4, "energy");
    let slot_bonus = get_slot_bonus(slots_count, config);

    let base = config.get_config("energy_solar_base", 60.0);
    let growth = config.get_config("energy_solar_growth", 1.1);
    let tech_bonus_factor = config.get_config("energy_tech_solar_bonus", 0.10);

    let base_production = base * (solar_plant_level as f64) * growth.powi(solar_plant_level);
    let tech_bonus = 1.0 + (energy_tech_level as f64 * tech_bonus_factor);
    base_production * tech_bonus * slot_bonus
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORE CACHE — Refresh périodique des scores sur la table user
// ═══════════════════════════════════════════════════════════════════════════

/// Recalcule et persiste les scores (total, économie, militaire) de tous les joueurs.
/// Appelé toutes les 5 minutes par un job tokio dans main.rs.
/// Permet une pagination SQL directe sur /ranking via ORDER BY total_score DESC.
pub async fn refresh_all_user_scores(db: &sea_orm::DatabaseConnection, config: &ServerConfigCache) {
    use sea_orm::{EntityTrait, ConnectionTrait, Statement, QueryFilter, ColumnTrait};
    use crate::entities::prelude::{Planet, CombatLog};
    use crate::entities::combat_log;

    let planets = match Planet::find().all(db).await {
        Ok(p) => p,
        Err(_) => return,
    };

    // Grouper par owner
    let mut by_user: std::collections::HashMap<uuid::Uuid, Vec<planet::Model>> = std::collections::HashMap::new();
    for p in planets {
        by_user.entry(p.owner_id).or_default().push(p);
    }

    for (user_id, user_planets) in by_user {
        let mut total = 0i32;
        let mut economy = 0i32;
        let mut military = 0i32;

        for p in &user_planets {
            let (t, e, m) = calculate_planet_points(p, db, config).await;
            total += t;
            economy += e;
            military += m;
        }

        // Score combat : victories × 100 − defeats × 25 (min 0)
        // Reflète le ratio V/D sur toute la durée de vie du compte
        let planet_ids: Vec<uuid::Uuid> = user_planets.iter().map(|p| p.id).collect();
        if !planet_ids.is_empty() {
            if let Ok(logs) = CombatLog::find()
                .filter(combat_log::Column::PlanetId.is_in(planet_ids))
                .all(db).await
            {
                let victories = logs.iter()
                    .filter(|l| l.result == "victory" || l.result == "player")
                    .count() as i32;
                let defeats = logs.iter()
                    .filter(|l| l.result == "defeat" || l.result == "defender")
                    .count() as i32;
                let combat_score = (victories * 100 - defeats * 25).max(0);
                military += combat_score;
                total += combat_score;
            }
        }

        let _ = db.execute(Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            r#"UPDATE "user" SET total_score = $1, economy_score = $2, military_score = $3 WHERE id = $4"#,
            [total.into(), economy.into(), military.into(), user_id.into()],
        )).await;
    }
}
