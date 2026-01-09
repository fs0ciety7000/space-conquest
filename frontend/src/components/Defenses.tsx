import { useState, useEffect } from 'react';
import { Shield, Zap, Target, Crosshair, Timer, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const DEFENSE_TYPES = [
  { 
    id: 'missile_launcher', 
    name: 'Lanceur de Missiles', 
    tier: 'Défense Légère',
    desc: 'Batterie sol-air standard. Efficace en grand nombre.',
    m: 2000, c: 0, time: 10, atk: 80, def: 200,
    color: 'text-blue-400',
    border: 'border-blue-500',
    glow: 'shadow-[0_0_20px_rgba(96,165,250,0.5)]',
    bg: 'bg-blue-950/20'
  },
  { 
    id: 'plasma_turret', 
    name: 'Tourelle Plasma', 
    tier: 'Artillerie Lourde',
    desc: 'Projection de plasma surchauffé capable de percer les croiseurs.',
    m: 50000, c: 50000, time: 120, atk: 3000, def: 10000,
    color: 'text-pink-500',
    border: 'border-pink-600',
    glow: 'shadow-[0_0_20px_rgba(236,72,153,0.5)]',
    bg: 'bg-pink-950/20'
  }
];

export default function Defenses({ planet, onBuild }: { planet: any, onBuild: () => void }) {
  const [selected, setSelected] = useState(DEFENSE_TYPES[0]);
  const [qty, setQty] = useState(1);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Réutilisation de la file de construction du Shipyard (backend logic)
  useEffect(() => {
    if (planet?.shipyard_construction_end) {
      const interval = setInterval(() => {
        const end = new Date(planet.shipyard_construction_end).getTime();
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
  }, [planet?.shipyard_construction_end, onBuild]);

  const startBuild = async () => {
    try {
      const res = await fetch(`http://localhost:8080/planets/${planet.id}/build-fleet/${selected.id}/${qty}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) onBuild();
    } catch (e) { console.error(e); }
  };

  const totalM = selected.m * qty;
  const totalC = selected.c * qty;
  const canAfford = planet.metal_amount >= totalM && planet.crystal_amount >= totalC;
  const isBusy = planet.shipyard_construction_end !== null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 animate-in fade-in duration-500">
      
      {/* GAUCHE : SÉLECTEUR & COMMANDE */}
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {DEFENSE_TYPES.map(d => {
            const isSelected = selected.id === d.id;
            return (
              <button 
                key={d.id} 
                onClick={() => setSelected(d)} 
                className={`relative group overflow-hidden rounded-xl border transition-all duration-300 p-4 text-left h-32 flex flex-col justify-between
                  ${isSelected ? `${d.bg} ${d.border} ${d.glow} scale-105 z-10` : 'bg-black/40 border-white/10 opacity-70 hover:opacity-100'}`}
              >
                 <div className="flex justify-between items-start">
                    <div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${d.color}`}>{d.tier}</span>
                        <h3 className="text-sm font-black uppercase text-white">{d.name}</h3>
                    </div>
                    {d.id === 'plasma_turret' ? <Zap size={20} className={d.color}/> : <Crosshair size={20} className={d.color}/>}
                 </div>
                 <span className="text-[10px] font-mono text-slate-400">{d.time}s / unité</span>
              </button>
            );
          })}
        </div>

        {/* PANNEAU CENTRAL */}
        <div className={`relative overflow-hidden rounded-3xl border ${selected.border} bg-black/60 backdrop-blur-md p-8 shadow-2xl`}>
           {/* Décoration BG */}
           <div className={`absolute -right-10 -bottom-10 opacity-10 ${isBusy ? 'animate-pulse' : ''}`}>
             <Shield size={250} className={selected.color} />
           </div>

           <div className="relative z-10 space-y-6">
              <div>
                  <h2 className="text-3xl font-black uppercase text-white italic">{selected.name}</h2>
                  <p className="text-xs text-slate-400">{selected.desc}</p>
              </div>

              <div className="flex gap-4">
                 <div className="bg-black/40 px-3 py-2 rounded border border-white/5 text-[10px] text-slate-300 font-bold">
                    ATK: <span className="text-white">{selected.atk}</span>
                 </div>
                 <div className="bg-black/40 px-3 py-2 rounded border border-white/5 text-[10px] text-slate-300 font-bold">
                    DEF: <span className="text-white">{selected.def}</span>
                 </div>
              </div>

              {/* Contrôles */}
              <div className="flex items-end gap-6">
                  <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Quantité</label>
                      <input 
                        type="number" min="1" value={qty} 
                        onChange={e => setQty(Math.max(1, Number(e.target.value)))}
                        className="bg-transparent border-b border-white/20 text-3xl font-mono font-black text-white w-24 focus:outline-none"
                      />
                  </div>
                  <div className="space-y-1 text-xs font-mono">
                      <div className={planet.metal_amount >= totalM ? "text-slate-400" : "text-red-500"}>Métal: {totalM.toLocaleString()}</div>
                      <div className={planet.crystal_amount >= totalC ? "text-slate-400" : "text-red-500"}>Cristal: {totalC.toLocaleString()}</div>
                  </div>
              </div>

              <Button 
                onClick={startBuild}
                disabled={isBusy || !canAfford}
                className={`w-full h-14 uppercase font-black tracking-widest transition-all ${isBusy ? 'bg-slate-800 text-slate-500' : !canAfford ? 'bg-red-900/20 text-red-500 border border-red-500/50' : `bg-black hover:bg-slate-900 text-white border ${selected.border}`}`}
              >
                  {isBusy ? <span className="flex items-center gap-2"><Timer className="animate-spin" size={16}/> Occupé ({timeLeft}s)</span> : "Construire Défense"}
              </Button>
           </div>
        </div>
      </div>

      {/* DROITE : ÉTAT DES DÉFENSES */}
      <Card className="bg-slate-950 border border-white/5 p-6 rounded-3xl relative overflow-hidden">
           <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
             <Shield size={14} /> Périmètre Défensif
           </h4>
           
           <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                 <span className="text-xs font-bold text-blue-400 uppercase">Lanceurs Missiles</span>
                 <span className="text-xl text-white font-mono font-black">{planet.missile_launcher_count}</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                 <span className="text-xs font-bold text-pink-500 uppercase">Tourelles Plasma</span>
                 <span className="text-xl text-white font-mono font-black">{planet.plasma_turret_count}</span>
              </div>
              
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