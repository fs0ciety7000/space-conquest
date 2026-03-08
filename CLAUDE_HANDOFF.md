# Space Conquest - Mise à jour Frontend (Handoff pour Développeur Backend)

## Résumé Abstrait de la Mise à Jour
Le code source de l'interface utilisateur a été consolidé et optimisé pour améliorer la maintenabilité et faciliter l'intégration future de nouvelles mécaniques. 
Les principaux changements sont :
1. **Centralisation de l'état** : Création de `PlanetContext` (chargement et commutation des données planétaires) et `WebSocketContext` (gestion des événements en temps réel) pour désengorger `App.tsx`.
2. **Refonte des Composants de Profil** : Fusion de `MyProfile.tsx` et `PlayerProfile.tsx` en un composant unique `UniversalProfile.tsx` gérant toutes les interactions sociales.
3. **Optimisation des Composants de Ressources** : Les composants comme `EmpireBar` et `ResourceDisplay` se basent désormais strictement sur les valeurs de production calculées par le backend (`metal_production`, etc.) au lieu d'effectuer des calculs complexes côté frontend.
4. **Système de Notification** : Ajout d'un système `NotificationCenter` accessible depuis la barre supérieure (EmpireBar) qui affiche les événements du jeu (marché, combats, constructions).
5. **Nouvelles Vues (Mockups UI)** : Ajout de `Dashboard` (Analyses), `Alliances` (Réseau social), et `Achievements` (Succès). Ce sont des composants basés sur des données mockées prêts à être connectés au backend.

## Arborescence des Dossiers Importants
Le projet conserve l'architecture Vite/React.
- `src/App.tsx` : Point d'entrée gérant dorénavant la navigation et les modals globaux.
- `src/contexts/` :
  - `PlanetContext.tsx` : Fournisseur pour les données de la planète actuellement sélectionnée.
  - `WebSocketContext.tsx` : Gère la connexion WebSocket et expose dynamiquement les événements.
- `src/hooks/` :
  - `useRealtimeResources.ts` : Calcule uniquement l'incrément temps-réel visuel entre deux requêtes API, en se basant sur le backend.
- `src/components/` : 
  - `EmpireBar.tsx` : Gère le menu de la galaxie, ressources actuelles, le nouveau `NotificationCenter` et la messagerie.
  - `UniversalProfile.tsx` : Composant polyvalent pour l'affichage de joueur (soi ou autrui).
  - Vues prêtes pour intégration : `Dashboard.tsx`, `Alliances.tsx`, `Achievements.tsx`, `NotificationCenter.tsx`.

## Conventions de Nommage
- Composants : CamelCase/PascalCase (ex: `NotificationCenter.tsx`).
- Variables d'état : camelCase direct pour la logique TSX. Les interfaces mappent la convention `snake_case` de la base de données vers du typage fort en TS (`energy_production`, `metal_amount`). 
- **Règle absolue** : Le composant ne doit PAS calculer d'états asynchrones métier. Il reçoit des objets via props ou fetch, et affiche. 

## Liste des TODO (Claude) laissés
Voici la liste exacte des branchements API à réaliser pour rendre la mise à jour fonctionnelle sur le backend :

1. ✅ `src/components/NotificationCenter.tsx` — **FAIT** (session 2026-03-08)
   `// TODO (Claude) : Implémenter le fetch réel des notifications depuis le backend`
   - Migration `m20260308_000001_create_notifications` + entity + handler `notifications.rs`
   - Routes : `GET /users/:id/notifications`, `POST /users/:id/notifications/read`

2. ✅ `src/components/NotificationCenter.tsx` — **FAIT** (session 2026-03-08)
   `// TODO (Claude): Appending live WS notification`
   - `WsEvent::Notification` + `WsState::push_notification()` persiste DB + diffuse WS
   - `useWebSocket.ts` : case `notification` dispatch CustomEvent `new-notification`
   - Hookés dans `main.rs` : combat (victoire/défaite/conquête), construction, production vaisseaux

3. ✅ `src/components/NotificationCenter.tsx` — **FAIT** (session 2026-03-08)
   `// TODO (Claude): Mark all as read API call`
   - `POST /users/:id/notifications/read` → UPDATE bulk via SeaORM `update_many()`

4. ✅ `src/components/Dashboard.tsx` — **FAIT** (session 2026-03-08)
   `// TODO (Claude) : Remplacer les données mockées par un endpoint /analytics?user_id=${userId}`
   - `backend/src/analytics.rs` + `GET /analytics?user_id=X`
   - Production journalière calculée depuis les niveaux de mines réels (× 24h, somme toutes planètes)
   - Stats réelles : energy_efficiency (avg ratio), victories_7d (combat_log), scores (user table)
   - `Dashboard.tsx` : fetch au mount, spinner, stat cards et graphique branchés sur données réelles

5. ✅ `src/components/Alliances.tsx` — **FAIT** (session 2026-03-08)
   `// TODO (Claude) : Remplacer par un vrai fetch d'alliances via endpoint /alliances ou /alliances/search`
   - `GET /alliances?search=&per_page=30` existait déjà dans `alliance.rs`
   - Debounce 300ms sur la recherche, spinner, 0 résultat géré
   - Bouton "Mon Alliance" navigue vers l'onglet alliance existant

6. ✅ `src/components/Achievements.tsx` — **FAIT** (session 2026-03-08)
   `// TODO (Claude) : Fetch des vrais accomplissements via /users/${userId}/achievements`
   - `GET /achievements?user_id=X` existait déjà dans `missions.rs`
   - Icônes emoji + couleurs hex depuis la DB, barre de progression réelle
   - Rareté traduite (common/uncommon/rare/epic/legendary), date de déverrouillage

