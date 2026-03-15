# BALANCE PLAN — Space Conquest
**Date:** 2026-03-14
**Basé sur:** BALANCE_AUDIT.md (post-v9.2, Expansion 5.0)
**Sprints précédents:** 0 (auth/exploits), 1 (stabilité), 2 (formules/combat) — tous TERMINÉS

---

## Résumé des problèmes (depuis BALANCE_AUDIT.md)

| Sévérité | Count | Description |
|----------|-------|-------------|
| CRITIQUE | 5     | CRIT-001 à CRIT-005 — bloquants gameplay ou combat |
| HIGH     | 6     | HIGH-001 à HIGH-006 — déséquilibres structurels majeurs |
| MEDIUM   | 8     | MED-001 à MED-008 — friction gameplay, incohérences mineures |
| LOW      | 0     | Rien identifié dans l'audit |
| **Total** | **19** | |

Note: CRIT-005 (hull Recycleur 160 vs 1600) est traité dans BALANCE-0 car il affecte le combat.

---

## Sprint BALANCE-0 — Bugs critiques (bloquants gameplay) ✅ TERMINÉ

**Objectif:** Les 5 CRITIQUES uniquement. Aucune feature, aucun rebalance.
**Durée estimée:** 1-2 sessions → **Réalisé en 1 session (2026-03-15)**
**Agents:** @backend-architect · @reality-checker
**Status Reality Checker:** PASSED (B-) après corrections post-review

---

### BALANCE-0-A : Rapid fire ship-vs-defense (CRIT-001)

**Contexte technique:** La table `rapid_fire_rules` a deux foreign keys vers `ship_types` pour les deux colonnes (`attacker_ship_type_id`, `target_ship_type_id`). Il est donc structurellement impossible d'insérer une règle ship-vs-defense sans migration de schéma. Le moteur `load_rapid_fire_cache` dans `combat.rs` (ligne 96) ne lit que les `ship_types` — les défenses (`defense_types`) sont invisibles. Ce n'est pas un simple INSERT manquant : c'est un problème de schéma.

**Agent:** @backend-architect

**Tâche 1 — Migration schéma (2-3h)**

- Fichier cible: `migration/src/m20261005_000001_rapid_fire_defense_rules.rs`
- Nom de migration suivant: `m20261005_000001` (après le dernier `m20261002_000004`)
- Action: Créer une nouvelle table `rapid_fire_defense_rules` avec les colonnes:
  - `id` SERIAL PRIMARY KEY
  - `attacker_ship_type_id` INTEGER NOT NULL REFERENCES ship_types(id) ON DELETE CASCADE
  - `target_defense_type_id` INTEGER NOT NULL REFERENCES defense_types(id) ON DELETE CASCADE
  - `rapid_fire_value` INTEGER NOT NULL DEFAULT 0
  - UNIQUE(attacker_ship_type_id, target_defense_type_id)
- Insérer les règles suivantes (lookup par ship_key / defense_key via subquery):
  - croiseur → rocket_launcher : RF=10
  - bombardier → rocket_launcher : RF=20
  - bombardier → plasma_turret : RF=10
  - plasma_turret → chasseur_leger (ship) : c'est une règle defense-vs-ship, à placer dans une troisième table `rapid_fire_defense_vs_ship_rules` si nécessaire — ou à gérer dans le moteur combat directement (voir tâche 2)
  - destructeur → transporteur : RF=5
  - destructeur → recycleur : RF=3
- Enregistrer la migration dans `migration/src/lib.rs`
- DoD: `sea-orm-cli migrate up` s'exécute sans erreur, table visible via psql

**Tâche 2 — Moteur combat (2-3h)**

- Fichier cible: `backend/src/combat.rs`
- Action A: Créer un type `DefenseRapidFireCache = HashMap<(String, String), i32>` (clé: attacker_ship_key, target_defense_key)
- Action B: Créer `load_defense_rapid_fire_cache(db)` analogue à `load_rapid_fire_cache` (ligne 96) mais qui joint `rapid_fire_defense_rules` avec `ship_types` (attaquant) et `defense_types` (cible)
- Action C: Modifier la signature de `resolve_pvp_combat` pour accepter et utiliser ce nouveau cache lors du calcul des dégâts sur les défenses planétaires (les défenses sont déjà dans le HashMap avec préfixe `def_` — confirmer la mécanique dans `simulate_pvp_combat`)
- Action D: Passer le `DefenseRapidFireCache` chargé depuis la DB dans tous les appels à `resolve_pvp_combat` dans `main.rs` (`resolve_attack_mission`)
- DoD: `cargo test -p backend combat` passe. Test unitaire ajouté: un Croiseur vs 100 Rocket Launchers doit infliger RF×10 de dégâts vs RF×1 sans le cache.

**Tâche 3 — Entité SeaORM (30min)**

- Fichier cible: `backend/src/entities/rapid_fire_defense_rule.rs` (nouveau fichier)
- Action: Créer l'entité SeaORM minimale pour `rapid_fire_defense_rules` (Model, ActiveModel, Column, EntityName)
- Enregistrer dans `backend/src/entities/prelude.rs`
- DoD: `cargo build -p backend` compile sans erreur

---

### BALANCE-0-B : Capacité cargo Transporteur (CRIT-002)

**Contexte technique:** Trois sources en conflit:
- DB seed migration ligne 141: `cargo_capacity = 5000`
- `get_ship_cargo_capacity("transporter")` ligne 700 `game_logic.rs`: lit `cargo_transporter_base` (défaut 10000)
- `get_unit_base_stats("transporter")` ligne 763 `game_logic.rs`: lit `cargo_transporter` (défaut 25000)

