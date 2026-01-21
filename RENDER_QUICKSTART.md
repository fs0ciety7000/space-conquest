# Guide Rapide - Appliquer sur Render

## 🎯 Objectif

Appliquer le patch de compensation et gérer la maintenance sur votre production Render.

## 📋 Étapes Rapides

### 1. Annoncer la Maintenance (Discord/Social)

```
🔧 MAINTENANCE PROGRAMMÉE

Le serveur sera en maintenance dans 5 minutes pour une compensation suite à la migration.

Bonus pour tous les joueurs:
• +250,000 Métal 💎
• +125,000 Cristal 💠
• +75,000 Deutérium ⚡
• +2 niveaux de mines ⛏️
• +5 niveaux centrale solaire ☀️
• Construction x300 plus rapide 🚀

Durée: 5-10 minutes
Début: [HEURE]

Merci de votre patience !
```

### 2. Activer la Maintenance sur Render

```bash
chmod +x render_enable_maintenance.sh
./render_enable_maintenance.sh "COMPENSATION JOUEURS" "10 minutes"
```

✅ Les joueurs voient maintenant la page Matrix de maintenance !

### 3. Appliquer le Patch de Compensation

```bash
chmod +x render_apply_compensation.sh
./render_apply_compensation.sh
```

Le script vous demandera confirmation, tapez `y`.

**Ce que ça fait:**
- ✅ +250K métal, +125K cristal, +75K deutérium
- ✅ +2 niveaux mines
- ✅ +5 niveaux centrale solaire
- ✅ Vitesse construction x300

**Durée:** ~5 secondes

### 4. Vérifier les Résultats

Le script affiche automatiquement:
- Nombre de joueurs affectés
- Ressources de chaque joueur
- Niveaux de mines

### 5. Désactiver la Maintenance

```bash
chmod +x render_disable_maintenance.sh
./render_disable_maintenance.sh
```

✅ Les joueurs peuvent rejouer !

### 6. Annoncer la Fin

```
✅ MAINTENANCE TERMINÉE

Le serveur est de nouveau en ligne !

Tous les joueurs ont reçu leurs compensations :
• +250,000 Métal 💎
• +125,000 Cristal 💠
• +75,000 Deutérium ⚡
• Mines améliorées ⛏️
• Constructions 300x plus rapides 🚀

Bon jeu ! 🚀
```

## 🔧 Scripts Disponibles

| Script | Description |
|--------|-------------|
| `render_enable_maintenance.sh` | Active la maintenance sur Render |
| `render_disable_maintenance.sh` | Désactive la maintenance sur Render |
| `render_apply_compensation.sh` | Applique le patch de compensation |

## 💡 Commandes Utiles

### Vérifier le statut de maintenance

```bash
source .env.migration
PGPASSWORD=$SOURCE_DB_PASSWORD psql \
  -h $SOURCE_DB_HOST \
  -U $SOURCE_DB_USER \
  -d $SOURCE_DB_NAME \
  -c "SELECT config_value FROM server_config WHERE config_key = 'maintenance_enabled';"
```

### Voir les ressources d'un joueur

```bash
source .env.migration
PGPASSWORD=$SOURCE_DB_PASSWORD psql \
  -h $SOURCE_DB_HOST \
  -U $SOURCE_DB_USER \
  -d $SOURCE_DB_NAME \
  -c "SELECT u.username, p.metal_amount, p.crystal_amount, p.deuterium_amount
      FROM planet p
      JOIN \"user\" u ON p.owner_id = u.id
      WHERE p.is_homeworld = true
      ORDER BY u.username;"
```

### Voir les niveaux de mines

```bash
source .env.migration
PGPASSWORD=$SOURCE_DB_PASSWORD psql \
  -h $SOURCE_DB_HOST \
  -U $SOURCE_DB_USER \
  -d $SOURCE_DB_NAME \
  -c "SELECT u.username, bt.building_key, pb.level
      FROM planet_buildings pb
      JOIN building_types bt ON pb.building_type_id = bt.id
      JOIN planet p ON pb.planet_id = p.id
      JOIN \"user\" u ON p.owner_id = u.id
      WHERE p.is_homeworld = true
        AND bt.building_key IN ('metal_mine', 'crystal_mine', 'deuterium_mine', 'solar_plant')
      ORDER BY u.username, bt.building_key;"
```

