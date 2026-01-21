import { useEffect, useState } from 'react';
import {
    ChevronLeft, ChevronRight, Search,
    Crosshair, Eye, Send, Recycle, MapPin,
    Rocket, User, List, LayoutGrid, Sparkles, X, ShieldCheck, Crown, Flag, Truck, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiUrl } from '@/config/api';
import ColonizeModal from './ColonizeModal';
import BeginnerProtectionBadge from './BeginnerProtectionBadge';
import Galaxy3DView from './galaxy3d/Galaxy3DView';
import { calculateDistance } from '@/utils/galaxyCalculations';
// --- INTERFACES ---

interface GalaxySlot {
    position: number;
    planet_id: string | null;
    planet_name: string | null;
    owner_name: string | null;
    owner_id: string | null;
    debris_metal: number;
    debris_crystal: number;
    is_me: boolean;       // Planète active
    is_my_planet: boolean; // Une de mes colonies
    protection_until: string | null;
    total_points: number;
    planet_galaxy: number;
}

interface GalaxyViewProps {
    planet: any;
    onNavigateAttack: (id: string, name: string) => void;
    onNavigateSpy: (id: string) => void;
    onNavigateTransport: (id: string, name: string, galaxy: number, system: number, position: number) => void;
}

// --- COMPOSANT PRINCIPAL ---

