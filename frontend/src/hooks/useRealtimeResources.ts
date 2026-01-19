import { useState, useEffect, useRef } from 'react';

interface PlanetData {
  metal_amount: number;
  crystal_amount: number;
  deuterium_amount: number;
  metal_mine_level: number;
  crystal_mine_level: number;
  deuterium_mine_level: number;
  energy_tech_level: number;
  energy_ratio: number;
  slot_bonuses?: {
    metal?: string;
    crystal?: string;
    deuterium?: string;
  };
}

interface RealtimeResources {
  metal: number;
  crystal: number;
  deuterium: number;
}

/**
 * Hook pour calculer les ressources en temps réel entre les polls du backend
 * @param planet - Données de la planète depuis le backend
 * @param speedFactor - Facteur de vitesse normalisé (5 pour x5, 10 pour x10, etc.)
 * @returns Ressources calculées en temps réel
 */
export function useRealtimeResources(
  planet: PlanetData | null,
  speedFactor: number
): RealtimeResources | null {
  const [resources, setResources] = useState<RealtimeResources | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const baseResourcesRef = useRef<RealtimeResources | null>(null);

  // Calculer la production par seconde
  const calculateProductionPerSecond = (
    level: number,
    baseFactor: number,
    energyRatio: number,
    techBonus: number,
    slotBonus: number
  ): number => {
    if (level === 0) return 0;

    // Production de base
    let prod = baseFactor * level * Math.pow(1.1, level);

    // Bonus tech énergie
    prod *= techBonus;

    // Ratio énergétique
    prod *= (energyRatio / 100);

    // Bonus slots
    prod *= slotBonus;

    // Speed factor
    prod *= speedFactor;

    // Convertir en par seconde (base est par heure)
    return prod / 3600;
  };

  // Quand les données de planète changent, réinitialiser
  useEffect(() => {
    if (!planet) {
      setResources(null);
      baseResourcesRef.current = null;
      return;
    }

    // Calculer les bonus
    const techLevel = planet.energy_tech_level || 0;
    const techBonus = 1.0 + (techLevel * 0.01);
    const energyRatio = planet.energy_ratio || 100;

    // Calculer bonus slots
    const getSlotBonus = (type: 'metal' | 'crystal' | 'deuterium'): number => {
      const slotValue = planet.slot_bonuses?.[type];
      if (!slotValue) return 1.0;

      // Format: "+50%" ou "+100%", etc.
      const match = slotValue.match(/\+(\d+)%/);
      if (match) {
        const percent = parseInt(match[1]);
        return 1.0 + (percent / 100);
      }
      return 1.0;
    };

    const metalSlotBonus = getSlotBonus('metal');
    const crystalSlotBonus = getSlotBonus('crystal');
    const deutSlotBonus = getSlotBonus('deuterium');

    // Calculer les productions par seconde
    const metalProdPerSec = calculateProductionPerSecond(
      planet.metal_mine_level || 0,
      30,
      energyRatio,
      techBonus,
      metalSlotBonus
    );

    const crystalProdPerSec = calculateProductionPerSecond(
      planet.crystal_mine_level || 0,
      20,
      energyRatio,
      techBonus,
      crystalSlotBonus
    );

    const deutProdPerSec = calculateProductionPerSecond(
      planet.deuterium_mine_level || 0,
      10,
      energyRatio,
      techBonus,
      deutSlotBonus
    );

    // Sauvegarder les ressources de base
    baseResourcesRef.current = {
      metal: planet.metal_amount,
      crystal: planet.crystal_amount,
      deuterium: planet.deuterium_amount,
    };

    // Sauvegarder les productions pour le ticker
    const productionRef = { metalProdPerSec, crystalProdPerSec, deutProdPerSec };

    // Réinitialiser le timestamp
    lastUpdateRef.current = Date.now();

    // Démarrer le ticker temps réel
    const interval = setInterval(() => {
      if (!baseResourcesRef.current) return;

      const now = Date.now();
      const elapsedSeconds = (now - lastUpdateRef.current) / 1000;

      setResources({
        metal: Math.floor(baseResourcesRef.current.metal + (productionRef.metalProdPerSec * elapsedSeconds)),
        crystal: Math.floor(baseResourcesRef.current.crystal + (productionRef.crystalProdPerSec * elapsedSeconds)),
        deuterium: Math.floor(baseResourcesRef.current.deuterium + (productionRef.deutProdPerSec * elapsedSeconds)),
      });
    }, 100); // Mise à jour toutes les 100ms pour fluidité

    return () => clearInterval(interval);
  }, [planet, speedFactor]);

  return resources;
}
