# Game Design — Sprint 3 Features M4-M16
# Specs, Review & Implementation Notes

Author: GameDesigner agent
Date: 2026-03-13
Status: Review of implemented features + specs for open slots (M6, M8, M9)

---

## Status Summary

| ID  | Feature                        | Impl Status | Notes                               |
|-----|--------------------------------|-------------|-------------------------------------|
| M1  | resource_boost +50% 24h        | DONE        | See review below                    |
| M2  | stealth (invisibility 6h)      | DONE        | No issues found                     |
| M3  | Expedition slots multi         | FIXED       | Missing `.min(4)` cap added         |
| M4  | Daily login reward (streak)    | DONE        | No issues found                     |
| M5  | Enriched ranking tables        | DONE        | No issues found                     |
| M6  | (unassigned)                   | OPEN        | See spec below                      |
| M7  | ACS Phase 1                    | PARTIAL     | Tick resolution not implemented     |
| M8  | (unassigned)                   | OPEN        | See spec below                      |
| M9  | (unassigned)                   | OPEN        | See spec below                      |
| M10 | Piracy mission                 | FIXED       | Fleet loss on failure now correct   |
| M11 | Attack cooldown 4h             | DONE        | Configurable via admin              |
| M12 | Soft-delete accounts           | DONE        | No issues found                     |
| M13 | Recycler cargo from DB         | DONE        | No issues found                     |
| M14 | Bomber +20% attack             | DONE        | Via migration                       |
| M15 | Heavy Hunter RF x6 vs Cruiser  | DONE        | Via migration                       |
| M16 | Enriched recycler modal        | DONE        | No issues found                     |

---

## Review: Implemented Mechanics

---

### M1 — resource_boost (+50% production 24h)

**Verdict: CORRECT — applies to ALL planets of the owning user.**

The multiplier function `get_resource_boost_multiplier(db, user_id)` is keyed by `user_id`,
not `planet_id`. Every planet's production tick reads this value via `p.owner_id`.
This means a single `resource_boost` item purchased by a user boosts all their planets
simultaneously for 24h. This is the intended scope.

No fix required.

---

### M3 — Expedition Slots Multi

**Verdict: BUG FIXED — missing `.min(4)` cap.**

Original code: `let max_expeditions = 1 + (computer_tech_level / 4);`

With Computer Tech level 20, this formula yielded 6 slots. The design cap is 4 slots max.

Fix applied in `backend/src/handlers/fleet.rs`:
```rust
let max_expeditions = (1 + (computer_tech_level / 4)).min(4);
```

Formula validation:
- Level 0-3: 1 slot (base)
- Level 4-7: 2 slots
- Level 8-11: 3 slots
- Level 12+: 4 slots (capped)

The BonusSummaryView frontend already used the correct formula `1 + Math.floor(computerTech / 4)`
but did not show the cap. Updated to display `Math.min(maxExpeditionSlots, 4)`.

---

### M10 — Piracy Mission (CRITICAL FIX)

**Verdict: BUG FIXED — failure now destroys entire fleet, not just 5 probes.**

**Original design intent**: "raid furtif pour voler des Crédits Syndicat. Echec = perte de la flotte."

**Original implementation**: On failure, only 5 spy_probes were deducted. This created a
zero-risk farming loop: a player with Espionage 15 vs a target with Computer 1 had 88% success
rate, and even on failure only lost 5 cheap probes (cost ~15k metal). The expected cost of one
piracy attempt was negligible regardless of fleet size.

**Fix applied in `backend/src/handlers/fleet.rs`**:

```
Before roll: snapshot the full fleet on the attacker planet via
  get_all_planet_ship_counts(db, attacker_planet_id)

On failure: iterate snapshot, call deduct_ships() for every ship type with count > 0.
  Response includes fleet_destroyed: HashMap<ship_key, count> for the battle report.
  Log entry: ships_lost = sum of all destroyed ships.
```

**Balance analysis post-fix**:

A player sending 100 Cruisers (cost ~2.7M metal equivalent) on a piracy op against a target
with Computer Tech 10 and their own Espionage 15:
- Success chance = 15 / (15 + 10) = 60%, clamped to [10%, 90%] = 60%
- Expected steal: 10-30% of target SC, capped at 100 SC
- Expected loss on failure (40% chance): 100 Cruisers = massive resource sink

This correctly creates the "fleet-save" tension from classic browser MMO design: the player must
decide whether to risk their battle fleet for a SC raid, or keep a dedicated low-cost spy fleet.
The mechanic now has meaningful stakes that scale with the fleet committed.

**Cooldown**: 4 hours per attacker-target pair. Still applied on both success and failure.
This prevents target harassment even if the attacker uses cheap expendable fleets.

**Success cap**: 100 SC per raid. This prevents compounding SC theft against passive players.
The PM must decide if this cap should scale (e.g., 50 + Espionage * 5) in a future sprint.