export default function GalaxyView({ planet, onNavigateAttack, onNavigateSpy, onNavigateTransport }: GalaxyViewProps) {
    const [galaxy, setGalaxy] = useState(planet.galaxy);
    const [system, setSystem] = useState(planet.system);
    const [slots, setSlots] = useState<GalaxySlot[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'map' | '3d'>('map');
    const [selectedSlot, setSelectedSlot] = useState<GalaxySlot | null>(null);
    const [showColonizeModal, setShowColonizeModal] = useState(false);
    const [colonizePosition, setColonizePosition] = useState<number>(0);
    const [nearbyPlanets, setNearbyPlanets] = useState<any[]>([]);
    const [playerPlanets, setPlayerPlanets] = useState<any[]>([]);
    const [showNearby, setShowNearby] = useState(false);
    const [showPlayerPlanets, setShowPlayerPlanets] = useState(true);

    useEffect(() => { fetchSystem(); setSelectedSlot(null); }, [galaxy, system]);
    useEffect(() => { fetchPlayerPlanets(); }, []);

    const fetchSystem = async () => {
        setLoading(true);
        try {
            const res = await fetch(apiUrl(`/galaxy/${galaxy}/${system}?current_planet_id=${planet.id}`));
            if (res.ok) setSlots(await res.json());
        } catch (e) { toast.error("Erreur de radar"); } finally { setLoading(false); }
    };

    const handleColonize = (position: number) => {
        setColonizePosition(position);
        setShowColonizeModal(true);
    };

    const fetchPlayerPlanets = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(apiUrl('/user/planets'), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const planets = await res.json();
                setPlayerPlanets(planets);
            }
        } catch (e) {
            console.error('Failed to fetch player planets');
        }
    };

    const scanNearbyPlanets = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(apiUrl('/galaxy/scan/nearby'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_planet_id: planet.id,
                    max_results: 20
                })
            });

            if (res.ok) {
                const data = await res.json();
                // Calculate distances and sort
                const planetsWithDistance = data.map((p: any) => ({
                    ...p,
                    distance: calculateDistance(
                        { galaxy: planet.galaxy, system: planet.system, position: planet.position },
                        { galaxy: p.galaxy, system: p.system, position: p.position }
                    )
                })).sort((a: any, b: any) => a.distance - b.distance);

                setNearbyPlanets(planetsWithDistance);
                setShowNearby(true);
                toast.success(`${planetsWithDistance.length} planètes proches détectées`);
            } else {
                toast.error("Échec du scan");
            }
        } catch (e) {
            toast.error("Erreur de scan");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmColonize = async (position: number, metal: number, crystal: number, deuterium: number) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(apiUrl(`/colonize?current_planet_id=${planet.id}`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    galaxy,
                    system,
                    position,
                    metal: metal > 0 ? metal : undefined,
                    crystal: crystal > 0 ? crystal : undefined,
                    deuterium: deuterium > 0 ? deuterium : undefined
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Vaisseau de colonisation envoyé !", {
                    description: data.message || `Colonie établie en [${galaxy}:${system}:${position}]`
                });
                setShowColonizeModal(false);
                fetchSystem();
            } else {
                toast.error("Erreur de colonisation", {
                    description: data.error || "Impossible de coloniser cette position"
                });
            }
        } catch (e) {
            toast.error("Erreur réseau");
        }
    };

    const handleRecycle = async (targetId: string) => {
        const token = localStorage.getItem('token');
        const availableRecyclers = planet.recycler_count || 0;

        if (availableRecyclers === 0) {
            toast.error("Aucun recycleur disponible", {
                description: "Construisez des recycleurs au chantier spatial"
            });
            return;
        }

        // Envoyer tous les recycleurs disponibles (max 50 pour éviter les surcharges)
        const recyclersToSend = Math.min(availableRecyclers, 50);

        try {
            const res = await fetch(apiUrl(`/recycle?current_planet_id=${planet.id}`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_planet_id: targetId, recyclers: recyclersToSend })
            });
            if (res.ok) {
                const data = await res.json();
                toast.success("Recyclage terminé", { description: data.message });
                fetchSystem();
            } else {
                const error = await res.json();
                toast.error("Échec recyclage", { description: error.error || "Erreur inconnue" });
            }
        } catch (e) {
            toast.error("Erreur réseau");
        }
    };

    const getPlanetStyle = (name: string) => {
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const types = [
            "from-blue-500 to-indigo-900", 
            "from-red-500 to-orange-900",   
            "from-emerald-500 to-green-900", 
            "from-slate-300 to-slate-800", 
            "from-purple-500 to-fuchsia-900", 
            "from-yellow-400 to-orange-700", 
        ];
        return types[hash % types.length];
    };

    return (
        <div className="space-y-6 pb-20 relative min-h-[80vh] animate-fade-in">

            {/* NAVIGATION */}
            <div className="sticky top-0 z-30 -mx-4 px-4 py-4 bg-slate-950/90 backdrop-blur-xl border-b border-white/10 flex flex-col xl:flex-row justify-between items-center gap-4 shadow-2xl glass-card">
                <div className="flex items-center gap-4 bg-black/40 p-2 rounded-xl border border-white/10 card-depth hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" onClick={() => setGalaxy(Math.max(1, galaxy - 1))} className="h-10 w-10 text-slate-400 hover:text-white"><ChevronLeft /></Button>
                        <div className="flex flex-col items-center w-20">
                            <span className="text-[9px] text-slate-500 uppercase font-bold">GALAXIE</span>
                            <Input type="number" value={galaxy} onChange={(e) => setGalaxy(parseInt(e.target.value) || 1)} className="h-8 bg-transparent border-none text-center font-black text-xl text-indigo-400 focus-visible:ring-0 p-0" />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setGalaxy(Math.min(9, galaxy + 1))} className="h-10 w-10 text-slate-400 hover:text-white"><ChevronRight /></Button>
                    </div>
                    <div className="w-px h-8 bg-white/10"></div>
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" onClick={() => setSystem(Math.max(1, system - 1))} className="h-10 w-10 text-slate-400 hover:text-white"><ChevronLeft /></Button>
                        <div className="flex flex-col items-center w-20">
                            <span className="text-[9px] text-slate-500 uppercase font-bold">SYSTÈME</span>
                            <Input type="number" value={system} onChange={(e) => setSystem(parseInt(e.target.value) || 1)} className="h-8 bg-transparent border-none text-center font-black text-xl text-white focus-visible:ring-0 p-0" />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setSystem(Math.min(499, system + 1))} className="h-10 w-10 text-slate-400 hover:text-white"><ChevronRight /></Button>
                    </div>
                </div>

                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 card-depth hover:shadow-xl transition-all duration-300">
                    <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase flex items-center gap-2 transition-all hover:scale-105 ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>
                        <List size={16} /> Liste
                    </button>
                    <button onClick={() => setViewMode('map')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase flex items-center gap-2 transition-all hover:scale-105 ${viewMode === 'map' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>
                        <LayoutGrid size={16} /> Carte
                    </button>
                    <button onClick={() => setViewMode('3d')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase flex items-center gap-2 transition-all hover:scale-105 ${viewMode === '3d' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>
                        <Globe size={16} /> Galaxie 3D
                    </button>
                </div>

                <Button onClick={scanNearbyPlanets} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 shadow-lg shadow-indigo-500/20 card-depth hover:scale-105 hover:shadow-2xl transition-all duration-300">
                    {loading ? <Sparkles className="animate-spin mr-2" size={16} /> : <Search className="mr-2" size={16} />} SCANNER
                </Button>
            </div>

            {viewMode === '3d' ? (
                <Galaxy3DView
                    galaxy={galaxy}
                    system={system}
                    currentPlanet={planet}
                    onSystemSelect={(sys) => setSystem(sys)}
                    onNavigateAttack={(id, name, g, s, p) => onNavigateAttack(id, name)}
                    onNavigateSpy={(id, name, g, s, p) => onNavigateSpy(id)}
                    onNavigateTransport={(id, name, g, s, p) => onNavigateTransport(id, name, g, s, p)}
                    onColonizeClick={handleColonize}
                />
            ) : viewMode === 'list' ? (
                <div className="rounded-xl border border-white/5 overflow-hidden bg-slate-950/50 shadow-2xl card-depth glass-card animate-slide-up hover:shadow-3xl transition-all duration-500">
                    <ListView
                        slots={slots}
                        onNavigateAttack={onNavigateAttack}
                        onNavigateSpy={onNavigateSpy}
                        onNavigateTransport={(id: string, name: string, position: number) => onNavigateTransport(id, name, galaxy, system, position)}
                        handleColonize={handleColonize}
                        handleRecycle={handleRecycle}
                        getPlanetStyle={getPlanetStyle}
                    />
                </div>
            ) : (
                <div className="relative w-full aspect-square md:aspect-[16/9] max-w-5xl mx-auto mt-8 bg-slate-950/80 rounded-full md:rounded-3xl border border-white/5 shadow-2xl overflow-hidden group/orbit card-depth glass-card animate-slide-up hover:shadow-3xl transition-all duration-500">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-black pointer-events-none"></div>
                    
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                        <div className="w-24 h-24 md:w-32 md:h-32 bg-yellow-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
                        <div className="absolute top-0 left-0 w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-yellow-300 to-orange-600 rounded-full shadow-[0_0_50px_rgba(234,179,8,0.6)] animate-spin-slow"></div>
                    </div>

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] border border-white/5 rounded-full pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] border border-white/5 rounded-full pointer-events-none"></div>

                    {slots.map((slot) => {
                        const totalSlots = 15;
                        const angle = ((slot.position - 1) / totalSlots) * 2 * Math.PI - (Math.PI / 2);
                        const radiusPercent = 38;
                        const x = 50 + radiusPercent * Math.cos(angle);
                        const y = 50 + radiusPercent * Math.sin(angle);
                        
                        const planetStyle = slot.planet_name ? getPlanetStyle(slot.planet_name) : "bg-white/5 border-2 border-dashed border-white/20";
                        const hasDebris = slot.debris_metal > 0 || slot.debris_crystal > 0;

                        return (
                            <div key={slot.position} className="absolute z-20 transition-all duration-500 hover:z-30 animate-fade-in" style={{ top: `${y}%`, left: `${x}%` }}>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={() => setSelectedSlot(slot)}
                                                className={`relative w-8 h-8 md:w-12 md:h-12 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-150 focus:outline-none card-depth hover:shadow-2xl ${slot.planet_id ? `shadow-lg bg-gradient-to-br ${planetStyle}` : 'hover:border-white/50 bg-black/50'}`}
                                            >
                                                <span className="absolute -bottom-5 text-[9px] font-mono text-slate-500 font-bold">{slot.position}</span>
                                                {slot.is_me && <div className="absolute inset-0 border-2 border-indigo-400 rounded-full animate-ping opacity-20"></div>}
                                                {slot.is_my_planet && <div className="absolute inset-0 border-2 border-indigo-400 rounded-full"></div>}
                                                {hasDebris && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-black animate-pulse shadow-md"></div>}
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-slate-900 border-slate-700 text-white font-mono text-xs">
                                            <p className="font-bold">{slot.planet_id ? slot.planet_name : `Emplacement ${slot.position}`}</p>
                                            {slot.owner_name && <p className="text-slate-400">{slot.owner_name}</p>}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        );
                    })}

                    {selectedSlot && (
                        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200" onClick={() => setSelectedSlot(null)}>
                            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 relative card-depth glass-card animate-slide-up hover:shadow-3xl transition-all duration-500" onClick={e => e.stopPropagation()}>
                                <button onClick={() => setSelectedSlot(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
                                
                                <div className="flex flex-col items-center text-center">
                                    <div className={`w-20 h-20 rounded-full mb-4 shadow-2xl ${selectedSlot.planet_id ? `bg-gradient-to-br ${getPlanetStyle(selectedSlot.planet_name!)}` : 'border-2 border-dashed border-slate-600 flex items-center justify-center'}`}>
                                        {!selectedSlot.planet_id && <span className="text-xs text-slate-500 font-bold">VIDE</span>}
                                    </div>
                                    
                                    <h3 className="text-xl font-black uppercase tracking-widest text-white mb-1">
                                        {selectedSlot.planet_id ? selectedSlot.planet_name : "Espace Inconnu"}
                                    </h3>

                                    {selectedSlot.planet_id && !selectedSlot.is_my_planet && (
                                        <div className="mb-2">
                                            <BeginnerProtectionBadge
                                                protectionUntil={selectedSlot.protection_until}
                                                galaxy={selectedSlot.planet_galaxy}
                                                totalPoints={selectedSlot.total_points}
                                                size="sm"
                                                showPoints={true}
                                            />
                                        </div>
                                    )}

                                    <p className="text-sm text-slate-400 font-mono mb-6">
                                        COORDONNÉES [{galaxy}:{system}:{selectedSlot.position}]
                                    </p>

                                    {/* Infos Débris */}
                                    {(selectedSlot.debris_metal > 0 || selectedSlot.debris_crystal > 0) && (
                                        <div className="w-full bg-slate-950/50 p-3 rounded-lg border border-white/5 mb-6 flex items-center justify-between glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 animate-fade-in">
                                            <div className="text-left">
                                                <p className="text-[10px] text-green-500 font-bold uppercase flex items-center gap-1"><Recycle size={10} /> Champ de débris</p>
                                                <p className="text-xs text-slate-300 font-mono">M:{Math.floor(selectedSlot.debris_metal).toLocaleString()} | C:{Math.floor(selectedSlot.debris_crystal).toLocaleString()}</p>
                                            </div>
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-400 hover:bg-green-500/10 hover:text-green-300" onClick={() => handleRecycle(selectedSlot.planet_id || "")}>
                                                <Recycle size={16} />
                                            </Button>
                                        </div>
                                    )}

                                  {/* Actions */}
                                    <div className="grid grid-cols-2 gap-3 w-full">
                                        {selectedSlot.planet_id ? (
                                            !selectedSlot.is_my_planet ? (
                                                // --- CAS : ENNEMI / NEUTRE ---
                                                <>
                                                    <Button onClick={() => onNavigateSpy(selectedSlot.planet_id!)} variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 card-depth hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                                                        <Eye className="mr-2" size={16} /> Espionner
                                                    </Button>
                                                    <Button onClick={() => onNavigateAttack(selectedSlot.planet_id!, selectedSlot.planet_name!)} variant="default" className="bg-red-600 hover:bg-red-700 text-white shadow-red-900/20 shadow-lg card-depth hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 hover:scale-105">
                                                        <Crosshair className="mr-2" size={16} /> Attaquer
                                                    </Button>
                                                    {/* BOUTON TRANSPORT : STYLE "LOGISTIQUE" (EMERAUDE) */}
                                                    <Button 
                                                        onClick={() => onNavigateTransport(selectedSlot.planet_id!, selectedSlot.planet_name!, galaxy, system, selectedSlot.position)} 
                                                        variant="outline" 
                                                        className="col-span-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-all"
                                                    >
                                                        <Truck className="mr-2" size={16} /> Transport
                                                    </Button>
                                                </>
                                            ) : (
                                                // --- CAS : C'EST À MOI ---
                                                <div className="col-span-2 space-y-2">
                                                    <div className={`py-4 border rounded-lg flex flex-col items-center justify-center gap-2 transition-all duration-300 glass-card hover:-translate-y-1 hover:shadow-xl animate-fade-in ${
                                                        selectedSlot.is_me
                                                            ? 'bg-indigo-600/20 border-indigo-500/50 shadow-[inset_0_0_20px_rgba(79,70,229,0.2)]' // Style Planète Mère
                                                            : 'bg-blue-900/20 border-blue-500/30' // Style Colonie
                                                    }`}>
                                                        {selectedSlot.is_me ? (
                                                            <>
                                                                <Crown className="text-indigo-300 animate-pulse" size={28} />
                                                                <div className="text-center">
                                                                    <span className="block text-indigo-200 text-xs font-black uppercase tracking-widest">Planète Mère</span>
                                                                    <span className="text-[10px] text-indigo-400 font-mono">Base de Commandement Actuelle</span>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Flag className="text-blue-400" size={24} />
                                                                <div className="text-center">
                                                                    <span className="block text-blue-300 text-xs font-black uppercase tracking-widest">Colonie Impériale</span>
                                                                    <span className="text-[10px] text-blue-500 font-mono">Territoire Annexé</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Bouton Ravitailler : Style "Logistique" (Solid Emerald) */}
                                                    {!selectedSlot.is_me && (
                                                        <Button 
                                                            onClick={() => onNavigateTransport(selectedSlot.planet_id!, selectedSlot.planet_name!, galaxy, system, selectedSlot.position)} 
                                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20"
                                                        >
                                                            <Truck className="mr-2" size={16} /> Ravitailler
                                                        </Button>
                                                    )}
                                                </div>
                                            )
                                        ) : (
                                            // --- CAS : ESPACE VIDE ---
                                            <Button onClick={() => handleColonize(selectedSlot.position)} className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-6 shadow-lg shadow-emerald-900/20 card-depth hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 hover:scale-105">
                                                <Rocket className="mr-2" size={20} /> LANCER COLONISATION
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Colonisation */}
            {showColonizeModal && (
                <ColonizeModal
                    position={colonizePosition}
                    galaxy={galaxy}
                    system={system}
                    availableResources={{
                        metal: planet.metal_amount || 0,
                        crystal: planet.crystal_amount || 0,
                        deuterium: planet.deuterium_amount || 0
                    }}
                    onConfirm={handleConfirmColonize}
                    onCancel={() => setShowColonizeModal(false)}
                />
            )}

            {/* Sidebar: Mes Planètes */}
            {showPlayerPlanets && playerPlanets.length > 0 && (
                <div className="fixed top-20 right-4 z-40 w-64 max-h-[calc(100vh-120px)] overflow-y-auto bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl card-depth">
                    <div className="sticky top-0 bg-slate-900 p-4 border-b border-white/10 flex items-center justify-between">
                        <h3 className="font-bold text-cyan-400 text-sm uppercase tracking-wider flex items-center gap-2">
                            <MapPin size={16} /> Mes Planètes
                        </h3>
                        <button onClick={() => setShowPlayerPlanets(false)} className="text-slate-500 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="p-2 space-y-1">
                        {playerPlanets.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => {
                                    setGalaxy(p.galaxy);
                                    setSystem(p.system);
                                }}
                                className={`w-full text-left p-3 rounded-lg transition-all hover:bg-white/10 ${
                                    p.id === planet.id ? 'bg-indigo-600/30 border border-indigo-500/50' : 'hover:border hover:border-white/20'
                                }`}
                            >
                                <div className="font-bold text-white text-sm">{p.name}</div>
                                <div className="text-xs text-slate-400 font-mono">[{p.galaxy}:{p.system}:{p.position}]</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Bouton toggle sidebar si caché */}
            {!showPlayerPlanets && (
                <button
                    onClick={() => setShowPlayerPlanets(true)}
                    className="fixed top-20 right-4 z-40 p-3 bg-cyan-600 hover:bg-cyan-500 rounded-full shadow-lg transition-all hover:scale-110"
                >
                    <MapPin size={20} className="text-white" />
                </button>
            )}

            {/* Panel: Planètes Proches */}
            {showNearby && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNearby(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden card-depth" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="font-bold text-cyan-400 text-xl uppercase tracking-wider flex items-center gap-2">
                                <Search size={24} /> Planètes Proches
                            </h3>
                            <button onClick={() => setShowNearby(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[calc(80vh-100px)]">
                            <table className="w-full">
                                <thead className="bg-slate-950/80 sticky top-0 z-10">
                                    <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-white/10">
                                        <th className="p-4 text-left">Planète</th>
                                        <th className="p-4 text-left">Joueur</th>
                                        <th className="p-4 text-center">Coordonnées</th>
                                        <th className="p-4 text-right">Distance</th>
                                        <th className="p-4 text-right">Temps de Vol</th>
                                        <th className="p-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {nearbyPlanets.map((p) => {
                                        const travelTime = Math.round(p.distance / 100);
                                        const hours = Math.floor(travelTime / 3600);
                                        const minutes = Math.floor((travelTime % 3600) / 60);
                                        const seconds = travelTime % 60;

                                        return (
                                            <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-bold text-white">{p.name}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-slate-300">{p.owner_name || '-'}</div>
                                                    {p.protection_until && new Date(p.protection_until) > new Date() && (
                                                        <Badge variant="outline" className="text-[10px] mt-1">
                                                            <ShieldCheck size={10} className="mr-1" /> Protégé
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button
                                                        onClick={() => {
                                                            setGalaxy(p.galaxy);
                                                            setSystem(p.system);
                                                            setShowNearby(false);
                                                        }}
                                                        className="font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                                                    >
                                                        [{p.galaxy}:{p.system}:{p.position}]
                                                    </button>
                                                </td>
                                                <td className="p-4 text-right text-slate-400 font-mono text-sm">
                                                    {p.distance.toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right text-slate-400 font-mono text-sm">
                                                    {hours > 0 && `${hours}h `}{minutes}m {seconds}s
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-center gap-2">
                                                        {!p.is_my_planet && (
                                                            <>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-blue-500/20 hover:text-blue-400" onClick={() => onNavigateSpy(p.id)}>
                                                                    <Eye size={14} />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400" onClick={() => onNavigateAttack(p.id, p.name)}>
                                                                    <Crosshair size={14} />
                                                                </Button>
                                                            </>
                                                        )}
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-emerald-500/20 hover:text-emerald-400" onClick={() => onNavigateTransport(p.id, p.name, p.galaxy, p.system, p.position)}>
                                                            <Truck size={14} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- SOUS-COMPOSANT : VUE LISTE ---

interface ListViewProps {
    slots: GalaxySlot[];
    onNavigateAttack: (id: string, name: string) => void;
    onNavigateSpy: (id: string) => void;
    onNavigateTransport: (id: string, name: string, position: number) => void;
    handleColonize: (position: number) => void;
    handleRecycle: (id: string) => void;
    getPlanetStyle: (name: string) => string;
}

function ListView({ slots, onNavigateAttack, onNavigateSpy, onNavigateTransport, handleColonize, handleRecycle, getPlanetStyle }: ListViewProps) {
    return (
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-900/80 text-slate-400 text-[10px] uppercase tracking-wider font-bold border-b border-white/5">
                    <th className="p-4 w-16 text-center">Pos</th>
                    <th className="p-4">Planète</th>
                    <th className="p-4">Joueur</th>
                    <th className="p-4 text-center">Actions</th>
                </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/5">
                {slots.map((slot) => (
                    <tr key={slot.position} className={`group hover:bg-white/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg animate-fade-in ${slot.is_my_planet ? 'bg-indigo-900/10' : ''}`}>
                        <td className="p-4 text-center font-mono text-slate-500 font-bold">{slot.position}</td>
                        <td className="p-4">
                            {slot.planet_id ? (
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getPlanetStyle(slot.planet_name!)} shadow-md group-hover:scale-110 transition-transform duration-300`}></div>
                                    <div>
                                        <span className={`font-bold ${slot.is_me ? 'text-indigo-300' : 'text-white'}`}>{slot.planet_name}</span>
                                        {slot.is_my_planet && <span className="ml-2 text-[9px] bg-indigo-500/20 text-indigo-300 px-1 rounded border border-indigo-500/30">MOI</span>}
                                    </div>
                                </div>
                            ) : <span className="text-slate-600 italic text-xs">Vide</span>}
                        </td>
                        <td className="p-4 text-slate-300">
                            {slot.planet_id && !slot.is_my_planet ? (
                                <div className="flex flex-col gap-1">
                                    <span>{slot.owner_name || "-"}</span>
                                    <BeginnerProtectionBadge
                                        protectionUntil={slot.protection_until}
                                        galaxy={slot.planet_galaxy}
                                        totalPoints={slot.total_points}
                                        size="sm"
                                        showPoints={false}
                                    />
                                </div>
                            ) : (
                                <span>{slot.owner_name || "-"}</span>
                            )}
                        </td>
                        <td className="p-4 text-center flex justify-center gap-2">
                            {/* Actions sur planètes ennemies */}
                            {slot.planet_id && !slot.is_my_planet && (
                                <>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-blue-500/20 hover:text-blue-400 transition-colors" onClick={() => onNavigateSpy(slot.planet_id!)}><Eye size={14}/></Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400 transition-colors" onClick={() => onNavigateAttack(slot.planet_id!, slot.planet_name!)}><Crosshair size={14}/></Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors" onClick={() => onNavigateTransport(slot.planet_id!, slot.planet_name!, slot.position)}><Truck size={14}/></Button>
                                </>
                            )}
                            
                            {/* Actions sur mes colonies (Transport uniquement) */}
                            {slot.is_my_planet && !slot.is_me && (
                                 <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors" onClick={() => onNavigateTransport(slot.planet_id!, slot.planet_name!, slot.position)}><Truck size={14}/></Button>
                            )}

                            {/* Colonisation */}
                            {!slot.planet_id && <Button size="sm" variant="ghost" className="h-7 text-[10px] uppercase text-emerald-400 hover:text-emerald-300" onClick={() => handleColonize(slot.position)}>Coloniser</Button>}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}