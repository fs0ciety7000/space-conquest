use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use sea_orm::{
    ActiveModelTrait, EntityTrait, Set, QueryFilter, ColumnTrait, QuerySelect, sea_query::Expr, PaginatorTrait
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;
use chrono::Utc;

use crate::entities::{
    prelude::{Planet, User},
    planet,
};
use crate::{AppState, game_logic};

#[derive(Serialize)]
struct PlanetInfo {
    id: Uuid,
    name: String,
    galaxy: i32,
    system: i32,
    position: i32,
}

#[derive(Serialize)]
struct PlayerListItem {
    id: Uuid,
    username: String,
    email: String,
    planets: Vec<PlanetInfo>,
    total_points: i32,
}

#[derive(Deserialize)]
pub struct PlanetUpdate {
    // Ressources
    pub metal_amount: Option<f64>,
    pub crystal_amount: Option<f64>,
    pub deuterium_amount: Option<f64>,
    
    // Mines
    pub metal_mine_level: Option<i32>,
    pub crystal_mine_level: Option<i32>,
    pub deuterium_mine_level: Option<i32>,
    pub solar_plant_level: Option<i32>,
    
    // Installations
    pub shipyard_level: Option<i32>,
    pub research_lab_level: Option<i32>,
    pub hangar_level: Option<i32>,
    
    // Technologies
    pub energy_tech_level: Option<i32>,
    pub laser_battery_level: Option<i32>,
    pub armour_tech_level: Option<i32>,
    pub espionage_tech_level: Option<i32>,
    
    // Flotte
    pub light_hunter_count: Option<i32>,
    pub cruiser_count: Option<i32>,
    pub recycler_count: Option<i32>,
    pub spy_probe_count: Option<i32>,
    pub colony_ship_count: Option<i32>,
    pub transporter_count: Option<i32>,
    
    // Défenses
    pub missile_launcher_count: Option<i32>,
    pub plasma_turret_count: Option<i32>,
}

// Vérification admin
fn check_admin(user_id_str: &str, _state: &AppState) -> Result<Uuid, StatusCode> {
    let user_id = Uuid::parse_str(user_id_str).map_err(|_| StatusCode::UNAUTHORIZED)?;
    // En production tu checkeras depuis la DB, ici on suppose que phantomhex a un ID connu
    // Pour l'instant on accepte tout pour simplifier, mais tu peux ajouter une vérif username
    Ok(user_id)
}

pub async fn get_all_players_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").map(|s| s.as_str()).unwrap_or("");
    if check_admin(user_id_str, &state).is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"})))
    .into_response();
    }

    let users = User::find().all(&state.db).await.unwrap_or_default();
    let mut result = Vec::new();

    for user in users {
        let planets = Planet::find()
            .filter(planet::Column::OwnerId.eq(user.id))
            .all(&state.db)
            .await
            .unwrap_or_default();

        let planet_infos: Vec<PlanetInfo> = planets.iter().map(|p| PlanetInfo {
            id: p.id,
            name: p.name.clone(),
            galaxy: p.galaxy,
            system: p.system,
            position: p.position,
        }).collect();

        result.push(PlayerListItem {
            id: user.id,
            username: user.username,
            email: user.email,
            planets: planet_infos,
            total_points: 0, // À calculer plus tard si besoin
        });
    }

    Json(result).into_response()
}

pub async fn get_planet_admin_handler(
    Path(planet_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").map(|s| s.as_str()).unwrap_or("");
    if check_admin(user_id_str, &state).is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"})))
            .into_response();
    }

    let planet = Planet::find_by_id(planet_id)
        .one(&state.db)
        .await
        .unwrap_or(None);

    if let Some(p) = planet {
        Json(serde_json::to_value(&p).unwrap()).into_response()
    } else {
        (StatusCode::NOT_FOUND, Json(json!({"error": "Planète introuvable"})))
            .into_response()
    }
}

