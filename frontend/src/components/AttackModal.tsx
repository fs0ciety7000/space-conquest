import { useState } from "react";
import { Crosshair, Shield, Rocket, AlertTriangle, X, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from 'framer-motion';

interface AttackModalProps {
  targetName: string;
  myFleet: {
    hunters: number;
    cruisers: number;
    transporters: number;
  };
  onConfirm: (hunters: number, cruisers: number, transporters: number) => void;
  onCancel: () => void;
}

export default function AttackModal({ targetName, myFleet, onConfirm, onCancel }: AttackModalProps) {
  const [hunters, setHunters] = useState(0);
  const [cruisers, setCruisers] = useState(0);
  const [transporters, setTransporters] = useState(0);

  // Calcul de la puissance estimée (juste pour l'UI)
  const power = (hunters * 10) + (cruisers * 50);
  const cargo = (hunters * 50) + (cruisers * 800) + (transporters * 10000);

  const handleSubmit = () => {
    if (hunters === 0 && cruisers === 0) return;
    onConfirm(hunters, cruisers, transporters);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg bg-[rgba(16,8,46,0.95)] backdrop-blur-[20px] border-2 border-red-900/60 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.3)] card-depth glass-card"
      >

        {/* Header */}
        <div className="bg-red-950/50 p-6 border-b border-red-900/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg animate-pulse">
                <Crosshair className="text-slate-200" size={24} />
            </div>
            <div>
                <h2 className="text-xl font-black uppercase text-slate-200 tracking-widest">Lancement Attaque</h2>
                <p className="text-xs text-red-400 font-mono">Cible : {targetName}</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-red-400 hover:text-slate-200 transition-all duration-300 hover:scale-110 card-depth hover:shadow-lg hover:-translate-y-0.5">
            <X size={24} />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-6">

            {/* Sélection Chasseurs */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs uppercase font-bold text-slate-400">
                    <span>Chasseurs Légers</span>
                    <span className="text-slate-200">Dispo: {myFleet.hunters}</span>
                </div>
                <div className="flex gap-4 items-center">
                    <Rocket size={20} className="text-slate-500 animate-bounce-subtle" />
                    <Input
                        type="range"
                        min="0"
                        max={myFleet.hunters}
                        value={hunters}
                        onChange={(e) => setHunters(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-[rgba(5,0,15,0.8)] accent-red-500 cursor-pointer"
                    />
                    <Input
                        type="number"
                        min="0"
                        max={myFleet.hunters}
                        value={hunters}
                        onChange={(e) => setHunters(Math.min(myFleet.hunters, parseInt(e.target.value) || 0))}
                        onFocus={(e) => e.target.select()}
                        className="w-20 bg-[rgba(5,0,15,0.8)] border border-cyan-500/15 text-slate-200 text-right font-mono focus:border-cyan-500/50 focus:shadow-[0_0_0_2px_rgba(0,245,255,0.1)]"
                    />
                </div>
            </div>

            {/* Sélection Croiseurs */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs uppercase font-bold text-slate-400">
                    <span>Croiseurs</span>
                    <span className="text-slate-200">Dispo: {myFleet.cruisers}</span>
                </div>
                <div className="flex gap-4 items-center">
                    <Shield size={20} className="text-slate-500 animate-bounce-subtle" />
                    <Input
                        type="range"
                        min="0"
                        max={myFleet.cruisers}
                        value={cruisers}
                        onChange={(e) => setCruisers(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-[rgba(5,0,15,0.8)] accent-red-500 cursor-pointer"
                    />
                    <Input
                        type="number"
                        min="0"
                        max={myFleet.cruisers}
                        value={cruisers}
                        onChange={(e) => setCruisers(Math.min(myFleet.cruisers, parseInt(e.target.value) || 0))}
                        onFocus={(e) => e.target.select()}
                        className="w-20 bg-[rgba(5,0,15,0.8)] border border-cyan-500/15 text-slate-200 text-right font-mono focus:border-cyan-500/50 focus:shadow-[0_0_0_2px_rgba(0,245,255,0.1)]"
                    />
                </div>
            </div>

            {/* Sélection Transporteurs */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs uppercase font-bold text-slate-400">
                    <span>Transporteurs (Cargo)</span>
                    <span className="text-slate-200">Dispo: {myFleet.transporters}</span>
                </div>
                <div className="flex gap-4 items-center">
                    <Truck size={20} className="text-amber-400 animate-bounce-subtle" />
                    <Input
                        type="range"
                        min="0"
                        max={myFleet.transporters}
                        value={transporters}
                        onChange={(e) => setTransporters(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-[rgba(5,0,15,0.8)] accent-yellow-500 cursor-pointer"
                    />
                    <Input
                        type="number"
                        min="0"
                        max={myFleet.transporters}
                        value={transporters}
                        onChange={(e) => setTransporters(Math.min(myFleet.transporters, parseInt(e.target.value) || 0))}
                        onFocus={(e) => e.target.select()}
                        className="w-20 bg-[rgba(5,0,15,0.8)] border border-cyan-500/15 text-slate-200 text-right font-mono focus:border-cyan-500/50 focus:shadow-[0_0_0_2px_rgba(0,245,255,0.1)]"
                    />
                </div>
            </div>

            {/* Résumé */}
            <div className="bg-red-900/10 border border-red-900/30 p-4 rounded-xl glass-card hover:-translate-y-0.5 transition-all duration-300 card-depth">
                <div className="flex items-center gap-2 text-red-500 text-xs font-bold uppercase mb-3">
                    <AlertTriangle size={14} className="animate-bounce-subtle" /> Zone de Guerre
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <p className="text-[10px] text-slate-500 uppercase">Puissance de feu</p>
                        <p className="text-xl font-black text-slate-200">{power.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-amber-400 uppercase">Capacité Cargo</p>
                        <p className="text-xl font-black text-amber-400">{cargo.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4">
                <Button
                    onClick={onCancel}
                    className="bg-transparent border border-cyan-500/10 hover:border-cyan-500/25 hover:bg-cyan-500/5 text-slate-400 hover:text-slate-300 font-bold uppercase card-depth hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                >
                    Annuler
                </Button>
                <Button
                    variant="destructive"
                    onClick={handleSubmit}
                    disabled={power === 0}
                    className="font-black uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.5)] disabled:opacity-50 disabled:cursor-not-allowed card-depth hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 hover:scale-105"
                >
                    FEU A VOLONTE
                </Button>
            </div>
        </div>
      </motion.div>
    </div>
  );
}
