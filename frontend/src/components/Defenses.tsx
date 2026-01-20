import { useState, useEffect } from 'react';
import { Shield, Zap, Target, Crosshair, Timer, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiUrl } from '@/config/api';
import { useUnitCosts } from '@/hooks/useUnitCosts';
import { toast } from "sonner";
import { checkPrerequisites } from "@/lib/gameRules";

export default function Defenses({ planet, onBuild }: { planet: any, onBuild: () => void }) {
  const [selected, setSelected] = useState<string>('missile_launcher');
  const [qty, setQty] = useState(1);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // ✅ AJOUT : Fetch des coûts depuis le backend
  const { costs, loading } = useUnitCosts();

  // ✅ Configuration des défenses (sans les coûts hardcodés)
  const DEFENSE_CONFIG = {
    missile_launcher: {
      name: 'Lanceur de Missiles',
      tier: 'Défense Légère',
      desc: 'Batterie sol-air standard. Efficace en grand nombre.',
      time: 10,
      atk: 80,
      def: 200,
      color: 'text-blue-400',
      border: 'border-blue-500',
      glow: 'shadow-[0_0_20px_rgba(96,165,250,0.5)]',
      bg: 'bg-blue-950/20'
    },
    plasma_turret: {
      name: 'Tourelle Plasma',
      tier: 'Artillerie Lourde',
      desc: 'Projection de plasma surchauffé capable de percer les croiseurs.',
      time: 120,
      atk: 3000,
      def: 10000,
      color: 'text-pink-500',
      border: 'border-pink-600',
      glow: 'shadow-[0_0_20px_rgba(236,72,153,0.5)]',
      bg: 'bg-pink-950/20'
    }
  };

  useEffect(() => {
    const defenseQueue = planet?.constructions?.find(
      (c: any) => c.building_type === 'missile_launcher' || c.building_type === 'plasma_turret'
    );
    
    if (defenseQueue) {
      const interval = setInterval(() => {
        const end = new Date(defenseQueue.end_time).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((end - now) / 1000));
        
        setTimeLeft(diff);
        if (diff <= 0) {
          clearInterval(interval);
          setTimeout(onBuild, 500);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [planet?.constructions, onBuild]);

  const startBuild = async () => {
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/build-fleet/${selected}/${qty}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (res.ok) {
        toast.success(`Construction lancée : ${qty}x ${selectedConfig.name}`);
        onBuild();
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
    }
  };

  // ✅ Afficher un loader pendant le chargement des coûts
  if (loading || !costs) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const selectedConfig = DEFENSE_CONFIG[selected as keyof typeof DEFENSE_CONFIG];
  const selectedCost = costs[selected as keyof typeof costs];

  const totalM = selectedCost.metal * qty;
  const totalC = selectedCost.crystal * qty;
  const canAfford = planet.metal_amount >= totalM && planet.crystal_amount >= totalC;
  const isBusy = timeLeft !== null && timeLeft > 0;

  // Check prerequisites
  const { locked: isLocked, requirements } = checkPrerequisites(planet, selected);
  const canBuild = !isBusy && canAfford && !isLocked;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 animate-in fade-in duration-500">
      
      {/* GAUCHE : SÉLECTEUR & COMMANDE */}
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(DEFENSE_CONFIG).map(([id, config]) => {
            const isSelected = selected === id;
            const cost = costs[id as keyof typeof costs];
            
            return (
              <button
                key={id}
                onClick={() => setSelected(id)}
                className={`relative group overflow-hidden rounded-xl border transition-all duration-500 p-4 text-left h-32 flex flex-col justify-between hover:-translate-y-1 hover:shadow-2xl card-depth animate-fade-in
                  ${isSelected ? `${config.bg} ${config.border} ${config.glow} scale-105 z-10` : 'bg-black/40 border-white/10 opacity-70 hover:opacity-100'}`}
              >
                 <div className="flex justify-between items-start">
                    <div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${config.color}`}>{config.tier}</span>
                        <h3 className="text-sm font-black uppercase text-white">{config.name}</h3>
                    </div>
                    {id === 'plasma_turret' ? <Zap size={20} className={`${config.color} group-hover:scale-110 transition-transform duration-300`}/> : <Crosshair size={20} className={`${config.color} group-hover:scale-110 transition-transform duration-300`}/>}
                 </div>
                 <div className="space-y-1">
                   <div className="text-[9px] font-mono text-slate-400">
                     {Math.floor(cost.metal).toLocaleString()}M {cost.crystal > 0 && `/ ${Math.floor(cost.crystal).toLocaleString()}C`}
                   </div>
                   <span className="text-[10px] font-mono text-slate-500">{config.time}s / unité</span>
                 </div>
              </button>
            );
          })}
        </div>

        {/* PANNEAU CENTRAL */}
        <div className={`relative overflow-hidden rounded-3xl border ${selectedConfig.border} bg-black/60 backdrop-blur-md p-8 shadow-2xl card-depth hover:shadow-3xl transition-all duration-500 animate-slide-up glass-card`}>
           <div className={`absolute -right-10 -bottom-10 opacity-10 ${isBusy ? 'animate-pulse' : 'group-hover:animate-float'}`}>
             <Shield size={250} className={selectedConfig.color} />
           </div>

           <div className="relative z-10 space-y-6">
              <div>
                  <h2 className="text-3xl font-black uppercase text-white italic">{selectedConfig.name}</h2>
                  <p className="text-xs text-slate-400">{selectedConfig.desc}</p>
              </div>

              <div className="flex gap-4">
                 <div className="bg-black/40 px-3 py-2 rounded border border-white/5 text-[10px] text-slate-300 font-bold">
                    ATK: <span className="text-white">{selectedConfig.atk}</span>
                 </div>
                 <div className="bg-black/40 px-3 py-2 rounded border border-white/5 text-[10px] text-slate-300 font-bold">
                    DEF: <span className="text-white">{selectedConfig.def}</span>
                 </div>
              </div>

              {/* Prerequisites */}
              {requirements.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Prérequis</label>
                  <div className="space-y-1">
                    {requirements.map((req, idx) => (
                      <div key={idx} className={`text-[11px] font-mono ${req.met ? 'text-green-500' : 'text-red-500'}`}>
                        {req.met ? '✓' : '✗'} {req.label}
                      </div>
                    ))}
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
                      : `bg-black hover:bg-slate-900 text-white border ${selectedConfig.border} ${selectedConfig.glow}`
                }`}
              >
                  {isBusy ? (
                    <span className="flex items-center gap-3">
                      <Timer className="animate-spin" size={18}/>
                      <span className="flex flex-col items-start">
                        <span className="text-[9px] text-slate-500 font-normal">Construction en cours</span>
                        <span className="text-lg font-mono">{formatTime(timeLeft!)}</span>
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
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg group glass-card">
                 <span className="text-xs font-bold text-blue-400 uppercase">Lanceurs Missiles</span>
                 <span className="text-xl text-white font-mono font-black group-hover:scale-110 transition-transform">{planet.missile_launcher_count || 0}</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg group glass-card">
                 <span className="text-xs font-bold text-pink-500 uppercase">Tourelles Plasma</span>
                 <span className="text-xl text-white font-mono font-black group-hover:scale-110 transition-transform">{planet.plasma_turret_count || 0}</span>
              </div>
              
              {isBusy && (
                <div className="mt-6 p-4 bg-indigo-950/30 rounded-xl border border-indigo-500/30 animate-pulse">
                  <div className="flex items-center gap-2 mb-2">
                    <Timer size={12} className="text-indigo-400 animate-spin" />
                    <span className="text-[9px] uppercase text-indigo-400 font-bold">Construction Active</span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono">
                    Achèvement dans: <span className="text-indigo-400 font-bold">{formatTime(timeLeft!)}</span>
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
