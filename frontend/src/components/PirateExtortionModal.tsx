import { useState, useEffect } from "react";
import { apiUrl } from "@/config/api";
import { toast } from "sonner";
import {
  Skull, AlertTriangle, Coins, RefreshCw,
  Clock, Shield, Swords, Flame, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Extortion {
  id: string;
  arrival_time: string;
  seconds_remaining: number;
  target_planet_id: string;
  status: string;
  tribute_price_credits: number;
  retaliate_cost_credits: number;
}

interface PirateExtortionModalProps {
  userId: string;
  syndicateCredits: number;
  onResolved?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PirateExtortionModal({
  userId,
  syndicateCredits,
  onResolved,
}: PirateExtortionModalProps) {
  const [extortions, setExtortions] = useState<Extortion[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);
  const [activeExtortion, setActiveExtortion] = useState<Extortion | null>(null);
  const [countdown, setCountdown] = useState(0);

  const token = localStorage.getItem("token");

  // Poll for incoming extortions
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(apiUrl("/black-market/extortions"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setExtortions(data.extortions || []);
        }
      } catch {
        // ignore
      }
    };
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [token]);

  // Show modal when we have an extortion arriving
  useEffect(() => {
    const arriving = extortions.find((e) => e.seconds_remaining <= 0);
    if (arriving && !activeExtortion) {
      setActiveExtortion(arriving);
    }
    // Also show the first incoming one if near arrival
    const nearest = extortions.reduce<Extortion | null>(
      (acc, e) => (!acc || e.seconds_remaining < acc.seconds_remaining) ? e : acc,
      null,
    );
    if (nearest && !activeExtortion) {
      setActiveExtortion(nearest);
    }
  }, [extortions, activeExtortion]);

  // Countdown tick
  useEffect(() => {
    if (!activeExtortion) return;
    setCountdown(activeExtortion.seconds_remaining);
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [activeExtortion]);

  const resolve = async (choice: "passive" | "tribute" | "retaliate") => {
    if (!activeExtortion) return;
    setResolving(choice);
    try {
      const res = await fetch(apiUrl(`/black-market/extortions/${activeExtortion.id}/resolve`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ choice }),
      });
      const json = await res.json();
      if (res.ok) {
        const msgs: Record<string, string> = {
          passive: "Les pirates ont effectué leur razzia.",
          tribute: "Tribut payé — les pirates repartent.",
          retaliate: "Contre-attaque lancée !",
        };
        if (choice === "tribute" || choice === "retaliate") {
          toast.info(json.details?.message || msgs[choice]);
        } else {
          toast.warning(msgs[choice], {
            description: json.details?.loot
              ? `Pertes: ${Object.entries(json.details.loot)
                  .map(([k, v]) => `${Math.round(v as number).toLocaleString()} ${k}`)
                  .join(", ")}`
              : undefined,
          });
        }
        setActiveExtortion(null);
        setExtortions((prev) => prev.filter((e) => e.id !== activeExtortion.id));
        onResolved?.();
      } else if (res.status === 402) {
        toast.error("Crédits du Syndicat insuffisants", {
          description: `Requis: ${json.required} SC — Disponible: ${syndicateCredits.toFixed(0)} SC`,
        });
      } else {
        toast.error(json.error || "Erreur");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setResolving(null);
    }
  };

  if (!activeExtortion) return null;

  const isArrived = countdown <= 0;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300">
      <div className="relative overflow-hidden rounded-2xl border-2 border-red-700/60 bg-gradient-to-b from-slate-950 via-red-950/20 to-slate-950 shadow-[0_0_60px_rgba(220,38,38,0.3)] w-full max-w-lg">
        {/* Top danger stripe */}
        <div className="w-full h-1.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />

        {/* Pirate fleet image — 16/9 */}
        <div className="relative w-full aspect-video overflow-hidden">
          <img
            src="/images/events/pirate-fleet.webp"
            alt="Flotte de pirates"
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay fading into modal body */}
          <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/20 to-transparent" />
          {/* Alert badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 border border-red-700/60 backdrop-blur-sm">
            <AlertTriangle size={12} className="text-red-400 animate-bounce" />
            <span className="text-red-400 text-[10px] font-black uppercase tracking-widest">Alerte Extorsion</span>
          </div>
        </div>

        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-xl border-2 border-red-700/50 bg-red-950/40 animate-pulse shrink-0">
              <Skull size={28} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Flotte de Pirates Inconnue</h2>
              <p className="text-slate-400 text-xs mt-1">
                Une flotte de pirates PNJ approche de votre planète. L'instigateur reste <span className="text-red-400 font-bold">anonyme</span>.
              </p>
            </div>
          </div>

          {/* Countdown */}
          <div className={`flex items-center justify-center gap-3 p-4 rounded-xl border mb-6 ${
            isArrived
              ? "border-red-700/60 bg-red-950/40"
              : "border-amber-700/40 bg-amber-950/20"
          }`}>
            <Clock size={18} className={isArrived ? "text-red-400 animate-spin" : "text-amber-400"} />
            {isArrived ? (
              <span className="text-red-400 font-black text-lg uppercase tracking-wider animate-pulse">
                LES PIRATES SONT LÀ !
              </span>
            ) : (
              <div className="text-center">
                <p className="text-[10px] uppercase text-slate-500 font-bold">Arrivée dans</p>
                <p className="text-amber-400 font-black font-mono text-2xl">{formatDuration(countdown)}</p>
              </div>
            )}
          </div>

          {/* Choices */}
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-wider">Choisissez votre réponse :</p>

          <div className="space-y-3">
            {/* Choice 1: Passive */}
            <button
              onClick={() => resolve("passive")}
              disabled={!!resolving}
              className="w-full p-4 rounded-xl border border-slate-700/40 bg-slate-900/40 hover:border-slate-500/60 hover:bg-slate-800/60 transition-all text-left group disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Flame size={18} className="text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-bold text-sm">Laisser faire</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Les pirates pillent <span className="text-orange-400 font-bold">~20%</span> des ressources
                      de la planète ciblée. Aucun coût.
                    </p>
                  </div>
                </div>
                {resolving === "passive" ? (
                  <RefreshCw size={16} className="animate-spin text-orange-400 shrink-0 mt-0.5" />
                ) : (
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 shrink-0 mt-0.5" />
                )}
              </div>
            </button>

            {/* Choice 2: Tribute */}
            <button
              onClick={() => resolve("tribute")}
              disabled={!!resolving || syndicateCredits < activeExtortion.tribute_price_credits}
              className={`w-full p-4 rounded-xl border transition-all text-left group disabled:opacity-50 ${
                syndicateCredits >= activeExtortion.tribute_price_credits
                  ? "border-yellow-700/40 bg-yellow-950/20 hover:border-yellow-600/60 hover:bg-yellow-950/30"
                  : "border-slate-700/30 bg-slate-900/20 cursor-not-allowed"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Coins size={18} className="text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-bold text-sm">Payer un tribut</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Les pirates repartent. L'identité de l'instigateur est
                      <span className="text-yellow-400 font-bold"> révélée</span>.
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Coins size={10} className="text-yellow-500" />
                      <span className="text-yellow-400 font-black font-mono">
                        {activeExtortion.tribute_price_credits} SC
                      </span>
                      {syndicateCredits < activeExtortion.tribute_price_credits && (
                        <span className="text-red-500 text-[9px] font-bold">Crédits insuffisants</span>
                      )}
                    </div>
                  </div>
                </div>
                {resolving === "tribute" ? (
                  <RefreshCw size={16} className="animate-spin text-yellow-400 shrink-0 mt-0.5" />
                ) : (
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 shrink-0 mt-0.5" />
                )}
              </div>
            </button>

            {/* Choice 3: Retaliate */}
            <button
              onClick={() => resolve("retaliate")}
              disabled={!!resolving || syndicateCredits < activeExtortion.retaliate_cost_credits}
              className={`w-full p-4 rounded-xl border transition-all text-left group disabled:opacity-50 ${
                syndicateCredits >= activeExtortion.retaliate_cost_credits
                  ? "border-red-700/40 bg-red-950/20 hover:border-red-600/60 hover:bg-red-950/30"
                  : "border-slate-700/30 bg-slate-900/20 cursor-not-allowed"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Swords size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-bold text-sm">Contre-attaque payante</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Payez plus cher : les pirates font <span className="text-red-400 font-bold">demi-tour</span>{" "}
                      et attaquent la planète mère de l'instigateur.
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Coins size={10} className="text-yellow-500" />
                      <span className="text-red-400 font-black font-mono">
                        {activeExtortion.retaliate_cost_credits} SC
                      </span>
                      {syndicateCredits < activeExtortion.retaliate_cost_credits && (
                        <span className="text-red-500 text-[9px] font-bold">Crédits insuffisants</span>
                      )}
                    </div>
                  </div>
                </div>
                {resolving === "retaliate" ? (
                  <RefreshCw size={16} className="animate-spin text-red-400 shrink-0 mt-0.5" />
                ) : (
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 shrink-0 mt-0.5" />
                )}
              </div>
            </button>
          </div>

          <p className="text-center text-[10px] text-slate-700 mt-4">
            Vous disposez de Crédits du Syndicat : <span className="text-yellow-600 font-bold">{syndicateCredits.toFixed(0)} SC</span>
          </p>
        </div>

        {/* Bottom danger stripe */}
        <div className="w-full h-1.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
      </div>
    </div>
  );
}
