import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Keyboard, X } from 'lucide-react';
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
  // État des catégories ouvertes/fermées
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['COMMANDEMENT', 'MILITAIRE', 'ESPIONNAGE']) // Catégories ouvertes par défaut
  );

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
    playSound('click');
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.onClick) {
      item.onClick();
      if (isMobile && onClose) onClose();
      playSound('click');
    } else {
      onTabChange(item.id);
    }
  };

  // Regrouper les items par catégorie
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

  // Configuration des catégories avec icônes et couleurs
  const categoryConfig: Record<string, { color: string; gradient: string }> = {
    COMMANDEMENT: { color: 'indigo', gradient: 'from-indigo-600 to-purple-600' },
    COMMUNICATION: { color: 'cyan', gradient: 'from-cyan-600 to-blue-600' },
    DÉVELOPPEMENT: { color: 'emerald', gradient: 'from-emerald-600 to-green-600' },
    ÉCONOMIE: { color: 'amber', gradient: 'from-amber-600 to-orange-600' },
    MILITAIRE: { color: 'red', gradient: 'from-red-600 to-rose-600' },
    ESPIONNAGE: { color: 'violet', gradient: 'from-violet-600 to-purple-600' },
    DONNÉES: { color: 'slate', gradient: 'from-slate-600 to-gray-600' },
    SYSTÈME: { color: 'zinc', gradient: 'from-zinc-600 to-stone-600' },
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header mobile */}
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>
      )}

      {/* Catégories */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-900/50 scrollbar-track-transparent p-4 space-y-2">
        {categories.map(category => {
          const items = menuItems.filter(item => item.category === category);
          if (items.length === 0) return null;

          const isExpanded = expandedCategories.has(category);
          const config = categoryConfig[category];

          return (
            <div key={category} className="space-y-1">
              {/* Header de catégorie */}
              <button
                onClick={() => toggleCategory(category)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 hover:bg-white/5 group ${
                  isExpanded ? `text-${config.color}-400` : 'text-slate-500'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown size={14} className="transition-transform" />
                  ) : (
                    <ChevronRight size={14} className="transition-transform" />
                  )}
                  {category}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  isExpanded ? `bg-${config.color}-500/20 text-${config.color}-400` : 'bg-slate-700/30 text-slate-500'
                }`}>
                  {items.length}
                </span>
              </button>

              {/* Items de la catégorie */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-0.5 pl-2">
                      {items.map(item => {
                        const isActive = activeTab === item.id;
                        return (
                          <motion.button
                            key={item.id}
                            data-tour={item.id}
                            onClick={() => handleItemClick(item)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase transition-all duration-200 group relative overflow-hidden ${
                              isActive
                                ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg shadow-${config.color}-500/30`
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="relative">
                              <item.icon
                                size={16}
                                className={`transition-all duration-300 ${
                                  isActive
                                    ? 'scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]'
                                    : 'group-hover:scale-110 group-hover:text-cyan-400'
                                }`}
                              />

                              {/* Badge messages non lus */}
                              {item.id === 'messages' && unreadMessagesCount > 0 && (
                                <>
                                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                  </span>
                                </>
                              )}
                            </div>

                            <span className="relative z-10 flex-1 text-left">{item.label}</span>

                            {isActive && (
                              <>
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-400/15 to-indigo-500/0 opacity-50 animate-shimmer"></div>
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 rounded-r shadow-[0_0_10px_rgba(0,245,255,0.8)]"></div>
                              </>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 space-y-3">
        {/* Bouton aide raccourcis */}
        <button
          onClick={onShowShortcuts}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-indigo-950/30 text-indigo-400 hover:bg-indigo-900/40 hover:text-indigo-300 transition-colors text-xs font-bold uppercase border border-indigo-900/30"
        >
          <Keyboard size={16} /> Raccourcis (?)
        </button>

        {/* Crédits */}
        {!isMobile && (
          <div className="text-center pt-3 border-t border-white/5">
            <p className="text-[10px] text-slate-600">
              Propulsé par <span className="font-bold text-orange-400">🦀 Rust</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
