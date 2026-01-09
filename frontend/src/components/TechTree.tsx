import { Card, CardContent } from "@/components/ui/card";
import { FlaskConical, Zap, Target, Atom, Microscope, Cpu, ArrowUpCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// Configuration visuelle par type de technologie
const getTechConfig = (id: string, level: number) => {
  const tier = Math.floor(level / 5) + 1; // Change de MK tous les 5 niveaux
  
  const configs: any = {
    research: {
      color: "text-purple-400",
      border: "border-purple-500/40",
      glow: "glow-purple", // Classe définie dans index.css
      bg: "bg-purple-950/10",
      icon: Microscope,
      tierLabel: "LAB-OS",
      subIcon: Atom
    },
    energy_tech: {
      color: "text-yellow-400",
      border: "border-yellow-500/40",
      glow: "glow-orange", // On réutilise le glow orange pour le jaune/ambre
      bg: "bg-yellow-950/10",
      icon: Zap,
      tierLabel: "CORE-REACT",
      subIcon: Sparkles
    },
    laser: {
      color: "text-red-400",
      border: "border-red-500/40",
      glow: "shadow-[0_0_20px_-5px_rgba(248,113,113,0.5)]", // Custom red glow
      bg: "bg-red-950/10",
      icon: Target,
      tierLabel: "WEAPON-SYS",
      subIcon: Cpu
    }
  };

  return { tier: `MK ${tier}`, ...configs[id] };
};

export default function TechTree({ planet, onUpdate }: { planet: any, onUpdate: () => void }) {
  
  const techs = [
    { 
        id: 'research', 
        name: 'Labo de Recherche', 
        lv: planet.research_lab_level, 
        desc: "Architecture neuronale permettant le traitement de données massives.", 
    },
    { 
        id: 'energy_tech', 
        name: 'Technologie Énergie', 
        lv: planet.energy_tech_level, 
        desc: "Optimisation des champs de confinement du plasma (+50 Max/Nv).", 
    },
    { 
        id: 'laser', 
        name: 'Batterie Laser', 
        lv: planet.laser_battery_level, 
        desc: "Focalisation photonique pour la défense orbitale automatisée.", 
    }
  ];

  const handleResearch = async (type: string) => {
    try {
      const res = await fetch(`http://localhost:8080/planets/${planet.id}/upgrade/${type}`, { method: 'POST' });
      if (res.ok) onUpdate();
    } catch (e) {
      console.error("Échec de la recherche", e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER DE SECTION */}
      <header className="relative pl-6 py-2 overflow-hidden rounded-r-xl border-l-4 border-purple-500 bg-gradient-to-r from-purple-900/20 to-transparent">
        <div className="absolute -left-2 top-0 bottom-0 w-1 bg-purple-400 blur-[2px]"></div>
        <div className="flex items-center gap-3">
            <Atom className="text-purple-400 animate-spin-slow" size={32} />
            <div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                    Centre de <span className="text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">R&D</span>
                </h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">
                    Innovation & Supériorité Technologique
                </p>
            </div>
        </div>
      </header>

      {/* GRID DES TECHNOLOGIES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {techs.map(t => {
          const style = getTechConfig(t.id, t.lv);
          const Icon = style.icon;
          const SubIcon = style.subIcon;

          return (
            <Card key={t.id} className={`bg-slate-950 border-t-4 ${style.border} group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}>
              
              {/* Effet de fond coloré subtil */}
              <div className={`absolute inset-0 ${style.bg} opacity-20 group-hover:opacity-30 transition-opacity`}></div>
              
              {/* Lueur supérieure */}
              <div className={`absolute top-0 inset-x-0 h-px ${style.glow} opacity-60`}></div>

              <CardContent className="pt-6 px-6 pb-8 space-y-6 relative z-10">
                
                {/* En-tête de la carte */}
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${style.color}`}>
                            <SubIcon size={10} /> {style.tierLabel} // {style.tier}
                        </div>
                        <h3 className="text-xl font-black uppercase text-white italic tracking-wide">{t.name}</h3>
                    </div>
                    <div className={`p-3 rounded-xl bg-black/50 border border-white/5 ${style.glow}`}>
                        <Icon size={24} className={style.color} />
                    </div>
                </div>

                {/* Niveau et Description */}
                <div className="space-y-4">
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-mono font-black text-white">{t.lv}</span>
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Niveau Actuel</span>
                    </div>
                    
                    <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div className={`h-full w-[40%] ${style.bg.replace('/10', '')} ${style.color.replace('text-', 'bg-')} opacity-80 shadow-[0_0_10px_currentColor]`}></div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed font-mono border-l-2 border-white/10 pl-3 min-h-[40px]">
                        {t.desc}
                    </p>
                </div>

                {/* Bouton d'Action */}
                <Button 
                    onClick={() => handleResearch(t.id)} 
                    className={`w-full h-14 font-black uppercase tracking-[0.2em] text-[10px] transition-all relative overflow-hidden group/btn bg-black hover:bg-slate-900 border border-white/10 hover:border-white/30 text-white`}
                >
                    <div className={`absolute inset-0 opacity-0 group-hover/btn:opacity-10 ${style.bg.replace('/10', '')} transition-opacity`}></div>
                    <span className="flex items-center gap-2 relative z-10">
                        <ArrowUpCircle size={14} className={style.color} /> Lancer la Recherche
                    </span>
                </Button>

              </CardContent>
            </Card>
          );
        })}
      </div>

        {/* SECTION DÉCORATIVE BASSE */}
      <div className="mt-8 border-t border-white/5 pt-4 flex justify-between items-center text-[10px] text-slate-600 font-mono uppercase">
        <span>Système R&D v4.2</span>
        <span>Capacité cognitive : 100%</span>
      </div>
    </div>
  );
}