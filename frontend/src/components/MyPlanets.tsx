import { useState, useEffect } from "react";
import {
  Globe, MapPin, Stone, Gem, Droplets, Zap, Rocket, Shield,
  ChevronRight, Star, Crown, TrendingUp, Activity, Clock,
  Warehouse, Target, Ship, Recycle, Satellite, Truck, RefreshCw,
  AlertCircle, Wrench, Factory, Beaker, ArrowUp, Plus, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
import { getTechLevel, getShipCount, getBuildingLevel } from '@/utils/techTreeCompat';

interface Planet {
  id: string;
  name: string;
  galaxy: number;
  system: number;
  position: number;
  metal_amount: number;
  crystal_amount: number;
  deuterium_amount: number;
  metal_mine_level: number;
  crystal_mine_level: number;
  deuterium_mine_level: number;
  solar_plant_level: number;
  shipyard_level: number;
  research_lab_level: number;
  hangar_level: number;
  energy_tech_level?: number;
  is_current?: boolean;
  is_homeworld?: boolean;
  energy?: number;
  energy_production?: number;
  energy_consumption?: number;
  energy_ratio?: number;
  metal_production?: number;
  crystal_production?: number;
  deuterium_production?: number;
  ships?: any;
  defenses?: any;
  debris_metal?: number;
  debris_crystal?: number;
  research_queue?: any[];
  construction_queue?: any[];
  resource_slots?: any[];
  // Points from backend
  points?: number;
  economy_points?: number;
  military_points?: number;
}

interface MyPlanetsProps {
  currentPlanetId: string;
  onSelectPlanet: (planetId: string) => void;
  onNavigateTransport?: (id: string, name: string, galaxy: number, system: number, position: number) => void;
}

export default function MyPlanets({ currentPlanetId, onSelectPlanet, onNavigateTransport }: MyPlanetsProps) {
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [shipProductionModal, setShipProductionModal] = useState<Planet | null>(null);
  const [defenseProductionModal, setDefenseProductionModal] = useState<Planet | null>(null);
  const [upgradingMine, setUpgradingMine] = useState<{planetId: string, type: string} | null>(null);
  const [config, setConfig] = useState<any>({
    production_metal_base: 30,
    production_crystal_base: 20,
    production_deuterium_base: 10,
    production_metal_growth: 1.1,
    production_crystal_growth: 1.1,
    production_deuterium_growth: 1.05,
    energy_tech_bonus: 0.10,
    mining_speed_multiplier: 1.0,
    speed_factor: 1.0
  });

  const fetchPlanets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/my-planets?current_planet_id=${currentPlanetId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Le backend renvoie maintenant { planets: [...], colony_count: ..., max_colonies: ..., astrophysics_level: ... }
        const planetsData = data.planets || data;

        // Vérifier si on a reçu des données valides avec tous les champs nécessaires
        if (Array.isArray(planetsData) && planetsData.length > 0 && planetsData[0].metal_amount !== undefined) {
          const planetsWithMeta = planetsData.map((p: Planet) => ({
            ...p,
            is_current: p.id === currentPlanetId
          }));
          // Trier: planète mère en premier (is_homeworld ou 1:1:1), puis le reste
          const sortedPlanets = planetsWithMeta.sort((a: Planet, b: Planet) => {
            const aIsHome = a.is_homeworld || (a.galaxy === 1 && a.system === 1 && a.position === 1);
            const bIsHome = b.is_homeworld || (b.galaxy === 1 && b.system === 1 && b.position === 1);
            if (aIsHome) return -1;
            if (bIsHome) return 1;
            return 0;
          });
          setPlanets(sortedPlanets);
        } else if (Array.isArray(planetsData) && planetsData.length > 0) {
          // Le backend retourne des données partielles, on doit récupérer les détails complets
          // Pour l'instant, on affiche ce qu'on a
          const planetsWithDefaults = planetsData.map((p: any) => ({
            ...p,
            is_current: p.id === currentPlanetId,
            // Valeurs par défaut si manquantes
            metal_amount: p.metal_amount ?? 0,
            crystal_amount: p.crystal_amount ?? 0,
            deuterium_amount: p.deuterium_amount ?? 0,
            metal_mine_level: p.metal_mine_level ?? 0,
            crystal_mine_level: p.crystal_mine_level ?? 0,
            deuterium_mine_level: p.deuterium_mine_level ?? 0,
            solar_plant_level: p.solar_plant_level ?? 0,
            shipyard_level: p.shipyard_level ?? 0,
            research_lab_level: p.research_lab_level ?? 0,
            hangar_level: p.hangar_level ?? 0,
            energy_tech_level: getTechLevel(p, 'energy_tech'),
          }));
          // Trier: planète mère en premier (is_homeworld ou 1:1:1), puis le reste
          const sortedPlanets = planetsWithDefaults.sort((a: any, b: any) => {
            const aIsHome = a.is_homeworld || (a.galaxy === 1 && a.system === 1 && a.position === 1);
            const bIsHome = b.is_homeworld || (b.galaxy === 1 && b.system === 1 && b.position === 1);
            if (aIsHome) return -1;
            if (bIsHome) return 1;
            return 0;
          });
          setPlanets(sortedPlanets);
        } else {
          setPlanets([]);
        }
      }
    } catch (error) {
      console.error('Erreur chargement planètes:', error);
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanets();
    fetchConfig();
  }, [currentPlanetId]);

  const fetchConfig = async () => {
    try {
      const res = await fetch(apiUrl('/config'));
      if (res.ok) {
        const data = await res.json();
        setConfig({
          production_metal_base: parseFloat(data.production_metal_base) || 30,
          production_crystal_base: parseFloat(data.production_crystal_base) || 20,
          production_deuterium_base: parseFloat(data.production_deuterium_base) || 10,
          production_metal_growth: parseFloat(data.production_metal_growth) || 1.1,
          production_crystal_growth: parseFloat(data.production_crystal_growth) || 1.1,
          production_deuterium_growth: parseFloat(data.production_deuterium_growth) || 1.05,
          energy_tech_bonus: parseFloat(data.energy_tech_bonus) || 0.10,
          mining_speed_multiplier: parseFloat(data.mining_speed_multiplier) || 1.0,
          speed_factor: parseFloat(data.speed_factor) / 100 || 1.0
        });
      }
    } catch (error) {
      console.error('Erreur chargement config:', error);
    }
  };

  const calculateProduction = (planet: Planet, resourceType: 'metal' | 'crystal' | 'deuterium') => {
    // Use pre-calculated values from backend if available
    if (resourceType === 'metal' && planet.metal_production !== undefined) {
      return planet.metal_production;
    }
    if (resourceType === 'crystal' && planet.crystal_production !== undefined) {
      return planet.crystal_production;
    }
    if (resourceType === 'deuterium' && planet.deuterium_production !== undefined) {
      return planet.deuterium_production;
    }

    // Fallback to local calculation for backwards compatibility
    let level = 0;
    let baseFactor = 0;
    let growthFactor = 1;

    if (resourceType === 'metal') {
      level = getBuildingLevel(planet, 'metal_mine');
      baseFactor = config.production_metal_base;
      growthFactor = config.production_metal_growth;
    } else if (resourceType === 'crystal') {
      level = getBuildingLevel(planet, 'crystal_mine');
      baseFactor = config.production_crystal_base;
      growthFactor = config.production_crystal_growth;
    } else {
      level = getBuildingLevel(planet, 'deuterium_mine');
      baseFactor = config.production_deuterium_base;
      growthFactor = config.production_deuterium_growth;
    }

    if (level === 0) return 0;

    // Production de base
    let prod = baseFactor * level * Math.pow(growthFactor, level);

    // Bonus technologie énergie
    const techLevel = getTechLevel(planet, 'energy_tech');
    const techBonus = 1.0 + (techLevel * (config.energy_tech_bonus || 0.10));
    prod *= techBonus;

    // Ratio énergétique
    const energyRatio = (planet.energy_ratio || 100) / 100;
    prod *= energyRatio;

    // Bonus slots (si disponibles)
    const activeSlots = (planet.resource_slots || []).filter(
      (s: any) => s.is_active && s.resource_type === resourceType
    );
    const slotBonus = 1.0 + (activeSlots.length * 0.5);
    prod *= slotBonus;

    // Speed factor et mining speed
    prod *= config.speed_factor * (config.mining_speed_multiplier || 1.0);

    return Math.floor(prod);
  };

  const fmt = (n: number) => Math.floor(n).toLocaleString();

  const getTotalFleet = (p: Planet) =>
    (getShipCount(p, 'light_hunter') || 0) + (getShipCount(p, 'cruiser') || 0) +
    (getShipCount(p, 'recycler') || 0) + (getShipCount(p, 'spy_probe') || 0) +
    (getShipCount(p, 'colony_ship') || 0) + (getShipCount(p, 'transporter') || 0);

  const getTotalDefense = (p: Planet) =>
    (getShipCount(p, 'rocket_launcher') || 0) + (getShipCount(p, 'plasma_turret') || 0) +
    (getShipCount(p, 'light_laser') || 0) + (getShipCount(p, 'heavy_laser') || 0) +
    (getShipCount(p, 'gauss_cannon') || 0) + (getShipCount(p, 'ion_cannon') || 0) +
    (getShipCount(p, 'small_shield') || 0) + (getShipCount(p, 'large_shield') || 0);

  const getHangarCap = (hangarLevel: number) => 500 + ((hangarLevel || 0) * 500);

  const getPlanetScore = (p: Planet) => {
    // Use API-provided points if available (calculated by backend with full formula)
    if (p.points !== undefined) {
      return p.points;
    }
    // Fallback to simple calculation
    const buildings = getBuildingLevel(p, 'metal_mine') + getBuildingLevel(p, 'crystal_mine') +
                     getBuildingLevel(p, 'deuterium_mine') + getBuildingLevel(p, 'solar_plant') +
                     getBuildingLevel(p, 'shipyard') + getBuildingLevel(p, 'research_lab') + getBuildingLevel(p, 'hangar');
    const fleet = getTotalFleet(p);
    const defense = getTotalDefense(p);
    return buildings * 10 + fleet * 5 + defense * 8;
  };

  const handleSelectPlanet = (planet: Planet) => {
    if (planet.id === currentPlanetId) {
      toast.info('Vous êtes déjà sur cette planète');
      return;
    }
    onSelectPlanet(planet.id);
    toast.success(`Navigation vers ${planet.name}`, {
      description: `Coordonnées: [${planet.galaxy}:${planet.system}:${planet.position}]`
    });
  };

  const handleUpgradeMine = async (planetId: string, mineType: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUpgradingMine({planetId, type: mineType});
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/planets/${planetId}/upgrade/${mineType}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(`Amélioration de ${mineType} lancée`);
        await fetchPlanets();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors de l\'amélioration');
      }
    } catch (error) {
      console.error('Erreur upgrade:', error);
      toast.error('Erreur de connexion');
    } finally {
      setUpgradingMine(null);
    }
  };

  const handleBuildShips = async (planetId: string, shipKey: string, quantity: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/planets/${planetId}/build-ships/${shipKey}/${quantity}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(`Production de ${quantity} ${shipKey} lancée`);
        await fetchPlanets();
        setShipProductionModal(null);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors de la production');
      }
    } catch (error) {
      console.error('Erreur production vaisseaux:', error);
      toast.error('Erreur de connexion');
    }
  };

  const handleBuildDefenses = async (planetId: string, defenseKey: string, quantity: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/planets/${planetId}/build-defenses/${defenseKey}/${quantity}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(`Production de ${quantity} ${defenseKey} lancée`);
        await fetchPlanets();
        setDefenseProductionModal(null);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors de la production');
      }
    } catch (error) {
      console.error('Erreur production défenses:', error);
      toast.error('Erreur de connexion');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 animate-pulse">
        <div className="text-center space-y-4">
          <RefreshCw size={40} className="mx-auto text-indigo-400 animate-spin" />
          <p className="text-slate-400 text-sm">Scan de l'empire en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-white flex items-center gap-3">
            <Globe className="text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
            Mes Planètes
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {planets.length} planète{planets.length > 1 ? 's' : ''} sous votre commandement
          </p>
        </div>
        <Button 
          onClick={fetchPlanets} 
          variant="outline" 
          className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 card-depth hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
        >
          <RefreshCw size={16} className="mr-2" /> Actualiser
        </Button>
      </div>

      {/* Statistiques Empire */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { 
            label: "Planètes", 
            value: planets.length, 
            Icon: Globe, 
            color: "text-indigo-400",
            bgColor: "from-indigo-500/20 to-purple-500/10"
          },
          { 
            label: "Flotte Totale", 
            value: planets.reduce((acc, p) => acc + getTotalFleet(p), 0), 
            Icon: Rocket, 
            color: "text-blue-400",
            bgColor: "from-blue-500/20 to-cyan-500/10"
          },
          { 
            label: "Défenses", 
            value: planets.reduce((acc, p) => acc + getTotalDefense(p), 0), 
            Icon: Shield, 
            color: "text-red-400",
            bgColor: "from-red-500/20 to-orange-500/10"
          },
          { 
            label: "Score Empire", 
            value: planets.reduce((acc, p) => acc + getPlanetScore(p), 0), 
            Icon: TrendingUp, 
            color: "text-emerald-400",
            bgColor: "from-emerald-500/20 to-green-500/10"
          },
        ].map(stat => (
          <Card key={stat.label} className={`bg-gradient-to-br ${stat.bgColor} border-white/10 card-depth hover:-translate-y-1 hover:shadow-xl transition-all duration-300 glass-card`}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-black/30 ${stat.color}`}>
                <stat.Icon size={24} className="drop-shadow-[0_0_8px_currentColor]" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{stat.label}</p>
                <p className={`text-2xl font-black font-mono ${stat.color}`}>{fmt(stat.value)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Liste des planètes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {planets.map((planet, index) => {
          const totalFleet = getTotalFleet(planet);
          const hangarCap = getHangarCap(getBuildingLevel(planet, 'hangar'));
          const totalDefense = getTotalDefense(planet);
          const score = getPlanetScore(planet);
          const isCurrent = planet.id === currentPlanetId;
          const isHomePlanet = planet.galaxy === 1 && planet.system === 1 && planet.position === 1;

          return (
            <Card
              key={planet.id}
              className={`bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 ${
                isHomePlanet
                  ? 'border-yellow-500/60 shadow-[0_0_40px_rgba(234,179,8,0.25)] animate-glow-pulse'
                  : isCurrent
                    ? 'border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.2)]'
                    : 'border-white/10 hover:border-indigo-500/30'
              } overflow-hidden relative hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 card-depth animate-slide-up glass-card cursor-pointer group`}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => setSelectedPlanet(selectedPlanet?.id === planet.id ? null : planet)}
            >
              {/* Effets de fond */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute -right-20 -top-20 w-48 h-48 rounded-full blur-3xl opacity-20 ${
                  isHomePlanet
                    ? 'bg-yellow-400 animate-pulse'
                    : isCurrent
                      ? 'bg-indigo-400 animate-pulse'
                      : 'bg-slate-600'
                }`}></div>
                <div className={`absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-2xl opacity-15 ${isHomePlanet ? 'bg-orange-500' : 'bg-purple-500'}`}></div>
                {isHomePlanet && (
                  <div className="absolute top-4 right-4 opacity-10">
                    <Crown size={80} className="text-yellow-400" />
                  </div>
                )}
              </div>

              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`relative w-12 h-12 rounded-full ${
                      isCurrent 
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
                        : 'bg-gradient-to-br from-slate-600 to-slate-700'
                    } flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Globe size={24} className="text-white" />
                      {isCurrent && (
                        <div className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-30"></div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-black text-white uppercase tracking-wider">{planet.name}</h3>
                        {/* Badge planète mère */}
                        {isHomePlanet && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-[8px] font-black uppercase text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.3)] animate-pulse">
                            <Crown size={10} className="drop-shadow-[0_0_4px_rgba(234,179,8,0.8)]" /> Planète Mère
                          </span>
                        )}
                        {/* Badge planète actuelle - intégré au titre */}
                        {isCurrent && !isHomePlanet && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/50 rounded-full text-[8px] font-black uppercase text-indigo-300">
                            <Star size={8} /> Actuelle
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                        <MapPin size={10} /> [{planet.galaxy}:{planet.system}:{planet.position}]
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase text-slate-500 font-bold">Score</p>
                    <p className="text-xl font-black font-mono text-emerald-400">{fmt(score)}</p>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4 relative z-10">
                {/* Débris Warning */}
                {(planet.debris_metal || 0) > 0 || (planet.debris_crystal || 0) > 0 ? (
                  <div className="bg-green-900/20 border border-green-500/50 p-2 rounded-lg flex items-center gap-2 animate-pulse">
                    <Recycle size={14} className="text-green-400" />
                    <span className="text-xs text-green-400 font-bold">
                      Débris disponibles: M:{fmt(planet.debris_metal || 0)} C:{fmt(planet.debris_crystal || 0)}
                    </span>
                  </div>
                ) : null}

                {/* Mines et Production */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Mine Métal */}
                  <div className="bg-orange-900/20 border border-orange-500/30 p-2 rounded-lg relative group">
                    <div className="flex items-center gap-2 mb-1">
                      <Stone size={12} className="text-orange-400 drop-shadow-[0_0_4px_currentColor]" />
                      <span className="text-[9px] uppercase text-slate-400 font-bold truncate">Mine Métal</span>
                      <button
                        onClick={(e) => handleUpgradeMine(planet.id, 'metal_mine', e)}
                        disabled={upgradingMine?.planetId === planet.id && upgradingMine?.type === 'metal_mine'}
                        className="ml-auto p-1 rounded bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-400 hover:text-orange-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Améliorer"
                      >
                        <ArrowUp size={10} />
                      </button>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-mono font-bold text-orange-400">{fmt(planet.metal_amount)}</span>
                      <span className="text-[10px] text-slate-500">Nv.{getBuildingLevel(planet, 'metal_mine')}</span>
                    </div>
                    <div className="text-[9px] text-orange-400 font-mono mt-0.5">
                      +{fmt(calculateProduction(planet, 'metal'))}/h
                    </div>
                  </div>

                  {/* Mine Cristal */}
                  <div className="bg-cyan-900/20 border border-cyan-500/30 p-2 rounded-lg relative group">
                    <div className="flex items-center gap-2 mb-1">
                      <Gem size={12} className="text-cyan-400 drop-shadow-[0_0_4px_currentColor]" />
                      <span className="text-[9px] uppercase text-slate-400 font-bold truncate">Mine Cristal</span>
                      <button
                        onClick={(e) => handleUpgradeMine(planet.id, 'crystal_mine', e)}
                        disabled={upgradingMine?.planetId === planet.id && upgradingMine?.type === 'crystal_mine'}
                        className="ml-auto p-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 hover:text-cyan-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Améliorer"
                      >
                        <ArrowUp size={10} />
                      </button>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-mono font-bold text-cyan-400">{fmt(planet.crystal_amount)}</span>
                      <span className="text-[10px] text-slate-500">Nv.{getBuildingLevel(planet, 'crystal_mine')}</span>
                    </div>
                    <div className="text-[9px] text-cyan-400 font-mono mt-0.5">
                      +{fmt(calculateProduction(planet, 'crystal'))}/h
                    </div>
                  </div>

                  {/* Synth. Deutérium */}
                  <div className="bg-green-900/20 border border-green-500/30 p-2 rounded-lg relative group">
                    <div className="flex items-center gap-2 mb-1">
                      <Droplets size={12} className="text-green-400 drop-shadow-[0_0_4px_currentColor]" />
                      <span className="text-[9px] uppercase text-slate-400 font-bold truncate">Synth. Deutérium</span>
                      <button
                        onClick={(e) => handleUpgradeMine(planet.id, 'deuterium_mine', e)}
                        disabled={upgradingMine?.planetId === planet.id && upgradingMine?.type === 'deuterium_mine'}
                        className="ml-auto p-1 rounded bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 hover:text-green-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Améliorer"
                      >
                        <ArrowUp size={10} />
                      </button>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-mono font-bold text-green-400">{fmt(planet.deuterium_amount)}</span>
                      <span className="text-[10px] text-slate-500">Nv.{getBuildingLevel(planet, 'deuterium_mine')}</span>
                    </div>
                    <div className="text-[9px] text-green-400 font-mono mt-0.5">
                      +{fmt(calculateProduction(planet, 'deuterium'))}/h
                    </div>
                  </div>

                  {/* Centrale Solaire */}
                  <div className="bg-yellow-900/20 border border-yellow-500/30 p-2 rounded-lg relative group">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap size={12} className="text-yellow-400 drop-shadow-[0_0_4px_currentColor]" />
                      <span className="text-[9px] uppercase text-slate-400 font-bold truncate">Centrale Solaire</span>
                      <button
                        onClick={(e) => handleUpgradeMine(planet.id, 'solar_plant', e)}
                        disabled={upgradingMine?.planetId === planet.id && upgradingMine?.type === 'solar_plant'}
                        className="ml-auto p-1 rounded bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-400 hover:text-yellow-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Améliorer"
                      >
                        <ArrowUp size={10} />
                      </button>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-mono font-bold text-yellow-400">{fmt(planet.energy || 0)}</span>
                      <span className="text-[10px] text-slate-500">Nv.{getBuildingLevel(planet, 'solar_plant')}</span>
                    </div>
                    <div className="text-[9px] text-yellow-400 font-mono mt-0.5">
                      +{fmt(planet.energy_production || 0)}/h
                    </div>
                  </div>
                </div>

                {/* Bâtiments & Recherche */}
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: "Chantier", val: getBuildingLevel(planet, 'shipyard'), icon: Factory },
                    { label: "Labo", val: getBuildingLevel(planet, 'research_lab'), icon: Beaker },
                    { label: "Hangar", val: getBuildingLevel(planet, 'hangar'), icon: Warehouse },
                    { label: "Tech E.", val: getTechLevel(planet, 'energy_tech'), icon: Zap },
                  ].map(b => (
                    <div key={b.label} className="bg-slate-900/60 p-1.5 rounded text-center border border-white/5">
                      <b.icon size={10} className="mx-auto mb-0.5 text-slate-500" />
                      <p className="text-[8px] uppercase text-slate-500 truncate">{b.label}</p>
                      <p className="text-xs font-mono font-bold text-white">Nv.{b.val || 0}</p>
                    </div>
                  ))}
                </div>

                {/* Construction/Recherche en cours */}
                {(planet.construction_queue && planet.construction_queue.length > 0) || (planet.research_queue && planet.research_queue.length > 0) ? (
                  <div className="bg-blue-900/20 border border-blue-500/30 p-2 rounded-lg space-y-1">
                    {planet.construction_queue && planet.construction_queue.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Wrench size={10} className="text-blue-400" />
                        <span className="text-blue-400 font-mono flex-1">Construction: {item.building_type} Nv.{item.target_level}</span>
                        <Clock size={10} className="text-slate-500" />
                      </div>
                    ))}
                    {planet.research_queue && planet.research_queue.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Beaker size={10} className="text-purple-400" />
                        <span className="text-purple-400 font-mono flex-1">Recherche: {item.tech_key} Nv.{item.target_level}</span>
                        <Clock size={10} className="text-slate-500" />
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Flotte et Défenses */}
                <div className="flex justify-between items-center bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Rocket size={14} className="text-blue-400" />
                      <span className="text-xs font-mono">
                        <span className="font-bold text-white">{totalFleet}</span>
                        <span className="text-slate-500">/{hangarCap}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield size={14} className={totalDefense > 0 ? "text-red-400" : "text-slate-500"} />
                      <span className={`text-xs font-mono font-bold ${totalDefense > 0 ? 'text-white' : 'text-slate-500'}`}>
                        {totalDefense}
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={(totalFleet / hangarCap) * 100}
                    className="w-24 h-2"
                  />
                </div>

                {/* Boutons de production rapide */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={(e) => { e.stopPropagation(); setShipProductionModal(planet); }}
                    className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-400 hover:text-blue-300 font-bold uppercase text-xs transition-all"
                  >
                    <Rocket size={12} className="mr-1" /> Produire Vaisseaux
                  </Button>
                  <Button
                    onClick={(e) => { e.stopPropagation(); setDefenseProductionModal(planet); }}
                    className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 hover:text-red-300 font-bold uppercase text-xs transition-all"
                  >
                    <Shield size={12} className="mr-1" /> Produire Défenses
                  </Button>
                </div>

                {/* Détails étendus */}
                {selectedPlanet?.id === planet.id && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 pt-2 border-t border-white/10">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
                      <Activity size={10} className="text-indigo-400" /> Détails de la flotte
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Chasseur Léger", key: 'light_hunter', Icon: Target, color: "text-red-400" },
                        { label: "Chasseur Lourd", key: 'heavy_hunter', Icon: Target, color: "text-red-500" },
                        { label: "Croiseur", key: 'cruiser', Icon: Ship, color: "text-purple-400" },
                        { label: "Vaisseau Guerre", key: 'battleship', Icon: Ship, color: "text-purple-500" },
                        { label: "Destructeur", key: 'destroyer', Icon: Rocket, color: "text-red-600" },
                        { label: "Bombardier", key: 'bomber', Icon: Rocket, color: "text-orange-500" },
                        { label: "Étoile Mort", key: 'deathstar', Icon: Star, color: "text-slate-200" },
                        { label: "Recycleur", key: 'recycler', Icon: Recycle, color: "text-green-400" },
                        { label: "Sonde", key: 'spy_probe', Icon: Satellite, color: "text-cyan-400" },
                        { label: "Colon", key: 'colony_ship', Icon: Globe, color: "text-emerald-400" },
                        { label: "Transporteur", key: 'transporter', Icon: Truck, color: "text-amber-400" },
                      ].map(ship => {
                        const count = getShipCount(planet, ship.key);
                        return (
                          <div key={ship.key} className="bg-slate-900/60 p-2 rounded-lg border border-white/5 flex items-center gap-2">
                            <ship.Icon size={12} className={ship.color} />
                            <div>
                              <p className="text-[8px] text-slate-500 uppercase truncate">{ship.label}</p>
                              <p className={`text-xs font-mono font-bold ${(count || 0) > 0 ? 'text-white' : 'text-slate-600'}`}>
                                {count || 0}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
                      <Shield size={10} className="text-red-400" /> Défenses planétaires
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Lance-roquettes", key: 'rocket_launcher', color: "text-orange-400" },
                        { label: "Laser Léger", key: 'light_laser', color: "text-blue-400" },
                        { label: "Laser Lourd", key: 'heavy_laser', color: "text-blue-500" },
                        { label: "Canon Gauss", key: 'gauss_cannon', color: "text-indigo-400" },
                        { label: "Canon à Ions", key: 'ion_cannon', color: "text-purple-400" },
                        { label: "Tourelle Plasma", key: 'plasma_turret', color: "text-red-400" },
                        { label: "Petit Bouclier", key: 'small_shield', color: "text-cyan-400" },
                        { label: "Grand Bouclier", key: 'large_shield', color: "text-cyan-500" },
                        { label: "Missile Anti-B", key: 'antiballistic_missile', color: "text-yellow-400" },
                        { label: "Missile Inter-P", key: 'interplanetary_missile', color: "text-red-500" },
                      ].map(def => {
                        const count = getShipCount(planet, def.key);
                        return (
                          <div key={def.key} className="bg-slate-900/60 p-2 rounded-lg border border-white/5 flex justify-between items-center">
                            <span className="text-[9px] text-slate-400 uppercase">{def.label}</span>
                            <span className={`font-mono font-bold text-sm ${(count || 0) > 0 ? def.color : 'text-slate-600'}`}>
                              {count || 0}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Boutons d'action */}
                <div className={isCurrent ? '' : 'grid grid-cols-2 gap-2'}>
                  <Button
                    onClick={(e) => { e.stopPropagation(); handleSelectPlanet(planet); }}
                    className={`${isCurrent ? 'w-full' : ''} font-bold uppercase tracking-wider transition-all duration-300 ${
                      isCurrent
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-xl card-depth'
                    }`}
                    disabled={isCurrent}
                  >
                    {isCurrent ? (
                      <span className="flex items-center gap-2"><Crown size={14} /> Position Actuelle</span>
                    ) : (
                      <span className="flex items-center gap-2"><ChevronRight size={14} /> Naviguer</span>
                    )}
                  </Button>

                  {!isCurrent && onNavigateTransport && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateTransport(planet.id, planet.name, planet.galaxy, planet.system, planet.position);
                      }}
                      className="font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-xl card-depth transition-all duration-300"
                    >
                      <span className="flex items-center gap-2"><Truck size={14} /> Ravitailler</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Message si aucune planète */}
      {planets.length === 0 && !loading && (
        <Card className="bg-slate-950 border-white/10 p-8 text-center">
          <Globe size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">Aucune planète trouvée</p>
          <p className="text-slate-500 text-sm mt-1">Commencez par coloniser une nouvelle planète</p>
        </Card>
      )}

      {/* Modal Production de Vaisseaux */}
      {shipProductionModal && (
        <ShipProductionModal
          planet={shipProductionModal}
          onClose={() => setShipProductionModal(null)}
          onBuild={handleBuildShips}
        />
      )}

      {/* Modal Production de Défenses */}
      {defenseProductionModal && (
        <DefenseProductionModal
          planet={defenseProductionModal}
          onClose={() => setDefenseProductionModal(null)}
          onBuild={handleBuildDefenses}
        />
      )}
    </div>
  );
}

// Modal de production de vaisseaux
function ShipProductionModal({ planet, onClose, onBuild }: { planet: Planet; onClose: () => void; onBuild: (planetId: string, shipKey: string, quantity: number) => void }) {
  const [selectedShip, setSelectedShip] = useState('');
  const [quantity, setQuantity] = useState(1);

  const ships = [
    { label: "Chasseur Léger", key: 'light_hunter', Icon: Target, color: "text-red-400" },
    { label: "Chasseur Lourd", key: 'heavy_hunter', Icon: Target, color: "text-red-500" },
    { label: "Croiseur", key: 'cruiser', Icon: Ship, color: "text-purple-400" },
    { label: "Vaisseau de Guerre", key: 'battleship', Icon: Ship, color: "text-purple-500" },
    { label: "Destructeur", key: 'destroyer', Icon: Rocket, color: "text-red-600" },
    { label: "Bombardier", key: 'bomber', Icon: Rocket, color: "text-orange-500" },
    { label: "Étoile de la Mort", key: 'deathstar', Icon: Star, color: "text-slate-200" },
    { label: "Recycleur", key: 'recycler', Icon: Recycle, color: "text-green-400" },
    { label: "Sonde d'Espionnage", key: 'spy_probe', Icon: Satellite, color: "text-cyan-400" },
    { label: "Vaisseau de Colonisation", key: 'colony_ship', Icon: Globe, color: "text-emerald-400" },
    { label: "Transporteur", key: 'transporter', Icon: Truck, color: "text-amber-400" },
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-950 border-2 border-blue-500/40 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.3)] card-depth glass-card animate-slide-up max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-blue-950/50 p-6 border-b border-blue-500/20 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg animate-pulse">
              <Rocket className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase text-white tracking-widest">Production de Vaisseaux</h2>
              <p className="text-xs text-blue-400 font-mono">{planet.name} - [{planet.galaxy}:{planet.system}:{planet.position}]</p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-400 hover:text-white transition-all duration-300 hover:scale-110 card-depth hover:shadow-lg hover:-translate-y-0.5">
            <X size={24} />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-4">
          {/* Sélection du vaisseau */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ships.map(ship => {
              const ShipIcon = ship.Icon;
              const count = getShipCount(planet, ship.key);
              return (
                <button
                  key={ship.key}
                  onClick={() => setSelectedShip(ship.key)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedShip === ship.key
                      ? 'border-blue-500 bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                      : 'border-white/10 bg-slate-900/50 hover:border-blue-500/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ShipIcon size={16} className={ship.color} />
                    <span className="text-xs font-bold text-white truncate">{ship.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Possédés: <span className="text-white font-mono">{count || 0}</span></p>
                </button>
              );
            })}
          </div>

          {/* Quantité */}
          {selectedShip && (
            <div className="bg-slate-900/50 border border-white/10 p-4 rounded-xl space-y-3 animate-in slide-in-from-top duration-200">
              <div className="flex justify-between text-sm uppercase font-bold text-slate-400">
                <span>Quantité à produire</span>
                <span className="text-white">{quantity}</span>
              </div>
              <div className="flex gap-4 items-center">
                <Input
                  type="range"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-slate-800 accent-blue-500 cursor-pointer"
                />
                <Input
                  type="number"
                  min="1"
                  max="10000"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 bg-black border-blue-900/50 text-white text-right font-mono"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <Button
              onClick={onClose}
              className="bg-transparent border border-white/10 hover:bg-white/5 text-slate-400 font-bold uppercase card-depth hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              Annuler
            </Button>
            <Button
              onClick={() => selectedShip && onBuild(planet.id, selectedShip, quantity)}
              disabled={!selectedShip}
              className={`${
                selectedShip
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:-translate-y-1 hover:shadow-2xl hover:scale-105'
                  : 'bg-slate-700 cursor-not-allowed'
              } text-white font-black uppercase tracking-widest card-depth transition-all duration-300`}
            >
              <Rocket size={16} className="mr-2" />
              {selectedShip ? 'Lancer Production' : 'Sélectionner Vaisseau'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal de production de défenses
function DefenseProductionModal({ planet, onClose, onBuild }: { planet: Planet; onClose: () => void; onBuild: (planetId: string, defenseKey: string, quantity: number) => void }) {
  const [selectedDefense, setSelectedDefense] = useState('');
  const [quantity, setQuantity] = useState(1);

  const defenses = [
    { label: "Lance-roquettes", key: 'rocket_launcher', color: "text-orange-400" },
    { label: "Laser Léger", key: 'light_laser', color: "text-blue-400" },
    { label: "Laser Lourd", key: 'heavy_laser', color: "text-blue-500" },
    { label: "Canon de Gauss", key: 'gauss_cannon', color: "text-indigo-400" },
    { label: "Canon à Ions", key: 'ion_cannon', color: "text-purple-400" },
    { label: "Tourelle à Plasma", key: 'plasma_turret', color: "text-red-400" },
    { label: "Petit Bouclier", key: 'small_shield', color: "text-cyan-400" },
    { label: "Grand Bouclier", key: 'large_shield', color: "text-cyan-500" },
    { label: "Missile Anti-Balistique", key: 'antiballistic_missile', color: "text-yellow-400" },
    { label: "Missile Interplanétaire", key: 'interplanetary_missile', color: "text-red-500" },
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-950 border-2 border-red-500/40 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.3)] card-depth glass-card animate-slide-up max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-red-950/50 p-6 border-b border-red-500/20 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg animate-pulse">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase text-white tracking-widest">Production de Défenses</h2>
              <p className="text-xs text-red-400 font-mono">{planet.name} - [{planet.galaxy}:{planet.system}:{planet.position}]</p>
            </div>
          </div>
          <button onClick={onClose} className="text-red-400 hover:text-white transition-all duration-300 hover:scale-110 card-depth hover:shadow-lg hover:-translate-y-0.5">
            <X size={24} />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-4">
          {/* Sélection de la défense */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {defenses.map(defense => {
              const count = getShipCount(planet, defense.key);
              return (
                <button
                  key={defense.key}
                  onClick={() => setSelectedDefense(defense.key)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedDefense === defense.key
                      ? 'border-red-500 bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                      : 'border-white/10 bg-slate-900/50 hover:border-red-500/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={16} className={defense.color} />
                    <span className="text-xs font-bold text-white truncate">{defense.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Installées: <span className="text-white font-mono">{count || 0}</span></p>
                </button>
              );
            })}
          </div>

          {/* Quantité */}
          {selectedDefense && (
            <div className="bg-slate-900/50 border border-white/10 p-4 rounded-xl space-y-3 animate-in slide-in-from-top duration-200">
              <div className="flex justify-between text-sm uppercase font-bold text-slate-400">
                <span>Quantité à produire</span>
                <span className="text-white">{quantity}</span>
              </div>
              <div className="flex gap-4 items-center">
                <Input
                  type="range"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-slate-800 accent-red-500 cursor-pointer"
                />
                <Input
                  type="number"
                  min="1"
                  max="10000"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 bg-black border-red-900/50 text-white text-right font-mono"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <Button
              onClick={onClose}
              className="bg-transparent border border-white/10 hover:bg-white/5 text-slate-400 font-bold uppercase card-depth hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              Annuler
            </Button>
            <Button
              onClick={() => selectedDefense && onBuild(planet.id, selectedDefense, quantity)}
              disabled={!selectedDefense}
              className={`${
                selectedDefense
                  ? 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:-translate-y-1 hover:shadow-2xl hover:scale-105'
                  : 'bg-slate-700 cursor-not-allowed'
              } text-white font-black uppercase tracking-widest card-depth transition-all duration-300`}
            >
              <Shield size={16} className="mr-2" />
              {selectedDefense ? 'Lancer Production' : 'Sélectionner Défense'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
