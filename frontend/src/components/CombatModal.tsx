import { useEffect, useState } from 'react';
import { X, Skull, Trophy, ShieldAlert, Crosshair, Ban, User } from "lucide-react";
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
    // Si c'est une string (JSON stocké en DB), on parse
    if (typeof report === 'string') {
        try {
            data = JSON.parse(report);
        } catch (e) {
            console.error("Erreur de parsing rapport:", e);
            return;
        }
    }
    setParsedReport(data);

    // Animation des logs (uniquement si le tableau 'log' existe)
    if (data && Array.isArray(data.log)) {
        setVisibleLogs([]);
        const timeouts: NodeJS.Timeout[] = [];
        data.log.forEach((line: string, index: number) => {
            const id = setTimeout(() => {
                setVisibleLogs(prev => [...prev, line]);
            }, index * 200); // 200ms pour aller un peu plus vite
            timeouts.push(id);
        });
        return () => timeouts.forEach(clearTimeout);
    } else {
        // Si pas de logs textuels (ex: historique simplifié), on vide
        setVisibleLogs([]);
    }
  }, [report]);

  if (!parsedReport) return null;

  // --- 2. NORMALISATION DES DONNÉES (Fixe les incompatibilités Live vs DB) ---

  // A. Détection du Rôle (Attaquant ou Défenseur)
  // 'is_defense' vient souvent du Live, 'mission_type' vient de la DB
  const isDefense = parsedReport.is_defense === true || parsedReport.mission_type === 'defense';
  const isAttacker = !isDefense;

  // B. Résolution du Nom de l'Adversaire
  // Priorité : username (DB) > name (Live) > target (fallback)
  const opponentName = 
    parsedReport.opponent_username || 
    parsedReport.opponent_name || 
    parsedReport.target_name || 
    "Inconnu";

  // C. Détermination de la Victoire
  let isVictory = false;
  
  if (parsedReport.result) {
      // Cas DB : 'victory' ou 'defeat' est explicite
      isVictory = parsedReport.result === 'victory';
  } else {
      // Cas Live : Calculé selon le 'winner'
      if (parsedReport.winner === 'player') isVictory = true;
      else if (parsedReport.winner === 'attacker') isVictory = isAttacker;
      else if (parsedReport.winner === 'defender') isVictory = isDefense;
  }

  // D. Calcul du Butin (Gestion Flat vs Nested)
  let lootMetal = 0;
  let lootCrystal = 0;
  let lootDeuterium = 0;

  if (parsedReport.loot && typeof parsedReport.loot === 'object') {
      // Format Live : { loot: { metal: 100, ... } }
      lootMetal = parsedReport.loot.metal || 0;
      lootCrystal = parsedReport.loot.crystal || 0;
      lootDeuterium = parsedReport.loot.deuterium || 0;
  } else if (typeof parsedReport.loot === 'number') {
      // Format Simple : loot total
      lootMetal = parsedReport.loot;
  } else {
      // Format DB (Flat) : loot_metal à la racine
      lootMetal = parsedReport.loot_metal || 0;
      lootCrystal = parsedReport.loot_crystal || 0;
      lootDeuterium = parsedReport.loot_deuterium || 0;
  }
  
  const lootTotal = lootMetal + lootCrystal + lootDeuterium;

  // E. Calcul des Pertes
  const lossesCount = (parsedReport.ships_lost !== undefined) 
    ? parsedReport.ships_lost // Format DB
    : (parsedReport.losses?.ships || 0) // Format Live
      + (parsedReport.losses?.light_hunter || 0) 
      + (parsedReport.losses?.cruiser || 0)
      + (parsedReport.losses?.missiles || 0)
      + (parsedReport.losses?.plasmas || 0);

  const hasLosses = lossesCount > 0;
  const hasLogs = visibleLogs.length > 0;

  // --- 3. THÈME VISUEL ---
  const theme = isVictory 
    ? { color: 'text-green-500', border: 'border-green-500/50', bg: 'bg-green-950/90', icon: Trophy, title: "VICTOIRE" }
    : { color: 'text-red-500', border: 'border-red-500/50', bg: 'bg-red-950/90', icon: Skull, title: "DÉFAITE" };

  const Icon = theme.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 p-4">
      <div className={`w-full max-w-2xl relative overflow-hidden rounded-3xl border-2 ${theme.border} bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]`}>
        
        {/* HEADER */}
        <div className={`p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r ${isVictory ? 'from-green-900/20' : 'from-red-900/20'} to-black`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-black/40 border border-white/10 ${isVictory ? 'animate-bounce' : 'animate-pulse'}`}>
                <Icon size={32} className={theme.color} />
            </div>
            <div>
                <h2 className={`text-3xl font-black uppercase tracking-tighter text-white drop-shadow-md`}>
                    {theme.title}
                </h2>
                <div className="flex flex-col gap-1">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-mono flex items-center gap-2">
                        <Crosshair size={12}/> {isDefense ? "RAPPORT DÉFENSIF" : "RAPPORT OFFENSIF"}
                    </p>
                    <p className="text-xs font-bold text-white flex items-center gap-2">
                        <User size={12} className="text-slate-500"/> 
                        <span className="text-slate-500">Cdt.</span> 
                        <span className="uppercase tracking-wider text-cyan-400">{opponentName}</span>
                    </p>
                </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full"><X size={24} /></button>
        </div>

        {/* CONTENU PRINCIPAL */}
        <div className="p-6 md:p-8 space-y-6 bg-[url('/assets/grid.png')] bg-repeat overflow-y-auto custom-scrollbar">
            
            {/* LOGS TEXTUELS (Seulement si disponibles) */}
            {hasLogs ? (
                <div className="bg-slate-950 border border-white/10 rounded-xl p-4 font-mono text-xs relative shadow-inner min-h-[150px]">
                    <div className="space-y-1.5">
                        {visibleLogs.map((log, i) => (
                            <div key={i} className="flex gap-3 animate-in slide-in-from-left-2 duration-300">
                                <span className="text-slate-700 font-bold">[{i < 9 ? `0${i+1}` : i+1}]</span>
                                <span className={
                                    log.includes("VICTOIRE") ? "text-green-400 font-bold" : 
                                    log.includes("DÉFAITE") || log.includes("PERTES") ? "text-red-400 font-bold" : 
                                    "text-slate-300"
                                }>{log}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-slate-950/50 border border-white/5 rounded-xl p-4 text-center text-slate-500 italic text-xs">
                    Archive historique - Détails tactiques non disponibles
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* BUTIN / PERTES RESSOURCES */}
                {Math.abs(lootTotal) > 0 && (
                    <div className={`flex items-center justify-between border p-4 rounded-xl ${isAttacker ? 'bg-green-950/20 border-green-500/30' : 'bg-red-950/20 border-red-500/30'}`}>
                        <div className="flex items-center gap-3">
                            {isAttacker ? <ShieldAlert className="text-green-500" /> : <Ban className="text-red-500" />}
                            <span className={`text-xs uppercase font-bold ${isAttacker ? 'text-green-400' : 'text-red-400'}`}>
                                {isAttacker ? "Butin Capturé" : "Ressources Pillées"}
                            </span>
                        </div>
                        <div className="text-right flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Total</span>
                            <span className={`text-xl font-black ${isAttacker ? 'text-white' : 'text-red-200'}`}>
                                {isAttacker ? '+' : ''}{Math.floor(Math.abs(lootTotal)).toLocaleString()}
                            </span>
                             {/* Détail ressources (utile pour le debug ou info avancée) */}
                             <div className="text-[9px] text-slate-500 font-mono mt-1 opacity-70">
                                M: {Math.floor(Math.abs(lootMetal))} | C: {Math.floor(Math.abs(lootCrystal))}
                            </div>
                        </div>
                    </div>
                )}

                {/* PERTES UNITÉS */}
                {hasLosses ? (
                    <div className="flex flex-col justify-center bg-red-950/20 border border-red-500/30 p-4 rounded-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <Crosshair className="text-red-500" />
                            <span className="text-xs uppercase font-bold text-red-400">Pertes Militaires</span>
                        </div>
                        <div className="space-y-1 text-right">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Unités perdues</span>
                                <span className="text-red-500 font-bold">-{lossesCount}</span>
                            </div>
                        </div>
                    </div>
                ) : isVictory && (
                    <div className="flex items-center justify-center bg-green-950/10 border border-green-500/20 p-4 rounded-xl text-green-500/50 text-xs font-bold uppercase tracking-widest">
                        Aucune perte
                    </div>
                )}
            </div>

            <Button onClick={onClose} className={`w-full h-14 font-black uppercase tracking-widest text-white transition-all shadow-lg ${isVictory ? 'bg-green-700 hover:bg-green-600 shadow-green-900/20' : 'bg-red-700 hover:bg-red-600 shadow-red-900/20'}`}>
                Fermer
            </Button>
        </div>
      </div>
    </div>
  );
}