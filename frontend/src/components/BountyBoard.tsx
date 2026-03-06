import { useState, useEffect } from "react";
import { Crosshair, Plus, X, AlertTriangle, Check, Clock, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { apiUrl } from "@/config/api";

interface Bounty {
  id: string;
  poster_id: string;
  poster_username: string;
  target_id: string;
  target_username: string;
  target_avatar_url: string | null;
  mercenary_id: string | null;
  mercenary_username: string | null;
  reward_metal: number;
  reward_crystal: number;
  reward_deuterium: number;
  reason: string | null;
  status: string;
  expires_at: string;
  created_at: string;
}

interface BountyBoardProps {
  userId: string;
  planetId: string;
  planet: { metal_amount: number; crystal_amount: number; deuterium_amount: number };
}

export default function BountyBoard({ userId, planetId, planet }: BountyBoardProps) {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<"open" | "accepted" | "completed">("open");

  // Form state
  const [targetUsername, setTargetUsername] = useState("");
  const [metal, setMetal] = useState("");
  const [crystal, setCrystal] = useState("");
  const [deuterium, setDeuterium] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Player search for target
  const [searchResults, setSearchResults] = useState<{ user_id: string; username: string; avatar_url: string | null }[]>([]);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const fetchBounties = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/bounties?status=${filter}`));
      if (res.ok) setBounties(await res.json());
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBounties(); }, [filter]);

  const handleTargetSearch = (q: string) => {
    setTargetUsername(q);
    setTargetId(null);
    if (searchTimer) clearTimeout(searchTimer);
    if (q.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(apiUrl(`/players/search?q=${encodeURIComponent(q)}&exclude=${userId}`));
      if (res.ok) setSearchResults(await res.json());
    }, 250);
    setSearchTimer(t);
  };

  const selectTarget = (r: { user_id: string; username: string; avatar_url: string | null }) => {
    setTargetUsername(r.username);
    setTargetId(r.user_id);
    setSearchResults([]);
  };

  const handleCreate = async () => {
    if (!targetId) { toast.error("Sélectionnez une cible"); return; }
    const rm = parseFloat(metal) || 0;
    const rc = parseFloat(crystal) || 0;
    const rd = parseFloat(deuterium) || 0;
    if (rm + rc + rd <= 0) { toast.error("La prime doit inclure des ressources"); return; }
    if (rm > planet.metal_amount || rc > planet.crystal_amount || rd > planet.deuterium_amount) {
      toast.error("Ressources insuffisantes"); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/bounties"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poster_id: userId,
          target_id: targetId,
          reward_metal: rm,
          reward_crystal: rc,
          reward_deuterium: rd,
          reason: reason.trim() || null,
          planet_id: planetId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Prime placée !");
        setShowCreate(false);
        setTargetUsername(""); setTargetId(null);
        setMetal(""); setCrystal(""); setDeuterium(""); setReason("");
        fetchBounties();
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch { toast.error("Erreur réseau"); }
    finally { setSubmitting(false); }
  };

  const handleCancel = async (b: Bounty) => {
    try {
      const res = await fetch(apiUrl(`/bounties/${b.id}/cancel`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) { toast.success("Prime annulée et remboursée."); fetchBounties(); }
      else { const d = await res.json(); toast.error(d.error || "Erreur"); }
    } catch { toast.error("Erreur réseau"); }
  };

  const handleAccept = async (b: Bounty) => {
    try {
      const res = await fetch(apiUrl(`/bounties/${b.id}/accept`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) { toast.success("Contrat accepté ! Détruisez la flotte de la cible pour encaisser la prime."); fetchBounties(); }
      else { const d = await res.json(); toast.error(d.error || "Erreur"); }
    } catch { toast.error("Erreur réseau"); }
  };

  const formatRes = (v: number) => v > 0 ? v.toLocaleString() : null;

  const getAvatarSrc = (username: string, url: string | null) =>
    url ? apiUrl(url) : `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${username}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  const statusColor = (s: string) => ({
    open: "text-amber-400 bg-amber-950/40 border-amber-700/40",
    accepted: "text-blue-400 bg-blue-950/40 border-blue-700/40",
    completed: "text-green-400 bg-green-950/40 border-green-700/40",
    cancelled: "text-slate-500 bg-slate-900/40 border-slate-700/40",
    expired: "text-slate-600 bg-slate-900/30 border-slate-800/40",
  }[s] || "text-slate-400");

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <Crosshair className="text-amber-400" size={24} />
            Tableau des Primes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Placez des primes sur vos agresseurs. Des mercenaires accepteront le contrat pour encaisser la récompense.
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(s => !s)}
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-2"
        >
          {showCreate ? <X size={14} /> : <Plus size={14} />}
          {showCreate ? "Annuler" : "Placer une prime"}
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="bg-amber-950/20 border border-amber-700/40">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={14} /> Nouveau contrat
            </h3>

            {/* Target search */}
            <div className="relative">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 block">Cible</label>
              <Input
                value={targetUsername}
                onChange={e => handleTargetSearch(e.target.value)}
                placeholder="Nom du joueur..."
                className="bg-slate-950 border-amber-900/50 text-white"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
                  {searchResults.map(r => (
                    <button
                      key={r.user_id}
                      onMouseDown={() => selectTarget(r)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 transition-colors text-left"
                    >
                      <img src={getAvatarSrc(r.username, r.avatar_url)} alt="" className="w-7 h-7 rounded-lg" />
                      <span className="text-sm font-bold text-white">{r.username}</span>
                    </button>
                  ))}
                </div>
              )}
              {targetId && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-green-400">
                  <Check size={11} /> Cible sélectionnée
                </div>
              )}
            </div>

            {/* Resources */}
            <div>
              <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 block">Récompense</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Métal</div>
                  <Input type="number" min="0" value={metal} onChange={e => setMetal(e.target.value)} placeholder="0" className="bg-slate-950 border-slate-700 text-white" />
                  <div className="text-[10px] text-slate-600 mt-0.5">Dispo : {planet.metal_amount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Cristal</div>
                  <Input type="number" min="0" value={crystal} onChange={e => setCrystal(e.target.value)} placeholder="0" className="bg-slate-950 border-slate-700 text-white" />
                  <div className="text-[10px] text-slate-600 mt-0.5">Dispo : {planet.crystal_amount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Deutérium</div>
                  <Input type="number" min="0" value={deuterium} onChange={e => setDeuterium(e.target.value)} placeholder="0" className="bg-slate-950 border-slate-700 text-white" />
                  <div className="text-[10px] text-slate-600 mt-0.5">Dispo : {planet.deuterium_amount.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 block">Raison (optionnel)</label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value.slice(0, 300))}
                placeholder="Décrivez ce que cet agresseur vous a fait..."
                className="bg-slate-950 border-slate-700 text-white resize-none min-h-[60px]"
              />
              <div className="text-right text-xs text-slate-600 mt-0.5">{reason.length}/300</div>
            </div>

            <p className="text-xs text-amber-700/80">
              Les ressources seront immédiatement prélevées. La prime expire dans 7 jours si non complétée. Annulation possible avec remboursement.
            </p>

            <Button
              onClick={handleCreate}
              disabled={submitting || !targetId}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black"
            >
              {submitting ? "Envoi..." : "Placer la prime"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["open", "accepted", "completed"] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${filter === s ? "bg-amber-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"}`}
          >
            {s === "open" ? "Ouvertes" : s === "accepted" ? "En cours" : "Complétées"}
          </button>
        ))}
      </div>

      {/* Bounties list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-amber-500" />
        </div>
      ) : bounties.length === 0 ? (
        <div className="text-center py-16 text-slate-600">
          <Crosshair size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold">Aucune prime {filter === "open" ? "disponible" : filter === "accepted" ? "en cours" : "complétée"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bounties.map(b => {
            const isMyBounty = b.poster_id === userId;
            const isTarget = b.target_id === userId;
            const isMercenary = b.mercenary_id === userId;
            const expired = new Date(b.expires_at) < new Date();
            const rewards = [
              formatRes(b.reward_metal) && `${formatRes(b.reward_metal)} métal`,
              formatRes(b.reward_crystal) && `${formatRes(b.reward_crystal)} cristal`,
              formatRes(b.reward_deuterium) && `${formatRes(b.reward_deuterium)} deutérium`,
            ].filter(Boolean);

            return (
              <Card key={b.id} className={`border ${isTarget ? "border-red-900/50 bg-red-950/10" : "bg-slate-900/50 border-white/8"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Target avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={getAvatarSrc(b.target_username, b.target_avatar_url)}
                        alt=""
                        className="w-12 h-12 rounded-xl"
                      />
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center">
                        <Crosshair size={10} className="text-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-white">{b.target_username}</span>
                        {isTarget && <span className="text-xs text-red-400 font-bold">(Vous)</span>}
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${statusColor(b.status)}`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Posté par <span className="text-white font-bold">{b.poster_username}</span>
                        {isMyBounty && <span className="text-amber-400 ml-1">(vous)</span>}
                        {b.mercenary_username && <span className="ml-2">• Mercenaire: <span className="text-blue-400 font-bold">{b.mercenary_username}</span>{isMercenary && <span className="text-blue-300 ml-1">(vous)</span>}</span>}
                      </div>

                      {b.reason && (
                        <p className="text-xs text-slate-500 italic mt-1 line-clamp-2">"{b.reason}"</p>
                      )}

                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-800/30 rounded-lg px-3 py-1">
                          <span className="text-xs font-black text-amber-400">{rewards.join(" + ")}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-600">
                          <Clock size={10} />
                          {expired ? "Expirée" : `Expire le ${new Date(b.expires_at).toLocaleDateString("fr-FR")}`}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {b.status === "open" && isMyBounty && (
                        <button
                          onClick={() => handleCancel(b)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 text-xs font-bold transition-colors"
                        >
                          <X size={12} /> Annuler
                        </button>
                      )}
                      {b.status === "open" && !isMyBounty && !isTarget && (
                        <button
                          onClick={() => handleAccept(b)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
                        >
                          <Shield size={12} /> Accepter le contrat
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
