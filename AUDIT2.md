# Space Conquest — Audit Complet
> Généré le 2026-03-13 par Backend Architect + Game Designer + Frontend Developer + Senior PM

---

## Suivi d'implémentation — Sprint 1 & 2

> Dernière mise à jour : 2026-03-13

### Sprint 1 — Critique

| # | Tâche | Statut | Notes |
|---|---|---|---|
| C1 | Anti-farm `is_attack_allowed_by_points` dans `validate_attack` | ✅ Fait | `protection.rs` — config keys `anti_farm_enabled/min_ratio/max_ratio`, charge `total_points` depuis DB |
| C2 | Mission "deploy" / fleet save | ✅ Fait | Backend: `fleet.rs` — `POST /fleet/deploy` + `DELETE /fleet/missions/:id/recall` + résolution dans `planets.rs`. Frontend: onglet Déployer dans FleetDispatcher |
| C3 | Bonus officiers dans tick + combat | ✅ Fait | `officers.rs` — `OfficerBonuses` + `get_officer_bonuses()`. Appliqué dans `apply_lazy_eval` (production) et `resolve_attack_mission` (combat) |
| C4 | Corrections descriptions 6 techs mensongères | ✅ Fait | `TechTreeVisual.tsx`, `TechTree.tsx` — plasma, computer, laser, hyperspace, ion, graviton |
| C5 | Masquer 5 bâtiments fantômes (`is_available=false`) | ✅ Fait | Migration `m20260313_000002_disable_phantom_buildings` — nanite_factory, terraformer, alliance_depot, missile_silo |
| C6 | Mapping tech Shipyard (`weapons_tech` / `shield_tech`) | ✅ Fait | `Shipyard.tsx:99-100` — bonusAtk→weapons_tech, bonusShd→shield_tech |
| C7 | Débris dans GalaxyView + confirmation recyclage | ✅ Fait | `GalaxyView.tsx` — modal confirmation avec sélecteur nombre de recycleurs |
| C8 | Guard overflow i64 sur coût de flotte | ✅ Fait | `shipyard.rs` — cast i64 + guard `quantity > 100_000` |

### Sprint 2 — Haute Priorité

| # | Tâche | Statut | Notes |
|---|---|---|---|
| H1 | Score recalcul toutes les 5min (vs 2s) | ✅ Fait | `tick_system.rs` — `AtomicU64 TICK_COUNTER`, appel `update_all_user_points` si `tick % 150 == 0` |
| H2 | Coûts bâtiments data-driven | ✅ Fait | `BuildingCostCache` dans AppState. `get_upgrade_cost_from_cache()` remplace le match hardcodé. `building_types` table déjà peuplée, pas de migration nécessaire |
| H3 | Score militaire frontend | ❌ ANNULÉ | Formule frontend conservée intentionnellement |
| H4 | `laser_tech` + `hyperspace_tech` dans fleet v5 | ✅ Déjà en place | `laser_tech` +0.05 weapons/niveau dans `load_planet_tech_bonuses`. `hyperspace_tech` ×0.15/niveau dans tous les handlers |
| H5 | ETA de vol — formule correcte | ✅ Fait | `FleetDispatcher.tsx` — state `flightSpeedMultiplier` (défaut 5.0), clé `flight_speed_multiplier`, formule piecewise 3 branches exacte backend. `hyperspace_tech_level=0` en fallback (TODO prop) |
| H6 | Confirmation avant lancement d'attaque | ✅ Fait | `FleetDispatcher.tsx` — modal inline cible/vaisseaux/ETA |
| H7 | Marché Noir seuil réduit (Esp 8, Comp 6) | ✅ Fait | `black_market.rs` — `ESPIONAGE_REQ` 13→8, `COMPUTER_REQ` 10→6 |
| H8 | Fusion Plant en exponentielle | ✅ Fait | `game_logic.rs` — `calculate_fusion_energy()` : `base * level * 1.2^level` |
| H9 | Crystal mine facteur 1.6→1.5 | ✅ Fait | `game_logic.rs` — `get_upgrade_cost()` branche crystal : 1.6→1.5 |
| H10 | Astrophysics category_factor 2.5→1.8 | ✅ Fait | `game_logic.rs` — astrophysics dissocié de graviton_tech : 2.5→1.8 |
| H11 | `apply_storage_cap` dans lazy eval | ✅ Fait | `shipyard.rs` — `apply_lazy_eval()` applique le cap après chaque production update |
| H12 | Vue "Flottes en transit" avec ETA | ✅ Fait | `ActiveMissions.tsx` créé, intégré dans `PlanetOverview.tsx` |
| H13 | React.memo sur composants lourds | ✅ Fait | Shipyard, Defenses, Facilities, TechTree, ReportsTerminal + timer conditionnel TechTree |
| H14 | Rapid fire spy → lecture DB | ✅ Fait | `get_rapid_fire_from_cache()` dans `game_logic.rs`. `RapidFireCache` dans AppState chargé au démarrage. `resolve_pvp` accepte `Option<&RapidFireCache>` |
| H15 | Uniformiser hyperspace_tech (15% partout) | ✅ Fait | `trade_routes.rs` — `compute_travel_time_seconds()` : 0.10→0.15 |
| H16 | Base deuterium frontend (10→15) | ✅ N/A | Déjà correct dans tout le codebase |

---

## Reality Checker — Résultats (2026-03-13)

> Rating : **B-** | Production Readiness : **NEEDS WORK**

### Blocants (à corriger avant merge)

| # | Sévérité | Problème | Fichier |
|---|---|---|---|
| RC1 | ✅ Corrigé | `deploy_handler` : wrappé dans `db.transaction()` — validate + deduct + insert atomiques. `get_planet_ship_count` élargi à `&impl ConnectionTrait` | `fleet.rs:1884-1944` |
| RC2 | ✅ Corrigé | `attack_v2_handler` : deduct ships + update deuterium + insert mission dans une seule transaction | `fleet.rs:297-350` |
| RC3 | ✅ Corrigé | 3 missing `.await` sur `broadcast_global` dans `server_events.rs` (lignes 204, 228, 373) | `server_events.rs` |
| RC4 | ✅ Corrigé | Description `hyperspace_drive` : "+15% vitesse des flottes et routes commerciales par niveau" | `TechTreeVisual.tsx:137` |
| RC5 | ✅ Confirmé OK | `computer_tech` +10% cargo confirmé implémenté dans `get_transporter_capacity_with_tech` | `game_logic.rs:584` |
| RC6 | ✅ Corrigé | Guard deploy : picker de planètes (filtre currentPlanet), warning si planète unique | `FleetDispatcher.tsx:103-569` |
| RC7 | ✅ Corrigé | 144 warnings → 0 sur 28 fichiers. Imports inutilisés, variables mortes, shadowing supprimés | `backend/` |

