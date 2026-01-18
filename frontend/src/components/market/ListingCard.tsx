import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { User, ArrowRight } from "lucide-react";

interface ListingCardProps {
  listing: any;
  onBuy: (listingId: string, quantity: number) => void;
  canBuy: boolean;
}

export default function ListingCard({ listing, onBuy, canBuy }: ListingCardProps) {
  const [quantity, setQuantity] = useState(listing.quantity);

  const totalCost = quantity * listing.price_per_unit;

  return (
    <Card className="bg-slate-900 border border-white/10 hover:border-indigo-500/50 transition-colors">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Seller Info */}
          <div className="flex items-center gap-2 text-sm">
            <User size={14} className="text-gray-400" />
            <span className="text-gray-400">Vendeur:</span>
            <span className="text-white font-semibold">{listing.seller_username}</span>
          </div>

          {/* Trade Details */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Disponible</p>
              <p className="text-lg font-semibold text-white capitalize">
                {listing.quantity.toLocaleString()} {listing.resource_type}
              </p>
            </div>

            <ArrowRight size={20} className="text-gray-500" />

            <div className="text-right">
              <p className="text-xs text-gray-400">Coût</p>
              <p className="text-lg font-semibold text-green-400 capitalize">
                {totalCost.toLocaleString()} {listing.target_resource}
              </p>
            </div>
          </div>

          {/* Price per unit */}
          <div className="pt-3 border-t border-white/10">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Prix unitaire:</span>
              <span className="text-white font-mono">
                {listing.price_per_unit.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Quantity Input */}
          {canBuy && (
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Quantité à acheter:</label>
              <Input
                type="number"
                min={1}
                max={listing.quantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.min(listing.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                className="bg-slate-800 border-white/10 text-white"
              />

              <Button
                onClick={() => onBuy(listing.id, quantity)}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Acheter
              </Button>
            </div>
          )}

          {!canBuy && (
            <p className="text-sm text-yellow-500 text-center">
              Vous ne pouvez pas acheter vos propres offres
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
