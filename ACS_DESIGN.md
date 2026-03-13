# M7 — ACS (Allied Combat System) Design
> Space Conquest — Game Designer Document
> Date: 2026-03-13 | Version: 1.0

---

## 1. Problem Statement

In its current form, Space Conquest is entirely a 1v1 game. One attacker dispatches a fleet, it either wins or loses against the defender alone. This eliminates the defining social mechanic of space conquest MMOs: coordinated multi-fleet assaults that create the game's most memorable moments and cement alliance loyalty.

Without ACS, alliances are social clubs. With ACS, they are military coalitions with real strategic depth.

---

## 2. Design Objectives

1. Allow N allied players to dispatch fleets that converge on the same target at the same second.
2. Minimize the real-time coordination burden — this is an asynchronous game.
3. Define a fair, transparent reward split based on military contribution.
4. Prevent abuse (solo-ACS to bypass cooldown, zero-ship joins, infinite holding).
5. Expose a minimal, clean API surface that the Rust backend can implement incrementally.

---

## 3. Core Mechanic Overview

The ACS flow mirrors Ogame's ACS Attack/Defend but adapted to Space Conquest's architecture:

```
Player A (leader) creates ACS group targeting Planet X
  -> POST /fleet/acs/create
  -> Returns: { acs_group_id, target_planet_id, expiry_at }

Players B, C join the group with their own fleets
  -> POST /fleet/acs/:id/join
  -> Each fleet deducted from planet immediately (ships locked in transit)
  -> Each fleet gets its own fleet_mission row with acs_group_id set

All fleet_missions in the group converge on the same arrival_time
  -> The leader's arrival_time defines the group's attack window

Tick system sees the lead fleet arrive:
  -> Enters HOLDING state for up to 30 min
  -> As other fleets arrive, they join the holding pool
  -> When all fleets have arrived, OR after 30 min — execute combined attack

Combined fleet fights as a single merged unit
  -> Same simulate_pvp_combat call, one attacker side with merged HashMap<ship_key, count>

Battle report generated for each participant
  -> Resources and debris split proportionally by military_score_contribution
```

---

## 4. Data Model

### 4.1 New Table: `acs_group`

```sql
CREATE TABLE acs_group (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leader_user_id  UUID NOT NULL REFERENCES users(id),
    target_planet_id UUID NOT NULL REFERENCES planet(id),
    status          TEXT NOT NULL DEFAULT 'forming',
    -- status values: 'forming' | 'in_flight' | 'holding' | 'resolved' | 'expired'
    holding_until   TIMESTAMPTZ NULL,
    -- set when the lead fleet arrives; group resolves at min(all_arrived, holding_until)
    max_join_minutes INTEGER NOT NULL DEFAULT 30,
    -- window during which new members can join after group creation
    expires_at      TIMESTAMPTZ NOT NULL,
    -- group auto-cancels if no fleet is launched by this time
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ NULL
);
```

**Status transitions:**

```
forming   -> in_flight  (when leader launches their fleet)
in_flight -> holding    (when leader's fleet_mission arrival_time is reached)
holding   -> resolved   (when all fleets arrive OR holding_until expires)
forming   -> expired    (if no fleet is ever launched before expires_at)
```

### 4.2 Column Addition: `fleet_mission.acs_group_id`

```sql
ALTER TABLE fleet_mission
    ADD COLUMN acs_group_id UUID NULL REFERENCES acs_group(id);
```

Nullable. Solo missions have `NULL`. ACS missions carry the group UUID. The `mission_type` remains `"attack"` — ACS is a coordination layer, not a new mission type.

### 4.3 Entity changes in Rust

**`backend/src/entities/fleet_mission.rs`** — add field:

```rust
pub acs_group_id: Option<Uuid>,
```

**New entity: `backend/src/entities/acs_group.rs`**:

```rust
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "acs_group")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub leader_user_id: Uuid,
    pub target_planet_id: Uuid,
    pub status: String,           // forming | in_flight | holding | resolved | expired
    pub holding_until: Option<DateTime>,
    pub max_join_minutes: i32,
    pub expires_at: DateTime,
    pub created_at: DateTime,
    pub resolved_at: Option<DateTime>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
```

---

