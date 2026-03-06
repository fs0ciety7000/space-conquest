import { useState, useEffect } from 'react';
import { Rocket, Building2, Shield, Star, Plus, Edit, Trash2, Save, X, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiUrl } from '@/config/api';
import { formatDuration } from '@/lib/utils';

type ContentType = 'ships' | 'buildings' | 'defenses' | 'flagship_modules';

interface ShipType {
  id: number;
  ship_key: string;
  display_name: string;
  category: string;
  cost_metal: number;
  cost_crystal: number;
  cost_deuterium: number;
  build_time_seconds: number;
  attack: number;
  shield: number;
  hull: number;
  cargo_capacity: number;
  base_speed: number;
  fuel_consumption: number;
  shipyard_required: number;
  description?: string;
}

interface BuildingType {
  id: number;
  building_key: string;
  name: string;
  category: string;
  base_cost_metal: number;
  base_cost_crystal: number;
  base_cost_deuterium: number;
  base_time_seconds: number;
  cost_multiplier: number;
  description?: string;
}

interface DefenseType {
  id: number;
  defense_key: string;
  name: string;
  category: string;
  base_cost_metal: number;
  base_cost_crystal: number;
  base_cost_deuterium: number;
  build_time_seconds: number;
  attack: number;
  shield: number;
  hull: number;
  description?: string;
}

interface FlagshipModuleType {
  id: string;
  module_key: string;
  display_name: string;
  description?: string;
  slot_type: string;
  bonus_attack: number;
  bonus_shield: number;
  bonus_hull: number;
  bonus_cargo: number;
  bonus_speed_pct: number;
  cost_metal: number;
  cost_crystal: number;
  cost_deuterium: number;
  required_flagship_level: number;
}

interface Technology {
  id: number;
  tech_key: string;
  name: string;
  category: string;
}

interface Requirement {
  id: number;
  required_tech_id?: number;
  required_building_id?: number;
  required_level: number;
}

