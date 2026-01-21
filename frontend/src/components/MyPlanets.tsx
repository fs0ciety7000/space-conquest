import { useState, useEffect } from "react";
import {
  Globe, MapPin, Stone, Gem, Droplets, Zap, Rocket, Shield,
  ChevronRight, Star, Crown, TrendingUp, Activity, Clock,
  Warehouse, Target, Ship, Recycle, Satellite, Truck, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';

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
  light_hunter_count: number;
  cruiser_count: number;
  recycler_count: number;
  spy_probe_count: number;
  colony_ship_count: number;
  transporter_count: number;
  missile_launcher_count: number;
  plasma_turret_count: number;
  energy_tech_level: number;
  is_current?: boolean;
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

  const fetchPlanets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/my-planets?current_planet_id=${currentPlanetId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Vérifier si on a reçu des données valides avec tous les champs nécessaires
        if (Array.isArray(data) && data.length > 0 && data[0].metal_amount !== undefined) {
          const planetsWithMeta = data.map((p: Planet) => ({
            ...p,
            is_current: p.id === currentPlanetId
          }));
          // Trier: planète mère (1:1:1) en premier, puis le reste
          const sortedPlanets = planetsWithMeta.sort((a: Planet, b: Planet) => {
            const aIsHome = a.galaxy === 1 && a.system === 1 && a.position === 1;
            const bIsHome = b.galaxy === 1 && b.system === 1 && b.position === 1;
            if (aIsHome) return -1;
            if (bIsHome) return 1;
            return 0;
          });
          setPlanets(sortedPlanets);
        } else if (Array.isArray(data) && data.length > 0) {
          // Le backend retourne des données partielles, on doit récupérer les détails complets
          // Pour l'instant, on affiche ce qu'on a
          const planetsWithDefaults = data.map((p: any) => ({
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
            light_hunter_count: getShipCount(p, 'light_hunter'),
            cruiser_count: getShipCount(p, 'cruiser'),
            recycler_count: getShipCount(p, 'recycler') ?? 0,
            spy_probe_count: getShipCount(p, 'spy_probe') ?? 0,
            colony_ship_count: getShipCount(p, 'colony_ship') ?? 0,
            transporter_count: p.transporter_count ?? 0,
            missile_launcher_count: p.missile_launcher_count ?? 0,
            plasma_turret_count: p.plasma_turret_count ?? 0,
            energy_tech_level: getTechLevel(p, 'energy_tech'),
          }));
          // Trier: planète mère (1:1:1) en premier, puis le reste
          const sortedPlanets = planetsWithDefaults.sort((a: any, b: any) => {
            const aIsHome = a.galaxy === 1 && a.system === 1 && a.position === 1;
            const bIsHome = b.galaxy === 1 && b.system === 1 && b.position === 1;
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
  }, [currentPlanetId]);

  const fmt = (n: number) => Math.floor(n).toLocaleString();

  const getTotalFleet = (p: Planet) => 
    (getShipCount(p, 'light_hunter') || 0) + (getShipCount(p, 'cruiser') || 0) + 
    (getShipCount(p, 'recycler') || 0) + (getShipCount(p, 'spy_probe') || 0) + 
    (getShipCount(p, 'colony_ship') || 0) + (p.transporter_count || 0);

  const getTotalDefense = (p: Planet) => 
    (p.missile_launcher_count || 0) + (p.plasma_turret_count || 0);

  const getHangarCap = (hangarLevel: number) => 500 + ((hangarLevel || 0) * 500);

  const getPlanetScore = (p: Planet) => {
    const buildings = (p.metal_mine_level || 0) + (p.crystal_mine_level || 0) + 
                     (p.deuterium_mine_level || 0) + (p.solar_plant_level || 0) +
                     (p.shipyard_level || 0) + (p.research_lab_level || 0) + (p.hangar_level || 0);
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
          const hangarCap = getHangarCap(planet.hangar_level);
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
                {/* Ressources */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Métal", val: planet.metal_amount, Icon: Stone, color: "text-orange-400" },
                    { label: "Cristal", val: planet.crystal_amount, Icon: Gem, color: "text-cyan-400" },
                    { label: "Deutérium", val: planet.deuterium_amount, Icon: Droplets, color: "text-green-400" },
                  ].map(res => (
                    <div key={res.label} className="bg-black/30 p-2 rounded-lg border border-white/5 text-center">
                      <res.Icon size={14} className={`${res.color} mx-auto mb-1 drop-shadow-[0_0_4px_currentColor]`} />
                      <p className="text-xs font-mono font-bold text-white">{fmt(res.val)}</p>
                      <p className="text-[8px] uppercase text-slate-500">{res.label}</p>
                    </div>
                  ))}
                </div>

                {/* Bâtiments */}
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: "Mine M", val: planet.metal_mine_level },
                    { label: "Mine C", val: planet.crystal_mine_level },
                    { label: "Synth. D", val: planet.deuterium_mine_level },
                    { label: "Centrale", val: planet.solar_plant_level },
                    { label: "Chantier", val: planet.shipyard_level },
                    { label: "Labo", val: planet.research_lab_level },
                    { label: "Hangar", val: planet.hangar_level },
                    { label: "Tech E.", val: getTechLevel(planet, 'energy_tech') },
                  ].map(b => (
                    <div key={b.label} className="bg-slate-900/60 p-1.5 rounded text-center border border-white/5">
                      <p className="text-[8px] uppercase text-slate-500 truncate">{b.label}</p>
                      <p className="text-xs font-mono font-bold text-white">Nv.{b.val || 0}</p>
                    </div>
                  ))}
                </div>

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

                {/* Détails étendus */}
                {selectedPlanet?.id === planet.id && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 pt-2 border-t border-white/10">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
                      <Activity size={10} className="text-indigo-400" /> Détails de la flotte
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Chasseurs", val: getShipCount(planet, 'light_hunter'), Icon: Target, color: "text-red-400" },
                        { label: "Croiseurs", val: getShipCount(planet, 'cruiser'), Icon: Ship, color: "text-purple-400" },
                        { label: "Recycleurs", val: getShipCount(planet, 'recycler'), Icon: Recycle, color: "text-green-400" },
                        { label: "Sondes", val: getShipCount(planet, 'spy_probe'), Icon: Satellite, color: "text-cyan-400" },
                        { label: "Colons", val: getShipCount(planet, 'colony_ship'), Icon: Globe, color: "text-emerald-400" },
                        { label: "Transport.", val: getShipCount(planet, 'transporter'), Icon: Truck, color: "text-amber-400" },
                      ].map(ship => (
                        <div key={ship.label} className="bg-slate-900/60 p-2 rounded-lg border border-white/5 flex items-center gap-2">
                          <ship.Icon size={12} className={ship.color} />
                          <div>
                            <p className="text-[8px] text-slate-500 uppercase">{ship.label}</p>
                            <p className={`text-xs font-mono font-bold ${(ship.val || 0) > 0 ? 'text-white' : 'text-slate-600'}`}>
                              {ship.val || 0}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
                      <Shield size={10} className="text-red-400" /> Défenses planétaires
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Lanceurs Missiles", val: getShipCount(planet, 'missile_launcher'), color: "text-orange-400" },
                        { label: "Tourelles Plasma", val: getShipCount(planet, 'plasma_turret'), color: "text-red-400" },
                      ].map(def => (
                        <div key={def.label} className="bg-slate-900/60 p-2 rounded-lg border border-white/5 flex justify-between items-center">
                          <span className="text-[9px] text-slate-400 uppercase">{def.label}</span>
                          <span className={`font-mono font-bold text-sm ${(def.val || 0) > 0 ? def.color : 'text-slate-600'}`}>
                            {def.val || 0}
                          </span>
                        </div>
                      ))}
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
    </div>
  );
}
