import { useEffect, useState } from 'react';
import { ScrollText, ShieldAlert, Swords, Skull, Trophy, Search } from "lucide-react";
import { Card } from "@/components/ui/card";

interface CombatLog {
  id: string;
  target_name: string;
  mission_type: 'attack' | 'defense' | 'expedition';
  result: string;
  loot_metal: number;
  loot_crystal: number;
  ships_lost: number;
  date: string;
}

export default function ReportsTerminal({ planetId }: { planetId: string }) {
  const [logs, setLogs] = useState<CombatLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch(`http://localhost:8080/planets/${planetId}/reports`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [planetId]);

  if (loading) return <div className="text-center p-8 animate-pulse text-cyan-500 font-mono">DÉCRYPTAGE DES ARCHIVES...</div>;

  if (logs.length === 0) return (
    <div className="text-center p-12 text-slate-500 border border-white/5 rounded-3xl bg-black/40">
        <ScrollText size={48} className="mx-auto mb-4 opacity-50"/>
        <p className="uppercase tracking-widest text-xs">Aucune archive de combat</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
        
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
            <ScrollText className="text-slate-300" />
        </div>
        <div>
            <h2 className="text-2xl font-black uppercase text-white tracking-tighter">Archives Militaires</h2>
            <p className="text-xs text-slate-400 font-mono">Historique des opérations</p>
        </div>
      </div>

      <div className="grid gap-3">
        {logs.map((log) => {
            const isVictory = log.result === 'victory' || log.result === 'player';
            const isDefense = log.mission_type === 'defense';
            const isExpedition = log.mission_type === 'expedition';

            let Icon = Swords;
            let color = isVictory ? "text-green-500" : "text-red-500";
            let bg = isVictory ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20";
            
            if (isDefense) {
                Icon = ShieldAlert;
                color = isVictory ? "text-blue-400" : "text-red-500"; // Bleu si on a défendu avec succès
                bg = isVictory ? "bg-blue-500/10 border-blue-500/20" : "bg-red-500/10 border-red-500/20";
            } else if (isExpedition) {
                Icon = Search;
                color = isVictory ? "text-cyan-400" : "text-orange-500";
                bg = isVictory ? "bg-cyan-500/10 border-cyan-500/20" : "bg-orange-500/10 border-orange-500/20";
            }

            return (
                <Card key={log.id} className={`p-4 border ${bg} backdrop-blur-sm transition-all hover:bg-white/5 flex items-center justify-between group`}>
                    
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full bg-black/40 border border-white/5 ${color}`}>
                            <Icon size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-black uppercase tracking-wider ${color}`}>
                                    {isVictory ? "SUCCÈS" : "ÉCHEC"}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                    {new Date(log.date).toLocaleTimeString()}
                                </span>
                            </div>
                            <h3 className="text-sm font-bold text-white uppercase mt-0.5">
                                {isDefense ? `Défense vs ${log.target_name}` : 
                                 isExpedition ? "Expédition Lointaine" : 
                                 `Attaque sur ${log.target_name}`}
                            </h3>
                        </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                        {/* Ressources */}
                        {(log.loot_metal !== 0 || log.loot_crystal !== 0) && (
                            <div className={`text-xs font-mono font-bold ${log.loot_metal > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {log.loot_metal > 0 ? '+' : ''}{Math.round(log.loot_metal).toLocaleString()} M.
                            </div>
                        )}
                        
                        {/* Pertes */}
                        {log.ships_lost > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-red-400 uppercase font-bold">
                                <Skull size={10} /> -{log.ships_lost} Vaisseaux
                            </div>
                        )}
                        
                        {log.ships_lost === 0 && isVictory && (
                            <span className="text-[10px] text-green-500/50 uppercase font-bold">Aucune perte</span>
                        )}
                    </div>
                </Card>
            );
        })}
      </div>
    </div>
  );
}