import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Rocket, Shield, Info, Lock, CheckCircle2, XCircle, Timer,
  Hammer, Crosshair, Truck, Box, Zap, Scan, Sword, Warehouse, ShieldCheck
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
import { GameImage } from '@/components/ui/game-image';
import { getShipImage } from '@/lib/images';
import { getTechLevel, getBuildingLevel } from '@/utils/techTreeCompat';
import { formatDuration } from '@/lib/utils';

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
    OFFENSIF:       { color: "text-red-500",     border: "border-red-500/50",     gradient: "from-[rgba(10,5,32,0.85)] to-red-950/20"     },
    LOGISTIQUE:     { color: "text-emerald-400",  border: "border-emerald-500/50", gradient: "from-[rgba(10,5,32,0.85)] to-emerald-950/20"  },
    RENSEIGNEMENT:  { color: "text-purple-400",   border: "border-purple-500/50",  gradient: "from-[rgba(10,5,32,0.85)] to-purple-950/20"   },
    UTILITAIRE:     { color: "text-amber-400",    border: "border-amber-500/50",   gradient: "from-[rgba(10,5,32,0.85)] to-amber-950/20"    }
  };
  return themes[type] || themes.OFFENSIF;
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } }
};
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

// TODO: callbacks onUpdate passé en prop — le wrapper parent devrait useCallback pour éviter
// les re-renders du memo en cas de recréation de la fonction à chaque render parent.
const Shipyard = React.memo(function Shipyard({ planet, onUpdate }: ShipyardProps) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [shipTypes, setShipTypes] = useState<ShipTypeInfo[]>([]);
  const [buildQueue, setBuildQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShipTypes = async () => {
      const token = localStorage.getItem('token');
      try {
        const [shipsRes, queueRes] = await Promise.all([
           fetch(apiUrl(`/planets/${planet.id}/ship-types`), { headers: { 'Authorization': `Bearer ${token}` } }),
           fetch(apiUrl(`/planets/${planet.id}/build-queue`), { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (shipsRes.ok) {
          const data = await shipsRes.json();
          setShipTypes(data.ship_types || []);
        }
        if (queueRes.ok) {
          const queueData = await queueRes.json();
          setBuildQueue(queueData.queue || []);
        }
      } catch (e) {
        console.error("Failed to fetch ship types & queue:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchShipTypes();
  }, [planet.id]);

  // --- CALCULS TECHNOLOGIQUES ---
  // weapons_tech: +10% attaque par niveau (source: combat.rs)
  // shield_tech:  +10% bouclier par niveau (source: combat.rs)
  // armour_tech:  +10% coque par niveau (source: combat.rs)
  const bonusAtk  = 1 + ((getTechLevel(planet, 'weapons_tech')) * 0.1);
  const bonusShd  = 1 + ((getTechLevel(planet, 'shield_tech'))  * 0.1);
  const bonusHull = 1 + ((getTechLevel(planet, 'armour_tech'))  * 0.1);

  // Calculate current fleet from dynamic ship types data
  const currentFleet = shipTypes.reduce((total, ship) => total + ship.current_count, 0);
  const maxFleet = planet.fleet_capacity ?? (500 + (getBuildingLevel(planet, 'hangar') * 500));
  const capacityPercent = Math.min(100, (currentFleet / maxFleet) * 100);
  const isFull = currentFleet >= maxFleet;
  const remainingSpace = Math.max(0, maxFleet - currentFleet);

  // Map ship_key to icon and type
  const getShipIcon = (ship_key: string) => {
    const iconMap: Record<string, any> = {
      light_hunter: Crosshair,
      heavy_hunter: Scan,
      cruiser:      Shield,
      battleship:   ShieldCheck,
      bomber:       Zap,
      destroyer:    Sword,
      transporter:  Truck,
      colony_ship:  Rocket,
      recycler:     Hammer,
      spy_probe:    Info,
      deathstar:    ShieldCheck,
    };
    return iconMap[ship_key] || Rocket;
  };

  const getShipCategory = (ship_key: string): string => {
    if (['light_hunter', 'heavy_hunter', 'cruiser', 'battleship', 'bomber', 'destroyer'].includes(ship_key)) return 'OFFENSIF';
    if (['transporter', 'colony_ship'].includes(ship_key)) return 'LOGISTIQUE';
    if (['spy_probe'].includes(ship_key)) return 'RENSEIGNEMENT';
    return 'UTILITAIRE';
  };

  const getShipClass = (ship_key: string): string => {
    const classMap: Record<string, string> = {
      light_hunter: 'Intercepteur',
      heavy_hunter: 'Chasseur Lourd',
      cruiser:      'Frégate Lourde',
      battleship:   'Vaisseau de Ligne',
      bomber:       'Bombardier',
      destroyer:    'Destroyer',
      transporter:  'Cargo Standard',
      colony_ship:  'Module Arche',
      recycler:     'Collecteur',
      spy_probe:    'Drone Furtif',
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
        if (res.ok) {
            const shipInfo = shipTypes.find(s => s.ship_key === type);
            toast.success(`Production lancée : ${shipInfo?.display_name || type}`);
            onUpdate();
            setQty({ ...qty, [type]: 0 });
        } else if (res.status === 409) {
            // Slot full → add to pending queue
            const qRes = await fetch(apiUrl(`/planets/${planet.id}/build-queue`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: 'ships', item_key: type, quantity: amount }),
            });
            if (qRes.ok) {
                const shipInfo = shipTypes.find(s => s.ship_key === type);
                toast.success(`En file d'attente : ${shipInfo?.display_name || type}`);
                onUpdate();
                setQty({ ...qty, [type]: 0 });
            } else {
                const err = await qRes.json();
                toast.error(err.error || "Erreur");
            }
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
      <Card className="bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 backdrop-blur-[12px] relative overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-500 card-depth animate-fade-in">
         <div className="absolute inset-0 bg-gradient-to-r from-orange-900/10 to-transparent"></div>
         <div className="absolute top-0 inset-x-0 h-px bg-orange-500/20 opacity-50 hover:opacity-100 transition-all duration-300 animate-shine"></div>
         <CardContent className="p-4 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg border ${isFull ? 'border-red-500 bg-red-900/20 text-red-500' : 'border-orange-500/30 bg-orange-900/20 text-orange-400'}`}>
                    <Warehouse size={24} />
                </div>
                <div>
                    <h3 className="text-sm font-black uppercase text-slate-200 tracking-widest">Capacité Hangar</h3>
                    <p className="text-xs text-slate-400">Niveau {getBuildingLevel(planet, 'hangar')} ({maxFleet} slots)</p>
                </div>
            </div>
            <div className="flex-1 mx-8">
                <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                    <span className={isFull ? "text-red-500 animate-pulse" : "text-slate-400"}>{isFull ? "SATURATION" : "Occupation"}</span>
                    <span className="text-slate-200">{currentFleet.toLocaleString()} <span className="text-slate-500">/ {maxFleet.toLocaleString()}</span></span>
                </div>
                <Progress variant={isFull ? "danger" : "metal"} value={capacityPercent} />
            </div>
         </CardContent>
      </Card>

      {/* Section header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
        <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
        <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">VAISSEAUX DISPONIBLES</span>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      >
      {shipTypes.map((ship) => {
        const shipIcon = getShipIcon(ship.ship_key);
        const shipCategory = getShipCategory(ship.ship_key);
        const shipClass = getShipClass(ship.ship_key);

        const locked = ship.requirements.some(req => !req.met);
        const theme = getShipTheme(shipCategory);
        const canAfford = planet.metal_amount >= ship.cost_metal && planet.crystal_amount >= ship.cost_crystal;

        const maxMetal    = ship.cost_metal   > 0 ? Math.floor(planet.metal_amount   / ship.cost_metal)   : Infinity;
        const maxCrystal  = ship.cost_crystal > 0 ? Math.floor(planet.crystal_amount / ship.cost_crystal) : Infinity;
        const maxBuildable = Math.min(maxMetal, maxCrystal, remainingSpace);

        const ShipIcon = shipIcon;

        return (
          <motion.div key={ship.id} variants={item}>
          <Card className={`relative overflow-hidden border-t-4 h-full ${locked ? 'border-cyan-500/10 bg-[rgba(10,5,32,0.85)] opacity-50 cursor-not-allowed' : `${theme.border} bg-gradient-to-b ${theme.gradient}`} shadow-2xl group transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/30 hover:bg-cyan-500/5 hover:shadow-[0_0_15px_rgba(0,245,255,0.1)] backdrop-blur-[12px] card-depth card-depth-hover animate-slide-up`}>
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
              {/* Image du vaisseau (ou hologramme si en construction) */}
              <div className="relative mb-4 h-40 w-full rounded-xl overflow-hidden group/hologram cursor-crosshair">
                 <GameImage
                   src={getShipImage(ship.ship_key)}
                   alt={ship.display_name}
                   className={`w-full h-full object-cover transition-all duration-700 ${buildQueue.some(q => q.item_key === ship.ship_key && q.category === 'ships') ? 'opacity-30 saturate-0 brightness-150' : 'group-hover/hologram:scale-110'}`}
                   fallbackIcon={<ShipIcon className={`${theme.color} w-20 h-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`} />}
                   loading="lazy"
                 />

                 {/* Holographic Assembly Overlay */}
                 {buildQueue.some(q => q.item_key === ship.ship_key && q.category === 'ships') && (() => {
                     const buildingItem = buildQueue.find(q => q.item_key === ship.ship_key && q.category === 'ships');
                     return (
                         <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-cyan-950/40 backdrop-blur-[2px]">
                            {/* Scanning beam animation */}
                            <div className="absolute top-0 inset-x-0 h-1 bg-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,1)] animate-scan"></div>

                            {/* Grid background */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.1)_1px,transparent_1px)] bg-[size:10px_10px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_40%,transparent_100%)]"></div>

                            <div className="relative p-3 rounded-full border border-cyan-500/50 bg-black/50 shadow-[0_0_30px_rgba(34,211,238,0.2)] mb-2 animate-pulse">
                               <Hammer size={24} className="text-cyan-400" />
                            </div>

                            <div className="text-center relative z-10">
                                <span className="text-[10px] uppercase font-black tracking-widest text-cyan-400 bg-black/60 px-2 py-0.5 rounded border border-cyan-500/30">
                                  ASSEMBLAGE: {buildingItem.quantity}
                                </span>
                                <div className="text-[9px] font-mono text-cyan-200/70 mt-1 uppercase tracking-wider animate-pulse">
                                  CALIBRATION MATRICE...
                                </div>
                            </div>
                         </div>
                     );
                 })()}
              </div>

              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4 items-center">
                   <div className={`p-3 rounded-xl border ${theme.border} bg-black/40 shadow-lg group-hover:scale-105 transition-transform`}>
                     <ShipIcon className={theme.color} size={24} />
                   </div>
                   <div>
                      <div className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.color} mb-1 flex items-center gap-1`}><Zap size={10} /> {shipCategory}</div>
                      <h3 className="text-lg font-black uppercase text-slate-200 leading-none">{ship.display_name}</h3>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 tracking-wider">CLASSE: {shipClass}</p>
                   </div>
                </div>
                <div className="text-right bg-black/30 px-2 py-1 rounded border border-cyan-500/10">
                    <span className="text-xl font-mono font-black text-slate-200">{ship.current_count.toLocaleString()}</span>
                    <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">En Stock</p>
                </div>
              </div>

              {/* STATS DE COMBAT RÉELLES */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-4">
                 <StatBox icon={Sword}       label="ATK"  value={Math.floor(ship.attack  * bonusAtk)}  color="text-red-400"     />
                 <StatBox icon={Shield}      label="SHD"  value={Math.floor(ship.shield  * bonusShd)}  color="text-cyan-400"    />
                 <StatBox icon={ShieldCheck} label="HULL" value={Math.floor(ship.hull    * bonusHull)} color="text-emerald-400" />
                 <StatBox icon={Box}         label="CAP"  value={ship.cargo_capacity}                  color="text-amber-400"   />
              </div>

              {/* Coûts dynamiques selon quantité */}
              <div className="space-y-2 mb-3">
                <div className={`flex justify-between items-center px-2 py-1.5 rounded bg-black/40 border ${planet.metal_amount >= ship.cost_metal * (qty[ship.ship_key] || 1) ? 'border-cyan-500/10' : 'border-red-900/50'}`}>
                   <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-2">
                     <Box size={10} /> Métal
                   </span>
                   <div className="flex flex-col items-end">
                     <span className={`text-sm font-mono font-black tabular-nums ${planet.metal_amount >= ship.cost_metal * (qty[ship.ship_key] || 1) ? 'text-orange-400' : 'text-red-500'}`}>
                       {(ship.cost_metal * (qty[ship.ship_key] || 1)).toLocaleString()}
                     </span>
                     {(qty[ship.ship_key] || 0) > 1 && (
                       <span className="text-[10px] text-slate-400 font-mono tabular-nums font-bold">
                         {ship.cost_metal.toLocaleString()} × {qty[ship.ship_key]}
                       </span>
                     )}
                   </div>
                </div>
                <div className={`flex justify-between items-center px-2 py-1.5 rounded bg-black/40 border ${planet.crystal_amount >= ship.cost_crystal * (qty[ship.ship_key] || 1) ? 'border-cyan-500/10' : 'border-red-900/50'}`}>
                   <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-2">
                     <Box size={10} /> Cristal
                   </span>
                   <div className="flex flex-col items-end">
                     <span className={`text-sm font-mono font-black tabular-nums ${planet.crystal_amount >= ship.cost_crystal * (qty[ship.ship_key] || 1) ? 'text-cyan-400' : 'text-red-500'}`}>
                       {(ship.cost_crystal * (qty[ship.ship_key] || 1)).toLocaleString()}
                     </span>
                     {(qty[ship.ship_key] || 0) > 1 && (
                       <span className="text-[10px] text-slate-400 font-mono tabular-nums font-bold">
                         {ship.cost_crystal.toLocaleString()} × {qty[ship.ship_key]}
                       </span>
                     )}
                   </div>
                </div>
                {/* Temps de production */}
                {(qty[ship.ship_key] || 0) > 0 && (
                  <div className="flex justify-between items-center px-2 py-1.5 rounded bg-black/40 border border-cyan-500/10">
                    <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-2">
                      <Timer size={10} /> Durée
                    </span>
                    <span className="text-sm font-mono font-black tabular-nums text-cyan-400">
                      {formatDuration(ship.build_time_seconds * (qty[ship.ship_key] || 1))}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-auto">
                <div className="flex justify-between text-[10px] mb-1 px-1">
                   <span className="text-slate-500 uppercase font-bold">Production</span>
                   <button onClick={() => !locked && !isFull && setQty({...qty, [ship.ship_key]: maxBuildable})} className={`uppercase font-bold tracking-wider hover:text-slate-200 transition-colors ${maxBuildable > 0 ? 'text-cyan-400 cursor-pointer' : 'text-slate-600 cursor-not-allowed'}`}>Max: {maxBuildable.toLocaleString()}</button>
                </div>
                <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max={maxBuildable}
                      value={qty[ship.ship_key] || ''}
                      placeholder="0"
                      className="w-20 bg-black/50 border border-cyan-500/10 rounded-lg text-center text-slate-200 text-sm font-bold focus:outline-none focus:border-cyan-500/30 transition-colors"
                      onChange={(e) => setQty({...qty, [ship.ship_key]: parseInt(e.target.value)})}
                      onFocus={(e) => e.target.select()}
                      disabled={locked || isFull}
                    />
                    <Button
                      onClick={() => buildShip(ship.ship_key)}
                      disabled={locked || !canAfford || (qty[ship.ship_key] || 0) <= 0 || isFull}
                      className={`flex-1 h-10 font-black uppercase text-[10px] tracking-[0.2em] transition-all duration-200 rounded-lg relative overflow-hidden group/btn ${
                        isFull
                          ? 'bg-red-950/20 text-red-500 border border-red-900/40 cursor-not-allowed'
                          : !canAfford
                            ? 'bg-red-950/20 text-red-500 border border-red-900/40 cursor-not-allowed'
                            : `bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(0,245,255,0.1)]`
                      }`}
                    >
                        {isFull ? (
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
          </motion.div>
        );
      })}
      </motion.div>
    </div>
  );
});

export default Shipyard;

function StatBox({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) {
    return (
        <div className="flex flex-col items-center bg-black/40 border border-cyan-500/10 rounded py-1.5">
            <span className={`text-[7px] font-black uppercase ${color} flex items-center gap-0.5 mb-0.5`}><Icon size={8} /> {label}</span>
            <span className="text-[10px] font-mono font-bold text-slate-200">{value.toLocaleString()}</span>
        </div>
    )
}
