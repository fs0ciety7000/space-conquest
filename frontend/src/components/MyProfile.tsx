import { useState, useEffect, useRef } from "react";
import {
  User, Camera, Save, Globe, Trophy, Rocket, Shield,
  Calendar, Star, Award, Code2, Edit3, X, Check, Clock
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { apiUrl } from "@/config/api";

interface MyProfileProps {
  userId: string;
  username: string;
}

export default function MyProfile({ userId, username }: MyProfileProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bio, setBio] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = async () => {
    try {
      const res = await fetch(apiUrl(`/players/${userId}/profile?viewer_id=${userId}`));
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setBio(data.bio || "");
      }
    } catch {
      toast.error("Erreur de chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/webp", "image/png", "image/jpeg"];
    if (!allowed.includes(file.type)) {
      toast.error("Format non autorisé. Utilisez PNG, JPG ou WebP.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 20 Mo).");
      return;
    }

    setUploadingAvatar(true);
    const form = new FormData();
    form.append("avatar", file);
    try {
      const res = await fetch(apiUrl(`/users/${userId}/avatar`), {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev: any) => ({ ...prev, avatar_url: data.avatar_url }));
        toast.success("Avatar mis à jour !");
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur upload");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveBio = async () => {
    setSavingBio(true);
    try {
      const res = await fetch(apiUrl(`/users/${userId}/bio`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bio || null }),
      });
      if (res.ok) {
        setProfile((prev: any) => ({ ...prev, bio }));
        setEditingBio(false);
        toast.success("Bio mise à jour !");
      } else {
        toast.error("Erreur de mise à jour");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setSavingBio(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-500" />
      </div>
    );
  }

  const avatarSrc = profile?.avatar_url
    ? apiUrl(profile.avatar_url)
    : `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${username}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  const memberSince = profile?.created_at ? new Date(profile.created_at) : null;
  const daysSince = memberSince
    ? Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const lastLogin = profile?.last_login ? new Date(profile.last_login) : null;

  const getRankColor = (badge: string) => {
    if (badge?.includes("Empereur")) return "from-yellow-500 to-orange-600";
    if (badge?.includes("Seigneur")) return "from-purple-500 to-pink-600";
    if (badge?.includes("Amiral")) return "from-blue-500 to-indigo-600";
    if (badge?.includes("Commandant")) return "from-cyan-500 to-blue-600";
    if (badge?.includes("Capitaine")) return "from-green-500 to-emerald-600";
    return "from-slate-500 to-slate-600";
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="relative h-28 bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }} />
      </div>

      {/* Avatar + Info */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 px-4">
        {/* Avatar avec upload */}
        <div className="relative group">
          <div className="w-28 h-28 rounded-2xl bg-slate-900 border-4 border-slate-950 shadow-2xl overflow-hidden ring-4 ring-indigo-500/30">
            <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer"
          >
            {uploadingAvatar
              ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
              : <Camera size={24} className="text-white" />
            }
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
            <Camera size={10} className="text-white" />
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">
            {username}
          </h1>
          <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
            {profile?.rank_badge && (
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r ${getRankColor(profile.rank_badge)} text-white font-bold text-sm shadow-lg`}>
                <Award size={14} />
                {profile.rank_badge}
              </div>
            )}
            {profile?.is_admin && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-sm shadow-lg">
                <Code2 size={14} />
                Admin / Développeur
              </div>
            )}
          </div>
        </div>

        <div className="text-center bg-gradient-to-br from-indigo-950 to-purple-950 px-6 py-4 rounded-2xl border border-indigo-500/30">
          <div className="text-3xl font-black font-mono text-white">
            {typeof profile?.total_points === "number" ? profile.total_points.toLocaleString() : "—"}
          </div>
          <div className="text-xs text-indigo-300 uppercase font-bold tracking-widest flex items-center gap-1 justify-center">
            <Trophy size={10} /> Points Totaux
          </div>
        </div>
      </div>

      {/* Bio */}
      <Card className="bg-slate-900/50 border border-white/10">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
              <User size={14} /> Biographie
            </h3>
            {!editingBio ? (
              <button
                onClick={() => setEditingBio(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/50 text-indigo-400 hover:text-indigo-200 text-xs font-bold border border-indigo-900/30 transition-colors"
              >
                <Edit3 size={12} /> Modifier
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingBio(false); setBio(profile?.bio || ""); }}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
                <button
                  onClick={handleSaveBio}
                  disabled={savingBio}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 disabled:opacity-50"
                >
                  {savingBio ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <Check size={12} />}
                  Sauvegarder
                </button>
              </div>
            )}
          </div>
          {editingBio ? (
            <div>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 500))}
                placeholder="Parlez de vous, de votre stratégie, de votre empire..."
                className="bg-slate-950 border-slate-700 text-white min-h-[100px] resize-none"
              />
              <div className="text-right text-xs text-slate-500 mt-1">{bio.length}/500</div>
            </div>
          ) : (
            <p className="text-slate-300 text-sm leading-relaxed">
              {profile?.bio || <span className="text-slate-500 italic">Aucune biographie. Cliquez sur Modifier pour en ajouter une.</span>}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Globe} label="Planètes" value={profile?.planet_count ?? "—"} color="text-blue-400" />
        <StatCard icon={Rocket} label="Flotte" value={typeof profile?.total_fleet === "number" ? profile.total_fleet.toLocaleString() : "—"} color="text-purple-400" />
        <StatCard icon={Shield} label="Défenses" value={typeof profile?.total_defenses === "number" ? profile.total_defenses.toLocaleString() : "—"} color="text-red-400" />
        <StatCard icon={Star} label="Missions" value={typeof profile?.completed_missions === "number" ? profile.completed_missions : "—"} color="text-amber-400" />
      </div>

      {/* Dates */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        {daysSince !== null && (
          <div className="flex items-center gap-1.5">
            <Calendar size={12} />
            Membre depuis {daysSince} jour{daysSince !== 1 ? "s" : ""}
          </div>
        )}
        {lastLogin && (
          <div className="flex items-center gap-1.5">
            <Clock size={12} />
            Dernière connexion : {lastLogin.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>

      {/* Tip avatar */}
      <p className="text-[11px] text-slate-600 text-center">
        Formats acceptés : PNG, JPG, WebP — Max 20 Mo. Votre avatar est visible par tous les joueurs.
      </p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 text-center">
      <Icon className={`${color} mx-auto mb-2`} size={22} />
      <div className="text-2xl font-black font-mono text-white">{value}</div>
      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</div>
    </div>
  );
}
