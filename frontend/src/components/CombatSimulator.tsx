import { useState } from 'react';
import { Swords, TrendingUp, AlertTriangle, Shield, Zap, X } from 'lucide-react';
import { Button } from './ui/button';

interface Fleet {
  hunters: number;
  cruisers: number;
}

interface CombatSimulatorProps {
  myFleet: Fleet;
  enemyFleet: Fleet;
  onClose: () => void;
  onConfirmAttack?: (hunters: number, cruisers: number) => void;
}

export function CombatSimulator({
  myFleet,
  enemyFleet,
  onClose,
  onConfirmAttack
}: CombatSimulatorProps) {
  const [attackerHunters, setAttackerHunters] = useState(myFleet.hunters);
  const [attackerCruisers, setAttackerCruisers] = useState(myFleet.cruisers);

  // Constantes de combat
  const HUNTER_POWER = 50;
  const CRUISER_POWER = 400;
  const HUNTER_HULL = 400;
  const CRUISER_HULL = 2700;

  // Simulation de combat
  const simulate = () => {
    const attackerPower = (attackerHunters * HUNTER_POWER) + (attackerCruisers * CRUISER_POWER);
    const defenderPower = (enemyFleet.hunters * HUNTER_POWER) + (enemyFleet.cruisers * CRUISER_POWER);

    const attackerHull = (attackerHunters * HUNTER_HULL) + (attackerCruisers * CRUISER_HULL);
    const defenderHull = (enemyFleet.hunters * HUNTER_HULL) + (enemyFleet.cruisers * CRUISER_HULL);

    const totalPower = attackerPower + defenderPower;
    const attackerWinChance = totalPower > 0 ? (attackerPower / totalPower) * 100 : 50;

    const lossFactor = 1 - (attackerWinChance / 100);
    const estimatedHunterLosses = Math.floor(attackerHunters * lossFactor * 0.4);
    const estimatedCruiserLosses = Math.floor(attackerCruisers * lossFactor * 0.35);

    const estimatedLoot = attackerWinChance > 50 ? {
      metal: Math.floor(defenderHull * 0.3),
      crystal: Math.floor(defenderHull * 0.2),
      deuterium: Math.floor(defenderHull * 0.1),
    } : { metal: 0, crystal: 0, deuterium: 0 };

    return {
      attackerPower,
      defenderPower,
      attackerHull,
      defenderHull,
      winChance: attackerWinChance,
      losses: {
        hunters: estimatedHunterLosses,
        cruisers: estimatedCruiserLosses,
      },
      loot: estimatedLoot,
    };
  };

  const result = simulate();
  const isViable = result.winChance >= 30;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-[rgba(16,8,46,0.95)] backdrop-blur-[12px] border border-cyan-500/10 rounded-xl max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-[rgba(10,5,32,0.95)] backdrop-blur-[12px] border-b border-cyan-500/10 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/10 rounded-lg">
              <Swords className="text-cyan-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-200">
                SIMULATEUR DE COMBAT
              </h2>
              <p className="text-sm text-slate-400 mt-1">Analysez vos chances avant l'attaque</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-cyan-500/5 rounded-lg transition-colors text-slate-400 hover:text-slate-200 border border-transparent hover:border-cyan-500/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Fleet configuration */}
          <div className="bg-[rgba(10,5,32,0.85)] rounded-lg p-5 border border-cyan-500/10 backdrop-blur-[12px]">
            {/* Section header */}
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-cyan-500/10">
              <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
              <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">
                COMPOSITION DE VOTRE FLOTTE D'ATTAQUE
              </span>
              <Zap size={12} className="text-cyan-400 ml-1" />
            </div>

            <div className="space-y-4">
              {/* Chasseurs Légers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-slate-300 font-semibold">
                    Chasseurs Légers
                  </label>
                  <span className="text-lg font-bold text-slate-200 font-mono tabular-nums">
                    {attackerHunters} / {myFleet.hunters}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={myFleet.hunters}
                  value={attackerHunters}
                  onChange={(e) => setAttackerHunters(Number(e.target.value))}
                  className="w-full h-1.5 bg-cyan-500/5 border border-cyan-500/10 rounded-full appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono tabular-nums">
                  <span>0</span>
                  <span>{myFleet.hunters}</span>
                </div>
              </div>

              {/* Croiseurs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-slate-300 font-semibold">
                    Croiseurs
                  </label>
                  <span className="text-lg font-bold text-slate-200 font-mono tabular-nums">
                    {attackerCruisers} / {myFleet.cruisers}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={myFleet.cruisers}
                  value={attackerCruisers}
                  onChange={(e) => setAttackerCruisers(Number(e.target.value))}
                  className="w-full h-1.5 bg-cyan-500/5 border border-cyan-500/10 rounded-full appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono tabular-nums">
                  <span>0</span>
                  <span>{myFleet.cruisers}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Simulation results */}
          <div className={`rounded-lg border-2 p-5 transition-all backdrop-blur-[12px] ${
            result.winChance >= 70 ? 'bg-emerald-500/5 border-emerald-500/30' :
            result.winChance >= 40 ? 'bg-amber-500/5 border-amber-500/30' :
            'bg-red-500/5 border-red-500/30'
          }`}>
            {/* Win chance */}
            <div className="text-center mb-6">
              <div className={`text-6xl font-black mb-2 font-mono tabular-nums ${
                result.winChance >= 70 ? 'text-emerald-400' :
                result.winChance >= 40 ? 'text-amber-400' :
                'text-red-400'
              }`}>
                {result.winChance.toFixed(1)}%
              </div>
              <div className="text-slate-300 font-semibold text-lg">Chances de Victoire</div>
              <div className="mt-2">
                {result.winChance >= 70 && (
                  <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full text-emerald-400 text-sm">
                    <TrendingUp size={16} />
                    Victoire Hautement Probable
                  </div>
                )}
                {result.winChance >= 40 && result.winChance < 70 && (
                  <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full text-amber-400 text-sm">
                    <AlertTriangle size={16} />
                    Combat Incertain
                  </div>
                )}
                {result.winChance < 40 && (
                  <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-full text-red-400 text-sm">
                    <Shield size={16} />
                    Victoire Peu Probable
                  </div>
                )}
              </div>
            </div>

            {/* Detail panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Your fleet */}
              <div className="bg-[rgba(10,5,32,0.85)] rounded-lg p-4 border border-cyan-500/10">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
                  <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
                  <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">VOTRE FLOTTE</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Puissance:</span>
                    <span className="font-mono tabular-nums font-bold text-cyan-400">{result.attackerPower.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coque Totale:</span>
                    <span className="font-mono tabular-nums font-bold text-cyan-400">{result.attackerHull.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-cyan-500/10">
                    <div className="text-slate-500 mb-1">Composition:</div>
                    <div className="text-slate-200 font-mono tabular-nums">{attackerHunters} Chasseurs</div>
                    <div className="text-slate-200 font-mono tabular-nums">{attackerCruisers} Croiseurs</div>
                  </div>
                </div>
              </div>

              {/* Enemy fleet */}
              <div className="bg-[rgba(10,5,32,0.85)] rounded-lg p-4 border border-red-500/15">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-500/10">
                  <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-red-400 to-transparent flex-shrink-0" />
                  <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-red-500/70">FLOTTE ENNEMIE</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Puissance:</span>
                    <span className="font-mono tabular-nums font-bold text-red-400">{result.defenderPower.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coque Totale:</span>
                    <span className="font-mono tabular-nums font-bold text-red-400">{result.defenderHull.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-red-500/10">
                    <div className="text-slate-500 mb-1">Composition:</div>
                    <div className="text-slate-200 font-mono tabular-nums">{enemyFleet.hunters} Chasseurs</div>
                    <div className="text-slate-200 font-mono tabular-nums">{enemyFleet.cruisers} Croiseurs</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Estimated losses */}
            <div className="mt-4 bg-[rgba(10,5,32,0.85)] rounded-lg p-4 border border-cyan-500/10">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
                <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
                <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">PERTES ESTIMÉES</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-400 mb-1">Chasseurs:</div>
                  <div className="text-orange-400 font-mono tabular-nums font-bold">-{result.losses.hunters} unités</div>
                </div>
                <div>
                  <div className="text-slate-400 mb-1">Croiseurs:</div>
                  <div className="text-orange-400 font-mono tabular-nums font-bold">-{result.losses.cruisers} unités</div>
                </div>
              </div>
            </div>

            {/* Estimated loot */}
            {result.winChance > 50 && (
              <div className="mt-4 bg-amber-500/5 rounded-lg p-4 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-500/10">
                  <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-amber-400 to-transparent flex-shrink-0" />
                  <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-amber-500/70">BUTIN ESTIMÉ</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center">
                    <div className="text-orange-400 font-mono tabular-nums font-bold text-lg">{result.loot.metal.toLocaleString()}</div>
                    <div className="text-slate-400 text-xs">Métal</div>
                  </div>
                  <div className="text-center">
                    <div className="text-cyan-400 font-mono tabular-nums font-bold text-lg">{result.loot.crystal.toLocaleString()}</div>
                    <div className="text-slate-400 text-xs">Cristal</div>
                  </div>
                  <div className="text-center">
                    <div className="text-emerald-400 font-mono tabular-nums font-bold text-lg">{result.loot.deuterium.toLocaleString()}</div>
                    <div className="text-slate-400 text-xs">Deutérium</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* High-risk warning */}
          {!isViable && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <div className="font-bold text-red-400 mb-1">ATTENTION - MISSION À HAUT RISQUE</div>
                  <p className="text-sm text-red-400/70">
                    Cette attaque a de faibles chances de succès. Vous risquez de perdre une partie importante de votre flotte.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Annuler
            </Button>
            {onConfirmAttack && (
              <Button
                variant="default"
                shine
                onClick={() => onConfirmAttack(attackerHunters, attackerCruisers)}
                disabled={attackerHunters === 0 && attackerCruisers === 0}
                className="flex-1"
              >
                {result.winChance >= 70 ? 'Lancer l\'Attaque' :
                 result.winChance >= 40 ? 'Attaquer Quand Même' :
                 'Attaque Risquée'}
              </Button>
            )}
          </div>

          {/* Note */}
          <p className="text-xs text-center text-slate-500 font-mono">
            Ces prédictions sont basées sur une simulation. Les résultats réels peuvent varier.
          </p>
        </div>
      </div>
    </div>
  );
}
