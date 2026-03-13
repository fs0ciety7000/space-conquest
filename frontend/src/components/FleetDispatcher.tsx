import { useState, useEffect, useRef } from "react";
import { Crosshair, Rocket, AlertTriangle, X, Minus, Plus, BookmarkPlus, Trash2, Zap, ChevronDown, ChevronUp, Check, Truck, Eye, ArrowRight, ShieldAlert, Navigation, Shield, RefreshCw, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
import { getTransporterCapacity } from '@/lib/gameRules';
import { getShipCount } from '@/utils/techTreeCompat';

interface ShipType {
  ship_key: string;
  display_name: string;
  current_count: number;
  attack: number;
  shield: number;
  hull: number;
  cargo_capacity: number;
  fuel_consumption: number;
}

interface FleetPreset {
  id: string;
  name: string;
  composition: { [key: string]: number };
}

type MissionType = 'attack' | 'spy' | 'transport' | 'recycle' | 'deploy';

interface FleetDispatcherProps {
  planetId: string;
  currentPlanet: any;
  targetPlanet: { id: string; name: string; galaxy?: number; system?: number; position?: number };
  initialMission: MissionType;
  onClose: () => void;
  onSpySuccess: (report: any) => void;
  onActionSuccess: () => void;
}

// FE-01: calculateFlightTime() local supprimé — remplacé par l'endpoint /fleet/estimate
// qui inclut le niveau d'hyperespace réel et tous les paramètres serveur.

export default function FleetDispatcher({
  planetId,
  currentPlanet,
  targetPlanet,
  initialMission,
  onClose,
  onSpySuccess,
  onActionSuccess
}: FleetDispatcherProps) {
  const [mission, setMission] = useState<MissionType>(initialMission);
  const [isLaunching, setIsLaunching] = useState(false);
  const [flightTime, setFlightTime] = useState(0);
  // FE-01: spinner pendant le fetch de l'estimation de vol
  const [isEstimating, setIsEstimating] = useState(false);
  const estimateAbortRef = useRef<AbortController | null>(null);

  // === FLOTTE (Attaque & Transport) ===
  const [shipSelection, setShipSelection] = useState<{ [key: string]: number }>({});
  const [availableShips, setAvailableShips] = useState<ShipType[]>([]);

  // === PRESETS ===
  const [presets, setPresets] = useState<FleetPreset[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [presetName, setPresetName] = useState("");

  // === RESSOURCES (Transport) ===
  const [metal, setMetal] = useState(0);
  const [crystal, setCrystal] = useState(0);
  const [deuterium, setDeuterium] = useState(0);

  // === CONFIRMATION D'ATTAQUE ===
  const [showAttackConfirm, setShowAttackConfirm] = useState(false);

  // === DEPLOY — sélection planète destination ===
  const [myPlanets, setMyPlanets] = useState<Array<{ id: string; name: string; galaxy: number; system: number; position: number }>>([]);
  const [deployDestinationId, setDeployDestinationId] = useState<string>('');

  // === RAPPEL DE FLOTTE ===
  const [activeMissions, setActiveMissions] = useState<Array<{ id: string; destination_name: string; ships_count: number; arrival_time: string }>>([]);
  const [recalling, setRecalling] = useState<string | null>(null);

  // FE-01: flightSpeedMultiplier supprimé — le calcul est délégué à /fleet/estimate

  const userId = localStorage.getItem('user_id');

  // Load available ships
  useEffect(() => {
    const fetchShipTypes = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(apiUrl(`/planets/${planetId}/ship-types`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const ships = (data.ship_types || []).filter((s: ShipType) => s.current_count > 0);
          setAvailableShips(ships);
        }
      } catch (e) {
        toast.error("Erreur lors du chargement de la flotte");
      }
    };
    if (planetId) fetchShipTypes();
  }, [planetId]);

  // Load presets
  useEffect(() => {
    if (!userId) return;
    fetch(apiUrl(`/users/${userId}/fleet-presets`))
      .then(r => r.ok ? r.json() : [])
      .then(data => setPresets(data))
      .catch(() => {});
  }, [userId]);

  // Load player's own planets for deploy destination picker
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(apiUrl('/my-planets'), { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((planets: Array<{ id: string; name: string; galaxy: number; system: number; position: number }>) => {
        const deployable = planets.filter(p => p.id !== currentPlanet?.id);
        setMyPlanets(deployable);
        if (deployable.length > 0 && !deployDestinationId) {
          setDeployDestinationId(deployable[0].id);
        }
      })
      .catch(() => {});
  }, [currentPlanet?.id]);

  // Load active deploy missions for recall panel
  useEffect(() => {
    if (mission !== 'deploy') return;
    const token = localStorage.getItem('token');
    fetch(apiUrl(`/fleet/missions?type=deploy&status=active`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : { missions: [] })
      .then((data: { missions?: Array<{ id: string; destination_name: string; ships_count: number; arrival_time: string }> }) => {
        setActiveMissions(data.missions || []);
      })
      .catch(() => {});
  }, [mission]);

  // FE-01: fetch de l'estimation de vol depuis le serveur avec debounce 500ms.
  // Le serveur connaît le niveau d'hyperespace réel et tous les modificateurs de vitesse.
  useEffect(() => {
    // Résoudre la cible effective (deploy = planète choisie par le joueur)
    let effectiveTarget = targetPlanet;
    if (mission === 'deploy' && deployDestinationId) {
      const found = myPlanets.find(p => p.id === deployDestinationId);
      if (found) effectiveTarget = found;
    }

    const targetGalaxy  = effectiveTarget.galaxy  ?? currentPlanet.galaxy  ?? 1;
    const targetSystem  = effectiveTarget.system  ?? currentPlanet.system  ?? 1;
    const targetPosition = effectiveTarget.position ?? currentPlanet.position ?? 1;

    // Annuler le fetch précédent si les dépendances changent avant la fin du debounce
    const timer = setTimeout(async () => {
      // Annuler tout fetch précédent encore en cours
      if (estimateAbortRef.current) {
        estimateAbortRef.current.abort();
      }
      const controller = new AbortController();
      estimateAbortRef.current = controller;

      setIsEstimating(true);
      try {
        const url = apiUrl(
          `/fleet/estimate?planet_id=${planetId}` +
          `&target_galaxy=${targetGalaxy}` +
          `&target_system=${targetSystem}` +
          `&target_position=${targetPosition}` +
          `&speed_percent=100`
        );
        const token = localStorage.getItem('token');
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setFlightTime(data.flight_time_seconds ?? 0);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // Fallback silencieux: garder la valeur précédente
          console.warn('fleet/estimate failed, keeping previous value', err);
        }
      } finally {
        setIsEstimating(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    planetId,
    currentPlanet,
    targetPlanet,
    mission,
    deployDestinationId,
    myPlanets,
  ]);

  // Calculations
  const totalPower = availableShips.reduce((sum, ship) => sum + (ship.attack * (shipSelection[ship.ship_key] || 0)), 0);
  const totalCargo = availableShips.reduce((sum, ship) => sum + (ship.cargo_capacity * (shipSelection[ship.ship_key] || 0)), 0);
  const totalShips = Object.values(shipSelection).reduce((sum, count) => sum + count, 0);
  const targetLoad = metal + crystal + deuterium;

  // Fuel cost estimate (same formula as backend)
  const g1 = currentPlanet.galaxy || 1, s1 = currentPlanet.system || 1, p1 = currentPlanet.position || 1;
  const g2 = targetPlanet.galaxy || g1, s2 = targetPlanet.system || s1, p2 = targetPlanet.position || p1;
  const fleetDist = g1 !== g2 ? Math.abs(g1 - g2) * 20000 : s1 !== s2 ? Math.abs(s1 - s2) * 2000 + 2700 : Math.abs(p1 - p2) * 5 + 1000;
  const totalFuelPerUnit = availableShips.reduce((sum, ship) => sum + (ship.fuel_consumption || 0) * (shipSelection[ship.ship_key] || 0), 0);
  const estimatedFuelCost = Math.max(1, Math.ceil(totalFuelPerUnit * fleetDist / 1000));
  const hasSufficientFuel = (currentPlanet.deuterium_amount || 0) >= estimatedFuelCost;

  const handleShipCountChange = (shipKey: string, count: number) => {
    const ship = availableShips.find(s => s.ship_key === shipKey);
    if (!ship) return;
    const validCount = Math.max(0, Math.min(count, ship.current_count));
    setShipSelection(prev => ({ ...prev, [shipKey]: validCount }));
  };

  const setMaxResource = (type: 'metal' | 'crystal' | 'deuterium') => {
      const remainingSpace = totalCargo - targetLoad;
      const currentVal = type === 'metal' ? metal : type === 'crystal' ? crystal : deuterium;
      const spaceForThisResource = remainingSpace + currentVal;
      const stock = type === 'metal' ? currentPlanet.metal_amount : type === 'crystal' ? currentPlanet.crystal_amount : currentPlanet.deuterium_amount;

      const amount = Math.min(stock, spaceForThisResource);

      if(type === 'metal') setMetal(Math.floor(amount));
      if(type === 'crystal') setCrystal(Math.floor(amount));
      if(type === 'deuterium') setDeuterium(Math.floor(amount));
  };

  const loadPreset = (preset: FleetPreset) => {
    const newSelection: { [key: string]: number } = {};
    availableShips.forEach(ship => {
      const desired = preset.composition[ship.ship_key] || 0;
      newSelection[ship.ship_key] = Math.min(desired, ship.current_count);
    });
    setShipSelection(newSelection);
    toast.success(`Preset "${preset.name}" chargé`);
  };

  const savePreset = async () => {
    if (!userId || !presetName.trim()) return;
    setSavingPreset(true);
    const composition = Object.entries(shipSelection)
      .filter(([_, v]) => v > 0)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

    if (Object.keys(composition).length === 0) {
      toast.error("Sélectionnez au moins un vaisseau");
      setSavingPreset(false);
      return;
    }

    try {
      const res = await fetch(apiUrl(`/users/${userId}/fleet-presets`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: presetName.trim(), composition }),
      });
      if (res.ok) {
        const preset = await res.json();
        setPresets(prev => [...prev, preset]);
        setPresetName("");
        setShowSaveForm(false);
        toast.success(`Preset "${preset.name}" sauvegardé !`);
      } else {
        toast.error("Erreur de sauvegarde");
      }
    } catch {
        toast.error("Erreur réseau");
    } finally {
      setSavingPreset(false);
    }
  };

  const deletePreset = async (preset: FleetPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    try {
      const res = await fetch(apiUrl(`/users/${userId}/fleet-presets/${preset.id}`), { method: 'DELETE' });
      if (res.ok) {
        setPresets(prev => prev.filter(p => p.id !== preset.id));
        toast.success(`Preset "${preset.name}" supprimé`);
      }
    } catch {}
  };

  const handleLaunchClick = () => {
    if (mission === 'attack') {
      const fleet = Object.entries(shipSelection)
        .filter(([_, count]) => count > 0)
        .reduce((acc, [key, count]) => ({ ...acc, [key]: count }), {});
      if (Object.keys(fleet).length === 0) {
        toast.error("Sélectionnez au moins un vaisseau");
        return;
      }
      setShowAttackConfirm(true);
      return;
    }
    handleLaunch();
  };

  const handleLaunch = async () => {
    const token = localStorage.getItem('token');
    setIsLaunching(true);
    setShowAttackConfirm(false);

    try {
        if (mission === 'spy') {
            const res = await fetch(apiUrl(`/spy?current_planet_id=${planetId}`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_planet_id: targetPlanet.id })
            });
            const data = await res.json();
            if(res.ok) {
                toast.success("Sonde d'espionnage envoyée");
                onSpySuccess(data.report);
            } else {
                toast.error(data.error || "Échec de l'espionnage");
            }
        }
        else if (mission === 'attack') {
            const fleet = Object.entries(shipSelection)
              .filter(([_, count]) => count > 0)
              .reduce((acc, [key, count]) => ({ ...acc, [key]: count }), {});

            if (Object.keys(fleet).length === 0) {
              toast.error("Sélectionnez au moins un vaisseau");
              return setIsLaunching(false);
            }

            const res = await fetch(apiUrl(`/attack/v2?current_planet_id=${planetId}`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_planet_id: targetPlanet.id, fleet })
            });

            if (res.ok) {
                toast.success("Flotte d'attaque en route !");
                onActionSuccess();
            } else {
                const err = await res.json();
                toast.error(err.error || "Erreur lors de l'attaque");
            }
        }
        else if (mission === 'deploy') {
            const fleet = Object.entries(shipSelection)
              .filter(([_, count]) => count > 0)
              .reduce((acc, [key, count]) => ({ ...acc, [key]: count }), {});

            if (Object.keys(fleet).length === 0) {
              toast.error("Sélectionnez au moins un vaisseau");
              return setIsLaunching(false);
            }

            if (!deployDestinationId) {
              toast.error("Sélectionnez une planète de destination");
              return setIsLaunching(false);
            }

            const res = await fetch(apiUrl(`/fleet/deploy?current_planet_id=${planetId}`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ origin_planet_id: planetId, destination_planet_id: deployDestinationId, fleet })
            });

            if (res.ok) {
                toast.success("Flotte déployée en transit sécurisé", {
                    description: "Vos vaisseaux ne peuvent pas être attaqués pendant le transit."
                });
                onActionSuccess();
            } else {
                const err = await res.json();
                toast.error(err.error || "Erreur lors du déploiement");
            }
        }
        else if (mission === 'transport') {
            // Le backend /transport vérifie uniquement les vaisseaux de type "transporter".
            // On envoie uniquement ce count — pas le total de tous les vaisseaux sélectionnés.
            // TODO (Option A): migrer vers fleet: HashMap<String,i32> côté backend pour flottes mixtes.
            const transporterCount = shipSelection['transporter'] || 0;

            if (transporterCount === 0) {
                toast.error("Sélectionnez au moins un transporteur pour cette mission");
                return setIsLaunching(false);
            }
            if (targetLoad <= 0) {
                toast.error("Soute vide, sélectionnez des ressources");
                return setIsLaunching(false);
            }
            if (targetLoad > totalCargo) {
                toast.error("Surcharge de la soute");
                return setIsLaunching(false);
            }

            const res = await fetch(apiUrl(`/transport?current_planet_id=${currentPlanet.id}`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_planet_id: targetPlanet.id,
                    transporters: transporterCount,
                    metal,
                    crystal,
                    deuterium
                })
            });
            if(res.ok) {
                toast.success("Flotte logistique lancée !");
                onActionSuccess();
            } else {
                const err = await res.json();
                toast.error(err.error || "Erreur de transport");
            }
        }
    } catch (e) {
        toast.error("Erreur réseau");
    } finally {
        setIsLaunching(false);
    }
  };

  const handleRecall = async (missionId: string) => {
    const token = localStorage.getItem('token');
    setRecalling(missionId);
    try {
      const res = await fetch(apiUrl(`/fleet/missions/${missionId}/recall`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Flotte rappelée avec succès");
        setActiveMissions(prev => prev.filter(m => m.id !== missionId));
        onActionSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erreur lors du rappel");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setRecalling(null);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="p-0 bg-[rgba(10,5,32,0.85)] backdrop-blur-[20px] border border-cyan-500/10 text-slate-200 shadow-2xl overflow-hidden max-w-2xl sm:rounded-2xl flex flex-col max-h-[90vh]">

        {/* HEADER */}
        <div className={`p-6 border-b flex justify-between items-start transition-colors duration-500 ${
            mission === 'attack' ? 'bg-red-950/40 border-red-900/50' :
            mission === 'spy' ? 'bg-blue-950/40 border-blue-900/50' :
            mission === 'deploy' ? 'bg-violet-950/40 border-violet-900/50' :
            'bg-emerald-950/40 border-emerald-900/50'
        }`}>
            <div className="flex gap-4 items-center">
                <div className={`p-3 rounded-xl border ${
                    mission === 'attack' ? 'bg-red-900/40 border-red-500/50 text-red-400 animate-pulse' :
                    mission === 'spy' ? 'bg-blue-900/40 border-blue-500/50 text-blue-400' :
                    mission === 'deploy' ? 'bg-violet-900/40 border-violet-500/50 text-violet-400' :
                    'bg-emerald-900/40 border-emerald-500/50 text-emerald-400'
                }`}>
                    {mission === 'attack' && <Crosshair size={28} />}
                    {mission === 'spy' && <Eye size={28} />}
                    {mission === 'transport' && <Truck size={28} />}
                    {mission === 'deploy' && <Shield size={28} />}
                </div>
                <div>
                    <h2 className="text-xl font-black uppercase tracking-widest text-slate-200">Dispatcher de flotte</h2>
                    <div className="flex items-center gap-2 mt-1 text-xs font-mono">
                        <span className="text-slate-400">{currentPlanet.name}</span>
                        <ArrowRight size={12} className={mission === 'attack' ? 'text-red-500' : 'text-slate-500'} />
                        <span className="text-slate-200 font-bold">{targetPlanet.name}</span>
                        {targetPlanet.galaxy && (
                            <span className="text-[10px] text-slate-500 ml-1 font-mono text-cyan-400">[{targetPlanet.galaxy}:{targetPlanet.system}:{targetPlanet.position}]</span>
                        )}
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-[rgba(5,0,15,0.8)] border border-cyan-500/15 text-[10px] text-cyan-400 font-mono tabular-nums flex items-center gap-1">
                          {isEstimating
                            ? <Loader2 size={10} className="animate-spin" />
                            : <>ETA: {flightTime}s</>
                          }
                        </span>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-all hover:scale-110">
                <X size={20} />
            </button>
        </div>

        {/* TABS */}
        <div className="flex bg-[rgba(10,5,32,0.85)]/50 border-b border-cyan-500/10 p-2 gap-2 shrink-0">
            <Button
                variant="ghost"
                onClick={() => setMission('attack')}
                className={`flex-1 h-10 text-xs font-bold uppercase tracking-wider transition-colors ${
                    mission === 'attack'
                        ? 'border border-red-500/40 text-red-400 bg-red-500/8 hover:bg-red-600/20'
                        : 'border border-slate-600/30 text-slate-500 bg-transparent hover:border-cyan-500/25 hover:text-slate-300'
                }`}
            >
                <Crosshair size={14} className="mr-2"/> Attaque
            </Button>
            <Button
                variant="ghost"
                onClick={() => setMission('spy')}
                className={`flex-1 h-10 text-xs font-bold uppercase tracking-wider transition-colors ${
                    mission === 'spy'
                        ? 'border border-cyan-500/40 text-cyan-400 bg-cyan-500/8 hover:bg-cyan-600/20'
                        : 'border border-slate-600/30 text-slate-500 bg-transparent hover:border-cyan-500/25 hover:text-slate-300'
                }`}
            >
                <Eye size={14} className="mr-2"/> Espionnage
            </Button>
            <Button
                variant="ghost"
                onClick={() => setMission('transport')}
                className={`flex-1 h-10 text-xs font-bold uppercase tracking-wider transition-colors ${
                    mission === 'transport'
                        ? 'border border-emerald-500/40 text-emerald-400 bg-emerald-500/8 hover:bg-emerald-600/20'
                        : 'border border-slate-600/30 text-slate-500 bg-transparent hover:border-cyan-500/25 hover:text-slate-300'
                }`}
            >
                <Truck size={14} className="mr-2"/> Transport
            </Button>
            <Button
                variant="ghost"
                onClick={() => setMission('deploy')}
                className={`flex-1 h-10 text-xs font-bold uppercase tracking-wider transition-colors ${
                    mission === 'deploy'
                        ? 'border border-violet-500/40 text-violet-400 bg-violet-500/8 hover:bg-violet-600/20'
                        : 'border border-slate-600/30 text-slate-500 bg-transparent hover:border-cyan-500/25 hover:text-slate-300'
                }`}
            >
                <Shield size={14} className="mr-2"/> Déployer
            </Button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">

            {mission === 'spy' ? (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-24 h-24 rounded-full bg-blue-900/20 border-2 border-dashed border-blue-500/30 flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full border border-blue-400/20 animate-ping"></div>
                        <Navigation size={40} className="text-blue-400 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-200 mb-2 uppercase tracking-wide">Lancement Sonde</h3>
                        <p className="text-sm text-slate-400 max-w-sm">
                            Envoyer une sonde d'espionnage furtive vers {targetPlanet.name}. Vous recevrez un rapport détaillé sur les infrastructures et la flotte en stationnement.
                        </p>
                    </div>
                </div>
            ) : mission === 'deploy' ? (
                <div className="space-y-6">
                    <div className="py-4 flex flex-col items-center text-center space-y-3">
                        <div className="w-20 h-20 rounded-full bg-violet-900/20 border-2 border-dashed border-violet-500/30 flex items-center justify-center relative">
                            <div className="absolute inset-0 rounded-full border border-violet-400/20 animate-ping"></div>
                            <Shield size={36} className="text-violet-400" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-200 mb-1 uppercase tracking-wide">Transit Sécurisé</h3>
                            <p className="text-xs text-slate-400 max-w-xs">
                                Déployez votre flotte vers l'une de vos colonies. Vos vaisseaux ne peuvent pas être attaqués pendant le transit.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-violet-900/20 border border-violet-500/20 rounded-lg text-xs text-violet-300">
                            <Shield size={12} />
                            <span>Protection totale en transit — Déploiement longue distance</span>
                        </div>
                    </div>

                    {/* Destination picker */}
                    {myPlanets.length === 0 ? (
                        <div className="flex items-center gap-3 px-4 py-3 bg-amber-950/30 border border-amber-500/30 rounded-lg text-amber-300 text-xs">
                            <ShieldAlert size={16} className="shrink-0" />
                            <span>Vous devez posséder au moins 2 planètes pour déployer votre flotte.</span>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 pb-2 border-b border-cyan-500/10">
                                <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-violet-400 to-transparent flex-shrink-0" />
                                <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-violet-500/70">Destination</span>
                            </div>
                            <div className="grid gap-2">
                                {myPlanets.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setDeployDestinationId(p.id)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors ${
                                            deployDestinationId === p.id
                                                ? 'bg-violet-900/30 border-violet-500/50 text-violet-200'
                                                : 'bg-[rgba(5,0,15,0.8)] border-violet-500/10 text-slate-300 hover:bg-violet-500/5 hover:border-violet-500/30'
                                        }`}
                                    >
                                        <span className="text-sm font-medium">{p.name}</span>
                                        <span className="text-[10px] font-mono text-slate-500">[{p.galaxy}:{p.system}:{p.position}]</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Ship selection for deploy */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 pb-2 border-b border-cyan-500/10">
                            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-violet-400 to-transparent flex-shrink-0" />
                            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-violet-500/70">Flotte à déployer</span>
                        </div>
                        {availableShips.length === 0 ? (
                            <p className="text-center text-slate-500 text-sm py-4">Aucun vaisseau disponible</p>
                        ) : (
                            <div className="space-y-2">
                                {availableShips.map((ship) => {
                                    const selected = shipSelection[ship.ship_key] || 0;
                                    return (
                                        <div key={ship.ship_key} className="bg-[rgba(5,0,15,0.8)] border border-violet-500/10 px-4 py-3 rounded-lg flex items-center justify-between hover:bg-violet-500/5 transition-colors duration-150">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-200 mb-0.5">{ship.display_name}</span>
                                                <span className="text-[10px] text-slate-500 font-mono">Dispo: <span className="text-violet-400 tabular-nums">{ship.current_count}</span></span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleShipCountChange(ship.ship_key, selected - 1)} className="p-1.5 bg-[rgba(5,0,15,0.8)] hover:bg-violet-500/10 border border-violet-500/15 text-slate-400 rounded transition-colors"><Minus size={12} /></button>
                                                <Input type="number" min="0" max={ship.current_count} value={selected} onChange={(e) => handleShipCountChange(ship.ship_key, parseInt(e.target.value) || 0)} onFocus={(e) => e.target.select()} className="w-16 h-8 bg-[rgba(5,0,15,0.8)] border border-violet-500/15 text-slate-200 text-center font-mono text-sm focus:border-violet-500/50" />
                                                <button onClick={() => handleShipCountChange(ship.ship_key, selected + 1)} className="p-1.5 bg-[rgba(5,0,15,0.8)] hover:bg-violet-500/10 border border-violet-500/15 text-slate-400 rounded transition-colors"><Plus size={12} /></button>
                                                <button onClick={() => handleShipCountChange(ship.ship_key, ship.current_count)} className="px-2 py-1.5 bg-violet-900/20 hover:bg-violet-900/40 border border-violet-500/20 text-violet-400 font-bold text-[10px] rounded transition-colors">MAX</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Recall Section */}
                    {activeMissions.length > 0 && (
                        <div className="space-y-2 pt-4 border-t border-violet-500/10">
                            <div className="flex items-center gap-2 pb-2">
                                <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-violet-400 to-transparent flex-shrink-0" />
                                <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-violet-500/70">Rappel de Flotte</span>
                            </div>
                            <div className="space-y-2">
                                {activeMissions.map(m => (
                                    <div key={m.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-violet-500/20 bg-violet-950/10">
                                        <div>
                                            <p className="text-sm font-medium text-slate-200">Vers : {m.destination_name}</p>
                                            <p className="text-[10px] font-mono text-slate-500">{m.ships_count} vaisseaux</p>
                                        </div>
                                        <Button
                                            onClick={() => handleRecall(m.id)}
                                            disabled={recalling === m.id}
                                            className="text-xs font-black uppercase tracking-wider bg-violet-950/40 border border-violet-700/40 hover:bg-violet-900/60 hover:border-violet-600/60 text-violet-300 transition-all"
                                        >
                                            {recalling === m.id ? (
                                                <RefreshCw size={12} className="animate-spin" />
                                            ) : (
                                                "Rappeler"
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Presets Panel */}
                    {(mission === 'attack' || mission === 'transport') && userId && (
                        <div className="bg-[rgba(10,5,32,0.85)]/60 border border-cyan-500/10 rounded-xl overflow-hidden shrink-0">
                            <button onClick={() => setShowPresets(!showPresets)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-cyan-500/5 transition-colors">
                                <div className="flex items-center gap-2 text-cyan-400 text-xs font-black uppercase tracking-widest">
                                    <Zap size={13} /> Presets de flotte ({presets.length}/10)
                                </div>
                                {showPresets ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                            </button>

                            {showPresets && (
                                <div className="px-4 pb-4 space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                        {presets.map(preset => (
                                            <div key={preset.id} className="flex items-center gap-1 bg-cyan-950/30 border border-cyan-500/15 rounded-lg overflow-hidden">
                                                <button onClick={() => loadPreset(preset)} className="px-3 py-1.5 text-xs font-bold text-cyan-300 hover:text-slate-200 transition-colors">
                                                    {preset.name}
                                                </button>
                                                <button onClick={(e) => deletePreset(preset, e)} className="px-1.5 py-1.5 text-slate-600 hover:text-red-400 transition-colors">
                                                    <Trash2 size={11} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {!showSaveForm ? (
                                        <button onClick={() => setShowSaveForm(true)} disabled={presets.length >= 10} className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 hover:text-cyan-400">
                                            <BookmarkPlus size={13} /> Mémoriser la sélection
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Nom..." className="h-8 text-xs bg-[rgba(5,0,15,0.8)] border border-cyan-500/15 text-slate-200 font-mono flex-1 focus:border-cyan-500/50 focus:shadow-[0_0_0_2px_rgba(0,245,255,0.1)]" />
                                            <Button size="sm" onClick={savePreset} disabled={savingPreset || !presetName.trim()} className="bg-cyan-600 hover:bg-cyan-500 px-3"><Check size={14}/></Button>
                                            <Button size="sm" onClick={() => setShowSaveForm(false)} variant="ghost" className="px-3"><X size={14}/></Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Ship Selection List */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
                            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
                            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Flotte engagée</span>
                        </div>
                        {availableShips.length === 0 ? (
                            <p className="text-center text-slate-500 text-sm py-4">Aucun vaisseau disponible</p>
                        ) : (
                            <div className="space-y-2">
                                {availableShips.map((ship) => {
                                    const selected = shipSelection[ship.ship_key] || 0;
                                    return (
                                        <div key={ship.ship_key} className="bg-[rgba(5,0,15,0.8)] border border-cyan-500/10 px-4 py-3 rounded-lg flex items-center justify-between hover:bg-cyan-500/5 transition-colors duration-150">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-200 mb-0.5">{ship.display_name}</span>
                                                <span className="text-[10px] text-slate-500 font-mono">Dispo: <span className="text-cyan-400 tabular-nums">{ship.current_count}</span> • Cargo: {ship.cargo_capacity}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleShipCountChange(ship.ship_key, selected - 1)} className="p-1.5 bg-[rgba(5,0,15,0.8)] hover:bg-cyan-500/10 border border-cyan-500/15 text-slate-400 rounded transition-colors"><Minus size={12} /></button>
                                                <Input type="number" min="0" max={ship.current_count} value={selected} onChange={(e) => handleShipCountChange(ship.ship_key, parseInt(e.target.value) || 0)} onFocus={(e) => e.target.select()} className="w-16 h-8 bg-[rgba(5,0,15,0.8)] border border-cyan-500/15 text-slate-200 text-center font-mono text-sm focus:border-cyan-500/50 focus:shadow-[0_0_0_2px_rgba(0,245,255,0.1)]" />
                                                <button onClick={() => handleShipCountChange(ship.ship_key, selected + 1)} className="p-1.5 bg-[rgba(5,0,15,0.8)] hover:bg-cyan-500/10 border border-cyan-500/15 text-slate-400 rounded transition-colors"><Plus size={12} /></button>
                                                <button onClick={() => handleShipCountChange(ship.ship_key, ship.current_count)} className="px-2 py-1.5 bg-cyan-900/20 hover:bg-cyan-900/40 border border-cyan-500/20 text-cyan-400 font-bold text-[10px] rounded transition-colors">MAX</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Cargo Load for Transport */}
                    {mission === 'transport' && (
                        <div className="space-y-3 pt-4 border-t border-cyan-500/10">
                            <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-slate-400">
                                <span>Cargaison</span>
                                <span className={targetLoad > totalCargo ? 'text-red-400' : 'text-emerald-400'}>{targetLoad} / {totalCargo} fret</span>
                            </div>

                            <div className="space-y-2">
                                {[
                                    { key: 'metal', label: 'Métal', value: metal, setter: setMetal, color: 'text-slate-300' },
                                    { key: 'crystal', label: 'Cristal', value: crystal, setter: setCrystal, color: 'text-blue-300' },
                                    { key: 'deuterium', label: 'Deutérium', value: deuterium, setter: setDeuterium, color: 'text-emerald-300' }
                                ].map((res) => (
                                    <div key={res.key} className="flex items-center gap-3">
                                        <div className={`w-20 text-[10px] font-bold uppercase ${res.color}`}>{res.label}</div>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={res.value}
                                            onChange={(e) => res.setter(Math.max(0, parseInt(e.target.value) || 0))}
                                            onFocus={(e) => e.target.select()}
                                            className={`flex-1 h-8 bg-[rgba(5,0,15,0.8)] border border-cyan-500/15 text-right font-mono text-sm text-slate-200 focus:border-cyan-500/50 focus:shadow-[0_0_0_2px_rgba(0,245,255,0.1)] ${targetLoad > totalCargo ? 'border-red-500/50 text-red-300' : ''}`}
                                        />
                                        <button onClick={() => setMaxResource(res.key as any)} className="px-3 py-1.5 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] rounded transition-colors">MAX</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-[rgba(10,5,32,0.85)]/90 border-t border-cyan-500/10 space-y-3 shrink-0">
            {/* Fuel cost indicator (attack/spy/expedition only) */}
            {mission !== 'transport' && totalShips > 0 && (
                <div className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg border ${hasSufficientFuel ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400' : 'bg-red-950/40 border-red-900/50 text-red-400'}`}>
                    <span className="font-bold uppercase tracking-widest">Carburant requis</span>
                    <span className="font-mono font-black tabular-nums">
                        {estimatedFuelCost.toLocaleString()} <span className="font-normal opacity-70">/ {Math.floor(currentPlanet.deuterium_amount || 0).toLocaleString()}</span>
                    </span>
                </div>
            )}
            <div className="flex gap-4">
            <Button onClick={onClose} variant="ghost" className="flex-1 border border-cyan-500/10 font-bold uppercase tracking-widest text-slate-400 hover:border-cyan-500/25 hover:text-slate-300">Annuler</Button>
            <Button
                onClick={handleLaunchClick}
                disabled={isLaunching || (mission !== 'spy' && totalShips === 0) || (mission === 'deploy' && myPlanets.length === 0) || (mission !== 'transport' && mission !== 'deploy' && totalShips > 0 && !hasSufficientFuel)}
                className={`flex-[2] font-black uppercase tracking-widest shadow-lg hover:-translate-y-1 transition-all ${
                    mission === 'attack' ? 'bg-red-600 hover:bg-red-500 text-slate-200 shadow-red-600/20' :
                    mission === 'spy' ? 'bg-blue-600 hover:bg-blue-500 text-slate-200 shadow-blue-600/20' :
                    mission === 'deploy' ? 'bg-violet-600 hover:bg-violet-500 text-slate-200 shadow-violet-600/20' :
                    'bg-emerald-600 hover:bg-emerald-500 text-slate-200 shadow-emerald-600/20'
                }`}
            >
                {isLaunching ? "LANCEMENT..." : mission === 'deploy' ? "DÉPLOYER LA FLOTTE" : "ORDRE D'EXÉCUTION"}
            </Button>
            </div>
        </div>

        {/* Modal de confirmation d'attaque */}
        {showAttackConfirm && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 rounded-2xl">
                <div className="bg-[rgba(16,8,46,0.98)] border border-red-500/30 rounded-2xl shadow-2xl w-full max-w-sm space-y-4 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-900/40 border border-red-500/50 text-red-400 animate-pulse">
                            <AlertTriangle size={22} />
                        </div>
                        <h3 className="text-base font-black uppercase tracking-widest text-red-400">Confirmer l'attaque</h3>
                    </div>
                    <div className="space-y-2 text-xs text-slate-300">
                        <div className="flex justify-between items-center p-2 bg-black/40 rounded border border-cyan-500/10">
                            <span className="text-slate-500 uppercase font-bold">Cible</span>
                            <span className="font-mono text-slate-200">{targetPlanet.name} {targetPlanet.galaxy ? `[${targetPlanet.galaxy}:${targetPlanet.system}:${targetPlanet.position}]` : ''}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-black/40 rounded border border-cyan-500/10">
                            <span className="text-slate-500 uppercase font-bold">Vaisseaux</span>
                            <span className="font-mono text-slate-200">{totalShips} unité(s)</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-black/40 rounded border border-cyan-500/10">
                            <span className="text-slate-500 uppercase font-bold">ETA aller</span>
                            {isEstimating
                              ? <Loader2 size={14} className="animate-spin text-cyan-400" />
                              : <span className="font-mono text-slate-200">{flightTime}s</span>
                            }
                        </div>
                        <div className="p-2 bg-red-950/20 rounded border border-red-900/40 text-red-300 text-[10px] text-center font-bold uppercase tracking-wider">
                            Cette action est irréversible
                        </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <Button variant="ghost" onClick={() => setShowAttackConfirm(false)} className="flex-1 border border-cyan-500/10 text-slate-400 hover:text-slate-200 text-xs font-bold uppercase">
                            Annuler
                        </Button>
                        <Button onClick={handleLaunch} disabled={isLaunching} className="flex-[2] bg-red-600 hover:bg-red-500 text-slate-200 font-black uppercase tracking-widest text-xs shadow-lg shadow-red-600/20">
                            {isLaunching ? "LANCEMENT..." : "Confirmer l'attaque"}
                        </Button>
                    </div>
                </div>
            </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
