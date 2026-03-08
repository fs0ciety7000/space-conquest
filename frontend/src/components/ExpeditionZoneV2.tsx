import { useState, useEffect } from 'react';
import { Compass, Timer, Send, AlertTriangle, Database, Rocket, Map, Radar, ScanLine, Minus, Plus, Zap } from "lucide-react";
import { formatDuration } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface ShipSelection {
  [shipKey: string]: number;
}

interface ShipType {
  ship_key: string;
  display_name: string;
  attack: number;
  defense: number;
  shield: number;
}

interface PlanetShip {
  ship_key: string;
  count: number;
  display_name?: string;
}

export default function ExpeditionZoneV2({ planet, onAction }: { planet: any, onAction: () => void }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [shipSelection, setShipSelection] = useState<ShipSelection>({});
  const [availableShips, setAvailableShips] = useState<PlanetShip[]>([]);
  const [combatReport, setCombatReport] = useState<any>(null);

  // Load available ships from ship-types endpoint
  useEffect(() => {
    const fetchShipTypes = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${API_URL}/planets/${planet.id}/ship-types`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const ships: PlanetShip[] = (data.ship_types || [])
            .filter((ship: any) => ship.current_count > 0)
            .map((ship: any) => ({
              ship_key: ship.ship_key,
              count: ship.current_count,
              display_name: ship.display_name
            }));

          setAvailableShips(ships);

          // Initialize selection to 0 for all ship types
          const initialSelection: ShipSelection = {};
          ships.forEach(ship => {
            initialSelection[ship.ship_key] = 0;
          });
          setShipSelection(initialSelection);
        }
      } catch (e) {
        console.error("Failed to fetch ship types:", e);
      }
    };

    if (planet?.id) {
      fetchShipTypes();
    }
  }, [planet?.id]);

  // Reset on planet change
  useEffect(() => {
    setShipSelection({});
    setCombatReport(null);
  }, [planet?.id]);

  // Countdown timer
  useEffect(() => {
    if (planet?.expedition_end) {
      setIsLaunching(false);
      const interval = setInterval(() => {
        const end = new Date(planet.expedition_end).getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((end - now) / 1000));

        setTimeLeft(diff);

        if (diff === 0) {
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
      setIsLaunching(false);
    }
  }, [planet?.expedition_end]);

  const handleLaunch = async () => {
    if (!planet?.id) return;

    // Filter out ships with 0 count
    const fleet = Object.entries(shipSelection)
      .filter(([_, count]) => count > 0)
      .reduce((acc, [key, count]) => ({ ...acc, [key]: count }), {});

    if (Object.keys(fleet).length === 0) {
      toast.error("Sélectionnez au moins un vaisseau");
      return;
    }

    setIsLaunching(true);
    setCombatReport(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/planets/${planet.id}/expedition-v2`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fleet })
      });

      if (res.ok) {
        const data = await res.json();
        const report = data.report || data;

        // Show combat report
        if (report.log && report.log.length > 0) {
          setCombatReport({
            result: report.result || report.winner,
            logs: report.log,
            loot: report.loot,
            lost_ships: report.lost_ships || {},
            syndicate_credits_earned: report.syndicate_credits_earned || 0,
          });

          const scNote = report.syndicate_credits_earned > 0 ? ` • +${report.syndicate_credits_earned} SC` : '';
          const result = report.result || report.winner;
          if (result === "victory") {
            toast.success("Expédition réussie !", {
              description: `Butin: ${Math.floor(report.loot.metal)} métal, ${Math.floor(report.loot.crystal)} cristal, ${Math.floor(report.loot.deuterium || 0)} deutérium${scNote}`
            });
          } else if (result === "defeat") {
            toast.error("Défaite...", {
              description: `Votre flotte a subi de lourdes pertes${scNote}`
            });
          } else if (result === "calm") {
            toast.success("Secteur calme", {
              description: `Ressources collectées: ${Math.floor(report.loot.metal)} métal, ${Math.floor(report.loot.crystal || 0)} cristal, ${Math.floor(report.loot.deuterium || 0)} deutérium${scNote}`
            });
          }
        }

        // Trigger refresh
        onAction();
      } else {
        const error = await res.json();
        toast.error("Erreur", {
          description: error.error || "Impossible de lancer l'expédition"
        });
        setIsLaunching(false);
      }
    } catch (err) {
      toast.error("Erreur de connexion");
      setIsLaunching(false);
    }
  };

  const updateShipCount = (shipKey: string, delta: number) => {
    const ship = availableShips.find(s => s.ship_key === shipKey);
    if (!ship) return;

    setShipSelection(prev => {
      const current = prev[shipKey] || 0;
      const newValue = Math.max(0, Math.min(ship.count, current + delta));
      return { ...prev, [shipKey]: newValue };
    });
  };

  const setShipPercentage = (shipKey: string, percentage: number) => {
    const ship = availableShips.find(s => s.ship_key === shipKey);
    if (!ship) return;

    const count = Math.floor(ship.count * percentage);
    setShipSelection(prev => ({ ...prev, [shipKey]: count }));
  };

  const isInMission = (timeLeft !== null && timeLeft > 0) || isLaunching;
  const hasShips = availableShips.length > 0;
  const totalSelected = Object.values(shipSelection).reduce((sum, count) => sum + count, 0);

  const theme = {
    text: 'text-cyan-400',
    border: 'border-cyan-500/50',
    glow: 'shadow-[0_0_20px_rgba(34,211,238,0.3)]',
    bg: 'bg-cyan-950/20'
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">

      {/* --- MODULE PRINCIPAL (GAUCHE) --- */}
      <div className="lg:col-span-2 space-y-6">
        <div className={`relative overflow-hidden rounded-3xl border ${theme.border} bg-black/60 backdrop-blur-md p-8 shadow-2xl group card-depth hover:shadow-3xl transition-all duration-500 animate-slide-up glass-card`}>

          {/* DECORATION D'ARRIÈRE-PLAN (RADAR) */}
          <div className="absolute -right-20 -top-20 opacity-10 pointer-events-none">
             <Radar size={300} className={`${theme.text} ${isInMission ? 'animate-spin' : 'animate-spin-slow'}`} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent z-0"></div>

          <div className="relative z-10">
            {/* Header */}
            <div className="mb-8">
              <div className={`text-[10px] font-black uppercase tracking-[0.4em] mb-2 ${theme.text} flex items-center gap-2`}>
                <Compass size={14} className="animate-pulse animate-bounce-subtle"/> Exploration Dynamique v2.0
              </div>
              <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter animate-fade-in">
                Expédition <span className="text-slate-500">Profonde</span>
              </h2>
              <p className="text-xs text-slate-400 max-w-md mt-2">
                Système de combat avancé avec support multi-vaisseaux. Configuration adaptative de la flotte.
              </p>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

              {/* Module Flotte */}
              <div className={`p-4 rounded-xl border border-white/5 bg-black/40 relative overflow-hidden glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 card-depth animate-fade-in ${hasShips ? '' : 'border-red-900/50'}`}>
                <div className="flex justify-between items-start mb-2">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
                      <Rocket size={12} className="animate-bounce-subtle"/> Vaisseaux Disponibles
                   </h4>
                   <div className={`h-2 w-2 rounded-full ${hasShips ? 'bg-green-500 shadow-[0_0_10px_lime] animate-scale-pulse' : 'bg-red-500 animate-pulse'}`}></div>
                </div>
                <div className="flex items-end gap-2">
                   <span className={`text-3xl font-mono font-black ${hasShips ? 'text-white' : 'text-red-500'}`}>
                     {availableShips.length}
                   </span>
                   <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">Types</span>
                </div>
                {!hasShips && <p className="text-[9px] text-red-400 mt-2 font-mono">&gt; ERROR: HANGAR VIDE</p>}
              </div>

              {/* Module Sélection */}
              <div className="p-4 rounded-xl border border-white/5 bg-black/40 glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 card-depth animate-fade-in">
                <div className="flex justify-between items-start mb-4">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
                      <Zap size={12} className="text-amber-500 animate-bounce-subtle"/> Flotte Sélectionnée
                   </h4>
                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                     totalSelected > 0 ? 'text-green-400 bg-green-950/30 border-green-900' : 'text-slate-500 bg-slate-950/30 border-slate-800'
                   }`}>{totalSelected}</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden progress-bar-animated">
                   <div className={`h-full bg-cyan-500 shadow-[0_0_10px_cyan] animate-gradient`} style={{ width: `${Math.min(100, (totalSelected / 50) * 100)}%` }}></div>
                </div>
                <p className="text-[9px] text-slate-500 mt-2 font-mono">
                   Puissance de frappe configurée
                </p>
              </div>
            </div>

            {/* Ship Selection */}
            {!isInMission && hasShips && (
              <div className="mb-6 space-y-4">
                <div className="p-6 rounded-xl border border-cyan-500/30 bg-cyan-950/10 glass-card hover:-translate-y-1 hover:shadow-xl transition-all duration-500 card-depth animate-slide-up">
                  <h4 className="text-[10px] font-black uppercase text-cyan-400 mb-4 flex items-center gap-2">
                    <Rocket size={12} className="animate-bounce-subtle"/> Configuration Flotte Expéditionnaire
                  </h4>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {availableShips.map((ship) => (
                      <div key={ship.ship_key} className="p-4 rounded-lg bg-black/40 border border-white/10 hover:border-cyan-500/50 transition-all">
                        <div className="text-[10px] text-cyan-400 uppercase font-bold mb-2 flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                          {ship.display_name}
                        </div>
                        <div className="flex items-center gap-4">
                          <Button
                            onClick={() => updateShipCount(ship.ship_key, -1)}
                            disabled={!shipSelection[ship.ship_key] || shipSelection[ship.ship_key] <= 0}
                            className="h-10 w-10 p-0 bg-slate-800 hover:bg-slate-700 border border-white/10"
                          >
                            <Minus size={16} />
                          </Button>
                          <div className="flex-1 text-center">
                            <div className="text-3xl font-mono font-black text-white">{shipSelection[ship.ship_key] || 0}</div>
                            <div className="text-[9px] text-slate-500">/ {ship.count}</div>
                          </div>
                          <Button
                            onClick={() => updateShipCount(ship.ship_key, 1)}
                            disabled={shipSelection[ship.ship_key] >= ship.count}
                            className="h-10 w-10 p-0 bg-slate-800 hover:bg-slate-700 border border-white/10"
                          >
                            <Plus size={16} />
                          </Button>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Button
                            onClick={() => setShipPercentage(ship.ship_key, 0.5)}
                            className="flex-1 h-8 text-[9px] bg-slate-800 hover:bg-slate-700 border border-white/10"
                          >
                            50%
                          </Button>
                          <Button
                            onClick={() => setShipPercentage(ship.ship_key, 1.0)}
                            className="flex-1 h-8 text-[9px] bg-slate-800 hover:bg-slate-700 border border-white/10"
                          >
                            MAX
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Combat Report */}
            {combatReport && (
              <div className="mb-6 p-6 rounded-xl border border-cyan-500/30 bg-black/60 glass-card animate-fade-in">
                <h4 className="text-[10px] font-black uppercase text-cyan-400 mb-4">RAPPORT DE COMBAT</h4>
                <div className="space-y-2 text-[10px] font-mono">
                  {combatReport.logs.map((log: string, i: number) => (
                    <div key={i} className="text-slate-300 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                      &gt; {log}
                    </div>
                  ))}
                </div>
                {combatReport.lost_ships && Object.entries(combatReport.lost_ships).some(([, v]) => (v as number) > 0) && (
                  <div className="mt-4 pt-4 border-t border-red-900/30">
                    <div className="text-[9px] text-red-400 uppercase font-bold mb-2">Pertes</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(combatReport.lost_ships).filter(([, v]) => (v as number) > 0).map(([k, v]) => (
                        <span key={k} className="text-[9px] font-mono text-red-300 bg-red-950/30 px-2 py-0.5 rounded border border-red-900/50">
                          -{v as number} {k.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {combatReport.loot && (
                  <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-[9px] text-slate-400 uppercase">Métal</div>
                      <div className="text-xl font-mono font-black text-green-400">{Math.floor(combatReport.loot.metal).toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-slate-400 uppercase">Cristal</div>
                      <div className="text-xl font-mono font-black text-blue-400">{Math.floor(combatReport.loot.crystal).toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-slate-400 uppercase">Deutérium</div>
                      <div className="text-xl font-mono font-black text-emerald-400">{Math.floor(combatReport.loot.deuterium).toLocaleString()}</div>
                    </div>
                  </div>
                )}
                {combatReport.syndicate_credits_earned > 0 && (
                  <div className="mt-3 pt-3 border-t border-yellow-500/20 flex items-center justify-center gap-2">
                    <span className="text-[9px] text-yellow-400 uppercase font-black">Crédits Syndicat trouvés</span>
                    <span className="text-lg font-mono font-black text-yellow-300">+{combatReport.syndicate_credits_earned} SC</span>
                  </div>
                )}
              </div>
            )}

            {/* Launch Button */}
            <Button
              onClick={handleLaunch}
              disabled={isInMission || !hasShips || totalSelected === 0}
              className={`w-full h-20 font-black tracking-[0.2em] uppercase transition-all rounded-xl relative overflow-hidden group/btn shadow-xl card-depth hover:-translate-y-1 hover:shadow-3xl duration-500
                ${isInMission
                  ? 'bg-slate-900 border border-white/10 text-slate-500'
                  : !hasShips || totalSelected === 0
                    ? 'bg-red-950/20 border border-red-900/50 text-red-500 cursor-not-allowed'
                    : `bg-black hover:bg-slate-900 text-white border ${theme.border} ${theme.glow} hover:scale-105`
                }`}
            >
              {!isInMission && hasShips && totalSelected > 0 && (
                <div className={`absolute top-0 bottom-0 w-2 bg-white/20 blur-md -skew-x-12 -left-10 group-hover/btn:left-[120%] transition-all duration-1000`}></div>
              )}

              {isLaunching && timeLeft === null ? (
                <span className="flex items-center gap-3 animate-pulse">
                  <ScanLine size={20} className="animate-bounce" /> INITIALISATION PROTOCOLE...
                </span>
              ) : timeLeft !== null && timeLeft > 0 ? (
                <div className="flex flex-col items-center">
                   <span className="flex items-center gap-3 text-cyan-400">
                     <Timer size={20} className="animate-spin" /> MISSION EN COURS
                   </span>
                   <span className="text-2xl font-mono text-white mt-1">{formatDuration(timeLeft)}</span>
                </div>
              ) : !hasShips ? (
                "VAISSEAU REQUIS POUR DÉCOLLAGE"
              ) : totalSelected === 0 ? (
                "SÉLECTIONNEZ AU MOINS UN VAISSEAU"
              ) : (
                <span className="flex items-center gap-3 relative z-10">
                  <Send size={20} className={`${theme.text} group-hover/btn:scale-110 transition-transform duration-300`} />
                  LANCER L'EXPÉDITION ({totalSelected} vaisseaux)
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Console de logs */}
        <div className="bg-black/80 border border-white/10 p-6 rounded-2xl font-mono relative overflow-hidden card-depth hover:shadow-2xl transition-all duration-500 animate-slide-up glass-card">
          <div className="absolute inset-0 bg-[url('/assets/grid.png')] opacity-5 pointer-events-none"></div>
          <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 flex items-center gap-2">
             <ScanLine size={12} className="text-green-500 animate-pulse"/> SYSTÈME COMBAT DYNAMIQUE v2.0
          </h4>
          <div className="text-[10px] space-y-2 text-green-500/80">
            <p>&gt; Moteur de combat : ONLINE</p>
            <p>&gt; Base de données vaisseaux : {availableShips.length} types chargés</p>
            <p>&gt; Système de tir rapide : ACTIF</p>
            {isInMission && (
               <div className="space-y-1 animate-pulse text-cyan-400">
                 <p>&gt; Télémétrie flotte : ONLINE</p>
                 <p>&gt; Combat en cours...</p>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* --- MODULE DROIT (INFO) --- */}
      <div className="space-y-6">
        <Card className="bg-slate-950 border border-white/5 p-8 rounded-3xl relative overflow-hidden shadow-xl card-depth hover:shadow-3xl transition-all duration-500 animate-slide-up glass-card">
           <div className="absolute -bottom-6 -right-6 opacity-5 pointer-events-none">
             <Database size={150} />
           </div>

           <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8 flex items-center gap-2">
             <Map size={14} className="animate-bounce-subtle"/> Amélioration v2.0
           </h4>

           <div className="space-y-6 relative z-10">
              <div className="group hover:-translate-y-1 transition-all duration-300">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase font-bold text-cyan-400">Combat Dynamique</span>
                    <span className="text-[10px] font-black text-green-400 bg-green-950/30 px-2 rounded border border-green-900">ACTIF</span>
                 </div>
                 <p className="text-[9px] text-slate-400 leading-relaxed">
                    Système de combat basé sur la base de données. Support de tous les types de vaisseaux sans modification de code.
                 </p>
              </div>

              <div className="group hover:-translate-y-1 transition-all duration-300">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase font-bold text-cyan-400">Tir Rapide</span>
                    <span className="text-[10px] font-black text-green-400 bg-green-950/30 px-2 rounded border border-green-900">ACTIF</span>
                 </div>
                 <p className="text-[9px] text-slate-400 leading-relaxed">
                    Les règles de tir rapide sont chargées dynamiquement depuis la base de données.
                 </p>
              </div>

              <div className="group hover:-translate-y-1 transition-all duration-300">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase font-bold text-cyan-400">Flottes Pirates</span>
                    <span className="text-[10px] font-black text-amber-400 bg-amber-950/30 px-2 rounded border border-amber-900">ADAPTATIF</span>
                 </div>
                 <p className="text-[9px] text-slate-400 leading-relaxed">
                    Les pirates ajustent leur composition en fonction de votre flotte (50-110% de votre puissance).
                 </p>
              </div>
           </div>

           <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-cyan-950/10 border border-cyan-500/20 glass-card hover:-translate-y-1 transition-all duration-300">
                 <div className="h-2 w-2 bg-cyan-400 rounded-full animate-ping"></div>
                 <p className="text-[9px] text-slate-300 font-mono">
                    Nouveau système compatible avec tous les vaisseaux futurs.
                 </p>
              </div>
           </div>
        </Card>
      </div>

    </div>
  );
}
