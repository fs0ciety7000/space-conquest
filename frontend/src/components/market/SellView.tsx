import { TrendingUp, PlusCircle, Package, Trash2, Clock, Stone, Gem, Droplets, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { apiUrl } from '@/config/api';
import { toast } from "sonner";
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
  metal: "border-slate-500/50",
  crystal: "border-cyan-500/50",
  deuterium: "border-emerald-500/50",
};

const resourceGradients: Record<string, string> = {
  metal: "from-slate-950 to-slate-900/20",
  crystal: "from-slate-950 to-cyan-950/20",
  deuterium: "from-slate-950 to-emerald-950/20",
};

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
        toast.success("✅ Offre supprimée");
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
      <div className="relative overflow-hidden border-t-4 border-orange-500/50 bg-gradient-to-b from-slate-950 to-orange-950/20 shadow-2xl rounded-lg group">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 to-transparent z-0"></div>
        <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <TrendingUp size={150} className="text-orange-400" />
        </div>

        <div className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg border border-orange-500/30 bg-black/20 text-orange-400">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider text-white">Mes Offres</h3>
                <p className="text-xs text-slate-400">
                  {myListings.length} offre{myListings.length > 1 ? 's' : ''} active{myListings.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowCreateModal(true)}
              className="font-black uppercase tracking-widest bg-gradient-to-r from-orange-950/60 to-red-950/60 hover:from-orange-900/80 hover:to-red-900/80 border border-orange-500/50 hover:border-orange-400/80 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(249,115,22,0.5)] transition-all duration-300"
            >
              <PlusCircle size={16} className="mr-2" />
              Créer une offre
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12 border border-white/5 rounded-lg bg-black/20">
              <div className="animate-spin mx-auto mb-4 h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full"></div>
              <p className="text-slate-500 text-sm font-bold uppercase">Chargement...</p>
            </div>
          ) : myListings.length === 0 ? (
            <div className="text-center py-16 border border-white/5 rounded-lg bg-black/20">
              <Package size={56} className="mx-auto mb-4 text-slate-600 animate-pulse" />
              <p className="text-slate-400 mb-2 font-bold uppercase text-sm">Aucune offre créée</p>
              <p className="text-xs text-slate-600 mb-6">
                Créez votre première offre pour commencer à vendre
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="font-bold uppercase tracking-wider bg-orange-900/40 border border-orange-500/30 hover:bg-orange-800/60 text-orange-400 hover:text-orange-300 transition-all"
              >
                <PlusCircle size={16} className="mr-2" />
                Créer maintenant
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myListings.map(listing => {
                const SourceIcon = resourceIcons[listing.resource_type] || Stone;
                const TargetIcon = resourceIcons[listing.target_resource] || Stone;
                const sourceColor = resourceColors[listing.resource_type] || "text-slate-400";
                const targetColor = resourceColors[listing.target_resource] || "text-slate-400";
                const border = resourceBorders[listing.resource_type] || "border-slate-500/50";
                const gradient = resourceGradients[listing.resource_type] || "from-slate-950 to-slate-900/20";

                return (
                  <div
                    key={listing.id}
                    className={`relative overflow-hidden border-t-4 ${border} bg-gradient-to-b ${gradient} shadow-2xl rounded-lg group`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 to-transparent z-0"></div>
                    <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                      <SourceIcon size={120} className={sourceColor} />
                    </div>

                    <div className="p-4 relative z-10">
                      <div className="space-y-3">
                        {/* Header avec Delete */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <SourceIcon size={18} className={sourceColor} />
                            <div>
                              <p className="text-[9px] uppercase font-bold text-slate-500">Vous vendez</p>
                              <p className={`text-base font-black font-mono ${sourceColor} capitalize`}>
                                {listing.quantity.toLocaleString()} {listing.resource_type}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteListing(listing.id)}
                            className="p-1.5 rounded border border-red-500/30 bg-red-950/20 text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Trade Info */}
                        <div className="flex items-center gap-2 p-2 bg-black/30 rounded border border-white/5">
                          <ArrowRight size={14} className="text-slate-600" />
                          <TargetIcon size={14} className={targetColor} />
                          <span className={`text-xs font-mono font-bold ${targetColor} capitalize`}>
                            {(listing.quantity * listing.price_per_unit).toFixed(0)} {listing.target_resource}
                          </span>
                        </div>

                        {/* Price */}
                        <div className="p-2 bg-black/30 rounded border border-white/5">
                          <div className="flex justify-between">
                            <span className="text-[9px] uppercase font-bold text-slate-500">Prix unitaire:</span>
                            <span className="text-xs font-mono text-white font-bold">
                              {listing.price_per_unit.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Expiry */}
                        <div className="flex items-center justify-center gap-1 text-[9px] text-slate-600 font-mono pt-1 border-t border-white/5">
                          <Clock size={10} />
                          {new Date(listing.expires_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
