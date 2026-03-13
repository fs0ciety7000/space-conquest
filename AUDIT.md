# AUDIT COMPLET — Space Conquest
**Date :** 2026-03-13
**Rôles :** @project-manager · @game-designer · @backend-architect · @frontend-developer · @reality-checker
**Périmètre :** 111 fichiers Rust · 132 fichiers TypeScript/React · 103 migrations SeaORM

---

## SYNTHÈSE EXÉCUTIVE

| Domaine | Total | 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW |
|---------|-------|-------------|---------|-----------|--------|
| Build Queue & Construction | 18 | 6 | 6 | 4 | 2 |
| Production de ressources | 12 | 2 | 4 | 4 | 2 |
| Formules & Équilibrage | 15 | 3 | 4 | 5 | 3 |
| Combat & Missions de flotte | 14 | 3 | 4 | 5 | 2 |
| Marché, Économie & Routes | 18 | 5 | 7 | 5 | 1 |
| Auth, Sécurité & Rate Limit | 15 | 4 | 5 | 6 | 0 |
| Tech Tree, Alliance & Missions | 12 | 5 | 6 | 1 | 0 |
| WebSocket, Notifications & Tick | 12 | 3 | 5 | 4 | 0 |
| Galaxie, Planètes & Gouvernance | 10 | 3 | 6 | 1 | 0 |
| Frontend — Core | 13 | 2 | 7 | 3 | 1 |
| Frontend — Étendu | 19 | 4 | 8 | 6 | 1 |
| **TOTAL** | **158** | **40** | **62** | **44** | **12** |

> ⚠️ **40 bugs CRITIQUES** confirmés. Le jeu n'est **pas déployable en l'état**.
> La cause racine la plus fréquente : **opérations multi-étapes sans transaction SeaORM** + **absence totale de middleware d'authentification sur les routes de jeu**.

---

## 🔴 TOP 10 — BLOCKERS ABSOLUS (déploiement impossible)

| # | ID | Description | Fichier |
|---|----|-------------|---------|
| 1 | SEC-01 | Token non signé `jwt-{uuid}` accepté → usurpation de tout compte dont l'UUID est connu | `auth.rs:77` |
| 2 | SEC-02 | Tous les endpoints admin lisent `user_id` depuis le query string, pas de JWT | `admin.rs:136+` |
| 3 | SEC-03 | Aucun middleware d'auth sur les routes de jeu (`/attack`, `/build-queue`, etc.) | `main.rs:298` |
| 4 | SEC-04 | `user_id`/`buyer_user_id` acceptés depuis le body de la requête pour les actions marché | `main.rs:3610` |
| 5 | BQ-008 | Injection SQL via `item_key` dans la build queue (`format!()` non paramétré) | `build_queue.rs:534` |
| 6 | GAL-004 | Colonisation identifie l'appelant via `current_planet_id` (pas de JWT) → vol de vaisseaux | `galaxy.rs:285` |
| 7 | WS-10 | Endpoint notifications sans auth → lecture des alertes d'attaque de n'importe quel joueur | `notifications.rs:53` |
| 8 | MKT-009 | Prix négatif autorisé sur les annonces de planètes → création de ressources ex nihilo | `planet_market.rs:253` |
| 9 | BAL-005 | Clé de bâtiment absente du cache → coût = 0 → amélioration gratuite infinie | `game_logic.rs:77` |
| 10 | WS-09 | `.unwrap()` sur `syndicate_credits` NULL → crash permanent du worker PVE | `server_events.rs:396` |

---

## DOMAINE 1 — BUILD QUEUE & CONSTRUCTION

### 🔴 CRITICAL

**BQ-001** · `build_queue.rs:420` — Lock acquis APRÈS déduction des ressources (TOCTOU). Double-spend possible par double-clic.
**BQ-002** · `shipyard.rs:787` — Déduction ressources + INSERT queue non atomiques pour vaisseaux et défenses.
**BQ-003** · `build_queue.rs:444` — `add_to_queue`: déduction + démarrage immédiat non atomiques. Pas de rollback.
**BQ-004** · `build_queue.rs:591` — Cancel: `DELETE` + remboursement dans deux statements séparés. Duplication de remboursement possible.
**BQ-005** · `tick_system.rs:171` — Complétion tick: `UPDATE` + `DELETE` non atomiques → bâtiment complété deux fois après redémarrage.
**BQ-006** · `tick_system.rs:44` — Complétion research/ships/defense: pas de transaction → duplication de vaisseaux après instabilité serveur.

### 🟠 HIGH

**BQ-007** · `build_queue.rs:288` — Les deux branches de `facility_key` retournent `"shipyard"` → temps de construction des bâtiments erronés.
**BQ-008** · `build_queue.rs:534` — **Injection SQL** via `body.item_key` interpolé dans `format!()`.
**BQ-009** · `shipyard.rs:1313` — Handler fleet legacy: pas de transaction + pas de vérification propriété planète.
**BQ-010** · `shipyard.rs:320` — `start_research_handler`: propriété de la planète jamais vérifiée.
**BQ-011** · `build_queue.rs:632` — Pattern N+1: 500 planètes × 5 catégories × 4 queries = 10 000 requêtes DB/tick.
**BQ-012** · `shipyard.rs:37` — `apply_lazy_eval` ne persiste jamais en DB → `last_update` non mis à jour → duplication passive de ressources.

### 🟡 MEDIUM

