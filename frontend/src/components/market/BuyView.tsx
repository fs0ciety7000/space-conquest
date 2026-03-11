import { ShoppingCart, Coins, Users, Bot } from "lucide-react";
import { useState, useEffect } from "react";
import { apiUrl } from '@/config/api';
import { toast } from "sonner";
import { motion } from "framer-motion";
import NpcTradeCard from "./NpcTradeCard";
import ListingCard from "./ListingCard";

interface BuyViewProps {
  planet: any;
  userId: string;
  stats: any;
  onUpdate: () => void;
  onStatsUpdate: () => void;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

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
        toast.success("Achat réussi !");
        onUpdate();
        onStatsUpdate();
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
      <div className="relative overflow-hidden rounded-xl bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 backdrop-blur-[12px] group">
        <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
          <Bot size={150} className="text-purple-400" />
        </div>

        <div className="p-6 relative z-10">
          <div className="flex items-center gap-2 mb-6 pb-2 border-b border-cyan-500/10">
            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-purple-400 to-transparent flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-purple-400/70">Commerce PNJ</span>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-950/10 text-purple-400">
              <Bot size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-wider text-slate-200">Commerce PNJ</h3>
              <p className="text-xs text-slate-500">Échangez avec des prix garantis</p>
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
      <div className="relative overflow-hidden rounded-xl bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 backdrop-blur-[12px] group">
        <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
          <Users size={150} className="text-cyan-400" />
        </div>

        <div className="p-6 relative z-10">
          <div className="flex items-center gap-2 mb-6 pb-2 border-b border-cyan-500/10">
            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Marché P2P</span>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-lg border border-cyan-500/20 bg-cyan-950/10 text-cyan-400">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-wider text-slate-200">Marché P2P</h3>
              <p className="text-xs text-slate-500">
                {listings.length} offre{listings.length > 1 ? 's' : ''} disponible{listings.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 border border-cyan-500/10 rounded-lg bg-[rgba(10,5,32,0.5)]">
              <div className="animate-spin mx-auto mb-4 h-12 w-12 border-4 border-cyan-500 border-t-transparent rounded-full" />
              <p className="text-slate-500 text-sm font-bold uppercase">Chargement...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12 border border-cyan-500/10 rounded-lg bg-[rgba(10,5,32,0.5)]">
              <Coins size={48} className="mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400 mb-2 font-bold uppercase text-sm">Aucune offre disponible</p>
              <p className="text-xs text-slate-600">
                Soyez le premier à créer une offre !
              </p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {listings.map(listing => (
                <motion.div key={listing.id} variants={item}>
                  <ListingCard
                    listing={listing}
                    onBuy={handleBuyListing}
                    canBuy={listing.seller_user_id !== userId}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Show More */}
          {listings.length < listingTotal && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => {
                  const next = listingPage + 1;
                  setListingPage(next);
                  loadListings(next);
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 px-4 py-1.5 rounded-lg hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all"
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
