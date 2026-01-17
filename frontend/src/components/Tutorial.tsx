import { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from 'react-joyride';
import { toast } from 'sonner';

interface TutorialProps {
  run: boolean;
  onComplete: () => void;
}

const tutorialSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div className="space-y-3">
        <h2 className="text-xl font-black text-indigo-400">🚀 Bienvenue, Commandant !</h2>
        <p className="text-sm text-slate-300">
          Vous venez de prendre le commandement d'une nouvelle colonie spatiale. 
          Ce tutoriel vous guidera à travers les fondamentaux de Space Conquest.
        </p>
        <p className="text-xs text-slate-500 italic">
          💡 Vous pouvez sauter le tutoriel à tout moment avec le bouton "Passer".
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="empire-bar"]',
    content: (
      <div className="space-y-2">
        <h3 className="font-bold text-indigo-400">🏛️ Barre d'Empire</h3>
        <p className="text-sm text-slate-300">
          Voici votre tableau de bord principal. Il affiche vos ressources en temps réel et 
          l'accès à vos différentes planètes.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="resources"]',
    content: (
      <div className="space-y-2">
        <h3 className="font-bold text-orange-400">⛏️ Mines de Ressources</h3>
        <p className="text-sm text-slate-300">
          Les mines produisent le Métal, le Cristal et le Deutérium. 
          <strong className="text-orange-300"> Améliorez-les</strong> pour augmenter votre production.
        </p>
        <div className="bg-orange-950/30 border border-orange-500/30 rounded p-2 text-xs">
          💡 <strong>Conseil :</strong> Concentrez-vous d'abord sur le Métal, c'est la ressource de base !
        </div>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="facilities"]',
    content: (
      <div className="space-y-2">
        <h3 className="font-bold text-cyan-400">🏭 Installations</h3>
        <p className="text-sm text-slate-300">
          Les installations améliorent votre planète : stockage, énergie solaire, usine de robots...
        </p>
        <p className="text-xs text-cyan-300">
          L'<strong>Usine de Robots</strong> réduit le temps de construction !
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="shipyard"]',
    content: (
      <div className="space-y-2">
        <h3 className="font-bold text-purple-400">🛸 Chantier Spatial</h3>
        <p className="text-sm text-slate-300">
          Construisez votre flotte de guerre ici. Les <strong>Chasseurs Légers</strong> sont 
          rapides et peu coûteux, parfaits pour débuter.
        </p>
        <div className="bg-purple-950/30 border border-purple-500/30 rounded p-2 text-xs">
          ⚠️ Une flotte puissante est essentielle pour défendre votre base et attaquer vos ennemis !
        </div>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="galaxy"]',
    content: (
      <div className="space-y-2">
        <h3 className="font-bold text-indigo-400">🌌 Carte Galactique</h3>
        <p className="text-sm text-slate-300">
          Explorez la galaxie, scannez les planètes ennemies et lancez des attaques pour piller 
          leurs ressources.
        </p>
        <p className="text-xs text-indigo-300">
          🔍 Utilisez l'espionnage avant d'attaquer pour évaluer la défense ennemie !
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="tech"]',
    content: (
      <div className="space-y-2">
        <h3 className="font-bold text-green-400">🧪 Laboratoire</h3>
        <p className="text-sm text-slate-300">
          Les technologies débloquent de nouvelles capacités : vaisseaux plus puissants, 
          défenses avancées, vitesse de flotte...
        </p>
        <p className="text-xs text-green-300">
          Chaque recherche ouvre de nouvelles possibilités stratégiques !
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: 'body',
    content: (
      <div className="space-y-4">
        <h2 className="text-xl font-black text-indigo-400">🎓 Tutoriel Terminé !</h2>
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            Vous avez maintenant les bases pour débuter votre conquête spatiale !
          </p>
          <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-lg p-3">
            <p className="font-bold text-indigo-300 mb-2">✨ Prochaines étapes :</p>
            <ul className="space-y-1 text-xs list-disc list-inside">
              <li>Améliorez vos mines de ressources</li>
              <li>Construisez une première flotte de Chasseurs</li>
              <li>Lancez une expédition pour tester le combat</li>
              <li>Explorez la galaxie et repérez des cibles</li>
            </ul>
          </div>
          <div className="bg-purple-950/30 border border-purple-500/30 rounded-lg p-3">
            <p className="font-bold text-purple-300 mb-2">⌨️ Raccourcis Clavier :</p>
            <p className="text-xs text-slate-400">
              Appuyez sur <kbd className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-indigo-300 font-mono text-xs">?</kbd> 
              {' '}pour afficher tous les raccourcis disponibles !
            </p>
          </div>
        </div>
      </div>
    ),
    placement: 'center',
  },
];

export function Tutorial({ run, onComplete }: TutorialProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;

    // Navigation entre les étapes
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (type === EVENTS.STEP_AFTER ? 1 : 0));
    }

    // Complétion ou skip du tutoriel
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setStepIndex(0);
      onComplete();
      
      if (status === STATUS.FINISHED) {
        toast.success("🎓 Tutoriel terminé !", {
          description: "Vous êtes prêt à conquérir la galaxie !"
        });
      } else {
        toast.info("👋 Tutoriel sauté", {
          description: "Vous pouvez le relancer depuis les Paramètres"
        });
      }
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
      scrollToFirstStep
      disableScrolling={false}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          arrowColor: '#1e293b',
          backgroundColor: '#1e293b',
          overlayColor: 'rgba(0, 0, 0, 0.7)',
          primaryColor: '#6366f1',
          textColor: '#e2e8f0',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#6366f1',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 'bold',
          padding: '10px 20px',
        },
        buttonBack: {
          color: '#94a3b8',
          fontSize: 14,
          marginRight: 10,
        },
        buttonSkip: {
          color: '#64748b',
          fontSize: 13,
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

// Hook pour gérer l'état du tutoriel
export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Vérifier si c'est la première visite
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      // Démarrer le tutoriel après un court délai
      const timer = setTimeout(() => setShowTutorial(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTutorial = () => setShowTutorial(true);
  
  const completeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };

  return { showTutorial, startTutorial, completeTutorial };
}