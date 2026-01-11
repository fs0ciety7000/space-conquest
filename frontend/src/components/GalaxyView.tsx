import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, Skull, Eye, Recycle, Map, List, Home, Flag, Truck, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import StarMap from './StarMap';
import TransportModal from './TransportModal';

interface GalaxySlot {
  position: number;
  planet_id: string | null;
  planet_name: string | null;
  owner_name: string | null;
  owner_id: string | null;
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
  const [transportTarget, setTransportTarget] = useState<{id: string, name: string} | null>(null);

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

  const handleColonize = async (g: number, s: number, p: number) => {
    if(!confirm(`Envoyer un vaisseau de colonisation vers [${g}:${s}:${p}] ?`)) return;

    try {
        const res = await fetch(`http://localhost:8080/colonize?current_planet_id=${planet.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ galaxy: g, system: s, position: p })
        });
        const data = await res.json();
        if(res.ok) {
            alert("🚀 " + data.message);
            fetchSystem();
        } else {
            alert("❌ Erreur: " + data.error);
        }
    } catch(e) { console.error(e); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      
      {/* --- COMMAND DECK --- */}
      <div className="bg-slate-950/80 backdrop-blur-xl border-b border-white/10 p-4 sticky top-0 z-40 shadow-2xl flex flex-col xl:flex-row items-center justify-between gap-4">
        
        {/* Contrôles de Vue */}
        <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 w-full xl:w-auto">
            <button onClick={() => setViewMode('map')} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' : 'text-slate-500 hover:text-white'}`}>
                <Map size={14} /> Carte
            </button>
            <button onClick={() => setViewMode('list')} className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-500 hover:text-white'}`}>
                <List size={14} /> Système
            </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 w-full max-w-3xl flex items-center gap-3 bg-slate-900/50 p-2 rounded-xl border border-white/5 shadow-inner">
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded border border-white/5">
                <span className="text-[9px] font-bold text-slate-500">GAL</span>
                <Input 
                    type="number" min="1" max="5" 
                    className="w-8 h-8 bg-transparent border-none text-center font-black text-white p-0 focus:ring-0" 
                    value={galaxy} onChange={e => setGalaxy(parseInt(e.target.value) || 1)}
                />
            </div>
            <span className="text-slate-600 font-black">/</span>
            <div className="flex-1 flex items-center gap-3 bg-black/40 px-3 py-1 rounded border border-white/5">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={() => setSystem(Math.max(1, system - 1))}><ChevronLeft size={14}/></Button>
                <div className="flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-bold text-slate-500">SYSTÈME</span>
                        <span className="text-[10px] font-black text-cyan-400">{system}</span>
                    </div>
                    <input 
                        type="range" min="1" max="100" 
                        value={system} 
                        onChange={(e) => setSystem(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={() => setSystem(system + 1)}><ChevronRight size={14}/></Button>
            </div>
            <Button onClick={fetchSystem} className="bg-cyan-600 hover:bg-cyan-500 text-white h-10 w-12 rounded-lg shadow-lg">
                <Search size={18} />
            </Button>
        </div>

        <div className="hidden xl:block">
            <Button variant="outline" onClick={goToHome} className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 gap-2">
                <Home size={14} /> MA BASE
            </Button>
        </div>
      </div>

      {/* --- VUES --- */}
      
      {viewMode === 'map' ? (
        <div className="animate-in zoom-in-95 duration-500 px-4">
             <StarMap galaxy={galaxy} currentSystem={system} currentPlanetId={planet.id} onSystemSelect={(sys) => { setSystem(sys); setViewMode('list'); }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 px-4 animate-in slide-in-from-bottom-8 duration-500">
            {slots.map((slot) => {
                const isOwner = slot.owner_id === planet.owner_id;
                const isCurrentPlanet = slot.planet_id === planet.id;
                const isEmpty = !slot.planet_id;
                const isEnemy = !isEmpty && !isOwner;

                let cardStyle = "bg-slate-900/40 border-white/5 opacity-80 hover:opacity-100";
                let statusColor = "text-slate-500";
                let statusText = "Vide";

                if (isCurrentPlanet) {
                    cardStyle = "bg-cyan-950/30 border-cyan-500/50 opacity-100 shadow-[0_0_20px_rgba(6,182,212,0.15)]";
                    statusColor = "text-cyan-400";
                    statusText = "Q.G. Actif";
                } else if (isOwner) {
                    cardStyle = "bg-green-950/30 border-green-500/50 opacity-100 shadow-[0_0_20px_rgba(34,197,94,0.15)]";
                    statusColor = "text-green-400";
                    statusText = "Colonie Alliée";
                } else if (isEnemy) {
                    cardStyle = "bg-red-950/20 border-red-500/30 hover:border-red-500/60 opacity-100";
                    statusColor = "text-red-400";
                    statusText = "Hostile";
                }

                return (
                    <div key={slot.position} className={`relative p-4 rounded-xl border transition-all duration-300 group overflow-hidden ${cardStyle}`}>
                        
                        {/* Background Decoratif (Correction Z-Index: il est en z-0, le contenu doit être au-dessus) */}
                        {slot.planet_id && <div className={`absolute inset-0 bg-gradient-to-br ${isOwner ? 'from-green-500/5' : 'from-red-500/5'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-0`}></div>}

                        {/* Contenu Header (z-10) */}
                        <div className="flex items-start justify-between relative z-10 mb-4">
                            <div className="flex items-center gap-4">
                                <span className="text-3xl font-black text-slate-800 group-hover:text-slate-600 transition-colors font-mono select-none">
                                    {slot.position < 10 ? `0${slot.position}` : slot.position}
                                </span>
                                
                                {slot.planet_id ? (
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className={`font-black uppercase text-sm ${isOwner ? 'text-white' : 'text-slate-200'}`}>
                                                {slot.planet_name}
                                            </h4>
                                            {isCurrentPlanet && <MapPin size={12} className="text-cyan-400 animate-bounce" />}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className={`text-[9px] border-0 px-1.5 py-0 ${isOwner ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                                {slot.owner_name}
                                            </Badge>
                                            <span className={`text-[9px] font-mono ${statusColor}`}>{statusText}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <h4 className="font-bold text-xs text-slate-500 uppercase tracking-widest">Orbite Libre</h4>
                                        <span className="text-[9px] text-slate-600">Planète non colonisée</span>
                                    </div>
                                )}
                            </div>

                            {slot.has_debris && (
                                <div className="bg-black/40 p-1.5 rounded border border-white/10 animate-pulse relative z-10" title="Champ de débris">
                                    <Recycle size={14} className="text-green-500" />
                                </div>
                            )}
                        </div>

                        {/* --- BARRE D'ACTIONS --- */}
                        {/* CORRECTION : Ajout de relative z-20 pour passer au-dessus du fond */}
                        <div className="pt-3 border-t border-white/5 flex gap-2 justify-end min-h-[40px] relative z-20">
                            
                            {/* C'est MOI (mais pas ici) -> TRANSPORT */}
                            {isOwner && !isCurrentPlanet && (
                                <Button 
                                    size="sm" 
                                    className="h-8 bg-green-600/20 hover:bg-green-600 hover:text-white text-green-400 border border-green-500/30 w-full transition-all"
                                    onClick={(e) => { e.stopPropagation(); setTransportTarget({ id: slot.planet_id!, name: slot.planet_name! }); }}
                                >
                                    <Truck size={14} className="mr-2" /> TRANSPORT
                                </Button>
                            )}

                            {/* C'est ENNEMI -> SCAN / ATTAQUE */}
                            {isEnemy && (
                                <>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-400 hover:bg-blue-500/20 hover:text-white rounded-full" onClick={(e) => { e.stopPropagation(); onNavigateSpy(slot.planet_id!); }}>
                                        <Eye size={14} />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/20 hover:text-white rounded-full" onClick={(e) => { e.stopPropagation(); onNavigateAttack(slot.planet_id!, slot.planet_name!); }}>
                                        <Skull size={14} />
                                    </Button>
                                </>
                            )}

                            {/* C'est VIDE -> COLONISER */}
                            {isEmpty && (
                                <Button 
                                    size="sm" 
                                    className="h-8 w-full bg-slate-800 hover:bg-yellow-600 hover:text-white text-slate-400 border border-transparent hover:border-yellow-400 transition-all"
                                    onClick={(e) => { e.stopPropagation(); handleColonize(galaxy, system, slot.position); }}
                                >
                                    <Flag size={14} className="mr-2 opacity-50" /> Coloniser
                                </Button>
                            )}

                            {/* C'est QG ACTIF -> RIEN */}
                            {isCurrentPlanet && (
                                <div className="w-full flex justify-center items-center text-[10px] text-cyan-600 font-mono uppercase tracking-widest opacity-50">
                                    <Navigation size={12} className="mr-2" /> Q.G. ACTIF
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      )}

      {transportTarget && (
          <TransportModal 
            currentPlanet={planet} 
            targetPlanet={transportTarget} 
            onClose={() => setTransportTarget(null)}
            onConfirm={() => {
                fetchSystem(); 
                setTransportTarget(null);
            }}
          />
      )}
    </div>
  );
}