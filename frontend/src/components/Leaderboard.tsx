import { useEffect, useState } from 'react';
import { Trophy, Medal, Target, Eye, Globe, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RankItem {
  rank: number;
  username: string; // NOUVEAU
  planet_name: string;
  score: number;
  is_me: boolean;
  id: string;
}

interface LeaderboardProps {
    currentPlanetId: string;
    onAttack: (id: string, name: string) => void;
    onSpy: (id: string) => void;
}

export default function Leaderboard({ currentPlanetId, onAttack, onSpy }: LeaderboardProps) {
  const [ranking, setRanking] = useState<RankItem[]>([]);

  useEffect(() => {
    fetch(`http://localhost:8080/ranking?current_planet_id=${currentPlanetId}`)
      .then(res => res.json())
      .then(setRanking)
      .catch(console.error);
  }, [currentPlanetId]);

  return (
    <div className="space-y-6 pb-20">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                <Trophy size={24} className="text-yellow-500" />
            </div>
            <div>
                <h2 className="text-xl font-black text-white uppercase tracking-widest">Classement Galactique</h2>
                <p className="text-xs text-slate-400 font-mono">Top 100 des empires</p>
            </div>
        </div>

        <div className="bg-slate-950/50 border border-white/5 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-1 text-center">Rang</div>
                <div className="col-span-4 pl-2">Commandant</div> {/* NOUVEAU */}
                <div className="col-span-3">Planète</div>
                <div className="col-span-2 text-right pr-4">Points</div>
                <div className="col-span-2 text-right">Actions</div>
            </div>

            <div className="divide-y divide-white/5">
                {ranking.map((item) => (
                    <div 
                        key={item.id} 
                        className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors hover:bg-white/5 ${item.is_me ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : ''}`}
                    >
                        <div className="col-span-1 flex justify-center">
                            {item.rank === 1 && <Medal size={20} className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />}
                            {item.rank === 2 && <Medal size={20} className="text-slate-300" />}
                            {item.rank === 3 && <Medal size={20} className="text-amber-700" />}
                            {item.rank > 3 && <span className="text-slate-500 font-mono font-bold">#{item.rank}</span>}
                        </div>

                        {/* COLONNE COMMANDANT (USER) */}
                        <div className="col-span-4 flex items-center gap-3 pl-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${item.is_me ? 'bg-indigo-500 border-indigo-400' : 'bg-slate-800 border-white/10'}`}>
                                <User size={14} className="text-white" />
                            </div>
                            <span className={`font-bold text-sm ${item.is_me ? 'text-indigo-300' : 'text-white'}`}>
                                {item.username}
                            </span>
                        </div>

                        {/* COLONNE PLANÈTE */}
                        <div className="col-span-3 flex items-center gap-2 text-slate-400">
                            <Globe size={12} />
                            <span className="text-xs font-mono">{item.planet_name}</span>
                        </div>

                        <div className="col-span-2 text-right pr-4 font-mono text-yellow-500 font-bold">
                            {item.score.toLocaleString()}
                        </div>

                        <div className="col-span-2 flex justify-end gap-1">
                            {!item.is_me && (
                                <>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-400 hover:bg-blue-500/20 hover:text-white rounded-full" onClick={() => onSpy(item.id)}>
                                        <Eye size={14} />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/20 hover:text-white rounded-full" onClick={() => onAttack(item.id, item.planet_name)}>
                                        <Target size={14} />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}