import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp, Zap, Activity, Award, Rocket, Shield,
  Pickaxe, Gem, Droplets, Layers, Target, Trophy,
  Clock, Percent, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';
import { apiUrl } from '@/config/api';
import { Progress } from '@/components/ui/progress';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        // Récupérer les slots
        const slotsRes = await fetch(apiUrl(`/planets/${planet.id}/resource-slots`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (slotsRes.ok) {
          const slotsData = await slotsRes.json();
          setSlots(slotsData.filter((s: ResourceSlot) => s.slot_number >= 5));
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
      } catch (error) {
        console.error('Erreur chargement stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (planet?.id) fetchData();
  }, [planet?.id]);

  // Calcul de production avec tous les bonus
  const calculateProduction = (resourceType: 'metal' | 'crystal' | 'deuterium', level: number, baseFactor: number) => {
    // Calcul de base
    let prod = baseFactor * level * Math.pow(1.1, level);

    // Bonus technologie énergie (+1% par niveau)
    const techLevel = planet.energy_tech_level || 0;
    const techBonus = 1.0 + (techLevel * 0.01);
    prod *= techBonus;

    // Ratio énergétique
    const energyRatio = (planet.energy_ratio || 100) / 100;
    prod *= energyRatio;

    // Bonus slots actifs (+50% par slot du même type)
    const activeSlots = slots.filter(s => s.is_active && s.resource_type === resourceType);
    const slotBonus = 1.0 + (activeSlots.length * 0.5);
    prod *= slotBonus;

    // Speed factor
    prod *= speedFactor;

    return {
      total: Math.floor(prod),
      base: Math.floor(baseFactor * level * Math.pow(1.1, level) * speedFactor),
      techBonus: techLevel,
      energyRatio: energyRatio,
      slotsCount: activeSlots.length,
      slotBonus: slotBonus,
    };
  };

  const prodMetal = calculateProduction('metal', planet.metal_mine_level, 30);
  const prodCrystal = calculateProduction('crystal', planet.crystal_mine_level, 20);
  const prodDeut = calculateProduction('deuterium', planet.deuterium_mine_level, 10);

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
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
          <Activity className="text-indigo-400" size={28} />
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

      {/* Production en temps réel */}
      <Card className="border-indigo-500/30 bg-gradient-to-br from-slate-950 to-indigo-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-300">
            <TrendingUp size={20} />
            Production Horaire (avec tous les bonus)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Métal */}
            <div className="bg-black/40 rounded-lg p-4 border border-orange-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Pickaxe className="text-orange-400" size={20} />
                <span className="text-sm font-bold text-slate-400">Métal</span>
              </div>
              <div className="text-3xl font-black font-mono text-orange-400 mb-2">
                {prodMetal.total.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <div>Base : {prodMetal.base.toLocaleString()}</div>
                <div className="flex items-center gap-1">
                  <Zap size={10} /> Tech +{prodMetal.techBonus}%
                </div>
                <div className="flex items-center gap-1">
                  <Activity size={10} /> Énergie {Math.round(prodMetal.energyRatio * 100)}%
                </div>
                <div className="flex items-center gap-1">
                  <Layers size={10} /> Slots +{Math.round((prodMetal.slotBonus - 1) * 100)}% ({prodMetal.slotsCount} actifs)
                </div>
              </div>
            </div>

            {/* Cristal */}
            <div className="bg-black/40 rounded-lg p-4 border border-cyan-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Gem className="text-cyan-400" size={20} />
                <span className="text-sm font-bold text-slate-400">Cristal</span>
              </div>
              <div className="text-3xl font-black font-mono text-cyan-400 mb-2">
                {prodCrystal.total.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <div>Base : {prodCrystal.base.toLocaleString()}</div>
                <div className="flex items-center gap-1">
                  <Zap size={10} /> Tech +{prodCrystal.techBonus}%
                </div>
                <div className="flex items-center gap-1">
                  <Activity size={10} /> Énergie {Math.round(prodCrystal.energyRatio * 100)}%
                </div>
                <div className="flex items-center gap-1">
                  <Layers size={10} /> Slots +{Math.round((prodCrystal.slotBonus - 1) * 100)}% ({prodCrystal.slotsCount} actifs)
                </div>
              </div>
            </div>

            {/* Deutérium */}
            <div className="bg-black/40 rounded-lg p-4 border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Droplets className="text-emerald-400" size={20} />
                <span className="text-sm font-bold text-slate-400">Deutérium</span>
              </div>
              <div className="text-3xl font-black font-mono text-emerald-400 mb-2">
                {prodDeut.total.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <div>Base : {prodDeut.base.toLocaleString()}</div>
                <div className="flex items-center gap-1">
                  <Zap size={10} /> Tech +{prodDeut.techBonus}%
                </div>
                <div className="flex items-center gap-1">
                  <Activity size={10} /> Énergie {Math.round(prodDeut.energyRatio * 100)}%
                </div>
                <div className="flex items-center gap-1">
                  <Layers size={10} /> Slots +{Math.round((prodDeut.slotBonus - 1) * 100)}% ({prodDeut.slotsCount} actifs)
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  Niv. {planet.energy_tech_level}
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

      {/* Statistiques de Combat (72h) */}
      <Card className="border-red-500/30 bg-gradient-to-br from-slate-950 to-red-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-300">
            <Trophy size={20} />
            Statistiques Combat (72 dernières heures)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Performances */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/10">
                <span className="text-sm font-bold text-slate-400">Batailles</span>
                <span className="text-xl font-black font-mono text-white">{totalCombats}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-950/20 border border-green-500/30">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-green-400" size={16} />
                  <span className="text-sm font-bold text-green-300">Victoires</span>
                </div>
                <span className="text-xl font-black font-mono text-green-400">{victories}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-950/20 border border-red-500/30">
                <div className="flex items-center gap-2">
                  <XCircle className="text-red-400" size={16} />
                  <span className="text-sm font-bold text-red-300">Défaites</span>
                </div>
                <span className="text-xl font-black font-mono text-red-400">{defeats}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/30">
                <div className="flex items-center gap-2">
                  <Percent className="text-indigo-400" size={16} />
                  <span className="text-sm font-bold text-indigo-300">Taux de Victoire</span>
                </div>
                <span className="text-xl font-black font-mono text-indigo-400">
                  {winRate.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Pillage total */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase text-slate-400 mb-3">Pillage Total</h4>
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-orange-500/30">
                <div className="flex items-center gap-2">
                  <Pickaxe className="text-orange-400" size={16} />
                  <span className="text-sm font-bold text-orange-300">Métal</span>
                </div>
                <span className="text-lg font-mono font-bold text-orange-400">
                  {totalLoot.metal.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-cyan-500/30">
                <div className="flex items-center gap-2">
                  <Gem className="text-cyan-400" size={16} />
                  <span className="text-sm font-bold text-cyan-300">Cristal</span>
                </div>
                <span className="text-lg font-mono font-bold text-cyan-400">
                  {totalLoot.crystal.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-emerald-500/30">
                <div className="flex items-center gap-2">
                  <Droplets className="text-emerald-400" size={16} />
                  <span className="text-sm font-bold text-emerald-300">Deutérium</span>
                </div>
                <span className="text-lg font-mono font-bold text-emerald-400">
                  {totalLoot.deuterium.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
