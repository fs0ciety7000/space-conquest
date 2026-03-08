/// Handlers HTTP — Événements PVE Serveur
///
/// Routes publiques :
///   GET  /server-events                     — liste events actifs + incoming
///   GET  /server-events/:id                 — détail (HP, participants, zone)
///   POST /server-events/:id/contribute      — contribution manuelle (ressources)
///
/// Routes admin :
///   GET    /admin/server-events             — tous les events
///   POST   /admin/server-events             — créer un event manuel
///   PATCH  /admin/server-events/:id/cancel  — annuler
///   PATCH  /admin/server-events/:id/resolve — forcer résolution
///   GET    /admin/server-event-types        — lister les types
///   POST   /admin/server-event-types        — créer un type
///   PATCH  /admin/server-event-types/:id    — modifier un type
///   DELETE /admin/server-event-types/:id    — désactiver un type

use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    Router,
    routing::{get, post, patch, delete},
};
use sea_orm::{
    EntityTrait, QueryFilter, ColumnTrait, Set, ActiveModelTrait,
    QueryOrder, QuerySelect,
};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;
use chrono::Utc;

use crate::AppState;
use crate::entities::{
    prelude::*,
    server_event, server_event_type, server_event_participation,
};
use crate::server_events::{
    self, enrich_event, get_top_contributors_public,
};

// ─── Router ──────────────────────────────────────────────────────────────────

pub fn router(state: AppState) -> Router<AppState> {
    Router::new()
        // Publiques
        .route("/server-events",                         get(list_events_handler))
        .route("/server-events/:id",                     get(get_event_handler))
        .route("/server-events/:id/contribute",          post(contribute_handler))
        // Admin
        .route("/admin/server-events",                   get(admin_list_handler).post(admin_create_handler))
        .route("/admin/server-events/:id/cancel",        patch(admin_cancel_handler))
        .route("/admin/server-events/:id/resolve",       patch(admin_resolve_handler))
        .route("/admin/server-event-types",              get(admin_list_types_handler).post(admin_create_type_handler))
        .route("/admin/server-event-types/:id",          patch(admin_update_type_handler).delete(admin_delete_type_handler))
}

// ─── GET /server-events ───────────────────────────────────────────────────────

async fn list_events_handler(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let events = server_events::get_active_events(&state.db).await;
    let mut enriched = Vec::new();
    for e in events {
        enriched.push(enrich_event(&state.db, e).await);
    }
    Json(json!({ "events": enriched })).into_response()
}

// ─── GET /server-events/:id ──────────────────────────────────────────────────

async fn get_event_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let event = match ServerEvent::find_by_id(id).one(&state.db).await {
        Ok(Some(e)) => e,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Event not found"}))).into_response(),
    };

    let summary = enrich_event(&state.db, event).await;

    // Top 10 participants
    let top = get_top_contributors_public(&state.db, id, 10).await;

    Json(json!({
        "event": summary,
        "top_contributors": top,
    })).into_response()
}

// ─── POST /server-events/:id/contribute ──────────────────────────────────────

#[derive(Deserialize)]
struct ContributePayload {
    user_id: Uuid,
    planet_id: Uuid,
    resources: Option<i32>, // points de contribution manuels (ressources envoyées)
}

async fn contribute_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<ContributePayload>,
) -> impl IntoResponse {
    let event = match ServerEvent::find_by_id(id).one(&state.db).await {
        Ok(Some(e)) if e.status == "active" => e,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Event not active"}))).into_response(),
    };

    let contribution = payload.resources.unwrap_or(100);

    if let Err(e) = server_events::record_contribution(
        &state.db, id, payload.user_id, payload.planet_id, contribution,
    ).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response();
    }

    // Vérifier si l'événement est terminé
    let _ = server_events::check_event_completion(&state, id).await;

    // Broadcast progression
    broadcast_progress(&state, &event).await;

    Json(json!({ "success": true, "contribution": contribution })).into_response()
}

// ─── ADMIN — GET /admin/server-events ────────────────────────────────────────

#[derive(Deserialize)]
struct AdminListQuery {
    status: Option<String>,
    limit: Option<u64>,
}

async fn admin_list_handler(
    State(state): State<AppState>,
    Query(params): Query<AdminListQuery>,
) -> impl IntoResponse {
    let mut query = ServerEvent::find().order_by_desc(server_event::Column::CreatedAt);

    if let Some(status) = &params.status {
        query = query.filter(server_event::Column::Status.eq(status.as_str()));
    }

    let limit = params.limit.unwrap_or(50);
    let events = query.limit(limit).all(&state.db).await.unwrap_or_default();

    let mut enriched = Vec::new();
    for e in events {
        enriched.push(enrich_event(&state.db, e).await);
    }

    Json(json!({ "events": enriched, "total": enriched.len() })).into_response()
}

// ─── ADMIN — POST /admin/server-events ───────────────────────────────────────

#[derive(Deserialize)]
struct AdminCreateEventPayload {
    event_type_key: String,
    affected_galaxy: Option<i32>,
    affected_system: Option<i32>,
    radius: Option<i32>,
    starts_in_minutes: Option<i64>,
    duration_hours: Option<i32>,
    narrative: Option<String>,
    triggered_by: Option<Uuid>,
}

