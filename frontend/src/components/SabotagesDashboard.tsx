import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Shield, Clock, Target, Eye, TrendingDown, Zap, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiUrl } from '@/config/api';

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
        <Card className="bg-slate-950 border-indigo-500/30 p-6 card-depth">
          <p className="text-cyan-400 animate-pulse font-mono text-sm">Chargement...</p>
        </Card>
      </div>
    );
  }

  const successfulSabotages = sabotages.filter(s => !s.was_detected);
  const detectedSabotages = sabotages.filter(s => s.was_detected);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <Card className="bg-slate-950 border border-indigo-500/30 w-full max-w-5xl max-h-[90vh] overflow-hidden card-depth shadow-[0_0_50px_rgba(99,102,241,0.2)] animate-slide-up">
        {/* Header */}
        <div className="relative border-b border-indigo-500/30 p-6 bg-gradient-to-r from-indigo-950/50 to-purple-950/30 overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Shield size={120} className="animate-pulse" />
          </div>

          <div className="relative z-10 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-indigo-400">Opérations Clandestines</h3>
              </div>
              <h2 className="text-3xl font-black uppercase tracking-wider text-white">Mes Sabotages</h2>
              <p className="text-sm text-slate-400 mt-2 font-mono">
                {sabotages.length} opération{sabotages.length !== 1 ? 's' : ''} active{sabotages.length !== 1 ? 's' : ''} •
                <span className="text-emerald-400 ml-2">{successfulSabotages.length} réussie{successfulSabotages.length !== 1 ? 's' : ''}</span> •
                <span className="text-red-400 ml-2">{detectedSabotages.length} détectée{detectedSabotages.length !== 1 ? 's' : ''}</span>
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
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto custom-scrollbar">
          {sabotages.length === 0 ? (
            <div className="text-center py-16">
              <Shield className="w-20 h-20 text-slate-700 mx-auto mb-4 opacity-50" />
              <p className="text-slate-400 text-lg font-bold uppercase tracking-wider">Aucun sabotage actif</p>
              <p className="text-slate-600 text-sm mt-3 font-mono">
                Effectuez un espionnage puis sabotez vos ennemis !
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Successful Sabotages */}
              {successfulSabotages.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Opérations Réussies</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
                  </div>

                  {successfulSabotages.map((sabotage) => {
                    const EffectIcon = getEffectIcon(sabotage.effect_type);
                    return (
                      <Card
                        key={sabotage.id}
                        className="bg-black/40 border border-emerald-500/30 overflow-hidden relative hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 card-depth shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                      >
                        <div className="absolute top-0 right-0 p-2 opacity-5">
                          <EffectIcon size={60} />
                        </div>
                        <CardContent className="p-4 relative z-10">
                          <div className="flex items-start justify-between gap-4">
                            {/* Left side - Info */}
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                                  <Target className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                  <span className="text-base font-bold text-white">
                                    {sabotage.target_planet_name}
                                  </span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[9px] rounded uppercase font-black tracking-wider">
                                      ✓ Succès
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-2 border border-white/5">
                                <EffectIcon className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs font-bold text-emerald-300">
                                  {getEffectLabel(sabotage.effect_type)}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  • {getEffectDescription(sabotage.effect_type)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="font-mono">{getTimeRemaining(sabotage.expires_at)} restantes</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}

              {/* Detected Sabotages */}
              {detectedSabotages.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-3 mt-6">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/30 to-transparent"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">Opérations Détectées</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/30 to-transparent"></div>
                  </div>

                  {detectedSabotages.map((sabotage) => {
                    const EffectIcon = getEffectIcon(sabotage.effect_type);
                    return (
                      <Card
                        key={sabotage.id}
                        className="bg-black/40 border border-red-500/30 overflow-hidden relative hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 card-depth shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                      >
                        <div className="absolute top-0 right-0 p-2 opacity-5">
                          <EffectIcon size={60} />
                        </div>
                        <CardContent className="p-4 relative z-10">
                          <div className="flex items-start justify-between gap-4">
                            {/* Left side - Info */}
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-red-500/20 border border-red-500/30 relative">
                                  <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></div>
                                  <Target className="w-5 h-5 text-red-400 relative z-10" />
                                </div>
                                <div>
                                  <span className="text-base font-bold text-white">
                                    {sabotage.target_planet_name}
                                  </span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/30 text-red-300 text-[9px] rounded uppercase font-black tracking-wider animate-pulse">
                                      🚨 Détecté
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 bg-red-950/30 rounded-lg p-2 border border-red-500/20">
                                <EffectIcon className="w-4 h-4 text-red-400" />
                                <span className="text-xs font-bold text-red-300">
                                  {getEffectLabel(sabotage.effect_type)}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  • Opération compromise
                                </span>
                              </div>

                              <div className="bg-yellow-950/30 border border-yellow-500/30 rounded-lg p-2 flex items-start gap-2">
                                <Zap size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-yellow-200/80 leading-relaxed">
                                  <span className="font-bold text-yellow-300">Casus Belli accordé</span> — La cible peut vous attaquer sans pénalité pendant 48h
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-indigo-500/30 p-4 bg-slate-900/50">
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 uppercase tracking-widest text-sm card-depth hover:-translate-y-1 hover:shadow-lg"
          >
            Fermer
          </button>
        </div>
      </Card>
    </div>
  );
}
