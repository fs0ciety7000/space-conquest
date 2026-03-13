# Space Conquest — Game Design Specifications M4 through M9

**Author**: GameDesigner
**Date**: 2026-03-13
**Status**: M4 (implemented), M5 (implemented), M6 (missing), M8 (partial), M9 (missing)

---

## Index

| ID  | Feature                                  | Status       |
|-----|------------------------------------------|--------------|
| M4  | Daily Rewards & Login Streak             | Implemented  |
| M5  | Extended Ranking System                  | Implemented  |
| M6  | Email Notifications (async alerts)       | Not started  |
| M7  | ACS — Allied Combat System               | Implemented  |
| M8  | Combat Constants in ServerConfig         | Partial      |
| M9  | Unit Test Coverage                       | Not started  |

---

## M4 — Daily Rewards & Login Streak

### Purpose

In a 24/7 persistent game, the daily reward loop is the primary hook that converts "casual lurker" into "daily active player". The player must have a reason to open the game every single day even if they have nothing urgent to do. A login streak with exponentially increasing rewards punishes breaks and rewards consistency — which is the psychological backbone of retention.

### Implemented Behaviour (reference for future engineers)

Entry point: `backend/src/missions.rs`, line ~778, `GET /rewards/daily` and `POST /rewards/daily/claim`.

- The server tracks `user.login_streak` (consecutive days) and `user.last_daily_claim` (timestamp).
- A claim is valid once per calendar day (UTC midnight boundary).
- If the player misses a day, the streak resets to 1.
- Rewards are in Syndicate Credits (SC), the premium soft currency earned in-game.

### Reward Formula

The current implementation is: `SC_reward = base + (streak_bonus * min(streak, 30))`.

**Game Designer note**: This linear scaling is acceptable for streaks up to 30 days but becomes flat after that. Recommend switching to a tiered model post-launch:

| Streak tier     | Day range | SC reward      | Notes                                    |
|-----------------|-----------|----------------|------------------------------------------|
| Recruit         | 1–6       | 2 SC/day       | Low floor — anyone can start             |
| Soldier         | 7–13      | 5 SC/day       | 7-day milestone triggers a bonus chest   |
| Veteran         | 14–20     | 8 SC/day       | Enough to afford 1 black market item/wk  |
| Commander       | 21–27     | 12 SC/day      |                                          |
| Grand Admiral   | 28+       | 15 SC/day flat | Capped at 15 SC to prevent infinite drip |

A 7-day streak bonus of +10 SC (one-time per week) prevents "streak fatigue" where day 8 feels identical to day 1.

### Constraints

- Claim window: 24 hours from last claim, NOT calendar day reset — avoids timezone abuse.
- Max streak reward: 15 SC/day. The SC economy must not be inflated by AFK login bots.
- Streak freeze mechanic (future): Allow the player to spend 5 SC to "freeze" a streak for 48 hours once per month. Prevents rage-quits from a missed day during vacation.

### SC Economy Balance

At 15 SC/day (30-day streak), a player earns 450 SC/month from login alone. Black market items should be priced in the 50–200 SC range. This means a dedicated daily player can purchase 2–9 items per month without raiding — keeping the economy healthy and ensuring free-to-play parity.

---

## M5 — Extended Ranking System

### Purpose

Ranking is the meta-game that gives the Macro Loop (weeks-scale) its meaning. Players do not mine resources to stockpile numbers — they do it to climb. Multi-dimensional rankings prevent the "winner locks in lead" problem by letting specialists (Miners, Raiders, Researchers, Explorers) each have a leaderboard to compete on.

### Implemented Leaderboards (reference)

All three endpoints live in `backend/src/handlers/ranking.rs`:

1. `GET /ranking/expeditions` — total loot returned from expeditions (M, C, D combined in metal-equivalent at 3:2:1)
2. `GET /ranking/research` — sum of all technology levels across all planets
3. `GET /ranking/hall-of-fame` — top eliminated players (most ships destroyed in combat)

