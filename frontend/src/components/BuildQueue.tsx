import { useState, useEffect } from 'react';
import { Clock, Trash2, Factory, Rocket, FlaskConical } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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

  // Le backend ne retourne pas startTime — on affiche une barre indéterminée animée.
  // Le vrai signal de progression est le countdown formatTimeUntilMs(endTime).

  const getIcon = (type: string) => {
    switch (type) {
      case 'building': return <Factory  size={16} className="text-orange-400" />;
      case 'tech':     return <FlaskConical size={16} className="text-purple-400" />;
      case 'ship':     return <Rocket   size={16} className="text-cyan-400"   />;
      case 'defense':  return <Factory  size={16} className="text-red-400"    />;
      default:         return <Clock    size={16} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'building': return 'Bâtiment';
      case 'tech':     return 'Recherche';
      case 'ship':     return 'Vaisseau';
      case 'defense':  return 'Défense';
      default:         return 'Construction';
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] border border-cyan-500/10 rounded-lg p-4 shadow-xl">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-cyan-500/10">
        <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
        <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70 flex items-center gap-2">
          <Clock size={14} className="animate-pulse" />
          FILE DE CONSTRUCTION
        </span>
        <span className="ml-auto text-xs font-mono bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full text-cyan-400">
          {items.length}
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const isActive = idx === 0;
          const timeRemaining = formatTimeUntilMs(item.endTime);

          return (
            <div
              key={item.id}
              className={`relative overflow-hidden rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-[rgba(0,245,255,0.05)] border border-cyan-500/20 shadow-lg'
                  : 'bg-[rgba(10,5,32,0.85)] border border-cyan-500/10'
              }`}
            >
              <div className="relative flex items-center justify-between p-3">
                <div className="flex items-center gap-3 flex-1">
                  {/* Icône + Badge */}
                  <div className={`p-2 rounded-lg ${
                    isActive ? 'bg-cyan-500/10' : 'bg-black/30'
                  }`}>
                    {getIcon(item.type)}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 text-sm truncate">
                        {item.name}
                      </span>
                      {item.level && (
                        <span className="text-xs bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full text-cyan-400">
                          Niv. {item.level}
                        </span>
                      )}
                      {item.quantity && (
                        <span className="text-xs bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full text-cyan-400">
                          ×{item.quantity}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">
                        {getTypeLabel(item.type)}
                      </span>
                      {isActive && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-cyan-400 font-mono animate-pulse">
                            En construction
                          </span>
                        </>
                      )}
                      {!isActive && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-slate-500 font-mono">
                            File #{idx + 1}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timer + Actions */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`font-mono font-bold tabular-nums ${
                      isActive ? 'text-cyan-400 text-base' : 'text-slate-400 text-sm'
                    }`}>
                      {timeRemaining}
                    </div>
                    {isActive && (
                      <div className="text-xs text-cyan-500/70 mt-0.5 animate-pulse">
                        En cours…
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
                <div className="px-3 pb-3">
                  <Progress variant="success" value={100} className="animate-pulse opacity-60" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Résumé */}
      <div className="mt-4 pt-3 border-t border-cyan-500/10 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span>Production active</span>
        </div>
        <div className="font-mono tabular-nums">
          Temps total: {formatTimeUntilMs(items[items.length - 1]?.endTime || Date.now())}
        </div>
      </div>
    </div>
  );
}