7. ✅ `src/hooks/useGameNotifications.ts` — **FAIT** (session 2026-03-08)
   `// TODO (Claude) : Pousser les events WS pour les alertes globales`
   - `WsEvent::MarketSale` + `WsEvent::PlanetSold` ajoutés à `websocket.rs` + fonctions `notify_market_sale` / `notify_planet_sold`
   - Hookés dans `buy_from_listing_handler` (main.rs) et `buy_planet_handler` / `sell_to_npc_handler` (planet_market.rs)
   - `useWebSocket.ts` : `attack_incoming` / `spy_alert` / `sabotage_detected` / `sabotage_applied` → dispatche CustomEvent au lieu d'un toast direct ; ajout de `market_sale` et `planet_sold`
   - `useGameNotifications.ts` : handlers mis à jour avec les bons types de détail, descriptions améliorées
   
## Dépendances et Configuration
Si non installées, les modales et graphs dépendent de :
- `recharts` pour le `Dashboard`
- `lucide-react` pour l'iconographie

---

# Expansion 4.0 — Handoff Backend (session 2026-03-08)

Cette section documente les changements techniques récents et les TODOs restants pour l'agent backend.

## Changements Frontend Implémentés (Expansion 4.0)

### Performance & Stabilité
- `App.tsx` : Code-splitting avec `React.lazy` + `Suspense` sur tous les onglets.
- `ErrorBoundary.tsx` : Composant créé, wrappé dans `main.tsx`. Catch les crashes JS runtime.
- `WebSocketOverlay.tsx` : Overlay de statut WebSocket (connecting / disconnected / error). Prend un prop `status: string`.

### Pagination
- `Leaderboard.tsx` : Utilise désormais `?page=1&limit=50` sur `/ranking`. Bouton "Afficher plus" pour charger la suite.
- `ReportsTerminal.tsx` : Slice côté client (20 logs à la fois) pour combat et transport.  
- `BuyView.tsx` (Marketplace) : Slice côté client (12 annonces à la fois) pour les listings P2P.

### Mobile UX
- `TechTreeVisual.tsx` :  
  - MiniMap masqué sur mobile (`hidden sm:block`)  
  - Hint "pince pour zoomer" affiché uniquement sur mobile  
  - `// TODO CLAUDE` laissé en place pour la future vue liste/grille  
- `FleetPresetsManager.tsx` :  
  - Header responsive + padding adaptatif  
  - Boutons d'actions présets en `flex-wrap` sur petits écrans  
  - `// TODO CLAUDE` laissé sur les boutons pour futur dropdown mobile  

---

## TODO Backend (Priorités pour agent Claude)

### 0. ✅ Expansion 5.0 — Refactoring Architecture & Mécanique — **FAIT** (session 2026-03-09)
- `backend/src/handlers/` créé : galaxy, ranking, reports, profile (17 handlers), shipyard
- `backend/src/models.rs` : structs partagées extraites de main.rs
- `game_logic.rs` : production passive, bonus labo, helper apply_storage_cap
- `combat.rs` : `DetailedCombatReport` + suivi round-by-round + loot capping cargo + calcul débris
- Migration `m20260309_000001_create_debris_field` : table debris_field + recyclers_sent + details JSONB
- Entité `entities/debris_field.rs` + enregistrement dans prelude
- **TODO (antigravity)** : endpoint GET /galaxy/:g/system/:s/debris + mission type "recycle" dans tick_system.rs
- **TODO (antigravity)** : afficher débris 💫 dans GalaxyView.tsx + RadialMenu option recycleur
- **TODO (antigravity)** : `handlers/planets.rs` et `handlers/fleet.rs` restent à créer pour finir le refactor de main.rs

### 1. ✅ Ranking — Optimisation Performance — **FAIT** (session 2026-03-08)
- Migration `m20260308_000002_add_score_columns_to_user` : colonnes `total_score`, `economy_score`, `military_score` + index sur `user`
- Entity `user.rs` mise à jour + `auth.rs` corrigé
- `game_logic::refresh_all_user_scores()` : recalcule et persiste les scores de tous les joueurs
- Job background (tokio, toutes les 5min) dans `main.rs`
- `get_ranking_handler` : `SELECT ... ORDER BY total_score DESC LIMIT $limit OFFSET $offset` — ne charge plus toute la BDD
- ⚠️ **Antigravity** : `ReportsTerminal.tsx` et `Leaderboard.tsx` reçoivent maintenant `{ data, total, page, limit }` — la slice client peut être remplacée par un vrai `hasMore` basé sur `total`

### 2. ✅ ReportsTerminal — Pagination Backend — **FAIT** (session 2026-03-08)
- `GET /planets/:id/reports?page=1&limit=20` → `{ data: [...], total: N, page: P, limit: L }`
- `GET /planets/:id/transport-logs?page=1&limit=20` → `{ data: [...], total: N, page: P, limit: L }`
- ⚠️ **Antigravity** : `ReportsTerminal.tsx` doit être mis à jour pour utiliser `data` au lieu du tableau brut, et `hasMore = page * limit < total`

### 3. ✅ Marketplace — Pagination Backend Listings — **FAIT** (session 2026-03-08)
- `GET /market/listings?page=1&limit=12&resource_type=metal` → `{ listings: [...], total: N, page: P, limit: L }`
- ⚠️ **Antigravity** : `BuyView.tsx` doit utiliser `total` pour le `hasMore` au lieu de la slice locale

### 4. 🔵 Mobile UX — Future Vue Liste TechTree
**Fichier frontend :** `TechTreeVisual.tsx` (ligne ~561, commentaire `// TODO CLAUDE`)

**Situation actuelle :** Sur mobile, l'arbre ReactFlow est utilisable via pinch-to-zoom mais les nodes (280px) sont difficiles à lire.

**TODO CLAUDE :** Implémenter une vue alternative pour `window.innerWidth < 768` :
- Une grille de cards triée par catégorie (Base, Advanced, Propulsion, Science)
- Chaque card affiche le niveau, le coût, et un bouton "Rechercher"
- Pas besoin de ReactFlow pour cette vue — HTML/CSS pur suffit
- Détection via `window.matchMedia('(max-width: 768px)')` ou hook `useMediaQuery`

