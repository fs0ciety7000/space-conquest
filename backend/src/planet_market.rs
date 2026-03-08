/// Planet Market — Vente de planètes entre joueurs ou au PNJ
///
/// Allows players to list colonies for sale (not homeworld).
/// NPC purchase: planet is deleted, slot freed, seller gets resources.
/// Player purchase: full ownership transfer (resources, buildings, techs, ships, defenses).

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use sea_orm::{ConnectionTrait, DbBackend, Statement};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;
use chrono::Utc;

use crate::AppState;

// ─── DTOs ─────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct ListForSalePayload {
    pub user_id: Uuid,
    pub listing_type: String, // "npc" | "player"
    pub asking_price_metal: Option<i64>,
    pub asking_price_crystal: Option<i64>,
    pub asking_price_deuterium: Option<i64>,
}

#[derive(Deserialize)]
pub struct UpdatePricePayload {
    pub user_id: Uuid,
    pub asking_price_metal: i64,
    pub asking_price_crystal: i64,
    pub asking_price_deuterium: i64,
}

#[derive(Deserialize)]
pub struct BuyPayload {
    pub buyer_id: Uuid,
    pub buyer_planet_id: Uuid, // where to deduct resources from
}

#[derive(Deserialize)]
pub struct QueryParams {
    pub user_id: Option<String>,
}

// ─── Price estimation ─────────────────────────────────────────────────────────

