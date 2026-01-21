# Migration de la Base de Données Production → Locale

## Vue d'ensemble

Ce guide explique comment migrer votre base de données de production (hébergée sur Render) vers votre base de données locale avec le nouveau système de tech tree.

## ⚠️ IMPORTANT

- **La migration se fait vers votre base de données LOCALE uniquement**
- **Votre base de données de production sur Render ne sera PAS modifiée**
- **Gardez toujours un backup avant toute opération**

## Étapes de Migration

### 1. Télécharger le backup de production

```bash
./download_production_backup.sh
```

Ce script va:
- Se connecter à votre base Render
- Afficher les statistiques (utilisateurs, planètes)
- Créer un backup complet
- Sauvegarder en deux fichiers:
  - `production_backup_YYYYMMDD_HHMMSS.sql` (backup horodaté à garder)
  - `lastbackup.sql` (utilisé par les scripts de migration)

**Durée estimée:** 1-5 minutes selon la taille de la DB

### 2. Vérifier le contenu du backup

```bash
./verify_backup.sh
```

Ce script affiche:
- Nombre d'utilisateurs
- Ressources moyennes par utilisateur
- Flottes et technologies
- Données qui seront préservées vs perdues
- Avertissements sur les missions actives

**Exemple de sortie:**
```
============================================================================
SPACE CONQUEST - BACKUP VERIFICATION
============================================================================

✓ Backup file found: lastbackup.sql
  File size: 2.3M

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER DATA ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total users to migrate: 5

 username    |       email        |  role  |  created
-------------+--------------------+--------+------------
 phantomhex  | phantom@test.com   | admin  | 2026-01-15
 player1     | player1@test.com   | player | 2026-01-16

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLANET DATA ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Resource averages per user (what will be migrated):
  username   | planet_count | avg_metal | avg_crystal | avg_deuterium
-------------+--------------+-----------+-------------+---------------
 phantomhex  |           3  |   50000   |    25000    |     10000
 player1     |           2  |   30000   |    15000    |      5000
```

### 3. Lancer la migration

```bash
./migrate_production.sh
```

Ce script va:
1. Charger le backup dans une DB temporaire
2. Extraire toutes les données utilisateurs
3. Calculer les moyennes de ressources par utilisateur
4. Recréer la DB locale avec le nouveau schéma
5. Lancer toutes les migrations fraîches
6. Importer les comptes utilisateurs
7. Créer les planètes mères avec ressources moyennées
8. Seeder toutes les données de référence

**Durée estimée:** 2-5 minutes

**Sortie attendue:**
```
============================================================================
MIGRATION COMPLETED SUCCESSFULLY!
============================================================================

✓ Migration verification:
  - Users: 5
  - Homeworld planets: 5
  - Technologies: 15
  - Ship types: 12
  - Building types: 11
  - Defense types: 8
  - Server configs: 85
```

### 4. Démarrer le backend local

```bash
cd backend
cargo run --release
```

### 5. Tester l'application

- Connexion utilisateurs avec leurs identifiants existants
- Vérifier les planètes mères
- Vérifier les ressources
- Tester le tech tree
- Tester la construction

## Ce qui est Préservé

✅ **Tous les comptes utilisateurs**
- Usernames
- Emails
- Passwords (hash)
- Rôles (admin/player)
- Dates de création

✅ **Ressources moyennées**
- Métal (moyenne de toutes les planètes)
- Cristal (moyenne de toutes les planètes)
- Deutérium (moyenne de toutes les planètes)

✅ **Niveaux de mines moyennés**
- Mine de métal
- Mine de cristal
- Mine de deutérium
- Centrale solaire

## Ce qui est Remplacé/Perdu

❌ **Planètes multiples** → 1 planète mère par utilisateur
❌ **Vaisseaux anciens** → Système tech tree
❌ **Constructions en cours** → À terminer avant migration
❌ **Missions de flotte actives** → À terminer avant migration
❌ **Logs de combat** → Repartir à zéro
❌ **Messages** → Repartir à zéro
❌ **Offres du marché** → Repartir à zéro

## Nouvelles Fonctionnalités

🆕 **Système de planète mère**
- 1 planète mère par joueur (indestructible)
- Jusqu'à 10 colonies supplémentaires
- Limite basée sur le niveau d'Astrophysique

🆕 **Arbre technologique complet**
- 15+ technologies avec dépendances
- Catégories: Énergie, Armes, Défense, Propulsion, Recherche

