# Changelog - Space Conquest

## [1.5.0] - 2026-01-19 - Correction bug timer tourelles plasma

### 🔧 Corrections critiques

#### 🛡️ Correction construction tourelles plasma (timer manquant)
**Problème**: Le timer de construction ne s'affichait pas pour les tourelles plasma, alors que les missiles fonctionnaient correctement

**Cause identifiée**: Incohérence prérequis frontend ↔ backend
- **Frontend** (`gameRules.ts`):
  - Chantier Spatial niveau 6
  - Tech. Laser niveau 3
- **Backend** (`game_logic.rs`):
  - Chantier Spatial niveau 8 ❌
  - Tech. Laser niveau 5 ❌

**Impact du bug**:
- Utilisateurs avec Chantier 6-7 ou Laser 3-4 pouvaient cliquer "Construire"
- Ressources déduites côté client
- Backend rejetait la requête (403 Forbidden)
- Absence de gestion d'erreur → aucun feedback utilisateur
- Pas de construction ajoutée → pas de timer affiché

**Solutions appliquées**:

1. **Alignement des prérequis** (frontend → backend):
   ```typescript
   // frontend/src/lib/gameRules.ts
   case 'plasma_turret':
     check("Chantier Spatial (8)", ...shipyard_level >= 8);  // 6 → 8
     check("Tech. Énergie (6)", ...energy_tech_level >= 6);  // ✓ déjà bon
     check("Tech. Laser (5)", ...laser_battery_level >= 5);  // 3 → 5
   ```

2. **Gestion d'erreurs complète** dans `Defenses.tsx`:
   - Import `toast` (notifications Sonner)
   - Import `checkPrerequisites` (validation frontend)
   - Codes HTTP traités:
     - `200 OK` → Succès avec notification
     - `403 Forbidden` → "Prérequis non satisfaits"
     - `400 Bad Request` → "Ressources insuffisantes"
     - `409 Conflict` → "File de construction pleine"
   - Erreurs réseau → "Erreur de connexion"

3. **Améliorations UX**:
   - Affichage des prérequis avec statut (✓/✗)
   - Désactivation du bouton si prérequis manquants
   - Styles visuels distincts (orange pour prérequis, rouge pour ressources)
   - Toast de confirmation lors de la construction réussie

4. **Correction compilation Rust** (ambiguïté type):
   ```rust
   // backend/src/game_logic.rs (lignes 524, 538)
   (base_loss_rate * (1.0_f64 + variation)).clamp(0.01_f64, 0.4_f64)
   ```

**Fichiers modifiés**:
- `frontend/src/lib/gameRules.ts` (lignes 65-67)
- `frontend/src/components/Defenses.tsx` (imports + startBuild + UI)
- `frontend/src/components/Changelog.tsx` (import Card corrigé)
- `backend/src/game_logic.rs` (types explicites)

---

### 📝 Notes techniques

**Prérequis tourelles plasma (validés)**:
- Chantier Spatial niveau 8
- Technologie Énergie niveau 6
- Technologie Laser niveau 5

**Prérequis lanceurs missiles**:
- Chantier Spatial niveau 1
- (Aucun prérequis tech)

**Système de notifications**: Sonner (déjà intégré)

---

### 🚀 Déploiement

**Migrations**: Aucune (correction frontend + backend logique)

**Tests recommandés**:
1. ✅ Vérifier prérequis affichés correctement pour plasma_turret
2. ✅ Tester construction avec prérequis non satisfaits → toast erreur
3. ✅ Tester construction avec prérequis OK → timer s'affiche
4. ✅ Vérifier que missiles fonctionnent toujours (aucune régression)

---

## [1.4.0] - 2026-01-19 - Rééquilibrage énergétique et améliorations marché

### 🔧 Corrections critiques

#### ⚡ Rééquilibrage énergétique majeur
**Problème**: Production d'énergie toujours insuffisante → mines constamment dans le rouge
**Cause**: Croissance exponentielle des mines (1.1^niveau) dépassait rapidement la production solaire

**Solutions appliquées**:
- ✅ Production centrale solaire **×3** (60.0 au lieu de 20.0 par niveau)
- ✅ Bonus tech énergie **+10% par niveau** (au lieu de +5%)
- ✅ Système de réduction automatique déjà implémenté
  - Production mines réduite proportionnellement au ratio énergétique
  - Ex: 50% d'énergie disponible → 50% de production des mines

**Formules mises à jour**:
```rust
// Production énergie
base = 60 * level * 1.1^level * (1 + energy_tech * 0.10)

// Réduction production ressources
production_effective = production_base * energy_ratio
```

**Impact**: Meilleur équilibre énergie/production, moins de micro-gestion

**Fichiers**: `backend/src/game_logic.rs` (lignes 176-184)

---

#### 💰 Correction affichage prix marché NPC
**Problème**: Tous les prix affichés à "1.00" malgré système dynamique fonctionnel

