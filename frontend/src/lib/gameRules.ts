// frontend/src/lib/gameRules.ts

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

        // --- RECHERCHES ---
        case 'energy_tech':
            check("Laboratoire de Recherche (1)", (planet.research_lab_level || 0) >= 1);
            break;
        case 'laser_tech': // Tech Laser (pour l'exemple)
            check("Laboratoire de Recherche (1)", (planet.research_lab_level || 0) >= 1);
            check("Tech. Énergie (2)", (planet.energy_tech_level || 0) >= 2);
            break;

        // --- FLOTTE ---
        case 'light_hunter':
            check("Chantier Spatial (1)", (planet.shipyard_level || 0) >= 1);
            break;
        case 'cruiser':
            check("Chantier Spatial (5)", (planet.shipyard_level || 0) >= 5);
            check("Tech. Énergie (4)", (planet.energy_tech_level || 0) >= 4); // "Impulsion" simulée par Énergie
            break;
        case 'recycler':
            check("Chantier Spatial (4)", (planet.shipyard_level || 0) >= 4);
            check("Tech. Énergie (3)", (planet.energy_tech_level || 0) >= 3); // "Combustion" simulée
            break;
        case 'spy_probe':
            check("Chantier Spatial (1)", (planet.shipyard_level || 0) >= 1);
            check("Tech. Espionnage (1)", (planet.espionage_tech_level || 0) >= 1);
            break;
        case 'colony_ship':
            check("Chantier Spatial (4)", (planet.shipyard_level || 0) >= 4);
            break;
        case 'transporter':
            check("Chantier Spatial (2)", (planet.shipyard_level || 0) >= 2);
            break;

        // --- DÉFENSES ---
        case 'missile_launcher':
            check("Chantier Spatial (1)", (planet.shipyard_level || 0) >= 1);
            break;
        case 'armour':
    check("Laboratoire de Recherche (2)", (planet.research_lab_level || 0) >= 2);
    break;    
        case 'plasma_turret':
            check("Chantier Spatial (6)", (planet.shipyard_level || 0) >= 6);
            check("Tech. Énergie (6)", (planet.energy_tech_level || 0) >= 6);
            check("Tech. Laser (3)", (planet.laser_battery_level || 0) >= 3);
            break;
    }

    const locked = reqs.some(r => !r.met);
    return { locked, requirements: reqs };
};

// Calcul de la capacité des transporteurs (évolutive selon niveau hangar)
// Base: 10000, +5% par niveau de hangar
export const getTransporterCapacity = (hangarLevel: number): number => {
    const baseCapacity = 10000;
    const bonusPerLevel = 0.05; // +5% par niveau
    return baseCapacity * (1 + hangarLevel * bonusPerLevel);
};