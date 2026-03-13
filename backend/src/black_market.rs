/// Black Market (Underground) — Syndicate Credits economy
///
/// # Access requirements (enforced server-side):
///   - espionage_tech >= 13
///   - computer_tech >= 10
///
/// # Endpoints
///   GET  /black-market              — list active items (tech-gated)
///   POST /black-market/buy          — purchase an item
///   GET  /black-market/inventory    — player's current inventory
///   POST /black-market/activate     — use an item (effect dispatched by effect_type)
///   GET  /black-market/extortions   — pending pirate extortions for the caller
///   POST /black-market/extortions/:id/resolve — choose outcome (passive/tribute/retaliate)
///
/// # Admin endpoints (role = "admin")
///   GET    /admin/black-market/items
///   POST   /admin/black-market/items
///   PUT    /admin/black-market/items/:id
///   DELETE /admin/black-market/items/:id
///
/// # Price fluctuation tick (called from main process_tick)
///   randomize_black_market_prices(db) — runs every 6 h

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use chrono::Utc;
use rand::Rng;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set,
    ActiveValue::NotSet,
};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::entities::{
    prelude::*,
    black_market_item, user, user_inventory, pirate_extortion, planet_technology,
};
use crate::AppState;

// ── Constants ─────────────────────────────────────────────────────────────────

/// Seuil d'accès réduit (v9.2) : Espionnage ≥ 8 et Informatique ≥ 6
const ESPIONAGE_REQ: i32 = 8;
const COMPUTER_REQ: i32 = 6;

/// Price fluctuation interval (seconds). 6 hours.
pub const PRICE_TICK_INTERVAL_SECS: i64 = 6 * 3600;

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Extract user_id UUID from Authorization: Bearer jwt-{uuid}
fn extract_user_id(headers: &axum::http::HeaderMap) -> Option<Uuid> {
    let header = headers.get("Authorization")?.to_str().ok()?;
    let token = header.strip_prefix("Bearer ")?;
    let uuid_str = token.strip_prefix("jwt-").unwrap_or(token);
    Uuid::parse_str(uuid_str).ok()
}

/// Returns the best (espionage, computer) pair where both levels come from the same planet.
/// Iterates all user planets; returns immediately if one planet satisfies both requirements.
/// Falls back to per-planet best for display purposes (access check still uses AND logic).
async fn get_user_tech_levels(
    db: &sea_orm::DatabaseConnection,
    user_id: Uuid,
) -> (i32, i32) {
    let planets = match crate::entities::prelude::Planet::find()
        .filter(crate::entities::planet::Column::OwnerId.eq(user_id))
        .all(db)
        .await
    {
        Ok(p) if !p.is_empty() => p,
        _ => return (0, 0),
    };

    let all_techs = Technology::find().all(db).await.unwrap_or_default();
    let tech_id_map: std::collections::HashMap<i32, String> = all_techs
        .iter()
        .map(|t| (t.id, t.tech_key.clone()))
        .collect();

    let mut best_esp = 0i32;
    let mut best_comp = 0i32;

    for planet in &planets {
        let planet_techs = PlanetTechnology::find()
            .filter(planet_technology::Column::PlanetId.eq(planet.id))
            .all(db)
            .await
            .unwrap_or_default();

        let mut esp = 0i32;
        let mut comp = 0i32;
        for pt in &planet_techs {
            match tech_id_map.get(&pt.tech_id).map(|s| s.as_str()) {
                Some("espionage") | Some("espionage_tech") => esp = pt.current_level,
                Some("computer_tech") => comp = pt.current_level,
                _ => {}
            }
        }
        // Short-circuit: this planet alone satisfies both requirements
        if esp >= ESPIONAGE_REQ && comp >= COMPUTER_REQ {
            return (esp, comp);
        }
        best_esp = best_esp.max(esp);
        best_comp = best_comp.max(comp);
    }

    // No single planet qualifies; return per-planet bests for display
    (best_esp, best_comp)
}

fn access_denied() -> axum::response::Response {
    (
        StatusCode::FORBIDDEN,
        Json(json!({
            "error": "Accès refusé au Marché Underground",
            "requires": {
                "espionage_tech": ESPIONAGE_REQ,
                "computer_tech": COMPUTER_REQ
            }
        })),
    )
        .into_response()
}

// ── Price tick ────────────────────────────────────────────────────────────────

