import { useState, useEffect, useCallback } from 'react';
import {
  Globe, Tag, Coins, RefreshCw, Eye, ShoppingCart, X, Check,
  Hammer, FlaskConical, Rocket, Shield, Pickaxe, Warehouse, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { apiUrl } from '@/config/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Listing {
  id: string;
  planet_id: string;
  seller_id: string;
  seller_name: string;
  listing_type: 'npc' | 'player';
  asking_price_metal: number;
  asking_price_crystal: number;
  asking_price_deuterium: number;
  suggested_price_metal: number;
  suggested_price_crystal: number;
  suggested_price_deuterium: number;
  listed_at: string;
  planet_name: string;
  galaxy: number;
  system: number;
  position: number;
  biome: string | null;
  metal_amount: number;
  crystal_amount: number;
  deuterium_amount: number;
}

interface ListingDetails extends Listing {
  buildings: { key: string; name: string; level: number }[];
  technologies: { key: string; name: string; level: number }[];
  ships: { key: string; name: string; count: number }[];
  defenses: { key: string; name: string; count: number }[];
}

interface SuggestedPrice {
  planet_id: string;
  planet_name: string;
  suggested_player: { metal: number; crystal: number; deuterium: number };
  suggested_npc: { metal: number; crystal: number; deuterium: number };
  existing_listing: null | {
    id: string;
    listing_type: string;
    asking_price_metal: number;
    asking_price_crystal: number;
    asking_price_deuterium: number;
  };
}

interface PlanetMarketViewProps {
  planet: any;
  userId: string;
  onUpdate: () => void;
}

const fmt = (n: number) => Math.floor(n).toLocaleString('fr-FR');

