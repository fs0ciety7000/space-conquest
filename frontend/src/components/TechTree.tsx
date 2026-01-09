import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Target, Atom, Microscope, Cpu, ArrowUpCircle, Sparkles, Eye, ScanLine, Lock, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Configuration visuelle par type de technologie
const getTechConfig = (id: string, level: number) => {
  const tier = Math.floor(level / 5) + 1; 
  
  const configs: any = {
    research: {
      color: "text-purple-400",
      border: "border-purple-500/40",
      glow: "shadow-[0_0_20px_-5px_rgba(168,85,247,0.5)]",
      bg: "bg-purple-950/10",
      icon: Microscope,
      tierLabel: "LAB-OS",
      subIcon: Atom
    },
    energy_tech: {
      color: "text-yellow-400",
      border: "border-yellow-500/40",
      glow: "shadow-[0_0_20px_-5px_rgba(250,204,21,0.5)]",
      bg: "bg-yellow-950/10",
      icon: Zap,
      tierLabel: "CORE-REACT",
      subIcon: Sparkles
    },
    laser: {
      color: "text-red-400",
      border: "border-red-500/40",
      glow: "shadow-[0_0_20px_-5px_rgba(248,113,113,0.5)]", 
      bg: "bg-red-950/10",
      icon: Target,
      tierLabel: "WEAPON-SYS",
      subIcon: Cpu
    },
    espionage: {
      color: "text-emerald-400",
      border: "border-emerald-500/40",
      glow: "shadow-[0_0_20px_-5px_rgba(52,211,153,0.5)]",
      bg: "bg-emerald-950/10",
      icon: Eye,
      tierLabel: "INTEL-NET",
      subIcon: ScanLine
    }
  };

  return { tier: `MK ${tier}`, ...configs[id] };
};

// Fonction utilitaire pour calculer le coût
const getCost = (type: string, level: number) => {
    const factor = Math.pow(2, level - 1);
    switch(type) {
        case 'research': return { m: 200 * factor, c: 400 * factor, d: 200 * factor };
        case 'energy_tech': return { m: 0, c: 800 * factor, d: 400 * factor };
        case 'laser': return { m: 1500 * factor, c: 500 * factor, d: 100 * factor };
        case 'espionage': return { m: 200 * factor, c: 1000 * factor, d: 200 * factor };
        default: return { m: 0, c: 0, d: 0 };
    }
};