### 5. 🔵 Mobile UX — Boutons Présets en Dropdown
**Fichier frontend :** `FleetPresetsManager.tsx` (ligne ~340, commentaire `// TODO CLAUDE`)

**Situation actuelle :** Sur très petits écrans (< 375px), la rangée des boutons [Select, Duplicate, Edit, Delete] peut causer un overflow horizontal sur le nom du préset.

**TODO CLAUDE :** Sur mobile, remplacer les 4 boutons inline par un bouton "⋮" déclenchant un `DropdownMenu` ou un `Sheet` Radix UI avec les 4 actions listées verticalement. Condition: `window.innerWidth < 640` ou `sm:hidden` sur les boutons inline vs bouton `⋮`.

### 6. ✅ CSS Linting (Non-bloquant) — **FAIT** (session 2026-03-08)
- `.vscode/settings.json` créé avec `"css.validate": false, "scss.validate": false`
- Supprime les faux positifs Tailwind v4 dans l'IDE sans affecter le build

---

# PLAN DE REFACTORING — Session à venir

## 🔴 PRIORITÉ 1 — Éclatement de `main.rs` (358 KB / ~8 200 lignes)

> `main.rs` contient la totalité des handlers HTTP, les types de requête/réponse, les structs intermédiaires (RankItem, PlanetInfo, etc.), et certaines logiques métier. C'est la dette technique principale du projet.

### Stratégie de découpage proposée

Le fichier doit être découpé en modules autonomes dans `backend/src/handlers/`. Chaque module expose uniquement une fonction publique `router()` retournant un `axum::Router<AppState>`.

```
backend/src/
├── handlers/
│   ├── mod.rs               ← pub use de tous les sous-modules
│   ├── planets.rs           ← CRUD planètes, upgrade bâtiments, build_queue
│   ├── fleet.rs             ← attaque, espionnage, expédition, recyclage, colonisation
│   ├── galaxy.rs            ← map galactique, scan, nearby
│   ├── ranking.rs           ← leaderboard paginé (déjà refactorisé)
│   ├── reports.rs           ← combat logs, transport logs (déjà paginés)
│   ├── shipyard.rs          ← types de vaisseaux, construction vaisseaux
│   ├── profile.rs           ← profil joueur, avatar, display_name
│   └── admin_routes.rs      ← routes admin (séparé de admin.rs déjà existant)
├── models/
│   └── rank_item.rs         ← structs partagées (RankItem, PlanetInfo, etc.)
└── main.rs                  ← uniquement: AppState, router assembly, fond de salle, spawn tasks
```

### Étapes recommandées pour Claude (backend)

#### Étape 1 - Créer `src/handlers/mod.rs` et y déclarer les sous-modules
```rust
pub mod planets;
pub mod fleet;
pub mod galaxy;
pub mod ranking;
pub mod reports;
pub mod shipyard;
pub mod profile;
```

#### Étape 2 - Créer `src/models/rank_item.rs` avec les structs partagées
Déplacer depuis `main.rs` :
- `struct RankItem`
- `struct PlanetInfo`
- `struct FleetEntry`
- `struct AttackPayload`, `TransportPayload`, `SpyPayload`
- Tout autre struct de payload HTTP

```rust
// TODO CLAUDE: Extraire toutes les structs de payload et réponse de main.rs
// vers src/models/. Les handlers importent via `use crate::models::*;`
```

#### Étape 3 - Migrer handlers par domaine

**`src/handlers/planets.rs`** (cibler les fonctions suivantes dans main.rs) :
- `get_planet_handler`, `update_planet_handler`
- `get_buildings_handler`, `upgrade_building_handler`
- `get_build_queue_handler`, `add_to_build_queue_handler`
- `get_planet_resources_handler`

**`src/handlers/fleet.rs`** :
- `attack_handler` (v2)
- `spy_handler`
- `expedition_handler`
- `recycle_handler`
- `colonize_handler`
- `recall_fleet_handler`

**`src/handlers/galaxy.rs`** :
- `get_galaxy_handler`
- `get_galaxy_system_handler`
- `scan_nearby_handler`

**`src/handlers/ranking.rs`** :
- `get_ranking_handler` (déjà refactorisé)

**`src/handlers/reports.rs`** :
- `get_reports_handler` (déjà paginé)
- `get_transport_logs_handler` (déjà paginé)
- `get_combat_report_detail_handler`

**`src/handlers/shipyard.rs`** :
- `get_ship_types_handler`
- `build_ships_handler`
- `get_fleet_handler`

**`src/handlers/profile.rs`** :
- `get_my_profile_handler`
- `update_profile_handler`
- `get_player_profile_handler`
- `get_fleet_presets_handler`, `create_fleet_preset_handler`, `update_fleet_preset_handler`, `delete_fleet_preset_handler`

#### Étape 4 - Assembler dans `main.rs`
```rust
// main.rs ne garde que :
use handlers::{planets, fleet, galaxy, ranking, reports, shipyard, profile};

let app = Router::new()
    .merge(auth::router(state.clone()))
    .merge(planets::router(state.clone()))
    .merge(fleet::router(state.clone()))
    .merge(galaxy::router(state.clone()))
    .merge(ranking::router(state.clone()))
    .merge(reports::router(state.clone()))
    .merge(shipyard::router(state.clone()))
    .merge(profile::router(state.clone()))
    // ... modules déjà dans des fichiers séparés
    .merge(combat::router(state.clone()))
    .merge(alliance::router(state.clone()))
    .merge(market::router(state.clone()))
    .merge(trade_routes::router(state.clone()));
```

#### Règles importantes pour le refactor
1. **Ne jamais casser les routes existantes** — même URL, même méthode HTTP
2. **Compiler après chaque module migré** (`cargo check`) avant de passer au suivant
3. **Travailler sur une branche dédiée** (`refactor/split-main-rs`) — un seul PR pour tout le refactor, **ne jamais commit directement sur `main`**
4. **Les modules existants** (`combat.rs`, `alliance.rs`, `market.rs`, etc.) ont déjà leur propre fichier — ne pas les toucher, juste vérifier qu'ils exposent bien `router()`

