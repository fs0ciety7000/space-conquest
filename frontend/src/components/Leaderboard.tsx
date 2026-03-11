import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crosshair, Eye, MessageCircle, Medal, TrendingUp, ShieldAlert, Globe, UserCircle, Truck, X, Info, ChevronDown, ChevronUp, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
import UniversalProfile from "./UniversalProfile";

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
    display_name?: string;
    total_score: number;
    economy_score: number;
    military_score: number;
    is_me: boolean;
    owner_id: string;
    planets: PlanetInfo[];
    rank_badge: string;
    protection_until: string | null;
    galaxy: number | null;
    avatar_url?: string | null;
    is_online?: boolean;
}

interface LeaderboardProps {
    currentPlanetId: string;
    onAttack: (id: string, name: string) => void;
    onSpy: (id: string) => void;
    onTransport: (id: string, name: string, galaxy: number, system: number, position: number) => void;
    onSendMessage: (username: string) => void;
}

export default function Leaderboard({ currentPlanetId, onAttack, onSpy, onTransport, onSendMessage }: LeaderboardProps) {
    const [ranking, setRanking] = useState<RankItem[]>([]);
    const [category, setCategory] = useState<'general' | 'economy' | 'military'>('general');
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
    const [selectedPlanet, setSelectedPlanet] = useState<PlanetInfo | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showFormula, setShowFormula] = useState(false);

    useEffect(() => {
        setRanking([]);
        setPage(1);
        setHasMore(true);
        fetchLeaderboard(1, true);
    }, [currentPlanetId, category]);

    const fetchLeaderboard = async (pageNum: number, isReset: boolean = false) => {
        const LIMIT = 50;
        setIsLoading(true);
        try {
            const res = await fetch(apiUrl(`/ranking?current_planet_id=${currentPlanetId}&type=${category}&page=${pageNum}&limit=${LIMIT}`));
            const data = await res.json();

            if (data && data.data) {
                if (isReset) {
                    setRanking(data.data);
                } else {
                    setRanking(prev => [...prev, ...data.data]);
                }
                setHasMore(pageNum * LIMIT < (data.total ?? 0));
            } else if (Array.isArray(data)) {
                if (isReset) {
                    setRanking(data);
                } else {
                    setRanking(prev => [...prev, ...data]);
                }
                setHasMore(false);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMore = () => {
        if (!isLoading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchLeaderboard(nextPage);
        }
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Medal className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" size={24} />;
        if (rank === 2) return <Medal className="text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.5)]" size={24} />;
        if (rank === 3) return <Medal className="text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" size={24} />;
        return <span className="font-mono tabular-nums text-slate-500 font-bold">#{rank}</span>;
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
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] p-6 rounded-xl border border-cyan-500/10 shadow-2xl"
            >
                {/* Header et Filtres */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 p-3 rounded-lg border border-yellow-500/30">
                            <Trophy className="text-yellow-500" size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-200 uppercase tracking-widest">Classement</h2>
                            <p className="text-xs text-slate-400">Données impériales en temps réel</p>
                        </div>
                    </div>

                    <div className="flex bg-[rgba(10,5,32,0.85)] p-1 rounded-lg border border-cyan-500/10">
                        <button
                            onClick={() => setCategory('general')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase transition-all duration-300 hover:scale-105 ${
                                category === 'general'
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-cyan-500/5'
                            }`}
                        >
                            <Globe size={14} /> Général
                        </button>
                        <button
                            onClick={() => setCategory('economy')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase transition-all duration-300 hover:scale-105 ${
                                category === 'economy'
                                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-lg'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-cyan-500/5'
                            }`}
                        >
                            <TrendingUp size={14} /> Économie
                        </button>
                        <button
                            onClick={() => setCategory('military')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase transition-all duration-300 hover:scale-105 ${
                                category === 'military'
                                    ? 'bg-red-600/20 text-red-400 border border-red-500/30 shadow-lg'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-cyan-500/5'
                            }`}
                        >
                            <ShieldAlert size={14} /> Militaire
                        </button>
                    </div>
                </div>

                {/* Formule de calcul du score */}
                <div className="mb-6 rounded-xl border border-cyan-500/10 bg-[rgba(16,8,46,0.95)] overflow-hidden">
                    <button
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-cyan-500/5 transition-colors duration-150"
                        onClick={() => setShowFormula(v => !v)}
                    >
                        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-500/70">
                            <Info size={14} /> Formule de calcul des points
                        </span>
                        {showFormula ? <ChevronUp size={14} className="text-cyan-500/70" /> : <ChevronDown size={14} className="text-cyan-500/70" />}
                    </button>
                    {showFormula && (
                        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] border-t border-cyan-500/10 pt-4">
                            {/* Économie */}
                            <div>
                                <div className="text-emerald-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <TrendingUp size={12} /> Score Économie
                                </div>
                                <div className="space-y-1 text-slate-400">
                                    <p className="font-bold text-slate-300">Bâtiments (par planète) :</p>
                                    <p>Mine de Métal : <span className="font-mono tabular-nums text-emerald-400">niv² × 10</span></p>
                                    <p>Mine de Cristal : <span className="font-mono tabular-nums text-emerald-400">niv² × 15</span></p>
                                    <p>Mine de Deutérium : <span className="font-mono tabular-nums text-emerald-400">niv² × 25</span></p>
                                    <p>Centrale Solaire : <span className="font-mono tabular-nums text-emerald-400">niv² × 5</span></p>
                                    <p>Chantier Spatial : <span className="font-mono tabular-nums text-emerald-400">niv² × 40</span></p>
                                    <p>Laboratoire : <span className="font-mono tabular-nums text-emerald-400">niv² × 50</span></p>
                                    <p>Hangar : <span className="font-mono tabular-nums text-emerald-400">niv² × 35</span></p>
                                    <p className="font-bold text-slate-300 mt-2">Technologies :</p>
                                    <p>Énergie/Laser/Info : <span className="font-mono tabular-nums text-emerald-400">niv² × 40–50</span></p>
                                    <p>Armement/Bouclier/Blindage : <span className="font-mono tabular-nums text-emerald-400">niv² × 70–85</span></p>
                                    <p>Plasma/Hyperspatiale : <span className="font-mono tabular-nums text-emerald-400">niv² × 90–100</span></p>
                                    <p>Graviton : <span className="font-mono tabular-nums text-emerald-400">niv² × 150</span></p>
                                    <p className="font-bold text-slate-300 mt-2">Production horaire :</p>
                                    <p>Métal ÷ 1000 × 1</p>
                                    <p>Cristal ÷ 1000 × 1.5</p>
                                    <p>Deutérium ÷ 1000 × 2</p>
                                    <p className="font-bold text-slate-300 mt-2">Ressources stockées :</p>
                                    <p>Métal ÷ 50 000 × 1</p>
                                    <p>Cristal ÷ 50 000 × 1.5</p>
                                    <p>Deutérium ÷ 50 000 × 2</p>
                                </div>
                            </div>
                            {/* Militaire */}
                            <div>
                                <div className="text-red-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <ShieldAlert size={12} /> Score Militaire
                                </div>
                                <div className="space-y-1 text-slate-400">
                                    <p className="font-bold text-slate-300">Défenses planétaires :</p>
                                    <p>Valeur unitaire :</p>
                                    <p className="font-mono tabular-nums text-red-300 pl-2">(attaque + bouclier/2 + blindage/10) ÷ 1000</p>
                                    <p className="mt-1 text-slate-500 italic">Multiplié par le nombre d'unités présentes.</p>
                                    <p className="font-bold text-slate-300 mt-3 flex items-center gap-1"><Swords size={11} /> Score de Combat (all-time) :</p>
                                    <p>Par victoire PvP : <span className="font-mono tabular-nums text-emerald-400">+100 pts</span></p>
                                    <p>Par défaite PvP : <span className="font-mono tabular-nums text-red-400">−25 pts</span></p>
                                    <p className="text-slate-500 italic">Plancher à 0 — ne peut pas être négatif.</p>
                                </div>
                            </div>
                            {/* Vaisseaux & Mise à jour */}
                            <div>
                                <div className="text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <Info size={12} /> Informations
                                </div>
                                <div className="space-y-2 text-slate-400">
                                    <div className="bg-[rgba(10,5,32,0.85)] rounded-lg p-3 border border-cyan-500/10">
                                        <p className="font-bold text-slate-300 mb-1">Vaisseaux</p>
                                        <p>Non inclus dans le classement — les flottes en mission ne font pas baisser votre rang.</p>
                                        <p className="text-slate-500 mt-1 italic">Visibles sur la fiche profil (Puissance de Flotte).</p>
                                    </div>
                                    <div className="bg-[rgba(10,5,32,0.85)] rounded-lg p-3 border border-cyan-500/10">
                                        <p className="font-bold text-slate-300 mb-1">Mise à jour</p>
                                        <p>Les scores sont recalculés toutes les <span className="text-cyan-400 font-bold">5 minutes</span>.</p>
                                    </div>
                                    <div className="bg-cyan-900/10 rounded-lg p-3 border border-cyan-500/10">
                                        <p className="font-bold text-cyan-400 mb-1">Score Total</p>
                                        <p className="font-mono tabular-nums text-slate-200">= Économie + Militaire</p>
                                        <p className="font-mono tabular-nums text-slate-200">= (Bâtiments + Technos</p>
                                        <p className="font-mono tabular-nums text-slate-200 pl-2">+ Production + Stocks)</p>
                                        <p className="font-mono tabular-nums text-slate-200">+ (Défenses + Combat)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tableau */}
                <div className="overflow-x-auto rounded-lg border border-cyan-500/10 bg-[rgba(10,5,32,0.85)]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[rgba(10,5,32,0.85)] text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                                <th className="p-2 md:p-4 w-12 md:w-16 text-center">Rang</th>
                                <th className="p-2 md:p-4">Joueur</th>
                                <th className="p-2 md:p-4 hidden sm:table-cell">Planètes</th>
                                <th className="p-2 md:p-4 text-right">Points</th>
                                <th className="p-2 md:p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-cyan-500/5">
                            {ranking.map((player) => (
                                <>
                                    {/* Ligne principale du joueur */}
                                    <tr
                                        key={player.owner_id}
                                        className={`transition-colors duration-150 hover:bg-cyan-500/5 ${
                                            player.is_me
                                                ? 'bg-cyan-500/5 border-l-2 border-cyan-500/30'
                                                : ''
                                        }`}
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
                                                        <div className="relative shrink-0">
                                                            <img
                                                                src={player.avatar_url ? apiUrl(player.avatar_url) : `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${player.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
                                                                alt=""
                                                                className="w-7 h-7 rounded-lg object-cover opacity-90 group-hover:opacity-100"
                                                            />
                                                            {player.is_online && (
                                                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-1 ring-slate-900 animate-pulse" />
                                                            )}
                                                        </div>
                                                        <span className={`font-bold text-sm md:text-base ${player.is_me ? 'text-cyan-400' : 'text-slate-200'} group-hover:underline decoration-2 underline-offset-2 group-hover:scale-105 transition-transform duration-300`}>
                                                            {player.display_name || player.username}
                                                        </span>
                                                    </button>
                                                    {player.is_me && (
                                                        <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 font-bold tracking-wider w-fit">VOUS</span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide">
                                                    {player.rank_badge}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-2 md:p-4 text-slate-400 font-mono tabular-nums text-xs hidden sm:table-cell">
                                            <button
                                                onClick={() => toggleExpanded(player.owner_id)}
                                                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-all duration-300 hover:scale-105"
                                            >
                                                <Globe size={12} />
                                                {player.planets.length} planète{player.planets.length > 1 ? 's' : ''}
                                                {expandedUsers.has(player.owner_id) ? ' ▼' : ' ►'}
                                            </button>
                                        </td>
                                        <td className="p-2 md:p-4 text-right">
                                            <span className={`font-mono tabular-nums font-bold text-sm md:text-base ${
                                                category === 'economy' ? 'text-emerald-400' :
                                                category === 'military' ? 'text-red-400' : 'text-cyan-400'
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
                                                    className="h-7 w-7 md:h-8 md:w-8 hover:bg-purple-500/20 hover:text-purple-400 transition-all duration-150 hover:scale-110 hover:-translate-y-0.5"
                                                    onClick={() => setSelectedPlayer(player.owner_id)}
                                                    title="Voir le profil"
                                                >
                                                    <UserCircle size={14} className="md:w-4 md:h-4" />
                                                </Button>

                                                {!player.is_me && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 md:h-8 md:w-8 hover:bg-cyan-500/20 hover:text-cyan-400 transition-all duration-150 hover:scale-110 hover:-translate-y-0.5"
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
                                            className="bg-[rgba(16,8,46,0.95)] hover:bg-cyan-500/5 transition-colors duration-150"
                                        >
                                            <td className="p-2 md:p-4"></td>
                                            <td className="p-2 md:p-4 pl-8 md:pl-12">
                                                <span className="text-slate-400 font-mono text-xs">↳ {planet.name}</span>
                                            </td>
                                            <td className="p-2 md:p-4 text-cyan-400 font-mono tabular-nums text-[10px] hidden sm:table-cell">
                                                <button
                                                    onClick={() => setSelectedPlanet(planet)}
                                                    className="hover:text-cyan-300 hover:underline transition-colors"
                                                >
                                                    [{planet.galaxy}:{planet.system}:{planet.position}]
                                                </button>
                                            </td>
                                            <td className="p-2 md:p-4 text-right">
                                                <span className="font-mono tabular-nums text-xs text-slate-400">
                                                    {category === 'general' ? planet.total_score.toLocaleString() :
                                                     category === 'economy' ? planet.economy_score.toLocaleString() :
                                                     planet.military_score.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="p-2 md:p-4">
                                                {!player.is_me ? (
                                                    <div className="flex justify-center gap-1 md:gap-2">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 md:h-7 md:w-7 hover:bg-blue-500/20 hover:text-blue-400 transition-all duration-150 hover:scale-110"
                                                            onClick={() => onSpy(planet.id)}
                                                            title="Espionner"
                                                        >
                                                            <Eye size={12} className="md:w-3.5 md:h-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 md:h-7 md:w-7 hover:bg-red-500/20 hover:text-red-400 transition-all duration-150 hover:scale-110"
                                                            onClick={() => onAttack(planet.id, planet.name)}
                                                            title="Attaquer"
                                                        >
                                                            <Crosshair size={12} className="md:w-3.5 md:h-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 md:h-7 md:w-7 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all duration-150 hover:scale-110"
                                                            onClick={() => onTransport(planet.id, planet.name, planet.galaxy, planet.system, planet.position)}
                                                            title="Ravitailler"
                                                        >
                                                            <Truck size={12} className="md:w-3.5 md:h-3.5" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center gap-1 md:gap-2">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 md:h-7 md:w-7 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all duration-150 hover:scale-110"
                                                            onClick={() => onTransport(planet.id, planet.name, planet.galaxy, planet.system, planet.position)}
                                                            title="Ravitailler"
                                                        >
                                                            <Truck size={12} className="md:w-3.5 md:h-3.5" />
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

                    {hasMore && (
                        <div className="flex justify-center p-6 border-t border-cyan-500/10">
                            <Button
                                variant="outline"
                                onClick={loadMore}
                                disabled={isLoading}
                                className="bg-[rgba(10,5,32,0.85)] border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 text-slate-400 hover:text-slate-200 transition-all duration-150"
                            >
                                {isLoading ? "Chargement..." : "Afficher plus"}
                            </Button>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Modal Profil Joueur */}
            {selectedPlayer && (
                <UniversalProfile
                  userId={selectedPlayer}
                  onClose={() => setSelectedPlayer(null)}
                  isModal
                />
            )}

            {/* Modal Détails Planète */}
            {selectedPlanet && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedPlanet(null)}>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-[rgba(16,8,46,0.95)] backdrop-blur-[12px] border border-cyan-500/10 rounded-2xl shadow-2xl max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-cyan-500/10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-200 text-xl">{selectedPlanet.name}</h3>
                                    <p className="text-sm text-slate-400 font-mono tabular-nums mt-1">
                                        [{selectedPlanet.galaxy}:{selectedPlanet.system}:{selectedPlanet.position}]
                                    </p>
                                </div>
                                <button onClick={() => setSelectedPlanet(null)} className="text-slate-500 hover:text-slate-200 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-[rgba(10,5,32,0.85)] p-4 rounded-lg border border-cyan-500/10">
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase mb-1">Total</p>
                                        <p className="text-lg font-bold text-cyan-400 font-mono tabular-nums">
                                            {selectedPlanet.total_score.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase mb-1">Économie</p>
                                        <p className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
                                            {selectedPlanet.economy_score.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase mb-1">Militaire</p>
                                        <p className="text-lg font-bold text-red-400 font-mono tabular-nums">
                                            {selectedPlanet.military_score.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                {ranking.find(p => p.planets.some(pl => pl.id === selectedPlanet.id))?.is_me ? (
                                    <Button
                                        onClick={() => {
                                            onTransport(selectedPlanet.id, selectedPlanet.name, selectedPlanet.galaxy, selectedPlanet.system, selectedPlanet.position);
                                            setSelectedPlanet(null);
                                        }}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                                    >
                                        <Truck className="mr-2" size={16} /> Ravitailler
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            onClick={() => {
                                                onSpy(selectedPlanet.id);
                                                setSelectedPlanet(null);
                                            }}
                                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold"
                                        >
                                            <Eye className="mr-2" size={16} /> Espionner
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                onAttack(selectedPlanet.id, selectedPlanet.name);
                                                setSelectedPlanet(null);
                                            }}
                                            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold"
                                        >
                                            <Crosshair className="mr-2" size={16} /> Attaquer
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                onTransport(selectedPlanet.id, selectedPlanet.name, selectedPlanet.galaxy, selectedPlanet.system, selectedPlanet.position);
                                                setSelectedPlanet(null);
                                            }}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                                        >
                                            <Truck className="mr-2" size={16} /> Ravitailler
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </>
    );
}
