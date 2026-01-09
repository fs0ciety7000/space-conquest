import { Database, Gem, Activity, MapPin, Shield, Rocket, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";



export default function PlanetOverview({ planet, speedFactor }: { planet: any, speedFactor: number }) {
  
  // --- FORMULES DE PRODUCTION (Identiques au Backend) ---
const calculateProduction = (level: number, baseFactor: number) => {
    const baseProd = baseFactor * level * Math.pow(1.1, level);
    // On utilise la prop dynamique venant du backend
    return baseProd * speedFactor;
  };

  // Production par HEURE
  const prodMetal = calculateProduction(planet.metal_mine_level, 30);
  const prodCrystal = calculateProduction(planet.crystal_mine_level, 20);
  const prodDeut = calculateProduction(planet.deuterium_mine_level, 10);

  // Totaux Militaires
  const totalFleet = (planet.light_hunter_count || 0) + (planet.cruiser_count || 0) + (planet.recycler_count || 0) + (planet.spy_probe_count || 0);
  const totalDefense = (planet.missile_launcher_count || 0) + (planet.plasma_turret_count || 0);

  // Helper pour formater les chiffres
  const fmt = (n: number) => Math.floor(n).toLocaleString();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER : INFO PLANÈTE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-slate-950 border border-white/10 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/20 to-transparent pointer-events-none"></div>
            <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-4 bg-indigo-500/10 rounded-full border border-indigo-500/30">
                    <Globe size={40} className="text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-black uppercase text-white tracking-widest">{planet.name}</h2>
                    <div className="flex items-center gap-2 text-slate-400 font-mono text-xs">
                        <MapPin size={12} />
                        <span>COORDONNÉES: [4:202:{planet.id.substring(0, 4)}]</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono text-slate-300">
                    <div className="bg-white/5 p-2 rounded border border-white/5">
                        <span className="text-slate-500 block uppercase text-[9px]">Diamètre</span>
                        12,800 km
                    </div>
                    <div className="bg-white/5 p-2 rounded border border-white/5">
                        <span className="text-slate-500 block uppercase text-[9px]">Température</span>
                        approx. 14°C
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* RÉSUMÉ MILITAIRE */}
        <Card className="bg-slate-950 border border-white/10 flex flex-col justify-center">
            <CardContent className="space-y-4 pt-6">
                <div className="flex justify-between items-center p-3 bg-blue-900/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-center gap-3">
                        <Rocket className="text-blue-400" size={20} />
                        <span className="text-xs font-bold uppercase text-slate-300">Flotte Totale</span>
                    </div>
                    <span className="text-xl font-black text-white font-mono">{fmt(totalFleet)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-900/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center gap-3">
                        <Shield className="text-red-400" size={20} />
                        <span className="text-xs font-bold uppercase text-slate-300">Défense Totale</span>
                    </div>
                    <span className="text-xl font-black text-white font-mono">{fmt(totalDefense)}</span>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* TABLEAU DE PRODUCTION */}
      <Card className="bg-black/60 border border-white/10 backdrop-blur-sm">
        <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <Activity size={16} /> Rapport de Production
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                        <tr className="border-b border-white/10 text-slate-500 uppercase tracking-wider">
                            <th className="py-3 pl-4">Ressource</th>
                            <th className="py-3 text-right">Actuel</th>
                            <th className="py-3 text-right text-slate-600">/ Seconde</th>
                            <th className="py-3 text-right text-white/80">/ Minute</th>
                            <th className="py-3 text-right text-yellow-500">/ Heure</th>
                            <th className="py-3 text-right pr-4 text-green-500">/ Jour</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {/* MÉTAL */}
                        <tr className="hover:bg-white/5 transition-colors">
                            <td className="py-4 pl-4 flex items-center gap-2 font-bold text-orange-400">
                                <Database size={14} /> MÉTAL
                            </td>
                            <td className="py-4 text-right font-bold text-white">{fmt(planet.metal_amount)}</td>
                            <td className="py-4 text-right text-slate-500">+{fmt(prodMetal / 3600)}</td>
                            <td className="py-4 text-right text-slate-300">+{fmt(prodMetal / 60)}</td>
                            <td className="py-4 text-right text-yellow-400 font-bold">+{fmt(prodMetal)}</td>
                            <td className="py-4 text-right pr-4 text-green-400">+{fmt(prodMetal * 24)}</td>
                        </tr>

                        {/* CRISTAL */}
                        <tr className="hover:bg-white/5 transition-colors">
                            <td className="py-4 pl-4 flex items-center gap-2 font-bold text-cyan-400">
                                <Gem size={14} /> CRISTAL
                            </td>
                            <td className="py-4 text-right font-bold text-white">{fmt(planet.crystal_amount)}</td>
                            <td className="py-4 text-right text-slate-500">+{fmt(prodCrystal / 3600)}</td>
                            <td className="py-4 text-right text-slate-300">+{fmt(prodCrystal / 60)}</td>
                            <td className="py-4 text-right text-yellow-400 font-bold">+{fmt(prodCrystal)}</td>
                            <td className="py-4 text-right pr-4 text-green-400">+{fmt(prodCrystal * 24)}</td>
                        </tr>

                        {/* DEUTERIUM */}
                        <tr className="hover:bg-white/5 transition-colors">
                            <td className="py-4 pl-4 flex items-center gap-2 font-bold text-green-400">
                                <Activity size={14} /> DEUTÉRIUM
                            </td>
                            <td className="py-4 text-right font-bold text-white">{fmt(planet.deuterium_amount)}</td>
                            <td className="py-4 text-right text-slate-500">+{fmt(prodDeut / 3600)}</td>
                            <td className="py-4 text-right text-slate-300">+{fmt(prodDeut / 60)}</td>
                            <td className="py-4 text-right text-yellow-400 font-bold">+{fmt(prodDeut)}</td>
                            <td className="py-4 text-right pr-4 text-green-400">+{fmt(prodDeut * 24)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}