/// Called from the main tick loop every PRICE_TICK_INTERVAL_SECS.
/// Randomises current_price for every active black market item
/// within ±30 % below and +50 % above the base price.
pub async fn randomize_black_market_prices(db: &sea_orm::DatabaseConnection) {
    let items = match BlackMarketItem::find()
        .filter(black_market_item::Column::IsActive.eq(true))
        .all(db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            eprintln!("black_market price tick error: {:?}", e);
            return;
        }
    };

    // Generate all new prices synchronously — ThreadRng is !Send and cannot cross .await points
    let new_prices: Vec<f64> = {
        let mut rng = rand::thread_rng();
        items
            .iter()
            .map(|item| {
                let factor = rng.gen_range(0.70_f64..=1.50_f64);
                (item.base_price * factor).round().max(1.0)
            })
            .collect()
    };

    for (item, new_price) in items.into_iter().zip(new_prices) {
        let mut active: black_market_item::ActiveModel = item.into();
        active.current_price = Set(new_price);
        active.price_last_updated = Set(Utc::now().naive_utc());

        if let Err(e) = active.update(db).await {
            eprintln!("price tick update error: {:?}", e);
        }
    }

    println!("💰 Black market prices randomised");
}

// ── GET /black-market ─────────────────────────────────────────────────────────

pub async fn list_items_handler(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    let user_id = match extract_user_id(&headers) {
        Some(id) => id,
        None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Non authentifié"}))).into_response(),
    };

    let (esp_lvl, comp_lvl) = get_user_tech_levels(&state.db, user_id).await;
    if esp_lvl < ESPIONAGE_REQ || comp_lvl < COMPUTER_REQ {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({
                "error": "Accès refusé",
                "requires": { "espionage_tech": ESPIONAGE_REQ, "computer_tech": COMPUTER_REQ },
                "current": { "espionage_tech": esp_lvl, "computer_tech": comp_lvl }
            })),
        ).into_response();
    }

    // Fetch user credits
    let user = User::find_by_id(user_id).one(&state.db).await.ok().flatten();
    let credits = user.map(|u| u.syndicate_credits).unwrap_or(0.0);

    let items = match BlackMarketItem::find()
        .filter(black_market_item::Column::IsActive.eq(true))
        .all(&state.db)
        .await
    {
        Ok(v) => v,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "DB error"}))).into_response(),
    };

    let items_json: Vec<Value> = items
        .iter()
        .map(|item| {
            let pct_change = ((item.current_price - item.base_price) / item.base_price * 100.0).round();
            json!({
                "id": item.id,
                "name": item.name,
                "description": item.description,
                "image_key": item.image_key,
                "effect_type": item.effect_type,
                "effect_params": item.effect_params,
                "base_price": item.base_price,
                "current_price": item.current_price,
                "price_change_pct": pct_change,
                "price_last_updated": item.price_last_updated.format("%Y-%m-%dT%H:%M:%S").to_string(),
            })
        })
        .collect();

    Json(json!({
        "items": items_json,
        "syndicate_credits": credits,
        "access": true,
    })).into_response()
}

// ── POST /black-market/buy ────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct BuyPayload {
    pub item_id: Uuid,
    pub quantity: Option<i32>,
}

