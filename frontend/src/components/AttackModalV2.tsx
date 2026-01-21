import { useState, useEffect } from "react";
import { Crosshair, Shield, Rocket, AlertTriangle, X, Minus, Plus } from "lucide-react";
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

          // Initialize selection to 0 for all ship types
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

  const handleShipCountChange = (shipKey: string, count: number) => {
    const ship = availableShips.find(s => s.ship_key === shipKey);
    if (!ship) return;

    const validCount = Math.max(0, Math.min(count, ship.current_count));
    setShipSelection(prev => ({ ...prev, [shipKey]: validCount }));
  };

  const handleSubmit = async () => {
    // Filter out ships with 0 count
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
        const data = await res.json();
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

  // Calculate totals
  const totalPower = availableShips.reduce((sum, ship) => {
    const count = shipSelection[ship.ship_key] || 0;
    return sum + (ship.attack * count);
  }, 0);

  const totalCargo = availableShips.reduce((sum, ship) => {
    const count = shipSelection[ship.ship_key] || 0;
    return sum + (ship.cargo_capacity * count);
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

        {/* Corps */}
        <div className="p-6 space-y-4">

            {/* Ship Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider">Composition de la flotte</h3>

              {availableShips.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <p>Aucun vaisseau disponible</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
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
