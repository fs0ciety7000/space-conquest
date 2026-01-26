import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Hammer, Microscope, Timer, ArrowUpCircle,
  Warehouse, Zap, Scan, Activity, ChevronRight, TrendingUp, Lock, ShieldCheck, Shield, Package
} from "lucide-react";
import { useState, useEffect } from "react";
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
      border: "border-cyan-500/50",
      bg: "bg-cyan-500/10",
      glow: "shadow-cyan-500/20",
      gradient: "from-slate-950 to-cyan-950/20",
      icon: Hammer,
      bgIcon: Scan
    },
    armour: {
  color: "text-emerald-400",
  border: "border-emerald-500/50",
  bg: "bg-emerald-500/10",
  icon: ShieldCheck, // Importe ShieldCheck de lucide-react
  bgIcon: Shield
},
    research: {
      color: "text-fuchsia-400",
      border: "border-fuchsia-500/50",
      bg: "bg-fuchsia-500/10",
      glow: "shadow-fuchsia-500/20",
      gradient: "from-slate-950 to-fuchsia-950/20",
      icon: Microscope,
      bgIcon: Activity
    },
    hangar: {
      color: "text-orange-400",
      border: "border-orange-500/50",
      bg: "bg-orange-500/10",
      glow: "shadow-orange-500/20",
      gradient: "from-slate-950 to-orange-950/20",
      icon: Warehouse,
      bgIcon: Warehouse
    },
    resource_storage: {
      color: "text-yellow-400",
      border: "border-yellow-500/50",
      bg: "bg-yellow-500/10",
      glow: "shadow-yellow-500/20",
      gradient: "from-slate-950 to-yellow-950/20",
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
        case 'resource_storage':
            const currentCap = level === 0 ? 600000 : Math.floor(600000 * Math.pow(1.6, level));
            const nextCap = Math.floor(600000 * Math.pow(1.6, next));
            return { label: "Stockage Max", current: (currentCap / 1000).toFixed(0) + "k", next: (nextCap / 1000).toFixed(0) + "k" };
        default:
            return { label: "Niveau", current: level, next: next };
    }
};

