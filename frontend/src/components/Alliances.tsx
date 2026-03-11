import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, Users, Search, Target, Loader2, Swords, Globe, Rocket, Crown, Star, Zap, Crosshair } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/config/api";

interface AlliancesProps {
  userId: string;
  onNavigate?: (tab: string) => void;
}

interface AllianceItem {
  id: string;
  name: string;
  tag: string;
  description: string | null;
  leader_name: string;
  member_count: number;
  total_score: number;
  recruitment_policy: string;
}

const ALLIANCE_ICONS = [Shield, Swords, Globe, Rocket, Crown, Star, Zap, Crosshair];
const ALLIANCE_GRADIENTS = [
  "from-cyan-500 to-blue-600",
  "from-emerald-400 to-cyan-600",
  "from-rose-500 to-orange-600",
  "from-amber-400 to-red-600",
  "from-blue-500 to-indigo-600",
  "from-fuchsia-500 to-pink-600",
  "from-violet-500 to-fuchsia-600",
  "from-cyan-400 to-blue-600"
];

const getDeterministicIndex = (str: string, max: number) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % max;
};

export default function Alliances({ userId, onNavigate }: AlliancesProps) {
  const [alliances, setAlliances] = useState<AllianceItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [myAllianceId, setMyAllianceId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(apiUrl(`/alliances/my?user_id=${userId}`))
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.has_alliance && d.alliance_id) setMyAllianceId(d.alliance_id); })
      .catch(() => {});
  }, [userId]);

  const fetchAlliances = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: "30" });
      if (query.trim()) params.set("search", query.trim());
      const res = await fetch(apiUrl(`/alliances?${params}`));
      if (!res.ok) return;
      const data = await res.json();
      setAlliances(data.alliances ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error("Failed to fetch alliances", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlliances("");
  }, [fetchAlliances]);

  useEffect(() => {
    const timer = setTimeout(() => fetchAlliances(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchAlliances]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto p-4 md:p-6 space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Shield size={28} className="text-cyan-400" />
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-slate-200">
            Réseau d'<span className="text-cyan-500">Alliances</span>
          </h1>
          {!loading && (
            <span className="text-xs text-slate-500 font-mono tabular-nums">{total} alliance{total !== 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Chercher une alliance..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[rgba(10,5,32,0.85)] border-cyan-500/10 text-slate-200 w-full focus:border-cyan-500/30"
            />
          </div>
          <Button
            className="bg-cyan-600 hover:bg-cyan-500 whitespace-nowrap card-depth shrink-0"
            onClick={() => onNavigate?.("alliance")}
          >
            Mon Alliance
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-cyan-400" />
        </div>
      ) : alliances.length === 0 ? (
        <div className="text-center text-slate-500 text-sm py-16">
          {search ? "Aucune alliance trouvée pour cette recherche." : "Aucune alliance pour le moment."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {alliances.map((alliance) => (
            <motion.div
              key={alliance.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                className="bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 backdrop-blur-[12px] card-depth hover:-translate-y-1 transition-all duration-300 hover:border-cyan-500/30 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] group"
              >
                <CardContent className="p-0 overflow-hidden relative">
                  {/* Banner with deterministic gradient */}
                  <div className={`h-20 w-full bg-gradient-to-r ${ALLIANCE_GRADIENTS[getDeterministicIndex(alliance.tag, ALLIANCE_GRADIENTS.length)]} opacity-70 group-hover:opacity-90 transition-opacity flex items-center justify-end px-6`}>
                    {(() => {
                      const Icon = ALLIANCE_ICONS[getDeterministicIndex(alliance.tag, ALLIANCE_ICONS.length)];
                      return <Icon size={40} className="text-white/30 group-hover:scale-110 transition-transform duration-500" />;
                    })()}
                  </div>

                  <div className="px-6 pb-6 pt-4 relative">
                    <div className="flex justify-between items-start mb-4 -mt-10">
                      <div className="bg-[rgba(16,8,46,0.95)] border border-cyan-500/10 rounded-xl p-3 shadow-xl inline-block backdrop-blur-[12px] relative z-10">
                        <h3 className="text-xl font-black text-slate-200 group-hover:text-cyan-400 transition-colors">
                          {alliance.name}
                        </h3>
                        <p className="text-cyan-400 font-mono font-bold text-sm tracking-wider">[{alliance.tag}]</p>
                      </div>
                    </div>

                    <p className="text-sm text-slate-400 mb-4 min-h-[40px] leading-relaxed">
                      {alliance.description || <span className="italic text-slate-600">Pas de description.</span>}
                    </p>

                    <p className="text-[10px] text-slate-600 font-mono mb-4">
                      Chef : <span className="text-slate-400">{alliance.leader_name}</span>
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-cyan-500/10 mb-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1 flex items-center gap-1">
                          <Users size={12} /> Membres
                        </span>
                        <span className="text-slate-200 font-mono font-bold tabular-nums">{alliance.member_count}/50</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1 flex items-center gap-1 justify-end">
                          <Target size={12} /> Score Global
                        </span>
                        <span className="text-emerald-400 font-mono font-bold tabular-nums">{alliance.total_score.toLocaleString()}</span>
                      </div>
                    </div>

                    {myAllianceId === alliance.id ? (
                      <Button
                        className="w-full bg-cyan-700/50 text-cyan-300 font-bold border border-cyan-500/30 cursor-default"
                        disabled
                      >
                        Mon Alliance
                      </Button>
                    ) : myAllianceId ? (
                      <Button
                        className="w-full bg-slate-800/50 text-slate-500 font-bold border border-transparent cursor-not-allowed"
                        disabled
                      >
                        Déjà dans une alliance
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-slate-800 hover:bg-cyan-600/30 text-slate-200 font-bold transition-all border border-cyan-500/10 hover:border-cyan-500/30"
                        onClick={() => onNavigate?.("alliance")}
                      >
                        {alliance.recruitment_policy === "open" ? `Rejoindre ${alliance.tag}` : `Voir ${alliance.tag}`}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
