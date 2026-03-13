import { useState, useEffect, useRef, useMemo } from 'react';

interface PlanetData {
  id: string;
  name: string;
  metal_amount: number;
  crystal_amount: number;
  deuterium_amount: number;
  // Server-computed production rates (BAL-001: use these directly, no local formula)
  metal_per_second?: number;
  crystal_per_second?: number;
  deuterium_per_second?: number;
  // Legacy fields kept for fallback only — prefer the *_per_second fields above
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
  // BAL-003: correct coefficient is 0.01 (1% per level), NOT 0.10
  energy_tech_bonus: number;
  mining_speed_multiplier?: number;
}

const DEFAULT_CONFIG: ServerConfig = {
  production_metal_base: 30,
  production_crystal_base: 20,
  production_deuterium_base: 15,
  production_metal_growth: 1.1,
  production_crystal_growth: 1.1,
  production_deuterium_growth: 1.05,
  // BAL-003 fix: default to 0.01 (1% per level) — the backend uses this value
  energy_tech_bonus: 0.01,
  mining_speed_multiplier: 1.0
};

/**
 * Hook pour interpoler les ressources en temps réel entre les polls du backend.
 *
 * BAL-001: La formule de production est entièrement déléguée au serveur via
 *          planet.metal_per_second / crystal_per_second / deuterium_per_second.
 *          Si ces champs sont absents (ancien payload), on tombe en fallback local
 *          avec le coefficient BAL-003 corrigé (0.01).
 *
 * BAL-002: La base de calcul est toujours serverVal. Math.max(serverVal, displayed)
 *          est supprimé — il causait une dérive permanente vers le haut.
 *
 * UI-06:   safeConfig est mémoïsé avec useMemo et des dépendances stables pour
 *          éviter les boucles infinies quand config est undefined.
 *
 * @param planet      Données de la planète depuis le backend
 * @param speedFactor Facteur de vitesse normalisé (5 pour x5, 10 pour x10, etc.)
 * @param config      Configuration serveur (optionnelle)
 */
