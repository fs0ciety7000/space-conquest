import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "@/config/api";
import { toast } from "sonner";
import {
  Package, RefreshCw, Crosshair, Skull, Zap, Shield, Bug,
  ChevronRight, X, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface InventoryItem {
  inventory_id: string;
  item_id: string;
  name: string;
  description: string;
  image_key: string;
  effect_type: string;
  effect_params: Record<string, unknown>;
  quantity: number;
  acquired_at: string;
}

interface InventoryData {
  inventory: InventoryItem[];
  syndicate_credits: number;
}

interface InventoryProps {
  userId: string;
  planet: any;
  onExtortionLaunched?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EFFECT_ICONS: Record<string, React.ReactNode> = {
  orbital_strike: <Skull size={20} className="text-red-400" />,
  resource_boost: <Zap size={20} className="text-amber-400" />,
  stealth: <Shield size={20} className="text-slate-300" />,
  coordinate_jam: <Crosshair size={20} className="text-cyan-400" />,
  eco_virus: <Bug size={20} className="text-green-400" />,
};

const EFFECT_LABELS: Record<string, string> = {
  orbital_strike: "Frappe Orbitale",
  resource_boost: "Boost Production",
  stealth: "Module Furtif",
  coordinate_jam: "Brouilleur",
  eco_virus: "Virus Économique",
};

// ── Orbital Strike Target Modal ───────────────────────────────────────────────

interface OrbitalTargetModalProps {
  item: InventoryItem;
  onClose: () => void;
  onLaunch: (inventoryId: string, galaxy: number, system: number, position: number) => Promise<void>;
  launching: boolean;
}

function OrbitalTargetModal({ item, onClose, onLaunch, launching }: OrbitalTargetModalProps) {
  const [galaxy, setGalaxy] = useState(1);
  const [system, setSystem] = useState(1);
  const [position, setPosition] = useState(1);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="relative overflow-hidden rounded-2xl border border-red-800/50 bg-gradient-to-b from-slate-950 to-red-950/20 shadow-2xl w-full max-w-md">
        <div className="absolute -right-8 -top-8 opacity-[0.04] pointer-events-none">
          <Skull size={200} className="text-red-500" />
        </div>

        <div className="p-6 relative">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl border border-red-800/40 bg-red-950/30">
                <Skull size={22} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-red-400 tracking-wider">Frappe Orbitale</h3>
                <p className="text-[10px] text-slate-500 uppercase">Coordonnées de la cible</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-white/10 text-slate-500 hover:text-white hover:border-red-500/50 transition-all"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-3 rounded-lg border border-amber-800/30 bg-amber-950/10 mb-5">
            <p className="text-amber-400 text-xs font-bold flex items-center gap-2">
              <Skull size={11} /> Vous resterez 100% anonyme
            </p>
            <p className="text-slate-500 text-[10px] mt-1">
              La flotte pirate arrive en <strong className="text-slate-400">
                {(item.effect_params.flight_hours as number) || 12}h
              </strong>. La cible peut payer pour contrer ou se retourner contre l'instigateur inconnu.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <MapPin size={10} /> Coordonnées galactiques
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Galaxie", value: galaxy, onChange: setGalaxy, min: 1, max: 9 },
                { label: "Système", value: system, onChange: setSystem, min: 1, max: 499 },
                { label: "Position", value: position, onChange: setPosition, min: 1, max: 15 },
              ].map(({ label, value, onChange, min, max }) => (
                <div key={label}>
                  <p className="text-[9px] uppercase text-slate-600 font-bold mb-1">{label}</p>
                  <Input
                    type="number"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
                    onFocus={(e) => e.target.select()}
                    className="bg-black/40 border-slate-700/50 text-white font-mono text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onClose}
              className="flex-1 bg-slate-800 border border-white/10 hover:bg-slate-700 text-white font-bold uppercase"
            >
              Annuler
            </Button>
            <Button
              onClick={() => onLaunch(item.inventory_id, galaxy, system, position)}
              disabled={launching}
              className="flex-1 bg-red-950/60 border border-red-700/50 hover:bg-red-900/80 text-red-300 font-black uppercase tracking-wider shadow-[0_0_12px_rgba(220,38,38,0.3)] hover:shadow-[0_0_24px_rgba(220,38,38,0.5)] disabled:opacity-50 transition-all"
            >
              {launching ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <><Skull size={14} className="mr-2" />Lancer la frappe</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Inventory Component ──────────────────────────────────────────────────

export default function Inventory({ userId, planet, onExtortionLaunched }: InventoryProps) {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [orbitalTarget, setOrbitalTarget] = useState<InventoryItem | null>(null);
  const [launching, setLaunching] = useState(false);

  const token = localStorage.getItem("token");

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/black-market/inventory"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleActivate = async (item: InventoryItem) => {
    if (item.effect_type === "orbital_strike") {
      setOrbitalTarget(item);
      return;
    }
    setActivating(item.inventory_id);
    try {
      const res = await fetch(apiUrl("/black-market/activate"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inventory_id: item.inventory_id }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`"${item.name}" activé`, { description: json.message });
        load();
      } else {
        toast.error(json.error || "Erreur d'activation");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setActivating(null);
    }
  };

  const handleOrbitalLaunch = async (
    inventoryId: string,
    galaxy: number,
    system: number,
    position: number,
  ) => {
    setLaunching(true);
    try {
      const res = await fetch(apiUrl("/black-market/activate"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inventory_id: inventoryId, target_galaxy: galaxy, target_system: system, target_position: position }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Frappe orbitale lancée", {
          description: `Pirates en route. Arrivée: ${new Date(json.arrival_time + "Z").toLocaleString("fr-FR")}`,
        });
        setOrbitalTarget(null);
        load();
        onExtortionLaunched?.();
      } else {
        toast.error(json.error || "Erreur lors du lancement");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLaunching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <RefreshCw className="animate-spin text-red-400" size={24} />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border border-red-900/40 bg-red-950/20">
              <Package size={20} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-white tracking-wider">Inventaire</h3>
              <p className="text-[10px] text-slate-500 uppercase">Objets du Syndicat</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-yellow-600/30 bg-yellow-950/20">
            <Coins size={13} className="text-yellow-400" />
            <span className="text-yellow-400 font-black font-mono">
              {data?.syndicate_credits?.toFixed(0) ?? 0}
            </span>
            <span className="text-yellow-600 text-[10px] font-bold">SC</span>
          </div>
        </div>

        {/* Items */}
        {!data?.inventory?.length ? (
          <div className="text-center py-12 rounded-xl border border-slate-800/40 bg-slate-950/40">
            <Package size={40} className="mx-auto text-slate-700 mb-3 animate-pulse" />
            <p className="text-slate-500 text-sm font-bold uppercase">Inventaire vide</p>
            <p className="text-slate-700 text-xs mt-1">Achetez des objets au Marché Underground</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.inventory.map((item) => {
              const icon = EFFECT_ICONS[item.effect_type] || <Package size={20} className="text-slate-400" />;
              const isActivating = activating === item.inventory_id;
              return (
                <div
                  key={item.inventory_id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-700/30 bg-slate-900/40 hover:border-slate-600/50 transition-all"
                >
                  <div className="p-2.5 rounded-lg border border-slate-700/30 bg-black/30 shrink-0">
                    {icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-sm truncate">{item.name}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/40 text-slate-500 uppercase font-bold shrink-0">
                        ×{item.quantity}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5 leading-snug line-clamp-1">{item.description}</p>
                    <p className="text-[9px] text-slate-700 mt-1 uppercase font-bold">
                      {EFFECT_LABELS[item.effect_type] || item.effect_type}
                    </p>
                  </div>

                  <Button
                    onClick={() => handleActivate(item)}
                    disabled={isActivating}
                    className="shrink-0 text-xs font-black uppercase tracking-wider bg-red-950/40 border border-red-800/40 hover:bg-red-900/60 hover:border-red-600/60 text-red-400 transition-all"
                  >
                    {isActivating ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <><ChevronRight size={13} className="mr-1" />Utiliser</>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {orbitalTarget && (
        <OrbitalTargetModal
          item={orbitalTarget}
          onClose={() => setOrbitalTarget(null)}
          onLaunch={handleOrbitalLaunch}
          launching={launching}
        />
      )}
    </>
  );
}