La valeur canonique retenue est **10000** (milieu de gamme, déjà utilisé par `get_transporter_capacity`).

**Agent:** @backend-architect

**Tâche 1 — Unifier le fallback (30min)**

- Fichier: `backend/src/game_logic.rs` ligne 763
- Action: Changer `config.get_config("cargo_transporter", 25000.0)` en `config.get_config("cargo_transporter_base", 10000.0)`
- Supprimer la constante dépréciée `TRANSPORTER_CAPACITY = 10000.0` (ligne 670) si elle n'est plus utilisée
- DoD: `grep -n "cargo_transporter\"" backend/src/game_logic.rs` ne retourne qu'une seule clé de config

**Tâche 2 — Corriger la DB seed (15min)**

- Fichier: `migration/src/m20260125_200002_seed_complete_expansion_data.rs` ligne 141 (ou zone ship_types INSERT)
- Action: Mettre à jour la valeur `cargo_capacity` du Transporteur à 10000 dans le INSERT ON CONFLICT DO NOTHING — OU créer une migration de correction `m20261005_000002_fix_transporter_cargo.rs` qui fait `UPDATE ship_types SET cargo_capacity = 10000 WHERE ship_key = 'transporter'`
- DoD: `SELECT cargo_capacity FROM ship_types WHERE ship_key = 'transporter'` retourne 10000

**Tâche 3 — Frontend (15min)**

- Fichier: `frontend/src/utils/techTreeCompat.ts` et tout composant affichant la capacité cargo
- Action: Vérifier que la capacité cargo affichée provient du serveur (ship_types endpoint) et non d'une constante hardcodée
- DoD: Rechargement de la page après migration montre 10000 pour le Transporteur dans le Chantier

---

### BALANCE-0-C : Divergence bonus tech combat (CRIT-003)

**Contexte technique:** Deux fonctions calculent les bonus d'attaque différemment:
- `load_planet_tech_bonuses` (`handlers/fleet.rs` ligne 1254): `weapons_mult = 1.0 + weapons_level*0.1 + laser_level*0.05 + ion_level*0.03` (nouveau moteur PvP)
- `create_tech_bonuses` (`game_logic.rs` ligne 868): `weapons_multiplier = 1.0 + weapons_tech*0.1` (legacy)

La décision de design doit être prise AVANT le code: est-ce que Laser et Ion doivent contribuer à l'attaque?

**Agent:** @game-designer + @backend-architect

**Tâche 1 — Décision de design (15min)**

- Recommandation de l'audit: **Conserver** Laser (+5%/niv) et Ion (+3%/niv) comme bonus attaque dans le nouveau système. C'est une différenciation volontaire vs OGame (plus de depth). MAIS cela doit être documenté et visible côté UI.
- La décision retenue doit être écrite dans ce fichier (section décisions de design) avant que le code ne soit modifié.

**Tâche 2 — Unifier les deux fonctions (1h)**

- Fichier: `backend/src/game_logic.rs` fonction `create_tech_bonuses` (ligne 855)
- Action: Étendre la signature pour accepter `laser_tech: i32` et `ion_tech: i32`, ajouter les bonus identiques à `load_planet_tech_bonuses`
- Mettre à jour tous les call sites de `create_tech_bonuses` pour passer les niveaux laser/ion (récupérés depuis DB)
- DoD: Les deux fonctions produisent le même `weapons_multiplier` pour les mêmes inputs

**Tâche 3 — Frontend — affichage bonus (30min)**

- Fichier: tout composant affichant les bonus de combat (TechTreeVisual, rapport de combat)
- Action: Afficher le bonus d'attaque réel = weapons*10% + laser*5% + ion*3% (pas seulement weapons*10%)
- DoD: Dans TechTree, hovering sur "Armement L5 + Laser L5 + Ion L5" affiche +90% attaque (pas +50%)

---

### BALANCE-0-D : Mécanique de conquête (CRIT-004)

**Contexte technique:** `main.rs` ligne 897 — condition `loot_percentage >= 99.0`. Mathématiquement inatteignable car le loot est cappé à 50% de chaque ressource. La feature est morte.

**Agent:** @backend-architect

**Tâche 1 — Remplacer la condition (1h)**

- Fichier: `backend/src/main.rs` lignes 883-913
- Action: Remplacer la condition de conquête par la logique Colony Ship:
  - Condition A: L'attaquant a un Colony Ship dans sa flotte d'attaque (`mission.colony_ships_sent > 0` si la colonne existe, sinon vérifier depuis `planet_ships` de la planète source)
  - Condition B: L'attaquant remporte le combat (`result.winner == "attacker"`)
  - Condition C: Le défenseur a 0 vaisseaux restants ET 0 défenses restantes après combat
  - Condition D: Le défenseur a plus d'1 planète (protection planète mère — déjà présente)
  - Si toutes: conquête. Le Colony Ship est consommé (décrémenter `planet_ships`).
- Vérifier si `fleet_mission` a une colonne `colony_ships_sent` — si non, utiliser une heuristique sur la présence de Colony Ship dans `fleet_composition` JSON ou lire la flotte depuis la planète source au moment de la résolution
- DoD: Test manuel — attaquer avec Colony Ship + victoire totale conquiert la planète. Attaquer sans Colony Ship ne conquiert pas même avec victoire totale.

