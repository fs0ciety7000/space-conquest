// hooks/useTutorial.ts (ou là où il est défini)

import { useState, useEffect } from 'react';

// ✅ Version du tutoriel - changez uniquement si vous voulez forcer le re-affichage
const TUTORIAL_VERSION = "1.0.0";

export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const completedVersion = localStorage.getItem('tutorial_completed');
    
    // ✅ Afficher uniquement si jamais complété OU si version différente
    if (!completedVersion || completedVersion !== TUTORIAL_VERSION) {
      setShowTutorial(true);
    }
  }, []);

  const startTutorial = () => {
    setShowTutorial(true);
  };

  const completeTutorial = () => {
    // ✅ Sauvegarder avec la version
    localStorage.setItem('tutorial_completed', TUTORIAL_VERSION);
    setShowTutorial(false);
  };

  return {
    showTutorial,
    startTutorial,
    completeTutorial
  };
}
