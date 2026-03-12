/**
 * Tech Tree System - Compatibility Helper Functions
 *
 * Provides backward compatibility for the migration from column-based
 * tech levels to the relational tech tree system.
 */

export interface Planet {
  id: string;
  name: string;

  // Old system columns (may be undefined after migration)
  energy_tech_level?: number;
  laser_battery_level?: number;
  espionage_tech_level?: number;
  armour_tech_level?: number;
  light_hunter_count?: number;
  cruiser_count?: number;
  spy_probe_count?: number;
  transporter_count?: number;
  colony_ship_count?: number;
  recycler_count?: number;
  missile_launcher_count?: number;
  plasma_turret_count?: number;

  // New system objects
  technologies?: { [techKey: string]: number };
  buildings?: { [buildingKey: string]: number };
  ships?: {
    [shipKey: string]: {
      count: number;
      display_name: string;
      attack?: number;
      shield?: number;
      hull?: number;
      cargo_capacity?: number;
      speed?: number;
    };
  };
  defenses?: {
    [defenseKey: string]: {
      count: number;
      name: string;
      attack?: number;
      shield?: number;
    };
  };

  [key: string]: any;
}

/**
 * Get technology level with fallback to old system
 */
export function getTechLevel(planet: Planet | null | undefined, techKey: string): number {
  if (!planet) return 0;

  // NEW SYSTEM: Check technologies object first (priority)
  if (planet.technologies && planet.technologies[techKey] !== undefined) {
    return planet.technologies[techKey];
  }

  // OLD SYSTEM: Fallback to old column names
  const oldColumnMap: { [key: string]: string } = {
    'energy_tech': 'energy_tech_level',
    'laser_tech': 'laser_battery_level',
    'espionage': 'espionage_tech_level',
    'armour_tech': 'armour_tech_level',
    'plasma_tech': 'plasma_tech_level',
    // Add more mappings as needed
  };

  const oldColumn = oldColumnMap[techKey];
  if (oldColumn && planet[oldColumn] !== undefined) {
    return planet[oldColumn] as number;
  }

  return 0;
}

/**
 * Get building level with fallback to old system
 */
export function getBuildingLevel(planet: Planet | null | undefined, buildingKey: string): number {
  if (!planet) return 0;

  // NEW SYSTEM: Check buildings object first (priority)
  if (planet.buildings && planet.buildings[buildingKey] !== undefined) {
    return planet.buildings[buildingKey];
  }

  // OLD SYSTEM: Fallback to old column names
  const oldColumnMap: { [key: string]: string } = {
    'metal_mine': 'metal_mine_level',
    'crystal_mine': 'crystal_mine_level',
    'deuterium_mine': 'deuterium_mine_level',
    'solar_plant': 'solar_plant_level',
    'fusion_plant': 'fusion_plant_level',
    'shipyard': 'shipyard_level',
    'research_lab': 'research_lab_level',
    'hangar': 'hangar_level',
    'resource_storage': 'resource_storage_level',
    // Add more mappings as needed
  };

  const oldColumn = oldColumnMap[buildingKey];
  if (oldColumn && planet[oldColumn] !== undefined) {
    return planet[oldColumn] as number;
  }

  return 0;
}

/**
 * Get ship or defense count with fallback to old system
 * This function handles both ships and defenses for backwards compatibility
 */
export function getShipCount(planet: Planet | null | undefined, shipKey: string): number {
  if (!planet) return 0;

  // NEW SYSTEM: Check ships object first (priority)
  if (planet.ships && planet.ships[shipKey]) {
    return planet.ships[shipKey].count;
  }

  // NEW SYSTEM: Check defenses object for defense items
  if (planet.defenses && (planet.defenses as any)[shipKey]) {
    return (planet.defenses as any)[shipKey].count;
  }

  // OLD SYSTEM: Fallback to old column names
  const oldColumnMap: { [key: string]: string } = {
    'light_hunter': 'light_hunter_count',
    'heavy_hunter': 'heavy_hunter_count',
    'cruiser': 'cruiser_count',
    'battleship': 'battleship_count',
    'destroyer': 'destroyer_count',
    'bomber': 'bomber_count',
    'deathstar': 'deathstar_count',
    'spy_probe': 'spy_probe_count',
    'transporter': 'transporter_count',
    'colony_ship': 'colony_ship_count',
    'recycler': 'recycler_count',
    // Defenses (note: rocket_launcher is the defense_key, missile_launcher_count is the legacy column)
    'rocket_launcher': 'missile_launcher_count',
    'missile_launcher': 'missile_launcher_count', // Deprecated, use rocket_launcher
    'light_laser': 'light_laser_count',
    'heavy_laser': 'heavy_laser_count',
    'gauss_cannon': 'gauss_cannon_count',
    'ion_cannon': 'ion_cannon_count',
    'plasma_turret': 'plasma_turret_count',
    'small_shield': 'small_shield_count',
    'large_shield': 'large_shield_count',
    'antiballistic_missile': 'antiballistic_missile_count',
    'interplanetary_missile': 'interplanetary_missile_count',
  };

  const oldColumn = oldColumnMap[shipKey];
  if (oldColumn && planet[oldColumn] !== undefined) {
    return planet[oldColumn] as number;
  }

  return 0;
}

