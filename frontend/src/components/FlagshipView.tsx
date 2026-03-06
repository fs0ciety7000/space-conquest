import { useState, useEffect } from "react";
import {
  Star, Sword, Shield, Zap, Package, Gauge, Plus, X, Lock,
  Cpu, Rocket, FlaskConical, ChevronRight, RefreshCw
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiUrl } from "@/config/api";

interface ModuleType {
  id: string;
  module_key: string;
  display_name: string;
  description: string | null;
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

interface EquippedModule {
  id: string;
  module_key: string;
  display_name: string;
  slot_type: string;
  slot_index: number;
  bonus_attack: number;
  bonus_shield: number;
  bonus_hull: number;
  bonus_cargo: number;
  bonus_speed_pct: number;
}

interface FlagshipData {
  id: string;
  name: string;
  xp: number;
  level: number;
  xp_next_level: number;
  base_attack: number;
  base_shield: number;
  base_hull: number;
  base_cargo: number;
  total_attack: number;
  total_shield: number;
  total_hull: number;
  total_cargo: number;
  total_speed_bonus_pct: number;
  equipped_modules: EquippedModule[];
}

interface FlagshipViewProps {
  userId: string;
  planetId: string;
  planet: { metal_amount: number; crystal_amount: number; deuterium_amount: number };
  onPlanetUpdate?: () => void;
}

const SLOT_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  weapon:  Sword,
  shield:  Shield,
  engine:  Rocket,
  utility: Package,
  special: FlaskConical,
};

const SLOT_COLORS: Record<string, string> = {
  weapon:  "text-red-400 border-red-900/50 bg-red-950/20",
  shield:  "text-cyan-400 border-cyan-900/50 bg-cyan-950/20",
  engine:  "text-purple-400 border-purple-900/50 bg-purple-950/20",
  utility: "text-amber-400 border-amber-900/50 bg-amber-950/20",
  special: "text-pink-400 border-pink-900/50 bg-pink-950/20",
};

const SLOT_LABEL: Record<string, string> = {
  weapon:  "Armement",
  shield:  "Défense",
  engine:  "Propulsion",
  utility: "Utilitaire",
  special: "Spécial",
};

