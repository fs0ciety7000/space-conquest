# Space Conquest — Report, Notification & Alert System Design
## Version 9.0 — Design Document

**Scope**: Unified mission report storage, enriched notification bell, real-time incoming attack alerts,
PlanetOverview military section hardening, and replacement of all browser-native `confirm()` dialogs.

---

## Current State Audit

### What exists

**Backend**
- `notification` table: `(id, user_id, notif_type, title, message, is_read, created_at)` — flat text only
- `WsState::push_notification()` — persists to DB then broadcasts `WsEvent::Notification`
- `WsEvent::AttackIncoming` — exists, fired from `attack_v2_handler` at launch time (not at impact)
- `WsEvent::CombatResult { result, opponent }` — fires after `resolve_attack_mission` but only carries two strings, no report link
- `incoming_missions` array — already built in `get_planet_handler` (planets.rs:769–789), enriched with `attacker_name`, `source_coords`, `mission_type`
- `outgoing_missions` array — enriched with `target_name`, `coords`
- Progress bar in PlanetOverview — already rendered but uses a broken formula `100 - (tl / 3)` that is not anchored to departure time
- `confirm()` calls — 11 occurrences across 6 frontend files

**What is missing**
- No `mission_report` table — reports are not persisted, only a two-field `CombatResult` WS event fires
- Notifications have no `report_id` foreign key — clicking a notification cannot link to a specific report
- The progress bar has no departure time from the server, so it cannot compute elapsed/total correctly
- No custom modal component — all confirmation dialogs use the blocking `window.confirm()`
- Sabotage and expedition outcomes are returned in HTTP response only — if the player's browser tab is
  closed, the outcome is lost forever

---

## A. MissionReport Data Model

### Decision: Separate `mission_report` Table

Do NOT store reports in the `notification` table. Reasons:
1. Report payloads are large structured JSON (ship losses per type, loot breakdown). Text field is wrong.
2. Reports need to be queryable by type, date range, and both participants independently.
3. Notifications become thin pointers to reports — one notification per participant per mission.

### DB Schema — `mission_report`

```sql
CREATE TABLE mission_report (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type     TEXT NOT NULL,        -- see enum below
    attacker_id     UUID REFERENCES "user"(id) ON DELETE SET NULL,
    defender_id     UUID REFERENCES "user"(id) ON DELETE SET NULL,
    planet_id       UUID REFERENCES planet(id) ON DELETE SET NULL,
    outcome         TEXT NOT NULL,        -- 'victory' | 'defeat' | 'draw' | 'success' | 'failure' | 'partial'
    payload         JSONB NOT NULL,       -- typed payload (see per-type schema below)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    attacker_read   BOOLEAN NOT NULL DEFAULT false,
    defender_read   BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX mission_report_attacker ON mission_report(attacker_id, created_at DESC);
CREATE INDEX mission_report_defender ON mission_report(defender_id, created_at DESC);
CREATE INDEX mission_report_type     ON mission_report(report_type);
```

`report_type` values: `pvp_combat` | `expedition` | `spy` | `sabotage` | `pirate_raid` | `transport`

### DB Schema — `notification` column addition

Add one nullable column to the existing table:

```sql
ALTER TABLE notification ADD COLUMN report_id UUID REFERENCES mission_report(id) ON DELETE SET NULL;
```

This lets `NotificationCenter` build a deep link: clicking on a combat notification opens
`/reports/{report_id}` in the messagerie.

### Per-Type Payload Schemas (JSONB)

All schemas share a common envelope. Fields are always present; unknown fields use `null`.

#### PvP Combat (`pvp_combat`)

