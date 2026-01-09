import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pickaxe, Gem, Droplets, TrendingUp, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResourceDisplayProps {
  planet: any;
  onUpgrade: () => void;
}

export default function ResourceDisplay({ planet, onUpgrade }: ResourceDisplayProps) {
  if (!planet) return null;

  const handleUpgrade = async (type: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:8080/planets/${planet.id}/upgrade/${type}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) onUpgrade();
    } catch (e) {
      console.error("Erreur lors de l'amélioration:", e);
    }
  };

  // --- LOGIQUE DE CALCUL (Synchronisée avec game_logic.rs) ---
  
  // Production horaire : Base * Niveau * 1.1^Niveau * SPEED_FACTOR (10)
  const calculateProd = (level: number, base: number) => 
    Math.floor(base * level * Math.pow(1.1, level) * 10);

  // Coût du prochain niveau
  const getNextCost = (type: string, currentLevel: number) => {
    const next = currentLevel + 1;
    const factor = Math.pow(1.5, next - 1);
    const crystalFactor = Math.pow(1.6, next - 1);

    if (type === 'metal') return { m: 60 * factor, c: 15 * factor };
    if (type === 'crystal') return { m: 48 * crystalFactor, c: 24 * crystalFactor };
    return { m: 225 * factor, c: 75 * factor }; // Deuterium
  };

  // --- DONNÉES DES MINES ---
  const mines = [
    { 
      id: 'metal', 
      name: 'Extracteur de Métal', 
      lv: planet.metal_mine_level ?? 0, 
      base: 30, 
      icon: <Pickaxe className="text-orange-500" /> 
    },
    { 
      id: 'crystal', 
      name: 'Fonderie de Cristal', 
      lv: planet.crystal_mine_level ?? 0, 
      base: 20, 
      icon: <Gem className="text-blue-400" /> 
    },
    { 
      id: 'deuterium', 
      name: 'Synthé de Deutérium', 
      lv: planet.deuterium_mine_level ?? 0, 
      base: 10, 
      icon: <Droplets className="text-teal-400" /> 
    },
  ];

  // --- SÉCURITÉ RESSOURCES (Utilise les noms de champs du backend) ---
  const metalNow = planet.metal_amount ?? 0;
  const crystalNow = planet.crystal_amount ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {mines.map((mine) => {
        const prod = calculateProd(mine.lv, mine.base);
        const cost = getNextCost(mine.id, mine.lv);
        
        // Vérification si le joueur a assez de ressources
        const canAfford = metalNow >= cost.m && crystalNow >= cost.c;
        const isBuilding = planet.construction_end !== null;

        return (
          <Card key={mine.id} className="bg-slate-950 border-white/10 overflow-hidden relative group border-t-2 border-t-indigo-500/50">
            <CardHeader className="bg-white/5 border-b border-white/5 py-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {mine.icon}
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white">
                    {mine.name}
                  </CardTitle>
                </div>
                <span className="text-xl font-mono font-black text-indigo-500">Lv.{mine.lv}</span>
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-4">
              {/* Affichage Production */}
              <div className="flex justify-between items-center bg-black/40 p-2 rounded">
                <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <TrendingUp size={10}/> Prod/Heure
                </span>
                <span className="text-xs font-mono font-black text-green-400">
                  +{prod.toLocaleString()}
                </span>
              </div>

              {/* Affichage Coûts */}
              <div className="space-y-2">
                <span className="text-[9px] uppercase font-black text-slate-600 flex items-center gap-1">
                  <Coins size={10}/> Coût d'Amélioration
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`text-[10px] font-mono p-1 rounded border border-white/5 text-center ${metalNow >= cost.m ? 'text-slate-300' : 'text-red-500'}`}>
                    M: {Math.floor(cost.m).toLocaleString()}
                  </div>
                  <div className={`text-[10px] font-mono p-1 rounded border border-white/5 text-center ${crystalNow >= cost.c ? 'text-slate-300' : 'text-red-500'}`}>
                    C: {Math.floor(cost.c).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Bouton d'action */}
              <Button 
                onClick={() => handleUpgrade(mine.id)}
                disabled={isBuilding || !canAfford}
                className={`w-full h-12 font-black uppercase text-[10px] tracking-widest transition-all ${
                  isBuilding ? 'bg-slate-900 text-slate-600' : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
                }`}
              >
                {isBuilding ? "Chantier occupé" : !canAfford ? "Fonds insuffisants" : "Améliorer"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}