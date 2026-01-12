import { useState } from 'react';
import { Rocket, Lock, Box, Zap, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { checkPrerequisites } from "@/lib/gameRules";

export default function Shipyard({ planet, onUpdate }: any) {
  const [loading, setLoading] = useState<string | null>(null);

  const SHIPS = [
    { id: 'light_hunter', name: 'Chasseur Léger', metal: 3000, crystal: 1000, icon: Rocket },
    { id: 'cruiser', name: 'Croiseur', metal: 20000, crystal: 7000, icon: Rocket },
    { id: 'transporter', name: 'Transporteur', metal: 6000, crystal: 6000, icon: Rocket },
    { id: 'colony_ship', name: 'Vaisseau de Colonisation', metal: 10000, crystal: 20000, icon: Rocket },
    { id: 'recycler', name: 'Recycleur', metal: 10000, crystal: 6000, icon: Rocket },
    { id: 'spy_probe', name: 'Sonde d\'Espionnage', metal: 0, crystal: 1000, icon: Search },
  ];

  const handleBuild = async (type: string, qty: number = 1) => {
    const { locked } = checkPrerequisites(planet, type);
    if (locked) return toast.error("Technologies insuffisantes");

    setLoading(type);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:8080/planets/${planet.id}/build-fleet/${type}/${qty}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(`Production lancée : ${qty} unité(s)`);
        onUpdate();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur de production");
      }
    } catch (e) { toast.error("Erreur réseau"); }
    finally { setLoading(null); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {SHIPS.map((ship) => {
        const { locked, requirements } = checkPrerequisites(planet, ship.id);
        const canAfford = planet.metal_amount >= ship.metal && planet.crystal_amount >= ship.crystal;

        return (
          <div key={ship.id} className={`relative group p-6 rounded-2xl border transition-all duration-300 ${locked ? 'bg-slate-950/80 border-red-900/20 opacity-90' : 'bg-slate-900/40 border-white/10 hover:border-indigo-500/50'}`}>
            
            <div className="flex justify-between items-start mb-4">
               <div className={`p-3 rounded-xl ${locked ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                  {locked ? <Lock size={24} /> : <ship.icon size={24} />}
               </div>
               {locked && (
                 <span className="text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                   Verrouillé
                 </span>
               )}
            </div>

            <h3 className="text-lg font-bold text-white mb-1">{ship.name}</h3>
            
            {/* PRÉREQUIS DYNAMIQUES */}
            {locked && (
              <div className="mb-4 space-y-1.5 bg-black/40 p-3 rounded-lg border border-white/5">
                <p className="text-[9px] uppercase font-bold text-slate-500 mb-2">Conditions requises :</p>
                {requirements.map((req, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] font-mono">
                    <span className={req.met ? "text-slate-400" : "text-red-400"}>{req.label}</span>
                    {req.met ? <Zap size={10} className="text-green-500" /> : <Lock size={10} className="text-red-600" />}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-4 mb-6">
               <div className="text-xs">
                  <span className="block text-slate-500 uppercase text-[9px] font-bold">Métal</span>
                  <span className={planet.metal_amount >= ship.metal ? "text-white font-mono" : "text-red-500 font-mono"}>{ship.metal.toLocaleString()}</span>
               </div>
               <div className="text-xs">
                  <span className="block text-slate-500 uppercase text-[9px] font-bold">Cristal</span>
                  <span className={planet.crystal_amount >= ship.crystal ? "text-white font-mono" : "text-red-400 font-mono"}>{ship.crystal.toLocaleString()}</span>
               </div>
            </div>

            <Button 
              disabled={locked || !canAfford || loading === ship.id}
              onClick={() => handleBuild(ship.id)}
              className={`w-full font-bold uppercase tracking-widest h-11 ${locked ? 'bg-slate-800 text-slate-500 opacity-50' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'}`}
            >
              {loading === ship.id ? "Lancement..." : locked ? "Indisponible" : canAfford ? "Construire" : "Fonds insuffisants"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}