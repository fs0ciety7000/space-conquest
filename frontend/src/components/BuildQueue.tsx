import { useState, useEffect } from 'react';
import { Clock, Trash2, Factory, Rocket, FlaskConical } from 'lucide-react';
import { formatTimeUntilMs } from '@/lib/utils';

interface QueueItem {
  id: string;
  type: 'building' | 'tech' | 'ship' | 'defense';
  name: string;
  endTime: number;
  level?: number;
  quantity?: number;
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

  const getProgress = (endTime: number) => {
    if (items.length === 0) return 0;
    const firstItem = items[0];
    const totalDuration = endTime - (now - (endTime - now));
    const elapsed = now - (endTime - totalDuration);
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'building': return <Factory size={16} className="text-orange-400" />;
      case 'tech': return <FlaskConical size={16} className="text-purple-400" />;
      case 'ship': return <Rocket size={16} className="text-cyan-400" />;
      case 'defense': return <Factory size={16} className="text-red-400" />;
      default: return <Clock size={16} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'building': return 'Bâtiment';
      case 'tech': return 'Recherche';
      case 'ship': return 'Vaisseau';
      case 'defense': return 'Défense';
      default: return 'Construction';
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-indigo-500/20 rounded-lg p-4 shadow-xl">
      <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
        <Clock size={20} className="animate-pulse" />
        FILE DE CONSTRUCTION
        <span className="text-xs font-mono bg-indigo-950/50 px-2 py-1 rounded-full text-indigo-300">
          {items.length}
        </span>
      </h3>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const isActive = idx === 0;
          const progress = isActive ? getProgress(item.endTime) : 0;
          const timeRemaining = formatTimeUntilMs(item.endTime);

          return (
            <div 
              key={item.id}
              className={`relative overflow-hidden rounded-lg transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border-2 border-indigo-500/50 shadow-lg shadow-indigo-900/30' 
                  : 'bg-slate-800/40 border border-slate-700/30'
              }`}
            >
              {/* Barre de progression pour l'item actif */}
              {isActive && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 transition-all duration-1000 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              )}

              <div className="relative flex items-center justify-between p-3">
                <div className="flex items-center gap-3 flex-1">
                  {/* Icône + Badge */}
                  <div className={`p-2 rounded-lg ${
                    isActive ? 'bg-indigo-900/50' : 'bg-slate-700/30'
                  }`}>
                    {getIcon(item.type)}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm truncate">
                        {item.name}
                      </span>
                      {item.level && (
                        <span className="text-xs bg-slate-700/50 px-2 py-0.5 rounded-full text-slate-300">
                          Niv. {item.level}
                        </span>
                      )}
                      {item.quantity && (
                        <span className="text-xs bg-slate-700/50 px-2 py-0.5 rounded-full text-slate-300">
                          ×{item.quantity}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">
                        {getTypeLabel(item.type)}
                      </span>
                      {isActive && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-indigo-400 font-mono animate-pulse">
                            🔨 En construction
                          </span>
                        </>
                      )}
                      {!isActive && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-slate-500 font-mono">
                            ⏳ File #{idx + 1}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timer + Actions */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`font-mono font-bold ${
                      isActive ? 'text-indigo-300 text-base' : 'text-slate-400 text-sm'
                    }`}>
                      {timeRemaining}
                    </div>
                    {isActive && (
                      <div className="text-xs text-indigo-500 mt-0.5">
                        {progress.toFixed(0)}%
                      </div>
                    )}
                  </div>

                  {/* Bouton Annuler (sauf pour l'item actif) */}
                  {!isActive && onCancel && (
                    <button
                      onClick={() => onCancel(item.id)}
                      className="p-2 rounded-lg bg-red-950/30 hover:bg-red-900/40 text-red-400 hover:text-red-300 transition-all border border-red-900/30 hover:border-red-700/50"
                      title="Annuler"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Barre de progression visuelle en bas */}
              {isActive && (
                <div className="h-1 bg-slate-900/50">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Résumé */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Production active</span>
        </div>
        <div>
          Temps total: {formatTime(items[items.length - 1]?.endTime || Date.now())}
        </div>
      </div>
    </div>
  );
}