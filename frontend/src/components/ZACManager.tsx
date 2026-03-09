import { useState, useEffect, useCallback } from "react";
import { Shield, ShieldCheck, RefreshCw, Save, Trash2, Info, ChevronDown, ChevronUp } from "lucide-react";
import { apiUrl } from "@/config/api";
import { getShipImage } from "@/lib/images";

const SHIP_DISPLAY_NAMES: Record<string, string> = {
  light_hunter: "Chasseur Léger",
  heavy_hunter: "Chasseur Lourd",
  cruiser: "Croiseur",
  battleship: "Cuirassé",
  destroyer: "Destructeur",
  bomber: "Bombardier",
  deathstar: "Étoile de la Mort",
  transporter: "Transporteur",
  colony_ship: "Vaisseau Colonie",
  recycler: "Recycleur",
  spy_probe: "Sonde Espion",
  grand_cargo: "Grand Cargo",
};

const COMBAT_SHIP_KEYS = [
  "deathstar", "destroyer", "bomber", "battleship", "cruiser",
  "heavy_hunter", "light_hunter", "transporter", "recycler",
];

interface ZACManagerProps {
  planetId: string;
}

export default function ZACManager({ planetId }: ZACManagerProps) {
  const [fleet, setFleet] = useState<Record<string, number>>({});
  const [combatZone, setCombatZone] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchZAC = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/planets/${planetId}/combat-zone`));
      if (!res.ok) return;
      const data = await res.json();
      setFleet(data.fleet ?? {});
      setCombatZone(data.combat_zone ?? {});
      setDraft(data.combat_zone ?? {});
    } catch (e) {
      console.error("ZAC fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [planetId]);

  useEffect(() => {
    fetchZAC();
  }, [fetchZAC]);

  const combatShips = COMBAT_SHIP_KEYS.filter(k => (fleet[k] ?? 0) > 0);
  const isZACActive = Object.keys(combatZone).length > 0;
  const totalZAC = Object.values(draft).reduce((a, b) => a + b, 0);

  const handleChange = (key: string, val: number) => {
    const clamped = Math.max(0, Math.min(val, fleet[key] ?? 0));
    setDraft(prev => ({ ...prev, [key]: clamped }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/planets/${planetId}/combat-zone`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: draft }),
      });
      if (res.ok) {
        const data = await res.json();
        setCombatZone(data.combat_zone ?? {});
        setDraft(data.combat_zone ?? {});
        setDirty(false);
      }
    } catch (e) {
      console.error("ZAC save error", e);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await fetch(apiUrl(`/planets/${planetId}/combat-zone`), { method: "DELETE" });
      setCombatZone({});
      setDraft({});
      setDirty(false);
    } catch (e) {
      console.error("ZAC clear error", e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 animate-pulse">
        <div className="h-5 w-32 bg-slate-700 rounded mb-3" />
        <div className="h-16 bg-slate-800 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isZACActive ? "bg-cyan-500/20" : "bg-slate-800"}`}>
            {isZACActive ? (
              <ShieldCheck size={16} className="text-cyan-400" />
            ) : (
              <Shield size={16} className="text-slate-500" />
            )}
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-white">Zone Aérienne de Combat</div>
            <div className="text-[10px] text-slate-500">
              {isZACActive
                ? `${totalZAC} vaisseaux assignés en défense`
                : "Tous les vaisseaux défendent (par défaut)"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isZACActive && (
            <span className="bg-cyan-500/20 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-500/30">
              ACTIVE
            </span>
          )}
          {expanded ? (
            <ChevronUp size={14} className="text-slate-500" />
          ) : (
            <ChevronDown size={14} className="text-slate-500" />
          )}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-4">
          {/* Info banner */}
          <div className="flex gap-2 bg-slate-800/60 rounded-lg p-3 text-[10px] text-slate-400">
            <Info size={12} className="shrink-0 mt-0.5 text-indigo-400" />
            <span>
              Assignez des vaisseaux à la ZAC. En cas d'attaque, seuls ces vaisseaux (et vos défenses planétaires)
              participent au combat. Laissez vide pour que toute la flotte défende.
            </span>
          </div>

          {combatShips.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">
              Aucun vaisseau disponible sur cette planète.
            </p>
          ) : (
            <div className="space-y-2">
              {combatShips.map(key => {
                const available = fleet[key] ?? 0;
                const assigned = draft[key] ?? 0;
                const pct = available > 0 ? (assigned / available) * 100 : 0;
                return (
                  <div key={key} className="bg-slate-800/40 rounded-xl p-3">
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={getShipImage(key)}
                        alt={SHIP_DISPLAY_NAMES[key] ?? key}
                        className="w-8 h-8 object-contain opacity-80"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {SHIP_DISPLAY_NAMES[key] ?? key}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {assigned} / {available} assignés
                        </div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={available}
                        value={assigned}
                        onChange={e => handleChange(key, parseInt(e.target.value) || 0)}
                        className="w-20 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white text-right font-mono focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 transition-all duration-200"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick actions */}
          {combatShips.length > 0 && (
            <div className="flex gap-2">
              <button
                className="flex-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg py-2 transition-colors"
                onClick={() => {
                  const all: Record<string, number> = {};
                  combatShips.forEach(k => { all[k] = fleet[k] ?? 0; });
                  setDraft(all);
                  setDirty(true);
                }}
              >
                Tout assigner
              </button>
              <button
                className="flex-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg py-2 transition-colors"
                onClick={() => {
                  setDraft({});
                  setDirty(true);
                }}
              >
                Tout retirer
              </button>
            </div>
          )}

          {/* Save / Clear */}
          <div className="flex gap-2 pt-1">
            {isZACActive && (
              <button
                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold rounded-lg transition-colors"
                onClick={handleClear}
                disabled={saving}
              >
                <Trash2 size={12} />
                Désactiver ZAC
              </button>
            )}
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors ${
                dirty
                  ? "bg-cyan-600 hover:bg-cyan-500 text-white"
                  : "bg-slate-800 text-slate-500 cursor-default"
              }`}
              onClick={dirty ? handleSave : undefined}
              disabled={saving || !dirty}
            >
              {saving ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <Save size={12} />
              )}
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
