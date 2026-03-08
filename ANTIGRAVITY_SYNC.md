# ANTIGRAVITY_SYNC — Résumé des changements backend → frontend

> Dernière mise à jour : Session 2026-03-08 (Expansion 5.2.0)
> Destiné à **antigravity** pour intégrer et tester les nouvelles fonctionnalités frontend.

---

## Expansion 5.2.0 — Session 2026-03-08 — Système PVE Événements Serveur

### Migration DB requise : `m20260309_000002_system_messages_and_pve`

```sql
-- Alters message table
ALTER TABLE message ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE message ADD COLUMN is_system BOOL NOT NULL DEFAULT false;
ALTER TABLE message ADD COLUMN sender_display_name VARCHAR(100);
ALTER TABLE message ADD COLUMN message_category VARCHAR(50) NOT NULL DEFAULT 'player';

-- 4 nouvelles tables + seeds
CREATE TABLE server_event_type (...);
CREATE TABLE server_event (...);
CREATE TABLE server_event_participation (...);
CREATE TABLE server_event_action (...);
```

### Nouvelles routes API

**Publiques :**
- `GET /server-events` → `{ events: ServerEventSummary[] }`
- `GET /server-events/:id` → `{ event: ServerEventSummary, top_contributors: [name, pts][] }`
- `POST /server-events/:id/contribute` `{ user_id, planet_id, resources? }` → `{ success, contribution }`

**Admin :**
- `GET /admin/server-events?status=&limit=` → liste avec enrich
- `POST /admin/server-events` → créer un événement
- `PATCH /admin/server-events/:id/cancel` / `resolve`
- `GET /admin/server-event-types` / `POST` / `PATCH :id` / `DELETE :id`

### Nouveaux WsEvent (backend → frontend)

```json
{ "type": "server_event_announced", "payload": { "event_id", "event_type", "name", "icon", "color", "zone", "starts_in_seconds", "narrative" } }
{ "type": "server_event_started", "payload": { "event_id", "event_type", "name", "icon", "color", "zone", "ends_at", "hp_max" } }
{ "type": "server_event_progress", "payload": { "event_id", "hp_current", "hp_max", "top_contributors": string[], "percent" } }
{ "type": "server_event_resolved", "payload": { "event_id", "event_type", "outcome", "rewards_distributed", "top_contributors": string[] } }
{ "type": "server_event_warning", "payload": { "event_id", "message" } }
```

### Nouveaux composants frontend

| Fichier | Rôle |
|---------|------|
| `src/hooks/useServerEvents.ts` | Fetch + écoute WS, état réactif |
| `src/components/ServerEventBanner.tsx` | Bandeau fixe top de l'écran |
| `src/components/ServerEventModal.tsx` | Modal détail + contribution |

### À tester

- [ ] Créer un événement pirate_invasion depuis l'admin panel → bandeau apparaît
- [ ] Contribuer à un événement → HP bar diminue en temps réel via WS
- [ ] Récompenses reçues dans la messagerie après résolution
- [ ] Overlays visuels dans GalaxyView (vue carte) lors d'un événement actif
- [ ] Messages système apparaissent dans l'inbox avec catégorie `pve`

---

## Expansion 5.1.1 — Session 2026-03-08 — Rééquilibrage Expéditions

### Expéditions — Rééquilibrage récompenses ✅

**Changements backend uniquement** (`handlers/fleet.rs::expedition_v2_handler`) :

- **Nouvelle formule** : `reward = pirate_str × value_per_cp × tier_mult × loss_mult × rand × recycler_bonus`
- **`loss_mult = 1.0 + (n_losses / total_ships) × 2.0`** — bonus jusqu'à ×3 si flotte décimée
- Tier multiplier par difficulté : `0.5` (faibles) / `1.0` (moyens) / `2.0` (forts)
- `value_per_cp = 5000`, `value_per_cap = 800`
- **SC Découverte** : `floor(5 + rand(0-10) + min(combat_power × 0.05, 8))` → 13-23 SC pour grosse flotte
- Fix compilation : variables `base_metal/crystal/deut` remplacées par `base_calm_metal/crystal/deut`
- Outcomes pacifiques (Vide, Flottant, Découverte) : basés sur `total_capacity × value_per_cap`, sans speed_factor

