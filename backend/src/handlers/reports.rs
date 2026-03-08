// ─────────────────────────────────────────────────────────────────────────────
// handlers/reports.rs — Combat reports, transport logs, and report-clearing handlers
//
// Extracted from main.rs (~lines 2079–2091, 3130–3230).
// Exposes a `router()` function to be merged into the main Axum app.
// ─────────────────────────────────────────────────────────────────────────────

use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use sea_orm::{
    ActiveModelTrait, Condition, EntityTrait, PaginatorTrait,
    QueryFilter, ColumnTrait, QueryOrder, QuerySelect, Set,
};
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;

use backend::AppState;
use backend::entities::{
    prelude::{CombatLog, Planet, TransportLog},
    combat_log, planet, transport_log,
};

pub fn router(state: crate::AppState) -> Router<crate::AppState> {
    Router::new()
        .route("/planets/:id/clear-report", post(clear_report_handler))
        .route("/planets/:id/reports", get(get_reports_handler))
        .route("/combat-reports/:id/detail", get(get_combat_report_detail_handler))
        .route("/planets/:id/transport-logs", get(get_transport_logs_handler))
        .with_state(state)
}

pub async fn clear_report_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let p = match Planet::find_by_id(id).one(&state.db).await {
        Ok(Some(p)) => p,
        _ => return StatusCode::NOT_FOUND,
    };
    let mut active: planet::ActiveModel = p.into();
    active.unread_report = Set(None);
    let _ = active.update(&state.db).await;
    StatusCode::OK
}

pub async fn get_reports_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let page: u64 = params.get("page").and_then(|s| s.parse().ok()).unwrap_or(1);
    let limit: u64 = params.get("limit").and_then(|s| s.parse().ok()).unwrap_or(20);
    let offset = (page - 1) * limit;

    let total = CombatLog::find()
        .filter(combat_log::Column::PlanetId.eq(id))
        .count(&state.db)
        .await
        .unwrap_or(0);

    let logs = CombatLog::find()
        .filter(combat_log::Column::PlanetId.eq(id))
        .order_by_desc(combat_log::Column::Date)
        .limit(limit)
        .offset(offset)
        .all(&state.db)
        .await
        .unwrap_or_default();

    Json(json!({ "data": logs, "total": total, "page": page, "limit": limit }))
}

pub async fn get_combat_report_detail_handler(
    Path(report_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let report = CombatLog::find_by_id(report_id)
        .one(&state.db)
        .await
        .unwrap_or(None);

    match report {
        Some(log) => {
            if let Some(detailed) = log.detailed_report {
                (StatusCode::OK, Json(detailed)).into_response()
            } else {
                (StatusCode::NOT_FOUND, Json(json!({"error": "Aucun détail disponible pour ce rapport"}))).into_response()
            }
        }
        None => {
            (StatusCode::NOT_FOUND, Json(json!({"error": "Rapport introuvable"}))).into_response()
        }
    }
}

pub async fn get_transport_logs_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let page: u64 = params.get("page").and_then(|s| s.parse().ok()).unwrap_or(1);
    let limit: u64 = params.get("limit").and_then(|s| s.parse().ok()).unwrap_or(20);
    let offset = (page - 1) * limit;

    let filter = Condition::any()
        .add(transport_log::Column::TargetPlanetId.eq(id))
        .add(transport_log::Column::SourcePlanetId.eq(id));

    let total = TransportLog::find()
        .filter(filter.clone())
        .count(&state.db)
        .await
        .unwrap_or(0);

    let logs = TransportLog::find()
        .filter(filter)
        .order_by_desc(transport_log::Column::Date)
        .limit(limit)
        .offset(offset)
        .all(&state.db)
        .await
        .unwrap_or_default();

    let logs_json: Vec<serde_json::Value> = logs.into_iter().map(|log| {
        let opponent_username = if log.target_planet_id == id {
            log.source_owner_name.clone()
        } else {
            log.target_owner_name.clone()
        };
        json!({
            "id": log.id,
            "target_planet_id": log.target_planet_id,
            "target_planet_name": log.target_planet_name,
            "source_planet_id": log.source_planet_id,
            "source_planet_name": log.source_planet_name,
            "opponent_username": opponent_username,
            "metal": log.metal,
            "crystal": log.crystal,
            "deuterium": log.deuterium,
            "date": log.date
        })
    }).collect();

    Json(json!({ "data": logs_json, "total": total, "page": page, "limit": limit }))
}
