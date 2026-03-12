import { useState, useEffect } from "react";
import {
  Zap, Plus, Trash2, Edit3, Check, X, Rocket, Save, ChevronDown, ChevronUp, Info, Copy, MousePointerClick
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiUrl } from "@/config/api";

interface ShipType {
  ship_key: string;
  display_name: string;
  attack: number;
  shield: number;
  hull: number;
  cargo_capacity: number;
  current_count: number;
}

interface FleetPreset {
  id: string;
  name: string;
  composition: { [key: string]: number };
  created_at: string;
  updated_at: string;
}

interface FleetPresetsManagerProps {
  userId: string;
  planetId: string;
  onSelectPreset?: (preset: FleetPreset) => void;
}

export default function FleetPresetsManager({ userId, planetId, onSelectPreset }: FleetPresetsManagerProps) {
  const [presets, setPresets] = useState<FleetPreset[]>([]);
  const [shipTypes, setShipTypes] = useState<ShipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New preset state
  const [newName, setNewName] = useState("");
  const [newComposition, setNewComposition] = useState<{ [key: string]: number }>({});

  // Edit preset state
  const [editName, setEditName] = useState("");
  const [editComposition, setEditComposition] = useState<{ [key: string]: number }>({});
  const [expandedPresets, setExpandedPresets] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [presetsRes, shipsRes] = await Promise.all([
          fetch(apiUrl(`/users/${userId}/fleet-presets`)),
          fetch(apiUrl(`/planets/${planetId}/ship-types`), {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }),
        ]);
        if (presetsRes.ok) setPresets(await presetsRes.json());
        if (shipsRes.ok) {
          const data = await shipsRes.json();
          setShipTypes(data.ship_types || []);
        }
      } catch {
        toast.error("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId, planetId]);

  const toggleExpand = (id: string) => {
    setExpandedPresets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startCreate = () => {
    const initial: { [key: string]: number } = {};
    shipTypes.forEach(s => { initial[s.ship_key] = 0; });
    setNewComposition(initial);
    setNewName("");
    setCreating(true);
    setEditingId(null);
  };

  const cancelCreate = () => {
    setCreating(false);
    setNewName("");
    setNewComposition({});
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { toast.error("Nom requis"); return; }

    const composition = Object.entries(newComposition)
      .filter(([_, v]) => v > 0)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

    if (Object.keys(composition).length === 0) {
      toast.error("Sélectionnez au moins un vaisseau");
      return;
    }

    try {
      const res = await fetch(apiUrl(`/users/${userId}/fleet-presets`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, composition }),
      });
      if (res.ok) {
        const preset = await res.json();
        setPresets(prev => [...prev, preset]);
        toast.success(`Preset "${preset.name}" créé !`);
        cancelCreate();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur de création");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const startEdit = (preset: FleetPreset) => {
    setEditingId(preset.id);
    setEditName(preset.name);
    const comp: { [key: string]: number } = {};
    shipTypes.forEach(s => { comp[s.ship_key] = preset.composition[s.ship_key] || 0; });
    setEditComposition(comp);
    setCreating(false);
    setExpandedPresets(prev => new Set([...prev, preset.id]));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditComposition({});
  };

  const handleUpdate = async (presetId: string) => {
    const name = editName.trim();
    if (!name) { toast.error("Nom requis"); return; }

    const composition = Object.entries(editComposition)
      .filter(([_, v]) => v > 0)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

    if (Object.keys(composition).length === 0) {
      toast.error("Sélectionnez au moins un vaisseau");
      return;
    }

    try {
      const res = await fetch(apiUrl(`/users/${userId}/fleet-presets/${presetId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, composition }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPresets(prev => prev.map(p => p.id === presetId ? updated : p));
        toast.success(`Preset "${updated.name}" mis à jour !`);
        cancelEdit();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur de mise à jour");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const handleDelete = async (preset: FleetPreset) => {
    try {
      const res = await fetch(apiUrl(`/users/${userId}/fleet-presets/${preset.id}`), {
        method: 'DELETE',
      });
      if (res.ok) {
        setPresets(prev => prev.filter(p => p.id !== preset.id));
        toast.success(`Preset "${preset.name}" supprimé`);
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const handleDuplicate = async (preset: FleetPreset) => {
    if (presets.length >= 10) {
      toast.error("Limite de 10 presets atteinte");
      return;
    }
    const name = `${preset.name} (Copie)`.slice(0, 64);
    try {
      const res = await fetch(apiUrl(`/users/${userId}/fleet-presets`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, composition: preset.composition }),
      });
      if (res.ok) {
        const newPreset = await res.json();
        setPresets(prev => [...prev, newPreset]);
        toast.success(`Preset dupliqué : "${newPreset.name}"`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur de duplication");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const shipLabel = (key: string) =>
    shipTypes.find(s => s.ship_key === key)?.display_name || key;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-500" />
      </div>
    );
  }

  return (
    // TODO CLAUDE: Audit mobile complet — sur très petits écrans (< 375px), la grille des vaisseaux
    // peut déborder. Envisager un scroll horizontal ou un accordiéon par catégorie de vaisseau.
    <div className="w-full max-w-3xl mx-auto px-2 sm:px-6 py-4 sm:py-6 space-y-6">
        <div className="flex items-start sm:items-center justify-between gap-2 flex-col xs:flex-row sm:flex-row">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <Zap className="text-indigo-400" size={24} />
              Presets de Flotte
            </h1>
            <p className="text-xs text-slate-500 mt-1 hidden sm:block">
              Configurez des compositions réutilisables pour vos attaques — chargement en 1 clic depuis le modal d'attaque.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 shrink-0">
            <Info size={12} />
            {presets.length}/10 presets
          </div>
        </div>

      {/* Create new preset */}
      {!creating ? (
        <Button
          onClick={startCreate}
          disabled={presets.length >= 10}
          className="w-full bg-indigo-950/50 border border-indigo-800/40 hover:bg-indigo-900/40 text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-40"
        >
          <Plus size={16} />
          Créer un nouveau preset
        </Button>
      ) : (
        <Card className="bg-indigo-950/30 border border-indigo-700/50">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-black uppercase tracking-widest">
              <Plus size={14} /> Nouveau preset
            </div>

            <Input
              value={newName}
              onChange={e => setNewName(e.target.value.slice(0, 64))}
              placeholder="Nom du preset (ex: Raid rapide, Armada lourde...)"
              className="bg-slate-950 border-indigo-900/50 text-white"
              autoFocus
            />

            <ShipCompositionEditor
              shipTypes={shipTypes}
              composition={newComposition}
              onChange={setNewComposition}
            />

            <div className="flex gap-3 pt-2">
              <Button onClick={cancelCreate} className="flex-1 bg-transparent border border-white/10 hover:bg-white/5 text-slate-400">
                Annuler
              </Button>
              <Button onClick={handleCreate} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black flex items-center gap-2">
                <Save size={14} /> Créer le preset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preset list */}
      {presets.length === 0 && !creating && (
        <div className="text-center py-16 text-slate-600">
          <Zap size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold">Aucun preset configuré</p>
          <p className="text-xs mt-1">Créez vos premières compositions pour attaquer plus vite !</p>
        </div>
      )}

      <div className="space-y-3">
        {presets.map(preset => {
          const isEditing = editingId === preset.id;
          const isExpanded = expandedPresets.has(preset.id);
          const shipEntries = Object.entries(preset.composition).filter(([_, v]) => v > 0);
          const totalShips = shipEntries.reduce((s, [_, v]) => s + v, 0);

          return (
            <Card key={preset.id} className="bg-slate-900/50 border border-white/8">
              <CardContent className="p-4">
                {/* Preset header row */}
                <div className="flex items-center justify-between">
                  {isEditing ? (
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value.slice(0, 64))}
                      className="bg-slate-950 border-indigo-900/50 text-white font-bold flex-1 mr-3"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => toggleExpand(preset.id)}
                      className="flex items-center gap-2 text-left flex-1 group"
                    >
                      <Rocket size={14} className="text-indigo-400 shrink-0" />
                      <span className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {preset.name}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        · {totalShips.toLocaleString()} vaisseaux
                      </span>
                      {isExpanded
                        ? <ChevronUp size={13} className="text-slate-600 ml-1" />
                        : <ChevronDown size={13} className="text-slate-600 ml-1" />
                      }
                    </button>
                  )}

                  {/* Action buttons — on small screens the button row wraps gracefully */}
                  {/* TODO CLAUDE: Sur mobile, regrouper les boutons dans un menu contextuel (dropdown/sheet)
                      pour éviter l'overflow sur les petits écrans */}
                  <div className="flex items-center gap-1 ml-1 sm:ml-2 shrink-0 flex-wrap justify-end">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleUpdate(preset.id)}
                          className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors"
                          title="Sauvegarder"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition-colors"
                          title="Annuler"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        {onSelectPreset && (
                          <button
                            onClick={() => onSelectPreset(preset)}
                            className="p-1.5 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-950/40 rounded transition-colors"
                            title="Sélectionner"
                          >
                            <MousePointerClick size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDuplicate(preset)}
                          disabled={presets.length >= 10}
                          className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-950/40 rounded transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                          title="Dupliquer"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => startEdit(preset)}
                          className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-950/40 rounded transition-colors"
                          title="Modifier"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(preset)}
                          className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Composition view or editor */}
                {isEditing ? (
                  <div className="mt-4">
                    <ShipCompositionEditor
                      shipTypes={shipTypes}
                      composition={editComposition}
                      onChange={setEditComposition}
                    />
                  </div>
                ) : isExpanded && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {shipEntries.length === 0 ? (
                      <p className="text-xs text-slate-600 col-span-3">Aucun vaisseau configuré</p>
                    ) : shipEntries.map(([key, count]) => (
                      <div key={key} className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
                        <Rocket size={12} className="text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs text-slate-300 font-medium truncate">{shipLabel(key)}</div>
                          <div className="text-sm font-black font-mono text-white">{count.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ShipCompositionEditor({
  shipTypes,
  composition,
  onChange,
}: {
  shipTypes: ShipType[];
  composition: { [key: string]: number };
  onChange: (c: { [key: string]: number }) => void;
}) {
  const set = (key: string, val: number) => {
    onChange({ ...composition, [key]: Math.max(0, val) });
  };

  if (shipTypes.length === 0) {
    return <p className="text-xs text-slate-600">Aucun type de vaisseau disponible.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Composition Initiale</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shipTypes.map((ship) => {
          const count = composition[ship.ship_key] || 0;
          // Si on voulait limiter au max de la planète, on utiliserait ship.current_count
          // Mais un preset peut vouloir + que ce qu'on a. Disons arbitrairement max slider à 100 000 pour la forme.
          const maxSliderValue = Math.max(10000, ship.current_count || 1000); 

          return (
             <div key={ship.ship_key} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 transition-all hover:border-indigo-500/30 hover:shadow-lg card-depth">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700/50 text-indigo-400 shrink-0 shadow-inner">
                           <Rocket size={18} />
                        </div>
                        <div>
                           <h3 className="font-bold text-white leading-tight">{ship.display_name}</h3>
                           <p className="text-[10px] text-slate-500 font-mono tracking-wider">ATK: {ship.attack} | CARGO: {ship.cargo_capacity}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                         <div className="flex-1">
                             <input 
                               type="range" 
                               min="0" 
                               max={maxSliderValue}
                               value={count} 
                               onChange={(e) => set(ship.ship_key, parseInt(e.target.value) || 0)}
                               className="w-full appearance-none bg-slate-800 h-2 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer hover:[&::-webkit-slider-thumb]:bg-indigo-400 transition-all"
                             />
                         </div>
                         <div className="shrink-0 w-24">
                              <Input
                                type="number"
                                min="0"
                                value={count}
                                onChange={(e) => set(ship.ship_key, parseInt(e.target.value) || 0)}
                                onFocus={(e) => e.target.select()}
                                className="h-8 text-right bg-slate-950 border-slate-700 font-mono text-indigo-300 font-bold focus-visible:ring-indigo-500"
                              />
                         </div>
                    </div>
                    {/* Optional: Max buttons context */}
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => set(ship.ship_key, 0)} className="text-[9px] uppercase font-bold text-slate-500 hover:text-white transition-colors px-2 py-1 bg-slate-800 rounded">Min</button>
                        <button onClick={() => set(ship.ship_key, count + 10)} className="text-[9px] uppercase font-bold text-slate-400 hover:text-indigo-300 transition-colors px-2 py-1 bg-slate-800 rounded">+10</button>
                        <button onClick={() => set(ship.ship_key, count + 100)} className="text-[9px] uppercase font-bold text-slate-400 hover:text-indigo-300 transition-colors px-2 py-1 bg-slate-800 rounded">+100</button>
                    </div>
                </div>
             </div>
          );
        })}
      </div>
    </div>
  );
}