/**
 * Get ship stats with fallback to hardcoded values
 */
export function getShipStats(
  planet: Planet | null | undefined,
  shipKey: string
): { attack: number; shield: number; hull: number } {
  if (!planet) return { attack: 0, shield: 0, hull: 0 };

  // NEW SYSTEM: Get from ships object
  if (planet.ships && planet.ships[shipKey]) {
    const ship = planet.ships[shipKey];
    return {
      attack: ship.attack || 0,
      shield: ship.shield || 0,
      hull: ship.hull || 0,
    };
  }

  // OLD SYSTEM: Hardcoded fallback values (complete ship roster)
  const shipStats: {
    [key: string]: { attack: number; shield: number; hull: number };
  } = {
    light_hunter:    { attack: 50,   shield: 10,  hull: 400 },
    heavy_hunter:    { attack: 150,  shield: 25,  hull: 1000 },
    cruiser:         { attack: 400,  shield: 50,  hull: 2700 },
    battleship:      { attack: 1000, shield: 200, hull: 6000 },
    bomber:          { attack: 1000, shield: 500, hull: 7500 },
    destroyer:       { attack: 2000, shield: 500, hull: 11000 },
    recycler:        { attack: 1,    shield: 10,  hull: 160 },
    transporter:     { attack: 5,    shield: 25,  hull: 500 },
    colony_ship:     { attack: 50,   shield: 100, hull: 3000 },
    espionage_probe: { attack: 0,    shield: 0,   hull: 1 },
    spy_probe:       { attack: 0,    shield: 0,   hull: 1 },
  };

  return shipStats[shipKey] || { attack: 0, shield: 0, hull: 0 };
}

/**
 * Get defense count (dedicated wrapper, mirrors getShipCount for defense slots)
 */
export function getDefenseCount(planet: Planet | null | undefined, defenseKey: string): number {
  if (!planet) return 0;

  // NEW SYSTEM: Check defenses object first (priority)
  if (planet.defenses && planet.defenses[defenseKey] !== undefined) {
    const v = planet.defenses[defenseKey];
    return typeof v === 'object' ? (v.count ?? 0) : (v as unknown as number);
  }

  // Delegate to getShipCount which also handles the defenses object and legacy columns
  return getShipCount(planet, defenseKey);
}

/**
 * Get defense stats with fallback to hardcoded values
 */
export function getDefenseStats(
  planet: Planet | null | undefined,
  defenseKey: string
): { attack: number; shield: number; hull: number } {
  if (!planet) return { attack: 0, shield: 0, hull: 0 };

  // NEW SYSTEM: Get from defenses object if stats are embedded
  if (planet.defenses && planet.defenses[defenseKey]) {
    const def = planet.defenses[defenseKey];
    if (def.attack !== undefined) {
      return {
        attack: def.attack || 0,
        shield: def.shield || 0,
        hull: 0, // defenses rarely embed hull in the response
      };
    }
  }

  // Hardcoded fallback values (complete defense roster)
  const defenseStats: {
    [key: string]: { attack: number; shield: number; hull: number };
  } = {
    rocket_launcher: { attack: 80,   shield: 20,    hull: 200 },
    light_laser:     { attack: 100,  shield: 25,    hull: 100 },
    heavy_laser:     { attack: 250,  shield: 100,   hull: 800 },
    gauss_cannon:    { attack: 1100, shield: 200,   hull: 3500 },
    ion_cannon:      { attack: 150,  shield: 500,   hull: 800 },
    plasma_turret:   { attack: 3000, shield: 300,   hull: 10000 },
    small_shield:    { attack: 1,    shield: 2000,  hull: 20000 },
    large_shield:    { attack: 1,    shield: 10000, hull: 100000 },
  };

  return defenseStats[defenseKey] || { attack: 0, shield: 0, hull: 0 };
}

/**
 * Calculate total fleet attack power (ships only, no defenses)
 * Used by external components that want ship-only attack figures.
 */
export function calculateFleetAttack(planet: Planet | null | undefined): number {
  if (!planet) return 0;

  const ships = [
    'light_hunter', 'heavy_hunter', 'cruiser', 'battleship', 'bomber', 'destroyer',
    'recycler', 'transporter', 'colony_ship', 'espionage_probe', 'spy_probe',
  ];
  let totalAttack = 0;

  for (const shipKey of ships) {
    const count = getShipCount(planet, shipKey);
    const stats = getShipStats(planet, shipKey);
    totalAttack += count * stats.attack;
  }

  // weapons_tech is the primary attack bonus (+10% / level)
  // laser_tech provides a secondary bonus (+5% / level)
  const weaponsMult = 1
    + getTechLevel(planet, 'weapons_tech') * 0.1
    + getTechLevel(planet, 'laser_tech') * 0.05;
  return totalAttack * weaponsMult;
}