**Cause**: Désynchronisation format backend ↔ frontend
- Backend renvoyait `npc_prices` (tableau)
- Frontend cherchait `prices.metal` (objet)

**Solution**: Transformation tableau → objet dans `PriceOverview.tsx`
```typescript
const prices: Record<string, {buy, sell, market}> = {};
for (const npcPrice of stats.npc_prices) {
  prices[npcPrice.resource_type] = {
    buy: npcPrice.npc_buy_price,
    sell: npcPrice.npc_sell_price,
    market: npcPrice.market_price
  };
}
```

**Système de prix dynamiques** (déjà implémenté côté backend):
- Calcul basé sur rareté des ressources serveur
- Formule: `scarcity = expected_ratio / actual_ratio`
- Bornes: 0.5× à 2.0× le prix de base
- Mise à jour temps réel (toutes les 5s)

**Fichiers**: `frontend/src/components/market/PriceOverview.tsx` (lignes 8-18, 53)

---

#### 🛠️ Corrections compilation Rust
**Erreurs corrigées**:
1. **Types ambigus pour `clamp()`**:
   - Erreur: `can't call method clamp on ambiguous numeric type {float}`
   - Solution: Explicitation types `0.01_f64`, `0.4_f64`

2. **Imports non utilisés**:
   - Suppression `Serialize`, `Deserialize` dans `server_resource_stats.rs`

**Fichiers**:
- `backend/src/game_logic.rs` (lignes 523, 537)
- `backend/src/entities/server_resource_stats.rs` (ligne 2)

---

### 🎯 Nouvelles fonctionnalités

#### 📋 Page Changelog intégrée
**Feature**: Consultation du changelog depuis le jeu

**Backend**:
- Endpoint `GET /changelog` lit `CHANGELOG.md`
- Retourne contenu brut markdown

**Frontend**:
- Composant `Changelog.tsx` avec design cohérent
- Affichage préformaté + gestion chargement/erreurs
- Ajout menu SYSTÈME (icône FileText)

**Accès**: Menu → SYSTÈME → Changelog

**Fichiers**:
- `backend/src/main.rs` (ligne 218, 2705-2711)
- `frontend/src/components/Changelog.tsx` (nouveau)
- `frontend/src/App.tsx` (imports + routing)

---

### 📝 Notes techniques

**Production d'énergie** (exemple niveau 10):
```
Avant: 20 * 10 * 1.1^10 * 1.5 = 777 unités
Après:  60 * 10 * 1.1^10 * 2.0 = 3108 unités (+300%)
```

**Consommation 3 mines niveau 10**:
```
(10*10 + 10*10 + 20*10) * 1.1^10 = ~1036 unités
Ratio: 3108 / 1036 = 300% → Production à 100%
```

**Prix marché dynamiques**:
- Métal: base 1.0 × scarcity
- Cristal: base 1.5 × scarcity
- Deutérium: base 3.0 × scarcity
- Scarcity calculée: `expected / actual`

---

### 🚀 Déploiement

**Aucune migration** requise pour cette version.

**Redémarrage backend** recommandé pour appliquer les nouveaux calculs d'énergie.

---

### 📦 Fichiers modifiés (8 fichiers)

#### Backend (4 fichiers)
- ✏️ `backend/src/game_logic.rs` - Production énergie ×3, tech bonus +10%
- ✏️ `backend/src/entities/server_resource_stats.rs` - Suppression imports inutilisés
- ✏️ `backend/src/main.rs` - Endpoint /changelog

#### Frontend (4 fichiers)
- ✏️ `frontend/src/components/market/PriceOverview.tsx` - Fix affichage prix
- ➕ `frontend/src/components/Changelog.tsx` - Nouveau composant
- ✏️ `frontend/src/App.tsx` - Routing changelog

---

### ✅ Tests recommandés

- [ ] **Énergie**: Vérifier production > consommation pour planètes niveau moyen
- [ ] **Marché**: Confirmer affichage prix variables (≠ 1.00)
- [ ] **Changelog**: Accès via menu SYSTÈME → contenu affiché correctement

---

### 🐛 Bugs connus

**Timer construction défenses**: Investigation en cours
- Les missiles se construisent correctement
- Les tourelles plasma : timer parfois ne s'affiche pas
- Nécessite debugging approfondi (frontend + backend)

---

### 🔮 Améliorations futures identifiées

- **Panel Admin**: Stats serveur, gestion users, modifier SPEED_FACTOR
- **Système de rôles**: Admin/User avec permissions
- **Changement username**: Dans paramètres utilisateur
- **Empire Bar**: Amélioration visuelle pour nombreuses planètes
- **Système de slots**: Mines modulaires (8 slots configurables)
- **Timer défenses**: Investigation et correction complète

---

**Commits**: `ee49fbe`, `5521fcc`, `d7e1b62`
**Branche**: `claude/responsive-ranking-npc-costs-iIrjT`
**Fichiers**: 8 modifiés, 1 créé

---

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
