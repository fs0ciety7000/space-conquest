import { useState, useEffect } from 'react';
import { Rocket, Swords, Timer, Shield, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

const SHIP_TYPES = [
  { id: 'light_hunter', name: 'Chasseur Léger', m: 3000, c: 1000, time: 20, atk: 50, def: 400 },
  { id: 'cruiser', name: 'Croiseur', m: 20000, c: 7000, time: 60, atk: 400, def: 2700 },
  { id: 'recycler', name: 'Recycleur', m: 10000, c: 6000, time: 40, atk: 1, def: 1600 }
];

export default function Shipyard({ planet, onBuild }: { planet: any, onBuild: () => void }) {
  const [selected, setSelected] = useState(SHIP_TYPES[0]);
  const [qty, setQty] = useState(1);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Gestion du compte à rebours
  useEffect(() => {
    if (planet?.shipyard_construction_end) {
      const interval = setInterval(() => {
        const end = new Date(planet.shipyard_construction_end + "Z").getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((end - now) / 1000));
        
        setTimeLeft(diff);
        
        if (diff === 0) {
          clearInterval(interval);
          onBuild(); // Rafraîchit les données pour faire apparaître les vaisseaux
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [planet?.shipyard_construction_end, onBuild]);

  const startBuild = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:8080/planets/${planet.id}/build-fleet/${selected.id}/${qty}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) onBuild();
  };

  // --- CORRECTION DES CLÉS POUR ÉVITER LE NaN ---
  const totalM = selected.m * qty;
  const totalC = selected.c * qty;
  const metalAvailable = planet.metal_amount ?? 0;
  const crystalAvailable = planet.crystal_amount ?? 0;
  const canAfford = metalAvailable >= totalM && crystalAvailable >= totalC;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 animate-in fade-in duration-500">
      <div className="lg:col-span-2 space-y-6">
        {/* SELECTEUR DE TYPE */}
        <div className="flex gap-4">
          {SHIP_TYPES.map(s => (
            <button key={s.id} onClick={() => setSelected(s)} 
              className={`p-4 border-2 rounded-xl flex-1 transition-all ${selected.id === s.id ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-white/5 bg-slate-900 hover:bg-slate-800'}`}>
              <p className="text-[10px] font-black uppercase text-white tracking-widest">{s.name}</p>
            </button>
          ))}
        </div>

        {/* PANNEAU DE COMMANDE CENTRAL */}
        <div className="bg-slate-950 border border-indigo-500/30 p-8 rounded-3xl relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            {selected.id === 'cruiser' ? <Shield size={120} /> : <Rocket size={120} />}
          </div>
          
          <h2 className="text-3xl font-black italic uppercase text-white mb-2 tracking-tighter">{selected.name}</h2>
          
          <div className="flex gap-4 mb-8">
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter bg-red-500/10 px-2 py-1 rounded">Atk: {selected.atk}</span>
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter bg-blue-500/10 px-2 py-1 rounded">Def: {selected.def}</span>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter bg-amber-500/10 px-2 py-1 rounded">Temps: {selected.time}s/u</span>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quantité d'unités</label>
               <input type="number" min="1" value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value)))} 
                 className="w-full bg-black border-b-2 border-indigo-500 text-3xl font-mono text-white p-2 outline-none focus:bg-indigo-500/5 transition-colors" />
            </div>
            <div className="bg-black/40 p-4 rounded-xl text-xs font-mono self-end border border-white/5">
               <p className={metalAvailable >= totalM ? "text-slate-300" : "text-red-500"}>Métal: {totalM.toLocaleString()}</p>
               <p className={crystalAvailable >= totalC ? "text-slate-300" : "text-red-500"}>Cristal: {totalC.toLocaleString()}</p>
            </div>
          </div>

          <Button onClick={startBuild} disabled={planet.shipyard_construction_end !== null || !canAfford} 
            className={`w-full h-16 font-black tracking-widest uppercase shadow-lg transition-all ${
              planet.shipyard_construction_end ? 'bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
            }`}>
            {timeLeft !== null ? `Assemblage : ${timeLeft}s` : canAfford ? "Lancer la production" : "Ressources insuffisantes"}
          </Button>
        </div>

        {/* TERMINAL DE LOGS */}
        <div className="bg-slate-950 border border-white/5 p-6 rounded-2xl">
          <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 flex items-center gap-2"><Terminal size={14}/> Console de contrôle</h4>
          <div className="font-mono text-[10px] text-indigo-400/70 space-y-1">
            <p>&gt; Statut système : {timeLeft !== null ? "OCCUPÉ" : "OPÉRATIONNEL"}</p>
            <p>&gt; File active : {planet.pending_fleet_count > 0 ? `${planet.pending_fleet_count}x ${planet.pending_fleet_type}` : "AUCUNE"}</p>
            {timeLeft !== null && <p className="animate-pulse">&gt; Initialisation des protocoles d'assemblage en cours...</p>}
          </div>
        </div>
      </div>

      {/* HANGAR GLOBAL (PANNEAU DROIT) */}
      <div className="space-y-6">
        <div className="bg-slate-900 p-8 rounded-3xl border border-white/5 shadow-xl">
           <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2"><Swords size={14}/> Hangar Orbital</h4>
           <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                 <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Chasseurs MK-I</span>
                 <span className="text-2xl text-indigo-400 font-black">{planet.light_hunter_count || 0}</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                 <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Croiseurs MK-II</span>
                 <span className="text-2xl text-indigo-400 font-black">{planet.cruiser_count || 0}</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                 <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Unités Recycleur</span>
                 <span className="text-2xl text-indigo-400 font-black">{planet.recycler_count || 0}</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}