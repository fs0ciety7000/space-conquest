# Déploiement de la Base de Données Migrée en Production

## ⚠️ ATTENTION - Opération Critique

Ce guide explique comment déployer votre base de données locale migrée vers votre production Render.

**CETTE OPÉRATION VA REMPLACER TOUTE LA BASE DE DONNÉES DE PRODUCTION !**

## Prérequis

✅ Migration locale terminée avec succès
✅ Tests locaux effectués (login, tech tree, construction)
✅ Tous les joueurs informés de la maintenance
✅ Backend arrêté sur Render

## Étape 1: Préparer le Déploiement

### 1.1 Annoncer la Maintenance

Envoyez un message à vos joueurs :

> 🔧 **MAINTENANCE PROGRAMMÉE**
>
> Le serveur sera en maintenance pour une mise à jour majeure :
> - Nouveau système de tech tree
> - 15+ technologies
> - 12+ types de vaisseaux
> - Système de planète mère
>
> **Durée estimée:** 15-30 minutes
> **Début:** [HEURE]
>
> Vos comptes et ressources seront préservés.
> Merci de votre patience !

### 1.2 Arrêter le Backend sur Render

Sur votre dashboard Render :
1. Allez dans votre service backend
2. Cliquez sur "Manual Deploy" > "Suspend"
3. Ou changez les replicas à 0

### 1.3 Vérifier la Base Locale

```bash
# Vérifier que votre migration locale est OK
psql -h localhost -U user -d space_db -c "
SELECT
    (SELECT COUNT(*) FROM \"user\") as users,
    (SELECT COUNT(*) FROM planet WHERE is_homeworld = true) as homeworlds,
    (SELECT COUNT(*) FROM technologies) as techs,
    (SELECT COUNT(*) FROM ship_types) as ships;
"
```

Attendez-vous à :
- Users: 6
- Homeworlds: 6
- Technologies: 15+
- Ship types: 12+

## Étape 2: Exécuter le Déploiement

```bash
./push_to_production.sh
```

Le script va :

1. **Créer un backup de sécurité** de votre prod actuelle
2. **Dumper** votre base locale migrée
3. **Remplacer** la base de production Render
4. **Vérifier** que tout est OK

### Confirmations Requises

Le script demandera **2 confirmations** avant de continuer :

1. **"Have you stopped the backend?"** → Tapez `y`
2. **"Type 'YES' to confirm"** → Tapez `YES` (en majuscules)

### Durée

- Backup prod: 2-5 minutes
- Dump local: 1-2 minutes
- Upload vers Render: 3-10 minutes
- **Total: 10-20 minutes**

## Étape 3: Redémarrer et Tester

### 3.1 Redémarrer le Backend

Sur Render :
1. Cliquez sur "Resume" ou remettez les replicas à 1
2. Attendez que le backend redémarre (2-3 minutes)

### 3.2 Tests Critiques

**Test 1: Connexion utilisateur**
```bash
curl -X POST https://votre-backend.onrender.com/register \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test123", "email": "test@test.com"}'
```

**Test 2: Tech Tree**
- Connectez-vous avec votre compte
- Ouvrez le Tech Tree
- Vérifiez que les 15+ technologies s'affichent

**Test 3: Planète Mère**
```bash
curl https://votre-backend.onrender.com/my-planets \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Vérifiez que `"is_homeworld": true` apparaît pour une planète.

### 3.3 Annoncer la Réouverture

> ✅ **MAINTENANCE TERMINÉE**
>
> Le serveur est de nouveau en ligne avec les nouvelles fonctionnalités !
>
> **Nouveautés:**
> - Arbre technologique complet (15+ technologies)
> - Nouveaux vaisseaux (Cuirassé, Destructeur, Étoile de la Mort...)
> - Système de planète mère (indestructible)
> - Possibilité de coloniser jusqu'à 10 planètes via Astrophysique
>
> Bon jeu ! 🚀

## Étape 4: Surveillance Post-Déploiement

### Vérifier les Logs

```bash
# Sur Render, consultez les logs
# Recherchez des erreurs SQL ou de connexion
```

### Surveiller les Metrics

- Nombre de connexions
- Erreurs 500
- Temps de réponse

## 🆘 Rollback (En Cas de Problème)

Si quelque chose ne va pas, vous pouvez revenir en arrière :

### Option 1: Script de Rollback Rapide

```bash
./rollback_production.sh
```

### Option 2: Rollback Manuel

```bash
# 1. Arrêter le backend
# 2. Restaurer le backup
source .env.migration

