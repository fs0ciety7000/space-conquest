# Guide de Dépannage - Système Tech Tree

## Problèmes Identifiés et Solutions

### ❌ Problème 1: Erreur 500 sur `/planets/:id/building-types`

**Symptôme:**
```
GET http://localhost:8080/planets/{id}/building-types
[HTTP/1.1 500 Internal Server Error 1ms]
```

**Cause:**
La table `building_types` n'a pas la colonne `base_time_seconds` que l'entité attend.

**Solution:**
1. Appliquer la migration qui ajoute cette colonne:
   ```bash
   cd backend/migration
   cargo run -- up
   ```

2. Redémarrer le backend:
   ```bash
   # Docker
   docker-compose restart backend

   # Direct
   cd backend && cargo run --release
   ```

**Vérification:**
```bash
psql -U postgres -d space_db -c "\d building_types" | grep base_time_seconds
# Devrait afficher une ligne avec base_time_seconds
```

---

### ❌ Problème 2: Erreur 500 sur `/planets/:id/defense-types`

**Symptôme:**
```
GET http://localhost:8080/planets/{id}/defense-types
[HTTP/1.1 500 Internal Server Error 1ms]
```

**Cause:**
Même problème que pour building-types - tables incomplètes ou migrations non appliquées.

**Solution:**
Identique au Problème 1.

---

### ❌ Problème 3: Variables manquantes dans PlanetOverview (Frontend)

**Symptôme:**
Le frontend affiche `undefined` ou des erreurs pour les niveaux de technologies et vaisseaux.

**Cause:**
Le frontend utilise les anciennes colonnes (`planet.laser_battery_level`) alors que les données sont maintenant dans `planet.technologies` et `planet.ships`.

**Solution:**

Créer des fonctions helper de compatibilité:

```js
// utils/compatibility.js
export function getTechLevel(planet, techKey) {
  // Nouveau système
  if (planet.technologies && planet.technologies[techKey] !== undefined) {
    return planet.technologies[techKey];
  }

  // Ancien système (fallback)
  const oldMap = {
    'energy_tech': 'energy_tech_level',
    'laser_tech': 'laser_battery_level',
    'espionage': 'espionage_tech_level',
    'armour_tech': 'armour_tech_level'
  };

  return planet[oldMap[techKey]] || 0;
}

export function getShipCount(planet, shipKey) {
  return planet.ships?.[shipKey]?.count || planet[`${shipKey}_count`] || 0;
}
```

Utilisation:
```vue
<template>
  <div>
    Laser Tech: {{ getTechLevel(planet, 'laser_tech') }}
    Chasseurs: {{ getShipCount(planet, 'light_hunter') }}
  </div>
</template>
```

---

### ❌ Problème 4: construction_speed_multiplier n'a pas d'effet

**Symptôme:**
Après avoir mis `construction_speed_multiplier` à 900, les temps de construction ne changent pas.

**Causes possibles:**

1. **Le backend n'a pas été redémarré**
   - Le cache de configuration est chargé au démarrage

2. **La valeur n'est pas dans la base de données**
   ```bash
   psql -U postgres -d space_db -c "SELECT * FROM server_config WHERE config_key = 'construction_speed_multiplier';"
   ```

3. **Le frontend cache les données**
   - Vider le cache du navigateur (Ctrl+Shift+R)
   - Vérifier les DevTools → Network pour voir les vraies réponses

**Solution:**

1. Vérifier que la config existe:
   ```sql
   -- Se connecter à la DB
   psql -U postgres -d space_db

   -- Vérifier/insérer la config
   INSERT INTO server_config (config_key, config_value, description)
   VALUES ('construction_speed_multiplier', '900', 'Multiplicateur de vitesse de construction')
   ON CONFLICT (config_key) DO UPDATE SET config_value = '900';
   ```

2. Redémarrer le backend:
   ```bash
   docker-compose restart backend
   # OU
   killall backend && cd backend && cargo run --release
   ```

3. Vérifier que le calcul est appliqué:
   - Lancer une construction
   - Le temps affiché devrait être divisé par 900
   - Formule: `temps_final = temps_base / (speed_factor / 100 * construction_speed_multiplier)`

**Exemple de calcul:**
- Temps de base: 3600 secondes (1h)
- speed_factor: 100 (défaut)
- construction_speed_multiplier: 900
- Temps final: 3600 / (100/100 * 900) = 3600 / 900 = 4 secondes

---

### ❌ Problème 5: Erreur 400 lors de l'amélioration d'une technologie

**Symptôme:**
```
POST /planets/{id}/upgrade/laser_tech
[HTTP/1.1 400 Bad Request]
```

**Cause:**
L'API upgrade_mine_handler ne reconnaît pas les nouvelles technologies du tech tree.

**Solution:**
✅ Déjà corrigé dans le commit `14f5751` - Le handler vérifie maintenant si la tech existe dans la table `technologies` avant d'utiliser le système tech tree.

Assurez-vous que le backend a été recompilé et redémarré après le dernier commit.

---

## Checklist de Migration Complète

- [ ] Migrations appliquées (`cargo run -- up` dans backend/migration)
- [ ] Backend recompilé (`cargo build --release`)
- [ ] Backend redémarré
- [ ] Vérification: `/planets/:id/building-types` retourne 200
- [ ] Vérification: `/planets/:id/defense-types` retourne 200
- [ ] Frontend mis à jour avec fonctions helper
- [ ] construction_speed_multiplier vérifié dans DB
- [ ] Tests des améliorations de technologie

---

## Scripts Utiles

### Vérifier les données migrées

```bash
# Technologies
psql -U postgres -d space_db -c "SELECT tech_key, name, category FROM technologies LIMIT 5;"

# Ship types
psql -U postgres -d space_db -c "SELECT ship_key, name, category FROM ship_types LIMIT 5;"

# Building types
psql -U postgres -d space_db -c "SELECT building_key, name, category, base_time_seconds FROM building_types LIMIT 5;"

# Server config
psql -U postgres -d space_db -c "SELECT config_key, config_value FROM server_config WHERE config_key LIKE '%speed%';"
```

### Recréer complètement la base de données

⚠️ **ATTENTION: Supprime toutes les données!**

```bash
cd backend/migration
cargo run -- fresh
```

### Voir les logs du backend

```bash
# Docker
docker-compose logs -f backend

# Direct
# Les logs s'affichent dans le terminal où vous avez lancé cargo run
```

---

## Nouveaux Endpoints Disponibles

Après la migration, ces endpoints sont disponibles:

- `GET /planets/:id/tech-tree` - Arbre technologique complet
- `GET /planets/:id/ship-types` - Types de vaisseaux avec requirements
- `GET /planets/:id/building-types` - Types de bâtiments avec requirements
- `GET /planets/:id/defense-types` - Types de défenses avec requirements
- `POST /planets/:id/research/:tech_key` - Démarrer une recherche
- `POST /planets/:id/build-ships/:ship_key/:quantity` - Construire des vaisseaux

---

## Support

Si les problèmes persistent:

1. Vérifier les logs du backend
2. Vérifier la console du navigateur (F12)
3. Vérifier que toutes les migrations sont appliquées: `cargo run -- status`
4. Vérifier les commits: Le dernier commit doit être `14f5751` ou plus récent
