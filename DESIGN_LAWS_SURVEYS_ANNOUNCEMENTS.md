# Design: Democratic Laws, Surveys & Announcements
## Space Conquest — Feature Specification v1.0

---

## 0. Codebase Audit Summary

Before designing, here is what already exists that this feature must integrate with:

### Existing Infrastructure

**Announcements table** (`m20260120_000006_create_announcements.rs`)
- Columns: `id (i32, serial)`, `title`, `content`, `type (info/warning/danger)`, `is_active (bool)`, `created_at`, `updated_at`
- Entity: `backend/src/entities/announcement.rs`
- Backend handlers in `admin.rs`: `GET /announcements/active`, `GET/POST/PATCH/DELETE /admin/announcements`
- Frontend: `AnnouncementBanner.tsx` — scrolling ticker, per-id dismissal in localStorage

**Notifications system** (`m20260308_000001_create_notifications`)
- `WsState::push_notification(user_id, type, title, message, report_id)` — persists to DB + broadcasts via WS to that user's planets
- `WsState::broadcast_global(event)` — iterates all active planet connections
- `WsState::broadcast_to_user(user_id, event)` — queries user's planets then broadcasts

**ServerConfigCache** (`backend/src/lib.rs`)
- Key/value store loaded from `server_config` table at startup
- Named fields: `production_speed`, `building_speed`, `research_speed`, `ship_build_speed`, `mining_speed`, `construction_speed`
- Generic HashMap `configs: HashMap<String, f64>` for dynamic keys
- `reload_server_config(state)` helper already exists — reloads from DB into the `Arc<RwLock<>>`
- Keys in DB: `production_speed_multiplier`, `building_speed_multiplier`, `research_speed_multiplier`, `ship_build_speed_multiplier`, `construction_speed_multiplier`, `mining_speed_multiplier`, plus game-specific keys like `expedition_syndicate_credit_chance`

**WsEvent enum** — already has `Notification`, `GlobalAnnouncement` (to be added), etc. The `broadcast_global` function exists and hits all connected planet channels.

**Tick system** (`main.rs` + `tick_system.rs`) — runs every 30s for fleet missions, every 5s for build queues. Law expiry and vote deadline checks will be added to the main tick.

**Migration naming convention**: `m20260314_000001_xxx.rs` (next date after last: `m20260313_000001`)

---

## 1. Database Schema

### 1.1 Migration: `m20260314_000001_create_law_system`

```sql
-- Law proposals (admin-created, time-bounded votes)
CREATE TABLE law_proposal (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote_start  TIMESTAMP NOT NULL DEFAULT NOW(),
    vote_end    TIMESTAMP NOT NULL,               -- vote_start + duration_hours
    status      TEXT NOT NULL DEFAULT 'voting',   -- voting | passed | failed | expired
    -- JSONB array of effect objects, see section 2 for schema
    effects     JSONB NOT NULL DEFAULT '[]',
    yes_count   INTEGER NOT NULL DEFAULT 0,
    no_count    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- One vote per user per law
CREATE TABLE law_vote (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_id      UUID NOT NULL REFERENCES law_proposal(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote        BOOLEAN NOT NULL,                 -- true = FOR, false = AGAINST
    voted_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(law_id, user_id)
);

-- Active law effects currently applied to server_config
CREATE TABLE law_effect (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_id          UUID NOT NULL REFERENCES law_proposal(id) ON DELETE CASCADE,
    config_key      TEXT NOT NULL,               -- e.g. "production_speed_multiplier"
    operation       TEXT NOT NULL,               -- multiply | add | set
    value           DOUBLE PRECISION NOT NULL,
    base_value      DOUBLE PRECISION NOT NULL,   -- snapshot of server_config value at application time
    expires_at      TIMESTAMP,                   -- NULL = permanent
    applied_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_law_proposal_status ON law_proposal(status);
CREATE INDEX idx_law_effect_expires_at ON law_effect(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_law_vote_law_id ON law_vote(law_id);
CREATE INDEX idx_law_vote_user_id ON law_vote(user_id);
```

**Why UUID for law_proposal** rather than serial int: Law IDs will appear in announcement content, notifications, and frontend routes. A UUID makes them non-guessable and consistent with the rest of the codebase (fleet_mission, planet, user all use UUID).

**Why `base_value` in law_effect**: When a law expires, we need to revert the config key to its pre-law value. Storing the snapshot avoids a race condition if the admin manually changes the config during the law's active period. On expiry, the system reads `base_value` and writes it back, then reloads the cache. This is simpler and safer than trying to "un-apply" stacked effects.

**Why `yes_count`/`no_count` as denormalized integers on law_proposal**: Avoids a `COUNT(*)` on `law_vote` on every poll. Incremented atomically in the vote handler. The source of truth for the final tally at vote close is always a fresh `COUNT(*)` to guarantee correctness.