pub async fn buy_item_handler(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<BuyPayload>,
) -> impl IntoResponse {
    let user_id = match extract_user_id(&headers) {
        Some(id) => id,
        None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Non authentifié"}))).into_response(),
    };

    let (esp_lvl, comp_lvl) = get_user_tech_levels(&state.db, user_id).await;
    if esp_lvl < ESPIONAGE_REQ || comp_lvl < COMPUTER_REQ {
        return access_denied();
    }

    let qty = payload.quantity.unwrap_or(1).max(1);

    let item = match BlackMarketItem::find_by_id(payload.item_id).one(&state.db).await {
        Ok(Some(i)) if i.is_active => i,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Objet introuvable"}))).into_response(),
    };

    let total_cost = item.current_price * qty as f64;

    let user = match User::find_by_id(user_id).one(&state.db).await {
        Ok(Some(u)) => u,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Utilisateur introuvable"}))).into_response(),
    };

    if user.syndicate_credits < total_cost {
        return (
            StatusCode::PAYMENT_REQUIRED,
            Json(json!({
                "error": "Crédits du Syndicat insuffisants",
                "required": total_cost,
                "current": user.syndicate_credits,
            })),
        ).into_response();
    }

    // Debit credits
    let mut user_active: user::ActiveModel = user.into();
    let prev_credits: f64 = match user_active.syndicate_credits {
        sea_orm::ActiveValue::Set(v) | sea_orm::ActiveValue::Unchanged(v) => v,
        _ => 0.0,
    };
    user_active.syndicate_credits = Set(prev_credits - total_cost);
    if let Err(e) = user_active.update(&state.db).await {
        eprintln!("buy_item debit error: {:?}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response();
    }

    // Upsert inventory row (merge quantity if item already owned)
    let existing = UserInventory::find()
        .filter(user_inventory::Column::UserId.eq(user_id))
        .filter(user_inventory::Column::ItemId.eq(item.id))
        .one(&state.db)
        .await
        .unwrap_or(None);

    if let Some(row) = existing {
        let new_qty = row.quantity + qty;
        let mut inv: user_inventory::ActiveModel = row.into();
        inv.quantity = Set(new_qty);
        let _ = inv.update(&state.db).await;
    } else {
        let _ = user_inventory::ActiveModel {
            id: Set(Uuid::new_v4()),
            user_id: Set(user_id),
            item_id: Set(item.id),
            quantity: Set(qty),
            acquired_at: Set(Utc::now().naive_utc()),
        }.insert(&state.db).await;
    }

    // Log economy event
    {
        let db_clone = state.db.clone();
        let desc = if qty > 1 {
            format!("Achat ×{} : {}", qty, item.name)
        } else {
            format!("Achat : {}", item.name)
        };
        let effect_type = item.effect_type.clone();
        tokio::spawn(async move {
            crate::economy_log::log_event(
                &db_clone,
                user_id,
                "black_market",
                "sc_purchase",
                &desc,
                0.0, 0.0, 0.0,
                -total_cost,
                None,
                None,
                Some(&effect_type),
            ).await;
        });
    }

    Json(json!({
        "success": true,
        "item": item.name,
        "quantity": qty,
        "total_cost": total_cost,
        "remaining_credits": prev_credits - total_cost,
    })).into_response()
}

// ── GET /black-market/inventory ───────────────────────────────────────────────

pub async fn get_inventory_handler(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    let user_id = match extract_user_id(&headers) {
        Some(id) => id,
        None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Non authentifié"}))).into_response(),
    };

    let user = User::find_by_id(user_id).one(&state.db).await.ok().flatten();
    let credits = user.map(|u| u.syndicate_credits).unwrap_or(0.0);

    let rows = UserInventory::find()
        .filter(user_inventory::Column::UserId.eq(user_id))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let mut inventory = Vec::new();
    for row in rows {
        if let Ok(Some(item)) = BlackMarketItem::find_by_id(row.item_id).one(&state.db).await {
            inventory.push(json!({
                "inventory_id": row.id,
                "item_id": item.id,
                "name": item.name,
                "description": item.description,
                "image_key": item.image_key,
                "effect_type": item.effect_type,
                "effect_params": item.effect_params,
                "quantity": row.quantity,
                "acquired_at": row.acquired_at.format("%Y-%m-%dT%H:%M:%S").to_string(),
            }));
        }
    }

    Json(json!({
        "inventory": inventory,
        "syndicate_credits": credits,
    })).into_response()
}

// ── POST /black-market/activate ───────────────────────────────────────────────

#[derive(Deserialize)]
pub struct ActivatePayload {
    pub inventory_id: Uuid,
    /// Required for orbital_strike: target planet coordinates
    pub target_galaxy: Option<i32>,
    pub target_system: Option<i32>,
    pub target_position: Option<i32>,
}

pub async fn activate_item_handler(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<ActivatePayload>,
) -> impl IntoResponse {
    let user_id = match extract_user_id(&headers) {
        Some(id) => id,
        None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Non authentifié"}))).into_response(),
    };

    let row = match UserInventory::find_by_id(payload.inventory_id).one(&state.db).await {
        Ok(Some(r)) if r.user_id == user_id => r,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Objet non trouvé dans l'inventaire"}))).into_response(),
    };

    let item = match BlackMarketItem::find_by_id(row.item_id).one(&state.db).await {
        Ok(Some(i)) => i,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Définition d'objet introuvable"}))).into_response(),
    };

    match item.effect_type.as_str() {
        "orbital_strike" => {
            activate_orbital_strike(&state, user_id, &row, &item, &payload).await
        }
        // Other effect types: simple acknowledgement for now
        eff => {
            consume_inventory_item(&state.db, row, 1).await;
            Json(json!({
                "success": true,
                "effect": eff,
                "message": "Effet activé. Les modifications s'appliqueront lors du prochain tick.",
            })).into_response()
        }
    }
}

async fn activate_orbital_strike(
    state: &AppState,
    attacker_id: Uuid,
    inv_row: &crate::entities::user_inventory::Model,
    item: &crate::entities::black_market_item::Model,
    payload: &ActivatePayload,
) -> axum::response::Response {
    let (gal, sys, pos) = match (payload.target_galaxy, payload.target_system, payload.target_position) {
        (Some(g), Some(s), Some(p)) => (g, s, p),
        _ => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Coordonnées cibles requises (galaxy, system, position)"}))).into_response(),
    };

    // Find target planet
    let target_planet = match crate::entities::prelude::Planet::find()
        .filter(crate::entities::planet::Column::Galaxy.eq(gal))
        .filter(crate::entities::planet::Column::System.eq(sys))
        .filter(crate::entities::planet::Column::Position.eq(pos))
        .one(&state.db)
        .await
    {
        Ok(Some(p)) => p,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète introuvable à ces coordonnées"}))).into_response(),
    };

    if target_planet.owner_id == attacker_id {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Vous ne pouvez pas cibler votre propre planète"}))).into_response();
    }

    // Extract flight duration from effect_params
    let flight_hours = item.effect_params
        .get("flight_hours")
        .and_then(|v| v.as_f64())
        .unwrap_or(12.0);

    let arrival_time = Utc::now().naive_utc() + chrono::Duration::seconds((flight_hours * 3600.0) as i64);

    let extortion = pirate_extortion::ActiveModel {
        id: Set(Uuid::new_v4()),
        attacker_id: Set(attacker_id),
        target_user_id: Set(target_planet.owner_id),
        target_planet_id: Set(target_planet.id),
        arrival_time: Set(arrival_time),
        status: Set("incoming".to_string()),
        tribute_amount: NotSet,
        retaliate_cost: NotSet,
        resolved_at: NotSet,
        created_at: Set(Utc::now().naive_utc()),
    };

    match extortion.insert(&state.db).await {
        Ok(record) => {
            consume_inventory_item(&state.db, inv_row.clone(), 1).await;
            Json(json!({
                "success": true,
                "extortion_id": record.id,
                "arrival_time": record.arrival_time.format("%Y-%m-%dT%H:%M:%S").to_string(),
                "target": { "galaxy": gal, "system": sys, "position": pos },
                "message": "Pirates envoyés. Vous resterez anonyme.",
            })).into_response()
        }
        Err(e) => {
            eprintln!("orbital_strike insert error: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur lors du lancement"}))).into_response()
        }
    }
}

