# Sprint 3 — Feature Status (M1-M16)
Dernière mise à jour : 2026-03-13

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