```json
{
  "attacker": {
    "user_id": "uuid",
    "username": "string",
    "planet_name": "string",
    "coords": "[G:S:P]",
    "fleet_sent": { "light_hunter": 50, "cruiser": 10 },
    "fleet_lost": { "light_hunter": 12, "cruiser": 0 },
    "fleet_survived": { "light_hunter": 38, "cruiser": 10 }
  },
  "defender": {
    "user_id": "uuid",
    "username": "string",
    "planet_name": "string",
    "coords": "[G:S:P]",
    "fleet_before": { "rocket_launcher": 20 },
    "fleet_lost": { "rocket_launcher": 20 },
    "defense_before": { "rocket_launcher": 20 },
    "defense_lost": { "rocket_launcher": 15 }
  },
  "rounds": 4,
  "loot": { "metal": 45000, "crystal": 12000, "deuterium": 3000 },
  "debris": { "metal": 15000, "crystal": 5000 },
  "combat_log_id": "uuid",
  "tech_bonuses": {
    "attacker": { "weapons": 1.3, "shields": 1.1, "armour": 1.2 },
    "defender": { "weapons": 1.0, "shields": 1.2, "armour": 1.1 }
  }
}
```

#### Expedition (`expedition`)

```json
{
  "planet_id": "uuid",
  "planet_name": "string",
  "fleet_sent": { "light_hunter": 20, "recycler": 5 },
  "outcome_category": "pirates_defeated",
  "ships_lost": { "light_hunter": 3 },
  "resources_found": { "metal": 80000, "crystal": 30000, "deuterium": 0 },
  "syndicate_credits_earned": 1.5,
  "dark_matter_found": 0,
  "narrative": "Vos flottes ont repoussé des pirates nomades..."
}
```

`outcome_category` values: `empty_space` | `resources_found` | `pirates_defeated` |
`pirates_lost` | `ancient_relic` | `derelict_fleet`

#### Espionage (`spy`)

```json
{
  "attacker": { "user_id": "uuid", "username": "string" },
  "target": { "user_id": "uuid", "username": "string", "planet_name": "string", "coords": "[G:S:P]" },
  "probe_count": 3,
  "success": true,
  "probe_destroyed": false,
  "detection": "partial",
  "revealed": {
    "resources": { "metal": 500000, "crystal": 200000, "deuterium": 80000 },
    "fleet": { "light_hunter": 120, "cruiser": 30 },
    "defense": { "rocket_launcher": 50, "plasma_turret": 5 },
    "buildings": { "metal_mine": 18, "shipyard": 10 },
    "research": { "weapons_tech": 7, "shield_tech": 5 }
  }
}
```

`detection` values: `none` | `partial` | `full`
`revealed` keys may be absent if spy level was insufficient to reveal them.

#### Sabotage (`sabotage`)

```json
{
  "attacker": { "user_id": "uuid", "username": "string" },
  "target": { "user_id": "uuid", "username": "string", "planet_name": "string", "coords": "[G:S:P]" },
  "action_type": "disable_mine",
  "success": true,
  "detected": false,
  "effect_detail": {
    "mine": "metal_mine",
    "penalty_pct": 50,
    "duration_seconds": 7200,
    "expires_at": "2026-03-12T05:00:00Z"
  },
  "casus_belli_granted": false
}
```

#### Black Market Pirate Raid (`pirate_raid`)

```json
{
  "victim": { "user_id": "uuid", "planet_name": "string", "coords": "[G:S:P]" },
  "item_purchased": "orbital_strike",
  "fleet_sent": { "light_hunter": 30 },
  "fleet_lost": { "light_hunter": 8 },
  "fleet_survived": { "light_hunter": 22 },
  "defense_destroyed": { "rocket_launcher": 5 },
  "loot": { "metal": 20000, "crystal": 8000, "deuterium": 1000 },
  "outcome": "victory"
}
```

---

## B. Notification Flow

### Notification Types — Complete Registry

