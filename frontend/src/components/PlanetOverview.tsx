import { 
  Stone, Gem, MapPin, Shield, Rocket, Globe, Scan, 
  Zap, Hammer, Clock, TrendingUp, AlertTriangle, 
  Droplets, Microscope, Warehouse, Activity, ChevronRight, List, XCircle, ShieldCheck, Sword,
  Radar, Radio, Navigation
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
// --- Dictionnaire de noms ---
const getLabel = (id: string | null) => {
    if (!id) return "Inconnu";
    const labels: Record<string, string> = {
        metal: "Mine de Métal",
        crystal: "Mine de Cristal",
        deuterium: "Synth. Deutérium",
        solar_plant: "Centrale Solaire",
        shipyard: "Chantier Spatial",
        research: "Labo de Recherche",
        hangar: "Hangar à Vaisseaux",
        energy_tech: "Tech. Énergie",
        laser: "Tech. Laser",
        armour: "Tech. Protection",
        espionage: "Tech. Espionnage",
        light_hunter: "Chasseur Léger",
        cruiser: "Croiseur",
        colony_ship: "Vaisseau Colon",
        transporter: "Transporteur",
        recycler: "Recycleur",
        spy_probe: "Sonde Espionnage",
        missile_launcher: "Lanceur Missiles",
        plasma_turret: "Tourelle Plasma"
    };
    return labels[id] || id;
};

const getItemType = (id: string) => {
    if (['light_hunter', 'cruiser', 'colony_ship', 'transporter', 'recycler', 'spy_probe'].includes(id)) return 'fleet';
    if (['missile_launcher', 'plasma_turret'].includes(id)) return 'defense';
    if (['research', 'energy_tech', 'laser', 'espionage', 'armour'].includes(id)) return 'tech';
    return 'building';
};

interface ResourceSlot {
  id: number;
  planet_id: string;
  slot_number: number;
  resource_type: string;
  level: number;
  is_locked: boolean;
  is_active: boolean;
}

export default function PlanetOverview({ planet, speedFactor }: { planet: any, speedFactor: number }) {
  const [, setTick] = useState(0);
  const [slots, setSlots] = useState<ResourceSlot[]>([]);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Charger les slots actifs
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetch(apiUrl(`/planets/${planet.id}/resource-slots`), {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSlots(data.filter((s: ResourceSlot) => s.slot_number >= 5));
        }
      } catch (error) {
        console.error('Erreur chargement slots:', error);
      }
    };
    if (planet?.id) fetchSlots();
  }, [planet?.id]);

  const getTimeLeft = (endDate: string) => {
    const end = new Date(endDate.endsWith("Z") ? endDate : endDate + "Z").getTime();
    const now = new Date().getTime();
    return Math.max(0, Math.floor((end - now) / 1000));
  };

  const cancelOperation = async (queueId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(apiUrl(`/planets/${planet.id}/cancel-construction/${queueId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        const total = data.refund_metal + data.refund_crystal + data.refund_deuterium;
        
        toast.success("Opération annulée", { 
          description: `Remboursement de ${Math.floor(total).toLocaleString()} ressources (${Math.round(data.ratio * 100)}%).` 
        });
      } else {
        toast.error("Erreur lors de l'annulation");
      }
    } catch (e) {
      toast.error("Serveur injoignable");
    }
  };

  // --- CALCULS PRODUCTION (avec slots, tech et énergie) ---
  const calculateProduction = (resourceType: 'metal' | 'crystal' | 'deuterium', level: number, baseFactor: number) => {
    // Calcul de base
    let prod = baseFactor * level * Math.pow(1.1, level);

    // Bonus technologie énergie (+1% par niveau)
    const techLevel = planet.energy_tech_level || 0;
    const techBonus = 1.0 + (techLevel * 0.01);
    prod *= techBonus;

    // Ratio énergétique (récupéré du backend)
    const energyRatio = (planet.energy_ratio || 100) / 100;
    prod *= energyRatio;

    // Bonus slots actifs (+50% par slot du même type)
    const activeSlots = slots.filter(s => s.is_active && s.resource_type === resourceType);
    const slotBonus = 1.0 + (activeSlots.length * 0.5);
    prod *= slotBonus;

    // Speed factor
    prod *= speedFactor;

    return Math.floor(prod);
  };

  const prodMetal = calculateProduction('metal', planet.metal_mine_level, 30);
  const prodCrystal = calculateProduction('crystal', planet.crystal_mine_level, 20);
  const prodDeut = calculateProduction('deuterium', planet.deuterium_mine_level, 10);

  // Energy data from backend
  const energyProd = planet.energy_production || 0;
  const energyCons = planet.energy_consumption || 0;
  const energyRatio = planet.energy_ratio || 100; // percentage
  const energyNet = energyProd - energyCons;
  const energyPercent = energyCons > 0 ? Math.min(100, (energyCons / energyProd) * 100) : 0;

  // --- CALCULS MILITAIRES AVANCÉS ---
  const atkBonus = 1 + ((planet.laser_battery_level || 0) * 0.1);
  const hullBonus = 1 + ((planet.armour_tech_level || 0) * 0.1);

  const totalAtk = (
    (planet.light_hunter_count * 50) + 
    (planet.cruiser_count * 400) + 
    (planet.missile_launcher_count * 80) + 
    (planet.plasma_turret_count * 3000)
  ) * atkBonus;

  const totalHull = (
    (planet.light_hunter_count * 400) + 
    (planet.cruiser_count * 2700) + 
    (planet.missile_launcher_count * 200) + 
    (planet.plasma_turret_count * 10000)
  ) * hullBonus;

  const totalFleet = (planet.light_hunter_count || 0) + (planet.cruiser_count || 0) + (planet.recycler_count || 0) + (planet.spy_probe_count || 0) + (planet.colony_ship_count || 0) + (planet.transporter_count || 0);
  const hangarCap = 500 + ((planet.hangar_level || 0) * 500);
  const totalDefense = (planet.missile_launcher_count || 0) + (planet.plasma_turret_count || 0);

  const fmt = (n: number) => Math.floor(n).toLocaleString();
  const constructionQueue = planet.constructions || [];
  const slotsUsed = constructionQueue.length;
  const maxSlots = 3;

  // --- MISSIONS (Backend enrichit l'objet planet avec ces listes) ---
  const incomingMissions = planet.incoming_missions || [];
  const outgoingMissions = planet.outgoing_missions || [];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* SECTION RADAR / MISSIONS ALERTES */}
      {(incomingMissions.length > 0 || outgoingMissions.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* RADAR DE DÉTECTION (Incoming) */}
              <Card className={`bg-slate-950 border ${incomingMissions.some((m: any) => m.mission_type === 'attack') ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-blue-500/30'} overflow-hidden relative`}>
                  <div className="absolute top-0 right-0 p-2 opacity-10"><Radar size={80} /></div>
                  <CardHeader className="pb-2 border-b border-white/5">
                      <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-slate-400">
                          <Radio size={14} className="animate-pulse text-blue-400" /> Flux de circulation entrant
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                      {incomingMissions.length > 0 ? incomingMissions.map((m: any) => {
                          const tl = getTimeLeft(m.arrival_time);
                          const isAttack = m.mission_type === 'attack';
                          return (
                              <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg border ${isAttack ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/5 border-blue-500/10'}`}>
                                  <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-full ${isAttack ? 'bg-red-500 animate-ping' : 'bg-blue-500'}`}>
                                          <Rocket size={12} className="text-white" />
                                      </div>
                                      <div>
                                          <p className={`text-xs font-black uppercase tracking-wider ${isAttack ? 'text-red-400' : 'text-blue-400'}`}>
                                              {isAttack ? '⚠️ Attaque ennemie' : '📦 Transport civil'}
                                          </p>
                                          <p className="text-[9px] font-mono text-slate-500 uppercase">Impact : {tl}s</p>
                                      </div>
                                  </div>
                                  <div className="text-right font-mono text-xs font-bold text-white">
                                      {m.ships_count} Unités
                                  </div>
                              </div>
                          );
                      }) : (
                          <div className="text-center py-4 text-slate-600 text-[10px] uppercase font-bold italic">Secteur Local Calme</div>
                      )}
                  </CardContent>
              </Card>

           {/* CENTRE DE COMMANDE (Missions sortantes) */}
<Card className="bg-slate-950 border border-emerald-500/30 overflow-hidden relative shadow-[0_0_15px_rgba(16,185,129,0.1)]">
    <div className="absolute top-0 right-0 p-2 opacity-10"><Navigation size={80} /></div>
    <CardHeader className="pb-2 border-b border-white/5 bg-emerald-950/20">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-emerald-400">
            <Navigation size={14} className="animate-pulse" /> Centre de Commandement Flotte
        </CardTitle>
    </CardHeader>
    <CardContent className="p-4 space-y-4">
        {outgoingMissions.length > 0 ? outgoingMissions.map((m: any) => {
            const tl = getTimeLeft(m.arrival_time);
            
            // Traduction et Style
            const isAttack = m.mission_type.toLowerCase() === 'attack';
            const label = isAttack ? "OFFENSIVE" : "TRANSPORT";
            const statusColor = isAttack ? "text-red-400" : "text-emerald-400";
            const barColor = isAttack ? "bg-red-500" : "bg-emerald-500";

            return (
                <div key={m.id} className="bg-black/40 border border-white/5 p-4 rounded-xl flex flex-col gap-3 group hover:border-emerald-500/30 transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className={`text-[10px] font-black ${statusColor} uppercase tracking-[0.2em]`}>
                                {label}
                            </span>
                            <h4 className="text-sm font-bold text-slate-200 mt-1">
                                Vers : {m.target_name || "Secteur Inconnu"}
                            </h4>
                            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                                Coordonnées : {m.coords || "[X:X:X]"}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-mono font-black text-white bg-black px-2 py-1 rounded border border-white/10 shadow-inner">
                                {tl}s
                            </span>
                        </div>
                    </div>

                    {/* Barre de progression ultra visible */}
                    <div className="space-y-1">
                        <div className="h-3 w-full bg-slate-900 rounded-full border border-white/5 overflow-hidden p-0.5 shadow-inner">
                            <div 
                                className={`h-full ${barColor} rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.4)]`}
                                style={{ width: `${Math.max(2, 100 - (tl / 10))}%` }} // Ajuster le /10 selon la durée max réelle
                            />
                        </div>
                        <div className="flex justify-between text-[8px] font-bold text-slate-600 uppercase tracking-tighter">
                            <span>Décollage</span>
                            <span>Impact imminent</span>
                        </div>
                    </div>
                </div>
            );
        }) : (
            <div className="text-center py-8 text-slate-600 border-2 border-dashed border-white/5 rounded-xl">
                <p className="text-[10px] uppercase font-black tracking-widest opacity-50 italic">Hangar de lancement vide</p>
            </div>
        )}
    </CardContent>
</Card>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARTE PLANETE ET FILE */}
        <Card className="lg:col-span-2 bg-slate-950 border border-white/10 overflow-hidden relative group flex flex-col justify-between">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614730341194-75c607ae363c?q=80&w=2696&auto=format&fit=crop')] bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent"></div>
            
            <CardHeader className="relative z-10 flex flex-row items-center gap-6 pb-2">
                <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 blur-md absolute animate-pulse"></div>
                    <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-indigo-400/50 flex items-center justify-center relative z-10 shadow-xl">
                        <Globe size={40} className="text-indigo-300" />
                    </div>
                </div>
                <div>
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                        <h2 className="text-3xl font-black uppercase text-white tracking-widest drop-shadow-md">{planet.name}</h2>
                        <div className="px-2 py-0.5 rounded bg-green-500/20 border border-green-500/30 text-[10px] text-green-400 font-bold uppercase tracking-wider">Opérationnel</div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-black/40 rounded border border-white/5 font-mono text-xs text-slate-400">
                        <MapPin size={12} className="text-indigo-400" />
                        <span>[{planet.galaxy}:{planet.system}:{planet.position}]</span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="relative z-10 pt-0 pb-4 px-6">
                <div className="bg-black/40 border border-white/10 rounded-lg p-3 backdrop-blur-md">
                    <div className="flex justify-between items-end mb-2">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <List size={12} /> Opérations en cours
                        </h3>
                        <span className={`text-[10px] font-mono font-bold px-2 rounded ${slotsUsed >= maxSlots ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                            {slotsUsed} / {maxSlots} Slots
                        </span>
                    </div>

                    <div className="space-y-2">
                        {constructionQueue.length > 0 ? (
                            constructionQueue.map((item: any, index: number) => {
                                const tl = getTimeLeft(item.end_time);
                                const type = getItemType(item.building_type);
                                const label = getLabel(item.building_type);
                                const refundPercent = index === 0 ? Math.max(0, Math.min(95, Math.round((tl / 60) * 100))) : 95;

                                let Icon = Hammer;
                                let color = "text-white";
                                if (type === 'tech') { Icon = Microscope; color = "text-purple-400"; }
                                else if (type === 'fleet') { Icon = Rocket; color = "text-orange-400"; }
                                else if (type === 'defense') { Icon = Shield; color = "text-red-400"; }
                                else { color = "text-blue-300"; }

                                return (
                                    <div key={item.id} className={`flex justify-between items-center text-xs p-2 rounded border border-white/5 group/item transition-all ${index === 0 ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-slate-900/60'}`}>
                                        <div className="flex items-center gap-3">
                                            <Icon size={14} className={color} />
                                            <div>
                                                <span className="font-bold text-slate-200 block">{label}</span>
                                                <span className="text-[9px] text-slate-500 uppercase tracking-wider">
                                                    {type === 'fleet' || type === 'defense' ? `Quantité: +${item.level}` : `Vers Niveau ${item.level}`}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px]">
                                            <div className="flex items-center gap-2 text-indigo-300 font-mono bg-black/40 px-2 py-1 rounded border border-white/5">
                                                <Clock size={10} className={index === 0 ? "animate-spin-slow" : ""} />
                                                {tl}s
                                            </div>
                                            <div className="relative group/cancel">
                                                <button onClick={() => cancelOperation(item.id)} className="text-slate-600 hover:text-red-500 transition-colors p-1">
                                                    <XCircle size={16} />
                                                </button>
                                                <div className="absolute bottom-full right-0 mb-2 hidden group-hover/cancel:block z-50">
                                                    <div className="bg-slate-900 border border-red-500/50 text-white text-[9px] p-2 rounded shadow-2xl whitespace-nowrap flex flex-col gap-0.5">
                                                        <span className="text-red-400 font-black uppercase border-b border-white/10 pb-1 mb-1">Estimation Retour</span>
                                                        <span>Ratio: {refundPercent}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-4 text-slate-600 space-y-1">
                                <Activity size={24} className="opacity-20" />
                                <span className="text-[10px] uppercase tracking-widest italic">Aucune opération en cours</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* ENERGIE - DESIGN ÉLECTRIQUE */}
        <Card className={`bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 ${energyRatio >= 100 ? 'border-yellow-500/50' : energyRatio >= 50 ? 'border-orange-500/50' : 'border-red-500/50'} backdrop-blur-md flex flex-col relative overflow-hidden`}>
            {/* Effets de fond électriques */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Lueur principale */}
                <div className={`absolute -right-20 -top-20 w-48 h-48 rounded-full blur-3xl opacity-30 ${energyRatio >= 100 ? 'bg-yellow-400 animate-pulse' : energyRatio >= 50 ? 'bg-orange-400 animate-pulse' : 'bg-red-500 animate-ping'}`}></div>
                <div className={`absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-2xl opacity-20 ${energyRatio >= 100 ? 'bg-cyan-400' : 'bg-orange-500'}`}></div>
                {/* Lignes électriques animées */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-pulse"></div>
                    <div className="absolute top-2/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute top-3/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
            </div>

            <CardHeader className="pb-2 relative z-10">
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        <div className={`relative ${energyRatio < 50 ? 'animate-pulse' : ''}`}>
                            <Zap size={18} className={`${energyRatio >= 100 ? 'text-yellow-400' : energyRatio >= 50 ? 'text-orange-400' : 'text-red-500'} drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]`} />
                            {energyRatio >= 100 && <Zap size={18} className="absolute inset-0 text-yellow-400 animate-ping opacity-50" />}
                        </div>
                        Réseau Électrique
                    </span>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${energyRatio >= 100 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : energyRatio >= 50 ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse'}`}>
                        {energyRatio >= 100 ? '⚡ OPTIMAL' : energyRatio >= 50 ? '⚠️ RALENTI' : '🔴 CRITIQUE'}
                    </span>
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 relative z-10">
                {/* Indicateur principal avec effet glow */}
                <div className="text-center py-2">
                    <div className={`text-5xl font-black font-mono tracking-tighter ${energyRatio >= 100 ? 'text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]' : energyRatio >= 50 ? 'text-orange-400 drop-shadow-[0_0_15px_rgba(251,146,60,0.5)]' : 'text-red-400 drop-shadow-[0_0_20px_rgba(248,113,113,0.7)] animate-pulse'}`}>
                        {energyRatio}%
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Efficacité du réseau</div>
                </div>

                {/* Graphique Production vs Consommation */}
                <div className="bg-black/40 rounded-xl p-4 border border-white/10 relative overflow-hidden">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-3 font-bold flex items-center gap-2">
                        <Activity size={10} className="text-cyan-400" /> Flux énergétique
                    </div>

                    {/* Barres comparatives verticales style voltmètre */}
                    <div className="flex items-end justify-center gap-6 h-24">
                        {/* Barre Production */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="relative w-8 h-20 bg-slate-900 rounded-lg border border-white/10 overflow-hidden">
                                {/* Graduation */}
                                <div className="absolute inset-0 flex flex-col justify-between py-1 px-0.5 opacity-30">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="h-px bg-white/50 w-full"></div>
                                    ))}
                                </div>
                                {/* Barre de remplissage */}
                                <div
                                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-600 via-emerald-400 to-cyan-400 transition-all duration-700 rounded-b-md"
                                    style={{ height: `${Math.min(100, (energyProd / Math.max(energyProd, energyCons, 1)) * 100)}%` }}
                                >
                                    {/* Effet de brillance */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                    {/* Effet lightning */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-white/50 opacity-0 animate-pulse"></div>
                                </div>
                                {/* Glow effect */}
                                <div className="absolute -inset-1 bg-emerald-500/20 blur-md -z-10 rounded-lg"></div>
                            </div>
                            <div className="text-center">
                                <Zap size={10} className="text-emerald-400 mx-auto mb-0.5" />
                                <span className="text-emerald-400 font-mono text-[10px] font-bold block">+{fmt(energyProd)}</span>
                                <span className="text-[8px] text-slate-600 uppercase">Prod.</span>
                            </div>
                        </div>

                        {/* Indicateur central - Flux */}
                        <div className="flex flex-col items-center justify-center h-20">
                            <div className={`text-2xl font-black font-mono ${energyNet >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                                {energyNet >= 0 ? '→' : '←'}
                            </div>
                            <div className={`text-xs font-mono font-bold ${energyNet >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                                {energyNet >= 0 ? '+' : ''}{fmt(energyNet)}
                            </div>
                            <div className="text-[8px] text-slate-600 uppercase">Net</div>
                        </div>

                        {/* Barre Consommation */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="relative w-8 h-20 bg-slate-900 rounded-lg border border-white/10 overflow-hidden">
                                {/* Graduation */}
                                <div className="absolute inset-0 flex flex-col justify-between py-1 px-0.5 opacity-30">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="h-px bg-white/50 w-full"></div>
                                    ))}
                                </div>
                                {/* Barre de remplissage */}
                                <div
                                    className={`absolute bottom-0 left-0 right-0 transition-all duration-700 rounded-b-md ${energyRatio >= 100 ? 'bg-gradient-to-t from-orange-600 via-orange-400 to-yellow-400' : 'bg-gradient-to-t from-red-700 via-red-500 to-orange-400'}`}
                                    style={{ height: `${Math.min(100, (energyCons / Math.max(energyProd, energyCons, 1)) * 100)}%` }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                                </div>
                                {/* Glow effect */}
                                <div className={`absolute -inset-1 blur-md -z-10 rounded-lg ${energyRatio >= 100 ? 'bg-orange-500/20' : 'bg-red-500/30'}`}></div>
                            </div>
                            <div className="text-center">
                                <Activity size={10} className={`mx-auto mb-0.5 ${energyRatio >= 100 ? 'text-orange-400' : 'text-red-400'}`} />
                                <span className={`font-mono text-[10px] font-bold block ${energyRatio >= 100 ? 'text-orange-400' : 'text-red-400'}`}>-{fmt(energyCons)}</span>
                                <span className="text-[8px] text-slate-600 uppercase">Conso.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Jauge d'efficacité style électrique */}
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                        <span>Charge du réseau</span>
                        <span className={energyRatio >= 100 ? 'text-emerald-400' : energyRatio >= 50 ? 'text-orange-400' : 'text-red-400'}>{Math.round(energyPercent)}%</span>
                    </div>
                    <div className="relative h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/10">
                        {/* Graduations */}
                        <div className="absolute inset-0 flex justify-between px-1 items-center">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="w-px h-2 bg-white/20"></div>
                            ))}
                        </div>
                        {/* Barre de progression */}
                        <div
                            className={`h-full transition-all duration-500 relative ${
                                energyRatio >= 100
                                    ? 'bg-gradient-to-r from-emerald-600 via-emerald-400 to-cyan-400'
                                    : energyRatio >= 50
                                        ? 'bg-gradient-to-r from-orange-600 via-orange-400 to-yellow-400'
                                        : 'bg-gradient-to-r from-red-700 via-red-500 to-orange-500'
                            }`}
                            style={{ width: `${Math.min(energyPercent, 100)}%` }}
                        >
                            {/* Effet de brillance animé */}
                            <div className="absolute inset-0 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                            </div>
                            {/* Point lumineux au bout */}
                            <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${energyRatio >= 100 ? 'bg-cyan-400' : energyRatio >= 50 ? 'bg-yellow-400' : 'bg-red-400'} shadow-[0_0_10px_currentColor] animate-pulse`}></div>
                        </div>
                        {/* Glow sous la barre */}
                        <div
                            className={`absolute bottom-0 left-0 h-1 blur-sm transition-all duration-500 ${energyRatio >= 100 ? 'bg-cyan-400' : energyRatio >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(energyPercent, 100)}%` }}
                        ></div>
                    </div>
                </div>

                {/* Alerte si déficit */}
                {energyRatio < 100 && (
                    <div className={`rounded-lg p-3 border flex items-center gap-3 ${energyRatio >= 50 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-red-500/20 border-red-500/50 animate-pulse'}`}>
                        <div className={`p-2 rounded-full ${energyRatio >= 50 ? 'bg-orange-500/20' : 'bg-red-500/30'}`}>
                            <AlertTriangle size={16} className={energyRatio >= 50 ? 'text-orange-400' : 'text-red-400'} />
                        </div>
                        <div>
                            <p className={`text-xs font-bold uppercase ${energyRatio >= 50 ? 'text-orange-400' : 'text-red-400'}`}>
                                {energyRatio >= 50 ? 'Surcharge partielle' : 'Surcharge critique'}
                            </p>
                            <p className="text-[10px] text-slate-400">
                                Production minière réduite de <span className={`font-bold ${energyRatio >= 50 ? 'text-orange-300' : 'text-red-300'}`}>{100 - energyRatio}%</span>
                            </p>
                        </div>
                    </div>
                )}

                {/* Stats compactes en bas */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                    <div className="text-center">
                        <span className="text-[8px] text-slate-600 uppercase block">Centrale</span>
                        <span className="text-yellow-400 font-mono text-xs font-bold">Niv.{planet.solar_plant_level}</span>
                    </div>
                    <div className="text-center border-x border-white/5">
                        <span className="text-[8px] text-slate-600 uppercase block">Tech. Énergie</span>
                        <span className="text-purple-400 font-mono text-xs font-bold">Niv.{planet.energy_tech_level || 0}</span>
                    </div>
                    <div className="text-center">
                        <span className="text-[8px] text-slate-600 uppercase block">Rendement</span>
                        <span className={`font-mono text-xs font-bold ${energyNet >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>{energyNet >= 0 ? '+' : ''}{fmt(energyNet)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* --- SECTION TACTIQUE MILITAIRE --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border border-red-500/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors"></div>
              <CardHeader className="pb-2 relative z-10">
                  <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
                          <Sword size={14} /> Capacité Offensive Globale
                      </span>
                      <TrendingUp size={14} className="text-red-500 animate-pulse" />
                  </div>
              </CardHeader>
              <CardContent className="relative z-10">
                  <div className="flex items-end gap-2">
                      <span className="text-4xl font-black font-mono text-white tracking-tighter">{fmt(totalAtk)}</span>
                      <span className="text-xs font-bold text-red-500 mb-1 uppercase tracking-tighter">Dégâts / Round</span>
                  </div>
                  <div className="mt-4 space-y-3">
                      <div className="text-[10px] text-slate-400 font-bold uppercase flex justify-between items-center">
                          <span>Armement (NV.{planet.laser_battery_level})</span>
                          <span className="text-red-400 font-mono">+{Math.round((atkBonus-1)*100)}% DMG</span>
                      </div>
                      <Progress value={Math.min(100, planet.laser_battery_level * 8)} className="h-1 bg-slate-800" />
                  </div>
              </CardContent>
          </Card>

          <Card className="bg-slate-900 border border-emerald-500/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors"></div>
              <CardHeader className="pb-2 relative z-10">
                  <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                          <ShieldCheck size={14} /> Structure & Blindage Global
                      </span>
                      <Activity size={14} className="text-emerald-500" />
                  </div>
              </CardHeader>
              <CardContent className="relative z-10">
                  <div className="flex items-end gap-2">
                      <span className="text-4xl font-black font-mono text-white tracking-tighter">{fmt(totalHull)}</span>
                      <span className="text-xs font-bold text-emerald-500 mb-1 uppercase tracking-tighter">Points Coque</span>
                  </div>
                  <div className="mt-4 space-y-3">
                      <div className="text-[10px] text-slate-400 font-bold uppercase flex justify-between items-center">
                          <span>Protection (NV.{planet.armour_tech_level})</span>
                          <span className="text-emerald-400 font-mono">+{Math.round((hullBonus-1)*100)}% HULL</span>
                      </div>
                      <Progress value={Math.min(100, planet.armour_tech_level * 8)} className="h-1 bg-slate-800 text-emerald-500" />
                  </div>
              </CardContent>
          </Card>
      </div>

      {/* INFRASTRUCTURES & RESSOURCES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        <div className="md:col-span-1 space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-1">Infrastructures</h3>
            {[
                { label: "Mine de Métal", level: planet.metal_mine_level, icon: Stone, color: "text-orange-300" },
                { label: "Mine de Cristal", level: planet.crystal_mine_level, icon: Gem, color: "text-cyan-400" },
                { label: "Synth. Deutérium", level: planet.deuterium_mine_level, icon: Droplets, color: "text-green-400" },
                { label: "Centrale Solaire", level: planet.solar_plant_level, icon: Zap, color: "text-yellow-400" },
                { label: "Hangar Vaisseaux", level: planet.hangar_level || 0, icon: Warehouse, color: "text-orange-400" }, 
            ].map((mine) => (
                <div key={mine.label} className="bg-slate-900/50 border border-white/5 p-3 rounded-lg flex items-center justify-between group hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <mine.icon size={16} className={`shrink-0 ${mine.color}`} />
                        <span className="text-xs font-bold text-slate-300 truncate">{mine.label}</span>
                    </div>
                    <span className="text-sm font-black font-mono text-white shrink-0 px-2 bg-black/40 rounded border border-white/5">Niv. {mine.level}</span>
                </div>
            ))}
        </div>

        <div className="md:col-span-3 min-w-0">
            <Card className="bg-gradient-to-br from-slate-900/80 to-green-950/20 border border-green-500/30">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-green-400">
                            <TrendingUp size={16} /> Production Industrielle
                        </span>
                        <div className="flex items-center gap-2">
                            {energyRatio < 100 && (
                                <span className="text-[10px] text-red-400 bg-red-500/20 px-2 py-1 rounded flex items-center gap-1">
                                    <AlertTriangle size={10} /> -{100 - energyRatio}%
                                </span>
                            )}
                            <span className="text-xs bg-green-500/20 px-2 py-1 rounded text-green-300 font-mono">
                                {energyRatio}% efficacité
                            </span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Graphique comparatif */}
                    <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                        <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-3 font-bold">Répartition Production /h</div>
                        <div className="space-y-2">
                            {(() => {
                                const maxProd = Math.max(prodMetal, prodCrystal, prodDeut, 1);
                                return (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <Stone size={12} className="text-orange-400 shrink-0" />
                                            <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all duration-500"
                                                    style={{ width: `${(prodMetal / maxProd) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-orange-400 font-mono text-xs font-bold w-16 text-right">+{fmt(prodMetal)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Gem size={12} className="text-cyan-400 shrink-0" />
                                            <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-500"
                                                    style={{ width: `${(prodCrystal / maxProd) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-cyan-400 font-mono text-xs font-bold w-16 text-right">+{fmt(prodCrystal)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Droplets size={12} className="text-emerald-400 shrink-0" />
                                            <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                                                    style={{ width: `${(prodDeut / maxProd) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-emerald-400 font-mono text-xs font-bold w-16 text-right">+{fmt(prodDeut)}</span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Détails par ressource */}
                    <div className="grid grid-cols-3 gap-2">
                        {/* Métal */}
                        <div className="bg-gradient-to-b from-orange-950/30 to-slate-900/50 p-3 rounded-lg border border-orange-500/30">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Stone size={14} className="text-orange-400" />
                                <span className="text-orange-300 font-bold text-xs uppercase">Métal</span>
                            </div>
                            <div className="text-white font-mono font-black text-lg">{fmt(planet.metal_amount)}</div>
                            <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">Par heure</span>
                                    <span className="text-yellow-400 font-mono font-bold">+{fmt(prodMetal)}</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">Par jour</span>
                                    <span className="text-green-400 font-mono font-bold">+{fmt(prodMetal * 24)}</span>
                                </div>
                            </div>
                            {planet.slot_bonuses?.metal && planet.slot_bonuses.metal !== "+0%" && (
                                <div className="mt-2 text-[9px] text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded text-center">{planet.slot_bonuses.metal} slot</div>
                            )}
                        </div>
                        {/* Cristal */}
                        <div className="bg-gradient-to-b from-cyan-950/30 to-slate-900/50 p-3 rounded-lg border border-cyan-500/30">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Gem size={14} className="text-cyan-400" />
                                <span className="text-cyan-300 font-bold text-xs uppercase">Cristal</span>
                            </div>
                            <div className="text-white font-mono font-black text-lg">{fmt(planet.crystal_amount)}</div>
                            <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">Par heure</span>
                                    <span className="text-yellow-400 font-mono font-bold">+{fmt(prodCrystal)}</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">Par jour</span>
                                    <span className="text-green-400 font-mono font-bold">+{fmt(prodCrystal * 24)}</span>
                                </div>
                            </div>
                            {planet.slot_bonuses?.crystal && planet.slot_bonuses.crystal !== "+0%" && (
                                <div className="mt-2 text-[9px] text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded text-center">{planet.slot_bonuses.crystal} slot</div>
                            )}
                        </div>
                        {/* Deutérium */}
                        <div className="bg-gradient-to-b from-emerald-950/30 to-slate-900/50 p-3 rounded-lg border border-emerald-500/30">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Droplets size={14} className="text-emerald-400" />
                                <span className="text-emerald-300 font-bold text-xs uppercase">Deutérium</span>
                            </div>
                            <div className="text-white font-mono font-black text-lg">{fmt(planet.deuterium_amount)}</div>
                            <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">Par heure</span>
                                    <span className="text-yellow-400 font-mono font-bold">+{fmt(prodDeut)}</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">Par jour</span>
                                    <span className="text-green-400 font-mono font-bold">+{fmt(prodDeut * 24)}</span>
                                </div>
                            </div>
                            {planet.slot_bonuses?.deuterium && planet.slot_bonuses.deuterium !== "+0%" && (
                                <div className="mt-2 text-[9px] text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded text-center">{planet.slot_bonuses.deuterium} slot</div>
                            )}
                        </div>
                    </div>

                    {/* Total journalier */}
                    <div className="bg-gradient-to-r from-yellow-950/20 to-green-950/20 rounded-lg p-3 border border-yellow-500/20">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Production totale /jour</span>
                            <div className="flex items-center gap-4 text-xs font-mono font-bold">
                                <span className="text-orange-400">+{fmt(prodMetal * 24)} M</span>
                                <span className="text-cyan-400">+{fmt(prodCrystal * 24)} C</span>
                                <span className="text-emerald-400">+{fmt(prodDeut * 24)} D</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* STATIONNEMENT FLOTTE & DEFENSES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <Card className="bg-blue-950/10 border border-blue-500/20">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-blue-400">
                        <span className="flex items-center gap-2"><Rocket size={14} /> Hangar (Vaisseaux Stationnés)</span>
                        <span className="bg-blue-500/20 px-2 py-1 rounded text-blue-300">{fmt(totalFleet)} / {fmt(hangarCap)}</span>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: "Chasseurs Légers", val: planet.light_hunter_count },
                            { label: "Croiseurs", val: planet.cruiser_count },
                            { label: "Recycleurs", val: planet.recycler_count },
                            { label: "Sondes", val: planet.spy_probe_count },
                            { label: "Vaisseaux Colons", val: planet.colony_ship_count },
                            { label: "Transporteurs", val: planet.transporter_count },
                        ].map(item => (
                            <div key={item.label} className="bg-slate-900/50 p-2 rounded border border-white/5">
                                <span className="text-[10px] text-slate-500 uppercase block">{item.label}</span>
                                <span className="text-white font-mono font-bold">{fmt(item.val || 0)}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-red-950/10 border border-red-500/20">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-red-400">
                        <span className="flex items-center gap-2"><Shield size={14} /> Défenses Planétaires</span>
                        <span className="bg-red-500/20 px-2 py-1 rounded text-red-300">{fmt(totalDefense)} Systèmes</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-900/50 p-2 rounded border border-white/5">
                            <span className="text-[10px] text-slate-500 uppercase block">Lanceur de Missiles</span>
                            <span className="text-white font-mono font-bold">{fmt(planet.missile_launcher_count)}</span>
                        </div>
                        <div className="bg-slate-900/50 p-2 rounded border border-white/5">
                            <span className="text-[10px] text-slate-500 uppercase block">Artillerie Plasma</span>
                            <span className="text-white font-mono font-bold">{fmt(planet.plasma_turret_count)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
      </div>

      <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600 uppercase tracking-widest mt-8">
            <AlertTriangle size={12} />
            <span>Données limitées au secteur local [{planet.galaxy}:{planet.system}:{planet.position}]</span>
      </div>
    </div>
  );
}