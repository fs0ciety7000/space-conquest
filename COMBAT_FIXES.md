# Corrections du système de combat PvP

## Résumé

Quatre bugs identifiés et corrigés dans le moteur de combat PvP (`backend/src/combat.rs` et `backend/src/main.rs`).

---

## Bug 1 — Attaquant tire en premier (dégâts séquentiels)

### Problème

Dans `resolve_pvp_combat`, le combat était **séquentiel** : l'attaquant calculait et appliquait ses dégâts d'abord. Si le défenseur mourait après ce premier tir, il n'avait jamais l'occasion de riposter.

```rust
// AVANT (séquentiel — favorise l'attaquant)
let attacker_damage = attacker_fleet.calculate_damage_to_fleet(...);
defender_fleet.take_damage(attacker_damage, ...);
if defender_fleet.is_destroyed() { winner = "attacker"; break; } // défenseur mort, ne riposte jamais

let defender_damage = defender_fleet.calculate_damage_to_fleet(...);
attacker_fleet.take_damage(defender_damage, ...);
```

Concrètement : un attaquant avec assez de puissance de feu pour détruire le défenseur en 1 round gagnait **sans prendre aucun dégât**, même si le défenseur avait une flotte bien plus grande.

### Correction

Les dégâts sont maintenant **calculés simultanément** avant d'être appliqués, comme dans OGame.

```rust
// APRÈS (simultané — équitable)
let attacker_damage = attacker_fleet.calculate_damage_to_fleet(...);
let defender_damage = defender_fleet.calculate_damage_to_fleet(...);

// Application simultanée — les deux côtés encaissent en même temps
defender_fleet.take_damage(attacker_damage, ...);
attacker_fleet.take_damage(defender_damage, ...);
```

---

## Bug 2 — Technologies de combat ignorées

### Problème

`resolve_pvp_combat` recevait uniquement les vaisseaux (`HashMap<String, i32>`). Les niveaux de technologie (armes, boucliers, blindage) n'étaient **pas appliqués** aux calculs de combat. Peu importe le niveau de labo ou de techno, ça ne changeait rien au résultat.

### Correction

Ajout d'une struct `CombatBonuses` et de multiplicateurs appliqués aux stats de chaque côté :

| Technologie    | Effet                              | Formule                          |
|----------------|------------------------------------|----------------------------------|
| `weapons_tech` | +10% attaque par niveau            | `attack × (1.0 + level × 0.1)`  |
| `shield_tech`  | +10% bouclier par niveau           | `shield × (1.0 + level × 0.1)`  |
| `armour_tech`  | +10% coque par niveau              | `hull × (1.0 + level × 0.1)`    |

Nouvelle fonction `load_planet_tech_bonuses` dans `main.rs` qui charge les niveaux depuis `planet_technologies` et construit le `CombatBonuses` correspondant.

Exemple : weapons_tech niveau 5 → multiplicateur d'attaque de **1.5×** (+50%).

---

## Bug 3 — Défenses planétaires ignorées

### Problème

Les défenses de la planète défenseur (lance-roquettes, canons laser, etc.) n'étaient **pas chargées** et ne participaient pas au combat. Le défenseur se battait uniquement avec ses vaisseaux, même s'il avait des centaines de tourelles construites.

### Correction

Ajout de deux fonctions dans `main.rs` :
- `load_planet_defenses_for_combat` : charge les défenses depuis `planet_defenses` avec les stats de `defense_types`, retourne `HashMap<String, i32>` avec des clés préfixées `def_{defense_key}` pour éviter les collisions avec les vaisseaux.
- `set_planet_defenses_after_combat` : met à jour les compteurs de défenses survivantes après le combat.

Dans `combat.rs`, `load_defense_stats_into_cache` charge les stats (attack/shield/hull) depuis la table `defense_types` et les fusionne dans le `ShipStatsCache` existant avec le préfixe `def_`.

Les défenses sont ajoutées à la flotte défenseur avant le combat. Les survivantes sont sauvegardées en DB après.

---

## Bug 4 — `loss_ratio` non plafonné à 1.0

### Problème

Dans `Fleet::take_damage`, si les dégâts reçus dépassaient les PV totaux de la flotte (`damage > total_def`), le ratio de perte devenait supérieur à 1.0 :

```rust
let loss_ratio = damage / total_def; // pouvait valoir 1.5, 2.0, etc.
// 1.0 - 1.5 = -0.5
// count * (-0.5) = négatif → floor as i32 → négatif → removed
```

Le résultat final était correct (flotte détruite) mais via des valeurs négatives intermédiaires, ce qui est sémantiquement faux et potentiellement source de bugs futurs.

### Correction

```rust
// APRÈS
let loss_ratio = (damage / total_def).min(1.0); // plafonné à 100% de pertes max
```

---

## Fichiers modifiés

| Fichier | Changements |
|---------|-------------|
| `backend/src/combat.rs` | `CombatBonuses` struct, `load_defense_stats_into_cache`, signature `resolve_pvp_combat` mise à jour, dégâts simultanés, `loss_ratio` clampé, tech multipliers dans `calculate_damage_to_fleet` et `get_total_defense` |
| `backend/src/main.rs` | `load_planet_tech_bonuses`, `load_planet_defenses_for_combat`, `set_planet_defenses_after_combat`, appel `resolve_pvp_combat` mis à jour, save défenses post-combat |

---

## Impact attendu

- Un défenseur avec plus de troupes **riposte toujours**, même s'il est détruit en 1 round.
- Un joueur avec technologies avancées a un **avantage réel** en combat.
- Les défenses planétaires **contribuent à la défense** comme prévu.
- Plus de valeurs négatives intermédiaires dans le calcul des pertes.