/// Compute a rough market value for a planet (in metal equivalent).
/// Returns (metal, crystal, deuterium) split as suggested price.
async fn compute_suggested_price(
    db: &sea_orm::DatabaseConnection,
    planet_id: Uuid,
) -> (i64, i64, i64) {
    // 1. Resources on planet
    let resources: f64 = {
        let row = db.query_one(Statement::from_string(
            DbBackend::Postgres,
            format!(
                "SELECT COALESCE(metal_amount,0) + COALESCE(crystal_amount,0)*2.0 + COALESCE(deuterium_amount,0)*4.0 AS val \
                 FROM planet WHERE id = '{}'",
                planet_id
            ),
        )).await.ok().flatten()
          .and_then(|r| r.try_get::<f64>("", "val").ok())
          .unwrap_or(0.0);
        row
    };

    // 2. Buildings investment: SUM of costs * level for each building
    let buildings_metal: i64 = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!(
            "SELECT COALESCE(SUM((bt.base_cost_metal + bt.base_cost_crystal + bt.base_cost_deuterium) \
             * POWER(bt.cost_multiplier, pb.level::float - 1) * pb.level::float / bt.cost_multiplier), 0)::BIGINT AS val \
             FROM planet_buildings pb \
             JOIN building_types bt ON bt.id = pb.building_type_id \
             WHERE pb.planet_id = '{}'",
            planet_id
        ),
    )).await.ok().flatten()
      .and_then(|r| r.try_get::<i64>("", "val").ok())
      .unwrap_or(0);

    // 3. Tech investment
    let techs_metal: i64 = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!(
            "SELECT COALESCE(SUM((t.base_cost_metal + t.base_cost_crystal + t.base_cost_deuterium) \
             * POWER(t.cost_multiplier, pt.current_level::float - 1) * pt.current_level::float / t.cost_multiplier), 0)::BIGINT AS val \
             FROM planet_technologies pt \
             JOIN technologies t ON t.id = pt.tech_id \
             WHERE pt.planet_id = '{}' AND pt.current_level > 0",
            planet_id
        ),
    )).await.ok().flatten()
      .and_then(|r| r.try_get::<i64>("", "val").ok())
      .unwrap_or(0);

    // 4. Ships
    let ships_metal: i64 = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!(
            "SELECT COALESCE(SUM((st.base_cost_metal + st.base_cost_crystal + st.base_cost_deuterium) * ps.count::float), 0)::BIGINT AS val \
             FROM planet_ships ps \
             JOIN ship_types st ON st.id = ps.ship_type_id \
             WHERE ps.planet_id = '{}' AND ps.count > 0",
            planet_id
        ),
    )).await.ok().flatten()
      .and_then(|r| r.try_get::<i64>("", "val").ok())
      .unwrap_or(0);

    // 5. Defenses
    let defenses_metal: i64 = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!(
            "SELECT COALESCE(SUM((dt.base_cost_metal + dt.base_cost_crystal + dt.base_cost_deuterium) * pd.count::float), 0)::BIGINT AS val \
             FROM planet_defenses pd \
             JOIN defense_types dt ON dt.id = pd.defense_type_id \
             WHERE pd.planet_id = '{}' AND pd.count > 0",
            planet_id
        ),
    )).await.ok().flatten()
      .and_then(|r| r.try_get::<i64>("", "val").ok())
      .unwrap_or(0);

    let total_metal_equiv = resources as i64 + buildings_metal + techs_metal + ships_metal + defenses_metal;

    // Distribute as 50% metal, 30% crystal, 20% deuterium
    // At 70% of total invested value
    let value = (total_metal_equiv as f64 * 0.70) as i64;
    let metal = (value as f64 * 0.50) as i64;
    let crystal = (value as f64 * 0.30) as i64;
    let deuterium = value - metal - crystal;

    (metal.max(1000), crystal.max(500), deuterium.max(200))
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/// GET /market/planets/suggested-price?planet_id=&user_id=
pub async fn get_suggested_price_handler(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let planet_id = match params.get("planet_id").and_then(|s| Uuid::parse_str(s).ok()) {
        Some(id) => id,
        None => return (StatusCode::BAD_REQUEST, Json(json!({"error": "planet_id required"}))).into_response(),
    };
    let user_id = match params.get("user_id").and_then(|s| Uuid::parse_str(s).ok()) {
        Some(id) => id,
        None => return (StatusCode::BAD_REQUEST, Json(json!({"error": "user_id required"}))).into_response(),
    };

    // Validate ownership + not homeworld
    let planet_row = state.db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!("SELECT owner_id, is_homeworld, name FROM planet WHERE id = '{}'", planet_id),
    )).await.ok().flatten();

    let (owner_id, is_homeworld, name) = match planet_row {
        Some(r) => (
            r.try_get::<Uuid>("", "owner_id").unwrap_or_default(),
            r.try_get::<bool>("", "is_homeworld").unwrap_or(false),
            r.try_get::<String>("", "name").unwrap_or_default(),
        ),
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planet not found"}))).into_response(),
    };

    if owner_id != user_id {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Not your planet"}))).into_response();
    }
    if is_homeworld {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Cannot sell homeworld"}))).into_response();
    }

    let (metal, crystal, deuterium) = compute_suggested_price(&state.db, planet_id).await;

    // NPC pays 40% of suggested
    let npc_metal = (metal as f64 * 0.40) as i64;
    let npc_crystal = (crystal as f64 * 0.40) as i64;
    let npc_deuterium = (deuterium as f64 * 0.40) as i64;

    // Check if already listed
    let existing = state.db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!("SELECT id, listing_type, asking_price_metal, asking_price_crystal, asking_price_deuterium \
                 FROM planet_listings WHERE planet_id = '{}' AND is_active = true", planet_id),
    )).await.ok().flatten();

    let listing = existing.map(|r| json!({
        "id": r.try_get::<Uuid>("", "id").ok().map(|u| u.to_string()),
        "listing_type": r.try_get::<String>("", "listing_type").ok(),
        "asking_price_metal": r.try_get::<i64>("", "asking_price_metal").ok(),
        "asking_price_crystal": r.try_get::<i64>("", "asking_price_crystal").ok(),
        "asking_price_deuterium": r.try_get::<i64>("", "asking_price_deuterium").ok(),
    }));

    Json(json!({
        "planet_id": planet_id,
        "planet_name": name,
        "suggested_player": {
            "metal": metal,
            "crystal": crystal,
            "deuterium": deuterium
        },
        "suggested_npc": {
            "metal": npc_metal,
            "crystal": npc_crystal,
            "deuterium": npc_deuterium
        },
        "existing_listing": listing
    })).into_response()
}

