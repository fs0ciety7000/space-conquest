import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Rocket, Shield, Info, Lock, CheckCircle2, XCircle, Timer, 
  Hammer, Crosshair, Truck, Box, Zap, Scan, Sword, Warehouse, ShieldCheck 
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { checkPrerequisites } from "@/lib/gameRules";

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

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date().getTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  // --- CALCULS TECHNOLOGIQUES ---
  const bonusAtk = 1 + ((planet.laser_battery_level || 0) * 0.1);
  const bonusShd = 1 + ((planet.energy_tech_level || 0) * 0.1);
  const bonusHull = 1 + ((planet.armour_tech_level || 0) * 0.1);

  const currentFleet = (planet.light_hunter_count||0) + (planet.cruiser_count||0) + (planet.transporter_count||0) + (planet.colony_ship_count||0) + (planet.recycler_count||0) + (planet.spy_probe_count||0);
  const maxFleet = 500 + ((planet.hangar_level || 0) * 500);
  const capacityPercent = Math.min(100, (currentFleet / maxFleet) * 100);
  const isFull = currentFleet >= maxFleet;
  const remainingSpace = Math.max(0, maxFleet - currentFleet);

  const queue = planet.constructions || [];
  const isQueueFull = queue.length >= 3;

  const fleet = [
    { id: 'light_hunter', name: 'Chasseur Léger', cost: { m: 3000, c: 1000 }, stats: { atk: 50, shd: 10, hull: 400, fret: 50 }, icon: Crosshair, type: 'OFFENSIF', class: 'Intercepteur', desc: "Vaisseau d'attaque rapide." },
    { id: 'cruiser', name: 'Croiseur', cost: { m: 20000, c: 7000 }, stats: { atk: 400, shd: 50, hull: 2700, fret: 800 }, icon: Shield, type: 'OFFENSIF', class: 'Frégate Lourde', desc: "Blindé, tueur de chasseurs." },
    { id: 'transporter', name: 'Transporteur', cost: { m: 4000, c: 2000 }, stats: { atk: 5, shd: 5, hull: 800, fret: 5000 }, icon: Truck, type: 'LOGISTIQUE', class: 'Cargo Standard', desc: "Indispensable pour le fret." },
    { id: 'colony_ship', name: 'Vaisseau Colon', cost: { m: 10000, c: 20000 }, stats: { atk: 50, shd: 100, hull: 3000, fret: 7500 }, icon: Rocket, type: 'LOGISTIQUE', class: 'Module Arche', desc: "Fonde de nouvelles colonies." },
    { id: 'recycler', name: 'Recycleur', cost: { m: 10000, c: 6000 }, stats: { atk: 1, shd: 10, hull: 1600, fret: 20000 }, icon: Hammer, type: 'UTILITAIRE', class: 'Collecteur', desc: "Récolte les débris spatiaux." },
    { id: 'spy_probe', name: 'Sonde Espion', cost: { m: 0, c: 1000 }, stats: { atk: 0.1, shd: 0.1, hull: 100, fret: 5 }, icon: Info, type: 'RENSEIGNEMENT', class: 'Drone Furtif', desc: "Scanner longue portée." },
  ];

  const buildShip = async (type: string) => {
    const amount = qty[type] || 1;
    if (amount > remainingSpace) { toast.error("Capacité insuffisante !"); return; }
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`http://localhost:8080/planets/${planet.id}/build-fleet/${type}/${amount}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(res.ok) {
            toast.success("Production lancée");
            onUpdate();
            setQty({ ...qty, [type]: 0 });
        } else {
            const err = await res.json();
            toast.error(err.error || "Erreur");
        }
    } catch(e) { console.error(e); }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Jauge Hangar */}
      <Card className="bg-slate-950 border border-white/10 relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-r from-orange-900/10 to-transparent"></div>
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
      {fleet.map((ship) => {
        const { locked, requirements } = checkPrerequisites(planet, ship.id);
        const theme = getShipTheme(ship.type);
        const canAfford = planet.metal_amount >= ship.cost.m && planet.crystal_amount >= ship.cost.c;
        const currentAmount = planet[`${ship.id}_count`] || 0;
        
        const activeItem = queue.find((q: any) => q.building_type === ship.id);
        const timeLeft = activeItem ? Math.max(0, Math.floor((new Date(activeItem.end_time + "Z").getTime() - now) / 1000)) : null;

        const maxMetal = ship.cost.m > 0 ? Math.floor(planet.metal_amount / ship.cost.m) : Infinity;
        const maxCrystal = ship.cost.c > 0 ? Math.floor(planet.crystal_amount / ship.cost.c) : Infinity;
        const maxBuildable = Math.min(maxMetal, maxCrystal, remainingSpace);

        return (
          <Card key={ship.id} className={`relative overflow-hidden border-t-4 ${locked ? 'border-slate-800 bg-black/60' : `${theme.border} bg-gradient-to-b ${theme.gradient}`} shadow-2xl group transition-all duration-300`}>
            {locked && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-6 text-center border border-red-900/30">
                    <div className="bg-red-950/30 p-3 rounded-full border border-red-900 mb-4 animate-pulse"><Lock size={24} className="text-red-500" /></div>
                    <h3 className="text-red-500 font-black uppercase tracking-widest text-sm mb-4">Schéma Verrouillé</h3>
                    <div className="space-y-2 w-full max-w-[200px]">
                        {requirements.map((req, i) => (
                            <div key={i} className="flex justify-between items-center text-[10px] font-mono border-b border-white/5 pb-1">
                                <span className={req.met ? "text-slate-400" : "text-red-400 font-bold"}>{req.label}</span>
                                {req.met ? <CheckCircle2 size={10} className="text-green-500"/> : <XCircle size={10} className="text-red-500"/>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <CardContent className="p-5 relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4 items-center">
                   <div className={`p-3 rounded-xl border ${theme.border} bg-black/40 shadow-lg group-hover:scale-105 transition-transform`}>
                     <ship.icon className={theme.color} size={24} />
                   </div>
                   <div>
                      <div className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.color} mb-1 flex items-center gap-1`}><Zap size={10} /> {ship.type}</div>
                      <h3 className="text-lg font-black uppercase text-white leading-none">{ship.name}</h3>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 tracking-wider">CLASSE: {ship.class}</p>
                   </div>
                </div>
                <div className="text-right bg-black/30 px-2 py-1 rounded border border-white/5">
                    <span className="text-xl font-mono font-black text-white">{currentAmount.toLocaleString()}</span>
                    <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">En Stock</p>
                </div>
              </div>

              {/* STATS DE COMBAT RÉELLES */}
              <div className="grid grid-cols-4 gap-1.5 mb-4">
                 <StatBox icon={Sword} label="ATK" value={Math.floor(ship.stats.atk * bonusAtk)} color="text-red-400" />
                 <StatBox icon={Shield} label="SHD" value={Math.floor(ship.stats.shd * bonusShd)} color="text-cyan-400" />
                 <StatBox icon={ShieldCheck} label="HULL" value={Math.floor(ship.stats.hull * bonusHull)} color="text-emerald-400" />
                 <StatBox icon={Box} label="CAP" value={ship.stats.fret} color="text-amber-400" />
              </div>

              <div className="space-y-2 mb-4">
                 <div className={`flex justify-between items-center px-2 py-1.5 rounded bg-black/40 border ${planet.metal_amount >= ship.cost.m ? 'border-white/5' : 'border-red-900/50'}`}>
                    <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-2"><Box size={10} /> Métal</span>
                    <span className={`text-xs font-mono font-bold ${planet.metal_amount >= ship.cost.m ? 'text-slate-300' : 'text-red-500'}`}>{ship.cost.m.toLocaleString()}</span>
                 </div>
                 <div className={`flex justify-between items-center px-2 py-1.5 rounded bg-black/40 border ${planet.crystal_amount >= ship.cost.c ? 'border-white/5' : 'border-red-900/50'}`}>
                    <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-2"><Box size={10} /> Cristal</span>
                    <span className={`text-xs font-mono font-bold ${planet.crystal_amount >= ship.cost.c ? 'text-slate-300' : 'text-red-500'}`}>{ship.cost.c.toLocaleString()}</span>
                 </div>
              </div>

              <div className="mt-auto">
                <div className="flex justify-between text-[10px] mb-1 px-1">
                   <span className="text-slate-500 uppercase font-bold">Production</span>
                   <button onClick={() => !locked && !isQueueFull && !isFull && setQty({...qty, [ship.id]: maxBuildable})} className={`uppercase font-bold tracking-wider hover:text-white transition-colors ${maxBuildable > 0 ? 'text-indigo-400 cursor-pointer' : 'text-slate-600 cursor-not-allowed'}`}>Max: {maxBuildable.toLocaleString()}</button>
                </div>
                <div className="flex gap-2">
                    <input type="number" min="1" max={maxBuildable} value={qty[ship.id] || ''} placeholder="0" className="w-20 bg-black/50 border border-white/10 rounded-lg text-center text-white text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors" onChange={(e) => setQty({...qty, [ship.id]: parseInt(e.target.value)})} disabled={locked || isQueueFull || isFull} />
                    <Button onClick={() => buildShip(ship.id)} disabled={locked || isQueueFull || !canAfford || (qty[ship.id] || 0) <= 0 || isFull} className={`flex-1 h-10 font-black uppercase text-[10px] tracking-[0.2em] transition-all rounded-lg relative overflow-hidden group/btn ${isQueueFull ? 'bg-slate-800 text-slate-500 border border-slate-700' : isFull ? 'bg-red-950/20 text-red-500 border border-red-900/40 cursor-not-allowed' : !canAfford ? 'bg-red-950/20 text-red-500 border border-red-900/40 cursor-not-allowed' : `bg-black hover:bg-slate-900 text-white border ${theme.border} hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]`}`}>
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