# Scripts de Maintenance - Base de Données Locale

Ces scripts permettent de gérer et réparer la base de données locale.

## 📋 Prérequis

Les scripts utilisent les variables d'environnement depuis :
- `../../.env.migration` (TARGET_DB_*)
- ou `../../.env` (DATABASE_URL)

## 🔧 Scripts Disponibles

### 1. `diagnostic_resources.sh` - Diagnostic des Ressources
Analyse complète de l'état des ressources et de la production.

```bash
cd backend/scripts
./diagnostic_resources.sh
```

**Ce qu'il vérifie :**
- ✅ Timestamps `last_update` (dates dans le futur, trop anciennes, etc.)
- ✅ Comparaison `planet_buildings` vs colonnes legacy
- ✅ Ressources actuelles par planète
- ✅ Configuration serveur (multiplicateurs de vitesse)
- ✅ Estimation de production théorique

### 2. `sync_building_levels.sh` - Synchronisation Bâtiments
Copie les niveaux depuis `planet_buildings` vers colonnes legacy de `planet`.

```bash
cd backend/scripts
./sync_building_levels.sh
```

**Utiliser si :**
- ❌ Production affiche 0/h
- ❌ Ressources ne montent pas
- ❌ Bâtiments construits via `planet_buildings` mais colonnes legacy à 0

**Ce qu'il synchronise :**
- metal_mine, crystal_mine, deuterium_mine
- solar_plant, shipyard, research_lab
- hangar (resource_hangar), resource_storage

### 3. `fix_last_update.sh` - Correction Timestamps
Met à jour tous les `last_update` à NOW().

```bash
cd backend/scripts
./fix_last_update.sh
```

**Utiliser si :**
- ❌ Timestamps dans le futur
- ❌ Timestamps très anciens après migration
- ❌ Ressources qui font du "yoyo"

### 4. `enable_maintenance.sh` / `disable_maintenance.sh`
Active/désactive le mode maintenance localement.

```bash
cd backend/scripts
./enable_maintenance.sh "TITRE" "durée" "description"
./disable_maintenance.sh
```

## 🚀 Ordre d'Exécution Recommandé

Si vous avez des problèmes de production de ressources :

```bash
cd backend/scripts

# 1. Diagnostic pour identifier le problème
./diagnostic_resources.sh

# 2. Si désynchronisation planet_buildings vs legacy
./sync_building_levels.sh

# 3. Si timestamps problématiques
./fix_last_update.sh

# 4. Re-diagnostic pour vérifier
./diagnostic_resources.sh
```

## 📊 Comprendre les Résultats

### Diagnostic - Section 3 : "COMPARAISON planet_buildings vs colonnes legacy"

Si vous voyez `⚠️ DESYNC!` dans la colonne `sync_status` :
- `pb_metal_mine` > 0 mais `legacy_metal_mine` = 0
- **Solution** : Exécuter `./sync_building_levels.sh`

### Diagnostic - Section 1 : "TIMESTAMPS last_update"

Si `seconds_since_newest_update` est très grand (>3600) ou négatif :
- **Solution** : Exécuter `./fix_last_update.sh`

## ⚠️ Notes Importantes

1. **Architecture Double** : Le backend lit encore les colonnes legacy (`metal_mine_level`) au lieu de `planet_buildings`. La synchronisation est donc nécessaire jusqu'à ce que le code soit migré.

2. **Fréquence de Synchronisation** : Exécutez `sync_building_levels.sh` après toute construction de bâtiment via l'interface web si la production ne se met pas à jour automatiquement.

3. **Sauvegarde** : Tous les scripts utilisent des transactions (`BEGIN/COMMIT`) mais il est recommandé de faire une sauvegarde avant les opérations de masse.

## 🔗 Scripts Render

Les équivalents pour la base Render (production) sont disponibles à la racine du projet :
- `render_diagnostic_resources.sh`
- `render_sync_building_levels.sh`
- `render_fix_last_update.sh`
