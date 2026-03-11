# Space Conquest - Core Game Concept & Architecture

## 1. Vision Globale
Space Conquest est un jeu de stratégie multijoueur persistant par navigateur (MMO spatial 4X de type Ogame). Les joueurs gèrent des planètes, extraient des ressources (Métal, Cristal, Deutérium), recherchent des technologies, et construisent des flottes pour coloniser, piller ou détruire d'autres joueurs en temps asynchrone.

## 2. Stack Technique Actuelle (VÉRITÉ ABSOLUE)
- **Frontend** : React 19, Vite, TailwindCSS v4, Framer Motion (animations), Radix UI (composants accessibles). 
- **Spécificité Frontend** : Utilisation de `react-three-fiber` pour des rendus spatiaux 3D (ex: Galaxy3DView) et WebSockets pour le temps réel.
- **Backend** : Rust, framework Axum (HTTP + WebSockets), runtime asynchrone Tokio.
- **Base de données & ORM** : PostgreSQL interfacé avec **SeaORM** (et non Prisma).
- **État en mémoire** : Utilisation de `dashmap` en Rust pour la gestion de l'état global asynchrone et hautement concurrent.

## 3. Boucles de Gameplay (Game Loops)
- **Gestion Économique (Macro)** : Amélioration continue des mines pour augmenter la production par heure. Gestion stricte de l'énergie (Solar Plants).
- **Expansion (Macro)** : Recherche de la technologie d'Astrophysique/Expédition -> Construction de Vaisseaux de Colonisation -> Occupation de nouveaux slots planétaires.
- **Combat & Flotte (Micro)** : Envoi de flottes avec des temps de trajet calculés mathématiquement. Les combats sont résolus instantanément à l'impact sur le backend.
- **Survie (Hors-ligne)** : "Fleet saving" (envoyer sa flotte voler pendant qu'on dort pour éviter qu'elle ne soit détruite à quai).

## 4. Fonctionnalités Avancées (Déjà implémentées ou prévues)
### Expérience Utilisateur (UX)
- **Raccourcis Clavier** : Navigation rapide (ex: `H` pour Home, `G` pour Galaxie, `F` pour Flotte, `?` pour l'aide).
- **Feedback Sonore** : Sons directionnels pour les actions (construction terminée, tirs de laser, warp d'expédition) et musique d'ambiance spatiale.
- **PWA (Progressive Web App)** : Le jeu est installable sur mobile/desktop avec gestion du cache via un Service Worker (`sw.js`).
- **Temps Réel** : File d'attente de construction (`BuildQueue`) avec progression rafraîchie chaque seconde et possibilité d'annulation.

### Mécaniques de Jeu
- **Calculateur de Combat** : Simulateur intégré pour estimer les pertes et le butin avant d'attaquer (basé sur des constantes comme `HUNTER_HULL = 400`).
- **Systèmes Sociaux** : Alliances, messagerie privée, et classement mondial (Leaderboard).
- **Économie Parallèle** : Marché noir, routes commerciales, et système de primes (Bounty Board).
- **Spécialités** : Officiers (bonus passifs), Flagships (vaisseaux amiraux personnalisables), et système de Sabotage.

## 5. Contraintes Architectures Strictes (Pour les Agents)
- **Calcul des Ressources (Backend)** : Doit utiliser la "Lazy Evaluation". Les ressources s'actualisent au moment de la lecture en base en utilisant `last_updated_at`, PAS avec des crons s'exécutant chaque seconde.
- **SeaORM (Backend)** : Toute modification de la base de données doit se faire via des migrations SeaORM, avec une attention stricte portée aux transactions et aux verrous de lignes pour éviter les failles de duplication.
- **Performances React (Frontend)** : L'interface contient de nombreux timers (Temps de vol, files d'attente). Il est interdit de déclencher des re-rendus React globaux pour un timer. Privilégier des composants purs ou des mutations directes (`useRef`) pour la boucle UI.
