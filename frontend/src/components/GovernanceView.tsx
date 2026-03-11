import { useState, useEffect, useCallback, memo } from 'react';
import { Scale, Clock, ChevronDown, ChevronRight, Check, X, Star } from 'lucide-react';
import { apiUrl } from '@/config/api';
import { formatTimeUntil } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface LawEffect {
  config_key: string;
  operation: 'multiply' | 'add' | 'set';
  delta: number;
  duration_hours?: number;
}

interface LawProposal {
  id: string;
  title: string;
  description: string;
  vote_start: string;
  vote_end: string;
  status: 'voting' | 'passed' | 'failed' | 'expired' | 'cancelled';
  effects: LawEffect[];
  yes_count: number;
  no_count: number;
  user_vote?: boolean | null;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  survey_type: 'yes_no' | 'multiple_choice' | 'rating';
  options: string[];
  starts_at: string;
  ends_at: string;
  status: 'active' | 'closed' | 'archived';
  user_answered?: boolean;
}

interface SurveyResults {
  survey_id: string;
  total_responses: number;
  breakdown: Record<string, number>;
}

// ─── Effect Utilities ─────────────────────────────────────────────────────────

const EFFECT_LABELS: Record<string, string> = {
  production_speed_multiplier: 'Production',
  building_speed_multiplier: 'Construction',
  research_speed_multiplier: 'Recherche',
  ship_build_speed_multiplier: 'Production vaisseaux',
  ship_build_rate: 'Taux construction vaisseaux',
  defense_build_rate: 'Taux construction défenses',
  expedition_syndicate_credit_chance: 'Crédits Syndicat (expéditions)',
};

