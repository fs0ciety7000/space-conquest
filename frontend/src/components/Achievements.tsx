import { useState, useEffect } from "react";
import { Trophy, Star, Lock, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
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

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
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
        <Loader2 size={32} className="animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-cyan-500/10 pb-6">
        <div className="flex items-center gap-3">
          <Trophy size={32} className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]" />
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-slate-200">
              Hall of <span className="text-amber-400">Fame</span>
            </h1>
            <p className="text-sm text-slate-500 font-mono mt-1">Hauts faits et succès déverrouillés.</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] p-3 rounded-xl border border-cyan-500/10">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Progression Globale</p>
            <p className="text-xl font-black text-slate-200 font-mono">
              {unlockedCount} <span className="text-slate-500 text-sm">/ {achievements.length}</span>
            </p>
          </div>
        </div>
      </div>

      {achievements.length === 0 ? (
        <div className="text-center text-slate-500 text-sm py-16">Aucun succès disponible.</div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {achievements.map((ach) => {
            const progress = Math.min(ach.current_progress / Math.max(ach.condition_value, 1), 1);
            const isInProgress = !ach.unlocked && ach.current_progress > 0;

            return (
              <motion.div key={ach.id} variants={item}>
                <Card
                  className={`backdrop-blur-[12px] border transition-all duration-300 ${
                    ach.unlocked
                      ? 'bg-amber-500/5 border-amber-500/30'
                      : isInProgress
                      ? 'bg-cyan-500/5 border-cyan-500/20'
                      : 'bg-[rgba(10,5,32,0.85)] border-slate-700/20 opacity-50'
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`w-12 h-12 rounded-lg border shadow-inner flex items-center justify-center text-2xl flex-shrink-0 ${
                          ach.unlocked
                            ? 'bg-[rgba(16,8,46,0.95)] border-amber-500/20'
                            : 'bg-[rgba(10,5,32,0.85)] border-cyan-500/10'
                        }`}
                      >
                        {ach.unlocked ? ach.icon : <Lock size={20} className="text-slate-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm font-black uppercase tracking-wider truncate ${ach.unlocked ? 'text-slate-200' : 'text-slate-400'}`}>
                            {ach.name}
                          </h3>
                          <span className={`text-[10px] font-mono shrink-0 ${rarityColor[ach.rarity] ?? 'text-slate-500'}`}>
                            {rarityLabel[ach.rarity] ?? ach.rarity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{ach.description}</p>
                      </div>
                      {ach.unlocked && (
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                          <Star size={14} className="text-amber-400" />
                        </div>
                      )}
                    </div>

                    {/* Section header for progress */}
                    <div className="flex items-center gap-2 mb-2 pb-1 border-b border-cyan-500/10">
                      <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
                      <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">PROGRÈS</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono font-bold">
                        <span className={ach.unlocked ? 'text-slate-300' : 'text-slate-500'}>
                          {ach.current_progress.toLocaleString()} / {ach.condition_value.toLocaleString()}
                        </span>
                        <Badge variant="warning">+{ach.points} XP</Badge>
                      </div>
                      <Progress
                        variant={ach.unlocked ? "success" : "default"}
                        value={progress * 100}
                      />
                    </div>

                    {ach.unlocked && ach.unlocked_at && (
                      <p className="text-[10px] text-slate-600 font-mono mt-2">
                        Débloqué le {new Date(ach.unlocked_at).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
