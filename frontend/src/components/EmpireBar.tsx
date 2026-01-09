import { Zap, Database, Swords } from "lucide-react";

export default function EmpireBar({ planet }: { planet: any }) {
  // Sécurisation des valeurs pour l'affichage
  const metal = Math.floor(planet?.metal_amount || 0);
  const crystal = Math.floor(planet?.crystal_amount || 0);
  const deut = Math.floor(planet?.deuterium_amount || 0);

  // Calcul de l'énergie (consommation vs max)
  const consumption = 
    (10 * (planet.metal_mine_level || 0) * Math.pow(1.1, planet.metal_mine_level || 0)) +
    (10 * (planet.crystal_mine_level || 0) * Math.pow(1.1, planet.crystal_mine_level || 0)) +
    (12 * (planet.deuterium_mine_level || 0) * Math.pow(1.1, planet.deuterium_mine_level || 0));
  
  const energyMax = 200 + ((planet.energy_tech_level || 0) * 50);

  return (
    <div className="fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-b border-white/5 z-50 py-3 px-6 shadow-2xl">
      <div className="max-w-7xl mx-auto flex justify-between items-center font-mono">
        <div className="flex gap-10">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-black text-slate-500 mb-1">Métal</span>
            <span className="text-sm font-black text-orange-500">{metal.toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-black text-slate-500 mb-1">Cristal</span>
            <span className="text-sm font-black text-blue-400">{crystal.toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-black text-slate-500 mb-1">Deutérium</span>
            <span className="text-sm font-black text-teal-400">{deut.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/5 flex items-center gap-3">
            <Zap size={14} className={consumption > energyMax ? "text-red-500" : "text-indigo-500"} />
            <div className="flex flex-col">
              <span className="text-[8px] uppercase font-black text-slate-500">Énergie</span>
              <span className="text-xs font-black">{Math.floor(consumption)} / {energyMax}</span>
            </div>
          </div>
          <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/5 flex items-center gap-3">
            <Swords size={14} className="text-indigo-500" />
            <div className="flex flex-col">
              <span className="text-[8px] uppercase font-black text-slate-500">Flotte</span>
              <span className="text-xs font-black">{planet.light_hunter_count || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}