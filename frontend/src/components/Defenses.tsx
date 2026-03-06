import { useState, useEffect } from 'react';
import { Shield, Zap, Target, Crosshair, Timer, Terminal, Lock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiUrl } from '@/config/api';
import { toast } from "sonner";
import { GameImage } from '@/components/ui/game-image';
import { getDefenseImage } from '@/lib/images';
import { formatDuration } from '@/lib/utils';

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

export default function Defenses({ planet, onBuild }: { planet: any, onBuild: () => void }) {
  const [selected, setSelected] = useState<string>('');
  const [qty, setQty] = useState(1);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [defenseTypes, setDefenseTypes] = useState<DefenseTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [speedFactor, setSpeedFactor] = useState(1);
  const [constructionSpeed, setConstructionSpeed] = useState(1);

  useEffect(() => {
    fetch(apiUrl('/config'))
      .then(r => r.json())
      .then(d => {
        setSpeedFactor(d.speed_factor ?? 1);
        setConstructionSpeed(d.construction_speed_multiplier ?? 1);
      })
      .catch(() => {});
  }, []);

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
    // Color themes based on defense type
    if (defense_key.includes('laser')) {
      return { color: 'text-red-400', border: 'border-red-500', glow: 'shadow-[0_0_20px_rgba(248,113,113,0.5)]', bg: 'bg-red-950/20', tier: 'Défense Laser' };
    }
    if (defense_key.includes('plasma')) {
      return { color: 'text-pink-500', border: 'border-pink-600', glow: 'shadow-[0_0_20px_rgba(236,72,153,0.5)]', bg: 'bg-pink-950/20', tier: 'Artillerie Lourde' };
    }
    if (defense_key.includes('ion')) {
      return { color: 'text-purple-400', border: 'border-purple-500', glow: 'shadow-[0_0_20px_rgba(192,132,252,0.5)]', bg: 'bg-purple-950/20', tier: 'Défense Ionique' };
    }
    if (defense_key.includes('missile')) {
      return { color: 'text-blue-400', border: 'border-blue-500', glow: 'shadow-[0_0_20px_rgba(96,165,250,0.5)]', bg: 'bg-blue-950/20', tier: 'Défense Légère' };
    }
    if (defense_key.includes('shield')) {
      return { color: 'text-cyan-400', border: 'border-cyan-500', glow: 'shadow-[0_0_20px_rgba(34,211,238,0.5)]', bg: 'bg-cyan-950/20', tier: 'Bouclier' };
    }
    return { color: 'text-slate-400', border: 'border-slate-500', glow: 'shadow-[0_0_20px_rgba(148,163,184,0.5)]', bg: 'bg-slate-950/20', tier: 'Défense' };
  };

  useEffect(() => {
    const defenseBuilds = planet?.defense_builds || [];
    const defenseQueue = defenseBuilds.find(
      (db: any) => db.defense_key === selected
    );

    if (defenseQueue) {
      const interval = setInterval(() => {
        // Ensure build_end_time is treated as UTC
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
            fetchDefenseTypes(); // Refresh defense counts after build completes
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
        // Refresh defense types to update current counts
        fetchDefenseTypes();
      } else if (res.status === 403) {
        toast.error("Prérequis non satisfaits");
      } else if (res.status === 400) {
        toast.error("Ressources insuffisantes");
      } else if (res.status === 409) {
        toast.error("File de construction pleine");
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
  const totalBuildTime = Math.ceil(selectedDefense.build_time_seconds * qty / (speedFactor * constructionSpeed));
  const canAfford = planet.metal_amount >= totalM && planet.crystal_amount >= totalC && planet.deuterium_amount >= totalD;
  const isBusy = timeLeft !== null && timeLeft > 0;

  // Check prerequisites
  const isLocked = selectedDefense.requirements.some(req => !req.met);
  const canBuild = !isBusy && !isBuilding && canAfford && !isLocked;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 animate-in fade-in duration-500">
      
      {/* GAUCHE : SÉLECTEUR & COMMANDE */}
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {defenseTypes.map((defense) => {
            const isSelected = selected === defense.defense_key;
            const theme = getDefenseTheme(defense.defense_key);
            const locked = defense.requirements.some(req => !req.met);

            return (
              <button
                key={defense.id}
                onClick={() => setSelected(defense.defense_key)}
                className={`relative group overflow-hidden rounded-xl border transition-all duration-500 p-4 text-left h-32 flex flex-col justify-between hover:-translate-y-1 hover:shadow-2xl card-depth animate-fade-in
                  ${locked ? 'bg-black/40 border-red-900/50 opacity-50' : isSelected ? `${theme.bg} ${theme.border} ${theme.glow} scale-105 z-10` : 'bg-black/40 border-white/10 opacity-70 hover:opacity-100'}`}
              >
                 {locked && (
                   <div className="absolute top-2 right-2">
                     <Lock size={14} className="text-red-500" />
                   </div>
                 )}
                 <div className="flex justify-between items-start">
                    <div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${theme.color}`}>{theme.tier}</span>
                        <h3 className="text-sm font-black uppercase text-white">{defense.name}</h3>
                    </div>
                    {defense.defense_key.includes('plasma') ? <Zap size={20} className={`${theme.color} group-hover:scale-110 transition-transform duration-300`}/> : <Crosshair size={20} className={`${theme.color} group-hover:scale-110 transition-transform duration-300`}/>}
                 </div>
                 <div className="space-y-1">
                   <div className="text-[9px] font-mono text-slate-400">
                     {Math.floor(defense.base_cost_metal).toLocaleString()}M {defense.base_cost_crystal > 0 && `/ ${Math.floor(defense.base_cost_crystal).toLocaleString()}C`}
                   </div>
                   <span className="text-[10px] font-mono text-slate-500">{formatDuration(defense.build_time_seconds)} / unité</span>
                 </div>
              </button>
            );
          })}
        </div>

        {/* PANNEAU CENTRAL */}
        <div className={`relative overflow-hidden rounded-3xl border ${selectedTheme.border} bg-black/60 backdrop-blur-md p-8 shadow-2xl card-depth hover:shadow-3xl transition-all duration-500 animate-slide-up glass-card`}>
           <div className={`absolute -right-10 -bottom-10 opacity-10 ${isBusy ? 'animate-pulse' : 'group-hover:animate-float'}`}>
             <Shield size={250} className={selectedTheme.color} />
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
                  <h2 className="text-3xl font-black uppercase text-white italic">{selectedDefense.name}</h2>
                  <p className="text-xs text-slate-400">{selectedDefense.description || "Système défensif planétaire"}</p>
              </div>

              <div className="flex gap-4">
                 <div className="bg-black/40 px-3 py-2 rounded border border-white/5 text-[10px] text-slate-300 font-bold">
                    ATK: <span className="text-white">{selectedDefense.attack}</span>
                 </div>
                 <div className="bg-black/40 px-3 py-2 rounded border border-white/5 text-[10px] text-slate-300 font-bold">
                    SHD: <span className="text-white">{selectedDefense.shield}</span>
                 </div>
                 <div className="bg-black/40 px-3 py-2 rounded border border-white/5 text-[10px] text-slate-300 font-bold">
                    HULL: <span className="text-white">{selectedDefense.hull}</span>
                 </div>
              </div>

              {/* Prerequisites */}
              {selectedDefense.requirements.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Prérequis</label>
                  <div className="space-y-1">
                    {selectedDefense.requirements.map((req, idx) => {
                      const label = req.requirement_type === 'tech'
                        ? `${req.tech_name} (Nv.${req.required_level})`
                        : `${req.building_name} (Nv.${req.required_level})`;
                      return (
                        <div key={idx} className={`text-[11px] font-mono ${req.met ? 'text-green-500' : 'text-red-500'}`}>
                          {req.met ? '✓' : '✗'} {label} [{req.current_level}/{req.required_level}]
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
                        type="number" min="1" value={qty} 
                        onChange={e => setQty(Math.max(1, Number(e.target.value)))}
                        className="bg-transparent border-b-2 border-white/20 text-3xl font-mono font-black text-white w-24 focus:outline-none focus:border-white/40 pb-1"
                        disabled={isBusy}
                      />
                  </div>
                  <div className="space-y-1 text-xs font-mono">
                      <div className={planet.metal_amount >= totalM ? "text-slate-400" : "text-red-500"}>
                        Métal: {Math.floor(totalM).toLocaleString()}
                      </div>
                      <div className={planet.crystal_amount >= totalC ? "text-slate-400" : "text-red-500"}>
                        Cristal: {Math.floor(totalC).toLocaleString()}
                      </div>
                      {totalD > 0 && (
                        <div className={planet.deuterium_amount >= totalD ? "text-slate-400" : "text-red-500"}>
                          Deutérium: {Math.floor(totalD).toLocaleString()}
                        </div>
                      )}
                      <div className="text-indigo-300 flex items-center gap-1 mt-1">
                        <Timer size={10} /> {formatDuration(totalBuildTime)}
                      </div>
                  </div>
              </div>

              <Button
                onClick={startBuild}
                disabled={!canBuild}
                className={`w-full h-14 uppercase font-black tracking-widest transition-all ${
                  isBusy
                    ? 'bg-slate-800 text-slate-400 border border-slate-700'
                    : isLocked
                      ? 'bg-orange-900/20 text-orange-500 border border-orange-500/50'
                    : !canAfford
                      ? 'bg-red-900/20 text-red-500 border border-red-500/50'
                      : `bg-black hover:bg-slate-900 text-white border ${selectedTheme.border} ${selectedTheme.glow}`
                }`}
              >
                  {isBusy ? (
                    <span className="flex items-center gap-3">
                      <Timer className="animate-spin" size={18}/>
                      <span className="flex flex-col items-start">
                        <span className="text-[9px] text-slate-500 font-normal">Construction en cours</span>
                        <span className="text-lg font-mono">{formatDuration(timeLeft!)}</span>
                      </span>
                    </span>
                  ) : isLocked ? (
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
      <Card className="bg-slate-950 border border-white/5 p-6 rounded-3xl relative overflow-hidden card-depth hover:shadow-2xl transition-all duration-500 animate-slide-up">
           <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
             <Shield size={14} className="animate-bounce-subtle" /> Périmètre Défensif
           </h4>

           <div className="space-y-4">
              {defenseTypes.map((defense) => {
                const theme = getDefenseTheme(defense.defense_key);
                return (
                  <div key={defense.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg group glass-card">
                     <span className={`text-xs font-bold ${theme.color} uppercase`}>{defense.name}</span>
                     <span className="text-xl text-white font-mono font-black group-hover:scale-110 transition-transform">{defense.current_count}</span>
                  </div>
                );
              })}
              
              {isBusy && (
                <div className="mt-6 p-4 bg-indigo-950/30 rounded-xl border border-indigo-500/30 animate-pulse">
                  <div className="flex items-center gap-2 mb-2">
                    <Timer size={12} className="text-indigo-400 animate-spin" />
                    <span className="text-[9px] uppercase text-indigo-400 font-bold">Construction Active</span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono">
                    Achèvement dans: <span className="text-indigo-400 font-bold">{formatDuration(timeLeft!)}</span>
                  </p>
                </div>
              )}
              
              <div className="mt-8 p-4 bg-black/50 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                      <Terminal size={12} className="text-green-500" />
                      <span className="text-[9px] uppercase text-green-500 font-bold">État des boucliers</span>
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