export default function AdminContentManager() {
  const [activeTab, setActiveTab] = useState<ContentType>('ships');
  const [ships, setShips] = useState<ShipType[]>([]);
  const [buildings, setBuildings] = useState<BuildingType[]>([]);
  const [defenses, setDefenses] = useState<DefenseType[]>([]);
  const [flagshipModules, setFlagshipModules] = useState<FlagshipModuleType[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);

  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadData();
    loadTechnologies();
  }, [activeTab]);

  const loadData = async () => {
    try {
      const endpoint = activeTab === 'ships' ? '/admin/ships' :
                      activeTab === 'buildings' ? '/admin/buildings' :
                      activeTab === 'defenses' ? '/admin/defenses' :
                      '/admin/flagship-modules';

      const res = await fetch(apiUrl(endpoint));
      const data = await res.json();

      if (activeTab === 'ships') setShips(data.ships || []);
      else if (activeTab === 'buildings') setBuildings(data.buildings || []);
      else if (activeTab === 'defenses') setDefenses(data.defenses || []);
      else setFlagshipModules(data.modules || []);
    } catch (error) {
      toast.error('Erreur de chargement');
    }
  };

  const loadTechnologies = async () => {
    try {
      const res = await fetch(apiUrl('/admin/technologies'));
      const data = await res.json();
      setTechnologies(data.technologies || []);
    } catch (error) {
      console.error('Failed to load technologies', error);
    }
  };

  const handleCreate = async () => {
    try {
      const endpoint = activeTab === 'ships' ? '/admin/ships' :
                      activeTab === 'buildings' ? '/admin/buildings' :
                      activeTab === 'defenses' ? '/admin/defenses' :
                      '/admin/flagship-modules';

      const res = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(`${activeTab} créé avec succès`);
        setShowCreateForm(false);
        setFormData({});
        loadData();
      } else {
        toast.error('Erreur de création');
      }
    } catch (error) {
      toast.error('Erreur de création');
    }
  };

  const handleUpdate = async (id: number | string) => {
    try {
      const endpoint = `${activeTab === 'ships' ? '/admin/ships' :
                        activeTab === 'buildings' ? '/admin/buildings' :
                        activeTab === 'defenses' ? '/admin/defenses' :
                        '/admin/flagship-modules'}/${id}`;

      const res = await fetch(apiUrl(endpoint), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(`${activeTab} modifié avec succès`);
        setEditingId(null);
        setFormData({});
        loadData();
      } else {
        toast.error('Erreur de modification');
      }
    } catch (error) {
      toast.error('Erreur de modification');
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;

    try {
      const endpoint = `${activeTab === 'ships' ? '/admin/ships' :
                        activeTab === 'buildings' ? '/admin/buildings' :
                        activeTab === 'defenses' ? '/admin/defenses' :
                        '/admin/flagship-modules'}/${id}`;

      const res = await fetch(apiUrl(endpoint), { method: 'DELETE' });

      if (res.ok) {
        toast.success(`${activeTab} supprimé avec succès`);
        loadData();
      } else {
        toast.error('Erreur de suppression');
      }
    } catch (error) {
      toast.error('Erreur de suppression');
    }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      ship_key: item.ship_key || item.defense_key || item.building_key,
      name: item.display_name || item.name,
      category: item.category,
      cost_metal: activeTab === 'ships' ? item.cost_metal : item.base_cost_metal,
      cost_crystal: activeTab === 'ships' ? item.cost_crystal : item.base_cost_crystal,
      cost_deuterium: activeTab === 'ships' ? item.cost_deuterium : item.base_cost_deuterium,
      build_time_seconds: activeTab === 'ships' ? item.build_time_seconds : item.base_time_seconds,
      ...(activeTab === 'ships' && {
        attack: item.attack,
        shield: item.shield,
        hull: item.hull,
        cargo_capacity: item.cargo_capacity,
        base_speed: item.base_speed,
        fuel_consumption: item.fuel_consumption,
        shipyard_required: item.shipyard_required,
      }),
      ...(activeTab === 'buildings' && {
        cost_multiplier: item.cost_multiplier,
      }),
      ...(activeTab === 'defenses' && {
        attack: item.attack,
        shield: item.shield,
        hull: item.hull,
      }),
      description: item.description,
    });
  };

  const renderShipsTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-amber-500/30">
          <tr className="text-left">
            <th className="p-2">Key</th>
            <th className="p-2">Nom</th>
            <th className="p-2">Catégorie</th>
            <th className="p-2">Coûts (M/C/D)</th>
            <th className="p-2">Combat (A/S/H)</th>
            <th className="p-2">Vitesse</th>
            <th className="p-2">Cargo</th>
            <th className="p-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {ships.map((ship) => (
            <tr key={ship.id} className="border-b border-gray-700 hover:bg-gray-800/50">
              {editingId === ship.id ? (
                <td colSpan={8} className="p-4">
                  <ShipEditForm
                    data={formData}
                    onChange={setFormData}
                    onSave={() => handleUpdate(ship.id)}
                    onCancel={() => { setEditingId(null); setFormData({}); }}
                  />
                </td>
              ) : (
                <>
                  <td className="p-2 font-mono text-xs text-cyan-400">{ship.ship_key}</td>
                  <td className="p-2 font-medium">{ship.display_name}</td>
                  <td className="p-2">{ship.category}</td>
                  <td className="p-2 text-xs">
                    <span className="text-blue-400">{ship.cost_metal}</span>/
                    <span className="text-purple-400">{ship.cost_crystal}</span>/
                    <span className="text-green-400">{ship.cost_deuterium}</span>
                  </td>
                  <td className="p-2 text-xs">
                    <span className="text-red-400">{ship.attack}</span>/
                    <span className="text-cyan-400">{ship.shield}</span>/
                    <span className="text-orange-400">{ship.hull}</span>
                  </td>
                  <td className="p-2 text-xs">{ship.base_speed}</td>
                  <td className="p-2 text-xs">{ship.cargo_capacity}</td>
                  <td className="p-2 text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(ship)}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(ship.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderBuildingsTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-amber-500/30">
          <tr className="text-left">
            <th className="p-2">Key</th>
            <th className="p-2">Nom</th>
            <th className="p-2">Catégorie</th>
            <th className="p-2">Coûts base (M/C/D)</th>
            <th className="p-2">Multiplicateur</th>
            <th className="p-2">Temps (s)</th>
            <th className="p-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {buildings.map((building) => (
            <tr key={building.id} className="border-b border-gray-700 hover:bg-gray-800/50">
              {editingId === building.id ? (
                <td colSpan={7} className="p-4">
                  <BuildingEditForm
                    data={formData}
                    onChange={setFormData}
                    onSave={() => handleUpdate(building.id)}
                    onCancel={() => { setEditingId(null); setFormData({}); }}
                  />
                </td>
              ) : (
                <>
                  <td className="p-2 font-mono text-xs text-cyan-400">{building.building_key}</td>
                  <td className="p-2 font-medium">{building.name}</td>
                  <td className="p-2">{building.category}</td>
                  <td className="p-2 text-xs">
                    <span className="text-blue-400">{building.base_cost_metal}</span>/
                    <span className="text-purple-400">{building.base_cost_crystal}</span>/
                    <span className="text-green-400">{building.base_cost_deuterium}</span>
                  </td>
                  <td className="p-2">×{building.cost_multiplier}</td>
                  <td className="p-2 text-xs">{formatDuration(building.base_time_seconds)}</td>
                  <td className="p-2 text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(building)}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(building.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderDefensesTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-amber-500/30">
          <tr className="text-left">
            <th className="p-2">Key</th>
            <th className="p-2">Nom</th>
            <th className="p-2">Catégorie</th>
            <th className="p-2">Coûts (M/C/D)</th>
            <th className="p-2">Combat (A/S/H)</th>
            <th className="p-2">Temps (s)</th>
            <th className="p-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {defenses.map((defense) => (
            <tr key={defense.id} className="border-b border-gray-700 hover:bg-gray-800/50">
              {editingId === defense.id ? (
                <td colSpan={7} className="p-4">
                  <DefenseEditForm
                    data={formData}
                    onChange={setFormData}
                    onSave={() => handleUpdate(defense.id)}
                    onCancel={() => { setEditingId(null); setFormData({}); }}
                  />
                </td>
              ) : (
                <>
                  <td className="p-2 font-mono text-xs text-cyan-400">{defense.defense_key}</td>
                  <td className="p-2 font-medium">{defense.name}</td>
                  <td className="p-2">{defense.category}</td>
                  <td className="p-2 text-xs">
                    <span className="text-blue-400">{defense.base_cost_metal}</span>/
                    <span className="text-purple-400">{defense.base_cost_crystal}</span>/
                    <span className="text-green-400">{defense.base_cost_deuterium}</span>
                  </td>
                  <td className="p-2 text-xs">
                    <span className="text-red-400">{defense.attack}</span>/
                    <span className="text-cyan-400">{defense.shield}</span>/
                    <span className="text-orange-400">{defense.hull}</span>
                  </td>
                  <td className="p-2 text-xs">{formatDuration(defense.build_time_seconds)}</td>
                  <td className="p-2 text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(defense)}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(defense.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderFlagshipModulesTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-amber-500/30">
          <tr className="text-left">
            <th className="p-2">Key</th>
            <th className="p-2">Nom</th>
            <th className="p-2">Slot</th>
            <th className="p-2">Bonus (A/S/H/C)</th>
            <th className="p-2">Vitesse %</th>
            <th className="p-2">Coûts (M/C/D)</th>
            <th className="p-2">Niv. requis</th>
            <th className="p-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {flagshipModules.map((mod) => (
            <tr key={mod.id} className="border-b border-gray-700 hover:bg-gray-800/50">
              {editingId === mod.id ? (
                <td colSpan={8} className="p-4">
                  <FlagshipModuleForm
                    data={formData}
                    onChange={setFormData}
                    onSave={() => handleUpdate(mod.id)}
                    onCancel={() => { setEditingId(null); setFormData({}); }}
                  />
                </td>
              ) : (
                <>
                  <td className="p-2 font-mono text-xs text-cyan-400">{mod.module_key}</td>
                  <td className="p-2 font-medium">{mod.display_name}</td>
                  <td className="p-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      mod.slot_type === 'weapon' ? 'bg-red-900/50 text-red-300' :
                      mod.slot_type === 'shield' ? 'bg-cyan-900/50 text-cyan-300' :
                      mod.slot_type === 'engine' ? 'bg-green-900/50 text-green-300' :
                      mod.slot_type === 'utility' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-purple-900/50 text-purple-300'
                    }`}>{mod.slot_type}</span>
                  </td>
                  <td className="p-2 text-xs">
                    <span className="text-red-400">{mod.bonus_attack}</span>/
                    <span className="text-cyan-400">{mod.bonus_shield}</span>/
                    <span className="text-orange-400">{mod.bonus_hull}</span>/
                    <span className="text-yellow-400">{mod.bonus_cargo}</span>
                  </td>
                  <td className="p-2 text-xs text-green-400">{mod.bonus_speed_pct > 0 ? `+${mod.bonus_speed_pct}%` : '—'}</td>
                  <td className="p-2 text-xs">
                    <span className="text-blue-400">{mod.cost_metal.toLocaleString()}</span>/
                    <span className="text-purple-400">{mod.cost_crystal.toLocaleString()}</span>/
                    <span className="text-green-400">{mod.cost_deuterium.toLocaleString()}</span>
                  </td>
                  <td className="p-2 text-xs">Niv. {mod.required_flagship_level}</td>
                  <td className="p-2 text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingId(mod.id);
                      setFormData({ ...mod });
                    }}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(mod.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'ships' ? 'default' : 'outline'}
          onClick={() => setActiveTab('ships')}
          className={
            activeTab === 'ships'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600'
              : ''
          }
        >
          <Rocket className="w-4 h-4 mr-2" />
          Vaisseaux
        </Button>
        <Button
          variant={activeTab === 'buildings' ? 'default' : 'outline'}
          onClick={() => setActiveTab('buildings')}
          className={
            activeTab === 'buildings'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600'
              : ''
          }
        >
          <Building2 className="w-4 h-4 mr-2" />
          Bâtiments
        </Button>
        <Button
          variant={activeTab === 'defenses' ? 'default' : 'outline'}
          onClick={() => setActiveTab('defenses')}
          className={
            activeTab === 'defenses'
              ? 'bg-gradient-to-r from-red-600 to-rose-600'
              : ''
          }
        >
          <Shield className="w-4 h-4 mr-2" />
          Défenses
        </Button>
        <Button
          variant={activeTab === 'flagship_modules' ? 'default' : 'outline'}
          onClick={() => setActiveTab('flagship_modules')}
          className={
            activeTab === 'flagship_modules'
              ? 'bg-gradient-to-r from-yellow-600 to-amber-600'
              : ''
          }
        >
          <Star className="w-4 h-4 mr-2" />
          Modules Vaisseau Amiral
        </Button>
      </div>

      <Card className="border-amber-500/30 bg-gradient-to-br from-gray-900 to-gray-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
              {activeTab === 'ships' ? 'Gestion des Vaisseaux' :
               activeTab === 'buildings' ? 'Gestion des Bâtiments' :
               activeTab === 'defenses' ? 'Gestion des Défenses' :
               'Modules Vaisseau Amiral'}
            </CardTitle>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCreateForm ? (
            <div className="mb-6 p-4 border border-amber-500/30 rounded-lg bg-gray-800/50">
              {activeTab === 'ships' && (
                <ShipCreateForm
                  data={formData}
                  onChange={setFormData}
                  onSave={handleCreate}
                  onCancel={() => { setShowCreateForm(false); setFormData({}); }}
                />
              )}
              {activeTab === 'buildings' && (
                <BuildingCreateForm
                  data={formData}
                  onChange={setFormData}
                  onSave={handleCreate}
                  onCancel={() => { setShowCreateForm(false); setFormData({}); }}
                />
              )}
              {activeTab === 'defenses' && (
                <DefenseCreateForm
                  data={formData}
                  onChange={setFormData}
                  onSave={handleCreate}
                  onCancel={() => { setShowCreateForm(false); setFormData({}); }}
                />
              )}
              {activeTab === 'flagship_modules' && (
                <FlagshipModuleForm
                  data={formData}
                  onChange={setFormData}
                  onSave={handleCreate}
                  onCancel={() => { setShowCreateForm(false); setFormData({}); }}
                />
              )}
            </div>
          ) : null}

          {activeTab === 'ships' && renderShipsTable()}
          {activeTab === 'buildings' && renderBuildingsTable()}
          {activeTab === 'defenses' && renderDefensesTable()}
          {activeTab === 'flagship_modules' && renderFlagshipModulesTable()}
        </CardContent>
      </Card>
    </div>
  );
}

// Form Components
function ShipCreateForm({ data, onChange, onSave, onCancel }: any) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm">Ship Key (unique)</label>
        <Input value={data.ship_key || ''} onChange={e => onChange({ ...data, ship_key: e.target.value })} />
      </div>
      <div>
        <label className="text-sm">Nom</label>
        <Input value={data.name || ''} onChange={e => onChange({ ...data, name: e.target.value })} />
      </div>
      <div>
        <label className="text-sm">Catégorie</label>
        <Input value={data.category || ''} onChange={e => onChange({ ...data, category: e.target.value })} placeholder="combat, utility, defense" />
      </div>
      <div>
        <label className="text-sm">Coût Métal</label>
        <Input type="number" value={data.cost_metal || 0} onChange={e => onChange({ ...data, cost_metal: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Coût Cristal</label>
        <Input type="number" value={data.cost_crystal || 0} onChange={e => onChange({ ...data, cost_crystal: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Coût Deutérium</label>
        <Input type="number" value={data.cost_deuterium || 0} onChange={e => onChange({ ...data, cost_deuterium: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Temps (secondes)</label>
        <Input type="number" value={data.build_time_seconds || 0} onChange={e => onChange({ ...data, build_time_seconds: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Attaque</label>
        <Input type="number" value={data.attack || 0} onChange={e => onChange({ ...data, attack: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Bouclier</label>
        <Input type="number" value={data.shield || 0} onChange={e => onChange({ ...data, shield: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Coque</label>
        <Input type="number" value={data.hull || 0} onChange={e => onChange({ ...data, hull: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Capacité Cargo</label>
        <Input type="number" value={data.cargo_capacity || 0} onChange={e => onChange({ ...data, cargo_capacity: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Vitesse</label>
        <Input type="number" value={data.base_speed || 0} onChange={e => onChange({ ...data, base_speed: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Consommation Carburant</label>
        <Input type="number" value={data.fuel_consumption || 0} onChange={e => onChange({ ...data, fuel_consumption: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Chantier Requis (niveau)</label>
        <Input type="number" value={data.shipyard_required || 0} onChange={e => onChange({ ...data, shipyard_required: Number(e.target.value) })} />
      </div>
      <div className="col-span-2">
        <label className="text-sm">Description</label>
        <Input value={data.description || ''} onChange={e => onChange({ ...data, description: e.target.value })} />
      </div>
      <div className="col-span-2 flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-2" />Annuler</Button>
        <Button onClick={onSave}><Save className="w-4 h-4 mr-2" />Créer</Button>
      </div>
    </div>
  );
}

function ShipEditForm({ data, onChange, onSave, onCancel }: any) {
  return <ShipCreateForm data={data} onChange={onChange} onSave={onSave} onCancel={onCancel} />;
}

function BuildingCreateForm({ data, onChange, onSave, onCancel }: any) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm">Building Key (unique)</label>
        <Input value={data.building_key || ''} onChange={e => onChange({ ...data, building_key: e.target.value })} />
      </div>
      <div>
        <label className="text-sm">Nom</label>
        <Input value={data.name || ''} onChange={e => onChange({ ...data, name: e.target.value })} />
      </div>
      <div>
        <label className="text-sm">Catégorie</label>
        <Input value={data.category || ''} onChange={e => onChange({ ...data, category: e.target.value })} placeholder="resource, facility, defense" />
      </div>
      <div>
        <label className="text-sm">Coût Base Métal</label>
        <Input type="number" value={data.base_cost_metal || 0} onChange={e => onChange({ ...data, base_cost_metal: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Coût Base Cristal</label>
        <Input type="number" value={data.base_cost_crystal || 0} onChange={e => onChange({ ...data, base_cost_crystal: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Coût Base Deutérium</label>
        <Input type="number" value={data.base_cost_deuterium || 0} onChange={e => onChange({ ...data, base_cost_deuterium: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Temps Base (secondes)</label>
        <Input type="number" value={data.base_time_seconds || 0} onChange={e => onChange({ ...data, base_time_seconds: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Multiplicateur Coût</label>
        <Input type="number" step="0.1" value={data.cost_multiplier || 1.5} onChange={e => onChange({ ...data, cost_multiplier: Number(e.target.value) })} />
      </div>
      <div className="col-span-2">
        <label className="text-sm">Description</label>
        <Input value={data.description || ''} onChange={e => onChange({ ...data, description: e.target.value })} />
      </div>
      <div className="col-span-2 flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-2" />Annuler</Button>
        <Button onClick={onSave}><Save className="w-4 h-4 mr-2" />Créer</Button>
      </div>
    </div>
  );
}

function BuildingEditForm({ data, onChange, onSave, onCancel }: any) {
  return <BuildingCreateForm data={data} onChange={onChange} onSave={onSave} onCancel={onCancel} />;
}

function DefenseCreateForm({ data, onChange, onSave, onCancel }: any) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm">Defense Key (unique)</label>
        <Input value={data.defense_key || ''} onChange={e => onChange({ ...data, defense_key: e.target.value })} />
      </div>
      <div>
        <label className="text-sm">Nom</label>
        <Input value={data.name || ''} onChange={e => onChange({ ...data, name: e.target.value })} />
      </div>
      <div>
        <label className="text-sm">Catégorie</label>
        <Input value={data.category || ''} onChange={e => onChange({ ...data, category: e.target.value })} placeholder="light, heavy, special" />
      </div>
      <div>
        <label className="text-sm">Coût Métal</label>
        <Input type="number" value={data.base_cost_metal || 0} onChange={e => onChange({ ...data, base_cost_metal: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Coût Cristal</label>
        <Input type="number" value={data.base_cost_crystal || 0} onChange={e => onChange({ ...data, base_cost_crystal: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Coût Deutérium</label>
        <Input type="number" value={data.base_cost_deuterium || 0} onChange={e => onChange({ ...data, base_cost_deuterium: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Temps (secondes)</label>
        <Input type="number" value={data.build_time_seconds || 0} onChange={e => onChange({ ...data, build_time_seconds: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Attaque</label>
        <Input type="number" value={data.attack || 0} onChange={e => onChange({ ...data, attack: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Bouclier</label>
        <Input type="number" value={data.shield || 0} onChange={e => onChange({ ...data, shield: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Coque</label>
        <Input type="number" value={data.hull || 0} onChange={e => onChange({ ...data, hull: Number(e.target.value) })} />
      </div>
      <div className="col-span-2">
        <label className="text-sm">Description</label>
        <Input value={data.description || ''} onChange={e => onChange({ ...data, description: e.target.value })} />
      </div>
      <div className="col-span-2 flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-2" />Annuler</Button>
        <Button onClick={onSave}><Save className="w-4 h-4 mr-2" />Créer</Button>
      </div>
    </div>
  );
}

function DefenseEditForm({ data, onChange, onSave, onCancel }: any) {
  return <DefenseCreateForm data={data} onChange={onChange} onSave={onSave} onCancel={onCancel} />;
}

function FlagshipModuleForm({ data, onChange, onSave, onCancel }: any) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm">Module Key (unique)</label>
        <Input value={data.module_key || ''} onChange={e => onChange({ ...data, module_key: e.target.value })} />
      </div>
      <div>
        <label className="text-sm">Nom affiché</label>
        <Input value={data.display_name || ''} onChange={e => onChange({ ...data, display_name: e.target.value })} />
      </div>
      <div>
        <label className="text-sm">Type de slot</label>
        <select
          value={data.slot_type || 'weapon'}
          onChange={e => onChange({ ...data, slot_type: e.target.value })}
          className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="weapon">weapon</option>
          <option value="shield">shield</option>
          <option value="engine">engine</option>
          <option value="utility">utility</option>
          <option value="special">special</option>
        </select>
      </div>
      <div>
        <label className="text-sm">Niveau vaisseau requis</label>
        <Input type="number" value={data.required_flagship_level ?? 1} onChange={e => onChange({ ...data, required_flagship_level: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Bonus Attaque</label>
        <Input type="number" value={data.bonus_attack ?? 0} onChange={e => onChange({ ...data, bonus_attack: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Bonus Bouclier</label>
        <Input type="number" value={data.bonus_shield ?? 0} onChange={e => onChange({ ...data, bonus_shield: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Bonus Coque</label>
        <Input type="number" value={data.bonus_hull ?? 0} onChange={e => onChange({ ...data, bonus_hull: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Bonus Cargo</label>
        <Input type="number" value={data.bonus_cargo ?? 0} onChange={e => onChange({ ...data, bonus_cargo: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Bonus Vitesse (%)</label>
        <Input type="number" step="0.1" value={data.bonus_speed_pct ?? 0} onChange={e => onChange({ ...data, bonus_speed_pct: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Coût Métal</label>
        <Input type="number" value={data.cost_metal ?? 0} onChange={e => onChange({ ...data, cost_metal: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Coût Cristal</label>
        <Input type="number" value={data.cost_crystal ?? 0} onChange={e => onChange({ ...data, cost_crystal: Number(e.target.value) })} />
      </div>
      <div>
        <label className="text-sm">Coût Deutérium</label>
        <Input type="number" value={data.cost_deuterium ?? 0} onChange={e => onChange({ ...data, cost_deuterium: Number(e.target.value) })} />
      </div>
      <div className="col-span-2">
        <label className="text-sm">Description</label>
        <Input value={data.description || ''} onChange={e => onChange({ ...data, description: e.target.value })} />
      </div>
      <div className="col-span-2 flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-2" />Annuler</Button>
        <Button onClick={onSave}><Save className="w-4 h-4 mr-2" />Sauvegarder</Button>
      </div>
    </div>
  );
}
