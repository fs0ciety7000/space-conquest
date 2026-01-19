import { useEffect, useState } from 'react';
import { Trophy, Crosshair, Eye, MessageCircle, Medal, TrendingUp, ShieldAlert, Globe, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
import PlayerProfile from "./PlayerProfile";

interface PlanetInfo {
    id: string;
    name: string;
    total_score: number;
    economy_score: number;
    military_score: number;
    galaxy: number;
    system: number;
    position: number;
}

interface RankItem {
    rank: number;
    username: string;
    total_score: number;
    economy_score: number;
    military_score: number;
    is_me: boolean;
    owner_id: string;
    planets: PlanetInfo[];
    rank_badge: string;
}

interface LeaderboardProps {
    currentPlanetId: string;
    onAttack: (id: string, name: string) => void;
    onSpy: (id: string) => void;
    onSendMessage: (username: string) => void;
}

export default function Leaderboard({ currentPlanetId, onAttack, onSpy, onSendMessage }: LeaderboardProps) {
    const [ranking, setRanking] = useState<RankItem[]>([]);
    const [category, setCategory] = useState<'general' | 'economy' | 'military'>('general');
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetch(apiUrl(`/ranking?current_planet_id=${currentPlanetId}&type=${category}`))
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

    const toggleExpanded = (userId: string) => {
        const newExpanded = new Set(expandedUsers);
        if (newExpanded.has(userId)) {
            newExpanded.delete(userId);
        } else {
            newExpanded.add(userId);
        }
        setExpandedUsers(newExpanded);
    };

    return (
        <>
            <div className="bg-slate-900/80 p-6 rounded-xl border border-white/10 backdrop-blur-xl shadow-2xl card-depth glass-card animate-fade-in hover:shadow-3xl transition-all duration-500">
                {/* Header et Filtres */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 p-3 rounded-lg border border-yellow-500/30 animate-glow-pulse">
                            <Trophy className="text-yellow-500" size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-widest">Classement</h2>
                            <p className="text-xs text-slate-400">Données impériales en temps réel</p>
                        </div>
                    </div>

                    <div className="flex bg-slate-950/50 p-1 rounded-lg border border-white/10 card-depth">
                        <button
                            onClick={() => setCategory('general')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase transition-all duration-300 hover:scale-105 ${category === 'general' ? 'bg-indigo-600 text-white shadow-lg animate-glow-pulse' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Globe size={14} /> Général
                        </button>
                        <button
                            onClick={() => setCategory('economy')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase transition-all duration-300 hover:scale-105 ${category === 'economy' ? 'bg-emerald-600 text-white shadow-lg animate-glow-pulse' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <TrendingUp size={14} /> Économie
                        </button>
                        <button
                            onClick={() => setCategory('military')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase transition-all duration-300 hover:scale-105 ${category === 'military' ? 'bg-red-600 text-white shadow-lg animate-glow-pulse' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <ShieldAlert size={14} /> Militaire
                        </button>
                    </div>
                </div>
                
                {/* Tableau */}
                <div className="overflow-x-auto rounded-lg border border-white/5 bg-slate-950/30 card-depth animate-slide-up">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                                <th className="p-2 md:p-4 w-12 md:w-16 text-center">Rang</th>
                                <th className="p-2 md:p-4">Joueur</th>
                                <th className="p-2 md:p-4 hidden sm:table-cell">Planètes</th>
                                <th className="p-2 md:p-4 text-right">Points</th>
                                <th className="p-2 md:p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {ranking.map((player) => (
                                <>
                                    {/* Ligne principale du joueur */}
                                    <tr
                                        key={player.owner_id}
                                        className={`transition-all duration-300 hover:bg-white/5 hover:-translate-y-0.5 hover:shadow-lg border-b border-white/5 animate-fade-in ${player.is_me ? 'bg-indigo-500/10 hover:bg-indigo-500/20' : ''}`}
                                    >
                                        <td className="p-2 md:p-4 text-center">
                                            <div className="flex justify-center items-center">
                                                {getRankIcon(player.rank)}
                                            </div>
                                        </td>
                                        <td className="p-2 md:p-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                                    <button
                                                        onClick={() => setSelectedPlayer(player.owner_id)}
                                                        className="flex items-center gap-2 group transition-all duration-300"
                                                    >
                                                        <span className={`font-bold text-sm md:text-base ${player.is_me ? 'text-indigo-400' : 'text-white'} group-hover:underline decoration-2 underline-offset-2 group-hover:scale-105 transition-transform duration-300`}>
                                                            {player.username}
                                                        </span>
                                                    </button>
                                                    {player.is_me && <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 font-bold tracking-wider w-fit">VOUS</span>}
                                                </div>
                                                <span className="text-[10px] text-yellow-500/80 font-semibold uppercase tracking-wide">
                                                    {player.rank_badge}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-2 md:p-4 text-slate-400 font-mono text-xs hidden sm:table-cell">
                                            <button
                                                onClick={() => toggleExpanded(player.owner_id)}
                                                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                                            >
                                                <Globe size={12} className="group-hover:animate-bounce-subtle" />
                                                {player.planets.length} planète{player.planets.length > 1 ? 's' : ''}
                                                {expandedUsers.has(player.owner_id) ? ' ▼' : ' ►'}
                                            </button>
                                        </td>
                                        <td className="p-2 md:p-4 text-right">
                                            <span className={`font-mono font-bold text-sm md:text-base ${
                                                category === 'economy' ? 'text-emerald-400' :
                                                category === 'military' ? 'text-red-400' : 'text-yellow-400'
                                            }`}>
                                                {category === 'general' ? player.total_score.toLocaleString() :
                                                 category === 'economy' ? player.economy_score.toLocaleString() :
                                                 player.military_score.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="p-2 md:p-4">
                                            <div className="flex justify-center gap-1 md:gap-2 flex-wrap">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 md:h-8 md:w-8 hover:bg-purple-500/20 hover:text-purple-400 transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 hover:shadow-lg card-depth"
                                                    onClick={() => setSelectedPlayer(player.owner_id)}
                                                    title="Voir le profil"
                                                >
                                                    <UserCircle size={14} className="md:w-4 md:h-4" />
                                                </Button>

                                                {!player.is_me && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 md:h-8 md:w-8 hover:bg-indigo-500/20 hover:text-indigo-400 transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 hover:shadow-lg card-depth"
                                                        onClick={() => onSendMessage(player.username)}
                                                        title="Envoyer un message"
                                                    >
                                                        <MessageCircle size={14} className="md:w-4 md:h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Lignes des planètes (si étendu) */}
                                    {expandedUsers.has(player.owner_id) && player.planets.map((planet) => (
                                        <tr
                                            key={planet.id}
                                            className="bg-slate-950/50 hover:bg-slate-900/50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg border-b border-white/5 glass-card animate-fade-in"
                                        >
                                            <td className="p-2 md:p-4"></td>
                                            <td className="p-2 md:p-4 pl-8 md:pl-12">
                                                <span className="text-slate-400 font-mono text-xs">↳ {planet.name}</span>
                                            </td>
                                            <td className="p-2 md:p-4 text-cyan-500 font-mono text-[10px] hidden sm:table-cell">
                                                [{planet.galaxy}:{planet.system}:{planet.position}]
                                            </td>
                                            <td className="p-2 md:p-4 text-right">
                                                <span className="font-mono text-xs text-slate-400">
                                                    {category === 'general' ? planet.total_score.toLocaleString() :
                                                     category === 'economy' ? planet.economy_score.toLocaleString() :
                                                     planet.military_score.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="p-2 md:p-4">
                                                {!player.is_me && (
                                                    <div className="flex justify-center gap-1 md:gap-2">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 md:h-7 md:w-7 hover:bg-blue-500/20 hover:text-blue-400 transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 hover:shadow-lg card-depth"
                                                            onClick={() => onSpy(planet.id)}
                                                            title="Espionner"
                                                        >
                                                            <Eye size={12} className="md:w-3.5 md:h-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 md:h-7 md:w-7 hover:bg-red-500/20 hover:text-red-400 transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 hover:shadow-lg card-depth"
                                                            onClick={() => onAttack(planet.id, planet.name)}
                                                            title="Attaquer"
                                                        >
                                                            <Crosshair size={12} className="md:w-3.5 md:h-3.5" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ✅ Modal Profil Joueur */}
            {selectedPlayer && (
                <PlayerProfile 
                    userId={selectedPlayer} 
                    onClose={() => setSelectedPlayer(null)} 
                />
            )}
        </>
    );
}
