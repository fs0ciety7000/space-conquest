import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Rocket, Shield, Info, Lock, CheckCircle2, XCircle, Timer, 
  Hammer, Crosshair, ChevronRight, Truck, Box, Zap, Scan, Sword, Anchor 
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
    OFFENSIF: {
      color: "text-red-500",
      border: "border-red-500/50",
      gradient: "from-slate-950 to-red-950/20"
    },
    LOGISTIQUE: { 
      color: "text-emerald-400",
      border: "border-emerald-500/50",
      gradient: "from-slate-950 to-emerald-950/20"
    },
    RENSEIGNEMENT: { 
      color: "text-purple-400",
      border: "border-purple-500/50",
      gradient: "from-slate-950 to-purple-950/20"
    },
    UTILITAIRE: { 
      color: "text-amber-400",
      border: "border-amber-500/50",
      gradient: "from-slate-950 to-amber-950/20"
    }
  };
  return themes[type] || themes.OFFENSIF;
};

export default function Shipyard({ planet, onUpdate }: ShipyardProps) {
  // Stats hardcodées pour l'affichage (doivent correspondre +- au backend)
  const fleet = [
    { 
        id: 'light_hunter', name: 'Chasseur Léger', 
        cost: { m: 3000, c: 1000 }, 
        stats: { atk: 50, def: 10, fret: 50 },
        icon: Crosshair, type: 'OFFENSIF', class: 'Intercepteur', 
        desc: "Vaisseau d'attaque rapide." 
    },
    { 
        id: 'cruiser', name: 'Croiseur', 
        cost: { m: 20000, c: 7000 }, 
        stats: { atk: 400, def: 50, fret: 800 },
        icon: Shield, type: 'OFFENSIF', class: 'Frégate Lourde', 
        desc: "Blindé, tueur de chasseurs." 
    },
    { 
        id: 'transporter', name: 'Transporteur', 
        cost: { m: 4000, c: 2000 }, 
        stats: { atk: 5, def: 10, fret: 5000 },
        icon: Truck, type: 'LOGISTIQUE', class: 'Cargo Standard', 
        desc: "Indispensable pour le fret." 
    },
    { 
        id: 'colony_ship', name: 'Vaisseau Colon', 
        cost: { m: 10000, c: 20000 }, 
        stats: { atk: 50, def: 100, fret: 7500 },
        icon: Rocket, type: 'LOGISTIQUE', class: 'Module Arche', 
        desc: "Fonde de nouvelles colonies." 
    },
    { 
        id: 'recycler', name: 'Recycleur', 
        cost: { m: 10000, c: 6000 }, 
        stats: { atk: 1, def: 10, fret: 20000 },
        icon: Hammer, type: 'UTILITAIRE', class: 'Collecteur', 
        desc: "Récolte les débris spatiaux." 
    },
    { 
        id: 'spy_probe', name: 'Sonde Espion', 
        cost: { m: 0, c: 1000 }, 
        stats: { atk: 0, def: 1, fret: 5 },
        icon: Info, type: 'RENSEIGNEMENT', class: 'Drone Furtif', 
        desc: "Scanner longue portée." 
    },
  ];

  const [qty, setQty] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (planet?.shipyard_construction_end) {
      const interval = setInterval(() => {
        const end = new Date(planet.shipyard_construction_end + "Z").getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((end - now) / 1000));
        setTimeLeft(diff);
        if (diff === 0) { clearInterval(interval); onUpdate(); }
      }, 1000);
      return () => clearInterval(interval);
    } else { setTimeLeft(null); }
  }, [planet?.shipyard_construction_end, onUpdate]);

  const buildShip = async (type: string) => {
    const amount = qty[type] || 1;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`http://localhost:8080/planets/${planet.id}/build-fleet/${type}/${amount}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(res.ok) {
            toast.success("Production lancée", { description: `${amount} unité(s) en file d'attente.` });
            onUpdate();
            setQty({ ...qty, [type]: 0 });
        } else {
            toast.error("Erreur de production");
        }
    } catch(e) { console.error(e); }
  };

  const isShipyardBusy = planet.shipyard_construction_end !== null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {fleet.map((ship) => {
        const { locked, requirements } = checkPrerequisites(planet, ship.id);
        const theme = getShipTheme(ship.type);
        const canAfford = planet.metal_amount >= ship.cost.m && planet.crystal_amount >= ship.cost.c;
        const currentAmount = planet[`${ship.id}_count`] || 0;

        // Calcul du Max Constructible
        const maxMetal = ship.cost.m > 0 ? Math.floor(planet.metal_amount / ship.cost.m) : Infinity;
        const maxCrystal = ship.cost.c > 0 ? Math.floor(planet.crystal_amount / ship.cost.c) : Infinity;
        const maxBuildable = Math.min(maxMetal, maxCrystal);

        return (
          <Card key={ship.id} className={`relative overflow-hidden border-t-4 ${locked ? 'border-slate-800 bg-black/60' : `${theme.border} bg-gradient-to-b ${theme.gradient}`} shadow-2xl group transition-all duration-300`}>
            
            {/* Overlay verrouillé (Inchangé) */}
            {locked && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-6 text-center border border-red-900/30">
                    <div className="bg-red-950/30 p-3 rounded-full border border-red-900 mb-4 animate-pulse">
                        <Lock size={24} className="text-red-500" />
                    </div>
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

            {!locked && <div className="absolute top-0 inset-x-0 h-px bg-white/10 opacity-50 group-hover:bg-white/30"></div>}

            <CardContent className="p-5 relative z-10 flex flex-col h-full">
              
              {/* HEADER */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4 items-center">
                   <div className={`p-3 rounded-xl border ${theme.border} bg-black/40 shadow-lg group-hover:scale-105 transition-transform`}>
                     <ship.icon className={theme.color} size={24} />
                   </div>
                   <div>
                      <div className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.color} mb-1 flex items-center gap-1`}>
                        <Zap size={10} /> {ship.type}
                      </div>
                      <h3 className="text-lg font-black uppercase text-white leading-none">{ship.name}</h3>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 tracking-wider">CLASSE: {ship.class}</p>
                   </div>
                </div>
                
                {/* QUANTITÉ POSSÉDÉE */}
                <div className="text-right bg-black/30 px-2 py-1 rounded border border-white/5">
                    <span className="text-xl font-mono font-black text-white">{currentAmount.toLocaleString()}</span>
                    <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">En Stock</p>
                </div>
              </div>

              {/* STATISTIQUES (NOUVEAU) */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                 <StatBox icon={Sword} label="ATK" value={ship.stats.atk} color="text-red-400" />
                 <StatBox icon={Shield} label="DEF" value={ship.stats.def} color="text-blue-400" />
                 <StatBox icon={Box} label="FRET" value={ship.stats.fret} color="text-emerald-400" />
              </div>

              {/* COÛTS */}
              <div className="space-y-2 mb-4">
                 <div className={`flex justify-between items-center px-2 py-1.5 rounded bg-black/40 border ${planet.metal_amount >= ship.cost.m ? 'border-white/5' : 'border-red-900/50'}`}>
                    <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-2">
                        <Box size={10} /> Métal
                    </span>
                    <span className={`text-xs font-mono font-bold ${planet.metal_amount >= ship.cost.m ? 'text-slate-300' : 'text-red-500'}`}>
                        {ship.cost.m.toLocaleString()}
                    </span>
                 </div>
                 <div className={`flex justify-between items-center px-2 py-1.5 rounded bg-black/40 border ${planet.crystal_amount >= ship.cost.c ? 'border-white/5' : 'border-red-900/50'}`}>
                    <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-2">
                        <Box size={10} /> Cristal
                    </span>
                    <span className={`text-xs font-mono font-bold ${planet.crystal_amount >= ship.cost.c ? 'text-slate-300' : 'text-red-500'}`}>
                        {ship.cost.c.toLocaleString()}
                    </span>
                 </div>
              </div>

              {/* ACTIONS & INPUT */}
              <div className="mt-auto">
                {/* Label Max Constructible */}
                <div className="flex justify-between text-[10px] mb-1 px-1">
                   <span className="text-slate-500 uppercase font-bold">Production</span>
                   <button 
                      onClick={() => !locked && !isShipyardBusy && setQty({...qty, [ship.id]: maxBuildable})}
                      className={`uppercase font-bold tracking-wider hover:text-white transition-colors ${maxBuildable > 0 ? 'text-indigo-400 cursor-pointer' : 'text-slate-600 cursor-not-allowed'}`}
                   >
                      Max: {maxBuildable.toLocaleString()}
                   </button>
                </div>

                <div className="flex gap-2">
                    <input 
                        type="number" 
                        min="1" 
                        max={maxBuildable}
                        value={qty[ship.id] || ''}
                        placeholder="0"
                        className="w-20 bg-black/50 border border-white/10 rounded-lg text-center text-white text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                        onChange={(e) => setQty({...qty, [ship.id]: parseInt(e.target.value)})}
                        disabled={locked || isShipyardBusy}
                    />
                    <Button 
                        onClick={() => buildShip(ship.id)}
                        disabled={locked || isShipyardBusy || !canAfford || (qty[ship.id] || 0) <= 0}
                        className={`flex-1 h-10 font-black uppercase text-[10px] tracking-[0.2em] transition-all rounded-lg relative overflow-hidden group/btn ${
                            isShipyardBusy 
                            ? 'bg-slate-800 text-slate-500 border border-slate-700' 
                            : !canAfford 
                                ? 'bg-red-950/20 text-red-500 border border-red-900/40 cursor-not-allowed'
                                : `bg-black hover:bg-slate-900 text-white border ${theme.border} hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]`
                        }`}
                    >
                        {!isShipyardBusy && canAfford && (
                            <div className={`absolute top-0 bottom-0 w-1 bg-white/20 blur-md -skew-x-12 -left-4 group-hover/btn:left-[120%] transition-all duration-700`}></div>
                        )}

                        {isShipyardBusy && planet.pending_fleet_type === ship.id ? (
                             <span className="flex items-center gap-2 relative z-10">
                                <Timer size={14} className="animate-spin" /> {timeLeft}s
                             </span>
                        ) : isShipyardBusy ? (
                            <span className="relative z-10">Occupé</span>
                        ) : !canAfford ? (
                            <span className="relative z-10">Manque Ress.</span>
                        ) : (
                            <span className="flex items-center gap-2 relative z-10">
                                <Hammer size={14} /> Produire
                            </span>
                        )}
                    </Button>
                </div>
              </div>

            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Petit composant pour les Stats
function StatBox({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) {
    return (
        <div className="flex flex-col items-center bg-black/40 border border-white/5 rounded p-2">
            <span className={`text-[9px] font-black uppercase ${color} flex items-center gap-1 mb-1`}>
                <Icon size={10} /> {label}
            </span>
            <span className="text-xs font-mono font-bold text-white">{value.toLocaleString()}</span>
        </div>
    )
}