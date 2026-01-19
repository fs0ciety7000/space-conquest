import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pickaxe, Gem, Droplets, Zap, Timer, ArrowUpCircle,
  Box, TrendingUp, Activity, ChevronRight, Lock, Unlock, Power, PowerOff, ChevronDown, Layers, AlertCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { apiUrl } from '@/config/api';
import { toast } from "sonner";

interface ResourceSlot {
  id: number;
  planet_id: string;
  slot_number: number;
  resource_type: string;
  level: number;
  is_locked: boolean;
  is_active: boolean;
}

const RESOURCE_TYPES = {
  metal: { icon: Pickaxe, label: "Métal", color: "text-orange-400", border: "border-orange-500/50", bg: "bg-orange-500/10" },
  crystal: { icon: Gem, label: "Cristal", color: "text-cyan-400", border: "border-cyan-500/50", bg: "bg-cyan-500/10" },
  deuterium: { icon: Droplets, label: "Deutérium", color: "text-emerald-400", border: "border-emerald-500/50", bg: "bg-emerald-500/10" },
  energy: { icon: Zap, label: "Énergie", color: "text-yellow-400", border: "border-yellow-500/50", bg: "bg-yellow-500/10" },
};
interface ResourceDisplayProps {
  planet: any;
  onUpgrade: () => void;
  speedFactor?: number; // ← AJOUT
}

// --- CONFIGURATION VISUELLE (Design Riche) ---
const getResourceTheme = (type: string) => {
  const themes: Record<string, any> = {
    metal: { color: "text-orange-400", border: "border-orange-500/50", bg: "bg-orange-500/10", glow: "shadow-orange-500/20", gradient: "from-slate-950 to-orange-950/20", icon: Pickaxe, label: "Extraction Lourde" },
    crystal: { color: "text-cyan-400", border: "border-cyan-500/50", bg: "bg-cyan-500/10", glow: "shadow-cyan-500/20", gradient: "from-slate-950 to-cyan-950/20", icon: Gem, label: "Synthèse Cristalline" },
    deuterium: { color: "text-emerald-400", border: "border-emerald-500/50", bg: "bg-emerald-500/10", glow: "shadow-emerald-500/20", gradient: "from-slate-950 to-emerald-950/20", icon: Droplets, label: "Raffinage Isotopique" },
    solar_plant: { color: "text-yellow-400", border: "border-yellow-500/50", bg: "bg-yellow-500/10", glow: "shadow-yellow-500/20", gradient: "from-slate-950 to-yellow-950/20", icon: Zap, label: "Générateur Photovoltaïque" }
  };
  return themes[type] || themes.metal;
};

