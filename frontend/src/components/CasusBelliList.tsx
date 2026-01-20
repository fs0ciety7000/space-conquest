import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Swords, Clock, User } from 'lucide-react';
import { toast } from 'sonner';

interface CasusBelli {
  id: string;
  aggressor_user_id: string;
  aggressor_username: string;
  reason: string;
  created_at: string;
  expires_at: string;
  was_used: boolean;
}

interface CasusBelliListProps {
  token: string;
  onClose: () => void;
}

export function CasusBelliList({ token, onClose }: CasusBelliListProps) {
  const [casusBelli, setCasusBelli] = useState<CasusBelli[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = (path: string) => `http://localhost:8080${path}`;

  useEffect(() => {
    fetchCasusBelli();
  }, []);

  const fetchCasusBelli = async () => {
    try {
      const res = await fetch(apiUrl('/casus-belli/active'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setCasusBelli(data.casus_belli || []);
      } else {
        toast.error('Erreur lors du chargement des casus belli');
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

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}j ${remainingHours}h restantes`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}min restantes`;
    }
    return `${minutes}min restantes`;
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
      <Card className="bg-slate-900 border-red-500/30 w-full max-w-4xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="border-b border-red-500/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Swords className="w-6 h-6 text-red-500" />
              <h2 className="text-2xl font-bold text-red-400">Casus Belli - Droits d'Attaque</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-red-400 transition-colors text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-slate-400 mt-2">
            Vous avez {casusBelli.length} droit{casusBelli.length !== 1 ? 's' : ''} d'attaque légitime
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {casusBelli.length === 0 ? (
            <div className="text-center py-12">
              <Swords className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">Aucun Casus Belli actif</p>
              <p className="text-slate-500 text-sm mt-2">
                Les Casus Belli sont accordés quand vos ennemis sont pris en flagrant délit de sabotage.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-yellow-950/30 border border-yellow-600/50 rounded-lg p-4 mb-6">
                <p className="text-yellow-300 text-sm">
                  ⚔️ <strong>Casus Belli</strong> : Vous pouvez attaquer ces joueurs sans pénalité.
                  Ces droits expirent après 48h ou après utilisation.
                </p>
              </div>

              {casusBelli.map((cb) => (
                <Card
                  key={cb.id}
                  className="p-4 border border-red-500/50 bg-gradient-to-br from-red-950/20 to-orange-950/20 hover:border-red-400/70 transition-colors"
                >
                  <div className="space-y-3">
                    {/* Target */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-red-400" />
                        <span className="text-xl font-bold text-white">
                          {cb.aggressor_username}
                        </span>
                        <span className="px-2 py-1 bg-red-600/30 border border-red-500 text-red-300 text-xs rounded uppercase font-bold">
                          🎯 CIBLE LÉGALE
                        </span>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                      <p className="text-sm text-slate-300">
                        <span className="text-orange-400 font-semibold">Raison :</span> {cb.reason}
                      </p>
                    </div>

                    {/* Time remaining */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>{getTimeRemaining(cb.expires_at)}</span>
                      </div>
                      <div className="text-emerald-400 font-semibold">
                        ✓ Attaque autorisée
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-red-500/30 p-6 space-y-3">
          <div className="bg-slate-800/50 rounded-lg p-3 text-sm text-slate-400">
            💡 <strong>Astuce :</strong> Les Casus Belli vous permettent d'attaquer sans risque de pénalité.
            Utilisez-les stratégiquement avant qu'ils n'expirent !
          </div>
          <button
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </Card>
    </div>
  );
}
