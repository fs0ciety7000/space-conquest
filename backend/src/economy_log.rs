/// Economy Log — unified ledger of resource & currency movements
///
/// Sources tracked:
///   • Construction queue (buildings / techs / ships / defenses)
///     → logged at queue time (cost deducted immediately)
///   • Black market purchases (Syndicate Credits)
///     → logged in buy_item_handler
///   • Resource market & planet market
///     → queried live from market_transaction / planet_listing tables
///
/// Endpoints:
///   GET /economy/log   — returns last 200 events for the calling user

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
};
use chrono::Utc;
use sea_orm::{DatabaseConnection, EntityTrait, Set};
use serde_json::json;
use uuid::Uuid;

use crate::entities::{economy_log, prelude::EconomyLog};
use crate::AppState;

// ── Helper ─────────────────────────────────────────────────────────────────────

#[allow(clippy::too_many_arguments)]
pub async fn log_event(
    db: &DatabaseConnection,
    user_id: Uuid,
    category: &str,
    action: &str,
    description: &str,
    metal: f64,
    crystal: f64,
    deuterium: f64,
    syndicate_credits: f64,
    planet_name: Option<&str>,
    counterparty_username: Option<&str>,
    item_key: Option<&str>,
) {
    let model = economy_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(user_id),
        category: Set(category.to_string()),
        action: Set(action.to_string()),
        description: Set(description.to_string()),
        metal: Set(metal),
        crystal: Set(crystal),
        deuterium: Set(deuterium),
        syndicate_credits: Set(syndicate_credits),
        planet_name: Set(planet_name.map(str::to_string)),
        counterparty_username: Set(counterparty_username.map(str::to_string)),
        item_key: Set(item_key.map(str::to_string)),
        created_at: Set(Utc::now().naive_utc()),
    };
    if let Err(e) = model.insert(db).await {
        eprintln!("[economy_log] insert error: {:?}", e);
    }
}

// ── GET /economy/log ───────────────────────────────────────────────────────────

