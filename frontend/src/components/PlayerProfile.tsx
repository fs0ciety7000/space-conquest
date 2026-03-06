import { useState, useEffect } from "react";
import {
  User, Globe, Trophy, Rocket, Shield, Target, Zap, Award,
  Star, Crown, Swords, TrendingUp, MapPin, Building, Atom, Calendar,
  X, Lock, Eye, AlertTriangle, Flame, Code2, UserPlus, UserCheck, UserX
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiUrl } from '@/config/api';
import { toast } from "sonner";
import BeginnerProtectionBadge from './BeginnerProtectionBadge';

interface PlayerProfileProps {
  userId: string;
  onClose: () => void;
}

interface DisplayedAchievement {
  id: string;
  name: string;
  icon: string;
  color: string;
  rarity: string;
  unlocked_at: string;
}

export default function PlayerProfile({ userId, onClose }: PlayerProfileProps) {
  const [profile, setProfile] = useState<any>(null);
  const [achievements, setAchievements] = useState<DisplayedAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<{ friendship_id?: string; status?: string; is_sender?: boolean } | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);

  const viewerId = localStorage.getItem('user_id');

  const fetchFriendStatus = async () => {
    if (!viewerId || viewerId === userId) return;
    try {
      const res = await fetch(apiUrl(`/users/${viewerId}/friends`));
      if (res.ok) {
        const friends: any[] = await res.json();
        const rel = friends.find(f => f.user_id === userId);
        setFriendStatus(rel ? { friendship_id: rel.friendship_id, status: rel.status, is_sender: rel.is_sender } : null);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // ✅ Récupérer le viewer_id depuis localStorage
        const viewerId = localStorage.getItem('user_id');
        const url = viewerId 
          ? apiUrl(`/players/${userId}/profile?viewer_id=${viewerId}`)
          : apiUrl(`/players/${userId}/profile`);
        
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        } else {
          toast.error("Profil introuvable");
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };

    const fetchAchievements = async () => {
      try {
        const res = await fetch(apiUrl(`/users/${userId}/achievements`));
        if (res.ok) {
          const data = await res.json();
          setAchievements(data);
        }
      } catch (error) {
        console.error('Error fetching achievements:', error);
      }
    };

    fetchProfile();
    fetchAchievements();
    fetchFriendStatus();
  }, [userId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500"></div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  // ✅ Fonction pour vérifier si une donnée est classifiée
  const isClassified = (value: any) => {
    return typeof value === 'string' && (value.includes('█') || value === 'CLASSIFIÉ');
  };

  // Avatar (custom ou généré)
  const avatarUrl = profile.avatar_url
    ? apiUrl(profile.avatar_url)
    : `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${profile.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  const handleSendFriendRequest = async () => {
    if (!viewerId) return;
    setFriendLoading(true);
    try {
      const viewerUsername = localStorage.getItem('username') || '';
      const res = await fetch(apiUrl('/friends/request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: viewerId, receiver_username: profile.username }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Demande d'amitié envoyée à ${profile.username} !`);
        fetchFriendStatus();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch { toast.error('Erreur de connexion'); }
    setFriendLoading(false);
  };

  const handleAcceptRequest = async () => {
    if (!friendStatus?.friendship_id || !viewerId) return;
    setFriendLoading(true);
    try {
      const res = await fetch(apiUrl(`/friends/${friendStatus.friendship_id}/accept?user_id=${viewerId}`), { method: 'POST' });
      if (res.ok) { toast.success('Ami accepté !'); fetchFriendStatus(); }
    } catch { toast.error('Erreur'); }
    setFriendLoading(false);
  };

  const handleRemoveFriend = async () => {
    if (!friendStatus?.friendship_id || !viewerId) return;
    setFriendLoading(true);
    try {
      const res = await fetch(apiUrl(`/friends/${friendStatus.friendship_id}?user_id=${viewerId}`), { method: 'DELETE' });
      if (res.ok) { toast.success('Ami retiré.'); setFriendStatus(null); }
    } catch { toast.error('Erreur'); }
    setFriendLoading(false);
  };

  // Couleur du badge selon le rang
  const getRankColor = (badge: string) => {
    if (badge === 'CLASSIFIÉ') return "from-red-500 to-red-700";
    if (badge.includes("Empereur")) return "from-yellow-500 to-orange-600";
    if (badge.includes("Seigneur")) return "from-purple-500 to-pink-600";
    if (badge.includes("Amiral")) return "from-blue-500 to-indigo-600";
    if (badge.includes("Commandant")) return "from-cyan-500 to-blue-600";
    if (badge.includes("Capitaine")) return "from-green-500 to-emerald-600";
    return "from-slate-500 to-slate-600";
  };

  // Calcul du temps de jeu (si visible)
  const memberSince = profile.created_at ? new Date(profile.created_at) : null;
  const daysSince = memberSince 
    ? Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="max-w-5xl w-full max-h-[90vh] overflow-y-auto bg-slate-950 border border-white/10 rounded-3xl shadow-2xl">
        
        {/* Header avec bannière */}
        <div className="relative h-32 bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '32px 32px'
            }}></div>
          </div>
          
          {/* Bouton fermer */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full border border-white/10 transition-colors z-10"
          >
            <X size={20} className="text-white" />
          </button>

          {/* ✅ Niveau d'espionnage */}
          {!profile.is_own_profile && (
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 rounded-full border border-white/10 flex items-center gap-2">
              <Eye size={14} className="text-indigo-400" />
              <span className="text-xs text-white font-mono">
                Espionnage Niv.{profile.espionage_level}
              </span>
            </div>
          )}
        </div>

        {/* Avatar + Infos principales */}
        <div className="relative px-8 pb-8">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 mb-6">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-2xl bg-slate-900 border-4 border-slate-950 shadow-2xl overflow-hidden ring-4 ring-indigo-500/30">
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            </div>

            {/* Nom + Badge */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-2 flex items-center gap-3 justify-center md:justify-start">
                {profile.username}
                <Crown size={24} className="text-yellow-500" />
              </h1>
              
              {/* ✅ Badge de rang (peut être masqué) */}
              <div className="flex flex-wrap items-center gap-2">
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r ${getRankColor(profile.rank_badge)} text-white font-bold text-sm shadow-lg`}>
                  {isClassified(profile.rank_badge) ? <Lock size={14} /> : <Award size={16} />}
                  {profile.rank_badge}
                </div>
                {profile.is_admin && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-sm shadow-lg">
                    <Code2 size={14} />
                    Admin / Développeur
                  </div>
                )}
              </div>

              {/* Protection Badge */}
              {!profile.is_own_profile && (
                <div className="mt-2">
                  <BeginnerProtectionBadge
                    protectionUntil={profile.protection_until}
                    galaxy={profile.galaxy}
                    totalPoints={typeof profile.total_points === 'number' ? profile.total_points : 0}
                    size="md"
                    showPoints={false}
                  />
                </div>
              )}

              {/* Bouton ami (uniquement sur profil d'un autre joueur) */}
              {!profile.is_own_profile && viewerId && (
                <div className="mt-3">
                  {!friendStatus ? (
                    <button
                      onClick={handleSendFriendRequest}
                      disabled={friendLoading}
                      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-600/30 hover:bg-indigo-600/60 border border-indigo-500/40 text-indigo-300 hover:text-white text-sm font-bold transition-colors"
                    >
                      <UserPlus size={14} /> Ajouter en ami
                    </button>
                  ) : friendStatus.status === 'accepted' ? (
                    <button
                      onClick={handleRemoveFriend}
                      disabled={friendLoading}
                      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-900/30 hover:bg-red-900/30 border border-green-500/30 hover:border-red-500/30 text-green-400 hover:text-red-400 text-sm font-bold transition-colors group"
                    >
                      <UserCheck size={14} className="group-hover:hidden" />
                      <UserX size={14} className="hidden group-hover:block" />
                      <span className="group-hover:hidden">Ami</span>
                      <span className="hidden group-hover:block">Retirer</span>
                    </button>
                  ) : friendStatus.status === 'pending' && !friendStatus.is_sender ? (
                    <button
                      onClick={handleAcceptRequest}
                      disabled={friendLoading}
                      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-600/30 hover:bg-amber-600/60 border border-amber-500/40 text-amber-300 text-sm font-bold transition-colors"
                    >
                      <UserCheck size={14} /> Accepter la demande
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/50 border border-white/10 text-slate-400 text-sm">
                      <UserPlus size={14} /> Demande envoyée
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ✅ Points totaux (peut être masqué) */}
            <div className="text-center bg-gradient-to-br from-indigo-950 to-purple-950 px-6 py-4 rounded-2xl border border-indigo-500/30 shadow-lg">
              <div className={`text-3xl font-black font-mono flex items-center gap-2 justify-center ${isClassified(profile.total_points) ? 'text-red-400' : 'text-white'}`}>
                {isClassified(profile.total_points) && <Lock size={20} />}
                {profile.total_points}
              </div>
              <div className="text-xs text-indigo-300 uppercase font-bold tracking-widest flex items-center gap-1 justify-center">
                <Trophy size={12} /> Points Totaux
              </div>
            </div>
          </div>

          {/* ✅ Message d'avertissement si données masquées */}
          {profile.access_info && (
            <Card className="bg-red-950/20 border-red-500/30 mb-6">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-red-400 mt-1 flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="text-red-300 text-sm font-bold mb-2">{profile.access_info.message}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(profile.access_info.unlocks).map(([key, value]) => (
                        <div key={key} className="text-xs text-red-400/70 flex items-center gap-2">
                          <Lock size={10} />
                          <span>{value as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bio */}
          {profile.bio && (
            <Card className="bg-slate-900/30 border border-white/10 mb-6">
              <CardContent className="p-4">
                <div className="text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-1">
                  <User size={11} /> Biographie
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{profile.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* ✅ Statistiques Grid (avec masquage) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard 
              icon={Globe} 
              label="Planètes" 
              value={profile.planet_count} 
              color="text-blue-400" 
              classified={false}
            />
            <StatCard 
              icon={Rocket} 
              label="Flotte" 
              value={profile.total_fleet} 
              color="text-purple-400" 
              classified={isClassified(profile.total_fleet)}
            />
            <StatCard 
              icon={Shield} 
              label="Défenses" 
              value={profile.total_defenses} 
              color="text-red-400" 
              classified={isClassified(profile.total_defenses)}
            />
            <StatCard 
              icon={Target} 
              label="Missions" 
              value={profile.completed_missions} 
              color="text-green-400" 
              classified={isClassified(profile.completed_missions)}
            />
          </div>

          {/* Planète Principale */}
          {profile.main_planet && (
            <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 mb-6">
              <CardContent className="p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 mb-4 flex items-center gap-2">
                  <MapPin size={16} /> Planète Capitale
                </h3>
                
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-2xl font-black text-white">{profile.main_planet.name}</div>
                    <div className="text-sm text-slate-400 font-mono">
                      Coordonnées: [{profile.main_planet.galaxy}:{profile.main_planet.system}:{profile.main_planet.position}]
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-mono font-bold flex items-center gap-2 ${isClassified(profile.main_planet.points) ? 'text-red-400' : 'text-indigo-400'}`}>
                      {isClassified(profile.main_planet.points) && <Lock size={16} />}
                      {profile.main_planet.points}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase">Points</div>
                  </div>
                </div>

                {/* Technologies & Bâtiments */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Bâtiments */}
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <div className="text-[10px] font-bold uppercase text-slate-500 mb-3 flex items-center gap-2">
                      <Building size={12} /> Infrastructure
                    </div>
                    <div className="space-y-2">
                      <BuildingLevel label="Mine de Métal" level={profile.top_buildings.metal_mine} />
                      <BuildingLevel label="Mine de Cristal" level={profile.top_buildings.crystal_mine} />
                      <BuildingLevel label="Chantier Spatial" level={profile.top_buildings.shipyard} />
                      <BuildingLevel label="Laboratoire" level={profile.top_buildings.research_lab} />
                    </div>
                  </div>

                  {/* Technologies */}
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <div className="text-[10px] font-bold uppercase text-slate-500 mb-3 flex items-center gap-2">
                      <Atom size={12} /> Technologies
                    </div>
                    <div className="space-y-2">
                      <BuildingLevel label="Énergie" level={profile.top_techs.energy} />
                      <BuildingLevel label="Laser" level={profile.top_techs.laser} />
                      <BuildingLevel label="Espionnage" level={profile.top_techs.espionage} />
                      <BuildingLevel label="Blindage" level={profile.top_techs.armour} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liste des planètes */}
          <Card className="bg-slate-900/50 border border-white/10">
            <CardContent className="p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-purple-400 mb-4 flex items-center gap-2">
                <Globe size={16} /> Empire ({profile.planets.length} planètes)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {profile.planets.map((planet: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-white/5">
                    <div>
                      <div className="text-sm font-bold text-white">{planet.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{planet.coords}</div>
                    </div>
                    <div className={`text-xs font-mono font-bold flex items-center gap-1 ${isClassified(planet.points) ? 'text-red-400' : 'text-indigo-400'}`}>
                      {isClassified(planet.points) && <Lock size={12} />}
                      {planet.points}{!isClassified(planet.points) && 'pts'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Badges & Achievements */}
          {achievements.length > 0 && (
            <Card className="bg-gradient-to-br from-amber-950/20 to-orange-950/20 border border-amber-500/20 mt-6">
              <CardContent className="p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-amber-400 mb-4 flex items-center gap-2">
                  <Trophy size={16} /> Succès débloqués ({achievements.length})
                </h3>
                
                <div className="flex flex-wrap gap-3">
                  {achievements.map((ach) => (
                    <div 
                      key={ach.id}
                      className={`
                        relative group flex items-center gap-2 px-4 py-2 rounded-xl border
                        ${ach.rarity === 'legendary' ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50 animate-pulse' :
                          ach.rarity === 'epic' ? 'bg-purple-500/10 border-purple-500/30' :
                          ach.rarity === 'rare' ? 'bg-blue-500/10 border-blue-500/30' :
                          ach.rarity === 'uncommon' ? 'bg-green-500/10 border-green-500/30' :
                          'bg-slate-500/10 border-slate-500/30'
                        }
                        hover:scale-105 transition-transform cursor-default
                      `}
                    >
                      <span className="text-xl" style={{ textShadow: `0 0 10px ${ach.color}` }}>
                        {ach.icon}
                      </span>
                      <span className="text-sm font-bold text-white">{ach.name}</span>
                      
                      {/* Tooltip au hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">
                        <div className="text-xs text-slate-400">
                          Débloqué le {new Date(ach.unlocked_at).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-[10px] text-slate-500 capitalize">
                          {ach.rarity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ✅ Footer - Membre depuis (si visible) */}
          {daysSince !== null && (
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Calendar size={14} />
              <span>Membre depuis {daysSince} jour{daysSince !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ✅ StatCard avec support du masquage
function StatCard({ icon: Icon, label, value, color, classified }: { 
  icon: any, 
  label: string, 
  value: string | number, 
  color: string,
  classified: boolean 
}) {
  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 text-center">
      <Icon className={`${classified ? 'text-red-400' : color} mx-auto mb-2`} size={24} />
      <div className={`text-2xl font-black font-mono flex items-center gap-2 justify-center ${classified ? 'text-red-400' : 'text-white'}`}>
        {classified && <Lock size={16} />}
        {typeof value === 'number' && !classified ? value.toLocaleString() : value}
      </div>
      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</div>
    </div>
  );
}

// ✅ BuildingLevel avec support du masquage
function BuildingLevel({ label, level }: { label: string, level: number | string }) {
  const isClassified = typeof level === 'string' && level.includes('█');
  
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-400">{label}</span>
      <span className={`font-mono font-bold flex items-center gap-1 ${isClassified ? 'text-red-400' : 'text-white'}`}>
        {isClassified && <Lock size={10} />}
        {isClassified ? level : `Niv. ${level}`}
      </span>
    </div>
  );
}
