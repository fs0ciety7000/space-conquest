import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataCard } from "@/components/ui/data-card";
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
      <div className="flex items-center justify-center h-64 bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px]">
        <Loader2 size={32} className="animate-spin text-purple-400" />
      </div>
    );
  }

  const production = data?.weekly_production ?? [];
  const stats = data?.stats;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-8">
        <Activity size={28} className="text-purple-400" />
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-slate-200">
          Tableau de Bord <span className="text-purple-400">Analytique</span>
        </h1>
      </div>

      {/* Stat cards using DataCard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <DataCard
          label="Score Total"
          value={stats ? stats.total_score.toLocaleString() : "—"}
          icon={<TrendingUp size={14} />}
          accent="green"
          trendValue={stats ? stats.economy_score.toLocaleString() : undefined}
        />
        <DataCard
          label="Efficacité Énergétique"
          value={stats ? `${stats.energy_efficiency}%` : "—"}
          icon={<Zap size={14} />}
          accent="yellow"
        />
        <DataCard
          label="Score Militaire"
          value={stats ? stats.military_score.toLocaleString() : "—"}
          icon={<Shield size={14} />}
          accent="red"
        />
        <DataCard
          label="Victoires (7 jours)"
          value={stats ? String(stats.victories_7d) : "—"}
          icon={<Activity size={14} />}
          accent="cyan"
        />
      </div>

      {/* Production chart */}
      <Card className="bg-[rgba(16,8,46,0.95)] backdrop-blur-[20px] border border-cyan-500/10 card-depth">
        <CardHeader>
          <div className="flex items-center gap-2 pb-2 border-b border-cyan-500/10">
            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-purple-400 to-transparent flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-purple-500/70">
              Production Journalière (capacité actuelle)
            </span>
          </div>
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
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCrystal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#00f5ff" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDeut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff88" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,245,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(16,8,46,0.95)', borderColor: 'rgba(0,245,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any) => [Number(v).toLocaleString()]}
                  />
                  <Area type="monotone" dataKey="metal"     stroke="#f87171" strokeWidth={2} fillOpacity={1} fill="url(#colorMetal)"   name="Métal" />
                  <Area type="monotone" dataKey="crystal"   stroke="#00f5ff" strokeWidth={2} fillOpacity={1} fill="url(#colorCrystal)" name="Cristal" />
                  <Area type="monotone" dataKey="deuterium" stroke="#00ff88" strokeWidth={2} fillOpacity={1} fill="url(#colorDeut)"    name="Deutérium" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
