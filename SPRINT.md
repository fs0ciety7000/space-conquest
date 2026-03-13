# SPRINT.md — Space Conquest
**Dernière mise à jour:** 2026-03-13

---

## SPRINT 0 — Blockers absolus ✅ TERMINÉ

**Objectif:** Rendre le jeu non-exploitable avant tout déploiement.
**Durée:** 1 session
**Agents:** @backend-architect · @reality-checker

### Résumé des corrections

#### P0-1 — Auth & Autorisation (SEC-01/02/03/04/05, GAL-001/002/003/004, WS-10) ✅

| Fix | Fichier | Bug |
|-----|---------|-----|
| Suppression fallback `jwt-{uuid}` non signé | `auth.rs` | SEC-01 |
| Extracteur `AuthUser` créé, appliqué sur routes jeu | `auth.rs`, `main.rs` | SEC-03 |
| Handlers admin migré vers `AuthUser` (20+ handlers) | `admin.rs` | SEC-02 |
| Market/bounty : `user_id` depuis JWT, plus depuis body | `main.rs` | SEC-04, SEC-09 |
| Endpoint `/tick` protégé par `X-Tick-Secret` (env var) | `main.rs` | SEC-05 |
| Ownership check colonisation via JWT | `handlers/galaxy.rs` | GAL-004 |
| Ownership guard notifications (`user_id == auth.user_id`) | `notifications.rs` | WS-10 |
| Ownership checks upgrade/rename/cancel construction | `handlers/planets.rs` | GAL-001/002/003 |
| AuthUser + ownership sur 4 handlers build_queue | `build_queue.rs` | SEC-03 (gap) |
| AuthUser + ownership sur 4 handlers planet_market | `planet_market.rs` | SEC-04 (gap) |
| Commentaire erroné sur `extract_user_id_from_bearer` corrigé | `auth.rs` | doc debt |

#### P0-2 — Injections SQL (BQ-008, SEC-07/MKT-008, SEC-08) ✅

| Fix | Fichier | Bug |
|-----|---------|-----|
| INSERT build_queue paramétré via `Statement::from_sql_and_values` | `build_queue.rs` | BQ-008 |
| reorder_queue : `body.category` bindé + whitelist | `build_queue.rs` | BQ-008 |
| Toutes queries `format!()` planet_market paramétrées | `planet_market.rs` | SEC-07/MKT-008 |
| UPDATE `syndicate_credits` paramétré | `main.rs` | SEC-08 |

**DoD atteint:** `grep -r "execute_unprepared.*format!" backend/src/` → 0 résultat ✅

#### P0-3 — Exploits de duplication critiques (BAL-005, MKT-009, WS-09, BQ-001/003/004, BQ-005/006, ALI-003/004, WS-05) ✅

| Fix | Fichier | Bug |
|-----|---------|-----|
| `get_upgrade_cost_from_cache` retourne `Option<Cost>`, plus `Cost{0,0,0}` | `game_logic.rs` | BAL-005 |
| Validation `asking_price_* >= 0` (400 si négatif) | `planet_market.rs` | MKT-009 |
| `syndicate_credits` : `.unwrap_or(0.0)` remplace `.unwrap()` | `server_events.rs` | WS-09 |
| `record_contribution` : `INSERT ON CONFLICT DO UPDATE` atomique | `server_events.rs` | WS-05 |
| Lock AVANT fetch + déduction dans transaction | `build_queue.rs` | BQ-001, BQ-003 |
| DELETE + remboursement en transaction atomique | `build_queue.rs` | BQ-004 |
| Completion tick + DELETE en transaction par item | `tick_system.rs` | BQ-005, BQ-006 |
| Claim mission : `lock_exclusive()` + crédit + claimed en txn | `missions.rs` | ALI-003 |
| Daily reward : `lock_exclusive()` + crédit + streak en txn | `missions.rs` | ALI-004 |

---

### Validation Reality Checker — Sprint 0

**Round 1** → 3 critiques résiduels trouvés :
- Build queue handlers sans AuthUser
- Planet market handlers faisant confiance au `user_id` client
- SQL injection dans `reorder_queue_handler` via `body.category`

**Round 2** (après corrections) → **READY ✅**

