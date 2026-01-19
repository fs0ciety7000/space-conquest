import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { toast } from 'sonner';
import { apiUrl } from '@/config/api';
import {
  Target, Gift, Flame, Trophy, Star, Clock, Check, 
  Swords, Pickaxe, Rocket, Telescope, Shield, Users,
  Sparkles, Crown, RefreshCw, ChevronRight, Zap
} from 'lucide-react';

interface MissionsViewProps {
  userId: string;
  planetId: string;
  token: string;
}

interface Mission {
  id: string;
  mission_key: string;
  name: string;
  description: string;
  mission_type: string;
  target: string;
  required_amount: number;
  current_progress: number;
  difficulty: string;
  reward_metal: number;
  reward_crystal: number;
  reward_deuterium: number;
  reward_xp: number;
  status: string;
  completed_at?: string;
  claimed_at?: string;
}

interface Achievement {
  id: string;
  achievement_key: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  condition_value: number;
  current_progress: number;
  points: number;
  rarity: string;
  unlocked: boolean;
  unlocked_at?: string;
  displayed: boolean;
}

interface StreakInfo {
  current_streak: number;
  best_streak: number;
  total_login_days: number;
  daily_reward_claimed: boolean;
  streak_bonus_multiplier: number;
  next_reward: {
    metal: number;
    crystal: number;
    deuterium: number;
    xp: number;
  };
}

interface MissionsOverview {
  daily_missions: Mission[];
  streak: StreakInfo;
  total_xp: number;
  missions_completed_today: number;
}

type Tab = 'missions' | 'achievements';

