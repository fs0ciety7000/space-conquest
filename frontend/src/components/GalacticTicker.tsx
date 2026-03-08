import { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';
import { apiUrl } from '@/config/api';

export interface TickerNews {
    id: string;
    text: string;
    priority: 'high' | 'normal';
    timestamp: number;
}

export default function GalacticTicker() {
    const [news, setNews] = useState<TickerNews[]>([]);

    useEffect(() => {
        // Mock data initial pour le ticker
        setNews([
            { id: '1', text: 'Bienvenue sur Space Conquest: Expansion 3.0 !', priority: 'high', timestamp: Date.now() },
            { id: '2', text: 'Le marché fluctue: le Métal est en hausse sur le secteur Alpha.', priority: 'normal', timestamp: Date.now() },
        ]);

        // Écouter les événements temps réel de useGameNotifications
        const handlePlanetSold = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            const newNews: TickerNews = {
                id: crypto.randomUUID(),
                text: `FLASH GNN : La planète ${detail.planet_name} a été rachetée par le Syndicat.`,
                priority: 'high',
                timestamp: Date.now()
            };
            setNews(prev => [newNews, ...prev].slice(0, 5));
        };

        const handleSabotage = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            const newNews: TickerNews = {
                id: crypto.randomUUID(),
                text: `FLASH GNN : Sabotage détecté sur la planète ${detail.planet_name} ! L'alliance ${detail.attacker_name} revendique l'acte.`,
                priority: 'high',
                timestamp: Date.now()
            };
            setNews(prev => [newNews, ...prev].slice(0, 5));
        };

        const handleCombatResult = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail.result === 'victory' || detail.result === 'defeat') {
                const newNews: TickerNews = {
                    id: crypto.randomUUID(),
                    text: `NOUVELLES DU FRONT : Bataille majeure conclue contre ${detail.opponent}. Des débris sont dispersés.`,
                    priority: 'normal',
                    timestamp: Date.now()
                };
                setNews(prev => [newNews, ...prev].slice(0, 5));
            }
        };

        window.addEventListener('planet-sold', handlePlanetSold);
        window.addEventListener('sabotage-alert-advanced', handleSabotage);
        window.addEventListener('combat-result-advanced', handleCombatResult);

        return () => {
            window.removeEventListener('planet-sold', handlePlanetSold);
            window.removeEventListener('sabotage-alert-advanced', handleSabotage);
            window.removeEventListener('combat-result-advanced', handleCombatResult);
        };
    }, []);

    if (news.length === 0) return null;

    // Concaténer les news pour le défilement continu
    const tickerText = news.map(n => n.text).join('  ///  ');

    return (
        <div className="w-full bg-slate-950/90 border-b border-indigo-900/50 backdrop-blur-sm h-6 overflow-hidden flex items-center shrink-0">
            <div className="bg-indigo-600/20 text-indigo-400 text-[10px] font-black uppercase px-3 h-full flex items-center gap-2 border-r border-indigo-500/30 z-10 shrink-0 shadow-[10px_0_15px_-5px_rgba(0,0,0,0.5)]">
                <Newspaper size={12} className="animate-pulse text-indigo-300" />
                <span>GNN Ticker</span>
            </div>
            {/* The scrolling container */}
            <div className="flex-1 overflow-hidden h-full relative group">
                {/* 
                  To ensure a seamless loop, we render the text twice and animate it.
                  Tailwind doesn't have a built-in endless marquee that works perfectly out of the box with dynamic width,
                  so we use a CSS animation defined in index.css (or inline style for now).
                  We will use inline keyframes to keep the component standalone.
                */}
                <style>{`
                  @keyframes ticker {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                  }
                  .animate-ticker {
                    display: inline-block;
                    white-space: nowrap;
                    animation: ticker 30s linear infinite;
                  }
                  .group:hover .animate-ticker {
                    animation-play-state: paused;
                  }
                `}</style>
                <div className="absolute whitespace-nowrap h-full flex items-center animate-ticker">
                    <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-widest pl-[100%]">
                        {tickerText}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-widest pl-10">
                        {tickerText}
                    </span>
                </div>
            </div>
        </div>
    );
}