---

### 1.2 Migration: `m20260314_000002_create_survey_system`

```sql
-- Admin-created surveys (non-binding)
CREATE TABLE survey (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title         TEXT NOT NULL,
    description   TEXT NOT NULL,
    question_type TEXT NOT NULL,   -- yes_no | multiple_choice | rating
    -- For multiple_choice: [{"id": "a", "label": "Option 1"}, ...]
    -- For yes_no: null (options are implied "yes"/"no")
    -- For rating: null (scale 1-5 is implied)
    options       JSONB,
    created_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    starts_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    ends_at       TIMESTAMP NOT NULL,
    status        TEXT NOT NULL DEFAULT 'active',  -- active | closed | archived
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- One response per user per survey
CREATE TABLE survey_response (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id    UUID NOT NULL REFERENCES survey(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- yes_no:           {"answer": "yes"} or {"answer": "no"}
    -- multiple_choice:  {"answer": "a"} (references options[].id)
    -- rating:           {"answer": 3}
    answer       JSONB NOT NULL,
    responded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(survey_id, user_id)
);

CREATE INDEX idx_survey_status ON survey(status);
CREATE INDEX idx_survey_response_survey_id ON survey_response(survey_id);
```

**Why JSONB for answers vs. typed columns**: The answer schema differs per question type. A single JSONB column avoids nullable multi-column sprawl (`yes_no_answer TEXT NULL, rating_answer INT NULL, choice_answer TEXT NULL`). The application layer validates the shape at write time.

---

### 1.3 Augmenting the `announcements` table

The existing `announcements` table is already production data. Rather than altering it destructively, add two nullable columns in a new migration:

```
Migration: m20260314_000003_augment_announcements
```

```sql
-- Links an announcement to a law vote or survey for deep-linking in the frontend
ALTER TABLE announcements ADD COLUMN source_type TEXT;   -- law | survey | manual | event
ALTER TABLE announcements ADD COLUMN source_id   TEXT;   -- UUID of the law_proposal or survey
-- expires_at: auto-hide the announcement after a vote ends, so it doesn't linger
ALTER TABLE announcements ADD COLUMN expires_at  TIMESTAMP;
```

These are all nullable and backwards-compatible. The existing `AnnouncementBanner.tsx` already reads from `/announcements/active` and this endpoint can filter on `expires_at IS NULL OR expires_at > NOW()`.

---

## 2. Law Effects System

### 2.1 Effect Object Schema (JSONB in `law_proposal.effects`)

```json
[
  {
    "config_key": "production_speed_multiplier",
    "operation": "multiply",
    "value": 1.5,
    "duration_hours": 72
  },
  {
    "config_key": "ship_build_speed_multiplier",
    "operation": "add",
    "value": 50.0,
    "duration_hours": null
  }
]
```

**Allowed operations**:
- `multiply`: `new_config_value = current_db_value * effect.value`. Example: production_speed 250 × 1.5 = 375.
- `add`: `new_config_value = current_db_value + effect.value`. Example: ship_build_speed 100 + 50 = 150.
- `set`: `new_config_value = effect.value`. Used for binary toggles, e.g. setting `beginner_protection_enabled` to 0.

**Supported config keys** (those that exist in `server_config` table and are consumed by game logic):

| config_key | current default | sensible law range |
|---|---|---|
| `production_speed_multiplier` | 250.0 | 1.2x – 2.0x (multiply) |
| `building_speed_multiplier` | 50.0 | 1.5x – 3.0x (multiply) |
| `research_speed_multiplier` | 25.0 | 1.5x – 3.0x (multiply) |
| `ship_build_speed_multiplier` | 100.0 | 1.5x – 2.0x (multiply) |
| `expedition_syndicate_credit_chance` | 0.35 | 0.5 – 0.7 (set) |
| `mining_speed_multiplier` | 1.0 | 1.5x – 2.0x (multiply) |
| `construction_speed_multiplier` | 1.0 | 1.5x – 2.0x (multiply) |

**Permanently banned from law effects**: `jwt_secret`, `database_url`, `frontend_url`, or any key not in a pre-approved allowlist. The backend must enforce a static allowlist of mutable keys.

### 2.2 Effect Application Flow

When a law vote closes and `yes_count > no_count`:

```
1. For each effect in law.effects:
   a. SELECT config_value FROM server_config WHERE config_key = effect.config_key
   b. base_value = parse(config_value) as f64
   c. new_value = apply_operation(base_value, effect.operation, effect.value)
   d. UPDATE server_config SET config_value = new_value::text WHERE config_key = effect.config_key
   e. INSERT INTO law_effect (law_id, config_key, operation, value, base_value, expires_at)
      VALUES (law.id, effect.config_key, effect.operation, effect.value, base_value,
              CASE WHEN effect.duration_hours IS NOT NULL
                   THEN NOW() + effect.duration_hours * INTERVAL '1 hour'
                   ELSE NULL END)
2. UPDATE law_proposal SET status = 'passed' WHERE id = law.id
3. reload_server_config(state)  -- refreshes Arc<RwLock<ServerConfigCache>>
4. broadcast_to_all_users(db, ws, "law_passed", "Loi adoptée", "La loi X est maintenant en vigueur.")
5. INSERT INTO announcements (title, content, type, is_active, source_type, source_id, expires_at)
   VALUES ("Loi adoptée: X", "...", "success", true, "law", law.id::text,
           max(effects.expires_at)  -- the announcement expires when the last effect does)
```

### 2.3 Effect Revert Flow (in the main tick, every 60s)

```
1. SELECT * FROM law_effect WHERE expires_at IS NOT NULL AND expires_at <= NOW()
2. For each expired effect:
   a. UPDATE server_config SET config_value = base_value::text WHERE config_key = effect.config_key
   b. DELETE FROM law_effect WHERE id = effect.id
3. IF any effects were reverted:
   a. reload_server_config(state)
   b. Optionally: broadcast_to_all_users("law_expired", "Loi expirée", "Les effets de la loi X ont pris fin.")
```

**Edge case — overlapping laws on same key**: If two laws both multiply `production_speed_multiplier` and both pass, the second law's `base_value` snapshot captures the already-modified value (base × 1.5). When the first law expires and reverts to its `base_value` (the original), it would overwrite the second law's effect. This is a known trade-off of the snapshot approach.

**Recommended mitigation**: Enforce in the admin UI that only one active law may target the same `config_key` at a time. The backend should reject a law proposal if there is already a `law_effect` row with the same `config_key` and `expires_at IS NULL OR expires_at > NOW()`.

### 2.4 Vote Closing Flow (main tick, every 60s)

```
SELECT * FROM law_proposal WHERE status = 'voting' AND vote_end <= NOW()

For each expired law:
  -- Recount from the canonical table (not denormalized counters)
  yes = COUNT(*) FROM law_vote WHERE law_id = law.id AND vote = true
  no  = COUNT(*) FROM law_vote WHERE law_id = law.id AND vote = false
  total_eligible = COUNT(*) FROM users WHERE role != 'banned' AND created_at < law.vote_start

  participation_rate = (yes + no) / total_eligible

  IF yes > no:
    apply_effects(law)   -- see 2.2
  ELSE:
    UPDATE law_proposal SET status = 'failed', yes_count = yes, no_count = no
    broadcast_to_all_users("law_failed", "Loi rejetée", "La loi X n'a pas été adoptée.")

-- Reminder at 24h remaining
SELECT * FROM law_proposal WHERE status = 'voting'
  AND vote_end BETWEEN NOW() + INTERVAL '23 hours 55 minutes'
               AND NOW() + INTERVAL '24 hours 5 minutes'
  AND reminder_sent = false
→ push reminder notification + update reminder_sent = true
```

Add `reminder_sent BOOLEAN NOT NULL DEFAULT false` to `law_proposal` in the migration.

---

## 3. API Endpoints

### 3.1 Laws

All law endpoints live in a new file: `backend/src/laws.rs`, with a `pub fn router(state: AppState) -> Router<AppState>` following the existing handler module pattern.

```
GET    /laws                     — list all laws (voting + passed + failed), paginated
GET    /laws/:id                 — law detail + vote counts + user's own vote (if authenticated)
POST   /laws/:id/vote            — submit vote { vote: bool }, 401 if not authenticated, 409 if already voted
GET    /laws/active              — currently active laws (status=passed AND has unexpired effects)
POST   /admin/laws               — create law proposal (admin only)
PATCH  /admin/laws/:id           — update law (only allowed if status=voting and vote_start > NOW())
DELETE /admin/laws/:id           — delete law (only if still voting and 0 votes cast)
```

**Request body for POST /admin/laws**:
```json
{
  "title": "Boost de production de 48h",
  "description": "Toutes les mines produisent 50% de plus pendant 48h pour aider les nouveaux joueurs.",
  "duration_hours": 72,
  "effects": [
    {
      "config_key": "production_speed_multiplier",
      "operation": "multiply",
      "value": 1.5,
      "duration_hours": 48
    }
  ]
}
```

**Response body for GET /laws/:id**:
```json
{
  "id": "uuid",
  "title": "...",
  "description": "...",
  "vote_start": "2026-03-14T10:00:00Z",
  "vote_end": "2026-03-17T10:00:00Z",
  "status": "voting",
  "effects": [...],
  "yes_count": 42,
  "no_count": 18,
  "total_eligible": 150,
  "participation_rate": 0.40,
  "time_remaining_seconds": 172800,
  "user_vote": true,       -- null if not voted, true/false if voted
  "active_effects": []     -- populated when status=passed, shows law_effect rows
}
```

