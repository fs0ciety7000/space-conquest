import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket, Shield, Zap, Flame, Star, Skull, Trophy,
  TrendingDown, AlertCircle, Target, Activity
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Fleet {
  hunters: number;
  cruisers: number;
}

interface CombatEvent {
  type: 'attack' | 'damage' | 'destroyed' | 'round' | 'end';
  attacker?: 'player' | 'enemy';
  target?: 'player' | 'enemy';
  shipType?: 'hunters' | 'cruisers';
  damage?: number;
  destroyed?: number;
  round?: number;
  winner?: 'player' | 'enemy' | 'draw';
  timestamp: number;
}

interface CombatReplayProps {
  report: any;
  onClose: () => void;
}

// Parser les logs de combat pour extraire les événements
const parseCombatLogs = (logs: string[]): CombatEvent[] => {
  const events: CombatEvent[] = [];
  let timestamp = 0;

  logs.forEach((log, index) => {
    timestamp += 500; // 500ms entre chaque événement

    // Détecter les rounds
    if (log.includes('Round') || log.includes('Tour')) {
      const roundMatch = log.match(/(\d+)/);
      const round = roundMatch ? parseInt(roundMatch[1]) : index + 1;
      events.push({
        type: 'round',
        round,
        timestamp,
      });
    }

    // Détecter les attaques
    else if (log.toLowerCase().includes('attaque') || log.toLowerCase().includes('attack')) {
      const isPlayerAttack = log.toLowerCase().includes('attaquant') || log.toLowerCase().includes('vous');
      events.push({
        type: 'attack',
        attacker: isPlayerAttack ? 'player' : 'enemy',
        target: isPlayerAttack ? 'enemy' : 'player',
        timestamp,
      });
    }

    // Détecter les dégâts
    else if (log.includes('dégât') || log.includes('damage') || log.includes('touché')) {
      const damageMatch = log.match(/(\d+)/);
      const damage = damageMatch ? parseInt(damageMatch[1]) : 100;
      events.push({
        type: 'damage',
        damage,
        timestamp,
      });
    }

    // Détecter les destructions
    else if (log.includes('détruit') || log.includes('destroyed') || log.includes('perdu')) {
      const destroyedMatch = log.match(/(\d+)/);
      const destroyed = destroyedMatch ? parseInt(destroyedMatch[1]) : 1;
      events.push({
        type: 'destroyed',
        destroyed,
        timestamp,
      });
    }

    // Détecter la fin
    else if (log.includes('victoire') || log.includes('défaite') || log.includes('victory') || log.includes('defeat')) {
      const isVictory = log.toLowerCase().includes('victoire') || log.toLowerCase().includes('victory');
      events.push({
        type: 'end',
        winner: isVictory ? 'player' : 'enemy',
        timestamp: timestamp + 1000,
      });
    }
  });

  return events;
};

