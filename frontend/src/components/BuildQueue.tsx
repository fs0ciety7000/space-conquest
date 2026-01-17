import { Clock, Trash2, Factory, FlaskConical, Rocket } from 'lucide-react';
import { useEffect, useState } from 'react';

interface QueueItem {
  id: string;
  type: 'building' | 'tech' | 'ship';
  name: string;
  endTime: number;
  level?: number;
}

interface BuildQueueProps {
  planet: any;
}

export function BuildQueue({ planet }: BuildQueueProps) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [, setNow] = useState(Date.now());

  // Mettre à jour l'heure toutes les secondes
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Construire la queue depuis les données de la planète
  useEffect(() => {
    const items: QueueItem[] = [];

    // Construction de bâtiment
    if (planet.construction_end) {
      items.push({
        id: 'building',
        type: 'building',
        name: planet.construction_type || 'Bâtiment',
        endTime: new Date(planet.construction_end).getTime(),
        level: planet.construction_level,
      });
    }

    // Construction de vaisseau
    if (planet.shipyard_construction_end) {
      items.push({
        id: 'shipyard',
        type: 'ship',
        name: planet.shipyard_construction_type || 'Vaisseau',
        endTime: new Date(planet.shipyard_construction_end).getTime(),
      });
    }

    // Recherche technologique
    if (planet.tech_construction_end) {
      items.push({
        id: 'tech',
        type: 'tech',
        name: planet.tech_construction_type || 'Technologie',
        endTime: new Date(planet.tech_construction_end).getTime(),
        level: planet.tech_construction_level,
      });
    }

    // Trier par temps de fin
    items.sort((a, b) => a.endTime - b.endTime);
    setQueue(items);
  }, [planet]);

  const formatTime = (timestamp: number) => {
    const remaining = Math.max(0, timestamp - Date.now());
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'building': return <Factory size={16} className="text-orange-400" />;
      case 'tech': return <FlaskConical size={16} className="text-cyan-400" />;
      case 'ship': return <Rocket size={16} className="text-indigo-400" />;
      default: return <Clock size={16} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'building': return 'BÂTIMENT';
      case 'tech': return 'RECHERCHE';
      case 'ship': return 'CHANTIER';
      default: return 'CONSTRUCTION';
    }
  };

  if (queue.length === 0) {
    return null; // Ne pas afficher si vide
  }

  return (
    <div className="bg-slate-900/50 border border-indigo-500/20 rounded-lg p-4">
      <h3 className="text-lg font-bold text-indigo-400 mb-3 flex items-center gap-2">
        <Clock size={18} />
        FILE DE CONSTRUCTION
      </h3>

      <div className="space-y-2">
        {queue.map((item, idx) => {
          const progress = Math.max(0, Math.min(100, 
            ((Date.now() - (item.endTime - 60000)) / 60000) * 100
          ));

          return (
            <div 
              key={item.id}
              className={`relative overflow-hidden rounded-lg ${
                idx === 0 
                  ? 'bg-indigo-950/40 border-2 border-indigo-500/50' 
                  : 'bg-slate-800/40 border border-white/5'
              }`}
            >
              {/* Barre de progression */}
              {idx === 0 && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-indigo-400/20 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              )}

              <div className="relative flex items-center justify-between p-3">
                <div className="flex items-center gap-3 flex-1">
                  {getIcon(item.type)}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {item.name}
                      </span>
                      {item.level && (
                        <span className="text-xs px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded">
                          Niv. {item.level}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
                      {idx === 0 ? (
                        <>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            En cours
                          </span>
                          <span className="text-slate-600">|</span>
                          <span>{getTypeLabel(item.type)}</span>
                        </>
                      ) : (
                        <>
                          <span>⏳ Position {idx + 1}</span>
                          <span className="text-slate-600">|</span>
                          <span>{getTypeLabel(item.type)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right ml-4">
                  <div className={`text-sm font-mono font-bold ${
                    idx === 0 ? 'text-indigo-300' : 'text-slate-400'
                  }`}>
                    {formatTime(item.endTime)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Résumé */}
      <div className="mt-3 pt-3 border-t border-white/5 text-xs text-slate-500 text-center">
        {queue.length} construction{queue.length > 1 ? 's' : ''} en cours
      </div>
    </div>
  );
}