**Frontend gap (not implemented here — for Frontend Developer)**:
FleetDispatcher.tsx has no UI for piracy missions. The endpoint `POST /fleet/piracy` exists.
The UI should expose:
1. Mission type selector with "Piraterie" option
2. Target player search (by username or user_id)
3. Warning banner: "Echec = toute la flotte presente sur cette planete est detruite."
4. Display `success_chance` % before confirmation
5. On result: show `fleet_destroyed` HashMap if failure, or `credits_stolen` if success

---

### BonusSummaryView — Tech Effects Review

**Verdict: 3 issues found and fixed.**

**Fix 1 — Astrophysics colonies formula (BUG)**

Old frontend code: `Math.floor(astrophysics / 2)`
Backend formula: `min(astrophysics_level, 10)`
Fix: `Math.min(astrophysics, 10)` — corrected in `BonusSummaryView.tsx`

At Astrophysics 6, the old formula showed 3 colonies but the backend allowed 6. This mismatch
would confuse players who couldn't understand why the bonus summary showed fewer colonies than
they actually had.

**Fix 2 — Missing tech rows**

The following technologies existed in the DB but had no visible effect summary in BonusSummaryView:
- laser_tech: +10% attack per level (alternative to weapons_tech in expedition combat)
- plasma_tech: unlocks plasma turret defense and Bomber ship
- graviton_tech: unlocks gravitational systems
- computer_tech cargo bonus: +10% transporter capacity per level (backend: `cargo_transporter_bonus_per_computer_tech`)

All four now have BonusRow entries in the Research section.

**Fix 3 — Empty state condition**

The "Aucune technologie recherchee" guard only checked 6 techs. It now checks all 9 tracked
tech variables, preventing false positives where laser/plasma/graviton was researched but the
empty-state message still showed.

**Note on "Bonus Compte" vs per-planet techs**:

All technologies in this game are per-planet (stored in `planet_technologies` table, keyed by
`planet_id`). The BonusSummaryView correctly scopes everything to the active planet.
There is no global account-level tech in the current data model. If the PM ever introduces a
cross-planet tech (e.g., alliance bonuses), a separate "Bonus Compte" section would be
appropriate. For now, the section title "Recherches — [PlanetName]" is correct.

---

## Specs for Open Feature Slots

---

### M6 — Planetary Trade Agreements (Proposed)

**Context**: The trade_routes system (M7-adjacent) handles automated transports between owned
planets. M6 is unassigned. Proposed use: player-to-player resource exchange contracts.

**Description**: Two players negotiate a recurring trade agreement. Player A sends X Metal/hour
to Player B, who sends Y Crystal/hour back. The agreement auto-executes via the tick system.

**Formula / Algorithm**:
```
trade_agreement {
  initiator_user_id    UUID
  counterpart_user_id  UUID
  resource_a           enum(metal, crystal, deuterium)
  amount_a_per_hour    f64
  resource_b           enum(metal, crystal, deuterium)
  amount_b_per_hour    f64
  duration_hours       i32  (max 168 = 7 days)
  status               enum(pending, active, paused, expired, cancelled)
  next_execution       timestamp
}
```

Each tick (hourly): deduct `amount_a` from initiator homeworld, credit to counterpart; deduct
`amount_b` from counterpart homeworld, credit to initiator. If either party lacks sufficient
resources, the tick is skipped (not cancelled) and a notification is sent.

**Constraints**:
- Max 3 active agreements per player at any time (anti-spam)
- Minimum transfer: 100 units per resource per hour
- Agreement requires both parties to confirm (initiator proposes, counterpart accepts)
- Cancellation: either party can cancel with 2h notice window (no immediate cancel)
- The 2h notice prevents last-second resource grabs

**Unlock condition**: Research Lab level 5 on the initiating planet

**Balance impact**:
Enables specialization — a deuterium-rich outer-system player can trade fuel to inner-system
miners in exchange for metal. This creates interdependency without requiring combat. Potential
for resource concentration must be watched: cap at 3 agreements prevents monopoly chains.

**Risk / guard**: A colluding duo could cycle resources to inflate each other's economic score.
Mitigation: trade agreement transfers do not count toward production metrics used in scoring.

---

### M8 — Orbital Defense Platform (Proposed)

**Context**: The current defense system (rocket_launcher through large_shield) has no
persistent orbital layer — defenses are all surface-based and cannot be repositioned.
M8 is proposed as a deployable orbital platform that provides a defense bonus even when
a fleet is absent.

**Description**: Players build Orbital Defense Platforms (ODPs) at the Shipyard. Each ODP is
a static structure that orbits the planet and participates in defense combat like a ship.
ODPs cannot move and are permanently stationed at their build planet.

**Stats (base, configurable via admin)**:
```
orbital_defense_platform {
  ship_key:      "orbital_platform"
  attack:        200
  shield:        500
  hull:          3000
  cargo:         0
  fuel:          0   (does not move, consumes no deuterium)
  cost:          metal=80000, crystal=40000, deuterium=10000
  shipyard_req:  level 8
  energy_tech_req: level 6
}
```

