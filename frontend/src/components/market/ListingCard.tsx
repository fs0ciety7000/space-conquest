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
    <div className="relative overflow-hidden rounded-lg bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 hover:border-cyan-500/25 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(0,245,255,0.08)] transition-all duration-200 group">
      <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
        <ShoppingBag size={100} className="text-cyan-400" />
      </div>

      <div className="p-5 relative z-10">
        <div className="space-y-4">
          {/* Seller Info */}
          <div className="flex items-center gap-2 p-2 bg-[rgba(10,5,32,0.6)] rounded border border-cyan-500/10">
            <User size={14} className="text-slate-500" />
            <span className="text-[10px] uppercase font-bold text-slate-500">Vendeur:</span>
            <span className="text-sm text-slate-200 font-bold font-mono">{listing.seller_username}</span>
          </div>

          {/* Trade Details */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 p-3 bg-[rgba(10,5,32,0.6)] rounded border border-cyan-500/10">
              <div className="flex items-center gap-2 mb-2">
                <SourceIcon size={16} className={sourceColor} />
                <p className="text-[10px] uppercase font-bold text-slate-500">Disponible</p>
              </div>
              <p className={`text-lg font-black font-mono tabular-nums ${sourceColor} capitalize`}>
                {listing.quantity.toLocaleString()} {listing.resource_type}
              </p>
            </div>

            <ArrowRight size={24} className="text-slate-600 flex-shrink-0" />

            <div className="flex-1 p-3 bg-[rgba(10,5,32,0.6)] rounded border border-cyan-500/10">
              <div className="flex items-center gap-2 mb-2">
                <TargetIcon size={16} className={targetColor} />
                <p className="text-[10px] uppercase font-bold text-slate-500">Coût</p>
              </div>
              <p className={`text-lg font-black font-mono tabular-nums ${targetColor} capitalize`}>
                {totalCost.toLocaleString()} {listing.target_resource}
              </p>
            </div>
          </div>

          {/* Price per unit */}
          <div className="p-2 bg-[rgba(10,5,32,0.6)] rounded border border-cyan-500/10">
            <div className="flex justify-between text-sm">
              <span className="text-[10px] uppercase font-bold text-slate-500">Prix unitaire:</span>
              <span className="text-cyan-400 font-mono tabular-nums font-bold">
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
                className="bg-[rgba(10,5,32,0.6)] border-cyan-500/10 text-slate-200 font-mono hover:border-cyan-500/20 transition-colors"
              />

              <Button
                onClick={() => onBuy(listing.id, quantity)}
                className="w-full font-black uppercase tracking-widest bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 hover:border-emerald-400/50 text-emerald-300 hover:text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.1)] hover:shadow-[0_0_20px_rgba(52,211,153,0.2)] transition-all duration-300"
              >
                <ShoppingBag size={16} className="mr-2" />
                Acheter
              </Button>
            </div>
          )}

          {!canBuy && (
            <div className="p-3 bg-[rgba(10,5,32,0.6)] rounded border border-cyan-500/10 text-center">
              <p className="text-xs font-bold uppercase text-cyan-500/60">
                Vos propres offres
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
