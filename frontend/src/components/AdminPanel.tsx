import { useState, useEffect } from 'react';
import { Search, Edit, Save, X, AlertTriangle, Database, Users, Zap, BarChart3, Settings, Rocket, Shield, TrendingUp, Crosshair, Target, Award, Package, Box, Map, Warehouse } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiUrl } from '@/config/api';

interface PlanetInfo {
  id: string;
  name: string;
  galaxy: number;
  system: number;
  position: number;
}

interface Player {
  id: string;
  username: string;
  email: string;
  planets: PlanetInfo[];
  total_points: number;
}

interface PlanetData {
  id: string;
  owner_id: string;
  name: string;
  galaxy: number;
  system: number;
  position: number;

  // Ressources
  metal_amount: number;
  crystal_amount: number;
  deuterium_amount: number;
  last_update: string;

  // Mines
  metal_mine_level: number;
  crystal_mine_level: number;
  deuterium_mine_level: number;
  solar_plant_level: number;

  // Installations
  shipyard_level: number;
  research_level: number;
  hangar_level: number;

  // Technologies
  energy_tech_level: number;
  laser_battery_level: number;
  armour_tech_level: number;
  espionage_tech_level: number;

  // Flotte
  light_hunter_count: number;
  cruiser_count: number;
  recycler_count: number;
  spy_probe_count: number;
  colony_ship_count: number;
  transporter_count: number;

  // Défenses
  missile_launcher_count: number;
  plasma_turret_count: number;
}

interface ServerStats {
  total_users: number;
  total_planets: number;
  total_metal: number;
  total_crystal: number;
  total_deuterium: number;
  total_ships: number;
  total_defenses: number;
  speed_factor: number;
}

interface ServerConfig {
  speed_factor: string;
  construction_speed_multiplier: string;
  mining_speed_multiplier: string;
  // Les autres configs seront chargées dynamiquement
  [key: string]: string;
}

type AdminTab = 'players' | 'stats' | 'users' | 'config';

interface ConfigCategory {
  id: string;
  title: string;
  icon: any;
  color: string;
  configs: ConfigItem[];
}

interface ConfigItem {
  key: string;
  label: string;
  description: string;
  defaultValue: string;
}

