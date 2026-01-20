import { useState } from "react";
import { Globe, Rocket, Package, X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ColonizeModalProps {
  position: number;
  galaxy: number;
  system: number;
  availableResources: {
    metal: number;
    crystal: number;
    deuterium: number;
  };
  onConfirm: (position: number, metal: number, crystal: number, deuterium: number) => void;
  onCancel: () => void;
}

export default function ColonizeModal({ 
  position, 
  galaxy, 
  system, 
  availableResources, 
  onConfirm, 
  onCancel 
}: ColonizeModalProps) {
  const [metal, setMetal] = useState(0);
  const [crystal, setCrystal] = useState(0);
  const [deuterium, setDeuterium] = useState(0);

  const handleSubmit = () => {
    onConfirm(position, metal, crystal, deuterium);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-950 border-2 border-emerald-500/40 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.3)] card-depth glass-card animate-slide-up">
        
        {/* Header */}
        <div className="bg-emerald-950/50 p-6 border-b border-emerald-500/20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-lg animate-pulse">
              <Globe className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase text-white tracking-widest">Colonisation</h2>
              <p className="text-xs text-emerald-400 font-mono">Position: [{galaxy}:{system}:{position}]</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-emerald-400 hover:text-white transition-all duration-300 hover:scale-110 card-depth hover:shadow-lg hover:-translate-y-0.5">
            <X size={24} />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-6">
          
          {/* Info */}
          <div className="bg-emerald-900/10 border border-emerald-500/30 p-4 rounded-xl glass-card">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-2">
              <Rocket size={14} /> Vaisseau de Colonisation
            </div>
            <p className="text-slate-400 text-xs">
              Envoyez des ressources avec votre vaisseau pour démarrer votre nouvelle colonie avec plus de moyens.
            </p>
          </div>

          {/* Ressources de départ */}
          <div className="bg-slate-900/50 border border-white/10 p-3 rounded-xl">
            <div className="text-xs text-slate-400 uppercase mb-2 flex items-center gap-2">
              <TrendingUp size={12} /> Ressources de départ
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="text-center">
                <div className="text-orange-400 font-bold">500</div>
                <div className="text-slate-500">Métal</div>
              </div>
              <div className="text-center">
                <div className="text-cyan-400 font-bold">500</div>
                <div className="text-slate-500">Cristal</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 font-bold">0</div>
                <div className="text-slate-500">Deutérium</div>
              </div>
            </div>
          </div>

          {/* Sélection Métal */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs uppercase font-bold text-slate-400">
              <span className="flex items-center gap-2">
                <Package size={12} className="text-orange-400" />
                Métal à transporter
              </span>
              <span className="text-white">Dispo: {Math.floor(availableResources.metal).toLocaleString()}</span>
            </div>
            <div className="flex gap-4 items-center">
              <Input 
                type="range" 
                min="0" 
                max={Math.floor(availableResources.metal)} 
                value={metal} 
                onChange={(e) => setMetal(parseInt(e.target.value))}
                className="flex-1 h-2 bg-slate-800 accent-orange-500 cursor-pointer" 
              />
              <Input 
                type="number" 
                min="0" 
                max={Math.floor(availableResources.metal)} 
                value={metal} 
                onChange={(e) => setMetal(Math.min(Math.floor(availableResources.metal), parseInt(e.target.value) || 0))}
                className="w-28 bg-black border-orange-900/50 text-white text-right font-mono"
              />
            </div>
          </div>

          {/* Sélection Cristal */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs uppercase font-bold text-slate-400">
              <span className="flex items-center gap-2">
                <Package size={12} className="text-cyan-400" />
                Cristal à transporter
              </span>
              <span className="text-white">Dispo: {Math.floor(availableResources.crystal).toLocaleString()}</span>
            </div>
            <div className="flex gap-4 items-center">
              <Input 
                type="range" 
                min="0" 
                max={Math.floor(availableResources.crystal)} 
                value={crystal} 
                onChange={(e) => setCrystal(parseInt(e.target.value))}
                className="flex-1 h-2 bg-slate-800 accent-cyan-500 cursor-pointer" 
              />
              <Input 
                type="number" 
                min="0" 
                max={Math.floor(availableResources.crystal)} 
                value={crystal} 
                onChange={(e) => setCrystal(Math.min(Math.floor(availableResources.crystal), parseInt(e.target.value) || 0))}
                className="w-28 bg-black border-cyan-900/50 text-white text-right font-mono"
              />
            </div>
          </div>

          {/* Sélection Deutérium */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs uppercase font-bold text-slate-400">
              <span className="flex items-center gap-2">
                <Package size={12} className="text-green-400" />
                Deutérium à transporter
              </span>
              <span className="text-white">Dispo: {Math.floor(availableResources.deuterium).toLocaleString()}</span>
            </div>
            <div className="flex gap-4 items-center">
              <Input 
                type="range" 
                min="0" 
                max={Math.floor(availableResources.deuterium)} 
                value={deuterium} 
                onChange={(e) => setDeuterium(parseInt(e.target.value))}
                className="flex-1 h-2 bg-slate-800 accent-green-500 cursor-pointer" 
              />
              <Input 
                type="number" 
                min="0" 
                max={Math.floor(availableResources.deuterium)} 
                value={deuterium} 
                onChange={(e) => setDeuterium(Math.min(Math.floor(availableResources.deuterium), parseInt(e.target.value) || 0))}
                className="w-28 bg-black border-green-900/50 text-white text-right font-mono"
              />
            </div>
          </div>

          {/* Résumé */}
          <div className="bg-emerald-900/10 border border-emerald-500/30 p-4 rounded-xl glass-card">
            <div className="text-xs text-emerald-400 uppercase mb-3 font-bold">Ressources totales à l'arrivée</div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="text-center">
                <div className="text-orange-400 font-bold text-lg">{(500 + metal).toLocaleString()}</div>
                <div className="text-slate-500">Métal</div>
              </div>
              <div className="text-center">
                <div className="text-cyan-400 font-bold text-lg">{(500 + crystal).toLocaleString()}</div>
                <div className="text-slate-500">Cristal</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 font-bold text-lg">{deuterium.toLocaleString()}</div>
                <div className="text-slate-500">Deutérium</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={onCancel} 
              className="bg-transparent border border-white/10 hover:bg-white/5 text-slate-400 font-bold uppercase card-depth hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.5)] card-depth hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              Coloniser
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
