import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { User, ArrowRight, Stone, Gem, Droplets, ShoppingBag } from "lucide-react";

interface ListingCardProps {
  listing: any;
  onBuy: (listingId: string, quantity: number) => void;
  canBuy: boolean;
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

export default function ListingCard({ listing, onBuy, canBuy }: ListingCardProps) {
  const [quantity, setQuantity] = useState(listing.quantity);
  const totalCost = quantity * listing.price_per_unit;

  const SourceIcon = resourceIcons[listing.resource_type] || Stone;
  const TargetIcon = resourceIcons[listing.target_resource] || Stone;
  const sourceColor = resourceColors[listing.resource_type] || "text-slate-400";
  const targetColor = resourceColors[listing.target_resource] || "text-slate-400";

  return (
    <div className="relative overflow-hidden border-t-4 border-indigo-500/50 bg-gradient-to-b from-slate-950 to-indigo-950/20 shadow-2xl group rounded-lg hover:border-indigo-400/70 transition-colors">
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 to-transparent z-0"></div>
      <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
        <ShoppingBag size={120} className="text-indigo-400" />
      </div>

      <div className="p-5 relative z-10">
        <div className="space-y-4">
          {/* Seller Info */}
          <div className="flex items-center gap-2 p-2 bg-black/30 rounded border border-white/5">
            <User size={14} className="text-slate-500" />
            <span className="text-[10px] uppercase font-bold text-slate-500">Vendeur:</span>
            <span className="text-sm text-white font-bold font-mono">{listing.seller_username}</span>
          </div>

          {/* Trade Details */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 p-3 bg-black/30 rounded border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <SourceIcon size={16} className={sourceColor} />
                <p className="text-[10px] uppercase font-bold text-slate-500">Disponible</p>
              </div>
              <p className={`text-lg font-black font-mono ${sourceColor} capitalize`}>
                {listing.quantity.toLocaleString()} {listing.resource_type}
              </p>
            </div>

            <ArrowRight size={24} className="text-slate-600 flex-shrink-0" />

            <div className="flex-1 p-3 bg-black/30 rounded border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <TargetIcon size={16} className={targetColor} />
                <p className="text-[10px] uppercase font-bold text-slate-500">Coût</p>
              </div>
              <p className={`text-lg font-black font-mono ${targetColor} capitalize`}>
                {totalCost.toLocaleString()} {listing.target_resource}
              </p>
            </div>
          </div>

          {/* Price per unit */}
          <div className="p-2 bg-black/30 rounded border border-white/5">
            <div className="flex justify-between text-sm">
              <span className="text-[10px] uppercase font-bold text-slate-500">Prix unitaire:</span>
              <span className="text-white font-mono font-bold">
                {listing.price_per_unit.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Quantity Input */}
          {canBuy && (
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500">Quantité à acheter:</label>
              <Input
                type="number"
                min={1}
                max={listing.quantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.min(listing.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                className="bg-black/30 border-white/10 text-white font-mono hover:border-white/20 transition-colors"
              />

              <Button
                onClick={() => onBuy(listing.id, quantity)}
                className="w-full font-black uppercase tracking-widest bg-gradient-to-r from-green-950/60 to-emerald-950/60 hover:from-green-900/80 hover:to-emerald-900/80 border border-green-500/50 hover:border-green-400/80 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] transition-all duration-300"
              >
                <ShoppingBag size={16} className="mr-2" />
                Acheter
              </Button>
            </div>
          )}

          {!canBuy && (
            <div className="p-3 bg-yellow-950/20 rounded border border-yellow-500/30 text-center">
              <p className="text-xs font-bold uppercase text-yellow-500">
                Vos propres offres
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
