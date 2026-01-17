import { useState, useEffect } from "react";
import { apiUrl } from '@/config/api';
import { 
  Zap, 
  Stone, 
  Droplets, 
  Gem, 
  ChevronDown,
  Mail,
  MapPin,
  Menu
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { GalaxyMiniMap } from "./GalaxyMiniMap";

interface EmpireBarProps {
  planet: any;
  onSwitchPlanet: (id: string) => void;
  unreadMessages?: number;
  onOpenMessages?: () => void;
  onToggleSidebar?: () => void;
  onNavigateToGalaxy?: () => void;
  onNavigateToOverview?: () => void;
  speedFactor?: number;
}

interface PlanetSummary {
  id: string;
  name: string;
  galaxy: number;
  system: number;
  position: number;
  is_current: boolean;
}

export default function EmpireBar({ planet, onSwitchPlanet, unreadMessages = 0, onOpenMessages, onToggleSidebar, onNavigateToGalaxy, onNavigateToOverview, speedFactor = 10 }: EmpireBarProps) {
  
  const [myPlanets, setMyPlanets] = useState<PlanetSummary[]>([]);

  // Récupérer la liste des planètes
  useEffect(() => {
    const fetchMyPlanets = async () => {
        const token = localStorage.getItem('token');
        if (!planet?.id || !token) return;

        try {
            const res = await fetch(apiUrl(`/my-planets?current_planet_id=${planet.id}`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMyPlanets(data);
            }
        } catch (e) {
            console.error("Erreur chargement planètes", e);
        }
    };

    fetchMyPlanets();
  }, [planet?.id]);

  const energyAvailable = planet.energy ?? 0;

  // Calculs production (AJOUT)
  const calculateProduction = (level: number, baseFactor: number) => {
    const baseProd = baseFactor * level * Math.pow(1.1, level);
    return Math.floor(baseProd * speedFactor);
  };

  const prodMetal = calculateProduction(planet.metal_mine_level || 0, 30);
  const prodCrystal = calculateProduction(planet.crystal_mine_level || 0, 20);
  const prodDeut = calculateProduction(planet.deuterium_mine_level || 0, 10);
  const prodEnergy = calculateProduction(planet.solar_plant_level || 0, 20);

  return (
    <div className="flex items-center justify-between px-3 md:px-6 py-2 md:py-3 bg-slate-950/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-white/10 min-h-[60px] md:h-[72px] w-full shadow-2xl z-50">
      
      {/* Partie Gauche : Menu mobile + Logo + Planète */}
      <div className="flex items-center gap-2 md:gap-6 shrink-0">
        {/* Menu hamburger mobile */}
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <Menu size={20} className="text-white" />
          </button>
        )}

        {/* Logo cliquable */}
        <button 
          onClick={onNavigateToOverview}
          className="flex items-center gap-2 md:gap-3 hover:bg-white/5 rounded-lg px-2 py-1 transition-all group"
          title="Retour à l'accueil"
        >
            <div className="h-8 w-8 md:h-10 md:w-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.4)] border border-indigo-400/30 group-hover:shadow-[0_0_20px_rgba(79,70,229,0.6)] transition-all">
                <GlobeIcon />
            </div>
            <div className="hidden lg:block">
                <h1 className="text-sm font-black text-white uppercase tracking-widest leading-none group-hover:text-indigo-300 transition-colors">Space Conquest</h1>
                <span className="text-[10px] text-indigo-400 font-mono tracking-wider">ONLINE</span>
            </div>
        </button>

        <div className="h-8 w-px bg-white/10 hidden sm:block"></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 md:gap-3 hover:bg-white/5 text-left h-auto py-1.5 px-2 md:px-3 border border-transparent hover:border-white/10 rounded-lg transition-all focus:outline-none">
                <div className="flex flex-col items-start">
                    <span className="text-[9px] md:text-[10px] text-slate-400 font-mono tracking-wider hidden sm:inline">COORD [{planet.galaxy}:{planet.system}:{planet.position}]</span>
                    <span className="font-bold text-white flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                        <span className="truncate max-w-[100px] sm:max-w-none">{planet.name}</span> 
                        <ChevronDown size={12} className="text-slate-500"/>
                    </span>
                </div>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent className="bg-slate-950 border-slate-800 text-white shadow-2xl min-w-[240px]">
             <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-widest">Vos Colonies</DropdownMenuLabel>
             <DropdownMenuSeparator className="bg-white/10" />
             
             {myPlanets.length > 0 ? (
                 myPlanets.map((p) => (
                    <DropdownMenuItem 
                        key={p.id} 
                        onClick={() => onSwitchPlanet(p.id)}
                        className={`flex justify-between items-center py-2 cursor-pointer focus:bg-white/10 focus:text-white ${p.is_current ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300'}`}
                    >
                        <div className="flex items-center gap-2">
                            <MapPin size={14} className={p.is_current ? "text-indigo-400" : "text-slate-500"} />
                            <span className="font-bold text-sm">{p.name}</span>
                        </div>
                        <span className="font-mono text-xs opacity-60">[{p.galaxy}:{p.system}:{p.position}]</span>
                    </DropdownMenuItem>
                 ))
             ) : (
                 <DropdownMenuItem disabled className="text-slate-500 text-xs">Chargement...</DropdownMenuItem>
             )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mini-map Galaxie (Desktop uniquement) */}
        <div className="hidden xl:block">
          <GalaxyMiniMap 
            galaxy={planet.galaxy}
            system={planet.system}
            position={planet.position}
            onClick={onNavigateToGalaxy}
          />
        </div>
      </div>

      {/* Partie Droite : Ressources + Messagerie */}
      <div className="flex items-center gap-2 md:gap-6 lg:gap-8 ml-auto">
        
        {/* Ressources - Version desktop */}
        <div className="hidden lg:flex items-center gap-6">
            <ResourceItem icon={Stone} value={planet.metal_amount} label="Métal" color="text-orange-300" production={prodMetal} />
            <ResourceItem icon={Gem} value={planet.crystal_amount} label="Cristal" color="text-cyan-300" production={prodCrystal} />
            <ResourceItem icon={Droplets} value={planet.deuterium_amount} label="Deutérium" color="text-green-300" production={prodDeut} />
            
            {/* ÉNERGIE */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-3 group bg-black/20 px-3 py-1.5 rounded-full border border-white/5 cursor-help">
                      <Zap size={18} className={energyAvailable < 0 ? "text-red-500 animate-pulse" : "text-yellow-400"} />
                      <span className={`font-mono text-sm font-bold min-w-[60px] text-right ${energyAvailable < 0 ? "text-red-400" : "text-white"}`}>
                          {Math.floor(energyAvailable).toLocaleString()}
                      </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-900 border-white/10">
                  <div className="text-xs space-y-1">
                    <p className="text-slate-400">Énergie disponible</p>
                    <p className="text-yellow-400 font-mono font-bold">
                      +{formatCompact(prodEnergy)}/h
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
        </div>

        {/* Ressources - Version mobile compacte */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="lg:hidden flex items-center gap-2 px-2 py-1.5 hover:bg-white/10 rounded-lg">
              <div className="flex items-center gap-1">
                <Stone size={14} className="text-orange-300" />
                <span className="text-xs font-mono">{formatCompact(planet.metal_amount)}</span>
              </div>
              <ChevronDown size={12} className="text-slate-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-slate-950 border-slate-800 text-white shadow-2xl min-w-[200px]" align="end">
            <DropdownMenuLabel className="text-xs text-slate-500 uppercase">Ressources</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <div className="p-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stone size={14} className="text-orange-300" />
                  <span className="text-xs">Métal</span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs font-bold">{formatFull(planet.metal_amount)}</div>
                  <div className="text-[10px] text-green-400">+{formatCompact(prodMetal)}/h</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gem size={14} className="text-cyan-300" />
                  <span className="text-xs">Cristal</span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs font-bold">{formatFull(planet.crystal_amount)}</div>
                  <div className="text-[10px] text-green-400">+{formatCompact(prodCrystal)}/h</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets size={14} className="text-green-300" />
                  <span className="text-xs">Deutérium</span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs font-bold">{formatFull(planet.deuterium_amount)}</div>
                  <div className="text-[10px] text-green-400">+{formatCompact(prodDeut)}/h</div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <Zap size={14} className={energyAvailable < 0 ? "text-red-500" : "text-yellow-400"} />
                  <span className="text-xs">Énergie</span>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-xs font-bold ${energyAvailable < 0 ? "text-red-400" : "text-white"}`}>
                    {Math.floor(energyAvailable).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-yellow-400">+{formatCompact(prodEnergy)}/h</div>
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-8 w-px bg-white/10 hidden sm:block"></div>

        {/* Messagerie */}
        <button 
            onClick={onOpenMessages}
            className="relative p-2 md:p-2.5 rounded-full hover:bg-white/10 transition-all group shrink-0"
            title="Messagerie"
        >
            <Mail size={18} className={`transition-colors ${unreadMessages > 0 ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
            
            {unreadMessages > 0 && (
                <span className="absolute top-0 right-0 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-slate-950"></span>
                </span>
            )}
        </button>

      </div>
    </div>
  );
}

function GlobeIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white h-4 w-4 md:h-5 md:w-5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
        </svg>
    )
}

function ResourceItem({ icon: Icon, value, label, color, production }: any) {
    const format = (n: number) => {
        if(n >= 1000000) return (n/1000000).toFixed(2) + 'M';
        if(n >= 1000) return (n/1000).toFixed(1) + 'k';
        return Math.floor(n).toLocaleString();
    }
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-3 group cursor-help">
                        <Icon size={18} className={`${color} transition-transform group-hover:scale-110`} />
                        <span className="font-mono text-sm font-bold text-white min-w-[60px] text-right">
                            {format(value)}
                        </span>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-900 border-white/10">
                    <div className="text-xs space-y-1">
                        <p className="text-slate-400">{label}</p>
                        <p className="text-green-400 font-mono font-bold">
                            +{format(production)}/h
                        </p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

function formatCompact(n: number) {
    if(n >= 1000000) return (n/1000000).toFixed(1) + 'M';
    if(n >= 1000) return (n/1000).toFixed(0) + 'k';
    return Math.floor(n).toString();
}

function formatFull(n: number) {
    if(n >= 1000000) return (n/1000000).toFixed(2) + 'M';
    if(n >= 1000) return (n/1000).toFixed(1) + 'k';
    return Math.floor(n).toLocaleString();
}