import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, Skull, Eye, Recycle, Map, List, Home, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider"; // Si tu as shadcn/ui slider, sinon input range html standard (j'utilise standard ici pour être sûr)
import StarMap from './StarMap';

interface GalaxySlot {
  position: number;
  planet_id: string | null;
  planet_name: string | null;
  owner_name: string | null;
  has_debris: boolean;
  is_me: boolean;
}

interface GalaxyViewProps {
  planet: any;
  onNavigateAttack: (id: string, name: string) => void;
  onNavigateSpy: (id: string) => void;
}

export default function GalaxyView({ planet, onNavigateAttack, onNavigateSpy }: GalaxyViewProps) {
  const [galaxy, setGalaxy] = useState(planet.galaxy || 1);
  const [system, setSystem] = useState(planet.system || 1);
  const [slots, setSlots] = useState<GalaxySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');

  const fetchSystem = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/galaxy/${galaxy}/${system}?current_planet_id=${planet.id}`);
      if (res.ok) setSlots(await res.json());
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (viewMode === 'list') fetchSystem();
  }, [galaxy, system, viewMode]);

  const goToHome = () => {
      setGalaxy(planet.galaxy);
      setSystem(planet.system);
      setViewMode('list');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      
      {/* --- COMMAND DECK --- */}
      <div className="bg-slate-950/80 backdrop-blur-xl border-b border-white/10 p-4 sticky top-0 z-40 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* GAUCHE: Contrôles de Vue */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            <button onClick={() => setViewMode('map')} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(8,145,178,0.4)]' : 'text-slate-500 hover:text-white'}`}>
                <Map size={14} /> Scanner
            </button>
            <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'text-slate-500 hover:text-white'}`}>
                <List size={14} /> Liste
            </button>
        </div>

        {/* CENTRE: Navigation Galactique (Slider + Inputs) */}
        <div className="flex-1 w-full max-w-2xl flex items-center gap-4 bg-black/40 p-2 px-4 rounded-2xl border border-white/5">
            {/* Galaxie */}
            <div className="flex flex-col items-center">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Galaxie</span>
                <Input 
                    type="number" min="1" max="5" 
                    className="w-12 h-8 bg-transparent border-none text-center font-black text-white p-0 focus:ring-0" 
                    value={galaxy} onChange={e => setGalaxy(parseInt(e.target.value) || 1)}
                />
            </div>

            <div className="h-8 w-px bg-white/10"></div>

            {/* Système (Slider) */}
            <div className="flex-1 flex flex-col justify-center gap-1">
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Système</span>
                    <span className="text-cyan-400">{system}</span>
                </div>
                <input 
                    type="range" min="1" max="100" 
                    value={system} 
                    onChange={(e) => setSystem(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
            </div>

            <div className="h-8 w-px bg-white/10"></div>

            {/* Boutons Précédent / Suivant */}
            <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 rounded-lg" onClick={() => setSystem(Math.max(1, system - 1))}><ChevronLeft size={16}/></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 rounded-lg" onClick={() => setSystem(system + 1)}><ChevronRight size={16}/></Button>
            </div>
        </div>

        {/* DROITE: Actions */}
        <div className="flex gap-2">
            <Button size="sm" onClick={fetchSystem} className="bg-cyan-600/80 hover:bg-cyan-500 text-white backdrop-blur border border-cyan-400/30">
                <Search size={16} className="mr-2" /> SCAN
            </Button>
            <Button size="sm" variant="outline" onClick={goToHome} className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
                <Home size={16} />
            </Button>
        </div>
      </div>

      {/* --- CONTENU --- */}
      
      {viewMode === 'map' ? (
        <div className="animate-in zoom-in-95 duration-500 px-4">
             <StarMap galaxy={galaxy} currentSystem={system} currentPlanetId={planet.id} onSystemSelect={(sys) => { setSystem(sys); setViewMode('list'); }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 px-4 animate-in slide-in-from-bottom-8 duration-500">
            {slots.map((slot) => (
                <div key={slot.position} className={`relative p-4 rounded-xl border transition-all duration-300 group overflow-hidden ${
                    slot.planet_id 
                    ? (slot.is_me ? 'bg-indigo-950/30 border-indigo-500/40 hover:border-indigo-400' : 'bg-slate-900/40 border-white/5 hover:border-white/20') 
                    : 'bg-black/20 border-white/5 opacity-60 hover:opacity-100'
                }`}>
                    
                    {/* Background Gradient si habité */}
                    {slot.planet_id && <div className={`absolute inset-0 bg-gradient-to-br ${slot.is_me ? 'from-indigo-600/10' : 'from-slate-700/10'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>}

                    <div className="flex items-start justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <span className="text-2xl font-black text-slate-700 group-hover:text-slate-500 transition-colors font-mono">
                                {slot.position < 10 ? `0${slot.position}` : slot.position}
                            </span>
                            {slot.planet_id ? (
                                <div>
                                    <h4 className={`font-black uppercase text-sm ${slot.is_me ? 'text-indigo-300' : 'text-white'}`}>{slot.planet_name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${slot.is_me ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                            {slot.owner_name}
                                        </span>
                                        {slot.is_me && <span className="text-[10px] text-indigo-400 font-mono">Q.G.</span>}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-xs text-slate-600 font-mono uppercase tracking-widest">Orbite Vide</span>
                            )}
                        </div>

                        {/* Indicateur Débris */}
                        {slot.has_debris && (
                            <div className="absolute top-2 right-2 animate-pulse" title="Champ de débris détecté">
                                <Recycle size={14} className="text-green-500" />
                            </div>
                        )}
                    </div>

                    {/* Barre d'actions (Apparaît au survol) */}
                    {slot.planet_id && !slot.is_me && (
                        <div className="mt-4 pt-3 border-t border-white/5 flex gap-2 justify-end opacity-40 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                            <Button size="sm" variant="ghost" className="h-8 text-blue-400 hover:bg-blue-500/20" onClick={() => onNavigateSpy(slot.planet_id!)}>
                                <Eye size={14} className="mr-2"/> SCAN
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 text-red-400 hover:bg-red-500/20" onClick={() => onNavigateAttack(slot.planet_id!, slot.planet_name!)}>
                                <Skull size={14} className="mr-2"/> RAID
                            </Button>
                        </div>
                    )}
                    {!slot.planet_id && (
                        <div className="mt-4 pt-3 border-t border-white/5 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[9px] text-slate-500 font-mono uppercase cursor-not-allowed">Données topographiques manquantes</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
      )}
    </div>
  );
}