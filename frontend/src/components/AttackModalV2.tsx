import { useState, useEffect } from "react";
import { Crosshair, Rocket, AlertTriangle, X, Minus, Plus, BookmarkPlus, Trash2, Zap, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';

interface ShipSelection {
  [shipKey: string]: number;
}

interface ShipType {
  ship_key: string;
  display_name: string;
  current_count: number;
  attack: number;
  shield: number;
  hull: number;
  cargo_capacity: number;
}

interface FleetPreset {
  id: string;
  name: string;
  composition: { [key: string]: number };
}

interface AttackModalV2Props {
  planetId: string;
  targetPlanetId: string;
  targetName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AttackModalV2({
  planetId,
  targetPlanetId,
  targetName,
  onSuccess,
  onCancel
}: AttackModalV2Props) {
  const [shipSelection, setShipSelection] = useState<ShipSelection>({});
  const [availableShips, setAvailableShips] = useState<ShipType[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);

  // Presets
  const [presets, setPresets] = useState<FleetPreset[]>([]);
  const [showPresets, setShowPresets] = useState(true);
  const [savingPreset, setSavingPreset] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [presetName, setPresetName] = useState("");

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
          const ships = (data.ship_types || [])
            .filter((ship: ShipType) => ship.current_count > 0);

          setAvailableShips(ships);

          const initialSelection: ShipSelection = {};
          ships.forEach((ship: ShipType) => {
            initialSelection[ship.ship_key] = 0;
          });
          setShipSelection(initialSelection);
        }
      } catch (e) {
        console.error("Failed to fetch ship types:", e);
        toast.error("Erreur lors du chargement de la flotte");
      }
    };

    if (planetId) {
      fetchShipTypes();
    }
  }, [planetId]);

  // Load presets
  useEffect(() => {
    if (!userId) return;
    fetch(apiUrl(`/users/${userId}/fleet-presets`))
      .then(r => r.ok ? r.json() : [])
      .then(data => setPresets(data))
      .catch(() => {});
  }, [userId]);

  const handleShipCountChange = (shipKey: string, count: number) => {
    const ship = availableShips.find(s => s.ship_key === shipKey);
    if (!ship) return;

    const validCount = Math.max(0, Math.min(count, ship.current_count));
    setShipSelection(prev => ({ ...prev, [shipKey]: validCount }));
  };

  const loadPreset = (preset: FleetPreset) => {
    const newSelection: ShipSelection = {};
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
        const err = await res.json();
        toast.error(err.error || "Erreur de sauvegarde");
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
      const res = await fetch(apiUrl(`/users/${userId}/fleet-presets/${preset.id}`), {
        method: 'DELETE',
      });
      if (res.ok) {
        setPresets(prev => prev.filter(p => p.id !== preset.id));
        toast.success(`Preset "${preset.name}" supprimé`);
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const handleSubmit = async () => {
    const fleet = Object.entries(shipSelection)
      .filter(([_, count]) => count > 0)
      .reduce((acc, [key, count]) => ({ ...acc, [key]: count }), {});

    if (Object.keys(fleet).length === 0) {
      toast.error("Sélectionnez au moins un vaisseau");
      return;
    }

    setIsLaunching(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/attack/v2?current_planet_id=${planetId}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target_planet_id: targetPlanetId,
          fleet: fleet
        })
      });

      if (res.ok) {
        toast.success("Flotte en route !");
        onSuccess();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'attaque");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setIsLaunching(false);
    }
  };

  const totalPower = availableShips.reduce((sum, ship) => {
    return sum + (ship.attack * (shipSelection[ship.ship_key] || 0));
  }, 0);

  const totalCargo = availableShips.reduce((sum, ship) => {
    return sum + (ship.cargo_capacity * (shipSelection[ship.ship_key] || 0));
  }, 0);

  const totalShips = Object.values(shipSelection).reduce((sum, count) => sum + count, 0);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-950 border-2 border-red-900 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.3)] card-depth glass-card animate-slide-up max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-red-950/50 p-6 border-b border-red-900/50 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg animate-pulse">
                <Crosshair className="text-white" size={24} />
            </div>
            <div>
                <h2 className="text-xl font-black uppercase text-white tracking-widest">Lancement Attaque</h2>
                <p className="text-xs text-red-400 font-mono">Cible : {targetName}</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-red-400 hover:text-white transition-all duration-300 hover:scale-110 card-depth hover:shadow-lg hover:-translate-y-0.5">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">

          {/* Fleet Presets Panel */}
          {userId && (
            <div className="bg-slate-900/60 border border-indigo-900/40 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowPresets(p => !p)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-widest">
                  <Zap size={13} />
                  Presets de flotte ({presets.length}/10)
                </div>
                {showPresets ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
              </button>

              {showPresets && (
                <div className="px-4 pb-4 space-y-3">
                  {/* Preset buttons */}
                  {presets.length === 0 ? (
                    <p className="text-xs text-slate-600 italic">Aucun preset sauvegardé. Configurez une flotte et cliquez sur "Sauvegarder".</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {presets.map(preset => (
                        <div key={preset.id} className="flex items-center gap-1 bg-indigo-950/50 border border-indigo-800/40 rounded-lg overflow-hidden">
                          <button
                            onClick={() => loadPreset(preset)}
                            className="px-3 py-1.5 text-xs font-bold text-indigo-300 hover:text-white hover:bg-indigo-800/40 transition-colors"
                          >
                            {preset.name}
                          </button>
                          <button
                            onClick={(e) => deletePreset(preset, e)}
                            className="px-1.5 py-1.5 text-slate-600 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Save current selection as preset */}
                  {!showSaveForm ? (
                    <button
                      onClick={() => setShowSaveForm(true)}
                      disabled={presets.length >= 10}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <BookmarkPlus size={13} />
                      Sauvegarder la composition actuelle...
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={presetName}
                        onChange={e => setPresetName(e.target.value.slice(0, 64))}
                        placeholder="Nom du preset..."
                        className="h-8 text-xs bg-slate-950 border-indigo-900/50 text-white flex-1"
                        onKeyDown={e => { if (e.key === 'Enter') savePreset(); if (e.key === 'Escape') { setShowSaveForm(false); setPresetName(""); } }}
                        autoFocus
                      />
                      <button
                        onClick={savePreset}
                        disabled={savingPreset || !presetName.trim()}
                        className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors disabled:opacity-50"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => { setShowSaveForm(false); setPresetName(""); }}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Ship Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider">Composition de la flotte</h3>

            {availableShips.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <p>Aucun vaisseau disponible</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-100 overflow-y-auto scrollbar-thin">
                {availableShips.map((ship) => {
                  const selected = shipSelection[ship.ship_key] || 0;
                  return (
                    <div
                      key={ship.ship_key}
                      className="bg-slate-900/50 border border-white/5 p-4 rounded-lg hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Rocket size={16} className="text-slate-400" />
                          <div>
                            <div className="text-sm font-bold text-white">{ship.display_name}</div>
                            <div className="text-xs text-slate-500">
                              Disponible: <span className="text-white font-mono">{ship.current_count}</span>
                              {' • '}
                              ATK: <span className="text-red-400">{ship.attack}</span>
                              {' • '}
                              Cargo: <span className="text-yellow-400">{ship.cargo_capacity}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleShipCountChange(ship.ship_key, selected - 1)}
                            className="p-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition-all"
                            disabled={selected === 0}
                          >
                            <Minus size={14} />
                          </button>

                          <Input
                            type="number"
                            min="0"
                            max={ship.current_count}
                            value={selected}
                            onChange={(e) => handleShipCountChange(ship.ship_key, parseInt(e.target.value) || 0)}
                            className="w-16 bg-black border-red-900/50 text-white text-center font-mono text-sm"
                          />

                          <button
                            onClick={() => handleShipCountChange(ship.ship_key, selected + 1)}
                            className="p-1 bg-green-900/30 hover:bg-green-900/50 text-green-400 rounded transition-all"
                            disabled={selected >= ship.current_count}
                          >
                            <Plus size={14} />
                          </button>

                          <button
                            onClick={() => handleShipCountChange(ship.ship_key, ship.current_count)}
                            className="px-2 py-1 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 text-xs rounded transition-all font-bold"
                          >
                            MAX
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Résumé */}
          <div className="bg-red-900/10 border border-red-900/30 p-4 rounded-xl glass-card hover:-translate-y-0.5 transition-all duration-300 card-depth">
              <div className="flex items-center gap-2 text-red-500 text-xs font-bold uppercase mb-3">
                  <AlertTriangle size={14} className="animate-bounce-subtle" /> Zone de Guerre
              </div>
              <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                      <p className="text-[10px] text-slate-500 uppercase">Vaisseaux</p>
                      <p className="text-xl font-black text-white">{totalShips.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                      <p className="text-[10px] text-slate-500 uppercase">Puissance de feu</p>
                      <p className="text-xl font-black text-white">{totalPower.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                      <p className="text-[10px] text-yellow-500 uppercase">Capacité Cargo</p>
                      <p className="text-xl font-black text-yellow-400">{totalCargo.toLocaleString()}</p>
                  </div>
              </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4 pt-2">
              <Button onClick={onCancel} className="bg-transparent border border-white/10 hover:bg-white/5 text-slate-400 font-bold uppercase card-depth hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                  Annuler
              </Button>
              <Button
                  onClick={handleSubmit}
                  disabled={totalShips === 0 || isLaunching}
                  className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.5)] disabled:opacity-50 disabled:cursor-not-allowed card-depth hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                  {isLaunching ? "LANCEMENT..." : "FEU À VOLONTÉ"}
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