**Response body for GET /laws/active**:
```json
[
  {
    "law_id": "uuid",
    "title": "Boost de production",
    "effects": [
      {
        "config_key": "production_speed_multiplier",
        "operation": "multiply",
        "value": 1.5,
        "expires_at": "2026-03-19T10:00:00Z",
        "seconds_remaining": 259200
      }
    ]
  }
]
```

### 3.2 Surveys

New file: `backend/src/surveys.rs`

```
GET    /surveys                  — list all surveys (active + closed), paginated
GET    /surveys/:id              — survey detail + results (results hidden until user has voted OR survey is closed)
POST   /surveys/:id/respond      — submit response { answer: JSONB }, 409 if already responded
GET    /surveys/active           — currently active surveys (status=active AND ends_at > NOW())
POST   /admin/surveys            — create survey (admin only)
PATCH  /admin/surveys/:id        — update (only if no responses yet)
DELETE /admin/surveys/:id        — delete (only if no responses yet)
```

**Request body for POST /admin/surveys**:
```json
{
  "title": "Avis sur le système de combat",
  "description": "Donnez votre avis sur les mécaniques de combat v5.0.",
  "question_type": "rating",
  "options": null,
  "duration_hours": 168
}
```

For `multiple_choice`:
```json
{
  "question_type": "multiple_choice",
  "options": [
    {"id": "a", "label": "Oui, reset complet"},
    {"id": "b", "label": "Non, pas de reset"},
    {"id": "c", "label": "Reset partiel uniquement des ressources"}
  ]
}
```

**Response body for GET /surveys/:id** (after user has voted or survey is closed):
```json
{
  "id": "uuid",
  "title": "...",
  "question_type": "rating",
  "options": null,
  "status": "active",
  "ends_at": "2026-03-21T10:00:00Z",
  "total_responses": 87,
  "user_has_responded": true,
  "user_answer": {"answer": 4},
  "results": {
    "1": 3,
    "2": 8,
    "3": 21,
    "4": 38,
    "5": 17
  },
  "average_rating": 3.65
}
```

For `multiple_choice`, `results` is `{"a": 45, "b": 30, "c": 12}`.
For `yes_no`, `results` is `{"yes": 60, "no": 27}`.

### 3.3 Broadcast Endpoint

```
POST /admin/broadcast            — admin-only, broadcast a message to all connected users immediately
Body: { "type": "info|warning|success", "title": "...", "message": "..." }
```

This calls `broadcast_to_all_users` internally (see section 4.2) without creating a persistent announcement.

---

## 4. Backend Implementation Details

### 4.1 New Modules to Create

```
backend/src/laws.rs          — handlers for laws + voting logic
backend/src/surveys.rs       — handlers for surveys + response logic
```

Register in `lib.rs`:
```rust
pub mod laws;
pub mod surveys;
```

Merge in `main.rs` following the existing pattern:
```rust
.merge(laws::router(state.clone()))
.merge(surveys::router(state.clone()))
```

### 4.2 broadcast_to_all_users Helper

Add to `websocket.rs` in `impl WsState`:

```rust
/// Broadcasts a notification to ALL users (persist in DB for each user + WS event).
/// Used for law results, survey openings, server-wide announcements.
/// Note: this queries the DB for all user IDs — use sparingly (at most a few times per hour).
pub async fn broadcast_to_all_users(
    &self,
    notif_type: &str,
    title: &str,
    message: &str,
) {
    // Broadcast via WS to all connected planets (no DB write per user for WS)
    self.broadcast_global(WsEvent::Notification {
        notif_type: notif_type.to_string(),
        title: title.to_string(),
        message: message.to_string(),
    }).await;

    // Persist notification in DB for all users (so offline players see it on next login)
    use crate::entities::{prelude::User, user};
    if let Ok(all_users) = User::find().all(&self.db).await {
        let now = chrono::Utc::now().naive_utc();
        for u in all_users {
            let notif = crate::entities::notification::ActiveModel {
                id: sea_orm::Set(uuid::Uuid::new_v4()),
                user_id: sea_orm::Set(u.id),
                notif_type: sea_orm::Set(notif_type.to_string()),
                title: sea_orm::Set(title.to_string()),
                message: sea_orm::Set(message.to_string()),
                is_read: sea_orm::Set(false),
                created_at: sea_orm::Set(now),
                report_id: sea_orm::Set(None),
            };
            let _ = notif.insert(&self.db).await;
        }
    }
}
```