**Tâche 2 — UI Fleet Dispatcher (1h)**

- Fichier: `frontend/src/components/FleetDispatcher.tsx`
- Action: Ajouter une checkbox "Mission de conquête" qui apparaît uniquement si un Colony Ship est sélectionné dans la flotte. Afficher un warning "Votre Colony Ship sera consommé si la conquête réussit."
- DoD: La checkbox est visible uniquement quand colony_ships > 0 dans la sélection

---

### BALANCE-0-E : Hull Recycleur fallback (CRIT-005)

**Contexte technique:** `game_logic.rs` ligne 768 — fallback hull=160 vs DB seed hull=1600. Si le `StatsCache` (DB) est vide ou non chargé, les recycleurs ont 10× moins de HP.

**Agent:** @backend-architect

**Tâche 1 — Corriger le fallback (15min)**

- Fichier: `backend/src/game_logic.rs` ligne 768 (bloc `"recycler"` dans `get_unit_base_stats`)
- Action: Corriger `hull: 160.0` en `hull: 1600.0`
- Vérifier les autres vaisseaux pour d'autres divergences DB vs fallback (tableau section 2.1 de l'audit)
- DoD: `cargo test -p backend` passe. Aucun test existant ne dépend de l'ancienne valeur.

---

### Validation Reality Checker — Sprint BALANCE-0

- [x] `cargo test -p backend` — 13/13 tests passés, 0 warning
- [x] `cargo check -p backend` — compilation propre
- [x] migrations créées et enregistrées dans lib.rs
- [ ] Test manuel: Croiseur vs 100 Rocket Launchers — les Rocket Launchers fondent en 1-2 rounds (RF×10)
- [ ] Test manuel: Bombardier vs 50 Plasma Turrets — destruction rapide (RF×10)
- [ ] Test manuel: Transporteur affiche cargo 10000 dans Chantier
- [ ] Test manuel: Conquête possible avec Colony Ship + victoire totale
- [ ] Test manuel: Conquête impossible sans Colony Ship même avec victoire totale

**Migrations produites:**
- `m20261005_000001_rapid_fire_defense_rules.rs` — table RF defense + règles cruiser/bomber + destroyer ship-vs-ship
- `m20261005_000002_fix_transporter_cargo.rs` — cargo transporteur = 10000

---

## Sprint BALANCE-1 — Rééquilibrage vaisseaux & défenses ✅ TERMINÉ

**Objectif:** Corriger les déséquilibres structurels identifiés HIGH (vaisseaux, défenses, expéditions).
**Durée estimée:** 2-3 sessions → **Réalisé en 1 session (2026-03-15)**
**Agents:** @backend-architect · @reality-checker
**Status Reality Checker:** READY (B+) — 0 issue critique

**Migrations produites:**
- `m20261005_000003_rebalance_bomber.rs` — Bombardier shield 75→300, hull 7500→8500, prérequis plasma L5→L4
- `m20261005_000004_rebalance_heavy_hunter.rs` — Chasseur Lourd attack 25→75
- `m20261005_000006_expedition_reward_cap.rs` — cap expédition 500k/slot dans server_config

---

### BALANCE-1-A : Bombardier — rééquilibrage (HIGH-001)

**Contexte:** Le Bombardier a bouclier=75 (catastrophique), même attaque que le VG (1000), prérequis plus difficile, coût supérieur. Sans son RF anti-défenses (corrigé en BALANCE-0-A), il était inutile. Même avec RF fonctionnel, son bouclier de 75 le fait mourir avant de tirer contre une flotte de défense.

**Agent:** @game-designer + @backend-architect

**Tâche 1 — Décision stats (30min)**

