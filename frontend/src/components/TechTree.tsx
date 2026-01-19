import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Target, Atom, Microscope, Cpu, ArrowUpCircle, Sparkles, Eye, ScanLine, Lock, Loader2, AlertTriangle, ChevronRight, Box, Gem, Droplets, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from '@/config/api';
// --- CONFIGURATION VISUELLE (Design Riche) ---
const getTechConfig = (id: string, level: number) => {
  const tier = Math.floor(level / 5) + 1; 
  const configs: any = {
    research: { color: "text-purple-400", border: "border-purple-500/40", glow: "shadow-[0_0_20px_-5px_rgba(168,85,247,0.5)]", bg: "bg-purple-950/10", icon: Microscope, tierLabel: "LAB-OS", subIcon: Atom },
    energy_tech: { color: "text-yellow-400", border: "border-yellow-500/40", glow: "shadow-[0_0_20px_-5px_rgba(250,204,21,0.5)]", bg: "bg-yellow-950/10", icon: Zap, tierLabel: "CORE-REACT", subIcon: Sparkles },
    laser: { color: "text-red-400", border: "border-red-500/40", glow: "shadow-[0_0_20px_-5px_rgba(248,113,113,0.5)]", bg: "bg-red-950/10", icon: Target, tierLabel: "WEAPON-SYS", subIcon: Cpu },
    espionage: { color: "text-emerald-400", border: "border-emerald-500/40", glow: "shadow-[0_0_20px_-5px_rgba(52,211,153,0.5)]", bg: "bg-emerald-950/10", icon: Eye, tierLabel: "INTEL-NET", subIcon: ScanLine }
  };
  return { tier: `MK ${tier}`, ...configs[id] };
};

// --- LOGIQUE DES BONUS ---
const getBonusInfo = (id: string, level: number) => {
    const next = level + 1;
    switch(id) {
        case 'research': return { label: "Vitesse R&D", current: `${(1 + level) * 100}%`, next: `${(1 + next) * 100}%`, desc: "Accélère le développement technologique." };
        case 'energy_tech': return { label: "Output Énergie", current: `+${level * 5}%`, next: `+${next * 5}%`, desc: "Augmente la production des mines." };
        case 'laser': return { label: "Puissance Feu", current: `+${level * 10}%`, next: `+${next * 10}%`, desc: "Bonus de dégâts pour toute la flotte." };
        case 'espionage': return { label: "Niveau Scan", current: `Niv. ${level}`, next: `Niv. ${next}`, desc: "Permet de voir les détails ennemis." };
        default: return { label: "Bonus", current: "-", next: "-", desc: "Amélioration standard." };
    }
};

// --- COÛTS ---
const getCost = (type: string, level: number) => {
    const factor = Math.pow(2, level - 1);
    switch(type) {
        case 'research': return { m: 200 * factor, c: 400 * factor, d: 200 * factor };
        case 'energy_tech': return { m: 0, c: 800 * factor, d: 400 * factor };
        case 'laser': return { m: 1500 * factor, c: 500 * factor, d: 100 * factor };
        case 'espionage': return { m: 200 * factor, c: 1000 * factor, d: 200 * factor };
        default: return { m: 0, c: 0, d: 0 };
    }
};