export default function Facilities({ planet, onUpgrade }: FacilitiesProps) {
  const [now, setNow] = useState(new Date().getTime());
  const [buildingTypes, setBuildingTypes] = useState<BuildingTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date().getTime()), 1000);
    return () => clearInterval(interval);
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

  const handleUpgrade = async (building_key: string) => {
    const building = buildingTypes.find(b => b.building_key === building_key);
    if (!building) return;

    // Check tech requirements
    const hasUnmetRequirements = building.requirements.some(req => !req.met);
    if (hasUnmetRequirements) {
        toast.error("Prérequis technologiques non satisfaits");
        return;
    }

    const token = localStorage.getItem('token');
    try {
      await fetch(apiUrl(`/planets/${planet.id}/upgrade/${building_key}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      onUpgrade();
      toast.success(`${building.name} amélioré avec succès`);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'amélioration");
    }
  };

  const getCost = (building: BuildingTypeInfo) => {
    const level = building.current_level;
    const multiplier = building.cost_multiplier;
    return {
      m: Math.floor(building.base_cost_metal * Math.pow(multiplier, level)),
      c: Math.floor(building.base_cost_crystal * Math.pow(multiplier, level)),
      d: Math.floor(building.base_cost_deuterium * Math.pow(multiplier, level))
    };
  };

  const queue = planet.constructions || [];
  const shipBuilds = planet.ship_builds || [];
  const defenseBuilds = planet.defense_builds || [];
  const isQueueFull = queue.length + shipBuilds.length + defenseBuilds.length >= 3;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400 animate-pulse">Chargement des installations...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500 pb-20">
      {buildingTypes.map((building) => {
        // Check if requirements are met
        const locked = building.requirements.some(req => !req.met);

        const activeItem = queue.find((q: any) => q.building_type === building.building_key);
        const timeLeft = activeItem ? Math.max(0, Math.floor((new Date(activeItem.end_time + "Z").getTime() - now) / 1000)) : null;
        const cost = getCost(building);
        const stats = getFacilityStats(building.building_key, building.current_level);
        const canAfford = (planet.metal_amount >= cost.m) && (planet.crystal_amount >= cost.c) && (planet.deuterium_amount >= cost.d);
        const theme = getFacilityTheme(building.building_key);
        const Icon = theme.icon;
        const BgIcon = theme.bgIcon;

        return (
          <Card key={building.id} className={`relative overflow-hidden border-t-4 ${locked ? 'border-red-900/50 grayscale-[0.5]' : theme.border} bg-gradient-to-b ${theme.gradient} shadow-2xl group hover:-translate-y-2 hover:shadow-3xl transition-all duration-500 hover-scale card-depth card-depth-hover animate-slide-up`}>
             <div className="absolute inset-0 bg-gradient-to-r from-slate-950 to-transparent z-0"></div>
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
                        <div className={`p-3 rounded-lg border ${locked ? 'border-red-500/30 bg-red-500/10 text-red-500' : `${theme.border} bg-black/20 ${theme.color}`} group-hover:text-white group-hover:bg-white/10 transition-all group-hover:scale-110 duration-300`}>
                            {locked ? <Lock size={24} className="animate-pulse" /> : <Icon size={24} />}
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-wider text-white">{building.name}</h3>
                            <p className="text-xs text-slate-400 h-4 leading-tight">{building.description || ""}</p>
                        </div>
                    </div>
                    <span className={`text-2xl font-black font-mono ${locked ? 'text-red-500/50' : theme.color} opacity-80`}>Nv.{building.current_level}</span>
                </div>

                {/* STATS DYNAMIQUES */}
                {!locked && (
                    <div className="mb-4 p-2 bg-black/30 rounded border border-white/5 flex items-center justify-between glass-card">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                            <TrendingUp size={12} className={`${theme.color} animate-bounce-subtle`} />
                            <span>{stats.label}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="text-slate-300">{stats.current}</span>
                            <ChevronRight size={12} className="text-slate-600" />
                            <span className={`${theme.color} font-bold animate-scale-pulse`}>{stats.next}</span>
                        </div>
                    </div>
                )}

                {/* TEMPS DE CONSTRUCTION */}
                {!locked && (
                    <div className="mb-4 p-2 bg-black/30 rounded border border-white/5 flex items-center justify-between glass-card">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                            <Timer size={12} className={`${theme.color}`} />
                            <span>Temps Construction</span>
                        </div>
                        <div className="text-xs font-mono text-slate-300">
                            {(() => {
                              const timeSeconds = building.next_level_time_seconds || building.base_time_seconds;
                              const minutes = Math.floor(timeSeconds / 60);
                              const seconds = timeSeconds % 60;
                              return `${minutes}m ${seconds}s`;
                            })()}
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
                              <span className={req.met ? "text-green-500" : "text-red-400"}>
                                {label} [{req.current_level}/{req.required_level}]
                              </span>
                              {req.met ? <Zap size={10} className="text-green-500" /> : <Lock size={10} className="text-red-600" />}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Grille Coûts */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className={`p-2 rounded bg-black/40 border border-white/5 text-xs font-mono flex flex-col items-center ${planet.metal_amount < cost.m ? 'text-red-500 border-red-900/50' : 'text-slate-300'}`}>
                        <span className="uppercase text-[9px] text-slate-500 font-bold mb-1">Métal</span>
                        {Math.floor(cost.m).toLocaleString()}
                    </div>
                    <div className={`p-2 rounded bg-black/40 border border-white/5 text-xs font-mono flex flex-col items-center ${planet.crystal_amount < cost.c ? 'text-red-500 border-red-900/50' : 'text-slate-300'}`}>
                        <span className="uppercase text-[9px] text-slate-500 font-bold mb-1">Cristal</span>
                        {Math.floor(cost.c).toLocaleString()}
                    </div>
                    <div className={`p-2 rounded bg-black/40 border border-white/5 text-xs font-mono flex flex-col items-center ${planet.deuterium_amount < cost.d ? 'text-red-500 border-red-900/50' : 'text-slate-300'}`}>
                        <span className="uppercase text-[9px] text-slate-500 font-bold mb-1">Deut.</span>
                        {Math.floor(cost.d).toLocaleString()}
                    </div>
                </div>
              </div>

              <Button
                onClick={() => handleUpgrade(building.building_key)}
                disabled={locked || !!activeItem || isQueueFull || !canAfford}
                className={`w-full font-black uppercase tracking-widest transition-all duration-500 ${
                    activeItem
                        ? 'bg-indigo-900/50 border border-indigo-500 text-indigo-300 animate-pulse'
                        : locked
                            ? 'bg-slate-900 text-slate-600 border border-red-900/20 cursor-not-allowed'
                            : isQueueFull
                                ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                                : !canAfford
                                    ? 'bg-red-950/20 border border-red-900/50 text-red-500 cursor-not-allowed'
                                    : `bg-gradient-to-r from-indigo-950/60 to-purple-950/60 hover:from-indigo-900/80 hover:to-purple-900/80 border border-indigo-500/50 hover:border-cyan-400/80 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)]`
                }`}
              >
                {activeItem ? (
                    <span className="flex items-center gap-2"><Timer size={16} className="animate-spin" /> En cours: {timeLeft}s</span>
                ) : locked ? (
                    "Accès Refusé"
                ) : isQueueFull ? (
                    "File Pleine (3/3)"
                ) : !canAfford ? (
                    "Ressources Insuffisantes!"
                ) : (
                    <span className="flex items-center gap-2"><ArrowUpCircle size={16} /> Améliorer</span>
                )}
              </Button>

            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}