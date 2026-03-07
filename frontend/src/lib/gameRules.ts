// frontend/src/lib/gameRules.ts
import { getTechLevel, getShipCount } from '@/utils/techTreeCompat';

export interface Requirement {
    label: string;
    met: boolean;
}

export const checkPrerequisites = (planet: any, type: string): { locked: boolean; requirements: Requirement[] } => {
    const reqs: Requirement[] = [];

    // Helper pour vérifier
    const check = (label: string, condition: boolean) => {
        reqs.push({ label, met: condition });
    };

    switch (type) {
        // --- BÂTIMENTS ---
        case 'shipyard':
            // Pas de prérequis pour l'instant (sauf si tu ajoutes usine de robots)
            break;
        case 'research_lab':
             // Pas de prérequis de base
            break;

        // --- RECHERCHES DE BASE ---
        case 'energy_tech':
            check("Laboratoire de Recherche (1)", (planet.research_lab_level || 0) >= 1);
            break;
        case 'laser_tech':
            check("Laboratoire de Recherche (1)", (planet.research_lab_level || 0) >= 1);
            check("Tech. Énergie (2)", (getTechLevel(planet, 'energy_tech')) >= 2);
            break;
        case 'espionage':
            check("Laboratoire de Recherche (3)", (planet.research_lab_level || 0) >= 3);
            break;
        case 'armour':
            check("Laboratoire de Recherche (2)", (planet.research_lab_level || 0) >= 2);
            break;

        // --- RECHERCHES AVANCÉES - EXPANSION 2.0 ---
        case 'ion_tech':
            check("Laboratoire de Recherche (4)", (planet.research_lab_level || 0) >= 4);
            check("Tech. Énergie (4)", (getTechLevel(planet, 'energy_tech')) >= 4);
            check("Tech. Laser (5)", (getTechLevel(planet, 'laser_tech')) >= 5);
            break;
        case 'plasma_tech':
            check("Laboratoire de Recherche (4)", (planet.research_lab_level || 0) >= 4);
            check("Tech. Énergie (8)", (getTechLevel(planet, 'energy_tech')) >= 8);
            check("Tech. Laser (10)", (getTechLevel(planet, 'laser_tech')) >= 10);
            check("Tech. Ion (5)", (planet.ion_tech_level || 0) >= 5);
            break;
        case 'shield_tech':
            check("Laboratoire de Recherche (6)", (planet.research_lab_level || 0) >= 6);
            check("Tech. Énergie (3)", (getTechLevel(planet, 'energy_tech')) >= 3);
            break;
        case 'weapons_tech':
            check("Laboratoire de Recherche (4)", (planet.research_lab_level || 0) >= 4);
            break;
        case 'computer_tech':
            check("Laboratoire de Recherche (1)", (planet.research_lab_level || 0) >= 1);
            break;

        // --- PROPULSION - EXPANSION 2.0 ---
        case 'combustion_drive':
            check("Laboratoire de Recherche (1)", (planet.research_lab_level || 0) >= 1);
            check("Tech. Énergie (1)", (getTechLevel(planet, 'energy_tech')) >= 1);
            break;
        case 'impulse_drive':
            check("Laboratoire de Recherche (2)", (planet.research_lab_level || 0) >= 2);
            check("Tech. Énergie (1)", (getTechLevel(planet, 'energy_tech')) >= 1);
            break;
        case 'hyperspace_drive':
            check("Laboratoire de Recherche (7)", (planet.research_lab_level || 0) >= 7);
            check("Tech. Énergie (5)", (getTechLevel(planet, 'energy_tech')) >= 5);
            check("Tech. Bouclier (5)", (planet.shield_tech_level || 0) >= 5);
            break;
        case 'astrophysics':
            check("Laboratoire de Recherche (3)", (planet.research_lab_level || 0) >= 3);
            check("Tech. Espionnage (4)", (getTechLevel(planet, 'espionage')) >= 4);
            check("Propulsion à Impulsion (3)", (planet.impulse_drive_level || 0) >= 3);
            break;

        // --- FLOTTE DE BASE ---
        case 'light_hunter':
            check("Chantier Spatial (1)", (planet.shipyard_level || 0) >= 1);
            break;
        case 'cruiser':
            check("Chantier Spatial (5)", (planet.shipyard_level || 0) >= 5);
            check("Tech. Énergie (3)", (getTechLevel(planet, 'energy_tech')) >= 3);
            break;
        case 'recycler':
            check("Chantier Spatial (4)", (planet.shipyard_level || 0) >= 4);
            break;
        case 'spy_probe':
            check("Chantier Spatial (1)", (planet.shipyard_level || 0) >= 1);
            check("Tech. Espionnage (1)", (getTechLevel(planet, 'espionage')) >= 1);
            break;
        case 'colony_ship':
            check("Chantier Spatial (4)", (planet.shipyard_level || 0) >= 4);
            break;
        case 'transporter':
            check("Chantier Spatial (2)", (planet.shipyard_level || 0) >= 2);
            break;

        // --- FLOTTE AVANCÉE - EXPANSION 2.0 ---
        case 'heavy_hunter':
            check("Chantier Spatial (3)", (planet.shipyard_level || 0) >= 3);
            check("Tech. Blindage (3)", (getTechLevel(planet, 'armour_tech')) >= 3);
            check("Propulsion à Impulsion (1)", (planet.impulse_drive_level || 0) >= 1);
            break;
        case 'battleship':
            check("Chantier Spatial (7)", (planet.shipyard_level || 0) >= 7);
            check("Propulsion Hyperespace (4)", (planet.hyperspace_drive_level || 0) >= 4);
            break;
        case 'bomber':
            check("Chantier Spatial (8)", (planet.shipyard_level || 0) >= 8);
            check("Tech. Plasma (5)", (planet.plasma_tech_level || 0) >= 5);
            check("Propulsion à Impulsion (6)", (planet.impulse_drive_level || 0) >= 6);
            break;
        case 'destroyer':
            check("Chantier Spatial (9)", (planet.shipyard_level || 0) >= 9);
            check("Propulsion Hyperespace (6)", (planet.hyperspace_drive_level || 0) >= 6);
            check("Tech. Hyperespace (5)", (planet.astrophysics_level || 0) >= 5);
            break;

        // --- DÉFENSES ---
        case 'missile_launcher':
            check("Chantier Spatial (1)", (planet.shipyard_level || 0) >= 1);
            break;
        case 'plasma_turret':
            check("Chantier Spatial (8)", (planet.shipyard_level || 0) >= 8);
            check("Tech. Énergie (6)", (getTechLevel(planet, 'energy_tech')) >= 6);
            check("Tech. Laser (5)", (getTechLevel(planet, 'laser_tech')) >= 5);
            break;
    }

    const locked = reqs.some(r => !r.met);
    return { locked, requirements: reqs };
};

// Calcul de la capacité des transporteurs (évolutive selon niveau hangar + tech informatique)
// Base: 10000, +5% par niveau de hangar, +10% par niveau tech informatique
export const getTransporterCapacity = (hangarLevel: number, computerTechLevel: number = 0, config?: any): number => {
    const baseCapacity = config?.cargo_transporter_base ?? 10000;
    const bonusPerHangar = config?.cargo_transporter_bonus_per_hangar ?? 0.05;
    const bonusPerComputerTech = config?.cargo_transporter_bonus_per_computer_tech ?? 0.1;
    return baseCapacity * (1 + hangarLevel * bonusPerHangar) * (1 + computerTechLevel * bonusPerComputerTech);
};