## 🚨 En Cas de Problème

### La maintenance ne s'active pas

```bash
# Vérifier la connexion
source .env.migration
PGPASSWORD=$SOURCE_DB_PASSWORD psql \
  -h $SOURCE_DB_HOST \
  -U $SOURCE_DB_USER \
  -d $SOURCE_DB_NAME \
  -c "SELECT 1"
```

### Le patch échoue

```bash
# Vérifier que la table existe
source .env.migration
PGPASSWORD=$SOURCE_DB_PASSWORD psql \
  -h $SOURCE_DB_HOST \
  -U $SOURCE_DB_USER \
  -d $SOURCE_DB_NAME \
  -c "\dt"
```

### Rollback du patch (si nécessaire)

```bash
# Retirer les bonus (à adapter selon vos besoins)
source .env.migration
PGPASSWORD=$SOURCE_DB_PASSWORD psql \
  -h $SOURCE_DB_HOST \
  -U $SOURCE_DB_USER \
  -d $SOURCE_DB_NAME <<'EOF'
BEGIN;
UPDATE planet SET
  metal_amount = metal_amount - 250000,
  crystal_amount = crystal_amount - 125000,
  deuterium_amount = deuterium_amount - 75000
WHERE is_homeworld = true;

UPDATE planet_buildings pb
SET level = level - 2
FROM building_types bt
WHERE pb.building_type_id = bt.id
  AND bt.building_key IN ('metal_mine', 'crystal_mine', 'deuterium_mine')
  AND pb.planet_id IN (SELECT id FROM planet WHERE is_homeworld = true);

UPDATE planet_buildings pb
SET level = level - 5
FROM building_types bt
WHERE pb.building_type_id = bt.id
  AND bt.building_key = 'solar_plant'
  AND pb.planet_id IN (SELECT id FROM planet WHERE is_homeworld = true);
COMMIT;
EOF
```

## ⏱️ Timeline Recommandée

| Temps | Action |
|-------|--------|
| T-10min | Annoncer maintenance sur Discord |
| T-5min | Rappel de maintenance |
| T-0min | Activer maintenance `render_enable_maintenance.sh` |
| T+1min | Appliquer patch `render_apply_compensation.sh` |
| T+2min | Vérifier résultats |
| T+3min | Désactiver maintenance `render_disable_maintenance.sh` |
| T+4min | Annoncer réouverture |
| T+5min | Surveiller logs et feedback joueurs |

## 📊 Exemple d'Exécution Complète

```bash
# 1. Activer maintenance
./render_enable_maintenance.sh "COMPENSATION JOUEURS" "10 minutes"
# ✓ Mode maintenance activé sur RENDER!

# 2. Attendre 30 secondes (laisser les joueurs voir le message)
sleep 30

# 3. Appliquer patch
./render_apply_compensation.sh
# Êtes-vous sûr? [y/N] y
# ✓ Patch appliqué avec succès!

# 4. Désactiver maintenance
./render_disable_maintenance.sh
# ✓ Mode maintenance désactivé sur RENDER!
```

**Temps total:** ~2 minutes

## 🎨 Personnaliser les Messages de Maintenance

```bash
# Message avec plusieurs lignes (séparé par |)
./render_enable_maintenance.sh \
  "GROSSE COMPENSATION" \
  "5 minutes" \
  "Compensation en cours...|+250K Métal|+125K Cristal|+75K Deutérium|Mines +2 niveaux|Centrale +5 niveaux|Construction x300|Merci de votre patience !"
```

## ✅ Checklist Finale

**Avant:**
- [ ] `.env.migration` correctement configuré avec credentials Render
- [ ] Scripts rendus exécutables (`chmod +x`)
- [ ] Annonce faite aux joueurs
- [ ] Backend Render actif (pas besoin de l'arrêter)

**Pendant:**
- [ ] Maintenance activée
- [ ] Patch appliqué
- [ ] Résultats vérifiés

**Après:**
- [ ] Maintenance désactivée
- [ ] Joueurs peuvent jouer
- [ ] Annonce de réouverture
- [ ] Surveillance des retours

---

**Temps total estimé:** 5-10 minutes
**Risque:** Très faible (patch idempotent, rollback possible)
**Impact:** Positif (joueurs contents des bonus)
