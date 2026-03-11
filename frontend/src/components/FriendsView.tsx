import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, UserCheck, UserX, Trash2, Send, Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiUrl } from "@/config/api";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface Friend {
  friendship_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  status: "pending" | "accepted" | "declined";
  is_sender: boolean;
  created_at: string;
}

interface SearchResult {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface FriendsViewProps {
  userId: string;
  onSendMessage?: (username: string) => void;
}

export default function FriendsView({ userId, onSendMessage }: FriendsViewProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<{ friendshipId: string; username: string } | null>(null);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/users/${userId}/friends`));
      if (res.ok) setFriends(await res.json());
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [userId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setShowDropdown(false); return; }
    setSearching(true);
    try {
      const res = await fetch(apiUrl(`/players/search?q=${encodeURIComponent(q)}&exclude=${userId}`));
      if (res.ok) {
        const data: SearchResult[] = await res.json();
        setResults(data);
        setShowDropdown(data.length > 0);
      }
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  }, [userId]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 250);
  };

  const selectResult = (r: SearchResult) => {
    setSelected(r);
    setQuery(r.username);
    setShowDropdown(false);
    setResults([]);
  };

  const clearSearch = () => {
    setQuery("");
    setSelected(null);
    setResults([]);
    setShowDropdown(false);
  };

  const handleSendRequest = async () => {
    const targetUsername = selected?.username || query.trim();
    if (!targetUsername) return;
    setSending(true);
    try {
      const res = await fetch(apiUrl("/friends/request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender_id: userId, receiver_username: targetUsername }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Demande envoyée à ${data.receiver_username} !`);
        clearSearch();
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
      const res = await fetch(apiUrl(`/friends/${friendshipId}/accept?user_id=${userId}`), { method: "POST" });
      if (res.ok) { toast.success("Ami accepté !"); fetchFriends(); }
      else { const d = await res.json(); toast.error(d.error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  };

  const handleDecline = async (friendshipId: string) => {
    try {
      const res = await fetch(apiUrl(`/friends/${friendshipId}/decline?user_id=${userId}`), { method: "POST" });
      if (res.ok) { toast.success("Demande déclinée."); fetchFriends(); }
      else { const d = await res.json(); toast.error(d.error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  };

  const handleRemove = (friendshipId: string, username: string) => {
    setPendingRemove({ friendshipId, username });
    setConfirmOpen(true);
  };

  const doRemove = async (friendshipId: string) => {
    try {
      const res = await fetch(apiUrl(`/friends/${friendshipId}?user_id=${userId}`), { method: "DELETE" });
      if (res.ok) { toast.success("Ami retiré."); fetchFriends(); }
      else { const d = await res.json(); toast.error(d.error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  };

  const accepted = friends.filter((f) => f.status === "accepted");
  const pendingReceived = friends.filter((f) => f.status === "pending" && !f.is_sender);
  const pendingSent = friends.filter((f) => f.status === "pending" && f.is_sender);

  const getAvatarSrc = (username: string, avatar_url: string | null) =>
    avatar_url
      ? apiUrl(avatar_url)
      : `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${username}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto p-6 space-y-6"
    >
      <div className="flex items-center gap-3 mb-2">
        <Users size={22} className="text-cyan-400" />
        <h2 className="text-xl font-black text-slate-200 uppercase tracking-wide">Amis</h2>
        <span className="text-sm text-slate-400">({accepted.length} ami{accepted.length !== 1 ? "s" : ""})</span>
      </div>

      {/* Ajouter un ami — recherche live */}
      <Card className="bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 backdrop-blur-[12px]">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70 flex items-center gap-2">
              <UserPlus size={12} /> Ajouter un ami
            </span>
          </div>

          <div ref={searchRef} className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <Input
                  value={query}
                  onChange={handleQueryChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { setShowDropdown(false); handleSendRequest(); }
                    if (e.key === "Escape") clearSearch();
                  }}
                  onFocus={() => results.length > 0 && setShowDropdown(true)}
                  placeholder="Tapez les premières lettres d'un pseudo..."
                  className="bg-[rgba(5,0,15,0.8)] border-cyan-500/10 text-slate-200 pl-8 pr-8 focus:border-cyan-500/30"
                />
                {query && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <Button
                onClick={handleSendRequest}
                disabled={sending || !query.trim()}
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                {sending
                  ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  : <Send size={16} />
                }
              </Button>
            </div>

            {/* Dropdown */}
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-10 mt-1 z-50 bg-[rgba(16,8,46,0.95)] border border-cyan-500/10 rounded-xl overflow-hidden shadow-2xl backdrop-blur-[12px]"
                >
                  {searching ? (
                    <div className="flex justify-center py-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500" />
                    </div>
                  ) : results.map(r => (
                    <button
                      key={r.user_id}
                      onMouseDown={() => selectResult(r)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cyan-500/5 transition-colors text-left"
                    >
                      <img
                        src={getAvatarSrc(r.username, r.avatar_url)}
                        alt=""
                        className="w-7 h-7 rounded-lg"
                      />
                      <span className="text-sm font-bold text-slate-200">{r.username}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="text-xs text-slate-500 mt-2">
            Les amis peuvent s'envoyer des ressources sans être dans la même alliance.
          </p>
        </CardContent>
      </Card>

      {/* Demandes reçues */}
      <AnimatePresence>
        {pendingReceived.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card className="bg-cyan-500/5 border border-cyan-500/15 backdrop-blur-[12px]">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
                  <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
                  <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70 flex items-center gap-2">
                    <UserCheck size={12} /> Demandes reçues ({pendingReceived.length})
                  </span>
                </div>
                <div className="space-y-3">
                  {pendingReceived.map((f) => (
                    <div key={f.friendship_id} className="flex items-center gap-3 bg-black/30 p-3 rounded-lg border border-cyan-500/10">
                      <img src={getAvatarSrc(f.username, f.avatar_url)} alt="" className="w-10 h-10 rounded-xl" />
                      <span className="flex-1 text-slate-200 font-bold">{f.username}</span>
                      <button
                        onClick={() => handleAccept(f.friendship_id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-colors"
                      >
                        <UserCheck size={13} /> Accepter
                      </button>
                      <button
                        onClick={() => handleDecline(f.friendship_id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition-colors"
                      >
                        <UserX size={13} /> Décliner
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demandes envoyées */}
      {pendingSent.length > 0 && (
        <Card className="bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 backdrop-blur-[12px]">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
              <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
              <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70 flex items-center gap-2">
                <UserPlus size={12} /> Demandes envoyées ({pendingSent.length})
              </span>
            </div>
            <div className="space-y-3">
              {pendingSent.map((f) => (
                <div key={f.friendship_id} className="flex items-center gap-3 bg-black/30 p-3 rounded-lg border border-cyan-500/10">
                  <img src={getAvatarSrc(f.username, f.avatar_url)} alt="" className="w-10 h-10 rounded-xl" />
                  <span className="flex-1 text-slate-200 font-bold">{f.username}</span>
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
      <Card className="bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 backdrop-blur-[12px]">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70 flex items-center gap-2">
              <Users size={12} /> Mes amis ({accepted.length})
            </span>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
            </div>
          ) : accepted.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">
              Vous n'avez pas encore d'amis. Utilisez la recherche ci-dessus pour en ajouter !
            </p>
          ) : (
            <div className="space-y-2">
              {accepted.map((f) => (
                <motion.div
                  key={f.friendship_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 bg-black/20 hover:bg-black/40 p-3 rounded-lg transition-colors group border-l-2 border-emerald-500/40"
                >
                  <img src={getAvatarSrc(f.username, f.avatar_url)} alt="" className="w-10 h-10 rounded-xl" />
                  <div className="flex-1">
                    <div className="text-slate-200 font-bold">{f.username}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Ami depuis le {new Date(f.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  {onSendMessage && (
                    <button
                      onClick={() => onSendMessage(f.username)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 text-cyan-400 hover:text-cyan-200 text-xs font-bold border border-cyan-500/20 transition-all"
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
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmModal
        isOpen={confirmOpen}
        title="Retirer un ami"
        message={pendingRemove ? `Retirer ${pendingRemove.username} de vos amis ?` : 'Confirmer ?'}
        variant="danger"
        confirmLabel="Retirer"
        onConfirm={() => {
          if (pendingRemove) doRemove(pendingRemove.friendshipId);
          setConfirmOpen(false);
          setPendingRemove(null);
        }}
        onCancel={() => { setConfirmOpen(false); setPendingRemove(null); }}
      />
    </motion.div>
  );
}
