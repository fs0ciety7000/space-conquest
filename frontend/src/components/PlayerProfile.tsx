import { useState, useEffect } from "react";
import { 
  User, Globe, Trophy, Rocket, Shield, Target, Zap, Award, 
  Star, Crown, Swords, TrendingUp, MapPin, Building, Atom, Calendar,
  X, Lock, Eye, EyeOff
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiUrl } from '@/config/api';
import { toast } from "sonner";

interface PlayerProfileProps {
  userId: string;
  onClose: () => void;
}

export default function PlayerProfile({ userId, onClose }: PlayerProfileProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(apiUrl(`/players/${userId}/profile`));
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

    fetchProfile();
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

  // Avatar généré
  const avatarUrl = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${profile.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  // Couleur du badge selon le rang
  const getRankColor = (badge: string) => {
    if (badge.includes("Empereur")) return "from-yellow-500 to-orange-600";
    if (badge.includes("Seigneur")) return "from-purple-500 to-pink-600";
    if (badge.includes("Amiral")) return "from-blue-500 to-indigo-600";
    if (badge.includes("Commandant")) return "from-cyan-500 to-blue-600";
    if (badge.includes("Capitaine")) return "from-green-500 to-emerald-600";
    return "from-slate-500 to-slate-600";
  };

  // Calcul du temps de jeu
  const memberSince = new Date(profile.created_at);
  const daysSince = Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24));

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
              
              {/* Badge de rang */}
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r ${getRankColor(profile.rank_badge)} text-white font-bold text-sm shadow-lg`}>
                <Award size={16} />
                {profile.rank_badge}
              </div>
            </div>

            {/* Points totaux */}
            <div className="text-center bg-gradient-to-br from-indigo-950 to-purple-950 px-6 py-4 rounded-2xl border border-indigo-500/30 shadow-lg">
              <div className="text-3xl font-black text-white font-mono">{profile.total_points.toLocaleString()}</div>
              <div className="text-xs text-indigo-300 uppercase font-bold tracking-widest flex items-center gap-1 justify-center">
                <Trophy size={12} /> Points Totaux
              </div>
            </div>
          </div>

          {/* Statistiques Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Globe} label="Planètes" value={profile.planet_count} color="text-blue-400" />
            <StatCard icon={Rocket} label="Flotte" value={profile.total_fleet.toLocaleString()} color="text-purple-400" />
            <StatCard icon={Shield} label="Défenses" value={profile.total_defenses.toLocaleString()} color="text-red-400" />
            <StatCard icon={Target} label="Missions" value={profile.completed_missions} color="text-green-400" />
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
                    <div className="text-xl font-mono font-bold text-indigo-400">{profile.main_planet.points.toLocaleString()}</div>
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
                    <div className="text-xs font-mono font-bold text-indigo-400">{planet.points.toLocaleString()}pts</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Footer - Membre depuis */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Calendar size={14} />
            <span>Membre depuis {daysSince} jours</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) {
  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 text-center">
      <Icon className={`${color} mx-auto mb-2`} size={24} />
      <div className="text-2xl font-black text-white font-mono">{value}</div>
      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</div>
    </div>
  );
}

function BuildingLevel({ label, level }: { label: string, level: number }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono font-bold text-white">Niv. {level}</span>
    </div>
  );
}
