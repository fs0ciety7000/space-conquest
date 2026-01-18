import { TrendingUp, TrendingDown, Activity, Stone, Gem, Droplets } from "lucide-react";

interface PriceOverviewProps {
  stats: any;
}

export default function PriceOverview({ stats }: PriceOverviewProps) {
  const resources = [
    { 
      name: "Métal", 
      key: "metal",
      icon: Stone,
      color: "text-slate-400",
      border: "border-slate-500/50",
      bg: "bg-slate-500/10",
      gradient: "from-slate-950 to-slate-900/20"
    },
    { 
      name: "Cristal", 
      key: "crystal",
      icon: Gem,
      color: "text-cyan-400",
      border: "border-cyan-500/50",
      bg: "bg-cyan-500/10",
      gradient: "from-slate-950 to-cyan-950/20"
    },
    { 
      name: "Deutérium", 
      key: "deuterium",
      icon: Droplets,
      color: "text-emerald-400",
      border: "border-emerald-500/50",
      bg: "bg-emerald-500/10",
      gradient: "from-slate-950 to-emerald-950/20"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {resources.map(resource => {
        const price = stats?.prices?.[resource.key] || { buy: 1.0, sell: 1.0, market: 1.0 };
        const ResourceIcon = resource.icon;
        
        return (
          <div 
            key={resource.key} 
            className={`relative overflow-hidden border-t-4 ${resource.border} bg-gradient-to-b ${resource.gradient} shadow-2xl group rounded-lg`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 to-transparent z-0"></div>
            <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Activity size={120} className={resource.color} />
            </div>

            <div className="p-5 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${resource.border} bg-black/20 ${resource.color}`}>
                    <ResourceIcon size={20} />
                  </div>
                  <span className="font-black uppercase tracking-wider text-white text-sm">{resource.name}</span>
                </div>
                <span className={`text-xl font-black font-mono ${resource.color} opacity-80`}>
                  {price.market.toFixed(2)}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-black/30 rounded border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                    <TrendingDown size={12} className="text-green-400" />
                    Achat PNJ
                  </span>
                  <span className="text-xs font-mono text-green-400 font-bold">{price.buy.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between p-2 bg-black/30 rounded border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                    <TrendingUp size={12} className="text-red-400" />
                    Vente PNJ
                  </span>
                  <span className="text-xs font-mono text-red-400 font-bold">{price.sell.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
