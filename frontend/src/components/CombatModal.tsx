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

  // --- 1. PARSING ET INITIALISATION ---
  useEffect(() => {
    if (!report) {
      setParsedReport(null);
      return;
    }

    let data = report;
    // Gestion du JSON stringifié (cas fréquent des rapports stockés en DB ou LocalStorage)
    if (typeof report === 'string') {
        try {
            data = JSON.parse(report);
        } catch (e) {
            console.error("Erreur de parsing rapport:", e);
            return;
        }
    }
    setParsedReport(data);

    // Animation des logs : Uniquement si 'log' est un tableau
    if (data && Array.isArray(data.log)) {
        setVisibleLogs([]);
        const timeouts: NodeJS.Timeout[] = [];
        data.log.forEach((line: string, index: number) => {
            const id = setTimeout(() => {
                setVisibleLogs(prev => [...prev, line]);
            }, index * 150); // Vitesse d'affichage des logs
            timeouts.push(id);
        });
        return () => timeouts.forEach(clearTimeout);
    } else {
        setVisibleLogs([]);
    }
  }, [report]);

  if (!parsedReport) return null;

  // --- 2. NORMALISATION DES DONNÉES (Le Cœur de la Robustesse) ---

  // A. Détection du Rôle
  // DB: 'mission_type' = 'defense'
  // Live: 'is_defense' = true
  const isDefense = parsedReport.is_defense === true || parsedReport.mission_type === 'defense';
  const isAttacker = !isDefense;

  // B. Résolution du Nom de l'Adversaire
  // Priorité 1: 'opponent_username' (Format DB standard)
  // Priorité 2: 'opponent_name' (Format Live injecté par le backend)
  // Priorité 3: 'target_name' (Format DB pour l'attaquant si opponent_username manque)
  // Fallback: "Adversaire Inconnu"
  const opponentName = 
    parsedReport.opponent_username || 
    parsedReport.opponent_name || 
    (isAttacker ? parsedReport.target_name : "Adversaire Inconnu");

  // C. Détermination de la Victoire
  let isVictory = false;
  if (parsedReport.result) {
      // Cas DB : explicite 'victory' / 'defeat'
      isVictory = parsedReport.result === 'victory';
  } else {
      // Cas Live : déduit du champ 'winner'
      if (parsedReport.winner === 'player') isVictory = true; // Expédition ou PvE
      else if (parsedReport.winner === 'attacker') isVictory = isAttacker;
      else if (parsedReport.winner === 'defender') isVictory = isDefense;
  }

  // D. Calcul du Butin (Unification Flat vs Nested)
  let lootMetal = 0;
  let lootCrystal = 0;
  let lootDeuterium = 0;

  if (parsedReport.loot && typeof parsedReport.loot === 'object') {
      // Format Live : { loot: { metal: 100, ... } }
      lootMetal = parsedReport.loot.metal || 0;
      lootCrystal = parsedReport.loot.crystal || 0;
      lootDeuterium = parsedReport.loot.deuterium || 0;
  } else if (typeof parsedReport.loot === 'number') {
      // Format Simplifié (parfois utilisé pour le total)
      lootMetal = parsedReport.loot;
  } else {
      // Format DB (Flat fields)
      lootMetal = parsedReport.loot_metal || 0;
      lootCrystal = parsedReport.loot_crystal || 0;
      lootDeuterium = parsedReport.loot_deuterium || 0;
  }
  
  // Note: En défense, le butin est souvent stocké en négatif dans la DB pour indiquer une perte.
  // On utilise Math.abs() pour l'affichage.
  const lootTotal = Math.abs(lootMetal + lootCrystal + lootDeuterium);

  // E. Calcul des Pertes
  // DB: 'ships_lost' (int)
  // Live: 'losses' (object)
  let lossesCount = 0;
  if (typeof parsedReport.ships_lost === 'number') {
      lossesCount = parsedReport.ships_lost;
  } else if (parsedReport.losses) {
      lossesCount = (parsedReport.losses.ships || 0) 
                  + (parsedReport.losses.light_hunter || 0) 
                  + (parsedReport.losses.cruiser || 0)
                  + (parsedReport.losses.missiles || 0)
                  + (parsedReport.losses.plasmas || 0);
  }

  const hasLosses = lossesCount > 0;
  const hasLogs = visibleLogs.length > 0;

  // --- 3. THÈME VISUEL ---
  const theme = isVictory 
    ? { color: 'text-green-500', border: 'border-green-500/50', bg: 'bg-green-950/90', icon: Trophy, title: "VICTOIRE", glow: "shadow-green-500/20" }
    : { color: 'text-red-500', border: 'border-red-500/50', bg: 'bg-red-950/90', icon: Skull, title: "DÉFAITE", glow: "shadow-red-500/20" };

  const Icon = theme.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 p-4">
      <div className={`w-full max-w-2xl relative overflow-hidden rounded-3xl border-2 ${theme.border} bg-slate-950 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] ${theme.glow}`}>
        
        {/* HEADER */}
        <div className={`relative p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r ${isVictory ? 'from-green-900/30' : 'from-red-900/30'} to-slate-950`}>
          <div className="flex items-center gap-5">
            <div className={`p-4 rounded-2xl bg-black/40 border border-white/10 shadow-xl ${isVictory ? 'animate-bounce-slow' : ''}`}>
                <Icon size={36} className={theme.color} />
            </div>
            <div>
                <h2 className={`text-4xl font-black uppercase tracking-tighter text-white drop-shadow-lg`}>
                    {theme.title}
                </h2>
                <div className="flex flex-col gap-1 mt-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-mono flex items-center gap-2">
                        <Swords size={12}/> {isDefense ? "RAPPORT DÉFENSIF" : "RAPPORT OFFENSIF"}
                    </p>
                    {opponentName && (
                        <p className="text-sm font-bold text-white flex items-center gap-2 mt-1">
                            <User size={14} className="text-slate-500"/> 
                            <span className="text-slate-500 font-mono text-xs uppercase">Cdt.</span> 
                            <span className="uppercase tracking-wider text-cyan-400 border-b border-cyan-500/30 pb-0.5">{opponentName}</span>
                        </p>
                    )}
                </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full"><X size={24} /></button>
        </div>

        {/* CONTENU PRINCIPAL */}
        <div className="p-6 md:p-8 space-y-6 bg-[url('/assets/grid.png')] bg-repeat overflow-y-auto custom-scrollbar">
            
            {/* LOGS TEXTUELS */}
            {hasLogs ? (
                <div className="bg-slate-950 border border-white/10 rounded-xl p-4 font-mono text-xs relative shadow-inner min-h-[150px] max-h-[300px] overflow-y-auto">
                    <div className="space-y-2">
                        {visibleLogs.map((log, i) => (
                            <div key={i} className="flex gap-3 animate-in slide-in-from-left-2 duration-300">
                                <span className="text-slate-600 font-bold select-none">[{i < 9 ? `0${i+1}` : i+1}]</span>
                                <span className={
                                    log.includes("VICTOIRE") ? "text-green-400 font-bold" : 
                                    log.includes("DÉFAITE") || log.includes("DÉTRUIT") || log.includes("PERDU") ? "text-red-400 font-bold" : 
                                    "text-slate-300"
                                }>{log}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6 text-center">
                    <ShieldAlert className="mx-auto text-slate-600 mb-2" size={24} />
                    <p className="text-slate-500 italic text-xs font-mono">Détails tactiques archivés ou non disponibles.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* BUTIN / PERTES RESSOURCES */}
                {lootTotal > 0 && (
                    <div className={`flex items-center justify-between border p-4 rounded-xl shadow-lg ${isAttacker ? 'bg-green-950/20 border-green-500/30' : 'bg-red-950/20 border-red-500/30'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isAttacker ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                {isAttacker ? <Trophy className="text-green-500" size={20} /> : <Ban className="text-red-500" size={20} />}
                            </div>
                            <div>
                                <span className={`text-[10px] uppercase font-bold tracking-wider block ${isAttacker ? 'text-green-400' : 'text-red-400'}`}>
                                    {isAttacker ? "Butin Capturé" : "Ressources Pillées"}
                                </span>
                                <div className="flex gap-2 text-[9px] text-slate-500 font-mono mt-0.5">
                                    {Math.abs(lootMetal) > 0 && <span>M: {Math.floor(Math.abs(lootMetal))}</span>}
                                    {Math.abs(lootCrystal) > 0 && <span>C: {Math.floor(Math.abs(lootCrystal))}</span>}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`text-2xl font-black ${isAttacker ? 'text-white' : 'text-red-200'}`}>
                                {isAttacker ? '+' : '-'}{Math.floor(lootTotal).toLocaleString()}
                            </span>
                        </div>
                    </div>
                )}

                {/* PERTES UNITÉS */}
                {hasLosses ? (
                    <div className="flex items-center justify-between bg-red-950/20 border border-red-500/30 p-4 rounded-xl shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/10">
                                <Crosshair className="text-red-500" size={20} />
                            </div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-red-400">Pertes Militaires</span>
                        </div>
                        <div className="text-right">
                             <span className="text-2xl font-black text-red-500">-{lossesCount.toLocaleString()}</span>
                             <span className="text-[10px] text-slate-500 font-mono block uppercase">Unités</span>
                        </div>
                    </div>
                ) : isVictory && (
                    <div className="flex items-center justify-center bg-green-950/10 border border-green-500/20 p-4 rounded-xl text-green-500/50 text-xs font-bold uppercase tracking-widest border-dashed">
                        Aucune perte déplorée
                    </div>
                )}
            </div>

            <Button onClick={onClose} className={`w-full h-14 font-black uppercase tracking-widest text-white transition-all shadow-lg text-sm md:text-base ${isVictory ? 'bg-green-700 hover:bg-green-600 shadow-green-900/20' : 'bg-red-700 hover:bg-red-600 shadow-red-900/20'}`}>
                Fermer le rapport
            </Button>
        </div>
      </div>
    </div>
  );
}