| `notif_type`     | Category  | Report Link | When fired                                          |
|------------------|-----------|-------------|-----------------------------------------------------|
| `combat_attacker`| military  | yes         | `resolve_attack_mission` — attacker's copy          |
| `combat_defender`| military  | yes         | `resolve_attack_mission` — defender's copy          |
| `spy_sent`       | military  | yes         | `spy_v2_handler` synchronously — attacker gets result immediately |
| `spy_detected`   | military  | yes         | `spy_v2_handler` — defender notified only if detection >= partial |
| `sabotage_sent`  | military  | yes         | `attempt_sabotage` — attacker's outcome             |
| `sabotage_recv`  | military  | yes         | `attempt_sabotage` — defender if detected           |
| `pirate_raid`    | military  | yes         | Black market item resolution                        |
| `expedition`     | logistics | yes         | Tick loop — expedition resolved                     |
| `transport`      | logistics | yes         | Tick loop — transport arrived                       |
| `colony_founded` | logistics | no          | Colony resolution                                   |
| `build`          | economy   | no          | Construction/research/ship complete                 |
| `market`         | economy   | no          | Market sale filled                                  |
| `planet_sold`    | economy   | no          | Planet market transaction                           |
| `attack_warning` | military  | no          | At fleet launch — real-time only, no DB persist     |

### Rule: `attack_warning` is NOT persisted

`attack_warning` is a WS-only event fired at launch time. It is ephemeral. When the tick resolves
the combat, a permanent `combat_defender` notification is created and persisted. This prevents the bell
from showing stale "incoming attack" notifications after the combat has already been resolved.

### Report Creation Flow (PvP Combat)

```
resolve_attack_mission()
  1. Run simulate_pvp_combat() → PvpCombatReport
  2. INSERT INTO mission_report (type='pvp_combat', payload=...) → report_id
  3. INSERT INTO notification for attacker (type='combat_attacker', report_id=report_id)
  4. INSERT INTO notification for defender (type='combat_defender', report_id=report_id)
  5. ws.broadcast_to_user(attacker, WsEvent::Notification { notif_type: 'combat_attacker', ... , report_id })
  6. ws.broadcast_to_user(defender, WsEvent::Notification { notif_type: 'combat_defender', ... , report_id })
```

### Spy/Sabotage Flow (synchronous HTTP handlers)

For spy and sabotage the result is known immediately (no fleet travel):

```
spy_v2_handler()
  1. Compute spy result
  2. INSERT INTO mission_report (type='spy', payload=...) → report_id
  3. INSERT notification for attacker (spy_sent, report_id)
  4. IF detection >= 'partial': INSERT notification for defender (spy_detected, report_id)
  5. Return HTTP 200 with { ..., report_id: "uuid" }
     (Frontend can open report modal directly from this response)
```

### WsEvent::Notification — Add `report_id` Field

```rust
Notification {
    notif_type: String,
    title: String,
    message: String,
    report_id: Option<String>,   // NEW — UUID string or null
}
```

The frontend `useWebSocket.ts` must pass `report_id` through the `CustomEvent` detail so
`NotificationCenter` can build the deep link.

### GET /reports/:report_id

New endpoint. Returns the full JSONB payload of a single `mission_report`. Access is gated:
the requesting user must be either `attacker_id` or `defender_id`. Marks the appropriate
`_read` column true on fetch.

### GET /users/:user_id/reports

Paginated list (limit/offset). Returns rows where `attacker_id = user_id OR defender_id = user_id`,
ordered by `created_at DESC`. Each row returns `{ id, report_type, outcome, created_at, read }` —
no payload, to keep the list fast.

---

## C. PlanetOverview Military Section

### Current State Assessment

The section is already implemented with incoming and outgoing mission cards. The data shape is:

```
incoming_mission fields available:
  id, mission_type, arrival_time, ships_count, source_planet_id
  + enriched: attacker_name, source_coords, source_name

outgoing_mission fields available:
  id, mission_type, arrival_time, ships_count, target_planet_id
  + enriched: target_name, coords
```

**Critical missing field**: `departure_time` (the moment the fleet was launched). Without it, the
frontend cannot compute `elapsed / total` for the progress bar. Currently PlanetOverview uses
`100 - (tl / 3)` which is a dimensionless guess.

### Backend Fix — Add `departure_time` to `fleet_mission`

The `fleet_mission` table must store when the mission was dispatched. Since missions are created
with `arrival_time = now + travel_time`, departure is effectively `now` at insert time. Add:

