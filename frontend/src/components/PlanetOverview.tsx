import { 
  Stone, Gem, MapPin, Shield, Rocket, Globe, Scan, 
  Zap, Hammer, Clock, TrendingUp, AlertTriangle, 
  Droplets, Microscope, Warehouse 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";

// --- Helper pour les noms ---
const getLabel = (id: string | null) => {
    if (!id) return null;
    const labels: Record<string, string> = {
        // Bâtiments
        metal: "Mine de Métal",
        crystal: "Mine de Cristal",
        deuterium: "Synth. Deutérium",
        solar_plant: "Centrale Solaire",
        shipyard: "Chantier Spatial",
        research: "Labo de Recherche",
        hangar: "Hangar à Vaisseaux",
        // Techs
        energy_tech: "Tech. Énergie",
        laser: "Tech. Laser",
        espionage: "Tech. Espionnage",
        // Flotte
        light_hunter: "Chasseur Léger",
        cruiser: "Croiseur",
        colony_ship: "Vaisseau Colon",
        transporter: "Transporteur",
        recycler: "Recycleur",
        spy_probe: "Sonde Espionnage",
        // Défense
        missile_launcher: "Lanceur Missiles",
        plasma_turret: "Tourelle Plasma"
    };
    return labels[id] || id;
};

export default function PlanetOverview({ planet, speedFactor }: { planet: any, speedFactor: number }) {
  
  // --- TIMERS ---
  const [buildTime, setBuildTime] = useState<number | null>(null);
  const [fleetTime, setFleetTime] = useState<number | null>(null);

  useEffect(() => {
    const updateTimers = () => {
        const now = new Date().getTime();

        if (planet.construction_end) {
            const end = new Date(planet.construction_end + "Z").getTime();
            setBuildTime(Math.max(0, Math.floor((end - now) / 1000)));
        } else {
            setBuildTime(null);
        }

        if (planet.shipyard_construction_end) {
            const end = new Date(planet.shipyard_construction_end + "Z").getTime();
            setFleetTime(Math.max(0, Math.floor((end - now) / 1000)));
        } else {
            setFleetTime(null);
        }
    };
    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [planet.construction_end, planet.shipyard_construction_end]);


  // --- CALCULS ---
  const calculateProduction = (level: number, baseFactor: number) => {
    const baseProd = baseFactor * level * Math.pow(1.1, level);
    return baseProd * speedFactor;
  };

  const prodMetal = calculateProduction(planet.metal_mine_level, 30);
  const prodCrystal = calculateProduction(planet.crystal_mine_level, 20);
  const prodDeut = calculateProduction(planet.deuterium_mine_level, 10);

  // Énergie
  const solarLevel = planet.solar_plant_level || 0;
  const energyTechLevel = planet.energy_tech_level || 0;
  const baseSolarProd = 20 * solarLevel * Math.pow(1.1, solarLevel);
  const techBonus = 1 + (energyTechLevel * 0.05);
  const energyProd = Math.floor(baseSolarProd * techBonus);

  const consMetal = 10 * planet.metal_mine_level * Math.pow(1.1, planet.metal_mine_level);
  const consCrystal = 10 * planet.crystal_mine_level * Math.pow(1.1, planet.crystal_mine_level);
  const consDeut = 20 * planet.deuterium_mine_level * Math.pow(1.1, planet.deuterium_mine_level);
  const energyCons = Math.floor(consMetal + consCrystal + consDeut);
  const energyNet = energyProd - energyCons;
  const energyPercent = energyCons > 0 ? Math.min(100, (energyCons / energyProd) * 100) : 0;

  // Flotte & Hangar
  const totalFleet = (planet.light_hunter_count || 0) + (planet.cruiser_count || 0) + (planet.recycler_count || 0) + (planet.spy_probe_count || 0) + (planet.colony_ship_count || 0) + (planet.transporter_count || 0);
  const hangarCap = 500 + ((planet.hangar_level || 0) * 500);
  const hangarPercent = Math.min(100, (totalFleet / hangarCap) * 100);

  const totalDefense = (planet.missile_launcher_count || 0) + (planet.plasma_turret_count || 0);
  const firePower = (planet.light_hunter_count * 50) + (planet.cruiser_count * 400) + (planet.missile_launcher_count * 80);

  const fmt = (n: number) => Math.floor(n).toLocaleString();

  // Détection du type de construction (Tech vs Bâtiment)
  const isTech = ['research', 'energy_tech', 'laser', 'espionage'].includes(planet.construction_type);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* --- HEADER GLOBAL --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CARTE PRINCIPALE : INFO & FILES D'ATTENTE */}
        <Card className="lg:col-span-2 bg-slate-950 border border-white/10 overflow-hidden relative group flex flex-col justify-between">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614730341194-75c607ae363c?q=80&w=2696&auto=format&fit=crop')] bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent"></div>
            
            {/* Header Info */}
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
                        <div className="px-2 py-0.5 rounded bg-green-500/20 border border-green-500/30 text-[10px] text-green-400 font-bold uppercase tracking-wider animate-pulse">
                            Système Nominal
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-slate-400 font-mono text-xs">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-black/40 rounded border border-white/5">
                            <MapPin size={12} className="text-indigo-400" />
                            <span>[{planet.galaxy}:{planet.system}:{planet.position}]</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-black/40 rounded border border-white/5">
                            <Scan size={12} className="text-cyan-400" />
                            <span>Temp. 22°C</span>
                        </div>
                    </div>
                </div>
            </CardHeader>

            {/* FILES D'ATTENTE (En bas de la carte) */}
            <CardContent className="relative z-10 pt-0 pb-4 px-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. ARCHITECTURE / TECH */}
                <div className={`p-3 rounded border backdrop-blur-sm flex items-center justify-between transition-all ${buildTime !== null ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-black/40 border-white/5'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${buildTime !== null ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                            {isTech ? <Microscope size={16} /> : <Hammer size={16} />}
                        </div>
                        <div>
                            <p className="text-[9px] uppercase text-slate-500 font-bold tracking-wider mb-0.5">
                                {isTech ? "Recherche en cours" : "Infrastructure & Tech"}
                            </p>
                            <p className={`text-xs font-bold ${buildTime !== null ? 'text-white' : 'text-slate-500 italic'}`}>
                                {getLabel(planet.construction_type) || "Aucun ordre"}
                            </p>
                        </div>
                    </div>
                    {buildTime !== null && (
                        <div className="text-indigo-300 font-mono text-xs font-bold bg-black/50 px-2 py-1 rounded border border-indigo-500/30">
                            {buildTime}s
                        </div>
                    )}
                </div>

               {/* 2. CHANTIER SPATIAL */}
<div className={`p-3 rounded border backdrop-blur-sm flex items-center justify-between transition-all ${fleetTime !== null ? 'bg-orange-900/20 border-orange-500/50' : 'bg-black/40 border-white/5'}`}>
    <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${fleetTime !== null ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-500'}`}>
            <Rocket size={16} />
        </div>
        <div>
            <p className="text-[9px] uppercase text-slate-500 font-bold tracking-wider mb-0.5">Ligne de Production</p>
            <p className={`text-xs font-bold ${fleetTime !== null ? 'text-white' : 'text-slate-500 italic'}`}>
                {fleetTime !== null ? (
                    <span className="flex items-center gap-2">
                        {getLabel(planet.pending_fleet_type)} 
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1 rounded border border-orange-500/30">x{planet.pending_fleet_count}</span>
                    </span>
                ) : (
                    // MODIFICATION ICI : Texte plus clair
                    "File d'attente vide"
                )}
            </p>
        </div>
    </div>
    {fleetTime !== null && (
        <div className="text-orange-300 font-mono text-xs font-bold bg-black/50 px-2 py-1 rounded border border-orange-500/30">
            {fleetTime}s
        </div>
    )}
</div>

            </CardContent>
        </Card>

        {/* ÉNERGIE */}
        <Card className="bg-slate-900/80 border border-white/10 backdrop-blur-md flex flex-col justify-between relative overflow-hidden">
             <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 ${energyNet >= 0 ? 'bg-yellow-400' : 'bg-red-500'}`}></div>
            
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    <Zap size={14} className={energyNet >= 0 ? "text-yellow-400" : "text-red-500"} /> Réseau Électrique
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-end justify-between">
                    <span className={`text-3xl font-mono font-black ${energyNet >= 0 ? 'text-white' : 'text-red-400'}`}>
                        {fmt(energyNet)}
                    </span>
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

      {/* --- SECTION INFRASTRUCTURES & RESSOURCES --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        
        {/* Colonne de Gauche : INFRASTRUCTURES */}
        <div className="md:col-span-1 space-y-4 min-w-0">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-1">Infrastructures</h3>
            
            {[
                { label: "Mine de Métal", level: planet.metal_mine_level, icon: Stone, color: "text-orange-300", border: "border-orange-500/20" },
                { label: "Mine de Cristal", level: planet.crystal_mine_level, icon: Gem, color: "text-cyan-400", border: "border-cyan-500/20" },
                { label: "Synth. Deutérium", level: planet.deuterium_mine_level, icon: Droplets, color: "text-green-400", border: "border-green-500/20" },
                { label: "Centrale Solaire", level: planet.solar_plant_level, icon: Zap, color: "text-yellow-400", border: "border-yellow-500/20" },
                // Ajout du Hangar ici
                { label: "Hangar Vaisseaux", level: planet.hangar_level || 0, icon: Warehouse, color: "text-orange-400", border: "border-orange-500/20" }, 
            ].map((mine) => (
                <div key={mine.label} className={`bg-slate-900/50 border ${mine.border} p-3 rounded-lg flex items-center justify-between group hover:bg-white/5 transition-colors`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <mine.icon size={16} className={`shrink-0 ${mine.color}`} />
                        <span className="text-xs font-bold text-slate-300 truncate">{mine.label}</span>
                    </div>
                    <span className="text-sm font-black font-mono text-white bg-black/40 px-2 py-0.5 rounded border border-white/5 shrink-0">
                        Niv. {mine.level}
                    </span>
                </div>
            ))}
        </div>

        {/* Colonne Centrale/Droite : TABLEAU DE PRODUCTION */}
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
                        <span className="flex items-center gap-2"><Rocket size={14} /> Forces Spatiales</span>
                        <span className="bg-blue-500/20 px-2 py-1 rounded text-blue-300">{fmt(totalFleet)} / {fmt(hangarCap)}</span>
                    </div>
                    {/* Jauge Hangar */}
                    <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${hangarPercent >= 90 ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} style={{ width: `${hangarPercent}%` }}></div>
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
                            <p className="text-[10px] text-slate-600 mt-1">Basé sur la puissance de feu locale.</p>
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

        {/* Note sur les flottes totales */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600 uppercase tracking-widest mt-8">
            <AlertTriangle size={12} />
            <span>Les données affichées concernent uniquement le secteur local [{planet.galaxy}:{planet.system}:{planet.position}]</span>
        </div>

    </div>
  );
}