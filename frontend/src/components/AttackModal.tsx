import { useState } from "react";
import { Crosshair, Shield, Rocket, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AttackModalProps {
  targetName: string;
  myFleet: {
    hunters: number;
    cruisers: number;
  };
  onConfirm: (hunters: number, cruisers: number) => void;
  onCancel: () => void;
}

export default function AttackModal({ targetName, myFleet, onConfirm, onCancel }: AttackModalProps) {
  const [hunters, setHunters] = useState(0);
  const [cruisers, setCruisers] = useState(0);

  // Calcul de la puissance estimée (juste pour l'UI)
  const power = (hunters * 10) + (cruisers * 50);

  const handleSubmit = () => {
    if (hunters === 0 && cruisers === 0) return;
    onConfirm(hunters, cruisers);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-950 border-2 border-red-900 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.3)]">
        
        {/* Header */}
        <div className="bg-red-950/50 p-6 border-b border-red-900/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg animate-pulse">
                <Crosshair className="text-white" size={24} />
            </div>
            <div>
                <h2 className="text-xl font-black uppercase text-white tracking-widest">Lancement Attaque</h2>
                <p className="text-xs text-red-400 font-mono">Cible : {targetName}</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-red-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-6">
            
            {/* Sélection Chasseurs */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs uppercase font-bold text-slate-400">
                    <span>Chasseurs Légers</span>
                    <span className="text-white">Dispo: {myFleet.hunters}</span>
                </div>
                <div className="flex gap-4 items-center">
                    <Rocket size={20} className="text-slate-500" />
                    <Input 
                        type="range" 
                        min="0" 
                        max={myFleet.hunters} 
                        value={hunters} 
                        onChange={(e) => setHunters(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-slate-800 accent-red-500 cursor-pointer" 
                    />
                    <Input 
                        type="number" 
                        min="0" 
                        max={myFleet.hunters} 
                        value={hunters} 
                        onChange={(e) => setHunters(Math.min(myFleet.hunters, parseInt(e.target.value) || 0))}
                        className="w-20 bg-black border-red-900/50 text-white text-right font-mono"
                    />
                </div>
            </div>

            {/* Sélection Croiseurs */}
            <div className="space-y-2 opacity-50 pointer-events-none grayscale"> {/* Grisé pour l'instant si pas implémenté */}
                <div className="flex justify-between text-xs uppercase font-bold text-slate-400">
                    <span>Croiseurs (Bientôt)</span>
                    <span className="text-white">Dispo: {myFleet.cruisers}</span>
                </div>
                <div className="flex gap-4 items-center">
                    <Shield size={20} className="text-slate-500" />
                    <Input disabled type="range" value={0} className="flex-1 h-2 bg-slate-800" />
                    <Input disabled type="number" value={0} className="w-20 bg-black border-slate-800 text-slate-500 text-right font-mono"/>
                </div>
            </div>

            {/* Résumé */}
            <div className="bg-red-900/10 border border-red-900/30 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-500 text-xs font-bold uppercase">
                    <AlertTriangle size={14} /> Zone de Guerre
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase">Puissance de feu</p>
                    <p className="text-xl font-black text-white">{power}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4">
                <Button onClick={onCancel} className="bg-transparent border border-white/10 hover:bg-white/5 text-slate-400 font-bold uppercase">
                    Annuler
                </Button>
                <Button 
                    onClick={handleSubmit} 
                    disabled={power === 0}
                    className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    FEU À VOLONTÉ
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}