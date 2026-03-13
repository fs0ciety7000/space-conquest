// ─────────────────────────────────────────────────────────────────────────────
// handlers/galaxy.rs — Galaxy view, system scan, and colonization handlers
//
// Extracted from main.rs (~lines 3638–3994).
// Exposes a `router()` function to be merged into the main Axum app.
// ─────────────────────────────────────────────────────────────────────────────

use axum::{
    extract::{Path, State, Query, Json},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use chrono::{Duration, Utc};
use rand::Rng;
use sea_orm::{
    ActiveModelTrait, EntityTrait, PaginatorTrait, QueryFilter, ColumnTrait, Set,
    IntoActiveModel,
};
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;

use backend::{black_market, game_logic, tech_tree, AppState};
use backend::entities::{
    prelude::{DebrisField, Planet, User, FleetMission},
    debris_field, planet, fleet_mission,
};

use crate::models::{GalaxySlot, SystemSummary, ScanNearbyPayload, ColonizePayload};

// ─────────────────────────────────────────────────────────────────────────────
// GET /galaxy/:galaxy/:system
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_galaxy_handler(
    Path((galaxy_id, system_id)): Path<(i32, i32)>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();
    let current_planet_opt = Planet::find_by_id(current_id).one(&state.db).await.unwrap_or(None);
    let my_owner_id = current_planet_opt.map(|p| p.owner_id).unwrap_or_default();

    let planets = Planet::find()
        .filter(planet::Column::Galaxy.eq(galaxy_id))
        .filter(planet::Column::System.eq(system_id))
        .all(&state.db)
        .await
        .unwrap_or_default();

    // Charger les champs de débris pour ce système depuis debris_field
    let debris_fields = DebrisField::find()
        .filter(debris_field::Column::Galaxy.eq(galaxy_id))
        .filter(debris_field::Column::System.eq(system_id))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let mut slots: Vec<GalaxySlot> = Vec::new();

    for pos in 1..=15 {
        let (dm, dc) = debris_fields.iter()
            .find(|d| d.position == pos)
            .map(|d| (d.metal, d.crystal))
            .unwrap_or((0.0, 0.0));

        if let Some(p) = planets.iter().find(|p| p.position == pos) {
            // M2 — Stealth: if the planet owner has an active stealth effect,
            // hide their identity from other players. The owner always sees their
            // own planet regardless.
            let is_own_planet = p.owner_id == my_owner_id;
            let owner_stealthed = if !is_own_planet {
                black_market::has_active_effect(&state.db, p.owner_id, "stealth").await
            } else {
                false
            };

            if owner_stealthed {
                // Render the slot as empty to everyone except the owner themselves
                slots.push(GalaxySlot {
                    position: pos,
                    planet_id: None,
                    planet_name: None,
                    owner_name: None,
                    owner_id: None,
                    debris_metal: dm,
                    debris_crystal: dc,
                    is_me: false,
                    is_my_planet: false,
                    protection_until: None,
                    total_points: 0,
                    planet_galaxy: p.galaxy,
                });
            } else {
            let (protection_until, total_points, actual_owner_name) =
                if let Ok(Some(owner)) = User::find_by_id(p.owner_id).one(&state.db).await {
                    (
                        owner.protection_until.map(|dt| dt.to_string()),
                        owner.total_points,
                        owner.username.clone(),
                    )
                } else {
                    (None, 0, p.name.clone())
                };

            slots.push(GalaxySlot {
                position: pos,
                planet_id: Some(p.id),
                planet_name: Some(p.name.clone()),
                owner_name: Some(actual_owner_name),
                owner_id: Some(p.owner_id),
                debris_metal: dm,
                debris_crystal: dc,
                is_me: p.id == current_id,
                is_my_planet: is_own_planet,
                protection_until,
                total_points,
                planet_galaxy: p.galaxy,
            });
            }
        } else {
            slots.push(GalaxySlot {
                position: pos,
                planet_id: None,
                planet_name: None,
                owner_name: None,
                owner_id: None,
                debris_metal: dm,
                debris_crystal: dc,
                is_me: false,
                is_my_planet: false,
                protection_until: None,
                total_points: 0,
                planet_galaxy: galaxy_id,
            });
        }
    }
    Json(slots)
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /galaxy/:galaxy/scan
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_galaxy_scan_handler(
    Path(galaxy_id): Path<i32>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();

    let planets = Planet::find()
        .filter(planet::Column::Galaxy.eq(galaxy_id))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let mut systems_map: HashMap<i32, SystemSummary> = HashMap::new();

    for p in planets {
        let entry = systems_map.entry(p.system).or_insert(SystemSummary {
            system: p.system,
            planet_count: 0,
            has_me: false,
        });
        entry.planet_count += 1;
        if p.id == current_id {
            entry.has_me = true;
        }
    }

    let results: Vec<SystemSummary> = systems_map.into_values().collect();
    Json(results)
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /galaxy/scan/nearby
// ─────────────────────────────────────────────────────────────────────────────

pub async fn scan_nearby_planets_handler(
    State(state): State<AppState>,
    Json(payload): Json<ScanNearbyPayload>,
) -> impl IntoResponse {
    let current_planet = match Planet::find_by_id(payload.current_planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "Planet not found"})),
            )
                .into_response()
        }
    };

    let max_results = payload.max_results.unwrap_or(20).min(50); // Cap at 50 for performance
    let search_radius = 20; // Systems to search around current system

    // Find all planets in nearby systems (same galaxy, systems within radius)
    let min_system = (current_planet.system - search_radius).max(1);
    let max_system = (current_planet.system + search_radius).min(499);

    let nearby_planets = Planet::find()
        .filter(planet::Column::Galaxy.eq(current_planet.galaxy))
        .filter(planet::Column::System.between(min_system, max_system))
        .filter(planet::Column::Id.ne(payload.current_planet_id)) // Exclude current planet
        .all(&state.db)
        .await
        .unwrap_or_default();

    // Get owner information for planets
    let mut owner_map: HashMap<Uuid, String> = HashMap::new();
    let mut protection_map: HashMap<Uuid, Option<chrono::NaiveDateTime>> = HashMap::new();

    for planet in &nearby_planets {
        let owner_id = planet.owner_id;
        if !owner_map.contains_key(&owner_id) {
            if let Ok(Some(user)) = User::find_by_id(owner_id).one(&state.db).await {
                owner_map.insert(owner_id, user.username.clone());
                protection_map.insert(owner_id, user.protection_until);
            }
        }
    }

    // Calculate distances and prepare response
    let mut planets_with_distance: Vec<serde_json::Value> = nearby_planets
        .into_iter()
        .map(|p| {
            let distance = game_logic::calculate_distance(
                (current_planet.galaxy, current_planet.system, current_planet.position),
                (p.galaxy, p.system, p.position),
            );

            let owner_name = owner_map.get(&p.owner_id).cloned();
            let protection_until = protection_map.get(&p.owner_id).cloned().flatten();
            let is_my_planet = p.owner_id == current_planet.owner_id;

            json!({
                "id": p.id,
                "name": p.name,
                "galaxy": p.galaxy,
                "system": p.system,
                "position": p.position,
                "owner_name": owner_name,
                "is_my_planet": is_my_planet,
                "protection_until": protection_until,
                "distance": distance,
            })
        })
        .collect();

    // Sort by distance and limit results
    planets_with_distance.sort_by(|a, b| {
        let dist_a = a["distance"].as_f64().unwrap_or(f64::MAX);
        let dist_b = b["distance"].as_f64().unwrap_or(f64::MAX);
        dist_a.partial_cmp(&dist_b).unwrap_or(std::cmp::Ordering::Equal)
    });

    planets_with_distance.truncate(max_results as usize);

    Json(planets_with_distance).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — generate a random colony name
