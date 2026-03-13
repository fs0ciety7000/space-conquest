import React, { memo, useEffect, useState, useCallback } from 'react';
import { Gift, Check, X, Loader2, Stone, Gem, Droplets, Coins } from 'lucide-react';
import { apiUrl } from '@/config/api';
import { formatDuration } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DayReward {
  day: number;
  metal: number;
  crystal: number;
  deuterium: number;
  syndicate_credits: number;
  claimed: boolean;
}

interface DailyRewardStatus {
  current_streak: number;
  can_claim: boolean;
  next_claim_in_seconds: number | null;
  today_reward: DayReward | null;
  week_rewards: DayReward[];
}

interface DailyRewardProps {
  userId: string;
  onClose: () => void;
}

const CARGO_COLORS = {
  metal: 'text-orange-400',
  crystal: 'text-cyan-400',
  deuterium: 'text-emerald-400',
  sc: 'text-purple-400',
};

const ResourceChip = memo(function ResourceChip({
  icon: Icon,
  value,
  color,
  label,
}: {
  icon: React.ComponentType<any>;
  value: number;
  color: string;
  label: string;
}) {
  if (value <= 0) return null;
  return (
    <div className="flex items-center gap-1" title={label}>
      <Icon size={12} className={color} />
      <span className={`font-mono text-[11px] font-bold ${color}`}>
        {value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
      </span>
    </div>
  );
});

const DayBox = memo(function DayBox({
  reward,
  isToday,
}: {
  reward: DayReward;
  isToday: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
        reward.claimed
          ? 'bg-emerald-950/30 border-emerald-500/30'
          : isToday
          ? 'bg-amber-950/30 border-amber-500/50 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
          : 'bg-slate-900/40 border-slate-700/30'
      }`}
    >
      {/* Day label */}
      <span
        className={`text-[9px] uppercase font-black tracking-widest ${
          reward.claimed
            ? 'text-emerald-400'
            : isToday
            ? 'text-amber-400'
            : 'text-slate-500'
        }`}
      >
        J{reward.day}
      </span>

      {/* Check or day icon */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center border ${
          reward.claimed
            ? 'bg-emerald-900/40 border-emerald-500/50'
            : isToday
            ? 'bg-amber-900/30 border-amber-500/40'
            : 'bg-slate-800/40 border-slate-700/30'
        }`}
      >
        {reward.claimed ? (
          <Check size={14} className="text-emerald-400" />
        ) : (
          <Gift
            size={14}
            className={isToday ? 'text-amber-400' : 'text-slate-600'}
          />
        )}
      </div>

      {/* Resources preview */}
      <div className="flex flex-col gap-0.5 items-center min-h-[36px] justify-center">
        <ResourceChip
          icon={Stone}
          value={reward.metal}
          color={CARGO_COLORS.metal}
          label="Métal"
        />
        <ResourceChip
          icon={Gem}
          value={reward.crystal}
          color={CARGO_COLORS.crystal}
          label="Cristal"
        />
        <ResourceChip
          icon={Droplets}
          value={reward.deuterium}
          color={CARGO_COLORS.deuterium}
          label="Deutérium"
        />
        <ResourceChip
          icon={Coins}
          value={reward.syndicate_credits}
          color={CARGO_COLORS.sc}
          label="Crédits Syndicat"
        />
      </div>
    </div>
  );
});

