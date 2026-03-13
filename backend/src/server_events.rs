/// Module PVE Events — Système d'Événements Serveur
///
/// Gère le cycle de vie complet des événements PVE :
/// - Création (admin ou automatique)
/// - Transitions de statut (incoming → active → resolved)
/// - Application des effets sur la production
/// - Enregistrement des contributions joueurs
/// - Distribution des récompenses
/// - Broadcasts WebSocket

use chrono::{Utc, Duration};
use sea_orm::{
    DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait,
    Set, ActiveModelTrait, QueryOrder, QuerySelect,
    sea_query::Expr, ConnectionTrait, Statement, DbBackend,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::entities::{
    prelude::*,
    server_event, server_event_type, server_event_participation, server_event_action,
    planet, user,
};
use crate::AppState;

// ─── Structs publiques ────────────────────────────────────────────────────────

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct ServerEventSummary {
    pub id: String,
    pub event_type_key: String,
    pub name: String,
    pub icon: String,
    pub color: String,
    pub affected_galaxy: Option<i32>,
    pub affected_system: Option<i32>,
    pub radius: i32,
    pub status: String,
    pub starts_at: String,
    pub ends_at: String,
    pub hp_max: i32,
    pub hp_current: i32,
    pub hp_percent: f64,
    pub narrative: Option<String>,
    pub effects: Value,
    pub rewards: Value,
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/// Retourne tous les événements actifs et incoming
pub async fn get_active_events(db: &DatabaseConnection) -> Vec<server_event::Model> {
    ServerEvent::find()
        .filter(
            sea_orm::Condition::any()
                .add(server_event::Column::Status.eq("active"))
                .add(server_event::Column::Status.eq("incoming"))
        )
        .order_by_asc(server_event::Column::StartsAt)
        .all(db)
        .await
        .unwrap_or_default()
}

/// Retourne les événements affectant une zone (galaxy, system, radius)
pub async fn get_events_in_zone(
    db: &DatabaseConnection,
    galaxy: i32,
    system: i32,
    radius: i32,
) -> Vec<server_event::Model> {
    let all_active = get_active_events(db).await;
    all_active.into_iter().filter(|e| {
        // Événements globaux (null galaxy/system) = touchent tout le serveur
        if e.affected_galaxy.is_none() { return true; }
        let eg = e.affected_galaxy.unwrap_or(0);
        let es = e.affected_system.unwrap_or(0);
        let r = e.radius.max(radius);
        eg == galaxy && (es - system).abs() <= r
    }).collect()
}

/// Crée un événement (admin ou automatique)
pub async fn create_event(
    db: &DatabaseConnection,
    event_type_key: &str,
    affected_galaxy: Option<i32>,
    affected_system: Option<i32>,
    radius: i32,
    starts_in_seconds: i64,
    duration_hours: Option<i32>,
    narrative: Option<String>,
    triggered_by: Option<Uuid>,
) -> Result<server_event::Model, sea_orm::DbErr> {
    let event_type = ServerEventType::find()
        .filter(server_event_type::Column::TypeKey.eq(event_type_key))
        .one(db)
        .await?
        .ok_or_else(|| sea_orm::DbErr::Custom(format!("Event type '{}' not found", event_type_key)))?;

    let now = Utc::now();
    let starts_at = now + Duration::seconds(starts_in_seconds);
    let duration_h = duration_hours.unwrap_or(event_type.default_duration_hours) as i64;
    let ends_at = starts_at + Duration::hours(duration_h);

    let hp = event_type.rewards.get("hp_max")
        .and_then(|v| v.as_i64()).unwrap_or(1000) as i32;

    let model = server_event::ActiveModel {
        id: Set(Uuid::new_v4()),
        event_type_id: Set(event_type.id),
        event_type_key: Set(event_type_key.to_string()),
        affected_galaxy: Set(affected_galaxy),
        affected_system: Set(affected_system),
        radius: Set(radius),
        status: Set("incoming".to_string()),
        announced_at: Set(now.into()),
        starts_at: Set(starts_at.into()),
        ends_at: Set(ends_at.into()),
        resolved_at: Set(None),
        hp_max: Set(hp),
        hp_current: Set(hp),
        narrative: Set(narrative),
        triggered_by: Set(triggered_by),
        created_at: Set(now.into()),
    };

    model.insert(db).await
}

/// Annule un événement
pub async fn cancel_event(db: &DatabaseConnection, event_id: Uuid) -> Result<(), sea_orm::DbErr> {
    let event = ServerEvent::find_by_id(event_id).one(db).await?
        .ok_or_else(|| sea_orm::DbErr::Custom("Event not found".to_string()))?;
    let mut active: server_event::ActiveModel = event.into();
    active.status = Set("cancelled".to_string());
    active.resolved_at = Set(Some(Utc::now().into()));
    active.update(db).await?;
    Ok(())
}

// ─── Effets PVE ──────────────────────────────────────────────────────────────

/// Applique les effets des événements actifs sur la production d'une planète.
/// Fonction pure (pas de DB) — appelable depuis le tick sans surcharge.
pub fn apply_event_effects_to_production(
    _planet: &planet::Model,
    active_events: &[server_event::Model],
    metal: f64,
    crystal: f64,
    deut: f64,
) -> (f64, f64, f64) {
    let mut m = metal;
    let mut c = crystal;
    let mut d = deut;

    for event in active_events {
        if event.status != "active" { continue; }

        // Récupère les effets depuis la DB (type_key mappé)
        match event.event_type_key.as_str() {
            "radioactive_cloud" => {
                // -50% production énergétique → -50% sur toutes les mines
                m *= 0.5;
                c *= 0.5;
                d *= 0.5;
            }
            "solar_storm" => {
                // Production légèrement réduite (interférences)
                m *= 0.9;
                c *= 0.9;
            }
            _ => {}
        }
    }

    (m, c, d)
}

/// Vérifie si l'espionnage est bloqué par un événement actif dans cette zone
pub fn is_spy_blocked_by_event(
    galaxy: i32,
    system: i32,
    active_events: &[server_event::Model],
) -> bool {
    active_events.iter().any(|e| {
        if e.status != "active" { return false; }
        if e.event_type_key != "solar_storm" { return false; }
        if e.affected_galaxy.is_none() { return true; } // global
        let eg = e.affected_galaxy.unwrap_or(0);
        let es = e.affected_system.unwrap_or(0);
        eg == galaxy && (es - system).abs() <= e.radius
    })
}

// ─── Participation ────────────────────────────────────────────────────────────

/// Enregistre une contribution au combat d'un événement (ex: pirate_invasion)
pub async fn record_contribution(
    db: &DatabaseConnection,
    event_id: Uuid,
    user_id: Uuid,
    planet_id: Uuid,
    damage: i32,
) -> Result<(), sea_orm::DbErr> {
    // WS-05: Atomic upsert — UNIQUE(event_id, user_id) constraint ensures exactly-once
    // participation record. Concurrent requests from the same user are merged atomically
    // at the DB level rather than via a racy SELECT + INSERT/UPDATE.
    db.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        "INSERT INTO server_event_participation (id, event_id, user_id, planet_id, contribution, rewarded, created_at) \
         VALUES ($1, $2, $3, $4, $5, false, NOW()) \
         ON CONFLICT (event_id, user_id) DO UPDATE \
         SET contribution = server_event_participation.contribution + EXCLUDED.contribution",
        [Uuid::new_v4().into(), event_id.into(), user_id.into(), planet_id.into(), damage.into()],
    )).await?;

    // Journal de l'action
    server_event_action::ActiveModel {
        id: Set(Uuid::new_v4()),
        event_id: Set(event_id),
        user_id: Set(user_id),
        action_type: Set("attack".to_string()),
        value: Set(damage),
        created_at: Set(Utc::now().into()),
    }.insert(db).await?;

    // Réduire les HP de l'événement
    ServerEvent::update_many()
        .col_expr(
            server_event::Column::HpCurrent,
            Expr::col(server_event::Column::HpCurrent).sub(damage)
        )
        .filter(server_event::Column::Id.eq(event_id))
        .exec(db)
        .await?;

    Ok(())
}

