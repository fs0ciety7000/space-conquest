import { useEffect } from 'react';

type TabType = 'overview' | 'galaxy' | 'resources' | 'facilities' | 'shipyard' | 'defenses' | 'tech' | 'expedition' | 'ranking' | 'reports' | 'settings' | 'messages';

export function useKeyboardShortcuts(onNavigate: (tab: TabType) => void) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignorer si dans un input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const key = e.key.toLowerCase();
      const shortcuts: Record<string, TabType> = {
        'g': 'galaxy',
        'r': 'resources',
        'f': 'shipyard',    // F pour Flotte
        'i': 'facilities',  // I pour Installations
        't': 'tech',
        'd': 'defenses',
        'e': 'expedition',
        'l': 'ranking',     // L pour Leaderboard
        'm': 'messages',
        's': 'settings',
        'h': 'overview',    // H pour Home
        'o': 'overview',    // O pour Overview
        'p': 'reports',     // P pour raPports
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