### Missing Rankings (design proposals for future implementation)

#### Military Score Ranking (already tracked, not exposed as a separate endpoint)

The `user.military_score` field already exists. Formula is documented in MEMORY.md:
`(attack + shield/2 + hull/10) / 1000` per unit, summed over all ship types.

This ranking requires no backend work, only a new route that reads `users.military_score ORDER BY DESC`.

#### Economy Score Ranking

Also already tracked in `user.economy_score`. Expose as a route. This rewards long-term Miner builds.

#### Alliance Ranking

Alliance total score = sum of member economy + military scores. Requires `alliance` table read.
Not yet implemented. Engineering estimate: 1 day (one aggregation query, one new route).

### Anti-Snowball Design Notes

The hall-of-fame (ships destroyed) deliberately rewards aggression, not wealth. A small player who destroys a large fleet in a defensive engagement can score highly. This is intentional: the #1 player in overall score should NOT automatically be #1 in the hall of fame. Diverse top-10 lists reduce the "one guy wins everything" problem.

**Formula invariant**: Economy score should never be convertible directly to military score. Mining is not better than raiding — it is a different game being played in parallel. Ranking separation enforces this.

---

## M6 — Email Notifications (Asynchronous Alerts)

### Game Design Rationale

This is classified as infrastructure but has direct gameplay consequences. In a persistent game, the single biggest quit trigger is: "I was attacked while offline and didn't know." If a player discovers 12 hours of mining output was stolen only when they logged back in, they churn. Email notifications create an asynchronous awareness loop that keeps offline players engaged without requiring real-time attention.

### What Must Be Notified

Rank these by player psychological impact (highest to lowest):

| Priority | Event                          | Subject line template                              |
|----------|--------------------------------|----------------------------------------------------|
| 1        | Incoming attack detected (spy) | "[Space Conquest] ALERTE : Flotte hostile en route vers [Planet]" |
| 2        | Planet attacked (post-combat)  | "[Space Conquest] Combat resolu sur [Planet] — Rapport disponible" |
| 3        | Construction completed         | "[Space Conquest] [Building] niveau [N] termine sur [Planet]"      |
| 4        | Research completed             | "[Space Conquest] Recherche [Tech] niveau [N] terminee"            |
| 5        | Piracy attempt received        | "[Space Conquest] Tentative de piratage Syndicat detecee"          |
| 6        | Daily reward available         | "[Space Conquest] Recompense journaliere disponible"               |
| 7        | Server event announced         | "[Space Conquest] Evenement serveur : [EventName]"                 |

**Do not notify**: resource accumulation milestones, alliance chat messages, or ranking changes — these are information, not urgency triggers.

### Anti-Spam Rules

- Maximum 1 email per event type per planet per 4 hours. If 3 fleets hit the same planet within an hour, send 1 combined email not 3.
- The "incoming attack" notification must fire the moment the spy probe reports the fleet, NOT at the combat resolution moment — the point is to give the player time to react (fleet save / resource hiding).
- Players must be able to disable notification categories independently via account settings.
- Email must never expose the attacker's planet coordinates in the subject line — too exploitable. The body can show coordinates after the attack resolves.

### Infrastructure Requirements

The email system (`lettre 0.11`, SMTP via STARTTLS) is already configured for password reset emails. Variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `FRONTEND_URL` are already in the environment.

The missing piece is an `email_notification_preference` table:

```sql
CREATE TABLE email_notification_preference (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    attack_incoming BOOLEAN NOT NULL DEFAULT true,
    attack_resolved BOOLEAN NOT NULL DEFAULT true,
    build_complete  BOOLEAN NOT NULL DEFAULT true,
    research_done   BOOLEAN NOT NULL DEFAULT true,
    piracy          BOOLEAN NOT NULL DEFAULT true,
    daily_reward    BOOLEAN NOT NULL DEFAULT false,
    server_event    BOOLEAN NOT NULL DEFAULT true,
    last_sent_at    JSONB NOT NULL DEFAULT '{}'  -- map of event_type -> last_sent_timestamp for dedup
);
```