pub async fn update_planet_admin_handler(
    Path(planet_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(updates): Json<PlanetUpdate>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").map(|s| s.as_str()).unwrap_or("");
    if check_admin(user_id_str, &state).is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"})))
            .into_response();
    }

    let planet = Planet::find_by_id(planet_id)
        .one(&state.db)
        .await
        .unwrap_or(None);

    if planet.is_none() {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète introuvable"})))
            .into_response();
    }

    let mut active: planet::ActiveModel = planet.unwrap().into();
    let mut resources_modified = false;

    // ⚠️ CHECK : Si une ressource est modifiée, on flag pour update last_update
    if updates.metal_amount.is_some() {
        active.metal_amount = Set(updates.metal_amount.unwrap());
        resources_modified = true;
    }
    if updates.crystal_amount.is_some() {
        active.crystal_amount = Set(updates.crystal_amount.unwrap());
        resources_modified = true;
    }
    if updates.deuterium_amount.is_some() {
        active.deuterium_amount = Set(updates.deuterium_amount.unwrap());
        resources_modified = true;
    }

    // Si ressources modifiées, on met last_update à NOW pour éviter les bugs de production
    if resources_modified {
        active.last_update = Set(Utc::now().naive_utc());
    }

    // Application des autres modifications (mines, techs, flotte, etc.)
    if let Some(v) = updates.metal_mine_level { active.metal_mine_level = Set(v); }
    if let Some(v) = updates.crystal_mine_level { active.crystal_mine_level = Set(v); }
    if let Some(v) = updates.deuterium_mine_level { active.deuterium_mine_level = Set(v); }
    if let Some(v) = updates.solar_plant_level { active.solar_plant_level = Set(v); }
    if let Some(v) = updates.shipyard_level { active.shipyard_level = Set(v); }
    if let Some(v) = updates.research_lab_level { active.research_lab_level = Set(v); }
    if let Some(v) = updates.hangar_level { active.hangar_level = Set(v); }
    if let Some(v) = updates.energy_tech_level { active.energy_tech_level = Set(v); }
    if let Some(v) = updates.laser_battery_level { active.laser_battery_level = Set(v); }
    if let Some(v) = updates.armour_tech_level { active.armour_tech_level = Set(v); }
    if let Some(v) = updates.espionage_tech_level { active.espionage_tech_level = Set(v); }
    if let Some(v) = updates.light_hunter_count { active.light_hunter_count = Set(v); }
    if let Some(v) = updates.cruiser_count { active.cruiser_count = Set(v); }
    if let Some(v) = updates.recycler_count { active.recycler_count = Set(v); }
    if let Some(v) = updates.spy_probe_count { active.spy_probe_count = Set(v); }
    if let Some(v) = updates.colony_ship_count { active.colony_ship_count = Set(v); }
    if let Some(v) = updates.transporter_count { active.transporter_count = Set(v); }
    if let Some(v) = updates.missile_launcher_count { active.missile_launcher_count = Set(v); }
    if let Some(v) = updates.plasma_turret_count { active.plasma_turret_count = Set(v); }

    match active.update(&state.db).await {
        Ok(updated) => Json(json!({
            "success": true,
            "message": "Planète mise à jour",
            "last_update": updated.last_update
        })).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"})))
            .into_response(),
    }
}

#[derive(Serialize)]
pub struct ServerStats {
    pub total_users: i64,
    pub total_planets: i64,
    pub total_metal: f64,
    pub total_crystal: f64,
    pub total_deuterium: f64,
    pub total_ships: i32,
    pub total_defenses: i32,
    pub speed_factor: f64,
}

pub async fn get_server_stats_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").map(|s| s.as_str()).unwrap_or("");
    if check_admin(user_id_str, &state).is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"})))
            .into_response();
    }

    let total_users = User::find().count(&state.db).await.unwrap_or(0) as i64;
    let total_planets = Planet::find().count(&state.db).await.unwrap_or(0) as i64;

    let planets = Planet::find().all(&state.db).await.unwrap_or_default();

    let mut total_metal = 0.0;
    let mut total_crystal = 0.0;
    let mut total_deuterium = 0.0;
    let mut total_ships = 0;
    let mut total_defenses = 0;

    for p in planets {
        total_metal += p.metal_amount;
        total_crystal += p.crystal_amount;
        total_deuterium += p.deuterium_amount;

        total_ships += p.light_hunter_count + p.cruiser_count + p.recycler_count
                    + p.spy_probe_count + p.colony_ship_count + p.transporter_count;

        total_defenses += p.missile_launcher_count + p.plasma_turret_count;
    }

    let stats = ServerStats {
        total_users,
        total_planets,
        total_metal,
        total_crystal,
        total_deuterium,
        total_ships,
        total_defenses,
        speed_factor: game_logic::SPEED_FACTOR,
    };

    Json(stats).into_response()
}