async fn admin_create_handler(
    State(state): State<AppState>,
    Json(payload): Json<AdminCreateEventPayload>,
) -> impl IntoResponse {
    let starts_in_secs = payload.starts_in_minutes.unwrap_or(60) * 60;

    match server_events::create_event(
        &state.db,
        &payload.event_type_key,
        payload.affected_galaxy,
        payload.affected_system,
        payload.radius.unwrap_or(0),
        starts_in_secs,
        payload.duration_hours,
        payload.narrative.clone(),
        payload.triggered_by,
    ).await {
        Ok(event) => {
            let summary = enrich_event(&state.db, event.clone()).await;

            // Broadcast annonce immédiate
            if let Some(ref ws) = state.ws {
                ws.broadcast_global(crate::websocket::WsEvent::ServerEventAnnounced {
                    event_id: event.id.to_string(),
                    event_type: event.event_type_key.clone(),
                    name: summary.name.clone(),
                    icon: summary.icon.clone(),
                    color: summary.color.clone(),
                    zone: crate::server_events::format_zone_public(&event),
                    starts_in_seconds: starts_in_secs,
                    narrative: payload.narrative.unwrap_or_default(),
                });
            }

            (StatusCode::CREATED, Json(json!({ "event": summary }))).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

// ─── ADMIN — PATCH /admin/server-events/:id/cancel ───────────────────────────

async fn admin_cancel_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    match server_events::cancel_event(&state.db, id).await {
        Ok(_) => {
            if let Some(ref ws) = state.ws {
                ws.broadcast_global(crate::websocket::WsEvent::ServerEventResolved {
                    event_id: id.to_string(),
                    event_type: "unknown".to_string(),
                    outcome: "cancelled".to_string(),
                    rewards_distributed: false,
                    top_contributors: vec![],
                });
            }
            Json(json!({"success": true})).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

// ─── ADMIN — PATCH /admin/server-events/:id/resolve ──────────────────────────

async fn admin_resolve_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    match server_events::resolve_event(&state, id, "admin_resolved").await {
        Ok(_) => Json(json!({"success": true})).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

// ─── ADMIN — Types d'événements ───────────────────────────────────────────────

async fn admin_list_types_handler(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let types = ServerEventType::find()
        .order_by_asc(server_event_type::Column::TypeKey)
        .all(&state.db).await.unwrap_or_default();
    Json(json!({ "types": types })).into_response()
}

#[derive(Deserialize)]
struct CreateTypePayload {
    type_key: String,
    name: String,
    description: Option<String>,
    icon: Option<String>,
    color: Option<String>,
    default_duration_hours: Option<i32>,
    cooldown_hours: Option<i32>,
    effects: Option<serde_json::Value>,
    rewards: Option<serde_json::Value>,
}

async fn admin_create_type_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateTypePayload>,
) -> impl IntoResponse {
    let model = server_event_type::ActiveModel {
        id: Set(Uuid::new_v4()),
        type_key: Set(payload.type_key),
        name: Set(payload.name),
        description: Set(payload.description),
        icon: Set(payload.icon),
        color: Set(payload.color),
        default_duration_hours: Set(payload.default_duration_hours.unwrap_or(24)),
        cooldown_hours: Set(payload.cooldown_hours.unwrap_or(168)),
        effects: Set(payload.effects.unwrap_or(json!({}))),
        rewards: Set(payload.rewards.unwrap_or(json!({}))),
        is_active: Set(true),
        created_at: Set(Utc::now().into()),
    };

    match model.insert(&state.db).await {
        Ok(t) => (StatusCode::CREATED, Json(json!({"type": t}))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

#[derive(Deserialize)]
struct UpdateTypePayload {
    name: Option<String>,
    description: Option<String>,
    icon: Option<String>,
    color: Option<String>,
    default_duration_hours: Option<i32>,
    cooldown_hours: Option<i32>,
    effects: Option<serde_json::Value>,
    rewards: Option<serde_json::Value>,
    is_active: Option<bool>,
}

async fn admin_update_type_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<UpdateTypePayload>,
) -> impl IntoResponse {
    let t = match ServerEventType::find_by_id(id).one(&state.db).await {
        Ok(Some(t)) => t,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Not found"}))).into_response(),
    };

    let mut active: server_event_type::ActiveModel = t.into();
    if let Some(v) = payload.name { active.name = Set(v); }
    if let Some(v) = payload.description { active.description = Set(Some(v)); }
    if let Some(v) = payload.icon { active.icon = Set(Some(v)); }
    if let Some(v) = payload.color { active.color = Set(Some(v)); }
    if let Some(v) = payload.default_duration_hours { active.default_duration_hours = Set(v); }
    if let Some(v) = payload.cooldown_hours { active.cooldown_hours = Set(v); }
    if let Some(v) = payload.effects { active.effects = Set(v); }
    if let Some(v) = payload.rewards { active.rewards = Set(v); }
    if let Some(v) = payload.is_active { active.is_active = Set(v); }

    match active.update(&state.db).await {
        Ok(t) => Json(json!({"type": t})).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn admin_delete_type_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let t = match ServerEventType::find_by_id(id).one(&state.db).await {
        Ok(Some(t)) => t,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Not found"}))).into_response(),
    };

    let mut active: server_event_type::ActiveModel = t.into();
    active.is_active = Set(false);
    match active.update(&state.db).await {
        Ok(_) => Json(json!({"success": true})).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async fn broadcast_progress(state: &AppState, event: &server_event::Model) {
    let event_fresh = ServerEvent::find_by_id(event.id).one(&state.db).await
        .ok().flatten().unwrap_or(event.clone());

    let top = get_top_contributors_public(&state.db, event.id, 3).await;
    let top_names: Vec<String> = top.iter().map(|(n, _)| n.clone()).collect();
    let percent = if event_fresh.hp_max > 0 {
        event_fresh.hp_current as f64 / event_fresh.hp_max as f64 * 100.0
    } else { 0.0 };

    if let Some(ref ws) = state.ws {
        ws.broadcast_global(crate::websocket::WsEvent::ServerEventProgress {
            event_id: event.id.to_string(),
            hp_current: event_fresh.hp_current,
            hp_max: event_fresh.hp_max,
            top_contributors: top_names,
            percent,
        });
    }
}
