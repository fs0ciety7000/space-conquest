import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, TrendingUp, Activity, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { apiUrl } from '@/config/api';
import BuyView from "./market/BuyView";
import SellView from "./market/SellView";
import TransactionHistory from "./market/TransactionHistory";
import PriceOverview from "./market/PriceOverview";
import PlanetMarketView from "./market/PlanetMarketView";

interface MarketplaceProps {
  planet: any;
  userId: string;
  onUpdate: () => void;
}

type TabType = "buy" | "sell" | "history" | "planets";

export default function Marketplace({ planet, userId, onUpdate }: MarketplaceProps) {
  const [activeTab, setActiveTab] = useState<TabType>("buy");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarketStats();
    const interval = setInterval(loadMarketStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadMarketStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl('/market/stats'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "buy",     label: "Acheter",   icon: ShoppingCart },
    { id: "sell",    label: "Vendre",    icon: TrendingUp   },
    { id: "planets", label: "Planètes",  icon: Globe        },
    { id: "history", label: "Historique",icon: Activity     },
  ];

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <Card className="bg-slate-950 border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/20 to-transparent"></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-900/20 text-indigo-400">
              <ShoppingCart size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Marché Galactique</h2>
              <p className="text-sm text-gray-400">
                Échangez vos ressources ou achetez des planètes entières.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Overview (only on resource tabs) */}
      {!loading && stats && activeTab !== "planets" && <PriceOverview stats={stats} />}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              variant={activeTab === tab.id ? "default" : "ghost"}
              className={`flex items-center gap-2 ${
                activeTab === tab.id
                  ? tab.id === "planets"
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "text-gray-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "buy" && (
        <BuyView
          planet={planet}
          userId={userId}
          stats={stats}
          onUpdate={onUpdate}
          onStatsUpdate={loadMarketStats}
        />
      )}

      {activeTab === "sell" && (
        <SellView
          planet={planet}
          userId={userId}
          onUpdate={onUpdate}
          onStatsUpdate={loadMarketStats}
        />
      )}

      {activeTab === "planets" && (
        <PlanetMarketView
          planet={planet}
          userId={userId}
          onUpdate={onUpdate}
        />
      )}

      {activeTab === "history" && (
        <TransactionHistory userId={userId} />
      )}
    </div>
  );
}
