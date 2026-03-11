import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, ScanEye, Pickaxe, Hexagon, Droplet, Ship, ShieldAlert, Lock,
  AlertTriangle, Zap, TrendingDown, Clock, Skull, Target, User,
  CheckCircle, AlertCircle, BookOpen, Hammer, Swords, Shield,
  Loader2, FlaskConical, Coins
} from 'lucide-react';
import { toast } from 'sonner';
import { apiUrl } from '@/config/api';
import { formatTimeUntil } from '@/lib/utils';

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface SpyReportV2 {
  success: boolean;
  probe_destroyed?: boolean;
  was_detected?: boolean;
  message?: string;
  tech_difference: number;
  tech_diff_eff: number;
  probe_count: number;
  detection_level: 'none' | 'resources' | 'fleet' | 'full';
  resources?: { metal: number; crystal: number; deuterium: number };
  fleet?: Record<string, number>;
  defense?: number;
  threat_score?: number;
  recommendation?: 'ATTAQUE_RECOMMANDEE' | 'AVANTAGE_LEGER' | 'EQUILIBRE' | 'DESAVANTAGE' | 'RETRAITE_CONSEILLEE';
  target_planet_id?: string;
  target_planet_name?: string;
}

interface MySabotage {
  id: string;
  target_planet_id: string;
  target_planet_name: string;
  effect_type: string;
  expires_at: string;
  was_detected: boolean;
  casus_belli_granted: boolean;
  metadata?: { mine?: string; amount?: number; ship_key?: string; destroyed?: number };
}

interface SufferedSabotage {
  id: string;
  effect_type: string;
  created_at: string;
  expires_at: string;
  was_detected: boolean;
  is_active: boolean;
  attacker_username?: string;
  target_planet_name?: string;
  metadata?: Record<string, unknown>;
}

interface CasusBelli {
  id: string;
  aggressor_username: string;
  reason: string;
  created_at: string;
  expires_at: string;
  was_used: boolean;
  tension_level?: 1 | 2 | 3;
  cb_type?: string;
  is_multi_use?: boolean;
  uses_remaining?: number;
}

export interface IntelligenceViewProps {
  currentPlanet: { id: string; name: string; [key: string]: unknown };
  userPlanets: { id: string; name: string; galaxy: number; system: number; position: number }[];
  token: string;
  onActionSuccess?: () => void;
}

type Tab = 'operations' | 'rapport' | 'mes-ops' | 'securite';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getEffectLabel = (type: string): string =>
  ({
    disable_mine: 'Mine Désactivée',
    steal_tech: 'Vol Technologique',
    jam_construction: 'Sabotage Chantier',
    steal_credits: 'Vol de Crédits',
    corrupt_fleet: 'Corruption Escadron',
    sabotage_research: 'Sabotage Recherche',
    planet_lock: 'Verrouillage Planétaire',
  }[type] ?? type);

const getEffectDescription = (type: string): string =>
  ({
    disable_mine: 'Production -50% pendant 1h',
    steal_tech: 'Bonus recherche -20% (7 jours)',
    jam_construction: 'Chantier bloqué temporairement',
    steal_credits: 'Crédits Syndicat dérobés',
    corrupt_fleet: 'Escadron saboté',
    sabotage_research: 'Recherche retardée',
    planet_lock: 'Verrouillage total 30 min',
  }[type] ?? '');

type LucideIconType = React.ComponentType<{ size?: number; className?: string }>;

const getEffectIcon = (type: string): LucideIconType =>
  ({
    disable_mine: TrendingDown,
    steal_tech: BookOpen,
    jam_construction: Hammer,
    steal_credits: Coins,
    corrupt_fleet: Skull,
    sabotage_research: FlaskConical,
    planet_lock: Lock,
  }[type] ?? Zap);

const getCbTypeLabel = (type: string): string =>
  ({
    sabotage_detected: 'Sabotage Détecté',
    spy_harassment: 'Harcèlement Espionnage',
    resource_plunder: 'Pillage de Ressources',
  }[type] ?? type);

const getMineLabel = (mine: string): string =>
  ({
    metal: 'Mine de Métal',
    crystal: 'Mine de Cristal',
    deuterium: 'Mine de Deutérium',
  }[mine] ?? mine);

// ─── Sub-components ────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  icon: LucideIconType;
  children: React.ReactNode;
  isLocked?: boolean;
  delay?: number;
}

const Section = memo<SectionProps>(({ title, icon: Icon, children, isLocked = false, delay = 0 }) => {
  if (isLocked) {
    return (
      <div className="opacity-50 grayscale select-none relative overflow-hidden rounded-xl border border-dashed border-cyan-500/10 p-4 bg-[rgba(10,5,32,0.85)]/30">
        <div className="flex items-center gap-2 mb-3 opacity-50">
          <Icon size={16} />
          <h4 className="text-xs font-bold uppercase tracking-widest">{title}</h4>
        </div>
        <div className="flex flex-col items-center justify-center py-4 text-slate-500 gap-2">
          <Lock size={24} />
          <span className="text-[10px] font-mono uppercase tracking-widest">Données Insuffisantes</span>
        </div>
      </div>
    );
  }
  return (
    <div
      className="animate-in slide-in-from-bottom-2 fade-in duration-500"
      style={{ animationDelay: `${delay * 100}ms` }}
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
        <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
        <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">{title}</span>
      </div>
      {children}
    </div>
  );
});

interface ResourceCardProps {
  icon: LucideIconType;
  label: string;
  value: number;
  color: string;
}

