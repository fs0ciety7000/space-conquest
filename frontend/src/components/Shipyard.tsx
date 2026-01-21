import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Rocket, Shield, Info, Lock, CheckCircle2, XCircle, Timer,
  Hammer, Crosshair, Truck, Box, Zap, Scan, Sword, Warehouse, ShieldCheck
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
import { GameImage } from '@/components/ui/game-image';
import { getShipImage } from '@/lib/images';
import { getTechLevel } from '@/utils/techTreeCompat';

interface ShipRequirement {
  requirement_type: string;
  tech_key?: string;
  tech_name?: string;
  building_name?: string;
  required_level: number;
  current_level: number;
  met: boolean;
}

interface ShipTypeInfo {
  id: number;
  ship_key: string;
  display_name: string;
  description: string | null;
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
  current_count: number;
  requirements: ShipRequirement[];
}

interface ShipyardProps {
  planet: any;
  onUpdate: () => void;
}

const getShipTheme = (type: string) => {
  const themes: Record<string, any> = {
    OFFENSIF: { color: "text-red-500", border: "border-red-500/50", gradient: "from-slate-950 to-red-950/20" },
    LOGISTIQUE: { color: "text-emerald-400", border: "border-emerald-500/50", gradient: "from-slate-950 to-emerald-950/20" },
    RENSEIGNEMENT: { color: "text-purple-400", border: "border-purple-500/50", gradient: "from-slate-950 to-purple-950/20" },
    UTILITAIRE: { color: "text-amber-400", border: "border-amber-500/50", gradient: "from-slate-950 to-amber-950/20" }
  };
  return themes[type] || themes.OFFENSIF;
};

