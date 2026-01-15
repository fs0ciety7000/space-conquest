import { useEffect, useState } from "react";
import { ChevronDown, Globe, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PlanetSummary {
  id: string;
  name: string;
  galaxy: number;
  system: number;
  position: number;
  is_current: boolean;
}

export default function PlanetSelector({ currentPlanetId, onSwitch }: { currentPlanetId: string, onSwitch: (id: string) => void }) {
  const [planets, setPlanets] = useState<PlanetSummary[]>([]);

  useEffect(() => {
    fetch(`/api/my-planets?current_planet_id=${currentPlanetId}`)
      .then(res => res.json())
      .then(data => setPlanets(data))
      .catch(console.error);
  }, [currentPlanetId]);

  const current = planets.find(p => p.is_current) || planets[0];

  if (!current) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="bg-slate-900 border-indigo-500/30 hover:bg-slate-800 text-indigo-100 flex gap-3 h-12 px-4 min-w-[200px] justify-between">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-indigo-400" />
            <div className="flex flex-col items-start leading-none">
                <span className="font-bold uppercase tracking-wide text-xs">{current.name}</span>
                <span className="text-[9px] text-slate-400 font-mono">[{current.galaxy}:{current.system}:{current.position}]</span>
            </div>
          </div>
          <ChevronDown size={14} className="opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-slate-950 border-indigo-500/30 text-white min-w-[200px]">
        {planets.map(p => (
          <DropdownMenuItem 
            key={p.id} 
            onClick={() => onSwitch(p.id)}
            className={`cursor-pointer flex justify-between items-center ${p.is_current ? 'bg-indigo-900/30 text-indigo-300' : 'hover:bg-white/5'}`}
          >
            <span className="font-bold text-xs">{p.name}</span>
            <span className="text-[9px] font-mono text-slate-500">[{p.galaxy}:{p.system}:{p.position}]</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}