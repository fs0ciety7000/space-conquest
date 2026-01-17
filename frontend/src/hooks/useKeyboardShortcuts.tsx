import { useEffect } from 'react';

export function useKeyboardShortcuts(onNavigate: (tab: string) => void) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignorer si dans un input/textarea ou modal ouvert
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        document.querySelector('[role="dialog"]')
      ) {
        return;
      }
      
      const key = e.key.toLowerCase();
      const shortcuts: Record<string, string> = {
        'h': 'overview',    // H pour Home
        'g': 'galaxy',      // G pour Galaxie
        'r': 'resources',   // R pour Ressources
        'i': 'facilities',  // I pour Installations
        't': 'tech',        // T pour Tech/Laboratoire
        'f': 'shipyard',    // F pour Flotte
        'd': 'defenses',    // D pour Défense
        'e': 'expedition',  // E pour Expédition
        'l': 'ranking',     // L pour Leaderboard/Classement
        'm': 'messages',    // M pour Messagerie
        'p': 'reports',     // P pour raPports
        's': 'settings',    // S pour Settings
      };
      
      if (shortcuts[key]) {
        e.preventDefault();
        onNavigate(shortcuts[key]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onNavigate]);
}
