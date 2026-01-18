import { Card, CardContent } from "@/components/ui/card";
import { Gem, Droplet, Box } from "lucide-react";

interface PriceOverviewProps {
  stats: any;
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

export default function PriceOverview({ stats }: PriceOverviewProps) {
  if (!stats || !stats.npc_prices) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.npc_prices.map((price: any) => {
        const Icon = resourceIcons[price.resource_type];
        const color = resourceColors[price.resource_type];

        return (
          <Card key={price.resource_type} className="bg-slate-900 border border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg border border-white/10 ${color}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="text-white font-semibold capitalize">
                    {price.resource_type}
                  </h3>
                  <p className="text-xs text-gray-500">Prix NPC</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Achète à:</span>
                  <span className="text-red-400 font-mono">
                    {price.npc_buy_price.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Vend à:</span>
                  <span className="text-green-400 font-mono">
                    {price.npc_sell_price.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="text-gray-400">Prix marché:</span>
                  <span className="text-white font-mono">
                    {price.market_price.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
