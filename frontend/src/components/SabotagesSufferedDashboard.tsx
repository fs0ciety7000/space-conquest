import { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { ShieldAlert, Clock, User, Eye, TrendingDown, Zap, X, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SabotageSuffered {
  id: string;
  attacker_user_id: string;
  attacker_username: string;
  target_planet_id: string;
  target_planet_name: string;
  effect_type: 'disable_mine' | 'steal_tech';
  created_at: string;
  expires_at: string;
  was_detected: boolean;
  is_active: boolean;
}

interface SabotagesSufferedDashboardProps {
  token: string;
  onClose: () => void;
}

export function SabotagesSufferedDashboard({ token, onClose }: SabotagesSufferedDashboardProps) {
  const [sabotages, setSabotages] = useState<SabotageSuffered[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('active');

  const apiUrl = (path: string) => `http://localhost:8080${path}`;

  useEffect(() => {
    fetchSabotages();
  }, []);

  const fetchSabotages = async () => {
    try {
      const res = await fetch(apiUrl('/sabotage/suffered'), {
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

  const getEffectIcon = (type: string) => {
    if (type === 'disable_mine') return TrendingDown;
    if (type === 'steal_tech') return Eye;
    return Zap;
  };

  const getEffectLabel = (type: string) => {
    if (type === 'disable_mine') return 'Infrastructure Sabotée';
    if (type === 'steal_tech') return 'Espionnage Industriel';
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
        <Card className="bg-slate-950 border-orange-500/30 p-6 card-depth">
          <p className="text-cyan-400 animate-pulse font-mono text-sm">Chargement...</p>
        </Card>
      </div>
    );
  }

  // Filter sabotages
  const filteredSabotages = sabotages.filter(s => {
    if (filter === 'active') return s.is_active;
    if (filter === 'expired') return !s.is_active;
    return true;
  });

  const detectedSabotages = filteredSabotages.filter(s => s.was_detected);
  const undetectedSabotages = filteredSabotages.filter(s => !s.was_detected);

  // Stats
  const totalSabotages = sabotages.length;
  const activeSabotages = sabotages.filter(s => s.is_active).length;
  const detectedCount = sabotages.filter(s => s.was_detected).length;
  const detectionRate = totalSabotages > 0 ? Math.round((detectedCount / totalSabotages) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <Card className="bg-slate-950 border border-orange-500/30 w-full max-w-6xl max-h-[90vh] overflow-hidden card-depth shadow-[0_0_50px_rgba(249,115,22,0.2)] animate-slide-up">
        {/* Header */}
        <div className="relative border-b border-orange-500/30 p-6 bg-gradient-to-r from-orange-950/50 to-red-950/30 overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldAlert size={120} className="animate-pulse" />
          </div>

          <div className="relative z-10 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-400">Sécurité Planétaire</h3>
              </div>
              <h2 className="text-3xl font-black uppercase tracking-wider text-white">Sabotages Subis</h2>
              <p className="text-sm text-slate-400 mt-2 font-mono">
                {totalSabotages} tentative{totalSabotages !== 1 ? 's' : ''} totale{totalSabotages !== 1 ? 's' : ''} •
                <span className="text-red-400 ml-2">{activeSabotages} actif{activeSabotages !== 1 ? 's' : ''}</span> •
                <span className="text-emerald-400 ml-2">{detectionRate}% détectés</span>
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

        {/* Filter Tabs */}
        <div className="border-b border-white/5 px-6 pt-4 pb-0 bg-slate-900/30">
          <div className="flex gap-2">
            {[
              { id: 'active', label: 'Actifs', count: sabotages.filter(s => s.is_active).length },
              { id: 'expired', label: 'Expirés', count: sabotages.filter(s => !s.is_active).length },
              { id: 'all', label: 'Tous', count: sabotages.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 border-b-2 ${
                  filter === tab.id
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[calc(90vh-280px)] overflow-y-auto custom-scrollbar">
          {filteredSabotages.length === 0 ? (
            <div className="text-center py-16">
              <ShieldAlert className="w-20 h-20 text-slate-700 mx-auto mb-4 opacity-50" />
              <p className="text-slate-400 text-lg font-bold uppercase tracking-wider">
                {filter === 'active' ? 'Aucun sabotage actif' : filter === 'expired' ? 'Aucun sabotage expiré' : 'Aucun sabotage'}
              </p>
              <p className="text-slate-600 text-sm mt-3 font-mono">
                {totalSabotages === 0 ? 'Vos défenses sont intactes !' : 'Filtrez pour voir d\'autres sabotages'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Detected Sabotages (Casus Belli granted) */}
              {detectedSabotages.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
                      Saboteurs Détectés ({detectedSabotages.length})
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
                  </div>

                  <div className="space-y-4">
                    {detectedSabotages.map((sabotage) => {
                      const EffectIcon = getEffectIcon(sabotage.effect_type);
                      return (
                        <Card
                          key={sabotage.id}
                          className="bg-black/40 border border-emerald-500/30 overflow-hidden relative hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 card-depth shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                        >
                          <div className="absolute top-0 right-0 p-2 opacity-5">
                            <CheckCircle size={60} />
                          </div>
                          <CardContent className="p-4 relative z-10">
                            <div className="space-y-3">
                              {/* Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                                    <User className="w-5 h-5 text-emerald-400" />
                                  </div>
                                  <div>
                                    <span className="text-base font-bold text-white">
                                      {sabotage.attacker_username}
                                    </span>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[9px] rounded uppercase font-black tracking-wider">
                                        ✓ Détecté
                                      </span>
                                      <span className="text-[9px] text-slate-500 font-mono">
                                        • {sabotage.target_planet_name}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5">
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="font-mono text-white font-bold">
                                        {sabotage.is_active ? getTimeRemaining(sabotage.expires_at) : 'Expiré'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Effect */}
                              <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-2 border border-white/5">
                                <EffectIcon className="w-4 h-4 text-orange-400" />
                                <span className="text-xs font-bold text-orange-300">
                                  {getEffectLabel(sabotage.effect_type)}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  • {getEffectDescription(sabotage.effect_type)}
                                </span>
                              </div>

                              {/* Casus Belli Notice */}
                              <div className="bg-yellow-950/30 border border-yellow-500/30 rounded-lg p-2 flex items-start gap-2">
                                <Zap size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-yellow-200/80 leading-relaxed">
                                  <span className="font-bold text-yellow-300">Casus Belli accordé</span> — Vous pouvez attaquer ce joueur sans pénalité
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Undetected Sabotages (Still suffering) */}
              {undetectedSabotages.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-3 mt-6">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/30 to-transparent"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">
                      Sabotages Non Détectés ({undetectedSabotages.length})
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/30 to-transparent"></div>
                  </div>

                  <div className="space-y-4">
                    {undetectedSabotages.map((sabotage) => {
                      const EffectIcon = getEffectIcon(sabotage.effect_type);
                      return (
                        <Card
                          key={sabotage.id}
                          className="bg-black/40 border border-red-500/30 overflow-hidden relative hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 card-depth shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                        >
                          <div className="absolute top-0 right-0 p-2 opacity-5">
                            <AlertCircle size={60} />
                          </div>
                          <CardContent className="p-4 relative z-10">
                            <div className="space-y-3">
                              {/* Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-full bg-red-500/20 border border-red-500/30 relative">
                                    <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></div>
                                    <User className="w-5 h-5 text-red-400 relative z-10" />
                                  </div>
                                  <div>
                                    <span className="text-base font-bold text-slate-400">
                                      Saboteur Inconnu
                                    </span>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/30 text-red-300 text-[9px] rounded uppercase font-black tracking-wider">
                                        ⚠ Infiltré
                                      </span>
                                      <span className="text-[9px] text-slate-500 font-mono">
                                        • {sabotage.target_planet_name}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5">
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="font-mono text-white font-bold">
                                        {sabotage.is_active ? getTimeRemaining(sabotage.expires_at) : 'Expiré'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Effect */}
                              <div className="flex items-center gap-2 bg-red-950/30 rounded-lg p-2 border border-red-500/20">
                                <EffectIcon className="w-4 h-4 text-red-400" />
                                <span className="text-xs font-bold text-red-300">
                                  {getEffectLabel(sabotage.effect_type)}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  • {getEffectDescription(sabotage.effect_type)}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-orange-500/30 p-4 bg-slate-900/50">
          <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400 mb-3 border border-white/5">
            <span className="text-slate-300 font-bold">💡 Conseil :</span> Améliorez votre niveau d'espionnage pour augmenter vos chances de détecter les saboteurs et obtenir des Casus Belli !
          </div>
          <button
            onClick={onClose}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 uppercase tracking-widest text-sm card-depth hover:-translate-y-1 hover:shadow-lg"
          >
            Fermer
          </button>
        </div>
      </Card>
    </div>
  );
}