export default function CombatReplay({ report, onClose }: CombatReplayProps) {
  const [currentEvent, setCurrentEvent] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerHP, setPlayerHP] = useState(100);
  const [enemyHP, setEnemyHP] = useState(100);
  const [explosions, setExplosions] = useState<{ id: number; x: number; y: number }[]>([]);
  const [events, setEvents] = useState<CombatEvent[]>([]);

  useEffect(() => {
    if (!report) return;

    // Parser le rapport
    const logs = report.log || report.logs || [];
    const parsedEvents = parseCombatLogs(logs);
    setEvents(parsedEvents);

    // Auto-play
    setIsPlaying(true);
  }, [report]);

  useEffect(() => {
    if (!isPlaying || currentEvent >= events.length) {
      setIsPlaying(false);
      return;
    }

    const event = events[currentEvent];
    const timer = setTimeout(() => {
      // Traiter l'événement
      if (event.type === 'damage') {
        const damage = event.damage || 10;
        if (event.target === 'player') {
          setPlayerHP(prev => Math.max(0, prev - damage));
        } else {
          setEnemyHP(prev => Math.max(0, prev - damage));
        }

        // Ajouter explosion
        const x = event.target === 'player' ? 20 : 80;
        const y = 50 + (Math.random() - 0.5) * 20;
        setExplosions(prev => [...prev, { id: Date.now(), x, y }]);
        setTimeout(() => {
          setExplosions(prev => prev.filter(e => e.id !== Date.now()));
        }, 1000);
      }

      setCurrentEvent(prev => prev + 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [isPlaying, currentEvent, events]);

  const reset = () => {
    setCurrentEvent(0);
    setPlayerHP(100);
    setEnemyHP(100);
    setExplosions([]);
    setIsPlaying(true);
  };

  if (!report) return null;

  const isVictory = report.winner === 'defender' || report.winner === 'player';
  const currentLog = events[currentEvent]?.type || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-slate-950 border border-white/10 card-depth">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isVictory ? 'bg-emerald-950/50 border border-emerald-500/30' : 'bg-red-950/50 border border-red-500/30'}`}>
                {isVictory ? <Trophy className="text-emerald-400" size={24} /> : <Skull className="text-red-400" size={24} />}
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase text-white">
                  {isVictory ? 'VICTOIRE' : 'DÉFAITE'}
                </h3>
                <p className="text-xs text-slate-500">Replay de Combat</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              Fermer
            </Button>
          </div>

          {/* Arena de Combat */}
          <div className="relative h-[400px] bg-slate-900/50 rounded-lg border border-white/5 overflow-hidden mb-6">
            {/* Background stars */}
            <div className="absolute inset-0">
              {[...Array(50)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full opacity-50"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                  }}
                />
              ))}
            </div>

            {/* Player Fleet (Left) */}
            <motion.div
              className="absolute left-[10%] top-1/2 -translate-y-1/2"
              initial={{ x: -200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 1 }}
            >
              <div className="relative">
                <Rocket size={80} className="text-indigo-400 transform rotate-90" />
                {/* HP Bar */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-24">
                  <div className="text-[10px] text-slate-400 mb-1 text-center">Votre Flotte</div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                      initial={{ width: '100%' }}
                      animate={{ width: `${playerHP}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="text-center text-xs font-mono font-bold text-indigo-400 mt-1">
                    {playerHP}%
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Enemy Fleet (Right) */}
            <motion.div
              className="absolute right-[10%] top-1/2 -translate-y-1/2"
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 1 }}
            >
              <div className="relative">
                <Rocket size={80} className="text-red-400 transform -rotate-90" />
                {/* HP Bar */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-24">
                  <div className="text-[10px] text-slate-400 mb-1 text-center">Ennemi</div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                    <motion.div
                      className="h-full bg-gradient-to-r from-red-500 to-orange-400"
                      initial={{ width: '100%' }}
                      animate={{ width: `${enemyHP}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="text-center text-xs font-mono font-bold text-red-400 mt-1">
                    {enemyHP}%
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Explosions */}
            <AnimatePresence>
              {explosions.map(explosion => (
                <motion.div
                  key={explosion.id}
                  className="absolute"
                  style={{
                    left: `${explosion.x}%`,
                    top: `${explosion.y}%`,
                  }}
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <Flame size={40} className="text-orange-500" />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Combat Effects */}
            {isPlaying && currentEvent < events.length && (
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Zap size={60} className="text-yellow-400 animate-pulse" />
              </motion.div>
            )}
          </div>

          {/* Combat Log */}
          <div className="bg-black/40 rounded-lg p-4 mb-4 border border-white/5 h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            <div className="space-y-1">
              {events.slice(0, currentEvent + 1).map((event, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs font-mono text-slate-400 flex items-center gap-2"
                >
                  {event.type === 'round' && (
                    <>
                      <Target size={12} className="text-indigo-400" />
                      <span className="text-indigo-400 font-bold">Round {event.round}</span>
                    </>
                  )}
                  {event.type === 'attack' && (
                    <>
                      <Zap size={12} className="text-yellow-400" />
                      <span>{event.attacker === 'player' ? 'Vous attaquez' : 'Ennemi attaque'}</span>
                    </>
                  )}
                  {event.type === 'damage' && (
                    <>
                      <TrendingDown size={12} className="text-red-400" />
                      <span className="text-red-400">{event.damage} dégâts infligés</span>
                    </>
                  )}
                  {event.type === 'destroyed' && (
                    <>
                      <Skull size={12} className="text-orange-400" />
                      <span className="text-orange-400">{event.destroyed} vaisseau(x) détruit(s)</span>
                    </>
                  )}
                  {event.type === 'end' && (
                    <>
                      {event.winner === 'player' ? (
                        <Trophy size={12} className="text-emerald-400" />
                      ) : (
                        <Skull size={12} className="text-red-400" />
                      )}
                      <span className={event.winner === 'player' ? 'text-emerald-400' : 'text-red-400'}>
                        {event.winner === 'player' ? 'VICTOIRE !' : 'DÉFAITE'}
                      </span>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              Événement {currentEvent + 1} / {events.length}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
                disabled={currentEvent === 0}
              >
                Rejouer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className="bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
            </div>
          </div>

          {/* Loot (si victoire) */}
          {isVictory && report.loot && (
            <div className="mt-4 bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="text-emerald-400" size={16} />
                <span className="text-sm font-bold text-emerald-300">Butin récupéré</span>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400">
                {report.loot?.toLocaleString() || 0} ressources
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