async fn consume_inventory_item(
    db: &sea_orm::DatabaseConnection,
    row: crate::entities::user_inventory::Model,
    qty: i32,
) {
    if row.quantity <= qty {
        let _ = UserInventory::delete_by_id(row.id).exec(db).await;
    } else {
        let mut active: user_inventory::ActiveModel = row.into();
        let prev = match active.quantity {
            sea_orm::ActiveValue::Set(v) | sea_orm::ActiveValue::Unchanged(v) => v,
            _ => 0,
        };
        active.quantity = Set(prev - qty);
        let _ = active.update(db).await;
    }
}

// ── GET /black-market/extortions ──────────────────────────────────────────────

pub async fn list_extortions_handler(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    let user_id = match extract_user_id(&headers) {
        Some(id) => id,
        None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Non authentifié"}))).into_response(),
    };

    let extortions = PirateExtortion::find()
        .filter(pirate_extortion::Column::TargetUserId.eq(user_id))
        .filter(pirate_extortion::Column::Status.eq("incoming"))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let now = Utc::now().naive_utc();

    let result: Vec<Value> = extortions
        .iter()
        .map(|e| {
            let seconds_remaining = (e.arrival_time - now).num_seconds().max(0);
            json!({
                "id": e.id,
                "arrival_time": e.arrival_time.format("%Y-%m-%dT%H:%M:%S").to_string(),
                "seconds_remaining": seconds_remaining,
                "target_planet_id": e.target_planet_id,
                "status": e.status,
                "tribute_price_credits": 50, // from seed data defaults
                "retaliate_cost_credits": 120,
            })
        })
        .collect();

    Json(json!({ "extortions": result })).into_response()
}

