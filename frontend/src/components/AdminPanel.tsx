import { useState, useEffect } from 'react';
import { Search, Edit, Save, X, AlertTriangle, Database, Users, Zap, BarChart3, Settings, Rocket, Shield, TrendingUp } from 'lucide-react';
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
  [key: string]: string;
}

type AdminTab = 'players' | 'stats' | 'users';

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
  const userId = localStorage.getItem('user_id'); // ✅ RÉCUPÉRATION user_id

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

  // Charger les stats quand on passe sur l'onglet stats
  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStats();
      fetchConfig();
    }
  }, [activeTab]);

  const fetchPlayers = async () => {
    try {
      // ✅ AJOUT user_id dans l'URL
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
      const res = await fetch(apiUrl(`/admin/config?user_id=${userId}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ configs: editedConfig })
      });

      if (res.ok) {
        toast.success('✅ Configuration mise à jour', {
          description: 'Les paramètres ont été modifiés avec succès'
        });
        fetchConfig();
        fetchStats(); // Rafraîchir les stats pour voir le nouveau SPEED_FACTOR
      } else {
        toast.error('Erreur lors de la sauvegarde');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchPlanetData = async (planetId: string) => {
    setLoading(true);
    try {
      // ✅ AJOUT user_id dans l'URL
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
      // ✅ AJOUT user_id dans l'URL
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
      <Card className="bg-gradient-to-r from-red-950/20 to-orange-950/20 border-red-500/30">
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
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'stats' ? 'default' : 'outline'}
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 ${
            activeTab === 'stats'
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-slate-900/50 border-white/10 hover:bg-slate-800'
          }`}
        >
          <BarChart3 size={16} />
          Statistiques Serveur
        </Button>
        <Button
          variant={activeTab === 'players' ? 'default' : 'outline'}
          onClick={() => setActiveTab('players')}
          className={`flex items-center gap-2 ${
            activeTab === 'players'
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-slate-900/50 border-white/10 hover:bg-slate-800'
          }`}
        >
          <Users size={16} />
          Gestion Planètes
        </Button>
        <Button
          variant={activeTab === 'users' ? 'default' : 'outline'}
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-slate-900/50 border-white/10 hover:bg-slate-800'
          }`}
        >
          <Settings size={16} />
          Gestion Utilisateurs
        </Button>
      </div>

      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingStats ? (
            <div className="col-span-full text-center py-12 text-slate-500">
              Chargement des statistiques...
            </div>
          ) : stats ? (
            <>
              <Card className="bg-gradient-to-br from-blue-950/40 to-blue-900/20 border-blue-500/30">
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

              <Card className="bg-gradient-to-br from-purple-950/40 to-purple-900/20 border-purple-500/30">
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

              <Card className="bg-gradient-to-br from-cyan-950/40 to-cyan-900/20 border-cyan-500/30">
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

              <Card className="bg-gradient-to-br from-red-950/40 to-red-900/20 border-red-500/30">
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

              <Card className="col-span-full bg-slate-950 border-white/10">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-400">
                    Ressources Totales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-orange-950/20 border border-orange-500/30 rounded-lg p-4">
                      <p className="text-xs text-orange-400 font-bold mb-1">MÉTAL</p>
                      <p className="text-2xl font-mono font-black text-white">{Math.floor(stats.total_metal).toLocaleString()}</p>
                    </div>
                    <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-lg p-4">
                      <p className="text-xs text-cyan-400 font-bold mb-1">CRISTAL</p>
                      <p className="text-2xl font-mono font-black text-white">{Math.floor(stats.total_crystal).toLocaleString()}</p>
                    </div>
                    <div className="bg-green-950/20 border border-green-500/30 rounded-lg p-4">
                      <p className="text-xs text-green-400 font-bold mb-1">DEUTÉRIUM</p>
                      <p className="text-2xl font-mono font-black text-white">{Math.floor(stats.total_deuterium).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CONFIGURATION SERVEUR - NOUVEAU DESIGN */}
              <Card className="col-span-full bg-gradient-to-br from-slate-950 to-indigo-950/20 border-indigo-500/30 overflow-hidden">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-2 text-indigo-300">
                    <Settings size={18} />
                    Configuration Serveur (Éditable)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {loadingConfig || !config ? (
                    <div className="text-center py-12 text-slate-500">
                      <Settings size={48} className="mx-auto mb-4 opacity-20 animate-spin" />
                      <p className="text-sm">Chargement de la configuration...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">

                      {/* SECTION 1: MULTIPLICATEURS DE VITESSE */}
                      <Card className="bg-slate-900/40 border-indigo-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                            <Zap size={14} />
                            Multiplicateurs de Vitesse
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <ConfigInput
                              label="Speed Factor"
                              configKey="speed_factor"
                              value={editedConfig['speed_factor'] ?? config['speed_factor'] ?? '500.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, speed_factor: v})}
                              color="indigo"
                              description="Multiplicateur vitesse général"
                            />
                            <ConfigInput
                              label="Construction Speed"
                              configKey="construction_speed_multiplier"
                              value={editedConfig['construction_speed_multiplier'] ?? config['construction_speed_multiplier'] ?? '1.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, construction_speed_multiplier: v})}
                              color="purple"
                              description="Vitesse construction bâtiments"
                            />
                            <ConfigInput
                              label="Mining Speed"
                              configKey="mining_speed_multiplier"
                              value={editedConfig['mining_speed_multiplier'] ?? config['mining_speed_multiplier'] ?? '1.0'}
                              onChange={(v) => setEditedConfig({...editedConfig, mining_speed_multiplier: v})}
                              color="green"
                              description="Vitesse production ressources"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* SECTION 2: COÛTS DES VAISSEAUX */}
                      <Card className="bg-slate-900/40 border-cyan-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                            <Rocket size={14} />
                            Coûts des Vaisseaux
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {[
                              { ship: 'light_hunter', label: 'Chasseur Léger' },
                              { ship: 'cruiser', label: 'Croiseur' },
                              { ship: 'transporter', label: 'Transporteur' },
                              { ship: 'recycler', label: 'Recycleur' },
                              { ship: 'spy_probe', label: 'Sonde Espionnage' },
                              { ship: 'colony_ship', label: 'Vaisseau de Colonisation' }
                            ].map(({ ship, label }) => (
                              <div key={ship} className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                                <h4 className="text-xs font-bold text-cyan-300 mb-3">{label}</h4>
                                <div className="grid grid-cols-2 gap-3">
                                  <ConfigInput
                                    label="Métal"
                                    configKey={`ship_${ship}_metal`}
                                    value={editedConfig[`ship_${ship}_metal`] ?? config[`ship_${ship}_metal`] ?? '0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, [`ship_${ship}_metal`]: v})}
                                    color="orange"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Cristal"
                                    configKey={`ship_${ship}_crystal`}
                                    value={editedConfig[`ship_${ship}_crystal`] ?? config[`ship_${ship}_crystal`] ?? '0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, [`ship_${ship}_crystal`]: v})}
                                    color="cyan"
                                    compact
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* SECTION 3: COÛTS DES DÉFENSES */}
                      <Card className="bg-slate-900/40 border-red-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-2">
                            <Shield size={14} />
                            Coûts des Défenses
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {[
                              { defense: 'missile_launcher', label: 'Lanceur de Missiles' },
                              { defense: 'plasma_turret', label: 'Tourelle Plasma' }
                            ].map(({ defense, label }) => (
                              <div key={defense} className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                                <h4 className="text-xs font-bold text-red-300 mb-3">{label}</h4>
                                <div className="grid grid-cols-2 gap-3">
                                  <ConfigInput
                                    label="Métal"
                                    configKey={`defense_${defense}_metal`}
                                    value={editedConfig[`defense_${defense}_metal`] ?? config[`defense_${defense}_metal`] ?? '0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, [`defense_${defense}_metal`]: v})}
                                    color="orange"
                                    compact
                                  />
                                  <ConfigInput
                                    label="Cristal"
                                    configKey={`defense_${defense}_crystal`}
                                    value={editedConfig[`defense_${defense}_crystal`] ?? config[`defense_${defense}_crystal`] ?? '0'}
                                    onChange={(v) => setEditedConfig({...editedConfig, [`defense_${defense}_crystal`]: v})}
                                    color="cyan"
                                    compact
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* SECTION 4: FACTEURS DE PRODUCTION */}
                      <Card className="bg-slate-900/40 border-green-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-green-400 flex items-center gap-2">
                            <TrendingUp size={14} />
                            Facteurs de Production
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                              <h4 className="text-xs font-bold text-green-300 mb-3">Production de Base</h4>
                              <div className="grid grid-cols-3 gap-3">
                                <ConfigInput
                                  label="Métal Base"
                                  configKey="production_metal_base"
                                  value={editedConfig['production_metal_base'] ?? config['production_metal_base'] ?? '30.0'}
                                  onChange={(v) => setEditedConfig({...editedConfig, production_metal_base: v})}
                                  color="orange"
                                  compact
                                />
                                <ConfigInput
                                  label="Cristal Base"
                                  configKey="production_crystal_base"
                                  value={editedConfig['production_crystal_base'] ?? config['production_crystal_base'] ?? '20.0'}
                                  onChange={(v) => setEditedConfig({...editedConfig, production_crystal_base: v})}
                                  color="cyan"
                                  compact
                                />
                                <ConfigInput
                                  label="Deutérium Base"
                                  configKey="production_deuterium_base"
                                  value={editedConfig['production_deuterium_base'] ?? config['production_deuterium_base'] ?? '10.0'}
                                  onChange={(v) => setEditedConfig({...editedConfig, production_deuterium_base: v})}
                                  color="green"
                                  compact
                                />
                              </div>
                            </div>
                            <div className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                              <h4 className="text-xs font-bold text-green-300 mb-3">Facteurs de Croissance</h4>
                              <div className="grid grid-cols-3 gap-3">
                                <ConfigInput
                                  label="Croissance Métal"
                                  configKey="production_metal_growth"
                                  value={editedConfig['production_metal_growth'] ?? config['production_metal_growth'] ?? '1.1'}
                                  onChange={(v) => setEditedConfig({...editedConfig, production_metal_growth: v})}
                                  color="orange"
                                  compact
                                  step="0.01"
                                />
                                <ConfigInput
                                  label="Croissance Cristal"
                                  configKey="production_crystal_growth"
                                  value={editedConfig['production_crystal_growth'] ?? config['production_crystal_growth'] ?? '1.1'}
                                  onChange={(v) => setEditedConfig({...editedConfig, production_crystal_growth: v})}
                                  color="cyan"
                                  compact
                                  step="0.01"
                                />
                                <ConfigInput
                                  label="Croissance Deutérium"
                                  configKey="production_deuterium_growth"
                                  value={editedConfig['production_deuterium_growth'] ?? config['production_deuterium_growth'] ?? '1.05'}
                                  onChange={(v) => setEditedConfig({...editedConfig, production_deuterium_growth: v})}
                                  color="green"
                                  compact
                                  step="0.01"
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* SECTION 5: FACTEURS ÉNERGÉTIQUES */}
                      <Card className="bg-slate-900/40 border-yellow-500/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-black uppercase tracking-wider text-yellow-400 flex items-center gap-2">
                            <Zap size={14} />
                            Facteurs Énergétiques
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                              <h4 className="text-xs font-bold text-yellow-300 mb-3">Centrale Solaire</h4>
                              <div className="grid grid-cols-3 gap-3">
                                <ConfigInput
                                  label="Production Base"
                                  configKey="energy_solar_base"
                                  value={editedConfig['energy_solar_base'] ?? config['energy_solar_base'] ?? '60.0'}
                                  onChange={(v) => setEditedConfig({...editedConfig, energy_solar_base: v})}
                                  color="yellow"
                                  compact
                                />
                                <ConfigInput
                                  label="Croissance"
                                  configKey="energy_solar_growth"
                                  value={editedConfig['energy_solar_growth'] ?? config['energy_solar_growth'] ?? '1.1'}
                                  onChange={(v) => setEditedConfig({...editedConfig, energy_solar_growth: v})}
                                  color="yellow"
                                  compact
                                  step="0.01"
                                />
                                <ConfigInput
                                  label="Bonus Tech (%)"
                                  configKey="energy_tech_bonus"
                                  value={editedConfig['energy_tech_bonus'] ?? config['energy_tech_bonus'] ?? '0.10'}
                                  onChange={(v) => setEditedConfig({...editedConfig, energy_tech_bonus: v})}
                                  color="yellow"
                                  compact
                                  step="0.01"
                                />
                              </div>
                            </div>
                            <div className="bg-slate-950/50 border border-white/5 rounded-lg p-4">
                              <h4 className="text-xs font-bold text-yellow-300 mb-3">Consommation des Mines</h4>
                              <div className="grid grid-cols-3 gap-3">
                                <ConfigInput
                                  label="Consommation Base"
                                  configKey="energy_mine_consumption_base"
                                  value={editedConfig['energy_mine_consumption_base'] ?? config['energy_mine_consumption_base'] ?? '10.0'}
                                  onChange={(v) => setEditedConfig({...editedConfig, energy_mine_consumption_base: v})}
                                  color="orange"
                                  compact
                                />
                                <ConfigInput
                                  label="Croissance Conso."
                                  configKey="energy_mine_consumption_growth"
                                  value={editedConfig['energy_mine_consumption_growth'] ?? config['energy_mine_consumption_growth'] ?? '1.1'}
                                  onChange={(v) => setEditedConfig({...editedConfig, energy_mine_consumption_growth: v})}
                                  color="orange"
                                  compact
                                  step="0.01"
                                />
                                <ConfigInput
                                  label="Extra Deutérium"
                                  configKey="energy_deuterium_extra_consumption"
                                  value={editedConfig['energy_deuterium_extra_consumption'] ?? config['energy_deuterium_extra_consumption'] ?? '20.0'}
                                  onChange={(v) => setEditedConfig({...editedConfig, energy_deuterium_extra_consumption: v})}
                                  color="green"
                                  compact
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

                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-300 flex items-start gap-3">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold mb-1">⚠️ ATTENTION - Modifications en temps réel</p>
                          <p className="text-yellow-400/80">Les modifications prennent effet immédiatement pour toutes les opérations futures. Les opérations en cours conservent leur vitesse d'origine. Assurez-vous de bien tester les nouvelles valeurs.</p>
                        </div>
                      </div>
                    </div>
                  )}
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

      {activeTab === 'players' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des joueurs */}
        <Card className="lg:col-span-1 bg-slate-950 border-white/10">
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

            <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
              {filteredPlayers.map(player => (
                <div key={player.id} className="bg-slate-900/50 border border-white/5 rounded-lg overflow-hidden">
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
        <Card className="lg:col-span-2 bg-slate-950 border-white/10">
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
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold uppercase tracking-wider"
                  >
                    <Save size={16} className="mr-2" />
                    Enregistrer les modifications
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditedData(planetData)}
                    className="border-white/10 bg-white/5 hover:bg-white/10"
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

      {/* ONGLET GESTION UTILISATEURS */}
      {activeTab === 'users' && (
        <Card className="bg-gradient-to-br from-slate-950 to-indigo-950/20 border-indigo-500/30">
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
                    className="bg-slate-900/40 border border-white/10 rounded-lg p-4 hover:bg-slate-900/60 transition-colors"
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

// Composant helper pour les inputs de configuration
interface ConfigInputProps {
  label: string;
  configKey: string;
  value: string;
  onChange: (value: string) => void;
  color: 'indigo' | 'purple' | 'green' | 'cyan' | 'orange' | 'red' | 'yellow';
  description?: string;
  compact?: boolean;
  step?: string;
}

function ConfigInput({ label, value, onChange, color, description, compact, step = "0.1" }: ConfigInputProps) {
  const colorClasses = {
    indigo: 'bg-indigo-950/20 border-indigo-500/30 text-indigo-400',
    purple: 'bg-purple-950/20 border-purple-500/30 text-purple-400',
    green: 'bg-green-950/20 border-green-500/30 text-green-400',
    cyan: 'bg-cyan-950/20 border-cyan-500/30 text-cyan-400',
    orange: 'bg-orange-950/20 border-orange-500/30 text-orange-400',
    red: 'bg-red-950/20 border-red-500/30 text-red-400',
    yellow: 'bg-yellow-950/20 border-yellow-500/30 text-yellow-400',
  };

  const inputColorClasses = {
    indigo: 'border-indigo-500/30 focus:border-indigo-500',
    purple: 'border-purple-500/30 focus:border-purple-500',
    green: 'border-green-500/30 focus:border-green-500',
    cyan: 'border-cyan-500/30 focus:border-cyan-500',
    orange: 'border-orange-500/30 focus:border-orange-500',
    red: 'border-red-500/30 focus:border-red-500',
    yellow: 'border-yellow-500/30 focus:border-yellow-500',
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-${compact ? '3' : '4'}`}>
      <label className={`text-${compact ? '[10px]' : 'xs'} ${colorClasses[color].split(' ')[2]} font-bold mb-2 block uppercase tracking-wider`}>
        {label}
      </label>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`bg-black/40 ${inputColorClasses[color]} text-white font-mono ${compact ? 'text-sm' : 'text-lg'} transition-all`}
      />
      {description && !compact && (
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      )}
    </div>
  );
}