/// POST /market/planets/list — Create a listing for a planet
pub async fn list_planet_handler(
    State(state): State<AppState>,
    Path(planet_id): Path<Uuid>,
    Json(payload): Json<ListForSalePayload>,
) -> impl IntoResponse {
    let db = &state.db;

    // Validate planet
    let planet_row = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!("SELECT owner_id, is_homeworld FROM planet WHERE id = '{}'", planet_id),
    )).await.ok().flatten();

    let (planet_owner_id, is_homeworld) = match planet_row {
        Some(r) => (
            r.try_get::<Uuid>("", "owner_id").unwrap_or_default(),
            r.try_get::<bool>("", "is_homeworld").unwrap_or(false),
        ),
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planet not found"}))).into_response(),
    };

    if planet_owner_id != payload.user_id {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Not your planet"}))).into_response();
    }
    if is_homeworld {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Cannot sell homeworld"}))).into_response();
    }
    if !["npc", "player"].contains(&payload.listing_type.as_str()) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid listing_type"}))).into_response();
    }

    let (sug_metal, sug_crystal, sug_deuterium) = compute_suggested_price(db, planet_id).await;

    let asking_metal = payload.asking_price_metal.unwrap_or(sug_metal);
    let asking_crystal = payload.asking_price_crystal.unwrap_or(sug_crystal);
    let asking_deuterium = payload.asking_price_deuterium.unwrap_or(sug_deuterium);

    // Upsert listing (if re-listing after cancel, insert fresh)
    let listing_id = Uuid::new_v4();
    let sql = format!(
        "INSERT INTO planet_listings (id, planet_id, seller_id, listing_type, \
         asking_price_metal, asking_price_crystal, asking_price_deuterium, \
         suggested_price_metal, suggested_price_crystal, suggested_price_deuterium, \
         is_active, listed_at) \
         VALUES ('{}', '{}', '{}', '{}', {}, {}, {}, {}, {}, {}, true, NOW()) \
         ON CONFLICT (planet_id) DO UPDATE SET \
         seller_id = EXCLUDED.seller_id, \
         listing_type = EXCLUDED.listing_type, \
         asking_price_metal = EXCLUDED.asking_price_metal, \
         asking_price_crystal = EXCLUDED.asking_price_crystal, \
         asking_price_deuterium = EXCLUDED.asking_price_deuterium, \
         suggested_price_metal = EXCLUDED.suggested_price_metal, \
         suggested_price_crystal = EXCLUDED.suggested_price_crystal, \
         suggested_price_deuterium = EXCLUDED.suggested_price_deuterium, \
         is_active = true, \
         listed_at = NOW()",
        listing_id, planet_id, payload.user_id, payload.listing_type,
        asking_metal, asking_crystal, asking_deuterium,
        sug_metal, sug_crystal, sug_deuterium
    );

    if let Err(e) = db.execute_unprepared(&sql).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response();
    }

    Json(json!({
        "success": true,
        "listing_id": listing_id,
        "asking_price_metal": asking_metal,
        "asking_price_crystal": asking_crystal,
        "asking_price_deuterium": asking_deuterium
    })).into_response()
}

/// PATCH /market/planets/listings/:listing_id — Update asking price
pub async fn update_listing_handler(
    State(state): State<AppState>,
    Path(listing_id): Path<Uuid>,
    Json(payload): Json<UpdatePricePayload>,
) -> impl IntoResponse {
    let db = &state.db;

    // Check ownership
    let row = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!("SELECT seller_id FROM planet_listings WHERE id = '{}' AND is_active = true", listing_id),
    )).await.ok().flatten();

    let seller_id = match row {
        Some(r) => r.try_get::<Uuid>("", "seller_id").unwrap_or_default(),
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Listing not found"}))).into_response(),
    };

    if seller_id != payload.user_id {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Not your listing"}))).into_response();
    }

    let sql = format!(
        "UPDATE planet_listings SET asking_price_metal = {}, asking_price_crystal = {}, asking_price_deuterium = {} \
         WHERE id = '{}'",
        payload.asking_price_metal, payload.asking_price_crystal, payload.asking_price_deuterium,
        listing_id
    );
    let _ = db.execute_unprepared(&sql).await;

    Json(json!({"success": true})).into_response()
}

/// DELETE /market/planets/listings/:listing_id — Cancel listing (planet returned to seller's view)
pub async fn cancel_listing_handler(
    State(state): State<AppState>,
    Path(listing_id): Path<Uuid>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let db = &state.db;

    let user_id = match params.get("user_id").and_then(|s| Uuid::parse_str(s).ok()) {
        Some(id) => id,
        None => return (StatusCode::BAD_REQUEST, Json(json!({"error": "user_id required"}))).into_response(),
    };

    let row = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!("SELECT seller_id FROM planet_listings WHERE id = '{}' AND is_active = true", listing_id),
    )).await.ok().flatten();

    let seller_id = match row {
        Some(r) => r.try_get::<Uuid>("", "seller_id").unwrap_or_default(),
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Listing not found"}))).into_response(),
    };

    if seller_id != user_id {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Not your listing"}))).into_response();
    }

    let _ = db.execute_unprepared(&format!(
        "UPDATE planet_listings SET is_active = false WHERE id = '{}'", listing_id
    )).await;

    Json(json!({"success": true})).into_response()
}

