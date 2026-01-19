# Changelog - Space Conquest

## [1.3.0] - 2026-01-19 - Session de corrections et améliorations majeures

### 🎯 Nouveautés

#### 🚀 Système de capacité évolutive des transporteurs
- **Backend**: Fonction `get_transporter_capacity(hangar_level)` dans `game_logic.rs`
  - Capacité de base: 10 000 unités
  - Bonus progressif: **+5% par niveau de hangar**
  - Exemple: Hangar Niveau 10 = 15 000 unités (+50%), Niveau 20 = 20 000 unités (+100%)
- **Frontend**: Fonction `getTransporterCapacity()` dans `gameRules.ts`
- **API**: Handler `/transport` applique automatiquement le bonus
- **Interface**: `TransportModal` affiche la capacité exacte en temps réel

**Fichiers**:
- `backend/src/game_logic.rs` (lignes 338-343)
- `frontend/src/lib/gameRules.ts` (lignes 75-81)
- `frontend/src/components/TransportModal.tsx` (ligne 27)

---

#### 📋 Rapports de combat détaillés et cliquables
- **Migration**: `m20260119_000002_add_detailed_report_to_combat_log.rs`
  - Nouvelle colonne `detailed_report` (JSON, nullable) dans table `combat_log`
- **Sauvegarde automatique** des rapports complets pour:
  - ⚔️ Attaques PvP (attaquant + défenseur)
  - 🛡️ Défenses (avec pertes missiles/tourelles)
  - 🌌 Expéditions (logs de combat détaillés)
  - 🏴 Conquêtes de planètes

- **Nouveau endpoint**: `GET /combat-reports/:id/detail`
  - Récupère le JSON complet d'un rapport
  - Codes: `200 OK` | `404 NOT FOUND`

- **Interface interactive**:
  - ✅ Tous les rapports de combat sont **cliquables** (`cursor-pointer`)
  - ✅ Clic → ouverture de `CombatModal` avec détails complets
  - ✅ Affichage des pertes, butin, débris et logs round-par-round
  - ⚠️ Rapports d'espionnage non cliquables (pas de combat)

**Fichiers**:
- `backend/migration/src/m20260119_000002_add_detailed_report_to_combat_log.rs` (nouveau)
- `backend/src/entities/combat_log.rs` (ligne 20-21)
- `backend/src/main.rs` (endpoint ligne 181, handler ligne 1158-1181)
- `frontend/src/components/ReportsTerminal.tsx` (lignes 54-64, 100-102, 137-140, 205-208)

---

#### 🏆 Badges de rang dans le classement
- **Backend**: Champ `rank_badge: String` dans structure `RankItem`
- **Calcul**: `game_logic::get_rank_badge(total_score)` automatique
- **Affichage**: Badge sous le nom du joueur (jaune, uppercase)
  - Exemples: "RECRUE", "CAPORAL", "COMMANDANT", "EMPEREUR GALACTIQUE"

**Fichiers**:
- `backend/src/main.rs` (lignes 62-73)
- `frontend/src/components/Leaderboard.tsx` (lignes 16-26, 108-125)

---

#### 🌍 Système d'âge des planètes
- **Migration**: `m20260119_000001_add_created_at_to_planets.rs`
  - Colonne `created_at` (TIMESTAMP NOT NULL)
  - Initialisation `NOW()` pour planètes existantes
  - Processus sécurisé: nullable → update → NOT NULL

- **Planète mère stable**: Basée sur `created_at` (la plus ancienne)
  - ❌ Avant: planète avec + de points (changeait après batailles)
  - ✅ Après: planète la + ancienne (fixe pour toujours)

**Fichiers**:
- `backend/migration/src/m20260119_000001_add_created_at_to_planets.rs` (nouveau)
- `backend/src/entities/planet.rs` (ligne 111-113)
- `backend/src/auth.rs` (ligne 195)
- `backend/src/main.rs` (ligne 1847-1853)

---

### 🔧 Corrections de bugs critiques

#### ⚔️ Expéditions - Pertes nulles corrigées
**Problème**: Avec 1 vaisseau → `(1 * 0.9).floor() = 0` pertes

**Solution complète**:
- ✅ Utilisation de `ceil()` → garantit minimum 1 perte
- ✅ Niveau pirate aléatoire: 10-100 (forte variation)
- ✅ Taux de pertes variable ±20%
  - Victoire: 5-25% base ± 20% variation → final 1-45%
  - Défaite: 50-90% base ± 20% variation → final 40-100%
- ✅ **Résistance différenciée**:
  - Chasseurs: vulnérabilité 1.0 (normale)
  - Croiseurs: vulnérabilité 0.5 (2× plus résistants)
- ✅ Logs détaillés: "PERTES: X Chasseur(s), Y Croiseur(s)"

