import { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Swords, Clock, User, Target, AlertTriangle, X } from 'lucide-react';
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
      return `${days}j ${remainingHours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <Card className="bg-slate-950 border-red-500/30 p-6 card-depth">
          <p className="text-cyan-400 animate-pulse font-mono text-sm">Chargement...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <Card className="bg-slate-950 border border-red-500/30 w-full max-w-5xl max-h-[90vh] overflow-hidden card-depth shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-slide-up">
        {/* Header */}
        <div className="relative border-b border-red-500/30 p-6 bg-gradient-to-r from-red-950/50 to-orange-950/30 overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Swords size={120} className="animate-pulse" />
          </div>

          <div className="relative z-10 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-red-400">Justice Militaire</h3>
              </div>
              <h2 className="text-3xl font-black uppercase tracking-wider text-white">Casus Belli</h2>
              <p className="text-sm text-slate-400 mt-2 font-mono">
                {casusBelli.length} droit{casusBelli.length !== 1 ? 's' : ''} d'attaque légitime disponible{casusBelli.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300 hover:scale-110 card-depth hover:shadow-lg text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[calc(90vh-280px)] overflow-y-auto custom-scrollbar">
          {casusBelli.length === 0 ? (
            <div className="text-center py-16">
              <Swords className="w-20 h-20 text-slate-700 mx-auto mb-4 opacity-50" />
              <p className="text-slate-400 text-lg font-bold uppercase tracking-wider">Aucun Casus Belli actif</p>
              <p className="text-slate-600 text-sm mt-3 font-mono">
                Les Casus Belli sont accordés quand vos ennemis sont pris en flagrant délit de sabotage.
              </p>
            </div>
          ) : (
            <>
              {/* Info Banner */}
              <div className="bg-yellow-950/30 border border-yellow-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
                <AlertTriangle size={20} className="text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-yellow-300 mb-1 uppercase tracking-wider">Droit de Représailles</p>
                  <p className="text-[10px] text-yellow-200/80 leading-relaxed">
                    Vous pouvez attaquer ces joueurs sans pénalité. Ces droits expirent après <span className="font-bold text-yellow-300">48 heures</span> ou après utilisation.
                  </p>
                </div>
              </div>

              {/* Casus Belli Cards */}
              <div className="space-y-4">
                {casusBelli.map((cb) => (
                  <Card
                    key={cb.id}
                    className="bg-black/40 border border-red-500/30 overflow-hidden relative hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 card-depth shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                      <Target size={80} />
                    </div>

                    <CardContent className="p-4 relative z-10">
                      <div className="space-y-4">
                        {/* Target Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-red-500/20 border border-red-500/30 relative">
                              <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></div>
                              <User className="w-5 h-5 text-red-400 relative z-10" />
                            </div>
                            <div>
                              <span className="text-xl font-black text-white">
                                {cb.aggressor_username}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/30 text-red-300 text-[9px] rounded uppercase font-black tracking-wider">
                                  🎯 Cible Légale
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Time Badge */}
                          <div className="text-right">
                            <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5">
                              <div className="flex items-center gap-1.5 text-xs">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-mono text-white font-bold">
                                  {getTimeRemaining(cb.expires_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Reason */}
                        <div className="bg-slate-900/50 rounded-lg p-3 border border-white/5">
                          <div className="flex items-start gap-2">
                            <Swords className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">
                                Motif du Casus Belli
                              </p>
                              <p className="text-sm text-slate-300 leading-relaxed">
                                {cb.reason}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Status Bar */}
                        <div className="flex items-center justify-between p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                              Attaque autorisée sans pénalité
                            </span>
                          </div>
                          <Swords className="w-4 h-4 text-emerald-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-red-500/30 p-4 bg-slate-900/50">
          <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400 mb-3 border border-white/5">
            <span className="text-slate-300 font-bold">💡 Astuce :</span> Les Casus Belli vous permettent d'attaquer sans risque de pénalité.
            Utilisez-les stratégiquement avant qu'ils n'expirent !
          </div>
          <button
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 uppercase tracking-widest text-sm card-depth hover:-translate-y-1 hover:shadow-lg"
          >
            Fermer
          </button>
        </div>
      </Card>
    </div>
  );
}
