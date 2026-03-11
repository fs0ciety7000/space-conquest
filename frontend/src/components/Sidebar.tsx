import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Keyboard, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  category: string;
  onClick?: () => void;
}

interface SidebarProps {
  menuItems: MenuItem[];
  activeTab: string;
  unreadMessagesCount: number;
  onTabChange: (tab: string) => void;
  onShowShortcuts: () => void;
  playSound: (sound: string) => void;
  isMobile?: boolean;
  onClose?: () => void;
}

// Category accent colors (CSS vars or static hex — avoids Tailwind JIT purging)
const categoryConfig: Record<string, { color: string; glow: string }> = {
  COMMANDEMENT: { color: 'var(--neon-cyan)',    glow: 'rgba(0,245,255,0.15)' },
  COMMUNICATION: { color: '#38bdf8',            glow: 'rgba(56,189,248,0.15)' },
  DÉVELOPPEMENT:  { color: '#22c55e',            glow: 'rgba(34,197,94,0.15)' },
  ÉCONOMIE:       { color: '#f59e0b',            glow: 'rgba(245,158,11,0.15)' },
  MILITAIRE:      { color: '#ef4444',            glow: 'rgba(239,68,68,0.15)' },
  ESPIONNAGE:     { color: '#a855f7',            glow: 'rgba(168,85,247,0.15)' },
  DONNÉES:        { color: '#94a3b8',            glow: 'rgba(148,163,184,0.10)' },
  SYSTÈME:        { color: '#71717a',            glow: 'rgba(113,113,122,0.10)' },
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
};

export function Sidebar({
  menuItems,
  activeTab,
  unreadMessagesCount,
  onTabChange,
  onShowShortcuts,
  playSound,
  isMobile = false,
  onClose,
}: SidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['COMMANDEMENT', 'MILITAIRE', 'ESPIONNAGE'])
  );

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
    playSound('click');
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.onClick) {
      item.onClick();
      if (isMobile && onClose) onClose();
    } else {
      onTabChange(item.id);
    }
    playSound('click');
  };

  const categories = [
    'COMMANDEMENT',
    'COMMUNICATION',
    'DÉVELOPPEMENT',
    'ÉCONOMIE',
    'MILITAIRE',
    'ESPIONNAGE',
    'DONNÉES',
    'SYSTÈME',
  ];

  return (
    <motion.div
      className="flex flex-col h-full border-r border-cyan-500/10 backdrop-blur-[12px]"
      style={{ background: 'rgba(10,5,32,0.85)' }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {/* Header mobile */}
      {isMobile && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/10">
          <span className="hud-label text-cyan-400 tracking-[0.2em]">NAVIGATION</span>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-cyan-500/5 rounded transition-colors"
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>
      )}

      {/* Catégories */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {categories.map(category => {
          const items = menuItems.filter(item => item.category === category);
          if (items.length === 0) return null;

          const isExpanded = expandedCategories.has(category);
          const cfg = categoryConfig[category] ?? { color: '#94a3b8', glow: 'rgba(148,163,184,0.1)' };

          return (
            <div key={category}>
              {/* Header de catégorie */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] transition-all duration-200 hover:bg-cyan-500/5 group"
                style={{ color: isExpanded ? cfg.color : '#475569' }}
              >
                <span className="flex items-center gap-1.5">
                  <motion.span
                    animate={{ rotate: isExpanded ? 0 : -90 }}
                    transition={{ duration: 0.18 }}
                    className="inline-flex"
                  >
                    <ChevronDown size={12} />
                  </motion.span>
                  {category}
                </span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                  style={
                    isExpanded
                      ? { background: cfg.glow, color: cfg.color }
                      : { background: 'rgba(71,85,105,0.2)', color: '#475569' }
                  }
                >
                  {items.length}
                </span>
              </button>

              {/* Items */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="items"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <motion.div
                      className="space-y-0.5 pl-1 pt-0.5 pb-1"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {items.map(item => {
                        const isActive = activeTab === item.id;
                        return (
                          <motion.button
                            key={item.id}
                            data-tour={item.id}
                            onClick={() => handleItemClick(item)}
                            variants={itemVariants}
                            whileHover={{ x: 3 }}
                            whileTap={{ scale: 0.97 }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200 relative overflow-hidden group ${
                              isActive
                                ? 'bg-cyan-500/10 border-l-2 border-cyan-500/60 text-cyan-400'
                                : 'text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/5 hover:border-l-2 hover:border-cyan-500/50 border-l-2 border-transparent'
                            }`}
                          >
                            {/* Icon */}
                            <div className="relative shrink-0">
                              <item.icon
                                size={14}
                                style={
                                  isActive
                                    ? { color: cfg.color, filter: `drop-shadow(0 0 6px ${cfg.color})` }
                                    : {}
                                }
                                className={`transition-all duration-200 ${
                                  !isActive ? 'group-hover:text-cyan-400' : ''
                                }`}
                              />
                              {item.id === 'messages' && unreadMessagesCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                                </span>
                              )}
                            </div>

                            <span className="flex-1 text-left">{item.label}</span>

                            {/* Active indicator dot */}
                            {isActive && (
                              <span
                                className="shrink-0 w-1 h-1 rounded-full"
                                style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }}
                              />
                            )}
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-cyan-500/10 space-y-2">
        <button
          onClick={onShowShortcuts}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 hud-label text-cyan-600 hover:text-cyan-400 hover:bg-cyan-500/5 transition-colors border border-cyan-500/10 hover:border-cyan-500/30"
        >
          <Keyboard size={13} /> RACCOURCIS (?)
        </button>

        {!isMobile && (
          <p className="text-center text-[9px] text-slate-700 font-mono pt-1">
            PROPULSÉ PAR <span className="text-orange-600">RUST</span>
          </p>
        )}
      </div>
    </motion.div>
  );
}