**Code**:
```rust
// Répartition proportionnelle des pertes
let hunter_vulnerability = hunters as f64 * 1.0;
let cruiser_vulnerability = cruisers as f64 * 0.5;
let total_vulnerability = hunter_vulnerability + cruiser_vulnerability;

lost_hunters = (total_losses * hunter_ratio).ceil() as i32;
lost_cruisers = (total_losses * cruiser_ratio).floor() as i32;
```

**Fichiers**: `backend/src/game_logic.rs` (512-539), `backend/src/main.rs` (909-963)

---

#### ♻️ Recyclage débris - Quantité hard-codée
**Problème**: Toujours 50 recycleurs envoyés (ignorait disponibilité)

**Solution**:
- ✅ Vérification `planet.recycler_count`
- ✅ Envoi de tous disponibles (max 50 pour perf)
- ✅ Toast d'erreur si 0 recycleurs

**Fichier**: `frontend/src/components/GalaxyView.tsx` (75-89)

---

#### 👤 Profil - "Commandant depuis X jours"
**Problème**: 20472 jours au lieu de 3 jours

**Cause**: `NaiveDateTime` sans timezone → parsing JS incorrect

**Solution**: Format ISO 8601 avec `Z`
```rust
let created_at_utc = user.created_at
    .format("%Y-%m-%dT%H:%M:%S%.3fZ")
    .to_string();
```

**Fichier**: `backend/src/main.rs` (1858-1863)

---

#### 🎓 Tutoriel - Boucle infinie
**Problème**: `useEffect([])` se déclenchait en boucle

**Solution**:
- ✅ État `hasChecked: boolean`
- ✅ Early return si déjà vérifié
- ✅ Dépendance `[hasChecked]` au lieu de `[]`

**Fichier**: `frontend/src/components/Tutorial.tsx` (238-272)

---

#### ⏱️ Temps de déplacement flotte
**Problème**: Temps affiché ≠ temps réel (fonction locale incorrecte)

**Solution**:
- ❌ Suppression fonction locale (utilisait que distance système)
- ✅ Utilisation `game_logic::calculate_distance` (coordonnées 3D complètes)
- ✅ Cohérence frontend ↔ backend

**Impact**: Temps estimé = temps effectif de vol

---

### 🗄️ Base de données

#### Migrations
1. **`m20260119_000001_add_created_at_to_planets.rs`**
   - Colonne `created_at TIMESTAMP NOT NULL`
   - Init avec `NOW()` pour anciennes planètes

2. **`m20260119_000002_add_detailed_report_to_combat_log.rs`**
   - Colonne `detailed_report JSON NULL`
   - Stocke JSON complet des combats

#### Tables modifiées
| Table | Nouvelle colonne | Type | Description |
|-------|------------------|------|-------------|
| `planets` | `created_at` | TIMESTAMP | Date de création (planète mère = + ancienne) |
| `combat_log` | `detailed_report` | JSON (nullable) | Rapport complet avec logs, pertes, butin |

---

### 📊 API - Nouveaux endpoints

| Méthode | Route | Description | Codes |
|---------|-------|-------------|-------|
| `GET` | `/combat-reports/:id/detail` | Récupère rapport détaillé JSON | 200, 404 |

---

### 🎨 Interface utilisateur

#### Leaderboard
- Badge de rang sous le nom (`text-yellow-500/80`, uppercase)
- Exemples: RECRUE, SOLDAT, CAPORAL, SERGENT, LIEUTENANT...

#### Modal de Transport
- Capacité dynamique affichée en temps réel
- Calcul: `nb_transporteurs × capacité_unitaire(niveau_hangar)`
- Validation surcharge côté serveur

#### Journal de Bord
- **Rapports cliquables**: `cursor-pointer` + `hover:bg-*`
- **Clic** → `CombatModal` avec:
  - En-tête Victoire/Défaite
  - Nom adversaire + type mission
  - Butin (Métal/Cristal/Deutérium)
  - Pertes séparées (attaquant/défenseur/défenses)
  - Logs animés round-par-round

---

### 📝 Notes techniques

#### Formules clés

**Capacité transporteur**:
```typescript
capacity = 10000 * (1 + hangarLevel * 0.05)
```

**Pertes expédition**:
```rust
// Garantir minimum 1 perte
let lost = (fleet_size as f64 * loss_rate).ceil() as i32;

// Variation aléatoire ±20%
let variation = rng.gen_range(-0.2..0.2);
let final_rate = base_rate * (1.0 + variation);
```

**Date UTC**:
```rust
format!("%Y-%m-%dT%H:%M:%S%.3fZ")  // ISO 8601 avec Z
```

---

### 🚀 Déploiement

**Migrations à exécuter**:
```bash
# Toutes les migrations en attente
sea-orm-cli migrate up

# Ou une par une
sea-orm-cli migrate up -n 1  # created_at
sea-orm-cli migrate up -n 1  # detailed_report
```

---

### 📦 Fichiers modifiés (8 fichiers)

