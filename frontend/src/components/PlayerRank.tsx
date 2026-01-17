import { Trophy, Star, Crown, Zap, Shield, Rocket } from 'lucide-react';

export interface Rank {
  level: number;
  name: string;
  icon: any;
  minPoints: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const RANKS: Rank[] = [
  { 
    level: 1, 
    name: 'Explorateur', 
    icon: Rocket, 
    minPoints: 0, 
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30'
  },
  { 
    level: 2, 
    name: 'Colon', 
    icon: Star, 
    minPoints: 1000, 
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30'
  },
  { 
    level: 3, 
    name: 'Commandant', 
    icon: Shield, 
    minPoints: 5000, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  { 
    level: 4, 
    name: 'Capitaine', 
    icon: Zap, 
    minPoints: 15000, 
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30'
  },
  { 
    level: 5, 
    name: 'Amiral', 
    icon: Trophy, 
    minPoints: 50000, 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30'
  },
  { 
    level: 6, 
    name: 'Légende', 
    icon: Crown, 
    minPoints: 150000, 
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30'
  },
];

export function getRank(points: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (points >= RANKS[i].minPoints) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

export function getNextRank(currentPoints: number): { rank: Rank; progress: number } | null {
  const currentRank = getRank(currentPoints);
  const nextRank = RANKS.find(r => r.minPoints > currentPoints);
  
  if (!nextRank) return null;
  
  const progress = ((currentPoints - currentRank.minPoints) / (nextRank.minPoints - currentRank.minPoints)) * 100;
  
  return { rank: nextRank, progress };
}

interface PlayerRankProps {
  points: number;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PlayerRankBadge({ points, showProgress = false, size = 'md' }: PlayerRankProps) {
  const rank = getRank(points);
  const nextRankInfo = getNextRank(points);
  const Icon = rank.icon;
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-2',
    lg: 'px-4 py-2 text-base gap-3',
  };
  
  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center ${sizeClasses[size]} ${rank.bgColor} ${rank.borderColor} border rounded-full font-bold uppercase tracking-wider ${rank.color} shadow-lg`}>
        <Icon size={iconSizes[size]} />
        <span>{rank.name}</span>
        <span className="opacity-60">Niv.{rank.level}</span>
      </div>
      
      {showProgress && nextRankInfo && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Progression vers {nextRankInfo.rank.name}</span>
            <span className="text-white font-mono font-bold">{Math.floor(nextRankInfo.progress)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full ${nextRankInfo.rank.bgColor.replace('/10', '/50')} transition-all duration-500 rounded-full`}
              style={{ width: `${nextRankInfo.progress}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            {points.toLocaleString()} / {nextRankInfo.rank.minPoints.toLocaleString()} points
          </p>
        </div>
      )}
    </div>
  );
}