/// GET /market/planets — List active player-to-player listings (enriched)
pub async fn get_planet_listings_handler(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let db = &state.db;

    let my_listings_filter = if let Some(uid) = params.get("seller_id") {
        format!("AND pl.seller_id = '{}'", uid)
    } else {
        String::new()
    };

    let exclude_seller = if let Some(uid) = params.get("exclude_seller") {
        format!("AND pl.seller_id != '{}'", uid)
    } else {
        String::new()
    };

    let rows = db.query_all(Statement::from_string(
        DbBackend::Postgres,
        format!(
            "SELECT pl.id, pl.planet_id, pl.seller_id, pl.listing_type, \
             pl.asking_price_metal, pl.asking_price_crystal, pl.asking_price_deuterium, \
             pl.suggested_price_metal, pl.suggested_price_crystal, pl.suggested_price_deuterium, \
             pl.listed_at, \
             p.name AS planet_name, p.galaxy, p.system, p.position, p.biome, \
             p.metal_amount, p.crystal_amount, p.deuterium_amount, \
             u.username AS seller_name \
             FROM planet_listings pl \
             JOIN planet p ON p.id = pl.planet_id \
             JOIN \"user\" u ON u.id = pl.seller_id \
             WHERE pl.is_active = true AND pl.listing_type = 'player' \
             {} {} \
             ORDER BY pl.listed_at DESC",
            my_listings_filter, exclude_seller
        ),
    )).await.unwrap_or_default();

    let listings: Vec<serde_json::Value> = rows.iter().map(|r| {
        json!({
            "id": r.try_get::<Uuid>("", "id").ok().map(|u| u.to_string()),
            "planet_id": r.try_get::<Uuid>("", "planet_id").ok().map(|u| u.to_string()),
            "seller_id": r.try_get::<Uuid>("", "seller_id").ok().map(|u| u.to_string()),
            "seller_name": r.try_get::<String>("", "seller_name").ok(),
            "listing_type": r.try_get::<String>("", "listing_type").ok(),
            "asking_price_metal": r.try_get::<i64>("", "asking_price_metal").ok(),
            "asking_price_crystal": r.try_get::<i64>("", "asking_price_crystal").ok(),
            "asking_price_deuterium": r.try_get::<i64>("", "asking_price_deuterium").ok(),
            "suggested_price_metal": r.try_get::<i64>("", "suggested_price_metal").ok(),
            "suggested_price_crystal": r.try_get::<i64>("", "suggested_price_crystal").ok(),
            "suggested_price_deuterium": r.try_get::<i64>("", "suggested_price_deuterium").ok(),
            "listed_at": r.try_get::<chrono::NaiveDateTime>("", "listed_at").map(|d| d.to_string()).ok(),
            "planet_name": r.try_get::<String>("", "planet_name").ok(),
            "galaxy": r.try_get::<i32>("", "galaxy").ok(),
            "system": r.try_get::<i32>("", "system").ok(),
            "position": r.try_get::<i32>("", "position").ok(),
            "biome": r.try_get::<String>("", "biome").ok(),
            "metal_amount": r.try_get::<f64>("", "metal_amount").ok(),
            "crystal_amount": r.try_get::<f64>("", "crystal_amount").ok(),
            "deuterium_amount": r.try_get::<f64>("", "deuterium_amount").ok(),
        })
    }).collect();

    Json(json!({"listings": listings})).into_response()
}