export default function TechTree({ planet, onUpdate }: { planet: any, onUpdate: () => void }) {
  // Timer unique pour rafraîchir l'affichage toutes les secondes
  const [now, setNow] = useState(new Date().getTime());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date().getTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleResearch = async (type: string) => {
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/upgrade/${type}`), { 
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) onUpdate();
    } catch (e) { console.error(e); }
  };

  const techs = [
    { id: 'research', name: 'Labo de Recherche', lv: planet.research_lab_level ?? 0 },
    { id: 'energy_tech', name: 'Technologie Énergie', lv: planet.energy_tech_level ?? 0 },
    { id: 'laser', name: 'Batterie Laser', lv: planet.laser_battery_level ?? 0 },
    { id: 'espionage', name: 'Tech. Espionnage', lv: planet.espionage_tech_level ?? 0 }
  ];

  // --- LOGIQUE FILE D'ATTENTE MULTIPLE ---
  const queue = planet.constructions || [];
  const isQueueFull = queue.length >= 3;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* HEADER (Design Riche) */}
      <header className="relative pl-6 py-2 overflow-hidden rounded-r-xl border-l-4 border-purple-500 bg-gradient-to-r from-purple-900/20 to-transparent">
        <div className="absolute -left-2 top-0 bottom-0 w-1 bg-purple-400 blur-[2px]"></div>
        <div className="flex items-center gap-3">
            <Atom className={`text-purple-400 animate-spin-slow`} size={32} />
            <div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                    Centre de <span className="text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">R&D</span>
                </h2>
                {/* Affichage des slots utilisés */}
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${isQueueFull ? 'border-red-500/50 bg-red-950/30 text-red-400' : 'border-purple-500/50 bg-purple-950/30 text-purple-400'}`}>
                        SLOTS UTILISÉS : {queue.length} / 3
                    </span>
                </div>
            </div>
        </div>
      </header>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {techs.map(t => {
          const style = getTechConfig(t.id, t.lv);
          const Icon = style.icon;
          const SubIcon = style.subIcon;
          
          // --- LOGIQUE ITEM ACTIF ---
          // On cherche si CETTE technologie est dans la file
          const activeItem = queue.find((q: any) => q.building_type === t.id);
          const timeLeft = activeItem ? Math.max(0, Math.floor((new Date(activeItem.end_time + "Z").getTime() - now) / 1000)) : null;
          const isResearchingThis = activeItem !== undefined;

          const cost = getCost(t.id, t.lv + 1);
          const bonus = getBonusInfo(t.id, t.lv);
          const canAfford = planet.metal_amount >= cost.m && planet.crystal_amount >= cost.c && planet.deuterium_amount >= cost.d;
          
          return (
            <Card key={t.id} className={`bg-slate-950 border-t-4 ${style.border} group relative overflow-hidden transition-all duration-500 hover-scale card-depth card-depth-hover animate-slide-up ${!isResearchingThis ? 'hover:-translate-y-2 hover:shadow-3xl' : 'animate-glow-pulse'}`}>

              <div className={`absolute inset-0 ${style.bg} opacity-20 group-hover:opacity-30 transition-opacity`}></div>
              <div className={`absolute top-0 inset-x-0 h-px ${style.glow} ${isResearchingThis ? 'opacity-100 animate-pulse' : 'opacity-60 group-hover:opacity-100'} transition-all duration-300 animate-shine`}></div>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <CardContent className="pt-6 px-6 pb-6 space-y-6 relative z-10 flex flex-col h-full justify-between">
                
                {/* --- HEADER CARTE --- */}
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                            <div className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${style.color}`}>
                                <SubIcon size={10} /> {style.tierLabel}
                            </div>
                            <h3 className="text-lg font-black uppercase text-white italic tracking-wide break-words leading-none">{t.name}</h3>
                        </div>
                        <div className={`p-3 rounded-xl bg-black/50 border border-white/5 ${style.glow} ${isResearchingThis ? 'animate-pulse' : ''} group-hover:scale-110 transition-transform duration-300`}>
                            <Icon size={24} className={`${style.color} ${isResearchingThis ? 'animate-spin-slow' : ''}`} />
                        </div>
                    </div>

                    {/* Niveau et Progression (Design Riche) */}
                    <div className="mb-4">
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className={`text-4xl font-mono font-black ${isResearchingThis ? 'text-yellow-400' : 'text-white'}`}>
                                {t.lv}
                            </span>
                            <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Niveau</span>
                        </div>
                        <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden progress-bar-animated">
                            <div className={`h-full ${isResearchingThis ? 'w-full animate-progress-indeterminate bg-yellow-500 animate-glow-pulse' : 'w-[40%] ' + style.color.replace('text-', 'bg-') + ' animate-gradient'} opacity-80`}></div>
                        </div>
                    </div>

                    {/* --- BONUS INFO (Design Riche) --- */}
                    <div className="bg-black/40 border border-white/5 rounded-lg p-3 mb-4 glass-card">
                         <div className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-500 mb-2">
                            <TrendingUp size={12} className={`${style.color} animate-bounce-subtle`} /> Effet : {bonus.label}
                         </div>
                         <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-400">{bonus.current}</span>
                            <ChevronRight size={12} className="text-slate-600" />
                            <span className="text-green-400 font-bold drop-shadow-[0_0_5px_rgba(74,222,128,0.5)] animate-scale-pulse">{bonus.next}</span>
                         </div>
                         <p className="text-[9px] text-slate-500 mt-2 italic leading-tight">{bonus.desc}</p>
                    </div>

                    {/* --- COÛTS (Visibles si pas en cours) --- */}
                    {!isResearchingThis && (
                        <div className="space-y-1.5 mb-2">
                            <div className="text-[9px] font-black uppercase text-slate-600 mb-1">Coût Recherche</div>
                            {cost.m > 0 && (<div className={`flex justify-between items-center bg-black/30 px-2 py-1 rounded border ${planet.metal_amount >= cost.m ? 'border-white/5' : 'border-red-900/50'}`}><span className="flex items-center gap-1 text-[9px] text-slate-500 uppercase font-bold"><Box size={10}/> Métal</span><span className={`text-[10px] font-mono font-bold ${planet.metal_amount >= cost.m ? 'text-slate-300' : 'text-red-500'}`}>{Math.floor(cost.m).toLocaleString()}</span></div>)}
                            {cost.c > 0 && (<div className={`flex justify-between items-center bg-black/30 px-2 py-1 rounded border ${planet.crystal_amount >= cost.c ? 'border-white/5' : 'border-red-900/50'}`}><span className="flex items-center gap-1 text-[9px] text-slate-500 uppercase font-bold"><Gem size={10}/> Cristal</span><span className={`text-[10px] font-mono font-bold ${planet.crystal_amount >= cost.c ? 'text-slate-300' : 'text-red-500'}`}>{Math.floor(cost.c).toLocaleString()}</span></div>)}
                            {cost.d > 0 && (<div className={`flex justify-between items-center bg-black/30 px-2 py-1 rounded border ${planet.deuterium_amount >= cost.d ? 'border-white/5' : 'border-red-900/50'}`}><span className="flex items-center gap-1 text-[9px] text-slate-500 uppercase font-bold"><Droplets size={10}/> Deut.</span><span className={`text-[10px] font-mono font-bold ${planet.deuterium_amount >= cost.d ? 'text-slate-300' : 'text-red-500'}`}>{Math.floor(cost.d).toLocaleString()}</span></div>)}
                        </div>
                    )}
                </div>

                {/* --- BOUTONS D'ACTION (Logique Multi-files + Design Riche Swipe) --- */}
                <div className="mt-auto">
                    {isResearchingThis ? (
                        // Timer si c'est CETTE recherche
                        <Button disabled className="w-full h-12 bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 font-mono font-bold animate-pulse">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span className="text-[10px] uppercase tracking-widest">
                                {timeLeft === 0 ? "VALIDATION" : `En cours ${timeLeft}s`}
                            </span>
                        </Button>
                    ) : isQueueFull ? (
                        // File pleine
                        <Button disabled className="w-full h-12 bg-slate-900 border border-slate-800 text-slate-600 grayscale">
                            <Lock size={14} className="mr-2" />
                            <span className="text-[10px] uppercase tracking-widest">File Pleine (3/3)</span>
                        </Button>
                    ) : !canAfford ? (
                        // Manque ressources
                        <Button disabled className="w-full h-12 bg-red-950/20 border border-red-900/50 text-red-500 grayscale">
                            <AlertTriangle size={14} className="mr-2" />
                            <span className="text-[10px] uppercase tracking-widest">Ressources Manquantes</span>
                        </Button>
                    ) : (
                        // Bouton "Lancer" avec effet SWIPE original
                        <Button 
                            onClick={() => handleResearch(t.id)} 
                            className={`w-full h-12 font-black uppercase tracking-[0.2em] text-[10px] transition-all relative overflow-hidden group/btn bg-black hover:bg-slate-900 border border-white/10 hover:border-white/30 text-white shadow-lg`}
                        >
                            <div className={`absolute inset-0 opacity-0 group-hover/btn:opacity-10 ${style.bg.replace('/10', '')} transition-opacity`}></div>
                            {/* Effet Swipe restauré */}
                            <div className={`absolute top-0 bottom-0 w-2 bg-white/20 blur-md -skew-x-12 -left-10 group-hover/btn:left-[120%] transition-all duration-700`}></div>
                            
                            <span className="flex items-center gap-2 relative z-10">
                                <ArrowUpCircle size={14} className={style.color} /> Rechercher Niv. {t.lv + 1}
                            </span>
                        </Button>
                    )}
                </div>

              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}