---

## 🟡 PRIORITÉ 2 — Nouvelles fonctionnalités Backend

### 2.1 Rate Limiting sur les routes sensibles
Protéger les routes contre le spam/abus :
- `POST /attack` — max 10 req/min par user
- `POST /spy` — max 20 req/min par user
- `POST /market/listings` — max 30 req/min par user
- Utiliser `tower_governor` ou un middleware custom `Arc<Mutex<HashMap<UserId, RateLimiter>>>`

```rust
// TODO CLAUDE: Ajouter rate limiting sur les routes d'action (attack, spy, colonize)
// via tower_governor ou un middleware custom. Retourner HTTP 429 si dépassé.
```

### 2.2 Événements WebSocket — Compléter la couverture
Événements manquants à émettre :
- `building_complete` — quand un bâtiment termine sa construction
- `research_complete` — quand une recherche se termine
- `fleet_arrived` — quand une flotte d'attaque/transport arrive à destination
- `colony_founded` — quand une colonisation réussit

```rust
// TODO CLAUDE: Dans tick_system.rs, émettre des WsEvents lors des completions
// de file d'attente (bâtiment, vaisseau, recherche) et lors des arrivées de flottes.
```

### 2.3 Système d'e-mail (optionnel mais utile)
- Reset de mot de passe par e-mail (`POST /auth/forgot-password`)
- Notification d'attaque imminente par e-mail si l'user est inactif > 30min
- Librairie recommandée : `resend-rs`

---

## 🟢 PRIORITÉ 3 — Améliorations Frontend (pour Antigravity)

### 3.1 Skeleton Loaders (UX Loading States)
**Situation :** Toutes les vues affichent un spinner générique. Une meilleure UX utilise des skeleton loaders qui restituent la forme attendue du contenu.

**Fichiers à améliorer :**
- `Leaderboard.tsx` — skeleton de table (5 lignes grises animées)
- `ReportsTerminal.tsx` — skeleton de logs (3-4 lignes)
- `TechTreeVisual.tsx` — skeleton de grille 2×3
- `Shipyard.tsx` — skeleton de cartes vaisseaux

**Comment :** Créer un composant `SkeletonRow.tsx` réutilisable avec `animate-pulse bg-slate-800 rounded`.

```tsx
// TODO CLAUDE (frontend): Remplacer les spinners de chargement par des skeleton loaders
// dans Leaderboard, ReportsTerminal et TechTreeVisual pour améliorer l'UX perçue.
// Composant: src/components/ui/SkeletonRow.tsx
```

### 3.2 Recherche dans la Galaxy View
**Situation :** Il n'existe pas de champ de recherche pour naviguer directement à un système/coordonnée.

**Proposition :** Un input `[G:S]` (galaxie:système) en haut de la Galaxy View, appuyez sur Entrée → navigate to `galaxy/G/S`.

```tsx
// TODO CLAUDE (frontend): Ajouter un champ de recherche de coordonnées dans GalaxyView.tsx
// Format: "1:42" → navigate to galaxy 1, system 42. Avec historique des searches récentes.
```

### 3.3 Mode "Sombre Profond" Toggle
**Situation :** Le thème est déjà dark mais certains écrans sont très chargés visuellement.

**Proposition :** Bouton dans `EmpireBar.tsx` pour basculer entre `dark` (actuel) et `deep-dark` (noir pur, contrastes réduits). Stocker en `localStorage('theme')`.

### 3.4 Favoris / Pins de planètes ennemies dans Galaxy
**Situation :** Un joueur doit parcourir la carte pour retrouver une planète qu'il veut attaquer régulièrement.

**Proposition :**
- Bouton ⭐ sur les planètes dans `GalaxyView` et dans `Leaderboard`
- Liste des favoris dans un panel latéral collapsible
- Stocké dans `localStorage('pinned_planets')`

```tsx
// TODO CLAUDE (frontend): Implémenter un système de favoris de planètes dans GalaxyView.tsx
// et Leaderboard.tsx. Stockage localStorage, bouton ⭐ sur RadialMenu et PlanetRow.
```

### 3.5 Tutoriel Contextuel (Onboarding v2)
**Situation :** L'`OnboardingTour` actuel est linéaire (react-joyride). Les joueurs expérimentés le passent.

De plus, il faut que le OnboardingTour ne s'affiche plus une fois vu/complété.

**Proposition :** Système de tooltips "?" contextuels sur chaque composant clé, qui affichent une aide dans un Panel flottant sans bloquer l'UI.
- Icône `?` dans le coin de chaque card principale (Shipyard, TechTree, Market)
- Cliquer ouvre un panel `HelpPanel.tsx` avec contexte et lien vers wiki

---

## État complet du projet (résumé)

| Module | État | Note |
|--------|------|------|
| Auth | ✅ | Stable |
| Bâtiments / Build Queue | ✅ | Stable |
| Flottes / Combat | ✅ | Stable |
| Espionnage | ✅ | Stable |
| Tech Tree | ✅ | Stable |
| Marché P2P | ✅ | Paginé |
| Commerce PNJ | ✅ | Stable |
| Marché de Planètes | ✅ | Stable |
| Notifications (WS + DB) | ✅ | Stable |
| Ranking / Leaderboard | ✅ | SQL paginé, scores cachés |
| Reports / Logs | ✅ | Paginés |
| Alliances | ✅ | Stable |
| Missions / Achievements | ✅ | Stable |
| Marché Noir / Pirates | ✅ | Stable |
| Routes commerciales | ✅ | Stable |
| Analytics / Dashboard | ✅ | Stable |
| **main.rs** | 🟡 **Partiel** | handlers/ créés, planets.rs + fleet.rs restent |
| Rate Limiting | 🟡 Manquant | Priorité sécurité |
| WS Events complets | 🟡 Partiel | building/research_complete manquants |
| Champs de Débris | ✅ Backend fait | Frontend (GalaxyView 💫) reste à faire |
| DetailedCombatReport | ✅ Implémenté | Frontend (ReportsTerminal) reste à faire |
| Skeleton Loaders | 🟢 UX nice-to-have | Frontend |
| Galaxy Search | 🟢 UX nice-to-have | Frontend |
| Favoris planètes | 🟢 UX nice-to-have | Frontend |