export default function TechTree({ planet, onUpdate }: { planet: any, onUpdate: () => void }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  // Ref pour éviter les boucles infinies dans le useEffect
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  // --- LOGIQUE TIMER UNIFIÉE ---
  useEffect(() => {
    // Liste des types qui concernent ce composant
    const isTechResearch = ['research', 'energy_tech', 'laser', 'espionage'].includes(planet.construction_type);

    // Si pas de construction ou si ce n'est pas une tech, on reset tout
    if (!planet?.construction_end || !isTechResearch) {
        setTimeLeft(null);
        setIsFinalizing(false);
        return;
    }

    // Intervalle unique qui gère à la fois le décompte ET la finalisation
    const interval = setInterval(() => {
        const end = new Date(planet.construction_end).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((end - now) / 1000));

        if (diff > 0) {
            // Cas normal : on compte
            setTimeLeft(diff);
            setIsFinalizing(false);
        } else {
            // Cas fini : on est à 0 (ou passé 0)
            setTimeLeft(0);
            setIsFinalizing(true);
            
            // On appelle le refresh parent à chaque tick tant que le backend n'a pas nettoyé "construction_end"
            // Le backend finira par renvoyer construction_end = null, ce qui déclenchera le if du début et arrêtera l'intervalle.
            onUpdateRef.current();
        }
    }, 1000);

    // Check immédiat au montage pour éviter d'attendre 1s avant l'affichage
    const initialEnd = new Date(planet.construction_end).getTime();
    const initialDiff = Math.max(0, Math.floor((initialEnd - Date.now()) / 1000));
    setTimeLeft(initialDiff);
    if (initialDiff <= 0) setIsFinalizing(true);

    return () => clearInterval(interval);
  }, [planet?.construction_end, planet?.construction_type]);


  const techs = [
    { id: 'research', name: 'Labo de Recherche', lv: planet.research_lab_level, desc: "Traitement de données massives." },
    { id: 'energy_tech', name: 'Technologie Énergie', lv: planet.energy_tech_level, desc: "Optimisation du plasma (+50 Max/Nv)." },
    { id: 'laser', name: 'Batterie Laser', lv: planet.laser_battery_level, desc: "Défense orbitale automatisée." },
    { id: 'espionage', name: 'Tech. Espionnage', lv: planet.espionage_tech_level, desc: "Algorithmes de cryptage avancés." }
  ];

  const handleResearch = async (type: string) => {
    try {
      const res = await fetch(`http://localhost:8080/planets/${planet.id}/upgrade/${type}`, { 
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
          onUpdate(); // Déclenche le refresh immédiat pour afficher le loader
      } else {
          console.error("Erreur serveur lors de la recherche");
      }
    } catch (e) {
      console.error("Échec de la connexion", e);
    }
  };

  // Variable globale pour savoir si le labo est occupé par une tech
  const isLabBusy = timeLeft !== null || isFinalizing;
  // Variable pour savoir si une mine est en construction (bloque aussi les techs)
  // On vérifie si une construction existe MAIS que ce n'est pas une des techs gérées ici
  const isMineBusy = planet.construction_end && !isLabBusy;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <header className="relative pl-6 py-2 overflow-hidden rounded-r-xl border-l-4 border-purple-500 bg-gradient-to-r from-purple-900/20 to-transparent">
        <div className="absolute -left-2 top-0 bottom-0 w-1 bg-purple-400 blur-[2px]"></div>
        <div className="flex items-center gap-3">
            <Atom className={`text-purple-400 ${isLabBusy ? 'animate-spin' : 'animate-spin-slow'}`} size={32} />
            <div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                    Centre de <span className="text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">R&D</span>
                </h2>
                <div className="flex items-center gap-2">
                    {isLabBusy && <span className="text-[10px] text-yellow-500 font-mono animate-pulse">[RECHERCHE EN COURS]</span>}
                    {isMineBusy && <span className="text-[10px] text-red-500 font-mono animate-pulse">[CONSTRUCTION BÂTIMENT EN COURS]</span>}
                </div>
            </div>
        </div>
      </header>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {techs.map(t => {
          const style = getTechConfig(t.id, t.lv);
          const Icon = style.icon;
          const SubIcon = style.subIcon;
          const cost = getCost(t.id, t.lv + 1);

          // Vérification ressources
          const canAfford = planet.metal_amount >= cost.m && planet.crystal_amount >= cost.c && planet.deuterium_amount >= cost.d;

          // États logiques
          const isResearchingThis = planet.construction_type === t.id;
          
          return (
            <Card key={t.id} className={`bg-slate-950 border-t-4 ${style.border} group relative overflow-hidden transition-all duration-300 ${!isLabBusy && !isMineBusy ? 'hover:-translate-y-1 hover:shadow-2xl' : 'opacity-90'}`}>
              
              <div className={`absolute inset-0 ${style.bg} opacity-20 group-hover:opacity-30 transition-opacity`}></div>
              <div className={`absolute top-0 inset-x-0 h-px ${style.glow} ${isResearchingThis ? 'opacity-100 animate-pulse' : 'opacity-60'}`}></div>

              <CardContent className="pt-6 px-6 pb-8 space-y-6 relative z-10 flex flex-col h-full justify-between">
                
                <div>
                    {/* Header Carte */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="space-y-1">
                            <div className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${style.color}`}>
                                <SubIcon size={10} /> {style.tierLabel}
                            </div>
                            <h3 className="text-lg font-black uppercase text-white italic tracking-wide break-words">{t.name}</h3>
                        </div>
                        <div className={`p-3 rounded-xl bg-black/50 border border-white/5 ${style.glow} ${isResearchingThis ? 'animate-pulse' : ''}`}>
                            <Icon size={24} className={style.color} />
                        </div>
                    </div>

                    {/* Info Niveau */}
                    <div className="space-y-4 mb-6">
                        <div className="flex items-baseline gap-2">
                            <span className={`text-5xl font-mono font-black ${isResearchingThis ? 'text-yellow-400' : 'text-white'}`}>
                                {t.lv}
                            </span>
                            <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Niveau</span>
                            {isResearchingThis && <span className="text-xs text-yellow-500 animate-bounce">▲</span>}
                        </div>
                        
                        <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div className={`h-full ${isResearchingThis ? 'w-full animate-progress-indeterminate bg-yellow-500' : 'w-[40%] ' + style.color.replace('text-', 'bg-')} opacity-80 shadow-[0_0_10px_currentColor]`}></div>
                        </div>

                        {/* Coûts (Visible si pas en cours) */}
                        {!isResearchingThis && (
                            <div className="grid grid-cols-2 gap-2 text-[9px] font-mono border-l-2 border-white/10 pl-2">
                                <div className={planet.metal_amount >= cost.m ? "text-slate-400" : "text-red-500"}>
                                    M: {Math.floor(cost.m).toLocaleString()}
                                </div>
                                <div className={planet.crystal_amount >= cost.c ? "text-slate-400" : "text-red-500"}>
                                    C: {Math.floor(cost.c).toLocaleString()}
                                </div>
                                <div className={planet.deuterium_amount >= cost.d ? "text-slate-400" : "text-red-500"}>
                                    D: {Math.floor(cost.d).toLocaleString()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* BOUTONS D'ACTION */}
                {isResearchingThis || (isFinalizing && isResearchingThis) ? (
                    // CAS 1 : Recherche en cours (ou finalisation)
                    <Button disabled className="w-full h-14 bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 font-mono font-bold animate-pulse">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span className="flex flex-col items-start leading-none">
                            <span className="text-[10px] uppercase tracking-widest">
                                {isFinalizing ? "FINALISATION..." : "EN COURS"}
                            </span>
                            <span className="text-lg">{timeLeft}s</span>
                        </span>
                    </Button>
                ) : isLabBusy ? (
                    // CAS 2 : Occupé ailleurs (Tech)
                    <Button disabled className="w-full h-14 bg-slate-900 border border-slate-800 text-slate-600 grayscale">
                        <Lock size={16} className="mr-2" />
                        <span className="text-[10px] uppercase tracking-widest">Labo Occupé</span>
                    </Button>
                ) : isMineBusy ? (
                    // CAS 3 : Occupé par Bâtiment
                    <Button disabled className="w-full h-14 bg-red-950/10 border border-red-900/30 text-red-700 grayscale">
                        <Lock size={16} className="mr-2" />
                        <span className="text-[10px] uppercase tracking-widest">Construction Bâtiment</span>
                    </Button>
                ) : !canAfford ? (
                    // CAS 4 : Pas assez de ressources
                    <Button disabled className="w-full h-14 bg-red-950/20 border border-red-900/50 text-red-500 grayscale">
                        <AlertTriangle size={16} className="mr-2" />
                        <span className="text-[10px] uppercase tracking-widest">Ressources Manquantes</span>
                    </Button>
                ) : (
                    // CAS 5 : Disponible
                    <Button 
                        onClick={() => handleResearch(t.id)} 
                        className={`w-full h-14 font-black uppercase tracking-[0.2em] text-[10px] transition-all relative overflow-hidden group/btn bg-black hover:bg-slate-900 border border-white/10 hover:border-white/30 text-white`}
                    >
                        <div className={`absolute inset-0 opacity-0 group-hover/btn:opacity-10 ${style.bg.replace('/10', '')} transition-opacity`}></div>
                        <span className="flex items-center gap-2 relative z-10">
                            <ArrowUpCircle size={14} className={style.color} /> Lancer la Recherche
                        </span>
                    </Button>
                )}

              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}