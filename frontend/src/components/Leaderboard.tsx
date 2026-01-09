import { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, Target } from "lucide-react";
import { Card } from "@/components/ui/card";

interface RankItem {
  rank: number;
  planet_name: string;
  score: number;
  is_me: boolean;
}

export default function Leaderboard({ currentPlanetId }: { currentPlanetId: string }) {
  const [ranking, setRanking] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const res = await fetch(`http://localhost:8080/ranking?current_planet_id=${currentPlanetId}`);
        if (res.ok) {
          const data = await res.json();
          setRanking(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, [currentPlanetId]);

  if (loading) return <div className="text-center animate-pulse p-10 font-mono text-cyan-500">CHARGEMENT DES DONNÉES DE LA FLOTTE...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-yellow-500/10 rounded-full border border-yellow-500/20">
            <Trophy size={40} className="text-yellow-500" />
        </div>
        <div>
            <h2 className="text-3xl font-black uppercase text-white tracking-tighter">Classement Galactique</h2>
            <p className="text-slate-400 font-mono text-xs">Top Amiraux du Secteur</p>
        </div>
      </div>

      <Card className="bg-black/60 border border-white/10 p-1 rounded-3xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-slate-500">
                        <th className="p-4 text-center w-20">Rang</th>
                        <th className="p-4">Commandant</th>
                        <th className="p-4 text-right">Score</th>
                        <th className="p-4 text-center w-20">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {ranking.map((player) => (
                        <tr 
                            key={player.rank} 
                            className={`group transition-colors hover:bg-white/5 ${player.is_me ? 'bg-indigo-900/20 hover:bg-indigo-900/30' : ''}`}
                        >
                            <td className="p-4 text-center font-mono font-bold text-lg">
                                {player.rank === 1 && <Crown size={20} className="text-yellow-400 mx-auto" />}
                                {player.rank === 2 && <Medal size={20} className="text-slate-300 mx-auto" />}
                                {player.rank === 3 && <Medal size={20} className="text-amber-600 mx-auto" />}
                                {player.rank > 3 && <span className="text-slate-500">#{player.rank}</span>}
                            </td>
                            <td className="p-4">
                                <span className={`font-bold ${player.is_me ? 'text-indigo-400' : 'text-white'}`}>
                                    {player.planet_name}
                                </span>
                                {player.is_me && <span className="ml-2 text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded">MOI</span>}
                            </td>
                            <td className="p-4 text-right font-mono text-cyan-400">
                                {player.score.toLocaleString()}
                            </td>
                            <td className="p-4 text-center">
                                {!player.is_me && (
                                    <button 
                                        className="p-2 rounded-full hover:bg-red-500/20 text-slate-600 hover:text-red-500 transition-colors"
                                        title="Attaquer (Bientôt disponible)"
                                    >
                                        <Target size={18} />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </Card>
    </div>
  );
}