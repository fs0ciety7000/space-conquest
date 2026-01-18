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
  metal: "border-slate-500/50",
  crystal: "border-cyan-500/50",
  deuterium: "border-emerald-500/50",
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
        toast.success("✅ Offre créée avec succès!");
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
      <div className="relative overflow-hidden border-t-4 border-orange-500/50 bg-gradient-to-b from-slate-950 to-orange-950/20 shadow-2xl rounded-lg w-full max-w-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 to-transparent z-0"></div>
        <div className="absolute -right-6 -top-6 opacity-5 pointer-events-none">
          <TrendingUp size={180} className="text-orange-400" />
        </div>

        <div className="p-6 relative z-10">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg border border-orange-500/30 bg-black/20 text-orange-400">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-wider text-white">Créer une offre</h3>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Marché galactique</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-white/10 bg-black/20 text-slate-400 hover:text-white hover:border-red-500/50 hover:bg-red-950/20 transition-all"
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
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-600">Disponible:</span>
                  <span className={`font-bold ${sourceColor}`}>{availableAmount.toLocaleString()}</span>
                </div>
              </div>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full p-3 bg-black/30 border border-white/10 rounded text-white font-mono hover:border-white/20 transition-colors capitalize"
              >
                <option value="metal">Metal</option>
                <option value="crystal">Crystal</option>
                <option value="deuterium">Deuterium</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Quantité</label>
              <Input
                type="number"
                min={1}
                max={availableAmount}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(availableAmount, parseInt(e.target.value) || 1)))}
                className="bg-black/30 border-white/10 text-white font-mono hover:border-white/20 transition-colors"
              />
            </div>

            {/* Target Resource */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block flex items-center gap-1">
                <TargetIcon size={12} className={targetColor} />
                Ressource voulue
              </label>
              <select
                value={targetResource}
                onChange={(e) => setTargetResource(e.target.value)}
                className="w-full p-3 bg-black/30 border border-white/10 rounded text-white font-mono hover:border-white/20 transition-colors capitalize"
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
                className="bg-black/30 border-white/10 text-white font-mono hover:border-white/20 transition-colors"
              />
            </div>

            {/* Visual Trade Preview */}
            <div className={`flex items-center gap-3 p-4 bg-black/30 rounded border-t-2 ${sourceBorder}`}>
              <div className="flex items-center gap-2">
                <SourceIcon size={20} className={sourceColor} />
                <span className={`font-black font-mono text-lg ${sourceColor}`}>{quantity.toLocaleString()}</span>
              </div>
              <ArrowRight size={24} className="text-slate-600 animate-pulse" />
              <div className="flex items-center gap-2">
                <TargetIcon size={20} className={targetColor} />
                <span className={`font-black font-mono text-lg ${targetColor}`}>{netReceived.toFixed(0)}</span>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-black/40 rounded-lg border border-white/5">
              <h4 className="text-[10px] uppercase font-black text-slate-500 mb-3 tracking-wider flex items-center gap-2">
                <CheckCircle size={12} />
                Résumé Transaction
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-mono p-2 bg-black/20 rounded border border-white/5">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Vous vendez:</span>
                  <span className={`font-black ${sourceColor} capitalize flex items-center gap-1`}>
                    <SourceIcon size={14} />
                    {quantity.toLocaleString()} {resourceType}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-sm font-mono p-2 bg-black/20 rounded border border-white/5">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Total brut:</span>
                  <span className={`font-black ${targetColor} capitalize flex items-center gap-1`}>
                    <TargetIcon size={14} />
                    {totalReceived.toFixed(0)} {targetResource}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-sm font-mono p-2 bg-red-950/20 rounded border border-red-500/20">
                  <span className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1">
                    <Percent size={10} className="text-red-400" />
                    Taxe (2%):
                  </span>
                  <span className="text-red-400 font-black capitalize">
                    -{taxAmount.toFixed(0)} {targetResource}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t-2 border-emerald-500/30 text-sm font-mono p-2 bg-emerald-950/20 rounded">
                  <span className="text-white font-black text-xs uppercase">Vous recevrez:</span>
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
                className="flex-1 font-bold uppercase tracking-wider bg-slate-800 border border-white/10 hover:bg-slate-700 hover:border-white/20 text-white transition-all"
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreate}
                disabled={quantity > availableAmount || resourceType === targetResource}
                className="flex-1 font-black uppercase tracking-widest bg-gradient-to-r from-orange-950/60 to-red-950/60 hover:from-orange-900/80 hover:to-red-900/80 border border-orange-500/50 hover:border-orange-400/80 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(249,115,22,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
