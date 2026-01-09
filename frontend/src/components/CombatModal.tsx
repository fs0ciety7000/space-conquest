import { X, Swords, Trophy, Skull, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CombatReport {
  victory: boolean;
  ships_lost: number;
  message: string;
}

interface Props {
  report: CombatReport | null;
  onClose: () => void;
}

export default function CombatModal({ report, onClose }: Props) {
  if (!report) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header avec couleur dynamique */}
        <div className={`h-32 flex items-center justify-center ${report.victory ? 'bg-green-600/20' : 'bg-red-600/20'}`}>
          {report.victory ? (
            <Trophy size={64} className="text-green-500 animate-bounce" />
          ) : (
            <Skull size={64} className="text-red-500 animate-pulse" />
          )}
        </div>

        <div className="p-8 space-y-6 text-center">
          <div>
            <h3 className={`text-2xl font-black uppercase italic tracking-tighter ${report.victory ? 'text-green-400' : 'text-red-500'}`}>
              {report.victory ? "Victoire Éclatante" : "Défaite Cuisante"}
            </h3>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              {report.message}
            </p>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Rocket size={20} className="text-slate-500" />
              <span className="text-xs font-bold uppercase text-slate-500">Pertes subies</span>
            </div>
            <span className="text-xl font-mono font-black text-red-500">-{report.ships_lost}</span>
          </div>

          <Button 
            onClick={onClose}
            className={`w-full py-6 font-black uppercase tracking-widest ${report.victory ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}
          >
            Fermer le rapport
          </Button>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}