function formatEffect(effect: LawEffect): string {
  const label = EFFECT_LABELS[effect.config_key] || effect.config_key;
  const op =
    effect.operation === 'multiply'
      ? `×${effect.delta}`
      : effect.operation === 'add'
      ? `+${effect.delta}`
      : `= ${effect.delta}`;
  const duration = effect.duration_hours
    ? ` pendant ${effect.duration_hours}h`
    : ' (permanent)';
  return `${label} ${op}${duration}`;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LawProposal['status'] }) {
  const config: Record<LawProposal['status'], { label: string; className: string }> = {
    voting: { label: 'VOTE EN COURS', className: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    passed: { label: 'ACTIVE', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    failed: { label: 'REJETÉE', className: 'bg-red-500/20 text-red-400 border-red-500/40' },
    expired: { label: 'EXPIRÉE', className: 'bg-slate-500/20 text-slate-400 border-slate-500/40' },
    cancelled: { label: 'ANNULÉE', className: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  };
  const c = config[status];
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${c.className}`}>
      {c.label}
    </span>
  );
}

// ─── Vote Bar ─────────────────────────────────────────────────────────────────

const VoteBar = memo(function VoteBar({
  yesCount,
  noCount,
}: {
  yesCount: number;
  noCount: number;
}) {
  const total = yesCount + noCount;
  const yesPct = total > 0 ? Math.round((yesCount / total) * 100) : 0;
  const noPct = 100 - yesPct;

  return (
    <div className="space-y-1">
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-800">
        {total > 0 ? (
          <>
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{ width: `${yesPct}%` }}
            />
            <div
              className="bg-red-500 transition-all duration-500"
              style={{ width: `${noPct}%` }}
            />
          </>
        ) : (
          <div className="w-full bg-slate-700 rounded-full" />
        )}
      </div>
      <div className="flex justify-between text-xs text-slate-400">
        <span className="text-emerald-400">
          POUR {yesPct}% ({yesCount})
        </span>
        <span className="text-slate-500">{total} votes</span>
        <span className="text-red-400">
          ({noCount}) {noPct}% CONTRE
        </span>
      </div>
    </div>
  );
});

// ─── Law Card ─────────────────────────────────────────────────────────────────

const LawCard = memo(function LawCard({
  law,
  token,
  onVoted,
}: {
  law: LawProposal;
  token: string;
  onVoted: (id: string, vote: boolean) => void;
}) {
  const [voting, setVoting] = useState(false);

  const handleVote = useCallback(
    async (vote: boolean) => {
      if (voting) return;
      setVoting(true);
      try {
        const res = await fetch(apiUrl(`/laws/${law.id}/vote`), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ vote }),
        });
        if (!res.ok) throw new Error('Erreur lors du vote');
        onVoted(law.id, vote);
        toast.success(vote ? 'Vote POUR enregistré' : 'Vote CONTRE enregistré');
      } catch (e) {
        toast.error('Impossible d\'enregistrer le vote');
      } finally {
        setVoting(false);
      }
    },
    [law.id, token, onVoted, voting]
  );

  const isVoting = law.status === 'voting';

  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white text-sm">{law.title}</h3>
            <StatusBadge status={law.status} />
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{law.description}</p>
        </div>
        {isVoting && (
          <div className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimeUntil(law.vote_end)}</span>
          </div>
        )}
      </div>

      {/* Effects */}
      {law.effects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {law.effects.map((effect, i) => (
            <span
              key={i}
              className="text-xs bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded"
            >
              {formatEffect(effect)}
            </span>
          ))}
        </div>
      )}

      {/* Vote bar (for voting + passed laws) */}
      {(isVoting || law.status === 'passed') && (
        <VoteBar yesCount={law.yes_count} noCount={law.no_count} />
      )}

      {/* Vote buttons or vote indicator */}
      {isVoting && (
        <div className="flex items-center gap-2">
          {law.user_vote === null || law.user_vote === undefined ? (
            <>
              <button
                onClick={() => handleVote(true)}
                disabled={voting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-3.5 h-3.5" />
                POUR
              </button>
              <button
                onClick={() => handleVote(false)}
                disabled={voting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-300 text-xs font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-3.5 h-3.5" />
                CONTRE
              </button>
            </>
          ) : (
            <div
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded border ${
                law.user_vote
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/40 text-red-300'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              Vous avez voté {law.user_vote ? 'POUR' : 'CONTRE'}
            </div>
          )}
        </div>
      )}

      {/* Active law expiry */}
      {law.status === 'passed' && (
        <p className="text-xs text-slate-500">
          Expire: {formatTimeUntil(law.vote_end) === 'Terminé' ? 'Loi permanente' : formatTimeUntil(law.vote_end)}
        </p>
      )}
    </div>
  );
});

// ─── Survey Results Display ───────────────────────────────────────────────────

const SurveyResultsDisplay = memo(function SurveyResultsDisplay({
  results,
  survey,
}: {
  results: SurveyResults;
  survey: Survey;
}) {
  const { total_responses, breakdown } = results;

  const getOptions = (): string[] => {
    if (survey.survey_type === 'yes_no') return ['Oui', 'Non'];
    if (survey.survey_type === 'rating') return ['1', '2', '3', '4', '5'];
    return survey.options;
  };

  const options = getOptions();

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">{total_responses} réponse{total_responses !== 1 ? 's' : ''}</p>
      {options.map((opt) => {
        const count = breakdown[opt] ?? 0;
        const pct = total_responses > 0 ? Math.round((count / total_responses) * 100) : 0;
        return (
          <div key={opt} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">{opt}</span>
              <span className="text-slate-400">
                {count} ({pct}%)
              </span>
            </div>
            <Progress value={pct} variant="default" className="h-2" />
          </div>
        );
      })}
    </div>
  );
});

// ─── Survey Card ──────────────────────────────────────────────────────────────

function SurveyCard({
  survey,
  token,
  onAnswered,
}: {
  survey: Survey;
  token: string;
  onAnswered: (id: string) => void;
}) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<SurveyResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  const isActive = survey.status === 'active';
  const showResults = !isActive || survey.user_answered;

  useEffect(() => {
    if (showResults) {
      setLoadingResults(true);
      fetch(apiUrl(`/surveys/${survey.id}`), {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setResults(data.results ?? data); })
        .catch(() => {})
        .finally(() => setLoadingResults(false));
    }
  }, [survey.id, token, showResults]);

  const handleSubmit = async () => {
    if (!selectedAnswer || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/surveys/${survey.id}/respond`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answer: selectedAnswer }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Réponse enregistrée');
      onAnswered(survey.id);
    } catch {
      toast.error('Impossible d\'enregistrer la réponse');
    } finally {
      setSubmitting(false);
    }
  };

  const renderResponseForm = () => {
    if (survey.survey_type === 'yes_no') {
      return (
        <div className="flex gap-2">
          {['Oui', 'Non'].map((opt) => (
            <button
              key={opt}
              onClick={() => setSelectedAnswer(opt)}
              className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                selectedAnswer === opt
                  ? opt === 'Oui'
                    ? 'bg-emerald-600/30 border-emerald-500/60 text-emerald-300'
                    : 'bg-red-600/30 border-red-500/60 text-red-300'
                  : 'bg-slate-800/60 border-white/10 text-slate-300 hover:border-white/20'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      );
    }

    if (survey.survey_type === 'multiple_choice') {
      return (
        <div className="space-y-1.5">
          {survey.options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <input
                type="radio"
                name={`survey-${survey.id}`}
                value={opt}
                checked={selectedAnswer === opt}
                onChange={() => setSelectedAnswer(opt)}
                className="accent-indigo-500"
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                {opt}
              </span>
            </label>
          ))}
        </div>
      );
    }

    if (survey.survey_type === 'rating') {
      return (
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setSelectedAnswer(String(n))}
              className={`w-9 h-9 rounded border text-sm font-bold transition-colors ${
                selectedAnswer === String(n)
                  ? 'bg-yellow-500/30 border-yellow-400/60 text-yellow-300'
                  : 'bg-slate-800/60 border-white/10 text-slate-300 hover:border-yellow-400/40'
              }`}
            >
              <Star
                className={`w-4 h-4 mx-auto ${
                  selectedAnswer !== '' && n <= Number(selectedAnswer)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-slate-500'
                }`}
              />
            </button>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white text-sm">{survey.title}</h3>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded border ${
                isActive
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-slate-500/20 text-slate-400 border-slate-500/40'
              }`}
            >
              {isActive ? 'EN COURS' : survey.status === 'closed' ? 'FERMÉ' : 'ARCHIVÉ'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{survey.description}</p>
        </div>
        {isActive && (
          <div className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimeUntil(survey.ends_at)}</span>
          </div>
        )}
      </div>

      {/* Response form or results */}
      {isActive && !survey.user_answered ? (
        <div className="space-y-3">
          {renderResponseForm()}
          <button
            onClick={handleSubmit}
            disabled={!selectedAnswer || submitting}
            className="px-4 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-xs font-bold rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Envoi...' : 'Soumettre'}
          </button>
        </div>
      ) : loadingResults ? (
        <p className="text-xs text-slate-500">Chargement des résultats...</p>
      ) : results ? (
        <SurveyResultsDisplay results={results} survey={survey} />
      ) : null}
    </div>
  );
}

// ─── Laws Panel ───────────────────────────────────────────────────────────────

function LawsPanel({ laws, token, onVoted }: { laws: LawProposal[]; token: string; onVoted: (id: string, vote: boolean) => void }) {
  const [archivesOpen, setArchivesOpen] = useState(false);

  const votingLaws = laws
    .filter((l) => l.status === 'voting')
    .sort((a, b) => new Date(a.vote_end).getTime() - new Date(b.vote_end).getTime());

  const activeLaws = laws.filter((l) => l.status === 'passed');

  const archivedLaws = laws.filter((l) =>
    ['failed', 'cancelled', 'expired'].includes(l.status)
  );

  return (
    <div className="space-y-6">
      {/* Vote en cours */}
      <section>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Vote en cours ({votingLaws.length})
        </h2>
        {votingLaws.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Aucun vote en cours</p>
        ) : (
          <div className="space-y-3">
            {votingLaws.map((law) => (
              <LawCard key={law.id} law={law} token={token} onVoted={onVoted} />
            ))}
          </div>
        )}
      </section>

      {/* Lois actives */}
      <section>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Lois actives ({activeLaws.length})
        </h2>
        {activeLaws.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Aucune loi active</p>
        ) : (
          <div className="space-y-3">
            {activeLaws.map((law) => (
              <LawCard key={law.id} law={law} token={token} onVoted={onVoted} />
            ))}
          </div>
        )}
      </section>

      {/* Archives */}
      <section>
        <button
          onClick={() => setArchivesOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 hover:text-slate-200 transition-colors"
        >
          {archivesOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          Archives ({archivedLaws.length})
        </button>
        {archivesOpen && (
          <div className="space-y-3">
            {archivedLaws.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Aucune loi archivée</p>
            ) : (
              archivedLaws.map((law) => (
                <LawCard key={law.id} law={law} token={token} onVoted={onVoted} />
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Surveys Panel ────────────────────────────────────────────────────────────

function SurveysPanel({ surveys, token, onAnswered }: { surveys: Survey[]; token: string; onAnswered: (id: string) => void }) {
  const activeSurveys = surveys.filter((s) => s.status === 'active');
  const closedSurveys = surveys.filter((s) => s.status !== 'active');

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Sondages en cours ({activeSurveys.length})
        </h2>
        {activeSurveys.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Aucun sondage en cours</p>
        ) : (
          <div className="space-y-3">
            {activeSurveys.map((survey) => (
              <SurveyCard key={survey.id} survey={survey} token={token} onAnswered={onAnswered} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          Résultats &amp; Archives ({closedSurveys.length})
        </h2>
        {closedSurveys.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Aucun sondage archivé</p>
        ) : (
          <div className="space-y-3">
            {closedSurveys.map((survey) => (
              <SurveyCard key={survey.id} survey={survey} token={token} onAnswered={onAnswered} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Main GovernanceView ──────────────────────────────────────────────────────

export function GovernanceView({
  token,
  currentPlanet,
}: {
  token: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentPlanet: Record<string, any> | null;
}) {
  const [activeTab, setActiveTab] = useState<'laws' | 'surveys'>('laws');
  const [laws, setLaws] = useState<LawProposal[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    setLoading(true);
    Promise.all([
      fetch(apiUrl('/laws'), { headers }).then((r) => r.ok ? r.json() : { laws: [] }),
      fetch(apiUrl('/surveys'), { headers }).then((r) => r.ok ? r.json() : { surveys: [] }),
    ])
      .then(([lawsData, surveysData]) => {
        setLaws(Array.isArray(lawsData.laws) ? lawsData.laws : []);
        setSurveys(Array.isArray(surveysData.surveys) ? surveysData.surveys : []);
      })
      .catch(() => {
        toast.error('Impossible de charger les données de gouvernance');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleVoted = useCallback((id: string, vote: boolean) => {
    setLaws((prev) =>
      prev.map((l) => (l.id === id ? { ...l, user_vote: vote } : l))
    );
  }, []);

  const handleAnswered = useCallback((id: string) => {
    setSurveys((prev) =>
      prev.map((s) => (s.id === id ? { ...s, user_answered: true } : s))
    );
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Scale className="w-8 h-8 text-yellow-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Sénat Galactique</h1>
          <p className="text-xs text-slate-400">Démocratie spatiale — Participez aux décisions de l'empire</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 border-b border-white/10 pb-0">
        {(['laws', 'surveys'] as const).map((tab) => {
          const labels = { laws: 'Lois & Votes', surveys: 'Sondages' };
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-yellow-400 text-yellow-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
          Chargement...
        </div>
      ) : (
        <>
          {activeTab === 'laws' && (
            <LawsPanel laws={laws} token={token} onVoted={handleVoted} />
          )}
          {activeTab === 'surveys' && (
            <SurveysPanel surveys={surveys} token={token} onAnswered={handleAnswered} />
          )}
        </>
      )}
    </div>
  );
}

export default GovernanceView;
