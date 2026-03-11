import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, User, Globe, Shield, Terminal, LogOut, Mail, Fingerprint, Moon, Sun, Volume2, VolumeX, GraduationCap, Music, Speaker, Calendar, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
import { useTheme } from "next-themes";
import { PlayerRankBadge } from "./PlayerRank";

interface SettingsProps {
  planet: any;
  onUpdate: () => void;
  onLogout: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  onStartTutorial: () => void;
  musicVolume?: number;
  sfxVolume?: number;
  onVolumeChange?: (type: 'music' | 'sfx', value: number) => void;
}

export default function Settings({
  planet,
  onUpdate,
  onLogout,
  soundEnabled,
  onToggleSound,
  onStartTutorial,
  musicVolume = 0.3,
  sfxVolume = 0.5,
  onVolumeChange
}: SettingsProps) {
  const [planetName, setPlanetName] = useState(planet.name);
  const [loading, setLoading] = useState(false);
  const { theme, setTheme } = useTheme();
  const [userStats, setUserStats] = useState<any>(null);

  const [newUsername, setNewUsername] = useState("");
  const [loadingUsername, setLoadingUsername] = useState(false);

  const username = localStorage.getItem('username') || "Commandant";
  const userId = localStorage.getItem('user_id') || "unknown";
  const email = localStorage.getItem('email') || "commandant@space-conquest.galaxy";

  const avatarUrl = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${username}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  useEffect(() => {
    const fetchUserStats = async () => {
      if (userId !== "unknown") {
        try {
          const res = await fetch(apiUrl(`/players/${userId}/profile?viewer_id=${userId}`));
          if (res.ok) {
            const data = await res.json();
            setUserStats(data);
          }
        } catch (error) {
          console.error('Erreur lors du chargement du profil:', error);
        }
      }
    };
    fetchUserStats();
  }, [userId]);

  const daysSince = userStats?.created_at
    ? Math.floor((Date.now() - new Date(userStats.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const getRankColor = (badge: string) => {
    if (badge?.includes("Empereur")) return "from-yellow-500 to-orange-600";
    if (badge?.includes("Seigneur")) return "from-purple-500 to-pink-600";
    if (badge?.includes("Amiral")) return "from-blue-500 to-indigo-600";
    if (badge?.includes("Commandant")) return "from-cyan-500 to-blue-600";
    if (badge?.includes("Capitaine")) return "from-green-500 to-emerald-600";
    return "from-slate-500 to-slate-600";
  };

  const handleRename = async () => {
    if (!planetName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/rename`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_name: planetName }),
      });
      if (res.ok) {
        toast.success("Système renommé", { description: `Désignation actuelle : ${planetName}` });
        onUpdate();
      } else {
        const data = await res.json();
        toast.error("Erreur", { description: data.error });
      }
    } catch (error) {
      toast.error("Lien neural rompu avec le serveur");
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameChange = async () => {
    if (!newUsername.trim()) {
      toast.error("Le nom d'utilisateur ne peut pas être vide");
      return;
    }
    setLoadingUsername(true);
    try {
      const res = await fetch(apiUrl(`/users/${userId}/username`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_username: newUsername }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('username', data.username);
        toast.success("Identité mise à jour", { description: `Nouveau nom : ${data.username}` });
        setNewUsername("");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const data = await res.json();
        if (res.status === 409) {
          toast.error("Nom déjà utilisé", { description: "Ce nom d'utilisateur est déjà pris" });
        } else {
          toast.error("Erreur", { description: data.error });
        }
      }
    } catch (error) {
      toast.error("Lien neural rompu avec le serveur");
    } finally {
      setLoadingUsername(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-20 max-w-4xl mx-auto"
    >
      {/* --- PROFIL COMMANDANT --- */}
      <Card className="bg-[rgba(16,8,46,0.95)] border-cyan-500/10 overflow-hidden backdrop-blur-[12px]">
        <div className="h-24 bg-gradient-to-r from-cyan-900/40 to-purple-900/40 opacity-80"></div>
        <CardContent className="relative pt-0">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-12 mb-6">
            <div className="w-32 h-32 rounded-2xl bg-[rgba(10,5,32,0.85)] border-4 border-[rgba(16,8,46,0.95)] shadow-2xl overflow-hidden">
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="pb-2 text-center md:text-left space-y-2">
              <h2 className="text-3xl font-black text-slate-200 uppercase tracking-tighter flex items-center gap-3 justify-center md:justify-start">
                {username} <Shield size={20} className="text-cyan-400" />
              </h2>
              <p className="text-slate-400 font-mono text-xs flex items-center gap-2 justify-center md:justify-start">
                <Fingerprint size={12} /> ID-CORE: {userId.substring(0, 8)}...
              </p>

              {userStats && (
                <div className="flex justify-center md:justify-start">
                  <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r ${getRankColor(userStats.rank_badge)} text-white font-bold text-sm shadow-lg`}>
                    <Award size={16} />
                    {userStats.rank_badge}
                  </div>
                </div>
              )}
            </div>
          </div>

          {userStats && (
            <div className="mb-6 p-4 bg-gradient-to-br from-cyan-950/20 to-purple-950/20 rounded-xl border border-cyan-500/10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <StatBox label="Points Totaux" value={userStats.total_points.toLocaleString()} color="text-yellow-400" />
                <StatBox label="Économie" value={userStats.economy_points.toLocaleString()} color="text-green-400" />
                <StatBox label="Militaire" value={userStats.military_points.toLocaleString()} color="text-red-400" />
                <StatBox label="Planètes" value={userStats.planet_count} color="text-cyan-400" />
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 border-t border-cyan-500/10 pt-3">
                <Calendar size={14} />
                <span>Commandant depuis {daysSince} jour{daysSince !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-cyan-500/10 pt-6">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-cyan-500/10">
              <Mail className="text-slate-500" size={18} />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Canal de communication</p>
                <p className="text-sm text-slate-200 font-mono">{email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-cyan-500/10">
              <Globe className="text-slate-500" size={18} />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Planète Capitale</p>
                <p className="text-sm text-slate-200 font-mono">{planet.name}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* --- GESTION DU COMPTE --- */}
        <Card className="bg-[rgba(10,5,32,0.85)] border-cyan-500/10 text-slate-200 backdrop-blur-[12px]">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1 pb-2 border-b border-cyan-500/10">
              <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
              <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Identité du Commandant</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nom d'utilisateur actuel</label>
              <div className="p-3 bg-black/40 border border-cyan-500/10 rounded text-slate-200 font-mono text-sm">
                {username}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nouveau nom d'utilisateur</label>
              <div className="flex gap-2">
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Entrez un nouveau nom..."
                  className="bg-black/40 border-cyan-500/10 text-slate-200 font-mono focus:border-cyan-500/30"
                />
                <Button
                  onClick={handleUsernameChange}
                  disabled={loadingUsername || !newUsername.trim()}
                  className="bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-500/20"
                >
                  <Save size={16} />
                </Button>
              </div>
            </div>
            <div className="p-3 bg-cyan-500/5 rounded border border-cyan-500/10">
              <p className="text-[10px] text-cyan-300 leading-relaxed italic">
                "Votre identité sera mise à jour dans tous les systèmes de la galaxie. Choisissez avec soin."
              </p>
            </div>
          </CardContent>
        </Card>

        {/* --- CONFIGURATION PLANÈTE --- */}
        <Card className="bg-[rgba(10,5,32,0.85)] border-cyan-500/10 text-slate-200 backdrop-blur-[12px]">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1 pb-2 border-b border-cyan-500/10">
              <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
              <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Identifiant Planétaire</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nom de la colonie</label>
              <div className="flex gap-2">
                <Input
                  value={planetName}
                  onChange={(e) => setPlanetName(e.target.value)}
                  className="bg-black/40 border-cyan-500/10 text-slate-200 font-mono focus:border-cyan-500/30"
                />
                <Button
                  onClick={handleRename}
                  disabled={loading || planetName === planet.name}
                  className="bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-500/20"
                >
                  <Save size={16} />
                </Button>
              </div>
            </div>
            <div className="p-3 bg-cyan-500/5 rounded border border-cyan-500/10">
              <p className="text-[10px] text-cyan-300 leading-relaxed italic">
                "La désignation officielle de votre planète est transmise aux relais subspatiaux et sera visible par tous les commandants de la galaxie."
              </p>
            </div>
          </CardContent>
        </Card>

        {/* --- APPARENCE & ACTIONS --- */}
        <Card className="bg-[rgba(10,5,32,0.85)] border-cyan-500/10 text-slate-200 backdrop-blur-[12px]">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1 pb-2 border-b border-cyan-500/10">
              <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
              <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Interface & Sécurité</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle thème */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Mode d'affichage</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme('light')}
                  className={`flex-1 border-cyan-500/10 ${theme === 'light' ? 'bg-cyan-500/10 border-cyan-500/30 text-slate-200' : 'bg-white/5 text-slate-400'}`}
                >
                  <Sun size={16} className="mr-2" />
                  Clair
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme('dark')}
                  className={`flex-1 border-cyan-500/10 ${theme === 'dark' ? 'bg-cyan-500/10 border-cyan-500/30 text-slate-200' : 'bg-white/5 text-slate-400'}`}
                >
                  <Moon size={16} className="mr-2" />
                  Sombre
                </Button>
              </div>
            </div>

            {/* Toggle audio */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Effets sonores</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleSound(true)}
                  className={`flex-1 border-cyan-500/10 ${soundEnabled ? 'bg-cyan-500/10 border-cyan-500/30 text-slate-200' : 'bg-white/5 text-slate-400'}`}
                >
                  <Volume2 size={16} className="mr-2" />
                  Activé
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleSound(false)}
                  className={`flex-1 border-cyan-500/10 ${!soundEnabled ? 'bg-cyan-500/10 border-cyan-500/30 text-slate-200' : 'bg-white/5 text-slate-400'}`}
                >
                  <VolumeX size={16} className="mr-2" />
                  Désactivé
                </Button>
              </div>
            </div>

            {/* Contrôles de volume */}
            {soundEnabled && onVolumeChange && (
              <div className="space-y-4 pt-2 border-t border-cyan-500/10">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Music size={12} /> Musique d'ambiance
                    </label>
                    <span className="text-xs text-cyan-400 font-mono">{Math.round(musicVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={musicVolume}
                    onChange={(e) => onVolumeChange('music', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Speaker size={12} /> Effets sonores
                    </label>
                    <span className="text-xs text-cyan-400 font-mono">{Math.round(sfxVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sfxVolume}
                    onChange={(e) => onVolumeChange('sfx', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3 pt-4 border-t border-cyan-500/10">
              <Button
                variant="outline"
                className="w-full border-cyan-500/20 bg-cyan-950/20 hover:bg-cyan-900/30 text-xs text-cyan-300 flex items-center justify-between"
                onClick={onStartTutorial}
              >
                <span className="flex items-center gap-2">
                  <GraduationCap size={16} />
                  RELANCER LE TUTORIEL
                </span>
                <ArrowRight size={14} />
              </Button>
              <Button
                variant="outline"
                className="w-full border-cyan-500/10 bg-white/5 hover:bg-white/10 text-xs text-slate-300 flex items-center justify-between"
                onClick={() => toast.info("Module en développement", { description: "Le cryptage de mot de passe est déjà actif." })}
              >
                CHANGER LE MOT DE PASSE <ArrowRight size={14} />
              </Button>
              <Button
                variant="destructive"
                className="w-full bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 flex items-center gap-2 justify-center font-bold tracking-widest text-xs"
                onClick={onLogout}
              >
                <LogOut size={16} /> DÉCONNEXION DU TERMINAL
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

function StatBox({ label, value, color }: { label: string, value: string | number, color: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-black ${color} font-mono tabular-nums`}>{value}</div>
      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{label}</div>
    </div>
  );
}

function ArrowRight({ size, className }: { size: number, className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14"/>
      <path d="m12 5 7 7-7 7"/>
    </svg>
  );
}