**Aucun changement frontend** — la structure de réponse est identique.

**À tester :**
- [ ] 100 croiseurs vs pirates moyens → rapport affiche 530k–1.55M métal (pas 170k)
- [ ] 100 croiseurs vs pirates forts avec pertes → métal augmente avec le nb de vaisseaux perdus
- [ ] Découverte avec grosse flotte → 13-23 SC crédités sur le compte

---

## Expansion 5.1 — Session 2026-03-08

### 1. Fix Sell-Planet (Infinite Loading + Logout) ✅

**Problème :** Après la vente d'une planète, l'UI restait bloquée sur le SpaceLoader, et un refresh forçait le logout.

**Cause racine :** `PlanetContext.fetchPlanet()` vidait tout l'état sur 404 sans switcher vers une autre planète. L'App avait son propre `planetId` state qui n'était pas mis à jour en sync.

**Changements frontend :**
- `src/contexts/PlanetContext.tsx` — `fetchPlanet()` : sur 404, fetch `/my-planets` → switch vers homeworld (ou première planète). Plus de `localStorage.removeItem` sauf si zéro planète.
- `src/App.tsx` — `checkMessageAndReports()` : sur 404, appelle `switchPlanet(homeworld.id)` **ET** `setPlanetId(homeworld.id)` pour garder les deux états synchronisés.

**À tester :**
- [ ] Vendre une planète depuis le marché → l'UI switche automatiquement vers la homeworld
- [ ] Refresh après vente → pas de logout, affiche la homeworld
- [ ] Si l'utilisateur n'a plus de planète → affiche un état vide gracieux (pas de crash)

---

### 2. Expéditions — Support Tous Types de Vaisseaux ✅

**Changements backend :**
- `expedition_handler` : payload `{ fleet: HashMap<ship_key, count> }` (tous types acceptés)
- Réponse : `lost_ships: { "light_hunter": 3, "transporter": 1, ... }` remplace `lost_hunters`/`lost_cruisers`
- 6 outcomes pondérés : EmptySpace (10%), FloatingResources (25%), PiratesWeak (20%), PiratesMedium (25%), PiratesStrong (15%), Discovery (5%)

**Changements frontend — `ExpeditionZoneV2.tsx` :**
- Fix critique : la réponse est `data.report.log` / `data.report.result` (pas `data.logs` / `data.result`)
- Affichage des pertes par type dans le rapport : badges rouges `"-3 light hunter"`, `"-1 transporter"`, etc.
- Le sélecteur de vaisseaux charge depuis `/planets/:id/ship-types` — tous les types disponibles sont affichables
- Payload envoyé : `{ fleet: { light_hunter: 5, cruiser: 2, recycler: 1 } }`

**À tester :**
- [ ] Lancer une expédition avec mix de vaisseaux → rapport affiche les bons résultats
- [ ] Outcome "Espace vide" et "Découverte" (credits syndicat) s'affichent correctement
- [ ] Pertes affichées par type dans le rapport de combat

---

### 3. CombatModal — Rapport Détaillé ✅

**Changements frontend — `CombatModal.tsx` :**
- Section "Pertes détaillées par type" : affiche `fleet_lost` + `defense_lost` par type pour les deux camps
- Section "Déroulement du combat" : rounds avec narrative, pertes ATT/DEF par round
- Conditionnel : affiché uniquement si `parsedReport.details` est non-null (rapport Expansion 5.0+)

**À tester :**
- [ ] Ouvrir un rapport de combat récent → section "Analyse Tactique" visible avec rounds
- [ ] Anciens rapports (sans `details`) → section absente, rapport legacy toujours affiché

---

## Ce qui a été implémenté (sessions précédentes)

### 1. Système de Notifications (v8.0) ✅

**Backend :**
- Migration `m20260308_000001_create_notifications.rs` — table `notification(id, user_id, notif_type, title, message, is_read, created_at)`
- Entity SeaORM : `backend/src/entities/notification.rs`
- Handler : `backend/src/notifications.rs`
  - `GET /users/:user_id/notifications?limit=30` → retourne la liste des notifications (non lues en premier)
  - `POST /users/:user_id/notifications/read` → marque toutes les notifs de l'user comme lues (`update_many`)
