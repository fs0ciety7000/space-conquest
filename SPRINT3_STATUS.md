# Sprint 3 — Feature Status (M1-M16)
Dernière mise à jour : 2026-03-13

---

## PM Review — Vérification de Conformité (2026-03-13)

### 1. Colonisation (base gratuite + supplément)

**Statut: CONFORME**

Frontend (`ColonizeModal.tsx`):
- Section "Base obligatoire (toujours envoyée)" affiche bien 20 000 / 20 000 / 15 000.
- Sliders de supplément de 0 à `Math.floor(availableResources.X)` — max = tout le stock source.
- Aucun warning amber bloquant. Seul blocage = absence de vaisseau colon.
- Bouton actif dès qu'un vaisseau de colonisation est disponible.

Backend (`handlers/galaxy.rs`):
- Source débitée uniquement du supplément. Base `20_000/20_000/15_000` ajoutée par le serveur sans déduction.
- `total_metal = BASE_METAL + metal_to_transport` stocké dans `fleet_data`.

Backend tick (`handlers/planets.rs`):
- Nouvelle planète reçoit `metal_amount = total_metal` (base + supplément) depuis `fleet_data`.

---

### 2. M3 — Slots Expédition

**Statut: CONFORME**

Frontend (`ExpeditionZoneV2.tsx`):
- `computerTechLevel` lu via `planet?.technologies?.computer_tech ?? planet?.computer_tech_level ?? 0`.
- Formule: `maxExpeditionSlots = 1 + Math.floor(computerTechLevel / 4)` — niv.4/8/12 = 2/3/4 slots.
- Indicateur `{activeExpeditionCount}/{maxExpeditionSlots} slots expédition` visible dans le header.
- Message "Tous les slots sont occupés" avec badge rouge et icône AlertTriangle.
- Bouton désactivé quand `activeExpeditionCount >= maxExpeditionSlots`.

---

### 3. M10 — Piraterie

**Statut: PARTIELLEMENT CONFORME**

Backend (`handlers/fleet.rs`):
- Logique Espionnage vs Informatique cible : conforme.
- Cap 100 SC : conforme.
- ECART: En cas d'échec, consomme uniquement 5 spy_probes (pas la totalité de la flotte engagée). La demande indiquait "perte de la flotte". Il n'y a pas de flotte "engagée" à proprement parler dans ce modèle — la mission se déclenche par planète source sans sélection de flotte.
- En cas de succès : consomme 1 spy_probe.

Frontend:
- MANQUANT: Aucune interface dédiée à la mission piraterie. La route `/fleet/piracy` existe côté backend mais n'est pas exposée dans l'UI joueur.

Actions requises (hors PM):
- Décision de design: confirmer si "perte de la flotte" = les 5 probes (comportement actuel) ou un mécanisme de flotte complète.
- Créer une interface frontend pour lancer une mission piraterie.

---

### 4. Deploy / Rappel

**Statut: CONFORME**

Frontend (`FleetDispatcher.tsx`):
- Onglet "Déployer" présent et visible (4ème onglet, violet).
- Sélection de planète cible parmi ses propres colonies + sélection de flotte.
- Section "Rappel de Flotte" présente avec bouton "Rappeler" par mission active.
- Description "Vos vaisseaux ne peuvent pas être attaqués pendant le transit" visible.

---

### 5. Installations

**Statut: CONFORME**

Frontend (`Facilities.tsx`):
- `BUILDING_EFFECTS` fournit des descriptions concrètes par building_key, affichées sous le nom du bâtiment.
- `getConfiguredStats` affiche les valeurs actuelles + prochaine valeur + gain explicite dans un encadré vert distinct.
- Exemples: Chantier Spatial "Débloque la construction de vaisseaux et défenses", Labo "Débloque et accélère les recherches".

---

### 6. BonusSummaryView

**Statut: CONFORME (correction typographique appliquée)**

- Section titrée "Recherches de cette planète" — conforme.
- Note explicative présente. Correction appliquée: "propres a chaque planete" corrigé en "propres à chaque planète dans ce jeu."
- Vue accessible depuis le menu sidebar (`id: 'bonus'`).
- Bonus différenciés: bâtiments planète, biome, slots planète, items actifs, puis section séparée recherches de la planète.

---

### 7. M1 / M2 — Inventaire (resource_boost et stealth)

**Statut: CONFORME**

`UndergroundMarket.tsx`:
- `UNIMPLEMENTED_EFFECTS` contient uniquement `coordinate_jam` et `eco_virus`. `resource_boost` et `stealth` ont le bouton "Acheter" actif.

`Inventory.tsx`:
- Bouton "Utiliser" disponible pour tous les items non actifs.
- `handleActivate` gère `resource_boost` (+50% 24h) et `stealth` (invisible 6h) avec messages spécifiques.
- Badge "Actif jusqu'à X" affiché quand l'item est en cours.

---

### Tableau de Synthèse PM Review

