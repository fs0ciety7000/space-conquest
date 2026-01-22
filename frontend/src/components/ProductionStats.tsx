import { useEffect, useState } from 'react';
import { getTechLevel, getShipCount } from '@/utils/techTreeCompat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  metal_mine_level: number;
  crystal_mine_level: number;
  deuterium_mine_level: number;
  solar_plant_level: number;
  energy_tech_level: number;
  energy_ratio: number;
  energy_production: number;
  energy_consumption: number;
}

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

        // Récupérer la configuration serveur
        const configRes = await fetch(apiUrl('/config'));
        if (configRes.ok) {
          const configData = await configRes.json();
          setConfig(configData);
        }

        // Récupérer les slots
        const slotsRes = await fetch(apiUrl(`/planets/${planet.id}/resource-slots`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (slotsRes.ok) {
          const slotsData = await slotsRes.json();
          setSlots(slotsData);
        }

        // Récupérer les logs de combat (72h)
        const logsRes = await fetch(apiUrl(`/planets/${planet.id}/combat-logs`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          const now = new Date();
          const last72h = logsData.filter((log: CombatLog) => {
            const logDate = new Date(log.date);
            const diff = now.getTime() - logDate.getTime();
            return diff <= 72 * 60 * 60 * 1000; // 72 heures
          });
          setCombatLogs(last72h);
        }

        // Récupérer les types de vaisseaux
        const shipsRes = await fetch(apiUrl(`/planets/${planet.id}/ship-types`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (shipsRes.ok) {
          const shipsData = await shipsRes.json();
          setShipTypes(shipsData.ship_types || []);
        }

        // Récupérer les types de défenses
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

  // Calcul de production avec tous les bonus
  const calculateProduction = (resourceType: 'metal' | 'crystal' | 'deuterium', level: number, baseFactor: number, growthFactor: number) => {
    // Protection contre NaN
    const safeBaseFactor = Number(baseFactor) || 0;
    const safeGrowthFactor = Number(growthFactor) || 1;
    if (safeBaseFactor === 0 || level === 0) return {
      total: 0,
      base: 0,
      techBonus: 0,
      energyRatio: 0,
      slotsCount: 0,
      slotBonus: 1,
    };

    // Calcul de base
    let prod = safeBaseFactor * level * Math.pow(safeGrowthFactor, level);

    // Bonus technologie énergie (configurable via config)
    const techLevel = getTechLevel(planet, 'energy_tech');
    const techBonus = 1.0 + (techLevel * (config.energy_tech_bonus || 0.01));
    prod *= techBonus;

    // Ratio énergétique
    const energyRatio = (planet.energy_ratio || 100) / 100;
    prod *= energyRatio;

    // Bonus slots actifs (+50% par slot du même type)
    const activeSlots = slots.filter(s => s.is_active && s.resource_type === resourceType);
    const slotBonus = 1.0 + (activeSlots.length * 0.5);
    prod *= slotBonus;

    // Speed factor ET mining speed multiplier
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

  const prodMetal = calculateProduction('metal', planet.metal_mine_level || 0, config.production_metal_base || 30, config.production_metal_growth || 1.1);
  const prodCrystal = calculateProduction('crystal', planet.crystal_mine_level || 0, config.production_crystal_base || 20, config.production_crystal_growth || 1.1);
  const prodDeut = calculateProduction('deuterium', planet.deuterium_mine_level || 0, config.production_deuterium_base || 10, config.production_deuterium_growth || 1.05);

  // Statistiques de combat
  const totalCombats = combatLogs.length;
  const victories = combatLogs.filter(log =>
    log.result === 'victory' || log.result === 'player'
  ).length;
  const defeats = combatLogs.filter(log =>
    log.result === 'defeat'
  ).length;
  const winRate = totalCombats > 0 ? (victories / totalCombats) * 100 : 0;

  const totalLoot = combatLogs.reduce((acc, log) => ({
    metal: acc.metal + (log.loot_metal > 0 ? log.loot_metal : 0),
    crystal: acc.crystal + (log.loot_crystal > 0 ? log.loot_crystal : 0),
    deuterium: acc.deuterium + (log.loot_deuterium > 0 ? log.loot_deuterium : 0),
  }), { metal: 0, crystal: 0, deuterium: 0 });

  // Données pour les graphiques
  const productionData = [
    { name: 'Métal', value: prodMetal.total, base: prodMetal.base, color: '#f97316', fill: 'url(#gradientMetal)' },
    { name: 'Cristal', value: prodCrystal.total, base: prodCrystal.base, color: '#06b6d4', fill: 'url(#gradientCrystal)' },
    { name: 'Deutérium', value: prodDeut.total, base: prodDeut.base, color: '#22c55e', fill: 'url(#gradientDeut)' },
  ];

  const bonusRadarData = [
    { subject: 'Tech', metal: prodMetal.techBonus, crystal: prodCrystal.techBonus, deut: prodDeut.techBonus, fullMark: 20 },
    { subject: 'Énergie', metal: Math.round(prodMetal.energyRatio * 100), crystal: Math.round(prodCrystal.energyRatio * 100), deut: Math.round(prodDeut.energyRatio * 100), fullMark: 100 },
    { subject: 'Slots', metal: Math.round((prodMetal.slotBonus - 1) * 100), crystal: Math.round((prodCrystal.slotBonus - 1) * 100), deut: Math.round((prodDeut.slotBonus - 1) * 100), fullMark: 200 },
  ];

  const dailyProjection = [
    { name: '6h', metal: prodMetal.total * 6, crystal: prodCrystal.total * 6, deut: prodDeut.total * 6 },
    { name: '12h', metal: prodMetal.total * 12, crystal: prodCrystal.total * 12, deut: prodDeut.total * 12 },
    { name: '18h', metal: prodMetal.total * 18, crystal: prodCrystal.total * 18, deut: prodDeut.total * 18 },
    { name: '24h', metal: prodMetal.total * 24, crystal: prodCrystal.total * 24, deut: prodDeut.total * 24 },
  ];

  const COLORS = ['#f97316', '#06b6d4', '#22c55e'];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Activity className="animate-spin text-indigo-400" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 relative overflow-hidden">
          <BarChart3 className="text-indigo-400 relative z-10" size={28} />
          <div className="absolute inset-0 bg-indigo-500/20 animate-pulse"></div>
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">
            Statistiques & Bonus de Production
          </h1>
          <p className="text-sm text-slate-500">
            Vue d'ensemble complète de votre économie et performances
          </p>
        </div>
      </div>

      {/* Graphique de production journalière */}
      <Card className="border-indigo-500/30 bg-gradient-to-br from-slate-950 to-indigo-950/20 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-purple-500/5"></div>
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2 text-indigo-300">
            <TrendingUp size={20} />
            Projection de Production sur 24h
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyProjection}>
                <defs>
                  <linearGradient id="gradientMetal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradientCrystal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradientDeut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '12px',
                    boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)',
                  }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  formatter={(value: number) => [value.toLocaleString(), '']}
                />
                <Area type="monotone" dataKey="metal" name="Métal" stroke="#f97316" strokeWidth={2} fill="url(#gradientMetal)" />
                <Area type="monotone" dataKey="crystal" name="Cristal" stroke="#06b6d4" strokeWidth={2} fill="url(#gradientCrystal)" />
                <Area type="monotone" dataKey="deut" name="Deutérium" stroke="#22c55e" strokeWidth={2} fill="url(#gradientDeut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Production en temps réel avec graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphique Pie - Répartition */}
        <Card className="border-purple-500/30 bg-gradient-to-br from-slate-950 to-purple-950/20 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5"></div>
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2 text-purple-300 text-sm">
              <Activity size={16} />
              Répartition Production /h
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
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
                      <Cell key={`cell-${index}`} fill={COLORS[index]} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '12px',
                    }}
                    formatter={(value: number) => [value.toLocaleString() + '/h', '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {productionData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-[10px] text-slate-400">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cards de production détaillées */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Métal */}
          <Card className="border-orange-500/30 bg-gradient-to-br from-slate-950 to-orange-950/20 overflow-hidden relative group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute inset-0 bg-orange-500/5 group-hover:bg-orange-500/10 transition-colors"></div>
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/30">
                  <Pickaxe className="text-orange-400" size={18} />
                </div>
                <span className="text-sm font-bold text-slate-300">Métal</span>
              </div>
              <div className="text-3xl font-black font-mono text-orange-400 mb-3 drop-shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                {prodMetal.total.toLocaleString()}
                <span className="text-sm text-orange-400/60 ml-1">/h</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Base</span>
                  <span className="text-slate-300 font-mono">{prodMetal.base.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1"><Zap size={10} className="text-yellow-400" /> Tech</span>
                  <span className="text-yellow-400 font-mono">+{prodMetal.techBonus}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1"><Activity size={10} className="text-cyan-400" /> Énergie</span>
                  <span className={`font-mono ${prodMetal.energyRatio < 1 ? 'text-red-400' : 'text-cyan-400'}`}>{Math.round(prodMetal.energyRatio * 100)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1"><Layers size={10} className="text-purple-400" /> Slots</span>
                  <span className="text-purple-400 font-mono">+{Math.round((prodMetal.slotBonus - 1) * 100)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cristal */}
          <Card className="border-cyan-500/30 bg-gradient-to-br from-slate-950 to-cyan-950/20 overflow-hidden relative group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute inset-0 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors"></div>
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                  <Gem className="text-cyan-400" size={18} />
                </div>
                <span className="text-sm font-bold text-slate-300">Cristal</span>
              </div>
              <div className="text-3xl font-black font-mono text-cyan-400 mb-3 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                {prodCrystal.total.toLocaleString()}
                <span className="text-sm text-cyan-400/60 ml-1">/h</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Base</span>
                  <span className="text-slate-300 font-mono">{prodCrystal.base.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1"><Zap size={10} className="text-yellow-400" /> Tech</span>
                  <span className="text-yellow-400 font-mono">+{prodCrystal.techBonus}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1"><Activity size={10} className="text-cyan-400" /> Énergie</span>
                  <span className={`font-mono ${prodCrystal.energyRatio < 1 ? 'text-red-400' : 'text-cyan-400'}`}>{Math.round(prodCrystal.energyRatio * 100)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1"><Layers size={10} className="text-purple-400" /> Slots</span>
                  <span className="text-purple-400 font-mono">+{Math.round((prodCrystal.slotBonus - 1) * 100)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deutérium */}
          <Card className="border-emerald-500/30 bg-gradient-to-br from-slate-950 to-emerald-950/20 overflow-hidden relative group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors"></div>
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                  <Droplets className="text-emerald-400" size={18} />
                </div>
                <span className="text-sm font-bold text-slate-300">Deutérium</span>
              </div>
              <div className="text-3xl font-black font-mono text-emerald-400 mb-3 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                {prodDeut.total.toLocaleString()}
                <span className="text-sm text-emerald-400/60 ml-1">/h</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Base</span>
                  <span className="text-slate-300 font-mono">{prodDeut.base.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1"><Zap size={10} className="text-yellow-400" /> Tech</span>
                  <span className="text-yellow-400 font-mono">+{prodDeut.techBonus}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1"><Activity size={10} className="text-cyan-400" /> Énergie</span>
                  <span className={`font-mono ${prodDeut.energyRatio < 1 ? 'text-red-400' : 'text-cyan-400'}`}>{Math.round(prodDeut.energyRatio * 100)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1"><Layers size={10} className="text-purple-400" /> Slots</span>
                  <span className="text-purple-400 font-mono">+{Math.round((prodDeut.slotBonus - 1) * 100)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bonus actifs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Slots de production */}
        <Card className="border-purple-500/30 bg-gradient-to-br from-slate-950 to-purple-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-300">
              <Layers size={20} />
              Slots de Production
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                        ? 'bg-green-950/20 border-green-500/30'
                        : 'bg-slate-900/40 border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${slot.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="text-sm font-bold text-white">
                        Slot {slot.slot_number - 4}
                      </span>
                      <span className="text-xs text-slate-500 capitalize">
                        ({slot.resource_type})
                      </span>
                    </div>
                    <div className="text-sm font-mono font-bold text-green-400">
                      {slot.is_active ? '+50%' : 'Inactif'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Statistiques Serveur */}
        <Card className="border-yellow-500/30 bg-gradient-to-br from-slate-950 to-yellow-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-300">
              <Clock size={20} />
              Paramètres Serveur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-yellow-500/30">
                <div className="flex items-center gap-2">
                  <Zap className="text-yellow-400" size={16} />
                  <span className="text-sm font-bold text-slate-400">Speed Factor</span>
                </div>
                <div className="text-lg font-mono font-black text-yellow-400">
                  ×{speedFactor / 100}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-indigo-500/30">
                <div className="flex items-center gap-2">
                  <Zap className="text-indigo-400" size={16} />
                  <span className="text-sm font-bold text-slate-400">Tech Énergie</span>
                </div>
                <div className="text-lg font-mono font-black text-indigo-400">
                  Niv. {getTechLevel(planet, 'energy_tech')}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/10">
                <div className="flex items-center gap-2">
                  <Activity className="text-slate-400" size={16} />
                  <span className="text-sm font-bold text-slate-400">Ratio Énergétique</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={planet.energy_ratio} className="w-20 h-2" />
                  <span className="text-sm font-mono font-bold text-white">
                    {planet.energy_ratio}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques de Combat (72h) - Avec graphiques */}
      <Card className="border-red-500/30 bg-gradient-to-br from-slate-950 to-red-950/20 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5"></div>
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2 text-red-300">
            <Trophy size={20} />
            Statistiques Combat (72 dernières heures)
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Graphique de performances */}
            <Card className="border-slate-700/30 bg-black/30">
              <CardContent className="p-4">
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                  <Target size={12} /> Taux de Victoire
                </h4>
                <div className="h-40 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Victoires', value: victories, color: '#22c55e' },
                          { name: 'Défaites', value: defeats, color: '#ef4444' },
                          { name: 'Autres', value: Math.max(0, totalCombats - victories - defeats), color: '#64748b' },
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {[
                          { name: 'Victoires', value: victories, color: '#22c55e' },
                          { name: 'Défaites', value: defeats, color: '#ef4444' },
                          { name: 'Autres', value: Math.max(0, totalCombats - victories - defeats), color: '#64748b' },
                        ].filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center mt-2">
                  <div className={`text-3xl font-black font-mono ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                    {winRate.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase">Victoires</div>
                </div>
              </CardContent>
            </Card>

            {/* Stats détaillées */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                <Activity size={12} /> Performances
              </h4>
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/10">
                <span className="text-sm font-bold text-slate-400">Total Batailles</span>
                <span className="text-xl font-black font-mono text-white">{totalCombats}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-950/20 border border-green-500/30 group hover:bg-green-950/30 transition-colors">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-green-400" size={16} />
                  <span className="text-sm font-bold text-green-300">Victoires</span>
                </div>
                <span className="text-xl font-black font-mono text-green-400 group-hover:drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">{victories}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-950/20 border border-red-500/30 group hover:bg-red-950/30 transition-colors">
                <div className="flex items-center gap-2">
                  <XCircle className="text-red-400" size={16} />
                  <span className="text-sm font-bold text-red-300">Défaites</span>
                </div>
                <span className="text-xl font-black font-mono text-red-400 group-hover:drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">{defeats}</span>
              </div>
            </div>

            {/* Graphique pillage */}
            <Card className="border-slate-700/30 bg-black/30">
              <CardContent className="p-4">
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                  <Award size={12} /> Pillage Total
                </h4>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'M', value: totalLoot.metal, fill: '#f97316' },
                      { name: 'C', value: totalLoot.crystal, fill: '#06b6d4' },
                      { name: 'D', value: totalLoot.deuterium, fill: '#22c55e' },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={9} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [value.toLocaleString(), 'Pillé']}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center text-[10px]">
                  <div>
                    <div className="text-orange-400 font-mono font-bold">{totalLoot.metal >= 1000000 ? `${(totalLoot.metal/1000000).toFixed(1)}M` : totalLoot.metal >= 1000 ? `${(totalLoot.metal/1000).toFixed(0)}k` : totalLoot.metal}</div>
                    <div className="text-slate-600">Métal</div>
                  </div>
                  <div>
                    <div className="text-cyan-400 font-mono font-bold">{totalLoot.crystal >= 1000000 ? `${(totalLoot.crystal/1000000).toFixed(1)}M` : totalLoot.crystal >= 1000 ? `${(totalLoot.crystal/1000).toFixed(0)}k` : totalLoot.crystal}</div>
                    <div className="text-slate-600">Cristal</div>
                  </div>
                  <div>
                    <div className="text-emerald-400 font-mono font-bold">{totalLoot.deuterium >= 1000000 ? `${(totalLoot.deuterium/1000000).toFixed(1)}M` : totalLoot.deuterium >= 1000 ? `${(totalLoot.deuterium/1000).toFixed(0)}k` : totalLoot.deuterium}</div>
                    <div className="text-slate-600">Deuté</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Inventaire de la Flotte */}
      <Card className="border-blue-500/30 bg-gradient-to-br from-slate-950 to-blue-950/20 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5"></div>
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2 text-blue-300">
            <Rocket size={20} />
            Inventaire de la Flotte
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
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
                  className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-blue-500/30 hover:bg-blue-950/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                      <Ship className="text-blue-400" size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">
                        {ship.display_name || ship.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Attaque: {ship.attack} • Bouclier: {ship.shield}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black font-mono text-blue-400 group-hover:drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                      {ship.current_count || 0}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase">Unités</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventaire des Défenses */}
      <Card className="border-red-500/30 bg-gradient-to-br from-slate-950 to-red-950/20 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5"></div>
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2 text-red-300">
            <Shield size={20} />
            Systèmes Défensifs
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
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
                  className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-red-500/30 hover:bg-red-950/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
                      <Crosshair className="text-red-400" size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">
                        {defense.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Attaque: {defense.attack} • Bouclier: {defense.shield}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black font-mono text-red-400 group-hover:drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                      {defense.current_count || 0}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase">Unités</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
