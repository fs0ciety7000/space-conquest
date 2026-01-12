import { Card, CardContent } from "@/components/ui/card";
import { Pickaxe, Gem, Droplets, TrendingUp, Coins, Timer, ArrowUpCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface ResourceDisplayProps {
  planet: any;
  onUpgrade: () => void;
}

// --- STYLE ---
const getMineStyle = (type: string, level: number) => {
  let tier = "MK I";
  let suffix = "Standard";
  if (level >= 10) { tier = "MK II"; suffix = "Avancé"; }
  if (level >= 20) { tier = "MK III"; suffix = "Industriel"; }

  const themes: Record<string, { glow: string, text: string, border: string, bgGradient: string }> = {
    metal: {
      glow: "shadow-orange-500/20",
      text: "text-orange-500",
      border: "border-orange-500/30",
      bgGradient: "bg-gradient-to-b from-slate-950 to-orange-950/20" 
    },
    crystal: {
      glow: "shadow-purple-500/20",
      text: "text-purple-400",
      border: "border-purple-500/30",
      bgGradient: "bg-gradient-to-b from-slate-950 to-purple-950/20"
    },
    deuterium: {
      glow: "shadow-cyan-500/20",
      text: "text-cyan-400",
      border: "border-cyan-500/30",
      bgGradient: "bg-gradient-to-b from-slate-950 to-cyan-950/20"
    },
    solar_plant: {
      glow: "shadow-yellow-500/20",
      text: "text-yellow-400",
      border: "border-yellow-500/30",
      bgGradient: "bg-gradient-to-b from-slate-950 to-yellow-950/20"
    }
  };

  return { tier, suffix, ...(themes[type] || themes.metal) };
};

export default function ResourceDisplay({ planet, onUpgrade }: ResourceDisplayProps) {
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

  if (!planet) return null;

  const handleUpgrade = async (type: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:8080/planets/${planet.id}/upgrade/${type}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (res.ok) onUpgrade();
    } catch (e) { console.error("Erreur upgrade", e); }
  };

  // Calcul Production / Énergie
  const calculateProd = (type: string, level: number, base: number) => {
      // Formule pour la Centrale Solaire : 20 * Level * 1.1^Level
      if (type === 'solar_plant') {
          const baseProd = 20 * level * Math.pow(1.1, level);
          const techLevel = planet.energy_tech_level || 0;
          return Math.floor(baseProd * (1 + (techLevel * 0.05)));
      }
      // Formule pour les Mines
      return Math.floor(base * level * Math.pow(1.1, level) * 10);
  };
  
  // Calcul Coût
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
    { id: 'metal', name: 'Extracteur de Métal', lv: planet.metal_mine_level ?? 0, base: 30, icon: Pickaxe },
    { id: 'crystal', name: 'Fonderie de Cristal', lv: planet.crystal_mine_level ?? 0, base: 20, icon: Gem },
    { id: 'deuterium', name: 'Synthé de Deutérium', lv: planet.deuterium_mine_level ?? 0, base: 10, icon: Droplets },
    { id: 'solar_plant', name: 'Centrale Solaire', lv: planet.solar_plant_level ?? 0, base: 0, icon: Zap }, 
  ];

  const metalNow = planet.metal_amount ?? 0;
  const crystalNow = planet.crystal_amount ?? 0;
  const isBuilding = planet.construction_end !== null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {buildings.map((build) => {
        const prod = calculateProd(build.id, build.lv, build.base);
        const cost = getNextCost(build.id, build.lv);
        const canAfford = metalNow >= cost.m && crystalNow >= cost.c;
        const isThisBuilding = planet.construction_type === build.id;
        
        const style = getMineStyle(build.id, build.lv);
        const Icon = build.icon;

        // Calcul du bonus Tech pour affichage
        const isSolar = build.id === 'solar_plant';
        const techLevel = planet.energy_tech_level || 0;
        const bonusPercent = techLevel * 5;

        return (
          <Card key={build.id} className={`relative overflow-hidden border-t-4 ${style.border} ${style.bgGradient} shadow-2xl group hover:-translate-y-1 transition-all duration-300`}>
            
            <div className={`absolute top-0 inset-x-0 h-px bg-current opacity-50 ${style.text}`}></div>

            <CardContent className="p-5 space-y-5 relative z-10">
              
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="flex gap-3 items-center">
                  <div className={`p-2.5 rounded-full bg-black/50 border ${style.border} group-hover:scale-110 transition-transform shadow-lg ${style.glow}`}>
                    <Icon className={style.text} size={20} />
                  </div>
                  <div>
                    <div className={`text-[9px] font-black uppercase tracking-[0.2em] ${style.text} mb-0.5`}>{style.tier}</div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white leading-tight">{build.name}</h3>
                  </div>
                </div>
                <div className="text-right">
                   <span className={`text-3xl font-mono font-black ${style.text} opacity-90`}>{build.lv}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-black/40 p-3 rounded-lg border border-white/5 backdrop-blur-sm relative overflow-hidden">
                <div className="flex justify-between items-center mb-2 relative z-10">
                  <span className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <TrendingUp size={12} className={style.text}/> {isSolar ? 'Énergie' : 'Prod./h'}
                  </span>
                  
                  <div className="text-right">
                    <span className={`text-xs font-mono font-black ${style.text}`}>
                        +{prod.toLocaleString()}
                    </span>
                    
                    {/* --- AFFICHAGE DU BONUS TECH --- */}
                    {isSolar && bonusPercent > 0 && (
                        <div className="flex items-center justify-end gap-1 text-[9px] text-green-400 font-bold animate-pulse mt-0.5">
                            <TrendingUp size={10} />
                            <span>+{bonusPercent}% (Tech)</span>
                        </div>
                    )}
                  </div>

                </div>
                
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden relative z-10">
                   <div className={`h-full bg-current ${style.text}`} style={{ width: `${Math.min(100, (build.lv / 30) * 100)}%` }}></div>
                </div>
              </div>

              {/* Coûts */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[9px] uppercase font-black text-slate-500">
                  <span className="flex items-center gap-1"><Coins size={10}/> Coût</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className={`flex flex-col p-1.5 rounded bg-black/40 border ${metalNow >= cost.m ? 'border-slate-800 text-slate-300' : 'border-red-900/40 text-red-500'}`}>
                    <span className="text-[9px] uppercase text-slate-500">Métal</span>
                    <span className="text-xs font-mono font-bold">{Math.floor(cost.m).toLocaleString()}</span>
                  </div>
                  <div className={`flex flex-col p-1.5 rounded bg-black/40 border ${crystalNow >= cost.c ? 'border-slate-800 text-slate-300' : 'border-red-900/40 text-red-500'}`}>
                    <span className="text-[9px] uppercase text-slate-500">Cristal</span>
                    <span className="text-xs font-mono font-bold">{Math.floor(cost.c).toLocaleString()}</span>
                  </div>
                </div>

                <Button 
                  onClick={() => handleUpgrade(build.id)}
                  disabled={isBuilding || !canAfford}
                  className={`w-full h-12 font-black uppercase text-[10px] tracking-[0.15em] transition-all rounded-lg relative overflow-hidden group/btn ${
                    isBuilding 
                      ? 'bg-slate-900 text-slate-500 border border-white/5' 
                      : !canAfford 
                        ? 'bg-red-950/20 text-red-500 border border-red-900/30 cursor-not-allowed'
                        : `bg-black hover:bg-slate-900 text-white border ${style.border}`
                  }`}
                >
                  {isThisBuilding && timeLeft !== null ? (
                     <span className="flex items-center gap-2 relative z-10">
                       <Timer size={14} className="animate-spin-slow" /> {timeLeft}s
                     </span>
                  ) : isBuilding ? (
                    <span className="relative z-10">Occupé</span>
                  ) : !canAfford ? (
                    <span className="relative z-10">Manque Ress.</span>
                  ) : (
                    <span className="flex items-center gap-2 relative z-10">
                      <ArrowUpCircle size={14}/> Niv. {build.lv + 1}
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