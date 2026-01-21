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
 * Get ship count with fallback to old system
 */
export function getShipCount(planet: Planet | null | undefined, shipKey: string): number {
  if (!planet) return 0;

  // NEW SYSTEM: Check ships object first (priority)
  if (planet.ships && planet.ships[shipKey]) {
    return planet.ships[shipKey].count;
  }

  // OLD SYSTEM: Fallback to old column names
  const oldColumnMap: { [key: string]: string } = {
    'light_hunter': 'light_hunter_count',
    'cruiser': 'cruiser_count',
    'spy_probe': 'spy_probe_count',
    'transporter': 'transporter_count',
    'colony_ship': 'colony_ship_count',
    'recycler': 'recycler_count',
    'missile_launcher': 'missile_launcher_count',
    'plasma_turret': 'plasma_turret_count',
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

  // OLD SYSTEM: Hardcoded fallback values
  const shipStats: {
    [key: string]: { attack: number; shield: number; hull: number };
  } = {
    light_hunter: { attack: 50, shield: 10, hull: 400 },
    cruiser: { attack: 400, shield: 50, hull: 2700 },
    spy_probe: { attack: 0, shield: 0, hull: 100 },
    transporter: { attack: 5, shield: 10, hull: 400 },
    colony_ship: { attack: 50, shield: 100, hull: 3000 },
    recycler: { attack: 10, shield: 10, hull: 1600 },
  };

  return shipStats[shipKey] || { attack: 0, shield: 0, hull: 0 };
}

/**
 * Calculate total fleet attack power
 */
export function calculateFleetAttack(planet: Planet | null | undefined): number {
  if (!planet) return 0;

  const ships = ['light_hunter', 'cruiser', 'spy_probe', 'transporter', 'colony_ship', 'recycler'];
  let totalAttack = 0;

  for (const shipKey of ships) {
    const count = getShipCount(planet, shipKey);
    const stats = getShipStats(planet, shipKey);
    totalAttack += count * stats.attack;
  }

  // Apply weapon tech bonus
  const weaponBonus = getTechLevel(planet, 'laser_tech') * 0.1;
  return totalAttack * (1 + weaponBonus);
}

/**
 * Calculate total fleet hull points
 */
export function calculateFleetHull(planet: Planet | null | undefined): number {
  if (!planet) return 0;

  const ships = ['light_hunter', 'cruiser', 'spy_probe', 'transporter', 'colony_ship', 'recycler'];
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

/**
 * Get total fleet count
 */
export function getTotalFleetCount(planet: Planet | null | undefined): number {
  if (!planet) return 0;

  const ships = ['light_hunter', 'cruiser', 'spy_probe', 'transporter', 'colony_ship', 'recycler'];
  return ships.reduce((total, shipKey) => total + getShipCount(planet, shipKey), 0);
}
