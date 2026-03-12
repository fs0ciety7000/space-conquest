# Space Conquest — Plan Data-Driven : Audit & Refonte du Système de Bâtiments

**Version** : 1.0
**Date** : 2026-03-12
**Auteur** : Game Designer en chef
**Destinataires** : Équipe backend (Rust/Axum), équipe frontend (React/Vite)

---

## TABLE DES MATIÈRES

1. [Audit des Bâtiments Actuels](#1-audit-des-bâtiments-actuels)
2. [Audit des Technologies](#2-audit-des-technologies)
3. [Architecture du Nouveau Système Data-Driven](#3-architecture-du-nouveau-système-data-driven)
4. [Nouveaux Bâtiments Proposés](#4-nouveaux-bâtiments-proposés)
5. [Matrice de Synergies Bâtiment × Tech](#5-matrice-de-synergies-bâtiment--tech)
6. [Plan de Migration](#6-plan-de-migration)
7. [Backlog Priorisé](#7-backlog-priorisé)

---

## 1. Audit des Bâtiments Actuels

### Méthodologie

Les fichiers audités en profondeur :
- `backend/src/game_logic.rs` — formules de production, énergie, capacités, temps
- `backend/src/tech_tree.rs` — queries DB, calcul des coûts, temps de construction
- `backend/src/handlers/planets.rs` — get_planet_handler, upgrade_mine_handler, calculate_energy_ratio
- `frontend/src/components/Facilities.tsx` — affichage des installations
- `frontend/src/components/ResourceDisplay.tsx` — affichage des mines + ROI
- `migration/src/m20260125_200002_seed_complete_expansion_data.rs` — données de seed en DB

### Tableau d'Audit Complet

| Bâtiment | Effet Réel Backend | Description Frontend | Problèmes Identifiés |
|---|---|---|---|
| `metal_mine` | Prod/h = `30 * level * 1.1^level * tech_bonus * energy_ratio * biome_mult * slot_bonus` | "Collecte les ressources de métal" | Correct. Tech bonus = energy_tech (+1%/nv) + plasma_tech (+1%/nv). Biome & slots pris en compte. |
| `crystal_mine` | Prod/h = `20 * level * 1.1^level * tech_bonus * energy_ratio * biome_mult * slot_bonus` | "Collecte les cristaux précieux" | Correct. Même formule que métal avec base 20 au lieu de 30. Ratio 3:2:1 maintenu. |
| `deuterium_mine` | Prod/h = `15 * level * 1.1^level * tech_bonus * energy_ratio * biome_mult * slot_bonus` | "Produit du deutérium" | Le frontend affiche base=10 (hardcoded fallback) mais le backend utilise base=15. **DIVERGENCE FRONTEND/BACKEND**. Le calcul du ROI est donc faux côté client. |
| `solar_plant` | Énergie = `60 * level * 1.1^level * (1 + energy_tech * 0.10)`. Slots "energy" augmentent cette valeur | "Génère de l'énergie" | Correct mais energy_tech_bonus = 0.10 en backend vs 0.10 en frontend (ResourceDisplay). **Attention** : le frontend `energy_tech_bonus` dans `/config` est 0.10 mais `calculate_resource_production` utilise 0.01 pour le bonus de PRODUCTION des mines. Il y a deux constantes différentes sous le même nom de config selon le contexte (énergie vs production). **PIÈGE CRITIQUE**. |
| `fusion_plant` | **FANTOME** : défini en DB (coût 900M/360C/180D, mult 1.8, prérequis energy_tech Nv.3), `building_category_factor` retourne 1.0 — mais `calculate_energy_ratio` n'inclut JAMAIS la `fusion_plant`. La fonction `calculate_energy_production` ne prend qu'un seul argument `solar_plant_level`. | "Centrale énergétique avancée" | **BÂTIMENT FANTOME CRITIQUE**. Peut être construit, coûte des ressources, mais ne produit AUCUNE énergie. L'argent des joueurs est gaspillé. |
| `research_lab` | Réduit le temps de recherche : -7% par niveau, max -55%. Formule : `BASE_TECH_TIME * level^1.5 * factor * (1 - min(lab_level * 0.07, 0.55))` | "Permet les recherches technologiques" | Effet réel : débloquer et accélérer la recherche. La description est trop vague — ne mentionne pas la réduction de temps ni le maximum. |
| `shipyard` | Accélère production vaisseaux : `BUILD_RATE = 3600 * (1 + shipyard_level * 0.10)`. Accélère aussi la construction de bâtiments via `get_build_time` : facility_level = shipyard_level, -8% par nv, max -60%. | "Permet la construction des vaisseaux" | Dual effect : accélère à la fois les vaisseaux ET les bâtiments. La description n'indique que les vaisseaux. **DESCRIPTION INCOMPLÈTE**. Le frontend calcule "Réduction Temps" avec formule `(1 - 1/(1+level)) * 100` mais le backend utilise `-8% par niveau de chantier`. **FORMULE DIVERGENTE**. |
| `hangar` | `fleet_capacity = hangar_capacity_base + (hangar_level * hangar_capacity_per_level)` (défaut : 500 + 500/nv). Bonus cargo transporteur : `base_capacity * (1 + hangar_level * 0.05)`. | "Capacité Flotte" | Double effet (limite flotte + bonus cargo transporteur). La description frontend affiche correctement la capacité flotte mais ne mentionne pas le bonus transporteur. **DESCRIPTION INCOMPLÈTE**. |
| `resource_storage` | Cap stockage = `600000 * 1.6^level` (defaut, configurable). Le cap est appliqué au tick et lors du GET planète. | "Augmente la capacité de stockage" | Correct fonctionnellement. **ATTENTION** : la cap s'applique séparément sur metal/crystal/deuterium (même valeur pour les 3). Pourrait être différencié par ressource dans le futur. |
| `nanite_factory` | **FANTOME** : défini en DB (coût 1M M, 500k C, 100k D, mult 2.0, prérequis computer_tech Nv.10 + shipyard Nv.10). Référencé dans `building_category_factor` (`_ => 1.8`). **Non implémenté dans `get_build_time`** — qui ne lit que `facility_level = shipyard_level`. | "Accélère toutes les constructions" | **BÂTIMENT FANTOME CRITIQUE**. Coût astronomique pour aucun effet. La migration `m20260307_000002_build_queue.rs` référence `queue_nanite_factory_per_slot` en config (slots de file de construction), mais `get_category_slots` ne lit pas le niveau de la nanite_factory du joueur. Effet partiel : slot de file, mais pas l'accélération promise. |
| `terraformer` | **FANTOME** : défini en DB (coût 0M/50kC/100kD, mult 2.0, prérequis energy_tech Nv.12). Aucune référence dans le backend aux "slots de construction" ou "cases planétaires". | "Augmente les cases de construction" | **BÂTIMENT FANTOME CRITIQUE**. Aucun effet implémenté. La mécanique de "cases de planète" n'existe pas encore. |
| `alliance_depot` | **FANTOME** : défini en DB (coût 20kM/40kC, mult 2.0). Aucune référence dans les handlers. | "Permet le ravitaillement allié" | **BÂTIMENT FANTOME**. Le système d'alliance existe mais le dépôt n'est pas hookéé. |
| `missile_silo` | **FANTOME** : défini en DB (coût 20kM/20kC/1kD, mult 2.0, prérequis shipyard Nv.1). Aucun handler de missile interplanétaire. | "Lance des missiles interplanétaires" | **BÂTIMENT FANTOME**. La mécanique de missile balistique n'est pas implémentée. |

### Synthèse : Score d'Implémentation

| Statut | Bâtiments |
|---|---|
| Pleinement implémenté | `metal_mine`, `crystal_mine`, `deuterium_mine`, `solar_plant`, `research_lab`, `resource_storage` |
| Partiellement implémenté (effet réduit) | `shipyard` (description incomplète), `hangar` (description incomplète), `research_lab` (description vague) |
| Fantome critique (payant, aucun effet) | `fusion_plant`, `nanite_factory`, `terraformer` |
| Fantome secondaire (pas accessible en mid-game) | `alliance_depot`, `missile_silo` |

**Verdict** : 5 bâtiments sur 13 sont des "money traps" — les joueurs peuvent investir des ressources précieuses dans des bâtiments sans aucun retour.

---

## 2. Audit des Technologies

### Technologies et leurs effets réels

| Tech | Effet Backend Confirmé | Problèmes |
|---|---|---|
| `energy_tech` | +10% production énergie solaire par nv. +1% production ressources (mines) par nv via `energy_tech_bonus=0.01`. | **DOUBLE CONSTANTE** : même nom `energy_tech_bonus` utilisé pour deux effets différents (0.10 pour énergie, 0.01 pour prod mines). Très confus pour les développeurs et les joueurs. |
| `plasma_tech` | +1% production M/C/D par niveau via `tech_bonus_plasma_prod=0.01`. | Effet faible mais cohérent. Pas de description précise en frontend du pourcentage. |
| `armour_tech` | +10% hull (structure) des vaisseaux en combat via `create_tech_bonuses`. | Correct. Dénomination cohérente. |
| `weapons_tech` | +10% attack en combat. | Correct. |
| `shield_tech` | +10% shield en combat. | Correct. |
| `espionage_tech` | Requis pour l'accès marché souterrain (Nv.13). Améliore qualité des rapports espionnage. | L'amélioration qualitative des rapports dépend du delta de niveaux entre attaquant et défenseur. Pas d'effet configurable visible. |
| `computer_tech` | +10% capacité cargo des transporteurs par niveau via `get_transporter_capacity_with_tech`. Prérequis nanite_factory. | Correct mais nanite_factory est un fantome. L'effet cargo est documenté dans le code mais PAS en DB description. |
| `combustion_drive` | Vitesse vaisseaux (light_hunter, transporter, recycler, colony_ship) : `base_speed + level * bonus`. | Implémenté dans fleet.rs. |
| `impulse_drive` | Vitesse heavy_hunter, cruiser. | Implémenté dans fleet.rs. |
| `hyperspace_drive` | Vitesse battleship, bomber, destroyer. | Implémenté dans fleet.rs. |
| `hyperspace_tech` | Prérequis pour hyperspace_drive. Pas d'effet direct visible. | Tech prérequis sans effet propre — "dead end" cosmétique. |
| `astrophysics` | Prérequis colonisation (implicite via colony_ship). | Pas d'effet configurable documenté au-delà du prérequis. |
| `ion_tech` | Prérequis cruiser, ion_cannon. | Tech prérequis sans effet de combat direct. |
| `laser_tech` | Prérequis light_laser, heavy_laser. Bonus dans resolve_pvp (ancien système) mais pas dans resolve_pvp_combat v5.0. | **TECH PARTIELLEMENT CASSÉE** : l'ancienne `resolve_pvp` utilise `laser_bonus` mais la nouvelle `simulate_pvp_combat` utilise `weapons_tech` pour l'attaque. La `laser_tech` n'a plus d'effet dans le système v5.0. |
| `graviton_tech` | Aucun effet implémenté visible. | **TECH FANTOME** : coût base très élevé, category_factor=2.5 (très long à rechercher), mais aucun effet. |
| `logistics_tech` | Défini dans `create_tech_bonuses` : +5% capacité cargo. | Effet présent mais tech pas visible/accessible dans le frontend de manière claire. |
| `industrial_tech` | Requis par une migration (`m20260307`) avec prérequis armour_tech Nv.5. | Nouvelle tech du système de routes commerciales. Effet non confirmé dans le code audité. |

---

## 3. Architecture du Nouveau Système Data-Driven

### Principe Fondamental

Le système actuel est "hardcoded par convention" : les effets des bâtiments sont calculés dans des fonctions Rust qui matchent sur la clé string du bâtiment. Ajouter un nouveau bâtiment nécessite de modifier le code Rust, recompiler et redéployer.

Le système cible est "data-driven par description" : les effets sont décrits en JSON dans la DB, lus au démarrage (ou hot-reload), et interprétés par un moteur générique d'effets en Rust.

```
Actuel :  Admin veut changer fusion_plant → modifie game_logic.rs → compile 8 min → redéploie
Cible  :  Admin veut changer fusion_plant → PATCH /admin/building-definitions/fusion_plant → effet en 1s
```

### 3.1 Schéma DB Complet

```sql
-- ============================================================
-- TABLE : building_definition
-- Remplace et enrichit la table building_type existante.
-- La table building_type garde ses colonnes pour la rétrocompat,
-- mais on ajoute une colonne effects_json.
-- ============================================================

ALTER TABLE building_type
  ADD COLUMN IF NOT EXISTS effects_json       JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS display_category   VARCHAR(50) NOT NULL DEFAULT 'facility',
  ADD COLUMN IF NOT EXISTS max_level          INTEGER,
  ADD COLUMN IF NOT EXISTS is_active          BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lore_text          TEXT,
  ADD COLUMN IF NOT EXISTS updated_at_config  TIMESTAMPTZ DEFAULT NOW();

-- Index pour hot-reload efficace
CREATE INDEX IF NOT EXISTS idx_building_type_active ON building_type(is_active);
CREATE INDEX IF NOT EXISTS idx_building_type_category ON building_type(display_category);

-- ============================================================
-- TABLE : tech_definition_effects
-- Ajoute une colonne effects_json à la table technologies existante.
-- ============================================================

ALTER TABLE technologies
  ADD COLUMN IF NOT EXISTS effects_json       JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS display_category   VARCHAR(50) NOT NULL DEFAULT 'research',
  ADD COLUMN IF NOT EXISTS max_level          INTEGER,
  ADD COLUMN IF NOT EXISTS lore_text          TEXT,
  ADD COLUMN IF NOT EXISTS updated_at_config  TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- TABLE : building_tech_synergy (NOUVELLE)
-- Règles de bonus croisé : "ce bâtiment reçoit ce bonus quand
-- cette tech est à ce niveau".
-- ============================================================

CREATE TABLE IF NOT EXISTS building_tech_synergy (
    id              SERIAL PRIMARY KEY,
    building_key    VARCHAR(100) NOT NULL,
    tech_key        VARCHAR(100) NOT NULL,
    effect_type     VARCHAR(50)  NOT NULL,  -- 'production_bonus', 'energy_bonus', 'cost_reduction', etc.
    formula         TEXT         NOT NULL,  -- Expression évaluable : "0.01 * tech_level"
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_synergy_building FOREIGN KEY (building_key)
        REFERENCES building_type(building_key) ON DELETE CASCADE,
    CONSTRAINT fk_synergy_tech FOREIGN KEY (tech_key)
        REFERENCES technologies(tech_key) ON DELETE CASCADE,
    UNIQUE(building_key, tech_key, effect_type)
);

-- ============================================================
-- TABLE : server_config (EXISTANTE — enrichissement)
-- Ajouter des clés de config pour le hot-reload.
-- ============================================================

-- Clés à ajouter via migration :
-- building_effects_cache_ttl_seconds  (default: 300)
-- tech_effects_cache_ttl_seconds      (default: 300)
-- building_synergy_enabled            (default: true)
```

### 3.2 Format JSON des Effets

Le champ `effects_json` de `building_type` et `technologies` supporte un tableau d'objets d'effet. Chaque objet est typé et interprété par le moteur d'effets en Rust.

#### Types d'effets définis

```json
[
  {
    "type": "resource_production",
    "resource": "metal",
    "formula": "base * level * growth^level",
    "params": {
      "base": 30.0,
      "growth": 1.1
    },
    "description": "Produit {base * level * 1.1^level} unités de métal par heure"
  },
  {
    "type": "energy_production",
    "formula": "base * level * growth^level",
    "params": {
      "base": 60.0,
      "growth": 1.1
    },
    "description": "Génère de l'énergie solaire"
  },
  {
    "type": "energy_consumption",
    "formula": "base * level * growth^level",
    "params": {
      "base": 10.0,
      "growth": 1.1
    },
    "description": "Consomme de l'énergie"
  },
  {
    "type": "build_time_reduction",
    "target": "buildings",
    "formula": "min(level * 0.08, 0.60)",
    "description": "Réduit les temps de construction des bâtiments de {min(level*8, 60)}%"
  },
  {
    "type": "build_time_reduction",
    "target": "ships",
    "formula": "level * 0.10",
    "description": "Réduit le temps de production des vaisseaux"
  },
  {
    "type": "research_time_reduction",
    "formula": "min(level * 0.07, 0.55)",
    "description": "Réduit les temps de recherche de {min(level*7, 55)}%"
  },
  {
    "type": "fleet_capacity",
    "formula": "base + level * per_level",
    "params": {
      "base": 500,
      "per_level": 500
    },
    "description": "Capacité maximale de vaisseaux en orbite"
  },
  {
    "type": "storage_capacity",
    "resource": "all",
    "formula": "base * growth^level",
    "params": {
      "base": 600000,
      "growth": 1.6
    },
    "description": "Augmente le plafond de stockage de toutes les ressources"
  },
  {
    "type": "cargo_capacity_bonus",
    "ship": "transporter",
    "formula": "1.0 + level * 0.05",
    "description": "Augmente la capacité de cargo des transporteurs"
  },
  {
    "type": "hull_bonus_fleet",
    "formula": "level * 0.10",
    "description": "Augmente la structure de tous les vaisseaux en combat"
  },
  {
    "type": "unlock_ship",
    "ship_key": "heavy_hunter",
    "required_level": 5,
    "description": "Débloque la construction du Chasseur Lourd au niveau 5"
  },
  {
    "type": "colony_slots",
    "formula": "floor(level / 2)",
    "description": "Débloque des emplacements de colonisation supplémentaires"
  },
  {
    "type": "build_queue_slots",
    "target_category": "facilities",
    "formula": "1 + level",
    "description": "Augmente le nombre de slots de file de construction pour les installations"
  }
]
```

#### Format des effets de Tech (différent : basé sur niveau relatif)

```json
[
  {
    "type": "combat_attack_bonus",
    "formula": "1.0 + level * 0.10",
    "description": "+10% puissance d'attaque par niveau"
  },
  {
    "type": "combat_shield_bonus",
    "formula": "1.0 + level * 0.10",
    "description": "+10% résistance des boucliers par niveau"
  },
  {
    "type": "combat_hull_bonus",
    "formula": "1.0 + level * 0.10",
    "description": "+10% points de structure par niveau"
  },
  {
    "type": "production_bonus",
    "resource": "all_mines",
    "formula": "1.0 + level * 0.01",
    "description": "+1% production de toutes les mines par niveau"
  },
  {
    "type": "ship_speed_bonus",
    "ship_class": "combustion",
    "formula": "base_speed + level * 500",
    "description": "Augmente la vitesse des vaisseaux à combustion"
  }
]
```

#### Format des Synergies

```json
-- Exemple: plasma_tech améliore les mines de métal
INSERT INTO building_tech_synergy (building_key, tech_key, effect_type, formula, description) VALUES
  ('metal_mine',     'plasma_tech',  'production_bonus',  '1.0 + tech_level * 0.01', '+1% production métal par niveau Plasma Tech'),
  ('crystal_mine',   'plasma_tech',  'production_bonus',  '1.0 + tech_level * 0.01', '+1% production cristal par niveau Plasma Tech'),
  ('deuterium_mine', 'energy_tech',  'production_bonus',  '1.0 + tech_level * 0.01', '+1% production deutérium par niveau Energy Tech'),
  ('solar_plant',    'energy_tech',  'energy_bonus',      '1.0 + tech_level * 0.10', '+10% énergie solaire par niveau Energy Tech'),
  ('fusion_plant',   'energy_tech',  'energy_bonus',      '1.0 + tech_level * 0.15', '+15% énergie fusion par niveau Energy Tech'),
  ('hangar',         'computer_tech','cargo_bonus',        '1.0 + tech_level * 0.10', '+10% cargo transporteur par niveau Computer Tech');
```

### 3.3 Moteur d'Effets en Rust

```rust
// Pseudo-code de l'architecture cible

pub enum EffectType {
    ResourceProduction { resource: ResourceType, base: f64, growth: f64 },
    EnergyProduction   { base: f64, growth: f64 },
    EnergyConsumption  { base: f64, growth: f64 },
    BuildTimeReduction { target: BuildTarget, per_level: f64, max: f64 },
    ResearchTimeReduction { per_level: f64, max: f64 },
    FleetCapacity      { base: i32, per_level: i32 },
    StorageCapacity    { base: f64, growth: f64 },
    CargoBonus         { ship: ShipClass, per_level: f64 },
    HullBonusFleet     { per_level: f64 },
    BuildQueueSlots    { category: BuildCategory, formula: SlotFormula },
    ColonySlots        { per_levels: i32 },
    UnlockShip         { ship_key: String, at_level: i32 },
}

pub struct BuildingEffects {
    pub building_key: String,
    pub level:        i32,
    pub effects:      Vec<EffectType>,
    pub synergies:    Vec<SynergyEffect>,  // Chargés depuis building_tech_synergy
}

impl BuildingEffects {
    pub fn apply_to_planet(&self, planet: &PlanetState, techs: &TechState) -> PlanetModifiers {
        // Itère sur les effets, applique les formules, retourne le delta
    }
}
```

### 3.4 Cache et Hot-Reload

**Architecture du cache :**

```
DB building_type.effects_json
        |
        v
BuildingEffectsCache (Arc<RwLock<HashMap<String, BuildingEffects>>>)
        |                                          |
        |  loaded at startup                       |  hot-reload via API
        |                                          |
     game tick                              PATCH /admin/building-definitions/:key
     planet handler                               |
     upgrade handler                              v
                                         cache.invalidate(key)
                                         cache.reload_from_db(key)
```

**Endpoint de hot-reload :**

```
PATCH /admin/building-definitions/:key
Content-Type: application/json

{
  "effects_json": [...],
  "description": "Nouvelle description",
  "base_cost_metal": 1000
}

Response 200 : { "key": "fusion_plant", "reloaded_at": "2026-03-12T..." }
```

**Cache TTL :** Les valeurs de config (productions, formules) sont rechargées tous les 5 minutes (configurable via `building_effects_cache_ttl_seconds`). Les modifications admin forcent un rechargement immédiat via invalidation.

---

## 4. Nouveaux Bâtiments Proposés

### 4.1 Fusion Plant (Correctif Fantome Existant)

**Statut** : Existe en DB mais est un fantome. Priorité maximale.

| Paramètre | Valeur |
|---|---|
| `building_key` | `fusion_plant` |
| Coût base (DB actuelle) | 900 M / 360 C / 180 D, mult 1.8 |
| Prérequis | `energy_tech` Nv.3 |
| Consommation deuterium | `30 * level * 1.05^level` D/h |
| Effet | Énergie : `150 * level * 1.05^level * (1 + energy_tech * 0.15)` |
| ROI énergétique | 1 MW fusion = ~3 MW solaire à niveaux équivalents, mais consomme deutérium |
| Rôle gameplay | Transition solaire → fusion pour les joueurs avancés. Libère les slots solaires pour le Crystal (biome désertique). |

**Formule mathématique :**
- Solaire Nv.20 = `60 * 20 * 1.1^20 = 7,635` énergie (pas de consommation)
- Fusion Nv.10 (energy_tech=5) = `150 * 10 * 1.05^10 * 1.75 = 4,260` énergie, consomme `30 * 10 * 1.05^10 = 489` D/h
- Décision stratégique : fusion intéressante uniquement si la mine de deutérium est développée (glaciaire idéal)

**Implementation requise :**
- Modifier `calculate_energy_ratio` pour accepter `fusion_plant_level` et `deuterium_consumed_by_fusion`
- Ajouter la consommation de deutérium au tick de production
- Modifier `calculate_energy_production` pour additionner solaire + fusion

### 4.2 Nanite Factory (Correctif Fantome Existant)

**Statut** : Existe en DB mais est un fantome. Priorité haute.

| Paramètre | Valeur |
|---|---|
| `building_key` | `nanite_factory` |
| Coût base (DB actuelle) | 1,000,000 M / 500,000 C / 100,000 D, mult 2.0 |
| Prérequis | `computer_tech` Nv.10 + `shipyard` Nv.10 |
| Effet construction | Réduit temps de construction bâtiments : `-10% * level` additionnel (stacke avec shipyard) |
| Effet vaisseaux | Réduit temps production vaisseaux : `-5% * level` additionnel |
| Effet file attente | Débloque +1 slot de file par niveau de nanite_factory |
| Rôle gameplay | Bâtiment de fin de partie. Coût prohibitif mais transforme la rapidité de développement. |

**Note économique :** Au niveau 1, la nanite_factory coûte ~1.9M ressources totales. Au rythme d'une mine Nv.20 (≈2,800 M/h + ≈1,900 C/h), c'est 310 heures de production uniquement pour le niveau 1. Le facteur multiplicateur 2.0 est excessif — recommander de passer à 1.5 pour que le niveau 5 reste atteignable.

**Implementation requise :**
- Modifier `get_build_time` pour lire `nanite_factory_level` depuis la DB
- Modifier `get_ship_production_time` pour le bonus additionnel
- Modifier `get_category_slots` pour lire le niveau de la nanite_factory du joueur

### 4.3 Orbital Defense Array (NOUVEAU)

| Paramètre | Valeur |
|---|---|
| `building_key` | `orbital_defense_array` |
| Coût base | 5,000 M / 8,000 C / 2,000 D, mult 1.6 |
| Prérequis | `shield_tech` Nv.3 + `shipyard` Nv.4 |
| Effet | Augmente les boucliers de TOUTES les défenses planétaires de `level * 5%` |
| Effet secondaire | Régénère `level * 2%` des boucliers détruits à chaque round de combat |
| Max level | 15 |
| Rôle gameplay | Récompense les "Tortues" (défenseurs purs). Rend les fortifications viables face aux flottes massives. |

**Justification design :** Dans OGame, les défenses sont la béquille des joueurs en vacances. L'Orbital Defense Array crée une asymétrie défensive intéressante : un défenseur ayant investi dans cette installation transforme ses défenses en bastion crédible. Le ratio attaque/défense se rééquilibre sans nerf les raiders.

**Formule de régénération :**
```
shields_regenerated_per_round = destroyed_shield_this_round * (array_level * 0.02)
```
Cette régénération s'applique ENTRE les rounds, ce qui crée une tension stratégique : les attaquants doivent briser les boucliers plus vite que l'array ne les régénère.

### 4.4 Quantum Research Hub (NOUVEAU)

| Paramètre | Valeur |
|---|---|
| `building_key` | `quantum_research_hub` |
| Coût base | 1,500 M / 3,000 C / 1,000 D, mult 1.8 |
| Prérequis | `research_lab` Nv.7 + `energy_tech` Nv.5 |
| Effet 1 | Réduit les temps de recherche de `-5% * level` ADDITIONNEL (stacke avec research_lab) |
| Effet 2 | Permet la recherche en parallèle sur UNE autre planète de l'empire à `level >= 5` |
| Max level | 10 |
| Rôle gameplay | Différencie les planètes de recherche des planètes de production. Core du "empire management" multi-planètes. |

**Justification design :** La mécanique de recherche partagée inter-planètes à partir du niveau 5 du Quantum Hub est le "hook" qui transforme la possession de colonies en nécessité stratégique plutôt que simple expansion territoriale. Le joueur doit décider : "quelle planète sera mon hub de recherche ?".

### 4.5 Gravitational Shield (NOUVEAU)

| Paramètre | Valeur |
|---|---|
| `building_key` | `gravitational_shield` |
| Coût base | 0 M / 10,000 C / 5,000 D, mult 2.0 |
| Prérequis | `graviton_tech` Nv.3 + `hyperspace_tech` Nv.5 |
| Effet | Réduit les ressources volables par les raiders de `level * 3%` (cap à 30%) |
| Effet secondaire | Ralentit les flottes entrantes : +`level * 5%` temps de vol pour les attaquants |
| Max level | 10 |
| Rôle gameplay | Donne de la valeur à `graviton_tech` (actuellement fantome). Crée un counter-play aux stratégies de raid pur. Un raider doit peser le retard de vol contre le gain potentiel. |

**Note de balance :** Le ralentissement des flottes est une mécanique délicate. Il ne doit PAS s'appliquer aux flottes alliées ni aux missions de transport. Il ralentit uniquement les `fleet_mission` de type `attack`. L'implémentation lit le `gravitational_shield_level` de la planète cible au moment de la création de la mission et ajoute le délai sur `arrival_time`.

### 4.6 Terraformer (Correctif Fantome Existant)

**Statut** : Existe en DB mais est un fantome. Priorité moyenne (nécessite mécanique de slots planétaires).

| Paramètre | Valeur |
|---|---|
| `building_key` | `terraformer` |
| Coût base (DB actuelle) | 0 M / 50,000 C / 100,000 D, mult 2.0 |
| Prérequis | `energy_tech` Nv.12 |
| Effet | +2 slots de bâtiments disponibles par niveau |
| Max planète sans terraformer | 16 slots (hardcoded) |
| Max level | 5 (donc +10 slots max, total 26 slots) |
| Rôle gameplay | Bâtiment de très long terme qui permet des empires économiques extrêmes. Crée une pression sur l'espace planétaire — forçant des choix. |

**Implementation requise :**
- Ajouter colonne `max_building_slots` à la table `planet` (default 16)
- Le terraformer incrémente `max_building_slots` lors de sa construction
- Le système de construction vérifie que le nombre total de bâtiments < `max_building_slots`
- Cette mécanique est la plus lourde à implémenter mais la plus transformatrice pour le game design

---

## 5. Matrice de Synergies Bâtiment x Tech

Cette matrice définit les règles de la table `building_tech_synergy`. Toutes les formules sont exprimées du point de vue du joueur final (bonus multiplicatif ou additif).

```
B = building_level, T = tech_level
```

| Bâtiment | Tech | Type Synergie | Formule | Effet Concret |
|---|---|---|---|---|
| `metal_mine` | `plasma_tech` | `production_bonus` | `1 + T * 0.01` | +1% prod métal par nv Plasma |
| `crystal_mine` | `plasma_tech` | `production_bonus` | `1 + T * 0.01` | +1% prod cristal par nv Plasma |
| `deuterium_mine` | `plasma_tech` | `production_bonus` | `1 + T * 0.01` | +1% prod deutérium par nv Plasma |
| `solar_plant` | `energy_tech` | `energy_bonus` | `1 + T * 0.10` | +10% énergie par nv Energy Tech |
| `fusion_plant` | `energy_tech` | `energy_bonus` | `1 + T * 0.15` | +15% énergie fusion par nv (prime deutérium) |
| `metal_mine` | `energy_tech` | `production_bonus` | `1 + T * 0.01` | Bonus indirect via ratio énergie (déjà existant) |
| `hangar` | `computer_tech` | `cargo_bonus` | `1 + T * 0.10` | +10% cargo transporteur par nv Computer |
| `shipyard` | `computer_tech` | `build_time_reduction` | `T * 0.005` | -0.5% temps construction vaisseaux par nv Computer |
| `research_lab` | `plasma_tech` | `research_time_reduction` | `T * 0.01` | -1% temps recherche par nv Plasma (récompense l'écologie) |
| `orbital_defense_array` | `shield_tech` | `defense_shield_bonus` | `1 + T * 0.05` | +5% boucliers défenses par nv Shield Tech |
| `quantum_research_hub` | `hyperspace_tech` | `research_scope_bonus` | `T >= 5` | Débloque la recherche inter-planètes (binary condition) |
| `gravitational_shield` | `graviton_tech` | `slow_multiplier` | `1 + B * 0.05 * (T / 5)` | Ralentissement proportionnel au niveau de graviton_tech |
| `nanite_factory` | `computer_tech` | `build_time_reduction` | `T * 0.01` | -1% temps construction par nv Computer (additionnel) |
| `terraformer` | `energy_tech` | `slot_efficiency` | `B * 2 + floor(T / 12)` | Slots bonus légèrement amplifiés avec Energy Tech très haut |

### Note sur l'implémentation des synergies

Les synergies ne remplacent PAS les effets directs des techs (weapons, armour, shield en combat). Elles créent des **effets croisés économiques** qui récompensent les joueurs qui investissent dans une direction cohérente.

Exemple : un joueur qui monte `plasma_tech` + mines de métal haut niveau aura une production meilleure qu'un joueur qui fait l'un sans l'autre. C'est du design "multiplication d'investissements" typique des bons browser games.

---

## 6. Plan de Migration

### Principe de Migration Zéro-Interruption

La migration suit le principe "strangler fig" : l'ancien code coexiste avec le nouveau pendant la transition. Les effets hardcoded restent en place et les effets data-driven s'ajoutent par-dessus. Une fois les deux alignés, le code hardcoded est supprimé.

### Phase 1 — Correctifs Fantomes Critiques (Sprint 1 : 3-5 jours)

**Priorité** : Éviter que des joueurs continuent d'investir dans des bâtiments sans effets.

```
1. fusion_plant — Implémenter l'effet énergie
   - Modifier calculate_energy_ratio() pour accepter fusion_level
   - Modifier calculate_energy_production() pour additionner fusion
   - Ajouter consommation deutérium de la fusion au tick
   - Ajouter fusion_plant_level au GET /planets/:id
   - Modifier ResourceDisplay.tsx pour afficher la centrale fusion
   - Test : vérifier que fusion Nv.5 produit ~500 énergie supplémentaire

2. nanite_factory — Implémenter les slots de file + réduction temps
   - Modifier get_category_slots() pour lire nanite_factory_level du joueur
   - Modifier get_build_time() pour appliquer bonus nanite (additionnel au shipyard)
   - Test : vérifier qu'un joueur avec nanite Nv.1 a +1 slot de file facilities

3. Alerte frontend pour bâtiments non implémentés
   - Ajouter un badge "EN DÉVELOPPEMENT" sur alliance_depot, missile_silo, terraformer
   - Ne pas bloquer le jeu mais informer le joueur
```

### Phase 2 — Schéma DB Data-Driven (Sprint 2 : 2-3 jours)

```
1. Migration SQL : ALTER TABLE building_type ADD COLUMN effects_json
2. Migration SQL : ALTER TABLE technologies ADD COLUMN effects_json
3. Migration SQL : CREATE TABLE building_tech_synergy
4. Seed : remplir effects_json pour tous les bâtiments existants
5. Seed : remplir building_tech_synergy avec les synergies Phase 1 (plasma, energy)
```

### Phase 3 — Moteur d'Effets (Sprint 3 : 5-7 jours)

```
1. Créer struct Effect et enum EffectType en Rust
2. Implémenter le parser JSON → EffectType
3. Implémenter BuildingEffectsCache avec hot-reload
4. Adapter game_logic.rs pour utiliser le cache en LECTURE
   (les fonctions hardcoded restent mais lisent depuis le cache si disponible)
5. Endpoint PATCH /admin/building-definitions/:key
6. Tests unitaires : vérifier que les effets JSON produisent les mêmes
   résultats que le code hardcoded actuel
```

### Phase 4 — Corrections de Descriptions Frontend (Sprint 4 : 1-2 jours)

```
1. Shipyard : mettre à jour la description pour mentionner la réduction bâtiments
2. Research Lab : préciser "Réduit de 7% par niveau, maximum -55%"
3. Hangar : mentionner le bonus cargo des transporteurs
4. Deuterium mine : corriger le fallback hardcoded (base=10 → base=15)
   dans ResourceDisplay.tsx
5. Unifier energy_tech_bonus : renommer en backend
   - energy_tech_energy_bonus = 0.10 (pour le solar plant)
   - energy_tech_production_bonus = 0.01 (pour les mines)
   ET mettre à jour les clés dans server_config en DB
```

### Phase 5 — Nouveaux Bâtiments (Sprint 5-6 : 7-10 jours)

```
1. Orbital Defense Array
   - Migration : INSERT INTO building_type
   - Modifier simulate_pvp_combat pour lire orbital_defense_array_level
   - Implémenter la régénération de boucliers inter-rounds
   - Frontend : thème design pour le bâtiment (couleur bleu-électrique)

2. Quantum Research Hub
   - Migration : INSERT INTO building_type
   - Modifier get_research_time pour additionner le bonus Hub
   - Ajouter la mécanique de recherche inter-planètes (niveau 5+)
   - Frontend : indicateur "Recherche partagée" dans TechTreeVisual

3. Gravitational Shield
   - Migration : INSERT INTO building_type
   - Modifier attack_v2 handler pour lire gravitational_shield de la cible
   - Appliquer le délai de vol à arrival_time
   - Frontend : afficher le ralentissement dans GalaxyView
```

### Phase 6 — Terraformer et Slots Planétaires (Sprint 7-8 : 5-7 jours)

```
1. Ajouter colonne max_building_slots à planet (default 16)
2. Migration de backfill : toutes les planètes existantes = 16
3. Modifier upgrade_mine_handler pour vérifier max_building_slots
4. Implémenter l'effet du terraformer (incrémente max_building_slots)
5. Frontend : afficher le compteur de slots dans PlanetOverview
6. Frontend : retirer le badge "EN DÉVELOPPEMENT" du terraformer
```

### Rollback Plan

Chaque phase dispose d'une migration `down()` dans SeaORM. Les colonnes `effects_json` ajoutées en ALTER TABLE sont nullable, donc leur suppression n'affecte pas les données existantes. Le code Rust suit un pattern "fallback to hardcoded if effects_json is null or empty", garantissant que le jeu reste fonctionnel même si la colonne est vide.

---

## 7. Backlog Priorisé

### Sprint 1 — Correctifs Critiques (Impact joueurs immédiat)

| # | Tâche | Effort | Impact |
|---|---|---|---|
| 1.1 | Implémenter fusion_plant dans calculate_energy_ratio | 4h | Critique — bâtiment payant sans effet |
| 1.2 | Implémenter nanite_factory (slots de file) | 3h | Critique — bâtiment payant sans effet majeur |
| 1.3 | Corriger divergence deuterium base (10 vs 15) dans ResourceDisplay.tsx | 1h | Important — ROI affiché incorrectement |
| 1.4 | Renommer energy_tech_bonus en deux clés distinctes | 2h | Important — confusion code |
| 1.5 | Badges "EN DÉVELOPPEMENT" frontend pour les fantomes non prioritaires | 2h | UX — ne pas tromper les joueurs |

### Sprint 2 — Infrastructure Data-Driven (Fondation)

| # | Tâche | Effort | Impact |
|---|---|---|---|
| 2.1 | Migration SQL : effects_json sur building_type et technologies | 3h | Infrastructure |
| 2.2 | Migration SQL : building_tech_synergy | 2h | Infrastructure |
| 2.3 | Seed SQL : remplir effects_json pour tous les bâtiments existants | 4h | Infrastructure |
| 2.4 | Struct Effect + parser JSON en Rust | 6h | Infrastructure |
| 2.5 | BuildingEffectsCache + hot-reload | 5h | Infrastructure |
| 2.6 | Endpoint PATCH /admin/building-definitions/:key | 3h | Admin |
| 2.7 | Tests unitaires moteur d'effets | 4h | Qualité |

### Sprint 3 — Descriptions & UX Frontend

| # | Tâche | Effort | Impact |
|---|---|---|---|
| 3.1 | Corriger descriptions shipyard, research_lab, hangar | 2h | UX |
| 3.2 | Afficher les effets depuis la DB dans Facilities.tsx | 4h | UX — dynamique |
| 3.3 | Afficher les synergies dans TechTreeVisual | 3h | UX — informatif |
| 3.4 | Ajouter fusion_plant dans ResourceDisplay (section énergie) | 3h | UX |

### Sprint 4-5 — Nouveaux Bâtiments

| # | Tâche | Effort | Impact |
|---|---|---|---|
| 4.1 | Orbital Defense Array — backend combat | 6h | Game design — défenseurs |
| 4.2 | Orbital Defense Array — frontend | 3h | Game design |
| 4.3 | Quantum Research Hub — réduction recherche | 4h | Game design — chercheurs |
| 4.4 | Quantum Research Hub — recherche inter-planètes | 8h | Game design — endgame |
| 4.5 | Gravitational Shield — ralentissement attaquants | 5h | Game design — balance |

### Sprint 6-7 — Long Terme

| # | Tâche | Effort | Impact |
|---|---|---|---|
| 6.1 | Terraformer — slots planétaires | 8h | Game design — late game |
| 6.2 | Alliance Depot — ravitaillement allié | 10h | Game design — alliances |
| 6.3 | Missile Silo — missiles interplanétaires | 12h | Game design — PvP longue portée |
| 6.4 | Synergies complètes (plasma × mines) | 4h | Balance économique |
| 6.5 | Admin panel visuel pour editing effects_json | 10h | Ops — hot-reload UX |

---

## Annexe A : Formules de Référence Actuelles (Avant Migration)

```
Production Métal (H/h)     = 30 * L * 1.1^L * (1 + E*0.01) * (1 + P*0.01) * ratio * biome * slot
Production Cristal (H/h)   = 20 * L * 1.1^L * (1 + E*0.01) * (1 + P*0.01) * ratio * biome * slot
Production Deuterium (H/h) = 15 * L * 1.1^L * (1 + E*0.01) * (1 + P*0.01) * ratio * biome * slot
Énergie Solaire            = 60 * L * 1.1^L * (1 + E*0.10)
Consommation Énergie Mine  = 10 * L * 1.1^L  (×12 pour deuterium)
Temps Construction Bât.    = 1800 * level^1.4 * cat_factor * (1 - min(S*0.08, 0.60)) / speed
Temps Recherche            = 2400 * level^1.5 * cat_factor * (1 - min(Lab*0.07, 0.55)) / speed
Capacité Flotte            = 500 + hangar * 500
Capacité Stockage          = 600,000 * 1.6^resource_storage
Coût Bâtiments             = base * mult^(level-1)   [mult 1.5 pour mines, 1.5-2.0 pour facilities]

L = level, E = energy_tech_level, P = plasma_tech_level, S = shipyard_level
```

---

## Annexe B : Questions Ouvertes pour l'Équipe

1. **Fusion Plant consommation deutérium** : La consommation de deutérium de la fusion doit-elle s'appliquer au TICK de production (donc soustraite du stock) ou comme une réduction de la production nette de deutérium ? La première option est plus fidèle à OGame, la seconde est plus simple à implémenter sans changer le schema.

=> Première option

2. **Slot planétaire max_building_slots** : La valeur de 16 slots par défaut est-elle validée ? Si des joueurs ont déjà construit plus de 16 bâtiments (improbable dans l'état actuel), la migration de backfill doit calculer le nombre réel de bâtiments par planète.

=> 16 slots par défaut

3. **Synergies : additif ou multiplicatif ?** Pour éviter l'hyperinflation, les synergies doivent-elles être additives (tous les bonus s'additionnent puis on multiplie une fois) ou multiplicatives (chaque bonus se multiplie) ? Recommandation : additif avec cap configurable.

=> Additif avec cap configurable

4. **Gravitational Shield et flottes alliées** : Le ralentissement s'applique-t-il à tous les vaisseaux entrant en orbite, ou uniquement aux missions hostiles ? Recommandation : uniquement `mission_type = "attack"`, pas `transport`, `spy`, ni `friendly_fleet`.

=> Uniquement `mission_type = "attack"`

5. **Nanite Factory multiplicateur 2.0** : Le coût actuel de 1,000,000 M en DB semble délibéré (bâtiment endgame extrême) mais le mult 2.0 rend le niveau 2 inaccessible pour tout joueur normal. Recommandation : mult → 1.5 et coût base → 500,000 M / 250,000 C / 50,000 D.

=> Pourquoi inaccessible ?
