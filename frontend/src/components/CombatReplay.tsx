import { useState, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Shield, Zap, ChevronRight, ChevronLeft, SkipForward, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types — aligned with Rust's RoundLog / DetailedCombatReport structs
// ─────────────────────────────────────────────────────────────────────────────

interface RoundLog {
  round: number;
  attacker_damage: number;
  defender_damage: number;
  attacker_ships_lost_this_round: number;
  defender_ships_lost_this_round: number;
  defender_defenses_lost_this_round: number;
  narrative: string;
  attacker_unit_losses: Record<string, number>;
  defender_unit_losses: Record<string, number>;
  events: string[];
}

interface DetailedCombatReport {
  winner: string;
  rounds_played: number;
  rounds: RoundLog[];
  loot?: { metal: number; crystal: number; deuterium: number };
}

interface CombatReplayProps {
  // CombatModal passes the full parsedReport — we read .details for structured data
  // and fall back gracefully if details is absent
  report: {
    details?: DetailedCombatReport;
    winner?: string;
    opponent_name?: string;
    loot?: { metal: number; crystal: number; deuterium: number };
    // legacy loot format
    loot_metal?: number;
    loot_crystal?: number;
    loot_deuterium?: number;
  };
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components — memoised to avoid re-rendering every round navigation
// ─────────────────────────────────────────────────────────────────────────────

const UnitLossRow = memo(({ shipKey, count, color }: { shipKey: string; count: number; color: 'red' | 'blue' }) => (
  <div className="flex justify-between text-[10px] font-mono">
    <span className="text-slate-500 truncate capitalize">{shipKey.replace(/^def_/, '').replace(/_/g, ' ')}</span>
    <span className={color === 'red' ? 'text-red-400 ml-2 shrink-0' : 'text-blue-400 ml-2 shrink-0'}>-{count}</span>
  </div>
));
UnitLossRow.displayName = 'UnitLossRow';

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function CombatReplay({ report, onClose }: CombatReplayProps) {
  const details = report.details;
  const rounds = details?.rounds ?? [];
  const totalRounds = rounds.length;

  const [currentRound, setCurrentRound] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  const isLastRound = currentRound === totalRounds - 1;
  const round = rounds[currentRound];

  // Auto-play: advance every 1.8 s, stop at last round
  useEffect(() => {
    if (!autoPlay || isLastRound || totalRounds === 0) return;
    const t = setTimeout(() => setCurrentRound(r => r + 1), 1800);
    return () => clearTimeout(t);
  }, [autoPlay, currentRound, isLastRound, totalRounds]);

  const handlePrev = useCallback(() => setCurrentRound(r => Math.max(0, r - 1)), []);
  const handleNext = useCallback(() => setCurrentRound(r => Math.min(totalRounds - 1, r + 1)), [totalRounds]);
  const handleSkipEnd = useCallback(() => setCurrentRound(totalRounds - 1), [totalRounds]);
  const handleAutoToggle = useCallback(() => {
    setAutoPlay(a => {
      const next = !a;
      if (next && isLastRound) setCurrentRound(0);
      return next;
    });
  }, [isLastRound]);

  const attackerLossCount = Object.values(round?.attacker_unit_losses ?? {}).reduce((a, b) => a + b, 0);
  const defenderLossCount = Object.values(round?.defender_unit_losses ?? {}).reduce((a, b) => a + b, 0);

  const winner = details?.winner ?? report.winner ?? 'unknown';
  const opponentName = report.opponent_name ?? 'Ennemi';

  // Normalise loot from either source
  const loot = report.loot ??
    (report.loot_metal != null
      ? { metal: report.loot_metal ?? 0, crystal: report.loot_crystal ?? 0, deuterium: report.loot_deuterium ?? 0 }
      : details?.loot ?? null);

  // No detailed data available — show a graceful fallback message
  if (totalRounds === 0) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-[rgba(10,5,32,0.95)] border border-cyan-500/20 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <Sword className="w-10 h-10 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-sm font-mono">Aucune donnée tour-par-tour disponible pour ce rapport.</p>
          <p className="text-slate-600 text-xs mt-2 font-mono">Les prochains combats incluront le replay détaillé.</p>
          <button
            onClick={onClose}
            className="mt-6 text-xs text-cyan-400/60 hover:text-cyan-400 border border-cyan-500/10 hover:border-cyan-500/30 px-4 py-1.5 rounded-[2px] transition-all duration-150 font-mono"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[rgba(10,5,32,0.96)] border border-cyan-500/15 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-cyan-500/10 bg-black/30">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-red-400 to-transparent flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-red-500/70">Rapport Tour par Tour</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border font-mono',
              winner === 'attacker'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : winner === 'defender'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
            )}>
              {winner === 'attacker' ? 'Victoire' : winner === 'defender' ? 'Défaite' : 'Égalité'}
            </span>
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-300 transition-colors duration-150"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">

          {/* Round progress dots + label */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">
              Tour <span className="text-cyan-400 font-bold">{currentRound + 1}</span>
              <span className="text-slate-600"> / {totalRounds}</span>
            </span>
            <div className="flex gap-1 items-center">
              {rounds.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentRound(i)}
                  aria-label={`Aller au tour ${i + 1}`}
                  className={cn(
                    'h-2 rounded-full transition-all duration-200',
                    i === currentRound
                      ? 'bg-cyan-400 w-5'
                      : i < currentRound
                        ? 'bg-emerald-500/60 w-2'
                        : 'bg-slate-700 w-2'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Combatant panels — animated on round change */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRound}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="grid grid-cols-2 gap-3"
            >
              {/* Attacker panel */}
              <div className="bg-[rgba(255,0,60,0.04)] border border-red-500/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Sword className="w-3 h-3 text-red-400 shrink-0" />
                  <span className="text-[10px] font-semibold tracking-wide uppercase text-red-400/80 truncate">
                    Attaquant
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Dégâts:{' '}
                  <span className="text-red-400 font-bold">
                    {Math.floor(round.attacker_damage).toLocaleString()}
                  </span>
                </div>
                {attackerLossCount > 0 && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    Pertes: <span className="text-red-400/80">{attackerLossCount} unités</span>
                  </div>
                )}
                <div className="space-y-0.5">
                  {Object.entries(round.attacker_unit_losses)
                    .filter(([, v]) => v > 0)
                    .map(([k, v]) => (
                      <UnitLossRow key={k} shipKey={k} count={v} color="red" />
                    ))}
                </div>
                {attackerLossCount === 0 && (
                  <div className="text-[10px] text-slate-700 font-mono italic">Aucune perte</div>
                )}
              </div>

              {/* Defender panel */}
              <div className="bg-[rgba(0,128,255,0.04)] border border-blue-500/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="text-[10px] font-semibold tracking-wide uppercase text-blue-400/80 truncate">
                    {opponentName}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Dégâts:{' '}
                  <span className="text-blue-400 font-bold">
                    {Math.floor(round.defender_damage).toLocaleString()}
                  </span>
                </div>
                {defenderLossCount > 0 && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    Pertes: <span className="text-blue-400/80">{defenderLossCount} unités</span>
                  </div>
                )}
                <div className="space-y-0.5">
                  {Object.entries(round.defender_unit_losses)
                    .filter(([, v]) => v > 0)
                    .map(([k, v]) => (
                      <UnitLossRow key={k} shipKey={k} count={v} color="blue" />
                    ))}
                </div>
                {defenderLossCount === 0 && (
                  <div className="text-[10px] text-slate-700 font-mono italic">Aucune perte</div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Narrative / events for current round */}
          {(round.events?.length > 0 || round.narrative) && (
            <div className="bg-black/30 border border-white/5 rounded-lg px-3 py-2 space-y-0.5 max-h-28 overflow-y-auto scrollbar-thin">
              {round.events?.length > 0
                ? round.events.map((ev, i) => (
                    <p key={i} className={cn(
                      'text-[10px] font-mono leading-relaxed',
                      ev.startsWith('⚔️') ? 'text-red-400/75' : 'text-blue-400/75'
                    )}>{ev}</p>
                  ))
                : <p className="text-[10px] text-slate-500 font-mono">{round.narrative}</p>
              }
            </div>
          )}

          {/* Loot — shown only on last round */}
          {isLastRound && loot && (loot.metal > 0 || loot.crystal > 0 || loot.deuterium > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[rgba(255,238,0,0.03)] border border-yellow-500/20 rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-yellow-500/70">Butin</span>
              </div>
              <div className="flex gap-4 text-[11px] font-mono tabular-nums">
                {loot.metal > 0 && (
                  <span className="text-orange-400">{Math.floor(loot.metal).toLocaleString()} M</span>
                )}
                {loot.crystal > 0 && (
                  <span className="text-cyan-400">{Math.floor(loot.crystal).toLocaleString()} C</span>
                )}
                {loot.deuterium > 0 && (
                  <span className="text-emerald-400">{Math.floor(loot.deuterium).toLocaleString()} D</span>
                )}
              </div>
            </motion.div>
          )}

          {/* Navigation controls */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentRound === 0}
              className="h-7 w-7 p-0"
              aria-label="Tour précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Button
              variant={autoPlay ? 'secondary' : 'default'}
              size="sm"
              onClick={handleAutoToggle}
              className="h-7 px-4 text-xs font-bold uppercase tracking-wider"
            >
              {autoPlay ? 'Pause' : isLastRound ? 'Rejouer' : 'Auto'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipEnd}
              disabled={isLastRound}
              className="h-7 w-7 p-0"
              aria-label="Aller au dernier tour"
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              disabled={isLastRound}
              className="h-7 w-7 p-0"
              aria-label="Tour suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
