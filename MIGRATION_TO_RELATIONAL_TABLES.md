# Migration des colonnes Planet vers les tables relationnelles

## Problème

Actuellement, le code utilise encore les anciennes colonnes de la table `planet` :
- `metal_mine_level`, `crystal_mine_level`, `deuterium_mine_level`, `solar_plant_level`
- `shipyard_level`, `research_lab_level`, `hangar_level`, `resource_storage_level`
- `energy_tech_level`, `laser_level`, `espionage_level`, etc.
- `light_hunter_count`, `cruiser_count`, `transporter_count`, etc.
- `missile_launcher_count`, `plasma_turret_count`, etc.

Ces colonnes ne sont plus mises à jour par le nouveau système relationnel, causant des bugs et des données incohérentes.

## Solution

Utiliser la structure helper `PlanetData` qui charge toutes les données relationnelles en une seule requête.

### Exemple de migration

**AVANT:**
```rust
async fn example_handler(planet: &planet::Model) {
    let shipyard = planet.shipyard_level;
    let hunters = planet.light_hunter_count;
    let energy_tech = planet.energy_tech_level;
    let metal_mine = planet.metal_mine_level;
}
```

**APRÈS:**
```rust
async fn example_handler(
    db: &DatabaseConnection,
    planet_id: Uuid,
) -> Result<(), DbErr> {
    let planet_data = tech_tree::PlanetData::load(db, planet_id).await?;

    let shipyard = planet_data.building_level("shipyard");
    let hunters = planet_data.ship_count("light_hunter");
    let energy_tech = planet_data.tech_level("energy_tech");
    let metal_mine = planet_data.building_level("metal_mine");

    Ok(())
}
```

## Mappings de remplacement

### Bâtiments (mines + facilities)
```rust
planet.metal_mine_level        → planet_data.building_level("metal_mine")
planet.crystal_mine_level      → planet_data.building_level("crystal_mine")
planet.deuterium_mine_level    → planet_data.building_level("deuterium_mine")
planet.solar_plant_level       → planet_data.building_level("solar_plant")
planet.shipyard_level          → planet_data.building_level("shipyard")
planet.research_lab_level      → planet_data.building_level("research_lab")
planet.hangar_level            → planet_data.building_level("hangar")
planet.resource_storage_level  → planet_data.building_level("resource_storage")
planet.laser_battery_level     → planet_data.defense_count("laser_battery")  // ou building si c'est un bâtiment
```

### Technologies
```rust
planet.energy_tech_level    → planet_data.tech_level("energy_tech")
planet.laser_level          → planet_data.tech_level("laser_tech")
planet.espionage_level      → planet_data.tech_level("espionage_tech")
planet.armour_level         → planet_data.tech_level("armour_tech")
```

### Vaisseaux
```rust
planet.light_hunter_count  → planet_data.ship_count("light_hunter")
planet.cruiser_count       → planet_data.ship_count("cruiser")
planet.transporter_count   → planet_data.ship_count("transporter")
planet.colony_ship_count   → planet_data.ship_count("colony_ship")
planet.recycler_count      → planet_data.ship_count("recycler")
planet.spy_probe_count     → planet_data.ship_count("spy_probe")
```

### Défenses
```rust
planet.missile_launcher_count  → planet_data.defense_count("missile_launcher")
planet.plasma_turret_count     → planet_data.defense_count("plasma_turret")
```

## Fichiers à migrer (priorité)

### Backend - Critique
1. `src/websocket.rs` (lignes 400-465) - Calculs de ressources temps réel
2. `src/alliance.rs` (lignes 1269-1340) - Calculs de points
3. `src/main.rs` - Endpoints d'attaque, transport, espionnage
4. `src/game_logic.rs` - Fonctions de calcul obsolètes

### Backend - Important
5. `src/missions.rs` - Validation des missions
6. `src/combat.rs` - Système de combat

## Étapes de migration

1. **Identifier** les occurrences :
   ```bash
   grep -rn "planet\." src/ | grep -E "_level|_count"
   ```

2. **Remplacer** avec PlanetData :
   - Charger `PlanetData` au début de la fonction
   - Remplacer chaque accès direct par l'appel approprié
   - Passer `planet_data` aux fonctions qui en ont besoin

3. **Tester** :
   ```bash
   cargo test
   cargo check
   ```

4. **Déprécier** les anciennes colonnes :
   - Ajouter des commentaires `// DEPRECATED`
   - Éventuellement les supprimer de la table dans une future migration

## Notes importantes

- **Performance** : `PlanetData::load()` fait 4 requêtes mais récupère toutes les données d'un coup. Pour les endpoints qui ont besoin de données partielles, utiliser directement `get_planet_building_level()`, `get_planet_ship_count()`, etc.

- **Compatibilité** : Les anciennes colonnes existent toujours mais ne sont plus mises à jour. Ne pas les utiliser pour de nouvelles fonctionnalités.

- **Frontend** : Les composants frontend doivent utiliser les données des endpoints API, pas les colonnes planet directement.

## Aide

Pour toute question sur la migration, consulter :
- `backend/src/tech_tree.rs` - Définition de `PlanetData`
- `migration/src/m20260125_200002_seed_complete_expansion_data.rs` - Building/tech/ship types
