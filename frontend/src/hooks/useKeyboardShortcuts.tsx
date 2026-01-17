import { useEffect } from 'react';

type TabType = 'overview' | 'galaxy' | 'resources' | 'facilities' | 'shipyard' | 'defenses' | 'tech' | 'expedition' | 'ranking' | 'reports' | 'settings' | 'messages';

interface ShortcutConfig {
  key: string;
  tab: TabType;
  description: string;
}

const SHORTCUTS: ShortcutConfig[] = [
  { key: 'h', tab: 'overview', description: 'Vue Générale (Home)' },
  { key: 'g', tab: 'galaxy', description: 'Galaxie' },
  { key: 'm', tab: 'messages', description: 'Messagerie' },
  { key: 'r', tab: 'resources', description: 'Ressources' },
  { key: 'i', tab: 'facilities', description: 'Installations' },
  { key: 't', tab: 'tech', description: 'Laboratoire (Tech)' },
  { key: 'f', tab: 'shipyard', description: 'Chantier Spatial (Flotte)' },
  { key: 'd', tab: 'defenses', description: 'Défenses' },
  { key: 'e', tab: 'expedition', description: 'Expéditions' },
  { key: 'l', tab: 'ranking', description: 'Classement (Leaderboard)' },
  { key: 'p', tab: 'reports', description: 'Raпorts' },
  { key: 's', tab: 'settings', description: 'Paramètres (Settings)' },
];

export function useKeyboardShortcuts(
  onNavigate: (tab: TabType) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignorer si l'utilisateur tape dans un champ de texte
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const shortcut = SHORTCUTS.find(s => s.key === key);

      if (shortcut) {
        e.preventDefault();
        onNavigate(shortcut.tab);
        
        // Feedback visuel optionnel
        const event = new CustomEvent('shortcut-used', { 
          detail: { key, tab: shortcut.tab, description: shortcut.description } 
        });
        window.dispatchEvent(event);
      }

      // Raccourci spécial : '?' pour afficher l'aide
      if (key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault();
        const event = new CustomEvent('show-shortcuts-help');
        window.dispatchEvent(event);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onNavigate, enabled]);

  return SHORTCUTS;
}

// Hook pour afficher le toast de raccourci utilisé
export function useShortcutFeedback() {
  useEffect(() => {
    const handleShortcutUsed = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { description } = customEvent.detail;
      
      // Créer un petit toast visuel
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-bold z-[9999] animate-in fade-in slide-in-from-right duration-200';
      toast.textContent = `⌨️ ${description}`;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('animate-out', 'fade-out', 'slide-out-to-right');
        setTimeout(() => toast.remove(), 200);
      }, 1500);
    };

    window.addEventListener('shortcut-used', handleShortcutUsed);
    return () => window.removeEventListener('shortcut-used', handleShortcutUsed);
  }, []);
}

// Composant modal d'aide aux raccourcis
export function ShortcutsHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-xl max-w-2xl w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-indigo-400">
            ⌨️ RACCOURCIS CLAVIER
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {SHORTCUTS.map(({ key, description }) => (
            <div 
              key={key}
              className="flex items-center justify-between bg-slate-800/50 px-4 py-3 rounded-lg border border-slate-700/30 hover:border-indigo-500/30 transition-colors"
            >
              <span className="text-slate-300 text-sm">{description}</span>
              <kbd className="px-3 py-1 bg-slate-950 border border-slate-600 rounded text-indigo-400 font-mono font-bold text-sm shadow-inner">
                {key.toUpperCase()}
              </kbd>
            </div>
          ))}
        </div>

        <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-lg p-4">
          <p className="text-sm text-slate-400">
            <span className="font-bold text-indigo-400">💡 Astuce :</span> Appuyez sur{' '}
            <kbd className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-indigo-300 font-mono text-xs">?</kbd>
            {' '}pour afficher cette aide à tout moment.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
        >
          Compris !
        </button>
      </div>
    </div>
  );
}