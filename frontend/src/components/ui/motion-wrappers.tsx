import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// VARIANTES D'ANIMATION PRÉDÉFINIES
// ═══════════════════════════════════════════════════════════════════════════

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const slideDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const slideLeft: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const slideRight: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const scaleUp: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export const scaleDown: Variants = {
  initial: { opacity: 0, scale: 1.1 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.1 },
};

export const glowPulse: Variants = {
  initial: { boxShadow: '0 0 0 rgba(0, 245, 255, 0)' },
  animate: {
    boxShadow: [
      '0 0 0 rgba(0, 245, 255, 0)',
      '0 0 20px rgba(0, 245, 255, 0.4)',
      '0 0 0 rgba(0, 245, 255, 0)',
    ],
  },
};

// Animation stagger pour les listes
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT PAGE TRANSITION
// ═══════════════════════════════════════════════════════════════════════════

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT FADE WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

interface FadeWrapperProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeWrapper({ children, delay = 0, duration = 0.3, className = '' }: FadeWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT SLIDE WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

interface SlideWrapperProps {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
  className?: string;
}

export function SlideWrapper({ 
  children, 
  direction = 'up', 
  delay = 0, 
  duration = 0.4,
  className = '' 
}: SlideWrapperProps) {
  const directions = {
    up: { y: 30, x: 0 },
    down: { y: -30, x: 0 },
    left: { x: 30, y: 0 },
    right: { x: -30, y: 0 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay, duration, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT SCALE WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

interface ScaleWrapperProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function ScaleWrapper({ children, delay = 0, duration = 0.3, className = '' }: ScaleWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT STAGGER LIST
// ═══════════════════════════════════════════════════════════════════════════

interface StaggerListProps {
  children: ReactNode[];
  staggerDelay?: number;
  className?: string;
  itemClassName?: string;
}

export function StaggerList({ 
  children, 
  staggerDelay = 0.1, 
  className = '',
  itemClassName = ''
}: StaggerListProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      className={className}
      variants={{
        initial: {},
        animate: {
          transition: { staggerChildren: staggerDelay },
        },
      }}
    >
      {children.map((child, index) => (
        <motion.div
          key={index}
          className={itemClassName}
          variants={{
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT HOVER SCALE
// ═══════════════════════════════════════════════════════════════════════════

interface HoverScaleProps {
  children: ReactNode;
  scale?: number;
  className?: string;
}

export function HoverScale({ children, scale = 1.02, className = '' }: HoverScaleProps) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT HOVER GLOW
// ═══════════════════════════════════════════════════════════════════════════

interface HoverGlowProps {
  children: ReactNode;
  color?: string;
  className?: string;
}

export function HoverGlow({ children, color = 'rgba(0, 245, 255, 0.3)', className = '' }: HoverGlowProps) {
  return (
    <motion.div
      whileHover={{
        boxShadow: `0 0 30px ${color}`,
        transition: { duration: 0.3 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT PULSE
// ═══════════════════════════════════════════════════════════════════════════

interface PulseProps {
  children: ReactNode;
  duration?: number;
  className?: string;
}

export function Pulse({ children, duration = 2, className = '' }: PulseProps) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.02, 1],
        opacity: [1, 0.9, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT FLOATING
// ═══════════════════════════════════════════════════════════════════════════

interface FloatingProps {
  children: ReactNode;
  duration?: number;
  distance?: number;
  className?: string;
}

export function Floating({ children, duration = 4, distance = 10, className = '' }: FloatingProps) {
  return (
    <motion.div
      animate={{
        y: [-distance / 2, distance / 2, -distance / 2],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT TYPING TEXT
// ═══════════════════════════════════════════════════════════════════════════

interface TypingTextProps {
  text: string;
  className?: string;
  speed?: number;
}

export function TypingText({ text, className = '', speed = 50 }: TypingTextProps) {
  return (
    <motion.span className={className}>
      {text.split('').map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * (speed / 1000) }}
        >
          {char}
        </motion.span>
      ))}
      <motion.span
        className="inline-block w-2 h-5 bg-cyan-400 ml-1"
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      />
    </motion.span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT COUNTER ANIMATION
// ═══════════════════════════════════════════════════════════════════════════

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  formatFn?: (n: number) => string;
}

export function AnimatedCounter({ 
  value, 
  duration = 1, 
  className = '',
  formatFn = (n) => Math.floor(n).toLocaleString()
}: AnimatedCounterProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={value}
    >
      <motion.span
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {formatFn(value)}
      </motion.span>
    </motion.span>
  );
}

// Export AnimatePresence pour utilisation externe
export { AnimatePresence, motion };