export default function FlagshipView({ userId, planetId, planet, onPlanetUpdate }: FlagshipViewProps) {
  const [flagship, setFlagship] = useState<FlagshipData | null>(null);
  const [moduleTypes, setModuleTypes] = useState<ModuleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingMode, setRenamingMode] = useState(false);
  const [renameVal, setRenameVal] = useState("");
  const [selectedSlotType, setSelectedSlotType] = useState<string | null>(null);
  const [showModuleShop, setShowModuleShop] = useState(false);

  const loadFlagship = async () => {
    try {
      const [fsRes, mtRes] = await Promise.all([
        fetch(apiUrl(`/flagship/${userId}`)),
        fetch(apiUrl(`/flagship-modules`)),
      ]);
      if (fsRes.ok) {
        const data = await fsRes.json();
        setFlagship(data);
      }
      if (mtRes.ok) setModuleTypes(await mtRes.json());
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFlagship(); }, [userId]);

  const handleCreate = async () => {
    const name = newName.trim() || "Vaisseau Amiral";
    setCreating(true);
    try {
      const res = await fetch(apiUrl(`/flagship/${userId}/create`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, planet_id: planetId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${name} construit !`);
        onPlanetUpdate?.();
        loadFlagship();
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch { toast.error("Erreur réseau"); }
    finally { setCreating(false); }
  };

  const handleRename = async () => {
    const name = renameVal.trim();
    if (!name) return;
    try {
      const res = await fetch(apiUrl(`/flagship/${userId}/rename`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        toast.success("Vaisseau renommé");
        setRenamingMode(false);
        loadFlagship();
      } else {
        const d = await res.json();
        toast.error(d.error || "Erreur");
      }
    } catch { toast.error("Erreur réseau"); }
  };

  const handleEquip = async (mtype: ModuleType) => {
    try {
      const res = await fetch(apiUrl(`/flagship/${userId}/equip`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_key: mtype.module_key, planet_id: planetId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${mtype.display_name} équipé !`);
        onPlanetUpdate?.();
        loadFlagship();
        setShowModuleShop(false);
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch { toast.error("Erreur réseau"); }
  };

  const handleUnequip = async (moduleId: string, name: string) => {
    if (!confirm(`Déséquiper ${name} ?`)) return;
    try {
      const res = await fetch(apiUrl(`/flagship/${userId}/unequip/${moduleId}`), {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`${name} retiré`);
        loadFlagship();
      }
    } catch { toast.error("Erreur réseau"); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-500" />
      </div>
    );
  }

  // No flagship yet
  if (!flagship) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center py-12 space-y-6">
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-full bg-indigo-950/50 border-2 border-indigo-700/50 flex items-center justify-center mx-auto">
              <Star size={40} className="text-indigo-400 opacity-60" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Vaisseau Amiral</h2>
            <p className="text-slate-400 mt-2 max-w-md mx-auto">
              Votre vaisseau amiral est unique. Il gagne de l'XP en combat et peut être équipé de modules spéciaux pour le rendre redoutable.
            </p>
          </div>

          <Card className="bg-slate-900/50 border border-indigo-900/40 max-w-md mx-auto text-left">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-xs text-slate-500 uppercase font-bold tracking-wider">Coût de construction</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className={`text-lg font-black ${planet.metal_amount >= 5_000_000 ? "text-white" : "text-red-400"}`}>5 000 000</div>
                  <div className="text-[10px] text-slate-500 uppercase">Métal</div>
                  <div className="text-[10px] text-slate-600 font-mono">{planet.metal_amount.toLocaleString()}</div>
                </div>
                <div>
                  <div className={`text-lg font-black ${planet.crystal_amount >= 2_000_000 ? "text-white" : "text-red-400"}`}>2 000 000</div>
                  <div className="text-[10px] text-slate-500 uppercase">Cristal</div>
                  <div className="text-[10px] text-slate-600 font-mono">{planet.crystal_amount.toLocaleString()}</div>
                </div>
                <div>
                  <div className={`text-lg font-black ${planet.deuterium_amount >= 500_000 ? "text-white" : "text-red-400"}`}>500 000</div>
                  <div className="text-[10px] text-slate-500 uppercase">Deutérium</div>
                  <div className="text-[10px] text-slate-600 font-mono">{planet.deuterium_amount.toLocaleString()}</div>
                </div>
              </div>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value.slice(0, 64))}
                placeholder="Nom du vaisseau (optionnel)..."
                className="bg-slate-950 border-slate-700 text-white"
              />
              <Button
                onClick={handleCreate}
                disabled={creating || planet.metal_amount < 5_000_000 || planet.crystal_amount < 2_000_000 || planet.deuterium_amount < 500_000}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black"
              >
                {creating ? "Construction..." : "Construire le Vaisseau Amiral"}
              </Button>
              {(planet.metal_amount < 5_000_000 || planet.crystal_amount < 2_000_000 || planet.deuterium_amount < 500_000) && (
                <p className="text-xs text-red-400 text-center">Ressources insuffisantes sur cette planète</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const equippedByType = flagship.equipped_modules.reduce((acc, m) => {
    if (!acc[m.slot_type]) acc[m.slot_type] = [];
    acc[m.slot_type].push(m);
    return acc;
  }, {} as Record<string, EquippedModule[]>);

  const equippedKeys = new Set(flagship.equipped_modules.map(m => m.module_key));
  const xpPct = Math.min(100, Math.round((flagship.xp / flagship.xp_next_level) * 100));

  const availableModules = moduleTypes.filter(mt =>
    !equippedKeys.has(mt.module_key) &&
    mt.required_flagship_level <= flagship.level &&
    (!selectedSlotType || mt.slot_type === selectedSlotType)
  );

  const slotTypes = ["weapon", "shield", "engine", "utility", "special"];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Flagship header card */}
      <Card className="bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-700/40 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: "40px 40px"
        }} />
        <CardContent className="p-6 relative">
          <div className="flex items-start gap-6">
            {/* Icon */}
            <div className="w-20 h-20 rounded-2xl bg-indigo-950/80 border-2 border-indigo-500/50 flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
              <Star size={36} className="text-indigo-400" />
            </div>

            <div className="flex-1 min-w-0">
              {renamingMode ? (
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    value={renameVal}
                    onChange={e => setRenameVal(e.target.value.slice(0, 64))}
                    className="bg-slate-950 border-indigo-700/50 text-white text-lg font-black"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenamingMode(false); }}
                  />
                  <Button onClick={handleRename} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">OK</Button>
                  <Button onClick={() => setRenamingMode(false)} size="sm" className="bg-slate-800 text-slate-400">Annuler</Button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-black text-white uppercase tracking-tight">{flagship.name}</h1>
                  <button
                    onClick={() => { setRenameVal(flagship.name); setRenamingMode(true); }}
                    className="text-xs text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    ✏️
                  </button>
                </div>
              )}

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-indigo-300 font-bold">Niv. {flagship.level}</span>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <span>{flagship.xp} / {flagship.xp_next_level} XP</span>
                  </div>
                </div>
                <div className="flex-1 min-w-24 max-w-48">
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${xpPct}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={loadFlagship}
                  className="text-slate-600 hover:text-slate-400 transition-colors"
                  title="Actualiser"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
            {[
              { label: "Attaque", val: flagship.total_attack, icon: Sword, color: "text-red-400" },
              { label: "Bouclier", val: flagship.total_shield, icon: Shield, color: "text-cyan-400" },
              { label: "Coque", val: flagship.total_hull, icon: Cpu, color: "text-amber-400" },
              { label: "Cargo", val: flagship.total_cargo, icon: Package, color: "text-purple-400" },
              { label: "Vitesse", val: `+${flagship.total_speed_bonus_pct.toFixed(0)}%`, icon: Gauge, color: "text-green-400" },
            ].map(({ label, val, icon: Icon, color }) => (
              <div key={label} className="bg-black/30 rounded-xl p-3 text-center">
                <Icon size={16} className={`${color} mx-auto mb-1`} />
                <div className="text-lg font-black text-white font-mono">{typeof val === 'number' ? val.toLocaleString() : val}</div>
                <div className="text-[10px] text-slate-500 uppercase">{label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fitting section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {slotTypes.map(slotType => {
          const Icon = SLOT_ICONS[slotType] || Zap;
          const colorClass = SLOT_COLORS[slotType];
          const equipped = equippedByType[slotType] || [];
          const maxSlots = 3;

          return (
            <Card key={slotType} className={`border ${colorClass} bg-slate-900/50`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${colorClass.split(' ')[0]}`}>
                    <Icon size={13} />
                    {SLOT_LABEL[slotType]}
                    <span className="text-slate-600 font-normal">({equipped.length}/{maxSlots})</span>
                  </h3>
                  {equipped.length < maxSlots && (
                    <button
                      onClick={() => { setSelectedSlotType(slotType); setShowModuleShop(true); }}
                      className={`text-xs font-bold flex items-center gap-1 px-2 py-1 rounded border transition-colors hover:opacity-80 ${colorClass}`}
                    >
                      <Plus size={11} /> Équiper
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {equipped.map(m => (
                    <div key={m.id} className="flex items-center gap-2 bg-black/30 rounded-lg p-2">
                      <Icon size={12} className={colorClass.split(' ')[0]} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{m.display_name}</div>
                        <div className="text-[10px] text-slate-500">
                          {[
                            m.bonus_attack && `+${m.bonus_attack} ATK`,
                            m.bonus_shield && `+${m.bonus_shield} BOU`,
                            m.bonus_hull && `+${m.bonus_hull} COQ`,
                            m.bonus_cargo && `+${m.bonus_cargo} CRG`,
                            m.bonus_speed_pct && `+${m.bonus_speed_pct}% VIT`,
                          ].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnequip(m.id, m.display_name)}
                        className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}

                  {/* Empty slots */}
                  {Array.from({ length: maxSlots - equipped.length }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedSlotType(slotType); setShowModuleShop(true); }}
                      className="w-full flex items-center gap-2 bg-black/10 border border-dashed border-white/10 rounded-lg p-2 hover:border-white/20 hover:bg-black/20 transition-all text-slate-600 hover:text-slate-400"
                    >
                      <Plus size={12} />
                      <span className="text-xs">Slot vide</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Module Shop Modal */}
      {showModuleShop && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-950 border border-indigo-800/50 rounded-3xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-widest">
                  Modules — {SLOT_LABEL[selectedSlotType || ""] || "Tous"}
                </h2>
                <p className="text-xs text-slate-500">Choisissez un module à équiper sur votre Vaisseau Amiral</p>
              </div>
              <button onClick={() => setShowModuleShop(false)} className="text-slate-400 hover:text-white">
                <X size={22} />
              </button>
            </div>

            {/* Type filter */}
            <div className="flex gap-2 px-5 pt-3 flex-wrap">
              <button
                onClick={() => setSelectedSlotType(null)}
                className={`text-xs px-3 py-1 rounded-lg font-bold transition-colors ${selectedSlotType === null ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`}
              >
                Tous
              </button>
              {slotTypes.map(st => {
                const Icon = SLOT_ICONS[st] || Zap;
                return (
                  <button
                    key={st}
                    onClick={() => setSelectedSlotType(st)}
                    className={`text-xs px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors ${selectedSlotType === st ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`}
                  >
                    <Icon size={11} /> {SLOT_LABEL[st]}
                  </button>
                );
              })}
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              {availableModules.length === 0 ? (
                <div className="text-center py-12 text-slate-600">
                  <Lock size={30} className="mx-auto mb-2 opacity-30" />
                  <p>Aucun module disponible pour ce type</p>
                  <p className="text-xs mt-1">Montez de niveau pour débloquer plus de modules</p>
                </div>
              ) : availableModules.map(mt => {
                const Icon = SLOT_ICONS[mt.slot_type] || Zap;
                const colorClass = SLOT_COLORS[mt.slot_type];
                const canAfford = planet.metal_amount >= mt.cost_metal &&
                  planet.crystal_amount >= mt.cost_crystal &&
                  planet.deuterium_amount >= mt.cost_deuterium;
                const statLines = [
                  mt.bonus_attack && `+${mt.bonus_attack} Attaque`,
                  mt.bonus_shield && `+${mt.bonus_shield} Bouclier`,
                  mt.bonus_hull && `+${mt.bonus_hull} Coque`,
                  mt.bonus_cargo && `+${mt.bonus_cargo} Cargo`,
                  mt.bonus_speed_pct && `+${mt.bonus_speed_pct}% Vitesse`,
                ].filter(Boolean);

                return (
                  <div key={mt.id} className={`border rounded-xl p-4 flex items-start gap-4 ${canAfford ? "bg-slate-900/50 border-white/8 hover:border-white/15" : "bg-slate-900/20 border-white/5 opacity-60"} transition-all`}>
                    <div className={`p-2 rounded-lg border ${colorClass} shrink-0`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{mt.display_name}</span>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${colorClass}`}>
                          {SLOT_LABEL[mt.slot_type]}
                        </span>
                        {mt.required_flagship_level > 1 && (
                          <span className="text-[10px] text-indigo-400">Niv. {mt.required_flagship_level}+</span>
                        )}
                      </div>
                      {mt.description && <p className="text-xs text-slate-500 mt-0.5">{mt.description}</p>}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {statLines.map(s => (
                          <span key={s} className="text-xs text-green-400 font-mono bg-green-950/30 px-2 py-0.5 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        {mt.cost_metal > 0 && <span className={planet.metal_amount >= mt.cost_metal ? "text-slate-400" : "text-red-400"}>{mt.cost_metal.toLocaleString()} métal</span>}
                        {mt.cost_crystal > 0 && <span className={planet.crystal_amount >= mt.cost_crystal ? "text-slate-400" : "text-red-400"}>{mt.cost_crystal.toLocaleString()} cristal</span>}
                        {mt.cost_deuterium > 0 && <span className={planet.deuterium_amount >= mt.cost_deuterium ? "text-slate-400" : "text-red-400"}>{mt.cost_deuterium.toLocaleString()} deutérium</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => canAfford && handleEquip(mt)}
                      disabled={!canAfford}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black transition-colors ${canAfford ? "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer" : "bg-slate-800 text-slate-600 cursor-not-allowed"}`}
                    >
                      Équiper <ChevronRight size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
