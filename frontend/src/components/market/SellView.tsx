import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
import { Plus, Trash2 } from "lucide-react";
import CreateListingModal from "./CreateListingModal";

interface SellViewProps {
  planet: any;
  userId: string;
  onUpdate: () => void;
  onStatsUpdate: () => void;
}

export default function SellView({ planet, userId, onUpdate, onStatsUpdate }: SellViewProps) {
  const [myListings, setMyListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadMyListings();
    const interval = setInterval(loadMyListings, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadMyListings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/market/listings'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        // Filter only my listings
        const mine = data.listings.filter((l: any) => l.seller_user_id === userId);
        setMyListings(mine);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (listingId: string) => {
    if (!confirm("Annuler cette offre ?")) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/market/listings/${listingId}?user_id=${userId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success("Offre annulée");
        onUpdate();
        onStatsUpdate();
        loadMyListings();
      } else {
        toast.error("Erreur lors de l'annulation");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    onUpdate();
    onStatsUpdate();
    loadMyListings();
  };

  return (
    <div className="space-y-6">
      {/* Create Button */}
      <Card className="bg-slate-900 border border-white/10">
        <CardContent className="p-4">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Créer une offre
          </Button>
        </CardContent>
      </Card>

      {/* My Listings */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">
          Mes offres ({myListings.length})
        </h3>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : myListings.length === 0 ? (
          <Card className="bg-slate-900 border border-white/10">
            <CardContent className="p-8 text-center">
              <p className="text-gray-400">Vous n'avez aucune offre active</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myListings.map(listing => {
              const expiresIn = new Date(listing.expires_at).getTime() - Date.now();
              const daysLeft = Math.ceil(expiresIn / (1000 * 60 * 60 * 24));

              return (
                <Card key={listing.id} className="bg-slate-900 border border-indigo-500/30">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-gray-400">Vend</p>
                          <p className="text-lg font-semibold text-white capitalize">
                            {listing.quantity.toLocaleString()} {listing.resource_type}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Contre</p>
                          <p className="text-lg font-semibold text-green-400 capitalize">
                            {(listing.quantity * listing.price_per_unit).toLocaleString()} {listing.target_resource}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/10">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Prix unitaire:</span>
                          <span className="text-white font-mono">
                            {listing.price_per_unit.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-400">Expire dans:</span>
                          <span className={`${daysLeft <= 1 ? 'text-red-400' : 'text-gray-300'}`}>
                            {daysLeft} jour{daysLeft > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleCancel(listing.id)}
                        variant="destructive"
                        size="sm"
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <Trash2 size={16} />
                        Annuler
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Listing Modal */}
      {showCreateModal && (
        <CreateListingModal
          planet={planet}
          userId={userId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}
