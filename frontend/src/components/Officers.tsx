import { useState, useEffect } from 'react';
import { apiUrl } from '@/config/api';
import { toast } from 'sonner';
import {
  Users, Star, Zap, TrendingUp, Filter, Sparkles, Crown, Award, Trophy,
  AlertCircle, CheckCircle2, Loader2, Box, Gem, Droplets
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

interface OfficerTemplate {
  id: string;
  name: string;
  description: string;
  specialization: 'economy' | 'military' | 'research';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  bonus_type: string;
  base_bonus_value: number;
  bonus_per_level: number;
  max_level: number;
  image_type: string;
  recruitment_cost_metal: number;
  recruitment_cost_crystal: number;
  recruitment_cost_deuterium: number;
}

interface UserOfficer {
  id: string;
  template: OfficerTemplate;
  level: number;
  experience: number;
  is_active: boolean;
  recruited_at: string;
  current_bonus: number;
}

interface LevelUpCost {
  metal: number;
  crystal: number;
  deuterium: number;
  next_level: number;
  next_bonus: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RARITY_CONFIG = {
  common: {
    label: 'Commun',
    color: 'text-slate-400',
    border: 'border-slate-700/20',
    bg: 'bg-slate-500/5',
    glow: '',
    cardBg: 'bg-[rgba(10,5,32,0.85)]',
    icon: Star,
  },
  uncommon: {
    label: 'Peu commun',
    color: 'text-green-400',
    border: 'border-green-500/30',
    bg: 'bg-green-500/5',
    glow: 'shadow-[0_0_15px_rgba(34,197,94,0.15)]',
    cardBg: 'bg-[rgba(10,5,32,0.85)]',
    icon: Award,
  },
  rare: {
    label: 'Rare',
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.2)]',
    cardBg: 'bg-[rgba(10,5,32,0.85)]',
    icon: Sparkles,
  },
  epic: {
    label: 'Épique',
    color: 'text-purple-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/5',
    glow: 'shadow-[0_0_25px_rgba(168,85,247,0.25)]',
    cardBg: 'bg-[rgba(10,5,32,0.85)]',
    icon: Trophy,
  },
  legendary: {
    label: 'Légendaire',
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    glow: 'shadow-[0_0_30px_rgba(251,191,36,0.35)] animate-pulse',
    cardBg: 'bg-amber-500/5',
    icon: Crown,
  },
};

const SPEC_CONFIG = {
  economy: {
    label: 'Économie',
    color: 'text-emerald-400',
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/5',
    icon: '💰',
  },
  military: {
    label: 'Militaire',
    color: 'text-red-400',
    border: 'border-red-500/20',
    bg: 'bg-red-500/5',
    icon: '⚔️',
  },
  research: {
    label: 'Recherche',
    color: 'text-purple-400',
    border: 'border-purple-500/20',
    bg: 'bg-purple-500/5',
    icon: '🔬',
  },
};

// ============================================================================
// COMPONENTS
// ============================================================================

