// frontend/src/lib/gameRules.ts

// Calcul de la capacité des transporteurs (évolutive selon niveau hangar + tech informatique)
// Base: 10000, +5% par niveau de hangar, +10% par niveau tech informatique
export const getTransporterCapacity = (hangarLevel: number, computerTechLevel: number = 0, config?: any): number => {
    const baseCapacity = config?.cargo_transporter_base ?? 10000;
    const bonusPerHangar = config?.cargo_transporter_bonus_per_hangar ?? 0.05;
    const bonusPerComputerTech = config?.cargo_transporter_bonus_per_computer_tech ?? 0.1;
    return baseCapacity * (1 + hangarLevel * bonusPerHangar) * (1 + computerTechLevel * bonusPerComputerTech);
};