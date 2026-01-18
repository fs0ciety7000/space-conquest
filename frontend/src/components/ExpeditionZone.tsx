import { useState, useEffect } from 'react';
import { Compass, Timer, Send, AlertTriangle, Database, Rocket, Map, Radar, ScanLine, Minus, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function ExpeditionZone({ planet, onAction }: { planet: any, onAction: (shipCount: number) => void }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [shipCount, setShipCount] = useState(1);
  const [scouting, setScouting] = useState(false);
  const [scoutResult, setScoutResult] = useState<{
    danger: string;
    probability: number;
    recommendation: string;
    color: string;
    estimated_loot?: {
      metal_min: number;
      metal_max: number;
      crystal_min: number;
      crystal_max: number;
    }
  } | null>(null);

  // Gestion du compte à rebours visuel (purement UI)
  useEffect(() => {
    if (planet?.expedition_end) {
      setIsLaunching(false);
      const interval = setInterval(() => {
        const end = new Date(planet.expedition_end).getTime(); // Note: le "Z" peut être nécessaire selon le format DB, ici on fait confiance à JS
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((end - now) / 1000));
        
        setTimeLeft(diff);
        
        if (diff === 0) {
          clearInterval(interval);
          // On ne déclenche pas onAction ici pour éviter une boucle infinie de fetch si le backend a pas fini
          // Le polling dans App.tsx s'occupera de rafraîchir l'état final
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
      setIsLaunching(false);
    }
  }, [planet?.expedition_end]);

  const handleScout = async () => {
    if (!planet?.id) return;
    setScouting(true);
    setScoutResult(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/planets/${planet.id}/expedition/scout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ship_count: shipCount })
      });

      if (res.ok) {
        const data = await res.json();
        setScoutResult(data);
        toast.success("🔍 Scan terminé", {
          description: `Niveau de danger: ${data.danger}`
        });
      } else {
        toast.error("Erreur lors du scan");
      }
    } catch (err) {
      toast.error("Erreur de connexion");
    } finally {
      setScouting(false);
    }
  };

  const handleLaunch = () => {
    setIsLaunching(true);
    onAction(shipCount); // On passe le nombre de vaisseaux
  };

  const isInMission = (timeLeft !== null && timeLeft > 0) || isLaunching;
  const hasShips = (planet.light_hunter_count || 0) > 0;
  const availableShips = planet.light_hunter_count || 0;

  // Thème de couleur pour cette section (Cyan/Exploration)
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
        <div className={`relative overflow-hidden rounded-3xl border ${theme.border} bg-black/60 backdrop-blur-md p-8 shadow-2xl group`}>
          
          {/* DECORATION D'ARRIÈRE-PLAN (RADAR) */}
          <div className="absolute -right-20 -top-20 opacity-10 pointer-events-none">
             <Radar size={300} className={`${theme.text} ${isInMission ? 'animate-spin' : 'animate-spin-slow'}`} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent z-0"></div>

          <div className="relative z-10">
            {/* Header */}
            <div className="mb-8">
              <div className={`text-[10px] font-black uppercase tracking-[0.4em] mb-2 ${theme.text} flex items-center gap-2`}>
                <Compass size={14} className="animate-pulse"/> Systèmes de Navigation
              </div>
              <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter">Exploration <span className="text-slate-500">Profonde</span></h2>
              <p className="text-xs text-slate-400 max-w-md mt-2">
                Envoi de drones éclaireurs vers le Quadrant 04-B. Recherche de ressources rares et d'artefacts perdus.
              </p>
            </div>

            {/* Modules d'info (Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              
              {/* Module Flotte */}
              <div className={`p-4 rounded-xl border border-white/5 bg-black/40 relative overflow-hidden ${hasShips ? '' : 'border-red-900/50'}`}>
                <div className="flex justify-between items-start mb-2">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
                      <Rocket size={12}/> Disponibilité Flotte
                   </h4>
                   <div className={`h-2 w-2 rounded-full ${hasShips ? 'bg-green-500 shadow-[0_0_10px_lime]' : 'bg-red-500 animate-pulse'}`}></div>
                </div>
                <div className="flex items-end gap-2">
                   <span className={`text-3xl font-mono font-black ${hasShips ? 'text-white' : 'text-red-500'}`}>
                     {planet.light_hunter_count || 0}
                   </span>
                   <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">Chasseurs MK-I</span>
                </div>
                {!hasShips && <p className="text-[9px] text-red-400 mt-2 font-mono">&gt; ERROR: HANGAR VIDE</p>}
              </div>

              {/* Module Risques */}
              <div className="p-4 rounded-xl border border-white/5 bg-black/40">
                <div className="flex justify-between items-start mb-4">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
                      <AlertTriangle size={12} className="text-amber-500"/> Analyse Menace
                   </h4>
                   <span className="text-[10px] font-bold text-amber-500 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900">MOYEN</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                   <div className="h-full bg-amber-500 w-[50%] shadow-[0_0_10px_orange]"></div>
                </div>
                <p className="text-[9px] text-slate-500 mt-2 font-mono">
                   Probabilité pirates: 30%
                </p>
              </div>
            </div>

            {/* Sélection de vaisseaux */}
            {!isInMission && hasShips && (
              <div className="mb-6 space-y-4">
                <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/10">
                  <h4 className="text-[10px] font-black uppercase text-cyan-400 mb-3 flex items-center gap-2">
                    <Rocket size={12}/> Configuration Flotte
                  </h4>
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={() => setShipCount(Math.max(1, shipCount - 1))}
                      disabled={shipCount <= 1}
                      className="h-10 w-10 p-0 bg-slate-800 hover:bg-slate-700 border border-white/10"
                    >
                      <Minus size={16} />
                    </Button>
                    <div className="flex-1 text-center">
                      <div className="text-3xl font-mono font-black text-white">{shipCount}</div>
                      <div className="text-[9px] text-slate-500 uppercase">Chasseurs</div>
                    </div>
                    <Button
                      onClick={() => setShipCount(Math.min(availableShips, shipCount + 1))}
                      disabled={shipCount >= availableShips}
                      className="h-10 w-10 p-0 bg-slate-800 hover:bg-slate-700 border border-white/10"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      onClick={() => setShipCount(Math.floor(availableShips / 2))}
                      className="flex-1 h-8 text-[9px] bg-slate-800 hover:bg-slate-700 border border-white/10"
                    >
                      50%
                    </Button>
                    <Button
                      onClick={() => setShipCount(availableShips)}
                      className="flex-1 h-8 text-[9px] bg-slate-800 hover:bg-slate-700 border border-white/10"
                    >
                      MAX
                    </Button>
                  </div>
                </div>

                {/* Bouton de Sondage */}
                <Button
                  onClick={handleScout}
                  disabled={scouting}
                  className="w-full h-14 font-bold tracking-wide uppercase bg-purple-950/20 hover:bg-purple-900/30 text-purple-400 border border-purple-500/50"
                >
                  {scouting ? (
                    <span className="flex items-center gap-2 animate-pulse">
                      <ScanLine size={16} className="animate-spin" /> ANALYSE EN COURS...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Search size={16} /> SONDER L'EXPÉDITION
                    </span>
                  )}
                </Button>

                {/* Résultat du sondage */}
                {scoutResult && (
                  <div className={`p-4 rounded-xl border bg-black/40 ${
                    scoutResult.color === 'green' ? 'border-green-500/50 bg-green-950/10' :
                    scoutResult.color === 'orange' ? 'border-orange-500/50 bg-orange-950/10' :
                    'border-red-500/50 bg-red-950/10'
                  }`}>
                    <h4 className={`text-[10px] font-black uppercase mb-2 ${
                      scoutResult.color === 'green' ? 'text-green-400' :
                      scoutResult.color === 'orange' ? 'text-orange-400' :
                      'text-red-400'
                    }`}>
                      RAPPORT DE SCAN
                    </h4>
                    <div className="space-y-2 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Niveau de danger:</span>
                        <span className={`font-bold ${
                          scoutResult.color === 'green' ? 'text-green-400' :
                          scoutResult.color === 'orange' ? 'text-orange-400' :
                          'text-red-400'
                        }`}>{scoutResult.danger}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Chance de succès:</span>
                        <span className="font-bold text-white">{scoutResult.probability}%</span>
                      </div>
                      {scoutResult.estimated_loot && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                          <div className="text-[9px] uppercase font-bold text-cyan-400 mb-2">Gains Estimés</div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Métal:</span>
                            <span className="font-mono text-white">
                              {scoutResult.estimated_loot.metal_min.toLocaleString()} - {scoutResult.estimated_loot.metal_max.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Cristal:</span>
                            <span className="font-mono text-white">
                              {scoutResult.estimated_loot.crystal_min.toLocaleString()} - {scoutResult.estimated_loot.crystal_max.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-slate-300 italic">{scoutResult.recommendation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bouton d'action principal */}
            <Button 
              onClick={handleLaunch} 
              disabled={isInMission || !hasShips}
              className={`w-full h-20 font-black tracking-[0.2em] uppercase transition-all rounded-xl relative overflow-hidden group/btn shadow-xl
                ${isInMission 
                  ? 'bg-slate-900 border border-white/10 text-slate-500' 
                  : !hasShips
                    ? 'bg-red-950/20 border border-red-900/50 text-red-500 cursor-not-allowed'
                    : `bg-black hover:bg-slate-900 text-white border ${theme.border} ${theme.glow}`
                }`}
            >
              {/* Effet de scan au survol */}
              {!isInMission && hasShips && (
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
                   <span className="text-2xl font-mono text-white mt-1">{timeLeft}s</span>
                </div>
              ) : !hasShips ? (
                "VAISSEAU REQUIS POUR DÉCOLLAGE"
              ) : (
                <span className="flex items-center gap-3 relative z-10">
                  <Send size={20} className={theme.text} /> LANCER L'EXPÉDITION
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Console de logs */}
        <div className="bg-black/80 border border-white/10 p-6 rounded-2xl font-mono relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/assets/grid.png')] opacity-5 pointer-events-none"></div>
          <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 flex items-center gap-2">
             <ScanLine size={12} className="text-green-500"/> COM_LINK_V4
          </h4>
          <div className="text-[10px] space-y-2 text-green-500/80">
            <p>&gt; Scan secteur 04-B... Terminé.</p>
            <p>&gt; 3 planétoïdes détectés.</p>
            {isInMission && (
               <div className="space-y-1 animate-pulse text-cyan-400">
                 <p>&gt; Télémétrie vaisseau : ONLINE</p>
                 <p>&gt; Distance parcourue : {Math.floor(Math.random() * 10000)} km</p>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* --- MODULE DROIT (BUTINS) --- */}
      <div className="space-y-6">
        <Card className="bg-slate-950 border border-white/5 p-8 rounded-3xl relative overflow-hidden shadow-xl">
           {/* Icône de fond */}
           <div className="absolute -bottom-6 -right-6 opacity-5 pointer-events-none">
             <Database size={150} />
           </div>

           <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8 flex items-center gap-2">
             <Map size={14}/> Analyse Butin
           </h4>

           <div className="space-y-6 relative z-10">
              <div className="group">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Métal</span>
                    <span className="text-[10px] font-black text-green-400 bg-green-950/30 px-2 rounded border border-green-900">+5,000</span>
                 </div>
                 <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-[80%] shadow-[0_0_10px_lime]"></div>
                 </div>
                 <p className="text-[9px] text-slate-600 mt-1 italic">Ressource très abondante dans ce secteur.</p>
              </div>

              <div className="group opacity-50">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Cristal</span>
                    <span className="text-[10px] font-black text-slate-500 border border-white/5 px-2 rounded">??</span>
                 </div>
                 <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[10%]"></div>
                 </div>
                 <p className="text-[9px] text-slate-600 mt-1 italic">Nécessite Scanner MK-II.</p>
              </div>
           </div>

           <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                 <div className="h-2 w-2 bg-cyan-400 rounded-full animate-ping"></div>
                 <p className="text-[9px] text-slate-300 font-mono">
                    Les rapports indiquent une zone calme, mais la présence de pirates a augmenté récemment.
                 </p>
              </div>
           </div>
        </Card>
      </div>

    </div>
  );
}