import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Hammer, Microscope, Timer, ArrowUpCircle, 
  Warehouse, Zap, Scan, Activity, ChevronRight, TrendingUp, Lock, ShieldCheck, Shield 
} from "lucide-react";
import { useState, useEffect } from "react";
import { checkPrerequisites } from "@/lib/gameRules"; // Importation de ta règle
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
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
            return { label: "Bonus Structure", current: `+${level * 10}%`, next: `+${next * 10}%` }; // Nouveau label
        default:
            return { label: "Niveau", current: level, next: next };
    }
};

export default function Facilities({ planet, onUpgrade }: FacilitiesProps) {
  const [now, setNow] = useState(new Date().getTime());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date().getTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleUpgrade = async (type: string) => {
    // Sécurité supplémentaire côté client
    const { locked } = checkPrerequisites(planet, type);
    if (locked) {
        toast.error("Données technologiques manquantes");
        return;
    }

    const token = localStorage.getItem('token');
    try {
      await fetch(apiUrl(`/planets/${planet.id}/upgrade/${type}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      onUpgrade();
    } catch (e) { console.error(e); }
  };

  const getCost = (type: string, lv: number) => {
    const factor = Math.pow(2, lv);
    if (type === 'shipyard') return { m: 400 * factor, c: 200 * factor, d: 100 * factor };
    if (type === 'research') return { m: 200 * factor, c: 400 * factor, d: 200 * factor };
    if (type === 'hangar') return { m: 500 * factor, c: 250 * factor, d: 100 * factor };
    if (type === 'armour') return { m: 1000 * factor, c: 0, d: 0 };
    return { m: 0, c: 0, d: 0 };
  };

  const facilities = [
    { id: 'shipyard', name: 'Chantier Spatial', lv: planet.shipyard_level ?? 0, desc: "Permet la construction de vaisseaux et défenses." },
    { id: 'research', name: 'Labo de Recherche', lv: planet.research_lab_level ?? 0, desc: "Nécessaire pour débloquer de nouvelles technologies." },
    { id: 'hangar', name: 'Hangar à Vaisseaux', lv: planet.hangar_level ?? 0, desc: "Augmente la capacité de stockage de la flotte." },
    { id: 'armour', name: 'Technologie de Protection', lv: planet.armour_tech_level ?? 0, desc: "Augmente la coque des vaisseaux de 10% par niveau." },
  ];

  const queue = planet.constructions || [];
  const isQueueFull = queue.length >= 3;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500 pb-20">
      {facilities.map((fac) => {
        // Utilisation de ta fonction de prérequis
        const { locked, requirements } = checkPrerequisites(planet, fac.id);
        
        const activeItem = queue.find((q: any) => q.building_type === fac.id);
        const timeLeft = activeItem ? Math.max(0, Math.floor((new Date(activeItem.end_time + "Z").getTime() - now) / 1000)) : null;
        const cost = getCost(fac.id, fac.lv);
        const stats = getFacilityStats(fac.id, fac.lv);
        const canAfford = (planet.metal_amount >= cost.m) && (planet.crystal_amount >= cost.c) && (planet.deuterium_amount >= cost.d);
        const theme = getFacilityTheme(fac.id);
        const Icon = theme.icon;
        const BgIcon = theme.bgIcon;

        return (
          <Card key={fac.id} className={`relative overflow-hidden border-t-4 ${locked ? 'border-red-900/50 grayscale-[0.5]' : theme.border} bg-gradient-to-b ${theme.gradient} shadow-2xl group hover:-translate-y-2 hover:shadow-3xl transition-all duration-500 hover-scale card-depth card-depth-hover animate-slide-up`}>
             <div className="absolute inset-0 bg-gradient-to-r from-slate-950 to-transparent z-0"></div>
             <div className="absolute top-0 inset-x-0 h-px bg-white/10 opacity-50 group-hover:bg-white/60 transition-all duration-300 animate-shine"></div>
             <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-15 transition-all duration-500 pointer-events-none group-hover:animate-float">
                <BgIcon size={150} className={theme.color} />
             </div>
             <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <CardContent className="p-6 relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg border ${locked ? 'border-red-500/30 bg-red-500/10 text-red-500' : `${theme.border} bg-black/20 ${theme.color}`} group-hover:text-white group-hover:bg-white/10 transition-all group-hover:scale-110 duration-300`}>
                            {locked ? <Lock size={24} className="animate-pulse" /> : <Icon size={24} />}
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-wider text-white">{fac.name}</h3>
                            <p className="text-xs text-slate-400 h-4 leading-tight">{fac.desc}</p>
                        </div>
                    </div>
                    <span className={`text-2xl font-black font-mono ${locked ? 'text-red-500/50' : theme.color} opacity-80`}>Nv.{fac.lv}</span>
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

                {/* PRÉREQUIS SI VERROUILLÉ */}
                {locked && (
                  <div className="mb-4 p-3 bg-red-950/20 rounded border border-red-500/20 space-y-1">
                      <p className="text-[9px] uppercase font-black text-red-500 tracking-tighter mb-2">Transmissions cryptées - Requis :</p>
                      {requirements.map((req, i) => (
                          <div key={i} className="flex items-center justify-between text-[10px] font-mono">
                              <span className={req.met ? "text-green-500" : "text-red-400"}>{req.label}</span>
                              {req.met ? <Zap size={10} className="text-green-500" /> : <Lock size={10} className="text-red-600" />}
                          </div>
                      ))}
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
                onClick={() => handleUpgrade(fac.id)}
                disabled={locked || (isQueueFull && !activeItem) || !canAfford}
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