And a `send_email_notification(db, user_id, event_type, subject, body_html)` async helper that:
1. Reads the user's email + preference row.
2. Checks `last_sent_at[event_type]` to enforce the 4-hour dedup window.
3. Sends via lettre, updates `last_sent_at`.

### Tone and Content

Email content must feel urgent and thematic, not like a SaaS product alert.

Example attack alert body:
```
Commandant,

Nos capteurs de longue portee ont detecte une flotte hostile en approche de [Planet Name].
Temps d'impact estime : [ETA].

Composition de la flotte ennemie : INCONNUE (espionnage insuffisant) / [ships list if spied].

Mesures recommandees :
- Sauvegarder votre flotte (envoyez-la en mission de transport ou expedition)
- Cacher vos ressources (construire, ou envoyer en transport vers une autre planete)

Acceder au jeu : [Frontend URL]

-- Centre de commandement Space Conquest
```

---

## M8 — Combat Constants in ServerConfig

### Game Design Rationale

Hardcoded combat values are a game designer's prison. When balance is off — and it will be off — the only fix is a code change, a compile (8+ minutes for this codebase), and a redeployment. This is incompatible with live service balancing. The admin panel must be the single source of truth for all tunable values.

### What Must Move to ServerConfig

All of these are currently hardcoded in `backend/src/combat.rs` or `backend/src/game_logic.rs`:

| Constant                   | Current value | Config key                        | Notes                              |
|----------------------------|---------------|-----------------------------------|------------------------------------|
| Debris metal ratio         | 30%           | `combat_debris_metal_ratio`       | % of destroyed ship metal cost in field |
| Debris crystal ratio       | 30%           | `combat_debris_crystal_ratio`     | Same for crystal                   |
| Loot percentage            | 50%           | `combat_loot_percentage`          | % of target resources pillaged     |
| Max rounds                 | 6             | `combat_max_rounds`               | Round count before draw            |
| Piracy cooldown hours      | 4             | `piracy_cooldown_hours`           | Cooldown between piracy on same target |
| Piracy min probes          | 5             | `piracy_min_probes`               | Probes required for piracy attempt |
| Piracy probes on success   | 1             | `piracy_probes_on_success`        | Probes burned on success           |
| Piracy probes on failure   | 5             | `piracy_probes_on_failure`        | Probes burned on failure           |
| Piracy steal pct min       | 10%           | `piracy_steal_pct_min`            | Min % of target SC stolen          |
| Piracy steal pct max       | 30%           | `piracy_steal_pct_max`            | Max % of target SC stolen          |
| Piracy steal cap SC        | 100           | `piracy_steal_cap_sc`             | Hard cap on SC stolen per mission  |

### Balance Implications of Each Constant

**Debris ratio (30%/30%)**: This is the economic incentive for the Recycler ship class. If set too low (< 15%), recycling is not worth the flight time. If set too high (> 50%), the economy becomes inflationary — resources cycle too fast and lose scarcity value. The 30/30 value mirrors OGame and is proven stable.

**Loot percentage (50%)**: The defining balance point of raiding vs. mining. At 50%, a raider can steal half the target's stockpile. Below 30%, raiding becomes economically unviable (fleet cost outweighs returns). Above 60%, defensive builds become useless and pure raiders dominate. 50% is the industry standard for this genre.

**Max rounds (6)**: Determines whether battles are decisive or attrition-based. At 6 rounds with simultaneous damage, most battles resolve within 3–4 rounds. Setting to 3 would make combat very decisive (favors offense). Setting to 10 would make large fleet battles very long and favor turtles (defenders). Keep at 6.

**Piracy constants**: See the M10 section below for the full piracy balance analysis. These are the new constants that need to be extracted to ServerConfig now that the mechanic is solid.