## 5. API Endpoints

### 5.1 `POST /fleet/acs/create`

**Purpose:** Leader creates an ACS group. No fleet is dispatched yet — the group is in `forming` state.

**Request body:**

```json
{
  "leader_planet_id": "uuid",
  "target_planet_id": "uuid",
  "max_join_minutes": 30
}
```

**Validations:**
- Leader planet must belong to the authenticated user.
- Target planet must not belong to the leader (no self-attack).
- Leader must not already have an active ACS group in `forming` or `in_flight` state (1 active group per player).
- Beginner protection and anti-farm rules apply (same as `attack_v2`).

**Response 200:**

```json
{
  "acs_group_id": "uuid",
  "target_planet_id": "uuid",
  "expires_at": "ISO8601",
  "instructions": "Share this group ID with allies. Each must POST /fleet/acs/{id}/join with their fleet."
}
```

**Response errors:**
- `400` — invalid coordinates, self-attack
- `403` — beginner protection / anti-farm
- `409` — already has an active ACS group

### 5.2 `POST /fleet/acs/:id/join`

**Purpose:** A member (including the leader) dispatches their fleet to join the group. This creates a `fleet_mission` row tied to the `acs_group_id`. Ships are immediately deducted from the planet.

**Request body:**

```json
{
  "source_planet_id": "uuid",
  "fleet": { "light_hunter": 50, "cruiser": 10 }
}
```

**Validations:**
- ACS group must exist and be in `forming` or `in_flight` status.
- `expires_at` must not have passed.
- `source_planet_id` must belong to the joining user.
- Planet must have enough ships.
- Planet must have enough deuterium for fuel.
- A user may only join once per group (one `fleet_mission` per user per `acs_group_id`).

**Arrival time calculation:**

Each joining fleet calculates its own travel time from its source planet to the target planet independently. The actual `arrival_time` stored on the `fleet_mission` is the joining fleet's own ETA. The tick system uses `acs_group_id` to group them, not a shared arrival time.

The leader's `fleet_mission` defines the group's `holding_until` = `leader_arrival_time + 30 min`. All members who arrive before that window participate. Late arrivals resolve solo (their ACS group participation is dropped, they fight alone or turn back — implementation detail: simplest is they fight alone against whatever remains after the ACS combat resolved).

**Response 200:**

```json
{
  "fleet_mission_id": "uuid",
  "acs_group_id": "uuid",
  "arrival_time": "ISO8601",
  "ships_sent": { "light_hunter": 50, "cruiser": 10 }
}
```

**Side effect:** If this is the leader's fleet joining, transition group status `forming` -> `in_flight`. The leader MUST be the first to join (or join simultaneously in the create+join pattern).

### 5.3 `GET /fleet/acs/:id`

**Purpose:** Any player (member or not) can query an ACS group to see its status and member list.

**Response 200:**

```json
{
  "id": "uuid",
  "status": "in_flight",
  "target_planet_id": "uuid",
  "target_coords": "[2:147:8]",
  "expires_at": "ISO8601",
  "holding_until": "ISO8601 or null",
  "members": [
    {
      "user_id": "uuid",
      "username": "Phantomhex",
      "is_leader": true,
      "fleet_mission_id": "uuid",
      "ships_sent": { "battleship": 20, "cruiser": 50 },
      "arrival_time": "ISO8601",
      "military_score": 1840
    },
    {
      "user_id": "uuid",
      "username": "Ally1",
      "is_leader": false,
      "fleet_mission_id": "uuid",
      "ships_sent": { "light_hunter": 200 },
      "arrival_time": "ISO8601",
      "military_score": 600
    }
  ]
}
```

`military_score` is the pre-computed combat power of each member's fleet (same formula as the ranking system: `(attack + shield/2 + hull/10) / 1000`). This is shown before battle so players can plan.

---

## 6. Combat Resolution — Tick System Logic

This is the most critical section. The tick system (`tick_system.rs`) must handle ACS groups specially.

### 6.1 ACS detection in the tick loop

When processing `fleet_mission` rows where `arrival_time <= now`:

