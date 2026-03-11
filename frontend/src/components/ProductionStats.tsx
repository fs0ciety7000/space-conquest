import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getTechLevel, getShipCount, getBuildingLevel } from '@/utils/techTreeCompat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataCard } from '@/components/ui/data-card';
import {
  TrendingUp, Zap, Activity, Award, Rocket, Shield,
  Pickaxe, Gem, Droplets, Layers, Target, Trophy,
  Clock, Percent, AlertCircle, CheckCircle2, XCircle, BarChart3,
  Crosshair, Ship, Radio
} from 'lucide-react';
import { apiUrl } from '@/config/api';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';

interface ResourceSlot {
  id: number;
  planet_id: string;
  slot_number: number;
  resource_type: string;
  level: number;
  is_locked: boolean;
  is_active: boolean;
}

interface CombatLog {
  id: string;
  mission_type: string;
  result: string;
  loot_metal: number;
  loot_crystal: number;
  loot_deuterium: number;
  ships_lost: number;
  date: string;
}

interface Planet {
  id: string;
  name: string;
  energy_ratio: number;
  energy_production: number;
  energy_consumption: number;
  metal_production?: number;
  crystal_production?: number;
  deuterium_production?: number;
  buildings?: Record<string, number>;
  technologies?: Record<string, number>;
}

// Cyber chart color palette
const CHART_COLORS = {
  metal:     '#ff6600',
  crystal:   '#00f5ff',
  deuterium: '#00ff88',
  victory:   '#00ff88',
  defeat:    '#ff003c',
  neutral:   '#64748b',
};

const GRID_STROKE = 'rgba(0,245,255,0.05)';

const tooltipStyle = {
  backgroundColor: 'rgba(16,8,46,0.95)',
  border: '1px solid rgba(0,245,255,0.1)',
  borderRadius: '12px',
  boxShadow: '0 0 20px rgba(0,245,255,0.05)',
};

