import { useState, useEffect } from 'react';
import { apiUrl } from '@/config/api';
import { toast } from 'sonner';
import { Users, Star, Zap, TrendingUp, Filter, Sparkles, Crown, Award, Trophy } from 'lucide-react';

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

// ============================================================================
// CONSTANTS
// ============================================================================

const RARITY_COLORS = {
  common: 'from-gray-600/80 via-gray-700/80 to-gray-800/80 border-gray-500/60',
  uncommon: 'from-green-600/80 via-green-700/80 to-green-800/80 border-green-500/60',
  rare: 'from-blue-600/80 via-blue-700/80 to-blue-800/80 border-blue-500/60',
  epic: 'from-purple-600/80 via-purple-700/80 to-purple-800/80 border-purple-500/60',
  legendary: 'from-yellow-500/90 via-orange-600/90 to-red-600/90 border-yellow-400/80',
};

const RARITY_GLOW = {
  common: 'shadow-[0_0_15px_rgba(156,163,175,0.3)]',
  uncommon: 'shadow-[0_0_20px_rgba(34,197,94,0.4)]',
  rare: 'shadow-[0_0_25px_rgba(59,130,246,0.5)]',
  epic: 'shadow-[0_0_30px_rgba(168,85,247,0.6)]',
  legendary: 'shadow-[0_0_40px_rgba(251,191,36,0.8)] animate-pulse',
};

const RARITY_BG_GLOW = {
  common: 'bg-gray-500/10',
  uncommon: 'bg-green-500/10',
  rare: 'bg-blue-500/15',
  epic: 'bg-purple-500/20',
  legendary: 'bg-yellow-500/25',
};