function OfficerCard({
  officer,
  onRecruit,
  onLevelUp,
  isRecruited = false,
  userOfficer,
  levelUpCost,
  loadingLevelUp = false,
}: {
  officer: OfficerTemplate;
  onRecruit?: (officer: OfficerTemplate) => void;
  onLevelUp?: (userOfficer: UserOfficer) => void;
  isRecruited?: boolean;
  userOfficer?: UserOfficer;
  levelUpCost?: LevelUpCost;
  loadingLevelUp?: boolean;
}) {
  const rarity = RARITY_CONFIG[officer.rarity];
  const spec = SPEC_CONFIG[officer.specialization];
  const RarityIcon = rarity.icon;

  // Inactive recruited officers get reduced opacity
  const isInactiveRecruited = isRecruited && userOfficer && !userOfficer.is_active;

  return (
    <Card className={`${rarity.cardBg} ${rarity.border} ${rarity.glow} border overflow-hidden relative group hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 backdrop-blur-[12px] ${isInactiveRecruited ? 'opacity-70' : ''}`}>

      {/* Background subtle effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className={`absolute top-0 right-0 w-32 h-32 ${rarity.bg} blur-3xl`} />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
      </div>

      <CardHeader className="pb-2 border-b border-cyan-500/10 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-slate-500">
            <RarityIcon size={12} className={rarity.color} />
            {rarity.label}
          </CardTitle>

          {isRecruited && userOfficer?.is_active && (
            <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-1">
              <Zap size={10} className="text-emerald-400" />
              <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Actif</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4 relative z-10">

        {/* Officer Image */}
        <div className="flex justify-center mb-4">
          <div className="relative group-hover:scale-105 transition-transform duration-500">
            <div className={`absolute inset-0 ${rarity.bg} blur-xl opacity-50`} />
            <img
              src={`/officers/${officer.image_type}.svg`}
              alt={officer.name}
              className="w-28 h-28 drop-shadow-2xl relative z-10"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/officers/engineer.svg';
              }}
            />
          </div>
        </div>

        {/* Name & Specialization */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-black uppercase text-slate-200 tracking-wide">{officer.name}</h3>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${spec.border} ${spec.bg}`}>
            <span className="text-sm">{spec.icon}</span>
            <span className={`text-xs font-bold ${spec.color} uppercase tracking-wider`}>{spec.label}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 text-center italic leading-relaxed">
          {officer.description}
        </p>

        {/* Bonus Stats */}
        <div className="bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-2 mb-2 pb-1 border-b border-cyan-500/10">
            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-cyan-500/70 flex items-center gap-1">
              <TrendingUp size={10} className="text-amber-400" />
              Bonus Performance
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-lg font-black ${rarity.color} font-mono tabular-nums`}>
              {userOfficer ? `+${userOfficer.current_bonus.toFixed(1)}%` : `+${officer.base_bonus_value.toFixed(1)}%`}
            </span>
            <div className="text-[9px] text-slate-500 font-mono tabular-nums">
              +{officer.bonus_per_level.toFixed(1)}% par niveau
            </div>
          </div>
        </div>

        {/* Level Progress (recruited officers) */}
        {isRecruited && userOfficer && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Niveau</span>
              <span className="text-sm font-black text-slate-200 font-mono tabular-nums">
                {userOfficer.level} / {officer.max_level}
              </span>
            </div>
            <div className="relative w-full bg-[rgba(10,5,32,0.85)] rounded-full h-1.5 border border-cyan-500/10 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-full rounded-full transition-all duration-700 relative shadow-[0_0_8px_rgba(0,245,255,0.5)]"
                style={{ width: `${(userOfficer.level / officer.max_level) * 100}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>

            {/* Level Up Section */}
            {userOfficer.level < officer.max_level && (
              <div className="mt-3 space-y-3">
                {levelUpCost && (
                  <div className="bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-1 pb-1 border-b border-cyan-500/10">
                      <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
                      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-500/70 flex items-center gap-1">
                        <TrendingUp size={10} className="text-cyan-400" />
                        Coût Level Up — Niv. {levelUpCost.next_level}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 flex items-center gap-1 font-semibold">
                        <Box size={10} className="text-orange-400" />
                        Métal
                      </span>
                      <span className="font-mono tabular-nums font-bold text-orange-400">
                        {Math.floor(levelUpCost.metal).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 flex items-center gap-1 font-semibold">
                        <Gem size={10} className="text-cyan-400" />
                        Cristal
                      </span>
                      <span className="font-mono tabular-nums font-bold text-cyan-400">
                        {Math.floor(levelUpCost.crystal).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 flex items-center gap-1 font-semibold">
                        <Droplets size={10} className="text-emerald-400" />
                        Deutérium
                      </span>
                      <span className="font-mono tabular-nums font-bold text-emerald-400">
                        {Math.floor(levelUpCost.deuterium).toLocaleString()}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-cyan-500/10 flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Nouveau bonus</span>
                      <span className={`font-mono tabular-nums font-bold ${rarity.color}`}>
                        +{levelUpCost.next_bonus.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  variant="default"
                  shine
                  onClick={() => onLevelUp && userOfficer && onLevelUp(userOfficer)}
                  disabled={loadingLevelUp}
                  className="w-full font-black uppercase tracking-wider text-sm h-10 disabled:opacity-50"
                >
                  {loadingLevelUp ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <TrendingUp size={16} />
                  )}
                  {loadingLevelUp ? 'Amélioration...' : 'Level Up'}
                </Button>
              </div>
            )}

            {userOfficer.level >= officer.max_level && (
              <div className="mt-3 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center justify-center gap-2">
                  <Crown size={14} />
                  Niveau Maximum Atteint
                </span>
              </div>
            )}
          </div>
        )}

        {/* Recruitment Cost */}
        {!isRecruited && (
          <div className="space-y-3">
            <div className="bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2 mb-1 pb-1 border-b border-cyan-500/10">
                <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-500/70 flex items-center gap-1">
                  <Sparkles size={10} className="text-amber-400" />
                  Coût de Recrutement
                </span>
              </div>
              {officer.recruitment_cost_metal > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1 font-semibold">
                    <Box size={10} className="text-orange-400" />
                    Métal
                  </span>
                  <span className="font-mono tabular-nums font-bold text-orange-400">
                    {officer.recruitment_cost_metal.toLocaleString()}
                  </span>
                </div>
              )}
              {officer.recruitment_cost_crystal > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1 font-semibold">
                    <Gem size={10} className="text-cyan-400" />
                    Cristal
                  </span>
                  <span className="font-mono tabular-nums font-bold text-cyan-400">
                    {officer.recruitment_cost_crystal.toLocaleString()}
                  </span>
                </div>
              )}
              {officer.recruitment_cost_deuterium > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1 font-semibold">
                    <Droplets size={10} className="text-emerald-400" />
                    Deutérium
                  </span>
                  <span className="font-mono tabular-nums font-bold text-emerald-400">
                    {officer.recruitment_cost_deuterium.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <Button
              variant="success"
              onClick={() => onRecruit && onRecruit(officer)}
              className="w-full font-black uppercase tracking-wider text-sm h-10"
            >
              <Users size={16} />
              Recruter
            </Button>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export default function Officers() {
  const [templates, setTemplates] = useState<OfficerTemplate[]>([]);
  const [userOfficers, setUserOfficers] = useState<UserOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'economy' | 'military' | 'research'>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | OfficerTemplate['rarity']>('all');
  const [view, setView] = useState<'available' | 'recruited'>('available');
  const [levelUpCosts, setLevelUpCosts] = useState<Record<string, LevelUpCost>>({});
  const [loadingLevelUp, setLoadingLevelUp] = useState<string | null>(null);

  const userId = localStorage.getItem('user_id');
  const token = localStorage.getItem('token');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const templatesRes = await fetch(apiUrl('/officers/templates'));
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData);
      }

      if (userId) {
        const officersRes = await fetch(apiUrl(`/users/${userId}/officers`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (officersRes.ok) {
          const officersData = await officersRes.json();
          setUserOfficers(officersData);
        }
      }
    } catch (error) {
      console.error('Erreur chargement officiers:', error);
      toast.error('Erreur lors du chargement des officiers');
    } finally {
      setLoading(false);
    }
  };

  const loadLevelUpCosts = async (officers: UserOfficer[]) => {
    if (!userId || !token) return;

    const costs: Record<string, LevelUpCost> = {};
    for (const officer of officers) {
      if (officer.level < officer.template.max_level) {
        try {
          const res = await fetch(
            apiUrl(`/users/${userId}/officers/${officer.id}/levelup-cost`),
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.ok) {
            costs[officer.id] = await res.json();
          }
        } catch (error) {
          console.error('Erreur chargement coût level up:', error);
        }
      }
    }
    setLevelUpCosts(costs);
  };

  useEffect(() => {
    if (userOfficers.length > 0) {
      loadLevelUpCosts(userOfficers);
    }
  }, [userOfficers]);

  const handleLevelUp = async (userOfficer: UserOfficer) => {
    if (!userId || !token) {
      toast.error('Vous devez être connecté');
      return;
    }

    setLoadingLevelUp(userOfficer.id);
    try {
      const res = await fetch(
        apiUrl(`/users/${userId}/officers/${userOfficer.id}/levelup`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        const updatedOfficer = await res.json();
        toast.success(`${userOfficer.template.name} est passé au niveau ${updatedOfficer.level} !`);
        loadData();
      } else {
        const error = await res.text();
        toast.error(`Échec de l'amélioration: ${error}`);
      }
    } catch (error) {
      console.error('Erreur level up:', error);
      toast.error("Erreur lors de l'amélioration");
    } finally {
      setLoadingLevelUp(null);
    }
  };

  const handleRecruit = async (officer: OfficerTemplate) => {
    if (!userId || !token) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      const res = await fetch(apiUrl(`/users/${userId}/officers/recruit`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ officer_template_id: officer.id }),
      });

      if (res.ok) {
        toast.success(`${officer.name} a été recruté !`);
        loadData();
      } else {
        const error = await res.text();
        toast.error(`Échec du recrutement: ${error}`);
      }
    } catch (error) {
      console.error('Erreur recrutement:', error);
      toast.error('Erreur lors du recrutement');
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (filter !== 'all' && t.specialization !== filter) return false;
    if (rarityFilter !== 'all' && t.rarity !== rarityFilter) return false;
    if (userOfficers.some((uo) => uo.template.id === t.id)) return false;
    return true;
  });

  const filteredUserOfficers = userOfficers.filter((uo) => {
    if (filter !== 'all' && uo.template.specialization !== filter) return false;
    if (rarityFilter !== 'all' && uo.template.rarity !== rarityFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 size={64} className="text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Chargement du Personnel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">

      {/* Header */}
      <Card className="bg-[rgba(16,8,46,0.95)] border border-cyan-500/10 overflow-hidden relative shadow-[0_0_20px_rgba(6,182,212,0.08)] hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 backdrop-blur-[12px]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        </div>

        <CardHeader className="relative z-10 border-b border-cyan-500/10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Users size={48} className="text-cyan-400" />
              <div className="absolute inset-0 blur-xl bg-cyan-400/20" />
            </div>
            <div>
              <CardTitle className="text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                Officiers d'Élite
              </CardTitle>
              <p className="text-slate-400 text-sm font-semibold mt-1">
                Recrutez des héros légendaires pour dominer la galaxie
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* View Tabs */}
      <div className="flex gap-4">
        <Button
          variant={view === 'available' ? 'default' : 'secondary'}
          onClick={() => setView('available')}
          className="px-6 py-3 font-black uppercase tracking-wider"
        >
          <Star size={16} />
          Disponibles ({filteredTemplates.length})
        </Button>
        <Button
          variant={view === 'recruited' ? 'success' : 'secondary'}
          onClick={() => setView('recruited')}
          className="px-6 py-3 font-black uppercase tracking-wider"
        >
          <CheckCircle2 size={16} />
          Mes Officiers ({userOfficers.length})
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-[rgba(16,8,46,0.95)] border border-cyan-500/10 overflow-hidden backdrop-blur-[12px]">
        <CardHeader className="pb-2 border-b border-cyan-500/10">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70 flex items-center gap-2">
              <Filter size={14} className="text-cyan-400" />
              Filtres de Recherche
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[9px] text-slate-500 mb-2 font-bold uppercase tracking-wider">Spécialisation</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="w-full bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-cyan-500/30 focus:border-cyan-500/30 focus:ring-2 focus:ring-cyan-500/10 transition-all outline-none backdrop-blur-[12px]"
              >
                <option value="all">Toutes</option>
                <option value="economy">Économie</option>
                <option value="military">Militaire</option>
                <option value="research">Recherche</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-[9px] text-slate-500 mb-2 font-bold uppercase tracking-wider">Rareté</label>
              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value as typeof rarityFilter)}
                className="w-full bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-cyan-500/30 focus:border-cyan-500/30 focus:ring-2 focus:ring-cyan-500/10 transition-all outline-none backdrop-blur-[12px]"
              >
                <option value="all">Toutes</option>
                <option value="common">Commun</option>
                <option value="uncommon">Peu commun</option>
                <option value="rare">Rare</option>
                <option value="epic">Épique</option>
                <option value="legendary">Légendaire</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Officers Grid */}
      {view === 'available' ? (
        filteredTemplates.length === 0 ? (
          <Card className="bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 backdrop-blur-[12px]">
            <CardContent className="py-20 text-center">
              <AlertCircle size={64} className="text-slate-700 opacity-30 mx-auto mb-4" />
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">
                Aucun officier disponible avec ces filtres
              </p>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredTemplates.map((officer) => (
              <motion.div key={officer.id} variants={item}>
                <OfficerCard officer={officer} onRecruit={handleRecruit} />
              </motion.div>
            ))}
          </motion.div>
        )
      ) : (
        filteredUserOfficers.length === 0 ? (
          <Card className="bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 backdrop-blur-[12px]">
            <CardContent className="py-20 text-center">
              <Users size={64} className="text-slate-700 opacity-30 mx-auto mb-4 animate-pulse" />
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">
                {userOfficers.length === 0
                  ? "Vous n'avez pas encore recruté d'officiers"
                  : 'Aucun officier avec ces filtres'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredUserOfficers.map((userOfficer) => (
              <motion.div key={userOfficer.id} variants={item}>
                <OfficerCard
                  officer={userOfficer.template}
                  isRecruited={true}
                  userOfficer={userOfficer}
                  onLevelUp={handleLevelUp}
                  levelUpCost={levelUpCosts[userOfficer.id]}
                  loadingLevelUp={loadingLevelUp === userOfficer.id}
                />
              </motion.div>
            ))}
          </motion.div>
        )
      )}
    </div>
  );
}