**BQ-013** · `tick_system.rs:193` — Level clamping silencieux: corrige sans loguer, bâtiment avance quand même.
**BQ-014** · `shipyard.rs:778` — `.unwrap()` sur `Option<i32>` après `.is_some()` → panique possible.
**BQ-015** · `build_queue.rs:413` — `RwLock::read().unwrap()` → panique en cascade si lock empoisonné.
**BQ-016** · `shipyard.rs:130` — Formule temps d'affichage vs temps réel divergent à haute vitesse de serveur.

### 🟢 LOW

**BQ-017** · `build_queue.rs:691` — Start + DELETE non atomiques → double-démarrage sur crash.
**BQ-018** · `construction_queue.rs` — Pas de `created_at`, ordre non déterministe.

---

## DOMAINE 2 — PRODUCTION DE RESSOURCES

### 🔴 CRITICAL

**RES-001** · `planets.rs:1155` — `upgrade_mine_handler`: pas de transaction DB + pas de SELECT FOR UPDATE → double-spend concurrent multi-instance.
**RES-002** · `main.rs:4823` — `build_ships_handler`: déduction calculée sur snapshot externe, jamais recalculée dans la transaction → race condition.

### 🟠 HIGH

**RES-003** · `game_logic.rs:235` — Durée négative non clampée → ressources drainées si `last_update` dans le futur.
**RES-004** · `planets.rs:1493` — Cancel construction: remboursement sans mise à jour de `last_update` → production comptée deux fois.
**RES-005** · `planets.rs:549` — Transport/recycle: ressources ajoutées sans `last_update` + sans cap de stockage.
**RES-006** · `game_logic.rs:77` — Clé absente du cache → coût = 0 (voir BAL-005).

### 🟡 MEDIUM

**RES-007** · `main.rs:1003` — Loot attaquant: `last_update` non mis à jour après combat.
**RES-008** · `planets.rs:1305` — `plasma_tech_level` hardcodé à `0` dans le pré-check → refus de construction légitimes.
**RES-009** · `planets.rs:295` — Cap de stockage: planète déjà au-dessus du cap continue à accumuler indéfiniment.
**RES-010** · `game_logic.rs:246` — Fonction legacy `calculate_resources` ignore l'énergie fusion.

### 🟢 LOW

**RES-011** · `planets.rs:1694` — `/my-planets` retourne des ressources sans lazy evaluation.
**RES-012** · `economy_log.rs:59` — Échecs de log silencieux, pas de métrique observable.

---

## DOMAINE 3 — FORMULES & ÉQUILIBRAGE

### 🔴 CRITICAL

**BAL-001** · `useRealtimeResources.ts:89` — Formule complète de production dupliquée côté client (exploit: anti-oscillation favorise le client).
**BAL-002** · `useRealtimeResources.ts:182` — `Math.max(serverVal, displayedVal)` → dérive permanente vers le haut des ressources affichées.
**BAL-005** · `game_logic.rs:77` — Clé de bâtiment absente → coût = 0 → amélioration gratuite infinie.

### 🟠 HIGH

**BAL-003** · `useRealtimeResources.ts:67` — Bonus énergie tech: `0.10` côté client vs `0.01` backend → facteur **10x de dérive** à Energy Tech 10.
**BAL-004** · `game_logic.rs:445` — `get_upgrade_cost()` legacy ignore `_config` → dead code trap, changements admin sans effet.
**BAL-006** · `game_logic.rs:1326` — Coûts de slots linéaires (×1,×2,×3,×4) au lieu d'exponentiels → trivial à maxxer en début de partie.
**BAL-007** · `game_logic.rs:635` — Light Fighter = 66 min à Chantier naval niveau 0. Trop lent, session-killer pour nouveaux joueurs.

### 🟡 MEDIUM