/// Vérifie si l'événement est terminé (HP <= 0) et le résout si oui
pub async fn check_event_completion(
    state: &AppState,
    event_id: Uuid,
) -> Result<bool, sea_orm::DbErr> {
    let event = match ServerEvent::find_by_id(event_id).one(&state.db).await? {
        Some(e) => e,
        None => return Ok(false),
    };

    if event.hp_current <= 0 && event.status == "active" {
        resolve_event(state, event_id, "defeated").await?;
        return Ok(true);
    }
    Ok(false)
}

/// Résout un événement et distribue les récompenses
pub async fn resolve_event(
    state: &AppState,
    event_id: Uuid,
    outcome: &str,
) -> Result<(), sea_orm::DbErr> {
    let event = match ServerEvent::find_by_id(event_id).one(&state.db).await? {
        Some(e) => e,
        None => return Ok(()),
    };

    // Récupérer les top contributors AVANT de marquer comme resolved
    let top = get_top_contributors(&state.db, event_id, 5).await;
    let top_names: Vec<String> = top.iter().map(|(name, _)| name.clone()).collect();

    // Distribuer les récompenses
    distribute_rewards(state, &event, &top).await?;

    // Marquer résolu
    let mut active: server_event::ActiveModel = event.clone().into();
    active.status = Set("resolved".to_string());
    active.resolved_at = Set(Some(Utc::now().into()));
    if event.hp_current > 0 {
        active.hp_current = Set(0);
    }
    active.update(&state.db).await?;

    // Broadcast WS résolution
    if let Some(ref ws) = state.ws {
        let _ = ws.broadcast_global(crate::websocket::WsEvent::ServerEventResolved {
            event_id: event_id.to_string(),
            event_type: event.event_type_key.clone(),
            outcome: outcome.to_string(),
            rewards_distributed: true,
            top_contributors: top_names,
        }).await;
    }

    Ok(())
}

