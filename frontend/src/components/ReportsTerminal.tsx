import { useEffect, useState } from "react";
import { ScrollText, Swords, Truck, ArrowDownLeft, ArrowUpRight, ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface CombatLog {
  id: string;
  target_name: string;
  mission_type: string;
  result: string;
  loot_metal: number;
  loot_crystal: number;
  ships_lost: number;
  date: string;
}

interface TransportLog {
  id: string;
  target_planet_id: string;
  target_planet_name: string;
  source_planet_id: string;
  source_planet_name: string;
  metal: number;
  crystal: number;
  deuterium: number;
  date: string;
}

export default function ReportsTerminal({ planetId }: { planetId: string }) {
  const [combatLogs, setCombatLogs] = useState<CombatLog[]>([]);
  const [transportLogs, setTransportLogs] = useState<TransportLog[]>([]);
  const [view, setView] = useState<'combat' | 'transport'>('combat');

  useEffect(() => {
    fetch(`http://localhost:8080/planets/${planetId}/reports`)
      .then(res => res.json())
      .then(setCombatLogs)
      .catch(console.error);

    fetch(`http://localhost:8080/planets/${planetId}/transport-logs`)
      .then(res => res.json())
      .then(setTransportLogs)
      .catch(console.error);
  }, [planetId]);

  // --- CORRECTION TIMEZONE ---
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    // On ajoute 'Z' si absent pour forcer le mode UTC
    const utcDateString = dateString.endsWith("Z") ? dateString : dateString + "Z";
    return formatDistanceToNow(new Date(utcDateString), { addSuffix: true, locale: fr });
  };

  return (
    <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl h-[600px] flex flex-col animate-in fade-in zoom-in-95 duration-500">
      
      {/* HEADER */}
      <div className="bg-black/40 border-b border-white/5 p-4 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
          <ScrollText size={14} className="text-cyan-400" /> Journal de Bord
        </h3>
        
        {/* Onglets */}
        <div className="flex bg-slate-900/50 p-1 rounded-lg">
            <button 
                onClick={() => setView('combat')}
                className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${view === 'combat' ? 'bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(248,113,113,0.2)]' : 'text-slate-500 hover:text-white'}`}
            >
                <Swords size={12} /> Opérations Militaires
            </button>
            <button 
                onClick={() => setView('transport')}
                className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${view === 'transport' ? 'bg-yellow-500/20 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'text-slate-500 hover:text-white'}`}
            >
                <Truck size={12} /> Logistique
            </button>
        </div>
      </div>

      {/* CONTENU */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
        
        {/* VUE COMBAT */}
        {view === 'combat' && (
            combatLogs.length === 0 ? (
                <div className="text-center text-slate-600 text-xs py-10 font-mono">Aucun rapport de combat enregistré.</div>
            ) : (
                combatLogs.map(log => {
                    const isVictory = log.result === 'victory';
                    const isDefense = log.mission_type === 'defense';

                    return (
                        <div key={log.id} className="bg-black/20 border border-white/5 p-3 rounded-lg flex items-center justify-between group hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${isVictory ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {isDefense ? <ShieldAlert size={16} /> : <Swords size={16} />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-black uppercase ${isVictory ? 'text-green-400' : 'text-red-400'}`}>
                                            {isVictory ? "VICTOIRE" : "DÉFAITE"}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                            vs {log.target_name}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                        {formatDate(log.date)}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-xs font-mono text-white">
                                    <span className="text-yellow-500">+{Math.floor(log.loot_metal).toLocaleString()}</span> M / 
                                    <span className="text-cyan-500"> +{Math.floor(log.loot_crystal).toLocaleString()}</span> C
                                </div>
                                <div className="text-[10px] text-red-400/70 font-mono">
                                    Pertes: {log.ships_lost} vso.
                                </div>
                            </div>
                        </div>
                    );
                })
            )
        )}

        {/* VUE LOGISTIQUE */}
        {view === 'transport' && (
            transportLogs.length === 0 ? (
                <div className="text-center text-slate-600 text-xs py-10 font-mono">Aucun mouvement logistique récent.</div>
            ) : (
                transportLogs.map(log => {
                    const isReceived = log.target_planet_id === planetId;
                    
                    return (
                        <div key={log.id} className={`bg-black/20 border p-3 rounded-lg flex items-center justify-between group hover:bg-white/5 transition-colors ${isReceived ? 'border-l-green-500 border-white/5' : 'border-l-yellow-500 border-white/5'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${isReceived ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                    {isReceived ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-black uppercase ${isReceived ? 'text-green-400' : 'text-yellow-400'}`}>
                                            {isReceived ? "REÇU" : "ENVOYÉ"}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                            {isReceived ? "De:" : "Vers:"} 
                                            <span className="text-white font-bold">
                                                {isReceived ? log.source_planet_name : log.target_planet_name}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                        {formatDate(log.date)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 text-right text-xs font-mono">
                                {log.metal > 0 && <span className="text-slate-300">{Math.floor(log.metal).toLocaleString()} <span className="text-[9px] text-slate-500">M</span></span>}
                                {log.crystal > 0 && <span className="text-blue-300">{Math.floor(log.crystal).toLocaleString()} <span className="text-[9px] text-slate-500">C</span></span>}
                                {log.deuterium > 0 && <span className="text-green-300">{Math.floor(log.deuterium).toLocaleString()} <span className="text-[9px] text-slate-500">D</span></span>}
                            </div>
                        </div>
                    )
                })
            )
        )}

      </div>
    </div>
  );
}