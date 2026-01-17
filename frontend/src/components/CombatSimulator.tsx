import { useState } from 'react';
import { Shield, Swords, X } from 'lucide-react';
import { Button } from './ui/button';

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
    
    // Estimation des pertes (plus le ratio est déséquilibré, moins de pertes pour le gagnant)
    const lossMultiplier = Math.max(0.1, 1 - attackerWinChance / 100);
    
    return {
      winChance: attackerWinChance,
      estimatedLosses: {
        hunters: Math.floor(attackerHunters * lossMultiplier * 0.5),
        cruisers: Math.floor(attackerCruisers * lossMultiplier * 0.5),
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
            <Swords className="h-6 w-6" />
            SIMULATEUR DE COMBAT
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Sliders pour ajuster la flotte */}
        <div className="space-y-4 mb-6 bg-slate-950/50 p-4 rounded-lg border border-white/5">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-slate-400">🚀 Chasseurs Légers</label>
              <span className="text-white font-bold font-mono">{attackerHunters} / {myFleet.hunters}</span>
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
              <label className="text-sm text-slate-400">🛸 Croiseurs</label>
              <span className="text-white font-bold font-mono">{attackerCruisers} / {myFleet.cruisers}</span>
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
        <div className={`p-6 rounded-lg border-2 mb-6 ${
          result.winChance > 70 ? 'bg-green-950/20 border-green-500' : 
          result.winChance > 40 ? 'bg-yellow-950/20 border-yellow-500' : 
          'bg-red-950/20 border-red-500'
        }`}>
          <div className="text-center mb-6">
            <div className={`text-5xl font-black mb-2 ${
              result.winChance > 70 ? 'text-green-400' :
              result.winChance > 40 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {result.winChance.toFixed(1)}%
            </div>
            <div className="text-sm text-slate-400 uppercase tracking-wider">Chances de Victoire</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {/* Puissance Attaquant */}
            <div className="bg-slate-950/50 p-3 rounded-lg">
              <div className="text-slate-500 mb-2 text-xs uppercase tracking-wider flex items-center gap-1">
                <Swords size={12} /> Votre Puissance
              </div>
              <div className="text-2xl font-bold text-indigo-400">{result.attackerPower.toLocaleString()}</div>
            </div>

            {/* Pertes Estimées */}
            <div className="bg-slate-950/50 p-3 rounded-lg">
              <div className="text-slate-500 mb-2 text-xs uppercase tracking-wider">Pertes Estimées</div>
              <div className="text-orange-400">
                <div>🚀 {result.estimatedLosses.hunters} Chasseurs</div>
                <div>🛸 {result.estimatedLosses.cruisers} Croiseurs</div>
              </div>
            </div>

            {/* Flotte Ennemie */}
            <div className="bg-slate-950/50 p-3 rounded-lg">
              <div className="text-slate-500 mb-2 text-xs uppercase tracking-wider flex items-center gap-1">
                <Shield size={12} /> Ennemi
              </div>
              <div className="text-red-400">
                <div>🚀 {enemyFleet.hunters} Chasseurs</div>
                <div>🛸 {enemyFleet.cruisers} Croiseurs</div>
              </div>
              <div className="text-xs text-slate-500 mt-1">Puissance: {result.defenderPower.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Avertissement */}
        <div className="bg-yellow-950/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
          <p className="text-xs text-yellow-400">
            ⚠️ <strong>Attention :</strong> Cette simulation est une estimation. Les résultats réels peuvent varier selon les technologies et les défenses ennemies.
          </p>
        </div>

        {/* Boutons */}
        <div className="flex gap-3">
          <Button 
            onClick={onClose} 
            variant="outline"
            className="flex-1 bg-slate-800 hover:bg-slate-700 border-slate-700"
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
