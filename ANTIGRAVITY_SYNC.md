# ANTIGRAVITY_SYNC — Résumé des changements backend → frontend

> Généré par Claude Code — Session 2026-03-08
> Destiné à **antigravity** pour intégrer et tester les nouvelles fonctionnalités frontend.

---

## Ce qui a été implémenté (session complète)

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
