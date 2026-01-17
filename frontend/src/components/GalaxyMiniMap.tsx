import { MapPin } from 'lucide-react';

interface GalaxyMiniMapProps {
  galaxy: number;
  system: number;
  position: number;
  onClick?: () => void;
}

export function GalaxyMiniMap({ galaxy, system, position, onClick }: GalaxyMiniMapProps) {
  // Représentation simplifiée : 9 galaxies, 499 systèmes, 15 positions
  const galaxyProgress = (galaxy / 9) * 100;
  const systemProgress = (system / 499) * 100;
  const positionProgress = (position / 15) * 100;

  return (
    <div 
      className="group relative cursor-pointer"
      onClick={onClick}
      title={`Position: G${galaxy}:S${system}:P${position}`}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 bg-black/30 rounded-lg border border-white/10 hover:border-indigo-500/50 transition-all">
        <MapPin size={14} className="text-indigo-400" />
        
        {/* Mini carte 3D-like */}
        <div className="flex flex-col gap-0.5">
          {/* Galaxie */}
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-slate-500 font-mono w-3">G</span>
            <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all"
                style={{ width: `${galaxyProgress}%` }}
              />
            </div>
            <span className="text-[8px] text-indigo-300 font-mono font-bold w-2">{galaxy}</span>
          </div>
          
          {/* Système */}
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-slate-500 font-mono w-3">S</span>
            <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all"
                style={{ width: `${systemProgress}%` }}
              />
            </div>
            <span className="text-[8px] text-cyan-300 font-mono font-bold w-4 text-right">{system}</span>
          </div>
          
          {/* Position */}
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-slate-500 font-mono w-3">P</span>
            <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all"
                style={{ width: `${positionProgress}%` }}
              />
            </div>
            <span className="text-[8px] text-green-300 font-mono font-bold w-2">{position}</span>
          </div>
        </div>
      </div>
      
      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-slate-950 border border-white/20 rounded-lg px-3 py-2 shadow-2xl whitespace-nowrap">
          <p className="text-xs text-slate-300 font-mono">
            <span className="text-indigo-400">Galaxie {galaxy}</span> → 
            <span className="text-cyan-400"> Système {system}</span> → 
            <span className="text-green-400"> Position {position}</span>
          </p>
        </div>
      </div>
    </div>
  );
}