```
For each fleet_mission where arrival_time <= now AND mission_type = 'attack':
  IF acs_group_id IS NULL:
    -> resolve normally (current behavior)
  ELSE:
    -> fetch acs_group row
    -> IF group.status == 'holding':
         -> add this fleet to the holding pool (mark fleet_mission as 'holding_arrived')
         -> IF all fleet_missions in group have arrived OR now >= group.holding_until:
              -> resolve ACS combat
    -> IF group.status == 'in_flight':
         -> this is the lead fleet arriving
         -> SET group.status = 'holding'
         -> SET group.holding_until = NOW() + 30 min
         -> add lead fleet to the holding pool
```

### 6.2 Fleet merging

When all holding fleets are collected for an ACS group:

```rust
let mut merged_fleet: HashMap<String, i32> = HashMap::new();
for mission in &holding_missions {
    let fleet: HashMap<String, i32> = serde_json::from_str(mission.fleet_data.as_deref().unwrap_or("{}")).unwrap_or_default();
    for (ship_key, count) in fleet {
        *merged_fleet.entry(ship_key).or_insert(0) += count;
    }
}
```

This merged fleet is passed as the attacker side to `simulate_pvp_combat`. The defender side is the target planet's ships + defenses, identical to solo attack resolution.

### 6.3 Reward split — proportional by military score

After combat resolves:

```
total_loot_metal, total_loot_crystal, total_debris_metal, total_debris_crystal

For each participant:
  participant_score = sum of (ship_attack + ship_shield/2 + ship_hull/10) over ships sent
  total_score = sum of all participant_scores

  participant_loot_metal   = total_loot_metal   * (participant_score / total_score)
  participant_loot_crystal = total_loot_crystal * (participant_score / total_score)
  participant_debris_share = (participant_score / total_score)
    -> written to combat_log for the participant's debris collection record

Each participant receives their loot on their source planet.
Each participant receives their surviving ships back on their source planet.
Each participant gets a combat_log entry (same format as solo attack).
```

The debris field is created at the target planet's coordinates as normal. Each participant's share is noted in their combat log. Recycling is first-come-first-served (no change to recycle mechanics).

### 6.4 Early arrival edge case

If a non-leader member arrives before the leader (possible if they launched from a closer planet), their fleet waits in `holding` status as if the group were already in holding. The holding timer starts when the LEADER arrives, not when the first member arrives.

Implementation: the tick loop marks non-leader early arrivals with a temporary `mission_type = "acs_holding"` (internal status, not visible to players). When the leader arrives, `holding_until` is set and the tick resumes normal processing.

### 6.5 Timeout behavior (30 min holding, no one else arrives)

If `now >= group.holding_until` and not all fleets have arrived:

- All fleets that ARE in the holding pool fight together.
- Fleets still in transit get their `acs_group_id` set to NULL and become solo attack missions. They will fight whatever remains after the ACS combat resolved (defender may have been destroyed, partially damaged, or reinforced).

This creates natural tension: it's better for late-joiners to stay close enough to arrive in time. Distance is a real constraint.

---

## 7. Anti-Abuse Rules

| Rule | Rationale |
|------|-----------|
| Max 1 active ACS group per player (as leader) | Prevents using ACS as a routing layer for multi-target attacks |
| Cannot join your own group as both leader and member twice | You send one fleet from one planet |
| ACS group expires after `max_join_minutes` (default 30 min) if no fleet dispatched | Prevents indefinite "parking" of groups |
| Attack cooldown applies to the LEADER's pair (attacker→defender) | ACS doesn't bypass the anti-flood cooldown |
| Anti-farm ratio check applies to the leader | All-ally attack on a newbie is still blocked |
| Joining member's source planet must have departed from within the max_join window | Late members can't join after combat resolved |
| Minimum 1 ship per joining fleet | No ghost joins to receive loot share |

---

## 8. Backend Implementation Plan

### Step 1 — Migration

**File:** `migration/src/m20261002_000002_acs_system.rs`

```rust
// Create acs_group table
// ALTER fleet_mission ADD COLUMN acs_group_id UUID NULL REFERENCES acs_group(id)
// CREATE INDEX idx_fleet_mission_acs_group ON fleet_mission(acs_group_id)
```

### Step 2 — Entities

