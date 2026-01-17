import { useEffect, useState } from 'react';
import { Stone, Gem, Droplets } from 'lucide-react';

interface ResourceGain {
  id: string;
  type: 'metal' | 'crystal' | 'deuterium';
  amount: number;
  x: number;
  y: number;
}

interface FloatingResourceGainProps {
  gains: ResourceGain[];
  onAnimationEnd: (id: string) => void;
}

export function FloatingResourceGain({ gains, onAnimationEnd }: FloatingResourceGainProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {gains.map((gain) => (
        <FloatingNumber key={gain.id} gain={gain} onEnd={onAnimationEnd} />
      ))}
    </div>
  );
}

function FloatingNumber({ gain, onEnd }: { gain: ResourceGain; onEnd: (id: string) => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onEnd(gain.id), 300);
    }, 2000);
    return () => clearTimeout(timer);
  }, [gain.id, onEnd]);

  const Icon = gain.type === 'metal' ? Stone : gain.type === 'crystal' ? Gem : Droplets;
  const color = gain.type === 'metal' ? 'text-orange-400' : gain.type === 'crystal' ? 'text-cyan-400' : 'text-green-400';

  return (
    <div
      className={`absolute transition-all duration-2000 ${
        isVisible ? 'opacity-100 -translate-y-20' : 'opacity-0 translate-y-0'
      }`}
      style={{
        left: `${gain.x}px`,
        top: `${gain.y}px`,
        animation: 'float-up 2s ease-out forwards',
      }}
    >
      <div className="flex items-center gap-1 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20 shadow-2xl">
        <Icon size={14} className={color} />
        <span className={`font-mono text-sm font-bold ${color}`}>
          +{gain.amount >= 1000 ? `${(gain.amount / 1000).toFixed(1)}k` : Math.floor(gain.amount)}
        </span>
      </div>
    </div>
  );
}

// Hook personnalisé pour suivre les changements de ressources
export function useResourceGainAnimation(planet: any) {
  const [gains, setGains] = useState<ResourceGain[]>([]);
  const [prevResources, setPrevResources] = useState<any>(null);

  useEffect(() => {
    if (!prevResources || !planet) return;

    const newGains: ResourceGain[] = [];
    const types: Array<{ key: string; type: 'metal' | 'crystal' | 'deuterium' }> = [
      { key: 'metal_amount', type: 'metal' },
      { key: 'crystal_amount', type: 'crystal' },
      { key: 'deuterium_amount', type: 'deuterium' },
    ];

    types.forEach(({ key, type }) => {
      const diff = planet[key] - prevResources[key];
      if (diff > 10) {
        // Seulement si gain significatif
        newGains.push({
          id: `${type}-${Date.now()}-${Math.random()}`,
          type,
          amount: diff,
          x: Math.random() * (window.innerWidth - 200) + 100,
          y: window.innerHeight / 2 + Math.random() * 100 - 50,
        });
      }
    });

    if (newGains.length > 0) {
      setGains((prev) => [...prev, ...newGains]);
    }

    setPrevResources(planet);
  }, [planet]);

  const handleAnimationEnd = (id: string) => {
    setGains((prev) => prev.filter((g) => g.id !== id));
  };

  return { gains, handleAnimationEnd };
}