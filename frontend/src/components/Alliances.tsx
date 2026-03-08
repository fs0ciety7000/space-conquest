import { useState, useEffect, useCallback } from "react";
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
  "from-indigo-500 to-purple-600",
  "from-emerald-400 to-cyan-600",
  "from-rose-500 to-orange-600",
  "from-amber-400 to-red-600",
  "from-blue-500 to-indigo-600",
  "from-fuchsia-500 to-pink-600",
  "from-violet-500 to-fuchsia-600",
  "from-cyan-400 to-blue-600"
];

// Fonction simple pour générer un index déterministe basé sur une string (le tag)
const getDeterministicIndex = (str: string, max: number) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % max;
};

export default function Alliances({ userId: _userId, onNavigate }: AlliancesProps) {
  const [alliances, setAlliances] = useState<AllianceItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

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

  // Fetch au mount
  useEffect(() => {
    fetchAlliances("");
  }, [fetchAlliances]);

  // Debounce sur la recherche
  useEffect(() => {
    const timer = setTimeout(() => fetchAlliances(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchAlliances]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Shield size={28} className="text-indigo-400" />
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-white">
            Réseau d'<span className="text-indigo-500">Alliances</span>
          </h1>
          {!loading && (
            <span className="text-xs text-slate-500 font-mono">{total} alliance{total !== 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Chercher une alliance..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-900/50 border-slate-800 text-white w-full"
            />
          </div>
          <Button
            className="bg-indigo-600 hover:bg-indigo-500 whitespace-nowrap card-depth shrink-0"
            onClick={() => onNavigate?.("alliance")}
          >
            Mon Alliance
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-indigo-400" />
        </div>
      ) : alliances.length === 0 ? (
        <div className="text-center text-slate-500 text-sm py-16">
          {search ? "Aucune alliance trouvée pour cette recherche." : "Aucune alliance pour le moment."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {alliances.map((alliance) => (
            <Card
              key={alliance.id}
              className="bg-slate-900/40 border border-white/10 card-depth hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] group"
            >
                <CardContent className="p-0 overflow-hidden relative">
                  {/* Banner/Header avec gradient déterministe */}
                  <div className={`h-20 w-full bg-gradient-to-r ${ALLIANCE_GRADIENTS[getDeterministicIndex(alliance.tag, ALLIANCE_GRADIENTS.length)]} opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-end px-6`}>
                     {(() => {
                        const Icon = ALLIANCE_ICONS[getDeterministicIndex(alliance.tag, ALLIANCE_ICONS.length)];
                        return <Icon size={40} className="text-white/30 group-hover:scale-110 transition-transform duration-500" />;
                     })()}
                  </div>
                  
                  <div className="px-6 pb-6 pt-4 relative">
                    <div className="flex justify-between items-start mb-4 -mt-10">
                      <div className="bg-slate-950 border border-white/10 rounded-xl p-3 shadow-xl inline-block backdrop-blur-md relative z-10">
                        <h3 className="text-xl font-black text-white group-hover:text-indigo-400 transition-colors">
                          {alliance.name}
                        </h3>
                        <p className="text-indigo-400 font-mono font-bold text-sm tracking-wider">[{alliance.tag}]</p>
                      </div>
                    </div>

                <p className="text-sm text-slate-400 mb-4 min-h-[40px] leading-relaxed">
                  {alliance.description || <span className="italic text-slate-600">Pas de description.</span>}
                </p>

                <p className="text-[10px] text-slate-600 font-mono mb-4">
                  Chef : <span className="text-slate-400">{alliance.leader_name}</span>
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1 flex items-center gap-1">
                      <Users size={12} /> Membres
                    </span>
                    <span className="text-white font-mono font-bold">{alliance.member_count}/50</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1 flex items-center gap-1 justify-end">
                      <Target size={12} /> Score Global
                    </span>
                    <span className="text-emerald-400 font-mono font-bold">{alliance.total_score.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  className="w-full bg-slate-800 hover:bg-indigo-600 text-white font-bold transition-all border border-transparent hover:border-indigo-400/50"
                  onClick={() => onNavigate?.("alliance")}
                >
                  {alliance.recruitment_policy === "open" ? `Rejoindre ${alliance.tag}` : `Voir ${alliance.tag}`}
                </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