/**
 * Calculate total fleet hull points (ships only, no defenses)
 * Used by external components that want ship-only hull figures.
 */
export function calculateFleetHull(planet: Planet | null | undefined): number {
  if (!planet) return 0;

  const ships = [
    'light_hunter', 'heavy_hunter', 'cruiser', 'battleship', 'bomber', 'destroyer',
    'recycler', 'transporter', 'colony_ship', 'espionage_probe', 'spy_probe',
  ];
  let totalHull = 0;

  for (const shipKey of ships) {
    const count = getShipCount(planet, shipKey);
    const stats = getShipStats(planet, shipKey);
    totalHull += count * stats.hull;
  }

  // Apply armour tech bonus
  const armourBonus = getTechLevel(planet, 'armour_tech') * 0.1;
  return totalHull * (1 + armourBonus);
}

// ─────────────────────────────────────────────────────────────────────────────
// Military Score & CTR (Combat Tier Rating)
// ─────────────────────────────────────────────────────────────────────────────

export interface MilitaryScoreResult {
  fleetScore: number;
  defenseScore: number;
  totalScore: number;
}

export interface CTRResult {
  ctr: number;
  grade: string;
  /** Tailwind color classes for the grade badge */
  color: string;
}

const ALL_SHIP_KEYS = [
  'light_hunter', 'heavy_hunter', 'cruiser', 'battleship', 'bomber',
  'destroyer', 'recycler', 'transporter', 'colony_ship', 'spy_probe', 'deathstar',
];
const ALL_DEFENSE_KEYS = [
  'rocket_launcher', 'light_laser', 'heavy_laser', 'gauss_cannon',
  'ion_cannon', 'plasma_turret', 'small_shield', 'large_shield',
];

/**
 * Normalized Military Score.
 * Unit score = attack/50 + shield/10 + hull/400 — Light Hunter baseline = 3 pts.
 * Comparable between players, infinite scale, no tech multipliers (raw unit quality).
 */
export function computeMilitaryScore(planet: Planet | null | undefined): MilitaryScoreResult {
  if (!planet) return { fleetScore: 0, defenseScore: 0, totalScore: 0 };

  const unitScore = (atk: number, shd: number, hul: number) =>
    atk / 50 + shd / 10 + hul / 400;

  const fleetScore = ALL_SHIP_KEYS.reduce((sum, key) => {
    const stats = getShipStats(planet, key);
    return sum + getShipCount(planet, key) * unitScore(stats.attack, stats.shield, stats.hull);
  }, 0);

  const defenseScore = ALL_DEFENSE_KEYS.reduce((sum, key) => {
    const stats = getDefenseStats(planet, key);
    return sum + getDefenseCount(planet, key) * unitScore(stats.attack, stats.shield, stats.hull);
  }, 0);

  return {
    fleetScore:   Math.round(fleetScore),
    defenseScore: Math.round(defenseScore),
    totalScore:   Math.round(fleetScore + defenseScore),
  };
}

/**
 * Combat Tier Rating — logarithmic 0-999 + letter grade.
 * Scale: 100 × log10(score+1)
 *   score=0 → CTR 0 / "-"
 *   score=150 (50 LH) → CTR ~221 / "D"
 *   score=3000 (1 000 LH) → CTR ~347 / "C"
 *   score=100 000 → CTR ~500 / "A"
 *   score=3 000 000 → CTR ~647 / "S"
 *   score=10 000 000 → CTR ~700 / "S+"
 */
export function computeCTR(totalScore: number): CTRResult {
  if (totalScore <= 0) return { ctr: 0, grade: '-', color: 'text-slate-500' };
  const ctr = Math.min(999, Math.max(1, Math.floor(Math.log10(totalScore + 1) * 100)));

  if (ctr >= 900) return { ctr, grade: 'S∞', color: 'text-white' };
  if (ctr >= 800) return { ctr, grade: 'S++', color: 'text-yellow-300' };
  if (ctr >= 700) return { ctr, grade: 'S+',  color: 'text-amber-400' };
  if (ctr >= 600) return { ctr, grade: 'S',   color: 'text-violet-400' };
  if (ctr >= 500) return { ctr, grade: 'A',   color: 'text-blue-400' };
  if (ctr >= 400) return { ctr, grade: 'B',   color: 'text-emerald-400' };
  if (ctr >= 300) return { ctr, grade: 'C',   color: 'text-yellow-400' };
  if (ctr >= 200) return { ctr, grade: 'D',   color: 'text-orange-400' };
  if (ctr >= 100) return { ctr, grade: 'E',   color: 'text-red-400' };
  return              { ctr, grade: 'F',   color: 'text-slate-400' };
}

/**
 * Get total fleet count
 */
export function getTotalFleetCount(planet: Planet | null | undefined): number {
  if (!planet) return 0;

  const ships = [
    'light_hunter', 'heavy_hunter', 'cruiser', 'battleship', 'bomber', 'destroyer',
    'spy_probe', 'transporter', 'colony_ship', 'recycler', 'deathstar',
  ];
  return ships.reduce((total, shipKey) => total + getShipCount(planet, shipKey), 0);
}
