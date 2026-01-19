import { useState, useEffect } from 'react';
import { apiUrl } from '@/config/api';
import { toast } from 'sonner';

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
  common: 'from-gray-600 to-gray-700 border-gray-500',
  uncommon: 'from-green-600 to-green-700 border-green-500',
  rare: 'from-blue-600 to-blue-700 border-blue-500',
  epic: 'from-purple-600 to-purple-700 border-purple-500',
  legendary: 'from-yellow-500 to-orange-600 border-yellow-400',
};

const RARITY_GLOW = {
  common: 'shadow-gray-500/50',
  uncommon: 'shadow-green-500/50',
  rare: 'shadow-blue-500/50',
  epic: 'shadow-purple-500/50',
  legendary: 'shadow-yellow-500/50 animate-pulse',
};

const RARITY_LABELS = {
  common: 'Commun',
  uncommon: 'Peu commun',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

const SPECIALIZATION_COLORS = {
  economy: 'text-green-400',
  military: 'text-red-400',
  research: 'text-purple-400',
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
  const specColor = SPECIALIZATION_COLORS[officer.specialization];
  const specIcon = SPECIALIZATION_ICONS[officer.specialization];

  return (
    <div
      className={`relative bg-gradient-to-br ${rarityColor} border-2 rounded-lg p-4 shadow-lg ${rarityGlow} hover:scale-105 transition-transform`}
    >
      {/* Badge de rareté */}
      <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 rounded text-xs font-bold">
        {RARITY_LABELS[officer.rarity]}
      </div>

      {/* Image de l'officier */}
      <div className="flex justify-center mb-4">
        <img
          src={`/officers/${officer.image_type}.svg`}
          alt={officer.name}
          className="w-32 h-32"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/officers/engineer.svg';
          }}
        />
      </div>

      {/* Nom et spécialisation */}
      <div className="text-center mb-3">
        <h3 className="text-xl font-bold mb-1">{officer.name}</h3>
        <p className={`text-sm ${specColor} font-semibold`}>
          {specIcon} {SPECIALIZATION_LABELS[officer.specialization]}
        </p>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-300 mb-4 text-center italic">
        {officer.description}
      </p>

      {/* Bonus */}
      <div className="bg-black/30 rounded p-2 mb-4">
        <div className="text-xs text-gray-400 mb-1">Bonus</div>
        <div className="text-sm font-semibold text-yellow-400">
          {userOfficer
            ? `+${userOfficer.current_bonus.toFixed(1)}%`
            : `+${officer.base_bonus_value.toFixed(1)}% (Base)`}
        </div>
        <div className="text-xs text-gray-400">
          +{officer.bonus_per_level.toFixed(1)}% par niveau
        </div>
      </div>

      {/* Niveau (pour officiers recrutés) */}
      {isRecruited && userOfficer && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Niveau</span>
            <span className="font-bold">
              {userOfficer.level} / {officer.max_level}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{
                width: `${(userOfficer.level / officer.max_level) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Coût de recrutement */}
      {!isRecruited && (
        <>
          <div className="space-y-1 mb-4">
            <div className="text-xs text-gray-400">Coût de recrutement</div>
            {officer.recruitment_cost_metal > 0 && (
              <div className="flex justify-between text-sm">
                <span>Métal:</span>
                <span className="font-mono">
                  {officer.recruitment_cost_metal.toLocaleString()}
                </span>
              </div>
            )}
            {officer.recruitment_cost_crystal > 0 && (
              <div className="flex justify-between text-sm">
                <span>Cristal:</span>
                <span className="font-mono">
                  {officer.recruitment_cost_crystal.toLocaleString()}
                </span>
              </div>
            )}
            {officer.recruitment_cost_deuterium > 0 && (
              <div className="flex justify-between text-sm">
                <span>Deutérium:</span>
                <span className="font-mono">
                  {officer.recruitment_cost_deuterium.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Bouton de recrutement */}
          <button
            onClick={() => onRecruit && onRecruit(officer)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Recruter
          </button>
        </>
      )}

      {/* Badge actif */}
      {isRecruited && userOfficer?.is_active && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-green-600 rounded text-xs font-bold">
          ✓ Actif
        </div>
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
      <div className="flex items-center justify-center h-64">
        <div className="text-xl">Chargement des officiers...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">👥 Officiers & Héros</h1>
        <p className="text-gray-400">
          Recrutez des officiers d'élite pour obtenir des bonus permanents
        </p>
      </div>

      {/* Onglets */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setView('available')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            view === 'available'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Disponibles ({filteredTemplates.length})
        </button>
        <button
          onClick={() => setView('recruited')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            view === 'recruited'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Mes Officiers ({userOfficers.length})
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Filtre spécialisation */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Spécialisation</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
          >
            <option value="all">Toutes</option>
            <option value="economy">💰 Économie</option>
            <option value="military">⚔️ Militaire</option>
            <option value="research">🔬 Recherche</option>
          </select>
        </div>

        {/* Filtre rareté */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Rareté</label>
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value as typeof rarityFilter)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
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

      {/* Grille d'officiers */}
      {view === 'available' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full text-center text-gray-400 py-12">
              Aucun officier disponible avec ces filtres
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
            <div className="col-span-full text-center text-gray-400 py-12">
              {userOfficers.length === 0
                ? "Vous n'avez pas encore recruté d'officiers"
                : 'Aucun officier avec ces filtres'}
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
  );
}