```sql
ALTER TABLE fleet_mission ADD COLUMN departure_time TIMESTAMPTZ NOT NULL DEFAULT now();
```

Set this in all four mission-creating handlers: `attack_v2`, `spy_v2`, `transport`, `expedition_v2`.
Expose it in `incoming_missions` and `outgoing_missions` enriched arrays.

### Progress Bar Formula (Frontend)

```typescript
// departure_time and arrival_time are ISO strings from the server
const computeProgress = (departure: string, arrival: string): number => {
  const dep = new Date(departure).getTime();
  const arr = new Date(arrival).getTime();
  const now = Date.now();
  const total = arr - dep;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, ((now - dep) / total) * 100));
};
```

This replaces the current `100 - (tl / 3)` hack. The bar now fills from 0% (at launch) to 100%
(at arrival) linearly.

### Mission Type Icon Map

The current code shows only attack vs transport. Expand to all mission types:

| `mission_type` | Icon          | Color              | Label FR              |
|----------------|---------------|--------------------|-----------------------|
| `attack`       | `Swords`      | `text-red-400`     | ATTAQUE ENTRANTE      |
| `transport`    | `Truck`       | `text-blue-400`    | Transport             |
| `spy`          | `Scan`        | `text-purple-400`  | Sonde espionnage      |
| `recycle`      | `Recycle`     | `text-emerald-400` | Recycleur             |
| `expedition`   | `Sparkles`    | `text-amber-400`   | Expédition            |
| `colonize`     | `Globe`       | `text-cyan-400`    | Colonisation          |

For outgoing missions, append the target player's username next to target planet name.
The server must add `defender_name` to outgoing mission enrichment (look up `target_planet.owner_id`
then join `user.username`).

### Spy Mission Visibility Rule

Incoming spy missions from players with lower espionage than the defender should be visible in
the radar (already enriched by the server). Missions from higher-espionage attackers should be hidden
from the defender's radar display — currently the server sends them all. The server must filter:

```rust
// In get_planet_handler, when building incoming_detailed:
let att_esp = get_planet_tech_level(db, m.source_planet_id, "espionage_tech").await;
let def_esp = get_planet_tech_level(db, planet.id, "espionage_tech").await;
if m.mission_type == "spy" && att_esp > def_esp + 1 {
    continue; // stealth — defender cannot see this mission
}
```

---

## D. Incoming Attack Alert — Real-Time Flow

### Current State

`notify_attack_incoming()` fires at fleet launch (correctly — defenders need maximum warning time).
The frontend `PlanetOverview` watches `incomingMissions` via a `useEffect` and fires a toast and
audio. This is already functional.

### Problems to Fix

1. The `WsEvent::AttackIncoming` payload does not include `mission_id`. Without it, the frontend
   cannot deduplicate alerts if the player switches planets (reconnect → receives the mission again
   from `incoming_missions` array → fires toast again).

2. The alert toast disappears after 10s but the attack is still hours away. There is no persistent
   alert bar.

3. There is no alert if the player was offline when the attack was launched and comes online mid-flight.
   The planet fetch already populates `incoming_missions` — the frontend `useEffect` handles this, but
   only fires once. If the player opens a different planet tab, re-navigating back also re-fires.

### Fix 1 — WsEvent::AttackIncoming Add `mission_id`

```rust
AttackIncoming {
    mission_id: String,      // NEW — UUID of fleet_mission row
    attacker_name: String,
    source_coords: String,
    arrival_time: String,
    ships_count: i32,
}
```

Frontend deduplication key changes from `attack.id` (which is already the fleet_mission UUID from
the REST payload) to `mission_id` — ensuring the WS event and the REST poll use the same key.

### Fix 2 — Persistent Alert Banner

Add a fixed banner to `PlanetOverview` that renders whenever `incomingMissions` contains an attack:

```
Component: <AttackAlertBanner missions={incomingMissions} />

Renders a sticky red pulsing bar at the top of the page with:
- Count of incoming attacks
- Nearest arrival countdown (ticking every second from local clock)
- "Sauvegarder la flotte" button that navigates to the fleet dispatch tab

The banner must NOT disappear until the combat is resolved (i.e. the mission no longer appears
in incoming_missions after the next planet poll).
```

