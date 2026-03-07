import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "@/config/api";
import { toast } from "sonner";
import {
  Skull, ShoppingCart, TrendingUp, TrendingDown, Minus,
  Lock, RefreshCw, Coins, AlertTriangle, Zap, Info,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BlackMarketItem {
  id: string;
  name: string;
  description: string;
  image_key: string;
  effect_type: string;
  effect_params: Record<string, unknown>;
  base_price: number;
  current_price: number;
  price_change_pct: number;
  price_last_updated: string;
}

interface MarketData {
  items: BlackMarketItem[];
  syndicate_credits: number;
  access: boolean;
}

interface AccessDenied {
  error: string;
  requires: { espionage_tech: number; computer_tech: number };
  current?: { espionage_tech: number; computer_tech: number };
}

interface UndergroundMarketProps {
  planet: any;
  userId: string;
  onInventoryChange?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EFFECT_LABELS: Record<string, string> = {
  orbital_strike: "Frappe Orbitale",
  resource_boost: "Boost Production",
  stealth: "Module Furtif",
  coordinate_jam: "Brouilleur",
  eco_virus: "Virus Économique",
};

const EFFECT_COLORS: Record<string, string> = {
  orbital_strike: "text-red-400 border-red-500/40 bg-red-950/20",
  resource_boost: "text-amber-400 border-amber-500/40 bg-amber-950/20",
  stealth: "text-slate-300 border-slate-500/40 bg-slate-800/30",
  coordinate_jam: "text-cyan-400 border-cyan-500/40 bg-cyan-950/20",
  eco_virus: "text-green-400 border-green-500/40 bg-green-950/20",
};

function PriceIndicator({ pct }: { pct: number }) {
  if (pct > 5) return (
    <span className="flex items-center gap-0.5 text-red-400 text-xs font-mono font-bold">
      <TrendingUp size={11} /> +{pct.toFixed(0)}%
    </span>
  );
  if (pct < -5) return (
    <span className="flex items-center gap-0.5 text-emerald-400 text-xs font-mono font-bold">
      <TrendingDown size={11} /> {pct.toFixed(0)}%
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-slate-500 text-xs font-mono">
      <Minus size={11} /> stable
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UndergroundMarket({
  planet,
  userId,
  onInventoryChange,
}: UndergroundMarketProps) {
  const [data, setData] = useState<MarketData | null>(null);
  const [denied, setDenied] = useState<AccessDenied | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<BlackMarketItem | null>(null);

  const token = localStorage.getItem("token");

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/black-market"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setDenied(await res.json());
        setData(null);
      } else if (res.ok) {
        setData(await res.json());
        setDenied(null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBuy = async (item: BlackMarketItem) => {
    setBuying(item.id);
    try {
      const res = await fetch(apiUrl("/black-market/buy"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.id, quantity: 1 }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`"${item.name}" ajouté à l'inventaire`, {
          description: `Crédits restants: ${json.remaining_credits?.toFixed(0)} SC`,
        });
        load();
        onInventoryChange?.();
      } else if (res.status === 402) {
        toast.error("Crédits insuffisants", {
          description: `Requis: ${json.required?.toFixed(0)} SC — Disponible: ${json.current?.toFixed(0)} SC`,
        });
      } else {
        toast.error(json.error || "Erreur lors de l'achat");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setBuying(null);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-red-400" size={28} />
      </div>
    );
  }

  // ── Access denied (tech requirements not met) ────────────────────────────────
  if (denied) {
    const cur = denied.current;
    const req = denied.requires;
    return (
      <div className="relative overflow-hidden rounded-2xl border border-red-900/30 bg-slate-950">
        {/* Background skull watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
          <Skull size={300} className="text-red-500" />
        </div>

        <div className="relative p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-red-900/50 bg-red-950/30 mb-6">
            <Lock size={36} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-widest text-red-400 mb-2">Accès Refusé</h2>
          <p className="text-slate-500 text-sm mb-8">Le Marché Underground n'accepte que les agents suffisamment qualifiés.</p>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
            {[
              { label: "Tech. Espionnage", key: "espionage_tech", req: req.espionage_tech },
              { label: "Tech. Informatique", key: "computer_tech", req: req.computer_tech },
            ].map(({ label, key, req: required }) => {
              const current = cur?.[key as keyof typeof cur] ?? 0;
              const met = current >= required;
              return (
                <div
                  key={key}
                  className={`p-4 rounded-xl border ${met ? "border-emerald-500/30 bg-emerald-950/20" : "border-red-900/30 bg-red-950/10"}`}
                >
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">{label}</p>
                  <p className={`text-2xl font-black font-mono ${met ? "text-emerald-400" : "text-red-400"}`}>
                    {current}<span className="text-slate-600 text-sm">/{required}</span>
                  </p>
                  {!met && (
                    <p className="text-[9px] text-red-500 mt-1">
                      {required - current} niveau{required - current > 1 ? "x" : ""} manquant{required - current > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // ── Market ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-red-900/40 bg-gradient-to-br from-slate-950 via-red-950/10 to-slate-950 p-6">
        <div className="absolute -right-8 -top-8 opacity-[0.04] pointer-events-none">
          <Skull size={200} className="text-red-500" />
        </div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl border border-red-800/40 bg-red-950/30">
              <Skull size={28} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-widest text-red-400">Marché Underground</h2>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Syndicat des Ombres — Accès Confidentiel</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-yellow-600/30 bg-yellow-950/20">
            <Coins size={16} className="text-yellow-400" />
            <span className="text-yellow-400 font-black font-mono text-lg">
              {data.syndicate_credits.toFixed(0)}
            </span>
            <span className="text-yellow-600 text-xs font-bold uppercase">SC</span>
          </div>
        </div>

        <div className="relative mt-3 flex items-center gap-2 text-xs text-slate-600">
          <AlertTriangle size={11} className="text-amber-600" />
          <span>Les prix fluctuent toutes les 6 heures. Les crédits s'obtiennent lors des expéditions.</span>
        </div>
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.items.map((item) => {
          const colorClass = EFFECT_COLORS[item.effect_type] || "text-slate-400 border-slate-600/40 bg-slate-900/20";
          const isSelected = selectedItem?.id === item.id;
          const canAfford = data.syndicate_credits >= item.current_price;

          return (
            <div
              key={item.id}
              className={`group relative overflow-hidden rounded-xl border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "border-red-500/60 bg-red-950/20 ring-1 ring-red-500/30"
                  : "border-slate-700/40 bg-slate-900/40 hover:border-slate-600/60 hover:bg-slate-900/60"
              }`}
              onClick={() => setSelectedItem(isSelected ? null : item)}
            >
              {/* Effect badge */}
              <div className="absolute top-3 right-3">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${colorClass}`}>
                  {EFFECT_LABELS[item.effect_type] || item.effect_type}
                </span>
              </div>

              <div className="p-4">
                {/* Name */}
                <h3 className="text-white font-black text-sm pr-20 mb-1 leading-tight">{item.name}</h3>
                <p className="text-slate-500 text-xs leading-relaxed mb-4 line-clamp-2">{item.description}</p>

                {/* Price row */}
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[9px] uppercase text-slate-600 font-bold mb-0.5">Prix actuel</p>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-black font-mono ${canAfford ? "text-yellow-400" : "text-red-400"}`}>
                        {item.current_price.toFixed(0)}
                      </span>
                      <span className="text-yellow-600 text-xs font-bold">SC</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <PriceIndicator pct={item.price_change_pct} />
                      <span className="text-[9px] text-slate-700">base: {item.base_price.toFixed(0)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={(e) => { e.stopPropagation(); handleBuy(item); }}
                    disabled={!canAfford || buying === item.id}
                    className={`text-xs font-black uppercase tracking-wider transition-all ${
                      canAfford
                        ? "bg-red-950/60 border border-red-700/50 hover:bg-red-900/80 hover:border-red-500/70 text-red-300 shadow-[0_0_12px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                        : "bg-slate-800/40 border border-slate-700/30 text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    {buying === item.id ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <><ShoppingCart size={13} className="mr-1.5" />Acheter</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Expanded details */}
              {isSelected && (
                <div className="border-t border-slate-700/40 p-4 bg-black/20">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-2 flex items-center gap-1">
                    <Info size={10} /> Paramètres de l'effet
                  </p>
                  <div className="space-y-1">
                    {Object.entries(item.effect_params).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs font-mono">
                        <span className="text-slate-600">{k.replace(/_/g, " ")}</span>
                        <span className="text-slate-400 font-bold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer tip */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-800/40 bg-slate-950/40 text-xs text-slate-600">
        <Zap size={13} className="text-yellow-600 shrink-0 mt-0.5" />
        <p>
          Les <span className="text-yellow-500 font-bold">Crédits du Syndicat (SC)</span> sont une monnaie exclusive obtenue
          aléatoirement lors des expéditions (1–2 SC par expédition, 50% de chances).
          Ils ne peuvent pas être échangés avec d'autres ressources.
        </p>
      </div>
    </div>
  );
}
