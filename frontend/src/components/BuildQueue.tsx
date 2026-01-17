import { Clock, Trash2, Factory, Rocket, FlaskConical } from 'lucide-react';
import { useEffect, useState } from 'react';

interface QueueItem {
  id: string;
  type: 'building' | 'tech' | 'ship';
  name: string;
  endTime: number;
  level?: number;
}

interface BuildQueueProps {
  items: QueueItem[];
  onCancel?: (id: string) => void;
}

export function BuildQueue({ items, onCancel }: BuildQueueProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: number) => {
    const remaining = Math.max(0, timestamp - now);
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'building': return <Factory size={16} className="text-amber-400" />;
      case 'ship': return <Rocket size={16} className="text-indigo-400" />;
      case 'tech': return <FlaskConical size={16} className="text-purple-400" />;
      default: return <Clock size={16} />;
    }
  };

  const getProgress = (endTime: number) => {
    const remaining = Math.max(0, endTime - now);
    // Estimation: on suppose une durée totale (pour la démo, 5 min)
    const total = 300000; // 5 minutes
    return Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
  };

  if (items.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-white/10 rounded-lg p-6 backdrop-blur-sm">
        <h3 className="text-lg font-bold text-indigo-400 mb-3 flex items-center gap-2">
          <Clock size={18} className="animate-pulse" />
          FILE DE CONSTRUCTION
        </h3>
        <p className="text-slate-500 text-sm text-center py-8 italic">
          Aucune construction en cours
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
      <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
        <Clock size={18} className="animate-pulse" />
        FILE DE CONSTRUCTION
        <span className="ml-auto text-xs text-slate-500 font-normal">
          {items.length} élément{items.length > 1 ? 's' : ''}
        </span>
      </h3>

      <div className="space-y-2">
        {items.map((item, idx) => {
          const isActive = idx === 0;
          const progress = isActive ? getProgress(item.endTime) : 0;

          return (
            <div 
              key={item.id}
              className={`relative overflow-hidden rounded-lg border transition-all duration-300 ${
                isActive 
                  ? 'bg-indigo-950/40 border-indigo-500/40 shadow-lg shadow-indigo-500/10' 
                  : 'bg-slate-800/40 border-white/5'
              }`}
            >
              {/* Barre de progression (seulement pour l'item actif) */}
              {isActive && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              )}

              <div className="relative flex items-center justify-between p-3">
                <div className="flex items-center gap-3 flex-1">
                  {getIcon(item.type)}
                  
                  <div className="flex-1">
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      {item.name} 
                      {item.level && (
                        <span className="text-xs text-slate-400 font-normal">
                          Niv. {item.level}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {isActive ? (
                        <span className="flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          En cours
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          Position {idx + 1}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`text-sm font-mono font-bold ${
                      isActive ? 'text-indigo-300' : 'text-slate-400'
                    }`}>
                      {formatTime(item.endTime)}
                    </div>
                    {isActive && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {progress.toFixed(0)}%
                      </div>
                    )}
                  </div>
                  
                  {!isActive && onCancel && (
                    <button 
                      onClick={() => onCancel(item.id)}
                      className="p-1.5 hover:bg-red-500/20 rounded transition-colors group"
                      title="Annuler"
                    >
                      <Trash2 size={14} className="text-red-400/50 group-hover:text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-slate-950/50 rounded border border-white/5">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-indigo-400 font-bold">ℹ️ Astuce:</span> Les constructions sont traitées séquentiellement. Seule la première est active.
        </p>
      </div>
    </div>
  );
}