// ── GET /black-market/extortions/history ──────────────────────────────────────

/// Returns all resolved extortions where the caller was either the target or the attacker.
pub async fn extortion_history_handler(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    use sea_orm::QueryOrder;

    let user_id = match extract_user_id(&headers) {
        Some(id) => id,
        None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Non authentifié"}))).into_response(),
    };

    let all = PirateExtortion::find()
        .filter(
            sea_orm::Condition::any()
                .add(pirate_extortion::Column::TargetUserId.eq(user_id))
                .add(pirate_extortion::Column::AttackerId.eq(user_id)),
        )
        .filter(pirate_extortion::Column::Status.ne("incoming"))
        .order_by_desc(pirate_extortion::Column::ResolvedAt)
        .all(&state.db)
        .await
        .unwrap_or_default();

    // Collect all attacker and target user IDs to batch-fetch names
    let user_ids: Vec<Uuid> = all.iter().flat_map(|e| [e.attacker_id, e.target_user_id]).collect();
    let mut name_map: std::collections::HashMap<Uuid, String> = std::collections::HashMap::new();
    for uid in user_ids {
        if !name_map.contains_key(&uid) {
            if let Ok(Some(u)) = User::find_by_id(uid).one(&state.db).await {
                name_map.insert(uid, u.username);
            }
        }
    }

    let result: Vec<Value> = all
        .iter()
        .map(|e| {
            let is_target = e.target_user_id == user_id;
            let attacker_name = name_map.get(&e.attacker_id).cloned().unwrap_or_else(|| "Inconnu".to_string());
            let target_name = name_map.get(&e.target_user_id).cloned().unwrap_or_else(|| "Inconnu".to_string());
            json!({
                "id": e.id,
                "status": e.status,
                "is_target": is_target,
                "attacker_name": attacker_name,
                "target_name": target_name,
                "arrival_time": e.arrival_time.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
                "resolved_at": e.resolved_at.map(|t| t.format("%Y-%m-%dT%H:%M:%SZ").to_string()),
            })
        })
        .collect();

    Json(json!({ "history": result })).into_response()
}

// ── POST /black-market/extortions/:id/resolve ─────────────────────────────────

#[derive(Deserialize)]
pub struct ResolvePayload {
    /// "passive" | "tribute" | "retaliate"
    pub choice: String,
}

