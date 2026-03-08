// ANTIGRAVITY: Modal détail d'un événement serveur PVE.
// Affiche HP, top contributeurs, effets actifs, et bouton de contribution.
import { useState, useEffect } from 'react';
import { X, Swords, Trophy, Globe, Clock, Zap, Users, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { apiUrl } from '@/config/api';
import { formatTimeUntil } from '@/lib/utils';
import type { ServerEventSummary } from '@/hooks/useServerEvents';

interface ServerEventModalProps {
  event: ServerEventSummary;
  userId?: string;
  planetId?: string;
  onClose: () => void;
}

interface EventDetail {
  event: ServerEventSummary & {
    effects?: Record<string, any>;
    narrative?: string;
  };
  top_contributors: [string, number][];
}

function getEventGradient(typeKey: string): string {
  switch (typeKey) {
    case 'pirate_invasion': return 'from-red-950 via-red-900 to-slate-900';
    case 'radioactive_cloud': return 'from-green-950 via-green-900 to-slate-900';
    case 'meteor_shower': return 'from-orange-950 via-orange-900 to-slate-900';
    case 'solar_storm': return 'from-yellow-950 via-amber-900 to-slate-900';
    case 'ancient_artifact': return 'from-purple-950 via-purple-900 to-slate-900';
    default: return 'from-slate-900 via-slate-800 to-slate-900';
  }
}

function getAccentColor(typeKey: string): string {
  switch (typeKey) {
    case 'pirate_invasion': return 'text-red-400';
    case 'radioactive_cloud': return 'text-green-400';
    case 'meteor_shower': return 'text-orange-400';
    case 'solar_storm': return 'text-yellow-400';
    case 'ancient_artifact': return 'text-purple-400';
    default: return 'text-blue-400';
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

function describeEffects(effects: Record<string, any> | undefined): string[] {
  if (!effects) return [];
  const lines: string[] = [];
  if (effects.production_malus_metal) lines.push(`-${Math.round((1 - effects.production_malus_metal) * 100)}% production métal`);
  if (effects.production_malus_crystal) lines.push(`-${Math.round((1 - effects.production_malus_crystal) * 100)}% production cristal`);
  if (effects.production_malus_deuterium) lines.push(`-${Math.round((1 - effects.production_malus_deuterium) * 100)}% production deutérium`);
  if (effects.spy_blocked) lines.push('Espionnage bloqué dans la zone');
  if (effects.reward_type === 'artifact_tech_boost') lines.push('Récompense : boost de technologie aléatoire');
  if (effects.reward_type === 'resources') lines.push('Récompense : ressources proportionnelles à la contribution');
  return lines;
}

export default function ServerEventModal({ event, userId, planetId, onClose }: ServerEventModalProps) {
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [contribution, setContribution] = useState('');
  const [contributing, setContributing] = useState(false);

  useEffect(() => {
    fetch(apiUrl(`/server-events/${event.id}`))
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setDetail(d); })
      .catch(() => {});
  }, [event.id]);

  const displayEvent = detail?.event ?? event;
  const topContributors = detail?.top_contributors ?? [];
  const effects = describeEffects((displayEvent as any).effects);

  const handleContribute = async () => {
    if (!userId || !planetId) {
      toast.error('Sélectionnez une planète pour contribuer');
      return;
    }
    const amount = parseInt(contribution) || undefined;
    setContributing(true);
    try {
      const res = await fetch(apiUrl(`/server-events/${event.id}/contribute`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, planet_id: planetId, resources: amount }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Erreur');
      }
      const data = await res.json();
      toast.success(`Contribution envoyée : ${data.contribution} points`);
      setContribution('');
      // Refresh detail
      fetch(apiUrl(`/server-events/${event.id}`))
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setDetail(d); });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setContributing(false);
    }
  };

  const progressPct = displayEvent.hp_max > 0
    ? Math.max(0, Math.min(100, (displayEvent.hp_current / displayEvent.hp_max) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-lg rounded-xl border border-slate-700/50 bg-gradient-to-b ${getEventGradient(event.event_type_key)} overflow-hidden shadow-2xl`}>

        {/* Header */}
        <div className="p-5 pb-3">
          <button
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{displayEvent.icon}</span>
            <div>
              <h2 className={`text-xl font-bold ${getAccentColor(event.event_type_key)}`}>
                {displayEvent.name}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {displayEvent.zone}
                </span>
                {displayEvent.status === 'active' && displayEvent.ends_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Fin {formatTimeUntil(displayEvent.ends_at)}
                  </span>
                )}
                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                  displayEvent.status === 'active' ? 'bg-green-500/20 text-green-300' :
                  displayEvent.status === 'incoming' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-slate-500/20 text-slate-300'
                }`}>
                  {displayEvent.status === 'active' ? 'EN COURS' :
                   displayEvent.status === 'incoming' ? 'À VENIR' : displayEvent.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Narrative */}
          {displayEvent.narrative && (
            <p className="text-sm text-slate-300 italic mb-3 leading-relaxed">
              "{displayEvent.narrative}"
            </p>
          )}
        </div>

        {/* HP Bar (actif) */}
        {displayEvent.status === 'active' && displayEvent.hp_max > 0 && (
          <div className="px-5 pb-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Swords className="w-3 h-3" /> PV collectifs
              </span>
              <span className="font-mono">
                {displayEvent.hp_current.toLocaleString()} / {displayEvent.hp_max.toLocaleString()}
              </span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-700 ${getProgressColor(event.event_type_key)}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>{progressPct.toFixed(1)}% neutralisé</span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {displayEvent.participant_count} participant{displayEvent.participant_count > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Effets */}
        {effects.length > 0 && (
          <div className="px-5 pb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Effets en zone
            </p>
            <ul className="space-y-1">
              {effects.map((line, i) => (
                <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 flex-shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Top contributeurs */}
        {topContributors.length > 0 && (
          <div className="px-5 pb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> Top Contributeurs
            </p>
            <ol className="space-y-1">
              {topContributors.map(([name, pts], i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-amber-500/20 text-amber-300' :
                    i === 1 ? 'bg-slate-400/20 text-slate-300' :
                    'bg-orange-700/20 text-orange-300'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-slate-200 truncate">{name}</span>
                  <span className="text-slate-400 font-mono text-xs">{pts.toLocaleString()} pts</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Ma contribution */}
        {displayEvent.my_contribution > 0 && (
          <div className="px-5 pb-3">
            <p className="text-xs text-slate-400">
              Ma contribution : <span className={`font-bold ${getAccentColor(event.event_type_key)}`}>
                {displayEvent.my_contribution.toLocaleString()} points
              </span>
            </p>
          </div>
        )}

        {/* Formulaire de contribution */}
        {displayEvent.status === 'active' && userId && planetId && (
          <div className="px-5 pb-5 pt-2 border-t border-slate-700/50">
            <p className="text-xs text-slate-400 mb-2">Envoyer des ressources pour contribuer à l'effort collectif :</p>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Points (défaut: 100)"
                value={contribution}
                onChange={e => setContribution(e.target.value)}
                className="bg-slate-800/50 border-slate-600 text-white text-sm h-9"
              />
              <Button
                size="sm"
                onClick={handleContribute}
                disabled={contributing}
                className="h-9 flex-shrink-0"
              >
                <Send className="w-4 h-4 mr-1" />
                {contributing ? 'Envoi...' : 'Contribuer'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