```
Check 1 — AuthUser build_queue (4 handlers): PASS
Check 2 — SQL injection reorder corrigée: PASS
Check 3 — Planet market AuthUser (4 handlers): PASS
Check 4 — auth.rs commentaire: PASS
Check 5 — cargo check: PASS (0 erreur, 0 warning)
```

**Rating:** B- (auth solide, transactions correctes, quelques gaps en P0 découverts en round 2)
**Production Readiness:** READY pour Sprint 0

---

### ⚠️ Action requise avant déploiement

Configurer la variable d'environnement dans Coolify :
```
TICK_SECRET=<valeur secrète>
```
Sans cette variable, le fallback `"change-me-in-production"` est public dans le code source.

---

## SPRINT 1 — Stabilité critique ✅ TERMINÉ

**Objectif:** Zéro crash serveur, zéro perte de ressources sur instabilité DB.
**Agents:** @backend-architect · @reality-checker
**Reality Checker:** READY (B+) — 0 erreur, 0 warning compilation

### P1-1 — Transactions manquantes (économie) ✅

| Fix | Fichier | Bug |
|-----|---------|-----|
| Build vaisseaux/défenses: déduction + INSERT atomiques | `handlers/shipyard.rs` | BQ-002 |
| Achat planète: 5 SQL statements → 1 transaction | `planet_market.rs` | MKT-001 |
| Vente NPC: crédit + DELETE planète atomiques | `planet_market.rs` | MKT-002 |
| Route commerciale: UPDATE source + destination atomiques | `trade_routes.rs` | MKT-003 |
| Extorsion black market: déduction crédits en transaction | `black_market.rs` | MKT-005 |
| Recycleur: deduct_ships + fuel atomiques | `handlers/fleet.rs` | CMB-001 |
| Expédition: fuel propagé correctement dans transaction | `handlers/fleet.rs` | CMB-002 |
| Dissolution alliance: 3 DELETE en transaction unique | `alliance.rs` | ALI-006 |
| Transfert leadership: 3 UPDATE en transaction + unwrap supprimé | `alliance.rs` | ALI-007/008 |
| Recrutement officier: coût + INSERT atomiques | `officers.rs` | ALI-002 |

### P1-2 — Crash serveur & panique Tokio ✅

| Fix | Fichier | Bug |
|-----|---------|-----|
| Tick worker: boucle supervision + restart 5s sur panique | `main.rs` | WS-07 |
| `.unwrap()` Tokio tasks → `match`/`unwrap_or_else` | `websocket.rs` | WS-08 |
| `get_or_create_streak`: `.unwrap()` → `match` fallback | `missions.rs` | ALI-008 |
| `RwLock::read()` → `.unwrap_or_else(|e| e.into_inner())` | `build_queue.rs` | BQ-015 |
| `.await` ajouté sur 3 appels `broadcast_global()` | `server_events.rs` | WS-04 |
| `recv_task`/`send_task`/`update_task` abort mutuels à déco | `websocket.rs` | WS-03/12 |

### P1-3 — Lazy Evaluation `last_update` ✅

| Fix | Fichier | Bug |
|-----|---------|-----|
| `apply_lazy_eval` persiste `last_update` dans transaction | `handlers/shipyard.rs` | BQ-012 |
| Cancel construction: `last_update = NOW()` au remboursement | `handlers/planets.rs` | RES-004 |
| Transport: `last_update` + cap de stockage ajoutés | `handlers/planets.rs` | RES-005 |
| `elapsed.max(0)` avant cast `f64` (3 occurrences) | `game_logic.rs` | RES-003 |
| `plasma_tech_level` fetché depuis DB (était hardcodé à 0) | `handlers/planets.rs` | RES-008 |

### Non corrigés (raison)
- **ALI-001** (tech prereqs hors txn): risque théorique faible, prérequis changent rarement
- **RES-009**: déjà géré correctement dans le code existant
- **CMB-003** (ACS join): déjà dans une transaction complète

---

## SPRINT 2 — Formules & Combat ✅ TERMINÉ

**Objectif:** Formules server-side, combat fonctionnel, frontend propre.
**Agents:** @backend-architect · @game-designer · @frontend-developer · @reality-checker
**Reality Checker:** READY (B) — 0 erreur backend, build frontend clean

### P2-1 Backend — Exposer données calculées ✅

