
# Guide du Système de Maintenance

## 📋 Vue d'Ensemble

Le système de maintenance permet d'afficher une page élégante (style terminal hacking) aux joueurs pendant les mises à jour.

## 🚀 Démarrage Rapide

### 1. Appliquer le Patch de Compensation

Après avoir migré, appliquez le patch pour compenser les pertes:

```bash
psql -h localhost -U user -d space_db -f compensation_patch.sql
```

Ce patch applique:
- ✅ +250,000 Métal à tous les joueurs
- ✅ +125,000 Cristal à tous les joueurs
- ✅ +75,000 Deutérium à tous les joueurs
- ✅ +2 niveaux à toutes les mines
- ✅ +5 niveaux à la centrale solaire
- ✅ Vitesse de construction x300

### 2. Activer le Mode Maintenance

```bash
cd backend/scripts
chmod +x enable_maintenance.sh disable_maintenance.sh
./enable_maintenance.sh "MAINTENANCE PROGRAMMÉE" "20 minutes"
```

Les joueurs verront immédiatement la page de maintenance avec des animations Matrix.

### 3. Faire vos Modifications

Pendant que la maintenance est active:
- Arrêtez le backend si nécessaire
- Appliquez vos migrations
- Testez en local
- Redémarrez le backend

### 4. Désactiver le Mode Maintenance

```bash
./disable_maintenance.sh
```

La page de maintenance disparaît automatiquement et les joueurs peuvent jouer.

## 🎨 Page de Maintenance

La page de maintenance affiche:
- ✅ Effet Matrix en arrière-plan (colonnes vertes animées)
- ✅ Terminal style hacking avec scanline CRT
- ✅ Animation typewriter pour les messages
- ✅ Barre de progression animée
- ✅ ASCII art Space Conquest
- ✅ Informations de durée et statut

## 🔧 Personnalisation des Messages

### Via SQL Direct

```sql
-- Changer le titre
UPDATE server_config
SET config_value = 'MISE À JOUR MAJEURE'
WHERE config_key = 'maintenance_message_title';

-- Changer le message (séparé par |)
UPDATE server_config
SET config_value = 'Mise à jour en cours...|Nouveau système de combat|Attendez-vous à du sang!|Merci de votre patience !'
WHERE config_key = 'maintenance_message_description';

-- Changer la durée
UPDATE server_config
SET config_value = '45 minutes'
WHERE config_key = 'maintenance_estimated_duration';
```

### Via Script Bash

```bash
# Activer avec message personnalisé
./enable_maintenance.sh "GROSSE UPDATE" "1 heure"
```

## 📱 Intégration Frontend

### Vérifier le Statut de Maintenance

Ajoutez ceci dans votre `App.tsx`:

```typescript
import MaintenancePage from './components/MaintenancePage';
import { useState, useEffect } from 'react';

function App() {
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);

  useEffect(() => {
    // Vérifier le statut toutes les 10 secondes
    const checkMaintenance = async () => {
      try {
        const response = await fetch('/api/maintenance/status');
        const data = await response.json();
        setMaintenanceEnabled(data.enabled);
      } catch (error) {
        console.error('Error checking maintenance:', error);
      }
    };

    checkMaintenance();
    const interval = setInterval(checkMaintenance, 10000);
    return () => clearInterval(interval);
  }, []);

  if (maintenanceEnabled) {
    return <MaintenancePage />;
  }

  return (
    // ... votre app normale
  );
}
```

## 🔄 Mode Automatique (Optionnel)

Pour désactiver automatiquement la maintenance après un certain temps:

```sql
-- Programmer désactivation automatique dans 30 minutes
UPDATE server_config
SET config_value = (NOW() + INTERVAL '30 minutes')::text
WHERE config_key = 'maintenance_auto_disable_at';
```

Ajoutez dans votre backend un job qui vérifie périodiquement:

```rust
// Dans votre tick system
async fn check_maintenance_auto_disable(db: &DatabaseConnection) {
    let auto_disable = get_config(db, "maintenance_auto_disable_at").await;
    if let Some(time_str) = auto_disable {
        if let Ok(target_time) = NaiveDateTime::parse_from_str(&time_str, "%Y-%m-%d %H:%M:%S") {
            if chrono::Utc::now().naive_utc() >= target_time {
                // Désactiver automatiquement
                set_config(db, "maintenance_enabled", "false").await;
            }
        }
    }
}
```

