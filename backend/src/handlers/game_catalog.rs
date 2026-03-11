// ─────────────────────────────────────────────────────────────────────────────
// handlers/game_catalog.rs — Public, unauthenticated catalog endpoints
//
// Exposes static game data (ship types, building types, defense types, tech
// types) as JSON.  These rows change only when an admin seeds new entities, so
// the frontend may cache responses aggressively (5+ minutes).
//
// Routes:
//   GET /game/ship-types
//   GET /game/building-types
//   GET /game/defense-types
//   GET /game/tech-types
// ─────────────────────────────────────────────────────────────────────────────

use axum::{extract::State, routing::get, Json, Router};
use sea_orm::{EntityTrait, QueryOrder};
use serde_json::{json, Value};

use backend::entities::{building_type, defense_type, ship_type, technology};
use backend::entities::prelude::{BuildingType, DefenseType, ShipType, Technology};
use backend::AppState;

pub fn router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/game/ship-types", get(get_ship_types_catalog))
        .route("/game/building-types", get(get_building_types_catalog))
        .route("/game/defense-types", get(get_defense_types_catalog))
        .route("/game/tech-types", get(get_tech_types_catalog))
        .with_state(state)
}

async fn get_ship_types_catalog(State(state): State<AppState>) -> Json<Value> {
    let db = &state.db;
    match ShipType::find()
        .order_by_asc(ship_type::Column::SortOrder)
        .all(db)
        .await
    {
        Ok(ships) => Json(json!(ships)),
        Err(e) => {
            tracing::error!("Failed to fetch ship catalog: {:?}", e);
            Json(json!([]))
        }
    }
}

async fn get_building_types_catalog(State(state): State<AppState>) -> Json<Value> {
    let db = &state.db;
    match BuildingType::find()
        .order_by_asc(building_type::Column::SortOrder)
        .all(db)
        .await
    {
        Ok(buildings) => Json(json!(buildings)),
        Err(e) => {
            tracing::error!("Failed to fetch building catalog: {:?}", e);
            Json(json!([]))
        }
    }
}

async fn get_defense_types_catalog(State(state): State<AppState>) -> Json<Value> {
    let db = &state.db;
    match DefenseType::find()
        .order_by_asc(defense_type::Column::SortOrder)
        .all(db)
        .await
    {
        Ok(defenses) => Json(json!(defenses)),
        Err(e) => {
            tracing::error!("Failed to fetch defense catalog: {:?}", e);
            Json(json!([]))
        }
    }
}

async fn get_tech_types_catalog(State(state): State<AppState>) -> Json<Value> {
    let db = &state.db;
    match Technology::find()
        .order_by_asc(technology::Column::Id)
        .all(db)
        .await
    {
        Ok(techs) => Json(json!(techs)),
        Err(e) => {
            tracing::error!("Failed to fetch tech catalog: {:?}", e);
            Json(json!([]))
        }
    }
}
