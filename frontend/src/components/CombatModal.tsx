import { useEffect, useState } from 'react';
import { X, Skull, Trophy, ShieldAlert, User, Swords, Box, Gem, Droplets, Zap, Activity, Rocket, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CombatModalProps {
  report: any | null;
  onClose: () => void;
}

export default function CombatModal({ report, onClose }: CombatModalProps) {
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);
  const [parsedReport, setParsedReport] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!report) {
      setParsedReport(null);
      setVisibleLogs([]);
      setLoadError(null);
      return;
    }

    let data = report;

    // Si c'est une string JSON, parser
    if (typeof report === 'string') {
      try {
        data = JSON.parse(report);
      } catch (e) {
        console.error("Erreur parsing rapport:", e);
        setLoadError("Format de rapport invalide");
        return;
      }
    }

    // Si on a une erreur du backend
    if (data?.error) {
      setLoadError(data.error);
      return;
    }

    setLoadError(null);
    setParsedReport(data);

    // Animation des logs
    const logs = data?.log || data?.logs || [];
    if (Array.isArray(logs) && logs.length > 0) {
      setVisibleLogs([]);

      const timeouts: NodeJS.Timeout[] = [];

      logs.forEach((line: string, index: number) => {
        const timeoutId = setTimeout(() => {
          setVisibleLogs(prev => {
            if (prev.length > index) return prev;
            return [...prev, line];
          });
        }, index * 80);
        timeouts.push(timeoutId);
      });

      return () => {
        timeouts.forEach(clearTimeout);
      };
    } else {
      // Pas de logs, afficher un message par défaut
      setVisibleLogs(["Aucun log de combat détaillé disponible."]);
    }
  }, [report]);

  // Affichage d'erreur
  if (loadError) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
        <div className="w-full max-w-md relative overflow-hidden rounded-2xl border border-red-500/50 bg-slate-950 shadow-2xl p-8 text-center">
          <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Rapport non disponible</h2>
          <p className="text-slate-400 text-sm mb-6">{loadError}</p>
          <Button onClick={onClose} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
            Fermer
          </Button>
        </div>
      </div>
    );
  }

  if (!parsedReport) return null;

  // --- NORMALISATION ---
  const missionType = parsedReport.mission_type || 'attack';
  const isExpedition = missionType === 'expedition';
  const isDefense = parsedReport.is_defense === true || missionType === 'defense';
  const isAttacker = !isDefense;

  const opponentName = isExpedition
    ? "Pirates Galactiques"
    : (parsedReport.opponent_username || parsedReport.opponent_name || parsedReport.target_name || "Commandant Inconnu");

  // Détermination victoire/défaite
  let isVictory = false;
  let isDraw = false;

  if (parsedReport.result) {
    isVictory = parsedReport.result === 'victory';
    isDraw = parsedReport.result === 'draw';
  } else if (parsedReport.winner) {
    if (parsedReport.winner === 'attacker') isVictory = isAttacker;
    else if (parsedReport.winner === 'defender') isVictory = isDefense;
    else if (parsedReport.winner === 'player' || parsedReport.winner === 'victory') isVictory = true;
    else if (parsedReport.winner === 'defeat') isVictory = false;
    isDraw = parsedReport.winner === 'draw';
  }

  // Ressources
  const loot = {
    metal: parsedReport.loot?.metal ?? parsedReport.loot_metal ?? 0,
    crystal: parsedReport.loot?.crystal ?? parsedReport.loot_crystal ?? 0,
    deuterium: parsedReport.loot?.deuterium ?? parsedReport.loot_deuterium ?? 0,
  };
  const lootTotal = Math.floor(Math.abs(loot.metal + loot.crystal + loot.deuterium));

  // Pertes (On différencie les vaisseaux des structures)
  const attackerLosses = parsedReport.attacker_losses ?? parsedReport.ships_lost ?? 0;
  const defenderLosses = parsedReport.defender_losses ?? 0;
  const structureLosses = (parsedReport.lost_missiles ?? 0) + (parsedReport.lost_plasmas ?? 0);

  // Thème visuel
  let theme;
  if (isDraw) {
    theme = { color: 'text-slate-400', border: 'border-slate-500/50', icon: Swords, title: "MATCH NUL" };
  } else if (isVictory) {
    theme = { color: 'text-green-500', border: 'border-green-500/50', icon: isExpedition ? Rocket : Trophy, title: isExpedition ? "EXPÉDITION RÉUSSIE" : "VICTOIRE" };
  } else {
    theme = { color: 'text-red-500', border: 'border-red-500/50', icon: Skull, title: isExpedition ? "EXPÉDITION ÉCHOUÉE" : "DÉFAITE" };
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className={`w-full max-w-3xl relative rounded-3xl border-2 ${theme.border} bg-slate-950 shadow-[0_0_50px_rgba(0,0,0,0.5)] my-4`}>

        {/* HEADER TACTIQUE */}
        <div className={`p-4 sm:p-6 border-b border-white/10 flex justify-between items-start sm:items-center bg-gradient-to-r ${isVictory ? 'from-green-900/40' : isDraw ? 'from-slate-800/40' : 'from-red-900/40'} to-transparent rounded-t-3xl`}>
          <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
            <div className={`p-3 sm:p-4 rounded-2xl bg-black/60 border border-white/10 shadow-2xl ${theme.color} shrink-0`}>
                <theme.icon size={32} className="sm:w-10 sm:h-10" />
            </div>
            <div className="min-w-0">
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tighter text-white leading-none">{theme.title}</h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-mono text-slate-300">
                        {isExpedition ? "ZONE D'EXPÉDITION" : isDefense ? "SECTEUR DÉFENSIF" : "INCURSION OFFENSIVE"}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                        <User size={14} className="text-slate-500 shrink-0"/> <span className="truncate max-w-[150px] sm:max-w-none">{opponentName}</span>
                    </span>
                </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl shrink-0"><X size={24} /></button>
        </div>

        <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-h-[60vh] overflow-y-auto" style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgb(71 85 105) rgb(15 23 42)'
        }}>
            
            {/* GRILLE DE RESSOURCES (BUTIN) */}
            {lootTotal > 0 && (
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Zap size={12} className="text-yellow-500"/> Transfert de ressources
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        <ResourceBox label="Métal" val={loot.metal} color="text-orange-400" icon={Box} isPos={isAttacker} />
                        <ResourceBox label="Cristal" val={loot.crystal} color="text-cyan-400" icon={Gem} isPos={isAttacker} />
                        <ResourceBox label="Deuterium" val={loot.deuterium} color="text-green-400" icon={Droplets} isPos={isAttacker} />
                    </div>
                </div>
            )}

            {/* ANALYSE DES PERTES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-4 tracking-widest">Pertes Attaquant</span>
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-black text-red-500 font-mono">-{attackerLosses.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-500 mb-2 font-bold uppercase">Unités volantes</span>
                    </div>
                </div>
                <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-4 tracking-widest">Pertes Défenseur</span>
                    <div className="space-y-1">
                        <div className="flex justify-between items-baseline">
                            <span className="text-3xl font-black text-white font-mono">-{defenderLosses.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Vaisseaux</span>
                        </div>
                        <div className="flex justify-between items-baseline border-t border-white/5 pt-1">
                            <span className="text-xl font-black text-orange-500 font-mono">-{structureLosses.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Défenses</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* LOGS DE COMBAT DÉTAILLÉS */}
            <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Activity size={12} className="text-indigo-500"/> Journal de l'IA de Combat
                </h3>
                <div className="bg-gradient-to-b from-slate-950 to-black border border-white/10 rounded-2xl p-4 sm:p-6 shadow-inner max-h-[250px] overflow-y-auto" style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgb(71 85 105) rgb(15 23 42)'
                }}>
                    <div className="space-y-3">
                        {visibleLogs.map((log, i) => {
                            // Détection du type de log pour le style
                            const isRadar = log.includes("RADAR") || log.includes("⚠️");
                            const isResult = log.includes("RESULTAT") || log.includes("RÉSULTAT");
                            const isPillage = log.includes("PILLAGE") || log.includes("DÉCOUVERTE") || log.includes("DECOUVERTE");
                            const isPertes = log.includes("PERTES");
                            const isScan = log.includes("SCAN");
                            const isRound = log.includes("Round");
                            const isVictoire = log.includes("VICTOIRE") || log.includes("Victoire");
                            const isDefaite = log.includes("DÉFAITE") || log.includes("Défaite");

                            // Nettoyer les emojis du texte pour un affichage plus propre
                            const cleanLog = log.replace(/[⚠️🎯💀🏆]/g, '').trim();

                            return (
                                <div 
                                    key={i} 
                                    className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-300 animate-in fade-in slide-in-from-left-2 ${
                                        isRadar ? 'bg-yellow-500/10 border border-yellow-500/30' :
                                        isResult && isVictoire ? 'bg-green-500/10 border border-green-500/30' :
                                        isResult && isDefaite ? 'bg-red-500/10 border border-red-500/30' :
                                        isResult ? 'bg-blue-500/10 border border-blue-500/30' :
                                        isPillage ? 'bg-emerald-500/10 border border-emerald-500/30' :
                                        isPertes ? 'bg-red-500/10 border border-red-500/30' :
                                        isScan ? 'bg-cyan-500/10 border border-cyan-500/30' :
                                        isRound ? 'bg-indigo-500/10 border border-indigo-500/30' :
                                        'bg-slate-900/50 border border-white/5'
                                    }`}
                                    style={{ animationDelay: `${i * 50}ms` }}
                                >
                                    {/* Icône du type de log */}
                                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                                        isRadar ? 'bg-yellow-500/20 text-yellow-400' :
                                        isResult && isVictoire ? 'bg-green-500/20 text-green-400' :
                                        isResult && isDefaite ? 'bg-red-500/20 text-red-400' :
                                        isResult ? 'bg-blue-500/20 text-blue-400' :
                                        isPillage ? 'bg-emerald-500/20 text-emerald-400' :
                                        isPertes ? 'bg-red-500/20 text-red-400' :
                                        isScan ? 'bg-cyan-500/20 text-cyan-400' :
                                        isRound ? 'bg-indigo-500/20 text-indigo-400' :
                                        'bg-slate-700/50 text-slate-500'
                                    }`}>
                                        {isRadar && <AlertCircle size={16} />}
                                        {isResult && <Swords size={16} />}
                                        {isPillage && <Box size={16} />}
                                        {isPertes && <Skull size={16} />}
                                        {isScan && <Activity size={16} />}
                                        {isRound && <Zap size={16} />}
                                        {!isRadar && !isResult && !isPillage && !isPertes && !isScan && !isRound && <Activity size={16} />}
                                    </div>

                                    {/* Contenu du log */}
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-xs sm:text-sm font-medium leading-relaxed ${
                                            isRadar ? 'text-yellow-300' :
                                            isResult && isVictoire ? 'text-green-300 font-bold' :
                                            isResult && isDefaite ? 'text-red-300 font-bold' :
                                            isResult ? 'text-blue-300 font-semibold' :
                                            isPillage ? 'text-emerald-300' :
                                            isPertes ? 'text-red-300' :
                                            isScan ? 'text-cyan-300' :
                                            isRound ? 'text-indigo-300 font-bold' :
                                            'text-slate-300'
                                        }`}>
                                            {cleanLog}
                                        </div>
                                    </div>

                                    {/* Numéro de séquence */}
                                    <span className="shrink-0 text-[10px] font-mono text-slate-600 bg-slate-800/50 px-2 py-1 rounded">
                                        #{i + 1}
                                    </span>
                                </div>
                            );
                        })}
                        {visibleLogs.length === 0 && (
                            <div className="flex items-center justify-center gap-3 p-6 text-slate-600">
                                <Activity size={20} className="animate-pulse" />
                                <span className="text-sm italic">Initialisation des données tactiques...</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Bouton d'archivage fixe en bas */}
        <div className="p-4 sm:p-6 border-t border-white/10 bg-slate-950/80 backdrop-blur-sm rounded-b-3xl">
            <Button onClick={onClose} className={`w-full h-12 sm:h-14 text-sm sm:text-lg font-black uppercase tracking-widest transition-all rounded-xl ${isVictory ? 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 shadow-green-900/30' : isDraw ? 'bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400' : 'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 shadow-red-900/30'} shadow-xl`}>
                Archiver le rapport
            </Button>
        </div>
      </div>
    </div>
  );
}

function ResourceBox({ label, val, color, icon: Icon, isPos }: any) {
    if (val === 0) return null;
    return (
        <div className="bg-slate-900/60 border border-white/5 p-3 rounded-xl flex flex-col items-center justify-center gap-1">
            <Icon size={14} className={color} />
            <span className={`text-sm font-mono font-bold ${val > 0 ? (isPos ? 'text-green-400' : 'text-red-400') : 'text-slate-400'}`}>
                {val > 0 && isPos ? '+' : ''}{Math.floor(val).toLocaleString()}
            </span>
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-tighter">{label}</span>
        </div>
    );
}