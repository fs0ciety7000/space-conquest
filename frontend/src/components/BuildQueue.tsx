import { Clock, Trash2, CheckCircle2, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';

interface QueueItem {
  id: string;
  type: 'building' | 'tech' | 'ship' | 'defense';
  name: string;
  endTime: number;
  level?: number;
  quantity?: number;
}

interface BuildQueueProps {
  planet: any;
}

export function BuildQueue({ planet }: BuildQueueProps) {
  const [now, setNow] = useState(Date.now());
  const [items, setItems] = useState<QueueItem[]>([]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const queue: QueueItem[] = [];

    // Construction de bâtiment en cours
    if (planet.construction_end) {
      const buildingNames: Record<string, string> = {
        'metal_mine': 'Mine de Métal',
        'crystal_mine': 'Mine de Cristal',
        'deuterium_synthesizer': 'Synthétiseur de Deutérium',
        'solar_plant': 'Centrale Solaire',
        'robot_factory': 'Usine de Robots',
        'shipyard': 'Chantier Spatial',
        'research_lab': 'Laboratoire',
        'alliance_depot': 'Dépôt d\'Alliance',
        'missile_silo': 'Silo à Missiles',
      };

      queue.push({
        id: 'building',
        type: 'building',
        name: buildingNames[planet.construction_type] || planet.construction_type,
        endTime: new Date(planet.construction_end).getTime(),
        level: planet[planet.construction_type] + 1,
      });
    }

    // Construction de recherche en cours
    if (planet.research_end) {
      const techNames: Record<string, string> = {
        'energy_tech': 'Technologie Énergétique',
        'laser_tech': 'Technologie Laser',
        'ion_tech': 'Technologie Ionique',
        'hyperspace_tech': 'Technologie Hyperespace',
        'combustion_drive': 'Réacteur à Combustion',
        'impulse_drive': 'Réacteur à Impulsion',
        'hyperspace_drive': 'Propulsion Hyperespace',
        'espionage_tech': 'Technologie Espionnage',
        'computer_tech': 'Technologie Informatique',
        'weapons_tech': 'Technologie Armes',
        'shielding_tech': 'Technologie Bouclier',
        'armor_tech': 'Technologie Blindage',
      };

      queue.push({
        id: 'research',
        type: 'tech',
        name: techNames[planet.research_type] || planet.research_type,
        endTime: new Date(planet.research_end).getTime(),
        level: planet[planet.research_type] + 1,
      });
    }

    // Construction de vaisseaux en cours
    if (planet.shipyard_construction_end) {
      const shipNames: Record<string, string> = {
        'light_hunter': 'Chasseur Léger',
        'cruiser': 'Croiseur',
        'cargo_ship': 'Transporteur',
        'spy_probe': 'Sonde Espionnage',
      };

      queue.push({
        id: 'shipyard',
        type: 'ship',
        name: shipNames[planet.shipyard_construction_type] || planet.shipyard_construction_type,
        endTime: new Date(planet.shipyard_construction_end).getTime(),
        quantity: planet.shipyard_construction_quantity || 1,
      });
    }

    setItems(queue);
  }, [planet]);

  const formatTime = (timestamp: number) => {
    const remaining = Math.max(0, timestamp - now);
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const getProgress = (endTime: number) => {
    // On ne peut pas calculer le début exact, on estime à partir de la durée restante
    const remaining = Math.max(0, endTime - now);
    // Durée totale estimée (arbitraire pour l'affichage)
    const estimated = remaining * 1.5; 
    const progress = Math.min(100, ((estimated - remaining) / estimated) * 100);
    return progress;
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'building': return '🏭';
      case 'tech': return '🔬';
      case 'ship': return '🚀';
      case 'defense': return '🛡️';
      default: return '⚙️';
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-slate-400 mb-3 flex items-center gap-2">
          <Clock size={18} className="text-slate-500" />
          FILE DE CONSTRUCTION
        </h3>
        <div className="text-center py-8">
          <CheckCircle2 size={48} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Aucune construction en cours</p>
          <p className="text-slate-600 text-xs mt-1">Commencez à développer votre empire !</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-indigo-500/20 rounded-lg p-4 shadow-lg">
      <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
        <Timer size={20} className="animate-pulse" />
        FILE DE CONSTRUCTION
        <span className="ml-auto text-xs bg-indigo-500/20 px-2 py-1 rounded-full">
          {items.length} en cours
        </span>
      </h3>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const isActive = idx === 0;
          const progress = getProgress(item.endTime);
          
          return (
            <div 
              key={item.id}
              className={`relative overflow-hidden rounded-lg border transition-all ${
                isActive 
                  ? 'bg-indigo-950/40 border-indigo-500/40 shadow-lg shadow-indigo-500/10' 
                  : 'bg-slate-800/40 border-slate-700/40'
              }`}
            >
              {/* Barre de progression en arrière-plan */}
              {isActive && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              )}

              <div className="relative p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-2xl">{getIcon(item.type)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-sm truncate">
                      {item.name}
                      {item.level && (
                        <span className="text-indigo-400 ml-2 text-xs">
                          Niveau {item.level}
                        </span>
                      )}
                      {item.quantity && item.quantity > 1 && (
                        <span className="text-cyan-400 ml-2 text-xs">
                          x{item.quantity}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      {isActive ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-xs text-green-400 font-semibold">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            En cours
                          </span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-400">
                            {progress.toFixed(0)}% complété
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-500 font-mono">
                          ⏳ En attente (Position {idx + 1})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <div className={`text-sm font-mono font-bold ${
                    isActive ? 'text-indigo-300' : 'text-slate-400'
                  }`}>
                    {formatTime(item.endTime)}
                  </div>
                  {!isActive && (
                    <button 
                      className="text-red-400 hover:text-red-300 mt-1 text-xs flex items-center gap-1 ml-auto"
                      title="Annuler"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Barre de progression visible */}
              {isActive && (
                <div className="h-1 bg-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-400 rounded-full" />
          En construction
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-slate-600 rounded-full" />
          En attente
        </div>
      </div>
    </div>
  );
}
