import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, Zap, Shield, TrendingUp, Loader2 } from "lucide-react";
import { apiUrl } from "@/config/api";

interface DashboardProps {
  userId: string;
}

interface ProductionPoint {
  day: string;
  label: string;
  metal: number;
  crystal: number;
  deuterium: number;
}

interface AnalyticsStats {
  energy_efficiency: number;
  victories_7d: number;
  total_score: number;
  economy_score: number;
  military_score: number;
}

interface AnalyticsData {
  weekly_production: ProductionPoint[];
  stats: AnalyticsStats;
}

export default function Dashboard({ userId }: DashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(apiUrl(`/analytics?user_id=${userId}`))
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  const production = data?.weekly_production ?? [];
  const stats = data?.stats;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <Activity size={28} className="text-indigo-400" />
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-white">
          Tableau de Bord <span className="text-indigo-500">Analytique</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          icon={TrendingUp}
          title="Score Total"
          value={stats ? stats.total_score.toLocaleString() : "—"}
          desc={`Économie : ${stats?.economy_score.toLocaleString() ?? "—"}`}
          color="text-emerald-400"
        />
        <StatCard
          icon={Zap}
          title="Efficacité Énergétique"
          value={stats ? `${stats.energy_efficiency}%` : "—"}
          desc="Ratio solaire moyen de vos planètes"
          color="text-yellow-400"
        />
        <StatCard
          icon={Shield}
          title="Score Militaire"
          value={stats ? stats.military_score.toLocaleString() : "—"}
          desc="Flotte et défenses actives"
          color="text-red-400"
        />
        <StatCard
          icon={Activity}
          title="Victoires (7 jours)"
          value={stats ? String(stats.victories_7d) : "—"}
          desc="Combats remportés cette semaine"
          color="text-blue-400"
        />
      </div>

      <Card className="bg-slate-900/50 border border-white/10 card-depth">
        <CardHeader>
          <CardTitle className="text-lg font-bold uppercase tracking-widest text-slate-300">
            Production Journalière (capacité actuelle)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {production.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
              Aucune donnée de production disponible.
            </div>
          ) : (
            <div className="h-[300px] md:h-[400px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={production}>
                  <defs>
                    <linearGradient id="colorMetal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fca5a5" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#fca5a5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCrystal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#67e8f9" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#67e8f9" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDeut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#86efac" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#86efac" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any) => [Number(v).toLocaleString()]}
                  />
                  <Area type="monotone" dataKey="metal"     stroke="#f87171" fillOpacity={1} fill="url(#colorMetal)"   name="Métal" />
                  <Area type="monotone" dataKey="crystal"   stroke="#22d3ee" fillOpacity={1} fill="url(#colorCrystal)" name="Cristal" />
                  <Area type="monotone" dataKey="deuterium" stroke="#4ade80" fillOpacity={1} fill="url(#colorDeut)"    name="Deutérium" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, desc, color }: {
  icon: React.FC<{ size?: number; className?: string }>;
  title: string;
  value: string;
  desc: string;
  color: string;
}) {
  return (
    <Card className="bg-slate-900/40 border border-white/5 card-depth hover:-translate-y-1 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">{title}</p>
            <h3 className={`text-3xl font-black font-mono ${color}`}>{value}</h3>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-white/5">
            <Icon size={20} className={color} />
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-4 font-mono">{desc}</p>
      </CardContent>
    </Card>
  );
}