export function useRealtimeResources(
  planet: PlanetData | null,
  speedFactor: number,
  config?: ServerConfig
): RealtimeResources | null {
  const [resources, setResources] = useState<RealtimeResources | null>(null);
  const lastSyncMsRef = useRef<number>(Date.now());
  const baseResourcesRef = useRef<RealtimeResources | null>(null);
  const prevServerRef = useRef<RealtimeResources | null>(null);
  const prevPlanetIdRef = useRef<string | undefined>(undefined);

  // UI-06: useMemo avec dépendances stables — évite un objet recréé à chaque render
  // quand config est undefined (ce qui recréerait un nouvel objet référence chaque fois
  // et déclenchait la boucle useEffect ci-dessous).
  const safeConfig = useMemo(
    () => config ?? DEFAULT_CONFIG,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      config?.production_metal_base,
      config?.production_crystal_base,
      config?.production_deuterium_base,
      config?.production_metal_growth,
      config?.production_crystal_growth,
      config?.production_deuterium_growth,
      config?.energy_tech_bonus,
      config?.mining_speed_multiplier,
    ]
  );

  useEffect(() => {
    if (!planet) {
      setResources(null);
      baseResourcesRef.current = null;
      return;
    }

    const isNewPlanet = planet.id !== prevPlanetIdRef.current;
    if (isNewPlanet) {
      prevServerRef.current = null;
      prevPlanetIdRef.current = planet.id;
    }

    // BAL-001: utiliser les taux de production calculés par le serveur en priorité.
    // Fallback local uniquement si les champs *_per_second sont absents du payload
    // (ancien backend ou planète sans données enrichies).
    let metalProdPerSec: number;
    let crystalProdPerSec: number;
    let deutProdPerSec: number;

    if (
      typeof planet.metal_per_second === 'number' &&
      typeof planet.crystal_per_second === 'number' &&
      typeof planet.deuterium_per_second === 'number'
    ) {
      // Chemin principal: données serveur directes
      metalProdPerSec   = planet.metal_per_second;
      crystalProdPerSec = planet.crystal_per_second;
      deutProdPerSec    = planet.deuterium_per_second;
    } else {
      // Chemin fallback: calcul local avec BAL-003 corrigé (energy_tech_bonus = 0.01)
      const techLevel   = planet.technologies?.energy_tech ?? planet.energy_tech_level ?? 0;
      // BAL-003: 1% par niveau (0.01), pas 10% (0.10)
      const techBonus   = 1.0 + (techLevel * (safeConfig.energy_tech_bonus ?? 0.01));
      const energyRatio = (planet.energy_ratio ?? 100) / 100;

      const computeProdPerSec = (level: number, base: number, growth: number): number => {
        if (level === 0 || base === 0) return 0;
        const prod = base * level * Math.pow(growth, level) * techBonus * energyRatio;
        // speed factor + mining multiplier, then /3600 to convert from per-hour to per-second
        return (prod * speedFactor * (safeConfig.mining_speed_multiplier ?? 1.0)) / 3600;
      };

      const metalLevel   = planet.buildings?.metal_mine   ?? planet.metal_mine_level   ?? 0;
      const crystalLevel = planet.buildings?.crystal_mine ?? planet.crystal_mine_level ?? 0;
      const deutLevel    = planet.buildings?.deuterium_mine ?? planet.deuterium_mine_level ?? 0;

      metalProdPerSec   = computeProdPerSec(metalLevel,   safeConfig.production_metal_base,   safeConfig.production_metal_growth);
      crystalProdPerSec = computeProdPerSec(crystalLevel, safeConfig.production_crystal_base,  safeConfig.production_crystal_growth);
      deutProdPerSec    = computeProdPerSec(deutLevel,     safeConfig.production_deuterium_base, safeConfig.production_deuterium_growth);
    }

    const serverNow: RealtimeResources = {
      metal:     planet.metal_amount,
      crystal:   planet.crystal_amount,
      deuterium: planet.deuterium_amount,
    };

    // BAL-002: la base est TOUJOURS serverVal.
    // On conserve uniquement la logique de détection de déduction (ex: paiement d'une
    // construction) pour ne pas faire sauter les valeurs vers le bas en cas de lag réseau.
    // Math.max(serverVal, displayedVal) est SUPPRIMÉ — il causait la dérive permanente.
    const prevServer = prevServerRef.current;
    const resolveBase = (serverVal: number, prevServerVal: number | undefined): number => {
      // Si le serveur rapporte une valeur inférieure à la dernière valeur connue
      // (déduction légitime : construction, envoi de flotte), utiliser directement.
      // Dans tous les autres cas, utiliser serverVal comme nouvelle base propre.
      if (prevServerVal !== undefined && serverVal < prevServerVal - 1) return serverVal;
      // BAL-002 fix: on repart de serverVal, pas de Math.max(serverVal, displayedVal)
      return serverVal;
    };

    prevServerRef.current = serverNow;
    baseResourcesRef.current = {
      metal:     resolveBase(serverNow.metal,     prevServer?.metal),
      crystal:   resolveBase(serverNow.crystal,   prevServer?.crystal),
      deuterium: resolveBase(serverNow.deuterium, prevServer?.deuterium),
    };

    // Mémoriser les taux pour le ticker (closure stable)
    const rates = { metalProdPerSec, crystalProdPerSec, deutProdPerSec };

    // Réinitialiser le timestamp de synchronisation
    lastSyncMsRef.current = Date.now();

    const interval = setInterval(() => {
      if (!baseResourcesRef.current) return;

      // BAL-001 / BAL-002: interpolation linéaire pure depuis la base serveur
      const elapsed = (Date.now() - lastSyncMsRef.current) / 1000;

      setResources({
        metal:     Math.floor(baseResourcesRef.current.metal     + rates.metalProdPerSec   * elapsed),
        crystal:   Math.floor(baseResourcesRef.current.crystal   + rates.crystalProdPerSec * elapsed),
        deuterium: Math.floor(baseResourcesRef.current.deuterium + rates.deutProdPerSec    * elapsed),
      });
    }, 100);

    return () => clearInterval(interval);
  }, [planet, speedFactor, safeConfig]);

  return resources;
}
