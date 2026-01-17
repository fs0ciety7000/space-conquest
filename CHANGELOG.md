# Changelog - Space Conquest

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