- WebSocket : `WsEvent::Notification { notif_type, title, message }` + `WsState::push_notification(user_id, type, title, msg)` — persiste en DB **et** broadcast WS en un appel
- Hooks dans `main.rs` : combat (victoire/défaite/conquête), construction de bâtiment, production de vaisseaux

**Frontend :**
- `src/components/NotificationCenter.tsx` — refait entièrement
  - Fetch `GET /users/${userId}/notifications?limit=30` au mount
  - Écoute `CustomEvent('new-notification')` depuis le WS layer
  - Bouton "Tout marquer lu" → `POST /users/${userId}/notifications/read`
  - Icônes par type : combat ⚔️, build 🏭, market 💰, expedition 🚀, spy 🕵️, transport 📦

---

### 2. Analytics Dashboard (v8.1) ✅

**Backend :**
- `backend/src/analytics.rs` — `GET /analytics?user_id=X`
  - `weekly_production` : production journalière actuelle × 7 jours (basée sur niveaux mines réels)
  - `stats` : `energy_efficiency`, `victories_7d`, `total_score`, `economy_score`, `military_score`

**Frontend :**
- `src/components/Dashboard.tsx` — branché sur l'endpoint réel, plus de mock data
  - Recharts `AreaChart` pour la production
  - Spinner `Loader2` pendant le chargement

---

### 3. Alliances (v8.2) ✅

**Frontend :**
- `src/components/Alliances.tsx` — branché sur `GET /alliances?search=&per_page=30`
  - Debounce 300ms sur la recherche
  - Gestion "aucun résultat"
  - Prop optionnelle `onNavigate?: (tab: string) => void` pour naviguer vers l'onglet alliance

---

### 4. Achievements (v8.3) ✅

**Frontend :**
- `src/components/Achievements.tsx` — branché sur `GET /achievements?user_id=X`
  - Icônes emoji + couleurs hex depuis la DB
  - Barre de progression, rareté traduite, date de déverrouillage

---

### 5. Alertes Jeu Temps Réel via WebSocket (v8.4) ✅

**Backend :**
- `WsEvent::MarketSale { resource, amount, payment_resource, payment_amount, buyer_name }` — dans `websocket.rs`
- `WsEvent::PlanetSold { planet_name, buyer_name, price_metal, price_crystal, price_deuterium }` — dans `websocket.rs`
- Hooks :
  - `buy_from_listing_handler` (main.rs) → notifie le vendeur via `notify_market_sale`
  - `buy_planet_handler` (planet_market.rs) → notifie le vendeur via `notify_planet_sold`
  - `sell_to_npc_handler` (planet_market.rs) → notifie le vendeur (buyer_name = "PNJ")

**Frontend :**
- `src/hooks/useWebSocket.ts` — nouveaux cases :
  - `attack_incoming` → `CustomEvent('incoming-attack-alert')` (plus de toast direct)
  - `spy_alert` → `CustomEvent('spy-alert-advanced')`
  - `sabotage_detected` → `CustomEvent('sabotage-alert-advanced')` + `Event('sabotage-detected')`
  - `sabotage_applied` → `CustomEvent('sabotage-alert-advanced')` avec `attacker_name: 'Agents inconnus'`
  - `market_sale` → `CustomEvent('market-sale')`
  - `planet_sold` → `CustomEvent('planet-sold')`
- `src/hooks/useGameNotifications.ts` — **hook créé**, branché dans `App.tsx`
  - Écoute tous les custom events ci-dessus
  - Toast enrichi + flash rouge pour attaque entrante (classe `alert-red-flash` sur `document.body`)

---

---

## Expansion 4.0 — Adaptations Frontend requises (session 2026-03-08)

Ces endpoints ont été modifiés côté backend. Le frontend actuel peut renvoyer des erreurs ou afficher des données incorrectes tant qu'il n'est pas mis à jour.

### ✅ `ReportsTerminal.tsx` — Réponse paginée — **FAIT par Antigravity (session 2026-03-08)**