export default function ProductionStats({ planet, speedFactor = 10 }: { planet: Planet; speedFactor: number }) {
  const [slots, setSlots] = useState<ResourceSlot[]>([]);
  const [combatLogs, setCombatLogs] = useState<CombatLog[]>([]);
  const [shipTypes, setShipTypes] = useState<any[]>([]);
  const [defenseTypes, setDefenseTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>({
    production_metal_base: 30,
    production_crystal_base: 20,
    production_deuterium_base: 10,
    production_metal_growth: 1.1,
    production_crystal_growth: 1.1,
    production_deuterium_growth: 1.05,
    energy_tech_bonus: 0.10,
    mining_speed_multiplier: 1.0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        const configRes = await fetch(apiUrl('/config'));
        if (configRes.ok) {
          const configData = await configRes.json();
          setConfig(configData);
        }

        const slotsRes = await fetch(apiUrl(`/planets/${planet.id}/resource-slots`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (slotsRes.ok) {
          const slotsData = await slotsRes.json();
          setSlots(slotsData);
        }

        const logsRes = await fetch(apiUrl(`/planets/${planet.id}/combat-logs`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          const now = new Date();
          const last72h = logsData.filter((log: CombatLog) => {
            const logDate = new Date(log.date);
            const diff = now.getTime() - logDate.getTime();
            return diff <= 72 * 60 * 60 * 1000;
          });
          setCombatLogs(last72h);
        }

        const shipsRes = await fetch(apiUrl(`/planets/${planet.id}/ship-types`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (shipsRes.ok) {
          const shipsData = await shipsRes.json();
          setShipTypes(shipsData.ship_types || []);
        }

        const defensesRes = await fetch(apiUrl(`/planets/${planet.id}/defense-types`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (defensesRes.ok) {
          const defensesData = await defensesRes.json();
          setDefenseTypes(defensesData.defense_types || []);
        }
      } catch (error) {
        console.error('Erreur chargement stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (planet?.id) fetchData();
  }, [planet?.id]);

  const calculateProduction = (resourceType: 'metal' | 'crystal' | 'deuterium', level: number, baseFactor: number, growthFactor: number) => {
    const safeBaseFactor = Number(baseFactor) || 0;
    const safeGrowthFactor = Number(growthFactor) || 1;
    if (safeBaseFactor === 0 || level === 0) return {
      total: 0, base: 0, techBonus: 0, energyRatio: 0, slotsCount: 0, slotBonus: 1,
    };

    let prod = safeBaseFactor * level * Math.pow(safeGrowthFactor, level);

    const techLevel = getTechLevel(planet, 'energy_tech');
    const techBonus = 1.0 + (techLevel * (config.energy_tech_bonus || 0.01));
    prod *= techBonus;

    const energyRatio = (planet.energy_ratio || 100) / 100;
    prod *= energyRatio;

    const activeSlots = slots.filter(s => s.is_active && s.resource_type === resourceType);
    const slotBonus = 1.0 + (activeSlots.length * 0.5);
    prod *= slotBonus;

    prod *= speedFactor * (config.mining_speed_multiplier || 1.0);

    return {
      total: Math.floor(prod),
      base: Math.floor(baseFactor * level * Math.pow(growthFactor, level) * speedFactor * (config.mining_speed_multiplier || 1.0)),
      techBonus: techLevel,
      energyRatio: energyRatio,
      slotsCount: activeSlots.length,
      slotBonus: slotBonus,
    };
  };

  const backendMetal   = planet.metal_production ?? 0;
  const backendCrystal = planet.crystal_production ?? 0;
  const backendDeut    = planet.deuterium_production ?? 0;

  const prodMetal   = { ...calculateProduction('metal',     getBuildingLevel(planet, 'metal_mine'),     config.production_metal_base || 30,     config.production_metal_growth || 1.1),    total: backendMetal   };
  const prodCrystal = { ...calculateProduction('crystal',   getBuildingLevel(planet, 'crystal_mine'),   config.production_crystal_base || 20,   config.production_crystal_growth || 1.1),  total: backendCrystal };
  const prodDeut    = { ...calculateProduction('deuterium', getBuildingLevel(planet, 'deuterium_mine'), config.production_deuterium_base || 10, config.production_deuterium_growth || 1.05), total: backendDeut    };

  const totalCombats = combatLogs.length;
  const victories = combatLogs.filter(log => log.result === 'victory' || log.result === 'player').length;
  const defeats   = combatLogs.filter(log => log.result === 'defeat').length;
  const winRate   = totalCombats > 0 ? (victories / totalCombats) * 100 : 0;

  const totalLoot = combatLogs.reduce((acc, log) => ({
    metal:     acc.metal     + (log.loot_metal     > 0 ? log.loot_metal     : 0),
    crystal:   acc.crystal   + (log.loot_crystal   > 0 ? log.loot_crystal   : 0),
    deuterium: acc.deuterium + (log.loot_deuterium > 0 ? log.loot_deuterium : 0),
  }), { metal: 0, crystal: 0, deuterium: 0 });

  const productionData = [
    { name: 'Métal',     value: prodMetal.total,   base: prodMetal.base,   color: CHART_COLORS.metal },
    { name: 'Cristal',   value: prodCrystal.total, base: prodCrystal.base, color: CHART_COLORS.crystal },
    { name: 'Deutérium', value: prodDeut.total,     base: prodDeut.base,    color: CHART_COLORS.deuterium },
  ];

  const dailyProjection = [
    { name: '6h',  metal: prodMetal.total * 6,  crystal: prodCrystal.total * 6,  deut: prodDeut.total * 6  },
    { name: '12h', metal: prodMetal.total * 12, crystal: prodCrystal.total * 12, deut: prodDeut.total * 12 },
    { name: '18h', metal: prodMetal.total * 18, crystal: prodCrystal.total * 18, deut: prodDeut.total * 18 },
    { name: '24h', metal: prodMetal.total * 24, crystal: prodCrystal.total * 24, deut: prodDeut.total * 24 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Activity className="animate-spin text-cyan-400" size={40} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-20"
    >
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/20 relative overflow-hidden">
          <BarChart3 className="text-cyan-400 relative z-10" size={28} />
          <div className="absolute inset-0 bg-cyan-500/10 animate-pulse"></div>
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-slate-200">
            Statistiques &amp; Bonus de Production
          </h1>
          <p className="text-sm text-slate-500">
            Vue d'ensemble complète de votre économie et performances
          </p>
        </div>
      </div>

      {/* Graphique de production journalière */}
      <div className="bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] border border-cyan-500/10 rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/3 via-transparent to-purple-500/3 pointer-events-none"></div>
        <div className="p-5 relative z-10">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Projection de Production sur 24h</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyProjection}>
                <defs>
                  <linearGradient id="gradientMetal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CHART_COLORS.metal}     stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CHART_COLORS.metal}     stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gradientCrystal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CHART_COLORS.crystal}   stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CHART_COLORS.crystal}   stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gradientDeut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CHART_COLORS.deuterium} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CHART_COLORS.deuterium} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <RechartsTooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                  formatter={(value: any) => [value.toLocaleString(), '']}
                />
                <Area type="monotone" dataKey="metal"   name="Métal"     stroke={CHART_COLORS.metal}     strokeWidth={2} fill="url(#gradientMetal)"   />
                <Area type="monotone" dataKey="crystal" name="Cristal"   stroke={CHART_COLORS.crystal}   strokeWidth={2} fill="url(#gradientCrystal)" />
                <Area type="monotone" dataKey="deut"    name="Deutérium" stroke={CHART_COLORS.deuterium} strokeWidth={2} fill="url(#gradientDeut)"    />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Production en temps réel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphique Pie - Répartition */}
        <div className="bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] border border-cyan-500/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Répartition Production /h</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {productionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ ...tooltipStyle, borderRadius: '8px' }}
                  formatter={(value: any) => [value.toLocaleString() + '/h', '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {productionData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-[10px] text-slate-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cards de production détaillées */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Métal */}
          <div className="bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] border border-orange-500/20 rounded-xl p-4 group hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/20">
                <Pickaxe className="text-orange-400" size={18} />
              </div>
              <span className="text-sm font-bold text-slate-300">Métal</span>
            </div>
            <div className="text-3xl font-black font-mono tabular-nums text-orange-400 mb-3 drop-shadow-[0_0_10px_rgba(249,115,22,0.3)]">
              {prodMetal.total.toLocaleString()}
              <span className="text-sm text-orange-400/60 ml-1">/h</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Base</span>
                <span className="text-slate-300 font-mono tabular-nums">{prodMetal.base.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1"><Zap size={10} className="text-yellow-400" /> Tech</span>
                <span className="text-yellow-400 font-mono tabular-nums">+{prodMetal.techBonus}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1"><Activity size={10} className="text-cyan-400" /> Énergie</span>
                <span className={`font-mono tabular-nums ${prodMetal.energyRatio < 1 ? 'text-red-400' : 'text-cyan-400'}`}>{Math.round(prodMetal.energyRatio * 100)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1"><Layers size={10} className="text-purple-400" /> Slots</span>
                <span className="text-purple-400 font-mono tabular-nums">+{Math.round((prodMetal.slotBonus - 1) * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Cristal */}
          <div className="bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] border border-cyan-500/20 rounded-xl p-4 group hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/20">
                <Gem className="text-cyan-400" size={18} />
              </div>
              <span className="text-sm font-bold text-slate-300">Cristal</span>
            </div>
            <div className="text-3xl font-black font-mono tabular-nums text-cyan-400 mb-3 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
              {prodCrystal.total.toLocaleString()}
              <span className="text-sm text-cyan-400/60 ml-1">/h</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Base</span>
                <span className="text-slate-300 font-mono tabular-nums">{prodCrystal.base.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1"><Zap size={10} className="text-yellow-400" /> Tech</span>
                <span className="text-yellow-400 font-mono tabular-nums">+{prodCrystal.techBonus}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1"><Activity size={10} className="text-cyan-400" /> Énergie</span>
                <span className={`font-mono tabular-nums ${prodCrystal.energyRatio < 1 ? 'text-red-400' : 'text-cyan-400'}`}>{Math.round(prodCrystal.energyRatio * 100)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1"><Layers size={10} className="text-purple-400" /> Slots</span>
                <span className="text-purple-400 font-mono tabular-nums">+{Math.round((prodCrystal.slotBonus - 1) * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Deutérium */}
          <div className="bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] border border-emerald-500/20 rounded-xl p-4 group hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/20">
                <Droplets className="text-emerald-400" size={18} />
              </div>
              <span className="text-sm font-bold text-slate-300">Deutérium</span>
            </div>
            <div className="text-3xl font-black font-mono tabular-nums text-emerald-400 mb-3 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">
              {prodDeut.total.toLocaleString()}
              <span className="text-sm text-emerald-400/60 ml-1">/h</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Base</span>
                <span className="text-slate-300 font-mono tabular-nums">{prodDeut.base.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1"><Zap size={10} className="text-yellow-400" /> Tech</span>
                <span className="text-yellow-400 font-mono tabular-nums">+{prodDeut.techBonus}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1"><Activity size={10} className="text-cyan-400" /> Énergie</span>
                <span className={`font-mono tabular-nums ${prodDeut.energyRatio < 1 ? 'text-red-400' : 'text-cyan-400'}`}>{Math.round(prodDeut.energyRatio * 100)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1"><Layers size={10} className="text-purple-400" /> Slots</span>
                <span className="text-purple-400 font-mono tabular-nums">+{Math.round((prodDeut.slotBonus - 1) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bonus actifs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Slots de production */}
        <div className="bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] border border-cyan-500/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Slots de Production</span>
          </div>
          <div className="space-y-3">
            {slots.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <AlertCircle className="mx-auto mb-2" size={24} />
                <p className="text-sm">Aucun slot actif</p>
              </div>
            ) : (
              slots.map((slot) => (
                <div
                  key={slot.slot_number}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    slot.is_active
                      ? 'bg-emerald-950/20 border-emerald-500/20'
                      : 'bg-[rgba(10,5,32,0.85)] border-cyan-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${slot.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span className="text-sm font-bold text-slate-200">
                      Slot {slot.slot_number - 4}
                    </span>
                    <span className="text-xs text-slate-500 capitalize">
                      ({slot.resource_type})
                    </span>
                  </div>
                  <div className={`text-sm font-mono tabular-nums font-bold ${slot.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {slot.is_active ? '+50%' : 'Inactif'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Paramètres Serveur — using DataCard */}
        <div className="bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] border border-cyan-500/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Paramètres Serveur</span>
          </div>
          <div className="space-y-3">
            <DataCard
              label="Speed Factor"
              value={`×${speedFactor / 100}`}
              icon={<Zap size={12} />}
              accent="yellow"
            />
            <DataCard
              label="Tech Énergie"
              value={`Niv. ${getTechLevel(planet, 'energy_tech')}`}
              icon={<Zap size={12} />}
              accent="cyan"
            />
            {/* Ratio Énergétique — custom row with Progress */}
            <div className="bg-[rgba(16,8,46,0.95)] border border-cyan-500/10 rounded p-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <Activity className="text-slate-400" size={14} />
                <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-slate-500">Ratio Énergétique</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={planet.energy_ratio} className="w-20 h-2" />
                <span className="text-sm font-mono tabular-nums font-bold text-slate-200">
                  {planet.energy_ratio}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques de Combat (72h) */}
      <div className="bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] border border-cyan-500/10 rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/3 via-transparent to-orange-500/3 pointer-events-none"></div>
        <div className="p-5 relative z-10">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-cyan-500/10">
            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-red-400 to-transparent flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Statistiques Combat (72 dernières heures)</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Graphique taux de victoire */}
            <div className="bg-[rgba(16,8,46,0.95)] border border-cyan-500/10 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                <Target size={12} /> Taux de Victoire
              </h4>
              <div className="h-40 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Victoires', value: victories,  color: CHART_COLORS.victory },
                        { name: 'Défaites',  value: defeats,   color: CHART_COLORS.defeat  },
                        { name: 'Autres',    value: Math.max(0, totalCombats - victories - defeats), color: CHART_COLORS.neutral },
                      ].filter(d => d.value > 0)}
                      cx="50%" cy="50%"
                      innerRadius={35} outerRadius={55}
                      paddingAngle={2} dataKey="value"
                    >
                      {[
                        { name: 'Victoires', value: victories,  color: CHART_COLORS.victory },
                        { name: 'Défaites',  value: defeats,   color: CHART_COLORS.defeat  },
                        { name: 'Autres',    value: Math.max(0, totalCombats - victories - defeats), color: CHART_COLORS.neutral },
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ ...tooltipStyle, borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center mt-2">
                <div className={`text-3xl font-black font-mono tabular-nums ${winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {winRate.toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 uppercase">Victoires</div>
              </div>
            </div>

            {/* Stats détaillées — DataCard */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                <Activity size={12} /> Performances
              </h4>
              <DataCard
                label="Total Batailles"
                value={totalCombats}
                icon={<Crosshair size={12} />}
                accent="cyan"
              />
              <DataCard
                label="Victoires"
                value={victories}
                icon={<CheckCircle2 size={12} />}
                accent="green"
              />
              <DataCard
                label="Défaites"
                value={defeats}
                icon={<XCircle size={12} />}
                accent="red"
              />
            </div>

            {/* Graphique pillage */}
            <div className="bg-[rgba(16,8,46,0.95)] border border-cyan-500/10 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                <Award size={12} /> Pillage Total
              </h4>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'M', value: totalLoot.metal,     fill: CHART_COLORS.metal     },
                    { name: 'C', value: totalLoot.crystal,   fill: CHART_COLORS.crystal   },
                    { name: 'D', value: totalLoot.deuterium, fill: CHART_COLORS.deuterium },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={9} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <RechartsTooltip
                      contentStyle={{ ...tooltipStyle, borderRadius: '8px' }}
                      formatter={(value: any) => [value.toLocaleString(), 'Pillé']}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center text-[10px]">
                <div>
                  <div className="text-orange-400 font-mono tabular-nums font-bold">{totalLoot.metal >= 1000000 ? `${(totalLoot.metal/1000000).toFixed(1)}M` : totalLoot.metal >= 1000 ? `${(totalLoot.metal/1000).toFixed(0)}k` : totalLoot.metal}</div>
                  <div className="text-slate-600">Métal</div>
                </div>
                <div>
                  <div className="text-cyan-400 font-mono tabular-nums font-bold">{totalLoot.crystal >= 1000000 ? `${(totalLoot.crystal/1000000).toFixed(1)}M` : totalLoot.crystal >= 1000 ? `${(totalLoot.crystal/1000).toFixed(0)}k` : totalLoot.crystal}</div>
                  <div className="text-slate-600">Cristal</div>
                </div>
                <div>
                  <div className="text-emerald-400 font-mono tabular-nums font-bold">{totalLoot.deuterium >= 1000000 ? `${(totalLoot.deuterium/1000000).toFixed(1)}M` : totalLoot.deuterium >= 1000 ? `${(totalLoot.deuterium/1000).toFixed(0)}k` : totalLoot.deuterium}</div>
                  <div className="text-slate-600">Deuté</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inventaire de la Flotte */}
      <div className="bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] border border-cyan-500/10 rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 via-transparent to-cyan-500/3 pointer-events-none"></div>
        <div className="p-5 relative z-10">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-cyan-500/10">
            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Inventaire de la Flotte</span>
          </div>
          {shipTypes.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <Radio className="mx-auto mb-2" size={24} />
              <p className="text-sm">Aucun vaisseau disponible</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {shipTypes.map((ship: any) => (
                <div
                  key={ship.ship_key}
                  className="flex items-center justify-between p-3 rounded-lg bg-[rgba(16,8,46,0.95)] border border-cyan-500/10 hover:bg-cyan-500/5 hover:border-cyan-500/20 transition-colors duration-150 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/20">
                      <Ship className="text-cyan-400" size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200">
                        {ship.display_name || ship.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Attaque: {ship.attack} • Bouclier: {ship.shield}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black font-mono tabular-nums text-cyan-400">
                      {ship.current_count || 0}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase">Unités</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inventaire des Défenses */}
      <div className="bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] border border-cyan-500/10 rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/3 via-transparent to-orange-500/3 pointer-events-none"></div>
        <div className="p-5 relative z-10">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-cyan-500/10">
            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-red-400 to-transparent flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Systèmes Défensifs</span>
          </div>
          {defenseTypes.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <AlertCircle className="mx-auto mb-2" size={24} />
              <p className="text-sm">Aucune défense disponible</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {defenseTypes.map((defense: any) => (
                <div
                  key={defense.defense_key}
                  className="flex items-center justify-between p-3 rounded-lg bg-[rgba(16,8,46,0.95)] border border-cyan-500/10 hover:bg-cyan-500/5 hover:border-cyan-500/20 transition-colors duration-150 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/20">
                      <Crosshair className="text-red-400" size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200">
                        {defense.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Attaque: {defense.attack} • Bouclier: {defense.shield}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black font-mono tabular-nums text-red-400">
                      {defense.current_count || 0}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase">Unités</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