/// POST /market/planets/listings/:listing_id/buy — Buy a planet from another player
pub async fn buy_planet_handler(
    State(state): State<AppState>,
    Path(listing_id): Path<Uuid>,
    Json(payload): Json<BuyPayload>,
) -> impl IntoResponse {
    let db = &state.db;

    // Load listing
    let listing_row = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!(
            "SELECT pl.planet_id, pl.seller_id, pl.asking_price_metal, pl.asking_price_crystal, pl.asking_price_deuterium \
             FROM planet_listings pl WHERE pl.id = '{}' AND pl.is_active = true AND pl.listing_type = 'player'",
            listing_id
        ),
    )).await.ok().flatten();

    let (planet_id, seller_id, price_metal, price_crystal, price_deuterium) = match listing_row {
        Some(r) => (
            r.try_get::<Uuid>("", "planet_id").unwrap_or_default(),
            r.try_get::<Uuid>("", "seller_id").unwrap_or_default(),
            r.try_get::<i64>("", "asking_price_metal").unwrap_or(0),
            r.try_get::<i64>("", "asking_price_crystal").unwrap_or(0),
            r.try_get::<i64>("", "asking_price_deuterium").unwrap_or(0),
        ),
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Listing not found"}))).into_response(),
    };

    // Cannot buy own planet
    if seller_id == payload.buyer_id {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Cannot buy your own planet"}))).into_response();
    }

    // Check buyer planet resources
    let buyer_planet_row = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!(
            "SELECT owner_id, metal_amount, crystal_amount, deuterium_amount FROM planet WHERE id = '{}'",
            payload.buyer_planet_id
        ),
    )).await.ok().flatten();

    let (buyer_owner_id, buyer_metal, buyer_crystal, buyer_deuterium) = match buyer_planet_row {
        Some(r) => (
            r.try_get::<Uuid>("", "owner_id").unwrap_or_default(),
            r.try_get::<f64>("", "metal_amount").unwrap_or(0.0),
            r.try_get::<f64>("", "crystal_amount").unwrap_or(0.0),
            r.try_get::<f64>("", "deuterium_amount").unwrap_or(0.0),
        ),
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Buyer planet not found"}))).into_response(),
    };

    if buyer_owner_id != payload.buyer_id {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Not your planet"}))).into_response();
    }

    // Check funds
    if buyer_metal < price_metal as f64 || buyer_crystal < price_crystal as f64 || buyer_deuterium < price_deuterium as f64 {
        return (StatusCode::BAD_REQUEST, Json(json!({
            "error": "Insufficient resources",
            "need_metal": price_metal,
            "need_crystal": price_crystal,
            "need_deuterium": price_deuterium,
            "have_metal": buyer_metal as i64,
            "have_crystal": buyer_crystal as i64,
            "have_deuterium": buyer_deuterium as i64,
        }))).into_response();
    }

    // Check buyer astrophysics colonization limit
    let astro_level: i32 = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!(
            "SELECT COALESCE(pt.current_level, 0) AS lvl \
             FROM planet_technologies pt \
             JOIN technologies t ON t.id = pt.tech_id \
             WHERE t.tech_key = 'astrophysics' AND pt.planet_id = '{}'",
            payload.buyer_planet_id
        ),
    )).await.ok().flatten()
      .and_then(|r| r.try_get::<i32>("", "lvl").ok())
      .unwrap_or(0);

    let colony_count: i64 = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!(
            "SELECT COUNT(*) AS cnt FROM planet WHERE owner_id = '{}' AND is_homeworld = false",
            payload.buyer_id
        ),
    )).await.ok().flatten()
      .and_then(|r| r.try_get::<i64>("", "cnt").ok())
      .unwrap_or(0);

    if colony_count >= astro_level as i64 {
        return (StatusCode::BAD_REQUEST, Json(json!({
            "error": format!("Limite de colonisation atteinte ({}/{}). Augmentez Astrophysique.", colony_count, astro_level)
        }))).into_response();
    }

    // === Execute transfer ===

    // 1. Deduct resources from buyer
    let _ = db.execute_unprepared(&format!(
        "UPDATE planet SET metal_amount = metal_amount - {}, crystal_amount = crystal_amount - {}, deuterium_amount = deuterium_amount - {} \
         WHERE id = '{}'",
        price_metal, price_crystal, price_deuterium, payload.buyer_planet_id
    )).await;

    // 2. Find seller's homeworld to credit resources
    let seller_homeworld: Option<Uuid> = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!("SELECT id FROM planet WHERE owner_id = '{}' AND is_homeworld = true LIMIT 1", seller_id),
    )).await.ok().flatten()
      .and_then(|r| r.try_get::<Uuid>("", "id").ok());

    if let Some(hw_id) = seller_homeworld {
        let _ = db.execute_unprepared(&format!(
            "UPDATE planet SET metal_amount = metal_amount + {}, crystal_amount = crystal_amount + {}, deuterium_amount = deuterium_amount + {} \
             WHERE id = '{}'",
            price_metal, price_crystal, price_deuterium, hw_id
        )).await;
    }

    // Fetch planet name and buyer username for messages
    let planet_name: String = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!("SELECT name FROM planet WHERE id = '{}'", planet_id),
    )).await.ok().flatten()
      .and_then(|r| r.try_get::<String>("", "name").ok())
      .unwrap_or_else(|| "Inconnue".to_string());

    let buyer_username: String = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!("SELECT username FROM \"user\" WHERE id = '{}'", payload.buyer_id),
    )).await.ok().flatten()
      .and_then(|r| r.try_get::<String>("", "username").ok())
      .unwrap_or_else(|| "Acheteur".to_string());

    let seller_username: String = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!("SELECT username FROM \"user\" WHERE id = '{}'", seller_id),
    )).await.ok().flatten()
      .and_then(|r| r.try_get::<String>("", "username").ok())
      .unwrap_or_else(|| "Vendeur".to_string());

    // 3. Transfer planet ownership
    let _ = db.execute_unprepared(&format!(
        "UPDATE planet SET owner_id = '{}' WHERE id = '{}'",
        payload.buyer_id, planet_id
    )).await;

    // 4. Cancel outgoing fleet missions from the sold planet
    let _ = db.execute_unprepared(&format!(
        "DELETE FROM fleet_mission WHERE source_planet_id = '{}' AND status = 'pending'",
        planet_id
    )).await;

    // 5. Mark listing inactive
    let _ = db.execute_unprepared(&format!(
        "UPDATE planet_listings SET is_active = false WHERE id = '{}'", listing_id
    )).await;

    // 6. Send in-game message to seller
    let _ = crate::messaging::send_system_message(
        db, Uuid::nil(), seller_id,
        &format!("Planète vendue — {}", planet_name),
        &format!("Votre colonie **{}** a été achetée par **{}** pour {} métal, {} cristal et {} deutérium. Ces ressources ont été créditées sur votre planète mère.", planet_name, buyer_username, price_metal, price_crystal, price_deuterium),
    ).await;

    // 7. Send in-game message to buyer
    let _ = crate::messaging::send_system_message(
        db, Uuid::nil(), payload.buyer_id,
        &format!("Acquisition de planète — {}", planet_name),
        &format!("Vous avez acquis la colonie **{}** (vendue par **{}**) pour {} métal, {} cristal et {} deutérium. La planète est désormais sous votre contrôle.", planet_name, seller_username, price_metal, price_crystal, price_deuterium),
    ).await;

    // Notify seller via WebSocket
    if let Some(ref ws) = state.ws {
        crate::websocket::notify_planet_sold(
            ws,
            seller_id,
            &planet_name,
            &buyer_username,
            price_metal,
            price_crystal,
            price_deuterium,
        ).await;
    }

    Json(json!({
        "success": true,
        "planet_id": planet_id,
        "planet_name": planet_name,
        "paid_metal": price_metal,
        "paid_crystal": price_crystal,
        "paid_deuterium": price_deuterium
    })).into_response()
}

