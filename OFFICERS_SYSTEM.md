# 👥 Système d'Officiers & Héros

## Vue d'ensemble

Le système d'officiers permet aux joueurs de recruter des personnages spécialisés qui fournissent des bonus permanents. Chaque officier a une spécialisation (Économie/Militaire/Recherche), une rareté, et des bonus qui s'améliorent avec le niveau.

## Architecture

### Base de données

**Tables:**
- `officer_template` - Modèles d'officiers disponibles
- `user_officer` - Officiers recrutés par les joueurs

**Champs principaux:**
- Spécialisation: `economy`, `military`, `research`
- Rareté: `common`, `uncommon`, `rare`, `epic`, `legendary`
- Bonus: `base_bonus_value` + `bonus_per_level` × (level - 1)

### Backend (Rust/Axum)

**Endpoints:**
```
GET  /officers/templates          # Liste tous les templates
GET  /users/:id/officers          # Officiers d'un utilisateur
POST /users/:id/officers/recruit  # Recruter un officier
```

**Fichiers:**
- `backend/src/officers.rs` - Handlers API
- `backend/src/entities/officer_template.rs` - Modèle template
- `backend/src/entities/user_officer.rs` - Modèle utilisateur
- `backend/migration/src/m20260119_400000_create_officers_system.rs` - Migration tables
- `backend/migration/src/m20260119_400001_seed_officers.rs` - Seed 19 officiers

### Frontend (React/TypeScript)

**Composants:**
- `frontend/src/components/Officers.tsx` - Interface principale
  - OfficerCard - Carte d'affichage d'un officier
  - Filtres par spécialisation et rareté
  - Onglets "Disponibles" / "Mes Officiers"

**Assets:**
- `frontend/public/officers/` - 15 SVG minimalistes

## Officiers disponibles (19 total)

### 💰 Économie (7)
| Nom | Rareté | Bonus | Image |
|-----|--------|-------|-------|
| Ingénieur Minier | Commun | +5% métal | engineer |
| Géologue Cristallin | Commun | +5% cristal | scientist |
| Chef des Opérations | Peu commun | +3% toutes ressources | manager |
| Ingénieur Énergétique | Peu commun | +8% efficacité énergie | engineer |
| Maître Économiste | Rare | -10% coût construction | economist |
| Baron Industriel | Épique | +15% toutes ressources | noble |
| Empereur du Commerce | Légendaire | +25% toutes ressources | emperor |

### ⚔️ Militaire (7)
| Nom | Rareté | Bonus | Image |
|-----|--------|-------|-------|
| Sergent d'Infanterie | Commun | +5% attaque flotte | soldier |
| Capitaine Défensif | Commun | +5% puissance défense | soldier |
| Tacticien de Flotte | Peu commun | +8% attaque flotte | tactician |
| Ingénieur de Combat | Peu commun | +8% défense flotte | engineer |
| Commandant d'Escadre | Rare | +10% puissance flotte | commander |
| Amiral de Guerre | Épique | +15% puissance flotte | admiral |
| Grand Stratège | Légendaire | +25% puissance flotte | strategist |

### 🔬 Recherche (5)
| Nom | Rareté | Bonus | Image |
|-----|--------|-------|-------|
| Assistant de Recherche | Commun | +5% vitesse recherche | scientist |
| Chercheur Senior | Peu commun | +8% vitesse recherche | scientist |
| Spécialiste Armement | Peu commun | +10% vitesse armes | weaponsmith |
| Professeur de Physique | Rare | +12% vitesse recherche | professor |
| Savant Fou | Épique | +18% vitesse recherche | genius |
| Archiviste Galactique | Légendaire | +30% vitesse recherche | archivist |

## Types de bonus

**Économie:**
- `metal_production` - Production de métal
- `crystal_production` - Production de cristal
- `deuterium_production` - Production de deutérium
- `all_production` - Toutes les ressources
- `energy_efficiency` - Efficacité énergétique
- `construction_cost_reduction` - Réduction coût construction

**Militaire:**
- `fleet_attack` - Attaque de la flotte
- `fleet_defense` - Défense de la flotte
- `fleet_power` - Puissance globale de la flotte
- `defense_power` - Puissance des défenses

**Recherche:**
- `research_speed` - Vitesse de recherche
- `weapon_research_speed` - Vitesse recherche armes

## Utilisation

### Recruter un officier

