// frontend/src/utils/galaxyCalculations.ts
// Utilities for 3D galaxy positioning and distance calculations

export interface Coordinates3D {
  x: number;
  y: number;
  z: number;
}

export interface GalaxyPosition {
  galaxy: number;
  system: number;
  position: number;
}

/**
 * Seeded random number generator (LCG algorithm)
 * Returns a deterministic random function based on seed
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return function() {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Get 3D coordinates for a system in a spiral galaxy pattern
 * @param galaxy Galaxy number (1-5)
 * @param system System number (1-499)
 * @returns 3D coordinates
 */
export function getSystemCoordinates(galaxy: number, system: number): Coordinates3D {
  const seed = system * 1337 + galaxy * 9999;
  const rng = seededRandom(seed);

  // Spiral galaxy parameters
  const armCount = 3; // Three spiral arms
  const armIndex = system % armCount;
  const armAngle = (armIndex / armCount) * Math.PI * 2;

  // Distance from center (increases with system number)
  const radius = (system / 499) * 50 + 10; // 10-60 units from center

  // Angle along the spiral arm
  const spiralTurns = 2;
  const theta = armAngle + (system / 499) * spiralTurns * Math.PI * 2;

  // Add randomness but keep deterministic
  const randomOffset = {
    x: (rng() - 0.5) * 5,
    y: (rng() - 0.5) * 2, // Flatter galaxy
    z: (rng() - 0.5) * 5
  };

  return {
    x: Math.cos(theta) * radius + randomOffset.x,
    y: randomOffset.y,
    z: Math.sin(theta) * radius + randomOffset.z
  };
}

/**
 * Calculate distance between two galaxy positions (from TransportModal.tsx)
 * @param from Source position
 * @param to Target position
 * @returns Distance value
 */
export function calculateDistance(from: GalaxyPosition, to: GalaxyPosition): number {
  let dist = 5.0;

  if (from.galaxy !== to.galaxy) {
    dist = Math.abs(from.galaxy - to.galaxy) * 20000;
  } else if (from.system !== to.system) {
    dist = Math.abs(from.system - to.system) * 2000 + 2700;
  } else if (from.position !== to.position) {
    dist = Math.abs(from.position - to.position) * 5 + 1000;
  }

  return dist;
}

/**
 * Calculate flight time based on distance
 * @param distance Distance value from calculateDistance
 * @param speedFactor Server speed factor (default 500)
 * @returns Flight time in seconds
 */
export function calculateFlightTime(distance: number, speedFactor: number = 500): number {
  const baseTime = 10 + Math.sqrt(distance) / 2;
  return Math.max(5, Math.floor((baseTime * 100) / speedFactor));
}

/**
 * Generate a curved Bezier path between two 3D points
 * @param from Start coordinates
 * @param to End coordinates
 * @param segments Number of segments in the curve
 * @returns Array of 3D coordinates forming the path
 */
export function generateFlightPath(
  from: Coordinates3D,
  to: Coordinates3D,
  segments: number = 50
): Coordinates3D[] {
  const points: Coordinates3D[] = [];

  // Calculate midpoint with upward arc
  const mid: Coordinates3D = {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2 + 10, // Arc upward
    z: (from.z + to.z) / 2
  };

  // Generate quadratic Bezier curve
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const t2 = t * t;
    const mt = 1 - t;
    const mt2 = mt * mt;

    points.push({
      x: mt2 * from.x + 2 * mt * t * mid.x + t2 * to.x,
      y: mt2 * from.y + 2 * mt * t * mid.y + t2 * to.y,
      z: mt2 * from.z + 2 * mt * t * mid.z + t2 * to.z
    });
  }

  return points;
}

/**
 * Get planet position in orbital ring within a system
 * @param position Planet position (1-15)
 * @param radius Orbital radius (default 15)
 * @returns 3D coordinates
 */
export function getPlanetOrbitalPosition(position: number, radius: number = 15): Coordinates3D {
  const angle = ((position - 1) / 15) * Math.PI * 2 - Math.PI / 2;
  return {
    x: Math.cos(angle) * radius,
    y: 0,
    z: Math.sin(angle) * radius
  };
}
