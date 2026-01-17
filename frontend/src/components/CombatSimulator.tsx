import { useState } from 'react';
import { Swords, X, TrendingUp, AlertTriangle, Target } from 'lucide-react';

interface Fleet {
  hunters: number;
  cruisers: number;
}

interface CombatSimulatorProps {
  myFleet: Fleet;
  enemyFleet: Fleet;
  enemyDefenses?: {
    missile_launcher: number;
    laser_cannon: number;
  };
  onClose: () => void;
}

export function CombatSimulator({ myFleet, enemyFleet, enemyDefenses, onClose }: CombatSimulatorProps) {
  const [attackerHunters, setAttackerHunters] = useState(Math.min(myFleet.hunters, myFleet.hunters));
  const [attackerCruisers, setAttackerCruisers] = useState(Math.min(myFleet.cruisers, myFleet.cruisers));

  // Constantes de combat
  const HUNTER_ATTACK = 50;
  const HUNTER_SHIELD = 10;
  const CRUISER_ATTACK = 400;
  const CRUISER_SHIELD = 50;
  const LAUNCHER_ATTACK = 80;
  const LAUNCHER_SHIELD = 20;
  const CANNON_ATTACK = 100;
  const CANNON_SHIELD = 25;

  const simulate = () => {
    // Calcul puissance attaquant
    const attackerPower = attackerHunters * HUNTER_ATTACK + attackerCruisers * CRUISER_ATTACK;
    const attackerShield = attackerHunters * HUNTER_SHIELD + attackerCruisers * CRUISER_SHIELD;

    // Calcul puissance défenseur (flotte + défenses)
    const defenderFleetPower = enemyFleet.hunters * HUNTER_ATTACK + enemyFleet.cruisers * CRUISER_ATTACK;
    const defenderFleetShield = enemyFleet.hunters * HUNTER_SHIELD + enemyFleet.cruisers * CRUISER_SHIELD;
    
    const defensesPower = enemyDefenses 
      ? (enemyDefenses.missile_launcher * LAUNCHER_ATTACK + enemyDefenses.laser_cannon * CANNON_ATTACK)
      : 0;
    const defensesShield = enemyDefenses
      ? (enemyDefenses.missile_launcher * LAUNCHER_SHIELD + enemyDefenses.laser_cannon * CANNON_SHIELD)
      : 0;

    const totalDefenderPower = defenderFleetPower + defensesPower;
    const totalDefenderShield = defenderFleetShield + defensesShield;

    // Formule de victoire simplifiée
    const attackerScore = attackerPower + attackerShield * 0.5;
    const defenderScore = totalDefenderPower + totalDefenderShield * 0.5;
    
    const winChance = (attackerScore / (attackerScore + defenderScore)) * 100;
    
    // Estimation des pertes (plus on est proche de 50%, plus on perd)
    const lossFactor = 1 - Math.abs(winChance - 50) / 50;
    const estimatedLosses = {
      hunters: Math.floor(attackerHunters * lossFactor * 0.4),
      cruisers: Math.floor(attackerCruisers * lossFactor * 0.3),
    };

    // Estimation du butin (si victoire)
    const maxLoot = 50000; // Valeur arbitraire
    const estimatedLoot = winChance > 50 
      ? Math.floor(maxLoot * (winChance / 100))
      : 0;

    return {
      winChance: Math.min(99, Math.max(1, winChance)),
      estimatedLosses,
      estimatedLoot,
      attackerPower,
      defenderPower: totalDefenderPower,
      recommendation: winChance > 70 ? 'victory' : winChance > 50 ? 'risky' : 'defeat'
    };
  };

  const result = simulate();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-indigo-500/30 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-950 to-slate-900 border-b border-indigo-500/30 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-black text-indigo-400 flex items-center gap-3">
            <Swords size={28} />
            SIMULATEUR DE COMBAT
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Sliders pour ajuster la flotte */}
          <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-3">Configuration de l'Attaque</h3>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-slate-300 font-semibold">🚀 Chasseurs Légers</label>
                <span className="text-indigo-400 font-mono font-bold">{attackerHunters} / {myFleet.hunters}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max={myFleet.hunters} 
                value={attackerHunters}
                onChange={(e) => setAttackerHunters(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-slate-300 font-semibold">🛸 Croiseurs</label>
                <span className="text-indigo-400 font-mono font-bold">{attackerCruisers} / {myFleet.cruisers}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max={myFleet.cruisers} 
                value={attackerCruisers}
                onChange={(e) => setAttackerCruisers(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Résultats de la simulation */}
          <div className={`p-6 rounded-lg border-2 transition-all ${
            result.recommendation === 'victory' 
              ? 'bg-green-950/30 border-green-500 shadow-lg shadow-green-500/20' 
              : result.recommendation === 'risky'
              ? 'bg-yellow-950/30 border-yellow-500 shadow-lg shadow-yellow-500/20'
              : 'bg-red-950/30 border-red-500 shadow-lg shadow-red-500/20'
          }`}>
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                {result.recommendation === 'victory' && <TrendingUp className="text-green-400" size={32} />}
                {result.recommendation === 'risky' && <AlertTriangle className="text-yellow-400" size={32} />}
                {result.recommendation === 'defeat' && <Target className="text-red-400" size={32} />}
              </div>
              
              <div className="text-6xl font-black mb-2">
                {result.winChance.toFixed(1)}%
              </div>
              <div className="text-sm font-bold uppercase tracking-wider opacity-80">
                Probabilité de Victoire
              </div>
              
              <div className={`mt-3 px-4 py-2 rounded-full inline-block font-bold text-sm ${
                result.recommendation === 'victory' 
                  ? 'bg-green-500/20 text-green-300' 
                  : result.recommendation === 'risky'
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-red-500/20 text-red-300'
              }`}>
                {result.recommendation === 'victory' && '✅ Victoire Assurée'}
                {result.recommendation === 'risky' && '⚠️ Combat Incertain'}
                {result.recommendation === 'defeat' && '❌ Défaite Probable'}
              </div>
            </div>

            {/* Stats détaillées */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-slate-400 mb-2 font-semibold uppercase text-xs">Pertes Estimées</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>🚀 Chasseurs</span>
                    <span className="font-mono text-red-400">{result.estimatedLosses.hunters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🛸 Croiseurs</span>
                    <span className="font-mono text-red-400">{result.estimatedLosses.cruisers}</span>
                  </div>
                </div>
              </div>

              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-slate-400 mb-2 font-semibold uppercase text-xs">Forces Ennemies</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>🚀 Chasseurs</span>
                    <span className="font-mono text-orange-400">{enemyFleet.hunters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🛸 Croiseurs</span>
                    <span className="font-mono text-orange-400">{enemyFleet.cruisers}</span>
                  </div>
                  {enemyDefenses && (
                    <>
                      <div className="flex justify-between">
                        <span>🚀 Lanceurs</span>
                        <span className="font-mono text-orange-400">{enemyDefenses.missile_launcher}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>🔫 Canons</span>
                        <span className="font-mono text-orange-400">{enemyDefenses.laser_cannon}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-slate-400 mb-2 font-semibold uppercase text-xs">Butin Potentiel</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>💰 Ressources</span>
                    <span className="font-mono text-green-400">≈{result.estimatedLoot.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">Si victoire</div>
                </div>
              </div>
            </div>

            {/* Barres de puissance */}
            <div className="mt-4 space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-indigo-300">Puissance d'Attaque</span>
                  <span className="font-mono">{result.attackerPower.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                    style={{ width: `${(result.attackerPower / (result.attackerPower + result.defenderPower)) * 100}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-orange-300">Puissance Défensive</span>
                  <span className="font-mono">{result.defenderPower.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                    style={{ width: `${(result.defenderPower / (result.attackerPower + result.defenderPower)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button 
              onClick={onClose} 
              className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors"
            >
              Fermer
            </button>
          </div>

          {/* Note */}
          <div className="text-xs text-slate-500 text-center italic">
            ⚠️ Simulation basée sur des estimations. Les résultats réels peuvent varier.
          </div>
        </div>
      </div>
    </div>
  );
}
