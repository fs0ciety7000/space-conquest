import { useEffect, useState } from 'react';
import { Trophy, Medal, Crown, Target, Skull, Eye, Recycle, X, Rocket } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Assure-toi d'avoir ce composant ou utilise un <input> standard

// Structure des données venant de l'API
interface RankItem {
  rank: number;
  planet_name: string;
  score: number;
  is_me: boolean;
  id: string; 
}

// Props acceptées par le composant
interface LeaderboardProps {
  currentPlanetId: string;
  onAttack: (targetId: string, targetName: string) => void;
  onSpy: (targetId: string) => void; 
}

export default function Leaderboard({ currentPlanetId, onAttack, onSpy }: LeaderboardProps) {
  const [ranking, setRanking] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(true);

  // --- ÉTATS POUR LA MODALE DE RECYCLAGE ---
  const [recycleModal, setRecycleModal] = useState<{isOpen: boolean, targetId: string | null}>({
    isOpen: false, 
    targetId: null
  });
  const [recyclerCount, setRecyclerCount] = useState<number>(1);
  const [isSending, setIsSending] = useState(false);

  // 1. Ouvre la modale
  const openRecycleModal = (targetId: string) => {
    setRecycleModal({ isOpen: true, targetId });
    setRecyclerCount(1); // Reset du compteur à 1
  };

  // 2. Ferme la modale
  const closeRecycleModal = () => {
    setRecycleModal({ isOpen: false, targetId: null });
    setIsSending(false);
  };

  // 3. Envoie la requête (Action confirmée)
  const handleConfirmRecycle = async () => {
    if (!recycleModal.targetId || recyclerCount <= 0) return;

    setIsSending(true);

    try {
        const res = await fetch(`http://localhost:8080/recycle?current_planet_id=${currentPlanetId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_planet_id: recycleModal.targetId,
                recyclers: recyclerCount
            })
        });
        const data = await res.json();
        
        if (res.ok) {
            alert(data.message); // Tu pourras remplacer ça par un Toast plus tard
            closeRecycleModal();
        } else {
            alert("Erreur: " + data.error);
            setIsSending(false);
        }
    } catch (e) {
        console.error(e);
        setIsSending(false);
    }
  };

  // Chargement du classement
  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const res = await fetch(`http://localhost:8080/ranking?current_planet_id=${currentPlanetId}`);
        if (res.ok) {
          const data = await res.json();
          setRanking(data);
        }
      } catch (e) {
        console.error("Erreur chargement classement", e);
      } finally {
        setLoading(false);
      }
    };

    if (currentPlanetId) {
        fetchRanking();
    }
  }, [currentPlanetId]);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
        <div className="text-center animate-pulse font-mono text-cyan-500 tracking-widest">
            CHARGEMENT DES DONNÉES TACTIQUES...
        </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-yellow-500/10 rounded-full border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            <Trophy size={40} className="text-yellow-500" />
        </div>
        <div>
            <h2 className="text-3xl font-black uppercase text-white tracking-tighter">Classement Galactique</h2>
            <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">Top Amiraux du Secteur</p>
        </div>
      </div>

      <Card className="bg-black/60 border border-white/10 p-1 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-slate-500 border-b border-white/5">
                        <th className="p-4 text-center w-20">Rang</th>
                        <th className="p-4">Commandant</th>
                        <th className="p-4 text-right">Score</th>
                        <th className="p-4 text-center w-40">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {ranking.map((player) => (
                        <tr key={player.rank} className={`group transition-colors hover:bg-white/5 ${player.is_me ? 'bg-indigo-900/20 hover:bg-indigo-900/30' : ''}`}>
                            
                            {/* Rang */}
                            <td className="p-4 text-center font-mono font-bold text-lg">
                                {player.rank === 1 && <Crown size={24} className="text-yellow-400 mx-auto drop-shadow-lg" />}
                                {player.rank === 2 && <Medal size={24} className="text-slate-300 mx-auto" />}
                                {player.rank === 3 && <Medal size={24} className="text-amber-700 mx-auto" />}
                                {player.rank > 3 && <span className="text-slate-500">#{player.rank}</span>}
                            </td>

                            {/* Nom */}
                            <td className="p-4">
                                <div className="flex items-center gap-2">
                                    <span className={`font-bold text-sm tracking-wide ${player.is_me ? 'text-indigo-400' : 'text-white'}`}>
                                        {player.planet_name}
                                    </span>
                                    {player.is_me && <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Moi</span>}
                                </div>
                            </td>

                            {/* Score */}
                            <td className="p-4 text-right font-mono text-cyan-400 font-bold">{player.score.toLocaleString()}</td>

                            {/* Actions */}
                            <td className="p-4 text-center">
                                {!player.is_me ? (
                                    <div className="flex items-center justify-center gap-2">
                                        
                                        {/* Espionnage */}
                                        <button 
                                            onClick={() => onSpy(player.id)}
                                            className="group/btn p-2 rounded-full hover:bg-blue-500/20 text-slate-600 hover:text-blue-400 transition-all border border-transparent hover:border-blue-500/30"
                                            title="Envoyer une sonde"
                                        >
                                            <Eye size={18} />
                                        </button>

                                        {/* Attaque */}
                                        <button 
                                            onClick={() => onAttack(player.id, player.planet_name)}
                                            className="group/btn p-2 rounded-full hover:bg-red-500/20 text-slate-600 hover:text-red-500 transition-all border border-transparent hover:border-red-500/30"
                                            title="Lancer un raid"
                                        >
                                            <Skull size={18} className="group-hover/btn:animate-pulse" />
                                        </button>

                                        {/* Recyclage (Ouvre la modale) */}
                                        <button 
                                            onClick={() => openRecycleModal(player.id)}
                                            className="group/btn p-2 rounded-full hover:bg-green-500/20 text-slate-600 hover:text-green-400 transition-all border border-transparent hover:border-green-500/30"
                                            title="Envoyer des recycleurs"
                                        >
                                            <Recycle size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex justify-center opacity-20 text-slate-500">
                                        <Target size={18} />
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </Card>

      {/* --- MODALE DE RECYCLAGE --- */}
      {recycleModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-md bg-slate-950 border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.2)] relative overflow-hidden">
                
                {/* Effets de fond */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent"></div>
                
                {/* Close Button */}
                <button onClick={closeRecycleModal} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>

                <div className="p-8 space-y-6">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center mx-auto border border-green-500/20 mb-4">
                            <Recycle size={32} className="text-green-400 animate-spin-slow" />
                        </div>
                        <h3 className="text-xl font-black uppercase text-white tracking-widest">Mission Recyclage</h3>
                        <p className="text-xs text-green-500 font-mono uppercase">Déploiement de flotte de récupération</p>
                    </div>

                    <div className="space-y-4 bg-black/40 p-6 rounded-xl border border-white/5">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-slate-400">Nombre de Recycleurs</label>
                            <div className="flex items-center gap-4">
                                <Rocket className="text-slate-600" size={20} />
                                <Input 
                                    type="number" 
                                    min="1"
                                    value={recyclerCount}
                                    onChange={(e) => setRecyclerCount(Math.max(1, parseInt(e.target.value) || 0))}
                                    className="bg-transparent border-b border-white/20 text-3xl font-mono font-black text-white focus:outline-none focus:border-green-500 h-12 rounded-none px-0 text-center"
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-between text-[10px] font-mono text-slate-500">
                            <span>Capacité fret: {(recyclerCount * 20000).toLocaleString()} unités</span>
                            <span>Carburant: N/A</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <Button 
                            variant="outline" 
                            onClick={closeRecycleModal}
                            className="border-slate-700 hover:bg-slate-800 text-slate-300 h-12 uppercase font-bold text-xs tracking-widest"
                        >
                            Annuler
                        </Button>
                        <Button 
                            onClick={handleConfirmRecycle}
                            disabled={isSending}
                            className="bg-green-600 hover:bg-green-500 text-black h-12 uppercase font-black text-xs tracking-widest"
                        >
                            {isSending ? "Lancement..." : "Confirmer"}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
      )}
    </div>
  );
}