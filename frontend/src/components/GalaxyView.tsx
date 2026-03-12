import { useEffect, useState } from 'react';
import {
    ChevronLeft, ChevronRight, Search,
    Crosshair, Eye, Send, Recycle, MapPin,
    Rocket, User, List, LayoutGrid, Sparkles, X, ShieldCheck, Crown, Flag, Truck, Globe,
    AlertTriangle
} from "lucide-react";
import { useServerEvents } from '@/hooks/useServerEvents';
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
import { formatDuration } from '@/lib/utils';
import ColonizeModal from './ColonizeModal';
import BeginnerProtectionBadge from './BeginnerProtectionBadge';
import Galaxy3DView from './galaxy3d/Galaxy3DView';
import RadialMenu from './RadialMenu';
import { calculateDistance } from '@/utils/galaxyCalculations';
import { getShipCount } from '@/utils/techTreeCompat';
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
    onNavigateAttack: (id: string, name: string, galaxy: number, system: number, position: number) => void;
    onNavigateSpy: (id: string, name: string, galaxy: number, system: number, position: number) => void;
    onNavigateTransport: (id: string, name: string, galaxy: number, system: number, position: number) => void;
    initialGalaxy?: number;
    initialSystem?: number;
}

// --- COMPOSANT PRINCIPAL ---

