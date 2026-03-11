import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { apiUrl } from "@/config/api";
import { formatDistanceToNow, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Hammer, FlaskConical, Rocket, ShieldHalf, Building2,
  ArrowLeftRight, Package, Skull, RefreshCw, Filter,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EconomyEntry {
  id: string;
  source: string;
  category: string;
  action: string;
  description: string;
  metal: number;
  crystal: number;
  deuterium: number;
  syndicate_credits: number;
  planet_name: string | null;
  counterparty_username: string | null;
  item_key: string | null;
  created_at: string;
}

type FilterTab = "all" | "construction" | "market" | "black_market";

// ── Helpers ───────────────────────────────────────────────────────────────────

function categoryIcon(entry: EconomyEntry) {
  const { category, action, item_key } = entry;
  if (category === "black_market") return <Skull size={14} className="text-red-400 shrink-0" />;
  if (category === "market") return <ArrowLeftRight size={14} className="text-cyan-400 shrink-0" />;
  if (action === "build") {
    if (item_key?.includes("tech")) return <FlaskConical size={14} className="text-purple-400 shrink-0" />;
    if (
      item_key?.includes("ship") || item_key?.includes("hunter") || item_key?.includes("cargo") ||
      item_key?.includes("bomber") || item_key?.includes("cruiser") || item_key?.includes("battleship") ||
      item_key?.includes("destroyer") || item_key?.includes("deathstar") || item_key?.includes("recycler") ||
      item_key?.includes("transporter") || item_key?.includes("probe") || item_key?.includes("colony")
    ) return <Rocket size={14} className="text-blue-400 shrink-0" />;
    if (
      item_key?.includes("laser") || item_key?.includes("cannon") || item_key?.includes("turret") ||
      item_key?.includes("launcher") || item_key?.includes("shield") || item_key?.includes("ion") ||
      item_key?.includes("gauss") || item_key?.includes("plasma")
    ) return <ShieldHalf size={14} className="text-orange-400 shrink-0" />;
    return <Building2 size={14} className="text-emerald-400 shrink-0" />;
  }
  return <Package size={14} className="text-slate-400 shrink-0" />;
}

function categoryBadge(entry: EconomyEntry) {
  if (entry.category === "black_market") {
    return <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-red-950/50 text-red-400 border border-red-800/30">Underground</span>;
  }
  if (entry.category === "market") {
    const label = entry.action.startsWith("planet") ? "Marché planétaire" : "Marché";
    return <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-cyan-950/50 text-cyan-400 border border-cyan-500/20">{label}</span>;
  }
  const desc = entry.description;
  let label = "Construction";
  if (desc.startsWith("Technologie")) label = "Recherche";
  else if (desc.startsWith("Vaisseau")) label = "Vaisseau";
  else if (desc.startsWith("Défense")) label = "Défense";
  else if (desc.startsWith("Installation")) label = "Installation";
  return <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-800/30">{label}</span>;
}

function ResourceAmount({ label, value, color }: { label: string; value: number; color: string }) {
  if (value === 0) return null;
  const sign = value > 0 ? "+" : "";
  return (
    <span className={`text-[10px] font-mono tabular-nums font-bold ${color}`}>
      {sign}{Math.round(Math.abs(value)).toLocaleString("fr-FR")} {label}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    const d = parseISO(iso + "Z");
    return formatDistanceToNow(d, { addSuffix: true, locale: fr });
  } catch {
    return iso;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EconomyLog() {
  const [entries, setEntries] = useState<EconomyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/economy/log"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "all"
    ? entries
    : entries.filter((e) => e.category === filter);

  const tabs: { key: FilterTab; label: string; activeColor: string }[] = [
    { key: "all",          label: "Tout",         activeColor: "text-slate-300 bg-white/5 border border-cyan-500/10" },
    { key: "construction", label: "Constructions", activeColor: "text-emerald-400 bg-emerald-500/5 border border-emerald-500/20" },
    { key: "market",       label: "Marché",        activeColor: "text-cyan-400 bg-cyan-500/5 border border-cyan-500/20" },
    { key: "black_market", label: "Underground",   activeColor: "text-red-400 bg-red-500/5 border border-red-500/20" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-cyan-500/10">
        <div className="flex items-center gap-1">
          <Filter size={12} className="text-slate-600" />
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all duration-150 ${
                filter === t.key
                  ? t.activeColor
                  : "text-slate-600 hover:text-slate-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1 rounded text-slate-600 hover:text-slate-400 transition-all disabled:opacity-40"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        {loading && (
          <div className="text-center text-slate-600 text-xs py-10 font-mono">
            <RefreshCw size={16} className="animate-spin mx-auto mb-2" />
            Chargement du journal...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center text-slate-700 text-xs py-10 font-mono">
            Aucune entrée pour ce filtre.
          </div>
        )}

        {!loading && filtered.map((entry) => {
          const hasResources = entry.metal !== 0 || entry.crystal !== 0 || entry.deuterium !== 0;
          const hasSC = entry.syndicate_credits !== 0;

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-3 p-3 rounded-lg border border-cyan-500/10 bg-[rgba(10,5,32,0.85)] hover:bg-cyan-500/5 transition-colors duration-150"
            >
              {/* Icon */}
              <div className="mt-0.5">{categoryIcon(entry)}</div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  {categoryBadge(entry)}
                  <span className="text-slate-200 text-xs font-medium truncate">{entry.description}</span>
                </div>

                {/* Resources row */}
                {(hasResources || hasSC) && (
                  <div className="flex items-center gap-3 flex-wrap mt-1">
                    {entry.metal !== 0 && (
                      <ResourceAmount
                        label="Métal"
                        value={entry.metal}
                        color={entry.metal < 0 ? "text-red-400" : "text-emerald-400"}
                      />
                    )}
                    {entry.crystal !== 0 && (
                      <ResourceAmount
                        label="Cristal"
                        value={entry.crystal}
                        color={entry.crystal < 0 ? "text-red-400" : "text-emerald-400"}
                      />
                    )}
                    {entry.deuterium !== 0 && (
                      <ResourceAmount
                        label="Deutérium"
                        value={entry.deuterium}
                        color={entry.deuterium < 0 ? "text-red-400" : "text-emerald-400"}
                      />
                    )}
                    {hasSC && (
                      <ResourceAmount
                        label="SC"
                        value={entry.syndicate_credits}
                        color={entry.syndicate_credits < 0 ? "text-red-400" : "text-emerald-400"}
                      />
                    )}
                  </div>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {entry.planet_name && (
                    <span className="text-[9px] text-slate-500 font-mono">{entry.planet_name}</span>
                  )}
                  {entry.counterparty_username && (
                    <span className="text-[9px] text-slate-500 font-mono">
                      → <span className="text-slate-400 font-medium">{entry.counterparty_username}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <span className="text-[9px] text-slate-500 font-mono tabular-nums shrink-0 mt-0.5 whitespace-nowrap">
                {formatDate(entry.created_at)}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
