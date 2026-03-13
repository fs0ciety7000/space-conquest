import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from '@/lib/utils';
import {
  Hammer, Microscope, Timer, ArrowUpCircle,
  Warehouse, Zap, Scan, Activity, ChevronRight, TrendingUp, Lock, ShieldCheck, Shield, Package
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
import { GameImage } from '@/components/ui/game-image';
import { getBuildingImage } from '@/lib/images';

interface BuildingRequirement {
  requirement_type: string;
  tech_key?: string;
  tech_name?: string;
  building_key?: string;
  building_name?: string;
  required_level: number;
  current_level: number;
  met: boolean;
}

interface BuildingTypeInfo {
  id: number;
  building_key: string;
  name: string;
  description: string | null;
  base_cost_metal: number;
  base_cost_crystal: number;
  base_cost_deuterium: number;
  base_time_seconds: number;
  cost_multiplier: number;
  current_level: number;
  requirements: BuildingRequirement[];
  next_level_time_seconds?: number;
}

interface FacilitiesProps {
  planet: any;
  onUpgrade: () => void;
}

// --- THÈMES & CONFIGURATION ---
const getFacilityTheme = (type: string) => {
  const themes: Record<string, any> = {
    shipyard: {
      color: "text-cyan-400",
      border: "border-cyan-500/30",
      bg: "bg-cyan-500/10",
      glow: "shadow-cyan-500/20",
      gradient: "from-[rgba(10,5,32,0.85)] to-cyan-950/20",
      icon: Hammer,
      bgIcon: Scan
    },
    armour: {
      color: "text-emerald-400",
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/10",
      gradient: "from-[rgba(10,5,32,0.85)] to-emerald-950/20",
      icon: ShieldCheck,
      bgIcon: Shield
    },
    research: {
      color: "text-fuchsia-400",
      border: "border-fuchsia-500/30",
      bg: "bg-fuchsia-500/10",
      glow: "shadow-fuchsia-500/20",
      gradient: "from-[rgba(10,5,32,0.85)] to-fuchsia-950/20",
      icon: Microscope,
      bgIcon: Activity
    },
    hangar: {
      color: "text-orange-400",
      border: "border-orange-500/30",
      bg: "bg-orange-500/10",
      glow: "shadow-orange-500/20",
      gradient: "from-[rgba(10,5,32,0.85)] to-orange-950/20",
      icon: Warehouse,
      bgIcon: Warehouse
    },
    resource_storage: {
      color: "text-yellow-400",
      border: "border-yellow-500/30",
      bg: "bg-yellow-500/10",
      glow: "shadow-yellow-500/20",
      gradient: "from-[rgba(10,5,32,0.85)] to-yellow-950/20",
      icon: Package,
      bgIcon: Package
    }
  };
  return themes[type] || themes.shipyard;
};

const getFacilityStats = (id: string, level: number) => {
    const next = level + 1;
    switch(id) {
        case 'hangar':
            return { label: "Capacité Flotte", current: (500 + (level * 500)).toLocaleString(), next: (500 + (next * 500)).toLocaleString() };
        case 'shipyard':
            return { label: "Vitesse Constr.", current: `x${1 + level}`, next: `x${1 + next}` };
        case 'research':
            return { label: "Vitesse Recherche", current: `x${1 + level}`, next: `x${1 + next}` };
        case 'armour':
            return { label: "Bonus Structure", current: `+${level * 10}%`, next: `+${next * 10}%` };
        case 'resource_storage': {
            const currentCap = level === 0 ? 600000 : Math.floor(600000 * Math.pow(1.6, level));
            const nextCap = Math.floor(600000 * Math.pow(1.6, next));
            return { label: "Stockage Max", current: (currentCap / 1000).toFixed(0) + "k", next: (nextCap / 1000).toFixed(0) + "k" };
        }
        default:
            return { label: "Niveau", current: level, next: next };
    }
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } }
};
const cardVariant = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

