import { useState, useEffect } from "react";
import { Trophy, Star, Lock, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { apiUrl } from "@/config/api";

interface AchievementsProps {
  userId: string;
}

interface Achievement {
  id: string;
  achievement_key: string;
  name: string;
  description: string;
  category: string;
  icon: string;          // emoji depuis la DB
  color: string;         // hex depuis la DB
  condition_value: number;
  current_progress: number;
  points: number;
  rarity: string;
  unlocked: boolean;
  unlocked_at: string | null;
  displayed: boolean;
}

const rarityLabel: Record<string, string> = {
  common: "Commun",
  uncommon: "Peu commun",
  rare: "Rare",
  epic: "Épique",
  legendary: "Légendaire",
};

const rarityColor: Record<string, string> = {
  common: "text-slate-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

export default function Achievements({ userId }: AchievementsProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(apiUrl(`/achievements?user_id=${userId}`))
      .then(r => r.json())
      .then(data => setAchievements(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-yellow-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <Trophy size={32} className="text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-white">
              Hall of <span className="text-yellow-500">Fame</span>
            </h1>
            <p className="text-sm text-slate-400 font-mono mt-1">Hauts faits et succès déverrouillés.</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-white/5">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Progression Globale</p>
            <p className="text-xl font-black text-white font-mono">
              {unlockedCount} <span className="text-slate-500 text-sm">/ {achievements.length}</span>
            </p>
          </div>
        </div>
      </div>

      {achievements.length === 0 ? (
        <div className="text-center text-slate-500 text-sm py-16">Aucun succès disponible.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((ach) => {
            const progress = Math.min(ach.current_progress / Math.max(ach.condition_value, 1), 1);
            return (
              <Card
                key={ach.id}
                className={`bg-slate-900/40 border card-depth transition-all duration-300 ${
                  ach.unlocked
                    ? 'border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.05)]'
                    : 'border-white/5 opacity-70 grayscale hover:grayscale-0 hover:opacity-100'
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`w-12 h-12 rounded-lg border shadow-inner flex items-center justify-center text-2xl flex-shrink-0 ${
                        ach.unlocked ? 'bg-slate-900 border-white/10' : 'bg-slate-950 border-white/5'
                      }`}
                    >
                      {ach.unlocked ? ach.icon : <Lock size={20} className="text-slate-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-black uppercase tracking-wider truncate ${ach.unlocked ? 'text-white' : 'text-slate-400'}`}>
                          {ach.name}
                        </h3>
                        <span className={`text-[10px] font-mono shrink-0 ${rarityColor[ach.rarity] ?? 'text-slate-500'}`}>
                          {rarityLabel[ach.rarity] ?? ach.rarity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{ach.description}</p>
                    </div>
                    {ach.unlocked && (
                      <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center shrink-0">
                        <Star size={14} className="text-yellow-500" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono font-bold">
                      <span className={ach.unlocked ? 'text-slate-300' : 'text-slate-500'}>PROGRÈS</span>
                      <span className={ach.unlocked ? 'text-emerald-400' : 'text-slate-400'}>
                        {ach.current_progress.toLocaleString()} / {ach.condition_value.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full transition-all duration-1000 ${ach.unlocked ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-indigo-600/50'}`}
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  </div>

                  {ach.unlocked && ach.unlocked_at && (
                    <p className="text-[10px] text-slate-600 font-mono mt-2">
                      Débloqué le {new Date(ach.unlocked_at).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
