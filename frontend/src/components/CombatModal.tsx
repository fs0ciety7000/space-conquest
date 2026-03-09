import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Skull, Trophy, User, Swords, Box, Gem, Droplets, Zap,
  Activity, Rocket, AlertCircle, Target, Shield, Crosshair,
  TrendingUp, TrendingDown, Clock, MapPin, Users, Lock, Loader2, Wrench, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import CombatReplay from './CombatReplay';

// Mapping des clés de vaisseaux vers leurs noms d'affichage
const getShipDisplayName = (shipKey: string): string => {
  const shipNames: Record<string, string> = {
    light_hunter: "Chasseur Léger",
    cruiser: "Croiseur",
    transporter: "Transporteur",
    spy_probe: "Sonde d'Espionnage",
    recycler: "Recycleur",
    colony_ship: "Vaisseau de Colonisation",
    battleship: "Cuirassé",
    destroyer: "Destructeur",
    death_star: "Étoile de la Mort",
    // Défenses
    missile_launcher: "Lanceur de Missiles",
    plasma_turret: "Tourelle à Plasma",
    laser_cannon: "Canon Laser",
    ion_cannon: "Canon à Ions",
    gauss_cannon: "Canon de Gauss",
  };
  return shipNames[shipKey] || shipKey;
};

interface CombatModalProps {
  report: any | null;
  onClose: () => void;
  onSabotage?: (targetPlanetId: string, actionType: 'disable_mine' | 'steal_tech') => void;
}