**Performance note**: This does N individual INSERTs (one per user). For a server with 500 users this is acceptable (~50ms total). For 5000+ users, batch-insert with `insert_many` from SeaORM instead. Add a `TODO(scale)` comment.

Also add a new `WsEvent` variant to the enum for law/survey state changes (clients can update their UI without polling):

```rust
#[serde(rename = "law_update")]
LawUpdate {
    law_id: String,
    new_status: String,  // "passed" | "failed" | "expired"
    title: String,
},

#[serde(rename = "survey_closed")]
SurveyClosed {
    survey_id: String,
    title: String,
},

#[serde(rename = "active_laws_changed")]
ActiveLawsChanged,  // signal to refetch /laws/active
```

### 4.3 Tick Integration

In `main.rs` where the 30-second tick loop runs, add a call every 60 seconds (use a counter mod 2):

```rust
// Laws tick: check vote deadlines, expire effects
if tick_counter % 2 == 0 {
    if let Err(e) = laws::process_law_tick(&state, &ws_state).await {
        eprintln!("Law tick error: {:?}", e);
    }
}
```

`laws::process_law_tick` implementation outline in `laws.rs`:

```rust
pub async fn process_law_tick(state: &AppState, ws: &WsState) -> Result<(), sea_orm::DbErr> {
    let db = &state.db;
    let now = Utc::now().naive_utc();

    // --- 1. Close expired votes ---
    let expired_votes = LawProposal::find()
        .filter(law_proposal::Column::Status.eq("voting"))
        .filter(law_proposal::Column::VoteEnd.lte(now))
        .all(db).await?;

    for law in expired_votes {
        close_law_vote(state, ws, law).await?;
    }

    // --- 2. Expire active law effects ---
    let expired_effects = LawEffect::find()
        .filter(law_effect::Column::ExpiresAt.is_not_null())
        .filter(law_effect::Column::ExpiresAt.lte(now))
        .all(db).await?;

    if !expired_effects.is_empty() {
        for effect in expired_effects {
            revert_law_effect(db, &effect).await?;
        }
        reload_server_config(state).await;
        ws.broadcast_global(WsEvent::ActiveLawsChanged).await;
    }

    // --- 3. Send 24h reminders ---
    let window_start = now + chrono::Duration::hours(23) + chrono::Duration::minutes(55);
    let window_end   = now + chrono::Duration::hours(24) + chrono::Duration::minutes(5);
    let reminder_laws = LawProposal::find()
        .filter(law_proposal::Column::Status.eq("voting"))
        .filter(law_proposal::Column::VoteEnd.between(window_start, window_end))
        .filter(law_proposal::Column::ReminderSent.eq(false))
        .all(db).await?;

    for law in reminder_laws {
        ws.broadcast_to_all_users(
            "law_reminder",
            "Vote bientot clos",
            &format!("Le vote sur '{}' se termine dans 24h.", law.title),
        ).await;
        let mut active: law_proposal::ActiveModel = law.into();
        active.reminder_sent = Set(true);
        active.update(db).await?;
    }

    Ok(())
}
```

Similarly, `surveys::process_survey_tick` closes surveys whose `ends_at <= NOW()` and sets `status = 'closed'`.

### 4.4 Admin Auth Pattern

All admin endpoints follow the existing pattern:
```rust
let user_id_str = params.get("user_id").map(|s| s.as_str()).unwrap_or("");
if check_admin(user_id_str, &state).await.is_err() {
    return (StatusCode::FORBIDDEN, Json(json!({"error": "Acces refuse"}))).into_response();
}
```

Public endpoints (`GET /laws`, `GET /surveys`, `GET /laws/active`, `GET /surveys/active`) require only valid JWT (use `extract_user_id_from_token` or equivalent existing auth extractor).

Vote and respond endpoints require authenticated user (extract UUID from JWT), reject banned users.

### 4.5 Entity Files to Create

```
backend/src/entities/law_proposal.rs
backend/src/entities/law_vote.rs
backend/src/entities/law_effect.rs
backend/src/entities/survey.rs
backend/src/entities/survey_response.rs
```

Register all five in `backend/src/entities/mod.rs` and `backend/src/entities/prelude.rs` following the exact pattern of existing entities.

The JSONB columns (`effects`, `options`, `answer`) map to `sea_orm::prelude::Json` (which is `serde_json::Value`).

```rust
// law_proposal.rs — field example
pub effects: Json,   // sea_orm::prelude::Json = serde_json::Value
```

---

## 5. Frontend Component Architecture

### 5.1 New Route: `/politics`

Add a top-level route in the React router. This becomes a new tab in `Sidebar.tsx`.

```
/politics              → PoliticsHub.tsx (container with tab navigation)
/politics/laws         → LawsView.tsx
/politics/laws/:id     → LawDetail.tsx
/politics/surveys      → SurveysView.tsx
/politics/surveys/:id  → SurveyDetail.tsx
```

