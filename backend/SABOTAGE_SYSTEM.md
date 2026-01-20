# 🕵️ Système de Sabotage - Documentation

## Vue d'ensemble

Le système de sabotage permet aux joueurs d'effectuer des actions clandestines sur les planètes ennemies après un espionnage réussi. Les actions comportent des risques de détection.

## Prérequis

### Base de données

Exécuter la migration SQL:
```bash
psql -U postgres -d space_conquest < backend/migrations/create_sabotage_effect_table.sql
```

### Conditions d'accès

- Espionnage réussi sur la cible (`detection_level !== 'none'`)
- Avantage technologique minimal (`tech_difference >= 1`)
- La différence est calculée: `attacker_spy_level - defender_spy_level`

## Actions disponibles

### 1. Saboter Infrastructure (`disable_mine`)

**Effet**: Réduit la production de ressources de 50% pendant 1 heure

**Durée**: 3600 secondes (1h)

**Risque**: Modéré

**Détection**:
- Probabilité de base: 30%
- Réduction: -5% par niveau de différence tech espionnage
- Minimum: 5%

**Notification**:
- **Si non détecté**: Message vague à la victime ("Anomalie production détectée")
- **Si détecté**: Alerte complète + Casus Belli

**Exemple**:
```
Attaquant: Esp. Niv. 5
Défenseur: Esp. Niv. 3
Différence: +2
Probabilité détection: 30% - (2 × 5%) = 20%
```

### 2. Espionnage Industriel (`steal_tech`)

**Effet**: Réduit le temps de la prochaine recherche de 20%