#### Backend (6 fichiers)
- ✏️ `backend/src/game_logic.rs` - Combat expéditions + capacité transporteur
- ✏️ `backend/src/main.rs` - Endpoints, handlers, sélection planète mère
- ✏️ `backend/src/auth.rs` - Init `created_at` à création planète
- ✏️ `backend/src/entities/planet.rs` - Champ `created_at`
- ✏️ `backend/src/entities/combat_log.rs` - Champ `detailed_report`
- ✏️ `backend/migration/src/lib.rs` - Enregistrement migrations
- ➕ `backend/migration/src/m20260119_000001_add_created_at_to_planets.rs` (nouveau)
- ➕ `backend/migration/src/m20260119_000002_add_detailed_report_to_combat_log.rs` (nouveau)

#### Frontend (3 fichiers)
- ✏️ `frontend/src/components/ReportsTerminal.tsx` - Clics + modal
- ✏️ `frontend/src/components/TransportModal.tsx` - Capacité dynamique
- ✏️ `frontend/src/lib/gameRules.ts` - Fonction `getTransporterCapacity()`

---

### ✅ Checklist de test

- [x] **Expéditions**: 1 vaisseau → pertes > 0
- [x] **Expéditions**: Mix chasseurs/croiseurs → répartition correcte
- [x] **Transport**: Capacité = 10k à hangar 0, 15k à hangar 10
- [x] **Transport**: Surcharge → erreur avec capacité max affichée
- [x] **Classement**: Badge de rang affiché sous nom
- [x] **Rapports**: Clic sur rapport → modal s'ouvre
- [x] **Rapports**: Détails complets (pertes, butin, logs)
- [x] **Planète mère**: Reste fixe après conquête nouvelle planète
- [x] **Tutoriel**: S'affiche 1× puis jamais (sauf clear localStorage)
- [x] **Profil**: "Commandant depuis X jours" correct
- [x] **Recyclage**: 0 recycleurs → toast d'erreur

---

### 🐛 Bugs connus
Aucun bug connu à ce stade.

---

### 🔮 Améliorations futures
- Modules de protection pour expéditions (réduction pertes)
- Bonus de commandement (général d'expédition)
- Filtrage rapports (attaques/défenses/expéditions)
- Statistiques graphiques (évolution points)
- Export rapports en JSON/PDF
- Pagination anciens rapports

---

**Commit**: `d0fb500` - Améliorations transports, rapports combat et capacités évolutives
**Branche**: `claude/responsive-ranking-npc-costs-iIrjT`
**Fichiers**: 8 modifiés, 2 créés

---

## [1.2.0] - 2026-01-18

### 🐛 Corrections de Bugs
- **Production incohérente**: Ajout de `Math.floor()` dans `PlanetOverview.tsx` pour éviter l'écart entre Overview (+318/h) et Resources (+91/h)
- **Username manquant**: Settings.tsx affiche maintenant le vrai username depuis `localStorage` au lieu de "Commandant"
- **Barre progression**: `PlayerRankBadge` avec `showProgress={true}` déjà fonctionnel (calcul automatique vers prochain rang)

### 🆕 Fonctionnalités Admin
- **Backend Rust** (`backend/src/admin.rs`):
  - `GET /admin/players` - Liste tous les joueurs
  - `GET /admin/planet/:id` - Détails planète
  - `PATCH /admin/planet/:id` - Modification planète
  - **Gestion automatique `last_update`**: Update timestamp si ressources modifiées (prévient bugs production)

- **Frontend React** (`frontend/src/components/AdminPanel.tsx`):
  - Accès réservé à `username === 'phantomhex'`
  - Édition complète: Ressources, Mines, Installations, Technologies, Flotte, Défenses
  - Recherche joueurs avec affichage ID/username/points

- **Intégration App.tsx**:
  - Onglet "Admin Panel" visible uniquement si `isAdmin === true`
  - Catégorie "SYSTÈME" dans menu sidebar

### 🛡️ Sécurité
- Vérification double (frontend + backend)
- Protection routes admin avec `check_admin()` (Rust)
- Update automatique `last_update = NOW()` pour cohérence production

### 📝 Architecture
```
backend/src/
  ├── main.rs (routes admin ajoutées)
  ├── admin.rs (nouveau module)
  └── lib.rs (export admin)

frontend/src/
  ├── App.tsx (intégration onglet Admin)
  ├── components/AdminPanel.tsx (nouveau composant)
  ├── components/PlanetOverview.tsx (Math.floor fix)
  └── components/Settings.tsx (username fix)
```

### ⚠️ Notes Importantes
- **CRITICAL**: Toujours mettre à jour `last_update` lors de modification manuelle ressources
- Backend est **Rust uniquement** (pas de fichiers Python)
- Admin Panel accessible uniquement avec compte `phantomhex`

---

## [1.1.0] - Versions précédentes
- Système de messagerie
- Explo spatiale et combat PvP
- Classement multi-catégories
- Tutoriel interactif