### 5.2 File Structure

```
frontend/src/components/
  PoliticsHub.tsx          — container with "Lois" / "Sondages" tabs
  LawsView.tsx             — active voting + archive
  LawDetail.tsx            — full law page with vote form and results
  SurveysView.tsx          — active surveys + archive
  SurveyDetail.tsx         — full survey page with response form and charts
  ActiveLawsBanner.tsx     — compact widget showing currently active laws (used in EmpireBar)
  AdminLawForm.tsx         — admin-only create/edit law form
  AdminSurveyForm.tsx      — admin-only create/edit survey form
```

### 5.3 PoliticsHub.tsx

Simple tab container. Uses existing `Card`, `Button` from `@/components/ui`. Shows a badge on the "Lois" tab if there is a law currently in `voting` status. Shows a badge on "Sondages" if a survey is active.

```tsx
const tabs = [
  { id: 'laws',    label: 'Lois Galactiques',  icon: <Gavel /> },
  { id: 'surveys', label: 'Sondages',           icon: <BarChart2 /> },
];
```

### 5.4 LawsView.tsx

Three panels stacked vertically:

**Panel 1: Loi en cours de vote** (only if status=voting exists)
- Title, description, time remaining (use existing `formatTimeUntil` from `frontend/src/lib/utils.ts`)
- Vote bar: blue=FOR, red=AGAINST, with percentage labels and raw counts
- Two large buttons: "VOTER POUR" (green) / "VOTER CONTRE" (red)
- After voting: buttons replaced with "Vous avez vote: POUR/CONTRE", buttons disabled
- Shows effects in a styled table: "Si adoptee: production ×1.5 pendant 48h"

**Panel 2: Lois actives** (status=passed with unexpired effects)
- Compact list of active laws with a progress bar showing time remaining on effects
- Each row: law title, list of active effects with expiry countdown, "Voir detail" link

**Panel 3: Archives**
- Table: title, dates, result (ADOPTEE badge green / REJETEE badge red), participation rate, "Voir" link
- Paginated, 10 per page

### 5.5 LawDetail.tsx

Full-page view for a single law. Components:
- Header: title, description, admin avatar, creation date
- Status badge (VOTE EN COURS + countdown / ADOPTEE / REJETEE / EXPIREE)
- Effects panel: styled cards per effect, showing key + operation + value + duration
- Vote breakdown: large donut chart (use Recharts, already in the project for `Dashboard.tsx`) OR simple progress bars for zero-dependency. Use progress bars first, chart is optional enhancement.
- Participation rate: "X joueurs ont vote sur Y eligibles (Z%)"
- If voting and not yet voted: the two vote buttons
- If voted or closed: show user's own vote highlighted

### 5.6 SurveysView.tsx

Two panels:

**Panel 1: Sondages actifs**
- Card per active survey: title, description, question type icon, time remaining
- "Repondre" button → navigates to SurveyDetail

**Panel 2: Archives**
- Table: title, closed date, type, response count, "Voir resultats" link

### 5.7 SurveyDetail.tsx

Logic state machine:
1. If survey is active AND user has not responded: show response form
2. If survey is active AND user has responded: show results + user's answer highlighted
3. If survey is closed: show results unconditionally

**Response forms by type**:

`yes_no`:
```tsx
<div className="flex gap-4">
  <Button onClick={() => submit({answer: "yes"})}>Oui</Button>
  <Button onClick={() => submit({answer: "no"})}>Non</Button>
</div>
```

`multiple_choice`:
```tsx
{options.map(opt => (
  <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
    <input type="radio" name="answer" value={opt.id} />
    <span>{opt.label}</span>
  </label>
))}
<Button onClick={submit}>Valider</Button>
```

`rating`:
```tsx
// 5 star buttons, click selects value 1-5
{[1,2,3,4,5].map(n => (
  <button key={n} onClick={() => setRating(n)}
    className={rating >= n ? "text-yellow-400" : "text-slate-600"}>
    <Star size={32} fill={rating >= n ? "currentColor" : "none"} />
  </button>
))}
<Button onClick={submit}>Valider</Button>
```

**Results display**:

`yes_no`: Two horizontal progress bars.
`multiple_choice`: Horizontal bar chart per option with label + % + count.
`rating`: Bar chart with 5 bars (1 through 5), average score displayed prominently.

All charts use CSS `width` style (`width: ${pct}%`) rather than Recharts to keep this component self-contained.

### 5.8 ActiveLawsBanner.tsx

Compact inline widget for `EmpireBar.tsx`. Placed after resource display.