---

# EXPANSION 5.0 — Refactoring Mécanique de Jeu

> Session à venir — Branche suggérée : `feat/expansion-5-mechanics`

## Diagnostic de l'état actuel (analyse du code)

| Aspect | État actuel | Problème |
|--------|-------------|---------|
| Défenses en combat | ✅ Elles **attaquent déjà** via `defender_fleet` (combat.rs l.363) | Aucun — c'est implémenté |
| `resolve_pvp()` (legacy) | 🔴 Encore utilisée dans main.rs | Fonction dupliquée — à migrer vers `resolve_pvp_combat()` |
| Champ de débris | 🔴 Retourne toujours `(0.0, 0.0)` | Pas de champ de débris généré après combat |
| Loot capping | 🟡 50% flat, pas de vraie limite cargo | Le cargo des vaisseaux n'est pas respecté |
| Consommation deutérium (vols) | 🔴 Absente | Les flottes en mission ne consomment pas de carburant |
| Expéditions | 🟡 Pirates = copie scalée du joueur | Manque de diversité et d'outcomes variés |
| `OnboardingTour` | 🔴 S'affiche à chaque connexion | Ne mémorise pas que le joueur l'a déjà vu |

---

## 🔴 Bug critique — `OnboardingTour` rejoué à chaque session

**Fichier :** `frontend/src/components/OnboardingTour.tsx`

**Bug :** Le tour s'affiche même après que le joueur l'ait complété.

**Fix :**
```tsx
// TODO CLAUDE (frontend): Vérifier localStorage avant d'afficher l'OnboardingTour.
// À l'initialisation du composant :
const hasSeenTour = localStorage.getItem('onboarding_completed') === 'true';
if (hasSeenTour) return null;

// À la completion du tour (onComplete callback) :
localStorage.setItem('onboarding_completed', 'true');
```

---

## 🔴 Fix — Migrer `resolve_pvp()` vers `resolve_pvp_combat()`

**Fichier backend :** `game_logic.rs` → `resolve_pvp()` (ligne ~701) + tous les appels dans `main.rs`

**Problème :** Il existe deux moteurs de combat différents en parallèle :
- `resolve_pvp()` dans `game_logic.rs` → ancien moteur, basé sur types hardcodés (light_hunter/cruiser uniquement)
- `resolve_pvp_combat()` dans `combat.rs` → nouveau moteur, DB-driven, extensible, avec tests

**TODO CLAUDE (backend) :** Remplacer **tous** les appels à `resolve_pvp()` dans `main.rs` par `combat::resolve_pvp_combat()`. Supprimer ensuite `resolve_pvp()` de `game_logic.rs` après validation.

```rust
// TODO CLAUDE: Migrer tous les appels resolve_pvp() vers combat::resolve_pvp_combat()
// dans main.rs. Ils se trouvent dans attack_handler (ou équivalent).
// Vérifier que les paramètres correspondent bien.
// Supprimer resolve_pvp() et PvpReport de game_logic.rs après migration.
```

---

## 🟡 Champ de Débris Post-Combat

**Fichier backend :** `combat.rs` → `PvpCombatReport.debris` (toujours `(0.0, 0.0)`)

**Mécanique attendue :** Après chaque combat, 30% du métal et 30% du cristal des vaisseaux/défenses détruits forment un champ de débris sur la case. Les recyclers peuvent le collecter.

**Implémentation :**
```rust
// TODO CLAUDE: Calculer les débris après combat dans resolve_pvp_combat() :
// Pour chaque vaisseau/défense détruit :
//   débris_métal   += ships_lost_count * ship_cost.metal   * 0.30
//   débris_cristal += ships_lost_count * ship_cost.crystal * 0.30
// Stocker dans un champ `debris` de la planète défenseur (ou table `debris_field`).
// Les défenses détruites NE génèrent PAS de débris (elles restent détruites).

// Modification du rapport :
pub debris: (f64, f64),  // (metal_debris, crystal_debris)
```

**Schema BDD requis :**
```sql
-- TODO CLAUDE: Ajouter une table debris_field ou colonnes sur planet
ALTER TABLE planet ADD COLUMN debris_metal FLOAT NOT NULL DEFAULT 0;
ALTER TABLE planet ADD COLUMN debris_crystal FLOAT NOT NULL DEFAULT 0;
-- ou table séparée avec galaxy/system/position
```

**Frontend :** Afficher le champ de débris dans `GalaxyView` avec une icône 💫 sur la case concernée, et dans l'interface Recycler.

---

## 🟡 Consommation de Deutérium par les Flottes

**Fichier backend :** `missions.rs` ou handler d'attaque dans `main.rs`

**Mécanique actuelle :** Les flottes partent sans consommer de carburant.

**Mécanique attendue :** Chaque mission coûte du deutérium proportionnel à la distance et au type de vaisseau.

**Formule suggérée :**
```rust
// TODO CLAUDE: Calculer la consommation de deutérium au lancement de mission :
// Pour chaque vaisseau de la flotte :
//   consommation = ships_count * distance_ly * DEUT_PER_SHIP_PER_LY
// Où DEUT_PER_SHIP_PER_LY est configurable par type de vaisseau dans server_config.
// Déduire de planet.deuterium_amount au départ. Refuser la mission si insuffisant.
//
// Valeurs par défaut suggérées (en deutérium par unité par parsec) :
// light_hunter: 10, heavy_hunter: 20, cruiser: 50, battleship: 150
// bomber: 200, destroyer: 300, transporter: 10, spy_probe: 1, colony_ship: 500

// Distance = |g1-g2| * 100 + |s1-s2| * 10 + |p1-p2|
```