### Fix 3 — Offline Re-Entry Alert

When the planet is fetched (HTTP, not WS), the `incoming_missions` array is populated. The existing
`useEffect` will fire for each attack. This is correct. The only change needed is to separate the
deduplication set into `sessionStorage` (keyed by planet_id + mission_id) so it persists across
tab navigation within a session but resets on browser close (preventing stale alerts from old battles).

### Notification DB Persist for Attack Warning

Currently `attack_warning` is WS-only. Add a DB insert for the defender with `is_read = false`
so that if the defender is offline at launch time, they see the warning in the bell when they next log in.
Mark it `is_read = true` automatically once the corresponding `combat_defender` notification is created
(i.e., the battle resolved), to avoid showing both "incoming attack" + "combat result" as two unread items
for the same event.

Implementation: in `resolve_attack_mission`, after creating `combat_defender` notification, run:

```sql
UPDATE notification
SET is_read = true
WHERE user_id = $defender_id
  AND notif_type = 'attack_warning'
  AND created_at > $departure_time - INTERVAL '5 minutes'
  AND is_read = false;
```

---

## E. Browser `confirm()` Replacement

### Inventory of All 11 Occurrences

| File                                   | Action text (abbreviated)                                         | Danger Level |
|----------------------------------------|-------------------------------------------------------------------|--------------|
| `AdminPanel.tsx:539`                   | Supprimer cet objet                                               | High         |
| `AdminPanel.tsx:708`                   | Supprimer cette annonce                                           | High         |
| `AdminPanel.tsx:2058`                  | Supprimer l'utilisateur (IRRÉVERSIBLE, multi-line)                | Critical     |
| `AdminContentManager.tsx:189`          | Supprimer cet élément                                             | High         |
| `FlagshipView.tsx:183`                 | Déséquiper module                                                 | Medium       |
| `BuildQueueManager.tsx:266`            | Annuler construction + ressources remboursées                     | Medium       |
| `FriendsView.tsx:151`                  | Retirer ami                                                       | Medium       |
| `market/SellView.tsx:67`              | Confirmer suppression offre                                       | Medium       |
| `TradeRoutesView.tsx:258`              | Supprimer route commerciale                                       | Medium       |
| `market/PlanetMarketView.tsx:130`      | Acheter planète (avec prix)                                       | High         |
| `market/PlanetMarketView.tsx:153`      | Retirer annonce planète                                           | Medium       |
| `market/PlanetMarketView.tsx:427`      | Vendre planète au PNJ (IRRÉVERSIBLE, first check)                 | Critical     |
| `market/PlanetMarketView.tsx:471`      | Vendre planète au PNJ (IRRÉVERSIBLE, final confirm)               | Critical     |

### ConfirmModal Component Spec

**File**: `frontend/src/components/ui/ConfirmModal.tsx`

**Props interface**:
```typescript
interface ConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;           // may contain newlines, rendered as paragraphs
  confirmLabel?: string;         // default: "Confirmer"
  cancelLabel?: string;          // default: "Annuler"
  variant?: 'default' | 'danger' | 'critical';
  // 'default'  → confirm button: cyan
  // 'danger'   → confirm button: orange/amber
  // 'critical' → confirm button: red, requires typing planet/user name to unlock
  requireConfirmText?: string;   // if set, an input appears; confirm button disabled until value matches
  icon?: React.ReactNode;        // optional icon in header
}
```

**Visual Design**:
- Overlay: `fixed inset-0 bg-black/60 backdrop-blur-sm z-50`
- Card: `bg-[rgba(16,8,46,0.97)] border border-cyan-500/15 rounded-2xl p-6 max-w-md mx-auto mt-[20vh]`
- Title: matches existing heading style `text-slate-200 font-black uppercase tracking-wider`
- For `critical` variant: header has `border-red-500/30` and a red `ShieldAlert` icon
- Confirm button for `danger`: `bg-amber-600 hover:bg-amber-500`
- Confirm button for `critical`: `bg-red-700 hover:bg-red-600`, disabled until `requireConfirmText` matches