### Migration Required

```sql
INSERT INTO server_config (key, value, description) VALUES
  ('combat_debris_metal_ratio',   0.30, 'Fraction of destroyed ship metal cost added to debris field'),
  ('combat_debris_crystal_ratio', 0.30, 'Fraction of destroyed ship crystal cost added to debris field'),
  ('combat_loot_percentage',      0.50, 'Fraction of target planet resources that can be looted'),
  ('combat_max_rounds',           6.0,  'Maximum combat rounds before draw'),
  ('piracy_cooldown_hours',       4.0,  'Hours between piracy attempts on the same target'),
  ('piracy_min_probes',           5.0,  'Spy probes required to launch a piracy mission'),
  ('piracy_probes_on_success',    1.0,  'Spy probes consumed on a successful piracy'),
  ('piracy_probes_on_failure',    5.0,  'Spy probes lost when piracy fails'),
  ('piracy_steal_pct_min',        0.10, 'Minimum fraction of target SC stolen on success'),
  ('piracy_steal_pct_max',        0.30, 'Maximum fraction of target SC stolen on success'),
  ('piracy_steal_cap_sc',        100.0, 'Hard cap on SC stolen per piracy mission')
ON CONFLICT (key) DO NOTHING;
```

---

## M9 — Unit Test Coverage

### Game Design Rationale

Unit tests are the game designer's insurance policy. Without them, every balance change is a gamble. When a combat formula is updated, a test should immediately confirm whether 100 Light Hunters vs 10 Cruisers still resolves as expected. When the piracy formula is tweaked, a test should verify that a target with 0 SC returns credits_stolen = 0, not a negative number.

Tests protect the game's mathematical contracts from engineering accidents.

### Priority Test Coverage

#### Combat Engine (already has some tests — extend)

Location: `backend/src/combat.rs` (existing test module)

New test cases to add:

| Test name                                    | Validates                                               |
|----------------------------------------------|---------------------------------------------------------|
| `test_piracy_cooldown_blocks_repeat`         | Second piracy within 4h returns cooldown error          |
| `test_piracy_success_burns_1_probe`          | After success: probe_count decremented by exactly 1     |
| `test_piracy_failure_burns_5_probes`         | After failure: probe_count decremented by exactly 5     |
| `test_piracy_zero_sc_target_no_negative`     | credits_stolen = 0.0 when target_sc = 0, never negative |
| `test_piracy_chance_clamp`                   | success_chance never < 0.10 or > 0.90                  |
| `test_combat_6_rounds_max`                   | Battle never exceeds 6 rounds                           |
| `test_simultaneous_damage`                   | Defender with 1 HP fires before dying (round resolution) |
| `test_tech_bonus_weapons_10pct_per_level`    | weapons_tech=3 → attack multiplier = 1.30               |
| `test_debris_30pct_metal_only`               | Debris field gets 30% of metal cost, 0% of hull points  |
| `test_loot_capped_by_cargo`                  | Stolen resources never exceed surviving attacker cargo   |

#### Game Logic

Location: `backend/src/game_logic.rs`

| Test name                                    | Validates                                               |
|----------------------------------------------|---------------------------------------------------------|
| `test_metal_mine_prod_level_1`               | 30 * 1 * 1.1^1 = 33.0 metal/h                          |
| `test_metal_mine_prod_level_20`              | Formula does not produce NaN or negative                |
| `test_building_cost_exponential`             | Cost at level N = base * 1.5^(N-1)                     |
| `test_storage_cap_applied`                   | Resources capped at 600000 * 1.6^storage_level          |
| `test_energy_ratio_100pct_no_penalty`        | Full energy → production multiplier = 1.0               |
| `test_energy_ratio_50pct_half_production`    | Half energy → production multiplier = 0.5               |

#### Expedition System

Location: `backend/src/handlers/fleet.rs` (expedition_v2)

