import { useState } from "react";
import { Globe, Rocket, Package, X, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateDistance } from '@/utils/galaxyCalculations';
import { formatDuration } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ColonizeModalProps {
  position: number;
  galaxy: number;
  system: number;
  availableResources: {
    metal: number;
    crystal: number;
    deuterium: number;
  };
  currentPlanet?: {
    galaxy: number;
    system: number;
    position: number;
    colony_ship_count?: number;
  };
  onConfirm: (position: number, metal: number, crystal: number, deuterium: number) => void;
  onCancel: () => void;
}

export default function ColonizeModal({
  position,
  galaxy,
  system,
  availableResources,
  currentPlanet,
  onConfirm,
  onCancel
}: ColonizeModalProps) {
  const [metal, setMetal] = useState(0);
  const [crystal, setCrystal] = useState(0);
  const [deuterium, setDeuterium] = useState(0);

  const colonyShips = currentPlanet?.colony_ship_count || 0;
  const hasColonyShip = colonyShips > 0;

  // Réserves minimales obligatoires sur la planète source
  const MIN_METAL = 20_000;
  const MIN_CRYSTAL = 20_000;
  const MIN_DEUT = 15_000;
  const maxMetal = Math.max(0, Math.floor(availableResources.metal) - MIN_METAL);
  const maxCrystal = Math.max(0, Math.floor(availableResources.crystal) - MIN_CRYSTAL);
  const maxDeuterium = Math.max(0, Math.floor(availableResources.deuterium) - MIN_DEUT);

  const hasEnoughReserve =
    availableResources.metal >= MIN_METAL &&
    availableResources.crystal >= MIN_CRYSTAL &&
    availableResources.deuterium >= MIN_DEUT;

  // Calculer distance et temps de vol
  const distance = currentPlanet ? calculateDistance(
    { galaxy: currentPlanet.galaxy, system: currentPlanet.system, position: currentPlanet.position },
    { galaxy, system, position }
  ) : 0;

  const travelTime = Math.round(distance / 100); // Temps en secondes

  const canColonize = hasColonyShip && hasEnoughReserve;

  const handleSubmit = () => {
    if (!canColonize) return;
    onConfirm(position, metal, crystal, deuterium);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg bg-[rgba(16,8,46,0.95)] backdrop-blur-[20px] border-2 border-emerald-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.3)] card-depth glass-card"
      >

        {/* Header */}
        <div className="bg-emerald-950/50 p-6 border-b border-emerald-500/20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-lg animate-pulse">
              <Globe className="text-slate-200" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase text-slate-200 tracking-widest">Colonisation</h2>
              <p className="text-xs text-emerald-400 font-mono">Position: <span className="text-cyan-400">[{galaxy}:{system}:{position}]</span></p>
            </div>
          </div>
          <button onClick={onCancel} className="text-emerald-400 hover:text-slate-200 transition-all duration-300 hover:scale-110 card-depth hover:shadow-lg hover:-translate-y-0.5">
            <X size={24} />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-6">

          {/* Vérification vaisseau colon */}
          {!hasColonyShip && (
            <div className="bg-red-900/20 border border-red-500/40 p-4 rounded-xl glass-card">
              <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase mb-2">
                <AlertTriangle size={14} /> Vaisseau de Colonisation Requis
              </div>
              <p className="text-slate-400 text-xs">
                Vous devez construire au moins un vaisseau de colonisation au chantier spatial avant de pouvoir coloniser une nouvelle planète.
              </p>
            </div>
          )}

          {/* Avertissement ressources insuffisantes pour la base obligatoire */}
          {hasColonyShip && !hasEnoughReserve && (
            <div className="bg-amber-900/20 border border-amber-500/40 p-4 rounded-xl glass-card">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase mb-2">
                <AlertTriangle size={14} /> Ressources insuffisantes
              </div>
              <p className="text-slate-400 text-xs">
                La colonisation envoie automatiquement <span className="text-orange-400 font-bold">20 000 Métal</span>,{' '}
                <span className="text-cyan-400 font-bold">20 000 Cristal</span> et{' '}
                <span className="text-emerald-400 font-bold">15 000 Deutérium</span> à la nouvelle colonie. Votre planète source n'a pas assez de ressources.
              </p>
            </div>
          )}

          {/* Info */}
          <div className="bg-emerald-900/10 border border-emerald-500/20 p-4 rounded-xl glass-card">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-2">
              <Rocket size={14} /> Vaisseau de Colonisation ({colonyShips} disponible{colonyShips > 1 ? 's' : ''})
            </div>
            <p className="text-slate-400 text-xs mb-3">
              Envoyez des ressources avec votre vaisseau pour démarrer votre nouvelle colonie avec plus de moyens.
            </p>
            {currentPlanet && (
              <div className="flex items-center gap-2 text-xs bg-[rgba(5,0,15,0.8)] border border-cyan-500/15 p-2 rounded">
                <Clock size={12} className="text-cyan-400" />
                <span className="text-cyan-400 font-mono tabular-nums">Temps de vol: {formatDuration(travelTime)}</span>
                <span className="text-slate-400 font-mono ml-auto">Distance: {distance.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Ressources de départ */}
          <div className="bg-[rgba(5,0,15,0.8)] border border-cyan-500/10 p-3 rounded-xl">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
              <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
              <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Base obligatoire (toujours envoyée)</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="text-center">
                <div className="text-orange-400 font-bold tabular-nums">20 000</div>
                <div className="text-slate-500">Métal</div>
              </div>
              <div className="text-center">
                <div className="text-cyan-400 font-bold tabular-nums">20 000</div>
                <div className="text-slate-500">Cristal</div>
              </div>
              <div className="text-center">
                <div className="text-emerald-400 font-bold tabular-nums">15 000</div>
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
              <span className="text-slate-200">Max supplément: <span className="text-orange-400">{maxMetal.toLocaleString()}</span> <span className="text-slate-500">(base: 20 000 auto)</span></span>
            </div>
            <div className="flex gap-4 items-center">
              <Input
                type="range"
                min="0"
                max={maxMetal}
                value={metal}
                onChange={(e) => setMetal(parseInt(e.target.value))}
                className="flex-1 h-2 bg-[rgba(5,0,15,0.8)] accent-orange-500 cursor-pointer"
              />
              <Input
                type="number"
                min="0"
                max={maxMetal}
                value={metal}
                onChange={(e) => setMetal(Math.min(maxMetal, parseInt(e.target.value) || 0))}
                onFocus={(e) => e.target.select()}
                className="w-28 bg-[rgba(5,0,15,0.8)] border border-cyan-500/15 text-slate-200 text-right font-mono focus:border-cyan-500/50 focus:shadow-[0_0_0_2px_rgba(0,245,255,0.1)]"
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
              <span className="text-slate-200">Max supplément: <span className="text-cyan-400">{maxCrystal.toLocaleString()}</span> <span className="text-slate-500">(base: 20 000 auto)</span></span>
            </div>
            <div className="flex gap-4 items-center">
              <Input
                type="range"
                min="0"
                max={maxCrystal}
                value={crystal}
                onChange={(e) => setCrystal(parseInt(e.target.value))}
                className="flex-1 h-2 bg-[rgba(5,0,15,0.8)] accent-cyan-500 cursor-pointer"
              />
              <Input
                type="number"
                min="0"
                max={maxCrystal}
                value={crystal}
                onChange={(e) => setCrystal(Math.min(maxCrystal, parseInt(e.target.value) || 0))}
                onFocus={(e) => e.target.select()}
                className="w-28 bg-[rgba(5,0,15,0.8)] border border-cyan-500/15 text-slate-200 text-right font-mono focus:border-cyan-500/50 focus:shadow-[0_0_0_2px_rgba(0,245,255,0.1)]"
              />
            </div>
          </div>

          {/* Sélection Deutérium */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs uppercase font-bold text-slate-400">
              <span className="flex items-center gap-2">
                <Package size={12} className="text-emerald-400" />
                Deutérium à transporter
              </span>
              <span className="text-slate-200">Max supplément: <span className="text-emerald-400">{maxDeuterium.toLocaleString()}</span> <span className="text-slate-500">(base: 15 000 auto)</span></span>
            </div>
            <div className="flex gap-4 items-center">
              <Input
                type="range"
                min="0"
                max={maxDeuterium}
                value={deuterium}
                onChange={(e) => setDeuterium(parseInt(e.target.value))}
                className="flex-1 h-2 bg-[rgba(5,0,15,0.8)] accent-green-500 cursor-pointer"
              />
              <Input
                type="number"
                min="0"
                max={maxDeuterium}
                value={deuterium}
                onChange={(e) => setDeuterium(Math.min(maxDeuterium, parseInt(e.target.value) || 0))}
                onFocus={(e) => e.target.select()}
                className="w-28 bg-[rgba(5,0,15,0.8)] border border-cyan-500/15 text-slate-200 text-right font-mono focus:border-cyan-500/50 focus:shadow-[0_0_0_2px_rgba(0,245,255,0.1)]"
              />
            </div>
          </div>

          {/* Résumé */}
          <div className="bg-emerald-900/10 border border-emerald-500/20 p-4 rounded-xl glass-card">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
              <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
              <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Ressources totales à l'arrivée</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="text-center">
                <div className="text-orange-400 font-bold text-lg tabular-nums">{(MIN_METAL + metal).toLocaleString()}</div>
                <div className="text-slate-500">Métal</div>
              </div>
              <div className="text-center">
                <div className="text-cyan-400 font-bold text-lg tabular-nums">{(MIN_CRYSTAL + crystal).toLocaleString()}</div>
                <div className="text-slate-500">Cristal</div>
              </div>
              <div className="text-center">
                <div className="text-emerald-400 font-bold text-lg tabular-nums">{(MIN_DEUT + deuterium).toLocaleString()}</div>
                <div className="text-slate-500">Deutérium</div>
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
              onClick={handleSubmit}
              disabled={!canColonize}
              className={`${
                canColonize
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:-translate-y-1 hover:shadow-2xl hover:scale-105'
                  : 'bg-[rgba(5,0,15,0.8)] border border-cyan-500/10 cursor-not-allowed opacity-50'
              } text-slate-200 font-black uppercase tracking-widest card-depth transition-all duration-300`}
            >
              {!hasColonyShip ? 'Vaisseau Requis' : !hasEnoughReserve ? 'Ressources insuffisantes' : 'Coloniser'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
