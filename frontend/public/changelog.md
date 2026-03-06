# Changelog - Space Conquest

## [3.7.0] - 2026-03-06 - Succès & ressources

### 🐛 Corrections

#### 🏆 Succès — progrès jamais sauvegardé (bug critique)
- **Bug** : `update_achievement_progress` appelait `.update()` pour les *nouveaux* enregistrements car `active.id.is_set()` retourne `true` dans les deux cas (Sea-ORM encode `Model::into()` en `Set(...)`). Résultat : toute progression (expéditions, attaques, bâtiments...) restait éternellement à 0/N.
- **Fix** : suivi explicite d'un booléen `is_new` pour choisir `.insert()` vs `.update()`.

#### 📊 Barre de ressources — déductions invisibles
- **Bug** : la protection anti-oscillation (`Math.max`) dans `useRealtimeResources` empêchait les déductions de ressources de s'afficher dans la barre en haut — après construction de défenses/vaisseaux/recherches, les ressources semblaient ne pas diminuer.
- **Fix** : comparaison avec la valeur serveur *précédente* pour distinguer une déduction (valeur serveur en baisse) d'un simple lag de polling.

#### 🔬 Temps de recherche — niveau labo ignoré
- La clé `"research"` ne correspondait pas à la clé DB `"research_lab"` → le bonus de réduction de temps du labo de recherche était ignoré pour tous les calculs de durée.

---

## [3.6.0] - 2026-03-06 - Score, énergie & défenses

### 🐛 Corrections

#### ⚡ Énergie
- **Bug critique** : la consommation énergétique des mines affichait toujours 0 — les clés de bâtiment `"metal"/"crystal"/"deuterium"` corrigées en `"metal_mine"/"crystal_mine"/"deuterium_mine"` dans les deux endpoints planet

#### 📊 Classement — Score militaire entièrement revu
- Ancien calcul : valeurs hardcodées (Death Star = 500 pts) — incohérent et sous-estimé
- **Nouveau calcul** : basé sur les stats réelles de combat depuis la DB : `(attack + shield/2 + hull/10) / 1000` par unité
- Toutes les technologies désormais reconnues (`espionage_tech`, `hyperspace_tech`, `graviton_tech`...)
- Clés de mines corrigées dans le calcul de production (`metal_mine`, `crystal_mine`, `deuterium_mine`)
- **Ressources stockées** désormais incluses dans le score économique (1 pt / 50k métal, /33k cristal, /25k deutérium)

#### 🛡️ Bouclier Orbital (Vue Planète)
- Tous les types de défenses s'affichent maintenant en permanence (même à 0)
- Les défenses non construites apparaissent en grisé pour donner une vue complète de l'arsenal

#### 🚀 Persistance base de données
- Résolution définitive : `PGDATA=/var/lib/postgresql/data` forcé explicitement pour bypasser le chemin par défaut de postgres 18 (`/var/lib/postgresql/18/docker`)
- Bind mount sur `/opt/space-conquest/pgdata` — hors de contrôle de Coolify

---

## [3.5.0] - 2026-03-06 - Système de Tiers Missions & Succès

### ✨ Nouvelles Fonctionnalités

#### 🎯 Missions — Système de Niveaux (Tiers)
- Les missions quotidiennes s'adaptent automatiquement au niveau du joueur
- **4 tiers** basés sur le nombre de missions réclamées historiquement :
  - ⚪ **Tier 1 — Débutant** : 0–9 missions (objectifs de base)
  - 🔵 **Tier 2 — Apprenti** : 10–39 missions (×5 exigences & récompenses)
  - 💎 **Tier 3 — Vétéran** : 40–99 missions (×20 exigences & récompenses)
  - ⭐ **Tier 4 — Expert** : 100+ missions (×80 exigences & récompenses)
- 24 nouvelles missions seedées (3 tiers × 8 types)
- Badge de tier visible dans l'interface avec progression vers le tier suivant

#### 🏆 Succès — Variantes Silver & Gold
- **6 succès Silver** ajoutés : Guerrier Aguerri (100 attaques), Battant (10 victoires), Champion (50 victoires), Explorateur Chevronné (100 expéditions), Grand Architecte (50 bâtiments), Espion d'Élite (50 missions espionnage)
- **6 succès Gold** ajoutés : Seigneur de Guerre (250 attaques), Invincible Légendaire (100 victoires), Pionnier Légendaire (250 expéditions), Maître Bâtisseur (200 bâtiments), Grand Amiral (500 vaisseaux), Mineur Légendaire (1M cristal)

---

## [3.4.0] - 2026-03-06 - Missions & Succès opérationnels

### 🐛 Corrections

#### 🎯 Missions Quotidiennes
- **Bug critique** : les vaisseaux d'expansion (`heavy_hunter`, `battleship`, `bomber`, `destroyer`) et toutes les défenses expansions (`light_laser`, `heavy_laser`, `gauss_cannon`, `ion_cannon`, `small_shield`, `large_shield`) ne déclenchaient aucune progression sur les missions de construction
- Mission **"Mineur assidu"** (collecter 10 000 métal) : aucune progression ne s'accumulait — hook ajouté dans le tick de production

#### 🏆 Succès / Achievements
- Achievement **"Invincible"** (25 victoires) : les victoires en combat n'étaient jamais comptabilisées
- Achievement **"Conquérant suprême"** (conquérir une planète) : jamais déclenché — désormais tracké à la résolution du combat
- Achievement **"Amiral"** (100 vaisseaux simultanément) : jamais mis à jour — comptage réel de la flotte après chaque construction

---

## [3.3.0] - 2026-03-06 - Corrections Score & Construction

### 🐛 Corrections

#### 🏆 Classement / Score Militaire
- **Bug corrigé** : les défenses (lasers, canons, tourelles, boucliers) ne contribuaient pas au score militaire — seuls `missile_launcher` et `plasma_turret` étaient comptés
- Désormais toutes les défenses contribuent au score proportionnellement à leur coût de construction
- 500 lasers lourds construits = +4 000 points militaires

#### 🏗️ Temps de Construction Infrastructures
- Réduit le multiplicateur de coût des bâtiments d'infrastructure (hangar, chantier spatial, laboratoire, silo) de `×2.0^niveau` à `×1.5^niveau`
- Au niveau 25, les coûts sont divisés par ~541 — un hangar 25→26 passe de plusieurs millénaires à quelques jours

#### 🚀 Capacité Hangar — Nouveaux Vaisseaux
- Les vaisseaux d'expansion (`heavy_hunter`, `battleship`, `bomber`, `destroyer`) bypas­saient la limite de capacité du hangar
- Ils sont maintenant correctement comptabilisés dans le check de capacité

---

## [3.2.0] - 2026-03-06 - Corrections Sécurité & Infrastructure

### 🐛 Corrections

#### ⚔️ Combat
- Correction du test unitaire `test_simultaneous_damage_defender_fires_back` : valeur d'attaque du cache de test corrigée (200→100), le test valide maintenant correctement les dégâts simultanés

#### 🔬 Recherche Technologique (Exploit Fix)
- **Exploit bloqué** : il n'est plus possible de mettre en file d'attente plusieurs niveaux de la même technologie simultanément
- Empêche le schéma : lancer niv 8 + niv 9, annuler niv 8, tech passe de 7 → 9 directement
- Protection double : handler (`upgrade_mine_handler`) bloque le second ajout en queue + tick system ne peut avancer un niveau que de +1 à la fois

#### 🗄️ Infrastructure Docker/Coolify
- Volumes Docker avec noms explicites globaux (`space_conquest_pgdata`, `space_conquest_redisdata`, `space_conquest_pgadmin_data`)
- Empêche la création de nouveaux volumes vides lors d'un redéploiement Coolify si le nom du projet Compose change

---

## [3.1.0] - 2026-03-06 - Aperçu Coût/Temps/Gain avant Construction

### ✨ Nouvelles Fonctionnalités UI

#### 🚀 Chantier Spatial (Shipyard)
- Affichage du **temps de production total** adaptatif selon la quantité choisie
- Le temps est calculé en temps réel en tenant compte du `speed_factor` et du `construction_speed` serveur

#### 🛡️ Défenses
- Affichage du **coût en Deutérium** (était absent — bug corrigé)
- La vérification `canAfford` inclut désormais le deutérium
- Affichage du **temps de construction total** adaptatif selon la quantité
- Le temps tient compte du `speed_factor` serveur

#### 🔬 Arbre Technologique (TechTree)
- Affichage de la **durée de recherche** pour le prochain niveau (déjà calculée côté serveur, maintenant exposée en frontend)
- Affichage du **gain par niveau** pour chaque technologie (ex: `+10% attaque des vaisseaux`, `+1 slot de colonie`, etc.)

---

## [3.0.0] - 2026-03-06 - Suppression Colonnes Legacy & Refactoring Base de Données

### 🏗️ Refactoring Architecture

#### 🗄️ Suppression des Colonnes Legacy de la Table `planet`
**Breaking Change (interne)**: Toutes les colonnes directes de niveaux/compteurs ont été supprimées de la table `planet`.

**Colonnes supprimées**:
- Niveaux de bâtiments: `metal_mine_level`, `crystal_mine_level`, `deuterium_mine_level`, `solar_plant_level`, `shipyard_level`, `research_lab_level`, `hangar_level`, `resource_storage_level`
- Niveaux de technologies: `energy_tech_level`, `laser_battery_level`, `espionage_tech_level`, `armour_tech_level`
- Compteurs de vaisseaux: `light_hunter_count`, `cruiser_count`, `recycler_count`, `spy_probe_count`, `colony_ship_count`, `transporter_count`
- Compteurs de défenses: `missile_launcher_count`, `plasma_turret_count`
- Champs legacy de construction: `construction_end`, `construction_type`, `shipyard_construction_end`, `pending_fleet_type`, `pending_fleet_count`

**Remplacement**: Toutes les données vivent exclusivement dans les tables relationnelles:
- `planet_buildings` — niveaux de bâtiments
- `planet_technologies` — niveaux de technologies
- `planet_ships` — compteurs de vaisseaux
- `planet_defenses` — compteurs de défenses

**Impact utilisateur**: Aucun — les interfaces et calculs restent identiques.

---

#### 🔧 Corrections Backend
- `admin.rs`: L'endpoint `/admin/planet/:id` retourne maintenant les données complètes (bâtiments, techs, vaisseaux, défenses) issues des tables relationnelles
- `game_logic.rs`: `calculate_planet_points` utilise les tables relationnelles
- `tick_system.rs`: Suppression des mises à jour de colonnes legacy (rétrocompatibilité)
- `auth.rs`: Création de planète initialise les bâtiments dans `planet_buildings`
- Bug fix: `AdminPanel` — champ `research_level` corrigé en `research_lab_level`
- Bug fix: `GalaxyView` — `colony_ship_count` lit correctement `ships.colony_ship.count`

---

## [2.4.0] - 2026-01-26 - Amélioration des Tables Relationnelles & Missions de Colonisation

### 🛠️ Corrections & Améliorations

#### ⏱️ Timer de Recherche TechTree
**Fix**: Le timer dans l'arbre technologique fonctionne maintenant correctement

**Détails**:
- Utilise maintenant `research_queue` au lieu de `construction_queue`
- Ajout de `end_time` dans la réponse API `research_queue`
- Affichage du temps restant en temps réel

---

#### 📊 Cohérence des Tables Relationnelles
**Fix**: Tous les composants utilisent maintenant les helpers de tables relationnelles

**Composants mis à jour**:
- `PlanetOverview.tsx` - Utilise `getBuildingLevel()` pour tous les niveaux
- `MyPlanets.tsx` - Points de planète depuis l'API backend
- `EmpireBar.tsx` - Production calculée avec niveaux relationnels
- `ProductionStats.tsx` - Statistiques cohérentes
- `Shipyard.tsx` - Capacité hangar depuis `getBuildingLevel()`
- Profil/Statistiques - Flotte et défenses depuis tables relationnelles

**Helpers utilisés**:
- `getBuildingLevel(planet, 'building_key')` - Niveau de bâtiment
- `getShipCount(planet, 'ship_key')` - Comptage de vaisseaux
- `getTechLevel(planet, 'tech_key')` - Niveau de technologie

---

#### 🚀 Système de Points Amélioré
**Feature**: Calcul des points côté backend avec formule complète

**Détails**:
- Points économiques (bâtiments, production)
- Points militaires (vaisseaux, défenses)
- Points de recherche (technologies)
- API `/my-planets` retourne `points`, `economy_points`, `military_points`

---

#### 🛸 Affichage Complet des Vaisseaux
**Feature**: Tous les types de vaisseaux sont maintenant visibles

**Nouveaux vaisseaux affichés**:
- Chasseurs Lourds (`heavy_hunter`)
- Vaisseaux de Guerre (`battleship`)
- Destructeurs (`destroyer`)
- Bombardiers (`bomber`)
- Étoile de la Mort (`deathstar`)

Les vaisseaux avancés s'affichent uniquement si le joueur en possède.

---

#### 🌍 Missions de Colonisation avec Temps de Trajet
**Feature**: La colonisation est maintenant une mission avec temps de voyage

