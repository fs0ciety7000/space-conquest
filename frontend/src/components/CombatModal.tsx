import { useEffect, useState } from 'react';
import { X, Skull, Trophy, ShieldAlert, Crosshair, Terminal, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CombatReport {
  winner: string;
  log: string[];
  loot: number;
  losses?: {
    light_hunter: number;
    cruiser: number;
  };
}

interface CombatModalProps {
  report: CombatReport | null;
  onClose: () => void;
}

export default function CombatModal({ report, onClose }: CombatModalProps) {
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);
  
  // Effet machine à écrire
  useEffect(() => {
    if (report) {
      setVisibleLogs([]);
      report.log.forEach((line, index) => {
        setTimeout(() => {
          setVisibleLogs(prev => [...prev, line]);
        }, index * 600);
      });
    }
  }, [report]);

  if (!report) return null;

  const isVictory = report.winner === 'player';
  // Si on a gagné et qu'on a du butin > 0, c'est une "vraie" victoire, sinon c'est juste du calme
  const isCombat = report.log.some(l => l.includes("RADAR") || l.includes("ALERTE"));
  
  const theme = isVictory 
    ? { color: 'text-green-500', border: 'border-green-500/50', bg: 'bg-green-950/90', icon: Trophy }
    : { color: 'text-red-500', border: 'border-red-500/50', bg: 'bg-red-950/90', icon: Skull };

  const Icon = theme.icon;

  // Calcul s'il y a eu des pertes
  const hasLosses = (report.losses?.light_hunter || 0) > 0 || (report.losses?.cruiser || 0) > 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 p-4">
      
      <div className={`w-full max-w-2xl relative overflow-hidden rounded-3xl border-2 ${theme.border} bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]`}>
        
        {/* Header */}
        <div className={`p-6 border-b border-white/10 flex justify-between items-center ${theme.bg}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-black/40 border border-white/10 ${isVictory ? 'animate-bounce' : 'animate-pulse'}`}>
                <Icon size={32} className={theme.color} />
            </div>
            <div>
                <h2 className={`text-2xl font-black uppercase tracking-tighter text-white`}>
                    {isCombat ? (isVictory ? "Victoire Hostile" : "Échec Critique") : "Rapport Exploration"}
                </h2>
                <p className="text-[10px] uppercase tracking-widest text-white/70 font-mono">
                    Mission #492-X
                </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 md:p-8 space-y-6 bg-[url('/assets/grid.png')] bg-repeat overflow-y-auto">
            
            {/* Terminal Screen */}
            <div className="bg-black/90 border border-white/10 rounded-xl p-4 font-mono text-xs relative shadow-inner min-h-[150px]">
                <div className="absolute top-2 right-2 flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse delay-75"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse delay-150"></div>
                </div>
                
                <div className="space-y-2">
                    {visibleLogs.map((log, i) => (
                        <div key={i} className="flex gap-3 animate-in slide-in-from-left-2 duration-300">
                            <span className="text-slate-600">[{i < 9 ? `0${i+1}` : i+1}]</span>
                            <span className={log.includes("DÉFAITE") || log.includes("ALERTE") || log.includes("PERTES") ? "text-red-400 font-bold" : "text-green-400"}>
                                {log}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Résumé Butin */}
                {report.loot > 0 && (
                    <div className="flex items-center justify-between bg-green-950/20 border border-green-500/30 p-4 rounded-xl">
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="text-green-500" />
                            <span className="text-xs uppercase font-bold text-green-400">Ressources</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Métal</span>
                            <span className="text-xl font-black text-white">+{report.loot.toLocaleString()}</span>
                        </div>
                    </div>
                )}

                {/* Résumé Pertes - S'affiche uniquement s'il y a des pertes */}
                {hasLosses && (
                    <div className="flex flex-col justify-center bg-red-950/20 border border-red-500/30 p-4 rounded-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <Crosshair className="text-red-500" />
                            <span className="text-xs uppercase font-bold text-red-400">Pertes Confirmées</span>
                        </div>
                        <div className="space-y-1 text-right">
                            {(report.losses?.light_hunter || 0) > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Chasseurs</span>
                                    <span className="text-red-500 font-bold">-{report.losses?.light_hunter}</span>
                                </div>
                            )}
                            {(report.losses?.cruiser || 0) > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Croiseurs</span>
                                    <span className="text-red-500 font-bold">-{report.losses?.cruiser}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <Button onClick={onClose} className={`w-full py-6 font-black uppercase tracking-widest ${isVictory ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}>
                Fermer le rapport
            </Button>
        </div>
      </div>
    </div>
  );
}