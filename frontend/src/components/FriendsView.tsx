import { useState, useEffect } from "react";
import { Users, UserPlus, UserCheck, UserX, Trash2, Send, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiUrl } from "@/config/api";

interface Friend {
  friendship_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  status: "pending" | "accepted" | "declined";
  is_sender: boolean;
  created_at: string;
}

interface FriendsViewProps {
  userId: string;
  onSendMessage?: (username: string) => void;
}

export default function FriendsView({ userId, onSendMessage }: FriendsViewProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/users/${userId}/friends`));
      if (res.ok) {
        const data = await res.json();
        setFriends(data);
      }
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [userId]);

  const handleSendRequest = async () => {
    if (!searchQuery.trim()) return;
    setSending(true);
    try {
      const res = await fetch(apiUrl("/friends/request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender_id: userId, receiver_username: searchQuery.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Demande envoyée à ${data.receiver_username} !`);
        setSearchQuery("");
        fetchFriends();
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    try {
      const res = await fetch(apiUrl(`/friends/${friendshipId}/accept?user_id=${userId}`), {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Ami accepté !");
        fetchFriends();
      } else {
        const d = await res.json();
        toast.error(d.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  };

  const handleDecline = async (friendshipId: string) => {
    try {
      const res = await fetch(apiUrl(`/friends/${friendshipId}/decline?user_id=${userId}`), {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Demande déclinée.");
        fetchFriends();
      } else {
        const d = await res.json();
        toast.error(d.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  };

  const handleRemove = async (friendshipId: string, username: string) => {
    if (!confirm(`Retirer ${username} de vos amis ?`)) return;
    try {
      const res = await fetch(apiUrl(`/friends/${friendshipId}?user_id=${userId}`), {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Ami retiré.");
        fetchFriends();
      } else {
        const d = await res.json();
        toast.error(d.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  };

  const accepted = friends.filter((f) => f.status === "accepted");
  const pendingReceived = friends.filter((f) => f.status === "pending" && !f.is_sender);
  const pendingSent = friends.filter((f) => f.status === "pending" && f.is_sender);

  const getAvatarSrc = (f: Friend) =>
    f.avatar_url
      ? apiUrl(f.avatar_url)
      : `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${f.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Users size={22} className="text-indigo-400" />
        <h2 className="text-xl font-black text-white uppercase tracking-wide">Amis</h2>
        <span className="text-sm text-slate-400">({accepted.length} ami{accepted.length !== 1 ? "s" : ""})</span>
      </div>

      {/* Envoyer une demande */}
      <Card className="bg-slate-900/50 border border-white/10">
        <CardContent className="p-5">
          <h3 className="text-xs font-black uppercase text-indigo-400 mb-3 flex items-center gap-2">
            <UserPlus size={14} /> Ajouter un ami
          </h3>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendRequest()}
              placeholder="Nom d'utilisateur exact..."
              className="bg-slate-950 border-slate-700 text-white"
            />
            <Button
              onClick={handleSendRequest}
              disabled={sending || !searchQuery.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {sending ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Send size={16} />}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Les amis peuvent s'envoyer des ressources sans être dans la même alliance.
          </p>
        </CardContent>
      </Card>

      {/* Demandes reçues */}
      {pendingReceived.length > 0 && (
        <Card className="bg-amber-950/20 border border-amber-500/30">
          <CardContent className="p-5">
            <h3 className="text-xs font-black uppercase text-amber-400 mb-3 flex items-center gap-2">
              <UserCheck size={14} /> Demandes reçues ({pendingReceived.length})
            </h3>
            <div className="space-y-3">
              {pendingReceived.map((f) => (
                <div key={f.friendship_id} className="flex items-center gap-3 bg-black/30 p-3 rounded-lg">
                  <img src={getAvatarSrc(f)} alt="" className="w-10 h-10 rounded-xl" />
                  <span className="flex-1 text-white font-bold">{f.username}</span>
                  <button
                    onClick={() => handleAccept(f.friendship_id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-colors"
                  >
                    <UserCheck size={13} /> Accepter
                  </button>
                  <button
                    onClick={() => handleDecline(f.friendship_id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-colors"
                  >
                    <UserX size={13} /> Décliner
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demandes envoyées en attente */}
      {pendingSent.length > 0 && (
        <Card className="bg-slate-900/30 border border-white/10">
          <CardContent className="p-5">
            <h3 className="text-xs font-black uppercase text-slate-400 mb-3 flex items-center gap-2">
              <UserPlus size={14} /> Demandes envoyées ({pendingSent.length})
            </h3>
            <div className="space-y-3">
              {pendingSent.map((f) => (
                <div key={f.friendship_id} className="flex items-center gap-3 bg-black/30 p-3 rounded-lg">
                  <img src={getAvatarSrc(f)} alt="" className="w-10 h-10 rounded-xl" />
                  <span className="flex-1 text-white font-bold">{f.username}</span>
                  <span className="text-xs text-slate-500 italic">En attente...</span>
                  <button
                    onClick={() => handleRemove(f.friendship_id, f.username)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Amis acceptés */}
      <Card className="bg-slate-900/50 border border-white/10">
        <CardContent className="p-5">
          <h3 className="text-xs font-black uppercase text-indigo-400 mb-3 flex items-center gap-2">
            <Users size={14} /> Mes amis ({accepted.length})
          </h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
          ) : accepted.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">
              Vous n'avez pas encore d'amis. Utilisez la recherche ci-dessus pour en ajouter !
            </p>
          ) : (
            <div className="space-y-2">
              {accepted.map((f) => (
                <div key={f.friendship_id} className="flex items-center gap-3 bg-black/20 hover:bg-black/40 p-3 rounded-lg transition-colors group">
                  <img src={getAvatarSrc(f)} alt="" className="w-10 h-10 rounded-xl" />
                  <div className="flex-1">
                    <div className="text-white font-bold">{f.username}</div>
                    <div className="text-[10px] text-slate-500">
                      Ami depuis le {new Date(f.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  {onSendMessage && (
                    <button
                      onClick={() => onSendMessage(f.username)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-400 hover:text-indigo-200 text-xs font-bold border border-indigo-900/50 transition-all"
                    >
                      <Send size={11} /> Message
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(f.friendship_id, f.username)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