## 📊 Templates de Messages

### Mise à Jour Mineure

```bash
./enable_maintenance.sh "Maintenance Rapide" "5-10 minutes"
```

Message suggéré:
```
> Optimisations de performance en cours
> Corrections de bugs mineurs
> Aucune donnée ne sera perdue
> Merci de votre patience !
```

### Mise à Jour Majeure

```bash
./enable_maintenance.sh "MISE À JOUR MAJEURE v2.0" "30-45 minutes"
```

Message suggéré:
```
> Nouveau système de tech tree
> 15+ technologies avancées
> 12+ types de vaisseaux
> Système de planète mère
> Améliorations graphiques
> Optimisations de performance
>
> Vos comptes seront préservés
> Vos ressources seront compensées
> Merci de votre patience !
```

### Urgence/Hotfix

```bash
./enable_maintenance.sh "🚨 CORRECTION URGENTE" "2-3 minutes"
```

Message suggéré:
```
> Correction d'un bug critique
> Retour en ligne imminent
> Aucune donnée affectée
```

## 🛠️ Dépannage

### La page de maintenance ne s'affiche pas

```sql
-- Vérifier que la config existe
SELECT * FROM server_config WHERE config_key = 'maintenance_enabled';

-- Si elle n'existe pas, lancer la migration
cd backend/migration
cargo run -- up
```

### Les joueurs voient toujours la maintenance

```bash
# Vérifier le statut
psql -h localhost -U user -d space_db -c \
  "SELECT config_value FROM server_config WHERE config_key = 'maintenance_enabled';"

# Désactiver manuellement
./disable_maintenance.sh
```

### Changer le message en temps réel

Les changements dans `server_config` sont appliqués immédiatement. Les joueurs verront le nouveau message au prochain refresh de la page (ou après 10s si vous avez le polling automatique).

## 📝 Checklist de Maintenance

**Avant:**
- [ ] Annoncer aux joueurs sur Discord/social
- [ ] Activer le mode maintenance
- [ ] Vérifier que la page s'affiche correctement
- [ ] Arrêter le backend si nécessaire

**Pendant:**
- [ ] Appliquer migrations/patches
- [ ] Tester en local
- [ ] Vérifier les logs

**Après:**
- [ ] Redémarrer le backend
- [ ] Tester rapidement (login, navigation)
- [ ] Désactiver le mode maintenance
- [ ] Annoncer la réouverture
- [ ] Surveiller les erreurs

## 🎨 Personnalisation Avancée

### Changer les Couleurs

Modifiez `MaintenancePage.tsx`:

```typescript
// Changer de vert à bleu
className="text-green-400"  →  className="text-blue-400"
border-green-500            →  border-blue-500
bg-green-900/30             →  bg-blue-900/30
```

### Ajouter un Logo

Dans `MaintenancePage.tsx`, ajoutez avant l'ASCII art:

```tsx
<div className="flex justify-center mb-4">
  <img src="/logo.png" alt="Logo" className="h-24 opacity-80" />
</div>
```

### Changer l'ASCII Art

Remplacez l'ASCII art dans le component par votre propre design.
Générateurs en ligne: https://www.asciiart.eu/text-to-ascii-art

## 🚀 Exemples d'Utilisation

### Maintenance Programmée

1. Annoncer 24h à l'avance
2. Activer 5 minutes avant: `./enable_maintenance.sh`
3. Faire les modifications
4. Désactiver: `./disable_maintenance.sh`

### Hotfix d'Urgence

1. Activer immédiatement: `./enable_maintenance.sh "HOTFIX URGENT" "3 minutes"`
2. Fix rapide
3. Désactiver: `./disable_maintenance.sh`

### Migration Base de Données

1. Activer: `./enable_maintenance.sh "MIGRATION DATABASE" "30 minutes"`
2. Exécuter: `./push_to_production.sh`
3. Tester
4. Désactiver: `./disable_maintenance.sh`

---

**Dernière mise à jour:** 2026-01-21
**Version:** 1.0
