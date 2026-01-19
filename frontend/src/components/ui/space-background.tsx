import { useEffect, useState, useMemo, memo } from 'react';
import { motion } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT ÉTOILES SCINTILLANTES
// ═══════════════════════════════════════════════════════════════════════════
interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
}

const StarField = memo(({ count = 100 }: { count?: number }) => {
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.3,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          animate={{
            opacity: [star.opacity, star.opacity * 0.3, star.opacity],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
});

StarField.displayName = 'StarField';

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT NÉBULEUSES
// ═══════════════════════════════════════════════════════════════════════════
const Nebulae = memo(() => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Nébuleuse principale - violet/bleu */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(168,85,247,0.2) 40%, transparent 70%)',
          left: '-10%',
          top: '-20%',
          filter: 'blur(60px)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Nébuleuse secondaire - cyan */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(0,245,255,0.3) 0%, rgba(6,182,212,0.15) 40%, transparent 70%)',
          right: '-5%',
          bottom: '-10%',
          filter: 'blur(50px)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 12,
          delay: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Nébuleuse tertiaire - magenta */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, rgba(255,0,255,0.2) 0%, rgba(236,72,153,0.1) 40%, transparent 70%)',
          right: '20%',
          top: '10%',
          filter: 'blur(40px)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 20,
          delay: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
});

Nebulae.displayName = 'Nebulae';

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT PARTICULES FLOTTANTES
// ═══════════════════════════════════════════════════════════════════════════
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

const FloatingParticles = memo(({ count = 30 }: { count?: number }) => {
  const colors = ['#00f5ff', '#a855f7', '#6366f1', '#22c55e', '#f59e0b'];
  
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 10 + 15,
      delay: Math.random() * 5,
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            width: particle.size,
            height: particle.size,
            background: particle.color,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
          }}
          initial={{ y: '100vh', opacity: 0 }}
          animate={{
            y: '-10vh',
            opacity: [0, 0.8, 0.8, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
});

FloatingParticles.displayName = 'FloatingParticles';

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT LIGNE DE SCAN
// ═══════════════════════════════════════════════════════════════════════════
const ScanLine = memo(() => {
  return (
    <motion.div
      className="absolute left-0 w-full h-[2px] pointer-events-none z-10"
      style={{
        background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.4), transparent)',
        boxShadow: '0 0 20px rgba(0,245,255,0.3)',
      }}
      animate={{
        top: ['-5%', '105%'],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
});

ScanLine.displayName = 'ScanLine';

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT GRILLE TECH
// ═══════════════════════════════════════════════════════════════════════════
const TechGrid = memo(() => {
  return (
    <div 
      className="absolute inset-0 pointer-events-none opacity-[0.03]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
      }}
    />
  );
});

TechGrid.displayName = 'TechGrid';

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL - FOND SPATIAL
// ═══════════════════════════════════════════════════════════════════════════
interface SpaceBackgroundProps {
  showStars?: boolean;
  showNebulae?: boolean;
  showParticles?: boolean;
  showScanLine?: boolean;
  showGrid?: boolean;
  starCount?: number;
  particleCount?: number;
  className?: string;
}

export function SpaceBackground({
  showStars = true,
  showNebulae = true,
  showParticles = true,
  showScanLine = false,
  showGrid = true,
  starCount = 80,
  particleCount = 20,
  className = '',
}: SpaceBackgroundProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={`fixed inset-0 z-0 overflow-hidden ${className}`}>
      {/* Fond de base avec dégradé spatial */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(168,85,247,0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(6,182,212,0.05) 0%, transparent 70%),
            linear-gradient(180deg, #030014 0%, #0a0520 50%, #05081f 100%)
          `,
        }}
      />
      
      {/* Couches d'effets */}
      {showGrid && <TechGrid />}
      {showNebulae && <Nebulae />}
      {showStars && <StarField count={starCount} />}
      {showParticles && <FloatingParticles count={particleCount} />}
      {showScanLine && <ScanLine />}
      
      {/* Overlay de vignette */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT EFFET DE HALO
// ═══════════════════════════════════════════════════════════════════════════
interface GlowOrbProps {
  color?: string;
  size?: number;
  x?: string;
  y?: string;
  blur?: number;
  opacity?: number;
  animate?: boolean;
}

export function GlowOrb({
  color = 'rgba(99,102,241,0.4)',
  size = 300,
  x = '50%',
  y = '50%',
  blur = 60,
  opacity = 0.3,
  animate = true,
}: GlowOrbProps) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: `blur(${blur}px)`,
        opacity,
      }}
      animate={animate ? {
        scale: [1, 1.2, 1],
        opacity: [opacity, opacity * 1.5, opacity],
      } : undefined}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT INDICATEUR DE CHARGEMENT SPATIAL
// ═══════════════════════════════════════════════════════════════════════════
export function SpaceLoader({ size = 40, text = "Chargement..." }: { size?: number; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Anneau externe */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-cyan-500/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Anneau interne */}
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-purple-500/50"
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Point central */}
        <motion.div
          className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-cyan-400"
          style={{ boxShadow: '0 0 10px #00f5ff' }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        
        {/* Orbes orbitaux */}
        {[0, 120, 240].map((angle, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400"
            style={{
              top: '50%',
              left: '50%',
              boxShadow: '0 0 6px #00f5ff',
            }}
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.3,
            }}
            initial={{
              rotate: angle,
              x: -size / 4,
              y: -3,
            }}
          />
        ))}
      </div>
      
      {text && (
        <motion.p
          className="text-sm text-cyan-400 font-mono tracking-wider"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

export { StarField, Nebulae, FloatingParticles, ScanLine, TechGrid };