export default function ResourceDisplay({ planet, onUpgrade, speedFactor = 10 }: ResourceDisplayProps) {
  const [now, setNow] = useState(new Date().getTime());
  const [extraSlots, setExtraSlots] = useState<ResourceSlot[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; slotNumber: number; cost: any } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date().getTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fonction pour recharger les slots
  const reloadSlots = async () => {
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/resource-slots`), {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setExtraSlots(data.filter((s: ResourceSlot) => s.slot_number >= 5));
      }
    } catch (error) {
      console.error('Erreur chargement slots:', error);
    }
  };

  // Charger les slots supplémentaires (5-8)
  useEffect(() => {
    if (planet?.id) reloadSlots();
  }, [planet?.id]);

  const handleChangeType = async (slotNumber: number, newType: string) => {
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/resource-slots/${slotNumber}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resource_type: newType }),
      });
      if (res.ok) {
        toast.success(`Slot ${slotNumber - 4} modifié`);
        // Recharger automatiquement les slots et les ressources
        await reloadSlots();
        onUpgrade();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    }
  };

  const handleToggleActive = async (slotNumber: number, currentlyActive: boolean) => {
    const slotIndex = slotNumber - 5;
    const cost = {
      metal: 5000 * Math.pow(2, slotIndex),
      crystal: 2500 * Math.pow(2, slotIndex),
      deuterium: 1250 * Math.pow(2, slotIndex),
    };

    if (!currentlyActive) {
      // Ouvrir la modale de confirmation pour l'activation
      setConfirmDialog({ open: true, slotNumber, cost });
      return;
    }

    // Désactivation directe (pas de coût)
    await performToggle(slotNumber, currentlyActive, cost);
  };

  const performToggle = async (slotNumber: number, currentlyActive: boolean, cost: any) => {
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/resource-slots/${slotNumber}/toggle`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(currentlyActive ? 'Slot désactivé' : `Slot activé (-${cost.metal.toLocaleString()} M, -${cost.crystal.toLocaleString()} C, -${cost.deuterium.toLocaleString()} D)`);
        // Rafraîchir automatiquement les slots et ressources
        await reloadSlots();
        onUpgrade();
      } else {
        if (data.cost) {
          toast.error(`Ressources insuffisantes! Coût: ${data.cost.metal.toLocaleString()} M, ${data.cost.crystal.toLocaleString()} C, ${data.cost.deuterium.toLocaleString()} D`);
        } else {
          toast.error(data.error || 'Erreur');
        }
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setConfirmDialog(null);
    }
  };

  if (!planet) return null;

  const handleUpgrade = async (type: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/upgrade/${type}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (res.ok) onUpgrade();
    } catch (e) { console.error("Erreur upgrade", e); }
  };

  // --- FORMULES AVEC PRISE EN COMPTE DES SLOTS ---
  const calculateEnergyProd = (level: number) => {
    const baseProd = 20 * level * Math.pow(1.1, level);
    const techLevel = planet.energy_tech_level || 0;
    return Math.floor(baseProd * (1 + (techLevel * 0.05)));
  };

  const calculateProd = (type: string, level: number, base: number) => {
      if (type === 'solar_plant') {
          return calculateEnergyProd(level);
      }

      // Calcul de base
      let prod = base * level * Math.pow(1.1, level);

      // Bonus technologie énergie (+1% par niveau)
      const techLevel = planet.energy_tech_level || 0;
      const techBonus = 1.0 + (techLevel * 0.01);
      prod *= techBonus;

      // Utiliser le ratio énergétique du backend (cohérent avec EmpireBar et ProductionStats)
      const energyRatio = (planet.energy_ratio || 100) / 100;
      prod *= energyRatio;

      // Compter les slots actifs pour ce type de ressource
      const resourceKey = type === 'metal' ? 'metal' : type === 'crystal' ? 'crystal' : type === 'deuterium' ? 'deuterium' : null;
      if (resourceKey) {
        const activeSlots = extraSlots.filter(s => s.is_active && s.resource_type === resourceKey);
        const slotBonus = 1.0 + (activeSlots.length * 0.5); // +50% par slot actif
        prod *= slotBonus;
      }

      // Appliquer le speed factor
      prod *= speedFactor;

      return Math.floor(prod);
  };

  const calculateEnergyCons = (type: string, level: number) => {
      if (type === 'solar_plant') return 0;
      const baseFactor = type === 'deuterium' ? 20 : 10;
      return Math.floor(baseFactor * level * Math.pow(1.1, level));
  }
  
  const getNextCost = (type: string, currentLevel: number) => {
    const next = currentLevel + 1;
    const factor = Math.pow(1.5, next - 1); 
    if (type === 'metal') return { m: 60 * factor, c: 15 * factor };
    if (type === 'crystal') return { m: 48 * Math.pow(1.6, next - 1), c: 24 * Math.pow(1.6, next - 1) };
    if (type === 'deuterium') return { m: 225 * factor, c: 75 * factor };
    if (type === 'solar_plant') return { m: 75 * factor, c: 30 * factor };
    return { m: 0, c: 0 };
  };

  const buildings = [
    { id: 'metal', name: 'Mine de Métal', lv: planet.metal_mine_level ?? 0, base: 30 },
    { id: 'crystal', name: 'Mine de Cristal', lv: planet.crystal_mine_level ?? 0, base: 20 },
    { id: 'deuterium', name: 'Synthé de Deutérium', lv: planet.deuterium_mine_level ?? 0, base: 10 },
    { id: 'solar_plant', name: 'Centrale Solaire', lv: planet.solar_plant_level ?? 0, base: 0 }, 
  ];

  const metalNow = planet.metal_amount ?? 0;
  const crystalNow = planet.crystal_amount ?? 0;
  
  // LOGIQUE QUEUE MULTIPLE
  const queue = planet.constructions || [];
  const isQueueFull = queue.length >= 3;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {buildings.map((build) => {
        // Trouver l'item actif
        const activeItem = queue.find((q: any) => q.building_type === build.id);
        const timeLeft = activeItem ? Math.max(0, Math.floor((new Date(activeItem.end_time + "Z").getTime() - now) / 1000)) : null;

        // Calculs (Design Riche)
        const currentProd = calculateProd(build.id, build.lv, build.base);
        const currentEnergy = calculateEnergyCons(build.id, build.lv);
        const nextProd = calculateProd(build.id, build.lv + 1, build.base);
        const nextEnergy = calculateEnergyCons(build.id, build.lv + 1);
        const diffProd = nextProd - currentProd;
        const diffEnergy = nextEnergy - currentEnergy;

        const cost = getNextCost(build.id, build.lv);
        const canAfford = metalNow >= cost.m && crystalNow >= cost.c;
        
        const theme = getResourceTheme(build.id);
        const Icon = theme.icon;
        const isSolar = build.id === 'solar_plant';

        return (
          <Card key={build.id} className={`relative overflow-hidden border-t-4 ${theme.border} bg-gradient-to-b ${theme.gradient} shadow-2xl group hover:-translate-y-2 hover:shadow-3xl transition-all duration-500 hover-scale card-depth card-depth-hover animate-slide-up`}>

            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-50 group-hover:opacity-100 transition-all duration-300"></div>
            <div className="absolute -right-8 -top-8 opacity-5 group-hover:opacity-15 transition-all duration-500 pointer-events-none group-hover:animate-float">
                <Icon size={180} className={theme.color} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <CardContent className="p-5 relative z-10 flex flex-col h-full justify-between">
              <div>
                {/* HEADER (Design Riche) */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4 items-center">
                    <div className={`p-3 rounded-xl border ${theme.border} bg-black/40 ${theme.glow} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={theme.color} size={24} />
                    </div>
                    <div>
                        <div className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.color} mb-1 flex items-center gap-1`}>
                            <Activity size={10} /> {theme.label}
                        </div>
                        <h3 className="text-lg font-black uppercase text-white tracking-wide leading-none">{build.name}</h3>
                    </div>
                    </div>
                    <div className="text-right">
                    <span className={`text-4xl font-mono font-black ${theme.color} opacity-90`}>{build.lv}</span>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold -mt-1">Niveau</p>
                    </div>
                </div>

                {/* STATS PANEL (Design Riche Restauré) */}
                <div className="bg-black/40 p-3 rounded-lg border border-white/5 mb-6 backdrop-blur-sm space-y-3">
                    
                    {/* Ligne Production */}
                    <div>
                        <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-500 mb-1">
                            <span className="flex items-center gap-1"><TrendingUp size={12}/> Production / h</span>
                            <span className="text-green-400">+{diffProd.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between font-mono text-xs">
                            <span className="text-white">{currentProd.toLocaleString()}</span>
                            <ChevronRight size={12} className="text-slate-600"/>
                            <span className={`${theme.color} font-bold`}>{nextProd.toLocaleString()}</span>
                        </div>
                        {/* Jauge Prod Animée */}
                        <div className="h-1 w-full bg-slate-800 rounded-full mt-1 overflow-hidden progress-bar-animated">
                            <div className={`h-full ${theme.color.replace('text-', 'bg-')} opacity-80 animate-gradient`} style={{ width: '100%' }}></div>
                        </div>
                    </div>

                    {/* Ligne Énergie (VERSION SIMPLIFIÉE - une seule ligne) */}
                    <div>
                        <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-500 mb-1">
                            <span className="flex items-center gap-1"><Zap size={12}/> {isSolar ? 'Production Énergie' : 'Conso. Énergie'}</span>
                        </div>
                        <div className="flex items-center justify-between font-mono text-xs">
                            <span className="text-slate-400">{isSolar ? '+' : '-'}{currentEnergy.toLocaleString()}</span>
                            <ChevronRight size={12} className="text-slate-600"/>
                            <span className={isSolar ? "text-yellow-400 font-bold" : "text-red-400 font-bold"}>
                                {isSolar ? '+' : '-'}{nextEnergy.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* COÛTS SUIVANT (Visibles si pas en cours) */}
                {!activeItem && (
                    <div className="space-y-2 mb-6">
                        <div className={`flex justify-between items-center px-2 py-1.5 rounded bg-black/40 border ${metalNow >= cost.m ? 'border-white/5' : 'border-red-900/50'}`}>
                            <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-2"><Box size={10} /> Métal</span>
                            <span className={`text-xs font-mono font-bold ${metalNow >= cost.m ? 'text-slate-300' : 'text-red-500'}`}>{Math.floor(cost.m).toLocaleString()}</span>
                        </div>
                        <div className={`flex justify-between items-center px-2 py-1.5 rounded bg-black/40 border ${crystalNow >= cost.c ? 'border-white/5' : 'border-red-900/50'}`}>
                            <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-2"><Gem size={10} /> Cristal</span>
                            <span className={`text-xs font-mono font-bold ${crystalNow >= cost.c ? 'text-slate-300' : 'text-red-500'}`}>{Math.floor(cost.c).toLocaleString()}</span>
                        </div>
                    </div>
                )}
              </div>

              {/* BOUTON D'ACTION (Logique Multi-files + Design Riche Swipe) */}
              <div className="mt-auto">
                <Button 
                  onClick={() => handleUpgrade(build.id)}
                  disabled={(isQueueFull && !activeItem) || !canAfford}
                  className={`w-full h-10 font-black uppercase text-[10px] tracking-[0.2em] transition-all rounded-lg relative overflow-hidden group/btn ${
                    activeItem
                      ? 'bg-slate-900 text-slate-300 border border-indigo-500/50' 
                      : isQueueFull 
                        ? 'bg-slate-900 text-slate-500 border border-white/5' 
                        : !canAfford 
                            ? 'bg-red-950/20 text-red-500 border border-red-900/30 cursor-not-allowed'
                            : `bg-black hover:bg-slate-900 text-white border ${theme.border} ${theme.glow}`
                  }`}
                >
                  {/* Effet Swipe restauré */}
                  {!activeItem && canAfford && !isQueueFull && (
                      <div className={`absolute top-0 bottom-0 w-2 bg-white/20 blur-md -skew-x-12 -left-10 group-hover/btn:left-[120%] transition-all duration-700`}></div>
                  )}

                  {activeItem ? (
                     <span className="flex items-center gap-2 relative z-10 text-cyan-400 animate-glow-pulse">
                       <Timer size={14} className="animate-spin-slow" /> En cours {timeLeft}s
                     </span>
                  ) : isQueueFull ? (
                    <span className="relative z-10">File Pleine (3/3)</span>
                  ) : !canAfford ? (
                    <span className="relative z-10">Ressources Manquantes</span>
                  ) : (
                    <span className="flex items-center gap-2 relative z-10">
                      <ArrowUpCircle size={14}/> Améliorer Niv. {build.lv + 1}
                    </span>
                  )}
                </Button>
              </div>

            </CardContent>
          </Card>
        );
      })}

      {/* SLOTS SUPPLÉMENTAIRES (5-8) */}
      {extraSlots.length > 0 && (
        <div className="col-span-full mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
              <Layers className="text-indigo-400" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-indigo-300">
                Slots de Production Bonus
              </h3>
              <p className="text-[10px] text-slate-500">
                +50% de production par slot actif
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {extraSlots.map((slot) => {
              const resInfo = RESOURCE_TYPES[slot.resource_type as keyof typeof RESOURCE_TYPES];
              const SlotIcon = resInfo?.icon || Pickaxe;
              const slotColor = resInfo?.color || "text-gray-400";
              const slotBorder = resInfo?.border || "border-gray-500/50";
              const slotBg = resInfo?.bg || "bg-gray-500/10";

              const slotCost = {
                metal: 5000 * Math.pow(2, slot.slot_number - 5),
                crystal: 2500 * Math.pow(2, slot.slot_number - 5),
                deuterium: 1250 * Math.pow(2, slot.slot_number - 5),
              };

              return (
                <Card
                  key={slot.slot_number}
                  className={`relative overflow-hidden transition-all duration-500 hover:-translate-y-1 hover-scale card-depth group/slot animate-fade-in ${
                    slot.is_active
                      ? `border ${slotBorder} ${slotBg} shadow-lg animate-glow-pulse`
                      : 'border border-slate-700/50 bg-slate-900/30 opacity-60 hover:opacity-100'
                  }`}
                >
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${slotBg} border ${slotBorder}`}>
                          <SlotIcon size={16} className={slotColor} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Slot {slot.slot_number - 4}</div>
                          <div className={`text-[10px] ${slot.is_active ? 'text-green-400' : 'text-red-400'}`}>
                            {slot.is_active ? 'Actif' : 'Inactif'}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleActive(slot.slot_number, slot.is_active)}
                        className={`h-8 w-8 p-0 ${
                          slot.is_active ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'
                        }`}
                        title={slot.is_active ? 'Désactiver (gratuit)' : `Activer`}
                      >
                        {slot.is_active ? <Power size={16} /> : <PowerOff size={16} />}
                      </Button>
                    </div>

                    {/* Type selector */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between bg-black/30 border-white/10 text-white hover:bg-black/50 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <SlotIcon size={14} className={slotColor} />
                            <span>{resInfo?.label || 'Sélectionner'}</span>
                          </div>
                          <ChevronDown size={12} className="opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-slate-950 border-slate-800 text-white">
                        {Object.entries(RESOURCE_TYPES).map(([type, { icon: TypeIcon, label, color }]) => (
                          <DropdownMenuItem
                            key={type}
                            onClick={() => handleChangeType(slot.slot_number, type)}
                            className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                          >
                            <div className="flex items-center gap-2">
                              <TypeIcon size={14} className={color} />
                              <span>{label}</span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Bonus indicator OR Activation cost */}
                    {slot.is_active ? (
                      <div className="mt-3 text-center bg-black/40 p-2 rounded border border-white/5 glass-card">
                        <span className={`text-lg font-black font-mono ${slotColor} animate-scale-pulse`}>+50%</span>
                        <p className="text-[9px] text-slate-500 uppercase">Bonus {resInfo?.label}</p>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-1">
                        <div className="text-[9px] text-slate-400 uppercase font-bold mb-1.5 flex items-center gap-1">
                          <AlertCircle size={10} /> Coût d'activation
                        </div>
                        <div className="flex justify-between items-center text-[10px] px-2 py-1 bg-black/40 rounded border border-white/5">
                          <span className="text-orange-400 flex items-center gap-1"><Pickaxe size={10} /> Métal</span>
                          <span className="text-white font-mono font-bold">{slotCost.metal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] px-2 py-1 bg-black/40 rounded border border-white/5">
                          <span className="text-cyan-400 flex items-center gap-1"><Gem size={10} /> Cristal</span>
                          <span className="text-white font-mono font-bold">{slotCost.crystal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] px-2 py-1 bg-black/40 rounded border border-white/5">
                          <span className="text-emerald-400 flex items-center gap-1"><Droplets size={10} /> Deuté</span>
                          <span className="text-white font-mono font-bold">{slotCost.deuterium.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Modale de confirmation d'activation */}
      <Dialog open={confirmDialog?.open || false} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent className="bg-slate-950 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-wide flex items-center gap-2">
              <Power className="text-yellow-400" size={20} />
              Activer le Slot {confirmDialog ? confirmDialog.slotNumber - 4 : ''}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              L'activation de ce slot de production augmentera la production de la ressource sélectionnée de 50%.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="text-yellow-400" size={16} />
                <span className="text-sm font-bold text-yellow-300">Coût d'activation</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-orange-400 flex items-center gap-2">
                    <Pickaxe size={14} /> Métal
                  </span>
                  <span className="font-mono font-bold text-white">
                    {confirmDialog?.cost.metal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-cyan-400 flex items-center gap-2">
                    <Gem size={14} /> Cristal
                  </span>
                  <span className="font-mono font-bold text-white">
                    {confirmDialog?.cost.crystal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-emerald-400 flex items-center gap-2">
                    <Droplets size={14} /> Deutérium
                  </span>
                  <span className="font-mono font-bold text-white">
                    {confirmDialog?.cost.deuterium.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-green-400" size={16} />
                <span className="text-sm font-bold text-green-300">Bonus de production</span>
              </div>
              <p className="text-2xl font-black font-mono text-green-400">+50%</p>
              <p className="text-xs text-slate-400 mt-1">
                Pour la ressource sélectionnée dans ce slot
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(null)}
              className="bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
            >
              Annuler
            </Button>
            <Button
              onClick={() => confirmDialog && performToggle(confirmDialog.slotNumber, false, confirmDialog.cost)}
              className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-white hover:from-yellow-700 hover:to-yellow-600 font-bold"
            >
              <Power size={16} className="mr-2" />
              Activer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}