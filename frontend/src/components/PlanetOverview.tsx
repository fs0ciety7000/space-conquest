import {
  Stone, Gem, MapPin, Shield, Rocket, Globe, Scan,
  Zap, Hammer, Clock, TrendingUp, AlertTriangle,
  Droplets, Microscope, Warehouse, Activity, ChevronRight, List, XCircle, ShieldCheck, Sword,
  Radar, Radio, Navigation, Target, Recycle, Satellite, Truck, Ship, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
import { useRealtimeResources } from '@/hooks/useRealtimeResources';
import { getTechLevel, getBuildingLevel, getShipCount, calculateFleetAttack, calculateFleetHull, getTotalFleetCount } from '@/utils/techTreeCompat';
import { formatDuration } from '@/lib/utils';
import { usePlanet } from '@/contexts/PlanetContext';
import ZACManager from '@/components/ZACManager';
// --- Dictionnaire de noms ---
const getBiomeStyle = (key: string): string => {
  const styles: Record<string, string> = {
    volcanique: "bg-orange-500/20 border-orange-500/40 text-orange-400",
    glaciaire:  "bg-cyan-500/20 border-cyan-500/40 text-cyan-300",
    desertique: "bg-yellow-500/20 border-yellow-500/40 text-yellow-400",
    oceanique:  "bg-blue-500/20 border-blue-500/40 text-blue-300",
    aride:      "bg-amber-500/20 border-amber-500/40 text-amber-400",
    tellurique: "bg-green-500/20 border-green-500/40 text-green-400",
  };
  return styles[key] || styles.tellurique;
};

const getLabel = (id: string | null) => {
    if (!id) return "Inconnu";
    const labels: Record<string, string> = {
        // Old system keys
        metal: "Mine de Métal",
        crystal: "Mine de Cristal",
        deuterium: "Synth. Deutérium",
        // Resource buildings
        metal_mine: "Mine de Métal",
        crystal_mine: "Mine de Cristal",
        deuterium_mine: "Synth. Deutérium",
        solar_plant: "Centrale Solaire",
        fusion_plant: "Centrale à Fusion",
        // Facility buildings
        shipyard: "Chantier Spatial",
        research: "Labo de Recherche",
        research_lab: "Labo de Recherche",
        hangar: "Hangar à Vaisseaux",
        resource_storage: "Hangar à Ressources",
        nanite_factory: "Usine Nanite",
        alliance_depot: "Dépôt Alliance",
        missile_silo: "Silo à Missiles",
        terraformer: "Terraformeur",
        logistics_hub: "Hub Logistique",
        // Technologies
        energy_tech: "Tech. Énergie",
        laser: "Tech. Laser",
        laser_tech: "Tech. Laser",
        ion_tech: "Tech. Ions",
        plasma_tech: "Tech. Plasma",
        armour: "Tech. Protection",
        armour_tech: "Tech. Protection",
        shield_tech: "Tech. Boucliers",
        weapons_tech: "Tech. Armes",
        computer_tech: "Tech. Ordinateurs",
        espionage: "Tech. Espionnage",
        espionage_tech: "Tech. Espionnage",
        astrophysics: "Astrophysique",
        hyperspace_tech: "Tech. Hyperespace",
        graviton_tech: "Tech. Graviton",
        industrial_tech: "Tech. Industrielle",
        // Propulsion
        combustion_drive: "Propulsion Combustion",
        impulse_drive: "Réacteur à Impulsion",
        hyperspace_drive: "Propulsion Hyperespace",
        // Ships
        light_hunter: "Chasseur Léger",
        heavy_hunter: "Chasseur Lourd",
        cruiser: "Croiseur",
        battleship: "Cuirassé",
        destroyer: "Destructeur",
        bomber: "Bombardier",
        deathstar: "Étoile de la Mort",
        death_star: "Étoile de la Mort",
        colony_ship: "Vaisseau Colon",
        transporter: "Transporteur",
        recycler: "Recycleur",
        spy_probe: "Sonde Espionnage",
        grand_cargo: "Grand Cargo",
        // Defenses
        rocket_launcher: "Lanceur Missiles",
        light_laser: "Laser Léger",
        heavy_laser: "Laser Lourd",
        gauss_cannon: "Canon de Gauss",
        ion_cannon: "Canon à Ions",
        plasma_turret: "Tourelle Plasma",
        small_shield: "Bouclier Léger",
        large_shield: "Bouclier Lourd",
        anti_missile: "Missile Anti-Balistique",
        interplanetary_missile: "Missile Interplanétaire",
    };
    return labels[id] || id;
};

const RESOURCE_PRODUCTION_KEYS = ['metal_mine', 'crystal_mine', 'deuterium_mine', 'solar_plant', 'fusion_plant'];

const getItemType = (id: string, isResearch?: boolean) => {
    if (isResearch) return 'tech';
    if (['light_hunter', 'heavy_hunter', 'cruiser', 'battleship', 'destroyer', 'bomber', 'deathstar', 'death_star', 'colony_ship', 'transporter', 'recycler', 'spy_probe', 'grand_cargo'].includes(id)) return 'fleet';
    if (['rocket_launcher', 'light_laser', 'heavy_laser', 'gauss_cannon', 'ion_cannon', 'plasma_turret', 'small_shield', 'large_shield', 'anti_missile', 'interplanetary_missile'].includes(id)) return 'defense';
    if (RESOURCE_PRODUCTION_KEYS.includes(id)) return 'resources';
    return 'facilities';
};

interface ResourceSlot {
  id: number;
  planet_id: string;
  slot_number: number;
  resource_type: string;
  level: number;
  is_locked: boolean;
  is_active: boolean;
}

export default function PlanetOverview({ planet, speedFactor }: { planet: any, speedFactor: number }) {
  const { fetchPlanet } = usePlanet();
  const [tick, setTick] = useState(0);
  const [slots, setSlots] = useState<ResourceSlot[]>([]);
  const [buildQueueStatus, setBuildQueueStatus] = useState<any>(null);
  const [tradeRoutes, setTradeRoutes] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({
    production_metal_base: 30,
    production_crystal_base: 20,
    production_deuterium_base: 10,
    production_metal_growth: 1.1,
    production_crystal_growth: 1.1,
    production_deuterium_growth: 1.05,
    energy_tech_bonus: 0.10,
    mining_speed_multiplier: 1.0
  });

  // Hook pour ressources en temps réel
  const realtimeResources = useRealtimeResources(planet, speedFactor, config);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Récupérer la configuration serveur
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(apiUrl('/config'));
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch (e) {
        console.error("Erreur chargement config", e);
      }
    };

    fetchConfig();
  }, []);

  // Charger les slots actifs
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetch(apiUrl(`/planets/${planet.id}/resource-slots`), {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSlots(data);
        }
      } catch (error) {
        console.error('Erreur chargement slots:', error);
      }
    };
    if (planet?.id) fetchSlots();
  }, [planet?.id]);

  // Charger le statut de la file de construction (pour slots et items en attente)
  useEffect(() => {
    const fetchBuildQueue = async () => {
      try {
        const res = await fetch(apiUrl(`/planets/${planet.id}/build-queue`), {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) setBuildQueueStatus(await res.json());
      } catch { /* silently ignore */ }
    };
    if (planet?.id) {
      fetchBuildQueue();
      const id = setInterval(fetchBuildQueue, 10_000);
      return () => clearInterval(id);
    }
  }, [planet?.id]);

  // Charger les routes commerciales depuis cette planète
  useEffect(() => {
    const fetchRoutes = async () => {
      if (!planet?.owner_id) return;
      try {
        const res = await fetch(apiUrl(`/trade-routes?user_id=${planet.owner_id}`));
        if (res.ok) {
          const data = await res.json();
          const sourceRoutes = (data.routes || []).filter((r: any) => r.source_planet_id === planet.id);
          setTradeRoutes(sourceRoutes);
        }
      } catch { /* silently ignore */ }
    };
    if (planet?.id && planet?.owner_id) {
      fetchRoutes();
      const id = setInterval(fetchRoutes, 30_000);
      return () => clearInterval(id);
    }
  }, [planet?.id, planet?.owner_id]);

  const getTimeLeft = (endDate: string) => {
    const end = new Date(endDate.endsWith("Z") ? endDate : endDate + "Z").getTime();
    const now = new Date().getTime();
    return Math.max(0, Math.floor((end - now) / 1000));
  };

  const cancelOperation = async (queueId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/cancel-construction/${queueId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const total = data.refund_metal + data.refund_crystal + data.refund_deuterium;

        toast.success("Opération annulée", {
          description: `Remboursement de ${Math.floor(total).toLocaleString()} ressources (${Math.round(data.ratio * 100)}%).`
        });
        fetchPlanet();
      } else {
        toast.error("Erreur lors de l'annulation");
      }
    } catch (e) {
      toast.error("Serveur injoignable");
    }
  };

  const cancelShipBuild = async (shipKey: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/cancel-ship-build/${shipKey}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const total = data.refund_metal + data.refund_crystal + data.refund_deuterium;

        toast.success("Construction annulée", {
          description: `Remboursement de ${Math.floor(total).toLocaleString()} ressources (${Math.round(data.refund_ratio * 100)}%).`
        });
        fetchPlanet();
      } else if (res.status === 409) {
        toast.info("Déjà annulée", { description: "Cette construction a déjà été annulée." });
      } else {
        toast.error("Erreur lors de l'annulation");
      }
    } catch (e) {
      toast.error("Serveur injoignable");
    }
  };

  const cancelResearch = async (techKey: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/cancel-research/${techKey}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const total = data.refund_metal + data.refund_crystal + data.refund_deuterium;
        toast.success("Recherche annulée", {
          description: `Remboursement de ${Math.floor(total).toLocaleString()} ressources (${Math.round(data.refund_ratio * 100)}%).`
        });
        fetchPlanet();
      } else if (res.status === 409) {
        toast.info("Déjà annulée", { description: "Cette recherche a déjà été annulée." });
      } else {
        toast.error("Erreur lors de l'annulation");
      }
    } catch (e) {
      toast.error("Serveur injoignable");
    }
  };

  const cancelDefenseBuild = async (defenseKey: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/cancel-defense-build/${defenseKey}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const total = data.refund_metal + data.refund_crystal + data.refund_deuterium;

        toast.success("Construction annulée", {
          description: `Remboursement de ${Math.floor(total).toLocaleString()} ressources (${Math.round(data.refund_ratio * 100)}%).`
        });
        fetchPlanet();
      } else if (res.status === 409) {
        toast.info("Déjà annulée", { description: "Cette construction a déjà été annulée." });
      } else {
        toast.error("Erreur lors de l'annulation");
      }
    } catch (e) {
      toast.error("Serveur injoignable");
    }
  };

  // --- CALCULS PRODUCTION (avec slots, tech et énergie) ---
  const calculateProduction = (resourceType: 'metal' | 'crystal' | 'deuterium', level: number, baseFactor: number, growthFactor: number) => {
    // Calcul de base
    let prod = baseFactor * level * Math.pow(growthFactor, level);

    // Bonus technologie énergie (configurable)
    const techLevel = getTechLevel(planet, 'energy_tech');
    const techBonus = 1.0 + (techLevel * (config.energy_tech_bonus || 0.01));
    prod *= techBonus;

    // Ratio énergétique (récupéré du backend)
    const energyRatio = (planet.energy_ratio || 100) / 100;
    prod *= energyRatio;

    // Bonus slots actifs (+50% par slot du même type)
    const activeSlots = slots.filter(s => s.is_active && s.resource_type === resourceType);
    const slotBonus = 1.0 + (activeSlots.length * 0.5);
    prod *= slotBonus;

    // Speed factor ET mining speed multiplier
    prod *= speedFactor * (config.mining_speed_multiplier || 1.0);

    return Math.floor(prod);
  };

  // Utiliser les valeurs de production du backend (GET /planets/:id)
  // calculateProduction() est un calcul frontend qui diverge du backend
  const prodMetal = planet.metal_production ?? calculateProduction('metal', getBuildingLevel(planet, 'metal_mine'), config.production_metal_base, config.production_metal_growth);
  const prodCrystal = planet.crystal_production ?? calculateProduction('crystal', getBuildingLevel(planet, 'crystal_mine'), config.production_crystal_base, config.production_crystal_growth);
  const prodDeut = planet.deuterium_production ?? calculateProduction('deuterium', getBuildingLevel(planet, 'deuterium_mine'), config.production_deuterium_base, config.production_deuterium_growth);

  // Energy data from backend
  const energyProd = planet.energy_production || 0;
  const energyCons = planet.energy_consumption || 0;
  const energyRatio = planet.energy_ratio || 100; // percentage
  const energyNet = energyProd - energyCons;
  const energyPercent = energyCons > 0 ? Math.min(100, (energyCons / energyProd) * 100) : 0;

  // --- CALCULS MILITAIRES AVANCÉS ---
  const atkBonus = 1 + (getTechLevel(planet, 'laser_tech') * 0.1);
  const hullBonus = 1 + (getTechLevel(planet, 'armour_tech') * 0.1);

  const totalAtk = (
    (getShipCount(planet, 'light_hunter') * 50) +
    (getShipCount(planet, 'cruiser') * 400) +
    (getShipCount(planet, 'rocket_launcher') * 80) +
    (getShipCount(planet, 'plasma_turret') * 3000)
  ) * atkBonus;

  const totalHull = (
    (getShipCount(planet, 'light_hunter') * 400) +
    (getShipCount(planet, 'cruiser') * 2700) +
    (getShipCount(planet, 'rocket_launcher') * 200) +
    (getShipCount(planet, 'plasma_turret') * 10000)
  ) * hullBonus;

  const totalFleet = getTotalFleetCount(planet);
  const hangarCap = planet.fleet_capacity ?? (500 + (getBuildingLevel(planet, 'hangar') * 500));
  const totalDefense =
    (getShipCount(planet, 'rocket_launcher') || 0) +
    (getShipCount(planet, 'light_laser') || 0) +
    (getShipCount(planet, 'heavy_laser') || 0) +
    (getShipCount(planet, 'gauss_cannon') || 0) +
    (getShipCount(planet, 'ion_cannon') || 0) +
    (getShipCount(planet, 'plasma_turret') || 0) +
    (getShipCount(planet, 'small_shield') || 0) +
    (getShipCount(planet, 'large_shield') || 0) +
    (getShipCount(planet, 'antiballistic_missile') || 0) +
    (getShipCount(planet, 'interplanetary_missile') || 0);

  const fmt = (n: number) => Math.floor(n).toLocaleString();

  // Combine all construction queues: buildings/tech + ships + defenses + research
  const buildingQueue = planet.constructions || [];
  const shipBuilds = planet.ship_builds || [];
  const defenseBuilds = planet.defense_builds || [];
  const researchQueue = planet.research_queue || [];

  // Create a unified queue with all construction types
  const constructionQueue = [
    ...buildingQueue,
    ...shipBuilds.map((sb: any) => ({
      id: `ship_${sb.ship_key}`,
      building_type: sb.ship_key,
      end_time: sb.build_end_time,
      level: sb.building_count, // quantity
      is_ship: true,
      name: sb.name
    })),
    ...defenseBuilds.map((db: any) => ({
      id: `defense_${db.defense_key}`,
      building_type: db.defense_key,
      end_time: db.build_end_time,
      level: db.building_count, // quantity
      is_defense: true,
      name: db.name
    })),
    ...researchQueue.map((r: any) => ({
      id: `research_${r.tech_key}`,
      building_type: r.tech_key,
      end_time: r.end_time,
      level: r.target_level,
      is_research: true,
    }))
  ].sort((a, b) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime());

  // Slots: use build queue API data if available, fall back to active build count
  const bqCategories: Record<string, any> = buildQueueStatus?.categories || {};
  const maxSlots = Object.values(bqCategories).reduce((sum: number, c: any) => sum + (c.slots_total || 0), 0) || 3;
  const slotsUsed = Object.values(bqCategories).reduce((sum: number, c: any) => sum + (c.slots_used || 0), 0) || constructionQueue.length;
  const pendingQueueItems: any[] = buildQueueStatus?.pending_items || [];

  // --- MISSIONS (Backend enrichit l'objet planet avec ces listes) ---
  const incomingMissions = planet.incoming_missions || [];
  const outgoingMissions = planet.outgoing_missions || [];
  
  // Alerte sonore et toast pour les attaques entrantes
  const [alertedMissions, setAlertedMissions] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const incomingAttacks = incomingMissions.filter((m: any) => m.mission_type === 'attack');
    incomingAttacks.forEach((attack: any) => {
      if (!alertedMissions.has(attack.id)) {
        // Nouvelle attaque détectée - alerter !
        toast.error(`⚠️ ALERTE ATTAQUE !`, {
          description: `${attack.attacker_name || 'Un ennemi'} attaque avec ${attack.ships_count} vaisseaux !`,
          duration: 10000,
        });
        
        // Jouer un son d'alerte si disponible
        try {
          const alertSound = new Audio('/sounds/alert.wav');
          alertSound.volume = 0.5;
          alertSound.play().catch(() => {});
        } catch (e) {}
        
        setAlertedMissions(prev => new Set([...prev, attack.id]));
      }
    });
  }, [incomingMissions, alertedMissions]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* SECTION RADAR / MISSIONS ALERTES */}
      {(incomingMissions.length > 0 || outgoingMissions.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* RADAR DE DÉTECTION (Incoming) */}
              <Card className={`bg-slate-950 border ${incomingMissions.some((m: any) => m.mission_type === 'attack') ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-blue-500/30'} overflow-hidden relative hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 card-depth animate-slide-up`}>
                  <div className="absolute top-0 right-0 p-2 opacity-10"><Radar size={80} /></div>
                  <CardHeader className="pb-2 border-b border-white/5">
                      <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-slate-400">
                          <Radio size={14} className="animate-pulse text-blue-400" /> Flux de circulation entrant
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                      {incomingMissions.length > 0 ? incomingMissions.map((m: any) => {
                          const tl = getTimeLeft(m.arrival_time);
                          const isAttack = m.mission_type === 'attack';
                          return (
                              <div key={m.id} className={`flex flex-col gap-2 p-3 rounded-lg border ${isAttack ? 'bg-red-950/30 border-red-500/30 shadow-[inset_0_0_30px_rgba(239,68,68,0.1)]' : 'bg-blue-500/5 border-blue-500/10'}`}>
                                  <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                          <div className={`p-2 rounded-full relative ${isAttack ? 'bg-red-500' : 'bg-blue-500'}`}>
                                              {isAttack && <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></div>}
                                              <Rocket size={14} className="text-white relative z-10" />
                                          </div>
                                          <div>
                                              <p className={`text-xs font-black uppercase tracking-wider ${isAttack ? 'text-red-400' : 'text-blue-400'}`}>
                                                  {isAttack ? '⚠️ ALERTE ATTAQUE' : '📦 Transport civil'}
                                              </p>
                                              {m.attacker_name && (
                                                  <p className="text-[10px] font-bold text-red-300">
                                                      Attaquant : {m.attacker_name}
                                                  </p>
                                              )}
                                              {m.source_coords && (
                                                  <p className="text-[9px] font-mono text-slate-500">
                                                      Origine : {m.source_coords}
                                                  </p>
                                              )}
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <div className={`font-mono text-lg font-black ${isAttack ? 'text-red-400' : 'text-white'}`}>
                                              {formatDuration(tl)}
                                          </div>
                                          <div className="text-[9px] font-mono text-slate-500">
                                              {m.ships_count} Unités
                                          </div>
                                      </div>
                                  </div>
                                  {/* Barre de progression pour les attaques */}
                                  {isAttack && (
                                      <div className="h-2 w-full bg-slate-900 rounded-full border border-red-500/20 overflow-hidden">
                                          <div 
                                              className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full transition-all duration-1000 animate-pulse"
                                              style={{ width: `${Math.max(5, 100 - (tl / 3))}%` }}
                                          />
                                      </div>
                                  )}
                              </div>
                          );
                      }) : (
                          <div className="text-center py-4 text-slate-600 text-[10px] uppercase font-bold italic">Secteur Local Calme</div>
                      )}
                  </CardContent>
              </Card>

           {/* CENTRE DE COMMANDE (Missions sortantes) */}
<Card className="bg-slate-950 border border-emerald-500/30 overflow-hidden relative shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 card-depth animate-slide-up">
    <div className="absolute top-0 right-0 p-2 opacity-10"><Navigation size={80} /></div>
    <CardHeader className="pb-2 border-b border-white/5 bg-emerald-950/20">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-emerald-400">
            <Navigation size={14} className="animate-pulse" /> Centre de Commandement Flotte
        </CardTitle>
    </CardHeader>
    <CardContent className="p-4 space-y-4">
        {outgoingMissions.length > 0 ? outgoingMissions.map((m: any) => {
            const tl = getTimeLeft(m.arrival_time);
            
            // Traduction et Style
            const isAttack = m.mission_type.toLowerCase() === 'attack';
            const label = isAttack ? "OFFENSIVE" : "TRANSPORT";
            const statusColor = isAttack ? "text-red-400" : "text-emerald-400";
            const barColor = isAttack ? "bg-red-500" : "bg-emerald-500";

            return (
                <div key={m.id} className="bg-black/40 border border-white/5 p-4 rounded-xl flex flex-col gap-3 group hover:border-emerald-500/30 transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className={`text-[10px] font-black ${statusColor} uppercase tracking-[0.2em]`}>
                                {label}
                            </span>
                            <h4 className="text-sm font-bold text-slate-200 mt-1">
                                Vers : {m.target_name || "Secteur Inconnu"}
                            </h4>
                            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                                Coordonnées : {m.coords || "[X:X:X]"}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-mono font-black text-white bg-black px-2 py-1 rounded border border-white/10 shadow-inner">
                                {formatDuration(tl)}
                            </span>
                        </div>
                    </div>

                    {/* Barre de progression ultra visible */}
                    <div className="space-y-1">
                        <div className="h-3 w-full bg-slate-900 rounded-full border border-white/5 overflow-hidden p-0.5 shadow-inner">
                            <div 
                                className={`h-full ${barColor} rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.4)]`}
                                style={{ width: `${Math.max(2, 100 - (tl / 10))}%` }} // Ajuster le /10 selon la durée max réelle
                            />
                        </div>
                        <div className="flex justify-between text-[8px] font-bold text-slate-600 uppercase tracking-tighter">
                            <span>Décollage</span>
                            <span>Impact imminent</span>
                        </div>
                    </div>
                </div>
            );
        }) : (
            <div className="text-center py-8 text-slate-600 border-2 border-dashed border-white/5 rounded-xl">
                <p className="text-[10px] uppercase font-black tracking-widest opacity-50 italic">Hangar de lancement vide</p>
            </div>
        )}
    </CardContent>
</Card>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARTE PLANETE ET FILE */}
        <Card className="lg:col-span-2 bg-slate-950 border border-white/10 overflow-hidden relative group flex flex-col justify-between hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 card-depth animate-slide-up">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614730341194-75c607ae363c?q=80&w=2696&auto=format&fit=crop')] bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent"></div>
            
            <CardHeader className="relative z-10 flex flex-row items-center gap-6 pb-2">
                <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 blur-md absolute animate-pulse"></div>
                    <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-indigo-400/50 flex items-center justify-center relative z-10 shadow-xl">
                        <Globe size={40} className="text-indigo-300" />
                    </div>
                </div>
                <div>
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                        <h2 className="text-3xl font-black uppercase text-white tracking-widest drop-shadow-md">{planet.name}</h2>
                        <div className="px-2 py-0.5 rounded bg-green-500/20 border border-green-500/30 text-[10px] text-green-400 font-bold uppercase tracking-wider">Opérationnel</div>
                        {planet.biome && (
                          <div
                            title={planet.biome.description}
                            className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getBiomeStyle(planet.biome.key)}`}
                          >
                            {planet.biome.name}
                          </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-black/40 rounded border border-white/5 font-mono text-xs text-slate-400">
                        <MapPin size={12} className="text-indigo-400" />
                        <span>[{planet.galaxy}:{planet.system}:{planet.position}]</span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="relative z-10 pt-0 pb-4 px-6">
                <div className="bg-gradient-to-br from-black/60 via-slate-900/40 to-black/60 border-2 border-cyan-500/20 rounded-xl p-4 backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.1)] relative overflow-hidden">
                    {/* Effets de fond animés */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 bg-cyan-400 animate-pulse"></div>
                        <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full blur-2xl opacity-15 bg-indigo-400 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                        <div className="absolute inset-0 opacity-5">
                            <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
                        </div>
                    </div>

                    <div className="flex justify-between items-end mb-4 relative z-10">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                            <div className="relative">
                                <List size={14} className="animate-pulse" />
                                <List size={14} className="absolute inset-0 animate-ping opacity-30" />
                            </div>
                            Chaîne de Production
                        </h3>
                        <span className={`text-[10px] font-mono font-black px-3 py-1.5 rounded-full border-2 transition-all duration-300 ${slotsUsed >= maxSlots ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]'}`}>
                            {slotsUsed} / {maxSlots} SLOTS
                        </span>
                    </div>

                    <div className="space-y-2.5 relative z-10 max-h-[420px] overflow-y-auto pr-1">
                        {constructionQueue.length > 0 ? (
                            constructionQueue.map((item: any, index: number) => {
                                const tl = getTimeLeft(item.end_time);
                                // Determine type based on flags or building_type
                                const type = item.is_ship ? 'fleet' : item.is_defense ? 'defense' : getItemType(item.building_type, item.is_research);
                                // Use name if available (for ships/defenses), otherwise lookup label
                                const label = item.name || getLabel(item.building_type);
                                const refundPercent = index === 0 ? Math.max(0, Math.min(95, Math.round((tl / 60) * 100))) : 95;
                                const progress = index === 0 ? Math.max(0, 100 - (tl / 3)) : 0;

                                let Icon = Hammer;
                                let color = "text-violet-400";
                                let bgGlow = "from-violet-500/10 to-slate-900/60";
                                let borderColor = "border-violet-500/30";
                                if (type === 'tech') { Icon = Microscope; color = "text-purple-400"; bgGlow = "from-purple-500/10 to-slate-900/60"; borderColor = "border-purple-500/30"; }
                                else if (type === 'fleet') { Icon = Rocket; color = "text-cyan-400"; bgGlow = "from-cyan-500/10 to-slate-900/60"; borderColor = "border-cyan-500/30"; }
                                else if (type === 'defense') { Icon = Shield; color = "text-red-400"; bgGlow = "from-red-500/10 to-slate-900/60"; borderColor = "border-red-500/30"; }
                                else if (type === 'resources') { color = "text-orange-400"; bgGlow = "from-orange-500/10 to-slate-900/60"; borderColor = "border-orange-500/30"; }
                                // facilities: default violet

                                return (
                                    <div key={item.id} className={`relative bg-gradient-to-r ${bgGlow} border-2 ${borderColor} rounded-lg p-3 group/item transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] ${index === 0 ? 'shadow-[0_0_25px_rgba(99,102,241,0.15)]' : ''}`}>
                                        {/* Barre de progression en fond pour l'item actif */}
                                        {index === 0 && (
                                            <div className="absolute inset-0 overflow-hidden rounded-lg">
                                                <div
                                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transition-all duration-1000"
                                                    style={{ width: `${progress}%` }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center text-xs relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg bg-black/40 border border-white/10 relative ${index === 0 ? 'animate-pulse' : ''}`}>
                                                    <Icon size={16} className={`${color} drop-shadow-[0_0_6px_currentColor]`} />
                                                    {index === 0 && <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent animate-pulse"></div>}
                                                </div>
                                                <div>
                                                    <span className={`font-black text-sm block tracking-wide ${index === 0 ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-slate-200'}`}>{label}</span>
                                                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
                                                        {type === 'fleet' || type === 'defense' ? (
                                                            <>
                                                                <ChevronRight size={10} className="text-emerald-400" />
                                                                <span className="text-emerald-400">+{item.level}</span> Unités
                                                            </>
                                                        ) : (
                                                            <>
                                                                <TrendingUp size={10} className="text-cyan-400" />
                                                                Niveau <span className="text-cyan-400 font-black">{item.level}</span>
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <div className={`flex items-center gap-2 ${index === 0 ? 'text-cyan-300' : 'text-indigo-300'} font-mono bg-black/60 px-3 py-1.5 rounded-lg border-2 ${index === 0 ? 'border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'border-indigo-500/30'}`}>
                                                    <Clock size={12} className={index === 0 ? "animate-spin-slow drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]" : ""} />
                                                    <span className="font-black text-sm">{formatDuration(tl)}</span>
                                                </div>
                                                {/* Cancel button */}
                                                <div className="relative group/cancel">
                                                    <button
                                                        onClick={() => {
                                                            if (item.is_ship) {
                                                                cancelShipBuild(item.building_type);
                                                            } else if (item.is_defense) {
                                                                cancelDefenseBuild(item.building_type);
                                                            } else if (item.is_research) {
                                                                cancelResearch(item.building_type);
                                                            } else {
                                                                cancelOperation(item.id);
                                                            }
                                                        }}
                                                        className="text-slate-600 hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-500/10 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] group-hover/cancel:scale-110"
                                                    >
                                                        <XCircle size={18} className="drop-shadow-[0_0_4px_currentColor]" />
                                                    </button>
                                                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover/cancel:block z-50">
                                                        <div className="bg-slate-950 border-2 border-red-500/50 text-white text-[10px] p-3 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.4)] whitespace-nowrap backdrop-blur-md">
                                                            <span className="text-red-400 font-black uppercase tracking-wider border-b border-red-500/30 pb-1.5 mb-2 block drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]">⚠️ Annulation</span>
                                                            <span className="text-slate-300 font-semibold">Remboursement: <span className="text-emerald-400 font-black">{refundPercent}%</span></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-600 space-y-2 relative">
                                <div className="relative">
                                    <Activity size={32} className="opacity-20 animate-pulse" />
                                    <Activity size={32} className="absolute inset-0 opacity-10 animate-ping" />
                                </div>
                                <span className="text-[11px] uppercase tracking-[0.2em] font-black italic text-slate-500/70">Centre de Production Inactif</span>
                            </div>
                        )}

                        {/* Items en attente (file de construction) */}
                        {pendingQueueItems.length > 0 && (
                            <>
                                <div className="flex items-center gap-2 mt-3 mb-2">
                                    <div className="h-px flex-1 bg-slate-700/30" />
                                    <span className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-500">
                                        {pendingQueueItems.length} en attente
                                    </span>
                                    <div className="h-px flex-1 bg-slate-700/30" />
                                </div>
                                {pendingQueueItems
                                    .sort((a: any, b: any) => a.queue_position - b.queue_position)
                                    .map((item: any) => {
                                        const label = getLabel(item.item_key) || item.item_key;
                                        const isShip = item.category === 'ships';
                                        const isDefense = item.category === 'defenses';
                                        const isTech = item.category === 'research';
                                        let Icon = Hammer; let color = "text-slate-400";
                                        if (isTech) { Icon = Microscope; color = "text-purple-400/60"; }
                                        else if (isShip) { Icon = Rocket; color = "text-orange-400/60"; }
                                        else if (isDefense) { Icon = Shield; color = "text-red-400/60"; }
                                        return (
                                            <div key={item.id} className="relative bg-slate-900/30 border border-slate-700/20 rounded-lg p-2.5 opacity-70">
                                                <div className="flex justify-between items-center text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 rounded-lg bg-black/30 border border-white/5">
                                                            <Icon size={12} className={color} />
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-300 text-xs font-medium block">{label}</span>
                                                            <span className="text-[9px] text-slate-600 uppercase tracking-wider">
                                                                {isShip || isDefense
                                                                    ? `+${item.quantity} unités`
                                                                    : item.target_level ? `→ niv. ${item.target_level}` : 'En attente'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="text-[9px] text-slate-600 font-mono bg-slate-800/50 px-2 py-1 rounded">
                                                        File #{item.queue_position + 1}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Colonne droite : réseau électrique (haut) + routes commerciales */}
        <div className="flex flex-col gap-4">

        {/* ROUTES COMMERCIALES ACTIVES */}
        {tradeRoutes.length > 0 && (() => {
          const nowMs = Date.now();
          const flightSpeed = config.flight_speed_multiplier ?? 5.0;
          const intervalHours = config.trade_route_interval_hours ?? 24;

          return (
            <Card className="order-last bg-slate-950 border border-amber-500/20 overflow-hidden relative hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 card-depth animate-slide-up">
              <div className="absolute top-0 right-0 p-2 opacity-10"><Truck size={80} /></div>
              <CardHeader className="pb-2 border-b border-white/5">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-amber-400">
                  <Truck size={14} className="text-amber-400" /> Routes Commerciales
                  <span className="text-slate-500 normal-case font-normal text-[9px] ml-1">depuis cette planète</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 max-h-[480px] overflow-y-auto">
                {tradeRoutes.map((route: any) => {
                  const travelSec: number = route.travel_time_seconds ?? 0;
                  const arrivalMs = route.next_run_at ? new Date(route.next_run_at).getTime() : 0;
                  const departureMs = arrivalMs - travelSec * 1000;
                  const returnMs = arrivalMs + travelSec * 1000;

                  let phase: 'waiting' | 'outbound' | 'returning' = 'waiting';
                  let remainingSec = 0;
                  let progress = 0;

                  if (route.is_active && arrivalMs > 0 && travelSec > 0) {
                    if (nowMs >= departureMs && nowMs < arrivalMs) {
                      phase = 'outbound';
                      remainingSec = Math.max(0, Math.floor((arrivalMs - nowMs) / 1000));
                      progress = Math.min(100, ((travelSec - remainingSec) / travelSec) * 100);
                    } else if (nowMs >= arrivalMs && nowMs < returnMs) {
                      phase = 'returning';
                      remainingSec = Math.max(0, Math.floor((returnMs - nowMs) / 1000));
                      progress = Math.min(100, ((travelSec - remainingSec) / travelSec) * 100);
                    }
                  }

                  const fmtSec = (s: number) => {
                    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
                    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
                    if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`;
                    return `${sec}s`;
                  };

                  const nextCollectSec = arrivalMs > nowMs ? Math.floor((arrivalMs - nowMs) / 1000) : 0;

                  return (
                    <div key={route.id} className={`rounded-lg border p-3 ${route.is_active ? 'bg-amber-950/20 border-amber-500/20' : 'bg-slate-900/20 border-slate-700/20 opacity-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${route.is_active ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                          <span className="text-white font-medium truncate max-w-[140px]">{route.name}</span>
                          <span className="text-slate-500">→</span>
                          <span className="text-cyan-300 text-xs">{route.target_planet_name ?? route.target_planet_id.slice(0, 8)}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{route.ship_count} cargos</span>
                      </div>

                      {phase !== 'waiting' ? (
                        <>
                          <div className={`flex items-center gap-1.5 mb-1.5 text-xs font-medium ${phase === 'outbound' ? 'text-amber-300' : 'text-cyan-300'}`}>
                            <Navigation size={11} className="animate-pulse" />
                            {phase === 'outbound' ? `En route → ${route.target_planet_name}` : `Retour → ${route.source_planet_name ?? 'source'}`}
                            <span className="ml-auto text-slate-400 font-normal text-[10px]">
                              ETA : <span className={phase === 'outbound' ? 'text-amber-300' : 'text-cyan-300'}>{fmtSec(remainingSec)}</span>
                            </span>
                          </div>
                          <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${phase === 'outbound' ? 'bg-amber-500' : 'bg-cyan-500'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </>
                      ) : route.is_active && nextCollectSec > 0 ? (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock size={10} className="text-indigo-400" />
                          Départ dans <span className="text-indigo-300 ml-1 font-medium">{fmtSec(Math.max(0, nextCollectSec - travelSec))}</span>
                          <span className="ml-auto">Collecte : <span className="text-amber-400">{fmtSec(nextCollectSec)}</span></span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })()}

        {/* ENERGIE - DESIGN ÉLECTRIQUE */}
        <Card className={`order-first bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 ${energyRatio >= 100 ? 'border-yellow-500/50' : energyRatio >= 50 ? 'border-orange-500/50' : 'border-red-500/50'} backdrop-blur-md flex flex-col relative overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 card-depth animate-slide-up`}>
            {/* Effets de fond électriques */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Lueur principale */}
                <div className={`absolute -right-20 -top-20 w-48 h-48 rounded-full blur-3xl opacity-30 ${energyRatio >= 100 ? 'bg-yellow-400 animate-pulse' : energyRatio >= 50 ? 'bg-orange-400 animate-pulse' : 'bg-red-500 animate-ping'}`}></div>
                <div className={`absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-2xl opacity-20 ${energyRatio >= 100 ? 'bg-cyan-400' : 'bg-orange-500'}`}></div>
                {/* Lignes électriques animées */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-pulse"></div>
                    <div className="absolute top-2/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute top-3/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
            </div>

            <CardHeader className="pb-2 relative z-10">
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        <div className={`relative ${energyRatio < 50 ? 'animate-pulse' : ''}`}>
                            <Zap size={18} className={`${energyRatio >= 100 ? 'text-yellow-400' : energyRatio >= 50 ? 'text-orange-400' : 'text-red-500'} drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]`} />
                            {energyRatio >= 100 && <Zap size={18} className="absolute inset-0 text-yellow-400 animate-ping opacity-50" />}
                        </div>
                        Réseau Électrique
                    </span>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${energyRatio >= 100 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : energyRatio >= 50 ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse'}`}>
                        {energyRatio >= 100 ? '⚡ OPTIMAL' : energyRatio >= 50 ? '⚠️ RALENTI' : '🔴 CRITIQUE'}
                    </span>
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 relative z-10">
                {/* Indicateur principal avec effet glow */}
                <div className="text-center py-2">
                    <div className={`text-5xl font-black font-mono tracking-tighter ${energyRatio >= 100 ? 'text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]' : energyRatio >= 50 ? 'text-orange-400 drop-shadow-[0_0_15px_rgba(251,146,60,0.5)]' : 'text-red-400 drop-shadow-[0_0_20px_rgba(248,113,113,0.7)] animate-pulse'}`}>
                        {energyRatio}%
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Efficacité du réseau</div>
                </div>

                {/* Graphique Production vs Consommation */}
                <div className="bg-black/40 rounded-xl p-4 border border-white/10 relative overflow-hidden">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-3 font-bold flex items-center gap-2">
                        <Activity size={10} className="text-cyan-400" /> Flux énergétique
                    </div>

                    {/* Barres comparatives verticales style voltmètre */}
                    <div className="flex items-end justify-center gap-6 h-24">
                        {/* Barre Production */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="relative w-8 h-20 bg-slate-900 rounded-lg border border-white/10 overflow-hidden">
                                {/* Graduation */}
                                <div className="absolute inset-0 flex flex-col justify-between py-1 px-0.5 opacity-30">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="h-px bg-white/50 w-full"></div>
                                    ))}
                                </div>
                                {/* Barre de remplissage */}
                                <div
                                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-600 via-emerald-400 to-cyan-400 transition-all duration-700 rounded-b-md"
                                    style={{ height: `${Math.min(100, (energyProd / Math.max(energyProd, energyCons, 1)) * 100)}%` }}
                                >
                                    {/* Effet de brillance */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                    {/* Effet lightning */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-white/50 opacity-0 animate-pulse"></div>
                                </div>
                                {/* Glow effect */}
                                <div className="absolute -inset-1 bg-emerald-500/20 blur-md -z-10 rounded-lg"></div>
                            </div>
                            <div className="text-center">
                                <Zap size={10} className="text-emerald-400 mx-auto mb-0.5" />
                                <span className="text-emerald-400 font-mono text-[10px] font-bold block">+{fmt(energyProd)}</span>
                                <span className="text-[8px] text-slate-600 uppercase">Prod.</span>
                            </div>
                        </div>

                        {/* Indicateur central - Flux */}
                        <div className="flex flex-col items-center justify-center h-20">
                            <div className={`text-2xl font-black font-mono ${energyNet >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                                {energyNet >= 0 ? '→' : '←'}
                            </div>
                            <div className={`text-xs font-mono font-bold ${energyNet >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                                {energyNet >= 0 ? '+' : ''}{fmt(energyNet)}
                            </div>
                            <div className="text-[8px] text-slate-600 uppercase">Net</div>
                        </div>

                        {/* Barre Consommation */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="relative w-8 h-20 bg-slate-900 rounded-lg border border-white/10 overflow-hidden">
                                {/* Graduation */}
                                <div className="absolute inset-0 flex flex-col justify-between py-1 px-0.5 opacity-30">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="h-px bg-white/50 w-full"></div>
                                    ))}
                                </div>
                                {/* Barre de remplissage */}
                                <div
                                    className={`absolute bottom-0 left-0 right-0 transition-all duration-700 rounded-b-md ${energyRatio >= 100 ? 'bg-gradient-to-t from-orange-600 via-orange-400 to-yellow-400' : 'bg-gradient-to-t from-red-700 via-red-500 to-orange-400'}`}
                                    style={{ height: `${Math.min(100, (energyCons / Math.max(energyProd, energyCons, 1)) * 100)}%` }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                                </div>
                                {/* Glow effect */}
                                <div className={`absolute -inset-1 blur-md -z-10 rounded-lg ${energyRatio >= 100 ? 'bg-orange-500/20' : 'bg-red-500/30'}`}></div>
                            </div>
                            <div className="text-center">
                                <Activity size={10} className={`mx-auto mb-0.5 ${energyRatio >= 100 ? 'text-orange-400' : 'text-red-400'}`} />
                                <span className={`font-mono text-[10px] font-bold block ${energyRatio >= 100 ? 'text-orange-400' : 'text-red-400'}`}>-{fmt(energyCons)}</span>
                                <span className="text-[8px] text-slate-600 uppercase">Conso.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Jauge d'efficacité style électrique */}
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                        <span>Charge du réseau</span>
                        <span className={energyRatio >= 100 ? 'text-emerald-400' : energyRatio >= 50 ? 'text-orange-400' : 'text-red-400'}>{Math.round(energyPercent)}%</span>
                    </div>
                    <div className="relative h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/10">
                        {/* Graduations */}
                        <div className="absolute inset-0 flex justify-between px-1 items-center">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="w-px h-2 bg-white/20"></div>
                            ))}
                        </div>
                        {/* Barre de progression */}
                        <div
                            className={`h-full transition-all duration-500 relative ${
                                energyRatio >= 100
                                    ? 'bg-gradient-to-r from-emerald-600 via-emerald-400 to-cyan-400'
                                    : energyRatio >= 50
                                        ? 'bg-gradient-to-r from-orange-600 via-orange-400 to-yellow-400'
                                        : 'bg-gradient-to-r from-red-700 via-red-500 to-orange-500'
                            }`}
                            style={{ width: `${Math.min(energyPercent, 100)}%` }}
                        >
                            {/* Effet de brillance animé */}
                            <div className="absolute inset-0 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                            </div>
                            {/* Point lumineux au bout */}
                            <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${energyRatio >= 100 ? 'bg-cyan-400' : energyRatio >= 50 ? 'bg-yellow-400' : 'bg-red-400'} shadow-[0_0_10px_currentColor] animate-pulse`}></div>
                        </div>
                        {/* Glow sous la barre */}
                        <div
                            className={`absolute bottom-0 left-0 h-1 blur-sm transition-all duration-500 ${energyRatio >= 100 ? 'bg-cyan-400' : energyRatio >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(energyPercent, 100)}%` }}
                        ></div>
                    </div>
                </div>

                {/* Alerte si déficit */}
                {energyRatio < 100 && (
                    <div className={`rounded-lg p-3 border flex items-center gap-3 ${energyRatio >= 50 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-red-500/20 border-red-500/50 animate-pulse'}`}>
                        <div className={`p-2 rounded-full ${energyRatio >= 50 ? 'bg-orange-500/20' : 'bg-red-500/30'}`}>
                            <AlertTriangle size={16} className={energyRatio >= 50 ? 'text-orange-400' : 'text-red-400'} />
                        </div>
                        <div>
                            <p className={`text-xs font-bold uppercase ${energyRatio >= 50 ? 'text-orange-400' : 'text-red-400'}`}>
                                {energyRatio >= 50 ? 'Surcharge partielle' : 'Surcharge critique'}
                            </p>
                            <p className="text-[10px] text-slate-400">
                                Production minière réduite de <span className={`font-bold ${energyRatio >= 50 ? 'text-orange-300' : 'text-red-300'}`}>{100 - energyRatio}%</span>
                            </p>
                        </div>
                    </div>
                )}

                {/* Stats compactes en bas */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                    <div className="text-center">
                        <span className="text-[8px] text-slate-600 uppercase block">Centrale</span>
                        <span className="text-yellow-400 font-mono text-xs font-bold">Niv.{getBuildingLevel(planet, 'solar_plant')}</span>
                    </div>
                    <div className="text-center border-x border-white/5">
                        <span className="text-[8px] text-slate-600 uppercase block">Tech. Énergie</span>
                        <span className="text-purple-400 font-mono text-xs font-bold">Niv.{getTechLevel(planet, 'energy_tech')}</span>
                    </div>
                    <div className="text-center">
                        <span className="text-[8px] text-slate-600 uppercase block">Rendement</span>
                        <span className={`font-mono text-xs font-bold ${energyNet >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>{energyNet >= 0 ? '+' : ''}{fmt(energyNet)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* ZAC — Zone Aérienne de Combat */}
        <ZACManager planetId={planet.id} />

        </div>{/* end right column wrapper */}
      </div>

      {/* --- SECTION TACTIQUE MILITAIRE --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CAPACITÉ OFFENSIVE */}
          <Card className="bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 border-2 border-red-500/40 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(239,68,68,0.3)] transition-all duration-500 card-depth animate-fade-in">
              {/* Effets de fond dynamiques */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full blur-3xl opacity-20 bg-red-500 animate-pulse"></div>
                  <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-2xl opacity-15 bg-orange-500 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 group-hover:from-red-500/10 group-hover:to-orange-500/10 transition-all duration-500"></div>
                  <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-400 to-transparent animate-pulse"></div>
                      <div className="absolute top-2/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent animate-pulse" style={{ animationDelay: '0.7s' }}></div>
                  </div>
              </div>

              <CardHeader className="pb-3 relative z-10 border-b border-red-500/20">
                  <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-red-400 flex items-center gap-2 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                          <div className="relative">
                              <Sword size={16} className="animate-pulse" />
                              <Sword size={16} className="absolute inset-0 animate-ping opacity-30" />
                          </div>
                          Puissance Offensive
                      </span>
                      <div className="p-2 rounded-full bg-red-500/20 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                          <TrendingUp size={14} className="text-red-400 animate-pulse" />
                      </div>
                  </div>
              </CardHeader>

              <CardContent className="relative z-10 pt-4">
                  {/* Indicateur principal */}
                  <div className="flex items-end gap-3 mb-6">
                      <span className="text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-br from-red-400 via-red-300 to-orange-400 tracking-tighter drop-shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse">{fmt(totalAtk)}</span>
                      <div className="mb-2">
                          <span className="text-xs font-black text-red-500 uppercase tracking-wider block drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]">Dégâts</span>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">/ Round</span>
                      </div>
                  </div>

                  {/* Stat détaillée */}
                  <div className="bg-black/40 rounded-xl p-4 border border-red-500/30 shadow-inner">
                      <div className="text-[10px] text-slate-400 font-bold uppercase flex justify-between items-center mb-3">
                          <span className="flex items-center gap-1.5">
                              <Target size={12} className="text-red-400" />
                              Armement Niv.{getTechLevel(planet, 'laser_tech')}
                          </span>
                          <span className="text-red-400 font-mono font-black px-2 py-1 bg-red-500/20 rounded-lg border border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.3)] animate-pulse">+{Math.round((atkBonus-1)*100)}% DMG</span>
                      </div>

                      {/* Barre de progression style voltmètre */}
                      <div className="relative h-3 w-full bg-slate-900 rounded-full overflow-hidden border-2 border-red-500/30 shadow-inner">
                          {/* Graduations */}
                          <div className="absolute inset-0 flex justify-between px-1 items-center z-10">
                              {[...Array(10)].map((_, i) => (
                                  <div key={i} className="w-px h-2 bg-white/30"></div>
                              ))}
                          </div>
                          {/* Barre de remplissage */}
                          <div
                              className="absolute inset-0 bg-gradient-to-r from-red-700 via-red-500 to-orange-400 transition-all duration-700"
                              style={{ width: `${Math.min(100, getTechLevel(planet, 'laser_tech') * 8)}%` }}
                          >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                              {/* Point lumineux au bout */}
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.8)] animate-pulse"></div>
                          </div>
                      </div>
                  </div>

                  {/* Stats secondaires */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="bg-black/30 rounded-lg p-2.5 border border-red-500/20">
                          <span className="text-[8px] text-slate-600 uppercase block font-bold tracking-wider mb-0.5">Vaisseaux</span>
                          <span className="text-red-400 font-mono text-sm font-black drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">
                              {fmt(getShipCount(planet, 'light_hunter') * 50 + getShipCount(planet, 'cruiser') * 400)}
                          </span>
                      </div>
                      <div className="bg-black/30 rounded-lg p-2.5 border border-red-500/20">
                          <span className="text-[8px] text-slate-600 uppercase block font-bold tracking-wider mb-0.5">Défenses</span>
                          <span className="text-red-400 font-mono text-sm font-black drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">
                              {fmt(getShipCount(planet, 'rocket_launcher') * 80 + getShipCount(planet, 'plasma_turret') * 3000)}
                          </span>
                      </div>
                  </div>
              </CardContent>
          </Card>

          {/* STRUCTURE & BLINDAGE */}
          <Card className="bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950 border-2 border-emerald-500/40 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all duration-500 card-depth animate-fade-in">
              {/* Effets de fond dynamiques */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full blur-3xl opacity-20 bg-emerald-500 animate-pulse"></div>
                  <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-2xl opacity-15 bg-cyan-500 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 group-hover:from-emerald-500/10 group-hover:to-cyan-500/10 transition-all duration-500"></div>
                  <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse"></div>
                      <div className="absolute top-2/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" style={{ animationDelay: '0.7s' }}></div>
                  </div>
              </div>

              <CardHeader className="pb-3 relative z-10 border-b border-emerald-500/20">
                  <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]">
                          <div className="relative">
                              <ShieldCheck size={16} className="animate-pulse" />
                              <ShieldCheck size={16} className="absolute inset-0 animate-ping opacity-30" />
                          </div>
                          Résistance Totale
                      </span>
                      <div className="p-2 rounded-full bg-emerald-500/20 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                          <Activity size={14} className="text-emerald-400 animate-pulse" />
                      </div>
                  </div>
              </CardHeader>

              <CardContent className="relative z-10 pt-4">
                  {/* Indicateur principal */}
                  <div className="flex items-end gap-3 mb-6">
                      <span className="text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 via-emerald-300 to-cyan-400 tracking-tighter drop-shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-pulse">{fmt(totalHull)}</span>
                      <div className="mb-2">
                          <span className="text-xs font-black text-emerald-500 uppercase tracking-wider block drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]">Points</span>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Coque</span>
                      </div>
                  </div>

                  {/* Stat détaillée */}
                  <div className="bg-black/40 rounded-xl p-4 border border-emerald-500/30 shadow-inner">
                      <div className="text-[10px] text-slate-400 font-bold uppercase flex justify-between items-center mb-3">
                          <span className="flex items-center gap-1.5">
                              <Shield size={12} className="text-emerald-400" />
                              Protection Niv.{getTechLevel(planet, 'armour_tech')}
                          </span>
                          <span className="text-emerald-400 font-mono font-black px-2 py-1 bg-emerald-500/20 rounded-lg border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse">+{Math.round((hullBonus-1)*100)}% HULL</span>
                      </div>

                      {/* Barre de progression style voltmètre */}
                      <div className="relative h-3 w-full bg-slate-900 rounded-full overflow-hidden border-2 border-emerald-500/30 shadow-inner">
                          {/* Graduations */}
                          <div className="absolute inset-0 flex justify-between px-1 items-center z-10">
                              {[...Array(10)].map((_, i) => (
                                  <div key={i} className="w-px h-2 bg-white/30"></div>
                              ))}
                          </div>
                          {/* Barre de remplissage */}
                          <div
                              className="absolute inset-0 bg-gradient-to-r from-emerald-700 via-emerald-500 to-cyan-400 transition-all duration-700"
                              style={{ width: `${Math.min(100, getTechLevel(planet, 'armour_tech') * 8)}%` }}
                          >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                              {/* Point lumineux au bout */}
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse"></div>
                          </div>
                      </div>
                  </div>

                  {/* Stats secondaires */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="bg-black/30 rounded-lg p-2.5 border border-emerald-500/20">
                          <span className="text-[8px] text-slate-600 uppercase block font-bold tracking-wider mb-0.5">Vaisseaux</span>
                          <span className="text-emerald-400 font-mono text-sm font-black drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]">
                              {fmt(getShipCount(planet, 'light_hunter') * 400 + getShipCount(planet, 'cruiser') * 2700)}
                          </span>
                      </div>
                      <div className="bg-black/30 rounded-lg p-2.5 border border-emerald-500/20">
                          <span className="text-[8px] text-slate-600 uppercase block font-bold tracking-wider mb-0.5">Défenses</span>
                          <span className="text-emerald-400 font-mono text-sm font-black drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]">
                              {fmt(getShipCount(planet, 'rocket_launcher') * 200 + getShipCount(planet, 'plasma_turret') * 10000)}
                          </span>
                      </div>
                  </div>
              </CardContent>
          </Card>
      </div>

      {/* INFRASTRUCTURES & RESSOURCES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* INFRASTRUCTURES - Design style Réseau Électrique */}
        <Card className="md:col-span-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-indigo-500/30 backdrop-blur-md relative overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 card-depth animate-slide-up">
            {/* Effets de fond */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 bg-indigo-400 animate-pulse"></div>
                <div className="absolute -left-5 -bottom-5 w-24 h-24 rounded-full blur-2xl opacity-15 bg-purple-400"></div>
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse"></div>
                </div>
            </div>

            <CardHeader className="pb-2 relative z-10">
                <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    <div className="relative">
                        <Hammer size={16} className="text-indigo-400 drop-shadow-[0_0_6px_rgba(99,102,241,0.8)]" />
                    </div>
                    Infrastructures
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-2 relative z-10">
                {[
                    { label: "Mine de Métal", level: getBuildingLevel(planet, 'metal_mine'), icon: Stone, color: "text-orange-400", border: "border-orange-500/30", bg: "bg-orange-500/10" },
                    { label: "Mine de Cristal", level: getBuildingLevel(planet, 'crystal_mine'), icon: Gem, color: "text-cyan-400", border: "border-cyan-500/30", bg: "bg-cyan-500/10" },
                    { label: "Synth. Deutérium", level: getBuildingLevel(planet, 'deuterium_mine'), icon: Droplets, color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10" },
                    { label: "Centrale Solaire", level: getBuildingLevel(planet, 'solar_plant'), icon: Zap, color: "text-yellow-400", border: "border-yellow-500/30", bg: "bg-yellow-500/10" },
                    { label: "Hangar", level: getBuildingLevel(planet, 'hangar'), icon: Warehouse, color: "text-blue-400", border: "border-blue-500/30", bg: "bg-blue-500/10" },
                ].map((mine) => (
                    <div key={mine.label} className={`bg-black/40 border ${mine.border} p-2.5 rounded-lg flex items-center justify-between group hover:${mine.bg} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}>
                        <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className={`p-1.5 rounded-md ${mine.bg} border ${mine.border}`}>
                                <mine.icon size={14} className={`shrink-0 ${mine.color} group-hover:scale-110 transition-transform duration-300`} />
                            </div>
                            <span className="text-[11px] font-bold text-slate-300 truncate">{mine.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className={`text-lg font-black font-mono ${mine.color} drop-shadow-[0_0_8px_currentColor]`}>{mine.level}</span>
                        </div>
                    </div>
                ))}

                {/* Barre de niveau global */}
                <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="flex justify-between text-[9px] uppercase font-bold text-slate-500 mb-1">
                        <span>Niveau d'Industrialisation</span>
                    </div>
                    <div className="relative h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/10">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-600 via-purple-500 to-cyan-400 transition-all duration-500"
                            style={{ width: `${Math.min(100, ((getBuildingLevel(planet, 'metal_mine') + getBuildingLevel(planet, 'crystal_mine') + getBuildingLevel(planet, 'deuterium_mine') + getBuildingLevel(planet, 'solar_plant')) / 80) * 100)}%` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="md:col-span-3 min-w-0">
            <Card className="bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950 border-2 border-emerald-500/40 relative overflow-hidden hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all duration-500 card-depth animate-slide-up">
                {/* Effets de fond animés */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full blur-3xl opacity-20 bg-emerald-500 animate-pulse"></div>
                    <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-2xl opacity-15 bg-cyan-500 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5"></div>
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse"></div>
                        <div className="absolute top-2/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" style={{ animationDelay: '0.7s' }}></div>
                    </div>
                </div>

                <CardHeader className="pb-3 relative z-10 border-b border-emerald-500/20">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]">
                            <div className="relative">
                                <TrendingUp size={18} className="animate-pulse" />
                                <TrendingUp size={18} className="absolute inset-0 animate-ping opacity-30" />
                            </div>
                            Production Industrielle
                        </span>
                        <div className="flex items-center gap-2">
                            {energyRatio < 100 && (
                                <span className="text-[10px] text-red-400 bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/40 flex items-center gap-1.5 font-black shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse">
                                    <AlertTriangle size={10} /> -{100 - energyRatio}%
                                </span>
                            )}
                            <span className="text-xs bg-emerald-500/20 px-3 py-1.5 rounded-lg text-emerald-300 font-mono font-black border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                {energyRatio}% efficacité
                            </span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 relative z-10">
                    {/* Graphique comparatif */}
                    <div className="bg-black/40 rounded-xl p-4 border border-emerald-500/30 shadow-inner backdrop-blur-sm">
                        <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-3 font-bold">Répartition Production /h</div>
                        <div className="space-y-2">
                            {(() => {
                                const maxProd = Math.max(prodMetal, prodCrystal, prodDeut, 1);
                                return (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <Stone size={12} className="text-orange-400 shrink-0 animate-bounce-subtle" />
                                            <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden progress-bar-animated">
                                                <div
                                                    className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all duration-500 animate-gradient"
                                                    style={{ width: `${(prodMetal / maxProd) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-orange-400 font-mono text-xs font-bold w-16 text-right">+{fmt(prodMetal)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Gem size={12} className="text-cyan-400 shrink-0 animate-bounce-subtle" style={{ animationDelay: '0.3s' }} />
                                            <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden progress-bar-animated">
                                                <div
                                                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-500 animate-gradient"
                                                    style={{ width: `${(prodCrystal / maxProd) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-cyan-400 font-mono text-xs font-bold w-16 text-right">+{fmt(prodCrystal)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Droplets size={12} className="text-emerald-400 shrink-0 animate-bounce-subtle" style={{ animationDelay: '0.6s' }} />
                                            <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden progress-bar-animated">
                                                <div
                                                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500 animate-gradient"
                                                    style={{ width: `${(prodDeut / maxProd) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-emerald-400 font-mono text-xs font-bold w-16 text-right">+{fmt(prodDeut)}</span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Détails par ressource */}
                    <div className="grid grid-cols-3 gap-3">
                        {/* Métal */}
                        <div className="bg-gradient-to-b from-orange-950/40 to-slate-900/60 p-3 rounded-xl border-2 border-orange-500/40 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(251,146,60,0.3)] transition-all duration-300 card-depth group/res animate-fade-in relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover/res:opacity-100 transition-opacity"></div>
                            <div className="flex items-center gap-1.5 mb-2">
                                <Stone size={14} className="text-orange-400" />
                                <span className="text-orange-300 font-bold text-xs uppercase">Métal</span>
                            </div>
                            <div className="text-white font-mono font-black text-lg">{fmt(realtimeResources?.metal ?? planet.metal_amount)}</div>
                            <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">Par heure</span>
                                    <span className="text-yellow-400 font-mono font-bold">+{fmt(prodMetal)}</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">Par jour</span>
                                    <span className="text-green-400 font-mono font-bold">+{fmt(prodMetal * 24)}</span>
                                </div>
                            </div>
                            {planet.slot_bonuses?.metal && planet.slot_bonuses.metal !== "+0%" && (
                                <div className="mt-2 text-[9px] text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded text-center">{planet.slot_bonuses.metal} slot</div>
                            )}
                        </div>
                        {/* Cristal */}
                        <div className="bg-gradient-to-b from-cyan-950/40 to-slate-900/60 p-3 rounded-xl border-2 border-cyan-500/40 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-all duration-300 card-depth group/res animate-fade-in relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover/res:opacity-100 transition-opacity"></div>
                            <div className="flex items-center gap-1.5 mb-2">
                                <Gem size={14} className="text-cyan-400" />
                                <span className="text-cyan-300 font-bold text-xs uppercase">Cristal</span>
                            </div>
                            <div className="text-white font-mono font-black text-lg">{fmt(realtimeResources?.crystal ?? planet.crystal_amount)}</div>
                            <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">Par heure</span>
                                    <span className="text-yellow-400 font-mono font-bold">+{fmt(prodCrystal)}</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">Par jour</span>
                                    <span className="text-green-400 font-mono font-bold">+{fmt(prodCrystal * 24)}</span>
                                </div>
                            </div>
                            {planet.slot_bonuses?.crystal && planet.slot_bonuses.crystal !== "+0%" && (
                                <div className="mt-2 text-[9px] text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded text-center">{planet.slot_bonuses.crystal} slot</div>
                            )}
                        </div>
                        {/* Deutérium */}
                        <div className="bg-gradient-to-b from-emerald-950/40 to-slate-900/60 p-3 rounded-xl border-2 border-emerald-500/40 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all duration-300 card-depth group/res animate-fade-in relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover/res:opacity-100 transition-opacity"></div>
                            <div className="flex items-center gap-1.5 mb-2">
                                <Droplets size={14} className="text-emerald-400" />
                                <span className="text-emerald-300 font-bold text-xs uppercase">Deutérium</span>
                            </div>
                            <div className="text-white font-mono font-black text-lg">{fmt(realtimeResources?.deuterium ?? planet.deuterium_amount)}</div>
                            <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">Par heure</span>
                                    <span className="text-yellow-400 font-mono font-bold">+{fmt(prodDeut)}</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">Par jour</span>
                                    <span className="text-green-400 font-mono font-bold">+{fmt(prodDeut * 24)}</span>
                                </div>
                            </div>
                            {planet.slot_bonuses?.deuterium && planet.slot_bonuses.deuterium !== "+0%" && (
                                <div className="mt-2 text-[9px] text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded text-center">{planet.slot_bonuses.deuterium} slot</div>
                            )}
                        </div>
                    </div>

                    {/* Total journalier */}
                    <div className="bg-gradient-to-r from-yellow-950/40 to-emerald-950/40 rounded-xl p-4 border-2 border-yellow-500/30 shadow-inner relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-emerald-500/5 to-cyan-500/5 animate-gradient"></div>
                        <div className="flex items-center justify-between relative z-10">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black flex items-center gap-2">
                                <Sparkles size={12} className="text-yellow-400 animate-pulse" />
                                Production Totale /jour
                            </span>
                            <div className="flex items-center gap-4 text-xs font-mono font-black">
                                <span className="text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.5)]">+{fmt(prodMetal * 24)} M</span>
                                <span className="text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.5)]">+{fmt(prodCrystal * 24)} C</span>
                                <span className="text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]">+{fmt(prodDeut * 24)} D</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* STATIONNEMENT FLOTTE & DEFENSES - REDESIGN STYLE RÉSEAU ÉLECTRIQUE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* HANGAR - Design immersif */}
            <Card className={`bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 ${totalFleet >= hangarCap ? 'border-orange-500/50' : 'border-blue-500/50'} backdrop-blur-md flex flex-col relative overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 card-depth animate-slide-up`}>
                {/* Effets de fond */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute -right-20 -top-20 w-48 h-48 rounded-full blur-3xl opacity-20 ${totalFleet >= hangarCap ? 'bg-orange-400' : 'bg-blue-400'} animate-pulse`}></div>
                    <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-2xl opacity-15 bg-cyan-400"></div>
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse"></div>
                        <div className="absolute top-2/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    </div>
                </div>

                <CardHeader className="pb-2 relative z-10">
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                            <div className="relative">
                                <Rocket size={18} className="text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                {totalFleet > 0 && <Rocket size={18} className="absolute inset-0 text-blue-400 animate-ping opacity-30" />}
                            </div>
                            Baie de Stationnement
                        </span>
                        <span className={`text-[10px] font-black px-2 py-1 rounded-full border flex items-center gap-1 ${totalFleet >= hangarCap ? 'bg-orange-500/20 text-orange-400 border-orange-500/50 animate-pulse' : 'bg-blue-500/20 text-blue-400 border-blue-500/50'}`}>
                            {totalFleet >= hangarCap ? <><AlertTriangle size={10} /> PLEIN</> : <><ShieldCheck size={10} /> DISPONIBLE</>}
                        </span>
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 relative z-10">
                    {/* Indicateur de capacité principal */}
                    <div className="text-center py-2">
                        <div className={`text-4xl font-black font-mono tracking-tighter ${totalFleet >= hangarCap ? 'text-orange-400 animate-pulse' : 'text-blue-400'} drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]`}>
                            {fmt(totalFleet)} <span className="text-xl text-slate-500">/ {fmt(hangarCap)}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Capacité Hangar Niv.{getBuildingLevel(planet, 'hangar')}</div>
                    </div>

                    {/* Jauge de capacité style électrique */}
                    <div className="space-y-2">
                        <div className="relative h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/10">
                            <div className="absolute inset-0 flex justify-between px-1 items-center">
                                {[...Array(10)].map((_, i) => (
                                    <div key={i} className="w-px h-2 bg-white/20"></div>
                                ))}
                            </div>
                            <div
                                className={`h-full transition-all duration-500 relative ${
                                    totalFleet >= hangarCap
                                        ? 'bg-gradient-to-r from-orange-600 via-orange-400 to-red-400'
                                        : totalFleet >= hangarCap * 0.8
                                            ? 'bg-gradient-to-r from-yellow-600 via-yellow-400 to-orange-400'
                                            : 'bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400'
                                }`}
                                style={{ width: `${Math.min((totalFleet / hangarCap) * 100, 100)}%` }}
                            >
                                <div className="absolute inset-0 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                                </div>
                                <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${totalFleet >= hangarCap ? 'bg-red-400' : 'bg-cyan-400'} shadow-[0_0_10px_currentColor] animate-pulse`}></div>
                            </div>
                        </div>
                    </div>

                    {/* Grille des vaisseaux */}
                    <div className="bg-black/40 rounded-xl p-3 border border-white/10">
                        <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-3 font-bold flex items-center gap-2">
                            <Activity size={10} className="text-blue-400" /> Inventaire Flotte
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: "Chasseurs Légers", key: "light_hunter", val: getShipCount(planet, 'light_hunter'), Icon: Target, color: "text-red-400", alwaysShow: true },
                                { label: "Chasseurs Lourds", key: "heavy_hunter", val: getShipCount(planet, 'heavy_hunter'), Icon: Scan, color: "text-orange-400", alwaysShow: false },
                                { label: "Croiseurs", key: "cruiser", val: getShipCount(planet, 'cruiser'), Icon: Ship, color: "text-purple-400", alwaysShow: true },
                                { label: "Vaisseaux de Guerre", key: "battleship", val: getShipCount(planet, 'battleship'), Icon: Sword, color: "text-rose-400", alwaysShow: false },
                                { label: "Destructeurs", key: "destroyer", val: getShipCount(planet, 'destroyer'), Icon: Rocket, color: "text-pink-400", alwaysShow: false },
                                { label: "Bombardiers", key: "bomber", val: getShipCount(planet, 'bomber'), Icon: Zap, color: "text-yellow-400", alwaysShow: false },
                                { label: "Recycleurs", key: "recycler", val: getShipCount(planet, 'recycler'), Icon: Recycle, color: "text-green-400", alwaysShow: true },
                                { label: "Sondes", key: "spy_probe", val: getShipCount(planet, 'spy_probe'), Icon: Satellite, color: "text-cyan-400", alwaysShow: true },
                                { label: "Vaisseaux Colons", key: "colony_ship", val: getShipCount(planet, 'colony_ship'), Icon: Globe, color: "text-emerald-400", alwaysShow: true },
                                { label: "Transporteurs", key: "transporter", val: getShipCount(planet, 'transporter'), Icon: Truck, color: "text-amber-400", alwaysShow: true },
                                { label: "Étoile de la Mort", key: "deathstar", val: getShipCount(planet, 'deathstar'), Icon: Sparkles, color: "text-fuchsia-400", alwaysShow: false },
                            ].filter(item => item.alwaysShow || (item.val || 0) > 0).map(item => (
                                <div key={item.label} className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5 flex items-center justify-between hover:bg-slate-800/60 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 group card-depth">
                                    <div className="flex items-center gap-2">
                                        <item.Icon size={16} className={`${item.color} group-hover:scale-110 transition-transform drop-shadow-[0_0_4px_currentColor]`} />
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{item.label}</span>
                                    </div>
                                    <span className={`font-mono font-black text-sm ${(item.val || 0) > 0 ? 'text-blue-400' : 'text-slate-600'}`}>{fmt(item.val || 0)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* DÉFENSES PLANÉTAIRES - Design immersif */}
            <Card className={`bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 ${totalDefense > 0 ? 'border-red-500/50' : 'border-slate-700/50'} backdrop-blur-md flex flex-col relative overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 card-depth animate-slide-up`}>
                {/* Effets de fond */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute -right-20 -top-20 w-48 h-48 rounded-full blur-3xl opacity-20 ${totalDefense > 0 ? 'bg-red-400 animate-pulse' : 'bg-slate-600'}`}></div>
                    <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-2xl opacity-15 bg-orange-500"></div>
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-400 to-transparent animate-pulse"></div>
                        <div className="absolute top-2/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent animate-pulse" style={{ animationDelay: '0.7s' }}></div>
                    </div>
                </div>

                <CardHeader className="pb-2 relative z-10">
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                            <div className="relative">
                                <Shield size={18} className={`${totalDefense > 0 ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]' : 'text-slate-500'}`} />
                                {totalDefense > 0 && <Shield size={18} className="absolute inset-0 text-red-400 animate-ping opacity-30" />}
                            </div>
                            Bouclier Orbital
                        </span>
                        <span className={`text-[10px] font-black px-2 py-1 rounded-full border flex items-center gap-1 ${totalDefense > 0 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-slate-700/30 text-slate-500 border-slate-600/50'}`}>
                            {totalDefense > 0 ? <><ShieldCheck size={10} /> ACTIF</> : <><AlertTriangle size={10} /> VULNÉRABLE</>}
                        </span>
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 relative z-10">
                    {/* Indicateur de puissance principal */}
                    <div className="text-center py-2">
                        <div className={`text-4xl font-black font-mono tracking-tighter ${totalDefense > 0 ? 'text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.5)]' : 'text-slate-600'}`}>
                            {fmt(totalDefense)}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Systèmes de Défense Actifs</div>
                    </div>

                    {/* Grille des systèmes de défense */}
                    <div className="bg-black/40 rounded-xl p-4 border border-white/10">
                        <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-3 font-bold flex items-center gap-2">
                            <Activity size={10} className="text-red-400" /> Arsenal Défensif
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[
                                { key: 'rocket_launcher', label: '🚀 Lance-Roquettes', color: 'orange' },
                                { key: 'light_laser',     label: '💠 Laser Léger',     color: 'blue' },
                                { key: 'heavy_laser',     label: '⚡ Laser Lourd',     color: 'blue' },
                                { key: 'gauss_cannon',    label: '🔫 Canon Gauss',     color: 'indigo' },
                                { key: 'ion_cannon',      label: '⚛️ Canon Ions',      color: 'purple' },
                                { key: 'plasma_turret',   label: '🌟 Tourelle Plasma', color: 'pink' },
                                { key: 'small_shield',    label: '🛡️ Petit Bouclier',  color: 'cyan' },
                                { key: 'large_shield',    label: '🛡️ Grand Bouclier',  color: 'cyan' },
                                { key: 'antiballistic_missile',    label: '🎯 Anti-Missile', color: 'yellow' },
                                { key: 'interplanetary_missile',   label: '🚀 Missile IP',   color: 'red' },
                            ].map(({ key, label, color }) => {
                                const count = getShipCount(planet, key);
                                const active = count > 0;
                                return (
                                    <div key={key} className={`rounded-lg p-2 border transition-opacity ${active ? 'bg-slate-900/50' : 'bg-slate-900/20 opacity-40'} border-${color}-500/20`}>
                                        <div className={`text-[8px] text-${color}-400 uppercase font-bold mb-1`}>{label}</div>
                                        <div className={`text-lg font-mono font-black ${active ? `text-${color}-400` : 'text-slate-600'}`}>{fmt(count)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Alerte si vulnérable */}
                    {totalDefense === 0 && (
                        <div className="rounded-lg p-3 border flex items-center gap-3 bg-yellow-500/10 border-yellow-500/30">
                            <div className="p-2 rounded-full bg-yellow-500/20">
                                <AlertTriangle size={16} className="text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase text-yellow-400">Planète non protégée</p>
                                <p className="text-[10px] text-slate-400">Construisez des défenses pour protéger vos ressources</p>
                            </div>
                        </div>
                    )}

                    {/* Stats de puissance en bas */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                        <div className="text-center bg-black/30 rounded-lg p-2">
                            <span className="text-[8px] text-slate-600 uppercase block">Dégâts/Round</span>
                            <span className="text-red-400 font-mono text-xs font-bold">
                                {fmt(
                                    (getShipCount(planet, 'rocket_launcher') || 0) * 80 +
                                    (getShipCount(planet, 'light_laser') || 0) * 100 +
                                    (getShipCount(planet, 'heavy_laser') || 0) * 250 +
                                    (getShipCount(planet, 'gauss_cannon') || 0) * 1100 +
                                    (getShipCount(planet, 'ion_cannon') || 0) * 150 +
                                    (getShipCount(planet, 'plasma_turret') || 0) * 3000 +
                                    (getShipCount(planet, 'small_shield') || 0) * 1 +
                                    (getShipCount(planet, 'large_shield') || 0) * 1 +
                                    (getShipCount(planet, 'antiballistic_missile') || 0) * 1 +
                                    (getShipCount(planet, 'interplanetary_missile') || 0) * 12000
                                )}
                            </span>
                        </div>
                        <div className="text-center bg-black/30 rounded-lg p-2">
                            <span className="text-[8px] text-slate-600 uppercase block">Boucliers</span>
                            <span className="text-cyan-400 font-mono text-xs font-bold">
                                {fmt(
                                    (getShipCount(planet, 'rocket_launcher') || 0) * 20 +
                                    (getShipCount(planet, 'light_laser') || 0) * 25 +
                                    (getShipCount(planet, 'heavy_laser') || 0) * 100 +
                                    (getShipCount(planet, 'gauss_cannon') || 0) * 200 +
                                    (getShipCount(planet, 'ion_cannon') || 0) * 500 +
                                    (getShipCount(planet, 'plasma_turret') || 0) * 300 +
                                    (getShipCount(planet, 'small_shield') || 0) * 2000 +
                                    (getShipCount(planet, 'large_shield') || 0) * 10000 +
                                    (getShipCount(planet, 'antiballistic_missile') || 0) * 1 +
                                    (getShipCount(planet, 'interplanetary_missile') || 0) * 1
                                )}
                            </span>
                        </div>
                        <div className="text-center bg-black/30 rounded-lg p-2">
                            <span className="text-[8px] text-slate-600 uppercase block">Points Coque</span>
                            <span className="text-emerald-400 font-mono text-xs font-bold">
                                {fmt(
                                    (getShipCount(planet, 'rocket_launcher') || 0) * 200 +
                                    (getShipCount(planet, 'light_laser') || 0) * 100 +
                                    (getShipCount(planet, 'heavy_laser') || 0) * 800 +
                                    (getShipCount(planet, 'gauss_cannon') || 0) * 3500 +
                                    (getShipCount(planet, 'ion_cannon') || 0) * 800 +
                                    (getShipCount(planet, 'plasma_turret') || 0) * 10000 +
                                    (getShipCount(planet, 'small_shield') || 0) * 20000 +
                                    (getShipCount(planet, 'large_shield') || 0) * 100000 +
                                    (getShipCount(planet, 'antiballistic_missile') || 0) * 800 +
                                    (getShipCount(planet, 'interplanetary_missile') || 0) * 15000
                                )}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
      </div>

      <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600 uppercase tracking-widest mt-8">
            <AlertTriangle size={12} />
            <span>Données limitées au secteur local [{planet.galaxy}:{planet.system}:{planet.position}]</span>
      </div>
    </div>
  );
}