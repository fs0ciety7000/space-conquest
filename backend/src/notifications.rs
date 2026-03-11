use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use sea_orm::{
    ActiveModelTrait, EntityTrait, Set,
    QueryFilter, QueryOrder, ColumnTrait, QuerySelect,
    sea_query::Expr,
};
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;
use chrono::Utc;

use crate::entities::{
    prelude::Notification,
    notification,
};
use crate::AppState;

// ============================================================================
// PUBLIC HELPER — créer une notification en base + diffuser via WS
// ============================================================================

/// Crée une notification persistante en base de données.
/// Appelé depuis les autres modules (combat, build_queue, trade_routes…).
pub async fn create_notification(
    db: &sea_orm::DatabaseConnection,
    user_id: Uuid,
    notif_type: &str,
    title: &str,
    message: &str,
    report_id: Option<Uuid>,
) {
    let notif = notification::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(user_id),
        notif_type: Set(notif_type.to_string()),
        title: Set(title.to_string()),
        message: Set(message.to_string()),
        is_read: Set(false),
        created_at: Set(Utc::now().naive_utc()),
        report_id: Set(report_id),
    };
    let _ = notif.insert(db).await;
}

// ============================================================================
// GET /users/:user_id/notifications
// ============================================================================

pub async fn get_notifications_handler(
    State(state): State<AppState>,
    Path(user_id_str): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user id"}))).into_response(),
    };

    let limit: u64 = params.get("limit")
        .and_then(|v| v.parse().ok())
        .unwrap_or(30);

    let notifs = match Notification::find()
        .filter(notification::Column::UserId.eq(user_id))
        .order_by_desc(notification::Column::CreatedAt)
        .limit(limit)
        .all(&state.db)
        .await
    {
        Ok(n) => n,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    };

    let unread_count = notifs.iter().filter(|n| !n.is_read).count();

    let items: Vec<serde_json::Value> = notifs.into_iter().map(|n| {
        json!({
            "id": n.id.to_string(),
            "type": n.notif_type,
            "title": n.title,
            "message": n.message,
            "read": n.is_read,
            "time": n.created_at.to_string(),
            "report_id": n.report_id.map(|id| id.to_string()),
        })
    }).collect();

    Json(json!({
        "notifications": items,
        "unread_count": unread_count,
    })).into_response()
}

// ============================================================================
// POST /users/:user_id/notifications/read
// ============================================================================

pub async fn mark_all_read_handler(
    State(state): State<AppState>,
    Path(user_id_str): Path<String>,
) -> impl IntoResponse {
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid user id"}))).into_response(),
    };

    let result = Notification::update_many()
        .col_expr(notification::Column::IsRead, Expr::value(true))
        .filter(notification::Column::UserId.eq(user_id))
        .filter(notification::Column::IsRead.eq(false))
        .exec(&state.db)
        .await;

    match result {
        Ok(_) => Json(json!({"success": true})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}
