import { useState } from 'react';
import { BarChart3, Activity, Swords, Rocket } from 'lucide-react';
import ProductionStats from './ProductionStats';
import Dashboard from './Dashboard';

interface StatsPageProps {
  planet: any;
  userId: string;
  speedFactor: number;
}

const TABS = [
  { id: 'production', label: 'Production', icon: BarChart3 },
  { id: 'analytics',  label: 'Analytique',  icon: Activity },
] as const;

type TabId = typeof TABS[number]['id'];

export default function StatsPage({ planet, userId, speedFactor }: StatsPageProps) {
  const [tab, setTab] = useState<TabId>('production');

  return (
    <div className="space-y-0 pb-20">
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 bg-slate-900/60 rounded-xl border border-white/5 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
              tab === id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'production' && (
        <ProductionStats planet={planet} speedFactor={speedFactor} />
      )}
      {tab === 'analytics' && (
        <Dashboard userId={userId} />
      )}
    </div>
  );
}