/// POST /market/planets/listings/:listing_id/sell-npc — Sell to NPC immediately
pub async fn sell_to_npc_handler(
    State(state): State<AppState>,
    Path(listing_id): Path<Uuid>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let db = &state.db;

    let user_id = match params.get("user_id").and_then(|s| Uuid::parse_str(s).ok()) {
        Some(id) => id,
        None => return (StatusCode::BAD_REQUEST, Json(json!({"error": "user_id required"}))).into_response(),
    };

    // Load listing
    let listing_row = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!(
            "SELECT planet_id, seller_id, suggested_price_metal, suggested_price_crystal, suggested_price_deuterium \
             FROM planet_listings WHERE id = '{}' AND is_active = true",
            listing_id
        ),
    )).await.ok().flatten();

    let (planet_id, seller_id, sug_metal, sug_crystal, sug_deuterium) = match listing_row {
        Some(r) => (
            r.try_get::<Uuid>("", "planet_id").unwrap_or_default(),
            r.try_get::<Uuid>("", "seller_id").unwrap_or_default(),
            r.try_get::<i64>("", "suggested_price_metal").unwrap_or(0),
            r.try_get::<i64>("", "suggested_price_crystal").unwrap_or(0),
            r.try_get::<i64>("", "suggested_price_deuterium").unwrap_or(0),
        ),
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Listing not found"}))).into_response(),
    };

    if seller_id != user_id {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Not your listing"}))).into_response();
    }

    // NPC pays 40% of suggested
    let npc_metal = (sug_metal as f64 * 0.40) as i64;
    let npc_crystal = (sug_crystal as f64 * 0.40) as i64;
    let npc_deuterium = (sug_deuterium as f64 * 0.40) as i64;

    // Fetch planet name before deleting
    let planet_name: String = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!("SELECT name FROM planet WHERE id = '{}'", planet_id),
    )).await.ok().flatten()
      .and_then(|r| r.try_get::<String>("", "name").ok())
      .unwrap_or_else(|| "Inconnue".to_string());

    // Credit seller's homeworld
    let seller_homeworld: Option<Uuid> = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!("SELECT id FROM planet WHERE owner_id = '{}' AND is_homeworld = true LIMIT 1", user_id),
    )).await.ok().flatten()
      .and_then(|r| r.try_get::<Uuid>("", "id").ok());

    if let Some(hw_id) = seller_homeworld {
        let _ = db.execute_unprepared(&format!(
            "UPDATE planet SET metal_amount = metal_amount + {}, crystal_amount = crystal_amount + {}, deuterium_amount = deuterium_amount + {} \
             WHERE id = '{}'",
            npc_metal, npc_crystal, npc_deuterium, hw_id
        )).await;
    }

    // Delete planet (CASCADE will clean buildings, techs, ships, defenses, listing, etc.)
    let _ = db.execute_unprepared(&format!("DELETE FROM planet WHERE id = '{}'", planet_id)).await;

    // Send confirmation message to seller
    let _ = crate::messaging::send_system_message(
        db, Uuid::nil(), seller_id,
        &format!("Planète vendue au PNJ — {}", planet_name),
        &format!("Votre colonie **{}** a été vendue à un acheteur PNJ pour {} métal, {} cristal et {} deutérium (40% de la valeur estimée). Ces ressources ont été créditées sur votre planète mère. La colonie a été libérée dans la galaxie.", planet_name, npc_metal, npc_crystal, npc_deuterium),
    ).await;

    // Notify seller via WebSocket
    if let Some(ref ws) = state.ws {
        crate::websocket::notify_planet_sold(
            ws,
            seller_id,
            &planet_name,
            "PNJ",
            npc_metal,
            npc_crystal,
            npc_deuterium,
        ).await;
    }

    Json(json!({
        "success": true,
        "received_metal": npc_metal,
        "received_crystal": npc_crystal,
        "received_deuterium": npc_deuterium
    })).into_response()
}

