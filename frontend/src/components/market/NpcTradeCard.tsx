import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
import { Bot, ArrowRight, Stone, Gem, Droplets, Zap } from "lucide-react";

interface NpcTradeCardProps {
  resource: string;
  npcPrices: any;
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
  metal: "text-orange-400",
  crystal: "text-cyan-400",
  deuterium: "text-emerald-400",
};

const resourceLabels: Record<string, string> = {
  metal: "Métal",
  crystal: "Cristal",
  deuterium: "Deutérium",
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

export default function NpcTradeCard({ resource, npcPrices, planet, userId, onUpdate, onStatsUpdate }: NpcTradeCardProps) {
  const [sellQuantity, setSellQuantity] = useState(1000);
  const [buyQuantity, setBuyQuantity] = useState(0);
  const [buyResource, setBuyResource] = useState("");
  const [lastEdited, setLastEdited] = useState<'sell' | 'buy'>('sell');

  const Icon = resourceIcons[resource] || Stone;
  const color = resourceColors[resource] || "text-slate-400";
  const border = resourceBorders[resource] || "border-slate-500/50";
  const gradient = resourceGradients[resource] || "from-slate-950 to-slate-900/20";

  const availableAmount = (() => {
    switch (resource) {
      case "metal": return planet.metal_amount || 0;
      case "crystal": return planet.crystal_amount || 0;
      case "deuterium": return planet.deuterium_amount || 0;
      default: return 0;
    }
  })();

  // Calculate exchange rate
  const getExchangeRate = () => {
    if (!buyResource || !npcPrices) return null;
    const sellPrice = npcPrices.npc_buy_price; // Déjà avec marge NPC (×0.85)
    const buyPrice = npcPrices.buy_prices?.[buyResource]; // Déjà avec marge NPC (×1.18)
    if (!buyPrice) return null;
    // Les prix contiennent déjà la marge NPC, pas besoin de l'appliquer à nouveau
    return sellPrice / buyPrice;
  };

  const exchangeRate = getExchangeRate();

  // Quand on modifie la quantité à vendre
  const handleSellQuantityChange = (value: number) => {
    const clamped = Math.max(0, Math.min(availableAmount, value));
    setSellQuantity(clamped);
    setLastEdited('sell');
    if (exchangeRate) {
      setBuyQuantity(Math.floor(clamped * exchangeRate));
    }
  };

  // Quand on modifie la quantité à obtenir
  const handleBuyQuantityChange = (value: number) => {
    setBuyQuantity(Math.max(0, value));
    setLastEdited('buy');
    if (exchangeRate && exchangeRate > 0) {
      const requiredSell = Math.ceil(value / exchangeRate);
      setSellQuantity(Math.min(requiredSell, availableAmount));
    }
  };

  // Recalculer quand la ressource à acheter change
  const handleBuyResourceChange = (newResource: string) => {
    setBuyResource(newResource);
    // Recalculer selon le dernier champ édité
    if (newResource && npcPrices) {
      const sellPrice = npcPrices.npc_buy_price;
      const buyPrice = npcPrices.buy_prices?.[newResource];
      if (buyPrice) {
        const rate = (sellPrice / buyPrice) * 0.85;
        if (lastEdited === 'sell') {
          setBuyQuantity(Math.floor(sellQuantity * rate));
        } else {
          const requiredSell = Math.ceil(buyQuantity / rate);
          setSellQuantity(Math.min(requiredSell, availableAmount));
        }
      }
    }
  };

  // Calculate exchange preview
  const exchangePreview = (() => {
    if (!buyResource || !npcPrices || !exchangeRate) return null;

    const sellPrice = npcPrices.npc_buy_price;
    const buyPrice = npcPrices.buy_prices?.[buyResource];

    return {
      exchangeRate: exchangeRate / 0.85, // taux brut avant marge
      finalAmount: buyQuantity,
      sellPrice,
      buyPrice
    };
  })();

  const handleNpcTrade = async () => {
    if (!buyResource) {
      toast.error("Sélectionnez la ressource à acheter");
      return;
    }

    if (resource === buyResource) {
      toast.error("Ressources identiques");
      return;
    }

    if (sellQuantity > availableAmount) {
      toast.error("Ressources insuffisantes");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/market/npc/buy'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planet_id: planet.id,
          user_id: userId,
          sell_resource: resource,
          sell_quantity: sellQuantity,
          buy_resource: buyResource
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`⚡ Échange réussi! Reçu: ${data.exchanged.bought_quantity.toFixed(0)} ${buyResource}`);
        onUpdate();
        onStatsUpdate();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'échange");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    }
  };

  return (
    <div className={`relative overflow-hidden border-t-4 ${border} bg-gradient-to-b ${gradient} shadow-2xl group rounded-lg`}>
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 to-transparent z-0"></div>
      <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
        <Icon size={120} className={color} />
      </div>

      <div className="p-5 relative z-10">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg border ${border} bg-black/20 ${color}`}>
                <Icon size={20} />
              </div>
              <div>
                <h4 className="font-black uppercase tracking-wider text-white text-sm capitalize">{resource}</h4>
                <p className="text-[9px] text-slate-500 uppercase font-bold">Disponible: {availableAmount.toLocaleString()}</p>
              </div>
            </div>
            <Bot size={20} className="text-purple-400" />
          </div>

          {/* NPC Prices Info */}
          {npcPrices && (
            <div className="bg-black/30 border border-white/5 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 uppercase font-bold">Prix achat NPC:</span>
                <span className="text-emerald-400 font-mono font-bold">{npcPrices.npc_buy_price?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 uppercase font-bold">Prix vente NPC:</span>
                <span className="text-red-400 font-mono font-bold">{npcPrices.npc_sell_price?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                <span className="text-slate-500 uppercase font-bold">Prix marché:</span>
                <span className="text-yellow-400 font-mono font-bold">{npcPrices.market_price?.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Trade Setup */}
          <div className="space-y-3">
            {/* Ressource à acheter - en premier */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Ressource à acheter:</label>
              <select
                value={buyResource}
                onChange={(e) => handleBuyResourceChange(e.target.value)}
                className="w-full p-2 bg-black/30 border border-white/10 rounded text-white text-sm font-mono hover:border-white/20 transition-colors"
              >
                <option value="">Choisir...</option>
                {resource !== 'metal' && <option value="metal">Métal</option>}
                {resource !== 'crystal' && <option value="crystal">Cristal</option>}
                {resource !== 'deuterium' && <option value="deuterium">Deutérium</option>}
              </select>
            </div>

            {/* Quantité à vendre */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">
                Quantité de <span className={color}>{resourceLabels[resource]}</span> à vendre:
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={availableAmount}
                  value={sellQuantity}
                  onChange={(e) => handleSellQuantityChange(parseInt(e.target.value) || 0)}
                  className={`bg-black/30 border-white/10 text-white font-mono hover:border-white/20 transition-colors pr-12 ${lastEdited === 'sell' ? 'border-indigo-500/50' : ''}`}
                />
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${color}`}>
                  <Icon size={16} />
                </div>
              </div>
              {sellQuantity > availableAmount && (
                <p className="text-[9px] text-red-400 mt-1">Ressources insuffisantes!</p>
              )}
            </div>

            {/* Quantité à obtenir - éditable */}
            {buyResource && (
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">
                  Quantité de <span className={resourceColors[buyResource]}>{resourceLabels[buyResource]}</span> à obtenir:
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    value={buyQuantity}
                    onChange={(e) => handleBuyQuantityChange(parseInt(e.target.value) || 0)}
                    className={`bg-black/30 border-white/10 text-white font-mono hover:border-white/20 transition-colors pr-12 ${lastEdited === 'buy' ? 'border-indigo-500/50' : ''}`}
                  />
                  <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${resourceColors[buyResource]}`}>
                    {(() => {
                      const BuyIcon = resourceIcons[buyResource] || Stone;
                      return <BuyIcon size={16} />;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Exchange Preview */}
            {exchangePreview && (
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold text-purple-400 mb-2">Récapitulatif:</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={color} />
                    <span className="text-white font-mono text-sm">{sellQuantity.toLocaleString()}</span>
                  </div>
                  <ArrowRight size={16} className="text-purple-400" />
                  <div className="flex items-center gap-2">
                    {(() => {
                      const BuyIcon = resourceIcons[buyResource] || Stone;
                      return <BuyIcon size={14} className={resourceColors[buyResource]} />;
                    })()}
                    <span className={`font-mono text-sm font-bold ${resourceColors[buyResource]}`}>
                      {Math.floor(exchangePreview.finalAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="text-[9px] text-slate-500 mt-2">
                  Taux: 1 {resourceLabels[resource]} = {exchangePreview.exchangeRate.toFixed(3)} {resourceLabels[buyResource]} (marge NPC 15%)
                </div>
              </div>
            )}

            <Button
              onClick={handleNpcTrade}
              disabled={!buyResource || sellQuantity > availableAmount}
              className="w-full font-black uppercase tracking-widest bg-gradient-to-r from-purple-950/60 to-indigo-950/60 hover:from-purple-900/80 hover:to-indigo-900/80 border border-purple-500/50 hover:border-purple-400/80 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap size={14} className="mr-2" />
              Échanger
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