const RARITY_LABELS = {
  common: 'Commun',
  uncommon: 'Peu commun',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

const RARITY_ICONS = {
  common: Star,
  uncommon: Award,
  rare: Sparkles,
  epic: Trophy,
  legendary: Crown,
};

const SPECIALIZATION_COLORS = {
  economy: 'text-emerald-400',
  military: 'text-red-400',
  research: 'text-purple-400',
};

const SPECIALIZATION_BG = {
  economy: 'bg-emerald-500/20 border-emerald-500/40',
  military: 'bg-red-500/20 border-red-500/40',
  research: 'bg-purple-500/20 border-purple-500/40',
};

const SPECIALIZATION_ICONS = {
  economy: '💰',
  military: '⚔️',
  research: '🔬',
};

const SPECIALIZATION_LABELS = {
  economy: 'Économie',
  military: 'Militaire',
  research: 'Recherche',
};

// ============================================================================
// COMPONENTS
// ============================================================================

function OfficerCard({
  officer,
  onRecruit,
  isRecruited = false,
  userOfficer,
}: {
  officer: OfficerTemplate;
  onRecruit?: (officer: OfficerTemplate) => void;
  isRecruited?: boolean;
  userOfficer?: UserOfficer;
}) {
  const rarityColor = RARITY_COLORS[officer.rarity];
  const rarityGlow = RARITY_GLOW[officer.rarity];
  const rarityBgGlow = RARITY_BG_GLOW[officer.rarity];
  const specColor = SPECIALIZATION_COLORS[officer.specialization];
  const specIcon = SPECIALIZATION_ICONS[officer.specialization];
  const specBg = SPECIALIZATION_BG[officer.specialization];
  const RarityIcon = RARITY_ICONS[officer.rarity];

  return (
    <div
      className={`relative bg-gradient-to-br ${rarityColor} backdrop-blur-md border-2 rounded-xl p-5 ${rarityGlow} hover:scale-105 hover:-translate-y-2 transition-all duration-500 group overflow-hidden card-depth animate-fade-in`}
    >
      {/* Effets de fond animés */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-30 ${rarityBgGlow} animate-pulse group-hover:opacity-40 transition-opacity`}></div>
        <div className={`absolute -left-10 -bottom-10 w-24 h-24 rounded-full blur-2xl opacity-20 ${rarityBgGlow} animate-pulse`} style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse"></div>
        </div>
      </div>

      {/* Badge de rareté */}
      <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-wider border border-white/20 flex items-center gap-1.5 shadow-lg z-10">
        <RarityIcon size={12} className="animate-pulse" />
        {RARITY_LABELS[officer.rarity]}
      </div>

      {/* Badge actif */}
      {isRecruited && userOfficer?.is_active && (
        <div className="absolute top-3 left-3 px-3 py-1.5 bg-emerald-600/90 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10 animate-pulse">
          <span className="flex items-center gap-1">
            <Zap size={12} className="drop-shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
            Actif
          </span>
        </div>
      )}

      {/* Image de l'officier */}
      <div className="flex justify-center mb-5 relative z-10">
        <div className="relative group-hover:scale-110 transition-transform duration-500">
          <div className={`absolute inset-0 ${rarityBgGlow} blur-xl animate-pulse`}></div>
          <img
            src={`/officers/${officer.image_type}.svg`}
            alt={officer.name}
            className="w-36 h-36 drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] relative z-10"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/officers/engineer.svg';
            }}
          />
        </div>
      </div>

      {/* Nom et spécialisation */}
      <div className="text-center mb-4 relative z-10">
        <h3 className="text-xl font-black uppercase mb-2 tracking-wide drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] text-white">{officer.name}</h3>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold border ${specBg} shadow-inner`}>
          <span className="text-lg">{specIcon}</span>
          <span className={specColor}>{SPECIALIZATION_LABELS[officer.specialization]}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-200 mb-4 text-center italic leading-relaxed relative z-10 drop-shadow-md">
        {officer.description}
      </p>

      {/* Bonus */}
      <div className="bg-black/50 backdrop-blur-md rounded-xl p-3 mb-4 border border-white/20 shadow-inner relative z-10">
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
          <TrendingUp size={10} className="text-yellow-400" />
          Bonus de Performance
        </div>
        <div className="text-lg font-black text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
          {userOfficer
            ? `+${userOfficer.current_bonus.toFixed(1)}%`
            : `+${officer.base_bonus_value.toFixed(1)}%`}
        </div>
        <div className="text-[10px] text-gray-400 mt-1">
          +{officer.bonus_per_level.toFixed(1)}% par niveau
        </div>
      </div>

      {/* Niveau (pour officiers recrutés) */}
      {isRecruited && userOfficer && (
        <div className="mb-4 relative z-10">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-300 font-bold uppercase text-[10px] tracking-wider">Niveau</span>
            <span className="font-black text-white">
              {userOfficer.level} / {officer.max_level}
            </span>
          </div>
          <div className="relative w-full bg-gray-800/80 rounded-full h-3 border border-white/20 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 h-3 rounded-full transition-all duration-700 relative animate-gradient"
              style={{
                width: `${(userOfficer.level / officer.max_level) * 100}%`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {/* Coût de recrutement */}
      {!isRecruited && (
        <>
          <div className="space-y-2 mb-4 bg-black/40 rounded-xl p-3 border border-white/20 backdrop-blur-sm relative z-10">
            <div className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles size={10} className="text-yellow-400" />
              Coût de Recrutement
            </div>
            {officer.recruitment_cost_metal > 0 && (
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-300 font-semibold">Métal:</span>
                <span className="font-mono font-black text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.5)]">
                  {officer.recruitment_cost_metal.toLocaleString()}
                </span>
              </div>
            )}
            {officer.recruitment_cost_crystal > 0 && (
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-300 font-semibold">Cristal:</span>
                <span className="font-mono font-black text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.5)]">
                  {officer.recruitment_cost_crystal.toLocaleString()}
                </span>
              </div>
            )}
            {officer.recruitment_cost_deuterium > 0 && (
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-300 font-semibold">Deutérium:</span>
                <span className="font-mono font-black text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]">
                  {officer.recruitment_cost_deuterium.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Bouton de recrutement */}
          <button
            onClick={() => onRecruit && onRecruit(officer)}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-black py-3 px-4 rounded-lg transition-all duration-300 uppercase tracking-wider text-sm shadow-lg hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] hover:scale-105 border-2 border-blue-400/50 relative z-10 group/btn overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Users size={16} />
              Recruter
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
          </button>
        </>
      )}
    </div>
  );
}

export default function Officers() {
  const [templates, setTemplates] = useState<OfficerTemplate[]>([]);
  const [userOfficers, setUserOfficers] = useState<UserOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'economy' | 'military' | 'research'>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | OfficerTemplate['rarity']>('all');
  const [view, setView] = useState<'available' | 'recruited'>('available');

  const userId = localStorage.getItem('user_id');
  const token = localStorage.getItem('token');

  // Charger les templates et les officiers de l'utilisateur
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger les templates
      const templatesRes = await fetch(apiUrl('/officers/templates'));
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData);
      }

      // Charger les officiers recrutés
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
        loadData(); // Recharger les données
      } else {
        const error = await res.text();
        toast.error(`Échec du recrutement: ${error}`);
      }
    } catch (error) {
      console.error('Erreur recrutement:', error);
      toast.error('Erreur lors du recrutement');
    }
  };

  // Filtrer les templates
  const filteredTemplates = templates.filter((t) => {
    if (filter !== 'all' && t.specialization !== filter) return false;
    if (rarityFilter !== 'all' && t.rarity !== rarityFilter) return false;
    // Masquer les officiers déjà recrutés
    if (userOfficers.some((uo) => uo.template.id === t.id)) return false;
    return true;
  });

  // Filtrer les officiers recrutés
  const filteredUserOfficers = userOfficers.filter((uo) => {
    if (filter !== 'all' && uo.template.specialization !== filter) return false;
    if (rarityFilter !== 'all' && uo.template.rarity !== rarityFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="relative inline-block">
            <Users size={64} className="text-cyan-400 animate-pulse drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]" />
            <Users size={64} className="absolute inset-0 text-cyan-400 animate-ping opacity-30" />
          </div>
          <p className="text-xl font-black uppercase tracking-[0.2em] text-slate-400 mt-6">Chargement du Personnel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Effets de fond globaux */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 bg-cyan-500 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 bg-purple-500 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent animate-pulse"></div>
      </div>

      <div className="container mx-auto px-6 py-10 relative z-10">
        {/* En-tête immersif */}
        <div className="mb-10 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 blur-3xl"></div>
          <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-xl border-2 border-cyan-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-20 bg-cyan-400 animate-pulse"></div>
              <div className="absolute -left-20 -bottom-20 w-48 h-48 rounded-full blur-2xl opacity-15 bg-purple-400 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="relative">
                <Users size={48} className="text-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.8)] animate-pulse" />
                <Users size={48} className="absolute inset-0 text-cyan-400 animate-ping opacity-30" />
              </div>
              <div>
                <h1 className="text-5xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 drop-shadow-[0_0_30px_rgba(6,182,212,0.5)] mb-2 animate-gradient">
                  Officiers d'Élite
                </h1>
                <p className="text-gray-400 text-lg font-semibold">
                  Recrutez des héros légendaires pour dominer la galaxie
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets stylisés */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setView('available')}
            className={`relative px-8 py-4 rounded-xl font-black uppercase tracking-wider transition-all duration-300 overflow-hidden group ${
              view === 'available'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-[0_0_30px_rgba(99,102,241,0.6)] scale-105 border-2 border-blue-400/50'
                : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50 border-2 border-slate-700/50 hover:border-slate-600/50'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              <Star size={18} />
              Disponibles ({filteredTemplates.length})
            </span>
            {view === 'available' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            )}
          </button>
          <button
            onClick={() => setView('recruited')}
            className={`relative px-8 py-4 rounded-xl font-black uppercase tracking-wider transition-all duration-300 overflow-hidden group ${
              view === 'recruited'
                ? 'bg-gradient-to-r from-emerald-600 via-cyan-600 to-emerald-600 text-white shadow-[0_0_30px_rgba(16,185,129,0.6)] scale-105 border-2 border-emerald-400/50'
                : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50 border-2 border-slate-700/50 hover:border-slate-600/50'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              <Users size={18} />
              Mes Officiers ({userOfficers.length})
            </span>
            {view === 'recruited' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            )}
          </button>
        </div>

        {/* Filtres modernisés */}
        <div className="bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-xl border-2 border-slate-700/50 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-cyan-400" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Filtres de Recherche</h3>
          </div>
          <div className="flex flex-wrap gap-4">
            {/* Filtre spécialisation */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-2 font-bold uppercase tracking-wider">Spécialisation</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="w-full bg-slate-900/80 border-2 border-slate-700/50 rounded-lg px-4 py-3 font-semibold text-white hover:border-cyan-500/50 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
              >
                <option value="all">🌟 Toutes</option>
                <option value="economy">💰 Économie</option>
                <option value="military">⚔️ Militaire</option>
                <option value="research">🔬 Recherche</option>
              </select>
            </div>

            {/* Filtre rareté */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-2 font-bold uppercase tracking-wider">Rareté</label>
              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value as typeof rarityFilter)}
                className="w-full bg-slate-900/80 border-2 border-slate-700/50 rounded-lg px-4 py-3 font-semibold text-white hover:border-purple-500/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all outline-none"
              >
                <option value="all">✨ Toutes</option>
                <option value="common">⭐ Commun</option>
                <option value="uncommon">🌟 Peu commun</option>
                <option value="rare">💎 Rare</option>
                <option value="epic">👑 Épique</option>
                <option value="legendary">🏆 Légendaire</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grille d'officiers */}
        {view === 'available' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <div className="relative inline-block mb-4">
                  <Users size={64} className="text-slate-700 opacity-30" />
                </div>
                <p className="text-gray-500 text-lg font-bold uppercase tracking-wider">Aucun officier disponible avec ces filtres</p>
              </div>
            ) : (
              filteredTemplates.map((officer) => (
                <OfficerCard
                  key={officer.id}
                  officer={officer}
                  onRecruit={handleRecruit}
                />
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredUserOfficers.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <div className="relative inline-block mb-4">
                  <Users size={64} className="text-slate-700 opacity-30 animate-pulse" />
                  <Users size={64} className="absolute inset-0 text-slate-700 opacity-10 animate-ping" />
                </div>
                <p className="text-gray-500 text-lg font-bold uppercase tracking-wider">
                  {userOfficers.length === 0
                    ? "Vous n'avez pas encore recruté d'officiers"
                    : 'Aucun officier avec ces filtres'}
                </p>
              </div>
            ) : (
              filteredUserOfficers.map((userOfficer) => (
                <OfficerCard
                  key={userOfficer.id}
                  officer={userOfficer.template}
                  isRecruited={true}
                  userOfficer={userOfficer}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
