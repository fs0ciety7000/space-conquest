// ANTIGRAVITY: Bandeau d'alertes PVE en haut de l'écran.
// Affiche les événements incoming et actifs avec progression HP.
// Clic → ouvre ServerEventModal pour les détails + contribution.
import { useState } from 'react';
import { X, AlertTriangle, Swords, ChevronDown, ChevronUp } from 'lucide-react';
import type { ServerEventSummary } from '@/hooks/useServerEvents';
import ServerEventModal from './ServerEventModal';

interface ServerEventBannerProps {
  events: ServerEventSummary[];
  userId?: string;
  planetId?: string;
}

// Couleur de fond par type d'événement (compatible avec Tailwind arbitrary)
function getEventBgClass(typeKey: string): string {
  switch (typeKey) {
    case 'pirate_invasion': return 'bg-red-950/90 border-red-500/50';
    case 'radioactive_cloud': return 'bg-green-950/90 border-green-500/50';
    case 'meteor_shower': return 'bg-orange-950/90 border-orange-500/50';
    case 'solar_storm': return 'bg-yellow-950/90 border-yellow-500/50';
    case 'ancient_artifact': return 'bg-purple-950/90 border-purple-500/50';
    default: return 'bg-slate-900/90 border-slate-500/50';
  }
}

function getProgressColor(typeKey: string): string {
  switch (typeKey) {
    case 'pirate_invasion': return 'bg-red-500';
    case 'radioactive_cloud': return 'bg-green-500';
    case 'meteor_shower': return 'bg-orange-500';
    case 'solar_storm': return 'bg-yellow-500';
    case 'ancient_artifact': return 'bg-purple-500';
    default: return 'bg-blue-500';
  }
}

function formatCountdown(isoDate: string | null): string {
  if (!isoDate) return '';
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return 'Actif';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `dans ${h}h ${m}m`;
  return `dans ${m}m`;
}

export default function ServerEventBanner({ events, userId, planetId }: ServerEventBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<ServerEventSummary | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const visible = events.filter(e => !dismissed.has(e.id) && (e.status === 'active' || e.status === 'incoming'));

  if (visible.length === 0) return null;

  const dismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(prev => new Set([...prev, id]));
  };

  return (
    <>
      <div className="fixed top-[60px] md:top-[72px] left-0 right-0 z-40 pointer-events-none">
        <div className="pointer-events-auto">
          {/* Header barre avec toggle */}
          <div
            className="flex items-center justify-between bg-slate-900/95 border-b border-slate-700 px-4 py-1 cursor-pointer select-none"
            onClick={() => setCollapsed(c => !c)}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-amber-400 animate-pulse" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Événements Serveur ({visible.length})
              </span>
            </div>
            {collapsed ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronUp className="w-3 h-3 text-slate-400" />}
          </div>

          {/* Événements */}
          {!collapsed && visible.map(event => (
            <div
              key={event.id}
              className={`flex items-center gap-3 px-4 py-2 border-b cursor-pointer hover:brightness-110 transition-all ${getEventBgClass(event.event_type_key)}`}
              onClick={() => setSelectedEvent(event)}
            >
              {/* Icône */}
              <span className="text-xl flex-shrink-0 pve-icon" data-type={event.event_type_key}>
                {event.icon}
              </span>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white truncate">{event.name}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">{event.zone}</span>
                  {event.status === 'incoming' && (
                    <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 rounded font-mono flex-shrink-0">
                      {formatCountdown(event.starts_at)}
                    </span>
                  )}
                </div>

                {/* Barre HP (seulement si actif) */}
                {event.status === 'active' && event.hp_max > 0 && (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(event.event_type_key)}`}
                        style={{ width: `${Math.max(0, Math.min(100, event.progress_percent))}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0 font-mono">
                      {event.hp_current.toLocaleString()} / {event.hp_max.toLocaleString()} PV
                    </span>
                    {event.participant_count > 0 && (
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        <Swords className="w-3 h-3 inline mr-0.5" />{event.participant_count}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Dismiss */}
              <button
                className="flex-shrink-0 text-slate-500 hover:text-slate-200 transition-colors"
                onClick={e => dismiss(event.id, e)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal détail */}
      {selectedEvent && (
        <ServerEventModal
          event={selectedEvent}
          userId={userId}
          planetId={planetId}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
}