**Frontend :** Afficher prévisualisation du coût deutérium dans `FleetDispatcher.tsx` avant confirmation.

```tsx
// TODO CLAUDE (frontend): Dans FleetDispatcher.tsx, afficher le coût en deutérium
// calculé côté client (même formule que backend) avant que le joueur confirme.
// Surligner en rouge si le joueur manque de deutérium.
```

---

## 🟡 Loot Capping — Respect de la Capacité Cargo

**Fichier backend :** `combat.rs` → calcul du loot après victoire (ligne ~426)

**Problème actuel :** Loot = 50% des ressources défenseur, sans vérifier si les vaisseaux survivants ont assez de capacité de cargo.

**Fix :**
```rust
// TODO CLAUDE: Après calcul du loot potentiel (50% des ressources défenseur),
// calculer la capacité cargo totale des vaisseaux attaquants survivants :
//   cargo_total = surviving_ships.iter().map(|(key, count)| count * get_ship_cargo_capacity(key)).sum()
// Limiter le loot au minimum entre le loot potentiel et cargo_total.
// Le loot est prélevé proportionnellement : metal en priorité, puis crystal, puis deuterium.
```

---

## 🟢 Amélioration Expéditions — Outcomes Diversifiés

**Fichier backend :** `combat.rs` → `resolve_expedition_combat()`

**Situation actuelle :** Les pirates sont une copie scalée de la flotte du joueur (50% à 110%). C'est prévisible et peu intéressant.

**Proposition : Système d'outcomes aléatoires pondérés**

```rust
// TODO CLAUDE: Remplacer le système de pirate "copie-scalée" par des outcomes pondérés :
// 
// Roll dé 1-100 :
// 1-5  : RIEN (vide spatial) — retour sans combat
// 6-20 : RESSOURCES FLOTTANTES — loot direct (metal + crystal aléatoire)  
// 21-60: PIRATES faibles (scaling 30-50%)
// 61-85: PIRATES moyens (scaling 50-80%, composition variée)
// 86-95: PIRATE FORT (scaling 80-120%, boss type)
// 96-99: DÉCOUVERTE — ressources + tech points bonus
// 100  : ARTEFACT ANCIEN — bonus unique (ex: +5% prod globale pendant 24h)
//
// Chaque outcome génère un log narratif différent.
// Les artefacts peuvent être stockés sur le User (table user_artifacts).
```

**Frontend :** Améliorer `ReportsTerminal.tsx` section expéditions avec icônes d'outcome distinctes (⚔️ combat, 💰 ressources, 🏺 artefact, 🌑 vide).

---

## 🟢 Améliorations Production — Mécaniques Manquantes

**Fichier backend :** `game_logic.rs`

### A. Cap de stockage des ressources

**Problème :** La production continue même quand les entrepôts sont pleins.

```rust
// TODO CLAUDE: Dans calculate_resources() et calculate_resources_with_energy(),
// plafonner le résultat au storage capacity de la planète :
// let cap = get_storage_capacity(planet.resource_storage_level, config);
// return (current_amount + production_per_sec * duration).min(cap);
```

### B. Bonus bâtiments de recherche sur vitesse de recherche

**Problème :** Le niveau du Laboratoire de Recherche n'accélère pas les recherches.

```rust
// TODO CLAUDE: Dans get_build_time() pour les recherches,
// appliquer un bonus de réduction selon le niveau du research lab :
// time_reduction = 1.0 - (research_lab_level * 0.05).min(0.5)
// Identique au bonus du Chantier Naval pour les bâtiments.
```

### C. Production de base passive (même sans mines)

**Proposition :** Chaque planète produit un minimum de ressources (ex: 20 métal/h) même sans mines, pour éviter que les nouveaux joueurs se retrouvent bloqués sans ressource.

```rust
// TODO CLAUDE: Ajouter une production passive minimale dans calculate_resource_production():
// let passive_metal = config.get_config("production_metal_passive", 20.0);
// Si level == 0 { return passive_metal * speed_factor; }
```

---

## Résumé des priorités Expansion 5.0

| Priorité | Item | Fichier | État |
|----------|------|---------|------|
| 🔴 Critique | Fix OnboardingTour localStorage | `OnboardingTour.tsx` | ✅ Déjà implémenté (vérifié) |
| 🔴 Critique | Migrer `resolve_pvp()` → `resolve_pvp_combat()` | `game_logic.rs`, `main.rs` | 🔴 Reste à faire |
| 🟡 Importante | Champ de débris post-combat | `combat.rs`, migration BDD | ✅ **FAIT** (session 2026-03-09) |
| 🟡 Importante | Consommation deutérium missions | `missions.rs`, `FleetDispatcher.tsx` | 🟡 Reste à faire |
| 🟡 Importante | Loot capping via cargo réel | `combat.rs` | ✅ **FAIT** (session 2026-03-09) |
| 🟢 Nice | Expéditions — outcomes diversifiés | `combat.rs` | 🟢 Reste à faire |
| 🟢 Nice | Storage cap sur production | `game_logic.rs` | ✅ **FAIT** (session 2026-03-09) |
| 🟢 Nice | Bonus research lab sur temps recherche | `game_logic.rs` | ✅ **FAIT** (session 2026-03-09) |
| 🟢 Nice | Production passive minimale | `game_logic.rs` | ✅ **FAIT** (session 2026-03-09) |
| 🔴 Critique | Refactoring handlers/ (galaxy, ranking, etc.) | `handlers/` | ✅ **FAIT** (session 2026-03-09) |
| 🔴 Critique | DetailedCombatReport round-by-round | `combat.rs` | ✅ **FAIT** (session 2026-03-09) |
| 🟡 Importante | handlers/planets.rs (get_planet, upgrade, build) | `handlers/planets.rs` | 🟡 À créer |
| 🟡 Importante | handlers/fleet.rs (attack, spy, expedition) | `handlers/fleet.rs` | 🟡 À créer |
| 🟡 Importante | WS Events complets (building/research complete) | `tick_system.rs` | 🟡 Reste à faire |
| 🟡 Importante | Afficher débris dans GalaxyView 💫 | `GalaxyView.tsx` | 🟡 À faire (antigravity) |
| 🟡 Importante | Endpoint GET /galaxy/:g/:s/debris | `handlers/galaxy.rs` | 🟡 À faire (antigravity) |