- Fetch migré vers `?page=&limit=20` pour `/reports` et `/transport-logs`
- Gère les deux formats : `{ data, total }` (paginé) et tableau brut (legacy)
- Boutons "Afficher plus" utilisent `combatTotal` / `transportTotal` du backend
- `hasMore` = `combatLogs.length < combatTotal` (basé sur `total` serveur)

### ✅ `BuyView.tsx` — Réponse paginée du marché — **FAIT par Antigravity (session 2026-03-08)**

- Fetch migré vers `?page=&limit=12`
- `listingTotal` stocké depuis `data.total`
- Bouton "Afficher plus" : `listings.length < listingTotal`
- Après un achat, reset page 1 et `loadListings(1, true)`

### ✅ `Leaderboard.tsx` — Ranking — **FAIT par Antigravity (session 2026-03-08)**

- `hasMore` calculé via `pageNum * LIMIT < data.total` (plus de `data.data.length === 50`)
- Rétro-compatible avec le format tableau brut legacy

---

## Ce qu'antigravity doit faire / vérifier

### ⚠️ CSS à ajouter — `alert-red-flash`

Le hook `useGameNotifications` ajoute la classe CSS `alert-red-flash` sur `document.body` pendant 5 secondes lors d'une attaque entrante. Il faut ajouter la règle CSS dans le fichier global (probablement `src/index.css` ou `src/App.css`) :

```css
/* Alerte rouge clignotante lors d'une attaque entrante */
@keyframes redFlash {
  0%, 100% { box-shadow: inset 0 0 0px rgba(239, 68, 68, 0); }
  50% { box-shadow: inset 0 0 60px rgba(239, 68, 68, 0.35); }
}
body.alert-red-flash {
  animation: redFlash 0.8s ease-in-out 6;
}
```

### ⚠️ `EmpireBar.tsx` — prop `userId` vers `NotificationCenter`

Vérifier que `NotificationCenter` reçoit bien `userId` depuis `EmpireBar`. Le composant attend `userId: string` en prop.

### ⚠️ `App.tsx` — `useGameNotifications()` déjà hookée

`useGameNotifications()` est déjà appelée dans `App.tsx` (ligne ~166). Ne pas la re-brancher.

### ⚠️ Nouveaux onglets dans l'UI

Les composants `Dashboard`, `Alliances`, `Achievements` sont fonctionnels mais doivent être accessibles depuis la navigation principale. Vérifier qu'ils reçoivent bien `userId` en prop depuis `App.tsx`.

### ⚠️ Dépendances frontend

S'assurer que `recharts` et `lucide-react` sont bien installées :
```bash
cd frontend && npm install recharts lucide-react
```

---

## Structure des payloads WebSocket (référence)

### `market_sale`
```ts
{
  resource: string;        // "metal" | "crystal" | "deuterium"
  amount: number;          // quantité vendue
  payment_resource: string; // ressource reçue
  payment_amount: number;  // montant après taxe (2%)
  buyer_name: string;
}
```

### `planet_sold`
```ts
{
  planet_name: string;
  buyer_name: string;      // ou "PNJ"
  price_metal: number;
  price_crystal: number;
  price_deuterium: number;
}
```

### `attack_incoming` (existant, réacheminé)
```ts
{
  attacker_name: string;
  source_coords: string;
  arrival_time: string;
  ships_count: number;
}
```

### `spy_alert` (existant, réacheminé)
```ts
{ from: string; }
```

### `sabotage_detected` / `sabotage_applied` (existant, réacheminé)
```ts
{
  attacker_name: string;   // "Agents inconnus" pour sabotage_applied
  planet_name: string;
  effect_type: 'disable_mine' | 'steal_tech';
}
```

---

## Routes API résumées (nouvelles)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/users/:id/notifications?limit=30` | Liste des notifications de l'utilisateur |
| POST | `/users/:id/notifications/read` | Marque toutes les notifs comme lues |
| GET | `/analytics?user_id=X` | Stats + production hebdo pour le Dashboard |

> Les routes `/alliances` et `/achievements` existaient déjà.
