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
