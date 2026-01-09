import { useEffect, useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

interface SystemSummary {
  system: number;
  planet_count: number;
  has_me: boolean;
}

interface StarMapProps {
  galaxy: number;
  currentSystem: number;
  onSystemSelect: (sys: number) => void;
  currentPlanetId: string;
}

export default function StarMap({ galaxy, currentSystem, onSystemSelect, currentPlanetId }: StarMapProps) {
  const [systemsData, setSystemsData] = useState<SystemSummary[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8080/galaxy/${galaxy}/scan?current_planet_id=${currentPlanetId}`)
      .then(res => res.json())
      .then(data => setSystemsData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [galaxy, currentPlanetId]);

  const mapData = useMemo(() => {
    const stars = [];
    const connections = [];
    const systemsToShow = 50; 
    
    for (let i = 1; i <= systemsToShow; i++) {
      const seed = i * 1337 + galaxy * 9999;
      const x = (seed % 80) + 10; 
      const y = ((seed * 7) % 80) + 10;
      const size = ((seed * 3) % 4) + 2; 
      stars.push({ system: i, x, y, size });
    }

    for (let i = 0; i < stars.length; i++) {
      let connectionsCount = 0;
      for (let j = i + 1; j < stars.length; j++) {
        if (connectionsCount >= 2) break;
        const dist = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y);
        if (dist < 20 && (stars[i].system + stars[j].system) % 3 === 0) {
            connections.push({ 
                x1: stars[i].x, y1: stars[i].y, 
                x2: stars[j].x, y2: stars[j].y,
                key: `${stars[i].system}-${stars[j].system}`
            });
            connectionsCount++;
        }
      }
    }
    return { stars, connections };
  }, [galaxy]);

  return (
    <Card className="bg-[#020617] border border-cyan-500/20 relative overflow-hidden h-[500px] shadow-[inset_0_0_100px_rgba(0,0,0,0.9)] group select-none rounded-3xl">
      
      {/* FOND ANIMÉ */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Grille Hexagonale Subtile */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/hexellence.png')]"></div>
        
        {/* Radar Sweep Effect */}
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(6,182,212,0.1)_360deg)] animate-[spin_5s_linear_infinite] rounded-full w-[200%] h-[200%] -top-[50%] -left-[50%] pointer-events-none"></div>
      </div>

      {loading && (
        <div className="absolute top-6 right-6 flex items-center gap-2 text-cyan-400 text-[10px] font-black tracking-widest animate-pulse z-20">
            <Loader2 size={14} className="animate-spin" /> ANALYSE SECTORIELLE...
        </div>
      )}

      <svg className="w-full h-full relative z-10" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <defs>
            <filter id="glow-star"><feGaussianBlur stdDeviation="1.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>

        {/* Connexions */}
        {mapData.connections.map(line => (
            <line key={line.key} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#1e293b" strokeWidth="0.15" strokeDasharray="1 1" />
        ))}

        {/* Étoiles */}
        {mapData.stars.map((star) => {
          const data = systemsData.find(s => s.system === star.system);
          const isOccupied = data && data.planet_count > 0;
          const isMe = data?.has_me;
          const isCurrent = currentSystem === star.system;

          let fill = "#334155"; 
          let radius = star.size * 0.3;

          if (isCurrent) { fill = "#06b6d4"; radius = 2; } 
          else if (isMe) { fill = "#22c55e"; radius = 1.5; } 
          else if (isOccupied) { fill = "#ef4444"; radius = 1.2; }

          return (
            <g key={star.system} onClick={() => onSystemSelect(star.system)} className="cursor-pointer group/star">
               <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <g>
                        <circle cx={star.x} cy={star.y} r="6" fill="transparent" /> {/* Hitbox */}
                        <circle cx={star.x} cy={star.y} r={radius} fill={fill} filter={isCurrent || isMe ? "url(#glow-star)" : ""} className="transition-all duration-300 ease-out" />
                        
                        {/* Effet d'onde si c'est moi */}
                        {isMe && !isCurrent && <circle cx={star.x} cy={star.y} r="4" fill="none" stroke="#22c55e" strokeWidth="0.1" className="animate-ping opacity-20" />}

                        {/* Viseur de sélection */}
                        {isCurrent && (
                            <g className="animate-spin-slow" style={{ transformOrigin: `${star.x}px ${star.y}px` }}>
                                <path d={`M ${star.x-4} ${star.y} L ${star.x-3} ${star.y}`} stroke="#06b6d4" strokeWidth="0.4" />
                                <path d={`M ${star.x+4} ${star.y} L ${star.x+3} ${star.y}`} stroke="#06b6d4" strokeWidth="0.4" />
                                <path d={`M ${star.x} ${star.y-4} L ${star.x} ${star.y-3}`} stroke="#06b6d4" strokeWidth="0.4" />
                                <path d={`M ${star.x} ${star.y+4} L ${star.x} ${star.y+3}`} stroke="#06b6d4" strokeWidth="0.4" />
                                <circle cx={star.x} cy={star.y} r="5" fill="none" stroke="#06b6d4" strokeWidth="0.1" opacity="0.3" />
                            </g>
                        )}
                    </g>
                  </TooltipTrigger>
                  <TooltipContent className="bg-black/90 border-cyan-900 text-xs font-mono">
                    <span className="text-cyan-400 font-bold">SYS-{star.system}</span> 
                    <span className="text-slate-500 ml-2">{isOccupied ? 'HABITÉ' : 'VIDE'}</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </g>
          );
        })}
      </svg>
    </Card>
  );
}