- `backend/src/entities/acs_group.rs` — new entity (Model, ActiveModel, Relation)
- `backend/src/entities/fleet_mission.rs` — add `pub acs_group_id: Option<Uuid>`
- `backend/src/entities/prelude.rs` — export `AcsGroup`

### Step 3 — Handlers in `fleet.rs`

```rust
pub async fn create_acs_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<CreateAcsPayload>,
) -> impl IntoResponse

pub async fn join_acs_handler(
    Path(acs_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<JoinAcsPayload>,
) -> impl IntoResponse

pub async fn get_acs_handler(
    Path(acs_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse
```

### Step 4 — Router registration in `fleet.rs`

```rust
.route("/fleet/acs/create", post(create_acs_handler))
.route("/fleet/acs/:id/join", post(join_acs_handler))
.route("/fleet/acs/:id", get(get_acs_handler))
```

### Step 5 — Tick system (`tick_system.rs`)

New function: `resolve_acs_groups(db, ws, config)` called from the main tick loop. Processes:
1. ACS groups in `forming` where `expires_at < now` → set `expired`
2. ACS fleet missions where `arrival_time <= now` → enter holding logic
3. ACS groups in `holding` where all fleets arrived OR `holding_until < now` → execute merged combat

---

## 9. Frontend Considerations

The minimum frontend for ACS is:

1. **ACS Panel in FleetDispatcher** — a new tab "ACS" with:
   - "Créer un groupe ACS" button — calls `POST /fleet/acs/create`, displays `acs_group_id` to copy/share
   - "Rejoindre un groupe ACS" form — accepts `acs_group_id`, selects ships, calls `POST /fleet/acs/:id/join`
   - Display of current active group (if any) with member list and ETAs

2. **ActiveMissions** — existing component already shows fleet missions. ACS missions should show with a "ACS [N membres]" badge.

3. **Combat Report** — existing report format is compatible. Add a line showing the ACS group members and their contribution percentages.

---

## 10. Mathematical Validation

### Reward split sanity check

Example: 3 players attack together.

| Player | Fleet | Attack pts | Shield pts/2 | Hull pts/10 | Score |
|--------|-------|-----------|--------------|-------------|-------|
| A | 20 Battleships | 20×1000=20000 | 20×200/2=2000 | 20×6000/10=12000 | 34000 |
| B | 100 Cruisers | 100×400=40000 | 100×100/2=5000 | 100×2000/10=20000 | 65000 |
| C | 300 Light Hunters | 300×50=15000 | 300×10/2=1500 | 300×400/10=12000 | 28500 |

Total score: 127 500

Loot: 500 000 Metal, 200 000 Crystal

| Player | Loot Metal | Loot Crystal |
|--------|-----------|-------------|
| A | 500k × 34/127.5 = 133 333 | 200k × 34/127.5 = 53 333 |
| B | 500k × 65/127.5 = 254 902 | 200k × 65/127.5 = 101 961 |
| C | 500k × 28.5/127.5 = 111 765 | 200k × 28.5/127.5 = 44 706 |

Player B, bringing the most combat-effective fleet (Cruisers), earns the largest share. This is mathematically fair and incentivizes strong fleet composition over padding with cheap fodder.

### Holding timer math

30-minute holding window. A planet 500 units away at speed 5 takes `(35000/5) * sqrt(500*10)` = 7000 * 70.7 = 494 900 seconds ≈ 5.7 days travel. Players who launch from the same galaxy will arrive within minutes of each other. The 30-minute window is generous enough for same-system coordination, tight enough to prevent indefinite holding.

---

## 11. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| ACS used to bypass anti-farm | Medium | Anti-farm check applies to leader's ratio. Allies may still be blocked if defender is too weak. |
| Ghost join for loot share (1 ship join) | Low | Score of 1 ship is negligible; share would be <0.01% of loot. Not worth patching. |
| Leader disconnects, group never transitions | Low | `expires_at` auto-expires the group after 30 min. Fleets already dispatched become solo attacks (acs_group_id set to NULL in tick). |
| Holding pool race condition (two fleets arrive same tick) | Medium | Tick is single-threaded (tokio sequential). All arrivals in the same tick batch are processed atomically. |
| Abuse: solo player creates ACS to get a "group" combat_log | None | Combat is identical, just one fleet. No mechanical advantage. |