**Détails**:
- Calcul de la distance source → cible
- Temps de trajet basé sur la distance (1.5x plus lent que vaisseaux normaux)
- Création d'une `fleet_mission` de type "colonize"
- La planète est créée à l'arrivée de la mission
- Vérification de l'emplacement libre à l'arrivée
- Affichage du temps d'arrivée estimé

---

#### 💬 Chat Galactique
**Feature**: Canal de discussion pour tous les joueurs

**Détails**:
- Nouvel onglet "Galactique" dans la messagerie
- Messages en temps réel via WebSocket
- Historique des 100 derniers messages
- Interface similaire à un chat (pas email)

**Fichiers**:
- `backend/src/entities/global_chat_message.rs` - Entité message
- `backend/src/messaging.rs` - Handlers chat global
- `frontend/src/components/MessagesView.tsx` - Interface UI

---

### 📝 Notes Techniques

- Le temps de construction minimum est de 10 secondes (configurable via `construction_speed_multiplier`)
- Les défenses utilisent `getShipCount()` qui vérifie aussi `planet.defenses`
- Le chat galactique utilise `broadcast_global()` pour envoyer à tous les clients connectés

---

## [2.3.0] - 2026-01-21 - Système de Protection Débutant & Panel Admin

### 🛡️ Nouvelles Fonctionnalités

#### 🆕 Système de Protection Débutant
**Feature**: Protection automatique pour les nouveaux joueurs

**Détails**:
- **Bouclier de 3 jours**: Tous les nouveaux comptes bénéficient d'une protection automatique de 3 jours
  - Impossible d'être attaqué pendant cette période
  - Compte à rebours visible dans l'interface
  - Badge animé indiquant la protection active
- **Zone Débutant**: La galaxie 1 est désormais une zone protégée
  - Les planètes dans cette galaxie ne peuvent pas être attaquées
  - Badge "Zone Débutant" visible sur les planètes concernées