pub async fn resolve_extortion_handler(
    Path(extortion_id): Path<Uuid>,
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<ResolvePayload>,
) -> impl IntoResponse {
    let user_id = match extract_user_id(&headers) {
        Some(id) => id,
        None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Non authentifié"}))).into_response(),
    };

    let extortion = match PirateExtortion::find_by_id(extortion_id).one(&state.db).await {
        Ok(Some(e)) if e.target_user_id == user_id && e.status == "incoming" => e,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Extorsion introuvable ou déjà résolue"}))).into_response(),
    };

    let target_planet = match crate::entities::prelude::Planet::find_by_id(extortion.target_planet_id)
        .one(&state.db).await {
        Ok(Some(p)) => p,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète cible introuvable"}))).into_response(),
    };

    let user = match User::find_by_id(user_id).one(&state.db).await {
        Ok(Some(u)) => u,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Utilisateur introuvable"}))).into_response(),
    };

    let now = Utc::now().naive_utc();
    let new_status;
    let mut response_extra = json!({});

    match payload.choice.as_str() {
        "passive" => {
            // Pirates loot 20% of planet resources, proportional to defenses
            let loot_percent = 0.20_f64; // TODO: adjust by defense ratio
            let loot_metal = target_planet.metal_amount * loot_percent;
            let loot_crystal = target_planet.crystal_amount * loot_percent;
            let loot_deuterium = target_planet.deuterium_amount * loot_percent;

            let mut planet_active: crate::entities::planet::ActiveModel = target_planet.clone().into();
            planet_active.metal_amount = Set((target_planet.metal_amount - loot_metal).max(0.0));
            planet_active.crystal_amount = Set((target_planet.crystal_amount - loot_crystal).max(0.0));
            planet_active.deuterium_amount = Set((target_planet.deuterium_amount - loot_deuterium).max(0.0));
            let _ = planet_active.update(&state.db).await;

            new_status = "resolved_passive";
            response_extra = json!({
                "loot": { "metal": loot_metal, "crystal": loot_crystal, "deuterium": loot_deuterium },
            });
        }
        "tribute" => {
            // Pay credits, pirates leave, attacker's identity revealed
            let tribute_cost = 50.0_f64; // from effect_params default
            if user.syndicate_credits < tribute_cost {
                return (
                    StatusCode::PAYMENT_REQUIRED,
                    Json(json!({
                        "error": "Crédits insuffisants pour payer le tribut",
                        "required": tribute_cost,
                        "current": user.syndicate_credits,
                    })),
                ).into_response();
            }

            let mut user_active: user::ActiveModel = user.clone().into();
            user_active.syndicate_credits = Set(user.syndicate_credits - tribute_cost);
            let _ = user_active.update(&state.db).await;

            // Reveal attacker info to target (via combat log notification)
            let attacker = User::find_by_id(extortion.attacker_id)
                .one(&state.db).await.ok().flatten();
            let attacker_name = attacker.as_ref().map(|u| u.username.as_str()).unwrap_or("Inconnu").to_string();

            new_status = "resolved_tribute";
            response_extra = json!({
                "cost": tribute_cost,
                "attacker_revealed": attacker_name,
                "message": format!("Les pirates repartent. L'attaque venait de : {}", attacker_name),
            });
        }
        "retaliate" => {
            // Pay more credits, pirates turn around and hit attacker's homeworld
            let retaliate_cost = 120.0_f64;
            if user.syndicate_credits < retaliate_cost {
                return (
                    StatusCode::PAYMENT_REQUIRED,
                    Json(json!({
                        "error": "Crédits insuffisants pour la contre-attaque",
                        "required": retaliate_cost,
                        "current": user.syndicate_credits,
                    })),
                ).into_response();
            }

            let mut user_active: user::ActiveModel = user.clone().into();
            user_active.syndicate_credits = Set(user.syndicate_credits - retaliate_cost);
            let _ = user_active.update(&state.db).await;

            // Attacker receives a new extortion targeting their planet
            let attacker_planet = crate::entities::prelude::Planet::find()
                .filter(crate::entities::planet::Column::OwnerId.eq(extortion.attacker_id))
                .filter(crate::entities::planet::Column::IsHomeworld.eq(true))
                .one(&state.db)
                .await
                .unwrap_or(None);

            let attacker_name = User::find_by_id(extortion.attacker_id)
                .one(&state.db).await.ok().flatten()
                .map(|u| u.username)
                .unwrap_or("Inconnu".to_string());

            if let Some(att_planet) = attacker_planet {
                // Create a new extortion event on attacker's homeworld
                let arrival = now + chrono::Duration::hours(6);
                let _ = pirate_extortion::ActiveModel {
                    id: Set(Uuid::new_v4()),
                    attacker_id: Set(user_id), // original target becomes new "attacker"
                    target_user_id: Set(extortion.attacker_id),
                    target_planet_id: Set(att_planet.id),
                    arrival_time: Set(arrival),
                    status: Set("incoming".to_string()),
                    tribute_amount: NotSet,
                    retaliate_cost: NotSet,
                    resolved_at: NotSet,
                    created_at: Set(now),
                }.insert(&state.db).await;
            }

            new_status = "resolved_retaliate";
            response_extra = json!({
                "cost": retaliate_cost,
                "attacker_revealed": attacker_name,
                "message": format!("Les pirates font demi-tour vers {} !", attacker_name),
            });
        }
        _ => {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "Choix invalide: passive | tribute | retaliate"}))).into_response();
        }
    }

    // Update extortion status
    let mut ext_active: pirate_extortion::ActiveModel = extortion.into();
    ext_active.status = Set(new_status.to_string());
    ext_active.resolved_at = Set(Some(now));
    let _ = ext_active.update(&state.db).await;

    Json(json!({
        "success": true,
        "choice": payload.choice,
        "status": new_status,
        "details": response_extra,
    })).into_response()
}

// ── Background tick: auto-resolve arrived extortions ─────────────────────────

