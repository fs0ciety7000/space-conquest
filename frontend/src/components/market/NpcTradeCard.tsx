import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { apiUrl } from '@/config/api';
import { Bot, ArrowRight, Gem, Droplet, Box } from "lucide-react";

interface NpcTradeCardProps {
  resource: string;
  npcPrices: any;
  planet: any;
  userId: string;
  onUpdate: () => void;
  onStatsUpdate: () => void;
}

const resourceIcons: Record<string, any> = {
  metal: Box,
  crystal: Gem,
  deuterium: Droplet,
};

const resourceColors: Record<string, string> = {
  metal: "text-gray-400",
  crystal: "text-cyan-400",
  deuterium: "text-green-400",
};

export default function NpcTradeCard({ resource, npcPrices, planet, userId, onUpdate, onStatsUpdate }: NpcTradeCardProps) {
  const [sellResource, setSellResource] = useState("");
  const [sellQuantity, setSellQuantity] = useState(1000);
  const [buyResource, setBuyResource] = useState("");

  const Icon = resourceIcons[resource];
  const color = resourceColors[resource];

  const handleNpcTrade = async () => {
    if (!sellResource || !buyResource) {
      toast.error("Sélectionnez les ressources à échanger");
      return;
    }

    if (sellResource === buyResource) {
      toast.error("Ressources identiques");
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
          sell_resource: sellResource,
          sell_quantity: sellQuantity,
          buy_resource: buyResource
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Échange réussi! Reçu: ${data.exchanged.bought_quantity.toFixed(0)} ${buyResource}`);
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
    <Card className="bg-slate-900 border border-purple-500/30">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg border border-white/10 ${color}`}>
              <Icon size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-semibold capitalize">Échange {resource}</h4>
              <p className="text-xs text-gray-400">Commerce avec PNJ</p>
            </div>
            <Bot size={20} className="text-purple-400" />
          </div>

          {/* Trade Setup */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">Je vends:</label>
              <select
                value={sellResource}
                onChange={(e) => setSellResource(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-800 border border-white/10 rounded text-white text-sm"
              >
                <option value="">Choisir...</option>
                <option value="metal">Metal</option>
                <option value="crystal">Crystal</option>
                <option value="deuterium">Deuterium</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400">Quantité:</label>
              <Input
                type="number"
                min={1}
                value={sellQuantity}
                onChange={(e) => setSellQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="bg-slate-800 border-white/10 text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400">J'achète:</label>
              <select
                value={buyResource}
                onChange={(e) => setBuyResource(e.target.value)}
                className="w-full mt-1 p-2 bg-slate-800 border border-white/10 rounded text-white text-sm"
              >
                <option value="">Choisir...</option>
                <option value="metal">Metal</option>
                <option value="crystal">Crystal</option>
                <option value="deuterium">Deuterium</option>
              </select>
            </div>

            <Button
              onClick={handleNpcTrade}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              Échanger avec PNJ
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
