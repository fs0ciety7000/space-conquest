import { useState, useEffect } from 'react';
import { Compass, Timer, Send, AlertTriangle, Database, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExpeditionZone({ planet, onAction }: { planet: any, onAction: () => void }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  // Gestion du compte à rebours
  useEffect(() => {
    if (planet?.expedition_end) {
      // Si on reçoit une date de fin, on arrête l'état "Initialisation"
      setIsLaunching(false);

      const interval = setInterval(() => {
        const end = new Date(planet.expedition_end + "Z").getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((end - now) / 1000));
        
        setTimeLeft(diff);
        
        if (diff === 0) {
          clearInterval(interval);
          onAction(); 
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
      setIsLaunching(false);
    }
  }, [planet?.expedition_end, onAction]);

  const launchExpedition = async () => {
    if (isLaunching) return;
    
    setIsLaunching(true); 
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`http://localhost:8080/planets/${planet.id}/expedition`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        onAction(); 
      } else {
        setIsLaunching(false);
      }
    } catch (e) {
      console.error("Erreur de liaison");
      setIsLaunching(false);
    }
  };

  const isInMission = (timeLeft !== null && timeLeft > 0) || isLaunching;
  const hasShips = (planet.light_hunter_count || 0) > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 animate-in fade-in duration-500">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-950 border border-indigo-500/30 p-8 rounded-3xl relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Compass size={120} className={isInMission ? "animate-spin-slow" : ""} />
          </div>

          <h2 className="text-3xl font-black italic uppercase text-white mb-2 tracking-tighter">Exploration Lointaine</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-8">Secteur inconnu : Quadrant 04-B</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-black/40 p-6 rounded-2xl border border-white/5 space-y-4">
              <h4 className="text-[10px] font-black text-indigo-400 uppercase flex items-center gap-2">
                <Rocket size={14}/> Flotte disponible
              </h4>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Chasseurs MK-I</span>
                <span className="text-xl font-mono font-black text-white">{planet.light_hunter_count || 0}</span>
              </div>
            </div>

            <div className="bg-black/40 p-6 rounded-2xl border border-white/5 space-y-4">
              <h4 className="text-[10px] font-black text-amber-500 uppercase flex items-center gap-2">
                <AlertTriangle size={14}/> Risques estimés
              </h4>
              <div className="space-y-2">
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full w-[30%]"></div>
                </div>
                <div className="flex justify-between text-[9px] font-bold uppercase">
                  <span className="text-slate-500">Menace Pirate</span>
                  <span className="text-amber-500">Faible</span>
                </div>
              </div>
            </div>
          </div>

          <Button 
            onClick={launchExpedition} 
            disabled={isInMission || !hasShips}
            className={`w-full h-16 font-black tracking-widest uppercase shadow-lg transition-all ${
              isInMission ? 'bg-slate-900 text-slate-400 border border-white/5' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
            }`}
          >
            {isLaunching && timeLeft === null ? (
              <span className="flex items-center gap-3 animate-pulse">
                <Rocket size={20} className="animate-bounce" /> Initialisation...
              </span>
            ) : timeLeft !== null && timeLeft > 0 ? (
              <span className="flex items-center gap-3">
                <Timer size={20} className="animate-pulse" /> Mission : {timeLeft}s
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <Send size={18} /> Lancer l'expédition
              </span>
            )}
          </Button>
        </div>

        <div className="bg-slate-950 border border-white/5 p-6 rounded-2xl font-mono">
          <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 flex items-center gap-2 tracking-widest">
            Historique des transmissions
          </h4>
          <div className="text-[10px] space-y-2">
            <p className="text-indigo-400/70">&gt; [03:42] Analyse des capteurs terminée.</p>
            {isInMission && <p className="text-white animate-pulse">&gt; [SYNC] Vaisseau en distorsion...</p>}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900 p-8 rounded-3xl border border-white/5 shadow-xl">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
            <Database size={14}/> Butins potentiels
          </h4>
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">Métal rare</span>
              <span className="text-xs text-green-400 font-black">+15,000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}