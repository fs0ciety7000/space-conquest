# Audit — Space Conquest
> Généré le 2026-03-12 | Agents : Game Designer + Frontend Developer + ui-ux-pro-max

---

## Table des matières

1. [Audit Tech Tree — Backend](#1-audit-tech-tree--backend)
2. [Audit Responsive Mobile — Frontend](#2-audit-responsive-mobile--frontend)
3. [Audit Tech Tree — Visuel Frontend](#3-audit-tech-tree--visuel-frontend)
4. [Plan d'action priorisé](#4-plan-daction-priorisé)

---

## 1. Audit Tech Tree — Backend

### 1.1 État de chaque technologie

| tech_key | Nom | Backend implémentée | Où utilisée | Bonus affiché (front) | Bonus réel (back) | Statut |
|---|---|---|---|---|---|---|
| `energy_tech` | Tech. Énergie | ✅ Oui | `game_logic.rs` : prod mines + énergie solaire | "+10% production des mines" | +10% solaire/niveau (`0.10`), +1% mines/niveau (`0.01`) — **2 valeurs différentes** | ⚠️ INCOHÉRENCE |
| `weapons_tech` | Tech. Armes | ✅ Oui | `combat.rs` : `weapons_mult = 1 + level * 0.1` | "+10% attaque globale" | +10% attaque tous vaisseaux PvP/niveau | ✅ CORRECT |
| `shield_tech` | Tech. Boucliers | ✅ Oui | `combat.rs` : `shield_mult = 1 + level * 0.1` | "+10% bouclier vaisseaux" | +10% boucliers PvP/niveau | ✅ CORRECT |
| `armour_tech` | Tech. Blindage | ✅ Oui | `combat.rs` : `armour_mult = 1 + level * 0.1` | "+10% coque" | +10% hull PvP/niveau | ✅ CORRECT |
| `espionage_tech` | Tech. Espionnage | ✅ Oui | `handlers/fleet.rs:489-491` (spy_v2), `black_market.rs` (accès ≥ 13) | "+1 couche espionnage" | diff `att - def + log2(sondes)` → profondeur rapport. Sonde détruite si defenseur ≥ +3 niv. | ✅ CORRECT |
| `astrophysics` | Astrophysique | ✅ Oui | `main.rs:2765-2771`, `handlers/galaxy.rs:307-314` | "+1 slot colonie" | `max_colonies = min(astrophysics_level, 10)` | ✅ CORRECT |
| `plasma_tech` | Tech. Plasma | ⚠️ Partielle | `game_logic.rs` : bonus prod Metal/Cristal/Deuterium | "+5% ATK/SHD/HULL" | +1% production toutes ressources/niveau. **Bonus combat affiché N'EXISTE PAS** | 🚨 MENSONGE |
| `laser_tech` | Tech. Laser | ⚠️ Partielle | `game_logic.rs:752` dans `resolve_pvp()` legacy UNIQUEMENT | "+10% attaque vaisseaux" | Implémenté dans l'ancien moteur `resolve_pvp()` (light_hunter + cruiser seulement). Le moteur actuel v5.0 (`combat.rs::resolve_pvp_combat`) **ne lit pas laser_tech**. | 🚨 MOTEUR WRONG |
| `computer_tech` | Tech. Informatique | ⚠️ Partielle | `handlers/fleet.rs:905-906` (transport), `black_market.rs` (accès ≥ 10) | "+1 slot de flotte" | +10% cargo transporteurs/niveau. **Slots de flotte non implémentés.** | 🚨 MENSONGE |
| `hyperspace_tech` | Tech. Hyperespace | ⚠️ Partielle | `trade_routes.rs:79-85` UNIQUEMENT | "+30% vitesse battleships" | +10% vitesse routes commerciales seulement. Missions fleet (attack_v2, transport_v2) **ne lisent pas hyperspace_tech**. | 🚨 DESCRIPTION FAUSSE |
| `ion_tech` | Tech. Ions | 🔴 Fantôme | `game_logic.rs:414` (coût), `game_logic.rs:969` (score) | "+20% dégâts ioniques" | Aucun. Les "dégâts ioniques" n'existent pas dans le moteur. | 🔴 FANTÔME |
| `graviton_tech` | Tech. Graviton | 🔴 Fantôme | `game_logic.rs:481` (category_factor 2.5x temps), score | Rien affiché | Aucun effet gameplay. Recherche 2.5x plus longue que la normale. C'est la tech la plus chère pour rien. | 🔴 FANTÔME |

---

### 1.2 Techs "fantômes" — Détail

#### Catégorie A — Totalement mortes

**`ion_tech`** — Définie dans les coûts (`game_logic.rs:414`) et le score de recherche (`game_logic.rs:969`). Affichée en front avec le bonus "+20% dégâts ioniques". Ce type de dommage n'existe pas dans le moteur de combat. Purement décorative.

**`graviton_tech`** — Définie dans les coûts, dans le score, temps de recherche pénalisé 2.5x. Pas d'icône ni de description dans `TechTreeVisual.tsx` (tombe dans le bloc `default`). Aucun effet sur quoi que ce soit. C'est le plus coûteux des fantômes : 150 pts de score/niveau² mais zéro impact.

#### Catégorie B — Moteur wrong (désynchronisation)

**`laser_tech`** — Le bonus est implémenté dans `game_logic.rs::resolve_pvp()` ligne 757. Mais `resolve_pvp()` est l'ancien moteur monolithique qui ne traite que `light_hunter` et `cruiser`. Le vrai moteur PvP actuel (`combat.rs::resolve_pvp_combat` v5.0) construit les `CombatBonuses` depuis `weapons_tech / shield_tech / armour_tech` uniquement (`handlers/fleet.rs:1180-1182`). **`laser_tech` n'a aucun effet pour les joueurs utilisant attack_v2.**

#### Catégorie C — Bonus partiels (incomplet)

**`computer_tech`** — Bonus cargo transporteurs implémenté (`handlers/fleet.rs:905-906`). Mais "+1 slot de flotte" affiché en front n'existe pas : aucun système de slots de flotte dans le code. Le bonus n'est appliqué qu'aux missions transport, pas aux expéditions ni aux attaques.

**`hyperspace_tech`** — Implémentée uniquement pour les routes commerciales automatisées (`trade_routes.rs:84`). `calculate_flight_time` dans `game_logic.rs:917` reçoit un `flight_speed_multiplier` venant de la config serveur, pas de la tech du joueur.

**`plasma_tech`** — Bonus production (+1%/niveau) appliqué correctement. Mais le front affiche "+5% ATK/SHD/HULL" qui n'existe pas en backend. Trompeur.

#### Note sur `energy_tech` — Incohérence interne

`calculate_energy_production` utilise `energy_tech_bonus=0.10` (10%/niveau sur la prod solaire), alors que `calculate_resource_production` utilise `energy_tech_bonus=0.01` (1%/niveau sur les mines). Même clé de config, valeurs par défaut différentes. Fragile.

---

### 1.3 Arbre de dépendances (reconstitué depuis le code)

```
Tier 0 — Sans prérequis
├── energy_tech
├── espionage_tech
├── laser_tech
└── armour_tech

Tier 1 — Requièrent Tier 0
├── ion_tech          (requiert energy_tech)
├── plasma_tech       (requiert energy_tech + laser_tech)
├── shield_tech       (requiert energy_tech)
├── weapons_tech      (requiert laser_tech ou armour_tech)
├── computer_tech     (requiert espionage_tech)
└── combustion_drive  (requiert energy_tech)

Tier 2
├── impulse_drive     (requiert combustion_drive + ion_tech probable)
├── hyperspace_tech   (requiert energy_tech avancé)
└── astrophysics      (requiert impulse_drive + espionage_tech)

Tier 3 — Recherche longue (2.5x)
└── graviton_tech     (prérequis inconnus — probablement plasma_tech haut niveau)
```

---

### 1.4 Formule de coût des technologies

```
cost_at_level = base_cost × cost_multiplier ^ current_level
```

`cost_multiplier = 2.0` pour toutes les techs (doublement par niveau).

| Tech | Base Métal | Base Cristal | Base Deutérium | Coût Nv.5 (métal approx) |
|---|---|---|---|---|
| `energy_tech` | 0 | 800 | 400 | 0 / 12 800 C / 6 400 D |
| `laser_tech` | 200 | 100 | 0 | 3 200 M / 1 600 C |
| `weapons_tech` | 800 | 200 | 0 | 12 800 M / 3 200 C |
| `shield_tech` | 200 | 600 | 0 | 3 200 M / 9 600 C |
| `plasma_tech` | 2 000 | 4 000 | 1 000 | 32 000 M / 64 000 C / 16 000 D |
| `astrophysics` | 4 000 | 8 000 | 4 000 | 64 000 M / 128 000 C / 64 000 D |

**Formule temps de recherche :**
```
base = 2400s × level^1.5 × category_factor
reduction = 1.0 - min(lab_level × 0.07, 0.55)
final_time = base × reduction / research_speed
```

`category_factor` : `1.0` par défaut, `1.5` pour plasma/hyperspace/computer/espionage, `2.5` pour graviton + astrophysics.

---

### 1.5 Recommandations game design

#### Priorité Critique — Corriger les mensonges affichés (< 1h chacun)

1. **`plasma_tech`** : Changer la description front de "+5% ATK/SHD/HULL" → "+1% production toutes ressources/niveau". OU implémenter le bonus combat dans `CombatBonuses`.
2. **`laser_tech`** : Brancher dans le moteur combat v5.0. Ajouter `laser_mult = 1.0 + laser_level * 0.05` dans `CombatBonuses` (bonus partiel distinct de `weapons_tech`), lu dans `handlers/fleet.rs:1180-1182`.
3. **`computer_tech`** : Changer description → "+10% cargo transporteurs/niveau". Si les slots de flotte sont prévus, mettre un ticket.

#### Priorité Haute — Donner un effet aux fantômes

**`ion_tech`** — Deux options :
- **Option A** : Prerequis pur. Changer description : "Technologie prérequis pour les moteurs à impulsion et les boucliers avancés." Aucun bonus direct = honnête.
- **Option B** : Débuff bouclier. Après chaque round de combat, les boucliers adverses se régénèrent de `(1 - ion_level × 2%)` moins. Mécanique unique anti-bouclier.

**`graviton_tech`** — Options :
- **Anti-espionnage** : Ajoute un bruit dans les rapports adverses (`±graviton_level × 5%` sur les ressources affichées). Métagame late-game.
- **Réduction débris adverses** : `debris_ratio = max(0.30 - graviton_level × 0.02, 0.10)`. Pénalise les recycleurs ennemis.

**`hyperspace_tech`** — Priorité haute : étendre aux missions de flotte. Dans `calculate_flight_time` (`game_logic.rs:917`), intégrer : `flight_speed_multiplier *= 1.0 + hyperspace_level × 0.15`. À lire au moment de la création de mission.

#### Priorité Moyenne — Cohérence formules

- Créer deux clés config distinctes : `energy_tech_solar_bonus` (0.10) et `energy_tech_mine_bonus` (0.01).
- Nettoyer `create_tech_bonuses()` dans `game_logic.rs:681` (code mort, jamais appelé depuis l'extérieur).

---

## 2. Audit Responsive Mobile — Frontend

### 2.1 Tableau des problèmes prioritaires

| Priorité | Composant | Fichier:Ligne | Problème | Fix suggéré |
|---|---|---|---|---|
| 🔴 P1 | GalaxyView | `GalaxyView.tsx:401` | Boutons orbitaux `w-8 h-8` (32px) — sous le seuil 44px touch WCAG | `w-11 h-11 md:w-12 md:h-12` |
| 🔴 P1 | GalaxyView | `GalaxyView.tsx:460` | Panneau "Mes Planètes" `w-64 fixed right-4` couvre 70% de l'écran mobile | `w-full sm:w-64` + backdrop dismiss + `top-0 bottom-0` |
| 🔴 P1 | GalaxyView | `GalaxyView.tsx:512` | Table "Planètes Proches" 6 colonnes sans `overflow-x-auto` → layout cassé | Wrapper `overflow-x-auto`, colonnes responsives |
| 🟠 P2 | GalaxyView | `GalaxyView.tsx:602` | `ListView` table sans `overflow-x-auto` → débordement horizontal | Wrapper `overflow-x-auto` |
| 🟠 P2 | TechTreeVisual | `TechTreeVisual.tsx:587` | ReactFlow `h-screen` : aucune nav de retour visible mobile sans sidebar | Bouton retour persistant `fixed bottom-4 left-4` |
| 🟠 P2 | App.tsx | `App.tsx:793` | Sidebar desktop `hidden md:flex` — bouton hamburger dépend de l'EmpireBar | Bouton hamburger fallback `fixed bottom-4` si EmpireBar absent |
| 🟡 P3 | Shipyard | `Shipyard.tsx:332` | `grid-cols-4` stats vaisseaux ne passe pas à 2 colonnes mobile → valeurs tronquées | `grid-cols-2 md:grid-cols-4` |
| 🟡 P3 | Defenses | `Defenses.tsx:248` | `p-8` + `text-3xl` panneau de commande — surdimensionné mobile | `p-4 md:p-8`, `text-xl md:text-3xl` |
| 🟡 P3 | GalaxyView | `GalaxyView.tsx:277` | Barre sticky `flex-col` sur mobile : hauteur variable, décalage du contenu | Hauteur min fixée `min-h-[120px] xl:min-h-0` ou condensée |
| 🟡 P3 | Defenses | `Defenses.tsx:249` | `Shield size={250}` déco absolute → scroll horizontal possible | `size={120} md:size={250}` |
| 🟢 P4 | App.tsx | `App.tsx:893` | Absence `overflow-x-hidden` main → tout débordement enfant cause scroll global | `overflow-x-hidden` sur le main container |
| 🟢 P4 | App.tsx | `App.tsx:777` | EmpireBar `absolute top-0`, drawer mobile commence à `top-[60px]` → gap si EmpireBar wrappe | Hauteur EmpireBar dynamique ou `top-[--header-h]` CSS var |

### 2.2 Détail par composant

#### App.tsx — Layout principal

- Sidebar desktop : `hidden md:flex` ✅ correct.
- Sidebar mobile : `fixed top-[60px] w-72` avec overlay et animation — bien implémentée.
- ⚠️ `p-3 md:p-4 lg:p-8` sur le main content : correct, mais pas d'`overflow-x-hidden` → tout enfant qui déborde crée du scroll horizontal global.
- ⚠️ TechTree rendu dans `div h-full w-full` sans les paddings standards — aucune navigation de retour visible mobile.

#### GalaxyView.tsx — 4 problèmes critiques/élevés

1. **Boutons orbitaux 32px** : non conformes WCAG touch target (44px minimum).
2. **Panneau "Mes Planètes" fixed** : `w-64` sur mobile = ~70% de l'écran superposé au contenu orbital. Pas de responsive.
3. **Table Planètes Proches** : 6 colonnes, pas d'`overflow-x-auto`, layout cassé sur mobile.
4. **ListView** : table sans scroll horizontal.

#### Shipyard.tsx

- Grille vaisseaux `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` ✅
- Stats card `grid-cols-4` fixe mobile → tronquage des valeurs `HULL: 18000`.
- Input quantité `w-20` potentiellement serré.

#### Defenses.tsx

- Layout global `grid-cols-1 lg:grid-cols-3` ✅
- Panneau central `p-8` + `text-3xl` surdimensionné sur mobile.
- Icône Shield `size={250}` absolute → débordement possible.
- Bouton Construire `h-14` = 56px ✅ touch target correct.

---

## 3. Audit Tech Tree — Visuel Frontend

### 3.1 Architecture actuelle

- `TechTree.tsx` : wrapper vide, délègue entièrement à `TechTreeVisual.tsx`.
- `TechTreeVisual.tsx` : utilise **React Flow** (`reactflow`) comme moteur de graphe.
- Noeuds : composants React custom (`TechNode`) de 280×320px minimum.
- Arêtes : `SmoothStep` React Flow — type correct mais non affichées pour des raisons techniques.

### 3.2 Bugs identifiés — Pourquoi les liens ne s'affichent pas

#### Bug #1 — `useMemo` utilisé comme side-effect (critique)

```tsx
// TechTreeVisual.tsx:569-572 — CODE INCORRECT
useMemo(() => {
  setNodes(initialNodes);   // ← side-effect dans useMemo = interdit React
  setEdges(initialEdges);
}, [initialNodes, initialEdges, setNodes, setEdges]);
```

`useMemo` ne doit jamais provoquer de side-effects. Appeler `setNodes`/`setEdges` pendant le rendu crée une **race condition** : les arêtes calculées pour une version de `initialNodes` peuvent être appliquées à une version différente des nodes. Résultat : connexions source/target invalides → arêtes invisibles ou convergeant vers `(0,0)`.

**Fix** : remplacer par un `useEffect`.

#### Bug #2 — `getNodePosition` utilise `window.innerWidth` (positions erronées)

```tsx
// TechTreeVisual.tsx:439 — MAUVAIS
const startX = (window.innerWidth / 2) - (totalWidth / 2) + (indexAtDepth * spacingX);
```

`window.innerWidth` = largeur de **toute la fenêtre**, pas du conteneur React Flow (qui exclut la sidebar 256px). Les noeuds sont positionnés dans un espace de coordonnées incorrect → `fitView` peut zoomer trop fort ou placer les noeuds hors du cadre visible.

**Fix** : utiliser `useResizeObserver` sur le div conteneur ou calculer via un `ref`.

#### Bug #3 — `useNodesState(initialNodes)` n'observe pas les changements

```tsx
// TechTreeVisual.tsx:565-566
const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
```

`useNodesState(initialNodes)` ne réagit pas aux mises à jour de `initialNodes` après le premier rendu. Le `useMemo` side-effect tente de compenser, mais de façon incorrecte (voir Bug #1).

#### Bug #4 — Taille du canvas (ergonomie)

`spacingY = 450`, `spacingX = 350` → canvas de ~2000×1400px pour 13 techs. Avec `minZoom: 0.2` et `defaultViewport.zoom: 0.7`, les noeuds Tier 3/4 sont en dehors de la vue initiale.

### 3.3 Ce qui manque pour un vrai arbre tech OGame/Stellaris

- ❌ Pas de séparateurs de tiers visuels (lignes horizontales par niveau)
- ❌ Arêtes génériques SmoothStep sans style directionnel
- ❌ Pas d'axe coût/temps visible
- ❌ Noeuds 280×320px trop grands pour la densité (13 techs → 2500×2000px canvas)
- ❌ Aucune vue alternative mobile (le TODO est commenté ligne 582-585)
- ❌ Pas d'indicateur de "tech débloquée" ou "tech en recherche" sur les connexions

### 3.4 Options de refactoring

#### Option A — React Flow corrigé ⭐ (recommandé à court terme)

Corriger les 3 bugs sans changer de lib :
1. `useMemo` → `useEffect` pour `setNodes`/`setEdges`
2. `window.innerWidth` → `useResizeObserver` sur le conteneur
3. Réduire les noeuds à `200×220px`
4. Sur mobile : activer la vue liste déjà commentée (TODO ligne 582-585)

Avantages : zoom/pan natif, arêtes animées, refactoring minimal.

#### Option B — SVG dag statique (recommandé pour contrôle visuel)

Positions calculées en JS pur (algorithme de profondeur existant), rendu `<svg>` avec `<path>` cubiques (style Stellaris) + `<foreignObject>` pour les cartes HTML.

Avantages : pas de dépendance ~150kb, contrôle pixel-perfect, pas de state stale.
Inconvénients : zoom/pan manuel.

#### Option C — Grille CSS avec connecteurs SVG (recommandé pour mobile-first)

Grille CSS par tiers + lignes SVG inline entre les positions calculées. Approche Forge of Empires.

Avantages : mobile-first, performant, maintenable.
Inconvénients : moins immersif.

**Recommandation** : **Option A** à court terme (corrections de bugs). **Option B** à moyen terme si les techs passent à 30+.

---

## 4. Plan d'action priorisé

### Sprint 1 — Corrections critiques (< 2h chacune)

| # | Tâche | Fichier | Effort |
|---|---|---|---|
| 1 | Fixer bug `useMemo` → `useEffect` dans TechTreeVisual | `TechTreeVisual.tsx:569` | 15 min |
| 2 | Fixer `window.innerWidth` → `ResizeObserver` dans TechTreeVisual | `TechTreeVisual.tsx:439` | 30 min |
| 3 | Corriger description front `plasma_tech` ("+5% ATK/SHD/HULL" → "+1% production/niveau") | `TechTreeVisual.tsx:88` | 5 min |
| 4 | Corriger description front `computer_tech` ("+1 slot de flotte" → "+10% cargo transporteurs") | `TechTreeVisual.tsx` | 5 min |
| 5 | Boutons orbitaux GalaxyView : `w-8 h-8` → `w-11 h-11 md:w-12 md:h-12` | `GalaxyView.tsx:401` | 10 min |
| 6 | Table Planètes Proches : wrapper `overflow-x-auto` | `GalaxyView.tsx:512` | 10 min |
| 7 | ListView : wrapper `overflow-x-auto` | `GalaxyView.tsx:602` | 5 min |
| 8 | Main App : ajouter `overflow-x-hidden` | `App.tsx:893` | 5 min |

### Sprint 2 — Backend tech tree (corrections bonuses)

| # | Tâche | Fichier | Effort |
|---|---|---|---|
| 9 | Brancher `laser_tech` dans `CombatBonuses` moteur v5.0 | `handlers/fleet.rs:1180-1182` | 1h |
| 10 | Brancher `hyperspace_tech` dans `calculate_flight_time` | `game_logic.rs:917` + `handlers/fleet.rs` (création mission) | 2h |
| 11 | Unifier les clés `energy_tech_bonus` | `game_logic.rs:159, 266` | 30 min |
| 12 | Donner un effet à `ion_tech` (prérequis pur ou débuff bouclier) | `combat.rs` + `TechTreeVisual.tsx` | 2-4h |
| 13 | Donner un effet à `graviton_tech` (anti-espionnage ou réduction débris) | `main.rs` + `handlers/fleet.rs` | 2-4h |

### Sprint 3 — Responsive mobile

| # | Tâche | Fichier | Effort |
|---|---|---|---|
| 14 | Panneau "Mes Planètes" GalaxyView responsive | `GalaxyView.tsx:460` | 1h |
| 15 | Stats vaisseaux Shipyard `grid-cols-2 md:grid-cols-4` | `Shipyard.tsx:332` | 15 min |
| 16 | Panneau défenses `p-4 md:p-8`, `text-xl md:text-3xl` | `Defenses.tsx:248` | 20 min |
| 17 | Shield déco responsive `size={120} md:size={250}` | `Defenses.tsx:249` | 5 min |
| 18 | Bouton retour dans TechTree sur mobile | `TechTreeVisual.tsx` | 30 min |
| 19 | Vue liste TechTree sur mobile (TODO existant ligne 582-585) | `TechTreeVisual.tsx:582` | 2h |

### Sprint 4 — Refactoring Tech Tree visuel (Option A)

| # | Tâche | Effort |
|---|---|---|
| 20 | Réduire noeuds TechNode à 200×220px | 1h |
| 21 | Ajouter séparateurs visuels par tiers (lignes horizontales) | 2h |
| 22 | Arêtes stylisées : couleur selon état (disponible/en recherche/débloquée) | 2h |
| 23 | Indicateur "tech en cours de recherche" sur le noeud | 1h |

---

## Fichiers clés à modifier

```
backend/
  src/combat.rs                    — CombatBonuses (laser_tech, ion_tech)
  src/game_logic.rs:917            — calculate_flight_time (hyperspace_tech)
  src/game_logic.rs:159,266        — energy_tech_bonus unification
  src/handlers/fleet.rs:1180-1182  — lecture des tech bonuses pour combat
  src/main.rs                      — graviton_tech (anti-espionnage ou débris)

frontend/
  src/components/TechTreeVisual.tsx:439,569  — bugs React Flow
  src/components/TechTreeVisual.tsx:82-100   — descriptions techs mensongères
  src/components/GalaxyView.tsx:401,460,512,602  — responsive critique
  src/components/Shipyard.tsx:332            — grid responsive
  src/components/Defenses.tsx:248-249        — padding/tailles responsive
  src/App.tsx:893                            — overflow-x-hidden
```

---

*Audit réalisé avec les agents Game Designer + Frontend Developer + skill ui-ux-pro-max*