export default function GalaxyView({ planet, onNavigateAttack, onNavigateSpy, onNavigateTransport, initialGalaxy, initialSystem }: GalaxyViewProps) {
    const [galaxy, setGalaxy] = useState(initialGalaxy ?? planet.galaxy);
    const [system, setSystem] = useState(initialSystem ?? planet.system);
    const [slots, setSlots] = useState<GalaxySlot[]>([]);
    const [loading, setLoading] = useState(false);
    const { activeEvents, incomingEvents } = useServerEvents();

    // Événements actifs/incoming affectant le système courant
    const systemEvents = [...activeEvents, ...incomingEvents].filter(e => {
        if (!e.zone || e.zone === 'Serveur entier') return true;
        if (e.zone.includes(`[${galaxy}:`)) return true;
        return false;
    });
    const [viewMode, setViewMode] = useState<'list' | 'map' | '3d'>('map');
    const [showColonizeModal, setShowColonizeModal] = useState(false);
    const [colonizePosition, setColonizePosition] = useState<number>(0);
    const [nearbyPlanets, setNearbyPlanets] = useState<any[]>([]);
    const [playerPlanets, setPlayerPlanets] = useState<any[]>([]);
    const [showNearby, setShowNearby] = useState(false);
    const [showPlayerPlanets, setShowPlayerPlanets] = useState(true);
    const [radialMenu, setRadialMenu] = useState<{ slot: GalaxySlot; position: { x: number; y: number } } | null>(null);

    useEffect(() => { fetchSystem(); setRadialMenu(null); }, [galaxy, system]);
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
            const res = await fetch(apiUrl('/my-planets'), {
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
                const description = data.travel_time_display
                    ? `${data.message} - Arrivée dans ${data.travel_time_display}`
                    : data.message || `Colonie établie en [${galaxy}:${system}:${position}]`;
                toast.success("Mission de colonisation lancée !", {
                    description: description
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

    const handleRecycle = async (slot: GalaxySlot) => {
        const token = localStorage.getItem('token');
        const availableRecyclers = getShipCount(planet, 'recycler');

        if (availableRecyclers === 0) {
            toast.error("Aucun recycleur disponible", {
                description: "Construisez des recycleurs au chantier spatial"
            });
            return;
        }

        const recyclersToSend = Math.min(availableRecyclers, 50);

        try {
            const res = await fetch(apiUrl(`/recycle?current_planet_id=${planet.id}`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    galaxy: slot.planet_galaxy,
                    system,
                    position: slot.position,
                    recyclers: recyclersToSend,
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`${recyclersToSend} recycleur(s) en route`, { description: data.message });
                fetchSystem();
            } else {
                toast.error("Échec recyclage", { description: data.error || "Erreur inconnue" });
            }
        } catch (e) {
            toast.error("Erreur réseau");
        }
    };

    const getPlanetStyle = (name: string) => {
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const types = [
            "from-blue-500 to-blue-900",
            "from-red-500 to-orange-900",
            "from-emerald-500 to-green-900",
            "from-slate-300 to-slate-800",
            "from-purple-500 to-fuchsia-900",
            "from-yellow-400 to-orange-700",
        ];
        return types[hash % types.length];
    };

    const handleSlotClick = (e: React.MouseEvent, slot: GalaxySlot) => {
        // Obtenir la position pour le RadialMenu
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const position = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        setRadialMenu({ slot, position });
    };

    // Construction dynamique des items du RadialMenu
    const getRadialMenuItems = (slot: GalaxySlot) => {
        const items = [];

        // C'est ma planète active
        if (slot.is_me) {
            items.push({ id: 'base', label: 'Base', icon: Crown, color: 'text-cyan-400', onClick: () => toast.info("Vous êtes déjà ici") });
        }
        // C'est une de mes colonies
        if (slot.planet_id) {
            items.push({ id: 'transport', label: 'Ravitailler', icon: Truck, color: 'text-emerald-400', onClick: () => onNavigateTransport(slot.planet_id!, slot.planet_name!, galaxy, system, slot.position) });
            if (!slot.is_my_planet) {
                if (!slot.is_me) {
                    items.push({ id: 'spy', label: 'Espionner', icon: Eye, color: 'text-blue-400', onClick: () => onNavigateSpy(slot.planet_id!, slot.planet_name!, galaxy, system, slot.position) });
                    items.push({ id: 'attack', label: 'Attaquer', icon: Crosshair, color: 'text-red-500', onClick: () => onNavigateAttack(slot.planet_id!, slot.planet_name!, galaxy, system, slot.position) });
                }
            }
        }
        // Emplacement vide
        else {
            items.push({ id: 'colonize', label: 'Coloniser', icon: Rocket, color: 'text-emerald-400', onClick: () => handleColonize(slot.position) });
        }

        // Action générique: Recyclage de débris
        if (slot.debris_metal > 0 || slot.debris_crystal > 0) {
            items.push({ id: 'recycle', label: 'Recycler', icon: Recycle, color: 'text-green-500', onClick: () => handleRecycle(slot) });
        }

        return items;
    };

    return (
        <div className="space-y-6 pb-20 relative min-h-[80vh] animate-fade-in">

            {/* NAVIGATION */}
            <div className="sticky top-0 z-30 -mx-4 px-4 py-4 bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] border-b border-cyan-500/10 flex flex-col xl:flex-row justify-between items-center gap-4 shadow-2xl">
                <div className="flex items-center gap-4 bg-[rgba(5,0,15,0.8)] p-2 rounded-xl border border-cyan-500/10 card-depth hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" onClick={() => setGalaxy(Math.max(1, galaxy - 1))} className="h-10 w-10 text-slate-400 hover:text-slate-200"><ChevronLeft /></Button>
                        <div className="flex flex-col items-center w-20">
                            <span className="text-[9px] text-slate-500 uppercase font-bold">GALAXIE</span>
                            <Input type="number" value={galaxy} onChange={(e) => setGalaxy(parseInt(e.target.value) || 1)} className="h-8 bg-transparent border-none text-center font-black text-xl text-cyan-400 font-mono focus-visible:ring-0 p-0" />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setGalaxy(Math.min(9, galaxy + 1))} className="h-10 w-10 text-slate-400 hover:text-slate-200"><ChevronRight /></Button>
                    </div>
                    <div className="w-px h-8 bg-cyan-500/10"></div>
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" onClick={() => setSystem(Math.max(1, system - 1))} className="h-10 w-10 text-slate-400 hover:text-slate-200"><ChevronLeft /></Button>
                        <div className="flex flex-col items-center w-20">
                            <span className="text-[9px] text-slate-500 uppercase font-bold">SYSTÈME</span>
                            <Input type="number" value={system} onChange={(e) => setSystem(parseInt(e.target.value) || 1)} className="h-8 bg-transparent border-none text-center font-black text-xl text-slate-200 focus-visible:ring-0 p-0" />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setSystem(Math.min(499, system + 1))} className="h-10 w-10 text-slate-400 hover:text-slate-200"><ChevronRight /></Button>
                    </div>
                </div>

                <div className="flex bg-[rgba(5,0,15,0.8)] p-1 rounded-lg border border-cyan-500/10 card-depth hover:shadow-xl transition-all duration-300">
                    <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase flex items-center gap-2 transition-all hover:scale-105 ${viewMode === 'list' ? 'border border-cyan-500/40 text-cyan-400 bg-cyan-500/8 shadow-lg' : 'border border-slate-600/30 text-slate-500 bg-transparent hover:border-cyan-500/25 hover:text-slate-300'}`}>
                        <List size={16} /> Liste
                    </button>
                    <button onClick={() => setViewMode('map')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase flex items-center gap-2 transition-all hover:scale-105 ${viewMode === 'map' ? 'border border-cyan-500/40 text-cyan-400 bg-cyan-500/8 shadow-lg' : 'border border-slate-600/30 text-slate-500 bg-transparent hover:border-cyan-500/25 hover:text-slate-300'}`}>
                        <LayoutGrid size={16} /> Carte
                    </button>
                    <button onClick={() => setViewMode('3d')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase flex items-center gap-2 transition-all hover:scale-105 ${viewMode === '3d' ? 'border border-cyan-500/40 text-cyan-400 bg-cyan-500/8 shadow-lg' : 'border border-slate-600/30 text-slate-500 bg-transparent hover:border-cyan-500/25 hover:text-slate-300'}`}>
                        <Globe size={16} /> Galaxie 3D
                    </button>
                </div>

                <Button onClick={scanNearbyPlanets} disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 text-slate-200 font-bold px-6 shadow-lg shadow-cyan-500/20 card-depth hover:scale-105 hover:shadow-2xl transition-all duration-300">
                    {loading ? <Sparkles className="animate-spin mr-2" size={16} /> : <Search className="mr-2" size={16} />} SCANNER
                </Button>
            </div>

            {viewMode === '3d' ? (
                <Galaxy3DView
                    galaxy={galaxy}
                    system={system}
                    currentPlanet={planet}
                     onSystemSelect={(sys) => setSystem(sys)}
                     onNavigateAttack={onNavigateAttack}
                     onNavigateSpy={onNavigateSpy}
                    onNavigateTransport={(id: string, name: string, position: number) => onNavigateTransport(id, name, galaxy, system, position)}
                    onColonizeClick={handleColonize}
                />
            ) : viewMode === 'list' ? (
                <div className="rounded-xl border border-cyan-500/10 overflow-hidden bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] shadow-2xl card-depth glass-card animate-slide-up hover:shadow-3xl transition-all duration-500">
                    <ListView
                        slots={slots}
                        onNavigateAttack={(id: string, name: string, position: number) => onNavigateAttack(id, name, galaxy, system, position)}
                        onNavigateSpy={(id: string, name: string, position: number) => onNavigateSpy(id, name, galaxy, system, position)}
                        onNavigateTransport={(id: string, name: string, position: number) => onNavigateTransport(id, name, galaxy, system, position)}
                        handleColonize={handleColonize}
                        handleRecycle={handleRecycle}
                        getPlanetStyle={getPlanetStyle}
                    />
                </div>
            ) : (
                <div className="relative w-full aspect-square md:aspect-[16/9] max-w-5xl mx-auto mt-8 bg-[rgba(10,5,32,0.85)] rounded-full md:rounded-3xl border border-cyan-500/10 shadow-2xl overflow-hidden group/orbit card-depth glass-card animate-slide-up hover:shadow-3xl transition-all duration-500">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-[rgba(10,5,32,0.85)] to-black pointer-events-none"></div>

                    {/* PVE Event overlays */}
                    {systemEvents.map(ev => (
                        <div key={ev.id} className={`absolute inset-0 pointer-events-none z-5 ${
                            ev.event_type_key === 'pirate_invasion' ? 'pve-overlay-invasion' :
                            ev.event_type_key === 'radioactive_cloud' ? 'pve-overlay-radioactive' :
                            ev.event_type_key === 'solar_storm' ? 'pve-overlay-solar' :
                            ev.event_type_key === 'meteor_shower' ? 'pve-overlay-meteor' :
                            ev.event_type_key === 'ancient_artifact' ? 'pve-overlay-artifact' : ''
                        }`}>
                            {/* Badge type + statut */}
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[rgba(10,5,32,0.95)] backdrop-blur-[12px] border border-cyan-500/20 rounded-lg px-2 py-1">
                                <span className="text-base">{ev.icon}</span>
                                <div>
                                    <p className="text-xs font-bold text-slate-200 leading-none">{ev.name}</p>
                                    <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                                        {ev.status === 'active' ? `${ev.hp_current.toLocaleString()} PV` : 'À venir'}
                                    </p>
                                </div>
                                {ev.status === 'active' && (
                                    <AlertTriangle className="w-3 h-3 text-red-400 animate-pulse ml-1" />
                                )}
                            </div>
                        </div>
                    ))}

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                        <div className="w-24 h-24 md:w-32 md:h-32 bg-yellow-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
                        <div className="absolute top-0 left-0 w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-yellow-300 to-orange-600 rounded-full shadow-[0_0_50px_rgba(234,179,8,0.6)] animate-spin-slow"></div>
                    </div>

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] border border-cyan-500/5 rounded-full pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] border border-cyan-500/5 rounded-full pointer-events-none"></div>

                    {slots.map((slot) => {
                        const totalSlots = 15;
                        const angle = ((slot.position - 1) / totalSlots) * 2 * Math.PI - (Math.PI / 2);
                        const radiusPercent = 38;
                        const x = 50 + radiusPercent * Math.cos(angle);
                        const y = 50 + radiusPercent * Math.sin(angle);

                        const planetStyle = slot.planet_name ? getPlanetStyle(slot.planet_name) : "";
                        const hasDebris = slot.debris_metal > 0 || slot.debris_crystal > 0;

                        return (
                            <div key={slot.position} className="absolute z-20 transition-all duration-500 hover:z-30 animate-fade-in" style={{ top: `${y}%`, left: `${x}%` }}>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="relative group/marker">
                                                {/* Ripple Ping Animations on hover */}
                                                {slot.planet_id && (
                                                    <>
                                                        <div className="absolute inset-0 rounded-full border border-cyan-500/0 group-hover/marker:border-cyan-500/50 group-hover/marker:animate-ping-slow pointer-events-none transition-all duration-300"></div>
                                                        <div className="absolute -inset-2 rounded-full border border-blue-500/0 group-hover/marker:border-blue-500/30 group-hover/marker:animate-ping-slow pointer-events-none transition-all duration-500" style={{ animationDelay: '200ms' }}></div>
                                                    </>
                                                )}

                                                <button
                                                    onClick={(e) => handleSlotClick(e, slot)}
                                                    className={`relative w-11 h-11 md:w-12 md:h-12 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-150 focus:outline-none card-depth hover:shadow-2xl z-10 ${slot.planet_id ? `shadow-lg bg-gradient-to-br ${planetStyle} border border-cyan-500/20` : 'hover:border-cyan-500/30 bg-[rgba(10,5,32,0.85)] border border-dashed border-cyan-500/10 opacity-40 hover:opacity-100'}`}
                                                >
                                                    <span className="absolute -bottom-5 text-[9px] font-mono text-cyan-400/60 font-bold tabular-nums">{slot.position}</span>
                                                    {slot.is_me && <Crown size={14} className="text-slate-200 absolute -top-2" />}
                                                    {slot.is_my_planet && !slot.is_me && <div className="absolute -top-1 w-2 h-2 rounded-full bg-emerald-400 border-2 border-[rgba(10,5,32,0.85)] shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>}
                                                    {hasDebris && <div className="absolute -right-2 top-0 w-3 h-3 rounded-full bg-amber-500/80 border border-amber-300 animate-pulse flex items-center justify-center shadow-[0_0_6px_rgba(251,191,36,0.6)]"><span className="text-[6px]">+</span></div>}
                                                </button>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-[rgba(10,5,32,0.95)] backdrop-blur-[12px] border border-cyan-500/20 text-slate-200 font-mono text-xs rounded-lg">
                                            <p className="font-bold text-slate-200">{slot.planet_id ? slot.planet_name : `Emplacement ${slot.position}`}</p>
                                            {slot.owner_name && <p className="text-slate-400">{slot.owner_name}</p>}
                                            {hasDebris && (
                                                <p className="text-amber-400 mt-1 tabular-nums">
                                                    Débris — M: {Math.floor(slot.debris_metal).toLocaleString()} / C: {Math.floor(slot.debris_crystal).toLocaleString()}
                                                </p>
                                            )}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Radial Menu Integration */}
            {radialMenu && (
                <RadialMenu
                    items={getRadialMenuItems(radialMenu.slot)}
                    position={radialMenu.position}
                    onClose={() => setRadialMenu(null)}
                />
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
                    currentPlanet={{
                        galaxy: planet.galaxy,
                        system: planet.system,
                        position: planet.position,
                        colony_ship_count: planet.ships?.colony_ship?.count ?? 0
                    }}
                    onConfirm={handleConfirmColonize}
                    onCancel={() => setShowColonizeModal(false)}
                />
            )}

            {/* Sidebar: Mes Planètes */}
            {showPlayerPlanets && playerPlanets.length > 0 && (
                <div className="fixed top-20 right-4 z-40 w-[calc(100vw-2rem)] sm:w-64 max-h-[70vh] overflow-y-auto bg-[rgba(16,8,46,0.95)] backdrop-blur-[12px] border border-cyan-500/10 rounded-2xl shadow-2xl card-depth">
                    <div className="sticky top-0 bg-[rgba(10,5,32,0.85)] p-4 border-b border-cyan-500/10 flex items-center justify-between">
                        <h3 className="font-bold text-cyan-400 text-sm uppercase tracking-wider flex items-center gap-2">
                            <MapPin size={16} /> Mes Planètes
                        </h3>
                        <button onClick={() => setShowPlayerPlanets(false)} className="text-slate-500 hover:text-slate-200 transition-colors">
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
                                className={`w-full text-left p-3 rounded-lg transition-all hover:bg-cyan-500/5 ${
                                    p.id === planet.id ? 'bg-cyan-500/8 border border-cyan-500/30' : 'hover:border hover:border-cyan-500/10'
                                }`}
                            >
                                <div className="font-medium text-slate-200 text-sm">{p.name}</div>
                                <div className="text-xs text-cyan-400 font-mono tabular-nums">[{p.galaxy}:{p.system}:{p.position}]</div>
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
                    <MapPin size={20} className="text-slate-200" />
                </button>
            )}

            {/* Panel: Planètes Proches */}
            {showNearby && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNearby(false)}>
                    <div className="bg-[rgba(16,8,46,0.95)] backdrop-blur-[12px] border border-cyan-500/10 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden card-depth" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-cyan-500/10 flex items-center justify-between">
                            <h3 className="font-bold text-cyan-400 text-xl uppercase tracking-wider flex items-center gap-2">
                                <Search size={24} /> Planètes Proches
                            </h3>
                            <button onClick={() => setShowNearby(false)} className="text-slate-500 hover:text-slate-200 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[calc(80vh-100px)]">
                            <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[rgba(10,5,32,0.85)] sticky top-0 z-10">
                                    <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-cyan-500/10">
                                        <th className="p-4 text-left">Planète</th>
                                        <th className="p-4 text-left">Joueur</th>
                                        <th className="p-4 text-center">Coordonnées</th>
                                        <th className="p-4 text-right">Distance</th>
                                        <th className="p-4 text-right">Temps de Vol</th>
                                        <th className="p-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cyan-500/5">
                                    {nearbyPlanets.map((p) => {
                                        const travelTime = Math.round(p.distance / 100);

                                        return (
                                            <tr key={p.id} className="hover:bg-cyan-500/5 transition-colors duration-150">
                                                <td className="p-4">
                                                    <div className="font-medium text-slate-200">{p.name}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-slate-300">{p.owner_name || '-'}</div>
                                                    {p.protection_until && new Date(p.protection_until) > new Date() && (
                                                        <Badge variant="outline" className="text-[10px] mt-1 border-cyan-500/20 text-cyan-400/70">
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
                                                        className="font-mono text-cyan-400 hover:text-cyan-300 transition-colors tabular-nums"
                                                    >
                                                        [{p.galaxy}:{p.system}:{p.position}]
                                                    </button>
                                                </td>
                                                <td className="p-4 text-right text-slate-400 font-mono text-sm tabular-nums">
                                                    {p.distance.toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right text-cyan-400 font-mono text-sm tabular-nums">
                                                    {formatDuration(travelTime)}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-center gap-2">
                                                        {p.id !== planet.id && (
                                                            <div className="flex gap-2 justify-end">
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-blue-500/20 hover:text-blue-400 border border-transparent hover:border-blue-500/20 transition-colors" onClick={() => onNavigateSpy(p.id, p.name, p.galaxy, p.system, p.position)}>
                                                                    <Eye size={16} />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-colors" onClick={() => onNavigateAttack(p.id, p.name, p.galaxy, p.system, p.position)}>
                                                                    <Crosshair size={16} />
                                                                </Button>
                                                            </div>
                                                        )}
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-emerald-500/20 hover:text-emerald-400 border border-transparent hover:border-emerald-500/20 transition-colors" onClick={() => onNavigateTransport(p.id, p.name, p.galaxy, p.system, p.position)}>
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
                </div>
            )}
        </div>
    );
}

// --- SOUS-COMPOSANT : VUE LISTE ---

interface ListViewProps {
    slots: GalaxySlot[];
    onNavigateAttack: (id: string, name: string, position: number) => void;
    onNavigateSpy: (id: string, name: string, position: number) => void;
    onNavigateTransport: (id: string, name: string, position: number) => void;
    handleColonize: (position: number) => void;
    handleRecycle: (slot: GalaxySlot) => void;
    getPlanetStyle: (name: string) => string;
}

function ListView({ slots, onNavigateAttack, onNavigateSpy, onNavigateTransport, handleColonize, handleRecycle, getPlanetStyle }: ListViewProps) {
    return (
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-[rgba(10,5,32,0.85)] text-slate-400 text-[10px] uppercase tracking-wider font-bold border-b border-cyan-500/10">
                    <th className="p-4 w-16 text-center">Pos</th>
                    <th className="p-4">Planète</th>
                    <th className="p-4">Joueur</th>
                    <th className="p-4 text-center">Actions</th>
                </tr>
            </thead>
            <tbody className="text-sm divide-y divide-cyan-500/5">
                {slots.map((slot) => (
                    <tr key={slot.position} className={`group hover:bg-cyan-500/5 transition-colors duration-150 animate-fade-in ${slot.is_my_planet ? 'bg-cyan-500/5 border-l-2 border-cyan-500/30' : ''}`}>
                        <td className="p-4 text-center font-mono text-slate-500 font-bold tabular-nums">{slot.position}</td>
                        <td className="p-4">
                            {slot.planet_id ? (
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getPlanetStyle(slot.planet_name!)} border border-cyan-500/20 shadow-md group-hover:scale-110 transition-transform duration-300`}></div>
                                    <div>
                                        <span className={`font-medium ${slot.is_me ? 'text-cyan-400' : 'text-slate-200'}`}>{slot.planet_name}</span>
                                        {slot.is_my_planet && <span className="ml-2 text-[9px] bg-cyan-500/10 text-cyan-400 px-1 rounded border border-cyan-500/20">MOI</span>}
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
                        <td className="p-4 text-center">
                            {/* Actions sur planètes ennemies */}
                            {slot.planet_id && !slot.is_my_planet && (
                                <>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-blue-500/20 hover:text-blue-400 border border-transparent hover:border-blue-500/20 transition-colors" onClick={() => onNavigateSpy(slot.planet_id!, slot.planet_name!, slot.position)}><Eye size={14}/></Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-colors" onClick={() => onNavigateAttack(slot.planet_id!, slot.planet_name!, slot.position)}><Crosshair size={14}/></Button>
                                </>
                            )}

                            {/* Action Transport globale */}
                            {slot.planet_id && (
                                 <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-emerald-500/20 hover:text-emerald-400 border border-transparent hover:border-emerald-500/20 transition-colors" onClick={() => onNavigateTransport(slot.planet_id!, slot.planet_name!, slot.position)}><Truck size={14}/></Button>
                            )}

                            {/* Colonisation */}
                            {!slot.planet_id && <Button size="sm" variant="ghost" className="h-7 text-[10px] uppercase border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/5" onClick={() => handleColonize(slot.position)}>Coloniser</Button>}
                            {/* Recyclage débris */}
                            {(slot.debris_metal > 0 || slot.debris_crystal > 0) && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-amber-500/20 hover:text-amber-400 border border-transparent hover:border-amber-500/20 transition-colors" title={`Débris: ${Math.floor(slot.debris_metal).toLocaleString()}M / ${Math.floor(slot.debris_crystal).toLocaleString()}C`} onClick={() => handleRecycle(slot)}><Recycle size={14}/></Button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        </div>
    );
}