**BAL-008** · `game_logic.rs:1123` — Formule temps de vol: falaises brutales à dist=1000 et dist=10 000 (3x plus long d'un coup).
**BAL-009** · `game_logic.rs:1107` — Distance inter-galaxies linéaire, pas circulaire → avantage structurel galaxies centrales.
**BAL-010** · `game_logic.rs:923` — `apply_losses()` distribution uniforme → Cruiser quasi-immortel caché derrière les Light Fighters.
**BAL-011** · `game_logic.rs:964` — `resolve_pvp()` ignore 4 types de vaisseaux sur 6 → Heavy Hunters/Battleships/Bombers/Destroyers ne servent à rien.
**BAL-012** · `game_logic.rs:238` — Collision de nom: `energy_tech_bonus` (1%/level mines) vs `energy_tech_solar_bonus` (10%/level solaire).

### 🟢 LOW

**BAL-013** · `game_logic.rs:459` — Deutérium mine ne coûte jamais de deutérium → sink économique manquant.
**BAL-014** · `game_logic.rs:650` — Capacité hangar linéaire → pas d'anti-snowball pour les top joueurs.
**BAL-015** · `game_logic.rs:672` — Constante `TRANSPORTER_CAPACITY` dépréciée toujours exportée.

---

## DOMAINE 4 — COMBAT & MISSIONS DE FLOTTE

### 🔴 CRITICAL

**CMB-001** · `fleet.rs:803` — Recycleur: déduction vaisseaux + fuel dans deux statements séparés.
**CMB-002** · `fleet.rs:1456` — Expédition: fuel, vaisseaux et loot non atomiques (`let _ =` sur update fuel).
**CMB-003** · `fleet.rs:2603` — ACS join: vérification disponibilité vaisseaux HORS transaction → TOCTOU.

### 🟠 HIGH

**CMB-004** · `fleet.rs:2383` — Échec piraterie: boucle de destruction de flotte non atomique + snapshot périmé.
**CMB-005** · `combat.rs:94` — Cache rapid fire: 1+2R requêtes par résolution de combat (N+1 par règle).
**CMB-006** · `fleet.rs:416` — Spy handler: UUID nil silencieux au lieu de 401 sur token invalide.
**CMB-007** · `fleet.rs:630` — Logs de combat espionnage silencieusement supprimés → mécanisme anti-harcèlement contournable.

### 🟡 MEDIUM

**CMB-008** · `combat.rs:207` — Underflow float dans ratio de pertes → survivants en nombre négatif possible (cast `i32::MAX`).
**CMB-009** · `fleet.rs:1829` — `set_combat_zone_handler`: propriété de la planète non vérifiée.
**CMB-010** · `fleet.rs:2088` — Recall deploy: restauration vaisseaux non atomique → duplication de flotte par double requête.
**CMB-011** · `fleet.rs:1116` — `update_planet_ships_after_combat` utilise une valeur périmée → vaisseaux construits pendant combat peuvent disparaître.
**CMB-012** · `fleet.rs:1276` — N+1 requêtes pour bonus modules flagship par dispatch d'attaque.

### 🟢 LOW

**CMB-013** · `combat.rs:704` — `simulate_pvp_combat` ignore cargo cap et débris → tests ne couvrent pas ces chemins critiques.
**CMB-014** · `fleet.rs:192` — Toute la chaîne d'auth flotte repose sur `current_planet_id` query param, pas sur JWT.

---

## DOMAINE 5 — MARCHÉ, ÉCONOMIE & ROUTES COMMERCIALES

### 🔴 CRITICAL

**MKT-001** · `planet_market.rs:532` — Achat planète: 5 SQL statements séparés sans transaction → duplication ressources sur crash.
**MKT-002** · `planet_market.rs:687` — Vente NPC: crédit avant suppression planète → exploit infini si DELETE échoue.
**MKT-003** · `trade_routes.rs:759` — Exécution route: source drainée + destination créditée en 2 statements séparés.
**MKT-004** · `planet_market.rs:438` — Pas de SELECT FOR UPDATE sur l'annonce → double-vente possible par race condition.
**MKT-005** · `black_market.rs:820` — Résolution extorsion: déduction crédits hors transaction → double-dépense.

### 🟠 HIGH

**MKT-006** · `trade_routes.rs:404` — `PATCH /trade-routes/:id`: pas de vérification propriété → n'importe quel joueur peut modifier les routes d'un autre.
**MKT-007** · `black_market.rs:385` — N+1 requêtes par item d'inventaire + dans la boucle tick.
**MKT-008** · `planet_market.rs:62+` — Interpolation UUID dans `format!()` SQL (pattern dangereux).
**MKT-009** · `planet_market.rs:253` — **Prix négatif autorisé** → `metal_amount - (-1_000_000)` = +1M métal pour l'acheteur.
**MKT-010** · `trade_routes.rs:835` — N+1 requêtes piraterie dans le tick: M+2 queries par route d'exécution.
**MKT-011** · `market_listing.rs:12` — `quantity` et `price_per_unit` en `f64` sans contrainte `> 0`.
**MKT-012** · `market.rs:92` — `calculate_server_resource_totals` charge toutes les planètes en mémoire au lieu d'un `SUM()` SQL.

### 🟡 MEDIUM

**MKT-013** · `black_market.rs:153` — Pas de cap de prix → admin peut fixer `base_price` à l'infini.
**MKT-014** · `trade_routes.rs:720` — Drift float sur ressources après milliers d'exécutions de routes.
**MKT-015** · `economy_log.rs:211` — Requête log marché planètes référence de mauvaises colonnes → événements jamais enregistrés.
**MKT-016** · `trade_routes.rs:496` — `let _ = db.execute(...)` → echec UPDATE silencieux, retour 200 faux.
**MKT-017** · `black_market.rs:560` — Activation effet temporel: vérification hors transaction → activation double possible.

### 🟢 LOW

**MKT-018** · `market.rs:122` — `.unwrap()` sur UUID hardcodé (pattern non-conforme à la règle no-unwrap).

---

## DOMAINE 6 — AUTH, SÉCURITÉ & RATE LIMITING

### 🔴 CRITICAL

**SEC-01** · `auth.rs:77` — **Token non signé `jwt-{uuid}` accepté** → usurpation de n'importe quel compte.
**SEC-02** · `admin.rs:136+` — **Tous les handlers admin lisent `user_id` du query string**, pas de JWT.
**SEC-03** · `main.rs:298` — **Aucun middleware d'auth sur les routes de jeu** (`/attack`, `/build-queue`, etc.).
**SEC-04** · `main.rs:3610` — **`user_id`/`buyer_user_id` acceptés depuis le body** pour les actions marché.

### 🟠 HIGH

**SEC-05** · `main.rs:5111` — `POST /tick` totalement non authentifié → accélération artificielle de toute la progression.
**SEC-06** · `build_queue.rs:534` — Injection SQL via `item_key` (voir BQ-008).
**SEC-07** · `planet_market.rs:59+` — Pattern SQL injection via interpolation UUID.
**SEC-08** · `main.rs:2142` — Interpolation `f64` dans raw SQL → SQL invalide si NaN/Inf.
**SEC-09** · `main.rs:5694` — Bounty: `user_id` depuis le body, pas de JWT.

### 🟡 MEDIUM

**SEC-10** · `auth.rs:491` — Reset mot de passe accepte min 6 caractères vs 8 à l'inscription.
**SEC-11** · `auth.rs:519` — Pas d'invalidation de session sur changement de mot de passe (7 jours de grâce pour l'attaquant).
**SEC-12** · `auth.rs:445` — Pas de rate limiting sur `forgot_password` → email bombing possible.
**SEC-13** · `main.rs:281` — `CorsLayer::permissive()` → toutes origines autorisées.
**SEC-14** · `auth.rs:270` — `bcrypt::DEFAULT_COST` implicite, non configurable.
**SEC-15** · `main.rs:1430` — Colonne ORDER BY depuis input utilisateur dans `format!()` (fallback protège aujourd'hui).

---

## DOMAINE 7 — TECH TREE, ALLIANCE & MISSIONS

### 🔴 CRITICAL

**ALI-001** · `tech_tree.rs:393` — Prérequis tech vérifiés hors transaction → bypass tech tree par race condition.
**ALI-002** · `officers.rs:278` — Recrutement/levelup officier: coût non atomique avec l'insert.
**ALI-003** · `missions.rs:286` — Récompense mission: crédit planète PUIS statut `claimed` séparés → duplication de récompenses.
**ALI-004** · `missions.rs:847` — Récompense journalière: race condition double-claim.
**ALI-005** · `alliance.rs:206` — Rejoindre alliance: check membre hors transaction → multi-appartenance simultanée possible.

### 🟠 HIGH

**ALI-006** · `alliance.rs:494` — Dissolution alliance: 3 DELETE séparés → membres orphelins avec accès admin.
**ALI-007** · `alliance.rs:761` — Transfert leadership: 3 UPDATE séparés → deux leaders ou zéro leader.
**ALI-008** · `missions.rs:751` — `.unwrap()` dans `get_or_create_streak` → panique serveur exploitable.
**ALI-009** · `alliance.rs:768` — `.unwrap()` dans `transfer_leadership_handler` → panique par race condition.
**ALI-010** · `protection.rs:10` — Protection débutant ré-applicable → immunité permanente aux attaques.
**ALI-011** · `tech_tree.rs:287+` — N+1 queries dans `PlanetData::load` → ~2 650 queries pour détail alliance 50 membres.

### 🟡 MEDIUM

**ALI-012** · `officers.rs:54` — Bonus officiers globaux (pas par planète) → design gap potentiel.

---

## DOMAINE 8 — WEBSOCKET, NOTIFICATIONS & TICK SYSTEM

### 🔴 CRITICAL

**WS-05** · `server_events.rs:200` — `record_contribution`: race condition → double-participation = duplication de récompenses PVE.
**WS-09** · `server_events.rs:396` — `.unwrap()` sur `syndicate_credits` NULL → crash permanent du worker PVE.
**WS-10** · `notifications.rs:53` — **Endpoint notifications sans auth** → lecture des alertes d'attaque de tout joueur.

### 🟠 HIGH

**WS-02** · `websocket.rs:391` — Identité JWT extraite mais jamais passée à `handle_socket` → auth découplée de l'autorisation.
**WS-03** · `websocket.rs:480` — `recv_task` jamais annulée → fuite de tasks Tokio à chaque déconnexion.
**WS-04** · `server_events.rs:300` — `.await` manquant sur `broadcast_global` → tous les broadcasts PVE sont des no-ops.
**WS-06** · `tick_system.rs:32` — Tick non tickless: 4 full table scans toutes les 2s (O(N) croissant avec le nb joueurs).
**WS-07** · `main.rs:600` — Worker tick: pas de restart logic → une panique freeze toute la progression du jeu.
**WS-08** · `websocket.rs:441+` — `.unwrap()` dans tasks Tokio → cascade si RwLock empoisonné.

### 🟡 MEDIUM

**WS-01** · `websocket.rs:413` — Joueur authentifié peut s'abonner au channel WebSocket d'une planète adverse.
**WS-11** · `server_events.rs:473` — Annonce événement re-broadcastée toutes les 30s pendant 1h → 120 doublons par joueur.
**WS-12** · `websocket.rs:538` — `send_task` et `update_task` non annulées quand `recv_task` termine (fin propre client).

---

## DOMAINE 9 — GALAXIE, PLANÈTES, SABOTAGE & GOUVERNANCE

### 🔴 CRITICAL

**GAL-001** · `planets.rs:1151` — `upgrade_mine_handler` sans vérification propriété: tout joueur peut upgrader toute planète et drainer ses ressources.
**GAL-003** · `planets.rs:1401` — Cancel construction: sans auth + sans transaction → double-remboursement + griefing inter-joueur.
**GAL-004** · `galaxy.rs:285` — Colonisation identifie l'appelant via `current_planet_id` (pas de JWT) → vol de colony ships.

### 🟠 HIGH

**GAL-002** · `planets.rs:1379` — `rename_planet_handler`: aucune vérification auth.
**GAL-005** · `galaxy.rs:285` — Pas de validation coordonnées → planètes hors limites créables (overflow dans distance calc).
**GAL-006** · `galaxy.rs:388` — Race condition: deux joueurs colonisent le même slot simultanément → perte de colony ship sans refund.
**GAL-007** · `sabotage.rs:399` — Effets durables de sabotage empilables sans limite → verrouillage production permanent via rotation d'attaquants.
**GAL-008** · `governance.rs:678` — Vote loi: INSERT vote + UPDATE compteur non atomiques → votes non comptés sur crash.
**GAL-009** · `governance.rs:233` — Effets de loi appliqués en boucle hors transaction → application partielle irréversible.

### 🟡 MEDIUM

**GAL-010** · `galaxy.rs:109` — Vue galaxie expose `owner_id` UUID publiquement → amplifie tous les exploits d'usurpation (SEC-01 combiné).

---

## DOMAINE 10 — FRONTEND CORE

### 🔴 CRITICAL

**UI-01** · `Facilities.tsx:274` — Coûts d'upgrade calculés côté client → affichage trompeur, fausse sécurité visuelle.
**UI-02** · `Shipyard.tsx:104` — Stats de combat (attack/shield/hull) calculées côté client avec coefficient `0.1` hardcodé.

### 🟠 HIGH

**UI-03** · `useRealtimeResources.ts:71` — Formule production dupliquée côté client avec fallback hardcodé divergent du backend.
**UI-04** · `BuildQueueManager.tsx:310` — Drag-and-drop optimiste ne se revert pas sur erreur HTTP non-2xx.
**UI-05** · `BuildQueueManager.tsx:117` — Timers utilisent `Date.now()` sans synchronisation horloge serveur → décalage affiché.
**UI-06** · `useRealtimeResources.ts:108` — `safeConfig` instable → boucle infinie potentielle si `config` undefined.
**UI-07** · `useWebSocket.ts:546` — `connect` exclue du dependency array avec eslint-disable → régression silencieuse future.
**UI-09** · `Shipyard.tsx:156` / `Facilities.tsx:230` — Pas de guard double-click → deux requêtes simultanées possibles.

### 🟡 MEDIUM

**UI-08** · `useWebSocket.ts:199` — Callback ref pattern non documenté → piège à maintenance.
**UI-10** · `Shipyard.tsx:72` — État local `buildQueue` désynchronise l'overlay "ASSEMBLAGE".
**UI-11** · `Facilities.tsx:241` — `targetLevel` calculé côté client → niveau erroné si requête concurrente.
**UI-12** · `WebSocketContext.tsx:25` — Paramètres son lus une fois depuis localStorage, jamais mis à jour.
**UI-13** · `PlanetContext.tsx:93` — Double fetch quand `token` change (dépendance dupliquée).

---

## DOMAINE 11 — FRONTEND ÉTENDU

### 🔴 CRITICAL

**FE-01** · `FleetDispatcher.tsx:41` — Temps de vol calculé côté client, `hyperspaceLevel` hardcodé à `0` avec TODO.
**FE-02** · `TechTree.tsx:59` / `ResourceDisplay.tsx:326` — Formules de coût tech + bâtiments avec fallback hardcodé (magic numbers `60`, `48`, `225`...).
**FE-03** · `ResourceDisplay.tsx:255` / `PlanetOverview.tsx:340` — Taux de production calculé côté client, commentaire interne: *"diverge du backend"*.
**FE-04** · `ResourceDisplay.tsx:178` — Coût activation slot hardcodé (`5000 * 2^slotIndex`) non sourcé du serveur.

### 🟠 HIGH

**FE-05** · `ResourceDisplay.tsx:222` — Pas de guard submitting sur bouton upgrade → double-click exploit.
**FE-06** · `TechTree.tsx:111` — Pas de guard submitting sur recherche.
**FE-07** · Multiple fichiers — Echecs de fetch silencieux (`catch { /* silently ignore */ }`) dans 5+ composants.
**FE-08** · `Marketplace.tsx:24` — Polling marché toutes les 5s → devrait utiliser WebSocket.
**FE-09** · 7 composants — `localStorage.getItem('token')` et `user_id` dans chaque composant → XSS = takeover total.
**FE-10** · `FleetDispatcher.tsx:227` — Cap de vaisseaux côté client avec données périmées depuis le dernier fetch.
**FE-11** · `EmpireBar.tsx:179` — Capacité de stockage hardcodée (`600 000 × 1.6^level`) non sourcée du serveur.
**FE-12** · `PlanetOverview.tsx:400` — Capacité hangar hardcodée (`500 + 500×level`) non sourcée du serveur.

### 🟡 MEDIUM

**FE-13** · `PlanetOverview.tsx:379` — Multiplicateurs tech combat hardcodés (`0.1`, `0.05`), pas du config serveur.
**FE-14** · `PlanetOverview.tsx:156` — `setInterval` 1s inconditionnel force re-render complet de tout PlanetOverview.
**FE-15** · `GalaxyView.tsx:80` — `fetchPlayerPlanets` jamais relancé après colonisation → marqueurs planètes obsolètes.
**FE-16** · `EmpireBar.tsx:64` — EmpireBar non mémoisé + calcul groupement planètes non mémoisé (re-render à chaque tick WS).
**FE-17** · `FleetDispatcher.tsx:271` — Sauvegarde/suppression preset sans header `Authorization`.
**FE-18** · `Marketplace.tsx:24` — Pas d'indicateur visuel de rafraîchissement (stale data invisible).

### 🟢 LOW

**FE-19** · `TechTree.tsx:90` — Fetch technologies inutile, résultat jamais passé à `TechTreeVisual`.

---

---

# 🗺️ PLAN D'ATTAQUE — Hand-off Document

## SPRINT 0 — BLOCKERS ABSOLUS (avant tout déploiement)
*Objectif: rendre le jeu non-exploitable par un attaquant extérieur.*

### P0-1 · Authentification & Autorisation Systémique
**Priorité: MUST** | **Agent: @backend-architect** | **Durée: 3-4 jours**

| Step | Action | Bug fixé |
|------|--------|----------|
| 1 | `auth.rs:77` — Supprimer le fallback `jwt-{uuid}` non signé | SEC-01 |
| 2 | `main.rs:298` — Créer middleware Axum `RequireAuth`, l'appliquer à toutes les routes de jeu | SEC-03 |
| 3 | `admin.rs:136+` — Remplacer `params.get("user_id")` par extraction JWT dans chaque handler admin | SEC-02 |
| 4 | `main.rs:3610` — Supprimer `user_id`/`buyer_user_id` des request bodies, dériver depuis JWT | SEC-04 |
| 5 | `main.rs:5694` — Même correction sur bounty handlers | SEC-09 |
| 6 | `galaxy.rs:285` — Remplacer auth via `current_planet_id` par JWT + `planet.owner_id == caller_id` | GAL-004 |
| 7 | `notifications.rs:53` — Ajouter auth middleware + check `user_id == caller_id` | WS-10 |
| 8 | `planets.rs:1151,1379,1401` — Vérification propriété planète sur upgrade, rename, cancel | GAL-001,002,003 |
| 9 | `websocket.rs:391` — Passer `authenticated_user_id` dans `handle_socket`, vérifier ownership | WS-01,02 |
| 10 | `main.rs:5111` — Protéger `/tick` avec secret header ou supprimer l'endpoint HTTP | SEC-05 |

**DoD:** Toutes les routes de jeu retournent 401 sans JWT valide. Test: requête avec UUID d'un autre joueur → 403.

---

### P0-2 · Injections SQL
**Priorité: MUST** | **Agent: @backend-architect** | **Durée: 1 jour**

| Step | Action | Bug fixé |
|------|--------|----------|
| 1 | `build_queue.rs:534` — Paramétrer INSERT via `Statement::from_sql_and_values` | BQ-008 / SEC-06 |
| 2 | `planet_market.rs:62+` — Paramétrer toutes les queries `format!()` | SEC-07 / MKT-008 |
| 3 | `main.rs:2142` — Paramétrer l'update `syndicate_credits` | SEC-08 |
| 4 | `build_queue.rs:591+` — Paramétrer DELETE et UPDATE dans reorder | BQ-008 |

**DoD:** `grep -r "execute_unprepared(&format!" backend/src/` → 0 résultat.

---

### P0-3 · Exploits de duplication critiques
**Priorité: MUST** | **Agent: @backend-architect** | **Durée: 2-3 jours**

| Step | Action | Bug fixé |
|------|--------|----------|
| 1 | `game_logic.rs:77` — Retourner `Err` au lieu de `Cost { 0,0,0 }` sur cache miss | BAL-005 |
| 2 | `planet_market.rs:253` — Valider `asking_price_* >= 0` avant INSERT | MKT-009 |
| 3 | `server_events.rs:396` — `.unwrap_or(0.0)` sur `syndicate_credits` | WS-09 |
| 4 | `build_queue.rs:420` — Lock AVANT fetch planète + tout en transaction | BQ-001,003 |
| 5 | `build_queue.rs:591` — DELETE + remboursement en transaction | BQ-004 |
| 6 | `tick_system.rs:171` — Completion + delete en transaction par item | BQ-005,006 |
| 7 | `missions.rs:286` — Crédit ressources + `claimed` en transaction atomique | ALI-003 |
| 8 | `missions.rs:847` — Daily reward en transaction + SELECT FOR UPDATE | ALI-004 |
| 9 | `server_events.rs:200` — UNIQUE `(event_id, user_id)` + upsert atomique | WS-05 |

**DoD:** Test stress 50 requêtes simultanées sur claim mission → 0 doublon confirmé en DB.

---

## SPRINT 1 — STABILITÉ CRITIQUE
*Objectif: zéro crash serveur et zéro perte de ressources sur instabilité DB.*

### P1-1 · Transactions manquantes (économie)
**Priorité: MUST** | **Agent: @backend-architect** | **Durée: 3 jours**

Wrapping en transactions SeaORM:
- `shipyard.rs:787` — Ships + defense builds (BQ-002)
- `planet_market.rs:532` — Achat planète 5-steps atomiques (MKT-001)
- `planet_market.rs:687` — Vente NPC (MKT-002)
- `trade_routes.rs:759` — Exécution routes avec atomic SQL `WHERE amount >= deduct` (MKT-003)
- `black_market.rs:820` — Résolution extorsion (MKT-005)
- `fleet.rs:803` — Recycleur (CMB-001)
- `fleet.rs:1456` — Expédition (CMB-002)
- `fleet.rs:2603` — ACS join + re-check disponibilité intra-transaction (CMB-003)
- `alliance.rs:494` — Dissolution avec CASCADE FK ou transaction + ON DELETE CASCADE (ALI-006)
- `alliance.rs:761` — Transfert leadership (ALI-007)
- `officers.rs:278` — Recrutement/levelup officier (ALI-002)
- `tech_tree.rs:393` — Research avec SELECT FOR UPDATE sur planète (ALI-001)

**DoD:** Aucun `INSERT/UPDATE/DELETE` sans transaction pour toute opération multi-table. Code review checklist.

---

### P1-2 · Crash serveur & panique Tokio
**Priorité: MUST** | **Agent: @backend-architect** | **Durée: 2 jours**

| Step | Action | Bug fixé |
|------|--------|----------|
| 1 | `main.rs:600` — Supervision worker tick (`catch_unwind` + restart loop + back-off) | WS-07 |
| 2 | `websocket.rs:441+` — Remplacer tous les `.unwrap()` dans les Tokio tasks | WS-08 |
| 3 | `missions.rs:751`, `alliance.rs:768` — Propager en `Result` | ALI-008,009 |
| 4 | `build_queue.rs:413+` — `RwLock.read().unwrap_or_else(|e| e.into_inner())` | BQ-015 |
| 5 | `server_events.rs:300` — Ajouter `.await` sur `broadcast_global()` | WS-04 |
| 6 | `websocket.rs:480` — Annuler toutes les tasks à la déconnexion | WS-03,12 |

**DoD:** `cargo clippy -- -D warnings` → 0 warnings. Test: tuer DB pendant tick → worker redémarre en <5s.

---

### P1-3 · Lazy Evaluation — cohérence `last_update`
**Priorité: MUST** | **Agent: @backend-architect** | **Durée: 1 jour**

| Step | Action | Bug fixé |
|------|--------|----------|
| 1 | `shipyard.rs:37` — `apply_lazy_eval` persiste `last_update = now` dans même transaction | BQ-012 |
| 2 | `planets.rs:1493` — Cancel: ajouter `last_update = now` au remboursement | RES-004 |
| 3 | `planets.rs:549` — Transport/recycle: `last_update = now` + cap stockage | RES-005 |
| 4 | `game_logic.rs:235` — Clamp duration à `max(0)` | RES-003 |
| 5 | `planets.rs:295` — Storage cap inconditionnel: `new_metal.min(storage_cap)` | RES-009 |
| 6 | `planets.rs:1305` — Fetcher `plasma_tech_level` réel au lieu de `0` | RES-008 |

**DoD:** Script de vérification: `SELECT count(*) FROM planet WHERE last_update > NOW()` → 0 après N opérations.

---

## SPRINT 2 — CORRECTNESS & FORMULES

### P2-1 · Supprimer les formules dupliquées côté client
**Priorité: MUST** | **Agents: @game-designer + @backend-architect + @frontend-developer** | **Durée: 3 jours**

| Step | Agent | Action | Bug fixé |
|------|-------|--------|----------|
| 1 | Backend | Exposer `metal_per_second`, `crystal_per_second`, `deuterium_per_second` dans payload planète | BAL-001 |
| 2 | Backend | Exposer `next_level_cost_*` dans `/building-types` et `/tech-tree` | UI-01,02,FE-02 |
| 3 | Backend | Exposer `storage_capacity` et `fleet_capacity` dans payload planète | FE-11,12 |
| 4 | Backend | Exposer coûts d'activation slot dans `/resource-slots` | FE-04 |
| 5 | Frontend | Supprimer `calculateProductionPerSecond()` de `useRealtimeResources.ts` | BAL-001,FE-03 |
| 6 | Frontend | Supprimer `getCost()` de `Facilities.tsx` et `TechTree.tsx` | UI-01,FE-02 |
| 7 | Frontend | Supprimer `calculateFlightTime()`, appel API `/fleet/estimate` | FE-01 |
| 8 | Frontend | Supprimer fallback hardcodé dans `ResourceDisplay.tsx:326+` | FE-02 |
| 9 | Frontend | Corriger `Math.max(serverVal, displayedVal)` → base = `serverVal` uniquement | BAL-002 |
| 10 | Frontend | Corriger default `energy_tech_bonus: 0.10` → `0.01` | BAL-003 |

**DoD:** `grep -r "Math.pow.*cost_multiplier\|calculateProduction\|getCost\|calculateFlightTime" frontend/src/` → 0 résultat.

---

### P2-2 · Combat — Tous les vaisseaux actifs & pertes correctes
**Priorité: MUST** | **Agents: @game-designer + @backend-architect** | **Durée: 2 jours**

| Step | Action | Bug fixé |
|------|--------|----------|
| 1 | `game_logic.rs:964` — Ajouter heavy_hunter, battleship, bomber, destroyer dans `resolve_pvp()` | BAL-011 |
| 2 | `game_logic.rs:923` — `apply_losses()` distribution proportionnelle par type | BAL-010 |
| 3 | `combat.rs:207` — Clamp `(1.0 - loss_ratio).max(0.0)` avant multiplication | CMB-008 |
| 4 | `combat.rs:94` — Pré-charger ShipType HashMap, éliminer N+1 rapid fire | CMB-005 |

**DoD:** Simulation 100 LF vs 10 Cruisers → LF meurent en premier. Battleship change l'issue d'un combat.

---

### P2-3 · Équilibrage formules
**Priorité: SHOULD** | **Agent: @game-designer** | **Durée: 2 jours**

| Action | Bug fixé |
|--------|----------|
| Coûts slots exponentiels: `Base * 3^(slot-1)` | BAL-006 |
| Revoir `BUILD_RATE`: Light Fighter niveau 0 cible 2-5 min | BAL-007 |
| Formule temps vol: `(35000/speed) * sqrt(distance*10) / universe_speed` | BAL-008 |
| Distance inter-galaxies circulaire (wrap-around) | BAL-009 |
| Capacité hangar exponentielle | BAL-014 |

**DoD:** Simulation jour 1→30: aucun joueur ne peut construire un Battleship avant jour 7. ROI Metal Mine validé.

---

## SPRINT 3 — PERFORMANCE & POLISH

### P3-1 · Élimination des N+1 queries
**Priorité: SHOULD** | **Agent: @backend-architect** | **Durée: 2 jours**

| Action | Bug fixé |
|--------|----------|
| `tech_tree.rs:287+` — `PlanetData::load`: HashMap statique au démarrage | ALI-011 |
| `build_queue.rs:632` — Batch query par planète dans le tick | BQ-011 |
| `fleet.rs:1276` — Flagship modules: HashMap pré-chargé | CMB-012 |
| `market.rs:92` — `SELECT SUM(...)` SQL au lieu de `find().all()` | MKT-012 |
| `trade_routes.rs:835` — Piracy check: JOIN SQL au lieu de loop | MKT-010 |

**DoD:** `EXPLAIN ANALYZE` sur queries critiques. Aucune query > 100ms à 1000 joueurs simulés.

---

### P3-2 · Tick System → Event-Driven
**Priorité: SHOULD** | **Agent: @backend-architect** | **Durée: 2 jours**

| Action | Bug fixé |
|--------|----------|
| Remplacer polling 2s par `SELECT MIN(end_time)` sleep | WS-06 |
| `update_all_user_points`: SQL batch `UPDATE` au lieu de loop Rust | WS-06 |
| Worker supervision restart avec back-off exponentiel | WS-07 |

**DoD:** CPU idle < 1% à vide. 0 queries DB quand aucun événement en attente.

---

### P3-3 · Frontend — Sécurité & Performance
**Priorité: SHOULD** | **Agent: @frontend-developer** | **Durée: 2 jours**

| Action | Bug fixé |
|--------|----------|
| Centraliser auth dans `AuthContext`, supprimer localStorage scattered | FE-09 |
| Guards `isSubmitting` sur tous les boutons d'action | FE-05,06,UI-09 |
| Mémoïser `safeConfig` dans `useRealtimeResources` | UI-06 |
| `EmpireBar`: `React.memo` + `useMemo` groupement planètes | FE-16 |
| Supprimer `setInterval` 1s inconditionnel dans `PlanetOverview` | FE-14 |
| Supprimer polling 5s Marketplace, migrer vers WS event | FE-08 |
| `BuildQueueManager`: revert optimiste sur `!res.ok` | UI-04 |
| Synchronisation horloge serveur dans WS `connected` event | UI-05 |
| Headers `Authorization` sur requêtes preset fleet | FE-17 |
| Relancer `fetchPlayerPlanets` après colonisation | FE-15 |

**DoD:** React Profiler: 0 re-render superflu sur tick WS ressources. Aucun `localStorage.getItem('token')` hors `AuthContext`.

---

## 🔬 SCÉNARIOS DE TEST — @reality-checker

### Test 1 — Auth bypass (SEC-01) — MUST FAIL avant fix
```bash
VICTIM_UUID=$(curl /galaxy/1/1 | jq -r '.planets[0].owner_id')
curl -X POST /planets/$VICTIM_PLANET/build-queue \
  -H "Authorization: Bearer jwt-$VICTIM_UUID" \
  -d '{"category":"resources","item_key":"metal"}'
# AVANT fix: 200 OK → CRITICAL
# APRÈS fix: 401 Unauthorized
```

### Test 2 — Double-spend build queue (BQ-001)
```bash
for i in {1..50}; do
  curl -s -X POST /planets/$PLANET/build-queue \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"category":"resources","item_key":"metal"}' &
done; wait
# AVANT fix: ressources négatives possibles, items dupliqués
# APRÈS fix: 1 seul item en queue, metal_amount >= 0
```

### Test 3 — Prix négatif marché (MKT-009)
```bash
curl -X POST /planet-market/list \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"planet_id":"...","asking_price_metal":-1000000}'
# AVANT fix: 200 OK + acheteur reçoit +1M métal → CRITICAL
# APRÈS fix: 400 Bad Request
```

### Test 4 — Notification cross-player (WS-10)
```bash
VICTIM_ID=$(curl /leaderboard | jq -r '.[1].user_id')
curl /users/$VICTIM_ID/notifications \
  -H "Authorization: Bearer $MY_TOKEN"
# AVANT fix: 200 + toutes les alertes d'attaque de la victime → CRITICAL
# APRÈS fix: 403 Forbidden
```

### Test 5 — Formule ressources (BAL-003)
```bash
# Joueur avec Energy Tech niveau 10
# Comparer metal_per_second affiché vs metal_amount en DB après 60s
# AVANT fix: affichage ~82% supérieur à la réalité (facteur 0.10 vs 0.01)
# APRÈS fix: écart < 1%
```

### Test 6 — Claim mission race condition (ALI-003)
```bash
for i in {1..20}; do
  curl -s -X POST /missions/$MISSION_ID/claim \
    -H "Authorization: Bearer $TOKEN" &
done; wait
# AVANT fix: ressources créditées plusieurs fois
# APRÈS fix: 1 seul crédit, status = claimed, autres 409
```

---

## RÉCAPITULATIF PLANNING

| Sprint | Priorité | Durée | Agents principaux | Bloque quoi |
|--------|----------|-------|-------------------|-------------|
| S0 — Auth & SQL Injection | MUST | ~6 jours | @backend-architect | Déploiement impossible |
| S1 — Transactions & Stabilité | MUST | ~6 jours | @backend-architect | Duplication de ressources, crashes |
| S2 — Formules & Combat | MUST/SHOULD | ~7 jours | @game-designer + @backend-architect + @frontend-developer | Jeu jouable et honnête |
| S3 — Performance & Polish | SHOULD | ~6 jours | @backend-architect + @frontend-developer | Scalabilité & UX |

**Total: ~25 jours de développement pour un jeu production-ready.**

---

*Rapport généré par audit multi-agents · Space Conquest · 2026-03-13*
*158 bugs · 40 CRITICAL · 62 HIGH · 44 MEDIUM · 12 LOW*