| Feature | Statut |
|---------|--------|
| 1. Colonisation base+supplément | CONFORME |
| 2. M3 Slots expédition | CONFORME |
| 3. M10 Piraterie | PARTIELLEMENT CONFORME — UI frontend manquante; perte = 5 probes et non flotte entière |
| 4. Deploy/Rappel | CONFORME |
| 5. Installations descriptions | CONFORME |
| 6. BonusSummaryView techs par planète | CONFORME (typos corrigés) |
| 7. M1/M2 Inventaire activable | CONFORME |

---

## Légende
- [x] = Terminé et mergé sur main
- [ ] = À faire ou en cours
- [~] = Partiel / à revoir

---

## Features Marché Noir

| ID  | Feature                        | Statut | Notes                                                                 |
|-----|--------------------------------|--------|-----------------------------------------------------------------------|
| M1  | resource_boost activable       | [x]    | +50% prod. 24h — backend effectif + frontend Inventory + BonusSummaryView |
| M2  | stealth activable              | [x]    | Invisibilité galaxie 6h — backend galaxy.rs + frontend Inventory      |

## Features Flotte & Missions

| ID  | Feature                        | Statut | Notes                                                                 |
|-----|--------------------------------|--------|-----------------------------------------------------------------------|
| M3  | Slots expédition multiples     | [x]    | Formule serveur : `1 + floor(computer_tech / 4)`. Frontend corrigé (`planet.technologies.computer_tech`). BonusSummaryView formule alignée. |
| M7  | ACS (Allied Combat System)     | [~]    | Phase 1 : dispatch + coordination OK. Phase 2 : résolution tick non implémentée. |
| M10 | Mission Piraterie              | [~]    | Backend OK — cap 100 SC vérifié dans le code (changelog indique 1 000 SC par erreur). À tester en jeu. |

## Features Économie & Progression

| ID  | Feature                        | Statut | Notes                                                                 |
|-----|--------------------------------|--------|-----------------------------------------------------------------------|
| M4  | Récompense quotidienne (streak)| [x]    | Bouton empire + notifications + missions/achievements hookés           |
| M5  | Classement enrichi             | [x]    | 3 nouveaux tableaux : Expéditions, Recherche, Hall of Fame            |
| M6  | (non assigné)                  | [ ]    | Non défini dans le scope Sprint 3                                     |

## Features Équilibrage

| ID  | Feature                        | Statut | Notes                                                                 |
|-----|--------------------------------|--------|-----------------------------------------------------------------------|
| M8  | (non assigné)                  | [ ]    | Non défini dans le scope Sprint 3                                     |
| M9  | (non assigné)                  | [ ]    | Non défini dans le scope Sprint 3                                     |
| M11 | Cooldown attaque 4h            | [x]    | Configurable via admin panel (`attack_cooldown_hours`)                |
| M14 | Bomber +20% attaque            | [x]    | Migration m20260313_000011                                            |
| M15 | Heavy Hunter RF x6 vs Cruiser  | [x]    | Migration m20260313_000012                                            |

## Features UX & Fixes

| ID  | Feature                        | Statut | Notes                                                                 |
|-----|--------------------------------|--------|-----------------------------------------------------------------------|
| M12 | Soft-delete comptes            | [x]    | `DELETE /users/:id` → champ `deleted_at`, accès révoqué              |
| M13 | Cargo recycleur depuis DB      | [x]    | Capacité lue depuis `ship_types.cargo_capacity`                       |
| M16 | Modal recycleur enrichi        | [x]    | Affiche métal/cristal dispo + calcul recycleurs nécessaires + bouton MAX |

---

## Features UI Cross-Sprint

| Feature                        | Statut | Notes                                                                 |
|--------------------------------|--------|-----------------------------------------------------------------------|
| Deploy/Recall UI               | [x]    | FleetDispatcher — onglet Déployer, section Rappel de Flotte          |
| BonusSummaryView libellés      | [x]    | "Recherches de cette planète" (par planète, non global). Formule slots expédition alignée backend. |
| Installations descriptions     | [x]    | Effets concrets affichés sous chaque bâtiment dans Facilities.tsx    |
| ColonizeModal                  | [x]    | Intégré dans GalaxyView — RadialMenu "Coloniser"                     |
| ActiveMissions couleurs        | [x]    | Couleurs par type de mission dans ActiveMissions.tsx                 |

---

## Points d'attention PM

### Discrepance documentation M10
Le changelog v13.0.0 indique "plafonné à 1 000 SC" pour la mission Piraterie.
Le code backend (`handlers/fleet.rs` ligne ~2203) applique `.min(100.0)` — cap réel = **100 SC**.
Action requise : corriger le changelog ou le code selon la décision du Game Designer.

### ACS Phase 2 non implémentée (M7)
La résolution des missions ACS dans le tick loop n'est pas en place.
Les joueurs peuvent créer et rejoindre des groupes ACS, mais le combat fusionné ne se résout pas.
Statut bloquant pour tout événement PvP multi-joueurs coordonné.

### Formule slots expédition (M3)
- Backend : `1 + floor(computer_tech / 4)` (niveaux 0-3 = 1 slot, 4-7 = 2, 8-11 = 3, 12+ = 4)
- BonusSummaryView était incorrect (`1 + floor(astrophysics / 2)` capped by computer_tech) — corrigé dans ce commit.
- Vérifier que la UI expédition (FleetDispatcher) affiche aussi la bonne formule.