/// GET /market/planets/listings/:listing_id — Full details of a listing (for buyers)
pub async fn get_listing_details_handler(
    State(state): State<AppState>,
    Path(listing_id): Path<Uuid>,
) -> impl IntoResponse {
    let db = &state.db;

    // Load listing + planet base info
    let listing_row = db.query_one(Statement::from_string(
        DbBackend::Postgres,
        format!(
            "SELECT pl.id, pl.planet_id, pl.seller_id, pl.listing_type, \
             pl.asking_price_metal, pl.asking_price_crystal, pl.asking_price_deuterium, \
             pl.suggested_price_metal, pl.suggested_price_crystal, pl.suggested_price_deuterium, \
             pl.listed_at, \
             p.name AS planet_name, p.galaxy, p.system, p.position, p.biome, \
             p.metal_amount, p.crystal_amount, p.deuterium_amount, \
             u.username AS seller_name \
             FROM planet_listings pl \
             JOIN planet p ON p.id = pl.planet_id \
             JOIN \"user\" u ON u.id = pl.seller_id \
             WHERE pl.id = '{}' AND pl.is_active = true",
            listing_id
        ),
    )).await.ok().flatten();

    let row = match listing_row {
        Some(r) => r,
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Listing not found"}))).into_response(),
    };

    let planet_id = match row.try_get::<Uuid>("", "planet_id") {
        Ok(id) => id,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "bad planet id"}))).into_response(),
    };
    let planet_id_str = planet_id.to_string();

    // Buildings
    let buildings: Vec<serde_json::Value> = db.query_all(Statement::from_string(
        DbBackend::Postgres,
        format!(
            "SELECT bt.building_key AS key, pb.level, bt.name \
             FROM planet_buildings pb \
             JOIN building_types bt ON bt.id = pb.building_type_id \
             WHERE pb.planet_id = '{}' AND pb.level > 0 \
             ORDER BY pb.level DESC",
            planet_id
        ),
    )).await.unwrap_or_default().iter().map(|r| json!({
        "key": r.try_get::<String>("", "key").ok(),
        "name": r.try_get::<String>("", "name").ok(),
        "level": r.try_get::<i32>("", "level").ok(),
    })).collect();

    // Technologies
    let technologies: Vec<serde_json::Value> = db.query_all(Statement::from_string(
        DbBackend::Postgres,
        format!(
            "SELECT t.tech_key AS key, t.name, pt.current_level AS level \
             FROM planet_technologies pt \
             JOIN technologies t ON t.id = pt.tech_id \
             WHERE pt.planet_id = '{}' AND pt.current_level > 0 \
             ORDER BY pt.current_level DESC",
            planet_id
        ),
    )).await.unwrap_or_default().iter().map(|r| json!({
        "key": r.try_get::<String>("", "key").ok(),
        "name": r.try_get::<String>("", "name").ok(),
        "level": r.try_get::<i32>("", "level").ok(),
    })).collect();

    // Ships
    let ships: Vec<serde_json::Value> = db.query_all(Statement::from_string(
        DbBackend::Postgres,
        format!(
            "SELECT st.ship_key AS key, st.name, ps.count \
             FROM planet_ships ps \
             JOIN ship_types st ON st.id = ps.ship_type_id \
             WHERE ps.planet_id = '{}' AND ps.count > 0 \
             ORDER BY ps.count DESC",
            planet_id
        ),
    )).await.unwrap_or_default().iter().map(|r| json!({
        "key": r.try_get::<String>("", "key").ok(),
        "name": r.try_get::<String>("", "name").ok(),
        "count": r.try_get::<i32>("", "count").ok(),
    })).collect();

    // Defenses
    let defenses: Vec<serde_json::Value> = db.query_all(Statement::from_string(
        DbBackend::Postgres,
        format!(
            "SELECT dt.defense_key AS key, dt.name, pd.count \
             FROM planet_defenses pd \
             JOIN defense_types dt ON dt.id = pd.defense_type_id \
             WHERE pd.planet_id = '{}' AND pd.count > 0 \
             ORDER BY pd.count DESC",
            planet_id
        ),
    )).await.unwrap_or_default().iter().map(|r| json!({
        "key": r.try_get::<String>("", "key").ok(),
        "name": r.try_get::<String>("", "name").ok(),
        "count": r.try_get::<i32>("", "count").ok(),
    })).collect();

    Json(json!({
        "id": row.try_get::<Uuid>("", "id").ok().map(|u| u.to_string()),
        "planet_id": planet_id_str,
        "seller_id": row.try_get::<Uuid>("", "seller_id").ok().map(|u| u.to_string()),
        "seller_name": row.try_get::<String>("", "seller_name").ok(),
        "listing_type": row.try_get::<String>("", "listing_type").ok(),
        "asking_price_metal": row.try_get::<i64>("", "asking_price_metal").ok(),
        "asking_price_crystal": row.try_get::<i64>("", "asking_price_crystal").ok(),
        "asking_price_deuterium": row.try_get::<i64>("", "asking_price_deuterium").ok(),
        "suggested_price_metal": row.try_get::<i64>("", "suggested_price_metal").ok(),
        "suggested_price_crystal": row.try_get::<i64>("", "suggested_price_crystal").ok(),
        "suggested_price_deuterium": row.try_get::<i64>("", "suggested_price_deuterium").ok(),
        "listed_at": row.try_get::<chrono::NaiveDateTime>("", "listed_at").map(|d| d.to_string()).ok(),
        "planet_name": row.try_get::<String>("", "planet_name").ok(),
        "galaxy": row.try_get::<i32>("", "galaxy").ok(),
        "system": row.try_get::<i32>("", "system").ok(),
        "position": row.try_get::<i32>("", "position").ok(),
        "biome": row.try_get::<String>("", "biome").ok(),
        "metal_amount": row.try_get::<f64>("", "metal_amount").ok(),
        "crystal_amount": row.try_get::<f64>("", "crystal_amount").ok(),
        "deuterium_amount": row.try_get::<f64>("", "deuterium_amount").ok(),
        "buildings": buildings,
        "technologies": technologies,
        "ships": ships,
        "defenses": defenses,
    })).into_response()
}