1. Aller dans l'onglet "Officiers" (icône Users)
2. Parcourir les officiers disponibles
3. Utiliser les filtres (spécialisation, rareté)
4. Cliquer sur "Recruter"
5. Les ressources sont déduites automatiquement

### Gérer ses officiers

1. Onglet "Mes Officiers"
2. Voir niveau, XP, et bonus actuel
3. Toggle actif/inactif (à implémenter)

## Formules

### Calcul du bonus
```
bonus_actuel = base_bonus_value + (bonus_per_level × (level - 1))
```

### XP requis par niveau (à implémenter)
```
xp_requis = 100 × level²
```

## TODO - Améliorations futures

### Priorité Haute
- [ ] **Vérification des ressources** avant recrutement
  - Vérifier métal/cristal/deutérium du joueur
  - Déduire les ressources après recrutement
  - Message d'erreur si insuffisant

- [ ] **Système d'activation/désactivation**
  - Toggle actif/inactif sur chaque officier
  - Maximum d'officiers actifs simultanément
  - Cooldown de changement

- [ ] **Application des bonus**
  - Intégrer dans `game_logic.rs`
  - Multiplier production par bonus actifs
  - Afficher bonus dans l'UI (tooltips, badges)

### Priorité Moyenne
- [ ] **Système d'expérience**
  - Gagner XP sur actions (construction, combat, etc.)
  - Montée de niveau automatique
  - Notification de level up

- [ ] **Détails étendus**
  - Modal avec historique de l'officier
  - Statistiques détaillées
  - Anecdotes/lore

- [ ] **Optimisations UI**
  - Recherche par nom
  - Tri (rareté, niveau, bonus)
  - Vue liste compacte

### Priorité Basse
- [ ] **Événements spéciaux**
  - Officiers limités dans le temps
  - Événements de recrutement
  - Officiers uniques

- [ ] **Missions d'officiers**
  - Envoyer officiers en mission
  - Récompenses spéciales
  - Risque de perte/blessure

- [ ] **Synergie entre officiers**
  - Combos de bonus
  - Bonus d'équipe
  - Relations entre officiers

## Intégration avec le gameplay

### Production de ressources
```rust
// Dans game_logic.rs
fn calculate_production_with_officers(
    base_production: f64,
    officer_bonuses: Vec<f64>
) -> f64 {
    let total_bonus = officer_bonuses.iter().sum::<f64>();
    base_production * (1.0 + total_bonus / 100.0)
}
```

### Combat
```rust
// Dans combat.rs
fn calculate_fleet_power_with_officers(
    base_power: f64,
    officer_bonuses: Vec<f64>
) -> f64 {
    let total_bonus = officer_bonuses.iter().sum::<f64>();
    base_power * (1.0 + total_bonus / 100.0)
}
```

### Recherche
```rust
// Dans tech calculation
fn calculate_research_time_with_officers(
    base_time: i64,
    speed_bonuses: Vec<f64>
) -> i64 {
    let total_bonus = speed_bonuses.iter().sum::<f64>();
    (base_time as f64 / (1.0 + total_bonus / 100.0)) as i64
}
```

## Tests

### Backend
```bash
# Tester l'API
curl http://localhost:8080/officers/templates
curl http://localhost:8080/users/{user_id}/officers

# Recruter
curl -X POST http://localhost:8080/users/{user_id}/officers/recruit \
  -H "Content-Type: application/json" \
  -d '{"officer_template_id": "{template_id}"}'
```

### Frontend
1. Lancer le frontend: `npm run dev`
2. Se connecter
3. Aller dans "Officiers"
4. Vérifier l'affichage des templates
5. Tester le recrutement
6. Vérifier "Mes Officiers"

## Notes techniques

### Performance
- Index sur `user_id` dans `user_officer`
- Cache des templates (rarement modifiés)
- Lazy loading des SVG

### Sécurité
- Vérification token JWT
- Validation UUID
- Prévention double recrutement
- Rate limiting (à ajouter)

### Scalabilité
- Templates immuables (safe caching)
- Structure extensible pour nouveaux bonus
- Support internationalisation

## Changelog

**Version 1.0 (2026-01-19)**
- ✅ Base de données et migrations
- ✅ 19 officiers pré-configurés
- ✅ 15 SVG minimalistes
- ✅ API backend complète
- ✅ Interface frontend avec filtres
- ✅ Système de recrutement

**À venir (v1.1)**
- [ ] Vérification ressources
- [ ] Application des bonus
- [ ] Système d'XP/niveaux