---

## ✅ Rapport de Combat Ultra-Complet — **FAIT** (session 2026-03-09)

> `DetailedCombatReport` implémenté dans `combat.rs`. Stocké dans `combat_log.details` (JSONB).
> **TODO (antigravity)** : Mettre à jour `ReportsTerminal.tsx` pour afficher le rapport structuré quand `details` est non-null.

### ~~Problème actuel~~ — Résolu

`PvpCombatReport` contient maintenant un champ `details: Option<DetailedCombatReport>` avec tracking round-by-round, dégâts par camp, boucliers absorbés, bonus tech, loot final, et débris.

### Nouvelle struct `DetailedCombatReport`

```rust
// TODO CLAUDE: Dans combat.rs, remplacer PvpCombatReport par DetailedCombatReport.
// Tous les champs doivent être Serialize/Deserialize pour stockage JSONB dans combat_log.details.

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetailedCombatReport {
    pub winner: String,              // "attacker" | "defender" | "draw"
    pub rounds_played: u8,           // 1–6
    pub attacker_stats: CombatantStats,
    pub defender_stats: CombatantStats,
    pub loot: ResourceTriple,
    pub debris: ResourcePair,        // 30% métal + cristal des vaisseaux détruits
    pub rounds: Vec<RoundLog>,       // Log détaillé par round
    pub attacker_bonuses: BonusSummary,
    pub defender_bonuses: BonusSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CombatantStats {
    pub fleet_initial: HashMap<String, i32>,    // ex: {"light_hunter": 100}
    pub defense_initial: HashMap<String, i32>,  // défenseur seulement, ex: {"missile_launcher": 10}
    pub fleet_remaining: HashMap<String, i32>,
    pub defense_remaining: HashMap<String, i32>,
    pub fleet_lost: HashMap<String, i32>,       // initial - remaining, par type
    pub defense_lost: HashMap<String, i32>,
    pub total_ships_lost: i32,
    pub total_defenses_lost: i32,
    pub total_damage_dealt: f64,
    pub total_damage_taken: f64,
    pub shields_absorbed: f64,  // dégâts stoppés par les boucliers (info affichage)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoundLog {
    pub round: u8,
    pub attacker_damage: f64,
    pub defender_damage: f64,
    pub attacker_ships_lost_this_round: i32,
    pub defender_ships_lost_this_round: i32,
    pub defender_defenses_lost_this_round: i32,
    pub narrative: String, // ex: "Tour 2 : l'attaquant inflige 45 000 dmg, perd 8 chasseurs"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BonusSummary {
    pub weapons_mult: f64,   // ex: 1.30
    pub shield_mult: f64,
    pub armour_mult: f64,
    pub weapons_tech_level: i32,
    pub shield_tech_level: i32,
    pub armour_tech_level: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceTriple { pub metal: f64, pub crystal: f64, pub deuterium: f64 }
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcePair { pub metal: f64, pub crystal: f64 }
```

### Modifications dans `resolve_pvp_combat()`

```rust
// TODO CLAUDE: Tracker les états de flotte AVANT chaque round pour calculer les pertes par round.
//
// Helpers à ajouter dans combat.rs (privés, pas dans main.rs) :
fn ships_count_only(fleet: &Fleet) -> i32 {
    fleet.ships.iter().filter(|(k, _)| !k.starts_with("def_")).map(|(_, v)| v).sum()
}
fn defenses_count_only(fleet: &Fleet) -> i32 {
    fleet.ships.iter().filter(|(k, _)| k.starts_with("def_")).map(|(_, v)| v).sum()
}
//
// Avant chaque round : snapshot attacker_count, defender_ships_count, defender_defs_count
// Après each round : delta = avant - après → RoundLog
// Accumuler total_damage_dealt/taken sur l'ensemble des rounds
// À la fin : calculer fleet_lost = initial - remaining pour chaque type
```

### Calcul des débris intégré dans `resolve_pvp_combat()`

```rust
// TODO CLAUDE: Calculer les débris à partir des vaisseaux perdus (PAS les défenses) :
// Pour chaque (ship_key, count_lost) dans attacker_stats.fleet_lost + defender_stats.fleet_lost :
//   let (cost_metal, cost_crystal) = game_logic::get_unit_cost(ship_key, config);
//   debris.metal   += count_lost as f64 * cost_metal   * debris_factor_metal   (config, défaut 0.30)
//   debris.crystal += count_lost as f64 * cost_crystal * debris_factor_crystal (config, défaut 0.30)
// Note: get_unit_cost() est dans game_logic.rs — import via crate::game_logic
```

### Migration BDD

```sql
-- TODO CLAUDE: Ajouter colonne JSONB dans combat_log pour le rapport détaillé
ALTER TABLE combat_log ADD COLUMN details JSONB;
-- Stocker DetailedCombatReport sérialisé. Le champ log (Vec<String>) reste pour compat.

-- Table pour les champs de débris (voir section suivante)
CREATE TABLE debris_field (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    galaxy    INTEGER NOT NULL,
    system    INTEGER NOT NULL,
    position  INTEGER NOT NULL,
    metal     FLOAT   NOT NULL DEFAULT 0,
    crystal   FLOAT   NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(galaxy, system, position)
);
CREATE INDEX idx_debris_field_coords ON debris_field(galaxy, system, position);
```

### Frontend `ReportsTerminal.tsx` — Rapport enrichi

