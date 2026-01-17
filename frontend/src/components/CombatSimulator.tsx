import { useState } from 'react';
import { Shield, Swords, X } from 'lucide-react';

interface Fleet {
  hunters: number;
  cruisers: number;
}

export function CombatSimulator({ 
  myFleet, 
  enemyFleet, 
  onClose 
}: { 
  myFleet: Fleet; 
  enemyFleet: Fleet; 
  onClose: () => void;
}) {
  const [attackerHunters, setAttackerHunters] = useState(myFleet.hunters);
  const [attackerCruisers, setAttackerCruisers] = useState(myFleet.cruisers);

  // Logique de simulation (formule simple basée sur la puissance)
  const simulate = () => {
    const attackerPower = attackerHunters * 50 + attackerCruisers * 400;
    const defenderPower = enemyFleet.hunters * 50 + enemyFleet.cruisers * 400;
    
    const totalPower = attackerPower + defenderPower;
    const attackerWinChance = totalPower > 0 ? (attackerPower / totalPower) * 100 : 50;
    
    // Estimation des pertes (plus on gagne facilement, moins on perd)
    const lossFactor = Math.max(0.1, 1 - attackerWinChance / 100);
    
    return {
      winChance: attackerWinChance,
      estimatedLosses: {
        hunters: Math.floor(attackerHunters * lossFactor * 0.4),
        cruisers: Math.floor(attackerCruisers * lossFactor * 0.4),
      },
      attackerPower,
      defenderPower,
    };
  };

  const result = simulate();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border-2 border-indigo-500/30 rounded-xl max-w-2xl w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-indigo-400 flex items-center gap-2">
            <Swords className="animate-pulse" />
            SIMULATEUR DE COMBAT
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Sliders pour ajuster la flotte */}
        <div className="space-y-4 mb-6 bg-slate-950/50 p-4 rounded-lg border border-white/5">
          <h3 className="text-sm font-bold text-slate-300 mb-3">VOTRE FLOTTE D'ATTAQUE</h3>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-400">🚀 Chasseurs Légers</label>
              <span className="text-sm font-mono text-white">{attackerHunters} / {myFleet.hunters}</span>
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-400">🛸 Croiseurs</label>
              <span className="text-sm font-mono text-white">{attackerCruisers} / {myFleet.cruisers}</span>
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

        {/* Résultats */}
        <div className={`p-5 rounded-lg border-2 shadow-lg transition-all ${
          result.winChance > 70 ? 'bg-green-950/20 border-green-500' : 
          result.winChance > 40 ? 'bg-yellow-950/20 border-yellow-500' : 
          'bg-red-950/20 border-red-500'
        }`}>
          <div className="text-center mb-4">
            <div className={`text-5xl font-black mb-2 ${
              result.winChance > 70 ? 'text-green-400' : 
              result.winChance > 40 ? 'text-yellow-400' : 
              'text-red-400'
            }`}>
              {result.winChance.toFixed(1)}%
            </div>
            <div className="text-sm text-slate-400 uppercase tracking-wider">
              {result.winChance > 70 ? '✅ Victoire Probable' : 
               result.winChance > 40 ? '⚠️ Combat Incertain' : 
               '❌ Défaite Probable'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-900/50 p-3 rounded-lg">
              <div className="text-slate-500 mb-2 text-xs uppercase tracking-wider">Pertes Estimées</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>🚀 Chasseurs</span>
                  <span className="font-mono font-bold text-red-400">-{result.estimatedLosses.hunters}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🛸 Croiseurs</span>
                  <span className="font-mono font-bold text-red-400">-{result.estimatedLosses.cruisers}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900/50 p-3 rounded-lg">
              <div className="text-slate-500 mb-2 text-xs uppercase tracking-wider">Flotte Ennemie</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>🚀 Chasseurs</span>
                  <span className="font-mono font-bold">{enemyFleet.hunters}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🛸 Croiseurs</span>
                  <span className="font-mono font-bold">{enemyFleet.cruisers}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Puissance Attaque:</span>
                <span className="ml-2 font-mono text-indigo-400">{result.attackerPower.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500">Puissance Défense:</span>
                <span className="ml-2 font-mono text-orange-400">{result.defenderPower.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button 
            onClick={onClose} 
            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold transition-colors"
          >
            Fermer
          </button>
        </div>
        
        <p className="text-xs text-slate-500 text-center mt-4">
          ⚠️ Simulation basée sur la puissance théorique. Le résultat réel peut varier.
        </p>
      </div>
    </div>
  );
}