/// Top N participants par contribution
pub async fn get_top_contributors_public(
    db: &DatabaseConnection,
    event_id: Uuid,
    limit: u64,
) -> Vec<(String, i32)> {
    get_top_contributors(db, event_id, limit).await
}

async fn get_top_contributors(
    db: &DatabaseConnection,
    event_id: Uuid,
    limit: u64,
) -> Vec<(String, i32)> {
    let parts = ServerEventParticipation::find()
        .filter(server_event_participation::Column::EventId.eq(event_id))
        .order_by_desc(server_event_participation::Column::Contribution)
        .limit(limit)
        .all(db)
        .await
        .unwrap_or_default();

    let mut result = Vec::new();
    for p in parts {
        if let Ok(Some(u)) = User::find_by_id(p.user_id).one(db).await {
            result.push((u.username, p.contribution));
        }
    }
    result
}

/// Distribue les récompenses proportionnellement aux contributions
pub async fn distribute_rewards(
    state: &AppState,
    event: &server_event::Model,
    participants: &[(String, i32)],
) -> Result<(), sea_orm::DbErr> {
    if participants.is_empty() { return Ok(()); }

    let event_type = ServerEventType::find_by_id(event.event_type_id)
        .one(&state.db).await?.ok_or_else(|| sea_orm::DbErr::Custom("Type introuvable".into()))?;

    let total_contrib: i32 = participants.iter().map(|(_, c)| c).sum();
    if total_contrib == 0 { return Ok(()); }

    let base_metal   = event_type.rewards.get("metal").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let base_crystal = event_type.rewards.get("crystal").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let base_deut    = event_type.rewards.get("deuterium").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let base_sc      = event_type.rewards.get("syndicate_credits").and_then(|v| v.as_f64()).unwrap_or(0.0);

    let parts_db = ServerEventParticipation::find()
        .filter(server_event_participation::Column::EventId.eq(event.id))
        .filter(server_event_participation::Column::Rewarded.eq(false))
        .all(&state.db)
        .await
        .unwrap_or_default();

    for part in &parts_db {
        let ratio = part.contribution as f64 / total_contrib as f64;
        let metal   = (base_metal   * ratio).floor();
        let crystal = (base_crystal * ratio).floor();
        let deut    = (base_deut    * ratio).floor();
        let sc      = base_sc * ratio;

        // Créditer la planète principale du joueur
        if let Ok(planets) = Planet::find()
            .filter(planet::Column::OwnerId.eq(part.user_id))
            .order_by_asc(planet::Column::IsHomeworld)
            .limit(1)
            .all(&state.db).await
        {
            if let Some(planet) = planets.first() {
                let mut pa: planet::ActiveModel = planet.clone().into();
                pa.metal_amount    = Set(planet.metal_amount    + metal);
                pa.crystal_amount  = Set(planet.crystal_amount  + crystal);
                pa.deuterium_amount = Set(planet.deuterium_amount + deut);
                let _ = pa.update(&state.db).await;
            }
        }

        // Crédits Syndicat
        if sc > 0.0 {
            if let Ok(Some(u)) = User::find_by_id(part.user_id).one(&state.db).await {
                let mut ua: user::ActiveModel = u.into();
                let current_sc = match ua.syndicate_credits.clone() {
                    sea_orm::ActiveValue::Set(v) | sea_orm::ActiveValue::Unchanged(v) => v,
                    sea_orm::ActiveValue::NotSet => 0.0,
                };
                ua.syndicate_credits = Set(current_sc + sc);
                let _ = ua.update(&state.db).await;
            }
        }

        // Notification personnalisée
        if let Some(ref ws) = state.ws {
            ws.push_notification(
                part.user_id,
                "pve_reward",
                "Récompense d'événement",
                &format!(
                    "Contribution à '{}' : +{:.0} M / +{:.0} C / +{:.0} D / +{:.1} SC",
                    event_type.name, metal, crystal, deut, sc
                ),
                None,
            ).await;
        }

        // Marquer comme récompensé
        let mut pa: server_event_participation::ActiveModel = part.clone().into();
        pa.rewarded = Set(true);
        let _ = pa.update(&state.db).await;
    }

    Ok(())
}

