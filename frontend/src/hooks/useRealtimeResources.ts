import { useState, useEffect, useRef } from 'react';
import { getTechLevel, getShipCount } from '@/utils/techTreeCompat';

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

interface ServerConfig {
  production_metal_base: number;
  production_crystal_base: number;
  production_deuterium_base: number;
  production_metal_growth: number;
  production_crystal_growth: number;
  production_deuterium_growth: number;
  energy_tech_bonus: number;
}

/**
 * Hook pour calculer les ressources en temps réel entre les polls du backend
 * @param planet - Données de la planète depuis le backend
 * @param speedFactor - Facteur de vitesse normalisé (5 pour x5, 10 pour x10, etc.)
 * @param config - Configuration serveur pour les paramètres de production
 * @returns Ressources calculées en temps réel
 */
export function useRealtimeResources(
  planet: PlanetData | null,
  speedFactor: number,
  config?: ServerConfig
): RealtimeResources | null {
  const [resources, setResources] = useState<RealtimeResources | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const baseResourcesRef = useRef<RealtimeResources | null>(null);

  // Valeurs par défaut si config n'est pas fournie
  const safeConfig = config || {
    production_metal_base: 30,
    production_crystal_base: 20,
    production_deuterium_base: 10,
    production_metal_growth: 1.1,
    production_crystal_growth: 1.1,
    production_deuterium_growth: 1.05,
    energy_tech_bonus: 0.01
  };

  // Calculer la production par seconde
  const calculateProductionPerSecond = (
    level: number,
    baseFactor: number,
    growthFactor: number,
    energyRatio: number,
    techBonus: number,
    slotBonus: number
  ): number => {
    if (level === 0) return 0;

    // Protection contre NaN
    const safeBaseFactor = Number(baseFactor) || 0;
    const safeGrowthFactor = Number(growthFactor) || 1;
    const safeTechBonus = Number(techBonus) || 1;
    const safeSlotBonus = Number(slotBonus) || 1;
    if (safeBaseFactor === 0) return 0;

    // Production de base
    let prod = safeBaseFactor * level * Math.pow(safeGrowthFactor, level);

    // Bonus tech énergie
    prod *= safeTechBonus;

    // Ratio énergétique
    prod *= (energyRatio / 100);

    // Bonus slots
    prod *= safeSlotBonus;

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
    const techLevel = getTechLevel(planet, 'energy_tech');
    const techBonus = 1.0 + (techLevel * safeConfig.energy_tech_bonus);
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
      safeConfig.production_metal_base,
      safeConfig.production_metal_growth,
      energyRatio,
      techBonus,
      metalSlotBonus
    );

    const crystalProdPerSec = calculateProductionPerSecond(
      planet.crystal_mine_level || 0,
      safeConfig.production_crystal_base,
      safeConfig.production_crystal_growth,
      energyRatio,
      techBonus,
      crystalSlotBonus
    );

    const deutProdPerSec = calculateProductionPerSecond(
      planet.deuterium_mine_level || 0,
      safeConfig.production_deuterium_base,
      safeConfig.production_deuterium_growth,
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
  }, [planet, speedFactor, safeConfig]);

  return resources;
}
