import { useState } from 'react';
import { Swords, TrendingUp, AlertTriangle, Shield, Zap, X } from 'lucide-react';

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
    // Puissance d'attaque
    const attackerPower = (attackerHunters * HUNTER_POWER) + (attackerCruisers * CRUISER_POWER);
    const defenderPower = (enemyFleet.hunters * HUNTER_POWER) + (enemyFleet.cruisers * CRUISER_POWER);

    // Points de coque totaux
    const attackerHull = (attackerHunters * HUNTER_HULL) + (attackerCruisers * CRUISER_HULL);
    const defenderHull = (enemyFleet.hunters * HUNTER_HULL) + (enemyFleet.cruisers * CRUISER_HULL);

    // Calcul de la probabilité de victoire (simplifié)
    const totalPower = attackerPower + defenderPower;
    const attackerWinChance = totalPower > 0 ? (attackerPower / totalPower) * 100 : 50;

    // Estimation des pertes (formule simplifiée)
    const lossFactor = 1 - (attackerWinChance / 100);
    const estimatedHunterLosses = Math.floor(attackerHunters * lossFactor * 0.4);
    const estimatedCruiserLosses = Math.floor(attackerCruisers * lossFactor * 0.35);

    // Estimation du butin (30% des ressources ennemies si victoire)
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
  const isViable = result.winChance >= 30; // Considéré comme viable si >30%

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-indigo-500/30 rounded-xl max-w-3xl w-full shadow-2xl shadow-indigo-900/20 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-indigo-500/20 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/20 rounded-lg">
              <Swords className="text-indigo-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">
                SIMULATEUR DE COMBAT
              </h2>
              <p className="text-sm text-slate-400 mt-1">Analysez vos chances avant l'attaque</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Configuration de la flotte */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700/30">
            <h3 className="font-bold text-indigo-400 mb-4 flex items-center gap-2">
              <Zap size={18} />
              COMPOSITION DE VOTRE FLOTTE D'ATTAQUE
            </h3>

            <div className="space-y-4">
              {/* Chasseurs Légers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-slate-300 font-semibold">
                    🚀 Chasseurs Légers
                  </label>
                  <span className="text-lg font-bold text-white font-mono">
                    {attackerHunters} / {myFleet.hunters}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max={myFleet.hunters} 
                  value={attackerHunters}
                  onChange={(e) => setAttackerHunters(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0</span>
                  <span>{myFleet.hunters}</span>
                </div>
              </div>

              {/* Croiseurs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-slate-300 font-semibold">
                    🛸 Croiseurs
                  </label>
                  <span className="text-lg font-bold text-white font-mono">
                    {attackerCruisers} / {myFleet.cruisers}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max={myFleet.cruisers} 
                  value={attackerCruisers}
                  onChange={(e) => setAttackerCruisers(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0</span>
                  <span>{myFleet.cruisers}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Résultats de la simulation */}
          <div className={`rounded-lg border-2 p-5 transition-all ${
            result.winChance >= 70 ? 'bg-green-950/20 border-green-500/50' :
            result.winChance >= 40 ? 'bg-yellow-950/20 border-yellow-500/50' :
            'bg-red-950/20 border-red-500/50'
          }`}>
            {/* Probabilité de victoire */}
            <div className="text-center mb-6">
              <div className={`text-6xl font-black mb-2 ${
                result.winChance >= 70 ? 'text-green-400' :
                result.winChance >= 40 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {result.winChance.toFixed(1)}%
              </div>
              <div className="text-slate-300 font-semibold text-lg">Chances de Victoire</div>
              <div className="mt-2">
                {result.winChance >= 70 && (
                  <div className="inline-flex items-center gap-2 bg-green-900/30 px-4 py-2 rounded-full text-green-300 text-sm">
                    <TrendingUp size={16} />
                    Victoire Hautement Probable
                  </div>
                )}
                {result.winChance >= 40 && result.winChance < 70 && (
                  <div className="inline-flex items-center gap-2 bg-yellow-900/30 px-4 py-2 rounded-full text-yellow-300 text-sm">
                    <AlertTriangle size={16} />
                    Combat Incertain
                  </div>
                )}
                {result.winChance < 40 && (
                  <div className="inline-flex items-center gap-2 bg-red-900/30 px-4 py-2 rounded-full text-red-300 text-sm">
                    <Shield size={16} />
                    Victoire Peu Probable
                  </div>
                )}
              </div>
            </div>

            {/* Détails */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Votre flotte */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                <h4 className="text-sm font-bold text-indigo-400 mb-3">⚡ VOTRE FLOTTE</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Puissance:</span>
                    <span className="font-mono font-bold text-indigo-300">{result.attackerPower.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coque Totale:</span>
                    <span className="font-mono font-bold text-indigo-300">{result.attackerHull.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-700/50">
                    <div className="text-slate-500 mb-1">Composition:</div>
                    <div className="text-white">🚀 {attackerHunters} Chasseurs</div>
                    <div className="text-white">🛸 {attackerCruisers} Croiseurs</div>
                  </div>
                </div>
              </div>

              {/* Flotte ennemie */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                <h4 className="text-sm font-bold text-red-400 mb-3">🛡️ FLOTTE ENNEMIE</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Puissance:</span>
                    <span className="font-mono font-bold text-red-300">{result.defenderPower.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coque Totale:</span>
                    <span className="font-mono font-bold text-red-300">{result.defenderHull.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-700/50">
                    <div className="text-slate-500 mb-1">Composition:</div>
                    <div className="text-white">🚀 {enemyFleet.hunters} Chasseurs</div>
                    <div className="text-white">🛸 {enemyFleet.cruisers} Croiseurs</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pertes estimées */}
            <div className="mt-4 bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
              <h4 className="text-sm font-bold text-orange-400 mb-3">💥 PERTES ESTIMÉES</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-400 mb-1">Chasseurs:</div>
                  <div className="text-orange-300 font-mono font-bold">-{result.losses.hunters} unités</div>
                </div>
                <div>
                  <div className="text-slate-400 mb-1">Croiseurs:</div>
                  <div className="text-orange-300 font-mono font-bold">-{result.losses.cruisers} unités</div>
                </div>
              </div>
            </div>

            {/* Butin estimé */}
            {result.winChance > 50 && (
              <div className="mt-4 bg-gradient-to-r from-yellow-950/30 to-amber-950/30 rounded-lg p-4 border border-yellow-500/30">
                <h4 className="text-sm font-bold text-yellow-400 mb-3">💰 BUTIN ESTIMÉ</h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center">
                    <div className="text-orange-300 font-mono font-bold text-lg">{result.loot.metal.toLocaleString()}</div>
                    <div className="text-slate-400 text-xs">Métal</div>
                  </div>
                  <div className="text-center">
                    <div className="text-cyan-300 font-mono font-bold text-lg">{result.loot.crystal.toLocaleString()}</div>
                    <div className="text-slate-400 text-xs">Cristal</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-300 font-mono font-bold text-lg">{result.loot.deuterium.toLocaleString()}</div>
                    <div className="text-slate-400 text-xs">Deutérium</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Avertissement */}
          {!isViable && (
            <div className="bg-red-950/30 border border-red-500/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <div className="font-bold text-red-400 mb-1">ATTENTION - MISSION À HAUT RISQUE</div>
                  <p className="text-sm text-red-300/80">
                    Cette attaque a de faibles chances de succès. Vous risquez de perdre une partie importante de votre flotte.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-all border border-slate-600 hover:border-slate-500"
            >
              Annuler
            </button>
            {onConfirmAttack && (
              <button
                onClick={() => onConfirmAttack(attackerHunters, attackerCruisers)}
                disabled={attackerHunters === 0 && attackerCruisers === 0}
                className={`flex-1 px-6 py-3 font-bold rounded-lg transition-all ${
                  attackerHunters === 0 && attackerCruisers === 0
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : result.winChance >= 70
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : result.winChance >= 40
                    ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {result.winChance >= 70 ? '✅ Lancer l\'Attaque' : 
                 result.winChance >= 40 ? '⚠️ Attaquer Quand Même' : 
                 '☠️ Attaque Risquée'}
              </button>
            )}
          </div>

          {/* Note */}
          <p className="text-xs text-center text-slate-500">
            💡 Ces prédictions sont basées sur une simulation. Les résultats réels peuvent varier.
          </p>
        </div>
      </div>
    </div>
  );
}