const DailyReward = memo(function DailyReward({ userId, onClose }: DailyRewardProps) {
  const [status, setStatus] = useState<DailyRewardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);

  const fetchStatus = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(apiUrl(`/users/${userId}/daily-reward/status`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: DailyRewardStatus = await res.json();
        setStatus(data);
        setCountdown(data.next_claim_in_seconds ?? 0);
      }
    } catch {
      toast.error('Erreur chargement récompense quotidienne');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Live countdown ticker
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const handleClaim = useCallback(async () => {
    if (claiming || !status?.can_claim) return;
    const token = localStorage.getItem('token');
    setClaiming(true);
    try {
      const res = await fetch(apiUrl(`/users/${userId}/daily-reward/claim`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Récompense quotidienne réclamée !', {
          description: data.message || 'Ressources ajoutées à votre planète.',
        });
        await fetchStatus();
      } else {
        toast.error(data.error || 'Impossible de réclamer la récompense');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setClaiming(false);
    }
  }, [claiming, status, userId, fetchStatus]);

  // Determine which day is "today" (the first unclaimed day, or day after last claimed)
  const todayDay = status?.today_reward?.day ?? null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[rgba(10,5,32,0.96)] backdrop-blur-[20px] border border-cyan-500/15 rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-cyan-500/10">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl">
              <Gift size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="font-black text-slate-200 text-base uppercase tracking-widest">
                Récompense Quotidienne
              </h2>
              {status && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Série actuelle:{' '}
                  <span className="text-amber-400 font-bold">
                    {status.current_streak} jour{status.current_streak !== 1 ? 's' : ''}
                  </span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 transition-colors cursor-pointer p-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="text-cyan-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* 7-day calendar */}
              <div className="grid grid-cols-7 gap-2">
                {(status?.week_rewards ?? []).map((reward) => (
                  <DayBox
                    key={reward.day}
                    reward={reward}
                    isToday={reward.day === todayDay}
                  />
                ))}
              </div>

              {/* Today's reward detail */}
              {status?.today_reward && (
                <div className="bg-[rgba(16,8,46,0.95)] border border-amber-500/20 rounded-xl p-4">
                  <p className="text-[10px] uppercase font-bold text-amber-500/70 tracking-widest mb-3">
                    Récompense du jour
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {status.today_reward.metal > 0 && (
                      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-orange-950/20 border border-orange-500/15">
                        <Stone size={16} className="text-orange-400" />
                        <span className="font-mono text-sm font-bold text-orange-300">
                          {status.today_reward.metal.toLocaleString()}
                        </span>
                        <span className="text-[9px] text-slate-500 uppercase">Métal</span>
                      </div>
                    )}
                    {status.today_reward.crystal > 0 && (
                      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-cyan-950/20 border border-cyan-500/15">
                        <Gem size={16} className="text-cyan-400" />
                        <span className="font-mono text-sm font-bold text-cyan-300">
                          {status.today_reward.crystal.toLocaleString()}
                        </span>
                        <span className="text-[9px] text-slate-500 uppercase">Cristal</span>
                      </div>
                    )}
                    {status.today_reward.deuterium > 0 && (
                      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/15">
                        <Droplets size={16} className="text-emerald-400" />
                        <span className="font-mono text-sm font-bold text-emerald-300">
                          {status.today_reward.deuterium.toLocaleString()}
                        </span>
                        <span className="text-[9px] text-slate-500 uppercase">Deutérium</span>
                      </div>
                    )}
                    {status.today_reward.syndicate_credits > 0 && (
                      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-purple-950/20 border border-purple-500/15">
                        <Coins size={16} className="text-purple-400" />
                        <span className="font-mono text-sm font-bold text-purple-300">
                          {status.today_reward.syndicate_credits.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-slate-500 uppercase">SC</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Claim button or countdown */}
              {status?.can_claim ? (
                <Button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="w-full bg-amber-600/80 hover:bg-amber-500 text-slate-200 font-black uppercase tracking-wider text-sm shadow-lg border border-amber-500/30 transition-all duration-200"
                >
                  {claiming ? (
                    <>
                      <Loader2 size={14} className="mr-2 animate-spin" /> Réclamation...
                    </>
                  ) : (
                    <>
                      <Gift size={14} className="mr-2" /> Réclamer la récompense
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex flex-col items-center gap-1 py-3 rounded-xl border border-slate-700/30 bg-slate-900/20">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                    Prochaine récompense dans
                  </span>
                  <span className="font-mono text-lg font-black text-cyan-400 tabular-nums">
                    {countdown > 0 ? formatDuration(countdown) : 'Disponible !'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default DailyReward;
