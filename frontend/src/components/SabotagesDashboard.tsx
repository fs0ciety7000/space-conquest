import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Shield, Clock, Target } from 'lucide-react';
import { toast } from 'sonner';

interface Sabotage {
  id: string;
  target_planet_id: string;
  target_planet_name: string;
  target_owner_id: string;
  effect_type: 'disable_mine' | 'steal_tech';
  created_at: string;
  expires_at: string;
  was_detected: boolean;
}

interface SabotagesDashboardProps {
  token: string;
  onClose: () => void;
}

export function SabotagesDashboard({ token, onClose }: SabotagesDashboardProps) {
  const [sabotages, setSabotages] = useState<Sabotage[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = (path: string) => `http://localhost:8080${path}`;

  useEffect(() => {
    fetchSabotages();
  }, []);

  const fetchSabotages = async () => {
    try {
      const res = await fetch(apiUrl('/sabotage/my-sabotages'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSabotages(data.sabotages || []);
      } else {
        toast.error('Erreur lors du chargement des sabotages');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;

    if (diff <= 0) return 'Expiré';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}min restantes`;
    }
    return `${minutes}min restantes`;
  };

  const getEffectLabel = (type: string) => {
    if (type === 'disable_mine') return '⚙️ Mine Désactivée';
    if (type === 'steal_tech') return '📖 Technologie Volée';
    return type;
  };

  const getEffectDescription = (type: string) => {
    if (type === 'disable_mine') return 'Production -50% pendant 1h';
    if (type === 'steal_tech') return 'Bonus recherche -20% (7 jours)';
    return '';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <Card className="bg-slate-900 border-indigo-500/30 p-6">
          <p className="text-cyan-400 animate-pulse">Chargement...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-slate-900 border-indigo-500/30 w-full max-w-4xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="border-b border-indigo-500/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-red-500" />
              <h2 className="text-2xl font-bold text-indigo-400">Mes Sabotages Actifs</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-red-400 transition-colors text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-slate-400 mt-2">
            {sabotages.length} sabotage{sabotages.length !== 1 ? 's' : ''} en cours
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {sabotages.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">Aucun sabotage actif</p>
              <p className="text-slate-500 text-sm mt-2">
                Effectuez un espionnage puis sabotez vos ennemis !
              </p>
            </div>
          ) : (
            sabotages.map((sabotage) => (
              <Card
                key={sabotage.id}
                className={`p-4 border ${
                  sabotage.was_detected
                    ? 'border-red-500/50 bg-red-950/20'
                    : 'border-emerald-500/50 bg-emerald-950/20'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left side - Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-orange-400" />
                      <span className="text-lg font-bold text-white">
                        {sabotage.target_planet_name}
                      </span>
                      {sabotage.was_detected && (
                        <span className="px-2 py-1 bg-red-600/20 border border-red-500 text-red-400 text-xs rounded uppercase font-bold">
                          🚨 Détecté
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-indigo-300 font-semibold">
                        {getEffectLabel(sabotage.effect_type)}
                      </span>
                      <span className="text-slate-400 text-sm">
                        • {getEffectDescription(sabotage.effect_type)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span>{getTimeRemaining(sabotage.expires_at)}</span>
                    </div>
                  </div>

                  {/* Right side - Status */}
                  <div className="text-right">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-bold ${
                        sabotage.was_detected
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {sabotage.was_detected ? 'ÉCHEC' : 'SUCCÈS'}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-indigo-500/30 p-6">
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </Card>
    </div>
  );
}