// TODO: callback onUpgrade passé en prop — le parent devrait useCallback pour éviter
// les re-renders inutiles du memo quand la fonction est recréée.
const Facilities = React.memo(function Facilities({ planet, onUpgrade }: FacilitiesProps) {
  const [buildingTypes, setBuildingTypes] = useState<BuildingTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>({
    hangar_capacity_base: 500,
    hangar_capacity_per_level: 500,
    storage_capacity_base: 600000,
    storage_capacity_growth: 1.6,
  });

  // Charger la config serveur
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

  useEffect(() => {
    const fetchBuildingTypes = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(apiUrl(`/planets/${planet.id}/building-types`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          // Filter out resource buildings (mines and solar plant) as they're shown in Resources page
          const filtered = (data.building_types || []).filter((b: BuildingTypeInfo) =>
            !['metal_mine', 'crystal_mine', 'deuterium_mine', 'solar_plant', 'fusion_plant'].includes(b.building_key)
          );
          setBuildingTypes(filtered);
        }
      } catch (e) {
        console.error("Failed to fetch building types:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchBuildingTypes();
  }, [planet.id]);

  // Calculer les stats avec config serveur
  const getConfiguredStats = (id: string, level: number) => {
    const next = level + 1;
    switch(id) {
        case 'hangar': {
            const base = config.hangar_capacity_base || 500;
            const perLevel = config.hangar_capacity_per_level || 500;
            const current = base + (level * perLevel);
            const nextVal = base + (next * perLevel);
            const gain = nextVal - current;
            return { label: "Capacité Flotte", current: current.toLocaleString(), next: nextVal.toLocaleString(), gain: `+${gain.toLocaleString()} vaisseaux` };
        }
        case 'shipyard': {
            const currentReduction = level > 0 ? Math.round((1 - 1/(1 + level)) * 100) : 0;
            const nextReduction = Math.round((1 - 1/(1 + next)) * 100);
            const gain = nextReduction - currentReduction;
            return { label: "Réduction Temps", current: `-${currentReduction}%`, next: `-${nextReduction}%`, gain: `+${gain}% plus rapide` };
        }
        case 'research': {
            const currentReduction = level > 0 ? Math.round((1 - 1/(1 + level)) * 100) : 0;
            const nextReduction = Math.round((1 - 1/(1 + next)) * 100);
            const gain = nextReduction - currentReduction;
            return { label: "Réduction Temps Recherche", current: `-${currentReduction}%`, next: `-${nextReduction}%`, gain: `+${gain}% plus rapide` };
        }
        case 'armour': {
            const currentBonus = level * 10;
            const nextBonus = next * 10;
            return { label: "Bonus Structure Flotte", current: `+${currentBonus}%`, next: `+${nextBonus}%`, gain: `+10% structure` };
        }
        case 'resource_storage': {
            const base = config.storage_capacity_base || 600000;
            const growth = config.storage_capacity_growth || 1.6;
            const currentCap = level === 0 ? base : Math.floor(base * Math.pow(growth, level));
            const nextCap = Math.floor(base * Math.pow(growth, next));
            const gain = nextCap - currentCap;
            return { label: "Stockage Max", current: (currentCap / 1000).toFixed(0) + "k", next: (nextCap / 1000).toFixed(0) + "k", gain: `+${(gain / 1000).toFixed(0)}k capacité` };
        }
        default:
            return { label: "Niveau", current: level.toString(), next: next.toString(), gain: "+1 niveau" };
    }
  };

  const handleUpgrade = async (building_key: string) => {
    const building = buildingTypes.find(b => b.building_key === building_key);
    if (!building) return;

    const hasUnmetRequirements = building.requirements.some(req => !req.met);
    if (hasUnmetRequirements) {
        toast.error("Prérequis technologiques non satisfaits");
        return;
    }

    const token = localStorage.getItem('token');
    const targetLevel = building.current_level + 1;
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/upgrade/${building_key}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        onUpgrade();
        toast.success(`${building.name} amélioré avec succès`);
      } else if (res.status === 409) {
        const category = ['metal_mine', 'crystal_mine', 'deuterium_mine', 'solar_plant', 'fusion_plant'].includes(building_key) ? 'resources' : 'facilities';
        const qRes = await fetch(apiUrl(`/planets/${planet.id}/build-queue`), {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, item_key: building_key, target_level: targetLevel }),
        });
        if (qRes.ok) {
          toast.success(`${building.name} en file d'attente`);
          onUpgrade();
        } else {
          const err = await qRes.json().catch(() => ({}));
          toast.error(err.error || "Erreur lors de la mise en file");
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erreur lors de l'amélioration");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'amélioration");
    }
  };

  const getCost = (building: BuildingTypeInfo) => {
    const level = building.current_level;
    const multiplier = building.cost_multiplier;
    return {
      m: Math.floor(building.base_cost_metal   * Math.pow(multiplier, level)),
      c: Math.floor(building.base_cost_crystal  * Math.pow(multiplier, level)),
      d: Math.floor(building.base_cost_deuterium * Math.pow(multiplier, level))
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400 animate-pulse">Chargement des installations...</div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-6 pb-2 border-b border-cyan-500/10">
        <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
        <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">INSTALLATIONS</span>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {buildingTypes.map((building) => {
          const locked = building.requirements.some(req => !req.met);

          const cost = getCost(building);
          const stats = getConfiguredStats(building.building_key, building.current_level);
          const canAfford = (planet.metal_amount >= cost.m) && (planet.crystal_amount >= cost.c) && (planet.deuterium_amount >= cost.d);
          const theme = getFacilityTheme(building.building_key);
          const Icon = theme.icon;
          const BgIcon = theme.bgIcon;

          return (
            <motion.div key={building.id} variants={cardVariant}>
            <Card className={`relative overflow-hidden border-t-4 h-full ${locked ? 'border-red-900/50 opacity-50 cursor-not-allowed' : theme.border} bg-gradient-to-b ${theme.gradient} backdrop-blur-[12px] shadow-2xl group transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/30 hover:bg-cyan-500/5 hover:shadow-[0_0_15px_rgba(0,245,255,0.1)] card-depth card-depth-hover`}>
               <div className="absolute inset-0 bg-gradient-to-r from-[rgba(10,5,32,0.85)] to-transparent z-0"></div>
               <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-50 group-hover:opacity-100 transition-all duration-300"></div>
               <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-15 transition-all duration-500 pointer-events-none group-hover:animate-float">
                  <BgIcon size={150} className={theme.color} />
               </div>
               <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <CardContent className="p-6 relative z-10 flex flex-col h-full justify-between">
                {/* Image du bâtiment */}
                <GameImage
                  src={getBuildingImage(building.building_key)}
                  alt={building.name}
                  className="w-full h-40 mb-4"
                  fallbackIcon={<Icon className={`${theme.color} w-20 h-20`} />}
                  loading="lazy"
                />

                <div>
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg border ${locked ? 'border-red-500/30 bg-red-500/10 text-red-500' : `${theme.border} bg-black/20 ${theme.color}`} group-hover:text-slate-200 group-hover:bg-white/10 transition-all group-hover:scale-110 duration-300`}>
                              {locked ? <Lock size={24} className="animate-pulse" /> : <Icon size={24} />}
                          </div>
                          <div>
                              <h3 className="text-lg font-black uppercase tracking-wider text-slate-200">{building.name}</h3>
                              <p className="text-xs text-slate-400 h-4 leading-tight">{building.description || ""}</p>
                          </div>
                      </div>
                      <Badge variant={locked ? "secondary" : "default"} className="font-mono">
                        Nv.{building.current_level}
                      </Badge>
                  </div>

                  {/* STATS DYNAMIQUES */}
                  {!locked && (
                      <div className="mb-4 p-3 bg-black/30 rounded border border-cyan-500/10">
                          <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                                  <TrendingUp size={12} className={`${theme.color} animate-bounce-subtle`} />
                                  <span>{stats.label}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-mono">
                                  <span className="text-slate-400">{stats.current}</span>
                                  <ChevronRight size={12} className="text-slate-600" />
                                  <span className={`${theme.color} font-bold animate-scale-pulse`}>{stats.next}</span>
                              </div>
                          </div>
                          {/* Gain de l'amélioration */}
                          <div className="bg-green-950/30 border border-green-500/20 rounded px-2 py-1.5 flex items-center justify-between">
                              <span className="text-[9px] uppercase font-bold text-green-400/70">Gain</span>
                              <span className="text-xs font-mono font-bold text-emerald-400">{stats.gain}</span>
                          </div>
                      </div>
                  )}

                  {/* TEMPS DE CONSTRUCTION */}
                  {!locked && (
                      <div className="mb-4 p-2 bg-black/30 rounded border border-cyan-500/10 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                              <Timer size={12} className={theme.color} />
                              <span>Temps Construction</span>
                          </div>
                          <div className="text-xs font-mono tabular-nums text-cyan-400 font-bold">
                              {formatDuration(building.next_level_time_seconds || building.base_time_seconds)}
                          </div>
                      </div>
                  )}

                  {/* PRÉREQUIS SI VERROUILLÉ */}
                  {locked && building.requirements.length > 0 && (
                    <div className="mb-4 p-3 bg-red-950/20 rounded border border-red-500/20 space-y-1">
                        <p className="text-[9px] uppercase font-black text-red-500 tracking-tighter mb-2">Transmissions cryptées - Requis :</p>
                        {building.requirements.map((req, i) => {
                          const label = req.requirement_type === 'tech'
                            ? `${req.tech_name} (Nv.${req.required_level})`
                            : `${req.building_name} (Nv.${req.required_level})`;
                          return (
                            <div key={i} className="flex items-center justify-between text-[10px] font-mono">
                                <span className={req.met ? "text-emerald-400" : "text-red-400"}>
                                  {label} [{req.current_level}/{req.required_level}]
                                </span>
                                {req.met ? <Zap size={10} className="text-emerald-400" /> : <Lock size={10} className="text-red-600" />}
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Grille Coûts */}
                  <div className="grid grid-cols-3 gap-2 mb-6">
                      <div className={`p-2 rounded bg-black/40 border border-cyan-500/10 text-xs font-mono tabular-nums flex flex-col items-center ${planet.metal_amount < cost.m ? 'text-red-500 border-red-900/50' : 'text-orange-400'}`}>
                          <span className="uppercase text-[9px] text-slate-500 font-bold mb-1">Métal</span>
                          {Math.floor(cost.m).toLocaleString()}
                      </div>
                      <div className={`p-2 rounded bg-black/40 border border-cyan-500/10 text-xs font-mono tabular-nums flex flex-col items-center ${planet.crystal_amount < cost.c ? 'text-red-500 border-red-900/50' : 'text-cyan-400'}`}>
                          <span className="uppercase text-[9px] text-slate-500 font-bold mb-1">Cristal</span>
                          {Math.floor(cost.c).toLocaleString()}
                      </div>
                      <div className={`p-2 rounded bg-black/40 border border-cyan-500/10 text-xs font-mono tabular-nums flex flex-col items-center ${planet.deuterium_amount < cost.d ? 'text-red-500 border-red-900/50' : 'text-emerald-400'}`}>
                          <span className="uppercase text-[9px] text-slate-500 font-bold mb-1">Deut.</span>
                          {Math.floor(cost.d).toLocaleString()}
                      </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleUpgrade(building.building_key)}
                  disabled={locked || !canAfford}
                  className={`w-full font-black uppercase tracking-widest transition-all duration-200 ${
                      locked
                          ? 'bg-[rgba(10,5,32,0.85)] text-slate-600 border border-red-900/20 cursor-not-allowed'
                          : !canAfford
                              ? 'bg-red-950/20 border border-red-900/50 text-red-500 cursor-not-allowed'
                              : `bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 hover:border-cyan-500/30 text-cyan-400 hover:shadow-[0_0_15px_rgba(0,245,255,0.1)]`
                  }`}
                >
                  {locked ? (
                      "Accès Refusé"
                  ) : !canAfford ? (
                      "Ressources Insuffisantes!"
                  ) : (
                      <span className="flex items-center gap-2"><ArrowUpCircle size={16} /> Améliorer</span>
                  )}
                </Button>

              </CardContent>
            </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
});

export default Facilities;