export default function CombatModal({ report, onClose, onSabotage }: CombatModalProps) {
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);
  const [parsedReport, setParsedReport] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [sabotageLoading, setSabotageLoading] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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
        }, index * 100);
        timeouts.push(timeoutId);
      });

      return () => {
        timeouts.forEach(clearTimeout);
      };
    } else {
      setVisibleLogs(["Aucun log de combat détaillé disponible."]);
    }
  }, [report]);

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!mounted) return null;

  // Affichage d'erreur
  if (loadError) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
        <div className="w-full max-w-md relative overflow-hidden rounded-3xl border-2 border-red-500/50 bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_0_100px_rgba(239,68,68,0.3)] p-8 text-center animate-in zoom-in-95 fade-in duration-300">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.1),transparent_50%)]" />
          <AlertCircle size={72} className="text-red-500 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
          <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wider">Rapport non disponible</h2>
          <p className="text-slate-400 text-sm mb-8">{loadError}</p>
          <Button 
            onClick={onClose} 
            className="bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider px-8 py-3 rounded-xl shadow-lg shadow-red-900/50 transition-all hover:scale-105"
          >
            Fermer
          </Button>
        </div>
      </div>,
      document.body
    );
  }

  if (!parsedReport) return null;

  // --- CHECK FOR SPY REPORT ---
  const isSpyReport = parsedReport.type === 'spy_report' || parsedReport.type === 'spy_alert';

  if (isSpyReport) {
    // Render spy report modal
    return createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-6 overflow-y-auto"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Effets de fond */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[150px] opacity-30 bg-cyan-500" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-[120px] opacity-20 bg-purple-500" />
        </div>

        <div
          className="w-full max-w-2xl relative rounded-3xl border-2 border-cyan-500/50 bg-gradient-to-b from-cyan-900/30 via-slate-900 to-slate-950 shadow-[0_0_80px_rgba(6,182,212,0.3)] animate-in zoom-in-95 fade-in duration-300"
          style={{ maxHeight: 'calc(100vh - 3rem)' }}
        >
          {/* HEADER */}
          <div className="relative p-6 sm:p-8 border-b border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/50 to-transparent" />

            <div className="relative flex justify-between items-start gap-4">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="relative p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/20 shadow-2xl text-cyan-400">
                  <Target size={40} className="sm:w-12 sm:h-12 drop-shadow-[0_0_20px_currentColor]" />
                </div>

                <div>
                  <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-cyan-400 drop-shadow-lg">
                    {parsedReport.type === 'spy_report' ? 'RAPPORT D\'ESPIONNAGE' : 'ESPIONNAGE DÉTECTÉ'}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className="text-xs bg-white/10 px-3 py-1.5 rounded-full font-mono text-slate-300 border border-white/10 flex items-center gap-2">
                      <MapPin size={12} />
                      {parsedReport.coordinates || 'Coordonnées inconnues'}
                    </span>
                    <span className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                      <User size={16} className="text-slate-500"/>
                      {parsedReport.type === 'spy_report' ? parsedReport.target_player : parsedReport.attacker_player || 'Inconnu'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="text-white/50 hover:text-white hover:bg-white/10 transition-all p-3 rounded-xl shrink-0"
              >
                <X size={28} />
              </button>
            </div>
          </div>

          {/* CONTENU SCROLLABLE */}
          <div
            className="p-6 sm:p-8 space-y-6 overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 20rem)' }}
          >
            {/* INFO TECHNIQUE */}
            {parsedReport.type === 'spy_report' && (
              <div className="bg-slate-800/50 border border-white/10 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Niveau de détection</span>
                  <span className={`text-sm font-bold uppercase px-3 py-1 rounded-full ${
                    parsedReport.detection_level === 'full' ? 'bg-emerald-500/20 text-emerald-400' :
                    parsedReport.detection_level === 'fleet' ? 'bg-yellow-500/20 text-yellow-400' :
                    parsedReport.detection_level === 'resources' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {parsedReport.detection_level === 'full' ? '🔍 SCAN COMPLET' :
                     parsedReport.detection_level === 'fleet' ? '🛸 FLOTTE DÉTECTÉE' :
                     parsedReport.detection_level === 'resources' ? '📦 RESSOURCES SEULEMENT' :
                     '❌ ÉCHEC'}
                  </span>
                </div>
                {parsedReport.tech_difference !== undefined && (
                  <div className="mt-3 text-xs text-slate-500">
                    Différence technologique: <span className={`font-bold ${parsedReport.tech_difference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {parsedReport.tech_difference >= 0 ? '+' : ''}{parsedReport.tech_difference}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* RESSOURCES DÉTECTÉES */}
            {parsedReport.resources && (
              <section className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/20">
                    <Box size={14} className="text-yellow-400" />
                  </div>
                  Ressources détectées
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-xl text-center">
                    <Box size={20} className="text-orange-400 mx-auto mb-2" />
                    <div className="text-xl font-mono font-black text-orange-400">
                      {Math.floor(parsedReport.resources.metal || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-slate-500">Métal</div>
                  </div>
                  <div className="bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-xl text-center">
                    <Gem size={20} className="text-cyan-400 mx-auto mb-2" />
                    <div className="text-xl font-mono font-black text-cyan-400">
                      {Math.floor(parsedReport.resources.crystal || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-slate-500">Cristal</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl text-center">
                    <Droplets size={20} className="text-green-400 mx-auto mb-2" />
                    <div className="text-xl font-mono font-black text-green-400">
                      {Math.floor(parsedReport.resources.deuterium || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-slate-500">Deutérium</div>
                  </div>
                </div>
              </section>
            )}

            {/* FLOTTE DÉTECTÉE */}
            {parsedReport.fleet && Object.keys(parsedReport.fleet).length > 0 && (
              <section className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Rocket size={14} className="text-purple-400" />
                  </div>
                  Flotte détectée
                </h3>
                <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 space-y-2 max-h-60 overflow-y-auto">
                  {Object.entries(parsedReport.fleet).filter(([_, count]) => (count as number) > 0).map(([shipKey, count]) => (
                    <div key={shipKey} className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Rocket size={14} className="text-slate-400" />
                        <span className="text-sm text-white">{getShipDisplayName(shipKey)}</span>
                      </div>
                      <span className="font-mono font-bold text-purple-400">{(count as number).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* DÉFENSES */}
            {parsedReport.defense !== undefined && parsedReport.defense !== null && (
              <section className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <Shield size={14} className="text-red-400" />
                  </div>
                  Défenses totales
                </h3>
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-center">
                  <Shield size={24} className="text-red-400 mx-auto mb-2" />
                  <div className="text-3xl font-mono font-black text-red-400">
                    {parsedReport.defense.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Unités de défense</div>
                </div>
              </section>
            )}

            {/* ALERT INFO (for defender) */}
            {parsedReport.type === 'spy_alert' && (
              <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-xl text-center">
                <AlertCircle size={32} className="text-purple-400 mx-auto mb-3" />
                <p className="text-sm text-slate-300">
                  Votre planète a été espionnée par <span className="font-bold text-purple-400">{parsedReport.attacker_player || 'un joueur inconnu'}</span>
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Depuis: {parsedReport.attacker_planet || 'planète inconnue'}
                </p>
              </div>
            )}

            {/* OPÉRATIONS CLANDESTINES (only for spy_report with tech advantage) */}
            {parsedReport.type === 'spy_report' && parsedReport.target_planet_id && onSabotage && (
              <section className="space-y-4 mt-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <Target size={14} className="text-red-400" />
                  </div>
                  Opérations Clandestines
                </h3>

                {parsedReport.tech_difference >= 1 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      onClick={() => {
                        setSabotageLoading('disable_mine');
                        onSabotage(parsedReport.target_planet_id, 'disable_mine');
                      }}
                      disabled={sabotageLoading !== null}
                      className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold text-sm h-12 border border-orange-400/50 shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50"
                    >
                      {sabotageLoading === 'disable_mine' ? (
                        <Loader2 size={16} className="animate-spin mr-2" />
                      ) : (
                        <Wrench size={16} className="mr-2" />
                      )}
                      Saboter Infrastructure
                    </Button>

                    <Button
                      onClick={() => {
                        setSabotageLoading('steal_tech');
                        onSabotage(parsedReport.target_planet_id, 'steal_tech');
                      }}
                      disabled={sabotageLoading !== null}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm h-12 border border-purple-400/50 shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50"
                    >
                      {sabotageLoading === 'steal_tech' ? (
                        <Loader2 size={16} className="animate-spin mr-2" />
                      ) : (
                        <BookOpen size={16} className="mr-2" />
                      )}
                      Espionnage Industriel
                    </Button>
                  </div>
                ) : (
                  <div className="bg-slate-800/50 border border-white/10 p-4 rounded-xl text-center">
                    <Lock size={24} className="text-slate-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">
                      Avantage technologique insuffisant
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Nécessite: Niveau d'espionnage supérieur à la cible
                    </p>
                  </div>
                )}

                <p className="text-[10px] text-slate-500 text-center italic">
                  ⚠️ Risque de détection: {Math.max(5, 30 - ((parsedReport.tech_difference || 0) * 5))}%
                </p>
              </section>
            )}
          </div>

          {/* FOOTER */}
          <div className="p-6 sm:p-8 border-t border-white/10 bg-black/30">
            <Button
              onClick={onClose}
              className="w-full h-14 text-lg font-black uppercase tracking-widest transition-all rounded-xl bg-gradient-to-r from-cyan-600 to-purple-500 hover:from-cyan-500 hover:to-purple-400 shadow-xl hover:scale-[1.02] hover:shadow-2xl"
            >
              Fermer le rapport
            </Button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // --- NORMALISATION ---
  const missionType = parsedReport.mission_type || 'attack';
  const isExpedition = missionType === 'expedition';
  const isDefense = parsedReport.is_defense === true || missionType === 'defense';
  const isAttacker = !isDefense;

  const opponentName = isExpedition
    ? "Pirates Galactiques"
    : (parsedReport.opponent_username || parsedReport.opponent_name || parsedReport.target_name || "Commandant Inconnu");

  // Détermination victoire/défaite
  // On utilise le champ 'result' qui est maintenant cohérent avec combat_log.result
  // Valeurs possibles: "victory", "defeat", "calm", "draw"
  const reportResult = parsedReport.result || parsedReport.winner || 'defeat';
  const isVictory = reportResult === 'victory' || reportResult === 'calm';
  const isDraw = reportResult === 'draw';

  // Ressources
  const loot = {
    metal: parsedReport.loot?.metal ?? parsedReport.loot_metal ?? 0,
    crystal: parsedReport.loot?.crystal ?? parsedReport.loot_crystal ?? 0,
    deuterium: parsedReport.loot?.deuterium ?? parsedReport.loot_deuterium ?? 0,
  };
  const lootTotal = Math.floor(Math.abs(loot.metal + loot.crystal + loot.deuterium));

  // Pertes
  const attackerLosses = parsedReport.attacker_losses ?? parsedReport.ships_lost ?? 0;
  const defenderLosses = parsedReport.defender_losses ?? 0;
  const structureLosses = (parsedReport.lost_missiles ?? 0) + (parsedReport.lost_plasmas ?? 0);

  // Thème visuel
  const theme = isDraw 
    ? { 
        color: 'text-amber-400', 
        bgGradient: 'from-amber-900/30 via-slate-900 to-slate-950',
        borderColor: 'border-amber-500/50',
        glowColor: 'rgba(245,158,11,0.3)',
        icon: Swords, 
        title: "MATCH NUL",
        buttonGradient: 'from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400'
      }
    : isVictory 
    ? { 
        color: 'text-emerald-400', 
        bgGradient: 'from-emerald-900/30 via-slate-900 to-slate-950',
        borderColor: 'border-emerald-500/50',
        glowColor: 'rgba(16,185,129,0.3)',
        icon: isExpedition ? Rocket : Trophy, 
        title: isExpedition ? "EXPÉDITION RÉUSSIE" : "VICTOIRE",
        buttonGradient: 'from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400'
      }
    : { 
        color: 'text-red-400', 
        bgGradient: 'from-red-900/30 via-slate-900 to-slate-950',
        borderColor: 'border-red-500/50',
        glowColor: 'rgba(239,68,68,0.3)',
        icon: Skull, 
        title: isExpedition ? "EXPÉDITION ÉCHOUÉE" : "DÉFAITE",
        buttonGradient: 'from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400'
      };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Effets de fond */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[150px] opacity-30 ${isVictory ? 'bg-emerald-500' : isDraw ? 'bg-amber-500' : 'bg-red-500'}`} />
        <div className={`absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-[120px] opacity-20 ${isVictory ? 'bg-cyan-500' : isDraw ? 'bg-yellow-500' : 'bg-orange-500'}`} />
      </div>

      <div 
        className={`w-full max-w-4xl relative rounded-3xl border-2 ${theme.borderColor} bg-gradient-to-b ${theme.bgGradient} shadow-[0_0_80px_${theme.glowColor}] animate-in zoom-in-95 fade-in duration-300`}
        style={{ maxHeight: 'calc(100vh - 3rem)' }}
      >
        {/* HEADER */}
        <div className={`relative p-6 sm:p-8 border-b border-white/10 overflow-hidden`}>
          {/* Background gradient for header */}
          <div className={`absolute inset-0 bg-gradient-to-r ${isVictory ? 'from-emerald-900/50' : isDraw ? 'from-amber-900/50' : 'from-red-900/50'} to-transparent`} />
          
          <div className="relative flex justify-between items-start gap-4">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Icône principale */}
              <div className={`relative p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/20 shadow-2xl ${theme.color}`}>
                <theme.icon size={40} className="sm:w-12 sm:h-12 drop-shadow-[0_0_20px_currentColor]" />
                {isVictory && (
                  <div className="absolute inset-0 rounded-2xl bg-emerald-400 animate-ping opacity-20" />
                )}
              </div>
              
              {/* Titre et infos */}
              <div>
                <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight ${theme.color} drop-shadow-lg`}>
                  {theme.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <span className="text-xs bg-white/10 px-3 py-1.5 rounded-full font-mono text-slate-300 border border-white/10 flex items-center gap-2">
                    {isExpedition ? <Crosshair size={12} /> : isDefense ? <Shield size={12} /> : <Target size={12} />}
                    {isExpedition ? "ZONE D'EXPÉDITION" : isDefense ? "SECTEUR DÉFENSIF" : "OPÉRATION OFFENSIVE"}
                  </span>
                  <span className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <User size={16} className="text-slate-500"/>
                    {opponentName}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Bouton fermer */}
            <button 
              onClick={onClose} 
              className="text-white/50 hover:text-white hover:bg-white/10 transition-all p-3 rounded-xl shrink-0"
            >
              <X size={28} />
            </button>
          </div>
        </div>

        {/* CONTENU SCROLLABLE */}
        <div 
          className="p-6 sm:p-8 space-y-8 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 20rem)' }}
        >
          {/* RESSOURCES PILLÉES */}
          {lootTotal > 0 && (
            <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <Zap size={14} className="text-yellow-400" />
                </div>
                Transfert de ressources
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <ResourceCard 
                  label="Métal" 
                  value={loot.metal} 
                  icon={Box} 
                  color="orange"
                  isGain={isAttacker && isVictory}
                />
                <ResourceCard 
                  label="Cristal" 
                  value={loot.crystal} 
                  icon={Gem} 
                  color="cyan"
                  isGain={isAttacker && isVictory}
                />
                <ResourceCard 
                  label="Deutérium" 
                  value={loot.deuterium} 
                  icon={Droplets} 
                  color="green"
                  isGain={isAttacker && isVictory}
                />
              </div>
            </section>
          )}

          {/* JOURNAL D'EXPÉDITION */}
          {isExpedition && parsedReport.log && parsedReport.log.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Rocket size={14} className="text-purple-400" />
                </div>
                Journal d'expédition
              </h3>
              <div className="bg-black/60 border border-white/10 rounded-xl p-4 font-mono space-y-1.5 max-h-64 overflow-y-auto">
                {parsedReport.log.map((line: string, i: number) => (
                  <div key={i} className="text-[11px] text-slate-300 leading-relaxed">
                    <span className="text-slate-600 mr-2">&gt;</span>{line}
                  </div>
                ))}
              </div>

              {/* Pertes par type */}
              {parsedReport.lost_ships && Object.entries(parsedReport.lost_ships).some(([, v]) => (v as number) > 0) && (
                <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-4">
                  <div className="text-[10px] font-bold uppercase text-red-400 mb-3 tracking-widest">Pertes de la flotte</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(parsedReport.lost_ships)
                      .filter(([, v]) => (v as number) > 0)
                      .map(([k, v]) => (
                        <span key={k} className="text-[10px] font-mono text-red-300 bg-red-950/40 px-2.5 py-1 rounded-lg border border-red-900/50">
                          -{v as number} {getShipDisplayName(k)}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Crédits Syndicat */}
              {parsedReport.syndicate_credits_earned > 0 && (
                <div className="bg-yellow-950/20 border border-yellow-500/20 rounded-xl p-4 flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase text-yellow-400 tracking-widest">Crédits Syndicat découverts</div>
                  <div className="text-xl font-mono font-black text-yellow-300">+{parsedReport.syndicate_credits_earned.toFixed(1)} SC</div>
                </div>
              )}
            </section>
          )}

          {/* COMPOSITION DES FLOTTES */}
          {(parsedReport.attacker_initial || parsedReport.defender_initial) && (
            <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <Users size={14} className="text-cyan-400" />
                </div>
                Composition des flottes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Flotte Attaquante */}
                {parsedReport.attacker_initial && (
                  <FleetComposition
                    title="Flotte Attaquante"
                    initialFleet={parsedReport.attacker_initial}
                    remainingFleet={parsedReport.attacker_remaining || {}}
                    color="red"
                  />
                )}

                {/* Flotte Défensive */}
                {parsedReport.defender_initial && (
                  <FleetComposition
                    title="Flotte Défensive"
                    initialFleet={parsedReport.defender_initial}
                    remainingFleet={parsedReport.defender_remaining || {}}
                    color="blue"
                  />
                )}
              </div>
            </section>
          )}

          {/* RAPPORT DÉTAILLÉ (Expansion 5.0 — DetailedCombatReport) */}
          {parsedReport.details && (
            <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/20">
                  <Activity size={14} className="text-violet-400" />
                </div>
                Analyse Tactique Détaillée
              </h3>

              {/* Rounds + Tech bonuses */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 text-center">
                  <Clock size={18} className="text-violet-400 mx-auto mb-2" />
                  <div className="text-3xl font-black font-mono text-violet-400">
                    {parsedReport.details.rounds_played ?? '—'}
                  </div>
                  <div className="text-[10px] font-bold uppercase text-slate-500 mt-1">Rounds</div>
                </div>

                {/* Attacker bonuses */}
                {parsedReport.details.attacker_bonuses && (
                  <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-4">
                    <div className="text-[10px] font-bold uppercase text-red-400 mb-3 tracking-widest">Bonus Attaquant</div>
                    <div className="space-y-1.5">
                      {[
                        { label: 'Armement', value: parsedReport.details.attacker_bonuses.weapons_mult },
                        { label: 'Bouclier', value: parsedReport.details.attacker_bonuses.shield_mult },
                        { label: 'Blindage', value: parsedReport.details.attacker_bonuses.armour_mult },
                      ].map(({ label, value }) => value != null && (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">{label}</span>
                          <span className="text-xs font-mono font-bold text-red-300">
                            ×{typeof value === 'number' ? value.toFixed(2) : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Defender bonuses */}
                {parsedReport.details.defender_bonuses && (
                  <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4">
                    <div className="text-[10px] font-bold uppercase text-blue-400 mb-3 tracking-widest">Bonus Défenseur</div>
                    <div className="space-y-1.5">
                      {[
                        { label: 'Armement', value: parsedReport.details.defender_bonuses.weapons_mult },
                        { label: 'Bouclier', value: parsedReport.details.defender_bonuses.shield_mult },
                        { label: 'Blindage', value: parsedReport.details.defender_bonuses.armour_mult },
                      ].map(({ label, value }) => value != null && (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">{label}</span>
                          <span className="text-xs font-mono font-bold text-blue-300">
                            ×{typeof value === 'number' ? value.toFixed(2) : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pertes détaillées par type (attacker_stats / defender_stats) */}
              {(parsedReport.details.attacker_stats || parsedReport.details.defender_stats) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(['attacker_stats', 'defender_stats'] as const).map((key) => {
                    const stats = parsedReport.details[key];
                    if (!stats) return null;
                    const isAtt = key === 'attacker_stats';
                    const lost = { ...stats.fleet_lost, ...stats.defense_lost };
                    const lostEntries = Object.entries(lost).filter(([, v]) => (v as number) > 0);
                    return (
                      <div key={key} className={`rounded-xl p-4 border ${isAtt ? 'bg-red-900/10 border-red-500/20' : 'bg-blue-900/10 border-blue-500/20'}`}>
                        <div className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isAtt ? 'text-red-400' : 'text-blue-400'}`}>
                          {isAtt ? 'Pertes Attaquant' : 'Pertes Défenseur'}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {lostEntries.length > 0 ? lostEntries.map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400 truncate">{getShipDisplayName(k.replace(/^def_/, ''))}</span>
                              <span className={`font-mono font-bold ml-2 shrink-0 ${isAtt ? 'text-red-300' : 'text-blue-300'}`}>-{(v as number).toLocaleString()}</span>
                            </div>
                          )) : (
                            <span className="text-slate-600 text-[10px] col-span-2">Aucune perte</span>
                          )}
                        </div>
                        {stats.shields_absorbed > 0 && (
                          <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-slate-500">
                            Boucliers absorbés : <span className="text-slate-300 font-mono">{Math.floor(stats.shields_absorbed).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rounds — journal round-par-round */}
              {parsedReport.details.rounds?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <Swords size={12} className="text-violet-400" /> Déroulement du combat
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
                    {parsedReport.details.rounds.map((round: any) => (
                      <div key={round.round} className="bg-slate-900/60 border border-white/5 rounded-lg overflow-hidden">
                        {/* Round header */}
                        <div className="flex items-center gap-3 px-3 py-2 bg-violet-500/5 border-b border-white/5">
                          <div className="shrink-0 w-6 h-6 rounded-md bg-violet-500/20 flex items-center justify-center text-[10px] font-black text-violet-400 font-mono">
                            {round.round}
                          </div>
                          <div className="flex gap-4 flex-1">
                            <span className="text-[10px] text-orange-400 font-mono">
                              ATT ⚡ {Math.floor(round.attacker_damage).toLocaleString()} dmg
                            </span>
                            <span className="text-[10px] text-cyan-400 font-mono">
                              DEF ⚡ {Math.floor(round.defender_damage).toLocaleString()} dmg
                            </span>
                          </div>
                          <div className="flex gap-3">
                            {round.attacker_ships_lost_this_round > 0 && (
                              <span className="text-[10px] text-red-400 font-mono">-{round.attacker_ships_lost_this_round} ATT</span>
                            )}
                            {(round.defender_ships_lost_this_round + round.defender_defenses_lost_this_round) > 0 && (
                              <span className="text-[10px] text-blue-400 font-mono">
                                -{round.defender_ships_lost_this_round + round.defender_defenses_lost_this_round} DEF
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Per-unit events */}
                        {round.events?.length > 0 ? (
                          <div className="px-3 py-2 space-y-0.5">
                            {round.events.map((ev: string, i: number) => (
                              <p key={i} className={`text-[10px] leading-relaxed font-mono ${
                                ev.startsWith('⚔️') ? 'text-red-400/80' : 'text-blue-400/80'
                              }`}>
                                {ev}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <div className="px-3 py-2">
                            <p className="text-[10px] text-slate-400 font-mono">{round.narrative}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Débris générés */}
              {parsedReport.details.debris && (parsedReport.details.debris.metal > 0 || parsedReport.details.debris.crystal > 0) && (
                <div className="bg-slate-800/40 border border-slate-600/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Rocket size={14} className="text-slate-400" />
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Champ de Débris Généré</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Box size={12} className="text-orange-400" />
                        <span className="text-xs text-slate-400">Métal</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-orange-400">
                        +{Math.floor(parsedReport.details.debris.metal).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Gem size={12} className="text-cyan-400" />
                        <span className="text-xs text-slate-400">Cristal</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-cyan-400">
                        +{Math.floor(parsedReport.details.debris.crystal).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ANALYSE DES PERTES */}
          <section className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <Skull size={14} className="text-red-400" />
              </div>
              Bilan des pertes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pertes Attaquant */}
              <div className="bg-slate-900/60 border border-white/10 p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <TrendingDown size={16} className="text-red-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pertes Attaquant</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-red-400 font-mono">-{attackerLosses}</span>
                  <span className="text-sm text-slate-500 font-medium">vaisseaux</span>
                </div>
              </div>

              {/* Pertes Défenseur */}
              <div className="bg-slate-900/60 border border-white/10 p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <Shield size={16} className="text-orange-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pertes Défenseur</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white font-mono">-{defenderLosses}</span>
                    <span className="text-sm text-slate-500 font-medium">vaisseaux</span>
                  </div>
                  {structureLosses > 0 && (
                    <div className="flex items-baseline gap-2 pt-2 border-t border-white/10">
                      <span className="text-2xl font-black text-orange-400 font-mono">-{structureLosses}</span>
                      <span className="text-sm text-slate-500 font-medium">défenses</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* JOURNAL DE COMBAT */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/20">
                  <Activity size={14} className="text-indigo-400" />
                </div>
                Journal de combat
              </h3>
              <Button
                onClick={() => setShowReplay(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-lg"
              >
                Voir le replay
              </Button>
            </div>
            <div className="bg-black/50 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4 sm:p-5 space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                {visibleLogs.map((log, i) => (
                  <LogEntry key={i} log={log} index={i} />
                ))}
                {visibleLogs.length === 0 && (
                  <div className="flex items-center justify-center gap-3 p-8 text-slate-600">
                    <Activity size={24} className="animate-pulse" />
                    <span className="text-sm">Chargement des données tactiques...</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <div className="p-6 sm:p-8 border-t border-white/10 bg-black/30">
          <Button 
            onClick={onClose} 
            className={`w-full h-14 text-lg font-black uppercase tracking-widest transition-all rounded-xl bg-gradient-to-r ${theme.buttonGradient} shadow-xl hover:scale-[1.02] hover:shadow-2xl`}
          >
            Archiver le rapport
          </Button>
        </div>
      </div>
    </div>
  );

  // Si le replay est demandé, afficher le CombatReplay à la place
  if (showReplay && parsedReport) {
    return <CombatReplay report={parsedReport} onClose={() => setShowReplay(false)} />;
  }

  return createPortal(modalContent, document.body);
}

// Composant pour les cartes de ressources
function ResourceCard({ label, value, icon: Icon, color, isGain }: {
  label: string;
  value: number;
  icon: any;
  color: 'orange' | 'cyan' | 'green';
  isGain: boolean;
}) {
  if (value === 0) return null;
  
  const colorClasses = {
    orange: { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
    cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
    green: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400', glow: 'shadow-green-500/20' },
  };
  
  const c = colorClasses[color];
  
  return (
    <div className={`${c.bg} border ${c.border} p-4 rounded-xl flex flex-col items-center justify-center gap-2 shadow-lg ${c.glow} transition-all hover:scale-105`}>
      <div className={`p-2 rounded-lg ${c.bg}`}>
        <Icon size={20} className={c.text} />
      </div>
      <span className={`text-xl sm:text-2xl font-mono font-black ${isGain ? 'text-emerald-400' : 'text-red-400'}`}>
        {isGain ? '+' : '-'}{Math.floor(Math.abs(value)).toLocaleString()}
      </span>
      <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">{label}</span>
    </div>
  );
}

// Composant pour les entrées de log
function LogEntry({ log, index }: { log: string; index: number }) {
  // Détection du type de log
  const isRadar = log.includes("RADAR") || log.includes("⚠️");
  const isResult = log.includes("RESULTAT") || log.includes("RÉSULTAT");
  const isPillage = log.includes("PILLAGE") || log.includes("DÉCOUVERTE") || log.includes("DECOUVERTE") || log.includes("EPAVE");
  const isPertes = log.includes("PERTES");
  const isScan = log.includes("SCAN");
  const isRound = log.includes("Round") || log.includes("TOUR");
  const isVictoire = log.includes("VICTOIRE") || log.includes("Victoire");
  const isDefaite = log.includes("DÉFAITE") || log.includes("Défaite") || log.includes("DESTRUCTION MUTUELLE");

  // Nettoyage des emojis
  const cleanLog = log.replace(/[⚠️🎯💀🏆]/g, '').trim();

  // Configuration du style selon le type
  const getStyle = () => {
    if (isRadar) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', icon: AlertCircle, iconBg: 'bg-yellow-500/20', iconColor: 'text-yellow-400', textColor: 'text-yellow-200' };
    if (isResult && isVictoire) return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', icon: Trophy, iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-400', textColor: 'text-emerald-200 font-bold' };
    if (isResult && isDefaite) return { bg: 'bg-red-500/10', border: 'border-red-500/40', icon: Skull, iconBg: 'bg-red-500/20', iconColor: 'text-red-400', textColor: 'text-red-200 font-bold' };
    if (isResult) return { bg: 'bg-blue-500/10', border: 'border-blue-500/40', icon: Swords, iconBg: 'bg-blue-500/20', iconColor: 'text-blue-400', textColor: 'text-blue-200 font-semibold' };
    if (isPillage) return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', icon: Box, iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-400', textColor: 'text-emerald-200' };
    if (isPertes) return { bg: 'bg-red-500/10', border: 'border-red-500/40', icon: TrendingDown, iconBg: 'bg-red-500/20', iconColor: 'text-red-400', textColor: 'text-red-200' };
    if (isScan) return { bg: 'bg-cyan-500/10', border: 'border-cyan-500/40', icon: Activity, iconBg: 'bg-cyan-500/20', iconColor: 'text-cyan-400', textColor: 'text-cyan-200' };
    if (isRound) return { bg: 'bg-indigo-500/10', border: 'border-indigo-500/40', icon: Zap, iconBg: 'bg-indigo-500/20', iconColor: 'text-indigo-400', textColor: 'text-indigo-200 font-bold' };
    return { bg: 'bg-slate-800/50', border: 'border-slate-700/50', icon: Activity, iconBg: 'bg-slate-700/50', iconColor: 'text-slate-500', textColor: 'text-slate-300' };
  };

  const style = getStyle();
  const IconComponent = style.icon;

  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-xl ${style.bg} border ${style.border} transition-all animate-in fade-in slide-in-from-left-3 duration-300`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Icône */}
      <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${style.iconBg}`}>
        <IconComponent size={18} className={style.iconColor} />
      </div>
      
      {/* Texte */}
      <span className={`flex-1 text-sm leading-relaxed ${style.textColor}`}>
        {cleanLog}
      </span>
      
      {/* Index */}
      <span className="shrink-0 text-[10px] font-mono text-slate-600 bg-black/30 px-2 py-1 rounded-md">
        {String(index + 1).padStart(2, '0')}
      </span>
    </div>
  );
}

// Composant pour afficher la composition d'une flotte
function FleetComposition({ title, initialFleet, remainingFleet, color }: {
  title: string;
  initialFleet: Record<string, number>;
  remainingFleet: Record<string, number>;
  color: 'red' | 'blue';
}) {
  const colorClasses = {
    red: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      title: 'text-red-400',
      item: 'bg-red-500/20',
      loss: 'text-red-400'
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      title: 'text-blue-400',
      item: 'bg-blue-500/20',
      loss: 'text-orange-400'
    },
  };

  const c = colorClasses[color];

  // Filtrer les vaisseaux avec count > 0
  const ships = Object.entries(initialFleet).filter(([_, count]) => count > 0);

  if (ships.length === 0) return null;

  return (
    <div className={`${c.bg} border ${c.border} p-5 rounded-2xl relative overflow-hidden`}>
      <div className="space-y-4">
        <h4 className={`text-sm font-bold ${c.title} uppercase tracking-wide`}>{title}</h4>
        <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-thin pr-2">
          {ships.map(([shipKey, initialCount]) => {
            const remainingCount = remainingFleet[shipKey] || 0;
            const lostCount = initialCount - remainingCount;
            const lossPercentage = Math.round((lostCount / initialCount) * 100);
            const remainPercentage = 100 - lossPercentage;

            return (
              <div key={shipKey} className={`${c.item} p-3 rounded-xl flex flex-col gap-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Rocket size={14} className="text-slate-400" />
                    <span className="text-sm font-bold text-white tracking-wide">{getShipDisplayName(shipKey)}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black font-mono text-white leading-none">{remainingCount.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Restants</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 w-full bg-slate-900 rounded-full overflow-hidden flex">
                    {/* Remaining */}
                    <div 
                      className={`h-full ${remainPercentage > 0 ? (color === 'red' ? 'bg-red-500' : 'bg-blue-500') : ''} transition-all duration-1000 ease-out`} 
                      style={{ width: `${remainPercentage}%` }} 
                    />
                    {/* Lost */}
                    <div 
                      className={`h-full ${lostCount > 0 ? 'bg-red-900/80 animate-pulse' : ''} transition-all duration-1000 ease-out`} 
                      style={{ width: `${lossPercentage}%` }} 
                    />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">
                      Init: {initialCount.toLocaleString()}
                    </span>
                    {lostCount > 0 && (
                      <span className={`${c.loss} font-bold`}>
                        Perte: -{lostCount.toLocaleString()} ({lossPercentage}%)
                      </span>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