**Combat role**: ODPs are counted in the defender's fleet during PvP combat resolution.
They participate in all 6 rounds. They are NOT classified as debris on destruction (no 30%
metal/crystal return) — they are permanent installations.

**Build constraint**: Max ODPs per planet = Solar Plant level. This ties the defense cap to
the energy infrastructure, creating a meaningful investment decision for Turtle players.
A Miner building Solar Plant level 10 can station up to 10 ODPs.

**Balance impact**: ODPs make defended planets significantly harder to raid without a large
fleet. The exponential solar plant cost (base × 1.5^(level-1)) means high-ODP planets require
significant energy investment. Raiders must bring enough firepower to overcome both ODPs and
surface defenses, increasing the cost of casual harassment.

**Anti-snowball**: ODPs cost deuterium to build, creating a meaningful resource sink for
Turtle-strategy players who otherwise accumulate excess deuterium from mining.

---

### M9 — Intelligence Report Tiers (Proposed)

**Context**: The spy_v2 mission returns a flat espionage report regardless of Espionage tech
level. The current implementation has the tech level in the formula for piracy but does not
affect the depth of information returned by spy missions.

**Description**: Espionage Tech level determines what information an attacker can extract from
a spy mission. Higher levels unlock more detailed intelligence about the target planet.

**Information tier table**:

| Espionage Level | Information Revealed                                      |
|-----------------|-----------------------------------------------------------|
| 1-3             | Resources on planet only (metal, crystal, deuterium)      |
| 4-6             | Resources + fleet composition (ship counts)               |
| 7-9             | Resources + fleet + defense composition                   |
| 10-12           | All above + technology levels                             |
| 13+             | All above + active black market items + piracy eligibility|

**Counter-espionage**: If target's Espionage Tech >= attacker's Espionage Tech, the spy probe
is destroyed before it transmits data (failed mission). If target's Espionage >= attacker's + 3,
the attacker also receives a "counter-espionage" notification with the attacker's username
(the target learns someone tried to spy them and by whom).

**Formula**:
```
base_success = true  (probe arrives unless shot down by counter-espionage)
counter_intercept = (target_espionage - attacker_espionage >= 3)
  -> if true: probe destroyed, target notified with attacker name
  -> if false: report generated at attacker's espionage tier
```

**Backend implementation notes**:
- `spy_v2_handler` currently returns full data regardless of espionage level
- Apply `espionage_tier = attacker_espionage_level / 3` (integer division, min 0, max 4)
- Mask fields in the JSON response based on tier (set to null / "Classifié")
- The counter-espionage intercept check should run before probe deduction

**Balance impact**: This creates a genuine progression incentive for Espionage Tech past level 3.
Currently there is no reason to research Espionage beyond what piracy requires (level 13 for
black market access). Tiered reports give Raiders a reason to invest in Espionage for tactical
advantage, and give Miners/Turtles a reason to invest in Espionage for counter-espionage.

**Unlock condition**: No additional unlock. The existing Espionage Tech is the gate.

**Risk**: Players may feel "punished" for low espionage by losing probes to counter-espionage.
Mitigation: the counter-intercept threshold (target >= attacker + 3) means a level 1 spy vs a
level 4 target is safe from counter-notification. Only aggressive delta (3+ levels) triggers it.

---

## Cross-Cutting Notes

### Tech "per-planet" vs "global account" confusion

All research in Space Conquest is per-planet. A player with Espionage 15 on their homeworld
has Espionage 0 on a newly colonized planet until they research it there.

This has gameplay implications that must be communicated clearly in the UI:
- When launching a piracy mission, the espionage level read is from `current_planet_id`
- When checking expedition slots, computer_tech is read from the expedition source planet
- Players should be warned in tooltips: "Les technologies sont spécifiques à chaque planète."

The BonusSummaryView header already says "Planète active: [name]" which is correct framing.

### ACS Phase 2 (M7 — still blocking)

ACS Phase 1 allows fleet coordination dispatch. Phase 2 (tick resolution of merged ACS combat)
is not implemented. This is a critical gap: players can create ACS groups but the combined
attack never resolves. The fleet missions sit in the DB indefinitely.

Recommended priority: implement `resolve_acs_mission()` in `tick_system.rs` before any new
fleet features. The combat engine already supports multi-fleet inputs (HashMap of ships).
The main work is: aggregate all ACS group fleet_missions into a single attacker fleet, run
`resolve_pvp_combat()`, distribute loot proportionally by contribution, send battle reports
to all participants.

### SC Cap on Piracy (design decision needed)

Current implementation: `credits_stolen = (target_sc * rand(10-30%)).min(100.0)`

The 100 SC cap prevents high-target raids from being too lucrative. However, it also means
that raiding a player with 1000 SC feels identical to raiding one with 500 SC (both capped
at 100). Consider: `cap = min(100 + attacker_espionage * 5, 300)` — this rewards high
Espionage investment with better piracy returns while maintaining a ceiling.

This is a PM/GD decision. The current cap is conservative and safe for launch.
