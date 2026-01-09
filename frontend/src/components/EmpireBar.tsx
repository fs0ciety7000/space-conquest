import { Database, Zap, Rocket, Gem, Activity } from "lucide-react";

export default function EmpireBar({ planet }: { planet: any }) {
  if (!planet) return null;

  // Calcul du total de la flotte (Mise à jour avec les nouveaux vaisseaux)
  const totalFleet = (planet.light_hunter_count || 0) 
                   + (planet.cruiser_count || 0) 
                   + (planet.recycler_count || 0) 
                   + (planet.spy_probe_count || 0);

  // Formatter pour les grands nombres (ex: 1.2k, 1M)
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return Math.floor(num).toString();
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-20 bg-slate-950/80 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-4 lg:px-8 shadow-2xl">
      
      {/* IDENTITÉ PLANÈTE */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white/20 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
        <div className="hidden md:block">
            <h1 className="text-sm font-black uppercase text-white tracking-widest">{planet.name}</h1>
            <p className="text-[10px] text-slate-400 font-mono">Secteur Alpha-9</p>
        </div>
      </div>

      {/* RESSOURCES */}
      <div className="flex gap-4 md:gap-8 bg-black/40 px-6 py-2 rounded-full border border-white/5">
        
        {/* MÉTAL */}
        <div className="flex flex-col items-center min-w-[60px]">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Database size={10} /> Métal
            </span>
            <span className="text-sm font-mono font-black text-white drop-shadow-md">
                {formatNumber(planet.metal_amount)}
            </span>
        </div>

        <div className="w-px bg-white/10 h-8"></div>

        {/* CRISTAL */}
        <div className="flex flex-col items-center min-w-[60px]">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Gem size={10} /> Cristal
            </span>
            <span className="text-sm font-mono font-black text-cyan-400 drop-shadow-md">
                {formatNumber(planet.crystal_amount)}
            </span>
        </div>

        <div className="w-px bg-white/10 h-8"></div>

        {/* DEUTERIUM */}
        <div className="flex flex-col items-center min-w-[60px]">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Activity size={10} /> Deut.
            </span>
            <span className="text-sm font-mono font-black text-green-400 drop-shadow-md">
                {formatNumber(planet.deuterium_amount)}
            </span>
        </div>
      </div>

      {/* STATS GLOBALES (Énergie & Flotte) */}
      <div className="flex items-center gap-6">
        
        {/* ÉNERGIE (Basée sur la tech énergie pour l'instant) */}
        <div className="hidden md:flex flex-col items-end">
            <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <Zap size={10} /> Énergie
            </span>
            <span className="text-xs font-mono font-bold text-white">
                {(planet.energy_tech_level * 500).toLocaleString()}
            </span>
        </div>

        {/* FLOTTE TOTALE */}
        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
            <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                <Rocket size={16} />
            </div>
            <div>
                <p className="text-[9px] text-slate-400 font-black uppercase">Flotte</p>
                <p className="text-sm text-white font-mono font-bold">{totalFleet.toLocaleString()}</p>
            </div>
        </div>

      </div>
    </div>
  );
}