**Usage hook** — to avoid prop-drilling, provide a `useConfirm` hook:

```typescript
// frontend/src/hooks/useConfirm.ts
// Returns: { confirm, ConfirmModalNode }
// Usage:
//   const { confirm, ConfirmModalNode } = useConfirm();
//   ...
//   if (!await confirm({ title: '...', description: '...', variant: 'danger' })) return;
//   // proceed
```

The hook manages `open`, `resolve` internally via a Promise. `ConfirmModalNode` is a JSX element
that must be rendered once in the component tree (e.g., at the bottom of the component's return).

**Migration pattern for each callsite**:

Before:
```typescript
if (!confirm('Supprimer la route "X" ?')) return;
await deleteRoute(id);
```

After:
```typescript
const ok = await confirm({
  title: 'Supprimer la route',
  description: `Supprimer la route "${route.name}" ? Cette action est irréversible.`,
  confirmLabel: 'Supprimer',
  variant: 'danger',
});
if (!ok) return;
await deleteRoute(id);
```

For the admin user-delete case (AdminPanel.tsx:2058), use `variant: 'critical'` with
`requireConfirmText={player.username}` and include the full consequence list in `description`.

---

## F. Messagerie / Reports Tab Design

The current `NotificationCenter` has a "Afficher l'historique complet" button that fires
`window.dispatchEvent(new CustomEvent('open-message-tab', { detail: 'notifications' }))`.
The bell's `navigateForNotif()` fires `navigate-tab` with subtabs `combat`, `transport`, `economy`.

### Required: Reports Subtab in Messagerie

The messagerie tab must have a "Rapports" section with four subtabs: Combat, Espionnage, Expéditions, Économie.

Each subtab lists `mission_report` rows (via `GET /users/:id/reports?type=pvp_combat&limit=20&offset=0`).
Row format: `[icon] [date] [outcome badge] [opponent or planet name] [→ detail]`.

Clicking a row opens a `ReportDetailModal` with the full JSONB payload rendered per-type:

- **PvP Combat report**: Two-column battle summary (attacker fleet vs defender fleet), round count,
  loot table, debris field, winner banner.
- **Expedition report**: Single fleet card, outcome badge, resource loot, narrative text, SC earned.
- **Spy report**: Revealed data grid (resources / fleet / defense / buildings / research), detection status.
- **Sabotage report**: Action type, effect detail, detection status, casus belli granted badge if applicable.

---

## G. Sprint Task Breakdown

### Sprint 1 — Backend Foundation (1–2 days)

1. **Migration**: Add `mission_report` table + `report_id` column to `notification` + `departure_time` to `fleet_mission`
2. **Entity files**: `backend/src/entities/mission_report.rs`
3. **`create_mission_report(db, type, attacker_id, defender_id, planet_id, outcome, payload) -> Uuid`** helper in a new `backend/src/reports.rs`
4. **`GET /reports/:report_id`** — access-gated endpoint
5. **`GET /users/:id/reports`** — paginated list endpoint

### Sprint 2 — Backend Hookup (1 day)

6. Hook `create_mission_report` into `resolve_attack_mission` → creates pvp_combat report + two notifications with `report_id`
7. Hook into `spy_v2_handler` → creates spy report synchronously, return `report_id` in HTTP response
8. Hook into `attempt_sabotage` → creates sabotage report, return `report_id` in HTTP response
9. Hook into expedition tick resolution → creates expedition report
10. Add `departure_time` to all four mission-creating handlers
11. Add `mission_id` to `WsEvent::AttackIncoming`
12. Add `report_id: Option<String>` to `WsEvent::Notification`
13. Add spy stealth filter to `get_planet_handler` incoming_missions
14. Add `defender_name` to outgoing missions enrichment

### Sprint 3 — Frontend: ConfirmModal (0.5 day)

15. Create `frontend/src/components/ui/ConfirmModal.tsx`
16. Create `frontend/src/hooks/useConfirm.ts`
17. Replace all 11 `confirm()` callsites with `useConfirm` hook

### Sprint 4 — Frontend: Reports Tab (1.5 days)

18. Create `frontend/src/components/reports/ReportsList.tsx` — paginated list per type
19. Create `frontend/src/components/reports/ReportDetailModal.tsx` — per-type rendering
20. Add "Rapports" subtab to messagerie component
21. Update `NotificationCenter` to pass `report_id` from WS event detail
22. Update `navigateForNotif` to accept optional `report_id` and open `ReportDetailModal` directly

### Sprint 5 — Frontend: Military Section Hardening (0.5 day)

23. Replace progress bar formula with `computeProgress(departure_time, arrival_time)` in `PlanetOverview`
24. Replace mission type icon map (all 6 types)
25. Create `<AttackAlertBanner>` component
26. Move deduplication set to `sessionStorage` keyed by `{planet_id}:{mission_id}`
27. Add `attack_warning` DB persist in `attack_v2_handler` + auto-clear on combat resolve

---

## H. Data Flow Summary

```
Fleet Launched (attack_v2_handler)
  ├── INSERT fleet_mission (departure_time = now)
  ├── WS: AttackIncoming { mission_id, attacker_name, arrival_time, ships_count }
  └── INSERT notification (attack_warning, no report_id, defender only)

Combat Resolved (resolve_attack_mission in tick loop)
  ├── simulate_pvp_combat() → PvpCombatReport
  ├── INSERT mission_report → report_id
  ├── INSERT notification (combat_attacker, report_id) for attacker
  ├── INSERT notification (combat_defender, report_id) for defender
  ├── UPDATE notification SET is_read=true WHERE attack_warning for this defender+mission
  ├── WS: Notification { notif_type: combat_attacker, report_id } → attacker
  └── WS: Notification { notif_type: combat_defender, report_id } → defender

Spy Completed (spy_v2_handler, synchronous)
  ├── Compute result
  ├── INSERT mission_report → report_id
  ├── INSERT notification (spy_sent, report_id) for attacker
  ├── IF detected: INSERT notification (spy_detected, report_id) for defender
  ├── WS: Notification { spy_sent, report_id } → attacker
  ├── IF detected: WS: Notification { spy_detected, report_id } → defender
  └── HTTP 200 { ..., report_id }

Notification Bell Clicked
  └── navigateForNotif(notif.type, notif.report_id)
      └── IF report_id: open ReportDetailModal(report_id)
          ELSE: navigate to reports subtab by category
```

---

## I. Open Questions for PM

1. **Report retention policy**: Keep all reports forever, or purge after N days? Recommendation: keep
   combat reports 90 days, expedition/spy/sabotage 30 days. Add a nightly cleanup job.

2. **Spy report for defender**: If the spy was NOT detected, the defender gets no notification and no
   report. This is correct and intentional. Confirm this is the desired UX.

3. **`attack_warning` notification on the bell**: Should this show as a military notification in the
   bell with a pulsing red dot even before combat resolves? Current design says yes. If the combat
   resolves before the player opens the bell, only the `combat_defender` notification is shown (the
   `attack_warning` will have been auto-read). This is clean UX — confirm.

4. **Pirate raid reports**: Black market orbital_strike is the only implemented item. The pirate raid
   report schema above is designed but hookup cannot happen until the BM item resolution is wired to
   actual combat simulation (currently `orbital_strike` may just subtract resources directly — verify
   with `black_market.rs`).

5. **Duplicate notification per planet**: `broadcast_to_user` sends to all of a user's planets.
   If a player has 5 planets connected via WS, the notification bell will receive 5 copies of the
   same WS event. The frontend must deduplicate by `notif.id` (available once the server includes it
   in the WS event, which it currently does not). Add `notification_id: Option<String>` to
   `WsEvent::Notification` so the frontend can deduplicate by ID.
