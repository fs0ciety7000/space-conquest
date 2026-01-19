import { useState, useEffect } from 'react';
import { Search, Edit, Save, X, AlertTriangle, Database, Users, Zap, BarChart3, Settings } from 'lucide-react';
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
        body: JSON.stringify(editedConfig)
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

              <Card className="col-span-full bg-slate-950 border-white/10">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Settings size={16} />
                    Paramètres Serveur (Éditable)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingConfig || !config ? (
                    <div className="text-center py-8 text-slate-500">Chargement...</div>
                  ) : (
                    <div className="space-y-4">
                      {/* Affichage des valeurs actuelles */}
                      <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
                        <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">Valeurs actives actuelles</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-black font-mono text-indigo-400">{config.speed_factor}</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Speed Factor</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-black font-mono text-purple-400">{config.construction_speed_multiplier}</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Construction Speed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-black font-mono text-green-400">{config.mining_speed_multiplier}</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Mining Speed</div>
                          </div>
                        </div>
                      </div>

                      {/* Champs d'édition */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-lg p-4">
                          <label className="text-xs text-indigo-400 font-bold mb-2 block">SPEED FACTOR</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={editedConfig.speed_factor ?? config.speed_factor}
                            onChange={(e) => setEditedConfig({...editedConfig, speed_factor: e.target.value})}
                            className="bg-black/40 border-indigo-500/30 text-white font-mono text-xl"
                          />
                          <p className="text-xs text-slate-500 mt-1">Multiplicateur vitesse général</p>
                        </div>

                        <div className="bg-purple-950/20 border border-purple-500/30 rounded-lg p-4">
                          <label className="text-xs text-purple-400 font-bold mb-2 block">CONSTRUCTION SPEED</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={editedConfig.construction_speed_multiplier ?? config.construction_speed_multiplier}
                            onChange={(e) => setEditedConfig({...editedConfig, construction_speed_multiplier: e.target.value})}
                            className="bg-black/40 border-purple-500/30 text-white font-mono text-xl"
                          />
                          <p className="text-xs text-slate-500 mt-1">Vitesse construction bâtiments</p>
                        </div>

                        <div className="bg-green-950/20 border border-green-500/30 rounded-lg p-4">
                          <label className="text-xs text-green-400 font-bold mb-2 block">MINING SPEED</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={editedConfig.mining_speed_multiplier ?? config.mining_speed_multiplier}
                            onChange={(e) => setEditedConfig({...editedConfig, mining_speed_multiplier: e.target.value})}
                            className="bg-black/40 border-green-500/30 text-white font-mono text-xl"
                          />
                          <p className="text-xs text-slate-500 mt-1">Vitesse production ressources</p>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          onClick={updateConfig}
                          disabled={loadingConfig}
                          className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold uppercase tracking-wider"
                        >
                          <Save size={16} className="mr-2" />
                          Enregistrer les modifications
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditedConfig(config)}
                          className="border-white/10 bg-white/5 hover:bg-white/10"
                        >
                          Annuler
                        </Button>
                      </div>

                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400 flex items-start gap-2">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>⚠️ Les modifications prennent effet immédiatement pour toutes les opérations futures. Les opérations en cours conservent leur vitesse d'origine.</span>
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
    </div>
  );
}