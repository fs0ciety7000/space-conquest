import { 
  Stone, Gem, MapPin, Shield, Rocket, Globe, Scan, 
  Zap, Hammer, Clock, TrendingUp, AlertTriangle, 
  Droplets, Microscope, Warehouse, Activity, ChevronRight, List, XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { toast } from "sonner";

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
    if (['research', 'energy_tech', 'laser', 'espionage'].includes(id)) return 'tech';
    return 'building';
};

export default function PlanetOverview({ planet, speedFactor }: { planet: any, speedFactor: number }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const getTimeLeft = (endDate: string) => {
    const end = new Date(endDate.endsWith("Z") ? endDate : endDate + "Z").getTime();
    const now = new Date().getTime();
    return Math.max(0, Math.floor((end - now) / 1000));
  };

  const cancelOperation = async (queueId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:8080/planets/${planet.id}/cancel-construction/${queueId}`, {
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

  // --- CALCULS PRODUCTION ---
  const calculateProduction = (level: number, baseFactor: number) => {
    const baseProd = baseFactor * level * Math.pow(1.1, level);
    return baseProd * speedFactor;
  };

  const prodMetal = calculateProduction(planet.metal_mine_level, 30);
  const prodCrystal = calculateProduction(planet.crystal_mine_level, 20);
  const prodDeut = calculateProduction(planet.deuterium_mine_level, 10);

  const solarLevel = planet.solar_plant_level || 0;
  const energyTechLevel = planet.energy_tech_level || 0;
  const energyProd = Math.floor((20 * solarLevel * Math.pow(1.1, solarLevel)) * (1 + (energyTechLevel * 0.05)));
  const energyCons = Math.floor(
    (10 * planet.metal_mine_level * Math.pow(1.1, planet.metal_mine_level)) +
    (10 * planet.crystal_mine_level * Math.pow(1.1, planet.crystal_mine_level)) +
    (20 * planet.deuterium_mine_level * Math.pow(1.1, planet.deuterium_mine_level))
  );
  const energyNet = energyProd - energyCons;
  const energyPercent = energyCons > 0 ? Math.min(100, (energyCons / energyProd) * 100) : 0;

  const totalFleet = (planet.light_hunter_count || 0) + (planet.cruiser_count || 0) + (planet.recycler_count || 0) + (planet.spy_probe_count || 0) + (planet.colony_ship_count || 0) + (planet.transporter_count || 0);
  const hangarCap = 500 + ((planet.hangar_level || 0) * 500);
  const totalDefense = (planet.missile_launcher_count || 0) + (planet.plasma_turret_count || 0);
  const firePower = (planet.light_hunter_count * 50) + (planet.cruiser_count * 400) + (planet.missile_launcher_count * 80);

  const fmt = (n: number) => Math.floor(n).toLocaleString();
  const constructionQueue = planet.constructions || [];
  const slotsUsed = constructionQueue.length;
  const maxSlots = 3;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <div className="flex flex-wrap items-center gap-4 text-slate-400 font-mono text-xs">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-black/40 rounded border border-white/5">
                            <MapPin size={12} className="text-indigo-400" />
                            <span>[{planet.galaxy}:{planet.system}:{planet.position}]</span>
                        </div>
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
                                // On simule l'affichage du ratio côté UI pour le survol
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
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-2 text-indigo-300 font-mono bg-black/40 px-2 py-1 rounded border border-white/5 text-[10px]">
                                                <Clock size={10} className={index === 0 ? "animate-spin-slow" : ""} />
                                                {tl}s
                                            </div>

                                            <div className="relative group/cancel">
                                                <button 
                                                    onClick={() => cancelOperation(item.id)}
                                                    className="text-slate-600 hover:text-red-500 transition-colors p-1"
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                                
                                                <div className="absolute bottom-full right-0 mb-2 hidden group-hover/cancel:block z-50">
                                                    <div className="bg-slate-900 border border-red-500/50 text-white text-[9px] p-2 rounded shadow-2xl whitespace-nowrap flex flex-col gap-0.5">
                                                        <span className="text-red-400 font-black uppercase border-b border-white/10 pb-1 mb-1">Estimation Retour</span>
                                                        <span>Ratio: {refundPercent}%</span>
                                                        <span className="text-slate-400 italic">Remboursement dégressif</span>
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

        <Card className="bg-slate-900/80 border border-white/10 backdrop-blur-md flex flex-col justify-between relative overflow-hidden">
             <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 ${energyNet >= 0 ? 'bg-yellow-400' : 'bg-red-500'}`}></div>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    <Zap size={14} className={energyNet >= 0 ? "text-yellow-400" : "text-red-500"} /> Réseau Électrique
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-end justify-between">
                    <span className={`text-3xl font-mono font-black ${energyNet >= 0 ? 'text-white' : 'text-red-400'}`}>{fmt(energyNet)}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${energyNet >= 0 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                        {energyNet >= 0 ? 'STABLE' : 'CRITIQUE'}
                    </span>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                        <span>Charge Système</span>
                        <span>{Math.floor(energyPercent)}%</span>
                    </div>
                    <Progress value={energyPercent} className={`h-1.5 ${energyNet < 0 ? "bg-red-900" : "bg-slate-800"}`} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="bg-white/5 p-2 rounded text-center">
                        <span className="block text-slate-500">Prod.</span>
                        <span className="text-green-400">+{fmt(energyProd)}</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded text-center">
                        <span className="block text-slate-500">Conso.</span>
                        <span className="text-red-400">-{fmt(energyCons)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* --- INFRASTRUCTURES --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        <div className="md:col-span-1 space-y-4 min-w-0">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-1">Infrastructures</h3>
            {[
                { label: "Mine de Métal", level: planet.metal_mine_level, icon: Stone, color: "text-orange-300", border: "border-orange-500/20" },
                { label: "Mine de Cristal", level: planet.crystal_mine_level, icon: Gem, color: "text-cyan-400", border: "border-cyan-500/20" },
                { label: "Synth. Deutérium", level: planet.deuterium_mine_level, icon: Droplets, color: "text-green-400", border: "border-green-500/20" },
                { label: "Centrale Solaire", level: planet.solar_plant_level, icon: Zap, color: "text-yellow-400", border: "border-yellow-500/20" },
                { label: "Hangar Vaisseaux", level: planet.hangar_level || 0, icon: Warehouse, color: "text-orange-400", border: "border-orange-500/20" }, 
            ].map((mine) => (
                <div key={mine.label} className={`bg-slate-900/50 border ${mine.border} p-3 rounded-lg flex items-center justify-between group hover:bg-white/5 transition-colors`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <mine.icon size={16} className={`shrink-0 ${mine.color}`} />
                        <span className="text-xs font-bold text-slate-300 truncate">{mine.label}</span>
                    </div>
                    <span className="text-sm font-black font-mono text-white bg-black/40 px-2 py-0.5 rounded border border-white/5 shrink-0">Niv. {mine.level}</span>
                </div>
            ))}
        </div>

        <div className="md:col-span-3 min-w-0">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-1 mb-4">Rendement Industriel</h3>
            <Card className="bg-green-950/10 border border-green-500/20">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse font-mono text-xs whitespace-nowrap">
                            <thead>
                                <tr className="bg-white/5 text-slate-500 uppercase tracking-wider text-[10px]">
                                    <th className="py-3 pl-4">Ressource</th>
                                    <th className="py-3 text-right">Stock</th>
                                    <th className="py-3 text-right">Capacité</th>
                                    <th className="py-3 text-right text-yellow-500">/ Heure</th>
                                    <th className="py-3 text-right pr-4 text-green-500">/ Jour</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                <tr className="hover:bg-white/5 transition-colors">
                                    <td className="py-4 pl-4 flex items-center gap-2 font-bold text-orange-300"><Stone size={14} /> MÉTAL</td>
                                    <td className="py-4 text-right font-bold text-white text-sm">{fmt(planet.metal_amount)}</td>
                                    <td className="py-4 text-right text-slate-600">Illimité</td>
                                    <td className="py-4 text-right text-yellow-400 font-bold">+{fmt(prodMetal)}</td>
                                    <td className="py-4 text-right pr-4 text-green-400">+{fmt(prodMetal * 24)}</td>
                                </tr>
                                <tr className="hover:bg-white/5 transition-colors">
                                    <td className="py-4 pl-4 flex items-center gap-2 font-bold text-cyan-400"><Gem size={14} /> CRISTAL</td>
                                    <td className="py-4 text-right font-bold text-white text-sm">{fmt(planet.crystal_amount)}</td>
                                    <td className="py-4 text-right text-slate-600">Illimité</td>
                                    <td className="py-4 text-right text-yellow-400 font-bold">+{fmt(prodCrystal)}</td>
                                    <td className="py-4 text-right pr-4 text-green-400">+{fmt(prodCrystal * 24)}</td>
                                </tr>
                                <tr className="hover:bg-white/5 transition-colors">
                                    <td className="py-4 pl-4 flex items-center gap-2 font-bold text-green-400"><Droplets size={14} /> DEUTÉRIUM</td>
                                    <td className="py-4 text-right font-bold text-white text-sm">{fmt(planet.deuterium_amount)}</td>
                                    <td className="py-4 text-right text-slate-600">Illimité</td>
                                    <td className="py-4 text-right text-yellow-400 font-bold">+{fmt(prodDeut)}</td>
                                    <td className="py-4 text-right pr-4 text-green-400">+{fmt(prodDeut * 24)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* --- SECTION MILITAIRE --- */}
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
                    <div className="flex items-center gap-4">
                         <div className="flex-1">
                            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
                                <span>Indice de Sécurité</span>
                                <span>{fmt(firePower)} BP</span>
                            </div>
                            <Progress value={Math.min(100, totalDefense / 10)} className="h-2 bg-slate-800" />
                         </div>
                    </div>
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