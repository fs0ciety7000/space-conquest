import { Card, CardContent } from "@/components/ui/card";
import { Pickaxe, Gem, Droplets, TrendingUp, Coins, Timer, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface ResourceDisplayProps {
  planet: any;
  onUpgrade: () => void;
}

// --- FONCTION D'AIDE POUR LE STYLE ---
// Détermine le "Tier" (MK), la couleur et le suffixe selon le niveau de la mine
const getMineStyle = (type: string, level: number) => {
  let tier = "MK I";
  let suffix = "Standard";
  // On change de palier au niveau 10
  if (level >= 10) { tier = "MK II"; suffix = "Avancé"; }
  if (level >= 20) { tier = "MK III"; suffix = "Industriel"; }

  // Définition des thèmes de couleur (basés sur ton image)
  const themes: Record<string, { glow: string, text: string, border: string, bgGradient: string }> = {
    metal: {
      glow: "glow-orange", // Utilise les classes de index.css
      text: "text-orange-500",
      border: "border-orange-500/30",
      // Un dégradé sombre qui tire vers l'orange en bas
      bgGradient: "bg-gradient-to-b from-slate-950 to-orange-950/20" 
    },
    crystal: {
      glow: "glow-purple",
      text: "text-purple-400",
      border: "border-purple-500/30",
      bgGradient: "bg-gradient-to-b from-slate-950 to-purple-950/20"
    },
    deuterium: {
      glow: "glow-blue",
      text: "text-cyan-400",
      border: "border-cyan-500/30",
      bgGradient: "bg-gradient-to-b from-slate-950 to-cyan-950/20"
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

  const calculateProd = (level: number, base: number) => Math.floor(base * level * Math.pow(1.1, level) * 10);
  
  const getNextCost = (type: string, currentLevel: number) => {
    const next = currentLevel + 1;
    const factor = Math.pow(1.5, next - 1);
    const crystalFactor = Math.pow(1.6, next - 1);
    if (type === 'metal') return { m: 60 * factor, c: 15 * factor };
    if (type === 'crystal') return { m: 48 * crystalFactor, c: 24 * crystalFactor };
    return { m: 225 * factor, c: 75 * factor };
  };

  const mines = [
    { id: 'metal', name: 'Extracteur de Métal', lv: planet.metal_mine_level ?? 0, base: 30, icon: Pickaxe },
    { id: 'crystal', name: 'Fonderie de Cristal', lv: planet.crystal_mine_level ?? 0, base: 20, icon: Gem },
    { id: 'deuterium', name: 'Synthé de Deutérium', lv: planet.deuterium_mine_level ?? 0, base: 10, icon: Droplets },
  ];

  const metalNow = planet.metal_amount ?? 0;
  const crystalNow = planet.crystal_amount ?? 0;
  const isBuilding = planet.construction_end !== null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {mines.map((mine) => {
        const prod = calculateProd(mine.lv, mine.base);
        const cost = getNextCost(mine.id, mine.lv);
        const canAfford = metalNow >= cost.m && crystalNow >= cost.c;
        const isThisMineBuilding = planet.construction_type === mine.id;
        
        // Récupération du style dynamique (MK I/II, Couleurs)
        const style = getMineStyle(mine.id, mine.lv);
        const Icon = mine.icon;

        return (
          // LA CARTE : On applique le dégradé de fond et la bordure colorée
          <Card key={mine.id} className={`relative overflow-hidden border-t-4 ${style.border} ${style.bgGradient} shadow-2xl group hover:-translate-y-1 transition-all duration-300`}>
            
            {/* Effet de lueur "interne" en haut de la carte */}
            <div className={`absolute top-0 inset-x-0 h-px ${style.glow} opacity-50`}></div>

            <CardContent className="p-6 space-y-6 relative z-10">
              
              {/* HEADER : Icône, Nom et Grade MK */}
              <div className="flex justify-between items-start">
                <div className="flex gap-4 items-center">
                  {/* L'icône est dans un cercle qui brille */}
                  <div className={`p-3 rounded-full bg-black/50 border ${style.border} ${style.glow} group-hover:scale-110 transition-transform`}>
                    <Icon className={style.text} size={24} />
                  </div>
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-[0.3em] ${style.text} mb-1`}>{style.tier}</div>
                    <h3 className="text-lg font-black uppercase tracking-wider text-white">{mine.name}</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">{style.suffix}</p>
                  </div>
                </div>
                <div className="text-right">
                   <span className={`text-4xl font-mono font-black ${style.text} opacity-80`}>{mine.lv}</span>
                   <p className="text-[9px] text-slate-500 uppercase tracking-widest text-right -mt-1">Niveau</p>
                </div>
              </div>

              {/* STATS : Production */}
              <div className="bg-black/60 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-2">
                    <TrendingUp size={12} className={style.text}/> Production horaire
                  </span>
                  <span className={`text-sm font-mono font-black ${style.text}`}>
                    +{prod.toLocaleString()}
                  </span>
                </div>
                {/* Barre de progression visuelle (décorative) */}
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                   <div className={`h-full ${style.bgGradient} ${style.glow} w-[${Math.min(100, (mine.lv / 30) * 100)}%]`}></div>
                </div>
              </div>

              {/* COÛTS & ACTION */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[9px] uppercase font-black text-slate-500">
                  <span className="flex items-center gap-1"><Coins size={10}/> Coût requis</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className={`flex items-center justify-between text-xs font-mono p-2 rounded-lg bg-black/60 border ${metalNow >= cost.m ? 'border-slate-700 text-slate-300' : 'border-red-900/50 text-red-500'}`}>
                    <span>Métal</span> <span>{Math.floor(cost.m).toLocaleString()}</span>
                  </div>
                  <div className={`flex items-center justify-between text-xs font-mono p-2 rounded-lg bg-black/60 border ${crystalNow >= cost.c ? 'border-slate-700 text-slate-300' : 'border-red-900/50 text-red-500'}`}>
                    <span>Cristal</span> <span>{Math.floor(cost.c).toLocaleString()}</span>
                  </div>
                </div>

                <Button 
                  onClick={() => handleUpgrade(mine.id)}
                  disabled={isBuilding || !canAfford}
                  className={`w-full h-14 font-black uppercase text-xs tracking-[0.2em] transition-all rounded-xl relative overflow-hidden group/btn ${
                    isBuilding 
                      ? 'bg-slate-900 text-slate-500 border border-white/5' 
                      : !canAfford 
                        ? 'bg-red-950/30 text-red-500 border border-red-900/50 cursor-not-allowed'
                        : `bg-black hover:bg-slate-900 text-white border ${style.border} ${style.glow}`
                  }`}
                >
                   {/* Effet de survol sur le bouton */}
                   <div className={`absolute inset-0 w-0 bg-${style.text.replace('text-', '')} opacity-10 transition-all duration-300 group-hover/btn:w-full`}></div>

                  {isThisMineBuilding && timeLeft !== null ? (
                     <span className="flex items-center gap-3 relative z-10">
                       <Timer size={16} className="animate-spin-slow" /> Construction : {timeLeft}s
                     </span>
                  ) : isBuilding ? (
                    <span className="relative z-10">Chantier occupé</span>
                  ) : !canAfford ? (
                    <span className="relative z-10">Ressources manquantes</span>
                  ) : (
                    <span className="flex items-center gap-2 relative z-10">
                      <ArrowUpCircle size={16}/> Améliorer au Nv.{mine.lv + 1}
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