🆕 **Nouveaux types de vaisseaux**
- Chasseur léger, Croiseur
- Cuirassé, Destructeur, Étoile de la Mort
- Recycleur, Sonde, Vaisseau de colonisation, Transporteur

🆕 **Système de bâtiments**
- 11+ types de bâtiments
- Dépendances technologiques
- Temps de construction calculés

🆕 **Système de défenses**
- 8+ types de défenses
- Rapid fire entre unités
- Stats de combat configurables

🆕 **Configuration serveur**
- 85+ paramètres configurables
- Panel admin complet
- Vitesses, coûts, stats de combat personnalisables

## Structure des Fichiers

```
space-conquest/
├── .env.migration              # Config de connexion DB (Render + locale)
├── download_production_backup.sh  # Télécharge backup depuis Render
├── verify_backup.sh            # Vérifie le contenu du backup
├── migrate_production.sh       # Lance la migration vers DB locale
├── MIGRATION_GUIDE.md          # Guide complet (EN)
└── README_MIGRATION.md         # Ce fichier (FR)
```

## Dépannage

### "Connection refused"

La base de données locale n'est pas démarrée:

```bash
# Vérifier si PostgreSQL tourne
sudo systemctl status postgresql

# Démarrer si nécessaire
sudo systemctl start postgresql
```

### "Cannot connect to production database"

Problème de connexion à Render:
- Vérifier les credentials dans `.env.migration`
- Vérifier que votre IP est autorisée sur Render
- Vérifier la connexion réseau

### "lastbackup.sql not found"

Vous devez d'abord télécharger le backup:

```bash
./download_production_backup.sh
```

### Utilisateurs ne peuvent pas se connecter

Vérifier que les utilisateurs ont été importés:

```bash
PGPASSWORD=password psql -h localhost -U user -d space_db -c \
  "SELECT username, email, role FROM users"
```

## Rollback

Si vous devez revenir en arrière sur la DB locale:

1. **Arrêter le backend**
2. **Restaurer depuis le backup:**
```bash
PGPASSWORD=password dropdb -h localhost -U user space_db
PGPASSWORD=password createdb -h localhost -U user space_db
PGPASSWORD=password psql -h localhost -U user -d space_db -f lastbackup.sql
```

## Communication aux Joueurs

**Message recommandé:**

> Bonjour à tous !
>
> Nous effectuons une migration majeure de la base de données pour introduire un système d'arbre technologique complet avec 15+ technologies, 12+ types de vaisseaux et de nombreuses nouvelles fonctionnalités.
>
> **Ce que vous gardez:**
> - Votre compte et identifiants
> - Vos ressources (moyenne de toutes vos planètes)
> - Vos niveaux de mines (moyennés)
>
> **Ce qui change:**
> - Vous aurez 1 planète mère au lieu de plusieurs planètes
> - Nouveau système d'arbre technologique pour débloquer vaisseaux et bâtiments
> - Nouveaux types de vaisseaux et système de combat
> - Possibilité de coloniser jusqu'à 10 planètes supplémentaires via la tech Astrophysique
>
> **Temps d'arrêt:** Environ 5-10 minutes
>
> Merci de votre patience !

## Notes Importantes

- ⚠️ **La DB de production sur Render n'est PAS modifiée**
- ⚠️ **La migration s'applique uniquement à votre DB locale**
- ⚠️ **Gardez toujours le backup timestampé en sécurité**
- ⚠️ **Testez en local avant de passer en production**

## Prochaines Étapes Après Migration

1. **Tester en local:**
   - Connexion utilisateurs
   - Planètes mères
   - Tech tree
   - Construction de bâtiments
   - Construction de vaisseaux
   - Recherche de technologies

2. **Si tout fonctionne:**
   - Décider si vous voulez appliquer à la production Render
   - Ou migrer vers un nouveau serveur

3. **Pour appliquer à production:**
   - Prévoir une fenêtre de maintenance
   - Avertir les joueurs
   - Effectuer la migration directement sur Render
   - Ou migrer vers nouveau serveur et changer le DNS

## Support

En cas de problème:
1. Vérifier les messages d'erreur
2. Lire le MIGRATION_GUIDE.md complet
3. Vérifier les logs PostgreSQL
4. Garder le backup en sécurité pour rollback

---

**Dernière mise à jour:** 2026-01-21
**Version:** 1.0
