import { TrendingUp, PlusCircle, Package, Trash2, Clock, Stone, Gem, Droplets, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { apiUrl } from '@/config/api';
import { toast } from "sonner";
import { motion } from "framer-motion";
import CreateListingModal from "./CreateListingModal";
import { Button } from "@/components/ui/button";

interface SellViewProps {
  planet: any;
  userId: string;
  onUpdate: () => void;
  onStatsUpdate: () => void;
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

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export default function SellView({ planet, userId, onUpdate, onStatsUpdate }: SellViewProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyListings();
  }, [userId]);

  const loadMyListings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/market/listings?user_id=${userId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyListings(data.listings || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm("Confirmer la suppression de cette offre ?")) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/market/listings/${listingId}?user_id=${userId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success("Offre supprimée");
        loadMyListings();
        onUpdate();
        onStatsUpdate();
      } else {
        const text = await res.text();
        let message = "Erreur lors de la suppression";
        try { message = JSON.parse(text).error || message; } catch { /* empty body */ }
        toast.error(message);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-xl bg-[rgba(10,5,32,0.85)] border border-cyan-500/10 backdrop-blur-[12px] group">
        <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
          <TrendingUp size={150} className="text-cyan-400" />
        </div>

        <div className="p-6 relative z-10">
          <div className="flex items-center gap-2 mb-6 pb-2 border-b border-cyan-500/10">
            <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-cyan-400 to-transparent flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70">Mes Offres</span>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg border border-cyan-500/20 bg-cyan-950/10 text-cyan-400">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider text-slate-200">Mes Offres</h3>
                <p className="text-xs text-slate-500">
                  {myListings.length} offre{myListings.length > 1 ? 's' : ''} active{myListings.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowCreateModal(true)}
              className="font-black uppercase tracking-widest bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 hover:border-cyan-400/50 text-cyan-300 hover:text-cyan-200 shadow-[0_0_15px_rgba(0,245,255,0.1)] hover:shadow-[0_0_25px_rgba(0,245,255,0.2)] transition-all duration-300"
            >
              <PlusCircle size={16} className="mr-2" />
              Créer une offre
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12 border border-cyan-500/10 rounded-lg bg-[rgba(10,5,32,0.5)]">
              <div className="animate-spin mx-auto mb-4 h-12 w-12 border-4 border-cyan-500 border-t-transparent rounded-full" />
              <p className="text-slate-500 text-sm font-bold uppercase">Chargement...</p>
            </div>
          ) : myListings.length === 0 ? (
            <div className="text-center py-16 border border-cyan-500/10 rounded-lg bg-[rgba(10,5,32,0.5)]">
              <Package size={56} className="mx-auto mb-4 text-slate-600 animate-pulse" />
              <p className="text-slate-400 mb-2 font-bold uppercase text-sm">Aucune offre créée</p>
              <p className="text-xs text-slate-600 mb-6">
                Créez votre première offre pour commencer à vendre
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="font-bold uppercase tracking-wider bg-cyan-950/30 border border-cyan-500/20 hover:bg-cyan-900/50 text-cyan-400 hover:text-cyan-300 transition-all"
              >
                <PlusCircle size={16} className="mr-2" />
                Créer maintenant
              </Button>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {myListings.map(listing => {
                const SourceIcon = resourceIcons[listing.resource_type] || Stone;
                const TargetIcon = resourceIcons[listing.target_resource] || Stone;
                const sourceColor = resourceColors[listing.resource_type] || "text-slate-400";
                const targetColor = resourceColors[listing.target_resource] || "text-slate-400";
                const border = resourceBorders[listing.resource_type] || "border-slate-500/20";

                return (
                  <motion.div
                    key={listing.id}
                    variants={item}
                    className={`relative overflow-hidden rounded-lg bg-[rgba(10,5,32,0.85)] border ${border} hover:border-cyan-500/25 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(0,245,255,0.08)] transition-all duration-200 group`}
                  >
                    <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                      <SourceIcon size={100} className={sourceColor} />
                    </div>

                    <div className="p-4 relative z-10">
                      <div className="space-y-3">
                        {/* Header with Delete */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <SourceIcon size={18} className={sourceColor} />
                            <div>
                              <p className="text-[9px] uppercase font-bold text-slate-500">Vous vendez</p>
                              <p className={`text-base font-black font-mono tabular-nums ${sourceColor} capitalize`}>
                                {listing.quantity.toLocaleString()} {listing.resource_type}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteListing(listing.id)}
                            className="p-1.5 rounded border border-red-500/20 bg-red-950/10 text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Trade Info */}
                        <div className="flex items-center gap-2 p-2 bg-[rgba(10,5,32,0.6)] rounded border border-cyan-500/10">
                          <ArrowRight size={14} className="text-slate-600" />
                          <TargetIcon size={14} className={targetColor} />
                          <span className={`text-xs font-mono tabular-nums font-bold ${targetColor} capitalize`}>
                            {(listing.quantity * listing.price_per_unit).toFixed(0)} {listing.target_resource}
                          </span>
                        </div>

                        {/* Price */}
                        <div className="p-2 bg-[rgba(10,5,32,0.6)] rounded border border-cyan-500/10">
                          <div className="flex justify-between">
                            <span className="text-[9px] uppercase font-bold text-slate-500">Prix unitaire:</span>
                            <span className="text-xs font-mono tabular-nums text-cyan-400 font-bold">
                              {listing.price_per_unit.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Expiry */}
                        <div className="flex items-center justify-center gap-1 text-[9px] text-slate-600 font-mono tabular-nums pt-1 border-t border-cyan-500/10">
                          <Clock size={10} />
                          {new Date(listing.expires_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateListingModal
          planet={planet}
          userId={userId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadMyListings();
            onUpdate();
            onStatsUpdate();
          }}
        />
      )}
    </>
  );
}
