import { useState, useEffect } from 'react';
import { Shield, Zap, Target, Crosshair, Timer, Terminal, Lock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiUrl } from '@/config/api';
import { toast } from "sonner";
import { GameImage } from '@/components/ui/game-image';
import { getDefenseImage } from '@/lib/images';
import { formatDuration } from '@/lib/utils';
import { motion } from "framer-motion";

interface DefenseRequirement {
  requirement_type: string;
  tech_key?: string;
  tech_name?: string;
  building_key?: string;
  building_name?: string;
  required_level: number;
  current_level: number;
  met: boolean;
}

interface DefenseTypeInfo {
  id: number;
  defense_key: string;
  name: string;
  description: string | null;
  base_cost_metal: number;
  base_cost_crystal: number;
  base_cost_deuterium: number;
  build_time_seconds: number;
  attack: number;
  shield: number;
  hull: number;
  current_count: number;
  requirements: DefenseRequirement[];
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } }
};
const itemVariant = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export default function Defenses({ planet, onBuild }: { planet: any, onBuild: () => void }) {
  const [selected, setSelected] = useState<string>('');
  const [qty, setQty] = useState(1);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [defenseTypes, setDefenseTypes] = useState<DefenseTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);

  const fetchDefenseTypes = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(apiUrl(`/planets/${planet.id}/defense-types`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const types = data.defense_types || [];
        setDefenseTypes(types);
        if (types.length > 0 && !selected) {
          setSelected(types[0].defense_key);
        }
      }
    } catch (e) {
      console.error("Failed to fetch defense types:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefenseTypes();
  }, [planet.id, planet.metal_amount, planet.crystal_amount]);

  const getDefenseTheme = (defense_key: string) => {
    if (defense_key.includes('laser'))   return { color: 'text-red-400',    border: 'border-red-500',    glow: 'shadow-[0_0_20px_rgba(248,113,113,0.5)]',   bg: 'bg-red-950/20',    tier: 'Défense Laser'     };
    if (defense_key.includes('plasma'))  return { color: 'text-pink-500',   border: 'border-pink-600',   glow: 'shadow-[0_0_20px_rgba(236,72,153,0.5)]',    bg: 'bg-pink-950/20',   tier: 'Artillerie Lourde'  };
    if (defense_key.includes('ion'))     return { color: 'text-purple-400', border: 'border-purple-500', glow: 'shadow-[0_0_20px_rgba(192,132,252,0.5)]',   bg: 'bg-purple-950/20', tier: 'Défense Ionique'    };
    if (defense_key.includes('missile')) return { color: 'text-blue-400',   border: 'border-blue-500',   glow: 'shadow-[0_0_20px_rgba(96,165,250,0.5)]',    bg: 'bg-blue-950/20',   tier: 'Défense Légère'     };
    if (defense_key.includes('shield'))  return { color: 'text-cyan-400',   border: 'border-cyan-500',   glow: 'shadow-[0_0_20px_rgba(34,211,238,0.5)]',    bg: 'bg-cyan-950/20',   tier: 'Bouclier'           };
    return { color: 'text-slate-400', border: 'border-slate-500', glow: 'shadow-[0_0_20px_rgba(148,163,184,0.5)]', bg: 'bg-[rgba(10,5,32,0.85)]', tier: 'Défense' };
  };

  useEffect(() => {
    const defenseBuilds = planet?.defense_builds || [];
    const defenseQueue = defenseBuilds.find(
      (db: any) => db.defense_key === selected
    );

    if (defenseQueue) {
      const interval = setInterval(() => {
        const buildEndTime = defenseQueue.build_end_time.endsWith('Z')
          ? defenseQueue.build_end_time
          : defenseQueue.build_end_time + 'Z';
        const end = new Date(buildEndTime).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((end - now) / 1000));

        setTimeLeft(diff);
        if (diff <= 0) {
          clearInterval(interval);
          setTimeout(() => {
            onBuild();
            fetchDefenseTypes();
          }, 500);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [planet?.defense_builds, selected, onBuild, defenseTypes]);

  const startBuild = async () => {
    const selectedDefense = defenseTypes.find(d => d.defense_key === selected);
    if (!selectedDefense || isBuilding) return;

    setIsBuilding(true);
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/build-defenses/${selected}/${qty}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (res.ok) {
        toast.success(`Construction lancée : ${qty}x ${selectedDefense.name}`);
        onBuild();
        fetchDefenseTypes();
      } else if (res.status === 409) {
        const token = localStorage.getItem('token');
        const qRes = await fetch(apiUrl(`/planets/${planet.id}/build-queue`), {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: 'defenses', item_key: selected, quantity: qty }),
        });
        if (qRes.ok) {
          toast.success(`En file d'attente : ${qty}x ${selectedDefense.name}`);
          onBuild();
        } else {
          const err = await qRes.json();
          toast.error(err.error || "Erreur lors de la mise en file");
        }
      } else if (res.status === 403) {
        toast.error("Prérequis non satisfaits");
      } else if (res.status === 400) {
        toast.error("Ressources insuffisantes");
      } else {
        toast.error("Erreur lors de la construction");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur de connexion");
    } finally {
      setIsBuilding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse">Chargement des systèmes défensifs...</div>
      </div>
    );
  }

  const selectedDefense = defenseTypes.find(d => d.defense_key === selected);
  if (!selectedDefense) return null;

  const selectedTheme = getDefenseTheme(selectedDefense.defense_key);

  const totalM = selectedDefense.base_cost_metal * qty;
  const totalC = selectedDefense.base_cost_crystal * qty;
  const totalD = selectedDefense.base_cost_deuterium * qty;
  const totalBuildTime = selectedDefense.build_time_seconds * qty;
  const canAfford = planet.metal_amount >= totalM && planet.crystal_amount >= totalC && planet.deuterium_amount >= totalD;
  const isBusy = timeLeft !== null && timeLeft > 0;

  const isLocked = selectedDefense.requirements.some(req => !req.met);
  const canBuild = !isBuilding && canAfford && !isLocked;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 animate-in fade-in duration-500">

      {/* GAUCHE : SÉLECTEUR & COMMANDE */}
      <div className="lg:col-span-2 space-y-6">

        {/* Section header */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
          <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
          <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">SYSTÈMES DÉFENSIFS</span>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          {defenseTypes.map((defense) => {
            const isSelected = selected === defense.defense_key;
            const theme = getDefenseTheme(defense.defense_key);
            const locked = defense.requirements.some(req => !req.met);

            return (
              <motion.button
                key={defense.id}
                variants={itemVariant}
                onClick={() => setSelected(defense.defense_key)}
                className={`relative group overflow-hidden rounded-xl border transition-all duration-200 p-4 text-left h-32 flex flex-col justify-between card-depth
                  ${locked
                    ? 'bg-[rgba(10,5,32,0.85)] border-red-900/50 opacity-50 cursor-not-allowed'
                    : isSelected
                      ? `${theme.bg} ${theme.border} ${theme.glow} scale-105 z-10`
                      : 'bg-[rgba(10,5,32,0.85)] border-cyan-500/10 opacity-70 hover:opacity-100 hover:border-cyan-500/30 hover:bg-cyan-500/5 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(0,245,255,0.1)]'
                  }`}
              >
                 {locked && (
                   <div className="absolute top-2 right-2">
                     <Lock size={14} className="text-red-500" />
                   </div>
                 )}
                 <div className="flex justify-between items-start">
                    <div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${theme.color}`}>{theme.tier}</span>
                        <h3 className="text-sm font-black uppercase text-slate-200">{defense.name}</h3>
                    </div>
                    {defense.defense_key.includes('plasma')
                      ? <Zap      size={20} className={`${theme.color} group-hover:scale-110 transition-transform duration-300`}/>
                      : <Crosshair size={20} className={`${theme.color} group-hover:scale-110 transition-transform duration-300`}/>
                    }
                 </div>
                 <div className="space-y-1">
                   <div className="text-[9px] font-mono tabular-nums text-slate-400">
                     {Math.floor(defense.base_cost_metal).toLocaleString()}M {defense.base_cost_crystal > 0 && `/ ${Math.floor(defense.base_cost_crystal).toLocaleString()}C`}
                   </div>
                   <span className="text-[10px] font-mono text-slate-500">{formatDuration(defense.build_time_seconds)} / unité</span>
                 </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* PANNEAU CENTRAL */}
        <div className={`relative overflow-hidden rounded-3xl border ${selectedTheme.border} bg-[rgba(16,8,46,0.95)] backdrop-blur-[12px] p-4 md:p-8 shadow-2xl card-depth hover:shadow-3xl transition-all duration-500 animate-slide-up`}>
           <div className={`absolute -right-10 -bottom-10 opacity-10 ${isBusy ? 'animate-pulse' : 'group-hover:animate-float'}`}>
             <Shield size={150} className={selectedTheme.color} />
           </div>

           <div className="relative z-10 space-y-6">
              {/* Image de la défense */}
              <GameImage
                src={getDefenseImage(selected)}
                alt={selectedDefense.name}
                className="w-full h-48 mb-4"
                fallbackIcon={selectedDefense.defense_key.includes('plasma') ? <Zap className={`${selectedTheme.color} w-24 h-24`} /> : <Crosshair className={`${selectedTheme.color} w-24 h-24`} />}
                loading="lazy"
              />

              <div>
                  <h2 className="text-xl md:text-3xl font-black uppercase text-slate-200 italic">{selectedDefense.name}</h2>
                  <p className="text-xs text-slate-400">{selectedDefense.description || "Système défensif planétaire"}</p>
              </div>

              <div className="flex gap-4">
                 <div className="bg-black/40 px-3 py-2 rounded border border-cyan-500/10 text-[10px] text-slate-400 font-bold">
                    ATK: <span className="text-slate-200">{selectedDefense.attack}</span>
                 </div>
                 <div className="bg-black/40 px-3 py-2 rounded border border-cyan-500/10 text-[10px] text-slate-400 font-bold">
                    SHD: <span className="text-slate-200">{selectedDefense.shield}</span>
                 </div>
                 <div className="bg-black/40 px-3 py-2 rounded border border-cyan-500/10 text-[10px] text-slate-400 font-bold">
                    HULL: <span className="text-slate-200">{selectedDefense.hull}</span>
                 </div>
              </div>

              {/* Prerequisites */}
              {selectedDefense.requirements.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
                    <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
                    <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">PRÉREQUIS</span>
                  </div>
                  <div className="space-y-1">
                    {selectedDefense.requirements.map((req, idx) => {
                      const label = req.requirement_type === 'tech'
                        ? `${req.tech_name} (Nv.${req.required_level})`
                        : `${req.building_name} (Nv.${req.required_level})`;
                      return (
                        <div key={idx} className={`text-[11px] font-mono flex items-center gap-1 ${req.met ? 'text-emerald-400' : 'text-red-500'}`}>
                          {req.met ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                          {label} [{req.current_level}/{req.required_level}]
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Contrôles */}
              <div className="flex items-end gap-6">
                  <div className="space-y-4">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">Quantité</label>
                      <input
                        type="number"
                        min="1"
                        value={qty}
                        onChange={e => setQty(Math.max(1, Number(e.target.value)))}
                        onFocus={(e) => e.target.select()}
                        className="bg-transparent border-b-2 border-cyan-500/10 text-3xl font-mono font-black text-slate-200 w-24 focus:outline-none focus:border-cyan-500/30 pb-1"
                      />
                  </div>
                  <div className="space-y-1 text-xs font-mono">
                      <div className={planet.metal_amount >= totalM ? "text-orange-400 tabular-nums" : "text-red-500 tabular-nums"}>
                        Métal: {Math.floor(totalM).toLocaleString()}
                      </div>
                      <div className={planet.crystal_amount >= totalC ? "text-cyan-400 tabular-nums" : "text-red-500 tabular-nums"}>
                        Cristal: {Math.floor(totalC).toLocaleString()}
                      </div>
                      {totalD > 0 && (
                        <div className={planet.deuterium_amount >= totalD ? "text-emerald-400 tabular-nums" : "text-red-500 tabular-nums"}>
                          Deutérium: {Math.floor(totalD).toLocaleString()}
                        </div>
                      )}
                      <div className="text-cyan-400 font-mono tabular-nums text-xs flex items-center gap-1 mt-1">
                        <Timer size={10} /> {formatDuration(totalBuildTime)}
                      </div>
                  </div>
              </div>

              <Button
                onClick={startBuild}
                disabled={!canBuild}
                className={`w-full h-14 uppercase font-black tracking-widest transition-all ${
                  isLocked
                    ? 'bg-orange-900/20 text-orange-500 border border-orange-500/50'
                    : !canAfford
                      ? 'bg-red-900/20 text-red-500 border border-red-500/50'
                      : `bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border ${selectedTheme.border} ${selectedTheme.glow} hover:border-cyan-500/30`
                }`}
              >
                  {isLocked ? (
                    "Prérequis Non Satisfaits"
                  ) : !canAfford ? (
                    "Ressources Insuffisantes"
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Shield size={18} />
                      Construire × {qty}
                    </span>
                  )}
              </Button>
           </div>
        </div>
      </div>

      {/* DROITE : ÉTAT DES DÉFENSES */}
      <Card className="bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 backdrop-blur-[12px] p-6 rounded-3xl relative overflow-hidden card-depth hover:shadow-2xl transition-all duration-500 animate-slide-up">
           {/* Section header */}
           <div className="flex items-center gap-2 mb-6 pb-2 border-b border-cyan-500/10">
             <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
             <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">PÉRIMÈTRE DÉFENSIF</span>
           </div>

           <div className="space-y-4">
              {defenseTypes.map((defense) => {
                const theme = getDefenseTheme(defense.defense_key);
                return (
                  <div
                    key={defense.id}
                    className="flex justify-between items-center bg-cyan-500/5 p-3 rounded-lg border border-cyan-500/10 hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(0,245,255,0.1)] transition-all duration-200 group"
                  >
                     <span className={`text-xs font-bold ${theme.color} uppercase`}>{defense.name}</span>
                     <span className="text-xl text-slate-200 font-mono font-black group-hover:scale-110 transition-transform">{defense.current_count}</span>
                  </div>
                );
              })}

              {isBusy && (
                <div className="mt-6 p-4 bg-cyan-500/5 rounded-xl border border-cyan-500/20 animate-pulse">
                  <div className="flex items-center gap-2 mb-2">
                    <Timer size={12} className="text-cyan-400 animate-spin" />
                    <span className="text-[9px] uppercase text-cyan-400 font-bold">Construction Active</span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Achèvement dans: <span className="text-cyan-400 font-bold tabular-nums">{formatDuration(timeLeft!)}</span>
                  </p>
                </div>
              )}

              <div className="mt-8 p-4 bg-black/50 rounded-xl border border-cyan-500/10">
                  <div className="flex items-center gap-2 mb-2">
                      <Terminal size={12} className="text-emerald-400" />
                      <span className="text-[9px] uppercase text-emerald-400 font-bold">État des boucliers</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                      Intégrité structurelle: 100%<br/>
                      Systèmes de ciblage: ACTIFS
                  </p>
              </div>
           </div>
      </Card>
    </div>
  );
}
