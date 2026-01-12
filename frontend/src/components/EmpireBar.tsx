import { useState, useEffect } from "react";
import { 
  Zap, 
  Stone, 
  Droplets, 
  Gem, 
  ChevronDown,
  Mail,
  MapPin 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface EmpireBarProps {
  planet: any;
  onSwitchPlanet: (id: string) => void;
  unreadMessages?: number;
  onOpenMessages?: () => void;
}

interface PlanetSummary {
  id: string;
  name: string;
  galaxy: number;
  system: number;
  position: number;
  is_current: boolean;
}

export default function EmpireBar({ planet, onSwitchPlanet, unreadMessages = 0, onOpenMessages }: EmpireBarProps) {
  
  const [myPlanets, setMyPlanets] = useState<PlanetSummary[]>([]);

  // Récupérer la liste des planètes
  useEffect(() => {
    const fetchMyPlanets = async () => {
        const token = localStorage.getItem('token');
        if (!planet?.id || !token) return;

        try {
            // On passe l'ID actuel pour que le backend sache qui est le owner
            const res = await fetch(`http://localhost:8080/my-planets?current_planet_id=${planet.id}`, {
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
  }, [planet?.id]); // Se recharge si on change de planète (pour mettre à jour is_current)

  // Plus de calculs ici ! On fait confiance au Backend.
  const energyAvailable = planet.energy ?? 0;

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-slate-950/90 backdrop-blur-xl border-b border-white/10 h-[72px] w-full shadow-2xl z-50">
      
      {/* Partie Gauche : Planète */}
      <div className="flex items-center gap-6 shrink-0">
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.4)] border border-indigo-400/30">
                <GlobeIcon />
            </div>
            <div className="hidden xl:block">
                <h1 className="text-sm font-black text-white uppercase tracking-widest leading-none">Space Conquest</h1>
                <span className="text-[10px] text-indigo-400 font-mono tracking-wider">ONLINE</span>
            </div>
        </div>

        <div className="h-8 w-px bg-white/10 hidden md:block"></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 hover:bg-white/5 text-left h-auto py-1.5 px-3 border border-transparent hover:border-white/10 rounded-lg transition-all focus:outline-none">
                <div className="flex flex-col items-start">
                    <span className="text-[10px] text-slate-400 font-mono tracking-wider">COORD [{planet.galaxy}:{planet.system}:{planet.position}]</span>
                    <span className="font-bold text-white flex items-center gap-2 text-sm">
                        {planet.name} <ChevronDown size={14} className="text-slate-500"/>
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
      </div>

      {/* Partie Droite : Ressources */}
      <div className="flex items-center gap-8 ml-auto">
        
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide py-1 px-2">
            <ResourceItem icon={Stone} value={planet.metal_amount} label="Métal" color="text-orange-300" />
            <ResourceItem icon={Gem} value={planet.crystal_amount} label="Cristal" color="text-cyan-300" />
            <ResourceItem icon={Droplets} value={planet.deuterium_amount} label="Deutérium" color="text-green-300" />
            
            {/* ÉNERGIE (Donnée Serveur) */}
            <div className="flex items-center gap-3 group bg-black/20 px-3 py-1.5 rounded-full border border-white/5" title="Énergie (Réseau)">
                <Zap size={18} className={energyAvailable < 0 ? "text-red-500 animate-pulse" : "text-yellow-400"} />
                <span className={`font-mono text-sm font-bold min-w-[60px] text-right ${energyAvailable < 0 ? "text-red-400" : "text-white"}`}>
                    {Math.floor(energyAvailable).toLocaleString()}
                </span>
            </div>
        </div>

        <div className="h-8 w-px bg-white/10 hidden md:block"></div>

        {/* Messagerie */}
        <button 
            onClick={onOpenMessages}
            className="relative p-2.5 rounded-full hover:bg-white/10 transition-all group shrink-0"
            title="Messagerie"
        >
            <Mail size={20} className={`transition-colors ${unreadMessages > 0 ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
            
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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white h-5 w-5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
        </svg>
    )


}

function ResourceItem({ icon: Icon, value, label, color }: any) {
    const format = (n: number) => {
        if(n >= 1000000) return (n/1000000).toFixed(2) + 'M';
        if(n >= 1000) return (n/1000).toFixed(1) + 'k';
        return Math.floor(n).toLocaleString();
    }
    return (
        <div className="flex items-center gap-3 group" title={label}>
            <Icon size={18} className={`${color} transition-transform group-hover:scale-110`} />
            <span className="font-mono text-sm font-bold text-white min-w-[60px] text-right">
                {format(value)}
            </span>
        </div>
    )
}