PGPASSWORD=$SOURCE_DB_PASSWORD dropdb \
  -h $SOURCE_DB_HOST \
  -U $SOURCE_DB_USER \
  $SOURCE_DB_NAME

PGPASSWORD=$SOURCE_DB_PASSWORD createdb \
  -h $SOURCE_DB_HOST \
  -U $SOURCE_DB_USER \
  $SOURCE_DB_NAME

PGPASSWORD=$SOURCE_DB_PASSWORD psql \
  -h $SOURCE_DB_HOST \
  -U $SOURCE_DB_USER \
  -d $SOURCE_DB_NAME \
  -f production_backup_BEFORE_MIGRATION_*.sql

# 3. Redémarrer le backend
```

## 📋 Checklist Complète

**Avant le déploiement:**
- [ ] Migration locale testée et fonctionnelle
- [ ] Backup local de votre DB migrée créé
- [ ] Joueurs informés de la maintenance
- [ ] Backend Render arrêté
- [ ] `.env.migration` correctement configuré

**Pendant le déploiement:**
- [ ] Script `push_to_production.sh` exécuté
- [ ] Backup de prod créé (fichier `.sql` sauvegardé)
- [ ] Vérification passée (users, techs, ships > 0)

**Après le déploiement:**
- [ ] Backend Render redémarré
- [ ] Test de connexion OK
- [ ] Tech Tree accessible
- [ ] Planètes mères visibles
- [ ] Joueurs peuvent se connecter
- [ ] Annonce de réouverture envoyée

**En cas de problème:**
- [ ] Backup de prod toujours disponible
- [ ] Procédure de rollback connue
- [ ] Support disponible pour les joueurs

## 🔒 Sécurité

**Fichiers Critiques à Conserver:**

```
production_backup_BEFORE_MIGRATION_YYYYMMDD_HHMMSS.sql  ← BACKUP PROD
migrated_db_YYYYMMDD_HHMMSS.sql                        ← DUMP LOCAL
lastbackup.sql                                         ← BACKUP ORIGINAL
```

Gardez ces fichiers au minimum **30 jours** après le déploiement.

## 🆘 Support

En cas de problème :

1. **Ne paniquez pas** - Vous avez des backups
2. **Consultez les logs** Render
3. **Testez en local** pour reproduire le problème
4. **Rollback si nécessaire** avec le backup

## Commandes Utiles

### Vérifier l'état de la prod

```bash
source .env.migration

PGPASSWORD=$SOURCE_DB_PASSWORD psql \
  -h $SOURCE_DB_HOST \
  -U $SOURCE_DB_USER \
  -d $SOURCE_DB_NAME \
  -c "\dt"
```

### Compter les utilisateurs

```bash
PGPASSWORD=$SOURCE_DB_PASSWORD psql \
  -h $SOURCE_DB_HOST \
  -U $SOURCE_DB_USER \
  -d $SOURCE_DB_NAME \
  -c 'SELECT COUNT(*) FROM "user";'
```

### Lister les homeworlds

```bash
PGPASSWORD=$SOURCE_DB_PASSWORD psql \
  -h $SOURCE_DB_HOST \
  -U $SOURCE_DB_USER \
  -d $SOURCE_DB_NAME \
  -c 'SELECT u.username, p.name FROM planet p JOIN "user" u ON p.owner_id = u.id WHERE p.is_homeworld = true;'
```

---

**Dernière mise à jour:** 2026-01-21
**Version:** 1.0