### Points validés par Reality Checker
- C1 ✅ | C3 ✅ | C5 ✅ | C8 ✅ | H1 ✅ | H7 ✅ | H8 ✅ | H9 ✅ | H10 ✅ | H11 ✅
- C6 ✅ | C7 ✅ | H5 ✅ | H6 ✅ | H12 ✅ | H13 ✅

---

---

## Table des matières

1. [Sécurité — Critique](#1-sécurité--critique)
2. [Bugs Backend](#2-bugs-backend)
3. [Valeurs Hardcodées à Externaliser](#3-valeurs-hardcodées-à-externaliser)
4. [Fonctions pas Data-Driven](#4-fonctions-pas-data-driven)
5. [TODOs et Stubs Non Implémentés](#5-todos-et-stubs-non-implémentés)
6. [Incohérences entre Modules](#6-incohérences-entre-modules)
7. [Performance et Scalabilité](#7-performance-et-scalabilité)
8. [Frontend — Bugs et Incohérences](#8-frontend--bugs-et-incohérences)
9. [Frontend — UX Manquante](#9-frontend--ux-manquante)
10. [Frontend — Performance](#10-frontend--performance)
11. [Matrice de Complétude Features](#11-matrice-de-complétude-features)
12. [Équilibrage du Jeu](#12-équilibrage-du-jeu)
13. [Systèmes Manquants](#13-systèmes-manquants)
14. [Features Sympas à Implémenter](#14-features-sympas-à-implémenter)
15. [Rétention Joueur](#15-rétention-joueur)
16. [Recommandations Prioritisées](#16-recommandations-prioritisées)

---

## 1. Sécurité — Critique

### 1.1 JWT est un pseudo-token sans signature — BLOQUANT

`backend/src/auth.rs:106-108`

Le "JWT" est `format!("jwt-{}", user_id)`. Pas de signature cryptographique, pas d'expiration, pas de validation côté serveur. N'importe qui connaissant l'UUID d'un utilisateur peut forger un token valide et agir à sa place. Cette logique est dupliquée dans 7 fichiers : `main.rs`, `black_market.rs`, `governance.rs`, `auth.rs`, `sabotage.rs`, `economy_log.rs`, `market.rs`.

**Fix** : Implémenter HMAC-SHA256 (crate `jsonwebtoken`) avec expiration 24h.

### 1.2 WebSocket sans Authentification — BLOQUANT

`backend/src/websocket.rs:388`

```rust
// TODO: Valider le token JWT si fourni
```

N'importe qui avec un `planet_id` valide peut se connecter au WebSocket et recevoir : rapports de combat, alertes de sabotage, prix du marché souterrain, événements d'alliance.

### 1.3 Aucune validation de propriété sur les endpoints flotte et chantier

`backend/src/handlers/fleet.rs:183-189` (`attack_v2_handler`)

L'`attacker_planet_id` vient du query string sans vérification que l'utilisateur authentifié possède réellement cette planète. Idem pour `spy_v2_handler` (ligne 398), `recycle_handler` (ligne 718), `transport_handler` (ligne 832), et tous les handlers de `handlers/shipyard.rs`.

### 1.4 Injection SQL sur les champs texte libres

`backend/src/trade_routes.rs:349-362` (et ~12 occurrences dans ce fichier, ~15 dans `planet_market.rs`, ~4 dans `build_queue.rs`)

Le champ `name` des routes commerciales est string-interpolé dans des requêtes SQL via `execute_unprepared(&format!(...))`. Un simple `replace('\'', "''")` ne suffit pas. **Fix** : utiliser `Statement::from_sql_and_values` (requêtes paramétrées).

### 1.5 `user_id` depuis le body/query param non vérifié contre le JWT

`backend/src/trade_routes.rs:266` (`create_route_handler`) — `owner_id` vient du JSON body, pas du token JWT. `delete_route_handler` — `user_id` vient du query param. Un joueur peut créer des routes ou en supprimer au nom d'un autre.

### 1.6 Integer Overflow sur calcul de coût de flotte

`backend/src/handlers/shipyard.rs:658-660`

```rust
let total_cost_metal   = ship.cost_metal   * quantity;   // i32 * i32
let total_cost_crystal = ship.cost_crystal * quantity;   // overflow silencieux en release
```

Un destroyer à 60 000 métal × 36 000 quantité overflow silencieusement en mode release.

### 1.7 Rate Limiting partiel et contournable

Seules 3 routes protégées : auth (5/60s), attack (10/60s), build (10/10s). Les routes `sabotage`, `trade-routes`, `market`, `bounties`, `flagship` ne sont pas protégées. Le limiter est basé sur l'IP uniquement et ne persiste pas entre redémarrages (`DashMap` en mémoire, pas Redis). `config.rs` a un champ `redis_url` mais Redis n'est jamais utilisé.

---

## 2. Bugs Backend

### 2.1 Race Conditions — Transactions Manquantes (CRITIQUE)

Plusieurs flux critiques effectuent plusieurs écritures DB sans `db.transaction()` :

- **`attack_v2_handler`** (`fleet.rs:295-305`) : `deduct_ships` (N writes) puis déduction deutérium séparée.
- **`spy_v2_handler`** (`fleet.rs:469-478`) : même pattern.
- **`recycle_handler`** (`fleet.rs:772-778`) : même pattern.
- **`start_research_handler`** (`shipyard.rs:476-520`) : ressources déduites, puis `planet_technology` insérée/updatée séparément.
- **`build_ships_handler`** (`shipyard.rs:569`) : le mutex Tokio `acquire_planet_build_lock_pub` protège en mémoire mais pas contre un crash ou multi-instances.
- **`buy_item_handler`** (`black_market.rs:284-316`) : crédits débités, puis inventaire mis à jour séparément.

Un crash serveur entre deux writes crée des états incohérents (ressources perdues sans construction démarrée, crédits perdus sans item livré).

### 2.2 GET `/planets/:id` déclenche des writes en DB

`backend/src/handlers/planets.rs:523-572`

`GET /planets/:id` résout les missions d'attaque et crédite des ressources. Les GET doivent être idempotents. Deux requêtes GET concurrentes peuvent traiter la même mission deux fois.

### 2.3 `flagship_xp_for_level` peut boucler indéfiniment

`backend/src/handlers/fleet.rs:150-158`

```rust
loop {
    let xp_needed = flagship_xp_for_level(new_level + 1);
    if new_xp >= xp_needed { new_xp -= xp_needed; new_level += 1; }
    else { break; }
}
```

Aucun niveau maximum. Si `xp_gain` est anormalement grand (bug), la boucle tourne O(sqrt(xp)) itérations sur le thread async.

### 2.4 Deux systèmes de complétion de recherche parallèles

`tick_system.rs` a `process_research_completion` (lit `planet_technologies.research_end_time`) ET `process_construction_queue_completion` (lit `construction_queue.end_time`). Les recherches peuvent atterrir dans les deux tables selon le chemin de code emprunté. Double-complétion ou saut de niveau possible.

### 2.5 Bonus de biome non appliqué dans `apply_lazy_eval`

`backend/src/handlers/planets.rs:280-290`

Le multiplicateur de biome est appliqué dans `get_planet_handler` mais pas dans `apply_lazy_eval` de `shipyard.rs`. Les ressources calculées avant une construction ne tiennent pas compte du biome. Divergence entre les valeurs affichées et les ressources réellement déduites.

### 2.6 Loot expédition avec ratios cristal/deutérium hardcodés

`backend/src/handlers/fleet.rs:1019-1023`

```rust
let crystal    = metal * 0.4;
let deuterium  = metal * 0.2;
```

Ces ratios ne viennent pas de `ServerConfigCache`.

### 2.7 Endpoint legacy `/attack` stocke les vaisseaux dans les colonnes ressources

`backend/src/main.rs:1700-1702`

```rust
metal:     Set(payload.hunters as f64),      // abuse du champ metal
crystal:   Set(payload.cruisers as f64),
deuterium: Set(payload.transporters as f64),
```

Le `resolve_attack_mission` doit gérer les deux formats. Fragile.

### 2.8 `unwrap()` en production qui panique le serveur

12+ occurrences de `.unwrap()` dans des chemins hot-path :
- `main.rs:1708`, `main.rs:2108`, `main.rs:2401-2402`, `main.rs:5313`
- `missions.rs:751`, `alliance.rs:571,768`

Un timeout DB ou erreur transitoire crash tout le processus Axum.

### 2.9 Mission "recycle" jamais résolue dans le tick

`CLAUDE_HANDOFF.md` (TODO explicite) : `tick_system.rs` ne traite pas les missions de type `"recycle"`. Les missions sont créées mais ne se résolvent jamais.

### 2.10 Conquête de planète irréversible sans guard

`backend/src/main.rs:844`

```rust
if loot_percentage >= 99.0 { /* conquête permanente */ }
```

Pas de confirmation côté joueur ni de période de grâce. Un bug de calcul peut transférer une planète définitivement.

---

## 3. Valeurs Hardcodées à Externaliser

### 3.1 Constantes de temps de construction/recherche

`backend/src/game_logic.rs:496-543` — valeurs critiques d'équilibrage nécessitant un recompile pour changer :

```rust
const BASE_TECH_TIME: f64      = 2400.0;
const TECH_EXPONENT: f64       = 1.50;
const LAB_REDUCTION: f64       = 0.07;
const MAX_REDUCTION: f64       = 0.55;
const BASE_TIME: f64           = 1800.0;
const EXPONENT: f64            = 1.40;
const REDUCTION_PER_LEVEL: f64 = 0.08;
```

### 3.2 Taux de build ships/defenses dupliqué en 3 endroits

- `game_logic.rs:551` → `const BUILD_RATE: f64 = 3600.0`
- `shipyard.rs:110` → `const SHIP_BUILD_RATE: f64 = 3600.0`
- `shipyard.rs:723` → `const SHIP_BUILD_RATE_QUEUE: f64 = 3600.0`
- `shipyard.rs:255` → `const DEFENSE_BUILD_RATE_DISP: f64 = 1800.0`

Un changement dans l'un ne se propage pas aux autres → divergence affichage / réalité.

### 3.3 Capacité cargo recycler dupliquée et bypassant la config

- `planets.rs:588` → `let capacity = m.recyclers_sent as f64 * 20000.0;` (hardcodé)
- `game_logic.rs:687` → `config.get_config("cargo_recycler", 20000.0)` (config-driven)

Un admin changeant `cargo_recycler` en DB ne verra pas l'effet dans `get_planet_handler`.

### 3.4 Seuil de conquête planétaire

`main.rs:844` → `if loot_percentage >= 99.0` — mécanisme de jeu majeur, devrait être `config.get_config("conquest_loot_threshold_pct", 99.0)`.

### 3.5 Seuils d'accès au Marché Noir

`black_market.rs:47-48`

```rust
const ESPIONAGE_REQ: i32 = 13;
const COMPUTER_REQ: i32  = 10;
```

### 3.6 Paramètres de combat des pirates en expédition

`combat.rs:239-251` — facteur de scaling (0.5 + rand * 0.6), rounds max (6), facteurs de force par type de vaisseau (0.6-0.7), tous hardcodés.

### 3.7 Constantes économiques du marché

`market.rs` — `NPC_BUY_MARGIN = 0.85`, `NPC_SELL_MARGIN = 1.18`, `MARKET_TAX_RATE = 0.02` hardcodés.

### 3.8 Ratio de débris (30%) et loot extorsion (20%)

`combat.rs` — ratio débris 30% métal + 30% cristal hardcodé.
`black_market.rs:666` — `let loot_percent = 0.20_f64; // TODO: adjust by defense ratio`

---

## 4. Fonctions pas Data-Driven

### 4.1 Coûts de bâtiments : deux systèmes incompatibles

`backend/src/game_logic.rs:364-490` — `get_upgrade_cost()` contient des coûts de base hardcodés pour chaque bâtiment dans un `match`. La table `building_type` en DB a des colonnes `base_cost_metal/crystal/deuterium` mais cette fonction les **ignore**.

Les technologies utilisent `tech_tree::calculate_tech_cost` (data-driven depuis DB). Les bâtiments utilisent le `match` hardcodé. Si un admin modifie les coûts en DB via AdminContentManager, les bâtiments ne reflètent pas le changement.

### 4.2 Rapid Fire : deux sources parallèles qui peuvent diverger

`game_logic.rs:793-799` — table statique hardcodée pour les menaces spy.
`combat.rs:95-115` — table DB `rapid_fire_rule` pour le combat réel.

Si un admin ajoute une règle RF en DB, l'évaluation de menace du spy ne la prend pas en compte.

### 4.3 Bonus de tech appliqués différemment selon le module

- Fleet handlers (`fleet.rs:312`) : `speed * (1.0 + hyperspace_level * 0.15)` → **15%/niveau**
- Trade routes (`trade_routes.rs:84`) : `1.0 + hyperspace_level * 0.10` → **10%/niveau**
- Frontend `Shipyard.tsx:99-100` : `laser_tech` booste l'attaque, `energy_tech` booste le bouclier — tous les deux **faux** selon le backend v5.

### 4.4 `is_ship_or_defense` whitelist incomplète dans tick_system

`tick_system.rs:221-225` — manquent `heavy_hunter`, `battleship`, `bomber`, `destroyer`, `light_laser`, `heavy_laser`, `gauss_cannon`, `ion_cannon`, `small_shield`, `large_shield`. Si ces unités passent par la `construction_queue` legacy, elles sont silencieusement ignorées.

### 4.5 Officiers : système complet sans effet sur le jeu

`officers.rs` — recrutement, level-up, et calcul de bonus implémentés. **Mais** aucun appel à un getter de bonus officier dans `tick_system.rs`, `combat.rs`, ou `game_logic.rs`. Les officiers sont des cosmétiques coûteux.

### 4.6 Cinq bâtiments construisables sans effet

| Bâtiment | Problème |
|---|---|
| `nanite_factory` | `get_build_time` ne lit jamais son niveau pour réduire les temps |
| `terraformer` | Aucune mécanique de "cases planète" dans le backend |
| `alliance_depot` | Aucun handler ne l'utilise |
| `missile_silo` | Aucun système de missiles interplanétaires |
| `fusion_plant` | Intégration partielle — certains chemins passent `fusion_level=0` |

Ces bâtiments apparaissent dans l'UI (AdminContentManager les liste en DB) mais investir dedans n'a aucun retour.

### 4.7 Technologies affichant de faux bonus

| Tech | Affiché en UI | Effet réel backend |
|---|---|---|
| `plasma_tech` | "+5% ATK/SHD/HULL en combat" | +1% production ressources/niveau |
| `computer_tech` | "+1 slot de flotte" | +10% cargo transporteurs/niveau |
| `laser_tech` | "+10% attaque vaisseaux" | Legacy seulement, jamais lu par `attack_v2` |
| `hyperspace_tech` | "+30% vitesse battleships" | Routes commerciales uniquement |
| `ion_tech` | "+20% dégâts ioniques" | Aucun effet, les "dégâts ioniques" n'existent pas |
| `graviton_tech` | (fallback générique) | Aucun effet, coût x2.5 |

---

## 5. TODOs et Stubs Non Implémentés

### 5.1 Shield absorption tracking absent

`combat.rs:602`
```rust
shields_absorbed: 0.0, // TODO: track shield absorption per round
```

### 5.2 DetailedCombatReport non affiché en frontend

`combat.rs:735-742` — `PvpCombatReport.details` est toujours populé serveur-side mais `ReportsTerminal` ne le consomme pas.

### 5.3 Tech levels non passés à `resolve_pvp_combat`

`main.rs:822`
```rust
None, // TODO: pass attacker tech levels for BonusSummary
```

`attacker_tech_levels` et `defender_tech_levels` sont toujours `None` → les bonus tech sont à 0 dans les rapports.

### 5.4 Alliance WebSocket sans notification

`alliance.rs:879`
```rust
// TODO: Notification WebSocket
```

Join/leave/kick ne déclenche pas de notification WS.

### 5.5 4 items du Marché Noir sans effet backend

`black_market.rs:431-438` — `resource_boost`, `stealth`, `coordinate_jam`, `eco_virus` tombent dans un bras générique qui retourne `"Effet activé..."` — **faux**. Aucun tick ne les traite.

### 5.6 `apply_storage_cap` jamais appelée dans tick et lazy eval

`game_logic.rs:592`
```rust
/// TODO: intégrer dans tick_system.rs + calculate_resources() callers
pub fn apply_storage_cap(...)
```

Les ressources peuvent s'accumuler au-delà du cap silencieusement.

### 5.7 Piracy mission — raider ne gagne rien

`check_piracy_interception` applique une perte à la cible mais ne crédite aucune ressource au raider. La mécanique est passive et incomplète.

### 5.8 Chat de la page maintenance non implémenté

`MaintenancePage.tsx:98`
```ts
// TODO: Send message to server via WebSocket or API
```

### 5.9 Débris non affichés dans GalaxyView

`handlers/galaxy.rs:509` — endpoint `get_system_debris_handler` existe. `GalaxyView.tsx` ne l'appelle pas. `RadialMenu` n'a pas d'option "Envoyer recycleurs" sur les champs de débris.

---

## 6. Incohérences entre Modules

### 6.1 N+1 Queries

| Endroit | Problème |
|---|---|
| `combat.rs:95-115` (`load_rapid_fire_cache`) | 2N queries pour N règles RF |
| `black_market.rs:373-387` (`get_inventory_handler`) | 1 SELECT par item d'inventaire |
| `planets.rs:206-236` (`get_planet_handler`) | 12+ queries pour 6 niveaux de bâtiments |
| `fleet.rs:1184-1198` | Charge toute la table `technologies` pour filtrer en Rust |
| `tick_system.rs:290-302` | O(N users × M queries) toutes les 2 secondes |

### 6.2 Score militaire frontend ≠ backend

`techTreeCompat.ts:344`
```ts
const unitScore = (atk, shd, hul) => atk/50 + shd/10 + hul/400;
```
MEMORY : `Score militaire v3.6 : (attack + shield/2 + hull/10) / 1000`

Formule totalement différente. Le classement calculé en backend est incohérent avec ce qu'affiche PlanetOverview.

### 6.3 Hyperspace tech : 15% dans fleet.rs, 10% dans trade_routes.rs

`fleet.rs:312` → `speed * (1.0 + level * 0.15)`
`trade_routes.rs:84` → `1.0 + level * 0.10`

### 6.4 Base deuterium mine : 15 backend, 10 frontend

`game_logic.rs` → `base=15`. `ResourceDisplay.tsx` → fallback `base=10`. Calculs de ROI faux côté client.

### 6.5 Recalcul de score toutes les 2 secondes pour tous les joueurs

`tick_system.rs:290-302` — `update_all_user_points` sur chaque tick (2s). À 1 000 joueurs : potentiellement 8 000+ requêtes/tick. **Déplacer vers un intervalle de 5 minutes minimum.**

---

## 7. Performance et Scalabilité

### 7.1 `ServerConfigCache` cloné à chaque handler

`state.config.read().unwrap()` appelé 3 fois séparément dans `attack_v2_handler`. Clone l'intégralité de la struct config à chaque invocation.

### 7.2 `process_due_trade_routes` sans transaction globale

`trade_routes.rs:573-631` — pour chaque route due, N SELECT + UPDATE séparés sans wrapping transactionnel. Avec beaucoup de routes actives et une DB lente → timeout ou état partiel.

### 7.3 Rate limiter mémoire — non persistant et non distribué

`DashMap<String, Vec<Instant>>` perdu à chaque restart. `redis_url` dans config mais Redis jamais utilisé.

---

## 8. Frontend — Bugs et Incohérences

### 8.1 Mapping tech incorrect dans Shipyard.tsx (critique)

`Shipyard.tsx:99-100`

```ts
const bonusAtk  = 1 + (getTechLevel(planet, 'laser_tech')  * 0.1);  // FAUX — doit être weapons_tech
const bonusShd  = 1 + (getTechLevel(planet, 'energy_tech') * 0.1);  // FAUX — doit être shield_tech
```

Les stats de vaisseaux affichées dans le chantier sont fausses pour tout joueur avec des techs avancées.

### 8.2 CombatSimulator.tsx — modèle v1 obsolète toujours accessible

`CombatSimulator.tsx:27-28`
```ts
const HUNTER_POWER = 50;
const CRUISER_POWER = 400;
```

Ne connaît que 2 types de vaisseaux, ignore toutes les défenses et tous les bonus tech. Importé via lazy load dans `App.tsx`.

### 8.3 AttackModal.tsx — composant v1 résiduel

```ts
const power = (hunters * 10) + (cruisers * 50);
```

Plus cohérent avec aucun système actuel. Résiduel dangereux.

### 8.4 ETA de vol ignore le speed_factor serveur

`FleetDispatcher.tsx:114`
```ts
const speedFactor = 500; // TODO: fetch from backend
```

Sur un serveur x10 ou x5, l'ETA affiché est faux d'un facteur 20-50.

### 8.5 TechTree.tsx — `getBonusInfo` vide pour 7 techs sur 11

`TechTree.tsx:47-55` — `plasma_tech`, `shield_tech`, `weapons_tech`, `armour_tech`, `hyperspace_tech`, `computer_tech`, `astrophysics`, `graviton_tech` affichent `"Bonus: -"`.

### 8.6 Race condition sur switch de planète dans useRealtimeResources

`useRealtimeResources.ts:116-120` — stale closure possible entre state et ref. Oscillation des ressources pendant 100-200ms au changement de planète.

### 8.7 `useUnitCosts` — clé incorrecte `missile_launcher`

`useUnitCosts.ts:16` — interface utilise `missile_launcher`, la DB utilise `rocket_launcher`.

### 8.8 Flagship non intégré dans les calculs de flotte affichés

`FlagshipView.tsx` affiche correctement les stats. `calculateFleetAttack/calculateFleetHull` dans `techTreeCompat.ts` n'incluent pas les bonus du flagship.

### 8.9 Defenses.tsx — re-fetch déclenché sur chaque changement de ressources

`Defenses.tsx:77` — dépend de `planet.metal_amount` et `planet.crystal_amount`. Potentiellement fréquent si planet devient un objet live re-créé souvent.

### 8.10 Texte statique "Intégrité 100%" dans Defenses

`Defenses.tsx:399-401` — texte fixe non lié à aucune donnée réelle.

### 8.11 Texte UI SC incohérent avec la config serveur

`UndergroundMarket.tsx:394`
```
Les crédits s'obtiennent aléatoirement lors des expéditions (1–2 SC par expédition, 50% de chances).
```
Ces valeurs sont configurables via `expedition_syndicate_credit_chance/min/max`. Si un admin les change, l'UI affiche des informations fausses.

### 8.12 Mission recycle absente du FleetDispatcher

`FleetDispatcher.tsx:28` — type `recycle` déclaré mais aucune branche dans `handleLaunch`. Le recyclage se fait via `GalaxyView.tsx` avec un nombre fixe de recycleurs (min(available, 50)) sans choix joueur.

### 8.13 Score militaire frontend ≠ backend

`techTreeCompat.ts:344` — formule frontend `atk/50 + shd/10 + hul/400` vs backend `(attack + shield/2 + hull/10) / 1000`.

---

## 9. Frontend — UX Manquante

### 9.1 Aucune confirmation avant lancement d'attaque militaire

`FleetDispatcher.tsx` — clic sur "ORDRE D'EXÉCUTION" sans dialogue de confirmation. Action irréversible.

### 9.2 Aucune vue "Flottes en transit"

Aucun composant n'affiche les missions actives (attaque en route, transport, expédition, recyclage) avec ETA en temps réel. Seul feedback : toast de confirmation au lancement.

### 9.3 Erreurs réseau silencieuses

`UndergroundMarket.tsx:122` — `} catch { // ignore }` — spinner infini si le backend est en erreur.
`FleetDispatcher.tsx:80-88` — toast générique sans retry ni état persistent.

### 9.4 BuildQueue sans barre de progression déterminée

`BuildQueue.tsx:28-29` — `startTime` non retourné par le backend → barre animée indéterminée.

### 9.5 Pas de confirmation pour recyclage et colonisation

`GalaxyView.tsx:183-210` — `handleRecycle` s'exécute immédiatement, envoie `Math.min(availableRecyclers, 50)` sans que le joueur puisse choisir le nombre ni confirmer.

---

## 10. Frontend — Performance

### 10.1 Re-renders à 100ms sur composants non mémoïsés

`useRealtimeResources.ts:214` — `setResources` 10×/seconde. Consommé dans `EmpireBar` ET `PlanetOverview` simultanément. Sans `React.memo`, tous leurs enfants se re-rendent à 10 Hz.

### 10.2 TechTree.tsx — setInterval à 1s même sans recherche active

`TechTree.tsx:76` — `setNow(new Date().getTime())` toutes les secondes force un re-render complet du TechTree même quand aucune recherche n'est en cours.

### 10.3 Polling non coordonné — jusqu'à 20 requêtes/min

| Composant | Intervalle | Route |
|---|---|---|
| App.tsx — fetchCredits | 30s | `/users/:id` |
| App.tsx — maintenanceStatus | 5s | `/maintenance` |
| App.tsx — messages/reports | 1-5s | `/messages` |
| App.tsx — fetchPlanet | 60s | `/planets/:id` |
| Marketplace | 5s | `/market/stats` |
| PlanetOverview | 10s | `/build-queue` |
| EmpireBar | 30s | `/online-count` |

Aucun de ces polling n'est coordonné ou conditionnel à la visibilité de l'onglet.

### 10.4 Pas de cache mutualisé entre composants

`useGameCatalog` a un cache module-level. Tous les autres hooks font leurs propres requêtes sans coordination. Pas de SWR/React Query.

### 10.5 Absence quasi-totale de React.memo sur composants lourds

`Shipyard`, `Defenses`, `Facilities`, `TechTree`, `ReportsTerminal` — aucun `React.memo`. Re-renders complets sur chaque poll.

---

## 11. Matrice de Complétude Features

| Feature | Backend | Frontend | Statut |
|---|---|---|---|
| Auth complet | ✅ | ✅ | Stable |
| Planètes CRUD | ✅ | ✅ | Stable |
| Production details (`/production-details`) | ✅ | ❌ | Backend expose, frontend ignore |
| Tech Tree | ✅ | ✅ | Stable (descriptions fausses) |
| Vaisseaux / Défenses — construction | ✅ | ✅ | Stable |
| Build Queue | ✅ | ✅ | Stable |
| Combat v2 | ✅ | ✅ | Stable |
| **Mission recycle — résolution tick** | ❌ | ❌ | CRITIQUE — missions jamais résolues |
| **Débris dans GalaxyView** | ✅ endpoint | ❌ UI | Frontend manquant |
| Transport | ✅ | ✅ | Stable |
| Expédition v2 | ✅ | ✅ | Stable |
| Galaxy View | ✅ | ✅ | Stable |
| Colonisation | ✅ | ✅ | Stable |
| Marché ressources | ✅ | ✅ | Stable |
| Routes commerciales | ✅ | ✅ | Stable |
| Marché souterrain — achat/inventaire | ✅ | ✅ | Stable |
| Items marché souterrain — `orbital_strike` | ✅ | ✅ | Stable |
| Items marché souterrain — 4 autres | ❌ stub backend | ⚠️ "Bientôt" | Incomplet |
| Notifications | ✅ | ✅ | Stable |
| Messages | ✅ | ✅ | Stable |
| Alliances (CRUD) | ✅ | ✅ | Stable |
| Missions journalières / Achievements | ✅ | ✅ | Stable |
| **Officiers — bonus appliqués** | ❌ jamais lus | ✅ affiché | CRITIQUE — cosmétiques coûteux |
| ZAC | ✅ | ✅ | Stable |
| Gouvernance / Lois | ✅ | ✅ | Stable |
| Événements PvE serveur | ✅ | ✅ | Stable |
| Bounty Board | ✅ | ✅ | Stable |
| Flagship + Modules | ✅ | ✅ | Stable |
| Sabotages | ✅ | ✅ | Stable |
| Analytics / Dashboard | ✅ | ✅ | Stable |
| Admin Panel | ✅ | ✅ | Stable |
| **JWT signé** | ❌ pseudo-token | N/A | BLOQUANT |
| **WebSocket auth** | ❌ TODO | N/A | BLOQUANT |
| **Bâtiments fantômes** (5) | ❌ sans effet | ✅ affiché | CRITIQUE |
| **Techs aux descriptions mensongères** (6) | ⚠️ partiel | ❌ descriptions fausses | Haute priorité |
| Rate limiting complet | ⚠️ partiel | N/A | Lacune sécurité |
| Tests unitaires (hors combat/market) | ❌ | ❌ | Lacune qualité |

---

## 12. Équilibrage du Jeu

### 12.1 Fusion Plant — générateur linéaire dans un monde exponentiel

`calculate_fusion_energy` retourne `level * 50.0` (linéaire). À niveau 10 : 500 unités. Solar plant niveau 10 : ~1 557 unités. La fusion ne devient **jamais** économiquement viable. Aucun sink de deutérium efficace.

**Fix** : Passer à `base * level * 1.2^level`.

### 12.2 Crystal mine — facteur d'exponentiation 1.6 vs 1.5 pour le métal

La crystal mine est 6-7% plus chère par niveau mais produit 33% moins. ROI mécaniquement inférieur à chaque niveau. Pousse les joueurs à négliger le cristal qui est pourtant la ressource tech critique.

**Fix** : Passer le facteur crystal à 1.5 ou augmenter la production base de 20 à 22.

### 12.3 Astrophysics — verrou de colonisation trop cher

Niveau 10 : ~8M de ressources + 9+ heures de recherche (labo 8, réduction max). Bloque l'expansion multi-planètes qui est le cœur de la boucle macro.

**Fix** : Réduire `category_factor` astrophysics de 2.5 à 1.8.

### 12.4 Heavy Hunter obsolète vs Cruiser

Efficacité attaque/coût quasi-identique mais le Cruiser a Rapid Fire ×6 sur les light hunters. Aucune raison de construire des Heavy Hunters une fois le Cruiser débloqué.

**Fix** : Donner au Heavy Hunter RF×4 contre les Cruisers pour en faire un contre naturel.

### 12.5 Bomber sous-optimal vs Battleship

Bomber : 50 000M / 25 000C, attack=1000. Battleship : 45 000M / 15 000C, attack=1000. Le Bomber est plus cher pour des dégâts identiques. Son RF sur défenses n'est rentable que face à des défenseurs passifs.

**Fix** : Réduire le coût Bomber à 40 000M / 20 000C, ou augmenter son attack à 1400.

### 12.6 Ion Cannon mathématiquement inférieur au Gauss Cannon

Ion Cannon : 150 attack, 500 shield, 800 hull. Gauss Cannon : 1100 attack, 200 shield, 3500 hull. 7× moins puissant en attaque, 4× moins résistant, coût similaire. Défense à éviter.

### 12.7 Anti-Farm désactivé malgré le code existant

`protection.rs` — `is_attack_allowed_by_points` existe mais **n'est pas appelé** dans `validate_attack`. Un joueur rank 1 peut farmer un joueur rank 500 indéfiniment après le cooldown de 2h.

**Fix immédiat (30 min)** : Intégrer `is_attack_allowed_by_points` dans `validate_attack`.

### 12.8 Expéditions — slot unique et récompenses non scalées en late-game

Un seul slot d'expédition par planète. Les récompenses (`value_per_cap = 800`) scalent linéairement alors que la production des mines late-game scale exponentiellement → expéditions économiquement négligeables en late-game.

### 12.9 Syndicate Credits — source unique et aléatoire

SC obtenables uniquement via expédition (5% de chance). Impossible de planifier des achats.

**Sources manquantes** : missions daily, streak, victoires PvP, top classement hebdomadaire.

### 12.10 Accès Marché Noir trop restrictif

Espionnage ≥ 13 + Informatique ≥ 10 → ~1M de cristal en tech seul. La majorité des joueurs mid-game n'y accède jamais.

**Fix** : Accès de base à (Esp ≥ 8, Comp ≥ 6) avec catalogue limité. Items puissants gardent la condition actuelle.

---

## 13. Systèmes Manquants

### 13.1 Fleet Save / Mission "Deploy" — CRITIQUE RÉTENTION

Aucune mécanique permettant de mettre sa flotte hors de portée des attaquants. Tout joueur avec une grosse flotte la perd pendant son sommeil. **Cause probable numéro 1 de churn pour les joueurs sérieux.**

**Fix** : Ajouter un type de mission `"deploy"` / `"station"` qui laisse les vaisseaux en transit jusqu'à rappel.

### 13.2 ACS — Coordination de Flotte Inter-Joueurs

Aucune mécanique permettant à plusieurs joueurs d'envoyer des flottes qui arrivent simultanément. Fondamental pour l'alliance PvP. Génère les plus grandes batailles et événements.

### 13.3 Protection Anti-Bullying Post-3 Jours

La protection débutant dure 3 jours puis disparaît totalement. Pas de protection par ratio de points (code désactivé — voir 12.7).

### 13.4 Notifications Email

WS en place mais pas d'email pour : attaque entrante, construction terminée (joueur absent), route commerciale interceptée. Sans notification, les joueurs doivent checker obsessivement ou abandonner.

### 13.5 Cooldown d'Attaque Trop Court

2h de cooldown par paire. Permet le "farming en rotation" pour les coalitions.

**Fix** : Après victoire, augmenter à 4-6h.

### 13.6 Casus Belli d'Espionnage Exploitable

Le CB se déclenche au 5ème espionnage en 24h. Un joueur peut activer un CB sur une cible en spammant des sondes bon marché. Vérifier que le compteur est par **attaquant**, pas global.

---

## 14. Features Sympas à Implémenter

### 14.1 Événements Serveur Périodiques (tables déjà en place)

Tables `server_event`, `server_event_type`, `server_event_participation` existent. Idées :
- **Ruée vers l'astéroïde** : coordonnées aléatoires, premiers recycleurs gagnent des ressources massives
- **Invasion Pirate Galactique** : défense collaborative d'une galaxie entière
- **Marché Noir Éclaté** : prix ×3 + items exclusifs pendant 6h
- **Bonus de Weekend** : production ×1.5 vendredi-dimanche

### 14.2 Système de Bounty (table déjà en place)

Table `bounty` existe. Afficher dans le leaderboard, créditer automatiquement le chasseur de prime.

### 14.3 Gouvernance / Lois (tables déjà en place)

Tables `law_proposal`, `law_vote`, `law_effect` existent. Les joueurs les mieux classés votent sur des "lois" qui modifient les règles pendant 1 semaine.

### 14.4 Classement Multi-Dimensionnel

Ajouter :
- **Classement d'expédition** (ressources récupérées)
- **Classement de recherche** (total niveaux de tech)
- **Hall of Fame** des plus grandes batailles de la semaine

### 14.5 Daily Login Reward

Table `login_streak` existe. Implémenter :
- Jour 1 : +500 Métal | Jour 7 : +5 000 Cristal | Jour 30 : +1 SC
- Connexion consécutive : production +5% pour 24h

### 14.6 Piracy Mission Complète

`check_piracy_interception` inflige une perte mais ne crédite rien au raider. Compléter : 30% des ressources interceptées créditées en SC au raider.

### 14.7 Slots d'Expédition Multiples via computer_tech

1 slot d'expédition par tranche de niveau de `computer_tech` (ex: 1 slot par 3 niveaux). Donne une utilité concrète à computer_tech et maintient les expéditions pertinentes en late-game.

### 14.8 Saisons / Resets Périodiques

Reset tous les 3-6 mois avec récompenses permanentes (cosmétiques, titres) pour les meilleurs joueurs. Relance l'engagement et attire les nouveaux joueurs.

---

## 15. Rétention Joueur

### 15.1 Onboarding / Tutoriel absent

Aucun tutoriel interactif visible. Un joueur sans guide abandonne en 10 minutes (ratio énergie à 0, mines qui ne produisent rien). **Recommandation** : quêtes guidées pour les 3 premiers jours.

### 15.2 Missions Journalières sans dimension sociale

Les daily missions ne couvrent pas les interactions sociales (envoyer des ressources à un allié, rejoindre une alliance). Sans ça, elles n'encouragent pas le PvP qui retient les joueurs.

### 15.3 Absence de WS event pour `recycle_complete` et `transport_complete`

L'expéditeur d'un transport ou recyclage n'a aucun feedback WS quand la mission est résolue. Seul le destinataire reçoit un event.

---

## 16. Recommandations Prioritisées

### 🔴 BLOQUANT — Avant toute ouverture publique

| # | Action | Effort | Fichier(s) |
|---|---|---|---|
| B1 | Remplacer pseudo-JWT par HMAC-SHA256 | 1 jour | `auth.rs` + 7 modules |
| B2 | Authentifier les connexions WebSocket | 2h | `websocket.rs:388` |
| B3 | Wrapper les flux critiques dans `db.transaction()` | 2 jours | `fleet.rs`, `shipyard.rs`, `black_market.rs` |
| B4 | Paramétrer toutes les requêtes SQL (injection) | 1 jour | `trade_routes.rs`, `planet_market.rs`, `build_queue.rs` |
| B5 | Résoudre les missions "recycle" dans tick_system | 4h | `tick_system.rs` |

### 🟠 CRITIQUE — Sprint 1

| # | Action | Effort | Fichier(s) |
|---|---|---|---|
| C1 | Activer `is_attack_allowed_by_points` dans `validate_attack` | 30min | `fleet.rs` / `main.rs` |
| C2 | Ajouter mission de type "deploy" / fleet save | 1 jour | `fleet.rs`, `tick_system.rs` |
| C3 | Implémenter les bonus d'officiers dans tick et combat | 1 jour | `officers.rs`, `tick_system.rs`, `combat.rs` |
| C4 | Corriger les descriptions de techs mensongères (6 techs) | 2h | `TechTreeVisual.tsx` |
| C5 | Masquer les bâtiments fantômes (`is_available=false`) | 2h | AdminContentManager / DB |
| C6 | Corriger le mapping tech dans Shipyard.tsx | 30min | `Shipyard.tsx:99-100` |
| C7 | Afficher les débris dans GalaxyView + option recyclage | 4h | `GalaxyView.tsx`, `RadialMenu.tsx` |
| C8 | Guard integer overflow sur quantité de vaisseaux | 30min | `shipyard.rs:658-660` |

### 🟡 HAUTE PRIORITÉ — Sprint 2

| # | Action | Effort | Fichier(s) |
|---|---|---|---|
| H1 | Déplacer recalcul scores vers interval 5min (vs 2s) | 2h | `tick_system.rs` |
| H2 | Fusionner les deux systèmes de coûts bâtiments (data-driven) | 2 jours | `game_logic.rs`, `building_type` table |
| H3 | Corriger la formule score militaire frontend | 30min | `techTreeCompat.ts:344` |
| H4 | Brancher `laser_tech` et `hyperspace_tech` dans fleet v5 | 4h | `fleet.rs:1180-1182` |
| H5 | ETA de vol depuis config serveur | 1h | `FleetDispatcher.tsx:114` |
| H6 | Ajouter confirmation avant lancement d'attaque | 1h | `FleetDispatcher.tsx` |
| H7 | Réduire seuil marché noir + ajouter sources SC | 4h | `black_market.rs`, daily missions |
| H8 | Passer Fusion Plant en exponentielle | 30min | `game_logic.rs` |
| H9 | Anti-farm crystal mine (facteur 1.5 ou +2 base prod) | 30min | `game_logic.rs` |
| H10 | Réduire category_factor Astrophysics de 2.5 à 1.8 | 30min | `game_logic.rs` |
| H11 | Ajouter `apply_storage_cap` dans tick et lazy eval | 2h | `tick_system.rs`, `shipyard.rs` |
| H12 | Vue "Flottes en transit" avec ETA temps réel | 1 jour | Nouveau composant `ActiveMissions.tsx` |
| H13 | React.memo sur composants lourds | 4h | `Shipyard`, `Defenses`, `Facilities`, `TechTree` |
| H14 | Remplacer rapid fire hardcodé spy par lecture DB | 2h | `game_logic.rs:793-799` |
| H15 | Corriger les deux formules hyperspace_tech (15% vs 10%) | 1h | `fleet.rs:312` ou `trade_routes.rs:84` |
| H16 | Corriger base deuterium mine frontend (10→15) | 30min | `ResourceDisplay.tsx` |

### 🟢 MOYENNE PRIORITÉ — Sprint 3+

| # | Action | Effort |
|---|---|---|
| M1 | Implémenter `resource_boost` (effet tick) | 2 jours |
| M2 | Implémenter `stealth` (masquer coordonnées) | 2 jours |
| M3 | Slots d'expédition multiples via computer_tech | 1 jour |
| M4 | Daily Login Reward (streak table déjà en place) | 4h |
| M5 | Classement expédition + recherche + Hall of Fame | 1 jour |
| M6 | Email notifications (attaque entrante, construction terminée) | 2 jours |
| M7 | ACS — coordination de flotte inter-joueurs | 3 jours |
| M8 | Déplacer constantes combat/marché dans ServerConfig | 1 jour |
| M9 | Tests unitaires tick_system, game_logic, auth, handlers | 3 jours |
| M10 | Piracy mission — créditer le raider en SC | 4h |
| M11 | Cooldown d'attaque augmenté après victoire (2h→4-6h) | 2h |
| M12 | Soft-delete comptes utilisateur | 4h |
| M13 | Cargo recycler unifié (supprimer le hardcodé de planets.rs) | 1h |
| M14 | Réduire coût Bomber ou augmenter attack | 30min |
| M15 | Bonus RF Heavy Hunter vs Cruiser | 30min |
| M16 | Confirmation avant recyclage (choix du nombre de recycleurs) | 2h |

---

## Quick Wins (< 2h chacun, impact élevé)

1. **Activer anti-farm** — `is_attack_allowed_by_points` dans `validate_attack` — **30min**, churn majeur évité
2. **Corriger mapping tech Shipyard** — `weapons_tech` / `shield_tech` — **30min**, stats vaisseaux correctes
3. **Corriger formule score militaire frontend** — **30min**, classement cohérent
4. **Passer Fusion Plant en exponentielle** — **30min**, sink de deutérium viable
5. **Réduire seuil Marché Noir** — **1h**, feature accessible à 10× plus de joueurs
6. **Corriger descriptions techs mensongères** — **2h**, confiance joueur restaurée
7. **Masquer bâtiments fantômes dans l'UI** — **2h**, éliminer les money traps
8. **Descendre recalcul scores à toutes les 5 minutes** — **2h**, réduction massive de charge DB
9. **Guard overflow quantité vaisseaux (cast i64)** — **30min**, crash en production évité
10. **Corriger base deuterium mine frontend** — **30min**, ROI affiché correct