const CONFIG_CATEGORIES: ConfigCategory[] = [
  {
    id: 'speed',
    title: 'Multiplicateurs de Vitesse',
    icon: Zap,
    color: 'indigo',
    configs: [
      { key: 'speed_factor', label: 'Speed Factor Global', description: 'Multiplicateur général (x5 = 500)', defaultValue: '500.0' },
      { key: 'construction_speed_multiplier', label: 'Vitesse Construction', description: 'Multiplie les temps de construction', defaultValue: '1.0' },
      { key: 'mining_speed_multiplier', label: 'Vitesse Minage', description: 'Multiplie la production de ressources', defaultValue: '1.0' },
    ]
  },
  {
    id: 'ships',
    title: 'Coûts des Vaisseaux',
    icon: Rocket,
    color: 'cyan',
    configs: [
      { key: 'ship_light_hunter_metal', label: 'Chasseur - Métal', description: 'Coût métal chasseur léger', defaultValue: '3000.0' },
      { key: 'ship_light_hunter_crystal', label: 'Chasseur - Cristal', description: 'Coût cristal chasseur léger', defaultValue: '1000.0' },
      { key: 'ship_cruiser_metal', label: 'Croiseur - Métal', description: 'Coût métal croiseur', defaultValue: '20000.0' },
      { key: 'ship_cruiser_crystal', label: 'Croiseur - Cristal', description: 'Coût cristal croiseur', defaultValue: '7000.0' },
      { key: 'ship_transporter_metal', label: 'Transporteur - Métal', description: 'Coût métal transporteur', defaultValue: '4000.0' },
      { key: 'ship_transporter_crystal', label: 'Transporteur - Cristal', description: 'Coût cristal transporteur', defaultValue: '4000.0' },
      { key: 'ship_recycler_metal', label: 'Recycleur - Métal', description: 'Coût métal recycleur', defaultValue: '10000.0' },
      { key: 'ship_recycler_crystal', label: 'Recycleur - Cristal', description: 'Coût cristal recycleur', defaultValue: '6000.0' },
      { key: 'ship_spy_probe_metal', label: 'Sonde - Métal', description: 'Coût métal sonde espionnage', defaultValue: '1000.0' },
      { key: 'ship_spy_probe_crystal', label: 'Sonde - Cristal', description: 'Coût cristal sonde espionnage', defaultValue: '0.0' },
      { key: 'ship_colony_ship_metal', label: 'Colon - Métal', description: 'Coût métal vaisseau colonisation', defaultValue: '10000.0' },
      { key: 'ship_colony_ship_crystal', label: 'Colon - Cristal', description: 'Coût cristal vaisseau colonisation', defaultValue: '20000.0' },
    ]
  },
  {
    id: 'defenses',
    title: 'Coûts des Défenses',
    icon: Shield,
    color: 'red',
    configs: [
      { key: 'defense_missile_launcher_metal', label: 'Missile - Métal', description: 'Coût métal lanceur de missiles', defaultValue: '10000.0' },
      { key: 'defense_missile_launcher_crystal', label: 'Missile - Cristal', description: 'Coût cristal lanceur de missiles', defaultValue: '2500.0' },
      { key: 'defense_plasma_turret_metal', label: 'Plasma - Métal', description: 'Coût métal tourelle plasma', defaultValue: '50000.0' },
      { key: 'defense_plasma_turret_crystal', label: 'Plasma - Cristal', description: 'Coût cristal tourelle plasma', defaultValue: '50000.0' },
    ]
  },
  {
    id: 'production',
    title: 'Facteurs de Production',
    icon: TrendingUp,
    color: 'green',
    configs: [
      { key: 'production_metal_base', label: 'Métal - Base', description: 'Production base métal (ratio 3:2:1)', defaultValue: '30.0' },
      { key: 'production_metal_growth', label: 'Métal - Croissance', description: 'Facteur croissance exponentielle', defaultValue: '1.1' },
      { key: 'production_crystal_base', label: 'Cristal - Base', description: 'Production base cristal (ratio 3:2:1)', defaultValue: '20.0' },
      { key: 'production_crystal_growth', label: 'Cristal - Croissance', description: 'Facteur croissance exponentielle', defaultValue: '1.1' },
      { key: 'production_deuterium_base', label: 'Deutérium - Base', description: 'Production base deutérium (ratio 3:2:1)', defaultValue: '10.0' },
      { key: 'production_deuterium_growth', label: 'Deutérium - Croissance', description: 'Facteur croissance exponentielle (plus rare)', defaultValue: '1.05' },
    ]
  },
  {
    id: 'energy',
    title: 'Facteurs Énergétiques',
    icon: Battery,
    color: 'yellow',
    configs: [
      { key: 'energy_solar_base', label: 'Production Solaire - Base', description: 'Production base centrale solaire', defaultValue: '60.0' },
      { key: 'energy_solar_growth', label: 'Production Solaire - Croissance', description: 'Facteur croissance exponentielle', defaultValue: '1.1' },
      { key: 'energy_tech_bonus', label: 'Bonus Tech Énergie', description: 'Bonus par niveau tech énergie (+10%)', defaultValue: '0.10' },
      { key: 'energy_mine_consumption_base', label: 'Consommation Mine - Base', description: 'Consommation base des mines', defaultValue: '10.0' },
      { key: 'energy_mine_consumption_growth', label: 'Consommation Mine - Croissance', description: 'Facteur croissance exponentielle', defaultValue: '1.1' },
      { key: 'energy_deuterium_extra_consumption', label: 'Deutérium - Consommation Extra', description: 'Consommation supplémentaire deutérium', defaultValue: '20.0' },
    ]
  },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [planetData, setPlanetData] = useState<PlanetData | null>(null);
  const [editedData, setEditedData] = useState<Partial<PlanetData>>({});
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [editedConfig, setEditedConfig] = useState<Partial<ServerConfig>>({});
  const [loadingConfig, setLoadingConfig] = useState(false);

  const token = localStorage.getItem('token');
  const currentUsername = localStorage.getItem('username');
  const userId = localStorage.getItem('user_id');

  // Vérification sécurité
  if (currentUsername !== 'phantomhex') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="bg-red-950/20 border-red-500/50">
          <CardContent className="p-8 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-black text-red-400 mb-2">ACCÈS REFUSÉ</h2>
            <p className="text-slate-400 text-sm">Zone réservée aux administrateurs système.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Charger la liste des joueurs
  useEffect(() => {
    fetchPlayers();
  }, []);

  // Charger les stats quand on passe sur l'onglet stats ou config
  useEffect(() => {
    if (activeTab === 'stats' || activeTab === 'config') {
      fetchStats();
      fetchConfig();
    }
  }, [activeTab]);

  const fetchPlayers = async () => {
    try {
      const res = await fetch(apiUrl(`/admin/players?user_id=${userId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      } else {
        console.error('Erreur chargement joueurs:', res.status);
      }
    } catch (e) {
      console.error('Erreur chargement joueurs', e);
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(apiUrl(`/admin/stats?user_id=${userId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        toast.error('Impossible de charger les statistiques');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch(apiUrl(`/admin/config?user_id=${userId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setEditedConfig(data);
      } else {
        toast.error('Impossible de charger la configuration');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setLoadingConfig(false);
    }
  };

  const updateConfig = async () => {
    setLoadingConfig(true);
    try {
      // Le backend utilise #[serde(flatten)] donc on envoie directement editedConfig
      console.log('🚀 [ADMIN] Sending config update');
      console.log('🚀 [ADMIN] editedConfig keys:', Object.keys(editedConfig));
      console.log('🚀 [ADMIN] editedConfig values:', editedConfig);

      const res = await fetch(apiUrl(`/admin/config?user_id=${userId}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedConfig)
      });

      console.log('🚀 [ADMIN] Response status:', res.status);
      const responseData = await res.json();
      console.log('🚀 [ADMIN] Response data:', responseData);

      if (res.ok) {
        toast.success('✅ Configuration mise à jour', {
          description: 'Les paramètres ont été modifiés avec succès'
        });
        fetchConfig();
        fetchStats();
      } else {
        toast.error('Erreur lors de la sauvegarde');
      }
    } catch (e) {
      console.error('🚀 [ADMIN] Error:', e);
      toast.error('Erreur réseau');
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchPlanetData = async (planetId: string) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/admin/planet/${planetId}?user_id=${userId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlanetData(data);
        setEditedData(data);
      } else {
        toast.error('Impossible de charger les données');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlayer = (player: Player, planetId: string) => {
    setSelectedPlayer(player);
    fetchPlanetData(planetId);
  };

  const handleSaveChanges = async () => {
    if (!planetData) return;

    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/admin/planet/${planetData.id}?user_id=${userId}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedData)
      });

      if (res.ok) {
        toast.success('✅ Modifications enregistrées', {
          description: 'last_update mis à jour automatiquement'
        });
        fetchPlanetData(planetData.id);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de la sauvegarde');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(p =>
    p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.includes(searchTerm)
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <Card className="bg-gradient-to-r from-red-950/20 to-orange-950/20 border-red-500/30 card-depth">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-red-400">
            <Database size={24} />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wider">PANNEAU D'ADMINISTRATION</h1>
              <p className="text-xs text-slate-500 font-normal mt-1">Accès réservé • phantomhex</p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeTab === 'stats' ? 'default' : 'outline'}
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 transition-all duration-300 ${
            activeTab === 'stats'
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white card-depth shadow-lg'
              : 'bg-slate-900/50 border-white/10 hover:bg-slate-800'
          }`}
        >
          <BarChart3 size={16} />
          Statistiques
        </Button>
        <Button
          variant={activeTab === 'config' ? 'default' : 'outline'}
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 transition-all duration-300 ${
            activeTab === 'config'
              ? 'bg-purple-600 hover:bg-purple-500 text-white card-depth shadow-lg'
              : 'bg-slate-900/50 border-white/10 hover:bg-slate-800'
          }`}
        >
          <Settings size={16} />
          Configuration Jeu
        </Button>
        <Button
          variant={activeTab === 'players' ? 'default' : 'outline'}
          onClick={() => setActiveTab('players')}
          className={`flex items-center gap-2 transition-all duration-300 ${
            activeTab === 'players'
              ? 'bg-cyan-600 hover:bg-cyan-500 text-white card-depth shadow-lg'
              : 'bg-slate-900/50 border-white/10 hover:bg-slate-800'
          }`}
        >
          <Users size={16} />
          Gestion Planètes
        </Button>
        <Button
          variant={activeTab === 'users' ? 'default' : 'outline'}
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 transition-all duration-300 ${
            activeTab === 'users'
              ? 'bg-orange-600 hover:bg-orange-500 text-white card-depth shadow-lg'
              : 'bg-slate-900/50 border-white/10 hover:bg-slate-800'
          }`}
        >
          <Users size={16} />
          Gestion Utilisateurs
        </Button>
      </div>

      {/* TAB STATS */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingStats ? (
            <div className="col-span-full text-center py-12 text-slate-500">
              Chargement des statistiques...
            </div>
          ) : stats ? (
            <>
              <Card className="bg-gradient-to-br from-blue-950/40 to-blue-900/20 border-blue-500/30 card-depth hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">Joueurs</p>
                      <p className="text-3xl font-black text-white">{stats.total_users}</p>
                    </div>
                    <Users size={32} className="text-blue-500 opacity-30" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-950/40 to-purple-900/20 border-purple-500/30 card-depth hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-1">Planètes</p>
                      <p className="text-3xl font-black text-white">{stats.total_planets}</p>
                    </div>
                    <Database size={32} className="text-purple-500 opacity-30" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-950/40 to-cyan-900/20 border-cyan-500/30 card-depth hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1">Vaisseaux</p>
                      <p className="text-3xl font-black text-white">{stats.total_ships.toLocaleString()}</p>
                    </div>
                    <Zap size={32} className="text-cyan-500 opacity-30" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-950/40 to-red-900/20 border-red-500/30 card-depth hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-1">Défenses</p>
                      <p className="text-3xl font-black text-white">{stats.total_defenses.toLocaleString()}</p>
                    </div>
                    <AlertTriangle size={32} className="text-red-500 opacity-30" />
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-full bg-slate-950 border-white/10 card-depth">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-400">
                    Ressources Totales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-orange-950/20 border border-orange-500/30 rounded-lg p-4 hover:-translate-y-1 transition-all duration-300 card-depth">
                      <p className="text-xs text-orange-400 font-bold mb-1">MÉTAL</p>
                      <p className="text-2xl font-mono font-black text-white">{Math.floor(stats.total_metal).toLocaleString()}</p>
                    </div>
                    <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-lg p-4 hover:-translate-y-1 transition-all duration-300 card-depth">
                      <p className="text-xs text-cyan-400 font-bold mb-1">CRISTAL</p>
                      <p className="text-2xl font-mono font-black text-white">{Math.floor(stats.total_crystal).toLocaleString()}</p>
                    </div>
                    <div className="bg-green-950/20 border border-green-500/30 rounded-lg p-4 hover:-translate-y-1 transition-all duration-300 card-depth">
                      <p className="text-xs text-green-400 font-bold mb-1">DEUTÉRIUM</p>
                      <p className="text-2xl font-mono font-black text-white">{Math.floor(stats.total_deuterium).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="col-span-full text-center py-12 text-slate-600">
              <Database size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm">Aucune statistique disponible</p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONFIG */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {loadingConfig || !config ? (
            <div className="text-center py-12 text-slate-500">
              <Database size={48} className="mx-auto mb-4 opacity-20 animate-pulse" />
              <p>Chargement de la configuration...</p>
            </div>
          ) : (
            <>
              {/* Avertissement */}
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-400 flex items-start gap-3 card-depth">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">⚠️ Modifications en Temps Réel</p>
                  <p className="text-yellow-200/80">Les changements prennent effet immédiatement pour toutes les nouvelles opérations. Les opérations en cours conservent leur configuration initiale.</p>
                </div>
              </div>

              {/* Categories */}
              {CONFIG_CATEGORIES.map((category, idx) => {
                const Icon = category.icon;
                return (
                  <Card
                    key={category.id}
                    className={`bg-gradient-to-br from-${category.color}-950/30 to-${category.color}-900/10 border-${category.color}-500/30 card-depth animate-slide-up overflow-hidden relative`}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    {/* Decoration Icon */}
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                      <Icon size={120} />
                    </div>

                    <CardHeader className="relative z-10">
                      <CardTitle className={`flex items-center gap-3 text-${category.color}-400`}>
                        <Icon size={20} />
                        <span className="text-sm font-black uppercase tracking-wider">{category.title}</span>
                        <span className="ml-auto text-xs text-slate-500 font-normal">{category.configs.length} paramètres</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {category.configs.map((item) => {
                          const currentValue = config[item.key] || item.defaultValue;
                          const editedValue = editedConfig[item.key] ?? currentValue;
                          const hasChanged = editedValue !== currentValue;

                          return (
                            <div
                              key={item.key}
                              className={`bg-black/30 border rounded-lg p-4 transition-all duration-300 ${
                                hasChanged
                                  ? `border-${category.color}-500/50 shadow-lg shadow-${category.color}-500/20`
                                  : 'border-white/10 hover:border-white/20'
                              }`}
                            >
                              <label className={`text-xs font-bold mb-1 block ${
                                hasChanged ? `text-${category.color}-300` : 'text-slate-400'
                              }`}>
                                {item.label}
                              </label>
                              <Input
                                type="number"
                                step="0.1"
                                value={editedValue}
                                onChange={(e) => setEditedConfig({...editedConfig, [item.key]: e.target.value})}
                                className={`bg-black/40 text-white font-mono text-lg transition-all ${
                                  hasChanged
                                    ? `border-${category.color}-500/50`
                                    : 'border-white/10'
                                }`}
                              />
                              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">{item.description}</p>
                              {hasChanged && (
                                <div className={`mt-2 text-[10px] text-${category.color}-400 flex items-center gap-1`}>
                                  <Edit size={10} />
                                  <span>Modifié: {currentValue} → {editedValue}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* SECTION 6: STATISTIQUES DE COMBAT */}
                      <Card className="bg-slate-900/40 border-red-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-2">
                            <Crosshair size={14} />
                            Statistiques de Combat
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {[
                              { unit: 'light_hunter', label: 'Chasseur Léger' },
                              { unit: 'cruiser', label: 'Croiseur' },
                              { unit: 'missile_launcher', label: 'Lanceur de Missiles' },
                              { unit: 'plasma_turret', label: 'Tourelle Plasma' }
                            ].map(({ unit, label }) => (
                              <div key={unit} className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                                <h4 className="text-xs font-bold text-red-300 mb-3">{label}</h4>
                                <div className="grid grid-cols-3 gap-3">
                                  <ConfigInput
                                    label="Attaque"
                                    configKey={`combat_${unit}_attack`}
                                    value={editedConfig[`combat_${unit}_attack`] ?? config[`combat_${unit}_attack`] ?? '50.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, [`combat_${unit}_attack`]: v})}
                                    color="red"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Bouclier"
                                    configKey={`combat_${unit}_shield`}
                                    value={editedConfig[`combat_${unit}_shield`] ?? config[`combat_${unit}_shield`] ?? '10.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, [`combat_${unit}_shield`]: v})}
                                    color="cyan"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Coque"
                                    configKey={`combat_${unit}_hull`}
                                    value={editedConfig[`combat_${unit}_hull`] ?? config[`combat_${unit}_hull`] ?? '400.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, [`combat_${unit}_hull`]: v})}
                                    color="orange"
                                    compact
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* SECTION 7: TIR RAPIDE */}
                      <Card className="bg-slate-900/40 border-purple-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
                            <Target size={14} />
                            Tir Rapide (Rapid Fire)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <ConfigInput
                              label="Croiseur vs Chasseur"
                              configKey="combat_rf_cruiser_vs_light_hunter"
                              value={editedConfig['combat_rf_cruiser_vs_light_hunter'] ?? config['combat_rf_cruiser_vs_light_hunter'] ?? '6.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, combat_rf_cruiser_vs_light_hunter: v})}
                              color="purple"
                              description="Nombre de tirs consécutifs"
                            />
                            <ConfigInput
                              label="Croiseur vs Lanceur"
                              configKey="combat_rf_cruiser_vs_missile_launcher"
                              value={editedConfig['combat_rf_cruiser_vs_missile_launcher'] ?? config['combat_rf_cruiser_vs_missile_launcher'] ?? '10.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, combat_rf_cruiser_vs_missile_launcher: v})}
                              color="purple"
                              description="Nombre de tirs consécutifs"
                            />
                            <ConfigInput
                              label="Plasma vs Chasseur"
                              configKey="combat_rf_plasma_vs_light_hunter"
                              value={editedConfig['combat_rf_plasma_vs_light_hunter'] ?? config['combat_rf_plasma_vs_light_hunter'] ?? '6.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, combat_rf_plasma_vs_light_hunter: v})}
                              color="purple"
                              description="Nombre de tirs consécutifs"
                            />
                            <ConfigInput
                              label="Plasma vs Croiseur"
                              configKey="combat_rf_plasma_vs_cruiser"
                              value={editedConfig['combat_rf_plasma_vs_cruiser'] ?? config['combat_rf_plasma_vs_cruiser'] ?? '3.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, combat_rf_plasma_vs_cruiser: v})}
                              color="purple"
                              description="Nombre de tirs consécutifs"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* SECTION 8: BONUS TECHNOLOGIQUES */}
                      <Card className="bg-slate-900/40 border-yellow-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-yellow-400 flex items-center gap-2">
                            <Award size={14} />
                            Bonus Technologiques
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4">
                            <ConfigInput
                              label="Bonus Laser"
                              configKey="combat_tech_laser_bonus"
                              value={editedConfig['combat_tech_laser_bonus'] ?? config['combat_tech_laser_bonus'] ?? '0.1'}
                              onChange={(v) => setEditedConfig({...editedConfig, combat_tech_laser_bonus: v})}
                              color="red"
                              description="Bonus par niveau (0.1 = 10%)"
                              step="0.01"
                            />
                            <ConfigInput
                              label="Bonus Énergie"
                              configKey="combat_tech_energy_bonus"
                              value={editedConfig['combat_tech_energy_bonus'] ?? config['combat_tech_energy_bonus'] ?? '0.1'}
                              onChange={(v) => setEditedConfig({...editedConfig, combat_tech_energy_bonus: v})}
                              color="cyan"
                              description="Bonus par niveau (0.1 = 10%)"
                              step="0.01"
                            />
                            <ConfigInput
                              label="Bonus Blindage"
                              configKey="combat_tech_armour_bonus"
                              value={editedConfig['combat_tech_armour_bonus'] ?? config['combat_tech_armour_bonus'] ?? '0.1'}
                              onChange={(v) => setEditedConfig({...editedConfig, combat_tech_armour_bonus: v})}
                              color="orange"
                              description="Bonus par niveau (0.1 = 10%)"
                              step="0.01"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* SECTION 9: PILLAGE & DÉBRIS */}
                      <Card className="bg-slate-900/40 border-green-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-green-400 flex items-center gap-2">
                            <Package size={14} />
                            Pillage & Débris
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4">
                            <ConfigInput
                              label="% Pillage"
                              configKey="loot_percentage"
                              value={editedConfig['loot_percentage'] ?? config['loot_percentage'] ?? '0.5'}
                              onChange={(v) => setEditedConfig({...editedConfig, loot_percentage: v})}
                              color="green"
                              description="Pourcentage pillable (0.5 = 50%)"
                              step="0.01"
                            />
                            <ConfigInput
                              label="Max par ressource"
                              configKey="loot_max_per_resource"
                              value={editedConfig['loot_max_per_resource'] ?? config['loot_max_per_resource'] ?? '50000.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, loot_max_per_resource: v})}
                              color="orange"
                              description="Maximum pillable par ressource"
                            />
                            <ConfigInput
                              label="% Débris"
                              configKey="debris_percentage"
                              value={editedConfig['debris_percentage'] ?? config['debris_percentage'] ?? '0.3'}
                              onChange={(v) => setEditedConfig({...editedConfig, debris_percentage: v})}
                              color="red"
                              description="Pourcentage en débris (0.3 = 30%)"
                              step="0.01"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* SECTION 10: CAPACITÉS DE CARGO */}
                      <Card className="bg-slate-900/40 border-cyan-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                            <Box size={14} />
                            Capacités de Cargo
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <ConfigInput
                              label="Capacité Chasseur"
                              configKey="cargo_light_hunter_capacity"
                              value={editedConfig['cargo_light_hunter_capacity'] ?? config['cargo_light_hunter_capacity'] ?? '50.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, cargo_light_hunter_capacity: v})}
                              color="cyan"
                              description="Cargo du chasseur léger"
                            />
                            <ConfigInput
                              label="Capacité Croiseur"
                              configKey="cargo_cruiser_capacity"
                              value={editedConfig['cargo_cruiser_capacity'] ?? config['cargo_cruiser_capacity'] ?? '800.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, cargo_cruiser_capacity: v})}
                              color="cyan"
                              description="Cargo du croiseur"
                            />
                            <ConfigInput
                              label="Base Transporteur"
                              configKey="cargo_transporter_base"
                              value={editedConfig['cargo_transporter_base'] ?? config['cargo_transporter_base'] ?? '5000.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, cargo_transporter_base: v})}
                              color="purple"
                              description="Capacité de base"
                            />
                            <ConfigInput
                              label="Bonus Hangar"
                              configKey="cargo_transporter_hangar_bonus"
                              value={editedConfig['cargo_transporter_hangar_bonus'] ?? config['cargo_transporter_hangar_bonus'] ?? '2500.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, cargo_transporter_hangar_bonus: v})}
                              color="purple"
                              description="Bonus par niveau de hangar"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* SECTION 11: EXPÉDITIONS */}
                      <Card className="bg-slate-900/40 border-indigo-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                            <Map size={14} />
                            Mécaniques d'Expédition
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Combat & Chances */}
                            <div className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                              <h4 className="text-xs font-bold text-indigo-300 mb-3">Combat & Chances</h4>
                              <div className="grid grid-cols-3 gap-3">
                                <ConfigInput
                                  label="% Combat"
                                  configKey="expedition_combat_chance"
                                  value={editedConfig['expedition_combat_chance'] ?? config['expedition_combat_chance'] ?? '0.3'}
                                  onChange={(v) => setEditedConfig({...editedConfig, expedition_combat_chance: v})}
                                  color="red"
                                  compact
                                  step="0.01"
                                />
                                <ConfigInput
                                  label="% Deutérium"
                                  configKey="expedition_deuterium_chance"
                                  value={editedConfig['expedition_deuterium_chance'] ?? config['expedition_deuterium_chance'] ?? '0.1'}
                                  onChange={(v) => setEditedConfig({...editedConfig, expedition_deuterium_chance: v})}
                                  color="green"
                                  compact
                                  step="0.01"
                                />
                                <ConfigInput
                                  label="Mult. Recycleur"
                                  configKey="expedition_recycler_multiplier"
                                  value={editedConfig['expedition_recycler_multiplier'] ?? config['expedition_recycler_multiplier'] ?? '1.5'}
                                  onChange={(v) => setEditedConfig({...editedConfig, expedition_recycler_multiplier: v})}
                                  color="cyan"
                                  compact
                                  step="0.1"
                                />
                              </div>
                            </div>

                            {/* Récompenses Chasseurs */}
                            <div className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                              <h4 className="text-xs font-bold text-indigo-300 mb-3">Récompenses Chasseurs</h4>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                  <p className="text-[10px] text-orange-400 font-bold">MÉTAL</p>
                                  <ConfigInput
                                    label="Min"
                                    configKey="expedition_hunter_metal_min"
                                    value={editedConfig['expedition_hunter_metal_min'] ?? config['expedition_hunter_metal_min'] ?? '50.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_hunter_metal_min: v})}
                                    color="orange"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Range"
                                    configKey="expedition_hunter_metal_range"
                                    value={editedConfig['expedition_hunter_metal_range'] ?? config['expedition_hunter_metal_range'] ?? '200.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_hunter_metal_range: v})}
                                    color="orange"
                                    compact
                                  />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] text-cyan-400 font-bold">CRISTAL</p>
                                  <ConfigInput
                                    label="Min"
                                    configKey="expedition_hunter_crystal_min"
                                    value={editedConfig['expedition_hunter_crystal_min'] ?? config['expedition_hunter_crystal_min'] ?? '25.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_hunter_crystal_min: v})}
                                    color="cyan"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Range"
                                    configKey="expedition_hunter_crystal_range"
                                    value={editedConfig['expedition_hunter_crystal_range'] ?? config['expedition_hunter_crystal_range'] ?? '100.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_hunter_crystal_range: v})}
                                    color="cyan"
                                    compact
                                  />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] text-green-400 font-bold">DEUTÉRIUM</p>
                                  <ConfigInput
                                    label="Min"
                                    configKey="expedition_hunter_deuterium_min"
                                    value={editedConfig['expedition_hunter_deuterium_min'] ?? config['expedition_hunter_deuterium_min'] ?? '0.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_hunter_deuterium_min: v})}
                                    color="green"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Range"
                                    configKey="expedition_hunter_deuterium_range"
                                    value={editedConfig['expedition_hunter_deuterium_range'] ?? config['expedition_hunter_deuterium_range'] ?? '50.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_hunter_deuterium_range: v})}
                                    color="green"
                                    compact
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Récompenses Croiseurs */}
                            <div className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                              <h4 className="text-xs font-bold text-indigo-300 mb-3">Récompenses Croiseurs</h4>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                  <p className="text-[10px] text-orange-400 font-bold">MÉTAL</p>
                                  <ConfigInput
                                    label="Min"
                                    configKey="expedition_cruiser_metal_min"
                                    value={editedConfig['expedition_cruiser_metal_min'] ?? config['expedition_cruiser_metal_min'] ?? '200.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_cruiser_metal_min: v})}
                                    color="orange"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Range"
                                    configKey="expedition_cruiser_metal_range"
                                    value={editedConfig['expedition_cruiser_metal_range'] ?? config['expedition_cruiser_metal_range'] ?? '600.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_cruiser_metal_range: v})}
                                    color="orange"
                                    compact
                                  />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] text-cyan-400 font-bold">CRISTAL</p>
                                  <ConfigInput
                                    label="Min"
                                    configKey="expedition_cruiser_crystal_min"
                                    value={editedConfig['expedition_cruiser_crystal_min'] ?? config['expedition_cruiser_crystal_min'] ?? '100.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_cruiser_crystal_min: v})}
                                    color="cyan"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Range"
                                    configKey="expedition_cruiser_crystal_range"
                                    value={editedConfig['expedition_cruiser_crystal_range'] ?? config['expedition_cruiser_crystal_range'] ?? '400.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_cruiser_crystal_range: v})}
                                    color="cyan"
                                    compact
                                  />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] text-green-400 font-bold">DEUTÉRIUM</p>
                                  <ConfigInput
                                    label="Min"
                                    configKey="expedition_cruiser_deuterium_min"
                                    value={editedConfig['expedition_cruiser_deuterium_min'] ?? config['expedition_cruiser_deuterium_min'] ?? '0.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_cruiser_deuterium_min: v})}
                                    color="green"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Range"
                                    configKey="expedition_cruiser_deuterium_range"
                                    value={editedConfig['expedition_cruiser_deuterium_range'] ?? config['expedition_cruiser_deuterium_range'] ?? '150.0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_cruiser_deuterium_range: v})}
                                    color="green"
                                    compact
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Combat Pirates */}
                            <div className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                              <h4 className="text-xs font-bold text-indigo-300 mb-3">Combat Pirates</h4>
                              <div className="grid grid-cols-3 gap-3">
                                <ConfigInput
                                  label="Force Min Pirates"
                                  configKey="expedition_pirate_strength_min"
                                  value={editedConfig['expedition_pirate_strength_min'] ?? config['expedition_pirate_strength_min'] ?? '10.0'}
                                  onChange={(v) => setEditedConfig({...editedConfig, expedition_pirate_strength_min: v})}
                                  color="red"
                                  compact
                                />
                                <ConfigInput
                                  label="Force Max Pirates"
                                  configKey="expedition_pirate_strength_max"
                                  value={editedConfig['expedition_pirate_strength_max'] ?? config['expedition_pirate_strength_max'] ?? '100.0'}
                                  onChange={(v) => setEditedConfig({...editedConfig, expedition_pirate_strength_max: v})}
                                  color="red"
                                  compact
                                />
                                <ConfigInput
                                  label="Mult. Défense"
                                  configKey="expedition_defense_multiplier"
                                  value={editedConfig['expedition_defense_multiplier'] ?? config['expedition_defense_multiplier'] ?? '0.05'}
                                  onChange={(v) => setEditedConfig({...editedConfig, expedition_defense_multiplier: v})}
                                  color="cyan"
                                  compact
                                  step="0.01"
                                />
                              </div>
                            </div>

                            {/* Pertes Combat */}
                            <div className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                              <h4 className="text-xs font-bold text-indigo-300 mb-3">Pertes Combat</h4>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <p className="text-[10px] text-green-400 font-bold">VICTOIRE</p>
                                  <ConfigInput
                                    label="Perte Min"
                                    configKey="expedition_victory_loss_min"
                                    value={editedConfig['expedition_victory_loss_min'] ?? config['expedition_victory_loss_min'] ?? '0.03'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_victory_loss_min: v})}
                                    color="green"
                                    compact
                                    step="0.01"
                                  />
                                  <ConfigInput
                                    label="Perte Max"
                                    configKey="expedition_victory_loss_max"
                                    value={editedConfig['expedition_victory_loss_max'] ?? config['expedition_victory_loss_max'] ?? '0.15'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_victory_loss_max: v})}
                                    color="green"
                                    compact
                                    step="0.01"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] text-red-400 font-bold">DÉFAITE</p>
                                  <ConfigInput
                                    label="Perte Min"
                                    configKey="expedition_defeat_loss_min"
                                    value={editedConfig['expedition_defeat_loss_min'] ?? config['expedition_defeat_loss_min'] ?? '0.25'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_defeat_loss_min: v})}
                                    color="red"
                                    compact
                                    step="0.01"
                                  />
                                  <ConfigInput
                                    label="Perte Max"
                                    configKey="expedition_defeat_loss_max"
                                    value={editedConfig['expedition_defeat_loss_max'] ?? config['expedition_defeat_loss_max'] ?? '0.50'}
                                    onChange={(v) => setEditedConfig({...editedConfig, expedition_defeat_loss_max: v})}
                                    color="red"
                                    compact
                                    step="0.01"
                                  />
                                </div>
                                <ConfigInput
                                  label="Vulnérabilité Chasseur"
                                  configKey="expedition_hunter_vulnerability"
                                  value={editedConfig['expedition_hunter_vulnerability'] ?? config['expedition_hunter_vulnerability'] ?? '1.8'}
                                  onChange={(v) => setEditedConfig({...editedConfig, expedition_hunter_vulnerability: v})}
                                  color="orange"
                                  compact
                                  step="0.1"
                                />
                                <ConfigInput
                                  label="Vulnérabilité Croiseur"
                                  configKey="expedition_cruiser_vulnerability"
                                  value={editedConfig['expedition_cruiser_vulnerability'] ?? config['expedition_cruiser_vulnerability'] ?? '1.2'}
                                  onChange={(v) => setEditedConfig({...editedConfig, expedition_cruiser_vulnerability: v})}
                                  color="purple"
                                  compact
                                  step="0.1"
                                />
                              </div>
                            </div>

                            {/* Durée & Bonus */}
                            <div className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                              <h4 className="text-xs font-bold text-indigo-300 mb-3">Durée & Bonus</h4>
                              <div className="grid grid-cols-2 gap-3">
                                <ConfigInput
                                  label="Bonus Secteur Calme"
                                  configKey="expedition_calm_sector_bonus"
                                  value={editedConfig['expedition_calm_sector_bonus'] ?? config['expedition_calm_sector_bonus'] ?? '1.5'}
                                  onChange={(v) => setEditedConfig({...editedConfig, expedition_calm_sector_bonus: v})}
                                  color="green"
                                  compact
                                  step="0.1"
                                />
                                <ConfigInput
                                  label="Durée de Base (sec)"
                                  configKey="expedition_base_duration"
                                  value={editedConfig['expedition_base_duration'] ?? config['expedition_base_duration'] ?? '300.0'}
                                  onChange={(v) => setEditedConfig({...editedConfig, expedition_base_duration: v})}
                                  color="yellow"
                                  compact
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* SECTION 12: CAPACITÉS STRUCTURES */}
                      <Card className="bg-slate-900/40 border-orange-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-orange-400 flex items-center gap-2">
                            <Warehouse size={14} />
                            Capacités des Structures
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                              <h4 className="text-xs font-bold text-orange-300 mb-3">Hangar</h4>
                              <div className="grid grid-cols-2 gap-3">
                                <ConfigInput
                                  label="Capacité de Base"
                                  configKey="hangar_capacity_base"
                                  value={editedConfig['hangar_capacity_base'] ?? config['hangar_capacity_base'] ?? '500.0'}
                                  onChange={(v) => setEditedConfig({...editedConfig, hangar_capacity_base: v})}
                                  color="orange"
                                  compact
                                />
                                <ConfigInput
                                  label="Capacité par Niveau"
                                  configKey="hangar_capacity_per_level"
                                  value={editedConfig['hangar_capacity_per_level'] ?? config['hangar_capacity_per_level'] ?? '500.0'}
                                  onChange={(v) => setEditedConfig({...editedConfig, hangar_capacity_per_level: v})}
                                  color="orange"
                                  compact
                                />
                              </div>
                            </div>
                            <div className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                              <h4 className="text-xs font-bold text-orange-300 mb-3">Stockage</h4>
                              <div className="grid grid-cols-2 gap-3">
                                <ConfigInput
                                  label="Capacité de Base"
                                  configKey="storage_capacity_base"
                                  value={editedConfig['storage_capacity_base'] ?? config['storage_capacity_base'] ?? '10000.0'}
                                  onChange={(v) => setEditedConfig({...editedConfig, storage_capacity_base: v})}
                                  color="cyan"
                                  compact
                                />
                                <ConfigInput
                                  label="Facteur de Croissance"
                                  configKey="storage_capacity_growth"
                                  value={editedConfig['storage_capacity_growth'] ?? config['storage_capacity_growth'] ?? '1.6'}
                                  onChange={(v) => setEditedConfig({...editedConfig, storage_capacity_growth: v})}
                                  color="cyan"
                                  compact
                                  step="0.1"
                                />
                              </div>
                            </div>
                            <div className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                              <h4 className="text-xs font-bold text-orange-300 mb-3">Slots de Ressources</h4>
                              <div className="grid grid-cols-1 gap-3">
                                <ConfigInput
                                  label="Bonus par Slot (%)"
                                  configKey="slot_bonus_per_slot"
                                  value={editedConfig['slot_bonus_per_slot'] ?? config['slot_bonus_per_slot'] ?? '0.5'}
                                  onChange={(v) => setEditedConfig({...editedConfig, slot_bonus_per_slot: v})}
                                  color="green"
                                  description="Bonus de production par slot (0.5 = 50%)"
                                  step="0.1"
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* BOUTONS D'ACTION */}
                      <div className="flex gap-3 pt-2">
                        <Button
                          onClick={updateConfig}
                          disabled={loadingConfig}
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold uppercase tracking-wider shadow-lg"
                        >
                          <Save size={16} className="mr-2" />
                          Enregistrer toutes les modifications
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditedConfig(config)}
                          className="border-white/20 bg-white/5 hover:bg-white/10 font-bold"
                        >
                          <X size={16} className="mr-2" />
                          Annuler
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Action Buttons */}
              <div className="flex gap-3 sticky bottom-4 z-10">
                <Button
                  onClick={updateConfig}
                  disabled={loadingConfig}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold uppercase tracking-wider card-depth hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                >
                  <Save size={16} className="mr-2" />
                  Enregistrer toutes les modifications
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditedConfig(config)}
                  className="border-white/10 bg-white/5 hover:bg-white/10 card-depth"
                >
                  <X size={16} className="mr-2" />
                  Annuler
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB PLAYERS (unchanged) */}
      {activeTab === 'players' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des joueurs */}
        <Card className="lg:col-span-1 bg-slate-950 border-white/10 card-depth">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-400">
              <Users size={16} /> Joueurs ({players.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-black/40 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
              {filteredPlayers.map(player => (
                <div key={player.id} className="bg-slate-900/50 border border-white/5 rounded-lg overflow-hidden hover:-translate-y-1 transition-all duration-300">
                  <div className="p-3 border-b border-white/5">
                    <div className="font-bold text-white text-sm">{player.username}</div>
                    <div className="text-xs text-slate-600 mt-1">{player.total_points.toLocaleString()} pts • {player.planets.length} planète(s)</div>
                  </div>
                  <div className="divide-y divide-white/5">
                    {player.planets.length > 0 ? player.planets.map(planet => (
                      <button
                        key={planet.id}
                        onClick={() => handleSelectPlayer(player, planet.id)}
                        className={`w-full text-left p-2 px-4 transition-all hover:bg-white/5 ${
                          selectedPlayer?.id === player.id && planetData?.id === planet.id
                            ? 'bg-indigo-600/20'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-white font-medium">{planet.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">[{planet.galaxy}:{planet.system}:{planet.position}]</div>
                          </div>
                          <Edit size={12} className="text-slate-500" />
                        </div>
                      </button>
                    )) : (
                      <div className="p-2 px-4 text-xs text-slate-600 italic">Aucune planète</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Panneau d'édition */}
        <Card className="lg:col-span-2 bg-slate-950 border-white/10 card-depth">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-400">
                <Edit size={16} /> {selectedPlayer ? `Édition : ${selectedPlayer.username}` : 'Sélectionner un joueur'}
              </CardTitle>
              {selectedPlayer && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPlayer(null);
                    setPlanetData(null);
                  }}
                >
                  <X size={16} />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-slate-500">Chargement...</div>
            ) : !planetData ? (
              <div className="text-center py-12 text-slate-600">
                <Database size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm">Sélectionnez un joueur pour modifier ses données</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* RESSOURCES */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-orange-400 mb-3 flex items-center gap-2">
                    <Zap size={14} /> Ressources
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Métal</label>
                      <Input
                        type="number"
                        value={editedData.metal_amount ?? 0}
                        onChange={(e) => setEditedData({...editedData, metal_amount: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-orange-500/30 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Cristal</label>
                      <Input
                        type="number"
                        value={editedData.crystal_amount ?? 0}
                        onChange={(e) => setEditedData({...editedData, crystal_amount: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-cyan-500/30 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Deutérium</label>
                      <Input
                        type="number"
                        value={editedData.deuterium_amount ?? 0}
                        onChange={(e) => setEditedData({...editedData, deuterium_amount: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-green-500/30 text-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400 flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>La modification des ressources mettra automatiquement <code className="bg-black/40 px-1 rounded">last_update</code> à <code className="bg-black/40 px-1 rounded">NOW()</code> pour éviter les bugs de génération.</span>
                  </div>
                </div>

                {/* MINES */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-3">Mines</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Mine Métal</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.metal_mine_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, metal_mine_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Mine Cristal</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.crystal_mine_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, crystal_mine_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Synth. Deut.</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.deuterium_mine_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, deuterium_mine_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Centrale</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.solar_plant_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, solar_plant_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* INSTALLATIONS */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-purple-400 mb-3">Installations</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Chantier</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.shipyard_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, shipyard_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Labo</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.research_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, research_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Hangar</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.hangar_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, hangar_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* TECHNOLOGIES */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-green-400 mb-3">Technologies</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Énergie</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.energy_tech_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, energy_tech_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Laser</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.laser_battery_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, laser_battery_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Blindage</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.armour_tech_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, armour_tech_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Espionnage</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.espionage_tech_level ?? 0}
                        onChange={(e) => setEditedData({...editedData, espionage_tech_level: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* FLOTTE */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 mb-3">Flotte</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'light_hunter_count', label: 'Chasseurs' },
                      { key: 'cruiser_count', label: 'Croiseurs' },
                      { key: 'recycler_count', label: 'Recycleurs' },
                      { key: 'spy_probe_count', label: 'Sondes' },
                      { key: 'colony_ship_count', label: 'Colons' },
                      { key: 'transporter_count', label: 'Transporteurs' },
                    ].map(item => (
                      <div key={item.key}>
                        <label className="text-xs text-slate-500 mb-1 block">{item.label}</label>
                        <Input
                          type="number"
                          min="0"
                          value={(editedData as any)[item.key] ?? 0}
                          onChange={(e) => setEditedData({...editedData, [item.key]: parseInt(e.target.value) || 0})}
                          className="bg-black/40 border-white/10 text-white font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* DÉFENSES */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-red-400 mb-3">Défenses</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Missiles</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.missile_launcher_count ?? 0}
                        onChange={(e) => setEditedData({...editedData, missile_launcher_count: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Plasma</label>
                      <Input
                        type="number"
                        min="0"
                        value={editedData.plasma_turret_count ?? 0}
                        onChange={(e) => setEditedData({...editedData, plasma_turret_count: parseInt(e.target.value) || 0})}
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* BOUTONS */}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <Button
                    onClick={handleSaveChanges}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold uppercase tracking-wider card-depth hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                  >
                    <Save size={16} className="mr-2" />
                    Enregistrer les modifications
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditedData(planetData)}
                    className="border-white/10 bg-white/5 hover:bg-white/10 card-depth"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {/* ONGLET GESTION UTILISATEURS (unchanged) */}
      {activeTab === 'users' && (
        <Card className="bg-gradient-to-br from-slate-950 to-indigo-950/20 border-indigo-500/30 card-depth">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-indigo-300">
              <Settings size={20} />
              Gestion des Utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Liste des utilisateurs */}
              <div className="space-y-3">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="bg-slate-900/40 border border-white/10 rounded-lg p-4 hover:bg-slate-900/60 transition-all duration-300 hover:-translate-y-1 card-depth"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-white">{player.username}</h3>
                          <span className="px-2 py-0.5 bg-indigo-600/30 text-indigo-300 rounded text-xs font-mono border border-indigo-500/30">
                            {player.id.substring(0, 8)}...
                          </span>
                        </div>
                        <div className="text-sm text-slate-400 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Email:</span>
                            <span className="font-mono">{player.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Planètes:</span>
                            <span className="text-cyan-400">{player.planets.length}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                          onClick={async () => {
                            const newPassword = prompt('Nouveau mot de passe (min. 6 caractères):');
                            if (!newPassword || newPassword.length < 6) {
                              toast.error('Mot de passe invalide (min. 6 caractères)');
                              return;
                            }

                            try {
                              const res = await fetch(apiUrl(`/admin/user/${player.id}/reset-password?user_id=${userId}`), {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ new_password: newPassword })
                              });

                              if (res.ok) {
                                toast.success('✅ Mot de passe réinitialisé');
                              } else {
                                const err = await res.json();
                                toast.error(err.error || 'Erreur');
                              }
                            } catch (e) {
                              toast.error('Erreur réseau');
                            }
                          }}
                        >
                          Réinitialiser MDP
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                          onClick={async () => {
                            const newUsername = prompt('Nouveau nom d\'utilisateur:', player.username);
                            if (!newUsername || newUsername.trim() === '') {
                              toast.error('Nom d\'utilisateur invalide');
                              return;
                            }

                            try {
                              const res = await fetch(apiUrl(`/admin/user/${player.id}/username?user_id=${userId}`), {
                                method: 'PATCH',
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ username: newUsername })
                              });

                              if (res.ok) {
                                toast.success('✅ Nom d\'utilisateur modifié');
                                fetchPlayers();
                              } else {
                                const err = await res.json();
                                toast.error(err.error || 'Erreur');
                              }
                            } catch (e) {
                              toast.error('Erreur réseau');
                            }
                          }}
                        >
                          Modifier nom
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                          onClick={async () => {
                            const newEmail = prompt('Nouvel email:', player.email);
                            if (!newEmail || !newEmail.includes('@')) {
                              toast.error('Email invalide');
                              return;
                            }

                            try {
                              const res = await fetch(apiUrl(`/admin/user/${player.id}/email?user_id=${userId}`), {
                                method: 'PATCH',
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ email: newEmail })
                              });

                              if (res.ok) {
                                toast.success('✅ Email modifié');
                                fetchPlayers();
                              } else {
                                const err = await res.json();
                                toast.error(err.error || 'Erreur');
                              }
                            } catch (e) {
                              toast.error('Erreur réseau');
                            }
                          }}
                        >
                          Modifier email
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={async () => {
                            if (!confirm(`⚠️ ATTENTION ⚠️\n\nVoulez-vous vraiment supprimer l'utilisateur ${player.username} ?\n\nCette action est IRRÉVERSIBLE et supprimera:\n- Le compte utilisateur\n- Toutes ses planètes\n- Toutes ses données`)) {
                              return;
                            }

                            try {
                              const res = await fetch(apiUrl(`/admin/user/${player.id}?user_id=${userId}`), {
                                method: 'DELETE',
                                headers: {
                                  'Authorization': `Bearer ${token}`
                                }
                              });

                              if (res.ok) {
                                toast.success('✅ Utilisateur supprimé');
                                fetchPlayers();
                              } else {
                                const err = await res.json();
                                toast.error(err.error || 'Erreur');
                              }
                            } catch (e) {
                              toast.error('Erreur réseau');
                            }
                          }}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
