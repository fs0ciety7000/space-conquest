import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
import { X, TrendingUp } from "lucide-react";

interface CreateListingModalProps {
  planet: any;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-slate-900 border border-indigo-500/50 w-full max-w-lg">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-900/20 text-indigo-400">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Créer une offre</h3>
                <p className="text-sm text-gray-400">Vendez vos ressources</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Resource to Sell */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Ressource à vendre (Disponible: {availableAmount.toLocaleString()})
              </label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded text-white"
              >
                <option value="metal">Metal</option>
                <option value="crystal">Crystal</option>
                <option value="deuterium">Deuterium</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Quantité</label>
              <Input
                type="number"
                min={1}
                max={availableAmount}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="bg-slate-800 border-white/10 text-white"
              />
            </div>

            {/* Target Resource */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Ressource voulue</label>
              <select
                value={targetResource}
                onChange={(e) => setTargetResource(e.target.value)}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded text-white"
              >
                <option value="metal">Metal</option>
                <option value="crystal">Crystal</option>
                <option value="deuterium">Deuterium</option>
              </select>
            </div>

            {/* Price Per Unit */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Prix par unité (suggestion: 0.65 pour metal→crystal)
              </label>
              <Input
                type="number"
                step={0.01}
                min={0.01}
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                className="bg-slate-800 border-white/10 text-white"
              />
            </div>

            {/* Summary */}
            <Card className="bg-slate-800 border border-white/10">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-white mb-3">Résumé</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Vous vendez:</span>
                    <span className="text-white capitalize">
                      {quantity.toLocaleString()} {resourceType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total brut:</span>
                    <span className="text-green-400 capitalize">
                      {totalReceived.toLocaleString()} {targetResource}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Taxe (2%):</span>
                    <span className="text-red-400 capitalize">
                      -{taxAmount.toLocaleString()} {targetResource}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/10">
                    <span className="text-white font-semibold">Vous recevrez:</span>
                    <span className="text-green-400 font-semibold capitalize">
                      {netReceived.toLocaleString()} {targetResource}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-2">
                    <span className="text-gray-500">Expire dans:</span>
                    <span className="text-gray-400">7 jours</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={onClose}
                variant="ghost"
                className="flex-1 border border-white/10 hover:bg-slate-800"
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreate}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Créer l'offre
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