**Durée**: 7 jours (ou jusqu'à utilisation)

**Risque**: Élevé

**Détection**:
- Même formule que `disable_mine`
- Bonus consommé automatiquement à la prochaine recherche

**Notification**:
- **Si non détecté**: Aucune (discret)
- **Si détecté**: Alerte + Casus Belli

## Endpoints API

### POST `/sabotage`

**Payload**:
```json
{
  "target_planet_id": "uuid",
  "action_type": "disable_mine" | "steal_tech"
}
```

**Réponse succès (non détecté)**:
```json
{
  "success": true,
  "detected": false,
  "message": "Sabotage réussi ! Une mine ennemie a été désactivée...",
  "casus_belli": null
}
```

**Réponse échec (détecté)**:
```json
{
  "success": false,
  "detected": true,
  "message": "Sabotage détecté ! Votre sonde a été identifiée...",
  "casus_belli": true
}
```

**Erreurs**:
- `400`: Tech insuffisant, action invalide, auto-sabotage
- `401`: Non authentifié
- `404`: Planète non trouvée
- `500`: Erreur serveur

### GET `/planets/:id/sabotages`

Récupère les sabotages actifs sur une planète (propriétaire uniquement)

**Réponse**:
```json
{
  "sabotages": [
    {
      "id": "uuid",
      "target_planet_id": "uuid",
      "attacker_user_id": "uuid" | null,
      "effect_type": "disable_mine",
      "created_at": "2026-01-20T10:00:00Z",
      "expires_at": "2026-01-20T11:00:00Z",
      "was_detected": false,
      "metadata": {}
    }
  ]
}
```

## Intégration Game Logic

### Production de ressources

Dans `game_logic.rs`, appliquer le multiplicateur avant calcul production:

```rust
use crate::sabotage::get_production_multiplier;

// Dans update_planet_resources()
let sabotage_mult = get_production_multiplier(&db, planet_id).await?;
let final_production = base_production * sabotage_mult;
```

**Effet**: Si `disable_mine` actif, `sabotage_mult = 0.5`, sinon `1.0`

### Bonus recherche

Dans le handler de lancement de recherche:

```rust
use crate::sabotage::apply_research_bonus;

// Avant de calculer construction_time
let research_time_mult = apply_research_bonus(&db, user_id).await?;
let final_time = base_time * research_time_mult;
```

**Effet**:
- Si `steal_tech` disponible: `research_time_mult = 0.8` (bonus consommé)
- Sinon: `research_time_mult = 1.0`

### Nettoyage automatique

Appeler périodiquement (ex: toutes les heures):

```rust
use crate::sabotage::cleanup_expired_sabotages;

// Dans une tâche périodique
let deleted = cleanup_expired_sabotages(&db).await?;
println!("Sabotages expirés nettoyés: {}", deleted);
```

## Mécaniques de jeu

### Casus Belli

Si un sabotage est détecté:
1. La victime reçoit une notification d'alerte
2. Un "Casus Belli" est accordé à la victime
3. La victime peut attaquer l'agresseur sans pénalité

**TODO**: Implémenter table `casus_belli` avec:
- `victim_user_id`
- `aggressor_user_id`
- `reason` (ex: "sabotage_detected")
- `granted_at`
- `expires_at` (ex: 24h)

### Équilibrage

**Risque vs Récompense**:
- `disable_mine`: Impact immédiat mais temporaire, risque modéré
- `steal_tech`: Impact stratégique à long terme, risque élevé

**Contre-mesures**:
- Augmenter le niveau tech espionnage (réduit détection ennemie)
- Surveillance active (dashboard affichant sabotages actifs)
- Représailles (utiliser Casus Belli pour attaquer)

## Sécurité

### Protections implémentées

✅ Vérification authentification JWT
✅ Validation UUID planète cible
✅ Empêche auto-sabotage
✅ Vérification niveau tech minimal
✅ Relations CASCADE DELETE (suppression planète → supprime sabotages)

### À surveiller

⚠️ Rate limiting (empêcher spam de tentatives)
⚠️ Logs audit (tracer toutes les tentatives)
⚠️ Détection de patterns suspects (multiples tentatives rapprochées)

## Tests

### Test manuel avec curl

**1. Tenter un sabotage**:
```bash
curl -X POST http://localhost:8080/sabotage \
  -H "Authorization: Bearer jwt-{user_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "target_planet_id": "target-uuid",
    "action_type": "disable_mine"
  }'
```

**2. Vérifier sabotages actifs**:
```bash
curl http://localhost:8080/planets/{planet_id}/sabotages \
  -H "Authorization: Bearer jwt-{user_id}"
```

**3. Vérifier effet dans production**:
```bash
# Production devrait être réduite de 50% si sabotage actif
curl http://localhost:8080/planets/{planet_id}
```

## Roadmap

### Phase 1 (✅ Implémenté)
- [x] Entité `sabotage_effect`
- [x] Endpoints API
- [x] Calcul détection
- [x] Notifications

### Phase 2 (✅ Implémenté - Backend)
- [x] Intégration dans `update_planet_resources()` (main.rs:748-755)
  - Multiplicateur de production (0.5 si sabotage actif)
  - Appliqué seulement à la nouvelle production
- [x] Intégration dans handler recherche (main.rs:1090-1098)
  - Bonus -20% temps recherche si "steal_tech" disponible
  - Consommation automatique du bonus
- [x] Tâche périodique cleanup (main.rs:301-328)
  - Nettoyage sabotages + casus belli expirés chaque heure
- [x] Table `casus_belli` (migration m20260120_000003)
  - Droit d'attaque 48h après détection sabotage
  - Suivi d'utilisation (was_used)
  - Cleanup automatique
- [x] Authentification JWT sur tous les endpoints
- [x] Système Casus Belli complet
  - grant_casus_belli(): Accordé si saboteur détecté
  - has_casus_belli(): Vérifier droit d'attaque
  - consume_casus_belli(): Marquer comme utilisé
  - get_active_casus_belli(): Liste pour UI

### Phase 3 (✅ Partiel - Frontend)
- [x] Connecter UI SpyModal aux endpoints (App.tsx:411-460)
  - Appel POST /sabotage avec JWT auth
  - Toast notifications (succès/détection/erreur)
  - Fermeture auto + refresh planète
- [ ] Dashboard sabotages actifs
- [ ] Notifications WebSocket en temps réel
- [ ] Historique sabotages

### Phase 4 (Amélioration Future)
- [ ] Nouvelles actions (ex: "slow_research", "steal_resources")
- [ ] Contre-sabotage (défenses actives)
- [ ] Système réputation (criminels vs justiciers)
- [ ] API endpoint pour consommer casus belli lors d'attaque

## Support

**Bugs/Questions**: Ouvrir une issue sur GitHub

**Contribution**: Pull requests welcome!

---

**Version**: 2.0.0
**Date**: 2026-01-20
**Auteur**: Space Conquest Dev Team