// ─────────────────────────────────────────────────────────────────────────────

pub fn generate_colony_name() -> String {
    let prefixes = ["Néo", "Alpha", "Terra", "Nova", "Proxima", "Sector", "Base", "Outpost"];
    let suffixes = ["Prime", "Secundus", "X", "Y", "Z", "Major", "Minor", "Delta", "Omicron"];
    let mut rng = rand::thread_rng();
    let prefix = prefixes[rng.gen_range(0..prefixes.len())];
    let suffix = suffixes[rng.gen_range(0..suffixes.len())];
    let num = rng.gen_range(1..999);
    format!("{} {} {}", prefix, suffix, num)
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /colonize
// ─────────────────────────────────────────────────────────────────────────────

pub async fn colonize_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<ColonizePayload>,
) -> impl IntoResponse {
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();

    let att_planet_data = match Planet::find_by_id(current_id).one(&state.db).await.unwrap() {
        Some(p) => p,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({"error": "Planète inconnue"})),
            )
                .into_response()
        }
    };

    let ships = tech_tree::get_planet_ship_count(&state.db, current_id, "colony_ship")
        .await
        .unwrap_or(0);
    if ships < 1 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Aucun vaisseau de colonisation disponible"})),
        )
            .into_response();
    }

    // Vérifier la limite de planètes basée sur astrophysique
    let owner_id = att_planet_data.owner_id;

    // Compter le nombre de planètes du joueur (sans la planète mère)
    let planet_count = Planet::find()
        .filter(planet::Column::OwnerId.eq(owner_id))
        .filter(planet::Column::IsHomeworld.eq(false))
        .count(&state.db)
        .await
        .unwrap_or(0);

    // Compter aussi les missions de colonisation en cours
    let pending_colonies = FleetMission::find()
        .filter(fleet_mission::Column::SourcePlanetId.eq(current_id))
        .filter(fleet_mission::Column::MissionType.eq("colonize"))
        .count(&state.db)
        .await
        .unwrap_or(0);

    // Récupérer le niveau d'astrophysique depuis la planète actuelle
    let astrophysics_level =
        match tech_tree::get_planet_tech_level(&state.db, current_id, "astrophysics").await {
            Ok(level) => level,
            Err(_) => 0,
        };

    // Calculer la limite de planètes (1 par niveau d'astrophysique, max 10)
    let max_colonies = std::cmp::min(astrophysics_level as u64, 10);

    if (planet_count + pending_colonies) >= max_colonies {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({
                "error": format!(
                    "Limite de planètes atteinte ({}/{}). Recherchez l'Astrophysique pour coloniser plus de planètes.",
                    planet_count + pending_colonies,
                    max_colonies
                )
            })),
        )
            .into_response();
    }

    // Récupérer les ressources à transporter (optionnelles)
    let metal_to_transport = payload.metal.unwrap_or(0.0).max(0.0);
    let crystal_to_transport = payload.crystal.unwrap_or(0.0).max(0.0);
    let deuterium_to_transport = payload.deuterium.unwrap_or(0.0).max(0.0);

    // Vérifier que la planète source a assez de ressources
    if metal_to_transport > att_planet_data.metal_amount {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Pas assez de métal"})),
        )
            .into_response();
    }
    if crystal_to_transport > att_planet_data.crystal_amount {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Pas assez de cristal"})),
        )
            .into_response();
    }
    if deuterium_to_transport > att_planet_data.deuterium_amount {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Pas assez de deutérium"})),
        )
            .into_response();
    }

    // Vérifier que l'emplacement n'est pas déjà occupé
    let exists = Planet::find()
        .filter(planet::Column::Galaxy.eq(payload.galaxy))
        .filter(planet::Column::System.eq(payload.system))
        .filter(planet::Column::Position.eq(payload.position))
        .one(&state.db)
        .await
        .unwrap();

    if exists.is_some() {
        return (
            StatusCode::CONFLICT,
            Json(json!({"error": "Cet emplacement est déjà occupé"})),
        )
            .into_response();
    }

    // Vérifier qu'il n'y a pas déjà une mission de colonisation vers cet emplacement
    let existing_colonize = FleetMission::find()
        .filter(fleet_mission::Column::MissionType.eq("colonize"))
        .all(&state.db)
        .await
        .unwrap_or_default();

    for m in &existing_colonize {
        if let Some(fleet_data_str) = &m.fleet_data {
            if let Ok(data) = serde_json::from_str::<serde_json::Value>(fleet_data_str) {
                if data["target_galaxy"] == payload.galaxy
                    && data["target_system"] == payload.system
                    && data["target_position"] == payload.position
                {
                    return (
                        StatusCode::CONFLICT,
                        Json(json!({"error": "Une mission de colonisation est déjà en cours vers cet emplacement"})),
                    )
                        .into_response();
                }
            }
        }
    }

    // Calculer la distance et le temps de vol
    let dist = game_logic::calculate_distance(
        (att_planet_data.galaxy, att_planet_data.system, att_planet_data.position),
        (payload.galaxy, payload.system, payload.position),
    );

    let travel_time = {
        let config = state.config.read().unwrap();
        let flight_speed = config.get_config("flight_speed_multiplier", 5.0);
        // Vaisseau de colonisation est plus lent que les autres vaisseaux
        (game_logic::calculate_flight_time(dist, flight_speed) as f64 * 1.5) as i64
    };

    let arrival = Utc::now().naive_utc() + Duration::seconds(travel_time);

    // Préparer les données de la mission en JSON
    let colonize_data = json!({
        "target_galaxy": payload.galaxy,
        "target_system": payload.system,
        "target_position": payload.position,
        "metal": metal_to_transport,
        "crystal": crystal_to_transport,
        "deuterium": deuterium_to_transport,
        "owner_id": owner_id.to_string(),
        "password": att_planet_data.password.clone()
    });

    // Créer la mission de colonisation
    let mission = fleet_mission::ActiveModel {
        id: Set(Uuid::new_v4()),
        source_planet_id: Set(current_id),
        target_planet_id: Set(current_id), // On utilise la même planète comme placeholder
        mission_type: Set("colonize".to_string()),
        arrival_time: Set(arrival),
        metal: Set(metal_to_transport),
        crystal: Set(crystal_to_transport),
        deuterium: Set(deuterium_to_transport),
        ships_count: Set(1),
        fleet_data: Set(Some(colonize_data.to_string())),
        recyclers_sent: Set(0),
        departure_time: Set(Utc::now().naive_utc()),
        acs_group_id: Set(None),
    };
    let _ = mission.insert(&state.db).await;

    // Déduire le vaisseau et les ressources de la planète source
    let _ = tech_tree::deduct_ships(&state.db, current_id, "colony_ship", 1).await;
    let mut att_planet = att_planet_data.clone().into_active_model();
    att_planet.metal_amount = Set(att_planet_data.metal_amount - metal_to_transport);
    att_planet.crystal_amount = Set(att_planet_data.crystal_amount - crystal_to_transport);
    att_planet.deuterium_amount = Set(att_planet_data.deuterium_amount - deuterium_to_transport);
    let _ = att_planet.update(&state.db).await;

    // Formater le temps de vol pour l'affichage
    let hours = travel_time / 3600;
    let minutes = (travel_time % 3600) / 60;
    let seconds = travel_time % 60;
    let time_str = if hours > 0 {
        format!("{}h {}min {}s", hours, minutes, seconds)
    } else if minutes > 0 {
        format!("{}min {}s", minutes, seconds)
    } else {
        format!("{}s", seconds)
    };

    (
        StatusCode::OK,
        Json(json!({
            "status": "success",
            "message": format!("Mission de colonisation lancée vers [{}:{}:{}]", payload.galaxy, payload.system, payload.position),
            "arrival_time": arrival.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
            "travel_time": travel_time,
            "travel_time_display": time_str,
            "distance": dist
        })),
    )
        .into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// GET /galaxy/:galaxy/:system/debris
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_system_debris_handler(
    Path((galaxy, system)): Path<(i32, i32)>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let debris = DebrisField::find()
        .filter(debris_field::Column::Galaxy.eq(galaxy))
        .filter(debris_field::Column::System.eq(system))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let result: Vec<serde_json::Value> = debris.iter().map(|d| json!({
        "position": d.position,
        "metal": d.metal,
        "crystal": d.crystal,
        "updated_at": d.updated_at,
    })).collect();

    axum::response::Json(json!({ "debris": result }))
}

pub fn router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/galaxy/:galaxy/:system", get(get_galaxy_handler))
        .route("/galaxy/:galaxy/:system/debris", get(get_system_debris_handler))
        .route("/galaxy/:galaxy/scan", get(get_galaxy_scan_handler))
        .route("/galaxy/scan/nearby", post(scan_nearby_planets_handler))
        .route("/colonize", post(colonize_handler))
        .with_state(state)
}