const ResourceCard = memo<ResourceCardProps>(({ icon: Icon, label, value, color }) => (
  <div className="bg-[rgba(5,0,15,0.8)] border border-cyan-500/10 p-2.5 rounded-lg flex flex-col items-center text-center gap-1 group hover:border-cyan-500/30 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 card-depth">
    <Icon size={14} className={`${color} group-hover:scale-110 transition-transform`} />
    <span className="text-[9px] uppercase font-bold text-slate-500">{label}</span>
    <span className={`text-xs font-mono font-bold tabular-nums ${color}`}>{Math.floor(value).toLocaleString()}</span>
  </div>
));

// ─── Tab 1: Opérations ─────────────────────────────────────────────────────────

interface OperationsTabProps {
  currentPlanet: IntelligenceViewProps['currentPlanet'];
  token: string;
  onReportReady: (report: SpyReportV2) => void;
}

function OperationsTab({ currentPlanet, token, onReportReady }: OperationsTabProps) {
  const [targetPlanetId, setTargetPlanetId] = useState('');
  const [probeCount, setProbeCount] = useState(1);
  const [maxProbes, setMaxProbes] = useState(10);
  const [loading, setLoading] = useState(false);
  const [loadingProbes, setLoadingProbes] = useState(true);

  useEffect(() => {
    const fetchProbes = async () => {
      try {
        const res = await fetch(apiUrl(`/planets/${currentPlanet.id}/ships`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const ships: Record<string, number> = data.ships ?? data ?? {};
          const count = ships['spy_probe'] ?? 0;
          setMaxProbes(count);
          setProbeCount(Math.min(1, count));
        }
      } catch {
        // ignore, use default
      } finally {
        setLoadingProbes(false);
      }
    };
    fetchProbes();
  }, [currentPlanet.id, token]);

  const techBonus = Math.floor(Math.log2(Math.max(1, probeCount)));

  const handleLaunch = async () => {
    if (!targetPlanetId.trim()) {
      toast.error('Entrez un UUID de planète cible');
      return;
    }
    if (probeCount < 1) {
      toast.error('Sélectionnez au moins 1 sonde');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/spy/v2'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_planet_id: targetPlanetId.trim(),
          fleet: { spy_probe: probeCount },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onReportReady(data as SpyReportV2);
        toast.success('Mission lancée — rapport disponible');
      } else {
        toast.error(data.error || 'Échec de la mission');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Titre section */}
      <div className="flex items-center gap-3">
        <div className="w-[3px] h-6 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">Lancer une Mission d'Espionnage</h3>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Infiltrez les systèmes ennemis pour recueillir du renseignement</p>
        </div>
      </div>

      <div className="bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] border border-cyan-500/10 rounded-xl p-5 space-y-5">
        {/* Stock de sondes */}
        <div className="flex items-center justify-between p-3 bg-[rgba(5,0,15,0.6)] border border-cyan-500/10 rounded-lg">
          <div className="flex items-center gap-2">
            <ScanEye size={16} className="text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sondes disponibles</span>
          </div>
          {loadingProbes ? (
            <Loader2 size={14} className="animate-spin text-cyan-400" />
          ) : (
            <span className="font-mono text-sm font-black text-cyan-300 tabular-nums">{maxProbes.toLocaleString()}</span>
          )}
        </div>

        {/* Planète cible */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">
            UUID Planète Cible
          </label>
          <input
            type="text"
            value={targetPlanetId}
            onChange={(e) => setTargetPlanetId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full bg-[rgba(5,0,15,0.8)] border border-cyan-500/15 hover:border-cyan-500/30 focus:border-cyan-500/50 rounded-lg px-3 py-2.5 text-xs font-mono text-slate-300 placeholder-slate-600 outline-none transition-colors"
          />
          <p className="text-[10px] text-slate-600">L'UUID se trouve en passant la souris sur une planète dans la vue Galaxie.</p>
        </div>

        {/* Nombre de sondes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">
              Nombre de Sondes
            </label>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-violet-500/15 border border-violet-500/30 rounded text-[10px] font-mono text-violet-300">
                +{techBonus} eff. via &#x230A;log&#8322;(N)&#x230B;
              </span>
              <span className="font-mono text-sm font-black text-white tabular-nums">{probeCount}</span>
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={Math.max(1, maxProbes)}
            value={probeCount}
            onChange={(e) => setProbeCount(Number(e.target.value))}
            disabled={maxProbes === 0}
            className="w-full h-2 rounded-full appearance-none bg-[rgba(5,0,15,0.8)] border border-cyan-500/20 cursor-pointer accent-cyan-400 disabled:opacity-40"
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-600">
            <span>1</span>
            <span>{Math.max(1, maxProbes)}</span>
          </div>
        </div>

        {/* Avertissement pas de sondes */}
        {maxProbes === 0 && !loadingProbes && (
          <div className="flex items-start gap-3 p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-300/80">Aucune sonde disponible. Construisez des sondes d'espionnage dans le Chantier Spatial.</p>
          </div>
        )}

        {/* Bouton lancer */}
        <button
          onClick={handleLaunch}
          disabled={loading || maxProbes === 0 || !targetPlanetId.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50 text-cyan-300 font-black uppercase tracking-widest text-xs rounded-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(0,245,255,0.15)] disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Infiltration en cours...
            </>
          ) : (
            <>
              <ScanEye size={14} />
              Lancer la Mission
            </>
          )}
        </button>
      </div>

      {/* Info box */}
      <div className="p-3 bg-[rgba(5,0,15,0.6)] border border-cyan-500/10 rounded-lg">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          <span className="text-cyan-400 font-bold">Formule d'efficacité :</span> Chaque doublement du nombre de sondes augmente l'avantage technologique effectif de +1. Envoyer plus de sondes révèle davantage d'informations sur la cible.
        </p>
      </div>
    </div>
  );
}

// ─── Tab 2: Rapport Actif ──────────────────────────────────────────────────────

interface SabotageButtonProps {
  label: string;
  description: string;
  detectionText: string;
  durationText: string;
  colorClass: string;
  borderClass: string;
  textClass: string;
  icon: LucideIconType;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
}

const SabotageButton = memo<SabotageButtonProps>(({
  label, description, detectionText, durationText,
  colorClass, borderClass, textClass, icon: Icon,
  onClick, disabled = false, badge,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full ${colorClass} border ${borderClass} rounded-lg p-3 transition-all duration-300 group card-depth hover:-translate-y-1 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0`}
  >
    <div className="flex items-start gap-3">
      <Icon size={18} className={`${textClass} shrink-0 group-hover:scale-110 transition-transform`} />
      <div className="text-left flex-1">
        <div className={`text-xs font-bold ${textClass} mb-0.5 flex items-center gap-2`}>
          {label}
          {badge && (
            <span className="px-1.5 py-0.5 bg-red-500/20 border border-red-500/30 rounded text-[9px] text-red-300 font-mono">
              {badge}
            </span>
          )}
        </div>
        <div className={`text-[10px] ${textClass}/70 leading-relaxed`}>{description}</div>
        <div className="flex items-center gap-3 mt-1.5 text-[9px] text-slate-500">
          <span className="flex items-center gap-1"><AlertCircle size={9} />{detectionText}</span>
          <span className="flex items-center gap-1"><Clock size={9} />{durationText}</span>
        </div>
      </div>
    </div>
  </button>
));

interface RapportTabProps {
  report: SpyReportV2 | null;
  token: string;
  onSabotageSuccess: () => void;
}

function RapportTab({ report, token, onSabotageSuccess }: RapportTabProps) {
  const [selectedMine, setSelectedMine] = useState<'metal' | 'crystal' | 'deuterium'>('metal');
  const [sabotageLoading, setSabotageLoading] = useState(false);

  const handleSabotage = useCallback(async (actionType: string, mineTarget?: string) => {
    if (!report?.target_planet_id) return;
    setSabotageLoading(true);
    try {
      const body: Record<string, unknown> = {
        target_planet_id: report.target_planet_id,
        action_type: actionType,
      };
      if (mineTarget) body.mine_target = mineTarget;

      const res = await fetch(apiUrl('/sabotage'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.detected) {
          toast.error('Sabotage Détecté !', {
            description: data.message + ' La cible peut maintenant vous attaquer sans pénalité.',
            duration: 6000,
          });
        } else {
          toast.success(getEffectLabel(actionType), {
            description: data.message,
            duration: 5000,
          });
        }
        onSabotageSuccess();
      } else {
        toast.error(data.error || 'Échec du sabotage');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSabotageLoading(false);
    }
  }, [report, token, onSabotageSuccess]);

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ScanEye size={48} className="text-slate-700 mb-4 opacity-40" />
        <p className="text-slate-500 font-bold uppercase tracking-wider text-sm">Aucun rapport actif</p>
        <p className="text-slate-600 text-xs mt-2 font-mono">Lancez une mission d'espionnage dans l'onglet Opérations.</p>
      </div>
    );
  }

  const hasResources = report.detection_level !== 'none';
  const hasFleet = ['fleet', 'full'].includes(report.detection_level);
  const hasDefense = report.detection_level === 'full';
  const eff = report.tech_diff_eff ?? report.tech_difference;

  // Threat score thresholds
  const getThreatInfo = (score: number) => {
    if (score <= 100) return { label: 'Inoffensif', color: 'text-emerald-400', barColor: 'bg-emerald-500', barW: Math.max(2, (score / 100) * 100) };
    if (score <= 500) return { label: 'Présence légère', color: 'text-yellow-400', barColor: 'bg-yellow-500', barW: Math.max(2, ((score - 100) / 400) * 100) };
    if (score <= 2000) return { label: 'Force modérée', color: 'text-orange-400', barColor: 'bg-orange-500', barW: Math.max(2, ((score - 500) / 1500) * 100) };
    if (score <= 10000) return { label: 'Forteresse', color: 'text-red-400', barColor: 'bg-red-500', barW: Math.max(2, ((score - 2000) / 8000) * 100) };
    return { label: 'Arsenal massif', color: 'text-red-400', barColor: 'bg-red-600', barW: 100, pulse: true };
  };

  const recMap: Record<string, { label: string; color: string; border: string }> = {
    ATTAQUE_RECOMMANDEE: { label: 'Attaque recommandée', color: 'text-emerald-400', border: 'border-emerald-500/30' },
    AVANTAGE_LEGER:      { label: 'Avantage léger',      color: 'text-cyan-400',    border: 'border-cyan-500/30' },
    EQUILIBRE:           { label: 'Combat incertain',    color: 'text-yellow-400',  border: 'border-yellow-500/30' },
    DESAVANTAGE:         { label: 'Désavantage',         color: 'text-orange-400',  border: 'border-orange-500/30' },
    RETRAITE_CONSEILLEE: { label: 'Retraite conseillée', color: 'text-red-400',     border: 'border-red-500/30' },
  };

  return (
    <div className="space-y-6">
      {/* ── A. État de la sonde ── */}
      {report.probe_destroyed && (
        <div className="flex items-center gap-3 p-4 bg-red-950/30 border border-red-500/40 rounded-xl animate-pulse">
          <AlertTriangle size={24} className="text-red-400 shrink-0" />
          <div>
            <div className="text-sm font-black uppercase tracking-wider text-red-300">Sonde Interceptée</div>
            <div className="text-[10px] text-red-300/70 font-mono mt-0.5">{report.message ?? 'La sonde a été détruite avant de transmettre un rapport complet.'}</div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {report.was_detected && (
          <span className="px-2.5 py-1 bg-orange-500/15 border border-orange-500/30 rounded-lg text-[10px] font-bold text-orange-300 uppercase tracking-wider">
            Détectée
          </span>
        )}
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono ${eff >= 0 ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
          {eff >= 0 ? `+${eff}` : eff} avantage eff.
        </span>
        {report.target_planet_name && (
          <span className="px-2.5 py-1 bg-slate-800/50 border border-slate-700/30 rounded-lg text-[10px] font-mono text-slate-400">
            Cible : {report.target_planet_name}
          </span>
        )}
      </div>

      {/* ── B. Score de Menace ── */}
      {report.threat_score !== undefined && (
        <Section title="Score de Menace" icon={Shield} delay={1}>
          {(() => {
            const info = getThreatInfo(report.threat_score!);
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${info.color}`}>{info.label}</span>
                  <span className={`font-mono text-sm font-black tabular-nums ${info.color}`}>
                    {report.threat_score!.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-[rgba(5,0,15,0.8)] rounded-full border border-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${info.barColor} ${(info as { pulse?: boolean }).pulse ? 'animate-pulse' : ''} transition-all duration-700`}
                    style={{ width: `${info.barW}%` }}
                  />
                </div>
              </div>
            );
          })()}
        </Section>
      )}

      {/* ── C. Recommandation ── */}
      {report.recommendation && recMap[report.recommendation] && (
        <Section title="Recommandation Tactique" icon={Target} delay={2}>
          <div className={`flex items-center gap-3 p-3 bg-[rgba(5,0,15,0.6)] border ${recMap[report.recommendation].border} rounded-lg`}>
            <Swords size={16} className={recMap[report.recommendation].color} />
            <span className={`text-xs font-bold ${recMap[report.recommendation].color}`}>
              {recMap[report.recommendation].label}
            </span>
          </div>
        </Section>
      )}

      {/* ── D. Données révélées ── */}
      <Section title="Gisements détectés" icon={Pickaxe} isLocked={!hasResources} delay={3}>
        {report.resources && (
          <div className="grid grid-cols-3 gap-3">
            <ResourceCard icon={Pickaxe} label="Métal" value={report.resources.metal} color="text-slate-300" />
            <ResourceCard icon={Hexagon} label="Cristal" value={report.resources.crystal} color="text-blue-300" />
            <ResourceCard icon={Droplet} label="Deutérium" value={report.resources.deuterium} color="text-emerald-300" />
          </div>
        )}
      </Section>

      <Section title="Flotte en Stationnement" icon={Ship} isLocked={!hasFleet} delay={4}>
        {report.fleet ? (
          Object.keys(report.fleet).length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(report.fleet).map(([key, count]) =>
                count > 0 ? (
                  <div key={key} className="flex justify-between items-center p-2 bg-[rgba(5,0,15,0.8)] border border-cyan-500/10 rounded hover:bg-cyan-500/5 hover:-translate-y-0.5 transition-all duration-150">
                    <span className="text-xs uppercase text-slate-400 font-bold">{key.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-mono text-cyan-400 tabular-nums">{count.toLocaleString()}</span>
                  </div>
                ) : null
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic text-center py-2">Aucun vaisseau détecté en orbite.</div>
          )
        ) : null}
      </Section>

      <Section title="Systèmes Défensifs" icon={ShieldAlert} isLocked={!hasDefense} delay={5}>
        {report.defense !== undefined ? (
          <div className="flex items-center gap-4 p-3 bg-red-950/20 border border-red-500/20 rounded-lg hover:-translate-y-0.5 transition-all duration-300">
            <AlertTriangle className="text-red-400" size={22} />
            <div>
              <div className="text-xs uppercase font-bold text-red-400">Signature Défensive</div>
              <div className="text-base font-black text-slate-200">
                {report.defense > 0 ? `${report.defense} Unités` : 'Aucune défense'}
              </div>
            </div>
          </div>
        ) : null}
      </Section>

      {/* ── E. Opérations clandestines ── */}
      {report.success && (
        <Section title="Opérations Clandestines" icon={Zap} isLocked={eff < 1} delay={6}>
          {eff >= 1 ? (
            <div className="space-y-3">
              <div className="bg-yellow-950/20 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-amber-400 mb-0.5">Risques Opérationnels</div>
                  <div className="text-[10px] text-amber-400/70 leading-relaxed">
                    Si détecté : sonde détruite + Casus Belli accordé à la cible.
                  </div>
                </div>
              </div>

              {/* eff >= 1 */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Disponible dès +1 avantage</p>
                {/* Désactiver mine */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedMine}
                      onChange={(e) => setSelectedMine(e.target.value as 'metal' | 'crystal' | 'deuterium')}
                      className="bg-[rgba(5,0,15,0.8)] border border-orange-500/20 text-orange-300 text-[10px] rounded px-2 py-1 font-mono outline-none"
                    >
                      <option value="metal">Mine de Métal</option>
                      <option value="crystal">Mine de Cristal</option>
                      <option value="deuterium">Mine de Deutérium</option>
                    </select>
                  </div>
                  <SabotageButton
                    label="Désactiver Mine"
                    description="Désactive temporairement la mine sélectionnée (-50% prod 1h)"
                    detectionText="Risque modéré"
                    durationText="1 heure"
                    colorClass="bg-orange-950/30 hover:bg-orange-950/50"
                    borderClass="border-orange-500/30"
                    textClass="text-orange-300"
                    icon={TrendingDown}
                    disabled={sabotageLoading}
                    onClick={() => handleSabotage('disable_mine', selectedMine)}
                  />
                </div>
                <SabotageButton
                  label="Bloquer Construction"
                  description="Sabote le chantier spatial de la cible temporairement"
                  detectionText="Risque modéré"
                  durationText="30 min"
                  colorClass="bg-amber-950/30 hover:bg-amber-950/50"
                  borderClass="border-amber-500/30"
                  textClass="text-amber-300"
                  icon={Hammer}
                  disabled={sabotageLoading}
                  onClick={() => handleSabotage('jam_construction')}
                />
                <SabotageButton
                  label="Espionnage Industriel"
                  description="Vole des données techniques (-20% temps recherche suivante)"
                  detectionText="Risque élevé"
                  durationText="7 jours"
                  colorClass="bg-purple-950/30 hover:bg-purple-950/50"
                  borderClass="border-purple-500/30"
                  textClass="text-purple-300"
                  icon={BookOpen}
                  disabled={sabotageLoading}
                  onClick={() => handleSabotage('steal_tech')}
                />
              </div>

              {/* eff >= 2 */}
              {eff >= 2 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Disponible dès +2 avantage</p>
                  <SabotageButton
                    label="Vol de Crédits"
                    description="Détourne des Crédits Syndicat de la cible"
                    detectionText="Risque modéré"
                    durationText="Instantané"
                    colorClass="bg-yellow-950/30 hover:bg-yellow-950/50"
                    borderClass="border-yellow-500/30"
                    textClass="text-yellow-300"
                    icon={Coins}
                    disabled={sabotageLoading}
                    onClick={() => handleSabotage('steal_credits')}
                  />
                  <SabotageButton
                    label="Corruption Escadron"
                    description="Corrompt et détruit une partie de la flotte stationnée"
                    detectionText="Risque élevé"
                    durationText="Instantané"
                    colorClass="bg-rose-950/30 hover:bg-rose-950/50"
                    borderClass="border-rose-500/30"
                    textClass="text-rose-300"
                    icon={Skull}
                    disabled={sabotageLoading || !report.fleet || Object.values(report.fleet ?? {}).every(v => v === 0)}
                    onClick={() => handleSabotage('corrupt_fleet')}
                  />
                  <SabotageButton
                    label="Saboter Recherche"
                    description="Perturbe le laboratoire et retarde la recherche active"
                    detectionText="Risque élevé"
                    durationText="24h"
                    colorClass="bg-indigo-950/30 hover:bg-indigo-950/50"
                    borderClass="border-indigo-500/30"
                    textClass="text-indigo-300"
                    icon={FlaskConical}
                    disabled={sabotageLoading}
                    onClick={() => handleSabotage('sabotage_research')}
                  />
                </div>
              )}

              {/* eff >= 4 */}
              {eff >= 4 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Disponible dès +4 avantage</p>
                  <SabotageButton
                    label="Verrouillage Planète"
                    description="Verrouille toutes les opérations de la planète pendant 30 min"
                    detectionText="60% de détection"
                    durationText="30 min"
                    colorClass="bg-red-950/30 hover:bg-red-950/50"
                    borderClass="border-red-500/30"
                    textClass="text-red-300"
                    icon={Lock}
                    badge="60% détection"
                    disabled={sabotageLoading}
                    onClick={() => handleSabotage('planet_lock')}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-3 flex items-start gap-3">
              <Lock size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-red-400 mb-1">Avantage Technologique Insuffisant</div>
                <div className="text-[10px] text-red-300/70 leading-relaxed">
                  Votre niveau d'espionnage doit être supérieur d'au moins{' '}
                  <span className="font-bold text-red-300">+1 niveau</span> à la cible pour effectuer des sabotages.
                </div>
                <div className="mt-2 text-[10px] text-slate-400">
                  Avantage effectif actuel :{' '}
                  <span className={eff >= 0 ? 'text-amber-400' : 'text-red-400'}>{eff}</span>{' '}
                  (minimum requis : +1)
                </div>
              </div>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

// ─── Tab 3: Mes Opérations ─────────────────────────────────────────────────────

interface MesOpsTabProps {
  token: string;
}

function MesOpsTab({ token }: MesOpsTabProps) {
  const [sabotages, setSabotages] = useState<MySabotage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/sabotage/my-sabotages'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSabotages(data.sabotages || []);
      } else {
        toast.error('Erreur lors du chargement');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-cyan-400" />
      </div>
    );
  }

  const active = sabotages.filter(s => !s.was_detected);
  const detected = sabotages.filter(s => s.was_detected);

  const divider = (label: string, color: string) => (
    <div className="flex items-center gap-2 my-4">
      <div className={`h-px flex-1 bg-gradient-to-r from-transparent via-${color}-500/30 to-transparent`} />
      <span className={`text-[10px] font-black uppercase tracking-[0.3em] text-${color}-400`}>{label}</span>
      <div className={`h-px flex-1 bg-gradient-to-r from-transparent via-${color}-500/30 to-transparent`} />
    </div>
  );

  if (sabotages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Eye size={48} className="text-slate-700 mb-4 opacity-40" />
        <p className="text-slate-500 font-bold uppercase tracking-wider text-sm">Aucune opération active</p>
        <p className="text-slate-600 text-xs mt-2 font-mono">Effectuez un espionnage puis saboter vos ennemis !</p>
      </div>
    );
  }

  const SabotageCard = ({ s }: { s: MySabotage }) => {
    const EffIcon = getEffectIcon(s.effect_type);
    const border = s.was_detected ? 'border-red-500/30' : 'border-emerald-500/30';
    const shadow = s.was_detected ? 'shadow-[0_0_15px_rgba(239,68,68,0.08)]' : 'shadow-[0_0_15px_rgba(16,185,129,0.08)]';
    return (
      <div className={`bg-[rgba(5,0,15,0.7)] border ${border} rounded-xl p-4 ${shadow} hover:-translate-y-0.5 transition-all duration-300`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-full shrink-0 ${s.was_detected ? 'bg-red-500/15 border border-red-500/20' : 'bg-emerald-500/15 border border-emerald-500/20'}`}>
              <Target size={16} className={s.was_detected ? 'text-red-400' : 'text-emerald-400'} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-200 truncate">{s.target_planet_name}</div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${s.was_detected ? 'bg-red-500/15 text-red-300 border border-red-500/20' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'}`}>
                  {s.was_detected ? 'Détectée' : 'Succès'}
                </span>
                {s.casus_belli_granted && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-yellow-500/15 text-yellow-300 border border-yellow-500/20">
                    CB accordé
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 bg-[rgba(5,0,15,0.6)] border border-white/5 rounded-lg px-2.5 py-1.5">
            <Clock size={11} className="text-slate-500" />
            <span className="font-mono text-xs text-slate-300 tabular-nums">{formatTimeUntil(s.expires_at)}</span>
          </div>
        </div>

        <div className={`flex items-center gap-2 mt-3 p-2 rounded-lg ${s.was_detected ? 'bg-red-950/20 border border-red-500/10' : 'bg-[rgba(5,0,15,0.4)] border border-white/5'}`}>
          <EffIcon size={14} className={s.was_detected ? 'text-red-400' : 'text-emerald-400'} />
          <span className={`text-xs font-bold ${s.was_detected ? 'text-red-300' : 'text-emerald-300'}`}>
            {getEffectLabel(s.effect_type)}
          </span>
          {s.effect_type === 'disable_mine' && s.metadata?.mine && (
            <span className="text-[10px] text-slate-500">• {getMineLabel(s.metadata.mine)}</span>
          )}
          <span className="text-[10px] text-slate-500 ml-auto">{getEffectDescription(s.effect_type)}</span>
        </div>

        {s.was_detected && (
          <div className="mt-2 flex items-start gap-2 p-2 bg-yellow-950/20 border border-yellow-500/20 rounded-lg">
            <Zap size={12} className="text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-yellow-200/80 leading-relaxed">
              <span className="font-bold text-yellow-300">Casus Belli accordé</span> — La cible peut vous attaquer sans pénalité pendant 48h
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[rgba(5,0,15,0.6)] border border-cyan-500/10 rounded-lg p-3 text-center">
          <div className="text-lg font-black tabular-nums text-slate-200">{sabotages.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total</div>
        </div>
        <div className="bg-[rgba(5,0,15,0.6)] border border-emerald-500/15 rounded-lg p-3 text-center">
          <div className="text-lg font-black tabular-nums text-emerald-300">{active.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Réussies</div>
        </div>
        <div className="bg-[rgba(5,0,15,0.6)] border border-red-500/15 rounded-lg p-3 text-center">
          <div className="text-lg font-black tabular-nums text-red-300">{detected.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Détectées</div>
        </div>
      </div>

      {active.length > 0 && (
        <>
          {divider('Opérations Réussies', 'emerald')}
          {active.map(s => <SabotageCard key={s.id} s={s} />)}
        </>
      )}
      {detected.length > 0 && (
        <>
          {divider('Opérations Détectées', 'red')}
          {detected.map(s => <SabotageCard key={s.id} s={s} />)}
        </>
      )}
    </div>
  );
}

// ─── Tab 4: Sécurité ──────────────────────────────────────────────────────────

interface SecuriteTabProps {
  token: string;
}

function SecuriteTab({ token }: SecuriteTabProps) {
  const [suffered, setSuffered] = useState<SufferedSabotage[]>([]);
  const [casusBelli, setCasusBelli] = useState<CasusBelli[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'expired' | 'all'>('active');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resS, resCB] = await Promise.all([
        fetch(apiUrl('/sabotage/suffered'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl('/casus-belli/active'), { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (resS.ok) {
        const d = await resS.json();
        setSuffered(d.sabotages || []);
      }
      if (resCB.ok) {
        const d = await resCB.json();
        setCasusBelli(d.casus_belli || []);
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-cyan-400" />
      </div>
    );
  }

  const filteredSuffered = suffered.filter(s => {
    if (filter === 'active') return s.is_active;
    if (filter === 'expired') return !s.is_active;
    return true;
  });

  const detectedSaboteurs = filteredSuffered.filter(s => s.was_detected);
  const undetectedSaboteurs = filteredSuffered.filter(s => !s.was_detected);

  const totalSuffered = suffered.length;
  const activeSuffered = suffered.filter(s => s.is_active).length;
  const detectedCount = suffered.filter(s => s.was_detected).length;
  const detectionRate = totalSuffered > 0 ? Math.round((detectedCount / totalSuffered) * 100) : 0;

  const tensionConfig: Record<number, { label: string; color: string; border: string; pulse: boolean }> = {
    1: { label: 'TENSION',  color: 'text-yellow-400', border: 'border-yellow-500/30', pulse: false },
    2: { label: 'CONFLIT',  color: 'text-orange-400', border: 'border-orange-500/30', pulse: false },
    3: { label: 'GUERRE',   color: 'text-red-400',    border: 'border-red-500/30',    pulse: true  },
  };

  return (
    <div className="space-y-8">
      {/* ── Sous-section A : Sabotages Subis ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-[3px] h-6 rounded-full bg-gradient-to-b from-orange-400 to-transparent flex-shrink-0" />
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">Sabotages Subis</h3>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[rgba(5,0,15,0.6)] border border-orange-500/10 rounded-lg p-3 text-center">
            <div className="text-lg font-black tabular-nums text-slate-200">{totalSuffered}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Tentatives</div>
          </div>
          <div className="bg-[rgba(5,0,15,0.6)] border border-red-500/10 rounded-lg p-3 text-center">
            <div className="text-lg font-black tabular-nums text-red-300">{activeSuffered}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Actifs</div>
          </div>
          <div className="bg-[rgba(5,0,15,0.6)] border border-emerald-500/10 rounded-lg p-3 text-center">
            <div className="text-lg font-black tabular-nums text-emerald-300">{detectionRate}%</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Détectés</div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 border-b border-white/5 pb-1">
          {(['active', 'expired', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border-b-2 -mb-px ${
                filter === f
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-slate-600 hover:text-slate-400'
              }`}
            >
              {f === 'active' ? `Actifs (${activeSuffered})` : f === 'expired' ? `Expirés (${totalSuffered - activeSuffered})` : `Tous (${totalSuffered})`}
            </button>
          ))}
        </div>

        {filteredSuffered.length === 0 ? (
          <div className="text-center py-10">
            <ShieldAlert size={36} className="text-slate-700 mx-auto mb-3 opacity-40" />
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">
              {filter === 'active' ? 'Aucun sabotage actif' : 'Aucun sabotage'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {detectedSaboteurs.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400">Saboteurs Identifiés ({detectedSaboteurs.length})</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                </div>
                {detectedSaboteurs.map(s => {
                  const EffIcon = getEffectIcon(s.effect_type);
                  return (
                    <div key={s.id} className="bg-[rgba(5,0,15,0.7)] border border-emerald-500/25 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/20">
                            <User size={14} className="text-emerald-400" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-200">{s.attacker_username ?? 'Saboteur Inconnu'}</div>
                            <div className="flex gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 text-[9px] rounded uppercase font-black tracking-wider">
                                Identifié
                              </span>
                              {s.target_planet_name && (
                                <span className="text-[9px] text-slate-500 font-mono">• {s.target_planet_name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[rgba(5,0,15,0.6)] border border-white/5 rounded-lg px-2 py-1">
                          <Clock size={11} className="text-slate-500" />
                          <span className="font-mono text-xs text-slate-300">{s.is_active ? formatTimeUntil(s.expires_at) : 'Expiré'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-[rgba(5,0,15,0.4)] border border-white/5 p-2 rounded-lg">
                        <EffIcon size={13} className="text-orange-400" />
                        <span className="text-xs font-bold text-orange-300">{getEffectLabel(s.effect_type)}</span>
                        <span className="text-[10px] text-slate-500">• {getEffectDescription(s.effect_type)}</span>
                      </div>
                      <div className="mt-2 flex items-start gap-2 p-2 bg-yellow-950/15 border border-yellow-500/15 rounded-lg">
                        <Zap size={11} className="text-yellow-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-yellow-200/70">
                          <span className="font-bold text-yellow-300">Casus Belli accordé</span> — Vous pouvez attaquer ce joueur sans pénalité
                        </p>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {undetectedSaboteurs.length > 0 && (
              <>
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-red-400">Non Détectés ({undetectedSaboteurs.length})</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
                </div>
                {undetectedSaboteurs.map(s => {
                  const EffIcon = getEffectIcon(s.effect_type);
                  return (
                    <div key={s.id} className="bg-[rgba(5,0,15,0.7)] border border-red-500/25 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="relative p-1.5 rounded-full bg-red-500/15 border border-red-500/20">
                            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
                            <User size={14} className="text-red-400 relative z-10" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-400">Saboteur Inconnu</div>
                            <div className="flex gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.5 bg-red-500/15 border border-red-500/20 text-red-300 text-[9px] rounded uppercase font-black tracking-wider">Infiltré</span>
                              {s.target_planet_name && (
                                <span className="text-[9px] text-slate-500 font-mono">• {s.target_planet_name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[rgba(5,0,15,0.6)] border border-white/5 rounded-lg px-2 py-1">
                          <Clock size={11} className="text-slate-500" />
                          <span className="font-mono text-xs text-slate-300">{s.is_active ? formatTimeUntil(s.expires_at) : 'Expiré'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-red-950/20 border border-red-500/10 p-2 rounded-lg">
                        <EffIcon size={13} className="text-red-400" />
                        <span className="text-xs font-bold text-red-300">{getEffectLabel(s.effect_type)}</span>
                        <span className="text-[10px] text-slate-500">• {getEffectDescription(s.effect_type)}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Sous-section B : Casus Belli ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-[3px] h-6 rounded-full bg-gradient-to-b from-red-400 to-transparent flex-shrink-0" />
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">Casus Belli Actifs</h3>
          <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[9px] font-mono text-red-300">
            {casusBelli.length} droit{casusBelli.length !== 1 ? 's' : ''}
          </span>
        </div>

        {casusBelli.length === 0 ? (
          <div className="text-center py-10">
            <Swords size={36} className="text-slate-700 mx-auto mb-3 opacity-40" />
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Aucun Casus Belli actif</p>
            <p className="text-slate-600 text-xs mt-2 font-mono">Les CB sont accordés quand vos ennemis sont pris en flagrant délit.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-yellow-950/20 border border-yellow-500/25 rounded-xl">
              <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-yellow-300 mb-0.5 uppercase tracking-wider">Droit de Représailles</p>
                <p className="text-[10px] text-yellow-200/70 leading-relaxed">
                  Vous pouvez attaquer ces joueurs sans pénalité. Ces droits expirent après <span className="font-bold text-yellow-300">48 heures</span> ou après utilisation.
                </p>
              </div>
            </div>

            {casusBelli.map(cb => {
              const tension = cb.tension_level ?? 1;
              const tc = tensionConfig[tension] ?? tensionConfig[1];
              const usesRemaining = cb.uses_remaining ?? 1;
              const isMultiUse = cb.is_multi_use ?? false;
              const isActive = !cb.was_used && usesRemaining > 0;

              return (
                <div
                  key={cb.id}
                  className="bg-[rgba(5,0,15,0.7)] border border-red-500/25 rounded-xl p-4 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative p-1.5 rounded-full bg-red-500/15 border border-red-500/20">
                        <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
                        <User size={14} className="text-red-400 relative z-10" />
                      </div>
                      <div>
                        <div className="text-base font-black text-slate-100">{cb.aggressor_username}</div>
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.5 bg-red-500/15 border border-red-500/20 text-red-300 text-[9px] rounded uppercase font-black">
                            Cible Légale
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${tc.border} ${tc.color} ${tc.pulse ? 'animate-pulse' : ''}`}>
                            {tc.label}{tension === 3 ? ' ⚔' : ''}
                          </span>
                          {cb.cb_type && (
                            <span className="px-1.5 py-0.5 bg-slate-800/50 border border-slate-700/30 text-slate-400 text-[9px] rounded uppercase">
                              {getCbTypeLabel(cb.cb_type)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-1.5 bg-[rgba(5,0,15,0.6)] border border-white/5 rounded-lg px-2 py-1">
                        <Clock size={11} className="text-slate-500" />
                        <span className="font-mono text-xs text-slate-300">{formatTimeUntil(cb.expires_at)}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800/50 text-slate-500 border border-slate-700/20'}`}>
                        {isActive ? 'Active' : 'Épuisée'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[rgba(5,0,15,0.4)] border border-white/5 rounded-lg p-2.5 mb-2">
                    <div className="flex items-start gap-2">
                      <Swords size={13} className="text-orange-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-bold text-orange-400 uppercase tracking-wider mb-0.5">Motif</p>
                        <p className="text-xs text-slate-300">{cb.reason}</p>
                      </div>
                    </div>
                  </div>

                  {isMultiUse && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <CheckCircle size={11} className="text-cyan-400" />
                      <span>
                        Charges :{' '}
                        <span className="font-mono font-bold text-cyan-300">
                          {usesRemaining >= 999 ? 'Illimité' : usesRemaining}
                        </span>
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-2 mt-2 bg-emerald-950/15 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Attaque autorisée sans pénalité</span>
                    </div>
                    <Swords size={13} className="text-emerald-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function IntelligenceView({
  currentPlanet,
  userPlanets: _userPlanets,
  token,
  onActionSuccess,
}: IntelligenceViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('operations');
  const [activeReport, setActiveReport] = useState<SpyReportV2 | null>(null);

  const handleReportReady = useCallback((report: SpyReportV2) => {
    setActiveReport(report);
    setActiveTab('rapport');
  }, []);

  const handleSabotageSuccess = useCallback(() => {
    onActionSuccess?.();
    setActiveReport(null);
  }, [onActionSuccess]);

  const tabs: { id: Tab; label: string; icon: LucideIconType }[] = [
    { id: 'operations', label: 'Opérations',    icon: ScanEye },
    { id: 'rapport',    label: 'Rapport Actif', icon: Eye },
    { id: 'mes-ops',    label: 'Mes Opérations', icon: Target },
    { id: 'securite',   label: 'Sécurité',      icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="relative bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] border border-cyan-500/10 rounded-xl p-6 overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <ScanEye size={140} />
        </div>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-purple-400">Centre d'Intelligence</span>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-slate-100">Intelligence</h1>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Planète active : <span className="text-slate-300">{currentPlanet.name}</span>
            </p>
          </div>
          {activeReport && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">Rapport disponible</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] border border-cyan-500/10 rounded-xl overflow-hidden">
        <div className="flex border-b border-cyan-500/10">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-200 relative ${
                  isActive
                    ? 'text-cyan-300 bg-cyan-500/5'
                    : 'text-slate-600 hover:text-slate-400 hover:bg-white/2'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-cyan-400' : ''} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden text-[9px]">{tab.label.split(' ')[0]}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-5 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {activeTab === 'operations' && (
                <OperationsTab
                  currentPlanet={currentPlanet}
                  token={token}
                  onReportReady={handleReportReady}
                />
              )}
              {activeTab === 'rapport' && (
                <RapportTab
                  report={activeReport}
                  token={token}
                  onSabotageSuccess={handleSabotageSuccess}
                />
              )}
              {activeTab === 'mes-ops' && (
                <MesOpsTab token={token} />
              )}
              {activeTab === 'securite' && (
                <SecuriteTab token={token} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
