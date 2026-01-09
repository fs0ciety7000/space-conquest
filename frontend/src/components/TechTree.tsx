import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlaskConical, Zap, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TechTree({ planet, onUpdate }: { planet: any, onUpdate: () => void }) {
  const techs = [
    { 
        id: 'research', 
        name: 'Laboratoire', 
        lv: planet.research_lab_level, 
        desc: "Infrastructure de pointe pour accélérer le progrès scientifique.", 
        icon: <FlaskConical className="text-purple-400" /> 
    },
    { 
        id: 'energy_tech', 
        name: 'Techno Énergie', 
        lv: planet.energy_tech_level, 
        desc: "Optimisation des réacteurs ( +50 Énergie Max par niveau ).", 
        icon: <Zap className="text-yellow-400" /> 
    },
    { 
        id: 'laser', 
        name: 'Batterie Laser', 
        lv: planet.laser_battery_level, 
        desc: "Système de défense orbitale réduisant les pertes en combat.", 
        icon: <Target className="text-red-400" /> 
    }
  ];

  const handleResearch = async (type: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8080/planets/${planet.id}/upgrade/${type}`, { method: 'POST' });
      if (res.ok) onUpdate();
    } catch (e) {
      console.error("Échec de la recherche", e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="border-l-4 border-purple-600 pl-4">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Centre de <span className="text-purple-500">Recherche</span></h2>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Innovation et Supériorité Technologique</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {techs.map(t => (
          <Card key={t.id} className="bg-slate-950 border-white/10 group hover:border-purple-500/50 transition-all shadow-xl">
            <CardHeader className="bg-white/5 border-b border-white/5">
              <CardTitle className="flex items-center gap-3 text-xs uppercase tracking-widest font-black text-slate-200">
                {t.icon} {t.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Niveau Actuel</span>
                <span className="text-3xl font-mono font-black text-purple-500">{t.lv}</span>
              </div>
              <p className="text-[11px] text-slate-400 italic leading-relaxed h-10">{t.desc}</p>
              <Button 
                onClick={() => handleResearch(t.id)} 
                className="w-full bg-purple-600/10 border border-purple-500/30 text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all py-6"
              >
                Lancer les Travaux
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}