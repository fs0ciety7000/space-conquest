import { useEffect, useState } from 'react';
import { X, Skull, Trophy, ShieldAlert, Crosshair, Ban, User, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CombatModalProps {
  report: any | null; 
  onClose: () => void;
}

export default function CombatModal({ report, onClose }: CombatModalProps) {
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);
  const [parsedReport, setParsedReport] = useState<any>(null);

  useEffect(() => {
    if (!report) {
      setParsedReport(null);
      return;
    }

    let data = report;
    if (typeof report === 'string') {
        try { data = JSON.parse(report); } 
        catch (e) { console.error("Erreur parsing", e); return; }
    }
    setParsedReport(data);

    if (data && Array.isArray(data.log)) {
        setVisibleLogs([]);
        const timeouts: NodeJS.Timeout[] = [];
        data.log.forEach((line: string, index: number) => {
            const id = setTimeout(() => setVisibleLogs(prev => [...prev, line]), index * 100);
            timeouts.push(id);
        });
        return () => timeouts.forEach(clearTimeout);
    }
  }, [report]);

  if (!parsedReport) return null;

  // --- LOGIQUE DE NORMALISATION ---

  // 1. Rôle : Défenseur ou Attaquant
  const isDefense = parsedReport.is_defense === true || parsedReport.mission_type === 'defense';
  const isAttacker = !isDefense;

  // 2. Nom de l'Adversaire
  const opponentName = 
    parsedReport.opponent_username || 
    parsedReport.opponent_name || 
    (isAttacker ? parsedReport.target_name : "Commandant Inconnu");

  // 3. État de la Victoire
  let isVictory = false;
  if (parsedReport.result) {
      isVictory = parsedReport.result === 'victory';
  } else {
      if (parsedReport.winner === 'player') isVictory = true; 
      else if (parsedReport.winner === 'attacker') isVictory = isAttacker;
      else if (parsedReport.winner === 'defender') isVictory = isDefense;
  }

  // 4. Calcul du Butin (Gestion des formats imbriqués et plats)
  const lootMetal = parsedReport.loot?.metal ?? parsedReport.loot_metal ?? (typeof parsedReport.loot === 'number' ? parsedReport.loot : 0);
  const lootCrystal = parsedReport.loot?.crystal ?? parsedReport.loot_crystal ?? 0;
  const lootTotal = Math.abs(lootMetal + lootCrystal + (parsedReport.loot?.deuterium ?? parsedReport.loot_deuterium ?? 0));

  // 5. Calcul des Pertes
  const lossesCount = typeof parsedReport.ships_lost === 'number' 
    ? parsedReport.ships_lost 
    : (parsedReport.losses?.ships || 0) + (parsedReport.losses?.light_hunter || 0) + (parsedReport.losses?.cruiser || 0);

  const theme = isVictory 
    ? { color: 'text-green-500', border: 'border-green-500/50', icon: Trophy, title: "VICTOIRE" }
    : { color: 'text-red-500', border: 'border-red-500/50', icon: Skull, title: "DÉFAITE" };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className={`w-full max-w-2xl relative overflow-hidden rounded-3xl border-2 ${theme.border} bg-slate-950 shadow-2xl flex flex-col max-h-[90vh]`}>
        
        {/* HEADER */}
        <div className={`p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r ${isVictory ? 'from-green-900/30' : 'from-red-900/30'} to-slate-950`}>
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 shadow-xl">
                <theme.icon size={36} className={theme.color} />
            </div>
            <div>
                <h2 className="text-4xl font-black uppercase tracking-tighter text-white">{theme.title}</h2>
                <div className="flex flex-col gap-1">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-mono flex items-center gap-2">
                        <Swords size={12}/> {isDefense ? "RAPPORT DÉFENSIF" : "RAPPORT OFFENSIF"}
                    </p>
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                        <User size={14} className="text-slate-500"/> 
                        <span className="uppercase tracking-wider text-cyan-400">{opponentName}</span>
                    </p>
                </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X size={24} /></button>
        </div>

        {/* CONTENU */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
            {/* LOGS */}
            <div className="bg-slate-950 border border-white/10 rounded-xl p-4 font-mono text-xs shadow-inner max-h-[250px] overflow-y-auto">
                <div className="space-y-2">
                    {visibleLogs.map((log, i) => (
                        <div key={i} className="flex gap-3">
                            <span className="text-slate-600 font-bold">[{i+1}]</span>
                            <span className={log.includes("VICTOIRE") ? "text-green-400" : log.includes("DÉFAITE") ? "text-red-400" : "text-slate-300"}>{log}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* BUTIN / VOL */}
                {lootTotal > 0 && (
                    <div className={`flex items-center justify-between border p-4 rounded-xl shadow-lg ${isAttacker ? 'bg-green-950/20 border-green-500/30' : 'bg-red-950/20 border-red-500/30'}`}>
                        <div className="flex flex-col">
                            <span className={`text-[10px] uppercase font-bold ${isAttacker ? 'text-green-400' : 'text-red-400'}`}>
                                {isAttacker ? "Butin Capturé" : "Ressources Volées"}
                            </span>
                            <span className="text-2xl font-black text-white">
                                {isAttacker ? '+' : '-'}{Math.floor(lootTotal).toLocaleString()}
                            </span>
                        </div>
                        <ShieldAlert size={32} className={isAttacker ? 'text-green-500/30' : 'text-red-500/30'} />
                    </div>
                )}

                {/* PERTES */}
                <div className="flex items-center justify-between bg-red-950/20 border border-red-500/30 p-4 rounded-xl shadow-lg">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-red-400">Pertes Militaires</span>
                        <span className="text-2xl font-black text-red-500">-{lossesCount.toLocaleString()}</span>
                    </div>
                    <Crosshair size={32} className="text-red-500/30" />
                </div>
            </div>

            <Button onClick={onClose} className={`w-full h-14 font-black uppercase tracking-widest text-white ${isVictory ? 'bg-green-700 hover:bg-green-600' : 'bg-red-700 hover:bg-red-600'}`}>
                Fermer le rapport
            </Button>
        </div>
      </div>
    </div>
  );
}