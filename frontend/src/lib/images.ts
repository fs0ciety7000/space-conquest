// frontend/src/lib/images.ts
// Helper pour gérer les chemins d'images avec fallback

/**
 * Récupère le chemin de l'image pour un vaisseau
 */
export const getShipImage = (shipType: string): string => {
  const images: Record<string, string> = {
    light_hunter: '/images/ships/ship-light-hunter.webp',
    cruiser: '/images/ships/ship-cruiser.webp',
    recycler: '/images/ships/ship-recycler.webp',
    spy_probe: '/images/ships/ship-spy-probe.webp',
    colony_ship: '/images/ships/ship-colony-ship.webp',
    transporter: '/images/ships/ship-transporter.webp',
  };

  return images[shipType] || '/images/misc/placeholder.svg';
};

/**
 * Récupère le chemin de l'image pour un bâtiment
 */
export const getBuildingImage = (buildingType: string): string => {
  const images: Record<string, string> = {
    shipyard: '/images/buildings/building-shipyard.webp',
    research: '/images/buildings/building-research-lab.webp',
    research_lab: '/images/buildings/building-research-lab.webp',
    hangar: '/images/buildings/building-hangar.webp',
    resource_storage: '/images/buildings/building-resource-storage.webp',
    solar_plant: '/images/buildings/building-solar-plant.webp',
    armour: '/images/buildings/building-armour.webp',
  };

  return images[buildingType] || '/images/misc/placeholder.svg';
};

/**
 * Récupère le chemin de l'image pour une mine/ressource
 */
export const getResourceImage = (resourceType: string): string => {
  const images: Record<string, string> = {
    // Old system keys (backward compatibility)
    metal: '/images/resources/resource-metal-mine.webp',
    crystal: '/images/resources/resource-crystal-mine.webp',
    deuterium: '/images/resources/resource-deuterium-synth.webp',
    // New system keys
    metal_mine: '/images/resources/resource-metal-mine.webp',
    crystal_mine: '/images/resources/resource-crystal-mine.webp',
    deuterium_mine: '/images/resources/resource-deuterium-synth.webp',
    solar_plant: '/images/buildings/building-solar-plant.webp',
  };

  return images[resourceType] || '/images/misc/placeholder.svg';
};

/**
 * Récupère le chemin de l'image pour une défense
 */
export const getDefenseImage = (defenseType: string): string => {
  const images: Record<string, string> = {
    missile_launcher: '/images/defenses/defense-missile-launcher.webp',
    plasma_turret: '/images/defenses/defense-plasma-turret.webp',
  };

  return images[defenseType] || '/images/misc/placeholder.svg';
};

/**
 * Récupère le chemin de l'image pour une technologie
 */
export const getTechImage = (techType: string): string => {
  const images: Record<string, string> = {
    energy_tech: '/images/buildings/tech-energy.webp',
    laser: '/images/buildings/tech-laser.webp',
    laser_tech: '/images/buildings/tech-laser.webp',
    armour: '/images/buildings/tech-armour.webp',
    armour_tech: '/images/buildings/tech-armour.webp',
    espionage: '/images/buildings/tech-espionage.webp',
    espionage_tech: '/images/buildings/tech-espionage.webp',
  };

  return images[techType] || '/images/misc/placeholder.svg';
};

/**
 * Vérifie si une image existe (avec fallback)
 */
export const imageExists = async (imagePath: string): Promise<boolean> => {
  try {
    const response = await fetch(imagePath, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};
