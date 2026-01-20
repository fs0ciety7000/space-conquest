# Frontend Migration Guide - Tech Tree System

## Vue d'ensemble

Le système de tech tree a été migré d'un modèle de colonnes fixes vers un système relationnel dynamique.

## Changements dans l'API

### Ancienne structure
```js
{
  id: "uuid",
  name: "Planète",
  energy_tech_level: 5,
  laser_battery_level: 3,
  espionage_tech_level: 2,
  armour_tech_level: 1,
  light_hunter_count: 10,
  cruiser_count: 5,
  // ...
}
```

### Nouvelle structure
```js
{
  id: "uuid",
  name: "Planète",
  // Anciennes colonnes toujours présentes (rétrocompatibilité partielle)
  energy_tech_level: 5,
  // ...

  // NOUVEAU: Tech tree dynamique
  technologies: {
    "energy_tech": 5,
    "laser_tech": 3,
    "ion_tech": 0,
    "plasma_tech": 0,
    "combustion_drive": 2,
    "impulse_drive": 0,
    "hyperspace_drive": 0,
    // ... toutes les technologies
  },

  // NOUVEAU: Vaisseaux avec détails
  ships: {
    "light_hunter": {
      count: 10,
      display_name: "Chasseur Léger",
      attack: 50,
      shield: 10,
      hull: 400
    },
    "cruiser": {
      count: 5,
      display_name: "Croiseur",
      attack: 400,
      shield: 50,
      hull: 2700
    }
    // ...
  }
}
```

## Code de Migration pour PlanetOverview.vue (ou similaire)

### Fonction helper de compatibilité

```js
// Ajouter dans votre composant ou dans un fichier utils
export function getTechLevel(planet, techKey) {
  // Nouveau système (prioritaire)
  if (planet.technologies && planet.technologies[techKey] !== undefined) {
    return planet.technologies[techKey];
  }

  // Ancien système (fallback)
  const oldColumnMap = {
    'energy_tech': 'energy_tech_level',
    'laser_tech': 'laser_battery_level',
    'espionage': 'espionage_tech_level',
    'armour_tech': 'armour_tech_level'
  };

  const oldColumn = oldColumnMap[techKey];
  if (oldColumn && planet[oldColumn] !== undefined) {
    return planet[oldColumn];
  }

  return 0;
}

export function getShipCount(planet, shipKey) {
  // Nouveau système
  if (planet.ships && planet.ships[shipKey]) {
    return planet.ships[shipKey].count;
  }

  // Ancien système (fallback)
  const oldColumnMap = {
    'light_hunter': 'light_hunter_count',
    'cruiser': 'cruiser_count',
    'spy_probe': 'spy_probe_count',
    'transporter': 'transporter_count',
    'colony_ship': 'colony_ship_count',
    'recycler': 'recycler_count'
  };

  const oldColumn = oldColumnMap[shipKey];
  if (oldColumn && planet[oldColumn] !== undefined) {
    return planet[oldColumn];
  }

  return 0;
}
```

### Utilisation dans les templates

**Avant :**
```vue
<template>
  <div>
    <p>Laser Tech: {{ planet.laser_battery_level }}</p>
    <p>Chasseurs: {{ planet.light_hunter_count }}</p>
  </div>
</template>
```

**Après :**
```vue
<template>
  <div>
    <p>Laser Tech: {{ getTechLevel(planet, 'laser_tech') }}</p>
    <p>Chasseurs: {{ getShipCount(planet, 'light_hunter') }}</p>
  </div>
</template>

<script>
import { getTechLevel, getShipCount } from '@/utils/compatibility';

export default {
  methods: {
    getTechLevel,
    getShipCount
  }
}
</script>
```

## Nouvelles possibilités

Avec le nouveau système, vous pouvez maintenant accéder à TOUTES les technologies :

```vue
<template>
  <div>
    <h3>Technologies disponibles</h3>
    <div v-for="(level, techKey) in planet.technologies" :key="techKey">
      {{ techKey }}: niveau {{ level }}
    </div>
  </div>
</template>
```

## Temps de construction

Les calculs de temps utilisent maintenant :
```js
// Le calcul prend en compte construction_speed_multiplier automatiquement
const buildTime = calculateBuildTime(cost, facilityLevel, config);
```

La formule côté backend est :
```rust
speed_factor = (speed_factor / 100.0) * construction_speed_multiplier
final_time = base_time / speed_factor
```

Donc si `construction_speed_multiplier = 900`, les constructions seront 900x plus rapides !