```tsx
// Fetches GET /laws/active every 60s
// If empty: renders nothing
// If laws present:
<div className="flex items-center gap-2 px-3 py-1 bg-green-900/30 border border-green-500/40 rounded text-xs">
  <Gavel size={12} className="text-green-400" />
  <span className="text-green-300">{laws.length} loi(s) active(s)</span>
  <Link to="/politics" className="text-green-400 underline">Voir</Link>
</div>
```

### 5.9 Admin Panel Integration

In `AdminPanel.tsx`, add two new tabs to the existing tab navigation: "Lois" and "Sondages". Each renders `AdminLawForm` or `AdminSurveyForm` plus a management table.

**AdminLawForm.tsx fields**:
- Title (text input)
- Description (textarea)
- Vote duration (number input, hours, default 72)
- Effects builder: a dynamic list, each row has:
  - Config key (select from pre-approved list)
  - Operation (select: multiply/add/set)
  - Value (number input)
  - Duration hours (number input, optional, hint: "vide = permanent")
  - [Remove] button
- [+ Ajouter un effet] button
- [Creer le vote] submit button

**AdminSurveyForm.tsx fields**:
- Title, description, duration hours
- Question type (radio: Oui/Non / Choix multiple / Note 1-5)
- If multiple choice: dynamic list of option labels (2-5 options enforced)
- [Lancer le sondage] submit

### 5.10 WebSocket Integration

In `useWebSocket.ts`, add handlers for the new events:

```typescript
case 'law_update':
  // Invalidate the laws query cache, show toast
  queryClient.invalidateQueries({ queryKey: ['laws'] });
  toast.info(payload.title);
  break;

case 'active_laws_changed':
  queryClient.invalidateQueries({ queryKey: ['laws', 'active'] });
  break;

case 'survey_closed':
  queryClient.invalidateQueries({ queryKey: ['surveys'] });
  break;
```

This assumes React Query (`@tanstack/react-query`) is used. If not (check `package.json`), use a `CustomEvent` dispatch pattern identical to the existing `new-notification` event.

---

## 6. Announcement Auto-trigger Flow

### 6.1 Auto-insert Function

Add a helper in `laws.rs` (reusable from `surveys.rs`):

```rust
pub async fn create_system_announcement(
    db: &DatabaseConnection,
    title: &str,
    content: &str,
    announcement_type: &str,  // "info" | "warning" | "success"
    source_type: &str,        // "law" | "survey" | "event"
    source_id: Option<Uuid>,
    expires_at: Option<NaiveDateTime>,
) -> Result<(), sea_orm::DbErr> {
    use crate::entities::announcement;
    let now = Utc::now().naive_utc();
    // NOTE: This uses raw SQL for the new columns (source_type, source_id, expires_at)
    // until the entity file is regenerated post-migration.
    sea_orm::Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Postgres,
        r#"INSERT INTO announcements (title, content, type, is_active, source_type, source_id, expires_at, created_at, updated_at)
           VALUES ($1, $2, $3, true, $4, $5, $6, $7, $7)"#,
        vec![
            title.into(), content.into(), announcement_type.into(),
            source_type.into(),
            source_id.map(|id| id.to_string()).unwrap_or_default().into(),
            expires_at.into(),
            now.into(),
        ],
    );
    Ok(())
}
```

### 6.2 Trigger Matrix

| Event | Announcement created | WS broadcast | Notification |
|---|---|---|---|
| Admin creates law | "Vote ouvert: [title]" (info) | `broadcast_to_all_users` | All users |
| Law vote reminder (24h left) | No (avoid spam) | No | All users |
| Law passes | "Loi adoptee: [title]" (success) | `broadcast_to_all_users` | All users |
| Law fails | "Loi rejetee: [title]" (info) | No WS (low urgency) | No notification |
| Law effects expire | Update announcement is_active=false | `ActiveLawsChanged` | No |
| Admin creates survey | "Sondage: [title]" (info) | `broadcast_to_all_users` | All users |
| Survey closes | "Sondage clos: [title]" (info) | `SurveyClosed` | No notification |
| Admin manual broadcast | Insert announcement | `broadcast_to_all_users` | All users |

The `AnnouncementBanner.tsx` already polls `/announcements/active` — with the new `expires_at` filter on the backend, expired announcements auto-disappear from the banner. No frontend change needed for that behavior.

---

## 7. Migration Registration

Add to `migration/src/lib.rs`:

```rust
mod m20260314_000001_create_law_system;
mod m20260314_000002_create_survey_system;
mod m20260314_000003_augment_announcements;
```

And in the `migrations()` vector (append at end):
```rust
Box::new(m20260314_000001_create_law_system::Migration),
Box::new(m20260314_000002_create_survey_system::Migration),
Box::new(m20260314_000003_augment_announcements::Migration),
```

---

## 8. Balancing and Game Design Notes

