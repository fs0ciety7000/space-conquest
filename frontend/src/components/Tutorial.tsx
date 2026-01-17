import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { useState, useEffect } from 'react';

const tutorialSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-2xl font-black text-indigo-400 mb-3">🚀 Bienvenue, Commandant !</h2>
        <p className="text-slate-300">Je vais vous guider à travers les commandes de votre empire galactique. Prêt pour la mission ?</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '.empire-bar',
    content: (
      <div>
        <h3 className="font-bold text-white mb-2">🏛️ Barre d'Empire</h3>
        <p className="text-slate-300">Vos ressources (Métal, Cristal, Deutérium) et énergie sont affichées ici. Surveillez-les de près !</p>
      </div>
    ),
  },
  {
    target: '[data-tour="resources"]',
    content: (
      <div>
        <h3 className="font-bold text-white mb-2">⛏️ Mines de Ressources</h3>
        <p className="text-slate-300">Construisez et améliorez vos mines pour augmenter votre production. Les ressources sont essentielles à votre expansion !</p>
      </div>
    ),
  },
  {
    target: '[data-tour="facilities"]',
    content: (
      <div>
        <h3 className="font-bold text-white mb-2">🏭 Installations</h3>
        <p className="text-slate-300">Développez vos infrastructures : Centrale, Hangar, Laboratoire, etc. Elles débloquent de nouvelles capacités.</p>
      </div>
    ),
  },
  {
    target: '[data-tour="shipyard"]',
    content: (
      <div>
        <h3 className="font-bold text-white mb-2">🔨 Chantier Spatial</h3>
        <p className="text-slate-300">Assemblez votre flotte de guerre : Chasseurs Légers pour l'exploration, Croiseurs pour les combats intenses !</p>
      </div>
    ),
  },
  {
    target: '[data-tour="defenses"]',
    content: (
      <div>
        <h3 className="font-bold text-white mb-2">🛡️ Défenses</h3>
        <p className="text-slate-300">Protégez votre base avec des Lanceurs et Canons. Une défense solide dissuade les attaques ennemies.</p>
      </div>
    ),
  },
  {
    target: '[data-tour="galaxy"]',
    content: (
      <div>
        <h3 className="font-bold text-white mb-2">🌌 Vue Galaxie</h3>
        <p className="text-slate-300">Explorez l'univers, repérez des cibles, espionnez vos adversaires et lancez des attaques stratégiques !</p>
      </div>
    ),
  },
  {
    target: '[data-tour="expedition"]',
    content: (
      <div>
        <h3 className="font-bold text-white mb-2">🔭 Expéditions</h3>
        <p className="text-slate-300">Envoyez votre flotte en mission pour découvrir des ressources ou combattre des pirates de l'espace !</p>
      </div>
    ),
  },
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-2xl font-black text-green-400 mb-3">✅ Mission Brief Terminée</h2>
        <p className="text-slate-300 mb-3">Vous êtes prêt à conquérir la galaxie ! Quelques astuces finales :</p>
        <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
          <li><kbd className="px-2 py-1 bg-slate-800 rounded text-indigo-300 font-mono">G</kbd> pour Galaxie</li>
          <li><kbd className="px-2 py-1 bg-slate-800 rounded text-indigo-300 font-mono">R</kbd> pour Ressources</li>
          <li><kbd className="px-2 py-1 bg-slate-800 rounded text-indigo-300 font-mono">F</kbd> pour Flotte</li>
          <li><kbd className="px-2 py-1 bg-slate-800 rounded text-indigo-300 font-mono">H</kbd> pour Accueil</li>
        </ul>
      </div>
    ),
    placement: 'center',
  },
];

interface TutorialProps {
  run: boolean;
  onComplete: () => void;
}

export function Tutorial({ run, onComplete }: TutorialProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;

    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      onComplete();
      setStepIndex(0);
    } else if (type === 'step:after' && action === 'next') {
      setStepIndex(index + 1);
    } else if (type === 'step:after' && action === 'prev') {
      setStepIndex(index - 1);
    }
  };

  return (
    <Joyride
      steps={tutorialSteps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      disableOverlayClose
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#6366f1',
          zIndex: 10000,
          backgroundColor: '#1e293b',
          textColor: '#e2e8f0',
          arrowColor: '#1e293b',
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
        },
        tooltipContent: {
          padding: '10px 0',
        },
        buttonNext: {
          backgroundColor: '#6366f1',
          borderRadius: 8,
          padding: '10px 20px',
          fontWeight: 'bold',
        },
        buttonBack: {
          color: '#94a3b8',
          marginRight: 10,
        },
        buttonSkip: {
          color: '#ef4444',
        },
      }}
      locale={{
        back: 'Retour',
        close: 'Fermer',
        last: 'Terminer',
        next: 'Suivant',
        skip: 'Passer',
      }}
    />
  );
}

export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      // Démarrer le tuto après 1 seconde
      const timer = setTimeout(() => setShowTutorial(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };

  const resetTutorial = () => {
    localStorage.removeItem('hasSeenTutorial');
    setShowTutorial(true);
  };

  return { showTutorial, completeTutorial, resetTutorial };
}