pub async fn get_economy_log_handler(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    let user_id = match extract_user_id(&headers) {
        Some(id) => id,
        None => {
            return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Non authentifié"}))).into_response()
        }
    };

    // ── 1. Economy log entries (construction + black market) ──────────────────
    let economy_rows = state
        .db
        .query_all(sea_orm::Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            "SELECT id, category, action, description, metal, crystal, deuterium,
                    syndicate_credits, planet_name, counterparty_username, item_key, created_at
             FROM economy_log
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 200",
            [user_id.into()],
        ))
        .await
        .unwrap_or_default();

    let economy_entries: Vec<serde_json::Value> = economy_rows
        .iter()
        .map(|row| {
            let created_at: chrono::NaiveDateTime =
                row.try_get("", "created_at").unwrap_or_default();
            json!({
                "id": row.try_get::<Uuid>("", "id").ok().map(|u| u.to_string()),
                "source": "economy_log",
                "category": row.try_get::<String>("", "category").unwrap_or_default(),
                "action": row.try_get::<String>("", "action").unwrap_or_default(),
                "description": row.try_get::<String>("", "description").unwrap_or_default(),
                "metal": row.try_get::<f64>("", "metal").unwrap_or(0.0),
                "crystal": row.try_get::<f64>("", "crystal").unwrap_or(0.0),
                "deuterium": row.try_get::<f64>("", "deuterium").unwrap_or(0.0),
                "syndicate_credits": row.try_get::<f64>("", "syndicate_credits").unwrap_or(0.0),
                "planet_name": row.try_get::<Option<String>>("", "planet_name").unwrap_or(None),
                "counterparty_username": row.try_get::<Option<String>>("", "counterparty_username").unwrap_or(None),
                "item_key": row.try_get::<Option<String>>("", "item_key").unwrap_or(None),
                "created_at": created_at.format("%Y-%m-%dT%H:%M:%S").to_string(),
            })
        })
        .collect();

    // ── 2. Market transactions (resource market) ──────────────────────────────
    let market_rows = state
        .db
        .query_all(sea_orm::Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            "SELECT mt.id, mt.resource_sold, mt.resource_paid, mt.quantity_sold,
                    mt.quantity_paid, mt.price_per_unit, mt.tax_amount,
                    mt.transaction_type, mt.created_at,
                    CASE WHEN mt.seller_user_id = $1 THEN 'sell' ELSE 'buy' END AS side,
                    CASE WHEN mt.seller_user_id = $1 THEN bu.username ELSE su.username END AS counterparty,
                    sp.name AS seller_planet_name,
                    bp.name AS buyer_planet_name
             FROM market_transaction mt
             LEFT JOIN \"user\" su ON su.id = mt.seller_user_id
             LEFT JOIN \"user\" bu ON bu.id = mt.buyer_user_id
             LEFT JOIN planet sp ON sp.id = mt.seller_planet_id
             LEFT JOIN planet bp ON bp.id = mt.buyer_planet_id
             WHERE mt.seller_user_id = $1 OR mt.buyer_user_id = $1
             ORDER BY mt.created_at DESC
             LIMIT 100",
            [user_id.into()],
        ))
        .await
        .unwrap_or_default();

    let market_entries: Vec<serde_json::Value> = market_rows
        .iter()
        .map(|row| {
            let created_at: chrono::NaiveDateTime =
                row.try_get("", "created_at").unwrap_or_default();
            let side: String = row.try_get("", "side").unwrap_or_default();
            let resource_sold: String = row.try_get("", "resource_sold").unwrap_or_default();
            let resource_paid: String = row.try_get("", "resource_paid").unwrap_or_default();
            let qty_sold: f64 = row.try_get("", "quantity_sold").unwrap_or(0.0);
            let qty_paid: f64 = row.try_get("", "quantity_paid").unwrap_or(0.0);
            let price: f64 = row.try_get("", "price_per_unit").unwrap_or(0.0);
            let counterparty: Option<String> = row.try_get("", "counterparty").unwrap_or(None);
            let planet_name: Option<String> = if side == "sell" {
                row.try_get("", "seller_planet_name").unwrap_or(None)
            } else {
                row.try_get("", "buyer_planet_name").unwrap_or(None)
            };

            let description = if side == "sell" {
                format!(
                    "Vente : {:.0} {} → {:.0} {}",
                    qty_sold, resource_sold, qty_paid, resource_paid
                )
            } else {
                format!(
                    "Achat : {:.0} {} contre {:.0} {}",
                    qty_sold, resource_sold, qty_paid, resource_paid
                )
            };

            // Map amounts to metal/crystal/deuterium fields based on resource type
            let (mut metal, mut crystal, mut deuterium) = (0.0f64, 0.0f64, 0.0f64);
            let sign = if side == "sell" { -1.0 } else { 1.0 };
            match resource_sold.as_str() {
                "metal" => metal += sign * qty_sold,
                "crystal" => crystal += sign * qty_sold,
                "deuterium" => deuterium += sign * qty_sold,
                _ => {}
            }
            let sign2 = if side == "sell" { 1.0 } else { -1.0 };
            match resource_paid.as_str() {
                "metal" => metal += sign2 * qty_paid,
                "crystal" => crystal += sign2 * qty_paid,
                "deuterium" => deuterium += sign2 * qty_paid,
                _ => {}
            }

            json!({
                "id": row.try_get::<Uuid>("", "id").ok().map(|u| u.to_string()),
                "source": "market",
                "category": "market",
                "action": side,
                "description": description,
                "metal": metal,
                "crystal": crystal,
                "deuterium": deuterium,
                "syndicate_credits": 0.0,
                "planet_name": planet_name,
                "counterparty_username": counterparty,
                "item_key": format!("{} @ {:.2}/u", resource_sold, price),
                "created_at": created_at.format("%Y-%m-%dT%H:%M:%S").to_string(),
            })
        })
        .collect();

    // ── 3. Planet market transactions ─────────────────────────────────────────
    let planet_market_rows = state
        .db
        .query_all(sea_orm::Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            "SELECT pl.id, pl.planet_id, pl.price, pl.sold_at,
                    p.name AS planet_name,
                    CASE WHEN pl.seller_id = $1 THEN 'sell' ELSE 'buy' END AS side,
                    CASE WHEN pl.seller_id = $1 THEN bu.username ELSE su.username END AS counterparty
             FROM planet_listing pl
             LEFT JOIN planet p ON p.id = pl.planet_id
             LEFT JOIN \"user\" su ON su.id = pl.seller_id
             LEFT JOIN \"user\" bu ON bu.id = pl.buyer_id
             WHERE (pl.seller_id = $1 OR pl.buyer_id = $1)
               AND pl.status = 'sold'
               AND pl.sold_at IS NOT NULL
             ORDER BY pl.sold_at DESC
             LIMIT 50",
            [user_id.into()],
        ))
        .await
        .unwrap_or_default();

    let planet_entries: Vec<serde_json::Value> = planet_market_rows
        .iter()
        .map(|row| {
            let sold_at: Option<chrono::NaiveDateTime> =
                row.try_get("", "sold_at").unwrap_or(None);
            let side: String = row.try_get("", "side").unwrap_or_default();
            let planet_name: Option<String> = row.try_get("", "planet_name").unwrap_or(None);
            let price: f64 = row.try_get("", "price").unwrap_or(0.0);
            let counterparty: Option<String> = row.try_get("", "counterparty").unwrap_or(None);
            let description = if side == "sell" {
                format!(
                    "Vente planète {} : {:.0} Métal",
                    planet_name.as_deref().unwrap_or("?"),
                    price
                )
            } else {
                format!(
                    "Achat planète {} : {:.0} Métal",
                    planet_name.as_deref().unwrap_or("?"),
                    price
                )
            };
            let metal = if side == "sell" { price } else { -price };
            json!({
                "id": row.try_get::<Uuid>("", "id").ok().map(|u| u.to_string()),
                "source": "planet_market",
                "category": "market",
                "action": format!("planet_{}", side),
                "description": description,
                "metal": metal,
                "crystal": 0.0,
                "deuterium": 0.0,
                "syndicate_credits": 0.0,
                "planet_name": planet_name,
                "counterparty_username": counterparty,
                "item_key": null,
                "created_at": sold_at
                    .map(|dt| dt.format("%Y-%m-%dT%H:%M:%S").to_string())
                    .unwrap_or_default(),
            })
        })
        .collect();

    // ── Merge & sort by created_at desc ───────────────────────────────────────
    let mut all: Vec<serde_json::Value> = [economy_entries, market_entries, planet_entries]
        .into_iter()
        .flatten()
        .collect();

    all.sort_by(|a, b| {
        let ta = a["created_at"].as_str().unwrap_or("");
        let tb = b["created_at"].as_str().unwrap_or("");
        tb.cmp(ta)
    });
    all.truncate(300);

    Json(json!({ "entries": all })).into_response()
}

// ── Auth helper (same as black_market.rs) ────────────────────────────────────

fn extract_user_id(headers: &axum::http::HeaderMap) -> Option<Uuid> {
    let header = headers.get("Authorization")?.to_str().ok()?;
    let token = header.strip_prefix("Bearer ")?;
    let uuid_str = token.strip_prefix("jwt-").unwrap_or(token);
    Uuid::parse_str(uuid_str).ok()
}
