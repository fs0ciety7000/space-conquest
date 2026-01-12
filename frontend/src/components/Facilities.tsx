import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Hammer, Microscope, Timer, ArrowUpCircle, 
  Box, Gem, Droplets, Zap, Scan, Activity, ChevronRight 
} from "lucide-react";
import { useState, useEffect } from "react";

interface FacilitiesProps {
  planet: any;
  onUpgrade: () => void;
}

// --- THÈMES VISUELS ---
const getFacilityTheme = (type: string) => {
  const themes: Record<string, any> = {
    shipyard: {
      color: "text-cyan-400",
      border: "border-cyan-500/50",
      bg: "bg-cyan-500/10",
      glow: "shadow-cyan-500/20",
      gradient: "from-slate-950 to-cyan-950/20",
      icon: Hammer,
      bgIcon: Scan
    },
    research: {
      color: "text-fuchsia-400",
      border: "border-fuchsia-500/50",
      bg: "bg-fuchsia-500/10",
      glow: "shadow-fuchsia-500/20",
      gradient: "from-slate-950 to-fuchsia-950/20",
      icon: Microscope,
      bgIcon: Activity
    }
  };
  return themes[type] || themes.shipyard;
};

export default function Facilities({ planet, onUpgrade }: FacilitiesProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (planet?.construction_end) {
      const interval = setInterval(() => {
        const end = new Date(planet.construction_end + "Z").getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((end - now) / 1000));
        setTimeLeft(diff);
        if (diff === 0) { clearInterval(interval); onUpgrade(); }
      }, 1000);
      return () => clearInterval(interval);
    } else { setTimeLeft(null); }
  }, [planet?.construction_end, onUpgrade]);

  const handleUpgrade = async (type: string) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`http://localhost:8080/planets/${planet.id}/upgrade/${type}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      onUpgrade();
    } catch (e) { console.error(e); }
  };

  const getCost = (type: string, lv: number) => {
    const factor = Math.pow(2, lv);
    if (type === 'shipyard') return { m: 400 * factor, c: 200 * factor, d: 100 * factor };
    if (type === 'research') return { m: 200 * factor, c: 400 * factor, d: 200 * factor };
    return { m: 0, c: 0, d: 0 };
  };

  const facilities = [
    { 
      id: 'shipyard', 
      name: 'Chantier Spatial', 
      lv: planet.shipyard_level ?? 0, 
      type: 'CONSTRUCTION',
      desc: "Infrastructure lourde permettant l'assemblage de vaisseaux et de défenses planétaires." 
    },
    { 
      id: 'research', 
      name: 'Labo de Recherche', 
      lv: planet.research_lab_level ?? 0, 
      type: 'SCIENTIFIQUE',
      desc: "Centre de développement pour les nouvelles technologies et moteurs spatiaux." 
    },
  ];

  const isBuilding = planet.construction_end !== null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {facilities.map((fac) => {
        // Calcul du coût pour le niveau SUIVANT (niveau actuel utilisé par la formule car elle fait pow(2, lv))
        const cost = getCost(fac.id, fac.lv);
        const canAfford = (planet.metal_amount >= cost.m) && (planet.crystal_amount >= cost.c) && (planet.deuterium_amount >= cost.d);
        const isThisBuilding = planet.construction_type === fac.id;
        const theme = getFacilityTheme(fac.id);
        const Icon = theme.icon;
        const BgIcon = theme.bgIcon;

        return (
          <Card key={fac.id} className={`relative overflow-hidden border-t-4 ${theme.border} bg-gradient-to-b ${theme.gradient} shadow-2xl group hover:-translate-y-1 transition-all duration-300`}>
            
            {/* Effet Scan Top */}
            <div className="absolute top-0 inset-x-0 h-px bg-white/10 opacity-50 group-hover:bg-white/30 transition-all"></div>
            
            {/* Icône de fond géante */}
            <div className="absolute -right-10 -top-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <BgIcon size={200} className={theme.color} />
            </div>

            <CardContent className="p-6 relative z-10 flex flex-col h-full">
              
              {/* HEADER */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-4 items-center">
                    <div className={`p-3.5 rounded-xl border ${theme.border} bg-black/40 ${theme.glow} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={theme.color} size={28} />
                    </div>
                    <div>
                        <div className={`text-[9px] font-black uppercase tracking-[0.25em] ${theme.color} mb-1 flex items-center gap-1.5`}>
                            <Zap size={10} /> {fac.type}
                        </div>
                        <h3 className="text-xl font-black uppercase text-white tracking-wide leading-none">{fac.name}</h3>
                    </div>
                </div>
                
                {/* Niveau */}
                <div className="text-right">
                    <span className={`text-4xl font-mono font-black ${theme.color} opacity-90`}>{fac.lv}</span>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold -mt-1">Niveau</p>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div className="bg-black/30 p-4 rounded-lg border border-white/5 mb-6 backdrop-blur-sm min-h-[80px]">
                 <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    {fac.desc}
                 </p>
              </div>

              {/* COÛTS (Affichage explicite) */}
              <div className="mb-6">
                 <div className="flex justify-between items-end mb-2 px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Coût d'amélioration</span>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                        <span>Niv. {fac.lv}</span>
                        <ChevronRight size={10} />
                        <span className="text-white font-bold">Niv. {fac.lv + 1}</span>
                    </div>
                 </div>

                 <div className="space-y-2">
                     {/* Métal */}
                     <div className={`flex justify-between items-center px-3 py-2 rounded bg-black/40 border ${planet.metal_amount >= cost.m ? 'border-white/5' : 'border-red-900/50'}`}>
                        <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-2">
                            <Box size={12} /> Métal
                        </span>
                        <span className={`text-xs font-mono font-bold ${planet.metal_amount >= cost.m ? 'text-slate-300' : 'text-red-500'}`}>
                            {Math.floor(cost.m).toLocaleString()}
                        </span>
                     </div>
                     {/* Cristal */}
                     <div className={`flex justify-between items-center px-3 py-2 rounded bg-black/40 border ${planet.crystal_amount >= cost.c ? 'border-white/5' : 'border-red-900/50'}`}>
                        <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-2">
                            <Gem size={12} /> Cristal
                        </span>
                        <span className={`text-xs font-mono font-bold ${planet.crystal_amount >= cost.c ? 'text-slate-300' : 'text-red-500'}`}>
                            {Math.floor(cost.c).toLocaleString()}
                        </span>
                     </div>
                     {/* Deutérium */}
                     <div className={`flex justify-between items-center px-3 py-2 rounded bg-black/40 border ${planet.deuterium_amount >= cost.d ? 'border-white/5' : 'border-red-900/50'}`}>
                        <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-2">
                            <Droplets size={12} /> Deutérium
                        </span>
                        <span className={`text-xs font-mono font-bold ${planet.deuterium_amount >= cost.d ? 'text-slate-300' : 'text-red-500'}`}>
                            {Math.floor(cost.d).toLocaleString()}
                        </span>
                     </div>
                 </div>
              </div>

              {/* BOUTON D'ACTION */}
              <div className="mt-auto">
                <Button 
                    onClick={() => handleUpgrade(fac.id)}
                    disabled={isBuilding || !canAfford}
                    className={`w-full h-12 font-black uppercase text-[11px] tracking-[0.2em] transition-all rounded-xl relative overflow-hidden group/btn shadow-lg ${
                        isBuilding 
                        ? 'bg-slate-900 text-slate-500 border border-white/5' 
                        : !canAfford 
                            ? 'bg-red-950/20 text-red-500 border border-red-900/40 cursor-not-allowed'
                            : `bg-black hover:bg-slate-900 text-white border ${theme.border} ${theme.glow}`
                    }`}
                >
                    {/* Effet brillance au survol si actif */}
                    {!isBuilding && canAfford && (
                        <div className={`absolute top-0 bottom-0 w-2 bg-white/20 blur-md -skew-x-12 -left-10 group-hover/btn:left-[120%] transition-all duration-700`}></div>
                    )}

                    {isThisBuilding && timeLeft !== null ? (
                        <span className="flex items-center gap-3 relative z-10 animate-pulse text-cyan-400">
                            <Timer size={16} className="animate-spin" /> Construction : {timeLeft}s
                        </span>
                    ) : isBuilding ? (
                        <span className="relative z-10">File d'attente occupée</span>
                    ) : !canAfford ? (
                        <span className="relative z-10">Ressources manquantes</span>
                    ) : (
                        <span className="flex items-center gap-2 relative z-10">
                            <ArrowUpCircle size={16} /> Lancer Construction
                        </span>
                    )}
                </Button>
              </div>

            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}