| Fix | Fichier | Bug |
|-----|---------|-----|
| `GET /planets/:id` → `metal/crystal/deuterium_per_second` + `storage_capacity_*` | `handlers/planets.rs` | BAL-001/FE-03 |
| Building types → `next_level_cost_*` | `tech_tree.rs` | UI-01/FE-02 |
| Tech tree → `next_level_cost_*` | `tech_tree.rs` | FE-02 |
| Nouveau endpoint `GET /fleet/estimate` | `handlers/fleet.rs` | FE-01 |
| N+1 rapid fire: 1 query au lieu de 2N | `combat.rs` | CMB-005 |

### P2-1 Frontend — Supprimer formules dupliquées ✅

| Fix | Fichier | Bug |
|-----|---------|-----|
| `Math.max(serverVal, displayed)` supprimé, base = serverVal | `useRealtimeResources.ts` | BAL-002 |
| `metal_per_second` serveur comme base (fallback local uniquement) | `useRealtimeResources.ts` | BAL-001 |
| `energy_tech_bonus: 0.10` → `0.01` | `useRealtimeResources.ts` | BAL-003 |
| `safeConfig` mémoïsé (deps scalaires stables) | `useRealtimeResources.ts` | UI-06 |
| Coûts depuis `building.next_level_cost_*` serveur | `Facilities.tsx` | UI-01 |
| `calculateFlightTime()` local → appel `/fleet/estimate` (debounce 500ms) | `FleetDispatcher.tsx` | FE-01 |
| Guard `isSubmitting` sur tous les boutons d'action | `Facilities.tsx`, `Shipyard.tsx`, `ResourceDisplay.tsx`, `TechTreeVisual.tsx` | FE-05/06/UI-09 |
| `EmpireBar`: `React.memo` + `useMemo` groupement + storage cap serveur | `EmpireBar.tsx` | FE-11/16 |
| `setInterval` 1s conditionnel sur visibilité onglet | `PlanetOverview.tsx` | FE-14 |
| Revert optimiste sur `!res.ok` | `BuildQueueManager.tsx` | UI-04 |
| Offset horloge serveur depuis event WS `connected` | `BuildQueueManager.tsx` | UI-05 |

### P2-2 — Combat ✅ (BAL-011 et CMB-008 déjà corrects)

| Fix | Fichier | Bug |
|-----|---------|-----|
| N+1 rapid fire → HashMap pré-chargé | `combat.rs` | CMB-005 |
| loss_ratio clamp: déjà en place | `combat.rs` | CMB-008 ✓ |
| Tous ship types déjà dans le combat | `combat.rs` | BAL-011 ✓ |
| BAL-010 (hull-priority): différé (tests requis) | — | — |

### P2-3 — Équilibrage formules ✅

| Fix | Formule | Bug |
|-----|---------|-----|
| `BUILD_RATE = 2500.0` → `(cost/2500)*3600` (vraie conversion h→s) | `game_logic.rs` | BAL-016 |
| `mine_production()` fonction unique, 4 duplications supprimées | `game_logic.rs` | BAL-019 |
| Coûts slots: `3^(slot-1)` (slot 4 = ×27 au lieu de ×4) | `game_logic.rs` | BAL-006 |
| Temps de vol: `35*sqrt(dist)+30` (courbe continue, zéro falaise) | `game_logic.rs` | BAL-008 |
| Distance circulaire: `min(diff, N-diff)` (wrap-around 9 galaxies) | `game_logic.rs` | BAL-009 |
| Consommation deutérium flottes: déjà implémentée | `handlers/fleet.rs` | BAL-017 ✓ |

---

## SPRINT 3 — À venir

**Objectif:** Performance & Polish.

### P3-1 — Élimination N+1 queries
### P3-2 — Tick Event-Driven
### P3-3 — Frontend sécurité & performance

---

## Compteur de bugs

| Statut | CRITICAL | HIGH | MEDIUM | LOW | Total |
|--------|----------|------|--------|-----|-------|
| ✅ Corrigé Sprint 0 | 22 | 0 | 0 | 0 | 22 |
| ✅ Corrigé Sprint 1 | 15 | 0 | 0 | 0 | 15 |
| ✅ Corrigé Sprint 2 | 2 | 22 | 8 | 0 | 32 |
| 🔄 Restant | 3 | 40 | 38 | 12 | 93 |
| **Initial** | **42** | **62** | **46** | **12** | **162** |
