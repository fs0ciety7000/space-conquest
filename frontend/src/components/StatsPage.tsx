import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Activity } from 'lucide-react';
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-0 pb-20"
    >
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px] rounded-xl border border-cyan-500/10 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
              tab === id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-cyan-500/5'
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
    </motion.div>
  );
}