Valeurs recommandées (à valider par @game-designer):
- Bouclier: 75 → **300** (×4, justifié: vaisseau d'assaut planétaire blindé)
- Hull: 7500 → 8500 (légère amélioration survivabilité)
- Réduire prérequis: Plasma L5 → **Plasma L4** (réduit le gate technologique d'environ 2 semaines)
- Garder: coût inchangé, speed inchangé, attack inchangé (1000)

**Tâche 2 — Migration DB (30min)**

- Fichier cible: `migration/src/m20261005_000003_rebalance_bomber.rs`
- Action: `UPDATE ship_types SET shield = 300, hull = 8500 WHERE ship_key = 'bomber'`
- Mettre à jour prérequis tech: `UPDATE ship_type_tech_requirements SET required_level = 4 WHERE ship_type_id = (SELECT id FROM ship_types WHERE ship_key = 'bomber') AND tech_type_id = (SELECT id FROM technologies WHERE tech_key = 'plasma_tech')`
- DoD: `SELECT shield, hull FROM ship_types WHERE ship_key = 'bomber'` retourne (300, 8500)

---

### BALANCE-1-B : Chasseur Lourd — différenciation (REC-09)

**Contexte:** CH attack=25 pour 10k resources. CL attack=10 pour 4k resources. Ratio cost/attack identique (~400 resources/attack). Le CH n'est pas un vrai upgrade.

**Agent:** @game-designer + @backend-architect

**Tâche 1 — Décision stats (15min)**

Valeurs recommandées:
- Attack: 25 → **75** (ratio cost/attack passe à 133 resources/attack — clairement meilleur que le CL)
- Prérequis allégés: Impulsion L2 + Armure L2 → **Impulsion L1 + Armure L1** (plus accessible)
- Bouclier: 150 → 150 (inchangé, c'est déjà son point fort)

**Tâche 2 — Migration DB (20min)**

- Fichier cible: `migration/src/m20261005_000004_rebalance_heavy_hunter.rs`
- Action: `UPDATE ship_types SET attack = 75 WHERE ship_key = 'heavy_hunter'`
- Mettre à jour prérequis tech si implémenté en DB
- DoD: `SELECT attack FROM ship_types WHERE ship_key = 'heavy_hunter'` retourne 75

---

### BALANCE-1-C : Capacité expédition Transporteur (HIGH-003)

**Contexte:** Dans `expedition_v2`, le Transporteur a `capacity_weight = 3.5` — le plus élevé après l'Étoile de la Mort. Un joueur rationnel envoie des Transporteurs en expédition (meilleur rendement ressources calmes) mais les Transporteurs n'ont pas de combat_power et meurent face aux pirates.

**Agent:** @backend-architect

**Tâche 1 — Corriger le poids (30min)**

- Fichier: `backend/src/handlers/fleet.rs` — chercher la section `expedition_v2` et le HashMap de capacity_weight par type de vaisseau
- Action: Réduire le poids Transporteur de 3.5 à **1.5**. La logique: le Transporteur contribue à la capacité de transport mais les vaisseaux de combat devraient être plus efficaces pour explorer.
- Tableau recommandé final: CL=1.0, CH=1.5, Croiseur=2.5, VG=3.0, Bombadier=2.0, Destructeur=3.5, Transporteur=1.5, Recycleur=1.0
- DoD: Simulation avec 10 Transporteurs génère moins de ressources calmes qu'avec 10 Croiseurs

---

### BALANCE-1-D : Rapid fire supplémentaire (REC-12)

**Contexte:** Le Destructeur (vaisseau anti-capital) devrait nettoyer les vaisseaux utilitaires rapidement. Trois règles ship-vs-ship manquantes.

**Agent:** @backend-architect

**Tâche 1 — Insertion règles (20min)**

- Fichier: Ajouter dans la migration `m20261005_000001` (BALANCE-0-A) ou dans une migration séparée `m20261005_000005`
- Règles à ajouter dans `rapid_fire_rules` (ship-vs-ship, pas de changement de schéma requis):
  - destructeur → transporteur : RF=5
  - destructeur → recycleur : RF=3
  - croiseur → chasseur_leger : RF=6 (VERIFICATION — déjà dans la seed m20260125_100002 lignes 635-689? Si oui, skip)
- DoD: `SELECT * FROM rapid_fire_rules` montre les nouvelles règles après migration

---

### BALANCE-1-E : Plafonner les récompenses d'expédition (MED-003)

**Contexte:** Les récompenses pirates forts × tier_mult=2.0 peuvent dépasser le loot PvP. L'expédition ne doit pas être plus rentable que l'économie minière de base.

**Agent:** @backend-architect + @game-designer

**Tâche 1 — Ajouter un cap (45min)**

- Fichier: `backend/src/handlers/fleet.rs` — fonction `expedition_v2` ou `resolve_expedition`
- Action: Après calcul de `combat_reward`, appliquer un cap: `combat_reward = combat_reward.min(max_expedition_reward)`
- `max_expedition_reward` = configurable via `server_config` (clé: `max_expedition_reward_per_slot`, défaut: 500000.0 pour chaque ressource)
- Insérer la clé dans `server_config` via migration ou au démarrage
- DoD: Aucune expédition ne rapporte plus de 500k d'une ressource par slot. Test avec flotte max.

---

### Validation Reality Checker — Sprint BALANCE-1

- [ ] `cargo test -p backend` — 0 erreur, 0 warning
- [ ] Bombardier: `SELECT shield FROM ship_types WHERE ship_key = 'bomber'` = 300
- [ ] Chasseur Lourd: `SELECT attack FROM ship_types WHERE ship_key = 'heavy_hunter'` = 75
- [ ] Simulation expédition: 10 Transporteurs < 10 Croiseurs en rendement calme
- [ ] Plafond expédition: impossible d'obtenir >500k par ressource par expédition

---

## Sprint BALANCE-2 — Économie & Progression ✅ TERMINÉ

**Objectif:** Corrections MEDIUM impactant la progression long-terme. Cohérence des données entre DB et fallback.
**Durée estimée:** 1-2 sessions → **Réalisé en 1 session (2026-03-15)**
**Agents:** @backend-architect · @reality-checker
**Status Reality Checker:** READY (B+) — 0 issue critique

**Migrations produites:**
- `m20261005_000007_fix_crystal_mine_cost_factor.rs` — crystal_mine cost_multiplier 1.6→1.5
- `m20261005_000008_graviton_tech_cost.rs` — Graviton Tech deuterium 3000→100000

**Observations Reality Checker (non-bloquant):**
- `base_time_seconds` en DB est du dead weight à runtime (confirmé), utilisé uniquement pour affichage frontend

---

### BALANCE-2-A : Crystal Mine cost_factor — unifier DB et fallback (HIGH-006 / MED-007)

**Contexte:** La migration seed a `cost_factor = 1.6` pour crystal_mine, mais `game_logic.rs` commentaire v9.2 dit "réduit à 1.5". Les deux doivent être identiques.

**Agent:** @backend-architect

**Tâche 1 — Décision et alignement (30min)**

- Décision recommandée: **1.5** (aligné sur la note v9.2, réduit la pression cristal mid-game)
- Fichier: `migration/src/m20261005_000006_fix_crystal_mine_cost_factor.rs`
- Action: `UPDATE building_types SET cost_factor = 1.5 WHERE building_key = 'crystal_mine'`
- Vérifier `game_logic.rs` ligne 448 — si le fallback est déjà 1.5, pas de changement code nécessaire
- DoD: `SELECT cost_factor FROM building_types WHERE building_key = 'crystal_mine'` = 1.5

---

### BALANCE-2-B : Graviton Tech coût non-nul (MED-004)

**Contexte:** Graviton Tech coûte 0/0/0 en ressources. Seul le temps compte. C'est potentiellement exploitable si le lab est haut niveau (temps réduit à presque 0).

**Agent:** @game-designer + @backend-architect

**Tâche 1 — Ajouter un coût symbolique (20min)**

- Décision recommandée: Graviton Tech L1 coûte **0/0/100000** (deutérium uniquement — logique thématique: la gravité est liée à l'énergie fusion)
- Fichier: `migration/src/m20261005_000007_graviton_tech_cost.rs`
- Action: `UPDATE technologies SET base_cost_metal = 0, base_cost_crystal = 0, base_cost_deuterium = 100000 WHERE tech_key = 'graviton_tech'`
- Note: La formule `2^(level-1)` fait exploser le coût à L2+ — L1 seul est accessible, L2 coûte 200k D, etc.
- DoD: `SELECT base_cost_deuterium FROM technologies WHERE tech_key = 'graviton_tech'` = 100000

---

### BALANCE-2-C : Ratio deutérium dans la production (MED-001)

**Contexte:** Le deutérium produit ~50% du métal (base 15/30) au lieu du ratio intention 33% (base 10/30). Le deutérium est moins scarce que prévu.

**Agent:** @game-designer

**Tâche 1 — Décision (30min)**

Deux options:
- Option A: Réduire la base deutérium de 15 à **10** (ratio devient 10/30 = 33%, comme OGame)
- Option B: Laisser tel quel (le deutérium plus abondant facilite les missions de flotte et est un choix de design valide)

Recommandation: **Option B — ne pas modifier**. Le deutérium plus abondant est un allégement délibéré vs OGame qui réduit la frustration de flotte. L'audit identifie cela comme une divergence d'intention, pas un bug. Documenter la décision dans ce fichier.

Si @game-designer choisit Option A:
- Fichier: `migration/src/m20261005_000008_rebalance_deuterium_base.rs`
- Action: `UPDATE building_types SET ... WHERE building_key = 'deuterium_mine'` (production_base dans server_config ou building_types)
- DoD: Simulation de production deuterium L10 retourne ~1600/h au lieu de ~2391/h

---

### BALANCE-2-D : temps de recherche base_time en DB (MED-008)

**Contexte:** Les `time_seconds` insérés en DB par la migration seed sont calculés depuis `(metal + crystal) / 2500 * 3600` sans deutérium. La fonction runtime `get_research_time` (avec level^1.5) remplace ces valeurs dynamiquement — la valeur DB est donc ignorée à l'exécution. Faible impact pratique.

**Agent:** @backend-architect

**Tâche 1 — Vérifier que time_seconds DB n'est pas lu (15min)**

- Fichier: `backend/src/handlers/shipyard.rs` et `tech_tree.rs`
- Action: Grep pour `time_seconds` — confirmer que la valeur DB n'est pas utilisée comme durée de recherche finale (elle devrait être overridée par `get_research_time`)
- Si elle est utilisée: créer une migration de correction
- DoD: Confirmation documentée que `time_seconds` en DB est ignoré ou correction appliquée

---

### BALANCE-2-E : Supprimer get_upgrade_cost hardcodé (MED-007)

**Contexte:** `get_upgrade_cost` dans `game_logic.rs` est un fallback hardcodé qui ignore la DB. Si appelé par inadvertance, les coûts affichés diffèrent des coûts réels. La fonction data-driven s'appelle `get_upgrade_cost_from_cache`.

**Agent:** @backend-architect

**Tâche 1 — Audit des call sites (30min)**

- Grep: `get_upgrade_cost[^_]` dans `backend/src/`
- Pour chaque call site: remplacer par `get_upgrade_cost_from_cache` ou supprimer si dead code
- Si `get_upgrade_cost` est nécessaire comme fallback d'urgence: ajouter un log d'erreur `eprintln!("[WARN] get_upgrade_cost fallback appelé — DB cache probablement vide")`
- DoD: `grep -rn "get_upgrade_cost[^_]" backend/src/` retourne 0 résultats (ou uniquement la définition de la fonction elle-même)

---

### Validation Reality Checker — Sprint BALANCE-2

- [ ] `cargo test -p backend` — 0 erreur, 0 warning
- [ ] Crystal mine cost_factor: DB = 1.5
- [ ] Graviton Tech: DB base_cost_deuterium = 100000
- [ ] Aucun call site `get_upgrade_cost` non-cache actif
- [ ] `time_seconds` DB pour research: confirmé ignoré ou corrigé

---

## Sprint BALANCE-3 — Tests & Validation ✅ TERMINÉ

**Objectif:** Tests automatisés pour toutes les formules modifiées. Simulation de progression J1/J7/J30/J90. Validation finale.
**Durée estimée:** 2-3 sessions → **Réalisé en 1 session (2026-03-15)**
**Agents:** @backend-architect · @reality-checker
**Status Reality Checker:** CERTIFIÉ (B+) — 23/23 tests passés, 0 régression

**Tests ajoutés:**
- `backend/src/balance_tests.rs` — nouveau fichier, T-004 à T-008 (cargo, hull, weapons_mult, stats)
- `backend/src/combat.rs` — T-001 à T-003 (RF damage engine: cruiser/bomber vs rocket/plasma)
- T-009/T-010 documentés comme nécessitant tests d'intégration (dépendance DB)

**Fichiers modifiés:**
- `backend/src/lib.rs` — `mod balance_tests` ajouté

---

### BALANCE-3-A : Tests unitaires Rust (cargo test)

**Fichier cible:** `backend/src/combat.rs` (module `#[cfg(test)]` existant)

Chaque test doit utiliser `#[test]` et ne pas toucher à la DB (mocks ou valeurs hardcodées).

| Test ID | Scénario | Assertion |
|---------|----------|-----------|
| T-001 | Croiseur (RF×10) vs 100 Rocket Launchers | damage = 400 × 10 × 1.0 = 4000 (fleet proportionnelle 100%) |
| T-002 | Bombardier (RF×20) vs 50 Rocket Launchers | damage = 1000 × 20 × 1.0 = 20000 |
| T-003 | Bombardier (RF×10) vs 20 Plasma Turrets | damage = 1000 × 10 × 1.0 = 10000 |
| T-004 | Transporteur cargo capacity | `get_ship_cargo_capacity("transporter", config)` = 10000 |
| T-005 | Hull Recycleur fallback | `get_unit_base_stats("recycler", config).hull` = 1600.0 |
| T-006 | weapons_mult Laser + Ion | `create_tech_bonuses(5, 0, 0, 0, 5, 5, config).weapons_multiplier` = 1.90 |
| T-007 | Bombardier bouclier | `get_unit_base_stats("bomber", config).shield` = 300.0 (après migration) |
| T-008 | Chasseur Lourd attack | `get_unit_base_stats("heavy_hunter", config).attack` = 75.0 (après migration) |
| T-009 | Conquête avec Colony Ship | `resolve_attack_mission` avec colony ship + victoire totale → `planet_conquered = true` |
| T-010 | Conquête sans Colony Ship | Même conditions sans colony ship → `planet_conquered = false` |

**Agent:** @backend-architect

---

### BALANCE-3-B : Tests d'intégration

Ces tests nécessitent une DB de test ou des mocks SeaORM.

| Test ID | Scénario | Outils |
|---------|----------|--------|
| TI-001 | `load_defense_rapid_fire_cache` retourne les règles bomber/cruiser vs défenses | DB de test |
| TI-002 | `resolve_pvp_combat` avec défenses et RF defense cache | DB de test |
| TI-003 | Migration `m20261005_000001` up + down propres | `sea-orm-cli migrate` |

---

### BALANCE-3-C : Simulations de progression (cargo test via combat_sim)

Utiliser `backend/src/bin/combat_sim.rs` comme base pour des simulations de progression.

**Simulation 1 — J1 (Production débutant)**

Paramètres: Mine métal L1, cristal L1, deutérium L1, solaire L3, building_speed=1
```bash
# Calculer production horaire initiale
cargo run --bin combat_sim -- --sim-production --metal-mine 1 --crystal-mine 1 --deut-mine 1
```
Attendu: Métal ~33/h, Cristal ~22/h, Deutérium ~16/h

**Simulation 2 — J7 (Semaine 1)**

Paramètres: Mines L5-7, chantier L3, 30 CL
```bash
cargo run --bin combat_sim -- --att "light_hunter=30" --def "rocket_launcher=20" --def-weapons 0
```
Attendu: Les CL gagnent mais avec des pertes significatives (pas de RF CL vs Rocket Launcher)

**Simulation 3 — Croiseur vs défenses (post BALANCE-0-A)**

```bash
cargo run --bin combat_sim -- --att "cruiser=10" --def-defenses "rocket_launcher=50" --def-weapons 0
```
Attendu: Les Rocket Launchers fondent rapidement (RF×10), pertes attaquant minimes

**Simulation 4 — Bombardier post-fix**

```bash
cargo run --bin combat_sim -- --att "bomber=5" --def-defenses "plasma_turret=10,rocket_launcher=30" --def-weapons 0
```
Attendu: Bombardier nettoie les défenses en 2-3 rounds (RF×10 vs Plasma, RF×20 vs Rocket)

**Simulation 5 — Combat symétrique (équilibrage général)**

```bash
cargo run --bin combat_sim -- --att "cruiser=50,light_hunter=100" --def "cruiser=40,light_hunter=80" --att-weapons 5 --def-weapons 3
```
Attendu: L'avantage tech (+2 levels weapons) compense le désavantage numérique — victoire attaquant plausible

---

### BALANCE-3-D : Tests manuels par le Reality Checker

Liste de vérification manuelle complète (à exécuter en ordre):

**Bloc 1 — Combats**
1. Attaquer avec 10 Croiseurs une planète avec 50 Rocket Launchers → les Rocket Launchers doivent disparaître en 1-2 rounds
2. Attaquer avec 5 Bombardiers une planète avec 10 Plasma Turrets → les Plasma Turrets doivent subir des pertes massives
3. Attaquer avec 5 Bombardiers une planète avec 0 défenses → victoire normale (vérifier que l'absence de cibles RF ne cause pas de bug)
4. Combat PvP : Armement L5 + Laser L5 + Ion L5 → rapport de combat doit afficher +90% attaque (pas +50%)

**Bloc 2 — Conquête**
5. Attaquer avec 1 Colony Ship + 50 Croiseurs une planète sans défenses ni flotte → conquête doit réussir
6. Attaquer avec 0 Colony Ship + 50 Croiseurs une planète sans défenses ni flotte → pas de conquête même avec victoire totale
7. Attaquer avec Colony Ship mais défenses restantes → pas de conquête (condition C non remplie)
8. Attaquer la planète mère (homeworld) d'un joueur à 1 planète → pas de conquête (condition D)

**Bloc 3 — Économie**
9. Construire un Transporteur → cargo affiché = 10000
10. Lancer une expédition avec 10 Transporteurs → ressources calmes < expédition avec 10 Croiseurs
11. Lancer une expédition contre Pirates Forts avec flotte maximale → récompense plafonnée à 500k par ressource
12. Construire un Recycleur → stats combat affichées hull=1600 (pas 160)

**Bloc 4 — Progression**
13. Vérifier le coût Crystal Mine L5 → doit utiliser factor 1.5 (coût L5 = 200 cristal environ)
14. Rechercher Graviton Tech → coûte du deutérium (100000 pour L1)
15. Survol "Armement L5" dans TechTree → tooltip montre +90% attaque si Laser L5 + Ion L5 aussi recherchés

---

## Plan de tests complet

### Tests unitaires Rust (cargo test)

```bash
# Lancer tous les tests
cargo test -p backend

# Lancer uniquement les tests combat (incluant T-001 à T-010)
cargo test -p backend combat

# Vérifier que les simulations compilent
cargo build --bin combat_sim -p backend
```

Tous les tests listés en BALANCE-3-A doivent être écrits par @backend-architect avant la validation Reality Checker.

### Tests d'intégration

```bash
# Migrations up propres (depuis 0)
sea-orm-cli migrate fresh

# Migrations down + up (test round-trip)
sea-orm-cli migrate reset && sea-orm-cli migrate up
```

### Tests à grande échelle (simulations court/moyen/long terme)

| Horizon | Simulation | Outil | Critère de succès |
|---------|-----------|-------|-------------------|
| J1 | Production initiale | combat_sim --sim-production | Métal ≥ 30/h, Cristal ≥ 20/h |
| J7 | Première flotte de combat | combat_sim avec CL vs Rocket Launchers | CL perdent <50% contre 2× leur masse en Rocket Launchers |
| J30 | Croiseurs mid-game | combat_sim Cruiser vs defenses (post-fix RF) | Croiseurs nettoient 10× leur masse en Rocket Launchers |
| J30 | Bombardier anti-défense | combat_sim Bomber vs Plasma+Rocket | Bombardiers plus efficaces que VG contre défenses mixtes |
| J90 | Destructeur endgame | combat_sim Destroyer vs transporteurs | Destructeurs éliminent flottes utilitaires en 1-2 rounds (RF×5) |

### Tests manuels par le Reality Checker

Voir BALANCE-3-D ci-dessus (15 tests manuels organisés en 4 blocs).

---

## Attribution des agents

| Sprint | Tâche | Agent | Priorité | Durée est. |
|--------|-------|-------|----------|-----------|
| BALANCE-0 | BALANCE-0-A tâche 1 (migration schéma RF defense) | @backend-architect | P0 | 2-3h |
| BALANCE-0 | BALANCE-0-A tâche 2 (moteur combat RF defense) | @backend-architect | P0 | 2-3h |
| BALANCE-0 | BALANCE-0-A tâche 3 (entité SeaORM) | @backend-architect | P0 | 30min |
| BALANCE-0 | BALANCE-0-B tâche 1 (unifier fallback cargo) | @backend-architect | P0 | 30min |
| BALANCE-0 | BALANCE-0-B tâche 2 (corriger DB seed cargo) | @backend-architect | P0 | 15min |
| BALANCE-0 | BALANCE-0-B tâche 3 (frontend cargo) | @frontend-developer | P0 | 15min |
| BALANCE-0 | BALANCE-0-C tâche 1 (décision bonus Laser/Ion) | @game-designer | P0 | 15min |
| BALANCE-0 | BALANCE-0-C tâche 2 (unifier create_tech_bonuses) | @backend-architect | P0 | 1h |
| BALANCE-0 | BALANCE-0-C tâche 3 (frontend affichage bonus) | @frontend-developer | P0 | 30min |
| BALANCE-0 | BALANCE-0-D tâche 1 (condition conquête Colony Ship) | @backend-architect | P0 | 1h |
| BALANCE-0 | BALANCE-0-D tâche 2 (UI Fleet Dispatcher conquête) | @frontend-developer | P0 | 1h |
| BALANCE-0 | BALANCE-0-E tâche 1 (hull Recycleur fallback) | @backend-architect | P0 | 15min |
| BALANCE-0 | Validation | @reality-checker | P0 | 1h |
| BALANCE-1 | BALANCE-1-A (Bombardier rebalance) | @game-designer + @backend-architect | P1 | 1h |
| BALANCE-1 | BALANCE-1-B (Chasseur Lourd attack) | @game-designer + @backend-architect | P1 | 45min |
| BALANCE-1 | BALANCE-1-C (Transporteur expédition poids) | @backend-architect | P1 | 30min |
| BALANCE-1 | BALANCE-1-D (RF Destructeur vs utilitaires) | @backend-architect | P1 | 20min |
| BALANCE-1 | BALANCE-1-E (cap récompenses expédition) | @backend-architect | P1 | 45min |
| BALANCE-1 | Validation | @reality-checker | P1 | 30min |
| BALANCE-2 | BALANCE-2-A (crystal_mine cost_factor) | @backend-architect | P2 | 30min |
| BALANCE-2 | BALANCE-2-B (Graviton Tech coût) | @game-designer + @backend-architect | P2 | 20min |
| BALANCE-2 | BALANCE-2-C (ratio deutérium décision) | @game-designer | P2 | 30min |
| BALANCE-2 | BALANCE-2-D (time_seconds research audit) | @backend-architect | P2 | 15min |
| BALANCE-2 | BALANCE-2-E (supprimer get_upgrade_cost hardcodé) | @backend-architect | P2 | 30min |
| BALANCE-2 | Validation | @reality-checker | P2 | 30min |
| BALANCE-3 | Tests unitaires T-001 à T-010 | @backend-architect | P3 | 2h |
| BALANCE-3 | Tests intégration TI-001 à TI-003 | @backend-architect | P3 | 1h |
| BALANCE-3 | Simulations combat_sim | @backend-architect | P3 | 1h |
| BALANCE-3 | Tests manuels (15 cas) | @reality-checker | P3 | 2h |

---

## Décisions de design à prendre avant l'implémentation

Ces décisions doivent être prises par @game-designer et documentées ici avant que @backend-architect ne code.

| ID | Question | Recommandation audit | Décision finale |
|----|----------|---------------------|-----------------|
| D-001 | Laser et Ion donnent-ils un bonus d'attaque en combat? | Oui (conserver, dokumenter) | **OUI** — Laser +5%/niv + Ion +3%/niv ajoutés au weapons_mult. Documenté dans le TechTree. |
| D-002 | Ratio deutérium production: garder 50% métal ou réduire à 33%? | Garder 50% (choix de design) | **GARDER 50%** — différenciation vs OGame, réduit la frustration carburant. |
| D-003 | Cap expédition: quel montant par slot? | 500k par ressource | **500,000 par ressource par slot** — clé server_config `max_expedition_reward_per_slot`. |
| D-004 | Bombardier shield: 300 ou autre valeur? | 300 | **300** — vaisseau d'assaut blindé, justifié lore. |
| D-005 | Chasseur Lourd attack: 75 ou autre valeur? | 75 | **75** — ratio cost/attack 133 resources/attack, clairement supérieur au CL. |

---

## Fichiers clés affectés par ce plan

| Fichier | Sprints | Type de changement |
|---------|---------|-------------------|
| `migration/src/m20261005_000001_rapid_fire_defense_rules.rs` | BALANCE-0-A | NOUVEAU — schéma + données |
| `migration/src/m20261005_000002_fix_transporter_cargo.rs` | BALANCE-0-B | NOUVEAU — correction données |
| `migration/src/m20261005_000003_rebalance_bomber.rs` | BALANCE-1-A | NOUVEAU — rebalance stats |
| `migration/src/m20261005_000004_rebalance_heavy_hunter.rs` | BALANCE-1-B | NOUVEAU — rebalance stats |
| `migration/src/m20261005_000005_add_destroyer_rf_rules.rs` | BALANCE-1-D | NOUVEAU — données RF |
| `migration/src/m20261005_000006_fix_crystal_mine_cost_factor.rs` | BALANCE-2-A | NOUVEAU — correction données |
| `migration/src/m20261005_000007_graviton_tech_cost.rs` | BALANCE-2-B | NOUVEAU — données |
| `migration/src/lib.rs` | BALANCE-0-A | MODIFIER — enregistrer nouvelles migrations |
| `backend/src/combat.rs` | BALANCE-0-A | MODIFIER — DefenseRapidFireCache + load fn |
| `backend/src/game_logic.rs` | BALANCE-0-B, BALANCE-0-C, BALANCE-0-E | MODIFIER — fallbacks unifiés |
| `backend/src/main.rs` | BALANCE-0-D | MODIFIER — condition conquête |
| `backend/src/handlers/fleet.rs` | BALANCE-0-C, BALANCE-1-C, BALANCE-1-E | MODIFIER — tech bonuses, expédition |
| `backend/src/entities/rapid_fire_defense_rule.rs` | BALANCE-0-A | NOUVEAU — entité SeaORM |
| `backend/src/entities/prelude.rs` | BALANCE-0-A | MODIFIER — enregistrer entité |
| `frontend/src/components/FleetDispatcher.tsx` | BALANCE-0-D | MODIFIER — UI conquête |
| `frontend/src/utils/techTreeCompat.ts` | BALANCE-0-C | VERIFIER — bonus attaque affiché |

---

## Notes de scope

**Hors scope de ce plan (MoSCoW: Won't have)**

- HIGH-004 (Fleet Save UI dédiée): feature complète, scope d'un sprint entier seul
- HIGH-005 (ratio attaquant/défenseur structurel): problème fondamental du genre, pas résolvable par du code
- HIGH-002 (gate espionnage pour voir défenses): ajustement de seuil acceptable mais non critique
- MED-005 (deutérium dans les débris): changement de gameplay significatif, non demandé
- MED-006 (Canon à Ions mauvais DPS): son rôle de tank est valide, le problème est le moteur de combat (distribution proportionnelle) — trop complexe à corriger ici
- BAL-010 (hull-priority dans le combat): différé depuis Sprint 2, reste différé (tests requis, scope élevé)

Ces items peuvent faire l'objet d'un Sprint BALANCE-4 distinct si les sprints 0-3 sont validés.
