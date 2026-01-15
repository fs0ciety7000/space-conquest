import { useEffect, useState } from 'react';
import { Trophy, Crosshair, Eye, MessageCircle, Medal, TrendingUp, ShieldAlert, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RankItem {
    rank: number;
    username: string;
    planet_name: string;
    total_score: number;
    economy_score: number;
    military_score: number;
    is_me: boolean;
    id: string; // Planet ID
    owner_id: string; 
}

interface LeaderboardProps {
    currentPlanetId: string;
    onAttack: (id: string, name: string) => void;
    onSpy: (id: string) => void;
    onSendMessage: (username: string) => void; // Nouvelle prop
}

export default function Leaderboard({ currentPlanetId, onAttack, onSpy, onSendMessage }: LeaderboardProps) {
    const [ranking, setRanking] = useState<RankItem[]>([]);
    const [category, setCategory] = useState<'general' | 'economy' | 'military'>('general');

    useEffect(() => {
        fetch(`/api/ranking?current_planet_id=${currentPlanetId}&type=${category}`)
            .then(res => res.json())
            .then(setRanking)
            .catch(console.error);
    }, [currentPlanetId, category]);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Medal className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" size={24} />;
        if (rank === 2) return <Medal className="text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.5)]" size={24} />;
        if (rank === 3) return <Medal className="text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" size={24} />;
        return <span className="font-mono text-slate-500 font-bold">#{rank}</span>;
    };

    return (
        <div className="bg-slate-900/80 p-6 rounded-xl border border-white/10 backdrop-blur-xl shadow-2xl">
            {/* Header et Filtres */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 p-3 rounded-lg border border-yellow-500/30">
                        <Trophy className="text-yellow-500" size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-widest">Classement</h2>
                        <p className="text-xs text-slate-400">Données impériales en temps réel</p>
                    </div>
                </div>

                <div className="flex bg-slate-950/50 p-1 rounded-lg border border-white/10">
                    <button 
                        onClick={() => setCategory('general')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${category === 'general' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Globe size={14} /> Général
                    </button>
                    <button 
                        onClick={() => setCategory('economy')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${category === 'economy' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <TrendingUp size={14} /> Économie
                    </button>
                    <button 
                        onClick={() => setCategory('military')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${category === 'military' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <ShieldAlert size={14} /> Militaire
                    </button>
                </div>
            </div>
            
            {/* Tableau */}
            <div className="overflow-hidden rounded-lg border border-white/5 bg-slate-950/30">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                            <th className="p-4 w-16 text-center">Rang</th>
                            <th className="p-4">Joueur</th>
                            <th className="p-4">Planète Mère</th>
                            <th className="p-4 text-right">Points</th>
                            <th className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-white/5">
                        {ranking.map((player) => (
                            <tr 
                                key={player.id} 
                                className={`transition-all hover:bg-white/5 ${player.is_me ? 'bg-indigo-500/10 hover:bg-indigo-500/20' : ''}`}
                            >
                                <td className="p-4 text-center">
                                    <div className="flex justify-center items-center">
                                        {getRankIcon(player.rank)}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <span className={`font-bold text-base ${player.is_me ? 'text-indigo-400' : 'text-white'}`}>
                                            {player.username}
                                        </span>
                                        {player.is_me && <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 font-bold tracking-wider">VOUS</span>}
                                    </div>
                                </td>
                                <td className="p-4 text-slate-400 font-mono text-xs">{player.planet_name}</td>
                                <td className="p-4 text-right">
                                    <span className={`font-mono font-bold text-base ${
                                        category === 'economy' ? 'text-emerald-400' : 
                                        category === 'military' ? 'text-red-400' : 'text-yellow-400'
                                    }`}>
                                        {category === 'general' ? player.total_score.toLocaleString() : 
                                         category === 'economy' ? player.economy_score.toLocaleString() : 
                                         player.military_score.toLocaleString()}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex justify-center gap-2">
                                        {!player.is_me && (
                                            <>
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="h-8 w-8 hover:bg-indigo-500/20 hover:text-indigo-400"
                                                    onClick={() => onSendMessage(player.username)}
                                                    title="Envoyer un message"
                                                >
                                                    <MessageCircle size={16} />
                                                </Button>
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="h-8 w-8 hover:bg-blue-500/20 hover:text-blue-400"
                                                    onClick={() => onSpy(player.id)}
                                                    title="Espionner"
                                                >
                                                    <Eye size={16} />
                                                </Button>
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
                                                    onClick={() => onAttack(player.id, player.planet_name)}
                                                    title="Attaquer"
                                                >
                                                    <Crosshair size={16} />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}