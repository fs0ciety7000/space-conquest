import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pickaxe, Gem, Droplets, Zap, Timer, ArrowUpCircle,
  Box, TrendingUp, Activity, ChevronRight, Lock, Unlock, Power, PowerOff, ChevronDown, Layers
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

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date().getTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Charger les slots supplémentaires (5-8)
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetch(apiUrl(`/planets/${planet.id}/resource-slots`), {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Filtrer uniquement les slots 5-8 (configurables)
          setExtraSlots(data.filter((s: ResourceSlot) => s.slot_number >= 5));
        }
      } catch (error) {
        console.error('Erreur chargement slots:', error);
      }
    };
    if (planet?.id) fetchSlots();
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
        onUpgrade();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    }
  };

  const handleToggleActive = async (slotNumber: number) => {
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/resource-slots/${slotNumber}/toggle`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        toast.success('Slot activé/désactivé');
        onUpgrade();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
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

  // --- FORMULES (CORRECTION : utiliser speedFactor au lieu de *10) ---
  const calculateProd = (type: string, level: number, base: number) => {
      if (type === 'solar_plant') {
          const baseProd = 20 * level * Math.pow(1.1, level);
          const techLevel = planet.energy_tech_level || 0;
          return Math.floor(baseProd * (1 + (techLevel * 0.05)));
      }
      return Math.floor(base * level * Math.pow(1.1, level) * speedFactor); // ✅ CORRECTION ICI
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
          <Card key={build.id} className={`relative overflow-hidden border-t-4 ${theme.border} bg-gradient-to-b ${theme.gradient} shadow-2xl group hover:-translate-y-1 transition-all duration-300`}>
            
            <div className="absolute top-0 inset-x-0 h-px bg-white/10 opacity-50 group-hover:bg-white/30 transition-all"></div>
            <div className="absolute -right-8 -top-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <Icon size={180} className={theme.color} />
            </div>

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
                        {/* Jauge Prod */}
                        <div className="h-1 w-full bg-slate-800 rounded-full mt-1 overflow-hidden">
                            <div className={`h-full ${theme.color.replace('text-', 'bg-')} opacity-80`} style={{ width: '100%' }}></div>
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
                     <span className="flex items-center gap-2 relative z-10 animate-pulse text-cyan-400">
                       <Timer size={14} className="animate-spin" /> En cours {timeLeft}s
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

              return (
                <Card
                  key={slot.slot_number}
                  className={`relative overflow-hidden transition-all duration-300 ${
                    slot.is_active
                      ? `border ${slotBorder} ${slotBg} shadow-lg`
                      : 'border border-slate-700/50 bg-slate-900/30 opacity-50'
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
                        onClick={() => handleToggleActive(slot.slot_number)}
                        className={`h-8 w-8 p-0 ${
                          slot.is_active ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'
                        }`}
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

                    {/* Bonus indicator */}
                    {slot.is_active && (
                      <div className="mt-3 text-center">
                        <span className={`text-lg font-black font-mono ${slotColor}`}>+50%</span>
                        <p className="text-[9px] text-slate-500 uppercase">Bonus {resInfo?.label}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}