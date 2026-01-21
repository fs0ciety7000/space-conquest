# Migration Rapide - Guide de Démarrage

## 🚀 Commencer en 3 Étapes

### Étape 1: Télécharger le backup de production
```bash
./download_production_backup.sh
```
✅ Le fichier `.env.migration` contient déjà vos credentials Render

### Étape 2: Vérifier le backup
```bash
./verify_backup.sh
```
📊 Voir les statistiques et ce qui sera migré

### Étape 3: Lancer la migration
```bash
./migrate_production.sh
```
⏱️ Durée: 2-5 minutes

### Étape 4: Démarrer le backend
```bash
cd backend && cargo run --release
```

---

## ✅ Ce qui est Préservé

- ✅ Tous les comptes utilisateurs (usernames, emails, passwords, rôles)
- ✅ Ressources moyennées de toutes les planètes par utilisateur
- ✅ Niveaux de mines moyennés par utilisateur

## ❌ Ce qui est Remplacé

- ❌ Planètes multiples → 1 planète mère par joueur
- ❌ Ancien système de vaisseaux → Nouveau tech tree
- ❌ Missions actives → À terminer avant migration

## 🆕 Nouveautés Ajoutées

- 🌟 **15+ technologies** avec arbre de dépendances
- 🚀 **12+ types de vaisseaux** (Battleship, Destroyer, Death Star...)
- 🏗️ **11+ types de bâtiments** avec requirements
- 🛡️ **8+ types de défenses** avec rapid fire
- ⚙️ **85+ paramètres serveur** configurables
- 🌍 **Système de planète mère** + jusqu'à 10 colonies

---

## ⚠️ IMPORTANT

**La migration s'applique à votre BASE DE DONNÉES LOCALE uniquement.**

Votre base de données de production sur Render **N'EST PAS MODIFIÉE**.

Vous téléchargez le backup et le migrez localement pour tester.

---

## 📁 Fichiers Créés

| Fichier | Description |
|---------|-------------|
| `.env.migration` | Configuration DB (credentials Render + local) |
| `download_production_backup.sh` | Télécharge backup depuis Render |
| `verify_backup.sh` | Vérifie contenu du backup |
| `migrate_production.sh` | Lance la migration vers DB locale |
| `README_MIGRATION.md` | Guide complet en français |
| `MIGRATION_GUIDE.md` | Guide complet en anglais |

---

## 🆘 Dépannage Rapide

### Erreur "Connection refused"
```bash
sudo systemctl start postgresql
```

### Erreur "Cannot connect to production database"
Vérifier les credentials dans `.env.migration`

### Fichier lastbackup.sql introuvable
Lancer d'abord: `./download_production_backup.sh`

---

## 📞 Besoin d'aide ?

Voir le guide complet: `README_MIGRATION.md` (français) ou `MIGRATION_GUIDE.md` (anglais)

---

**Prêt ? Lancez la commande:**
```bash
./download_production_backup.sh
```
