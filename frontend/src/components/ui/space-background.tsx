import { useEffect, useState, useMemo, memo } from 'react';

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

const StarField = memo(({ count = 80 }: { count?: number }) => {
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.3,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 4,
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            ['--star-opacity' as string]: star.opacity,
            animation: `twinkle ${star.duration}s ${star.delay}s ease-in-out infinite`,
            willChange: 'opacity',
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
      <div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(168,85,247,0.2) 40%, transparent 70%)',
          left: '-10%',
          top: '-20%',
          filter: 'blur(60px)',
          animation: 'nebula-pulse 15s ease-in-out infinite',
          willChange: 'opacity, transform',
        }}
      />
      {/* Nébuleuse secondaire - cyan */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0,245,255,0.3) 0%, rgba(6,182,212,0.15) 40%, transparent 70%)',
          right: '-5%',
          bottom: '-10%',
          filter: 'blur(50px)',
          animation: 'nebula-pulse 12s 3s ease-in-out infinite',
          willChange: 'opacity, transform',
        }}
      />
      {/* Nébuleuse tertiaire - magenta */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,0,255,0.2) 0%, rgba(236,72,153,0.1) 40%, transparent 70%)',
          right: '20%',
          top: '10%',
          filter: 'blur(40px)',
          opacity: 0.1,
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

const FloatingParticles = memo(({ count = 15 }: { count?: number }) => {
  const colors = ['#00f5ff', '#a855f7', '#6366f1', '#22c55e', '#f59e0b'];

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 10 + 15,
      delay: Math.random() * 10,
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            width: particle.size,
            height: particle.size,
            background: particle.color,
            // No boxShadow — paint operation, too expensive
            animation: `particle-rise ${particle.duration}s ${particle.delay}s linear infinite`,
            willChange: 'transform, opacity',
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
    <div
      className="absolute left-0 w-full h-[2px] pointer-events-none z-10"
      style={{
        background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.4), transparent)',
        animation: 'scan-line 8s linear infinite',
        willChange: 'top',
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
    <div
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
        animation: animate ? 'nebula-pulse 8s ease-in-out infinite' : undefined,
        willChange: animate ? 'opacity, transform' : undefined,
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
        <div
          className="absolute inset-0 rounded-full border-2 border-cyan-500/30"
          style={{ animation: 'orbit 3s linear infinite' }}
        />
        {/* Anneau interne */}
        <div
          className="absolute inset-2 rounded-full border-2 border-purple-500/50"
          style={{ animation: 'orbit 2s linear infinite reverse' }}
        />
        {/* Point central */}
        <div
          className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-cyan-400"
          style={{ boxShadow: '0 0 10px #00f5ff', animation: 'pulse-ring 1s ease-in-out infinite' }}
        />
      </div>
      {text && (
        <p
          className="text-sm text-cyan-400 font-mono tracking-wider"
          style={{ animation: 'twinkle 2s ease-in-out infinite' }}
        >
          {text}
        </p>
      )}
    </div>
  );
}

export { StarField, Nebulae, FloatingParticles, ScanLine, TechGrid };
