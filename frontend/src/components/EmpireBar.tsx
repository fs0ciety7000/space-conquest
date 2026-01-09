import { Zap, Hexagon, Gem, Droplets, Swords, Activity, MapPin } from "lucide-react";

export default function EmpireBar({ planet }: { planet: any }) {
  // Sécurisation des valeurs
  const metal = Math.floor(planet?.metal_amount || 0);
  const crystal = Math.floor(planet?.crystal_amount || 0);
  const deut = Math.floor(planet?.deuterium_amount || 0);

  // Calcul de l'énergie
  const consumption = 
    (10 * (planet.metal_mine_level || 0) * Math.pow(1.1, planet.metal_mine_level || 0)) +
    (10 * (planet.crystal_mine_level || 0) * Math.pow(1.1, planet.crystal_mine_level || 0)) +
    (12 * (planet.deuterium_mine_level || 0) * Math.pow(1.1, planet.deuterium_mine_level || 0));
  
  const energyMax = 200 + ((planet.energy_tech_level || 0) * 50);
  
  // Pourcentage d'utilisation de l'énergie (maxé à 100% pour l'affichage barre)
  const energyPercent = Math.min(100, (consumption / energyMax) * 100);
  const isEnergyCritical = consumption > energyMax;

  return (
    <div className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-b border-white/10 z-50 h-20 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
      
      {/* Ligne de décoration supérieure */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>

      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6">
        
        {/* PARTIE GAUCHE : IDENTIFICATION */}
        <div className="flex items-center gap-4 border-r border-white/10 pr-6 mr-6 h-10">
            <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/30">
                <MapPin size={18} className="text-indigo-400" />
            </div>
            <div className="hidden md:block">
                <h1 className="text-xs font-black uppercase text-white tracking-[0.2em]">Colonie Alpha</h1>
                <p className="text-[9px] text-slate-500 font-mono">Système Solaire • [1:1:1]</p>
            </div>
        </div>

        {/* PARTIE CENTRALE : RESSOURCES */}
        <div className="flex-1 flex justify-center gap-2 md:gap-8">
          
          {/* MÉTAL */}
          <div className="group flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900/50 border border-white/5 hover:border-orange-500/30 transition-all">
            <div className="p-1.5 rounded bg-orange-500/10 border border-orange-500/20 group-hover:shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-shadow">
                <Hexagon size={14} className="text-orange-500" />
            </div>
            <div className="flex flex-col">
                <span className="text-[8px] uppercase font-bold text-slate-500 group-hover:text-orange-400 transition-colors">Métal</span>
                <span className="text-xs font-mono font-black text-slate-200">{metal.toLocaleString()}</span>
            </div>
          </div>

          {/* CRISTAL */}
          <div className="group flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900/50 border border-white/5 hover:border-purple-500/30 transition-all">
            <div className="p-1.5 rounded bg-purple-500/10 border border-purple-500/20 group-hover:shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-shadow">
                <Gem size={14} className="text-purple-400" />
            </div>
            <div className="flex flex-col">
                <span className="text-[8px] uppercase font-bold text-slate-500 group-hover:text-purple-400 transition-colors">Cristal</span>
                <span className="text-xs font-mono font-black text-slate-200">{crystal.toLocaleString()}</span>
            </div>
          </div>

          {/* DEUTERIUM */}
          <div className="group flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900/50 border border-white/5 hover:border-cyan-500/30 transition-all">
            <div className="p-1.5 rounded bg-cyan-500/10 border border-cyan-500/20 group-hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-shadow">
                <Droplets size={14} className="text-cyan-400" />
            </div>
            <div className="flex flex-col">
                <span className="text-[8px] uppercase font-bold text-slate-500 group-hover:text-cyan-400 transition-colors">Deutérium</span>
                <span className="text-xs font-mono font-black text-slate-200">{deut.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* PARTIE DROITE : SYSTÈMES (ÉNERGIE & FLOTTE) */}
        <div className="flex items-center gap-6 border-l border-white/10 pl-6 ml-6 h-10">
            
            {/* Jauge Énergie */}
            <div className="flex flex-col gap-1 w-32">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-1">
                        <Zap size={10} className={isEnergyCritical ? "text-red-500 animate-pulse" : "text-yellow-400"} />
                        <span className="text-[8px] uppercase font-bold text-slate-400">Énergie</span>
                    </div>
                    <span className={`text-[9px] font-mono ${isEnergyCritical ? "text-red-500 font-bold" : "text-slate-300"}`}>
                        {Math.floor(consumption)} / {energyMax}
                    </span>
                </div>
                {/* Barre de progression */}
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-500 ${isEnergyCritical ? "bg-red-500 shadow-[0_0_10px_red]" : "bg-yellow-400 shadow-[0_0_5px_yellow]"}`} 
                        style={{ width: `${energyPercent}%` }}
                    ></div>
                </div>
            </div>

            {/* Indicateur Flotte */}
            <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <Swords size={14} className="text-indigo-400" />
                <div className="flex flex-col items-end">
                    <span className="text-[8px] uppercase font-bold text-slate-500">Flotte</span>
                    <span className="text-xs font-mono font-black text-white">{planet.light_hunter_count || 0}</span>
                </div>
            </div>

            {/* Indicateur Activité (Décoratif) */}
            <Activity size={16} className="text-green-500 animate-pulse hidden md:block" />

        </div>
      </div>
    </div>
  );
}