const BIOME_COLORS: Record<string, string> = {
  volcanique: 'text-orange-400 border-orange-500/30 bg-orange-950/20',
  glaciaire: 'text-cyan-300 border-cyan-500/30 bg-cyan-950/20',
  desertique: 'text-yellow-400 border-yellow-500/30 bg-yellow-950/20',
  oceanique: 'text-blue-300 border-blue-500/30 bg-blue-950/20',
  aride: 'text-amber-400 border-amber-500/30 bg-amber-950/20',
  tellurique: 'text-green-400 border-green-500/30 bg-green-950/20',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function PriceTag({ metal, crystal, deuterium }: { metal: number; crystal: number; deuterium: number }) {
  return (
    <div className="flex gap-3 text-xs font-mono">
      <span className="text-yellow-300">{fmt(metal)} <span className="text-slate-500">M</span></span>
      <span className="text-cyan-300">{fmt(crystal)} <span className="text-slate-500">C</span></span>
      <span className="text-blue-300">{fmt(deuterium)} <span className="text-slate-500">D</span></span>
    </div>
  );
}

function ListingCard({
  listing,
  isMine,
  userId,
  planetId,
  onRefresh,
}: {
  listing: Listing;
  isMine: boolean;
  userId: string;
  planetId: string;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<ListingDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [buying, setBuying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [editPrice, setEditPrice] = useState(false);
  const [priceMetal, setPriceMetal] = useState(listing.asking_price_metal);
  const [priceCrystal, setPriceCrystal] = useState(listing.asking_price_crystal);
  const [priceDeuterium, setPriceDeuterium] = useState(listing.asking_price_deuterium);
  const [savingPrice, setSavingPrice] = useState(false);

  const biomeClass = BIOME_COLORS[listing.biome || 'tellurique'] || BIOME_COLORS.tellurique;

  const loadDetails = async () => {
    if (details) return;
    setLoadingDetails(true);
    try {
      const res = await fetch(apiUrl(`/market/planets/listings/${listing.id}`));
      if (res.ok) setDetails(await res.json());
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleExpand = () => {
    if (!expanded) loadDetails();
    setExpanded(e => !e);
  };

  const handleBuy = async () => {
    if (!confirm(`Acheter ${listing.planet_name} pour ${fmt(listing.asking_price_metal)}M / ${fmt(listing.asking_price_crystal)}C / ${fmt(listing.asking_price_deuterium)}D ?`)) return;
    setBuying(true);
    try {
      const res = await fetch(apiUrl(`/market/planets/listings/${listing.id}/buy`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_id: userId, buyer_planet_id: planetId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Planète ${listing.planet_name} acquise !`);
        onRefresh();
      } else {
        toast.error(data.error || 'Achat échoué');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setBuying(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Retirer cette annonce ? La planète reviendra dans vos colonies.')) return;
    setCancelling(true);
    try {
      const res = await fetch(apiUrl(`/market/planets/listings/${listing.id}?user_id=${userId}`), { method: 'DELETE' });
      if (res.ok) {
        toast.success('Annonce retirée');
        onRefresh();
      } else {
        toast.error('Erreur lors du retrait');
      }
    } finally {
      setCancelling(false);
    }
  };

  const handleSavePrice = async () => {
    setSavingPrice(true);
    try {
      const res = await fetch(apiUrl(`/market/planets/listings/${listing.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, asking_price_metal: priceMetal, asking_price_crystal: priceCrystal, asking_price_deuterium: priceDeuterium }),
      });
      if (res.ok) {
        toast.success('Prix mis à jour');
        setEditPrice(false);
        onRefresh();
      } else {
        toast.error('Erreur mise à jour du prix');
      }
    } finally {
      setSavingPrice(false);
    }
  };

  return (
    <Card className={`border ${biomeClass} bg-slate-950/80 overflow-hidden transition-all`}>
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe size={18} className="text-indigo-400 flex-shrink-0" />
            <div>
              <span className="font-bold text-white text-sm">{listing.planet_name}</span>
              <span className="text-slate-500 text-xs ml-2 font-mono">[{listing.galaxy}:{listing.system}:{listing.position}]</span>
              {listing.biome && (
                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded border ${biomeClass}`}>{listing.biome}</span>
              )}
            </div>
          </div>
          {!isMine && (
            <span className="text-slate-500 text-xs">par <span className="text-slate-300">{listing.seller_name}</span></span>
          )}
          {isMine && (
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-500/30">Votre annonce</span>
          )}
        </div>

        {/* Resources on planet */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-slate-900/50 rounded p-2 text-center">
            <div className="text-yellow-400 font-mono font-bold">{fmt(listing.metal_amount)}</div>
            <div className="text-slate-500 text-[10px]">Métal</div>
          </div>
          <div className="bg-slate-900/50 rounded p-2 text-center">
            <div className="text-cyan-400 font-mono font-bold">{fmt(listing.crystal_amount)}</div>
            <div className="text-slate-500 text-[10px]">Cristal</div>
          </div>
          <div className="bg-slate-900/50 rounded p-2 text-center">
            <div className="text-blue-400 font-mono font-bold">{fmt(listing.deuterium_amount)}</div>
            <div className="text-slate-500 text-[10px]">Deutérium</div>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Prix demandé</div>
            {editPrice ? (
              <div className="space-y-1">
                <div className="flex gap-2 items-center">
                  <Input type="number" value={priceMetal} onChange={e => setPriceMetal(Number(e.target.value))}
                    className="h-7 w-28 text-xs bg-slate-900 border-yellow-500/30 text-yellow-300" placeholder="Métal" />
                  <Input type="number" value={priceCrystal} onChange={e => setPriceCrystal(Number(e.target.value))}
                    className="h-7 w-28 text-xs bg-slate-900 border-cyan-500/30 text-cyan-300" placeholder="Cristal" />
                  <Input type="number" value={priceDeuterium} onChange={e => setPriceDeuterium(Number(e.target.value))}
                    className="h-7 w-28 text-xs bg-slate-900 border-blue-500/30 text-blue-300" placeholder="Deutérium" />
                  <Button size="sm" onClick={handleSavePrice} disabled={savingPrice} className="bg-emerald-700 hover:bg-emerald-600 h-7 text-xs px-2">
                    <Check size={12} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditPrice(false)} className="h-7 text-xs px-2 text-slate-400">
                    <X size={12} />
                  </Button>
                </div>
              </div>
            ) : (
              <PriceTag metal={listing.asking_price_metal} crystal={listing.asking_price_crystal} deuterium={listing.asking_price_deuterium} />
            )}
          </div>
          <div className="flex gap-2">
            {/* Details toggle */}
            <Button size="sm" variant="ghost" onClick={handleExpand}
              className="text-slate-400 hover:text-white text-xs gap-1 h-7">
              <Eye size={12} /> Détails {expanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
            </Button>
            {isMine && !editPrice && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditPrice(true)}
                  className="text-amber-400 hover:text-amber-300 text-xs h-7 gap-1">
                  <Tag size={12} /> Prix
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel} disabled={cancelling}
                  className="text-red-400 hover:text-red-300 text-xs h-7 gap-1">
                  <X size={12} /> Retirer
                </Button>
              </>
            )}
            {!isMine && (
              <Button size="sm" onClick={handleBuy} disabled={buying}
                className="bg-indigo-700 hover:bg-indigo-600 text-white text-xs h-7 gap-1">
                {buying ? <RefreshCw size={12} className="animate-spin" /> : <ShoppingCart size={12} />}
                Acheter
              </Button>
            )}
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-white/10 pt-3 space-y-3">
            {loadingDetails ? (
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <RefreshCw size={12} className="animate-spin" /> Chargement…
              </div>
            ) : details ? (
              <>
                {/* Buildings */}
                {details.buildings.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                      <Hammer size={10} /> Bâtiments
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {details.buildings.map(b => (
                        <span key={b.key} className="text-xs bg-slate-800/60 border border-slate-700/40 rounded px-2 py-0.5">
                          <span className="text-slate-300">{b.name}</span>
                          <span className="text-cyan-400 font-bold ml-1">niv.{b.level}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technologies */}
                {details.technologies.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                      <FlaskConical size={10} /> Technologies
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {details.technologies.map(t => (
                        <span key={t.key} className="text-xs bg-indigo-900/30 border border-indigo-700/30 rounded px-2 py-0.5">
                          <span className="text-indigo-300">{t.name}</span>
                          <span className="text-purple-400 font-bold ml-1">niv.{t.level}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ships */}
                {details.ships.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                      <Rocket size={10} /> Vaisseaux
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {details.ships.map(s => (
                        <span key={s.key} className="text-xs bg-orange-900/20 border border-orange-700/30 rounded px-2 py-0.5">
                          <span className="text-orange-300">{s.name}</span>
                          <span className="text-white font-bold ml-1">×{s.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Defenses */}
                {details.defenses.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                      <Shield size={10} /> Défenses
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {details.defenses.map(d => (
                        <span key={d.key} className="text-xs bg-red-900/20 border border-red-700/30 rounded px-2 py-0.5">
                          <span className="text-red-300">{d.name}</span>
                          <span className="text-white font-bold ml-1">×{d.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-500 text-xs">Impossible de charger les détails.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Sell panel ─────────────────────────────────────────────────────────────────

function SellPanel({
  planet,
  userId,
  onRefresh,
}: {
  planet: any;
  userId: string;
  onRefresh: () => void;
}) {
  const [suggested, setSuggested] = useState<SuggestedPrice | null>(null);
  const [loading, setLoading] = useState(false);
  const [listing, setListing] = useState(false);
  const [listingType, setListingType] = useState<'player' | 'npc'>('player');
  const [metal, setMetal] = useState(0);
  const [crystal, setCrystal] = useState(0);
  const [deuterium, setDeuterium] = useState(0);
  const [sellingNpc, setSellingNpc] = useState(false);

  const fetchSuggested = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/market/planets/suggested-price?planet_id=${planet.id}&user_id=${userId}`));
      if (res.ok) {
        const data: SuggestedPrice = await res.json();
        setSuggested(data);
        if (data.existing_listing) {
          setMetal(data.existing_listing.asking_price_metal);
          setCrystal(data.existing_listing.asking_price_crystal);
          setDeuterium(data.existing_listing.asking_price_deuterium);
          setListingType(data.existing_listing.listing_type as 'player' | 'npc');
        } else {
          setMetal(data.suggested_player.metal);
          setCrystal(data.suggested_player.crystal);
          setDeuterium(data.suggested_player.deuterium);
        }
      } else {
        const d = await res.json();
        toast.error(d.error || 'Erreur');
      }
    } finally {
      setLoading(false);
    }
  }, [planet.id, userId]);

  useEffect(() => {
    if (planet.id && !planet.is_homeworld) fetchSuggested();
  }, [planet.id, fetchSuggested]);

  const handleApplySuggested = () => {
    if (!suggested) return;
    const src = listingType === 'player' ? suggested.suggested_player : suggested.suggested_npc;
    setMetal(src.metal); setCrystal(src.crystal); setDeuterium(src.deuterium);
  };

  const handleList = async () => {
    setListing(true);
    try {
      const res = await fetch(apiUrl(`/market/planets/${planet.id}/list`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, listing_type: listingType, asking_price_metal: metal, asking_price_crystal: crystal, asking_price_deuterium: deuterium }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(listingType === 'player' ? 'Planète mise en vente !' : 'Annonce créée — cliquez "Vendre au PNJ" pour finaliser');
        fetchSuggested();
        onRefresh();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } finally {
      setListing(false);
    }
  };

  const handleSellNpc = async () => {
    if (!suggested?.existing_listing) return;
    if (!confirm(`Vendre définitivement ${planet.name} au PNJ ? Vous recevrez ${fmt(suggested.suggested_npc.metal)} M / ${fmt(suggested.suggested_npc.crystal)} C / ${fmt(suggested.suggested_npc.deuterium)} D. Cette action est IRRÉVERSIBLE.`)) return;
    setSellingNpc(true);
    try {
      const res = await fetch(apiUrl(`/market/planets/listings/${suggested.existing_listing.id}/sell-npc?user_id=${userId}`), { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Planète vendue ! Vous avez reçu ${fmt(data.received_metal)} M, ${fmt(data.received_crystal)} C, ${fmt(data.received_deuterium)} D.`);
        onRefresh();
      } else {
        toast.error(data.error || 'Erreur lors de la vente');
      }
    } finally {
      setSellingNpc(false);
    }
  };

  if (planet.is_homeworld) {
    return (
      <Card className="bg-slate-900/40 border border-slate-700/30">
        <CardContent className="p-4 flex items-center gap-3 text-slate-500 text-sm">
          <AlertTriangle size={16} className="text-amber-500" />
          Impossible de vendre votre planète mère.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="bg-slate-900/40 border border-slate-700/30">
        <CardContent className="p-4 flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw size={14} className="animate-spin" /> Calcul du prix estimé…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/40 border border-indigo-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-indigo-300 flex items-center gap-2">
          <Tag size={14} /> Mettre {planet.name} en vente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Listing type */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => { setListingType('player'); if (suggested) { setMetal(suggested.suggested_player.metal); setCrystal(suggested.suggested_player.crystal); setDeuterium(suggested.suggested_player.deuterium); } }}
            className={`text-xs flex-1 ${listingType === 'player' ? 'bg-indigo-700 hover:bg-indigo-600' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
          >
            Entre joueurs
          </Button>
          <Button
            size="sm"
            onClick={() => { setListingType('npc'); if (suggested) { setMetal(suggested.suggested_npc.metal); setCrystal(suggested.suggested_npc.crystal); setDeuterium(suggested.suggested_npc.deuterium); } }}
            className={`text-xs flex-1 ${listingType === 'npc' ? 'bg-amber-700 hover:bg-amber-600' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
          >
            Vente PNJ (40%)
          </Button>
        </div>

        {/* Suggested price reference */}
        {suggested && (
          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex items-center justify-between">
              <span>Prix suggéré ({listingType === 'player' ? '70%' : '40%'} valeur estimée)</span>
              <button onClick={handleApplySuggested} className="text-indigo-400 hover:text-indigo-300 text-[10px] underline">Appliquer</button>
            </div>
            <PriceTag
              metal={listingType === 'player' ? suggested.suggested_player.metal : suggested.suggested_npc.metal}
              crystal={listingType === 'player' ? suggested.suggested_player.crystal : suggested.suggested_npc.crystal}
              deuterium={listingType === 'player' ? suggested.suggested_player.deuterium : suggested.suggested_npc.deuterium}
            />
          </div>
        )}

        {/* Price inputs */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-yellow-400 mb-1 block">Métal</label>
            <Input type="number" value={metal} onChange={e => setMetal(Number(e.target.value))}
              className="h-8 text-xs bg-slate-900 border-yellow-500/30 text-yellow-300" />
          </div>
          <div>
            <label className="text-[10px] text-cyan-400 mb-1 block">Cristal</label>
            <Input type="number" value={crystal} onChange={e => setCrystal(Number(e.target.value))}
              className="h-8 text-xs bg-slate-900 border-cyan-500/30 text-cyan-300" />
          </div>
          <div>
            <label className="text-[10px] text-blue-400 mb-1 block">Deutérium</label>
            <Input type="number" value={deuterium} onChange={e => setDeuterium(Number(e.target.value))}
              className="h-8 text-xs bg-slate-900 border-blue-500/30 text-blue-300" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {suggested?.existing_listing ? (
            <>
              <Button size="sm" onClick={handleList} disabled={listing} className="flex-1 bg-indigo-700 hover:bg-indigo-600 text-xs gap-1">
                {listing ? <RefreshCw size={12} className="animate-spin" /> : <Tag size={12} />}
                Mettre à jour l'annonce
              </Button>
              {listingType === 'npc' && (
                <Button size="sm" onClick={handleSellNpc} disabled={sellingNpc}
                  className="flex-1 bg-red-800 hover:bg-red-700 text-xs gap-1">
                  {sellingNpc ? <RefreshCw size={12} className="animate-spin" /> : <Coins size={12} />}
                  Vendre au PNJ maintenant
                </Button>
              )}
            </>
          ) : (
            <Button size="sm" onClick={handleList} disabled={listing} className="w-full bg-indigo-700 hover:bg-indigo-600 text-xs gap-1">
              {listing ? <RefreshCw size={12} className="animate-spin" /> : <Tag size={12} />}
              {listingType === 'player' ? 'Publier l\'annonce' : 'Créer annonce PNJ'}
            </Button>
          )}
        </div>

        {listingType === 'npc' && (
          <p className="text-[10px] text-amber-400/70 flex items-start gap-1">
            <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" />
            La vente au PNJ est définitive : la planète sera supprimée et le slot libéré.
          </p>
        )}
        {listingType === 'player' && (
          <p className="text-[10px] text-slate-500">
            La planète sera masquée de vos colonies le temps de la mise en vente.
            Vous pouvez retirer l'annonce à tout moment.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PlanetMarketView({ planet, userId, onUpdate }: PlanetMarketViewProps) {
  const [marketListings, setMarketListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loadingMarket, setLoadingMarket] = useState(true);

  const fetchListings = useCallback(async () => {
    setLoadingMarket(true);
    try {
      // Market listings (not mine)
      const [marketRes, myRes] = await Promise.all([
        fetch(apiUrl(`/market/planets?exclude_seller=${userId}`)),
        fetch(apiUrl(`/market/planets?seller_id=${userId}`)),
      ]);
      if (marketRes.ok) {
        const d = await marketRes.json();
        setMarketListings(d.listings || []);
      }
      if (myRes.ok) {
        const d = await myRes.json();
        setMyListings(d.listings || []);
      }
    } finally {
      setLoadingMarket(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchListings();
    const id = setInterval(fetchListings, 30_000);
    return () => clearInterval(id);
  }, [fetchListings]);

  const handleRefresh = () => {
    fetchListings();
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Globe className="text-indigo-400" size={20} /> Marché Planétaire
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Achetez ou vendez des colonies. Le transfert inclut toutes les ressources, bâtiments, technologies, vaisseaux et défenses.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loadingMarket}
          className="text-slate-400 hover:text-white gap-1 text-xs">
          <RefreshCw size={12} className={loadingMarket ? 'animate-spin' : ''} /> Actualiser
        </Button>
      </div>

      {/* Sell panel for current planet */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
          <Tag size={11} /> Mettre une planète en vente
        </div>
        <SellPanel planet={planet} userId={userId} onRefresh={handleRefresh} />
      </div>

      {/* My active listings */}
      {myListings.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
            <Warehouse size={11} /> Mes annonces actives ({myListings.length})
          </div>
          <div className="space-y-3">
            {myListings.map(l => (
              <ListingCard key={l.id} listing={l} isMine={true} userId={userId} planetId={planet.id} onRefresh={handleRefresh} />
            ))}
          </div>
        </div>
      )}

      {/* Market listings */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
          <ShoppingCart size={11} /> Planètes en vente ({marketListings.length})
        </div>
        {loadingMarket ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm p-4">
            <RefreshCw size={14} className="animate-spin" /> Chargement…
          </div>
        ) : marketListings.length === 0 ? (
          <Card className="bg-slate-900/30 border border-slate-700/20">
            <CardContent className="p-8 text-center">
              <Globe className="mx-auto text-slate-700 mb-3" size={36} />
              <p className="text-slate-500 text-sm">Aucune planète en vente pour le moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {marketListings.map(l => (
              <ListingCard key={l.id} listing={l} isMine={false} userId={userId} planetId={planet.id} onRefresh={handleRefresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