export default function Shipyard({ planet, onUpdate }: ShipyardProps) {
  const [now, setNow] = useState(new Date().getTime());
  const [qty, setQty] = useState<Record<string, number>>({});
  const [shipTypes, setShipTypes] = useState<ShipTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date().getTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchShipTypes = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(apiUrl(`/planets/${planet.id}/ship-types`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setShipTypes(data.ship_types || []);
        }
      } catch (e) {
        console.error("Failed to fetch ship types:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchShipTypes();
  }, [planet.id]);

  // --- CALCULS TECHNOLOGIQUES ---
  const bonusAtk = 1 + ((getTechLevel(planet, 'laser_tech')) * 0.1);
  const bonusShd = 1 + ((getTechLevel(planet, 'energy_tech')) * 0.1);
  const bonusHull = 1 + ((getTechLevel(planet, 'armour_tech')) * 0.1);

  // Calculate current fleet from dynamic ship types data
  const currentFleet = shipTypes.reduce((total, ship) => total + ship.current_count, 0);
  const maxFleet = 500 + ((planet.hangar_level || 0) * 500);
  const capacityPercent = Math.min(100, (currentFleet / maxFleet) * 100);
  const isFull = currentFleet >= maxFleet;
  const remainingSpace = Math.max(0, maxFleet - currentFleet);

  const queue = planet.constructions || [];
  const shipBuilds = planet.ship_builds || [];
  const isQueueFull = queue.length + shipBuilds.length >= 3;

  // Map ship_key to icon and type
  const getShipIcon = (ship_key: string) => {
    const iconMap: Record<string, any> = {
      light_hunter: Crosshair,
      heavy_hunter: Scan,
      cruiser: Shield,
      battleship: ShieldCheck,
      bomber: Zap,
      destroyer: Sword,
      transporter: Truck,
      colony_ship: Rocket,
      recycler: Hammer,
      spy_probe: Info,
    };
    return iconMap[ship_key] || Rocket;
  };

  const getShipCategory = (ship_key: string): string => {
    if (['light_hunter', 'heavy_hunter', 'cruiser', 'battleship', 'bomber', 'destroyer'].includes(ship_key)) {
      return 'OFFENSIF';
    }
    if (['transporter', 'colony_ship'].includes(ship_key)) {
      return 'LOGISTIQUE';
    }
    if (['spy_probe'].includes(ship_key)) {
      return 'RENSEIGNEMENT';
    }
    return 'UTILITAIRE';
  };

  const getShipClass = (ship_key: string): string => {
    const classMap: Record<string, string> = {
      light_hunter: 'Intercepteur',
      heavy_hunter: 'Chasseur Lourd',
      cruiser: 'Frégate Lourde',
      battleship: 'Vaisseau de Ligne',
      bomber: 'Bombardier',
      destroyer: 'Destroyer',
      transporter: 'Cargo Standard',
      colony_ship: 'Module Arche',
      recycler: 'Collecteur',
      spy_probe: 'Drone Furtif',
    };
    return classMap[ship_key] || 'Vaisseau';
  };

  const buildShip = async (type: string) => {
    const amount = qty[type] || 1;
    if (amount > remainingSpace) { toast.error("Capacité insuffisante !"); return; }
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(apiUrl(`/planets/${planet.id}/build-ships/${type}/${amount}`), {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(res.ok) {
            const shipInfo = shipTypes.find(s => s.ship_key === type);
            toast.success(`Production lancée : ${shipInfo?.display_name || type}`);
            onUpdate();
            setQty({ ...qty, [type]: 0 });
        } else {
            const err = await res.json();
            toast.error(err.error || "Erreur");
        }
    } catch(e) { console.error(e); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse">Chargement du chantier spatial...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Jauge Hangar */}
      <Card className="bg-slate-950 border border-white/10 relative overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 card-depth animate-fade-in">
         <div className="absolute inset-0 bg-gradient-to-r from-orange-900/10 to-transparent"></div>
         <div className="absolute top-0 inset-x-0 h-px bg-orange-500/20 opacity-50 hover:opacity-100 transition-all duration-300 animate-shine"></div>
         <CardContent className="p-4 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg border ${isFull ? 'border-red-500 bg-red-900/20 text-red-500' : 'border-orange-500/30 bg-orange-900/20 text-orange-400'}`}>
                    <Warehouse size={24} />
                </div>
                <div>
                    <h3 className="text-sm font-black uppercase text-white tracking-widest">Capacité Hangar</h3>
                    <p className="text-xs text-slate-400">Niveau {planet.hangar_level || 0} ({maxFleet} slots)</p>
                </div>
            </div>
            <div className="flex-1 mx-8">
                <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                    <span className={isFull ? "text-red-500 animate-pulse" : "text-slate-400"}>{isFull ? "SATURATION" : "Occupation"}</span>
                    <span className="text-white">{currentFleet.toLocaleString()} <span className="text-slate-500">/ {maxFleet.toLocaleString()}</span></span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${isFull ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`} style={{ width: `${capacityPercent}%` }}></div>
                </div>
            </div>
         </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {shipTypes.map((ship) => {
        const shipIcon = getShipIcon(ship.ship_key);
        const shipCategory = getShipCategory(ship.ship_key);
        const shipClass = getShipClass(ship.ship_key);

        // Check if requirements are met
        const locked = ship.requirements.some(req => !req.met);

        const theme = getShipTheme(shipCategory);
        const canAfford = planet.metal_amount >= ship.cost_metal && planet.crystal_amount >= ship.cost_crystal;

        const activeItem = shipBuilds.find((sb: any) => sb.ship_key === ship.ship_key);
        // Ensure build_end_time is treated as UTC
        const buildEndTime = activeItem?.build_end_time ?
          (activeItem.build_end_time.endsWith('Z') ? activeItem.build_end_time : activeItem.build_end_time + 'Z') : null;
        const timeLeft = buildEndTime ? Math.max(0, Math.floor((new Date(buildEndTime).getTime() - now) / 1000)) : null;

        const maxMetal = ship.cost_metal > 0 ? Math.floor(planet.metal_amount / ship.cost_metal) : Infinity;
        const maxCrystal = ship.cost_crystal > 0 ? Math.floor(planet.crystal_amount / ship.cost_crystal) : Infinity;
        const maxBuildable = Math.min(maxMetal, maxCrystal, remainingSpace);

        const ShipIcon = shipIcon;

        return (
          <Card key={ship.id} className={`relative overflow-hidden border-t-4 ${locked ? 'border-slate-800 bg-black/60' : `${theme.border} bg-gradient-to-b ${theme.gradient}`} shadow-2xl group transition-all duration-500 hover:-translate-y-2 hover:shadow-3xl hover-scale card-depth card-depth-hover animate-slide-up`}>
            {locked && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-6 text-center border border-red-900/30">
                    <div className="bg-red-950/30 p-3 rounded-full border border-red-900 mb-4 animate-pulse"><Lock size={24} className="text-red-500" /></div>
                    <h3 className="text-red-500 font-black uppercase tracking-widest text-sm mb-4">Schéma Verrouillé</h3>
                    <div className="space-y-2 w-full max-w-[200px]">
                        {ship.requirements.map((req, i) => {
                          const label = req.requirement_type === 'tech'
                            ? `${req.tech_name} (Nv.${req.required_level})`
                            : `${req.building_name} (Nv.${req.required_level})`;
                          return (
                            <div key={i} className="flex justify-between items-center text-[10px] font-mono border-b border-white/5 pb-1">
                                <span className={req.met ? "text-slate-400" : "text-red-400 font-bold"}>
                                  {label} [{req.current_level}/{req.required_level}]
                                </span>
                                {req.met ? <CheckCircle2 size={10} className="text-green-500"/> : <XCircle size={10} className="text-red-500"/>}
                            </div>
                          );
                        })}
                    </div>
                </div>
            )}

            <CardContent className="p-5 relative z-10 flex flex-col h-full">
              {/* Image du vaisseau */}
              <GameImage
                src={getShipImage(ship.ship_key)}
                alt={ship.display_name}
                className="w-full h-40 mb-4"
                fallbackIcon={<ShipIcon className={`${theme.color} w-20 h-20`} />}
                loading="lazy"
              />

              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4 items-center">
                   <div className={`p-3 rounded-xl border ${theme.border} bg-black/40 shadow-lg group-hover:scale-105 transition-transform`}>
                     <ShipIcon className={theme.color} size={24} />
                   </div>
                   <div>
                      <div className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.color} mb-1 flex items-center gap-1`}><Zap size={10} /> {shipCategory}</div>
                      <h3 className="text-lg font-black uppercase text-white leading-none">{ship.display_name}</h3>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 tracking-wider">CLASSE: {shipClass}</p>
                   </div>
                </div>
                <div className="text-right bg-black/30 px-2 py-1 rounded border border-white/5">
                    <span className="text-xl font-mono font-black text-white">{ship.current_count.toLocaleString()}</span>
                    <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">En Stock</p>
                </div>
              </div>

              {/* STATS DE COMBAT RÉELLES */}
              <div className="grid grid-cols-4 gap-1.5 mb-4">
                 <StatBox icon={Sword} label="ATK" value={Math.floor(ship.attack * bonusAtk)} color="text-red-400" />
                 <StatBox icon={Shield} label="SHD" value={Math.floor(ship.shield * bonusShd)} color="text-cyan-400" />
                 <StatBox icon={ShieldCheck} label="HULL" value={Math.floor(ship.hull * bonusHull)} color="text-emerald-400" />
                 <StatBox icon={Box} label="CAP" value={ship.cargo_capacity} color="text-amber-400" />
              </div>

{/* Coûts dynamiques selon quantité */}
<div className="space-y-2 mb-4">
  <div className={`flex justify-between items-center px-2 py-1.5 rounded bg-black/40 border ${planet.metal_amount >= ship.cost_metal * (qty[ship.ship_key] || 1) ? 'border-white/5' : 'border-red-900/50'}`}>
     <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-2">
       <Box size={10} /> Métal
     </span>
     <div className="flex flex-col items-end">
       <span className={`text-sm font-mono font-black ${planet.metal_amount >= ship.cost_metal * (qty[ship.ship_key] || 1) ? 'text-white' : 'text-red-500'}`}>
         {(ship.cost_metal * (qty[ship.ship_key] || 1)).toLocaleString()}
       </span>
       {(qty[ship.ship_key] || 0) > 1 && (
         <span className="text-[10px] text-slate-400 font-mono font-bold">
           {ship.cost_metal.toLocaleString()} × {qty[ship.ship_key]}
         </span>
       )}
     </div>
  </div>
  <div className={`flex justify-between items-center px-2 py-1.5 rounded bg-black/40 border ${planet.crystal_amount >= ship.cost_crystal * (qty[ship.ship_key] || 1) ? 'border-white/5' : 'border-red-900/50'}`}>
     <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-2">
       <Box size={10} /> Cristal
     </span>
     <div className="flex flex-col items-end">
       <span className={`text-sm font-mono font-black ${planet.crystal_amount >= ship.cost_crystal * (qty[ship.ship_key] || 1) ? 'text-white' : 'text-red-500'}`}>
         {(ship.cost_crystal * (qty[ship.ship_key] || 1)).toLocaleString()}
       </span>
       {(qty[ship.ship_key] || 0) > 1 && (
         <span className="text-[10px] text-slate-400 font-mono font-bold">
           {ship.cost_crystal.toLocaleString()} × {qty[ship.ship_key]}
         </span>
       )}
     </div>
  </div>
</div>



              <div className="mt-auto">
                <div className="flex justify-between text-[10px] mb-1 px-1">
                   <span className="text-slate-500 uppercase font-bold">Production</span>
                   <button onClick={() => !locked && !isQueueFull && !isFull && setQty({...qty, [ship.ship_key]: maxBuildable})} className={`uppercase font-bold tracking-wider hover:text-white transition-colors ${maxBuildable > 0 ? 'text-indigo-400 cursor-pointer' : 'text-slate-600 cursor-not-allowed'}`}>Max: {maxBuildable.toLocaleString()}</button>
                </div>
                <div className="flex gap-2">
                    <input type="number" min="1" max={maxBuildable} value={qty[ship.ship_key] || ''} placeholder="0" className="w-20 bg-black/50 border border-white/10 rounded-lg text-center text-white text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors" onChange={(e) => setQty({...qty, [ship.ship_key]: parseInt(e.target.value)})} disabled={locked || isQueueFull || isFull} />
                    <Button onClick={() => buildShip(ship.ship_key)} disabled={locked || isQueueFull || !canAfford || (qty[ship.ship_key] || 0) <= 0 || isFull} className={`flex-1 h-10 font-black uppercase text-[10px] tracking-[0.2em] transition-all rounded-lg relative overflow-hidden group/btn ${isQueueFull ? 'bg-slate-800 text-slate-500 border border-slate-700' : isFull ? 'bg-red-950/20 text-red-500 border border-red-900/40 cursor-not-allowed' : !canAfford ? 'bg-red-950/20 text-red-500 border border-red-900/40 cursor-not-allowed' : `bg-black hover:bg-slate-900 text-white border ${theme.border} hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]`}`}>
                        {activeItem ? (
                             <span className="flex items-center gap-2 relative z-10 text-orange-300">
                                <Timer size={14} className="animate-spin" /> En cours ({timeLeft}s)
                             </span>
                        ) : isQueueFull ? (
                            <span className="relative z-10">File Pleine</span>
                        ) : isFull ? (
                            <span className="relative z-10">Hangar Saturé</span>
                        ) : !canAfford ? (
                            <span className="relative z-10">Manque Ress.</span>
                        ) : (
                            <span className="flex items-center gap-2 relative z-10"><Hammer size={14} /> Produire</span>
                        )}
                    </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) {
    return (
        <div className="flex flex-col items-center bg-black/40 border border-white/5 rounded py-1.5">
            <span className={`text-[7px] font-black uppercase ${color} flex items-center gap-0.5 mb-0.5`}><Icon size={8} /> {label}</span>
            <span className="text-[10px] font-mono font-bold text-white">{value.toLocaleString()}</span>
        </div>
    )
}
