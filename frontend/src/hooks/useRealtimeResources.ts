import { useState, useEffect, useRef } from 'react';
import { getTechLevel, getShipCount, getBuildingLevel } from '@/utils/techTreeCompat';

interface PlanetData {
  id: string;
  name: string;
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
  [key: string]: any;
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
  mining_speed_multiplier?: number;
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
  const prevServerRef = useRef<RealtimeResources | null>(null);
  const prevPlanetIdRef = useRef<string | undefined>(undefined);

  // Valeurs par défaut si config n'est pas fournie
  const safeConfig = config || {
    production_metal_base: 30,
    production_crystal_base: 20,
    production_deuterium_base: 15,
    production_metal_growth: 1.1,
    production_crystal_growth: 1.1,
    production_deuterium_growth: 1.05,
    energy_tech_bonus: 0.10,
    mining_speed_multiplier: 1.0
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

    // Speed factor ET mining speed multiplier
    prod *= speedFactor * (safeConfig.mining_speed_multiplier || 1.0);

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

    // Reset anti-oscillation state when switching to a different planet
    const isNewPlanet = planet.id !== prevPlanetIdRef.current;
    if (isNewPlanet) {
      prevServerRef.current = null;
      prevPlanetIdRef.current = planet.id;
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
      getBuildingLevel(planet, 'metal_mine'),
      safeConfig.production_metal_base,
      safeConfig.production_metal_growth,
      energyRatio,
      techBonus,
      metalSlotBonus
    );

    const crystalProdPerSec = calculateProductionPerSecond(
      getBuildingLevel(planet, 'crystal_mine'),
      safeConfig.production_crystal_base,
      safeConfig.production_crystal_growth,
      energyRatio,
      techBonus,
      crystalSlotBonus
    );

    const deutProdPerSec = calculateProductionPerSecond(
      getBuildingLevel(planet, 'deuterium_mine'),
      safeConfig.production_deuterium_base,
      safeConfig.production_deuterium_growth,
      energyRatio,
      techBonus,
      deutSlotBonus
    );

    // Sauvegarder les ressources de base.
    // - Si le serveur rapporte une valeur INFÉRIEURE à la dernière valeur serveur connue
    //   (ex: déduction suite à une construction), on utilise directement la valeur serveur.
    // - Sinon (lag de polling normal), on garde la valeur affichée pour éviter les oscillations.
    const prevServer = prevServerRef.current;
    // Don't use stale resources from a different planet as the anti-oscillation baseline
    const prevDisplayed = isNewPlanet ? null : resources;
    const serverNow = { metal: planet.metal_amount, crystal: planet.crystal_amount, deuterium: planet.deuterium_amount };

    const resolveBase = (serverVal: number, prevServerVal: number | undefined, displayedVal: number | undefined): number => {
      // Si la valeur serveur a diminué → déduction → utiliser la valeur serveur
      if (prevServerVal !== undefined && serverVal < prevServerVal - 1) return serverVal;
      // Sinon, ne pas reculer en dessous de ce qui est affiché (lag de polling)
      return displayedVal ? Math.max(serverVal, displayedVal) : serverVal;
    };

    prevServerRef.current = serverNow;
    baseResourcesRef.current = {
      metal: resolveBase(serverNow.metal, prevServer?.metal, prevDisplayed?.metal),
      crystal: resolveBase(serverNow.crystal, prevServer?.crystal, prevDisplayed?.crystal),
      deuterium: resolveBase(serverNow.deuterium, prevServer?.deuterium, prevDisplayed?.deuterium),
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
