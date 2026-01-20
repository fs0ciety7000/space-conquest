# 🚀 Expansion 2.0: Relational Tech Tree & Dynamic Combat System

## 🎯 Overview

Complete implementation of Expansion 2.0 featuring a fully relational tech tree system, dynamic database-driven combat mechanics, and 14 new technologies with hierarchical dependencies.

## ✨ Major Features

### 1. Relational Tech Tree System
- **14 Technologies** organized in 4 categories (Base, Advanced, Propulsion, Science)
- **Hierarchical dependencies** stored in `technology_requirement` table
- **Dynamic cost calculation**: `cost = base_cost × multiplier^level`
- **Visual tech tree** with ReactFlow showing real-time requirements

**Technologies Added:**
- **Base**: Energy, Laser, Espionage, Armour
- **Advanced**: Ion, Plasma, Shield, Weapons, Computer
- **Propulsion**: Combustion Drive, Impulse Drive, Hyperspace Drive
- **Science**: Astrophysics

### 2. Dynamic Combat System
- **Database-driven ship stats** (attack, shield, hull) from `ship_types` table
- **Rapid fire rules** from `rapid_fire_rules` table
- **Weighted damage calculation** based on fleet composition
- **Extensible to any ship type** without code changes

**Combat Features:**
```rust
pub async fn resolve_expedition_combat(db, player_ships: HashMap<String, i32>) -> CombatReport
```
- Loads ship stats dynamically
- Applies rapid fire multipliers
- Returns remaining ships as generic HashMap

### 3. Ship Construction System
- **7 Ship Types** with tech requirements
- **New ships**: Heavy Hunter, Battleship, Bomber, Destroyer
- Database validation of tech requirements before building

### 4. New API Endpoints

#### Research
- `POST /planets/:id/research/:tech_key` - Start technology research
- `GET /planets/:id/tech-tree` - Get tech tree with requirements

#### Ships
- `POST /planets/:id/build-ships/:ship_key/:quantity` - Build ships (relational)
- `GET /planets/:id/ship-types` - Get all buildable ships with requirements

#### Tech/Ship Info
- `GET /tech/:tech_key` - Get technology details
- `GET /ship/:ship_key` - Get ship type details

## 🗄️ Database Changes

### New Tables
1. `technologies` - Tech definitions (13 rows)
2. `technology_requirement` - Tech dependencies (11 rows)
3. `planet_technologies` - Planet-specific tech levels
4. `ship_types` - Ship definitions (7 rows)
5. `ship_requirement` - Ship tech requirements (16 rows)
6. `planet_ships` - Planet-specific ship counts
7. `rapid_fire_rules` - Combat rapid fire multipliers

### Migrations
- `m20260125_100001_create_tech_tree_tables.rs` - Schema creation
- `m20260125_100002_seed_tech_tree_data.rs` - Seed data (719 lines)
- `m20260125_100003_migrate_planet_data.rs` - Planet data migration

## 📊 Statistics

**Files Changed**: 23 files
- **Added**: 4,082 lines
- **Removed**: 365 lines
- **Net**: +3,717 lines

**Key Files:**
- `backend/src/tech_tree.rs` (NEW) - 379 lines of helper functions
- `backend/src/combat.rs` - Rewritten with dynamic stats (+200 lines)
- `backend/src/main.rs` - +581 lines (new endpoints + handlers)
- `frontend/src/components/TechTreeVisual.tsx` - Complete rewrite

## 🔧 Technical Highlights

### UUID Migration
Fixed type mismatches by migrating `planet_id` from `i32` to `Uuid` across all relational entities.

### Send Trait Fix
Resolved `RwLockReadGuard` Send trait issues by cloning config before await points:
```rust
let config = state.config.read().unwrap().clone();
// Now safe to use across await boundaries
```

### Rapid Fire System
```rust
// Example: Destroyer fires 5x against light hunters
let multiplier = rapid_fire_cache.get(&("destroyer", "light_hunter")) // Returns 5
let damage = base_attack * multiplier * target_proportion
```

## 🎮 Gameplay Impact

**Before**: 3 hardcoded ship types, no tech tree, fixed combat stats
**After**: 14 technologies, 7+ extensible ships, database-driven combat

**Example Flow:**
1. Research `laser_tech` (requires `energy_tech` level 3)
2. Build Heavy Hunters (requires `laser_tech` level 5)
3. Send on expedition with dynamic combat using DB stats
4. Rapid fire rules automatically applied based on fleet composition

## 🚀 Next Steps (Future PRs)

- [ ] Auto-completion system for research/building (tick system)
- [ ] PvP combat adaptation to use dynamic system
- [ ] Frontend UI for ship construction endpoint
- [ ] Additional technologies (Graviton, Hyperspace, etc.)
- [ ] Defense structures with tech requirements

## ⚠️ Known Issues

- `expedition_v2_handler` currently disabled (Axum handler trait issue - investigating)
- Solution will be in follow-up PR

## 🧪 Testing Checklist

**Manual Testing Required:**
- [ ] Start research via `POST /planets/:id/research/:tech_key`
- [ ] Build ships via `POST /planets/:id/build-ships/:ship_key/:quantity`
- [ ] Verify tech tree displays correctly in UI
- [ ] Check combat logs use dynamic ship names
- [ ] Verify rapid fire works (destroyers vs light hunters)
- [ ] Test requirement validation (can't build without tech)
- [ ] Test cost calculation (exponential growth)

## 📝 Commit History

1. `136fe62` - Add deep tech tree + 4 ships
2. `5b4331e` - Relational database structure
3. `cf48b86` - Tech tree module + endpoints
4. `8c87883` - UUID fixes + integration
5. `8ce540b` - Frontend tech tree visual
6. `ce31bee` - Dynamic combat + research
7. `275b5d9` - Fix build_ships_handler
8. `3469b4e` - WIP: Combat integration prep
9. `3da8990` - Combat helpers + expedition-v2

## 🎊 Technical Stack

- **Backend**: Rust + Axum + SeaORM
- **Database**: PostgreSQL with ACID compliance
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **Visualization**: ReactFlow for tech tree

---

**Branch**: `claude/add-game-combat-logic-8eaY6`
**Target**: `main`
**Type**: Major Feature
**Breaking Changes**: Database migrations required