export function MissionsView({ userId, planetId, token }: MissionsViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('missions');
  const [overview, setOverview] = useState<MissionsOverview | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const fetchMissions = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/missions/daily?user_id=${userId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (e) {
      console.error('Error fetching missions:', e);
    }
  }, [userId, token]);

  const fetchAchievements = useCallback(async () => {
    try {
      const categoryParam = selectedCategory !== 'all' ? `&category=${selectedCategory}` : '';
      const res = await fetch(apiUrl(`/achievements?user_id=${userId}${categoryParam}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAchievements(data);
      }
    } catch (e) {
      console.error('Error fetching achievements:', e);
    }
  }, [userId, token, selectedCategory]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchMissions(), fetchAchievements()]);
      setLoading(false);
    };
    load();
  }, [fetchMissions, fetchAchievements]);

  const handleClaimMission = async (missionId: string) => {
    try {
      const res = await fetch(apiUrl(`/missions/${missionId}/claim?user_id=${userId}&planet_id=${planetId}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('🎁 Récompense réclamée !', {
          description: `+${data.rewards.metal.toLocaleString()} métal, +${data.rewards.crystal.toLocaleString()} cristal`
        });
        fetchMissions();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    }
  };

  const handleClaimDailyReward = async () => {
    try {
      const res = await fetch(apiUrl(`/streak/claim?user_id=${userId}&planet_id=${planetId}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('🔥 Récompense de streak réclamée !', {
          description: `+${data.rewards.metal.toLocaleString()} métal, +${data.rewards.crystal.toLocaleString()} cristal`
        });
        fetchMissions();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    }
  };

  const getMissionIcon = (type: string) => {
    switch (type) {
      case 'build': return <Rocket size={16} />;
      case 'attack': return <Swords size={16} />;
      case 'spy': return <Telescope size={16} />;
      case 'transport': return <Gift size={16} />;
      case 'expedition': return <Star size={16} />;
      case 'upgrade': return <Pickaxe size={16} />;
      case 'collect': return <Sparkles size={16} />;
      default: return <Target size={16} />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-slate-500/50 bg-slate-500/10';
      case 'uncommon': return 'border-green-500/50 bg-green-500/10';
      case 'rare': return 'border-blue-500/50 bg-blue-500/10';
      case 'epic': return 'border-purple-500/50 bg-purple-500/10';
      case 'legendary': return 'border-yellow-500/50 bg-yellow-500/10 animate-pulse';
      default: return 'border-slate-500/50';
    }
  };

  const categories = [
    { id: 'all', name: 'Tous', icon: <Trophy size={14} /> },
    { id: 'combat', name: 'Combat', icon: <Swords size={14} /> },
    { id: 'economy', name: 'Économie', icon: <Pickaxe size={14} /> },
    { id: 'exploration', name: 'Exploration', icon: <Telescope size={14} /> },
    { id: 'social', name: 'Social', icon: <Users size={14} /> },
    { id: 'special', name: 'Spécial', icon: <Crown size={14} /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">MISSIONS & SUCCÈS</h2>
            <p className="text-xs text-slate-400 font-mono">
              {overview?.missions_completed_today || 0} missions complétées aujourd'hui
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => { fetchMissions(); fetchAchievements(); }}
          className="border-white/10"
        >
          <RefreshCw size={16} />
        </Button>
      </div>

      {/* Streak Card */}
      {overview?.streak && (
        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                    <Flame className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-black border-2 border-orange-500 flex items-center justify-center">
                    <span className="text-xs font-black text-orange-400">{overview.streak.current_streak}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Streak de connexion</h3>
                  <p className="text-sm text-slate-400">
                    {overview.streak.current_streak} jour{overview.streak.current_streak > 1 ? 's' : ''} consécutif{overview.streak.current_streak > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-orange-400 mt-1">
                    Bonus actuel: +{Math.round((overview.streak.streak_bonus_multiplier - 1) * 100)}% sur les récompenses
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase mb-2">Récompense quotidienne</div>
                <div className="space-y-1 text-xs mb-3">
                  <div className="text-slate-300">
                    +{overview.streak.next_reward.metal.toLocaleString()} <span className="text-slate-500">métal</span>
                  </div>
                  <div className="text-slate-300">
                    +{overview.streak.next_reward.crystal.toLocaleString()} <span className="text-slate-500">cristal</span>
                  </div>
                </div>
                <Button
                  onClick={handleClaimDailyReward}
                  disabled={overview.streak.daily_reward_claimed}
                  className={overview.streak.daily_reward_claimed 
                    ? 'bg-slate-700 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'
                  }
                >
                  {overview.streak.daily_reward_claimed ? (
                    <><Check size={14} className="mr-2" /> Réclamé</>
                  ) : (
                    <><Gift size={14} className="mr-2" /> Réclamer</>
                  )}
                </Button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-orange-500/20 flex gap-6 text-xs">
              <div>
                <span className="text-slate-500">Meilleur streak:</span>
                <span className="ml-2 font-bold text-white">{overview.streak.best_streak} jours</span>
              </div>
              <div>
                <span className="text-slate-500">Total connexions:</span>
                <span className="ml-2 font-bold text-white">{overview.streak.total_login_days} jours</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <Button
          variant={activeTab === 'missions' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('missions')}
          className={activeTab === 'missions' ? 'bg-amber-500/20 text-amber-400' : ''}
        >
          <Target size={14} className="mr-2" /> Missions ({overview?.daily_missions.length || 0})
        </Button>
        <Button
          variant={activeTab === 'achievements' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('achievements')}
          className={activeTab === 'achievements' ? 'bg-purple-500/20 text-purple-400' : ''}
        >
          <Trophy size={14} className="mr-2" /> Succès ({achievements.filter(a => a.unlocked).length}/{achievements.length})
        </Button>
      </div>

      {/* Missions Tab */}
      {activeTab === 'missions' && overview && (
        <div className="grid gap-4">
          {overview.daily_missions.map(mission => {
            const progress = Math.min(100, (mission.current_progress / mission.required_amount) * 100);
            const isCompleted = mission.status === 'completed';
            const isClaimed = mission.status === 'claimed';

            return (
              <Card 
                key={mission.id} 
                className={`bg-slate-900/50 border transition-all ${
                  isClaimed ? 'border-green-500/30 opacity-60' :
                  isCompleted ? 'border-amber-500/50 animate-pulse' :
                  'border-white/10 hover:border-white/20'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isClaimed ? 'bg-green-500/20 text-green-400' :
                        isCompleted ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {isClaimed ? <Check size={20} /> : getMissionIcon(mission.mission_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-white">{mission.name}</h4>
                          <Badge className={getDifficultyColor(mission.difficulty)}>
                            {mission.difficulty}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">{mission.description}</p>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Progression</span>
                            <span className="font-mono text-white">
                              {mission.current_progress} / {mission.required_amount}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <div className="flex gap-4 mt-3 text-[10px] text-slate-500">
                          {mission.reward_metal > 0 && (
                            <span>+{mission.reward_metal.toLocaleString()} métal</span>
                          )}
                          {mission.reward_crystal > 0 && (
                            <span>+{mission.reward_crystal.toLocaleString()} cristal</span>
                          )}
                          {mission.reward_deuterium > 0 && (
                            <span>+{mission.reward_deuterium.toLocaleString()} deutérium</span>
                          )}
                          {mission.reward_xp > 0 && (
                            <span className="text-amber-400">+{mission.reward_xp} XP</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isCompleted && !isClaimed && (
                      <Button
                        onClick={() => handleClaimMission(mission.id)}
                        className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 animate-bounce"
                      >
                        <Gift size={14} className="mr-2" /> Réclamer
                      </Button>
                    )}

                    {isClaimed && (
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <Check size={16} /> Terminé
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {overview.daily_missions.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Target size={48} className="mx-auto mb-4 opacity-30" />
              <p>Aucune mission disponible</p>
            </div>
          )}
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <div className="space-y-4">
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className={selectedCategory === cat.id ? 'bg-purple-500/20 text-purple-400' : ''}
              >
                {cat.icon}
                <span className="ml-1">{cat.name}</span>
              </Button>
            ))}
          </div>

          {/* Achievements grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements
              .filter(a => selectedCategory === 'all' || a.category === selectedCategory)
              .map(achievement => {
                const progress = Math.min(100, (achievement.current_progress / achievement.condition_value) * 100);

                return (
                  <TooltipProvider key={achievement.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Card className={`cursor-pointer transition-all hover:-translate-y-1 ${
                          getRarityColor(achievement.rarity)
                        } ${achievement.unlocked ? 'opacity-100' : 'opacity-60'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div 
                                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                                  achievement.unlocked 
                                    ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30' 
                                    : 'bg-slate-800/50'
                                }`}
                                style={{ 
                                  boxShadow: achievement.unlocked 
                                    ? `0 0 20px ${achievement.color}40` 
                                    : 'none' 
                                }}
                              >
                                {achievement.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className={`font-bold truncate ${
                                    achievement.unlocked ? 'text-white' : 'text-slate-400'
                                  }`}>
                                    {achievement.name}
                                  </h4>
                                  {achievement.unlocked && (
                                    <Check size={14} className="text-green-400 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {achievement.description}
                                </p>
                                
                                {!achievement.unlocked && (
                                  <div className="mt-2">
                                    <Progress value={progress} className="h-1" />
                                    <p className="text-[9px] text-slate-600 mt-1">
                                      {achievement.current_progress} / {achievement.condition_value}
                                    </p>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 mt-2">
                                  <Badge className={`text-[9px] ${getRarityColor(achievement.rarity)}`}>
                                    {achievement.rarity}
                                  </Badge>
                                  <span className="text-[9px] text-amber-400">
                                    +{achievement.points} pts
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-slate-900 border-white/10 max-w-xs">
                        <div className="space-y-1">
                          <p className="font-bold">{achievement.name}</p>
                          <p className="text-xs text-slate-400">{achievement.description}</p>
                          {achievement.unlocked && achievement.unlocked_at && (
                            <p className="text-[10px] text-green-400">
                              Débloqué le {new Date(achievement.unlocked_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
          </div>

          {achievements.filter(a => selectedCategory === 'all' || a.category === selectedCategory).length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Trophy size={48} className="mx-auto mb-4 opacity-30" />
              <p>Aucun succès dans cette catégorie</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MissionsView;
