import { ShoppingCart, Coins, Users, Bot } from "lucide-react";
import { useState, useEffect } from "react";
import { apiUrl } from '@/config/api';
import { toast } from "sonner";
import NpcTradeCard from "./NpcTradeCard";
import ListingCard from "./ListingCard";

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
  const [listingPage, setListingPage] = useState(1);
  const [listingTotal, setListingTotal] = useState(0);

  const LISTING_LIMIT = 12;

  // Convert npc_prices array to object indexed by resource
  const npcPricesMap = stats?.npc_prices?.reduce((acc: any, price: any) => {
    acc[price.resource_type] = price;
    acc[price.resource_type].buy_prices = stats?.npc_prices?.reduce((buyAcc: any, p: any) => {
      buyAcc[p.resource_type] = p.npc_sell_price;
      return buyAcc;
    }, {});
    return acc;
  }, {});

  useEffect(() => {
    loadListings(1, true);
  }, []);

  const loadListings = async (page: number, reset = false) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/market/listings?page=${page}&limit=${LISTING_LIMIT}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.listings || [];
        setListings(prev => reset ? items : [...prev, ...items]);
        // Backend returns { listings, total, page, limit } — use total for accurate hasMore
        setListingTotal(data.total ?? items.length);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyListing = async (listingId: string, quantity: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/market/listings/${listingId}/buy`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          buyer_planet_id: planet.id,
          buyer_user_id: userId,
          quantity
        })
      });

      if (res.ok) {
        toast.success("✅ Achat réussi !");
        onUpdate();
        onStatsUpdate();
        // After a purchase, reset to page 1 and refresh
        loadListings(1, true);
        setListingPage(1);
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
      {/* Section PNJ */}
      <div className="relative overflow-hidden border-t-4 border-purple-500/50 bg-gradient-to-b from-slate-950 to-purple-950/20 shadow-2xl rounded-lg group">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 to-transparent z-0"></div>
        <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <Bot size={150} className="text-purple-400" />
        </div>

        <div className="p-6 relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-lg border border-purple-500/30 bg-black/20 text-purple-400">
              <Bot size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-wider text-white">Commerce PNJ</h3>
              <p className="text-xs text-slate-400">Échangez avec des prix garantis</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['metal', 'crystal', 'deuterium'].map(resource => (
              <NpcTradeCard
                key={resource}
                resource={resource}
                npcPrices={npcPricesMap?.[resource]}
                planet={planet}
                userId={userId}
                onUpdate={onUpdate}
                onStatsUpdate={onStatsUpdate}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Section Marché Joueurs */}
      <div className="relative overflow-hidden border-t-4 border-indigo-500/50 bg-gradient-to-b from-slate-950 to-indigo-950/20 shadow-2xl rounded-lg group">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 to-transparent z-0"></div>
        <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <Users size={150} className="text-indigo-400" />
        </div>

        <div className="p-6 relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-lg border border-indigo-500/30 bg-black/20 text-indigo-400">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-wider text-white">Marché P2P</h3>
              <p className="text-xs text-slate-400">
                {listings.length} offre{listings.length > 1 ? 's' : ''} disponible{listings.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 border border-white/5 rounded-lg bg-black/20">
              <div className="animate-spin mx-auto mb-4 h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
              <p className="text-slate-500 text-sm font-bold uppercase">Chargement...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12 border border-white/5 rounded-lg bg-black/20">
              <Coins size={48} className="mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400 mb-2 font-bold uppercase text-sm">Aucune offre disponible</p>
              <p className="text-xs text-slate-600">
                Soyez le premier à créer une offre !
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map(listing => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onBuy={handleBuyListing}
                  canBuy={listing.seller_user_id !== userId}
                />
              ))}
            </div>
          )}
          {/* Show More: driven by real backend total */}
          {listings.length < listingTotal && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => {
                  const next = listingPage + 1;
                  setListingPage(next);
                  loadListings(next);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-4 py-1.5 rounded-lg hover:bg-indigo-500/10 transition-all"
              >
                Afficher plus ({listingTotal - listings.length} autres offres)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
