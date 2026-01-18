import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
import ListingCard from "./ListingCard";
import NpcTradeCard from "./NpcTradeCard";
import { Search, Filter } from "lucide-react";

interface BuyViewProps {
  planet: any;
  userId: string;
  stats: any;
  onUpdate: () => void;
  onStatsUpdate: () => void;
}

export default function BuyView({ planet, userId, stats, onUpdate, onStatsUpdate }: BuyViewProps) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterResource, setFilterResource] = useState<string>("");

  useEffect(() => {
    loadListings();
    const interval = setInterval(loadListings, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [filterResource]);

  const loadListings = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterResource) params.append('resource_type', filterResource);

      const res = await fetch(apiUrl(`/market/listings?${params.toString()}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setListings(data.listings || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (listingId: string, quantity: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/market/buy'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          listing_id: listingId,
          buyer_planet_id: planet.id,
          buyer_user_id: userId,
          quantity
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Achat réussi! Taxe: ${data.tax_paid.toFixed(0)}`);
        onUpdate();
        onStatsUpdate();
        loadListings();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'achat");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-slate-900 border border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm text-gray-400">Filtrer par ressource:</span>
              <div className="flex gap-2">
                {["", "metal", "crystal", "deuterium"].map(resource => (
                  <Button
                    key={resource}
                    onClick={() => setFilterResource(resource)}
                    variant="ghost"
                    size="sm"
                    className={`${
                      filterResource === resource
                        ? "bg-indigo-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {resource || "Tout"}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NPC Trading Section */}
      {stats && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Échange avec PNJ</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.npc_prices?.map((price: any) => (
              <NpcTradeCard
                key={price.resource_type}
                resource={price.resource_type}
                npcPrices={price}
                planet={planet}
                userId={userId}
                onUpdate={onUpdate}
                onStatsUpdate={onStatsUpdate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Player Listings */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">
          Offres des joueurs ({listings.length})
        </h3>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : listings.length === 0 ? (
          <Card className="bg-slate-900 border border-white/10">
            <CardContent className="p-8 text-center">
              <p className="text-gray-400">Aucune offre disponible pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onBuy={handleBuy}
                canBuy={listing.seller_user_id !== userId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