| Test name                                    | Validates                                               |
|----------------------------------------------|---------------------------------------------------------|
| `test_expedition_rewards_proportional`       | Reward scales with pirate_str × value_per_cp            |
| `test_expedition_loss_mult_clamp`            | loss_mult is between 1.0 and 3.0                        |
| `test_expedition_sc_discovery_range`         | SC earned is in range [5, 23] for max-power fleet       |

### Test Execution Protocol

```bash
# Run all unit tests (no DB required for pure logic tests)
cargo test -p backend

# Run combat-specific tests only
cargo test -p backend combat

# Run the combat simulator for manual balance validation
cargo run --bin combat_sim -- --att "light_hunter=100" --def "cruiser=10"
cargo run --bin combat_sim -- --att "cruiser=20" --def "cruiser=10" --def-weapons 5
```

**Key rule**: All formula tests must run without a database connection. Use mock structs and hardcoded stats. Reserve DB-backed tests for integration tests only — the unit test suite must complete in under 5 seconds so engineers run it after every change.

---

## M10 — Piracy Balance Analysis (audit of existing implementation)

This section documents the balance review performed on 2026-03-13 as part of this game design audit.

### Previous Implementation — Problems Found

1. **No cooldown**: The piracy endpoint accepted unlimited requests per second. A player with Espionage 15 vs a target with Computer 1 had a 90% success rate (clamped ceiling). They could drain any target's SC to 0 in seconds.

2. **Probe cost on success = 0**: The mechanic required 3 probes to start but only destroyed them on failure. Success was cost-free. This made high-espionage players essentially immune to economic cost: they would almost always succeed and pay nothing.

3. **No success-branch probe consumption**: In real espionage operations, even successful infiltration destroys the operative. The probe must be consumed either way.

### Changes Made (2026-03-13)

| Parameter          | Before      | After      | Rationale                                    |
|--------------------|-------------|------------|----------------------------------------------|
| Min probes needed  | 3           | 5          | Higher floor raises meaningful resource cost |
| Probes on success  | 0           | 1          | Operative is always burned                   |
| Probes on failure  | 3           | 5          | Proportional to squad size; asymmetric cost  |
| Cooldown           | None        | 4h per target | Prevents single-target SC drain loops     |

### New Formula Analysis

**Cost analysis for a Raider build (Espionage 15, Computer target = 5):**
- Success chance: 15 / (15+5) = 75%, clamped to 75%
- Expected probes consumed per attempt: 0.75 × 1 + 0.25 × 5 = 2.0 probes/attempt
- With 4h cooldown, max 6 attempts per day per target
- Expected SC per day vs 1 target: 6 × 0.75 × avg(10-30%) × target_SC, cap 100/attempt
- Maximum SC/day from 1 target (target has 300 SC): 6 × 0.75 × 20% × 300 = 270 SC... but capped at 100/attempt → 6 × 0.75 × 100 = 450 SC/day maximum
- **Verdict**: This is too high for a single target. The 100 SC cap per attempt with 4h cooldown means max 6 × 0.75 × 100 = 450 SC/day from one target. A dedicated Raider with 10 targets could theoretically earn 4500 SC/day.

### Recommended Further Adjustments (backlog)

The 100 SC cap per attempt should be lowered to 30 SC once the game has enough SC-sinks to test the economy. As a first pass, the 4h cooldown + probe costs are the primary balancing levers. Pull the SC cap later once player behavior data exists.

Alternative lever: tie the steal cap to the attacker's espionage level rather than a flat 100:
`steal_cap = 5 * attacker_espionage` (at esp 15 → cap 75 SC; at esp 20 → cap 100 SC).

This creates a natural progression reward while preventing day-1 players from running maximal piracy.

---

*Document generated by GameDesigner — Space Conquest v8.x*
*Reference server formulas are authoritative over this document. When in conflict, trust `backend/src/game_logic.rs` and `backend/src/combat.rs`.*