/// Called from the main tick loop. Finds all `pirate_extortion` rows whose
/// `arrival_time` has passed and whose `status` is still `"incoming"`, then
/// applies the passive outcome (20 % resource loot) automatically.
pub async fn process_due_extortions(db: &sea_orm::DatabaseConnection) {
    let now = Utc::now().naive_utc();

    let due = PirateExtortion::find()
        .filter(pirate_extortion::Column::Status.eq("incoming"))
        .filter(pirate_extortion::Column::ArrivalTime.lte(now))
        .all(db)
        .await
        .unwrap_or_default();

    for extortion in due {
        let target_planet = match crate::entities::prelude::Planet::find_by_id(extortion.target_planet_id)
            .one(db)
            .await
        {
            Ok(Some(p)) => p,
            _ => continue,
        };

        // Apply 20 % passive loot
        let loot_pct = 0.20_f64;
        let loot_metal = target_planet.metal_amount * loot_pct;
        let loot_crystal = target_planet.crystal_amount * loot_pct;
        let loot_deuterium = target_planet.deuterium_amount * loot_pct;

        let target_user_id = extortion.target_user_id;

        let mut planet_active: crate::entities::planet::ActiveModel = target_planet.into();
        planet_active.metal_amount = Set((planet_active.metal_amount.clone().unwrap() - loot_metal).max(0.0));
        planet_active.crystal_amount = Set((planet_active.crystal_amount.clone().unwrap() - loot_crystal).max(0.0));
        planet_active.deuterium_amount = Set((planet_active.deuterium_amount.clone().unwrap() - loot_deuterium).max(0.0));
        let _ = planet_active.update(db).await;

        // Mark extortion as passively resolved
        let mut ext_active: pirate_extortion::ActiveModel = extortion.into();
        ext_active.status = Set("resolved_passive".to_string());
        ext_active.resolved_at = Set(Some(now));
        let _ = ext_active.update(db).await;

        // Notify the victim
        crate::notifications::create_notification(
            db,
            target_user_id,
            "pirate_extortion",
            "Extorsion pirate",
            &format!(
                "Des pirates ont prélevé leurs ressources sur votre planète ({:.0} M / {:.0} C / {:.0} D).",
                loot_metal, loot_crystal, loot_deuterium
            ),
            None,
        ).await;

        println!("☠️  Extortion auto-resolved (passive loot): -{:.0} M / -{:.0} C / -{:.0} D",
            loot_metal, loot_crystal, loot_deuterium);
    }
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct AdminItemBody {
    pub name: String,
    pub description: String,
    pub image_key: String,
    pub effect_type: String,
    pub effect_params: Value,
    pub base_price: f64,
    pub is_active: Option<bool>,
}

pub async fn admin_list_items_handler(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let items = BlackMarketItem::find().all(&state.db).await.unwrap_or_default();
    Json(json!({ "items": items })).into_response()
}

pub async fn admin_create_item_handler(
    State(state): State<AppState>,
    Json(body): Json<AdminItemBody>,
) -> impl IntoResponse {
    let now = Utc::now().naive_utc();
    let item = black_market_item::ActiveModel {
        id: Set(Uuid::new_v4()),
        name: Set(body.name),
        description: Set(body.description),
        image_key: Set(body.image_key),
        effect_type: Set(body.effect_type),
        effect_params: Set(body.effect_params),
        base_price: Set(body.base_price),
        current_price: Set(body.base_price),
        price_last_updated: Set(now),
        is_active: Set(body.is_active.unwrap_or(true)),
        created_at: Set(now),
    };

    match item.insert(&state.db).await {
        Ok(record) => Json(json!({ "success": true, "item": record })).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("{:?}", e)}))).into_response(),
    }
}

pub async fn admin_update_item_handler(
    Path(item_id): Path<Uuid>,
    State(state): State<AppState>,
    Json(body): Json<AdminItemBody>,
) -> impl IntoResponse {
    let item = match BlackMarketItem::find_by_id(item_id).one(&state.db).await {
        Ok(Some(i)) => i,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Item introuvable"}))).into_response(),
    };

    let mut active: black_market_item::ActiveModel = item.into();
    active.name = Set(body.name);
    active.description = Set(body.description);
    active.image_key = Set(body.image_key);
    active.effect_type = Set(body.effect_type);
    active.effect_params = Set(body.effect_params);
    active.base_price = Set(body.base_price);
    if let Some(active_val) = body.is_active {
        active.is_active = Set(active_val);
    }

    match active.update(&state.db).await {
        Ok(record) => Json(json!({ "success": true, "item": record })).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("{:?}", e)}))).into_response(),
    }
}

pub async fn admin_delete_item_handler(
    Path(item_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    match BlackMarketItem::delete_by_id(item_id).exec(&state.db).await {
        Ok(_) => Json(json!({ "success": true })).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("{:?}", e)}))).into_response(),
    }
}
