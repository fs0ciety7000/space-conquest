# 🎓 Tutoriel Interactif - Space Conquest

## Vue d'ensemble

Le tutoriel interactif guide les nouveaux joueurs à travers les fonctionnalités principales du jeu en utilisant [react-joyride](https://docs.react-joyride.com/).

## Fonctionnalités

### ✨ Caractéristiques

- **Lancement automatique** : Se déclenche automatiquement pour les nouveaux joueurs (1,5s après le chargement)
- **8 étapes guidées** : Couvre tous les aspects fondamentaux du jeu
- **Navigation fluide** : Boutons Précédent/Suivant/Passer
- **Progression visuelle** : Indicateur d'étape (1/8, 2/8, etc.)
- **Relancement manuel** : Depuis les Paramètres
- **Mémorisation** : Stockage dans localStorage pour ne montrer qu'une fois
- **Design personnalisé** : Thème sombre aligné avec l'UI du jeu

## 📍 Étapes du Tutoriel

| Étape | Cible | Contenu |
|-------|-------|----------|
| 1 | Bienvenue | Introduction générale au jeu |
| 2 | `empire-bar` | Explication de la barre d'empire et ressources |
| 3 | `resources` | Importance des mines et stratégie de développement |
| 4 | `facilities` | Rôle des installations (stockage, énergie, robots) |
| 5 | `shipyard` | Construction de la flotte de guerre |
| 6 | `galaxy` | Exploration et combats dans la galaxie |
| 7 | `tech` | Arbres de recherche et technologies |
| 8 | Récapitulatif | Prochaines étapes + raccourcis clavier |

## 🛠️ Architecture

### Fichiers

```
frontend/src/
├── components/
│   └── Tutorial.tsx          # Composant principal + hook useTutorial
└── App.tsx                 # Intégration du tutoriel
```

### Composants

#### `<Tutorial />`

Composant wrapper autour de `react-joyride` avec styles personnalisés.

**Props :**
```typescript
interface TutorialProps {
  run: boolean;           // Activer/désactiver le tutoriel
  onComplete: () => void; // Callback à la fin/skip
}
```

**Exemple :**
```tsx
import { Tutorial, useTutorial } from './components/Tutorial';

function App() {
  const { showTutorial, startTutorial, completeTutorial } = useTutorial();
  
  return (
    <>
      <button onClick={startTutorial}>Relancer tutoriel</button>
      <Tutorial run={showTutorial} onComplete={completeTutorial} />
    </>
  );
}
```

#### `useTutorial()` Hook

Gère l'état et la logique du tutoriel.

**Retour :**
```typescript
{
  showTutorial: boolean;        // État d'affichage
  startTutorial: () => void;    // Démarrer manuellement
  completeTutorial: () => void; // Marquer comme terminé
}
```

**Comportement :**
- Vérifie `localStorage.getItem('hasSeenTutorial')`
- Si `null`, lance automatiquement après 1,5s
- Après complétion, stocke `hasSeenTutorial: 'true'`

## 🎨 Personnalisation

### Styles

Les styles sont configurés dans le prop `styles` de Joyride :

```typescript
styles={{
  options: {
    arrowColor: '#1e293b',      // Slate-800
    backgroundColor: '#1e293b',  // Slate-800
    overlayColor: 'rgba(0, 0, 0, 0.7)',
    primaryColor: '#6366f1',     // Indigo-500
    textColor: '#e2e8f0',        // Slate-200
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: 12,
    padding: 20,
  },
  buttonNext: {
    backgroundColor: '#6366f1',  // Bouton Suivant
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
}}
```

### Textes

Localisation française configurée :

```typescript
locale={{
  back: 'Retour',
  close: 'Fermer',
  last: 'Terminer',
  next: 'Suivant',
  skip: 'Passer',
}}
```

## 📝 Ajouter des Étapes

### 1. Définir le Step

```typescript
const tutorialSteps: Step[] = [
  // ... autres steps
  {
    target: '[data-tour="new-feature"]', // Sélecteur CSS
    content: (
      <div className="space-y-2">
        <h3 className="font-bold text-blue-400">🆕 Titre</h3>
        <p className="text-sm text-slate-300">
          Description de la fonctionnalité.
        </p>
      </div>
    ),
    placement: 'right', // top, bottom, left, right, auto
  },
];
```

### 2. Ajouter l'attribut data-tour

Dans le composant cible :

```tsx
<button data-tour="new-feature" onClick={...}>
  Ma Fonctionnalité
</button>
```

### 3. Types de Contenu

**Simple :**
```tsx
content: "Texte simple"
```

**Rich (recommandé) :**
```tsx
content: (
  <div className="space-y-3">
    <h2 className="text-xl font-black text-indigo-400">
      🚀 Titre Principal
    </h2>
    <p className="text-sm text-slate-300">
      Explication détaillée avec <strong>emphase</strong>.
    </p>
    <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-lg p-3">
      <p className="text-xs text-indigo-300">
        💡 <strong>Conseil :</strong> Info importante !
      </p>
    </div>
  </div>
)
```

## 🔧 Configuration Avancée

### Modifier le Délai de Démarrage

Dans `useTutorial()` hook :

```typescript
const timer = setTimeout(() => setShowTutorial(true), 1500); // ← Changer ici (ms)
```

### Désactiver le Lancement Automatique

Supprimer cette section dans `useTutorial()` :

```typescript
useEffect(() => {
  const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
  if (!hasSeenTutorial) {
    const timer = setTimeout(() => setShowTutorial(true), 1500);
    return () => clearTimeout(timer);
  }
}, []);
```

### Réinitialiser pour un Utilisateur

Dans la console navigateur :

```javascript
localStorage.removeItem('hasSeenTutorial');
location.reload();
```

### Callback Personnalisés

```typescript
const handleJoyrideCallback = (data: CallBackProps) => {
  const { status, type, index, action } = data;

  // Détecter une étape spécifique
  if (index === 3 && type === EVENTS.STEP_AFTER) {
    console.log('Utilisateur a vu l’étape 4 !');
    // Analytics, triggers, etc.
  }

  // Détecter le skip
  if (status === STATUS.SKIPPED) {
    console.log('Tutoriel sauté à l’étape', index);
  }
};
```

## 📊 Analytics & Tracking

### Exemple avec Google Analytics

```typescript
import ReactGA from 'react-ga4';

const handleJoyrideCallback = (data: CallBackProps) => {
  const { status, type, index } = data;

  if (type === EVENTS.STEP_AFTER) {
    ReactGA.event({
      category: 'Tutorial',
      action: 'step_completed',
      label: `Step ${index + 1}`,
    });
  }

  if (status === STATUS.FINISHED) {
    ReactGA.event({
      category: 'Tutorial',
      action: 'completed',
      label: 'Full tutorial',
    });
  }

  if (status === STATUS.SKIPPED) {
    ReactGA.event({
      category: 'Tutorial',
      action: 'skipped',
      label: `At step ${index + 1}`,
    });
  }
};
```

## 🐛 Débogage

### Problème : Cible Non Trouvée

**Erreur :** Le tooltip ne s'affiche pas sur l'élément ciblé.

**Solutions :**
1. Vérifier que `data-tour` existe dans le DOM
2. Vérifier que l'élément n'est pas caché (`display: none`)
3. Ajouter un délai si l'élément charge asynchroniquement

```typescript
{
  target: '[data-tour="async-element"]',
  content: '...',
  disableBeacon: true, // Éviter le beacon si élément instable
}
```

### Console Logging

Activer les logs Joyride :

```typescript
<Joyride
  debug={true} // ← Activer pour voir les logs
  steps={tutorialSteps}
  ...
/>
```

## 🚀 Intégration dans App.tsx

```typescript
import { Tutorial, useTutorial } from './components/Tutorial';

function App() {
  // ... autres hooks
  const { showTutorial, startTutorial, completeTutorial } = useTutorial();

  const handleStartTutorial = () => {
    startTutorial();
  };

  return (
    <div>
      {/* Ajouter data-tour aux éléments ciblés */}
      <div data-tour="empire-bar">
        <EmpireBar {...props} />
      </div>

      <button data-tour="resources" onClick={...}>
        Ressources
      </button>

      {/* Composant Tutorial à la fin, avant Toaster */}
      <Tutorial run={showTutorial} onComplete={completeTutorial} />
      <Toaster />
    </div>
  );
}
```

## 📚 Ressources

- [Documentation react-joyride](https://docs.react-joyride.com/)
- [Démos interactives](https://react-joyride.com/)
- [GitHub react-joyride](https://github.com/gilbarbara/react-joyride)

## 📝 Checklist pour Production

- [ ] Tester sur mobile (responsive)
- [ ] Vérifier tous les sélecteurs `data-tour`
- [ ] Tester le parcours complet (8 étapes)
- [ ] Vérifier le skip à différentes étapes
- [ ] Tester le relancement depuis Settings
- [ ] Vérifier la persistance localStorage
- [ ] Analytics implémenté (optionnel)
- [ ] Traductions si multi-langues

---

✨ **Le tutoriel est maintenant pleinement opérationnel !** Les nouveaux joueurs seront guidés automatiquement dès leur première connexion.