```tsx
// TODO CLAUDE (frontend): Si combat_log.details existe (rapport détaillé), afficher :
//
// 1. HEADER STATS — 2 colonnes (Attaquant | Défenseur)
//    ┌─────────────────────┬──────────────────────┐
//    │  Vaisseaux perdus   │  Défenses perdues     │
//    │  Dégâts infligés    │  Boucliers absorbés   │
//    └─────────────────────┴──────────────────────┘
//
// 2. BONUS TECH (collapsible)
//    Attaquant: Armes ×1.30 (+30%) | Bouclier ×1.10 | Blindage ×1.20
//    Défenseur: Armes ×1.00        | Bouclier ×1.50 | Blindage ×1.40
//
// 3. TABLE DES PERTES PAR TYPE (responsive grid)
//    Type              Initial  Perdu   Restant
//    Chasseur léger      100     -38      62
//    Lanceur missiles     10     -10       0  ← rouge = tout détruit
//
// 4. LOG PAR ROUND (timeline accordéon)
//    ● Tour 1: ATT 45 000 dmg / DEF 28 000 dmg — ATT perd 12 chasseurs
//    ● Tour 2: ATT 38 000 dmg / DEF 21 000 dmg — DEF: 3 lanceurs détruits
//
// 5. BUTIN & DÉBRIS
//    💰 Pillé  : +120k Métal | +60k Cristal | +20k Deutérium
//    💫 Débris : +36k Métal  | +18k Cristal  (recyclable depuis la carte)
```

---

## 🟡 Champ de Débris — Mécanique Recycleur Complète

> ⚠️ Règle architecturale : les handlers de recyclage vont dans `backend/src/handlers/fleet.rs`. La lecture des débris pour la galaxy view va dans `backend/src/handlers/galaxy.rs`. PAS dans `main.rs`.

### Vue d'ensemble

Après chaque combat : 30% métal + 30% cristal des vaisseaux détruits (deux camps) → `debris_field`.
Les défenses détruites ne génèrent PAS de débris.
Le Recycleur collecte les débris en mission, revient avec les ressources.

### Endpoint — Lire les débris d'un système

```rust
// TODO CLAUDE: Dans handlers/galaxy.rs, ajouter :
// GET /galaxy/:g/system/:s/debris
// → SELECT * FROM debris_field WHERE galaxy=$1 AND system=$2 AND metal+crystal > 0
// → Vec<{ galaxy, system, position, metal, crystal }>
// Appelé par GalaxyView.tsx au chargement d'un système.
```

### Endpoint — Lancer une mission de recyclage

```rust
// TODO CLAUDE: Dans handlers/fleet.rs, ajouter :
// POST /fleet/recycle
// Body: { source_planet_id: Uuid, galaxy: i32, system: i32, position: i32, recyclers: i32 }
//
// Validations :
//   1. planet.recycler_count >= recyclers demandés
//   2. debris_field existe à (galaxy, system, position) et metal+crystal > 0
//   3. Pas de protection active sur la planète source
//
// Calcul de collecte :
//   let capacity = recyclers * config.get_config("cargo_recycler", 20000.0);
//   // Métal en priorité, puis cristal
//   let metal_col   = debris.metal.min(capacity * 0.6_f64);
//   let crystal_col = debris.crystal.min(capacity - metal_col);
//
// Actions DB :
//   a. planet.recycler_count -= recyclers  (vaisseaux partent)
//   b. debris.metal -= metal_col; debris.crystal -= crystal_col; (ou DELETE si vide)
//   c. Créer FleetMission { mission_type: "recycle", loot_metal: metal_col,
//         loot_crystal: crystal_col, arrives_at: now + travel_time }
//
// Réponse : { mission_id, travel_time_s, estimated_loot: { metal, crystal } }
```

### Tick System — Retour de recyclage

```rust
// TODO CLAUDE: Dans tick_system.rs, handler des missions "recycle" arrivées :
//   for mission in recycle_missions_done {
//       planet.metal_amount   += mission.loot_metal;
//       planet.crystal_amount += mission.loot_crystal;
//       planet.recycler_count += mission.recyclers_sent; // restituer les vaisseaux
//       mission.delete();
//       ws.emit(FleetArrived { planet_id, loot: { metal, crystal } });
//   }
// Note : FleetMission n'a peut-être pas encore de champ recyclers_sent — à ajouter en migration.
```

### Migration BDD — Champ recycleurs sur FleetMission

```sql
-- TODO CLAUDE: Si FleetMission ne stocke pas le nombre de recycleurs envoyés :
ALTER TABLE fleet_mission ADD COLUMN recyclers_sent INTEGER NOT NULL DEFAULT 0;
-- Rempli lors du POST /fleet/recycle, utilisé au retour pour restituer les vaisseaux.
```

### Frontend — GalaxyView

```tsx
// TODO CLAUDE (frontend): Dans GalaxyView.tsx / SystemView :
//
// 1. Au chargement d'un système, fetch GET /galaxy/:g/system/:s/debris
//    Stocker dans debrisFields: Map<position, {metal, crystal}>
//
// 2. Sur les planètes/positions avec débris, afficher une icône 💫 animée
//    (pulse CSS, couleur or) avec tooltip "Champ de débris — M: 36k / C: 18k"
//
// 3. Dans RadialMenu.tsx, ajouter option "Recycler" (icône ♻️) si debris_field > 0
//    → ouvre un modal compact :
//       [Champ de débris : 36 000 Métal / 18 000 Cristal]
//       [Recycleurs disponibles : 5]   Slider: [===] 3
//       [Capacité: 60 000 | Récolte estimée: M +21 600 / C +10 800]
//       [Bouton "Envoyer les recycleurs"]
```

### Frontend — FleetDispatcher

```tsx
// TODO CLAUDE (frontend): Dans FleetDispatcher.tsx, supporter mission_type === "recycle" :
//   - Filtrer ship selector pour montrer uniquement "recycler"
//   - Afficher le débris cible avec métal + cristal disponibles
//   - Prévisualiser la récolte basée sur le count de recycleurs sélectionnés
//   - Soumettre vers POST /fleet/recycle (différent de POST /fleet/attack)
```

