import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
import { X, TrendingUp, Stone, Gem, Droplets, ArrowRight, AlertCircle, Clock, Percent, CheckCircle } from "lucide-react";

interface CreateListingModalProps {
  planet: any;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const resourceIcons: Record<string, any> = {
  metal: Stone,
  crystal: Gem,
  deuterium: Droplets,
};

const resourceColors: Record<string, string> = {
  metal: "text-slate-400",
  crystal: "text-cyan-400",
  deuterium: "text-emerald-400",
};

const resourceBorders: Record<string, string> = {
  metal: "border-slate-500/20",
  crystal: "border-cyan-500/20",
  deuterium: "border-emerald-500/20",
};

export default function CreateListingModal({ planet, userId, onClose, onSuccess }: CreateListingModalProps) {
  const [resourceType, setResourceType] = useState("metal");
  const [quantity, setQuantity] = useState(1000);
  const [pricePerUnit, setPricePerUnit] = useState(0.65);
  const [targetResource, setTargetResource] = useState("crystal");

  const availableAmount = (() => {
    switch (resourceType) {
      case "metal": return planet.metal_amount || 0;
      case "crystal": return planet.crystal_amount || 0;
      case "deuterium": return planet.deuterium_amount || 0;
      default: return 0;
    }
  })();

  const totalReceived = quantity * pricePerUnit;
  const taxAmount = totalReceived * 0.02;
  const netReceived = totalReceived - taxAmount;

  const SourceIcon = resourceIcons[resourceType];
  const TargetIcon = resourceIcons[targetResource];
  const sourceColor = resourceColors[resourceType];
  const targetColor = resourceColors[targetResource];
  const sourceBorder = resourceBorders[resourceType];

  const handleCreate = async () => {
    if (quantity <= 0) {
      toast.error("Quantité invalide");
      return;
    }
    if (quantity > availableAmount) {
      toast.error("Ressources insuffisantes");
      return;
    }
    if (resourceType === targetResource) {
      toast.error("Ressources identiques");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/market/listings'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planet_id: planet.id,
          user_id: userId,
          resource_type: resourceType,
          quantity,
          price_per_unit: pricePerUnit,
          target_resource: targetResource
        })
      });

      if (res.ok) {
        toast.success("Offre créée avec succès!");
        onSuccess();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de la création");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="relative overflow-hidden rounded-xl bg-[rgba(16,8,46,0.95)] border border-cyan-500/10 backdrop-blur-[12px] shadow-2xl w-full max-w-lg">
        <div className="absolute -right-6 -top-6 opacity-[0.03] pointer-events-none">
          <TrendingUp size={180} className="text-cyan-400" />
        </div>

        <div className="p-6 relative z-10">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg border border-cyan-500/20 bg-cyan-950/10 text-cyan-400">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-wider text-slate-200">Créer une offre</h3>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Marché galactique</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-cyan-500/10 bg-[rgba(10,5,32,0.6)] text-slate-400 hover:text-slate-200 hover:border-red-500/30 hover:bg-red-950/10 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Resource to Sell */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <SourceIcon size={12} className={sourceColor} />
                  Ressource à vendre
                </label>
                <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                  <span className="text-slate-600">Disponible:</span>
                  <span className={`font-bold ${sourceColor}`}>{availableAmount.toLocaleString()}</span>
                </div>
              </div>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full p-3 bg-[rgba(10,5,32,0.6)] border border-cyan-500/10 rounded text-slate-200 font-mono hover:border-cyan-500/20 transition-colors capitalize"
              >
                <option value="metal">Metal</option>
                <option value="crystal">Crystal</option>
                <option value="deuterium">Deuterium</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Quantité</label>
                <button
                  type="button"
                  onClick={() => setQuantity(availableAmount)}
                  className={`text-[9px] font-black tracking-widest uppercase hover:text-slate-200 transition-colors ${availableAmount > 0 ? sourceColor : 'text-slate-600'}`}
                >
                  MAX: {availableAmount.toLocaleString()}
                </button>
              </div>
              <Input
                type="number"
                min={1}
                max={availableAmount}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(availableAmount, parseInt(e.target.value) || 1)))}
                className="bg-[rgba(10,5,32,0.6)] border-cyan-500/10 text-slate-200 font-mono hover:border-cyan-500/20 transition-colors"
              />
            </div>

            {/* Target Resource */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 flex items-center gap-1">
                <TargetIcon size={12} className={targetColor} />
                Ressource voulue
              </label>
              <select
                value={targetResource}
                onChange={(e) => setTargetResource(e.target.value)}
                className="w-full p-3 bg-[rgba(10,5,32,0.6)] border border-cyan-500/10 rounded text-slate-200 font-mono hover:border-cyan-500/20 transition-colors capitalize"
              >
                <option value="metal">Metal</option>
                <option value="crystal">Crystal</option>
                <option value="deuterium">Deuterium</option>
              </select>
            </div>

            {/* Price Per Unit */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-[10px] uppercase font-bold text-slate-500">Prix par unité</label>
                <AlertCircle size={12} className="text-amber-600" />
                <span className="text-[9px] text-amber-600 font-mono">Suggestion: 0.65 (metal→crystal)</span>
              </div>
              <Input
                type="number"
                step={0.01}
                min={0.01}
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                className="bg-[rgba(10,5,32,0.6)] border-cyan-500/10 text-slate-200 font-mono hover:border-cyan-500/20 transition-colors"
              />
            </div>

            {/* Visual Trade Preview */}
            <div className={`flex items-center gap-3 p-4 bg-[rgba(10,5,32,0.6)] rounded border-t-2 ${sourceBorder}`}>
              <div className="flex items-center gap-2">
                <SourceIcon size={20} className={sourceColor} />
                <span className={`font-black font-mono tabular-nums text-lg ${sourceColor}`}>{quantity.toLocaleString()}</span>
              </div>
              <ArrowRight size={24} className="text-slate-600 animate-pulse" />
              <div className="flex items-center gap-2">
                <TargetIcon size={20} className={targetColor} />
                <span className={`font-black font-mono tabular-nums text-lg ${targetColor}`}>{netReceived.toFixed(0)}</span>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-[rgba(10,5,32,0.8)] rounded-lg border border-cyan-500/10">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
                <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
                <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70 flex items-center gap-1">
                  <CheckCircle size={11} /> Résumé Transaction
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-mono tabular-nums p-2 bg-[rgba(10,5,32,0.5)] rounded border border-cyan-500/10">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Vous vendez:</span>
                  <span className={`font-black ${sourceColor} capitalize flex items-center gap-1`}>
                    <SourceIcon size={14} />
                    {quantity.toLocaleString()} {resourceType}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm font-mono tabular-nums p-2 bg-[rgba(10,5,32,0.5)] rounded border border-cyan-500/10">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Total brut:</span>
                  <span className={`font-black ${targetColor} capitalize flex items-center gap-1`}>
                    <TargetIcon size={14} />
                    {totalReceived.toFixed(0)} {targetResource}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm font-mono tabular-nums p-2 bg-red-950/10 rounded border border-red-500/15">
                  <span className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1">
                    <Percent size={10} className="text-red-400" />
                    Taxe (2%):
                  </span>
                  <span className="text-red-400 font-black capitalize">
                    -{taxAmount.toFixed(0)} {targetResource}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t-2 border-emerald-500/20 text-sm font-mono tabular-nums p-2 bg-emerald-950/10 rounded">
                  <span className="text-slate-200 font-black text-xs uppercase">Vous recevrez:</span>
                  <span className={`font-black text-lg ${targetColor} capitalize flex items-center gap-1`}>
                    <TargetIcon size={16} />
                    {netReceived.toFixed(0)} {targetResource}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2 text-[9px] text-slate-600 font-mono">
                  <Clock size={10} />
                  <span>Expire dans: <span className="text-amber-600 font-bold">7 jours</span></span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={onClose}
                className="flex-1 font-bold uppercase tracking-wider bg-[rgba(10,5,32,0.6)] border border-cyan-500/10 hover:bg-[rgba(10,5,32,0.9)] hover:border-cyan-500/20 text-slate-400 hover:text-slate-200 transition-all"
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreate}
                disabled={quantity > availableAmount || resourceType === targetResource}
                className="flex-1 font-black uppercase tracking-widest bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 hover:border-cyan-400/50 text-cyan-300 hover:text-cyan-200 shadow-[0_0_15px_rgba(0,245,255,0.1)] hover:shadow-[0_0_25px_rgba(0,245,255,0.2)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TrendingUp size={16} className="mr-2" />
                Créer l'offre
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
