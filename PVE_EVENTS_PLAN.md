# Plan — Système d'Événements PVE de Serveur

> Statut : **PLANIFIÉ** — À implémenter dans une future grosse mise à jour
> Branche suggérée : `feat/pve-server-events`

---

## Vue d'ensemble

Système d'événements dynamiques côté serveur, extensibles via DB + panel admin.
Les événements affectent des régions de la carte (système, galaxie, ou tout le serveur)
et nécessitent une réponse collective des joueurs / alliances.

---

## Base de données — 4 nouvelles tables

### `server_event_type` — Types configurables (seeds + admin)

```sql
CREATE TABLE server_event_type (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_key              VARCHAR(50) UNIQUE NOT NULL,
    -- ex: "pirate_invasion", "radioactive_cloud", "meteor_shower", "solar_storm", "ancient_artifact"
    name                  VARCHAR(100) NOT NULL,
    description           TEXT,
    icon                  VARCHAR(10),      -- emoji UI (ex: "☠️")
    color                 VARCHAR(20),      -- couleur CSS hex (ex: "#ef4444")
    default_duration_hours INT NOT NULL DEFAULT 24,
    cooldown_hours         INT NOT NULL DEFAULT 168,  -- 7 jours
    -- Effets encodés en JSON (flexibles, ajoutés sans migration)
    effects               JSONB NOT NULL DEFAULT '{}',
    -- ex: {"energy_reduction": 0.5, "combat_multiplier": 1.5, "spy_blocked": true}
    rewards               JSONB NOT NULL DEFAULT '{}',
    -- ex: {"metal": 5000, "crystal": 2500, "syndicate_credits": 10}
    is_active             BOOLEAN NOT NULL DEFAULT true,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `server_event` — Instances d'événements

```sql
CREATE TABLE server_event (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type_id   UUID NOT NULL REFERENCES server_event_type(id),
    -- Zone affectée (null = tout le serveur)
    affected_galaxy INT,
    affected_system INT,
    radius          INT DEFAULT 0,   -- 0=position exacte, N=rayon en systèmes
    -- Cycle de vie
    status          VARCHAR(20) NOT NULL DEFAULT 'incoming',
    -- 'incoming' | 'active' | 'resolved' | 'cancelled'
    announced_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,
    resolved_at     TIMESTAMPTZ,
    -- HP collectif (barre de vie de l'événement)
    hp_max          INT NOT NULL DEFAULT 1000,
    hp_current      INT NOT NULL DEFAULT 1000,
    -- Texte narratif
    narrative       TEXT,
    triggered_by    UUID REFERENCES "user"(id),  -- null = automatique
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_server_event_status ON server_event(status);
CREATE INDEX idx_server_event_zone   ON server_event(affected_galaxy, affected_system);
```

### `server_event_participation` — Contributions par joueur

```sql
CREATE TABLE server_event_participation (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID NOT NULL REFERENCES server_event(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES "user"(id),
    planet_id     UUID NOT NULL REFERENCES planet(id),
    contribution  INT NOT NULL DEFAULT 0,   -- points (dégâts infligés, ressources envoyées, etc.)
    rewarded      BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);
```

### `server_event_action` — Journal des actions

```sql
CREATE TABLE server_event_action (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES server_event(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES "user"(id),
    action_type VARCHAR(50) NOT NULL,   -- "attack", "contribution", "evacuation"
    value       INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Types d'événements initiaux (seeds)

| type_key | Nom | Icône | Portée | Effet | Résolution |
|---|---|---|---|---|---|
| `pirate_invasion` | Invasion Pirate | ☠️ | Système | Pirates attaquent planètes passives | Joueurs envoient flottes → HP invasion → 0 |
| `radioactive_cloud` | Nuage Radioactif | ☢️ | Système/Galaxie | -50% énergie → -50% prod | Expiration OU déut dépensé pour accélérer |
| `meteor_shower` | Pluie de Météorites | ☄️ | Système | Gros champs de débris (×10 recycleurs) | Premiers recycleurs remportent les ressources |
| `solar_storm` | Tempête Solaire | 🌩️ | Galaxie | Espionnage + comms bloqués | Automatique — durée fixe |
| `ancient_artifact` | Artefact Ancien | 🏺 | Position unique | Bonus tech/SC pour premier collecteur | Mission "expedition" vers les coords |

---

## Backend — `backend/src/server_events.rs`

### Fonctions principales

```rust
// CRUD
pub async fn get_active_events(db) -> Vec<ServerEvent>
pub async fn get_events_in_zone(db, galaxy, system, radius) -> Vec<ServerEvent>
pub async fn create_event(db, event_type_key, galaxy?, system?, duration_hours, narrative?) -> Result<ServerEvent>
pub async fn cancel_event(db, event_id) -> Result<()>

// Effets
pub fn apply_event_effects_to_production(
    planet: &Planet,
    active_events: &[ServerEvent],
    metal: f64, crystal: f64, deut: f64
) -> (f64, f64, f64)   // modifie les valeurs selon les effets actifs

pub fn is_spy_blocked_by_event(
    attacker_galaxy: i32, attacker_system: i32,
    active_events: &[ServerEvent]
) -> bool

// Participation
pub async fn record_contribution(db, event_id, user_id, planet_id, damage: i32) -> Result<()>
pub async fn check_event_completion(db, state, event_id) -> Result<bool>  // retourne true si terminé
pub async fn distribute_rewards(db, state, event_id) -> Result<()>

// Tick (appelé depuis tick_system.rs)
pub async fn tick_events(db, state) -> Result<()>
// - incoming → active si starts_at passé + broadcast WS
// - active → resolved si ends_at passé OU hp_current <= 0 + distribute_rewards + broadcast WS
// - Annonce WS 1h avant starts_at
```

### Intégrations dans les handlers existants

```rust
// game_logic::calculate_resource_production() — avant de retourner les valeurs
let active_events = server_events::get_events_in_zone(db, planet.galaxy, planet.system, 2).await?;
let (metal, crystal, deut) = server_events::apply_event_effects_to_production(planet, &active_events, m, c, d);

// handlers/fleet.rs attack_v2 — après victoire
if let Some(event) = active_events.iter().find(|e| e.event_type_key == "pirate_invasion") {
    server_events::record_contribution(db, event.id, attacker_user_id, attacker_planet_id, ships_destroyed_value).await;
    server_events::check_event_completion(db, state, event.id).await;
}

// tick_system.rs — à la fin du tick
server_events::tick_events(db, state).await;
```

---

## WebSocket Events

```rust
// Dans websocket.rs, ajouter à WsEvent:
WsEvent::ServerEventAnnounced {
    event_id: String,
    event_type: String,   // "pirate_invasion", etc.
    name: String,
    icon: String,
    color: String,
    zone: String,         // "Galaxie 2, Système 14" ou "Serveur entier"
    starts_in_seconds: i64,
    narrative: String,
}
WsEvent::ServerEventStarted {
    event_id: String,
    event_type: String,
    name: String,
    zone: String,
    ends_at: String,      // ISO
    hp_max: i32,
}
WsEvent::ServerEventProgress {
    event_id: String,
    hp_current: i32,
    hp_max: i32,
    top_contributors: Vec<String>,
    percent: f64,
}
WsEvent::ServerEventResolved {
    event_id: String,
    event_type: String,
    outcome: String,      // "defeated" | "expired" | "cancelled"
    rewards_distributed: bool,
    top_contributors: Vec<String>,
}
WsEvent::ServerEventWarning {
    event_id: String,
    message: String,
}
```

### Routes API

```
GET  /server-events                     → liste events actifs + incoming
GET  /server-events/:id                 → détail d'un event (HP, participants, zone)
POST /server-events/:id/contribute      → action de contribution manuelle (ressources)

// Admin
GET    /admin/server-events             → tous les events (actifs, passés, annulés)
POST   /admin/server-events             → créer un event manuel
PATCH  /admin/server-events/:id/cancel  → annuler
PATCH  /admin/server-events/:id/resolve → forcer la résolution
POST   /admin/server-event-types        → créer un nouveau type
PATCH  /admin/server-event-types/:id    → modifier un type (effets, durée, rewards)
DELETE /admin/server-event-types/:id    → désactiver un type
```

---

## Frontend

### 1. `useServerEvents.ts` — Hook global

```typescript
// Fetch GET /server-events au mount + écoute WS
// Expose:
interface UseServerEvents {
  activeEvents: ServerEvent[];
  incomingEvents: ServerEvent[];
  hasActiveEventAt: (galaxy: number, system: number) => ServerEvent | null;
  hasGlobalEvent: () => ServerEvent | null;
  refresh: () => Promise<void>;
}
```

### 2. `ServerEventBanner.tsx` — Bandeau global

- Affiché dans `EmpireBar.tsx` (sous la barre de ressources) dès `status = incoming`
- Compte à rebours "Commence dans X"
- Barre HP quand `status = active`
- Couleur + icône depuis `event_type.color/icon`
- Cliquable → ouvre `ServerEventModal`
- Disparaît 30s après résolution

### 3. `ServerEventModal.tsx` — Modal de détail

```
┌─────────────────────────────────────────────────────┐
│  ☠️  INVASION PIRATE — Galaxie 2, Système 14        │
│  ════════════════════════════════════════════════   │
│  Les flottes pirates de la Nébuleuse Rouge          │
│  convergent vers ce secteur...                      │
│                                                     │
│  HP : ████████░░░░░░░  650 / 1000                  │
│                                                     │
│  Top 3 Défenseurs:                                  │
│  1. CommanderX  — 320 pts                           │
│  2. StarLord    — 185 pts                           │
│  3. Voyager     — 95  pts                           │
│                                                     │
│  Récompenses : 5000 M / 2500 C / 10 SC             │
│  Distribution proportionnelle aux contributions     │
│                                                     │
│  [Envoyer la flotte ↗]  [Contribuer en ressources] │
└─────────────────────────────────────────────────────┘
```

### 4. Intégrations `GalaxyView.tsx`

Overlays visuels sur les systèmes/positions affectés :

```tsx
// À charger en parallèle des données galaxy :
const { hasActiveEventAt } = useServerEvents();

// Dans le rendu de chaque position :
{hasActiveEventAt(galaxy, system) && (
  <EventOverlay event={event} position={pos} />
)}
```

**Effets visuels par type :**

| Type | Overlay Galaxy | Effet global body |
|---|---|---|
| `pirate_invasion` | Icône ☠️ animée, bordure rouge pulsante | Classe `event-invasion` → bordure rouge |
| `radioactive_cloud` | Filtre vert brumeux CSS `fog-radioactive` | Filtre `hue-rotate` léger vert sur toute l'app |
| `meteor_shower` | Icônes ☄️ animées sur les positions | Particules CSS tombantes |
| `solar_storm` | Flash jaune sur toute la galaxie | Badge "COMMS BROUILLÉES" sur espionnage |
| `ancient_artifact` | Icône 🏺 dorée pulsante sur la position | Aucun |

### 5. Admin Panel — Onglet "Événements Serveur"

```
Événements actifs :
┌─────────────┬──────────┬──────────┬──────────┬──────────────────────┐
│ Type        │ Zone     │ Statut   │ HP       │ Actions              │
├─────────────┼──────────┼──────────┼──────────┼──────────────────────┤
│ ☠️ Invasion │ G2/S14  │ 🟢 Actif │ 650/1000 │ [Forcer fin] [Cancel]│
└─────────────┴──────────┴──────────┴──────────┴──────────────────────┘

Créer un événement :
  Type       : [Invasion Pirate ▼]
  Galaxie    : [2]   Système : [14]   Rayon : [3]
  Démarre    : [dans 1h ▼]
  Durée      : [24h ▼]
  Narratif   : [Les flottes pirates...]
  [Créer l'événement]
```

---

## CSS — Animations PVE

À ajouter dans `src/index.css` :

```css
/* Invasion pirate — bordure rouge pulsante */
body.event-invasion {
  animation: invasionPulse 2s ease-in-out infinite;
}
@keyframes invasionPulse {
  0%, 100% { box-shadow: inset 0 0 0px rgba(239, 68, 68, 0); }
  50%       { box-shadow: inset 0 0 40px rgba(239, 68, 68, 0.2); }
}

/* Nuage radioactif */
body.event-radioactive::after {
  content: '';
  position: fixed; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at center, rgba(34,197,94,0.04) 0%, transparent 70%);
  animation: radioactiveFog 4s ease-in-out infinite alternate;
  z-index: 9998;
}
@keyframes radioactiveFog {
  from { opacity: 0.5; }
  to   { opacity: 1.0; }
}

/* Tempête solaire */
body.event-solar-storm {
  animation: solarFlash 3s ease-in-out infinite;
}
@keyframes solarFlash {
  0%, 80%, 100% { filter: none; }
  85%           { filter: brightness(1.05) sepia(0.2); }
}
```

---

## Plan d'implémentation — Étapes

| # | Étape | Fichiers | Effort |
|---|---|---|---|
| 1 | Migrations DB (4 tables) + entités SeaORM | `migration/`, `entities/` | Moyen |
| 2 | Seeds — 5 types d'events | `migration/seed_event_types.rs` | Faible |
| 3 | `server_events.rs` — CRUD + apply_effects | `backend/src/server_events.rs` | Moyen |
| 4 | Intégration tick (transitions de statut) | `tick_system.rs` | Faible |
| 5 | WS broadcasts (announced/started/progress/resolved) | `websocket.rs` | Faible |
| 6 | Routes API publiques + admin | `handlers/server_events.rs` | Moyen |
| 7 | Hooks dans attack_v2 (contribution pirate_invasion) | `handlers/fleet.rs` | Faible |
| 8 | Hooks dans game_logic (apply_effects prod) | `game_logic.rs` | Faible |
| 9 | `useServerEvents.ts` + `ServerEventBanner.tsx` | `frontend/src/` | Moyen |
| 10 | `ServerEventModal.tsx` | `frontend/src/` | Moyen |
| 11 | GalaxyView overlays visuels | `GalaxyView.tsx` | Moyen |
| 12 | Admin Panel onglet events | `AdminPanel.tsx` | Moyen |
| 13 | CSS animations globales | `index.css` | Faible |
| 14 | Tests + seeds de dev | — | Faible |

**Durée estimée : ~3-4 sessions de développement**

---

## Notes d'architecture importantes

- Les effets dans `server_event_type.effects` sont lus en JSON dynamiquement → ajouter un nouveau type ne nécessite **aucune migration**
- `apply_event_effects_to_production()` est une fonction pure (pas d'appel DB) → appellable depuis le tick sans surcharge
- Les HP collectifs permettent à une alliance de coordonner la résolution d'une invasion
- `radius > 0` permet des événements "large zone" (tempête qui touche 3 systèmes)
- Broadcast WS ciblé : pour les events zonés, ne notifier que les joueurs dont une planète est dans le rayon

---

## Suivi des décisions

- [ ] HP collectif ou timer seulement pour résolution ? → **HP collectif recommandé** (plus engageant)
- [ ] Pénalité en cas d'inaction pendant invasion ? → À discuter (ex: -prod sur les planètes du système)
- [ ] Events automatiques (tick déclenche) ou manuels uniquement ? → **Les deux** (admin + trigger auto configurable)
- [ ] Alliance war events (2 alliances s'affrontent sur un territoire) → **Hors scope v1, prévu v2**