- **Restrictions d'attaque par points**:
  - Ratio minimum: 0.2 (impossible d'attaquer un joueur avec moins de 20% de vos points)
  - Ratio maximum: 5.0 (impossible d'attaquer un joueur avec plus de 500% de vos points)
  - Système équitable encourageant les combats équilibrés

**Visibilité**:
- Badges de protection affichés dans:
  - Vue galaxie (carte et liste)
  - Classement des joueurs
  - Profils des joueurs
- Affichage des points totaux et du temps de protection restant
- Animations et indicateurs visuels clairs

**Fichiers**:
- `backend/src/protection.rs` - Logique de protection
- `frontend/src/components/BeginnerProtectionBadge.tsx` - Badge UI
- Migration base de données pour les nouveaux champs

---

#### ⚙️ Panel Admin - Gestion du Contenu
**Feature**: Interface d'administration complète pour gérer le contenu du jeu

**Détails**:
- **Gestion des vaisseaux**:
  - Créer, modifier, supprimer des types de vaisseaux
  - Configuration des coûts, statistiques, prérequis
  - Temps de construction personnalisables
- **Gestion des bâtiments**:
  - CRUD complet pour tous les types de bâtiments
  - Configuration des bonus de production
  - Gestion des prérequis et dépendances
- **Gestion des défenses**:
  - Ajout/modification des systèmes défensifs
  - Statistiques de combat personnalisables
- **Interface intuitive**:
  - Édition en ligne
  - Confirmations de suppression
  - Onglets organisés (Vaisseaux, Bâtiments, Défenses)

**Accès**: Réservé aux administrateurs avec rôle "admin"

**Fichiers**:
- `backend/src/admin_content.rs` - API CRUD
- `frontend/src/components/AdminContentManager.tsx` - Interface UI

---

#### 📊 Mise à Jour Automatique des Points
**Feature**: Calcul et mise à jour périodique des points des joueurs

**Détails**:
- Recalcul automatique après chaque construction/recherche
- Prise en compte de:
  - Ressources stockées (divisées par 1000)
  - Niveaux des bâtiments (multiplicateurs selon le type)
  - Flottes (valeur des vaisseaux × quantité)
  - Technologies
- Mise à jour dans le système de tick (toutes les 10 secondes)
- Garantit des restrictions d'attaque toujours à jour

**Fichiers**:
- `backend/src/tick_system.rs` - Fonction update_all_user_points

---

### 🐛 Corrections

#### 🔧 Correction du Mot Réservé "protected"
**Problème**: Erreur de build causée par l'utilisation du mot réservé JavaScript "protected"

**Solution**: Renommé en "hasProtection" dans le composant BeginnerProtectionBadge

---

## [2.2.1] - 2026-01-21 - Rapports de Combat Améliorés & Système d'Attaque Dynamique

### 🎯 Nouvelles Fonctionnalités

#### 🎬 Intégration du Replay de Combat
**Feature**: Visualisation animée des combats avec le composant CombatReplay

**Détails**:
- Bouton "Voir le replay" ajouté dans tous les rapports de combat détaillés
- Compatible avec tous les types de rapports:
  - Combats PvP (attaque/défense)
  - Expéditions
  - Conquêtes de planètes
- Affichage modal remplaçant le rapport détaillé lors du visionnage

**Fichiers**:
- `frontend/src/components/CombatModal.tsx` - Ajout bouton replay et logique d'affichage

---

#### 📊 Composition Détaillée des Flottes dans les Rapports
**Feature**: Affichage complet de la composition des flottes engagées dans les combats

**Détails**:
- Nouvelle section "Composition des flottes" dans CombatModal
- Affichage pour chaque vaisseau:
  - Nombre initial
  - Nombre restant (affiché en grand)
  - Pertes avec pourcentage
  - Nom français du vaisseau (Chasseur Léger, Croiseur, etc.)
- Deux colonnes: Flotte Attaquante (rouge) et Flotte Défensive (bleue)
- Mapping complet des noms de vaisseaux et défenses en français

**Backend**:
- Ajout de `attacker_initial`, `defender_initial` dans `PvpCombatReport`
- Inclusion des flottes initiales dans `detailed_report` JSON

**Fichiers**:
- `backend/src/combat.rs` - Structure PvpCombatReport étendue
- `backend/src/main.rs` - Inclusion des flottes dans les rapports
- `frontend/src/components/CombatModal.tsx` - Composant FleetComposition

---

#### ⚔️ Système d'Attaque PvP Dynamique
**Feature**: Attaque avec tous les types de vaisseaux disponibles

**Avant**: Limité à Chasseurs Légers, Croiseurs et Transporteurs

**Maintenant**: Sélection dynamique de TOUS les types de vaisseaux
- Cuirassés
- Destroyers
- Sondes d'Espionnage
- Recycleurs
- Vaisseaux de Colonisation
- Et tous les futurs vaisseaux ajoutés au jeu

**Interface AttackModalV2**:
- Chargement dynamique depuis `/planets/:id/ship-types`
- Contrôles +/- et bouton MAX pour chaque type
- Affichage de:
  - Nombre de vaisseaux total
  - Puissance de feu totale
  - Capacité cargo totale
- Envoi vers `/attack/v2` avec format `{fleet: {ship_key: count}}`

**Fichiers**:
- `frontend/src/components/AttackModalV2.tsx` (nouveau)
- `frontend/src/App.tsx` - Utilisation d'AttackModalV2

---

### 🐛 Corrections

#### ⏱️ Correction des Timers de Construction
**Problème**: Les timers affichaient "0s" au lieu du temps restant réel

**Cause**: Problème de fuseau horaire - `build_end_time` n'avait pas le suffixe 'Z' pour UTC

**Solution**:
```typescript
const buildEndTime = activeItem.build_end_time.endsWith('Z')
  ? activeItem.build_end_time
  : activeItem.build_end_time + 'Z';
```

**Composants corrigés**:
- `frontend/src/components/Shipyard.tsx` - Timers de vaisseaux
- `frontend/src/components/Defenses.tsx` - Timers de défenses

---

#### 📋 Rapports d'Expédition dans le Listing
**Problème**: Les rapports d'expédition V2 n'apparaissaient pas dans le listing des rapports

**Solution**: Ajout de la création de `combat_log` dans `expedition_v2_handler`

**Détails**:
- Insertion dans la table `combat_log` avec:
  - `mission_type: "expedition"`
  - `result: "victory" | "defeat" | "calm"`
  - `detailed_report` contenant logs, loot, pertes
- Calcul des pertes de vaisseaux (initial vs restant)

**Fichiers**:
- `backend/src/main.rs` - expedition_v2_handler

---

#### 🔢 Calcul des Pertes de Vaisseaux
**Amélioration**: Calcul précis des pertes dans les expéditions

**Avant**: `ships_lost: 0` (hardcodé)

**Maintenant**: Calcul réel par comparaison:
```rust
for (ship_key, &initial_count) in &payload.fleet {
    let remaining = combat_report.remaining_ships.get(ship_key).unwrap_or(0);
    ships_lost_total += initial_count - remaining;
}
```

**Fichiers**:
- `backend/src/main.rs` - expedition_v2_handler

---

### 🎨 Améliorations Visuelles

#### Noms de Vaisseaux en Français
Mapping complet ajouté dans CombatModal:
- Chasseur Léger
- Croiseur
- Transporteur
- Sonde d'Espionnage
- Recycleur
- Vaisseau de Colonisation
- Cuirassé
- Destructeur
- Étoile de la Mort
- Lanceur de Missiles
- Tourelle à Plasma
- Canon Laser
- Canon à Ions
- Canon de Gauss

---

## [2.2.0] - 2026-01-20 - Configuration Serveur Complète & Correctifs Production

### 🎯 Nouvelles Fonctionnalités

#### ⚙️ Configuration complète des mécaniques de jeu
**Feature**: 48 nouvelles valeurs configurables via le panel admin pour personnaliser toutes les mécaniques du jeu

**Paramètres configurables ajoutés**:

**Combat** (12 valeurs):
- Statistiques de combat (attaque, bouclier, coque) pour :
  - Chasseurs Légers : 50 / 10 / 400
  - Croiseurs : 400 / 50 / 2700
  - Lanceurs de Missiles : 80 / 20 / 200
  - Tourelles Plasma : 3000 / 300 / 10000
- Tir rapide (Rapid Fire) :
  - Croiseur vs Chasseur : 6 tirs
  - Croiseur vs Lanceur : 10 tirs
  - Plasma vs Chasseur : 5 tirs
  - Plasma vs Croiseur : 3 tirs
- Bonus technologiques :
  - Laser : +10% par niveau
  - Blindage : +10% par niveau

**Pillage & Débris** (3 valeurs):
- Pourcentage pillable : 50%
- Maximum par ressource : 50,000
- Pourcentage en débris : 30%

**Capacités Cargo** (4 valeurs):
- Chasseur Léger : 50 unités
- Croiseur : 800 unités
- Transporteur base : 5,000 unités
- Transporteur bonus/niveau hangar : +2,500 unités

**Expéditions** (29 valeurs):
- Chance de combat : 30%
- Rounds maximum : 6
- Récompenses Chasseurs (min/max) :
  - Métal : 50-200
  - Cristal : 25-100
  - Deutérium : 0-50
- Récompenses Croiseurs (min/max) :
  - Métal : 200-600
  - Cristal : 100-400
  - Deutérium : 0-150
- Pirates :
  - Scaling min/max : 10-100
  - Loot base : 50
  - Loot multiplier : 1.1

**Interface Admin**:
- 11 sections organisées dans le panel admin
- Édition en temps réel avec validation
- Interface colorée et organisée par catégorie
- Composant `ConfigInput` réutilisable pour cohérence visuelle

**Fichiers**:
- `backend/migration/src/m20260120_000005_add_game_mechanics_config.rs` (nouveau)
- `backend/src/game_logic.rs` (lecture config pour tous calculs)
- `backend/src/main.rs` (exposition via GET /config et expéditions)
- `frontend/src/components/AdminPanel.tsx` (7 nouvelles sections UI)

---

### 🔧 Corrections Critiques

#### 🐛 Correction erreurs NaN dans l'affichage des ressources
**Problème**: Les ressources affichaient "NaN" dans EmpireBar, ProductionStats et PlanetOverview

**Causes identifiées**:
1. Frontend calculait la production avant le chargement de la config
2. Valeurs `undefined` passées aux calculs mathématiques
3. Pas de protection contre les valeurs manquantes

**Solutions appliquées**:

**Protection Number() + fallbacks** dans tous les composants:
```typescript
// Protection contre NaN
const safeBaseFactor = Number(baseFactor) || 0;
const safeGrowthFactor = Number(growthFactor) || 1;
if (safeBaseFactor === 0) return 0;

// Appels avec valeurs par défaut
calculateProduction(
  planet.metal_mine_level || 0,
  config.production_metal_base || 30,  // fallback
  config.production_metal_growth || 1.1 // fallback
);
```

**Composants corrigés**:
- `EmpireBar.tsx` - Protection calculateProduction + fallbacks
- `ProductionStats.tsx` - Protection calculateProduction + early return
- `useRealtimeResources.ts` - Protection Number() sur tous paramètres

**Fichiers**:
- `frontend/src/components/EmpireBar.tsx` (lignes 122-150)
- `frontend/src/components/ProductionStats.tsx` (lignes 95-140)
- `frontend/src/hooks/useRealtimeResources.ts` (lignes 70-90)

---

#### 🔄 Synchronisation des noms de clés config (Backend ↔ DB)
**Problème**: Les noms de clés dans `game_logic.rs` ne correspondaient pas à ceux dans la base de données

**Clés corrigées**:
| Ancien (incorrect) | Nouveau (correct) |
|-------------------|-------------------|
| `combat_tech_laser_bonus` | `combat_laser_tech_bonus` |
| `combat_tech_armour_bonus` | `combat_armour_tech_bonus` |
| `loot_percentage` | `combat_loot_percentage` |
| `loot_max_per_resource` | `combat_loot_cap_per_resource` |
| `debris_percentage` | `combat_debris_percentage` |
| `expedition_pirate_strength_*` | `expedition_pirate_scaling_*` |

**Clés supprimées** (n'existent pas dans DB):
- `combat_tech_energy_bonus` - Pas de tech énergie pour boucliers implémentée
- Tous les paramètres d'expédition non utilisés (pertes victoire/défaite, vulnérabilités, etc.)

**Impact**: Les mécaniques de combat et d'expédition utilisent maintenant les bonnes valeurs configurables

**Fichiers**:
- `backend/src/game_logic.rs` (lignes 530-531, 614-615, 652, 674-675)

---

#### 🎨 Correction Admin Panel - Clés UI synchronisées
**Problème**: L'interface admin utilisait des noms de clés différents de ceux en DB, empêchant la sauvegarde

**Corrections**:
- Renommage de 9 clés pour correspondre au schéma DB
- Suppression de Section 12 (capacités structures) - champs non existants en DB
- Simplification section Expéditions - seulement les champs DB
- Suppression champ "Bonus Énergie" des bonus technologiques

**Exemple de correction**:
```typescript
// Avant (incorrect)
configKey="cargo_light_hunter_capacity"

// Après (correct)
configKey="cargo_light_hunter"
```

**Résultat**: Toutes les 43 valeurs configurables peuvent maintenant être sauvegardées

**Fichiers**:
- `frontend/src/components/AdminPanel.tsx` (sections 6-11)

---

### 📝 Notes techniques

**Hiérarchie des fallbacks**:
```typescript
// Ordre de priorité
1. editedConfig[key]        // Valeur en cours d'édition
2. config[key]              // Valeur DB chargée
3. hardcoded default        // Fallback si rien trouvé
```

**Calcul production avec protection**:
```typescript
// Protection complète
const safeBaseFactor = Number(baseFactor) || 0;
const safeGrowthFactor = Number(growthFactor) || 1;
const safeTechBonus = Number(techBonus) || 1;
const safeSlotBonus = Number(slotBonus) || 1;

// Early return si invalide
if (safeBaseFactor === 0) return 0;

// Calcul normal ensuite
let prod = safeBaseFactor * level * Math.pow(safeGrowthFactor, level);
prod *= safeTechBonus * energyRatio * safeSlotBonus * speedFactor;
```

**Migration des valeurs config**:
- IDs 60-107 : 48 nouvelles configurations game mechanics
- IDs 1-59 : Configurations existantes (speed, coûts, production, énergie)

---

### 🚀 Déploiement

**Migrations**: **OUI - OBLIGATOIRE**
```bash
cd migration
cargo run  # Applique m20260120_000005_add_game_mechanics_config
```

**Tests recommandés**:
1. ✅ Panel admin → Modifier combat stats → Sauvegarder → Vérifier DB
2. ✅ EmpireBar → Vérifier production affichée (pas de NaN)
3. ✅ ProductionStats → Vérifier graphiques (pas de NaN)
4. ✅ PlanetOverview → Vérifier calculs ressources (pas de NaN)
5. ✅ Expédition → Vérifier gains correspondent aux valeurs config
6. ✅ Combat PvP → Vérifier dégâts/débris/butin utilisent config

---

### 📦 Fichiers modifiés (9 fichiers)

#### Backend (5 fichiers)
- ➕ `backend/migration/src/m20260120_000005_add_game_mechanics_config.rs` - 48 nouvelles configs
- ✏️ `backend/migration/src/lib.rs` - Enregistrement migration
- ✏️ `backend/src/game_logic.rs` - Correction noms clés + lecture config
- ✏️ `backend/src/main.rs` - Exposition configs via GET /config

#### Frontend (4 fichiers)
- ✏️ `frontend/src/components/AdminPanel.tsx` - 7 sections + correction clés
- ✏️ `frontend/src/components/EmpireBar.tsx` - Protection NaN + fallbacks
- ✏️ `frontend/src/components/ProductionStats.tsx` - Protection NaN + fallbacks
- ✏️ `frontend/src/hooks/useRealtimeResources.ts` - Protection NaN complète

---

### ⚠️ Breaking Changes

**IMPORTANT**: Cette version nécessite l'exécution de la migration pour fonctionner correctement.

**Valeurs par défaut**:
- Sans migration : Le jeu continue de fonctionner avec valeurs hardcodées
- Après migration : Les valeurs deviennent configurables via panel admin

**Impact**:
- Aucun impact sur gameplay existant (valeurs par défaut identiques)
- Nouvelle capacité : Personnalisation complète des mécaniques
- Rétrocompatible : Fallback sur constantes si clé manquante

---

### 🐛 Bugs corrigés

- ✅ NaN dans EmpireBar pour métal/cristal/deutérium
- ✅ NaN dans ProductionStats pour graphiques production
- ✅ NaN dans PlanetOverview pour calculs ressources
- ✅ Config admin ne sauvegardait pas (clés incorrectes)
- ✅ Backend utilisait mauvaises clés config (incohérence DB)
- ✅ Bonus tech énergie appliqué alors que non implémenté

---

### 🔮 Améliorations futures

**Panel Admin** :
- Export/Import configuration complète (JSON)
- Presets de configuration (Vitesse normale, Rapide, Ultra-rapide)
- Historique des modifications config avec rollback
- Validation des valeurs (min/max cohérents)

**Gameplay**:
- Événements serveur avec multiplicateurs temporaires
- Configuration dynamique selon heure (Happy Hour ressources)
- Presets par alliance (configurations personnalisées)

---

**Commits**: `c5b00c0`, `2a69bd4`
**Branche**: `claude/fix-admin-config-save-WhPrq`
**Fichiers**: 9 modifiés, 1 créé

---

## [2.1.0] - 2026-01-20 - Fonctionnalités Avancées UX & Gameplay

### 🎨 Nouvelles Fonctionnalités UI

#### 📊 Calculateur de Rentabilité (ROI)
**Description**: Affichage du temps de retour sur investissement pour chaque amélioration de mine

**Détails**:
- Calcul automatique basé sur le coût et le gain de production
- Affichage du ROI en minutes, heures ou jours
- Interface cohérente avec le design global (indigo, subtle)
- Aide les joueurs à prioriser leurs constructions

**Exemple**:
- Mine Métal Niv. 5 → 6: Coût 3000M + 750C, Gain +150/h → **ROI: 6h 15min**

**Fichiers**:
- `frontend/src/components/ResourceDisplay.tsx` (fonction `calculateROI`, UI panel)

---

#### 🌳 Arbre Technologique Visuel (ReactFlow)
**Description**: Vue interactive des technologies avec dépendances visuelles

**Features**:
- Graphe interactif avec ReactFlow (zoom, pan, drag)
- Noeuds personnalisés pour chaque technologie
- Flèches animées montrant les dépendances
- Technologies grisées si prérequis non satisfaits
- Toggle entre vue arbre et vue grille classique

**Dépendances**:
- Labo de Recherche → Énergie, Laser, Espionnage
- Flèches colorées et animées selon l'état

**Fichiers**:
- `frontend/src/components/TechTreeVisual.tsx` (composant ReactFlow)
- `frontend/src/components/TechTree.tsx` (ajout toggle vue)
- `package.json` (ajout reactflow ^11.x)

---

#### 🎬 Replay de Combat Animé
**Description**: Visualisation animée des combats avec barres de vie et explosions

**Features**:
- Parser automatique des logs de combat
- Barres de vie animées pour joueur et ennemi
- Explosions et effets visuels (Framer Motion)
- Timeline d'événements avec icônes contextuelles
- Contrôles Play/Pause/Replay
- Background spatial avec étoiles animées

**Types d'événements**:
- Rounds de combat
- Attaques (lasers animés)
- Dégâts infligés
- Vaisseaux détruits
- Fin de combat (victoire/défaite)

**Fichiers**:
- `frontend/src/components/CombatReplay.tsx` (composant principal)
- Utilise `framer-motion` pour animations fluides

---

#### 🕵️ Système de Sabotage (Espionnage Avancé)
**Description**: Actions clandestines après espionnage réussi

**Nouvelles Actions**:
1. **Saboter Infrastructure**
   - Désactive temporairement une mine
   - Baisse de production: -50% pendant 1h
   - Risque modéré de détection

2. **Espionnage Industriel**
   - Vole des données techniques
   - Bonus: -20% temps recherche suivante
   - Risque élevé de détection

**Mécaniques de Risque**:
- Si détecté: sonde détruite
- Casus Belli accordé à la victime (droit d'attaque sans pénalité)
- Chances basées sur différence de niveau tech espionnage

**Conditions d'accès**:
- Espionnage réussi (detection_level !== 'none')
- Avantage tech minimal (tech_difference >= 1)

**Fichiers**:
- `frontend/src/components/SpyModal.tsx` (UI sabotage)
- **Backend TODO**: Endpoints `/sabotage/disable_mine` et `/sabotage/steal_tech`

---

### 🎯 Améliorations UX

- **Cohérence Design**: Toutes les nouvelles features suivent la charte graphique (PlanetOverview style)
- **Animations Fluides**: Utilisation intensive de Framer Motion
- **Feedback Visuel**: Tooltips, hover effects, transitions harmonisées
- **Responsive**: Mobile-friendly pour toutes les nouvelles interfaces

---

### 📦 Dépendances Ajoutées

```json
{
  "reactflow": "^11.x" // Tech tree interactif
}
```

---

### 🚀 Prochaines Étapes (Backend)

**Système de Sabotage** (à implémenter):
```rust
// Endpoints à créer
POST /planets/{id}/sabotage/disable_mine
POST /planets/{id}/sabotage/steal_tech

// Mécaniques
- Vérification tech_difference >= 1
- Calcul probabilité détection
- Application des effets (debuff mines, bonus recherche)
- Notification victime si détecté
- Attribution Casus Belli
```

---

## [2.0.5] - 2026-01-20 - Corrections gameplay et équilibrage

### 🔧 Corrections critiques

#### 🛠️ Système de capacité cargo pour les attaques
**Problème**: Les joueurs pouvaient piller plus de ressources que leurs vaisseaux ne pouvaient transporter

**Solution implémentée**:
- Ajout d'un système de capacité cargo pour tous les vaisseaux:
  - **Chasseurs Légers**: 50 unités de cargo
  - **Croiseurs**: 800 unités de cargo
  - **Transporteurs**: 10,000 unités de base (+5% par niveau hangar)
- Le butin est maintenant limité par la capacité totale des vaisseaux **survivants**
- Message d'alerte si la capacité cargo est insuffisante pour tout récupérer
- Les transporteurs ne participent pas au combat et survivent toujours

**Impact**: Empêche le pillage excessif, encourage l'envoi de transporteurs en attaque

**Fichiers**:
- `backend/src/game_logic.rs` (fonctions `get_ship_cargo_capacity()`, `resolve_pvp()`)
- `backend/src/main.rs` (payload `AttackPayload`, handler `resolve_attack_mission`)

---

#### 🚀 Support des transporteurs et recycleurs

**Feature**: Possibilité d'envoyer des transporteurs en attaque et des recycleurs en expédition

**Transporteurs en attaque**:
- Augmentent massivement la capacité de pillage (10k+ par transporteur)
- Ne participent pas au combat (toujours survivent)
- Interface mise à jour avec sélection et affichage cargo

**Recycleurs en expédition**:
- **Bonus x2** aux ressources collectées (par recycleur)
- Ne participent pas au combat
- Parfait pour maximiser les gains d'exploration

**Fichiers**:
- `backend/src/main.rs` (payloads, handlers attack & expedition)
- `frontend/src/components/AttackModal.tsx` (UI transporteurs + cargo)
- `frontend/src/components/ExpeditionZone.tsx` (UI recycleurs)
- `frontend/src/App.tsx` (handlers mis à jour)

---

#### ⏱️ Refonte calcul temps de vol

**Problème**: Voyage galaxie 1→2 prenait seulement 15 secondes (irréaliste)

**Solution**: Nouvelle formule tiered par distance
- **Même système** (< 1000): ~30s à 2 minutes
- **Même galaxie** (1000-10000): ~5-15 minutes
- **Galaxies différentes** (> 10000): ~30 minutes à 1h+

**Exemple concret** (avec SPEED_FACTOR=500):
- Galaxie 1→2: **15s → ~35 minutes**
- Système différent: ~8-12 minutes
- Position adjacente: ~45-90 secondes

**Formule**:
```rust
let base_time = if dist < 1000.0 {
    dist / 10.0 + 30.0
} else if dist < 10000.0 {
    dist / 5.0 + 200.0
} else {
    dist / 2.0 + 500.0
};
let seconds = (base_time * 100.0) / speed_factor;
```

**Fichier**: `backend/src/game_logic.rs` (fonction `calculate_flight_time`)

---

#### ⚡ Énergie minimale nouvelles planètes

**Problème**: Les nouvelles planètes (colonie + première planète) n'avaient pas assez d'énergie pour faire fonctionner les mines de base

**Solution**:
- **Solar Plant niveau 3** par défaut (~240 énergie produite)
- Garantit un minimum de 150 énergie disponible
- Consommation 3 mines niveau 1: ~44 énergie
- Ratio énergétique optimal dès le départ (100%)

**Fichiers**:
- `backend/src/main.rs` (création colonie)
- `backend/src/auth.rs` (création première planète)

---

#### 🎯 Expéditions - compteurs par défaut

**Problème**: Les compteurs de vaisseaux commençaient à 1, causant des lancements accidentels

**Solution**:
- Tous les compteurs démarrent à **0** par défaut
- Chasseurs, croiseurs et recycleurs à 0
- L'utilisateur doit explicitement sélectionner ses vaisseaux
- Évite les lancements d'expédition involontaires

**Fichier**: `frontend/src/components/ExpeditionZone.tsx`

---

#### 🌍 Transport de ressources lors colonisation

**Feature**: Possibilité d'envoyer des ressources avec le vaisseau de colonisation

**Nouvelle interface**:
- Modal de sélection des ressources au lieu de colonisation directe
- Sliders pour choisir métal, cristal et deutérium à transporter
- Affichage des ressources disponibles sur la planète d'origine
- Calcul en temps réel des ressources totales à l'arrivée :
  - **500 métal** (base) + métal transporté
  - **500 cristal** (base) + cristal transporté
  - **0 deutérium** (base) + deutérium transporté
- Validation des montants (ne peut pas dépasser les ressources disponibles)

**Impact**: Les nouvelles colonies peuvent démarrer avec bien plus de ressources, accélérant leur développement initial

**Fichiers**:
- `frontend/src/components/ColonizeModal.tsx` (nouveau composant modal)
- `frontend/src/components/GalaxyView.tsx` (intégration du modal)
- `backend/src/main.rs` (handler colonize déjà prêt)

---

#### 📦 Hangar à Ressources + Caps de stockage

**Feature**: Nouveau bâtiment infrastructure avec système de caps exponentiels

**Fonctionnement**:
- **Niveau 0 (base)**: 600 000 unités de stockage par ressource
- **Niveau 1**: 960 000 (600k × 1.6)
- **Niveau 2**: 1 536 000 (600k × 1.6²)
- **Niveau 3**: 2 457 600 (600k × 1.6³)
- Formule: `600 000 × 1.6^niveau`

**Coûts de construction**:
- Métal: 1000 × 2^niveau
- Cristal: 500 × 2^niveau
- Deutérium: 0
- Multiplicateur exponentiel (x2 par niveau comme autres infrastructures)

**Interface utilisateur**:
- Nouveau bâtiment dans l'onglet Installations (thème jaune)
- Barre de progression dans EmpireBar montrant remplissage actuel/max
- Code couleur: vert < 75%, orange 75-90%, jaune > 90%
- Animation pulse sur l'icône quand proche de la limite (>90%)
- Tooltip détaillé: "Stockage: 450k / 600k (75%)"

**Protection production (SOFT CAP)**:
- **IMPORTANT** : Les ressources existantes ne sont JAMAIS réduites (protection des joueurs)
- Si ressources < cap : production normale plafonnée au cap
- Si ressources >= cap : production ARRÊTÉE (garde les ressources actuelles)
- Permet de dépenser au-dessus du cap, mais pas de produire plus
- Encourage l'upgrade du Hangar pour reprendre la production
- **Exemple** : Joueur avec 2M métal et cap 600k → garde 2M, mais ne produit plus jusqu'à upgrade hangar

**Fichiers backend**:
- `backend/migration/src/m20260120_000001_add_resource_storage.rs` (nouvelle migration)
- `backend/src/entities/planet.rs` (champ `resource_storage_level`)
- `backend/src/game_logic.rs` (fonction `get_storage_capacity()`, coûts, caps)
- `backend/src/main.rs` (handlers upgrade & completion, validation caps)

**Fichiers frontend**:
- `frontend/src/components/Facilities.tsx` (UI bâtiment)
- `frontend/src/components/EmpireBar.tsx` (affichage caps avec barre)
- `frontend/src/components/PlanetOverview.tsx` (label)

---

#### 🚚 Bouton Ravitailler dans Mes Planètes

**Feature**: Accès rapide au transport de ressources depuis la page Mes Planètes

**Fonctionnement**:
- Nouveau bouton "Ravitailler" à côté de "Naviguer" sur chaque planète
- Visible uniquement sur les planètes qui ne sont pas la planète actuelle
- Click ouvre directement le modal de transport avec la planète sélectionnée
- Utilise le système de transport existant (transporteurs)
- Design cohérent avec le thème logistique (vert émeraude)

**Amélioration UX**:
- Plus besoin d'aller dans la galaxie pour ravitailler une colonie
- Accès direct depuis la page de gestion des planètes
- Workflow simplifié: Mes Planètes → Ravitailler → Envoyer ressources

**Fichiers**:
- `frontend/src/components/MyPlanets.tsx` (UI + callback)
- `frontend/src/App.tsx` (passage du callback onNavigateTransport)

---

### 📝 Notes techniques

**Capacité cargo combat**:
```rust
// Capacité totale = vaisseaux survivants uniquement
let total_cargo = (surviving_hunters * 50.0)
                + (surviving_cruisers * 800.0)
                + (transporters * 10000.0);

// Butin limité par cargo
if potential_loot > total_cargo {
    loot = potential_loot * (total_cargo / potential_loot);
}
```

**Bonus recycleurs expédition**:
```rust
let recycler_bonus = 1.0 + (recyclers as f64 * 2.0);
let metal = base_metal * recycler_bonus * speed_factor;
```

---

### 🚀 Déploiement

**Migrations**: Aucune (modifications logique gameplay uniquement)

**Redémarrage**: Backend + Frontend recommandé

**Tests recommandés**:
1. ✅ Attaque avec peu de vaisseaux → vérifier cargo insuffisant
2. ✅ Attaque avec transporteurs → cargo augmenté, butin maximum
3. ✅ Expédition avec recycleurs → gains x2+
4. ✅ Transport galaxies → vérifier temps réaliste (~30min+)
5. ✅ Nouvelle colonie → vérifier 150+ énergie disponible
6. ✅ Expéditions → compteurs démarrent à 0

---

### 📦 Fichiers modifiés (15 fichiers)

#### Backend (6 fichiers)
- ✏️ `backend/src/game_logic.rs` - Cargo capacity, flight time, storage capacity, resource caps
- ✏️ `backend/src/main.rs` - Attack/expedition handlers, colonization, resource_storage upgrade/completion
- ✏️ `backend/src/auth.rs` - Solar plant level 3 for first planet
- ✏️ `backend/src/missions.rs` - Dynamic speed_factor in response
- ✏️ `backend/src/entities/planet.rs` - Field resource_storage_level
- ➕ `backend/migration/src/m20260120_000001_add_resource_storage.rs` - NEW: Migration resource storage
- ✏️ `backend/migration/src/lib.rs` - Register new migration

#### Frontend (8 fichiers)
- ✏️ `frontend/src/components/AttackModal.tsx` - Transporters selection + cargo display
- ✏️ `frontend/src/components/ExpeditionZone.tsx` - Recyclers selection + defaults to 0
- ✏️ `frontend/src/components/GalaxyView.tsx` - Colonization modal integration
- ✏️ `frontend/src/App.tsx` - Updated handlers, transport callback to MyPlanets
- ➕ `frontend/src/components/ColonizeModal.tsx` - NEW: Resource selection modal for colonization
- ✏️ `frontend/src/components/Facilities.tsx` - Resource storage building UI
- ✏️ `frontend/src/components/EmpireBar.tsx` - Storage caps display with progress bar
- ✏️ `frontend/src/components/PlanetOverview.tsx` - Resource storage label
- ✏️ `frontend/src/components/MyPlanets.tsx` - Supply button to transport resources

---

**Commits**: `d6c52ba`, `978e447`, `a0a444a`, `21fdcee`
**Branche**: `claude/fix-websocket-error-7nGya`

---

## [2.0.4] - 2026-01-19 - Page Mes Planètes et corrections UI

### ✨ Nouvelles Fonctionnalités

#### Page "Mes Planètes"
- Nouvelle page accessible depuis la sidebar (catégorie COMMANDEMENT)
- Liste détaillée de toutes les planètes du joueur avec :
  - Ressources actuelles (métal, cristal, deutérium)
  - Niveaux des bâtiments (mines, chantier, labo, hangar)
  - Composition de la flotte et défenses
  - Score de chaque planète
- Vue extensible avec détails de la flotte au clic
- Navigation rapide vers n'importe quelle planète
- Statistiques globales de l'empire (planètes, flotte totale, défenses, score)
- Design cohérent avec le reste du jeu (cards dynamiques, animations)

### 🔧 Corrections

#### Card Baie de Stationnement (PlanetOverview)
- Remplacement des emojis par des icônes Lucide :
  - Chasseurs Légers : Target (rouge)
  - Croiseurs : Ship (violet)
  - Recycleurs : Recycle (vert)
  - Sondes : Satellite (cyan)
  - Vaisseaux Colons : Globe (émeraude)
  - Transporteurs : Truck (ambre)
- Badges de statut également mis à jour (icônes au lieu d'emojis)

#### Paramètres - Calcul "Commandant depuis X jours"
- Correction du bug qui affichait ~20472 jours au lieu de la vraie durée
- Cause : le paramètre `viewer_id` n'était pas passé à l'API, retournant `null`
- Solution : ajout de `viewer_id` dans l'appel API et validation null-safe

---

## [2.0.3] - 2026-01-19 - Corrections combat, transport et alertes attaque

### 🔧 Corrections Backend

#### Correction bug de pillage (ressources surévaluées)
- **resolve_attack_mission** : Utilisation de `calculate_resources_with_energy` au lieu de `calculate_resources`
  - Le calcul des ressources du défenseur prend maintenant en compte le ratio énergétique
  - Avant : Les ressources étaient calculées à 100% d'efficacité (sans ratio énergie)
  - Après : Les ressources sont calculées avec le ratio énergétique réel
  - Résultat : Le pillage correspond maintenant aux ressources réellement disponibles

#### Amélioration des missions entrantes
- Les missions entrantes (attaques) contiennent maintenant les infos sur l'attaquant :
  - Nom de la planète source (`source_name`)
  - Coordonnées de la source (`source_coords`)
  - Nom du joueur attaquant (`attacker_name`)

### 🔧 Corrections Frontend

#### Temps de vol Transport
- **TransportModal.tsx** : Calcul du temps de vol corrigé
  - Utilisation de la formule identique au backend (distance 3D + SPEED_FACTOR)
  - Le temps affiché après envoi utilise maintenant le temps réel du backend
  - Coordonnées complètes (galaxy, system, position) transmises pour le calcul

#### Capacité Transporteur
- **Shipyard.tsx** : Correction de l'affichage de la capacité cargo
  - Avant : 5000 (incorrect)
  - Après : 10000 (+5%/niveau hangar) - correspond au backend

### 🚨 Alertes Attaque

#### Système de notification des attaques entrantes
- **PlanetOverview.tsx** : Nouveau système d'alertes
  - Toast d'urgence quand une attaque entrante est détectée
  - Son d'alerte joué automatiquement (`/sounds/alert.wav`)
  - Affichage amélioré des missions entrantes :
    - Nom de l'attaquant
    - Coordonnées d'origine
    - Timer avec barre de progression
    - Style visuel d'urgence (rouge pulsant)
  - Les alertes ne sont déclenchées qu'une fois par mission

---

## [2.0.2] - 2026-01-19 - Harmonisation calcul production (tous les slots)

### 🔧 Corrections

#### Harmonisation complète des calculs de production
- **Tous les composants** utilisent maintenant TOUS les slots pour le calcul de production
  - EmpireBar, PlanetOverview, ProductionStats, ResourceDisplay : calcul identique
  - Suppression du filtrage `>= 5` dans le calcul de production
  - L'affichage des "Slots Bonus" dans ResourceDisplay reste filtré sur les slots 5-8

---

## [2.0.1] - 2026-01-19 - Corrections UI/UX et Graphiques Statistiques

### 🔧 Corrections

#### Harmonisation des calculs de production
- **ResourceDisplay.tsx** : Correction du calcul du ratio énergétique
  - Utilisation cohérente de `planet.energy_ratio` du backend
  - Les calculs sont maintenant identiques entre `EmpireBar`, `ResourceDisplay`, `ProductionStats` et `PlanetOverview`

#### Correction CombatModal (Rapports)
- Résolution du problème de masquage du contenu
- Meilleure structure de layout avec scroll interne
- Bouton "Archiver le rapport" fixé en bas, toujours visible
- Amélioration du responsive design pour mobile
- Logs de combat avec scroll dédié (max 200px)

### 🎨 Améliorations Design

#### Refonte cards PlanetOverview (style Réseau Électrique)
- **Infrastructures** : 
  - Nouveau design avec effets de fond lumineux
  - Icônes colorées avec bordures assorties
  - Barre de niveau d'industrialisation global
  
- **Hangar (Baie de Stationnement)** :
  - Design immersif avec jauges animées style voltmètre
  - Indicateur de capacité avec glow dynamique
  - Grille des vaisseaux avec icônes emoji
  - Alertes visuelles si hangar plein
  
- **Défenses planétaires (Bouclier Orbital)** :
  - Barres verticales style voltmètre pour missiles/plasma
  - Indicateur de puissance défensive
  - Stats dégâts/round et points coque
  - Alerte si planète vulnérable

#### Réduction des glows blancs excessifs
- Remplacement des effets `via-white/30` par des couleurs adaptées
- Shimmer effects plus subtils (`via-indigo-400/15`)
- Meilleure lisibilité générale

### 📊 Nouveaux graphiques (ProductionStats)

**Installation de Recharts** pour des visualisations vibrantes :

- **Projection 24h (AreaChart)** :
  - Graphique d'aire avec dégradés colorés
  - Affichage à 6h, 12h, 18h, 24h
  - Tooltips personnalisés style sci-fi
  
- **Répartition production (PieChart)** :
  - Camembert avec trou central
  - Couleurs métal/cristal/deutérium
  
- **Taux de victoire (PieChart)** :
  - Graphique victoires/défaites
  - Pourcentage central animé
  
- **Pillage total (BarChart)** :
  - Barres colorées par ressource
  - Formatage automatique k/M

### 📦 Dépendances ajoutées
- `recharts` : Librairie de graphiques React

---

## [2.0.0] - 2026-01-19 - Refonte graphique Sci-Fi Spatiale complète

### 🎨 Refonte Design System

#### 🚀 Nouveau système de design sci-fi immersif
**Feature**: Transformation complète de l'interface avec un style spatial dynamique, vibrant et performant

**Framer Motion** - Animations fluides et performantes:
- Transitions de page animées avec `AnimatePresence`
- Animations de survol sophistiquées sur les boutons du menu
- Effets d'entrée progressifs avec stagger sur les éléments
- Composants `PageTransition`, `SlideWrapper`, `ScaleWrapper`, `HoverGlow`

**Nouveau système CSS** (`index.css`):
- **Palette de couleurs néon vibrante** : cyan (#00f5ff), magenta (#ff00ff), purple (#a855f7), orange (#ff6b35)
- **Variables CSS personnalisées** pour les ressources : `--color-metal`, `--color-crystal`, `--color-deuterium`, `--color-energy`
- **Fond spatial profond** : `--space-void`, `--space-nebula`, `--space-deep`
- **Effets de glow multiples** : `.glow-cyan`, `.glow-purple`, `.glow-orange`, `.glow-green`, `.glow-red`
- **Glassmorphism avancé** : `.glass-card`, `.glass-panel`, `.holo-card`
- **Scrollbar personnalisée** avec dégradé cyan/purple

**Animations avancées** (`animations.css`):
- **Particules cosmiques** : `particle-float`, `star-drift`
- **Effets d'énergie** : `energy-flow`, `electric-arc`, `plasma-pulse`
- **Hologrammes** : `hologram-flicker`, `hologram-glitch`, `scan-line`
- **Vaisseaux** : `ship-hover`, `ship-warp`, `engine-glow`
- **Combat** : `laser-fire`, `explosion`, `shield-ripple`
- **Interface** : `typing-cursor`, `data-flow`, `status-blink`
- **Notifications** : `notification-pop`, `alert-flash`, `success-shine`
- **Chargement** : `orbit`, `pulse-ring`, `loading-dots`
- **Texte** : `text-reveal`, `text-glitch`, `gradient-text`

---

#### ✨ Nouveaux composants d'effets visuels

**SpaceBackground** - Fond spatial animé:
- **StarField** : Champ d'étoiles scintillantes (100+ étoiles animées)
- **Nebulae** : 3 nébuleuses colorées (violet, cyan, magenta) avec animations de respiration
- **FloatingParticles** : Particules flottantes multicolores montantes
- **ScanLine** : Ligne de scan holographique traversante
- **TechGrid** : Grille technique subtile en arrière-plan
- Configuration flexible via props (`showStars`, `showNebulae`, `showParticles`, etc.)

**SpaceLoader** - Indicateur de chargement spatial:
- Anneaux orbitaux animés
- Point central pulsant
- Orbes en orbite avec délais différés
- Texte de chargement avec effet de respiration

**GlowOrb** - Orbes lumineux décoratifs:
- Couleur, taille, position personnalisables
- Animation de pulsation optionnelle
- Effet de flou configurable

**Motion Wrappers** - Composants d'animation réutilisables:
- `PageTransition` : Transition de page fluide
- `FadeWrapper`, `SlideWrapper`, `ScaleWrapper` : Animations d'entrée
- `StaggerList` : Liste avec animation séquentielle
- `HoverScale`, `HoverGlow` : Effets au survol
- `Pulse`, `Floating` : Animations continues
- `TypingText` : Effet machine à écrire
- `AnimatedCounter` : Compteur animé

---

#### 🎯 Composants UI améliorés

**Card** - Nouvelles variantes:
- `glass` : Effet glassmorphism avec blur
- `holo` : Style holographique avec scan animé
- `glow` : Effet de lueur au survol
- `cyber` : Bordure animée cyberpunk
- Support des couleurs de glow : cyan, purple, orange, green, red, blue

**Button** - Nouvelles variantes sci-fi:
- `neon` : Bordure cyan lumineuse avec effet de balayage
- `cyber` : Style purple avec glow au survol
- `hologram` : Dégradé cyan/purple avec backdrop blur
- `danger`, `success`, `warning` : Variantes colorées avec glow

**Input** - Styles améliorés:
- `glass` : Fond transparent avec blur
- `cyber` : Bordure purple avec effet de focus
- Glow effect au focus

**Progress** - Barre de progression animée:
- Variantes : default, gradient, glow, cyber
- Couleurs : cyan, purple, orange, green, red, blue
- Effet shimmer animé
- Point lumineux pulsant au bout

**Badge** - Nouvelles variantes:
- `neon` : Style cyan lumineux
- `cyber` : Style purple
- `glow` : Dégradé animé
- `pulse` : Animation pulsante rouge
- Statuts : `online`, `offline`, `busy`

**Tooltip** - Style holographique:
- Fond glassmorphism sombre
- Bordure cyan subtile
- Ligne décorative en haut
- Ombre avec glow

**Dialog/Modal** - Effets glassmorphism:
- Fond avec backdrop blur
- Bordure cyan/purple
- Coins décoratifs lumineux
- Ligne décorative en haut
- Ombre avec glow cyan

---

#### 🖥️ Pages mises à jour

**Page de Login** redesignée:
- Fond spatial animé avec scan line
- Carte avec effets holographiques
- Coins décoratifs lumineux
- Logo avec effet glow pulsant
- Inputs avec effets de focus cyan
- Bouton "neon" avec effet de balayage
- Badge "SECURE CHANNEL" animé

**App.tsx** - Layout principal:
- Fond `SpaceBackground` animé remplace l'image statique
- Transitions de page avec `AnimatePresence` et `motion.div`
- Sidebar avec ligne lumineuse décorative
- Boutons du menu avec animations de survol et indicateur actif lumineux
- Écran de chargement avec `SpaceLoader`

---

### 📦 Dépendances ajoutées

```json
{
  "framer-motion": "^11.x"
}
```

### 📁 Fichiers créés/modifiés

**Nouveaux fichiers**:
- `frontend/src/components/ui/space-background.tsx` - Composants d'effets visuels
- `frontend/src/components/ui/motion-wrappers.tsx` - Wrappers d'animation Framer Motion

**Fichiers modifiés**:
- `frontend/src/index.css` - Système de design complet refait
- `frontend/src/styles/animations.css` - 30+ nouvelles animations
- `frontend/src/components/ui/card.tsx` - Variantes glass, holo, glow, cyber
- `frontend/src/components/ui/button.tsx` - Variantes neon, cyber, hologram
- `frontend/src/components/ui/input.tsx` - Variantes glass, cyber
- `frontend/src/components/ui/progress.tsx` - Animations et couleurs
- `frontend/src/components/ui/badge.tsx` - Variantes neon, cyber, glow, pulse
- `frontend/src/components/ui/tooltip.tsx` - Style holographique
- `frontend/src/components/ui/dialog.tsx` - Glassmorphism et coins décoratifs
- `frontend/src/components/Login.tsx` - Redesign complet
- `frontend/src/App.tsx` - Intégration SpaceBackground et transitions

---

### 🚀 Déploiement

**Migrations**: Aucune (modifications frontend uniquement)

**Installation**:
```bash
cd frontend
npm install framer-motion
```

**Tests recommandés**:
1. ✅ Vérifier le fond spatial animé sur toutes les pages
2. ✅ Tester les transitions de page fluides
3. ✅ Vérifier les effets de survol sur les cartes et boutons
4. ✅ Tester la page de login redesignée
5. ✅ Vérifier les animations ne causent pas de lag (60fps)
6. ✅ Tester sur mobile (responsive)

---

### ⚠️ Breaking Changes

Aucun breaking change. Toutes les modifications sont des améliorations visuelles rétrocompatibles.

---

## [1.9.0] - 2026-01-19 - Refonte interface : Production, Énergie et Rapports

### 🎯 Nouvelles fonctionnalités

#### 📊 Module Production Industrielle amélioré
**Feature**: Refonte complète du module de production avec visualisation graphique

**Améliorations**:
- Graphiques en barres comparatifs pour la production /h (Métal, Cristal, Deutérium)
- Barres proportionnelles avec dégradés colorés
- Affichage production par heure ET par jour
- Indicateur de bonus slots actifs
- Total journalier récapitulatif

**Design**:
- Barres avec animations de transition fluides
- Couleurs distinctives : orange (métal), cyan (cristal), vert (deutérium)
- Indicateur d'efficacité énergétique intégré

**Fichiers**:
- `frontend/src/components/PlanetOverview.tsx` (refonte section Production)

---

#### ⚡ Module Réseau Électrique redesigné
**Feature**: Design "électrique" vibrant avec graphiques de flux énergétique

**Nouveaux éléments visuels**:
- **Effets de fond électriques** : Lueurs animées, lignes de courant horizontales
- **Graphique Production vs Consommation** : Barres verticales style voltmètre
- **Jauge d'efficacité** : Style compteur électrique avec graduations
- **Animations dynamiques** : Pulse, shimmer, glow selon l'état du réseau

**États visuels**:
| État | Couleurs | Animations | Badge |
|------|----------|------------|-------|
| Optimal (≥100%) | Vert/Cyan/Jaune | Calmes, glow doux | ⚡ OPTIMAL |
| Ralenti (50-99%) | Orange/Jaune | Pulse léger | ⚠️ RALENTI |
| Critique (<50%) | Rouge vif | Pulse urgent, ping | 🔴 CRITIQUE |

**Composants du graphique**:
- Barre Production (dégradé emerald→cyan) avec effet shimmer
- Barre Consommation (dégradé selon état) avec glow
- Indicateur central avec flèche directionnelle et flux net
- Point lumineux pulsant au bout de la jauge

**Fichiers**:
- `frontend/src/components/PlanetOverview.tsx` (section Réseau Électrique)

---

#### 📜 Page Changelog avec rendu Markdown
**Feature**: Affichage du changelog avec rendu Markdown complet

**Améliorations**:
- Installation de `react-markdown` et `remark-gfm`
- Support complet GitHub-Flavored Markdown (tables, code blocks, listes)
- Plugin `@tailwindcss/typography` pour le styling prose

**Styles appliqués**:
- Titres colorés (H1 indigo, H2 purple, H3 cyan, H4 orange)
- Code blocks avec fond sombre et texte emerald
- Tables stylisées avec bordures et alternance de couleurs
- Listes avec markers indigo
- Séparateurs subtils

**Fichiers**:
- `frontend/src/components/Changelog.tsx` (ReactMarkdown + styles)
- `frontend/src/index.css` (plugin typography)
- `frontend/package.json` (dépendances react-markdown, remark-gfm)

---

#### 🎯 Modal de rapports de combat améliorée
**Feature**: Gestion robuste des différents types de rapports

**Corrections**:
- Gestion des erreurs backend (rapport non disponible)
- Support unifié des formats (expéditions, combats PvP, défenses)
- Normalisation des champs `winner`/`result` pour tous les types
- Fallback si aucun log détaillé disponible

**Améliorations pour les expéditions**:
- Affichage "Pirates Galactiques" comme adversaire
- Icône fusée (Rocket) au lieu de trophée
- Badge "ZONE D'EXPÉDITION" / "EXPÉDITION RÉUSSIE/ÉCHOUÉE"

**Gestion d'erreurs**:
- Modal d'erreur dédiée si rapport non disponible
- Message explicatif avec bouton de fermeture
- Icône AlertCircle pour signaler l'erreur

**Fichiers**:
- `frontend/src/components/CombatModal.tsx`

---

### 🔧 Modifications techniques

#### Frontend

**Nouvelles dépendances**:
```json
{
  "react-markdown": "^10.1.0",
  "remark-gfm": "^4.0.1",
  "@tailwindcss/typography": "^0.5.19"
}
```

**Configuration Tailwind v4**:
```css
@plugin "@tailwindcss/typography";
```

**Composants modifiés**:
- `PlanetOverview.tsx` - Production avec graphiques + Énergie électrique
- `Changelog.tsx` - Rendu Markdown complet
- `CombatModal.tsx` - Robustesse et support expéditions

---

### 📝 Notes techniques

**Animations CSS utilisées**:
- `animate-pulse` - Pulsation douce
- `animate-ping` - Effet ping pour alertes critiques
- `animate-shimmer` - Effet brillance traversante
- `drop-shadow-[0_0_Xpx_color]` - Glow personnalisés

**Classes Tailwind Typography**:
```
prose prose-invert prose-sm
prose-h1:text-indigo-400
prose-code:text-emerald-400
prose-table:text-slate-300
```

---

### 🚀 Déploiement

**Migrations**: Aucune (modifications frontend uniquement)

**Installation dépendances**:
```bash
cd frontend
npm install react-markdown remark-gfm @tailwindcss/typography
```

**Tests recommandés**:
1. ✅ PlanetOverview → Vérifier graphiques de production
2. ✅ PlanetOverview → Tester module énergie (optimal/ralenti/critique)
3. ✅ Changelog → Vérifier rendu markdown (tables, code, titres)
4. ✅ Rapports → Cliquer sur rapport d'expédition → modal s'affiche
5. ✅ Rapports → Cliquer sur ancien rapport sans détails → message d'erreur

---

### ⚠️ Breaking Changes

Aucun breaking change. Toutes les modifications sont des améliorations visuelles.

---

## [1.8.0] - 2026-01-19 - Rôles utilisateurs, slots de production, améliorations commerce et expéditions

### 🎯 Nouvelles fonctionnalités

#### 👤 Système de rôles utilisateurs
**Feature**: Gestion des permissions admin/user avec vérification en base de données

**Implémentation**:
- Nouvelle migration `m20260119_100000_add_role_to_users.rs` ajoutant colonne `role` (VARCHAR, default "user")
- Vérification asynchrone des rôles dans `admin.rs` via `check_admin()`
- Nouvel endpoint `PATCH /admin/user/:id/role` pour modifier les rôles
- Création d'utilisateurs avec role "user" par défaut

**Rôles disponibles**:
- `admin`: Accès complet au panel d'administration
- `user`: Joueur standard (défaut)

**Fichiers**:
- `backend/migration/src/m20260119_100000_add_role_to_users.rs` (nouveau)
- `backend/src/entities/user.rs` (ajout champ `role`)
- `backend/src/admin.rs` (check_admin async + endpoint)
- `backend/src/auth.rs` (role par défaut à la création)

---

#### 🔧 Système de slots de production bonus
**Feature**: 4 slots supplémentaires (slots 5-8) pour booster la production de ressources

**Fonctionnement**:
- 4 slots de base (mines métal, cristal, deutérium, énergie)
- 4 slots bonus débloquables par le joueur
- Chaque slot bonus donne **+50% de production** à la ressource assignée
- Coût progressif pour débloquer les slots

**Coûts de déblocage**:
| Slot | Métal | Cristal | Deutérium |
|------|-------|---------|-----------|
| 5 | 10,000 | 5,000 | 2,500 |
| 6 | 25,000 | 12,500 | 6,250 |
| 7 | 50,000 | 25,000 | 12,500 |
| 8 | 100,000 | 50,000 | 25,000 |

**Interface**: Intégrée dans la page "Ressources" sous les 4 mines de base

**Fichiers**:
- `backend/migration/src/m20260119_000004_create_resource_slots.rs`
- `backend/src/entities/resource_slot.rs` (nouveau)
- `backend/src/game_logic.rs` (fonctions de calcul slots)
- `frontend/src/components/ResourceDisplay.tsx` (affichage slots 5-8)

---

#### 💱 Commerce NPC bidirectionnel
**Feature**: Saisie bidirectionnelle des quantités dans les échanges NPC

**Améliorations**:
- Labels explicites avec nom de ressource ("Quantité de Métal à vendre")
- Champ "Quantité à obtenir" éditable
- Calcul automatique bidirectionnel:
  - Modifier quantité vendue → recalcule quantité obtenue
  - Modifier quantité obtenue → recalcule quantité à vendre
- Indicateur visuel du champ actif (bordure indigo)
- Récapitulatif avec taux d'échange et marge NPC (15%)

**Fichiers**:
- `frontend/src/components/market/NpcTradeCard.tsx`
  - Ajout `resourceLabels` pour noms français
  - États `buyQuantity` et `lastEdited`
  - Handlers bidirectionnels

---

#### 🌌 Gains de deutérium en expédition
**Feature**: Possibilité de trouver du deutérium lors des expéditions

**Balance**:
- **50% de chance** de trouver du deutérium
- Chasseurs: 10-25 deutérium par vaisseau
- Croiseurs: 30-60 deutérium par vaisseau
- Bonus secteur calme: ×1.2

**Affichage**:
- Logs d'expédition incluent le deutérium trouvé
- Scout affiche estimation deutérium (0 - max possible)
- Note "50% de chance de trouver du deutérium"

**Fichiers**:
- `backend/src/main.rs` (expedition_handler, scout_expedition_handler)
- `frontend/src/components/ExpeditionZone.tsx` (interface + affichage)

---

#### 🏆 Coordonnées dans le classement
**Feature**: Affichage des coordonnées des planètes dans le classement

**Implémentation**:
- Ajout coordonnées (galaxy, system, position) dans `PlanetInfo`
- Format d'affichage: `[G:S:P]` (ex: `[1:45:7]`)
- Couleur cyan pour les coordonnées

**Fichiers**:
- `backend/src/main.rs` (struct PlanetInfo + ranking handler)
- `frontend/src/components/Leaderboard.tsx` (interface + affichage)

---

### 🔧 Modifications techniques

#### Backend

**Migrations**:
1. `m20260119_100000_add_role_to_users.rs` - Rôles utilisateurs
2. `m20260119_000004_create_resource_slots.rs` - Slots de ressources

**Entités modifiées**:
- `user.rs`: Ajout `role: String`
- `resource_slot.rs`: Nouvelle entité pour slots

**Endpoints modifiés/ajoutés**:
- `PATCH /admin/user/:id/role` - Modification rôle utilisateur
- `GET /ranking` - Inclut maintenant les coordonnées des planètes
- `POST /planets/:id/expedition` - Gains deutérium
- `POST /planets/:id/expedition/scout` - Estimation deutérium

#### Frontend

**Composants modifiés**:
- `ResourceDisplay.tsx` - Intégration slots 5-8
- `NpcTradeCard.tsx` - Commerce bidirectionnel
- `ExpeditionZone.tsx` - Estimation/affichage deutérium
- `Leaderboard.tsx` - Coordonnées planètes

---

### 📝 Notes techniques

**Calcul production avec slots**:
```typescript
// Bonus par slot actif = +50%
production_finale = production_base * (1 + nb_slots_actifs * 0.5)
```

**Échange NPC bidirectionnel**:
```typescript
// Taux d'échange avec marge 15%
exchangeRate = (sellPrice / buyPrice) * 0.85

// Vente → Achat
buyQuantity = sellQuantity * exchangeRate

// Achat → Vente
sellQuantity = buyQuantity / exchangeRate
```

**Deutérium expédition**:
```rust
// 50% de chance
let found_deuterium = rng.gen_bool(0.5);

// Gains par vaisseau
let base_deut_per_hunter = 10.0 + rng.gen_range(0.0..=15.0);  // 10-25
let base_deut_per_cruiser = 30.0 + rng.gen_range(0.0..=30.0); // 30-60
```

---

### 🚀 Déploiement

**Migrations**: **OUI - OBLIGATOIRE**
```bash
cd migration
cargo run
```

**Tests recommandés**:
1. ✅ Créer un nouvel utilisateur → role = "user"
2. ✅ Modifier role via panel admin
3. ✅ Débloquer un slot bonus → vérifier coût et production
4. ✅ Commerce NPC → saisir quantité obtenue → vérifier calcul inverse
5. ✅ Expédition → vérifier gains deutérium (50% des fois)
6. ✅ Classement → développer joueur → voir coordonnées planètes

---

### ⚠️ Breaking Changes

Aucun breaking change. Toutes les modifications sont rétrocompatibles.

---

## [1.7.0] - 2026-01-19 - Configuration dynamique du serveur (SPEED_FACTOR modifiable)

### 🎯 Nouvelles fonctionnalités

#### ⚙️ Configuration serveur dynamique (Panel Admin)
**Feature**: Modification en temps réel des paramètres de vitesse du jeu depuis le panel admin

**Paramètres éditables**:
- **SPEED_FACTOR**: Multiplicateur de vitesse général du jeu (construction, recherche, production)
- **Construction Speed Multiplier**: Multiplicateur spécifique pour la vitesse de construction
- **Mining Speed Multiplier**: Multiplicateur spécifique pour la vitesse de production des ressources

**Fonctionnement**:
- Valeurs stockées en base de données (table `server_config`)
- Modification via interface admin avec inputs numériques
- Application immédiate pour toutes les nouvelles opérations
- Fallback sur les valeurs par défaut si DB inaccessible

**Accès**: Panel Admin → Onglet "Statistiques Serveur" → Section "Paramètres Serveur (Éditable)"

---

### 🔧 Modifications techniques

#### Backend

**Migration SeaORM** (`m20260119_000003_create_server_config.rs`):
```sql
CREATE TABLE server_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key VARCHAR UNIQUE NOT NULL,
  config_value VARCHAR NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Valeurs par défaut
INSERT INTO server_config VALUES
  ('speed_factor', '500.0'),
  ('construction_speed_multiplier', '1.0'),
  ('mining_speed_multiplier', '1.0');
```

**Entité** (`entities/server_config.rs`):
- Model avec `config_key` (unique), `config_value`, `updated_at`
- Ajouté dans `mod.rs` et `prelude.rs`

**Endpoints admin** (`admin.rs`):
- `GET /admin/config` - Récupérer toutes les configurations
- `PATCH /admin/config` - Mettre à jour une ou plusieurs configurations
- Struct `ConfigUpdate` pour gérer les mises à jour partielles
- Fonction `get_server_stats_handler` modifiée pour lire le SPEED_FACTOR depuis la DB

**Routes** (`main.rs`):
- Ajout des routes `/admin/config` (GET et PATCH)

#### Frontend

**AdminPanel.tsx**:
- Nouvelle interface `ServerConfig` pour typer les configurations
- États `config`, `editedConfig`, `loadingConfig`
- Fonctions `fetchConfig()` et `updateConfig()` pour gérer les configurations
- Section éditable avec 3 inputs numériques (step 0.1)
- Boutons "Enregistrer" et "Annuler"
- Toast de confirmation après modification
- Avertissement sur l'application immédiate des changements

**App.tsx**:
- Ajout import `FileText` manquant pour l'icône Changelog

---

### 📝 Notes techniques

**Application des modifications**:
- Les changements prennent effet **immédiatement** pour toutes les nouvelles opérations
- Les opérations en cours (constructions, recherches) conservent leur vitesse d'origine
- Le SPEED_FACTOR est lu depuis la DB à chaque calcul de durée

**Valeurs par défaut**:
- `speed_factor`: 500.0 (×5.0 de vitesse)
- `construction_speed_multiplier`: 1.0 (vitesse normale)
- `mining_speed_multiplier`: 1.0 (vitesse normale)

**Sécurité**:
- Vérification admin (`check_admin`) obligatoire
- user_id requis dans les paramètres de requête

---

### 🚀 Déploiement

**Migrations**: **OUI - OBLIGATOIRE**
```bash
cd migration
cargo run
```

**Tests recommandés**:
1. ✅ Exécuter la migration pour créer la table `server_config`
2. ✅ Vérifier que les valeurs par défaut sont insérées
3. ✅ Accéder au panel admin → Statistiques Serveur
4. ✅ Modifier le SPEED_FACTOR (ex: 1000.0 pour ×10)
5. ✅ Enregistrer et vérifier que la valeur est mise à jour
6. ✅ Vérifier que les nouvelles constructions utilisent la nouvelle vitesse

---

### ⚠️ Breaking Changes

**IMPORTANT**: Cette version nécessite l'exécution de la migration pour fonctionner correctement. Sans la table `server_config`, le système utilisera les valeurs hardcodées par défaut (fallback).

**Impact**:
- Aucun impact sur les données existantes
- Ajout d'une nouvelle table uniquement
- Rétrocompatible (fallback sur constantes)

---

## [1.6.0] - 2026-01-19 - Améliorations panel admin (statistiques serveur)

### 🎯 Nouvelles fonctionnalités

#### 📊 Tableau de bord statistiques serveur (Panel Admin)
**Feature**: Onglet "Statistiques Serveur" dans le panel admin pour surveiller l'état global du jeu

**Statistiques affichées**:
- Nombre total de joueurs
- Nombre total de planètes
- Total de vaisseaux (toutes flottes combinées)
- Total de défenses (missiles + plasma)
- Ressources totales du serveur (métal, cristal, deutérium)
- Paramètres serveur (SPEED_FACTOR actuel)

**Design**:
- Interface en onglets (Statistiques / Gestion Joueurs)
- Cartes colorées avec dégradés pour chaque métrique
- Mise à jour en temps réel lors du changement d'onglet
- Responsive (adapté mobile/tablette/desktop)

**Accès**: Panel Admin → Onglet "Statistiques Serveur"

**Fichiers backend**:
- `backend/src/admin.rs` (lignes 224-280)
  - Nouveau endpoint `GET /admin/stats`
  - Structure `ServerStats` avec toutes les métriques
  - Import `PaginatorTrait` pour count()
- `backend/src/main.rs` (ligne 223)
  - Route `/admin/stats` enregistrée

**Fichiers frontend**:
- `frontend/src/components/AdminPanel.tsx`
  - Système d'onglets (stats/players)
  - Interface `ServerStats` (lignes 69-78)
  - Type `AdminTab` pour gérer les onglets
  - Fonction `fetchStats()` pour charger les statistiques
  - Cartes visuelles pour chaque métrique
  - Section SPEED_FACTOR en lecture seule

---

### 📝 Notes techniques

**Calculs backend**:
- Total utilisateurs: `User::find().count()`
- Total planètes: `Planet::find().count()`
- Ressources/flottes/défenses: Somme sur toutes les planètes

**Performances**:
- Chargement à la demande (uniquement quand onglet activé)
- Cache côté client tant que l'onglet reste actif

**SPEED_FACTOR**:
- Actuellement en lecture seule (constante dans `game_logic.rs`)
- Valeur actuelle: 500.0 (×5.0)
- Modification dynamique nécessiterait table config en DB (amélioration future)

---

### 🚀 Déploiement

**Migrations**: Aucune (nouvelle fonctionnalité sans modification schéma)

**Tests recommandés**:
1. ✅ Accéder au panel admin en tant qu'administrateur
2. ✅ Vérifier que l'onglet "Statistiques Serveur" s'affiche
3. ✅ Vérifier les valeurs affichées correspondent aux données réelles
4. ✅ Tester la navigation entre onglets
5. ✅ Vérifier l'onglet "Gestion Joueurs" fonctionne toujours correctement

---

## [1.5.0] - 2026-01-19 - Correction bug timer tourelles plasma

### 🔧 Corrections critiques

#### 🛡️ Correction construction tourelles plasma (timer manquant)
**Problème**: Le timer de construction ne s'affichait pas pour les tourelles plasma, alors que les missiles fonctionnaient correctement

**Cause identifiée**: Incohérence prérequis frontend ↔ backend
- **Frontend** (`gameRules.ts`):
  - Chantier Spatial niveau 6
  - Tech. Laser niveau 3
- **Backend** (`game_logic.rs`):
  - Chantier Spatial niveau 8 ❌
  - Tech. Laser niveau 5 ❌

**Impact du bug**:
- Utilisateurs avec Chantier 6-7 ou Laser 3-4 pouvaient cliquer "Construire"
- Ressources déduites côté client
- Backend rejetait la requête (403 Forbidden)
- Absence de gestion d'erreur → aucun feedback utilisateur
- Pas de construction ajoutée → pas de timer affiché

**Solutions appliquées**:

1. **Alignement des prérequis** (frontend → backend):
   ```typescript
   // frontend/src/lib/gameRules.ts
   case 'plasma_turret':
     check("Chantier Spatial (8)", ...shipyard_level >= 8);  // 6 → 8
     check("Tech. Énergie (6)", ...energy_tech_level >= 6);  // ✓ déjà bon
     check("Tech. Laser (5)", ...laser_battery_level >= 5);  // 3 → 5
   ```

2. **Gestion d'erreurs complète** dans `Defenses.tsx`:
   - Import `toast` (notifications Sonner)
   - Import `checkPrerequisites` (validation frontend)
   - Codes HTTP traités:
     - `200 OK` → Succès avec notification
     - `403 Forbidden` → "Prérequis non satisfaits"
     - `400 Bad Request` → "Ressources insuffisantes"
     - `409 Conflict` → "File de construction pleine"
   - Erreurs réseau → "Erreur de connexion"

3. **Améliorations UX**:
   - Affichage des prérequis avec statut (✓/✗)
   - Désactivation du bouton si prérequis manquants
   - Styles visuels distincts (orange pour prérequis, rouge pour ressources)
   - Toast de confirmation lors de la construction réussie

4. **Correction compilation Rust** (ambiguïté type):
   ```rust
   // backend/src/game_logic.rs (lignes 524, 538)
   (base_loss_rate * (1.0_f64 + variation)).clamp(0.01_f64, 0.4_f64)
   ```

**Fichiers modifiés**:
- `frontend/src/lib/gameRules.ts` (lignes 65-67)
- `frontend/src/components/Defenses.tsx` (imports + startBuild + UI)
- `frontend/src/components/Changelog.tsx` (import Card corrigé)
- `backend/src/game_logic.rs` (types explicites)

---

### 📝 Notes techniques

**Prérequis tourelles plasma (validés)**:
- Chantier Spatial niveau 8
- Technologie Énergie niveau 6
- Technologie Laser niveau 5

**Prérequis lanceurs missiles**:
- Chantier Spatial niveau 1
- (Aucun prérequis tech)

**Système de notifications**: Sonner (déjà intégré)

---

### 🚀 Déploiement

**Migrations**: Aucune (correction frontend + backend logique)

**Tests recommandés**:
1. ✅ Vérifier prérequis affichés correctement pour plasma_turret
2. ✅ Tester construction avec prérequis non satisfaits → toast erreur
3. ✅ Tester construction avec prérequis OK → timer s'affiche
4. ✅ Vérifier que missiles fonctionnent toujours (aucune régression)

---

## [1.4.0] - 2026-01-19 - Rééquilibrage énergétique et améliorations marché

### 🔧 Corrections critiques

#### ⚡ Rééquilibrage énergétique majeur
**Problème**: Production d'énergie toujours insuffisante → mines constamment dans le rouge
**Cause**: Croissance exponentielle des mines (1.1^niveau) dépassait rapidement la production solaire

**Solutions appliquées**:
- ✅ Production centrale solaire **×3** (60.0 au lieu de 20.0 par niveau)
- ✅ Bonus tech énergie **+10% par niveau** (au lieu de +5%)
- ✅ Système de réduction automatique déjà implémenté
  - Production mines réduite proportionnellement au ratio énergétique
  - Ex: 50% d'énergie disponible → 50% de production des mines

**Formules mises à jour**:
```rust
// Production énergie
base = 60 * level * 1.1^level * (1 + energy_tech * 0.10)

// Réduction production ressources
production_effective = production_base * energy_ratio
```

**Impact**: Meilleur équilibre énergie/production, moins de micro-gestion

**Fichiers**: `backend/src/game_logic.rs` (lignes 176-184)

---

#### 💰 Correction affichage prix marché NPC
**Problème**: Tous les prix affichés à "1.00" malgré système dynamique fonctionnel

**Cause**: Désynchronisation format backend ↔ frontend
- Backend renvoyait `npc_prices` (tableau)
- Frontend cherchait `prices.metal` (objet)

**Solution**: Transformation tableau → objet dans `PriceOverview.tsx`
```typescript
const prices: Record<string, {buy, sell, market}> = {};
for (const npcPrice of stats.npc_prices) {
  prices[npcPrice.resource_type] = {
    buy: npcPrice.npc_buy_price,
    sell: npcPrice.npc_sell_price,
    market: npcPrice.market_price
  };
}
```

**Système de prix dynamiques** (déjà implémenté côté backend):
- Calcul basé sur rareté des ressources serveur
- Formule: `scarcity = expected_ratio / actual_ratio`
- Bornes: 0.5× à 2.0× le prix de base
- Mise à jour temps réel (toutes les 5s)

**Fichiers**: `frontend/src/components/market/PriceOverview.tsx` (lignes 8-18, 53)

---

#### 🛠️ Corrections compilation Rust
**Erreurs corrigées**:
1. **Types ambigus pour `clamp()`**:
   - Erreur: `can't call method clamp on ambiguous numeric type {float}`
   - Solution: Explicitation types `0.01_f64`, `0.4_f64`

2. **Imports non utilisés**:
   - Suppression `Serialize`, `Deserialize` dans `server_resource_stats.rs`

**Fichiers**:
- `backend/src/game_logic.rs` (lignes 523, 537)
- `backend/src/entities/server_resource_stats.rs` (ligne 2)

---

### 🎯 Nouvelles fonctionnalités

#### 📋 Page Changelog intégrée
**Feature**: Consultation du changelog depuis le jeu

**Backend**:
- Endpoint `GET /changelog` lit `CHANGELOG.md`
- Retourne contenu brut markdown

**Frontend**:
- Composant `Changelog.tsx` avec design cohérent
- Affichage préformaté + gestion chargement/erreurs
- Ajout menu SYSTÈME (icône FileText)

**Accès**: Menu → SYSTÈME → Changelog

**Fichiers**:
- `backend/src/main.rs` (ligne 218, 2705-2711)
- `frontend/src/components/Changelog.tsx` (nouveau)
- `frontend/src/App.tsx` (imports + routing)

---

### 📝 Notes techniques

**Production d'énergie** (exemple niveau 10):
```
Avant: 20 * 10 * 1.1^10 * 1.5 = 777 unités
Après:  60 * 10 * 1.1^10 * 2.0 = 3108 unités (+300%)
```

**Consommation 3 mines niveau 10**:
```
(10*10 + 10*10 + 20*10) * 1.1^10 = ~1036 unités
Ratio: 3108 / 1036 = 300% → Production à 100%
```

**Prix marché dynamiques**:
- Métal: base 1.0 × scarcity
- Cristal: base 1.5 × scarcity
- Deutérium: base 3.0 × scarcity
- Scarcity calculée: `expected / actual`

---

### 🚀 Déploiement

**Aucune migration** requise pour cette version.

**Redémarrage backend** recommandé pour appliquer les nouveaux calculs d'énergie.

---

### 📦 Fichiers modifiés (8 fichiers)

#### Backend (4 fichiers)
- ✏️ `backend/src/game_logic.rs` - Production énergie ×3, tech bonus +10%
- ✏️ `backend/src/entities/server_resource_stats.rs` - Suppression imports inutilisés
- ✏️ `backend/src/main.rs` - Endpoint /changelog

#### Frontend (4 fichiers)
- ✏️ `frontend/src/components/market/PriceOverview.tsx` - Fix affichage prix
- ➕ `frontend/src/components/Changelog.tsx` - Nouveau composant
- ✏️ `frontend/src/App.tsx` - Routing changelog

---

### ✅ Tests recommandés

- [ ] **Énergie**: Vérifier production > consommation pour planètes niveau moyen
- [ ] **Marché**: Confirmer affichage prix variables (≠ 1.00)
- [ ] **Changelog**: Accès via menu SYSTÈME → contenu affiché correctement

---

### 🐛 Bugs connus

**Timer construction défenses**: Investigation en cours
- Les missiles se construisent correctement
- Les tourelles plasma : timer parfois ne s'affiche pas
- Nécessite debugging approfondi (frontend + backend)

---

### 🔮 Améliorations futures identifiées

- **Panel Admin**: Stats serveur, gestion users, modifier SPEED_FACTOR
- **Système de rôles**: Admin/User avec permissions
- **Changement username**: Dans paramètres utilisateur
- **Empire Bar**: Amélioration visuelle pour nombreuses planètes
- **Système de slots**: Mines modulaires (8 slots configurables)
- **Timer défenses**: Investigation et correction complète

---

**Commits**: `ee49fbe`, `5521fcc`, `d7e1b62`
**Branche**: `claude/responsive-ranking-npc-costs-iIrjT`
**Fichiers**: 8 modifiés, 1 créé

---

## [1.3.0] - 2026-01-19 - Session de corrections et améliorations majeures

### 🎯 Nouveautés

#### 🚀 Système de capacité évolutive des transporteurs
- **Backend**: Fonction `get_transporter_capacity(hangar_level)` dans `game_logic.rs`
  - Capacité de base: 10 000 unités
  - Bonus progressif: **+5% par niveau de hangar**
  - Exemple: Hangar Niveau 10 = 15 000 unités (+50%), Niveau 20 = 20 000 unités (+100%)
- **Frontend**: Fonction `getTransporterCapacity()` dans `gameRules.ts`
- **API**: Handler `/transport` applique automatiquement le bonus
- **Interface**: `TransportModal` affiche la capacité exacte en temps réel

**Fichiers**:
- `backend/src/game_logic.rs` (lignes 338-343)
- `frontend/src/lib/gameRules.ts` (lignes 75-81)
- `frontend/src/components/TransportModal.tsx` (ligne 27)

---

#### 📋 Rapports de combat détaillés et cliquables
- **Migration**: `m20260119_000002_add_detailed_report_to_combat_log.rs`
  - Nouvelle colonne `detailed_report` (JSON, nullable) dans table `combat_log`
- **Sauvegarde automatique** des rapports complets pour:
  - ⚔️ Attaques PvP (attaquant + défenseur)
  - 🛡️ Défenses (avec pertes missiles/tourelles)
  - 🌌 Expéditions (logs de combat détaillés)
  - 🏴 Conquêtes de planètes

- **Nouveau endpoint**: `GET /combat-reports/:id/detail`
  - Récupère le JSON complet d'un rapport
  - Codes: `200 OK` | `404 NOT FOUND`

- **Interface interactive**:
  - ✅ Tous les rapports de combat sont **cliquables** (`cursor-pointer`)
  - ✅ Clic → ouverture de `CombatModal` avec détails complets
  - ✅ Affichage des pertes, butin, débris et logs round-par-round
  - ⚠️ Rapports d'espionnage non cliquables (pas de combat)

**Fichiers**:
- `backend/migration/src/m20260119_000002_add_detailed_report_to_combat_log.rs` (nouveau)
- `backend/src/entities/combat_log.rs` (ligne 20-21)
- `backend/src/main.rs` (endpoint ligne 181, handler ligne 1158-1181)
- `frontend/src/components/ReportsTerminal.tsx` (lignes 54-64, 100-102, 137-140, 205-208)

---

#### 🏆 Badges de rang dans le classement
- **Backend**: Champ `rank_badge: String` dans structure `RankItem`
- **Calcul**: `game_logic::get_rank_badge(total_score)` automatique
- **Affichage**: Badge sous le nom du joueur (jaune, uppercase)
  - Exemples: "RECRUE", "CAPORAL", "COMMANDANT", "EMPEREUR GALACTIQUE"

**Fichiers**:
- `backend/src/main.rs` (lignes 62-73)
- `frontend/src/components/Leaderboard.tsx` (lignes 16-26, 108-125)

---

#### 🌍 Système d'âge des planètes
- **Migration**: `m20260119_000001_add_created_at_to_planets.rs`
  - Colonne `created_at` (TIMESTAMP NOT NULL)
  - Initialisation `NOW()` pour planètes existantes
  - Processus sécurisé: nullable → update → NOT NULL

- **Planète mère stable**: Basée sur `created_at` (la plus ancienne)
  - ❌ Avant: planète avec + de points (changeait après batailles)
  - ✅ Après: planète la + ancienne (fixe pour toujours)

**Fichiers**:
- `backend/migration/src/m20260119_000001_add_created_at_to_planets.rs` (nouveau)
- `backend/src/entities/planet.rs` (ligne 111-113)
- `backend/src/auth.rs` (ligne 195)
- `backend/src/main.rs` (ligne 1847-1853)

---

### 🔧 Corrections de bugs critiques

#### ⚔️ Expéditions - Pertes nulles corrigées
**Problème**: Avec 1 vaisseau → `(1 * 0.9).floor() = 0` pertes

**Solution complète**:
- ✅ Utilisation de `ceil()` → garantit minimum 1 perte
- ✅ Niveau pirate aléatoire: 10-100 (forte variation)
- ✅ Taux de pertes variable ±20%
  - Victoire: 5-25% base ± 20% variation → final 1-45%
  - Défaite: 50-90% base ± 20% variation → final 40-100%
- ✅ **Résistance différenciée**:
  - Chasseurs: vulnérabilité 1.0 (normale)
  - Croiseurs: vulnérabilité 0.5 (2× plus résistants)
- ✅ Logs détaillés: "PERTES: X Chasseur(s), Y Croiseur(s)"

**Code**:
```rust
// Répartition proportionnelle des pertes
let hunter_vulnerability = hunters as f64 * 1.0;
let cruiser_vulnerability = cruisers as f64 * 0.5;
let total_vulnerability = hunter_vulnerability + cruiser_vulnerability;

lost_hunters = (total_losses * hunter_ratio).ceil() as i32;
lost_cruisers = (total_losses * cruiser_ratio).floor() as i32;
```

**Fichiers**: `backend/src/game_logic.rs` (512-539), `backend/src/main.rs` (909-963)

---

#### ♻️ Recyclage débris - Quantité hard-codée
**Problème**: Toujours 50 recycleurs envoyés (ignorait disponibilité)

**Solution**:
- ✅ Vérification `planet.recycler_count`
- ✅ Envoi de tous disponibles (max 50 pour perf)
- ✅ Toast d'erreur si 0 recycleurs

**Fichier**: `frontend/src/components/GalaxyView.tsx` (75-89)

---

#### 👤 Profil - "Commandant depuis X jours"
**Problème**: 20472 jours au lieu de 3 jours

**Cause**: `NaiveDateTime` sans timezone → parsing JS incorrect

**Solution**: Format ISO 8601 avec `Z`
```rust
let created_at_utc = user.created_at
    .format("%Y-%m-%dT%H:%M:%S%.3fZ")
    .to_string();
```

**Fichier**: `backend/src/main.rs` (1858-1863)

---

#### 🎓 Tutoriel - Boucle infinie
**Problème**: `useEffect([])` se déclenchait en boucle

**Solution**:
- ✅ État `hasChecked: boolean`
- ✅ Early return si déjà vérifié
- ✅ Dépendance `[hasChecked]` au lieu de `[]`

**Fichier**: `frontend/src/components/Tutorial.tsx` (238-272)

---

#### ⏱️ Temps de déplacement flotte
**Problème**: Temps affiché ≠ temps réel (fonction locale incorrecte)

**Solution**:
- ❌ Suppression fonction locale (utilisait que distance système)
- ✅ Utilisation `game_logic::calculate_distance` (coordonnées 3D complètes)
- ✅ Cohérence frontend ↔ backend

**Impact**: Temps estimé = temps effectif de vol

---

### 🗄️ Base de données

#### Migrations
1. **`m20260119_000001_add_created_at_to_planets.rs`**
   - Colonne `created_at TIMESTAMP NOT NULL`
   - Init avec `NOW()` pour anciennes planètes

2. **`m20260119_000002_add_detailed_report_to_combat_log.rs`**
   - Colonne `detailed_report JSON NULL`
   - Stocke JSON complet des combats

#### Tables modifiées
| Table | Nouvelle colonne | Type | Description |
|-------|------------------|------|-------------|
| `planets` | `created_at` | TIMESTAMP | Date de création (planète mère = + ancienne) |
| `combat_log` | `detailed_report` | JSON (nullable) | Rapport complet avec logs, pertes, butin |

---

### 📊 API - Nouveaux endpoints

| Méthode | Route | Description | Codes |
|---------|-------|-------------|-------|
| `GET` | `/combat-reports/:id/detail` | Récupère rapport détaillé JSON | 200, 404 |

---

### 🎨 Interface utilisateur

#### Leaderboard
- Badge de rang sous le nom (`text-yellow-500/80`, uppercase)
- Exemples: RECRUE, SOLDAT, CAPORAL, SERGENT, LIEUTENANT...

#### Modal de Transport
- Capacité dynamique affichée en temps réel
- Calcul: `nb_transporteurs × capacité_unitaire(niveau_hangar)`
- Validation surcharge côté serveur

#### Journal de Bord
- **Rapports cliquables**: `cursor-pointer` + `hover:bg-*`
- **Clic** → `CombatModal` avec:
  - En-tête Victoire/Défaite
  - Nom adversaire + type mission
  - Butin (Métal/Cristal/Deutérium)
  - Pertes séparées (attaquant/défenseur/défenses)
  - Logs animés round-par-round

---

### 📝 Notes techniques

#### Formules clés

**Capacité transporteur**:
```typescript
capacity = 10000 * (1 + hangarLevel * 0.05)
```

**Pertes expédition**:
```rust
// Garantir minimum 1 perte
let lost = (fleet_size as f64 * loss_rate).ceil() as i32;

// Variation aléatoire ±20%
let variation = rng.gen_range(-0.2..0.2);
let final_rate = base_rate * (1.0 + variation);
```

**Date UTC**:
```rust
format!("%Y-%m-%dT%H:%M:%S%.3fZ")  // ISO 8601 avec Z
```

---

### 🚀 Déploiement

**Migrations à exécuter**:
```bash
# Toutes les migrations en attente
sea-orm-cli migrate up

# Ou une par une
sea-orm-cli migrate up -n 1  # created_at
sea-orm-cli migrate up -n 1  # detailed_report
```

---

### 📦 Fichiers modifiés (8 fichiers)

#### Backend (6 fichiers)
- ✏️ `backend/src/game_logic.rs` - Combat expéditions + capacité transporteur
- ✏️ `backend/src/main.rs` - Endpoints, handlers, sélection planète mère
- ✏️ `backend/src/auth.rs` - Init `created_at` à création planète
- ✏️ `backend/src/entities/planet.rs` - Champ `created_at`
- ✏️ `backend/src/entities/combat_log.rs` - Champ `detailed_report`
- ✏️ `backend/migration/src/lib.rs` - Enregistrement migrations
- ➕ `backend/migration/src/m20260119_000001_add_created_at_to_planets.rs` (nouveau)
- ➕ `backend/migration/src/m20260119_000002_add_detailed_report_to_combat_log.rs` (nouveau)

#### Frontend (3 fichiers)
- ✏️ `frontend/src/components/ReportsTerminal.tsx` - Clics + modal
- ✏️ `frontend/src/components/TransportModal.tsx` - Capacité dynamique
- ✏️ `frontend/src/lib/gameRules.ts` - Fonction `getTransporterCapacity()`

---

### ✅ Checklist de test

- [x] **Expéditions**: 1 vaisseau → pertes > 0
- [x] **Expéditions**: Mix chasseurs/croiseurs → répartition correcte
- [x] **Transport**: Capacité = 10k à hangar 0, 15k à hangar 10
- [x] **Transport**: Surcharge → erreur avec capacité max affichée
- [x] **Classement**: Badge de rang affiché sous nom
- [x] **Rapports**: Clic sur rapport → modal s'ouvre
- [x] **Rapports**: Détails complets (pertes, butin, logs)
- [x] **Planète mère**: Reste fixe après conquête nouvelle planète
- [x] **Tutoriel**: S'affiche 1× puis jamais (sauf clear localStorage)
- [x] **Profil**: "Commandant depuis X jours" correct
- [x] **Recyclage**: 0 recycleurs → toast d'erreur

---

### 🐛 Bugs connus
Aucun bug connu à ce stade.

---

### 🔮 Améliorations futures
- Modules de protection pour expéditions (réduction pertes)
- Bonus de commandement (général d'expédition)
- Filtrage rapports (attaques/défenses/expéditions)
- Statistiques graphiques (évolution points)
- Export rapports en JSON/PDF
- Pagination anciens rapports

---

**Commit**: `d0fb500` - Améliorations transports, rapports combat et capacités évolutives
**Branche**: `claude/responsive-ranking-npc-costs-iIrjT`
**Fichiers**: 8 modifiés, 2 créés

---

## [1.2.0] - 2026-01-18

### 🐛 Corrections de Bugs
- **Production incohérente**: Ajout de `Math.floor()` dans `PlanetOverview.tsx` pour éviter l'écart entre Overview (+318/h) et Resources (+91/h)
- **Username manquant**: Settings.tsx affiche maintenant le vrai username depuis `localStorage` au lieu de "Commandant"
- **Barre progression**: `PlayerRankBadge` avec `showProgress={true}` déjà fonctionnel (calcul automatique vers prochain rang)

### 🆕 Fonctionnalités Admin
- **Backend Rust** (`backend/src/admin.rs`):
  - `GET /admin/players` - Liste tous les joueurs
  - `GET /admin/planet/:id` - Détails planète
  - `PATCH /admin/planet/:id` - Modification planète
  - **Gestion automatique `last_update`**: Update timestamp si ressources modifiées (prévient bugs production)

- **Frontend React** (`frontend/src/components/AdminPanel.tsx`):
  - Accès réservé à `username === 'phantomhex'`
  - Édition complète: Ressources, Mines, Installations, Technologies, Flotte, Défenses
  - Recherche joueurs avec affichage ID/username/points

- **Intégration App.tsx**:
  - Onglet "Admin Panel" visible uniquement si `isAdmin === true`
  - Catégorie "SYSTÈME" dans menu sidebar

### 🛡️ Sécurité
- Vérification double (frontend + backend)
- Protection routes admin avec `check_admin()` (Rust)
- Update automatique `last_update = NOW()` pour cohérence production

### 📝 Architecture
```
backend/src/
  ├── main.rs (routes admin ajoutées)
  ├── admin.rs (nouveau module)
  └── lib.rs (export admin)

frontend/src/
  ├── App.tsx (intégration onglet Admin)
  ├── components/AdminPanel.tsx (nouveau composant)
  ├── components/PlanetOverview.tsx (Math.floor fix)
  └── components/Settings.tsx (username fix)
```

### ⚠️ Notes Importantes
- **CRITICAL**: Toujours mettre à jour `last_update` lors de modification manuelle ressources
- Backend est **Rust uniquement** (pas de fichiers Python)
- Admin Panel accessible uniquement avec compte `phantomhex`

---

## [1.1.0] - Versions précédentes
- Système de messagerie
- Explo spatiale et combat PvP
- Classement multi-catégories
- Tutoriel interactif