// ─── TICK ─────────────────────────────────────────────────────────────────────

/// Appelé depuis tick_system — gère les transitions de statut + broadcasts
pub async fn tick_events(state: &AppState) -> Result<(), sea_orm::DbErr> {
    let now = Utc::now();
    let now_tz: chrono::DateTime<chrono::FixedOffset> = now.into();

    // ── incoming → active ────────────────────────────────────────────────────
    let incoming: Vec<server_event::Model> = ServerEvent::find()
        .filter(server_event::Column::Status.eq("incoming"))
        .filter(server_event::Column::StartsAt.lte(now_tz))
        .all(&state.db).await?;

    for event in incoming {
        let mut active: server_event::ActiveModel = event.clone().into();
        active.status = Set("active".to_string());
        active.update(&state.db).await?;

        // Récupérer le type pour le nom/icon
        let (name, icon, color) = get_event_display(&state.db, event.event_type_id).await;
        let zone = format_zone(&event);
        let ends_at = event.ends_at.to_rfc3339();

        if let Some(ref ws) = state.ws {
            let _ = ws.broadcast_global(crate::websocket::WsEvent::ServerEventStarted {
                event_id: event.id.to_string(),
                event_type: event.event_type_key.clone(),
                name,
                icon,
                color,
                zone,
                ends_at,
                hp_max: event.hp_max,
            }).await;
        }
    }

    // ── active → resolved si ends_at dépassé ────────────────────────────────
    let expired: Vec<server_event::Model> = ServerEvent::find()
        .filter(server_event::Column::Status.eq("active"))
        .filter(server_event::Column::EndsAt.lte(now_tz))
        .all(&state.db).await?;

    for event in expired {
        // Si HP encore > 0 → expiration (non vaincu)
        let outcome = if event.hp_current > 0 { "expired" } else { "defeated" };
        resolve_event(state, event.id, outcome).await?;
    }

    // ── Annonce 1h avant starts_at pour les events incoming ─────────────────
    let announce_threshold: chrono::DateTime<chrono::FixedOffset> =
        (now + Duration::hours(1)).into();
    let to_announce: Vec<server_event::Model> = ServerEvent::find()
        .filter(server_event::Column::Status.eq("incoming"))
        .filter(server_event::Column::StartsAt.lte(announce_threshold))
        .filter(server_event::Column::StartsAt.gt(now_tz))
        .all(&state.db).await?;

    for event in to_announce {
        let (name, icon, color) = get_event_display(&state.db, event.event_type_id).await;
        let zone = format_zone(&event);
        let starts_in = (event.starts_at.timestamp() - now.timestamp()).max(0);
        let narrative = event.narrative.clone().unwrap_or_default();

        if let Some(ref ws) = state.ws {
            let _ = ws.broadcast_global(crate::websocket::WsEvent::ServerEventAnnounced {
                event_id: event.id.to_string(),
                event_type: event.event_type_key.clone(),
                name,
                icon,
                color,
                zone,
                starts_in_seconds: starts_in,
                narrative,
            }).await;
        }
    }

    Ok(())
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

async fn get_event_display(db: &DatabaseConnection, type_id: Uuid) -> (String, String, String) {
    match ServerEventType::find_by_id(type_id).one(db).await {
        Ok(Some(t)) => (
            t.name,
            t.icon.unwrap_or_else(|| "⚡".to_string()),
            t.color.unwrap_or_else(|| "#6366f1".to_string()),
        ),
        _ => ("Événement Inconnu".to_string(), "⚡".to_string(), "#6366f1".to_string()),
    }
}

pub fn format_zone_public(event: &server_event::Model) -> String {
    format_zone(event)
}

fn format_zone(event: &server_event::Model) -> String {
    match (event.affected_galaxy, event.affected_system) {
        (Some(g), Some(s)) => {
            if event.radius > 0 {
                format!("Galaxie {}, Système {} (±{})", g, s, event.radius)
            } else {
                format!("Galaxie {}, Système {}", g, s)
            }
        }
        (Some(g), None) => format!("Galaxie {}", g),
        _ => "Serveur entier".to_string(),
    }
}

/// Enrichit un événement DB en ServerEventSummary avec les infos du type
pub async fn enrich_event(
    db: &DatabaseConnection,
    event: server_event::Model,
) -> ServerEventSummary {
    let (name, icon, color, effects, rewards) = match ServerEventType::find_by_id(event.event_type_id).one(db).await {
        Ok(Some(t)) => (t.name, t.icon.unwrap_or_else(|| "⚡".to_string()), t.color.unwrap_or_else(|| "#6366f1".to_string()), t.effects, t.rewards),
        _ => ("Inconnu".to_string(), "⚡".to_string(), "#6366f1".to_string(), json!({}), json!({})),
    };

    let hp_percent = if event.hp_max > 0 {
        (event.hp_current as f64 / event.hp_max as f64 * 100.0).clamp(0.0, 100.0)
    } else { 0.0 };

    ServerEventSummary {
        id: event.id.to_string(),
        event_type_key: event.event_type_key,
        name,
        icon,
        color,
        affected_galaxy: event.affected_galaxy,
        affected_system: event.affected_system,
        radius: event.radius,
        status: event.status,
        starts_at: event.starts_at.to_rfc3339(),
        ends_at: event.ends_at.to_rfc3339(),
        hp_max: event.hp_max,
        hp_current: event.hp_current,
        hp_percent,
        narrative: event.narrative,
        effects,
        rewards,
    }
}

/// Envoie un message système dans la messagerie d'un joueur
pub async fn send_system_inbox_message(
    db: &DatabaseConnection,
    receiver_id: Uuid,
    category: &str,
    subject: &str,
    content: &str,
) -> Result<(), sea_orm::DbErr> {
    use crate::entities::message;
    let now = chrono::Utc::now().naive_utc();
    message::ActiveModel {
        id: Set(Uuid::new_v4()),
        conversation_id: Set(None),
        sender_id: Set(None),
        receiver_id: Set(receiver_id),
        subject: Set(subject.to_string()),
        content: Set(content.to_string()),
        is_read: Set(false),
        is_system: Set(true),
        sender_display_name: Set(Some("Système".to_string())),
        message_category: Set(category.to_string()),
        created_at: Set(now),
    }.insert(db).await?;
    Ok(())
}
