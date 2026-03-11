import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ScrollText, Swords, Truck, ArrowDownLeft, ArrowUpRight, ShieldAlert, Trophy, BarChart3, Skull } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { apiUrl } from '@/config/api';
import { toast } from 'sonner';
import CombatModal from './CombatModal';
import CombatReplay from './CombatReplay';
import EconomyLog from './EconomyLog';

interface CombatLog {
  id: string;
  target_name: string;
  opponent_username?: string;
  mission_type: string;
  result: string;
  loot_metal: number;
  loot_crystal: number;
  ships_lost: number;
  date: string;
  // Non-null when a DetailedCombatReport was persisted (Expansion 5.0+)
  details?: Record<string, unknown> | null;
}

interface TransportLog {
  id: string;
  target_planet_id: string;
  target_planet_name: string;
  source_planet_id: string;
  source_planet_name: string;
  opponent_username?: string;
  metal: number;
  crystal: number;
  deuterium: number;
  date: string;
}

interface ExtortionEvent {
  id: string;
  status: string;
  is_target: boolean;
  attacker_name: string;
  target_name: string;
  arrival_time: string;
  resolved_at: string | null;
}

export default function ReportsTerminal({ planetId, initialView }: { planetId: string; initialView?: 'combat' | 'transport' | 'economy' | 'pirates' }) {
  const [combatLogs, setCombatLogs] = useState<CombatLog[]>([]);
  const [transportLogs, setTransportLogs] = useState<TransportLog[]>([]);
  const [extortionHistory, setExtortionHistory] = useState<ExtortionEvent[]>([]);
  const [view, setView] = useState<'combat' | 'transport' | 'economy' | 'pirates'>(initialView ?? 'combat');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  // Holds a combat_log entry for the Tour/Tour inline replay (no full modal fetch needed)
  const [replayLog, setReplayLog] = useState<CombatLog | null>(null);

  useEffect(() => {
    if (initialView) setView(initialView);
  }, [initialView]);

  const [combatPage, setCombatPage] = useState(1);
  const [combatTotal, setCombatTotal] = useState(0);
  const [combatLoading, setCombatLoading] = useState(false);
  const [transportPage, setTransportPage] = useState(1);
  const [transportTotal, setTransportTotal] = useState(0);
  const [transportLoading, setTransportLoading] = useState(false);

  const LIMIT = 20;

  const fetchCombatLogs = async (page: number, reset = false) => {
    setCombatLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/planets/${planetId}/reports?page=${page}&limit=${LIMIT}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json && json.data) {
        setCombatLogs(prev => reset ? json.data : [...prev, ...json.data]);
        setCombatTotal(json.total ?? 0);
      } else if (Array.isArray(json)) {
        setCombatLogs(prev => reset ? json : [...prev, ...json]);
        setCombatTotal(json.length);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCombatLoading(false);
    }
  };

  const fetchTransportLogs = async (page: number, reset = false) => {
    setTransportLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/planets/${planetId}/transport-logs?page=${page}&limit=${LIMIT}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json && json.data) {
        setTransportLogs(prev => reset ? json.data : [...prev, ...json.data]);
        setTransportTotal(json.total ?? 0);
      } else if (Array.isArray(json)) {
        setTransportLogs(prev => reset ? json : [...prev, ...json]);
        setTransportTotal(json.length);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTransportLoading(false);
    }
  };

  useEffect(() => {
    setCombatPage(1);
    setTransportPage(1);
    fetchCombatLogs(1, true);
    fetchTransportLogs(1, true);

    const token = localStorage.getItem('token');
    fetch(apiUrl('/black-market/extortions/history'), { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setExtortionHistory(data.history || []))
      .catch(console.error);
  }, [planetId]);

  const loadMoreCombat = () => {
    if (!combatLoading && combatLogs.length < combatTotal) {
      const next = combatPage + 1;
      setCombatPage(next);
      fetchCombatLogs(next);
    }
  };

  const loadMoreTransport = () => {
    if (!transportLoading && transportLogs.length < transportTotal) {
      const next = transportPage + 1;
      setTransportPage(next);
      fetchTransportLogs(next);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const utcDateString = dateString.endsWith("Z") ? dateString : dateString + "Z";
    return formatDistanceToNow(new Date(utcDateString), { addSuffix: true, locale: fr });
  };

  const handleReportClick = async (reportId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/combat-reports/${reportId}/detail`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const detailedReport = await res.json();
        setSelectedReport(detailedReport);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du rapport détaillé:", error);
    }
  };

  const handleSabotage = async (targetPlanetId: string, actionType: 'disable_mine' | 'steal_tech') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/sabotage'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          target_planet_id: targetPlanetId,
          action_type: actionType
        })
      });

      const data = await res.json();

      if (data.detected) {
        toast.error('🚨 SABOTAGE DÉTECTÉ !', {
          description: 'Vous avez été repéré ! La cible a obtenu un Casus Belli contre vous.',
          duration: 5000
        });
      } else if (data.success) {
        const actionLabel = actionType === 'disable_mine' ? '⚙️ Infrastructure sabotée !' : '📖 Technologie volée !';
        toast.success(actionLabel, {
          description: 'Opération clandestine réussie sans détection.',
          duration: 3000
        });
      } else {
        toast.error('Échec du sabotage', {
          description: data.error || 'Une erreur est survenue'
        });
      }

      setSelectedReport(null);
    } catch (error) {
      console.error("Erreur lors du sabotage:", error);
      toast.error("Erreur lors du sabotage");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] border border-cyan-500/10 rounded-2xl overflow-hidden shadow-2xl h-[600px] flex flex-col"
    >

      {/* HEADER */}
      <div className="bg-black/40 border-b border-cyan-500/10 p-4 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
          <ScrollText size={14} className="text-cyan-400 animate-bounce-subtle" /> Journal de Bord
        </h3>

        {/* Onglets */}
        <div className="flex bg-[rgba(10,5,32,0.85)] p-1 rounded-lg border border-cyan-500/10">
          <button
            onClick={() => setView('combat')}
            className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase transition-all duration-300 hover:scale-105 flex items-center gap-2 ${
              view === 'combat'
                ? 'bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(248,113,113,0.2)] border border-red-500/30'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            <Swords size={12} /> Opérations Militaires
          </button>
          <button
            onClick={() => setView('transport')}
            className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase transition-all duration-300 hover:scale-105 flex items-center gap-2 ${
              view === 'transport'
                ? 'bg-yellow-500/20 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)] border border-yellow-500/30'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            <Truck size={12} /> Logistique
          </button>
          <button
            onClick={() => setView('economy')}
            className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase transition-all duration-300 hover:scale-105 flex items-center gap-2 ${
              view === 'economy'
                ? 'bg-green-500/20 text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.2)] border border-green-500/30'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            <BarChart3 size={12} /> Économie
          </button>
          <button
            onClick={() => setView('pirates')}
            className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase transition-all duration-300 hover:scale-105 flex items-center gap-2 ${
              view === 'pirates'
                ? 'bg-red-900/30 text-red-400 shadow-[0_0_10px_rgba(220,38,38,0.2)] border border-red-500/30'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            <Skull size={12} /> Pirates
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
              const isVictory = log.result === 'victory' || log.result === 'calm';
              const isDefense = log.mission_type === 'defense';
              const isSpy = log.mission_type === 'spy_defense';
              const isExpedition = log.mission_type === 'expedition';
              const isPlanetConquered = log.mission_type === 'planet_conquered';
              const isPlanetLost = log.mission_type === 'planet_lost';

              if (isPlanetConquered) {
                return (
                  <div
                    key={log.id}
                    onClick={() => handleReportClick(log.id)}
                    className="bg-gradient-to-r from-yellow-950/20 to-orange-950/20 border border-yellow-500/30 p-3 rounded-lg flex items-center justify-between hover:border-yellow-500/50 hover:bg-yellow-950/30 transition-all duration-150 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400">
                        <Trophy size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-yellow-400">
                            🎯 CONQUÊTE RÉUSSIE
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                            {log.target_name}
                          </span>
                        </div>
                        <div className="text-[10px] text-yellow-300 mt-0.5">
                          Planète conquise ! Anciennement à {log.opponent_username}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {formatDate(log.date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono tabular-nums text-slate-200">
                        <span className="text-yellow-500">+{Math.floor(log.loot_metal).toLocaleString()}</span> M /
                        <span className="text-cyan-400"> +{Math.floor(log.loot_crystal).toLocaleString()}</span> C
                      </div>
                      <div className="text-[10px] text-red-400/70 font-mono tabular-nums">
                        Pertes: {log.ships_lost} vso.
                      </div>
                    </div>
                  </div>
                );
              }

              if (isPlanetLost) {
                return (
                  <div
                    key={log.id}
                    onClick={() => handleReportClick(log.id)}
                    className="bg-gradient-to-r from-red-950/30 to-orange-950/30 border border-red-500/30 p-3 rounded-lg flex items-center justify-between hover:border-red-500/50 hover:bg-red-950/40 transition-all duration-150 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
                        <ShieldAlert size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-red-400">
                            🚨 PLANÈTE PERDUE
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Conquise par {log.opponent_username}
                          </span>
                        </div>
                        <div className="text-[10px] text-red-300 mt-0.5">
                          Votre planète a été conquise suite à une défaite écrasante
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {formatDate(log.date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono tabular-nums text-slate-200">
                        <span className="text-red-500">-{Math.floor(Math.abs(log.loot_metal)).toLocaleString()}</span> M /
                        <span className="text-red-400"> -{Math.floor(Math.abs(log.loot_crystal)).toLocaleString()}</span> C
                      </div>
                      <div className="text-[10px] text-red-400/70 font-mono tabular-nums">
                        Pertes: {log.ships_lost} vso.
                      </div>
                    </div>
                  </div>
                );
              }

              if (isSpy) {
                return (
                  <div
                    key={log.id}
                    onClick={() => handleReportClick(log.id)}
                    className="bg-purple-950/10 border border-purple-500/20 p-3 rounded-lg flex items-center justify-between hover:bg-purple-950/20 hover:border-purple-500/40 transition-all duration-150 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                        <ShieldAlert size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-purple-400">
                            🔍 ESPIONNAGE DÉTECTÉ
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            par {log.opponent_username || "Inconnu"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {formatDate(log.date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-purple-300 font-mono">
                        Source: {log.target_name}
                      </div>
                    </div>
                  </div>
                );
              }

              const isSpyAttack = log.mission_type === 'spy_attack';
              if (isSpyAttack) {
                return (
                  <div
                    key={log.id}
                    onClick={() => handleReportClick(log.id)}
                    className="bg-cyan-950/10 border border-cyan-500/20 p-3 rounded-lg flex items-center justify-between hover:bg-cyan-500/5 hover:border-cyan-500/30 transition-all duration-150 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                        <ArrowUpRight size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-cyan-400">
                            🛰️ RAPPORT D'ESPIONNAGE
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            sur {log.opponent_username || "Inconnu"}
                          </span>
                        </div>
                        <div className="text-[10px] text-cyan-300 mt-0.5">
                          Cible: {log.target_name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {formatDate(log.date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-cyan-300 font-mono">
                        Cliquez pour voir les détails
                      </div>
                    </div>
                  </div>
                );
              }

              // Rapports de combat normaux
              return (
                <div
                  key={log.id}
                  onClick={() => handleReportClick(log.id)}
                  className="bg-black/20 border border-cyan-500/10 p-3 rounded-lg flex items-center justify-between hover:bg-cyan-500/5 hover:border-cyan-500/20 transition-colors duration-150 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${isVictory ? 'bg-green-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {isDefense ? <ShieldAlert size={16} /> : <Swords size={16} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black uppercase ${isVictory ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isVictory ? "VICTOIRE" : "DÉFAITE"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {isExpedition ? 'Expédition' : `vs ${log.target_name}`}
                          {log.opponent_username && !isExpedition && <span className="text-slate-400 ml-1">(Cdt. {log.opponent_username})</span>}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {formatDate(log.date)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="text-xs font-mono tabular-nums text-slate-200">
                      <span className="text-yellow-500">+{Math.floor(log.loot_metal).toLocaleString()}</span> M /
                      <span className="text-cyan-400"> +{Math.floor(log.loot_crystal).toLocaleString()}</span> C
                    </div>
                    <div className="text-[10px] text-red-400/70 font-mono tabular-nums">
                      Pertes: {log.ships_lost} vso.
                    </div>
                    {log.details != null && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setReplayLog(log); }}
                        className="text-[10px] font-mono text-cyan-400/60 hover:text-cyan-400 border border-cyan-500/10 hover:border-cyan-500/30 px-2 py-0.5 rounded-[2px] transition-all duration-150"
                        aria-label="Voir le replay tour par tour"
                      >
                        Tour/Tour
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )
        )}
        {view === 'combat' && combatLogs.length < combatTotal && (
          <div className="flex justify-center py-3">
            <button
              onClick={loadMoreCombat}
              disabled={combatLoading}
              className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/50 px-4 py-1.5 rounded-lg hover:bg-cyan-500/10 transition-all duration-150 disabled:opacity-50 font-mono"
            >
              {combatLoading ? 'Chargement...' : `Afficher plus (${combatTotal - combatLogs.length} restants)`}
            </button>
          </div>
        )}

        {/* VUE LOGISTIQUE */}
        {view === 'transport' && (
          transportLogs.length === 0 ? (
            <div className="text-center text-slate-600 text-xs py-10 font-mono">Aucun mouvement logistique récent.</div>
          ) : (
            transportLogs.map(log => {
              const isReceived = log.target_planet_id === planetId;

              return (
                <div
                  key={log.id}
                  className={`bg-black/20 border p-3 rounded-lg flex items-center justify-between hover:bg-cyan-500/5 transition-colors duration-150 hover:-translate-y-1 hover:shadow-lg ${
                    isReceived ? 'border-l-green-500 border-cyan-500/10' : 'border-l-yellow-500 border-cyan-500/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${isReceived ? 'bg-green-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      {isReceived ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black uppercase ${isReceived ? 'text-emerald-400' : 'text-yellow-400'}`}>
                          {isReceived ? "REÇU" : "ENVOYÉ"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          {isReceived ? "De:" : "Vers:"}
                          <span className="text-slate-200 font-bold">
                            {isReceived ? log.source_planet_name : log.target_planet_name}
                            {log.opponent_username && <span className="text-slate-400 font-normal ml-1">({log.opponent_username})</span>}
                          </span>
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {formatDate(log.date)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 text-right text-xs font-mono tabular-nums">
                    {log.metal > 0 && <span className="text-slate-300">{Math.floor(log.metal).toLocaleString()} <span className="text-[9px] text-slate-500">M</span></span>}
                    {log.crystal > 0 && <span className="text-cyan-300">{Math.floor(log.crystal).toLocaleString()} <span className="text-[9px] text-slate-500">C</span></span>}
                    {log.deuterium > 0 && <span className="text-emerald-300">{Math.floor(log.deuterium).toLocaleString()} <span className="text-[9px] text-slate-500">D</span></span>}
                  </div>
                </div>
              );
            })
          )
        )}
        {view === 'transport' && transportLogs.length < transportTotal && (
          <div className="flex justify-center py-3">
            <button
              onClick={loadMoreTransport}
              disabled={transportLoading}
              className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/50 px-4 py-1.5 rounded-lg hover:bg-cyan-500/10 transition-all duration-150 disabled:opacity-50 font-mono"
            >
              {transportLoading ? 'Chargement...' : `Afficher plus (${transportTotal - transportLogs.length} restants)`}
            </button>
          </div>
        )}

        {/* VUE ÉCONOMIE */}
        {view === 'economy' && <EconomyLog />}

        {/* VUE PIRATES */}
        {view === 'pirates' && (
          extortionHistory.length === 0 ? (
            <div className="text-center text-slate-600 text-xs py-10 font-mono">Aucun événement pirate enregistré.</div>
          ) : (
            extortionHistory.map(ev => {
              const statusLabels: Record<string, { label: string; color: string }> = {
                resolved_passive: { label: "Pillage subi", color: "text-orange-400" },
                resolved_tribute: { label: "Tribut payé", color: "text-yellow-400" },
                resolved_retaliate: { label: "Contre-attaque", color: "text-red-400" },
              };
              const meta = statusLabels[ev.status] ?? { label: ev.status, color: "text-slate-400" };
              const isAttacker = !ev.is_target;

              return (
                <div key={ev.id} className="bg-black/20 border border-cyan-500/10 p-3 rounded-lg flex items-center gap-4 hover:bg-cyan-500/5 transition-colors duration-150">
                  <div className="p-2 rounded-lg bg-red-950/40 text-red-400 shrink-0">
                    <Skull size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-black uppercase ${meta.color}`}>{meta.label}</span>
                      {isAttacker && (
                        <span className="text-[9px] bg-purple-900/30 text-purple-400 border border-purple-700/30 px-1.5 py-0.5 rounded font-bold uppercase">Instigateur</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {ev.is_target
                        ? <>Attaqué par <span className="text-slate-200 font-bold">{ev.attacker_name}</span></>
                        : <>Flotte envoyée sur <span className="text-slate-200 font-bold">{ev.target_name}</span></>
                      }
                    </p>
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                      {ev.resolved_at ? formatDate(ev.resolved_at) : formatDate(ev.arrival_time)}
                    </p>
                  </div>
                </div>
              );
            })
          )
        )}

      </div>

      {/* Modal de détails de combat */}
      {selectedReport && (
        <CombatModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onSabotage={handleSabotage}
        />
      )}

      {/* Replay tour-par-tour — ouvert via le bouton "Tour/Tour" */}
      {replayLog && (
        <CombatReplay
          report={{
            details: replayLog.details as any,
            opponent_name: replayLog.opponent_username ?? replayLog.target_name,
            loot: {
              metal: Math.max(0, replayLog.loot_metal),
              crystal: Math.max(0, replayLog.loot_crystal),
              deuterium: 0,
            },
          }}
          onClose={() => setReplayLog(null)}
        />
      )}
    </motion.div>
  );
}
