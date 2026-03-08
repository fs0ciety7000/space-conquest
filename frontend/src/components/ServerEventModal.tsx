// ANTIGRAVITY: Modal détail d'un événement serveur PVE.
// Affiche HP, top contributeurs, effets actifs, et bouton de contribution.
import { useState, useEffect } from 'react';
import { X, Swords, Trophy, Globe, Clock, Zap, Users, Send, AlertTriangle, Gift } from 'lucide-react';
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

// Effets connus par type — pour l'affichage même avant démarrage
const EVENT_TYPE_INFO: Record<string, { effects: string[]; reward: string; danger: string }> = {
  pirate_invasion: {
    effects: ['-30% production métal', '-20% production cristal', 'Malus commerce dans la zone'],
    reward: 'Métal, Cristal et Deutérium proportionnels à la contribution',
    danger: 'ÉLEVÉ — Les pirates attaquent activement les planètes de la zone',
  },
  radioactive_cloud: {
    effects: ['-40% production deutérium', '-20% production métal', 'Espionnage bloqué dans la zone'],
    reward: 'Cristal et Deutérium — récompense pour avoir dispersé le nuage',
    danger: 'MODÉRÉ — Production perturbée tant que le nuage n\'est pas dissipé',
  },
  meteor_shower: {
    effects: ['-25% production métal', '-25% production cristal', 'Risque de dommages sur les installations'],
    reward: 'Métal récupéré des débris — proportionnel à la contribution',
    danger: 'MODÉRÉ — Pluie de météorites sur la zone',
  },
  solar_storm: {
    effects: ['-50% production d\'énergie solaire', '-30% efficacité des boucliers'],
    reward: 'Cristal et bonus de recherche énergétique',
    danger: 'FAIBLE — Perturbation électromagnétique temporaire',
  },
  ancient_artifact: {
    effects: ['Bonus de production +20% pour les contributeurs', 'Boost de recherche technologique'],
    reward: 'Artefact technologique aléatoire — boost permanent de recherche',
    danger: 'NUL — Opportunité rare à ne pas manquer',
  },
};

function describeEffects(effects: Record<string, any> | undefined, typeKey?: string): string[] {
  // D'abord essayer depuis le JSON backend
  if (effects && Object.keys(effects).length > 0) {
    const lines: string[] = [];
    if (effects.production_malus_metal) lines.push(`-${Math.round((1 - effects.production_malus_metal) * 100)}% production métal`);
    if (effects.production_malus_crystal) lines.push(`-${Math.round((1 - effects.production_malus_crystal) * 100)}% production cristal`);
    if (effects.production_malus_deuterium) lines.push(`-${Math.round((1 - effects.production_malus_deuterium) * 100)}% production deutérium`);
    if (effects.spy_blocked) lines.push('Espionnage bloqué dans la zone');
    if (effects.reward_type === 'artifact_tech_boost') lines.push('Récompense : boost de technologie aléatoire');
    if (effects.reward_type === 'resources') lines.push('Récompense : ressources proportionnelles à la contribution');
    if (lines.length > 0) return lines;
  }
  // Fallback : descriptions statiques par type
  if (typeKey && EVENT_TYPE_INFO[typeKey]) {
    return EVENT_TYPE_INFO[typeKey].effects;
  }
  return [];
}

function formatCountdown(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return 'Imminent';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function ServerEventModal({ event, userId, planetId, onClose }: ServerEventModalProps) {
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [contribution, setContribution] = useState('');
  const [contributing, setContributing] = useState(false);
  const [tick, setTick] = useState(0); // force re-render pour le countdown

  // Ticker 1s pour rafraîchir le countdown si incoming
  useEffect(() => {
    if (event.status !== 'incoming') return;
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [event.status]);

  useEffect(() => {
    fetch(apiUrl(`/server-events/${event.id}`))
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setDetail(d); })
      .catch(() => {});
  }, [event.id]);

  const displayEvent = detail?.event ?? event;
  const topContributors = detail?.top_contributors ?? [];
  const effects = describeEffects((displayEvent as any).effects, event.event_type_key);
  const typeInfo = EVENT_TYPE_INFO[event.event_type_key];

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

        {/* Section INCOMING — countdown + préparation */}
        {displayEvent.status === 'incoming' && (
          <div className="px-5 pb-3 space-y-3">
            {/* Countdown */}
            <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border ${
              getAccentColor(event.event_type_key).replace('text-', 'border-').replace('-400', '-500/40')
            } bg-black/30`}>
              <Clock className={`w-5 h-5 flex-shrink-0 ${getAccentColor(event.event_type_key)}`} />
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Démarrage dans</p>
                <p className={`text-2xl font-black font-mono ${getAccentColor(event.event_type_key)}`}>
                  {formatCountdown(displayEvent.starts_at)}
                </p>
              </div>
            </div>

            {/* Danger level */}
            {typeInfo && (
              <div className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-400">
                  <span className="text-amber-400 font-semibold">Danger : </span>
                  {typeInfo.danger}
                </span>
              </div>
            )}

            {/* Récompense potentielle */}
            {typeInfo && (
              <div className="flex items-start gap-2 text-xs">
                <Gift className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-400">
                  <span className="text-emerald-400 font-semibold">Récompense : </span>
                  {typeInfo.reward}
                </span>
              </div>
            )}

            {/* Note HP */}
            <p className="text-xs text-slate-500 italic">
              Les points de vie collectifs et la barre de progression apparaîtront au démarrage de l'événement.
            </p>
          </div>
        )}

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