### 8.1 Anti-abuse Rules

**Vote manipulation prevention**:
- One account, one vote. The UNIQUE constraint on `(law_id, user_id)` is the primary enforcement.
- Consider requiring account age >= 7 days to vote (add `WHERE created_at < law.vote_start - INTERVAL '7 days'` to the eligible voter query). This prevents the admin from creating throwaway accounts to push laws through.
- Admin cannot vote on their own laws (check `created_by != voter_id` in the vote handler).

**Law spam prevention**:
- Limit: at most 1 law in `voting` status at a time. Return HTTP 409 if admin tries to create a second concurrent vote.
- Minimum vote duration: 24 hours. Enforce in the POST handler.
- Maximum effects per law: 3. Enforce in the POST handler.

**Effect value caps** (enforce server-side, not just in UI):
```rust
match effect.config_key.as_str() {
    "production_speed_multiplier" => assert!(effect.value <= 3.0),
    "building_speed_multiplier"   => assert!(effect.value <= 5.0),
    "expedition_syndicate_credit_chance" => assert!(effect.value <= 0.9),
    _ => return Err("Config key not in allowlist"),
}
```

### 8.2 Psychological Design

**Why visible vote counts during voting**: Seeing that 60% already voted FOR creates social proof pressure. This is intentional. It mirrors real democratic psychology and drives engagement. The alternative (hidden until close) would be more neutral but less engaging.

**Why surveys show results only after voting**: The "wall" before seeing results is the primary motivation to respond. Once you've voted, you're invested in seeing where you stand relative to others. This is the standard pattern in every consumer survey app for a reason — it works.

**Why laws should be biased toward passing**: Design effects to be positive (boosts, not nerfs). Players are more likely to vote FOR a production boost than AGAINST it. This means laws will generally pass and players will feel like they have agency over the game's pace. The key balance lever is the `duration_hours` of effects — short enough that the server economy doesn't permanently shift, long enough that players feel the impact.

**Law frequency recommendation**: At most 2-3 laws per month in the early game. One per week maximum. If you fire a new vote every 3 days, players develop fatigue and participation drops below 10%, which makes the democratic premise feel hollow.

---

## 9. Implementation Order

This is the recommended order for the engineering team to minimize blocked work:

1. **Migrations** (all three, in order) — unblocks everything else
2. **Entity files** (5 new entities) — unblocks backend handlers
3. **`broadcast_to_all_users`** in `websocket.rs` — unblocks notification flow
4. **`laws.rs`** (handlers + `process_law_tick`) + register in `lib.rs` + merge in `main.rs`
5. **`surveys.rs`** (handlers + `process_survey_tick`) + register + merge
6. **`create_system_announcement` helper** — connect to vote close + survey open events
7. **Tick integration** in `main.rs`
8. **Frontend: `LawsView.tsx` + `LawDetail.tsx`** — core voting UI
9. **Frontend: `SurveysView.tsx` + `SurveyDetail.tsx`** — survey UI
10. **Frontend: `PoliticsHub.tsx`** + add route to router + add sidebar entry
11. **Frontend: `ActiveLawsBanner.tsx`** + integrate into `EmpireBar.tsx`
12. **Frontend: `AdminLawForm.tsx` + `AdminSurveyForm.tsx`** + add to `AdminPanel.tsx`
13. **WS event handlers** in `useWebSocket.ts`
14. **Update `AnnouncementBanner.tsx` backend query** to filter `expires_at`

---

## 10. Open Questions for the Admin

Before implementation begins, the following decisions need to be made:

1. **Participation quorum**: Should a law require a minimum participation rate to pass (e.g., 20% of active players must vote)? Or is a simple majority of those who voted sufficient even if only 3 people vote?

2. **Permanent laws**: Should permanent law effects be allowed at all? A permanent `multiply` on production is extremely powerful. Recommend restricting permanent effects to `set` operations on binary flags only (e.g., enabling a feature), never on multiplicative scaling.

3. **Law effect stacking**: If two laws both add a production bonus, should they stack? The current design (write to `server_config` table, snapshot `base_value`) does allow stacking but with the revert-order problem described in section 2.3. Alternative: store effects as a separate additive layer and compute the effective config value on-the-fly. This is more robust but requires changing `ServerConfigCache::load_from_db` to join `law_effect`. Recommend the on-the-fly computation approach for production.

4. **Survey anonymity**: Are survey responses anonymous? The current design stores `user_id` on each response for anti-abuse (prevent duplicate responses). The results endpoint does not expose which user voted what, but an admin with DB access can see it. If full anonymity is required, hash the user_id with a per-survey salt before storing.

5. **Sidebar placement**: Should "Politics" be a top-level sidebar item, or nested under "Empire" or "News"? Given the engagement goal, top-level is recommended.
