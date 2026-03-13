// ─────────────────────────────────────────────────────────────────────────────
// handlers/shipyard.rs — Tech tree, ship, and defense build handlers
//
// Extracted from main.rs (~lines 5906–6543, 2243–2337).
// Exposes a `router()` function to be merged into the main Axum app.
// ─────────────────────────────────────────────────────────────────────────────

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use chrono::{Duration, Utc};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, NotSet, QueryFilter, Set,
};
use serde_json::json;
use uuid::Uuid;

use backend::{build_queue, game_logic, officers, sabotage, tech_tree, AppState};
use backend::entities::{
    prelude::{
        DefenseType, Planet, PlanetDefense, PlanetShip, PlanetTechnology,
        ShipType, Technology,
    },
    defense_type, planet, planet_defense, planet_ship, planet_technology,
    ship_type, technology,
};

// ─────────────────────────────────────────────────────────────────────────────
// Lazy eval helper — met à jour les ressources d'une planète avant toute
// vérification de coût, afin d'éviter les comparaisons sur des valeurs périmées.
// ─────────────────────────────────────────────────────────────────────────────

async fn apply_lazy_eval(
    db: &sea_orm::DatabaseConnection,
    planet: &mut planet::Model,
    config: &backend::ServerConfigCache,
) {
    let metal_level = tech_tree::get_planet_building_level(db, planet.id, "metal_mine").await.unwrap_or(0);
    let crystal_level = tech_tree::get_planet_building_level(db, planet.id, "crystal_mine").await.unwrap_or(0);
    let deuterium_level = tech_tree::get_planet_building_level(db, planet.id, "deuterium_mine").await.unwrap_or(0);
    let solar_level = tech_tree::get_planet_building_level(db, planet.id, "solar_plant").await.unwrap_or(0);
    let fusion_level = tech_tree::get_planet_building_level(db, planet.id, "fusion_plant").await.unwrap_or(0);
    let energy_tech = tech_tree::get_planet_tech_level(db, planet.id, "energy_tech").await.unwrap_or(0);
    let plasma_tech = tech_tree::get_planet_tech_level(db, planet.id, "plasma_tech").await.unwrap_or(0);

    let energy_ratio = game_logic::calculate_energy_ratio_with_fusion(
        solar_level, energy_tech, fusion_level, metal_level, crystal_level, deuterium_level, config,
    );

    // C3 — Bonus de production des officiers (OfficerBonuses::production_mult)
    let officer_bonuses = officers::get_officer_bonuses(db, planet.owner_id).await;
    let prod_mult = officer_bonuses.production_mult;

    let base_metal = game_logic::calculate_resources_with_energy(
        game_logic::ResourceType::Metal, metal_level, planet.metal_amount, planet.last_update,
        energy_tech, plasma_tech, energy_ratio, config,
    );
    // Le bonus est appliqué sur la production (delta), pas sur le stock courant.
    // base_metal = stock + delta ; donc bonus = stock + delta * prod_mult
    let delta_metal = (base_metal - planet.metal_amount).max(0.0);
    planet.metal_amount = planet.metal_amount + delta_metal * prod_mult;

    let base_crystal = game_logic::calculate_resources_with_energy(
        game_logic::ResourceType::Crystal, crystal_level, planet.crystal_amount, planet.last_update,
        energy_tech, plasma_tech, energy_ratio, config,
    );
    let delta_crystal = (base_crystal - planet.crystal_amount).max(0.0);
    planet.crystal_amount = planet.crystal_amount + delta_crystal * prod_mult;

    let base_deuterium = game_logic::calculate_resources_with_energy(
        game_logic::ResourceType::Deuterium, deuterium_level, planet.deuterium_amount, planet.last_update,
        energy_tech, plasma_tech, energy_ratio, config,
    );
    let delta_deuterium = (base_deuterium - planet.deuterium_amount).max(0.0);
    planet.deuterium_amount = planet.deuterium_amount + delta_deuterium * prod_mult;

    // H11 — Appliquer le cap de stockage après mise à jour lazy
    let storage_level = tech_tree::get_planet_building_level(db, planet.id, "resource_storage").await.unwrap_or(0);
    planet.metal_amount = game_logic::apply_storage_cap(planet.metal_amount, storage_level, config);
    planet.crystal_amount = game_logic::apply_storage_cap(planet.crystal_amount, storage_level, config);
    planet.deuterium_amount = game_logic::apply_storage_cap(planet.deuterium_amount, storage_level, config);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /planets/:id/tech-tree
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_tech_tree_handler(
    State(state): State<AppState>,
    Path(planet_id): Path<Uuid>,
) -> impl IntoResponse {
    let config = state.config.read().unwrap().clone();
    match tech_tree::get_tech_tree_for_planet(&state.db, planet_id, &config).await {
        Ok(tech_tree_data) => {
            axum::Json(json!({ "technologies": tech_tree_data })).into_response()
        }
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(json!({"error": "Failed to fetch tech tree"})),
        )
            .into_response(),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /planets/:id/ship-types
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_ship_types_handler(
    State(state): State<AppState>,
    Path(planet_id): Path<Uuid>,
) -> impl IntoResponse {
    let config = state.config.read().unwrap().clone();
    let shipyard_level =
        tech_tree::get_planet_building_level(&state.db, planet_id, "shipyard")
            .await
            .unwrap_or(0);

    match tech_tree::get_ship_types_for_planet(&state.db, planet_id).await {
        Ok(ship_types) => {
            // Augment each ship with the dynamic build time (cost-based formula)
            let ship_types_augmented: Vec<serde_json::Value> = ship_types
                .iter()
                .map(|s| {
                    // Constantes alignées avec game_logic::get_ship_production_time
                    const SHIP_BUILD_RATE: f64 = 3600.0;
                    const SHIP_SHIPYARD_BONUS: f64 = 0.10;
                    let cost_total = s.cost_metal as f64 + s.cost_crystal as f64;
                    let effective_rate = SHIP_BUILD_RATE * (1.0 + shipyard_level as f64 * SHIP_SHIPYARD_BONUS);
                    // Min appliqué avant le diviseur de vitesse (cohérent avec get_ship_production_time)
                    let raw_secs = ((cost_total / effective_rate) * 3600.0) as i64;
                    let raw_secs = raw_secs.max(5);
                    let build_time_per_unit = (raw_secs as f64 / config.ship_build_speed as f64).max(5.0) as i64;
                    let mut v = serde_json::to_value(s).unwrap_or_default();
                    if let Some(obj) = v.as_object_mut() {
                        obj.insert(
                            "build_time_seconds".to_string(),
                            serde_json::Value::Number(serde_json::Number::from(build_time_per_unit)),
                        );
                    }
                    v
                })
                .collect();
            axum::Json(json!({ "ship_types": ship_types_augmented })).into_response()
        }
        Err(e) => {
            eprintln!(
                "❌ Error fetching ship types for planet {}: {:?}",
                planet_id, e
            );
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(json!({"error": "Failed to fetch ship types"})),
            )
                .into_response()
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /tech/:tech_key
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_tech_details_handler(
    State(state): State<AppState>,
    Path(tech_key): Path<String>,
) -> impl IntoResponse {
    match Technology::find()
        .filter(technology::Column::TechKey.eq(&tech_key))
        .one(&state.db)
        .await
    {
        Ok(Some(tech)) => axum::Json(json!({ "technology": tech })).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            axum::Json(json!({"error": "Technology not found"})),
        )
            .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(json!({"error": "Database error"})),
        )
            .into_response(),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /ship/:ship_key
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_ship_details_handler(
    State(state): State<AppState>,
    Path(ship_key): Path<String>,
) -> impl IntoResponse {
    match tech_tree::get_ship_stats(&state.db, &ship_key).await {
        Ok(Some(ship)) => axum::Json(json!({ "ship": ship })).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            axum::Json(json!({"error": "Ship type not found"})),
        )
            .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(json!({"error": "Database error"})),
        )
            .into_response(),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /planets/:id/building-types
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_building_types_handler(
    State(state): State<AppState>,
    Path(planet_id): Path<Uuid>,
) -> impl IntoResponse {
    let planet = match Planet::find_by_id(planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                axum::Json(json!({"error": "Planet not found"})),
            )
                .into_response()
        }
        Err(e) => {
            eprintln!("❌ Error fetching planet {}: {:?}", planet_id, e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(json!({"error": "Failed to fetch planet"})),
            )
                .into_response();
        }
    };

    let config = state.config.read().unwrap().clone();

    match tech_tree::get_building_types_for_planet(&state.db, planet_id, &planet, &config).await {
        Ok(building_types) => {
            axum::Json(json!({ "building_types": building_types })).into_response()
        }
        Err(e) => {
            eprintln!(
                "❌ Error fetching building types for planet {}: {:?}",
                planet_id, e
            );
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(json!({"error": "Failed to fetch building types"})),
            )
                .into_response()
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /planets/:id/defense-types
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_defense_types_handler(
    State(state): State<AppState>,
    Path(planet_id): Path<Uuid>,
) -> impl IntoResponse {
    let config = state.config.read().unwrap().clone();
    let shipyard_level =
        tech_tree::get_planet_building_level(&state.db, planet_id, "shipyard")
            .await
            .unwrap_or(0);
    // Taux de base des défenses — même logique que les vaisseaux
    const DEFENSE_BUILD_RATE_DISP: f64 = 1800.0;
    const DEFENSE_SHIPYARD_BONUS_DISP: f64 = 0.08;
    let shipyard_factor = 1.0 + shipyard_level as f64 * DEFENSE_SHIPYARD_BONUS_DISP;

    match tech_tree::get_defense_types_for_planet(&state.db, planet_id).await {
        Ok(defense_types) => {
            // Override build_time_seconds with the cost-based formula (matches build_defenses_handler)
            let defense_types_augmented: Vec<serde_json::Value> = defense_types
                .iter()
                .map(|d| {
                    let cost_total = (d.base_cost_metal + d.base_cost_crystal) as f64;
                    // Min appliqué avant vitesse
                    let raw_secs = ((cost_total / (DEFENSE_BUILD_RATE_DISP * shipyard_factor)) * 3600.0) as i64;
                    let raw_secs = raw_secs.max(5);
                    let build_time = (raw_secs as f64 / config.ship_build_speed as f64).max(5.0) as i64;
                    let mut v = serde_json::to_value(d).unwrap_or_default();
                    if let Some(obj) = v.as_object_mut() {
                        obj.insert(
                            "build_time_seconds".to_string(),
                            serde_json::Value::Number(serde_json::Number::from(build_time)),
                        );
                    }
                    v
                })
                .collect();
            axum::Json(json!({ "defense_types": defense_types_augmented })).into_response()
        }
        Err(e) => {
            eprintln!(
                "❌ Error fetching defense types for planet {}: {:?}",
                planet_id, e
            );
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(json!({"error": "Failed to fetch defense types"})),
            )
                .into_response()
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /planets/:id/research/:tech_key
// ─────────────────────────────────────────────────────────────────────────────

pub async fn start_research_handler(
    Path((planet_id, tech_key)): Path<(Uuid, String)>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    // Get planet (avec lazy eval pour avoir des ressources à jour)
    let mut planet = match Planet::find_by_id(planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                axum::Json(json!({"error": "Planet not found"})),
            )
                .into_response()
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(json!({"error": "Database error"})),
            )
                .into_response()
        }
    };
    let config_for_eval = state.config.read().unwrap().clone();
    apply_lazy_eval(&state.db, &mut planet, &config_for_eval).await;

    // Get technology
    let tech = match Technology::find()
        .filter(technology::Column::TechKey.eq(&tech_key))
        .one(&state.db)
        .await
    {
        Ok(Some(t)) => t,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                axum::Json(json!({"error": "Technology not found"})),
            )
                .into_response()
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(json!({"error": "Database error"})),
            )
                .into_response()
        }
    };

    // Check if player can research this tech (requirements met)
    let requirements =
        match tech_tree::get_tech_requirements(&state.db, tech.id, planet_id).await {
            Ok(reqs) => reqs,
            Err(_) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    axum::Json(json!({"error": "Failed to check requirements"})),
                )
                    .into_response()
            }
        };

    // Find unmet requirements
    let unmet: Vec<_> = requirements.iter().filter(|r| !r.met).collect();
    if !unmet.is_empty() {
        let missing_reqs: Vec<String> = unmet
            .iter()
            .map(|req| {
                format!(
                    "{} niveau {} (actuel: {})",
                    req.required_tech_name, req.required_level, req.current_level
                )
            })
            .collect();

        return (
            StatusCode::FORBIDDEN,
            axum::Json(json!({
                "error": format!("Requis: {}", missing_reqs.join(", "))
            })),
        )
            .into_response();
    }

    // Get current tech level
    let current_level =
        match tech_tree::get_planet_tech_level(&state.db, planet_id, &tech_key).await {
            Ok(level) => level,
            Err(_) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    axum::Json(json!({"error": "Database error"})),
                )
                    .into_response()
            }
        };

    // Check if already researching
    let existing_research = PlanetTechnology::find()
        .filter(planet_technology::Column::PlanetId.eq(planet_id))
        .filter(planet_technology::Column::TechId.eq(tech.id))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    let is_already_researching = existing_research
        .as_ref()
        .and_then(|pt| pt.researching_to_level)
        .is_some();

    if is_already_researching {
        return (
            StatusCode::CONFLICT,
            axum::Json(json!({"error": "Already researching this technology"})),
        )
            .into_response();
    }

    // Check per-category slot limit for research
    let config_for_slots = state.config.read().unwrap().clone();
    let research_slots =
        build_queue::get_category_slots(&state.db, &config_for_slots, planet_id, "research").await;
    let active_research =
        match build_queue::count_active_in_category(&state.db, planet_id, "research").await {
            Ok(c) => c,
            Err(_) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    axum::Json(json!({"error": "Failed to check queue"})),
                )
                    .into_response()
            }
        };

    if active_research >= research_slots as i64 {
        return (
            StatusCode::CONFLICT,
            axum::Json(json!({"error": format!("Slots de recherche pleins ({}/{})", active_research, research_slots)})),
        )
            .into_response();
    }

    // Calculate cost for next level
    let next_level = current_level + 1;
    let cost_metal =
        tech_tree::calculate_tech_cost(tech.base_cost_metal, tech.cost_multiplier, current_level);
    let cost_crystal = tech_tree::calculate_tech_cost(
        tech.base_cost_crystal,
        tech.cost_multiplier,
        current_level,
    );
    let cost_deuterium = tech_tree::calculate_tech_cost(
        tech.base_cost_deuterium,
        tech.cost_multiplier,
        current_level,
    );
    // Temps de recherche — formule polynomiale (level^1.5) avec diviseur research_speed
    let lab_level = tech_tree::get_planet_building_level(&state.db, planet_id, "research_lab")
        .await
        .unwrap_or(0);
    let research_time_seconds =
        game_logic::get_research_time(&tech_key, next_level, lab_level, &config_for_slots);

    // Check if planet has enough resources
    if planet.metal_amount < cost_metal as f64
        || planet.crystal_amount < cost_crystal as f64
        || planet.deuterium_amount < cost_deuterium as f64
    {
        return (
            StatusCode::BAD_REQUEST,
            axum::Json(json!({"error": "Insufficient resources"})),
        )
            .into_response();
    }

    // Deduct resources
    let mut active_planet: planet::ActiveModel = planet.clone().into();
    active_planet.metal_amount = Set(planet.metal_amount - cost_metal as f64);
    active_planet.crystal_amount = Set(planet.crystal_amount - cost_crystal as f64);
    active_planet.deuterium_amount = Set(planet.deuterium_amount - cost_deuterium as f64);

    if let Err(_) = active_planet.update(&state.db).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(json!({"error": "Failed to deduct resources"})),
        )
            .into_response();
    }

    // Start research
    let end_time = Utc::now().naive_utc() + Duration::seconds(research_time_seconds as i64);

    if let Some(pt) = existing_research {
        let mut active_pt: planet_technology::ActiveModel = pt.into();
        active_pt.researching_to_level = Set(Some(next_level));
        active_pt.research_end_time = Set(Some(end_time));

        if let Err(_) = active_pt.update(&state.db).await {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(json!({"error": "Failed to start research"})),
            )
                .into_response();
        }
    } else {
        let new_pt = planet_technology::ActiveModel {
            planet_id: Set(planet_id),
            tech_id: Set(tech.id),
            current_level: Set(0),
            researching_to_level: Set(Some(next_level)),
            research_end_time: Set(Some(end_time)),
        };

        if let Err(_) = new_pt.insert(&state.db).await {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(json!({"error": "Failed to start research"})),
            )
                .into_response();
        }
    }

    axum::Json(json!({
        "success": true,
        "tech_key": tech_key,
        "level": next_level,
        "end_time": end_time.format("%Y-%m-%d %H:%M:%S").to_string(),
        "duration_seconds": research_time_seconds
    }))
    .into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /planets/:id/build-ships/:ship_key/:quantity
// ─────────────────────────────────────────────────────────────────────────────

#[axum::debug_handler]
pub async fn build_ships_handler(
    Path((planet_id, ship_key, quantity)): Path<(Uuid, String, i32)>,
    State(state): State<AppState>,
) -> Response {
    if quantity <= 0 {
        return (
            StatusCode::BAD_REQUEST,
            axum::Json(json!({"error": "Quantité invalide"})),
        )
            .into_response();
    }
    if quantity > 100_000 {
        return (
            StatusCode::BAD_REQUEST,
            axum::Json(json!({"error": "Quantité trop élevée (max 100 000)"})),
        )
            .into_response();
    }

    // Get planet (avec lazy eval pour avoir des ressources à jour)
    let mut planet = match Planet::find_by_id(planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                axum::Json(json!({"error": "Planet not found"})),
            )
                .into_response()
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(json!({"error": "Database error"})),
            )
                .into_response()
        }
    };
    let config_for_eval = state.config.read().unwrap().clone();
    // Acquire per-planet lock BEFORE resource check to prevent concurrent double-spend
    let _build_guard = build_queue::acquire_planet_build_lock_pub(&state, planet_id).await;
    apply_lazy_eval(&state.db, &mut planet, &config_for_eval).await;

    // BE-9 : Vérifier si la construction est bloquée par un sabotage actif
    {
        let sab_effects = sabotage::get_sabotage_effects(&state.db, planet_id).await;
        if sab_effects.construction_blocked {
            return (
                StatusCode::LOCKED,
                axum::Json(json!({"error": "Construction bloquée par un sabotage actif"})),
            )
                .into_response();
        }
    }

    // Get ship type
    let ship = match ShipType::find()
        .filter(ship_type::Column::ShipKey.eq(&ship_key))
        .one(&state.db)
        .await
    {
        Ok(Some(s)) => s,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                axum::Json(json!({"error": "Ship type not found"})),
            )
                .into_response()
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(json!({"error": "Database error"})),
            )
                .into_response()
        }
    };

    // Check if player can build this ship (tech requirements met)
    let requirements =
        match tech_tree::get_ship_requirements(&state.db, ship.id, planet_id).await {
            Ok(reqs) => reqs,
            Err(_) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    axum::Json(json!({"error": "Failed to check requirements"})),
                )
                    .into_response()
            }
        };

    // Find unmet requirements
    let unmet: Vec<_> = requirements.iter().filter(|r| !r.met).collect();
    if !unmet.is_empty() {
        let missing_reqs: Vec<String> = unmet
            .iter()
            .map(|req| {
                if req.requirement_type == "tech" {
                    format!(
                        "{} niveau {} (actuel: {})",
                        req.tech_name
                            .as_ref()
                            .unwrap_or(&"Technologie".to_string()),
                        req.required_level,
                        req.current_level
                    )
                } else {
                    format!(
                        "{} niveau {} (actuel: {})",
                        req.building_name
                            .as_ref()
                            .unwrap_or(&"Bâtiment".to_string()),
                        req.required_level,
                        req.current_level
                    )
                }
            })
            .collect();

        return (
            StatusCode::FORBIDDEN,
            axum::Json(json!({
                "error": format!("Requis: {}", missing_reqs.join(", "))
            })),
        )
            .into_response();
    }

    // Calculate total cost — cast to i64 before multiplication to prevent i32 overflow
    // with large quantities (e.g. 100 000 ships * high cost)
    let total_cost_metal = ship.cost_metal as i64 * quantity as i64;
    let total_cost_crystal = ship.cost_crystal as i64 * quantity as i64;
    let total_cost_deuterium = ship.cost_deuterium as i64 * quantity as i64;

    // Check if planet has enough resources
    if planet.metal_amount < total_cost_metal as f64
        || planet.crystal_amount < total_cost_crystal as f64
        || planet.deuterium_amount < total_cost_deuterium as f64
    {
        return (
            StatusCode::BAD_REQUEST,
            axum::Json(json!({"error": "Insufficient resources"})),
        )
            .into_response();
    }

    // Check if already building this ship type
    let existing_build = PlanetShip::find()
        .filter(planet_ship::Column::PlanetId.eq(planet_id))
        .filter(planet_ship::Column::ShipTypeId.eq(ship.id))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    let is_already_building = existing_build
        .as_ref()
        .and_then(|ps| ps.building_count)
        .map(|count| count > 0)
        .unwrap_or(false);

    // Calculate build time
    let config = state.config.read().unwrap().clone();

    if !is_already_building {
        // Check per-category slot limit for ships
        let ship_slots =
            build_queue::get_category_slots(&state.db, &config, planet_id, "ships").await;
        let active_ships =
            match build_queue::count_active_in_category(&state.db, planet_id, "ships").await {
                Ok(c) => c,
                Err(_) => {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        axum::Json(json!({"error": "Failed to check queue"})),
                    )
                        .into_response()
                }
            };

        if active_ships >= ship_slots as i64 {
            return (
                StatusCode::CONFLICT,
                axum::Json(json!({"error": format!("Slots de construction de vaisseaux pleins ({}/{})", active_ships, ship_slots)})),
            )
                .into_response();
        }
    }

    // Use the unified cost-based formula (same as what get_ship_types_handler exposes to frontend)
    let shipyard_level =
        tech_tree::get_planet_building_level(&state.db, planet_id, "shipyard")
            .await
            .unwrap_or(0);
    // Constantes alignées avec game_logic::get_ship_production_time
    const SHIP_BUILD_RATE_QUEUE: f64 = 3600.0;
    const SHIP_SHIPYARD_BONUS_QUEUE: f64 = 0.10;
    let cost_total = ship.cost_metal as f64 + ship.cost_crystal as f64;
    let effective_rate = SHIP_BUILD_RATE_QUEUE * (1.0 + shipyard_level as f64 * SHIP_SHIPYARD_BONUS_QUEUE);
    // Min appliqué avant le diviseur de vitesse
    let raw_secs_per_unit = ((cost_total / effective_rate) * 3600.0) as i64;
    let raw_secs_per_unit = raw_secs_per_unit.max(5);
    let secs_per_unit = (raw_secs_per_unit as f64 / config.ship_build_speed as f64).max(5.0) as i64;
    let additional_build_time = secs_per_unit * quantity as i64;

    // If already building, add to the existing queue
    if let Some(ps) = &existing_build {
        if ps.building_count.is_some() && ps.building_count.unwrap() > 0 {
            let now = Utc::now().naive_utc();
            if let Some(current_end_time) = ps.build_end_time {
                let remaining_seconds = (current_end_time - now).num_seconds().max(0);
                let new_end_time =
                    now + Duration::seconds(remaining_seconds + additional_build_time);
                let new_quantity = ps.building_count.unwrap() + quantity;

                // Deduct resources
                let mut active_planet: planet::ActiveModel = planet.clone().into();
                active_planet.metal_amount =
                    Set(planet.metal_amount - total_cost_metal as f64);
                active_planet.crystal_amount =
                    Set(planet.crystal_amount - total_cost_crystal as f64);
                active_planet.deuterium_amount =
                    Set(planet.deuterium_amount - total_cost_deuterium as f64);

                if let Err(_) = active_planet.update(&state.db).await {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        axum::Json(json!({"error": "Failed to deduct resources"})),
                    )
                        .into_response();
                }

                // Update the build queue
                let mut active_ps: planet_ship::ActiveModel = ps.clone().into();
                active_ps.building_count = Set(Some(new_quantity));
                active_ps.build_end_time = Set(Some(new_end_time));

                if let Err(_) = active_ps.update(&state.db).await {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        axum::Json(json!({"error": "Failed to update building queue"})),
                    )
                        .into_response();
                }

                return axum::Json(json!({
                    "success": true,
                    "ship_key": ship_key,
                    "quantity": new_quantity,
                    "added": quantity,
                    "end_time": new_end_time.format("%Y-%m-%d %H:%M:%S").to_string(),
                    "total_duration_seconds": remaining_seconds + additional_build_time
                }))
                .into_response();
            }
        }
    }

    // Deduct resources for new build
    let mut active_planet: planet::ActiveModel = planet.clone().into();
    active_planet.metal_amount = Set(planet.metal_amount - total_cost_metal as f64);
    active_planet.crystal_amount = Set(planet.crystal_amount - total_cost_crystal as f64);
    active_planet.deuterium_amount = Set(planet.deuterium_amount - total_cost_deuterium as f64);

    if let Err(_) = active_planet.update(&state.db).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(json!({"error": "Failed to deduct resources"})),
        )
            .into_response();
    }

    let end_time = Utc::now().naive_utc() + Duration::seconds(additional_build_time);

    if let Some(ps) = existing_build {
        let mut active_ps: planet_ship::ActiveModel = ps.into();
        active_ps.building_count = Set(Some(quantity));
        active_ps.build_end_time = Set(Some(end_time));

        if let Err(_) = active_ps.update(&state.db).await {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(json!({"error": "Failed to start building"})),
            )
                .into_response();
        }
    } else {
        let new_ps = planet_ship::ActiveModel {
            planet_id: Set(planet_id),
            ship_type_id: Set(ship.id),
            count: Set(0),
            building_count: Set(Some(quantity)),
            build_end_time: Set(Some(end_time)),
        };

        if let Err(_) = new_ps.insert(&state.db).await {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(json!({"error": "Failed to start building"})),
            )
                .into_response();
        }
    }

    axum::Json(json!({
        "success": true,
        "ship_key": ship_key,
        "quantity": quantity,
        "end_time": end_time.format("%Y-%m-%d %H:%M:%S").to_string(),
        "duration_seconds": additional_build_time
    }))
    .into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /planets/:id/build-defenses/:defense_key/:quantity
// ─────────────────────────────────────────────────────────────────────────────

#[axum::debug_handler]
pub async fn build_defenses_handler(
    Path((planet_id, defense_key, quantity)): Path<(Uuid, String, i32)>,
    State(state): State<AppState>,
) -> Response {
    if quantity <= 0 {
        return (
            StatusCode::BAD_REQUEST,
            axum::Json(json!({"error": "Invalid quantity"})),
        )
            .into_response();
    }

    // Get planet (avec lazy eval pour avoir des ressources à jour)
    let mut planet = match Planet::find_by_id(planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                axum::Json(json!({"error": "Planet not found"})),
            )
                .into_response()
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(json!({"error": "Database error"})),
            )
                .into_response()
        }
    };
    let config_for_eval = state.config.read().unwrap().clone();
    // Acquire per-planet lock BEFORE resource check to prevent concurrent double-spend
    let _build_guard = build_queue::acquire_planet_build_lock_pub(&state, planet_id).await;
    apply_lazy_eval(&state.db, &mut planet, &config_for_eval).await;

    // Get defense type
    let defense = match DefenseType::find()
        .filter(defense_type::Column::DefenseKey.eq(&defense_key))
        .one(&state.db)
        .await
    {
        Ok(Some(d)) => d,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                axum::Json(json!({"error": "Defense type not found"})),
            )
                .into_response()
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(json!({"error": "Database error"})),
            )
                .into_response()
        }
    };

    // Check if player can build this defense (tech requirements met)
    let requirements =
        match tech_tree::get_defense_requirements(&state.db, defense.id, planet_id).await {
            Ok(reqs) => reqs,
            Err(_) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    axum::Json(json!({"error": "Failed to check requirements"})),
                )
                    .into_response()
            }
        };

    // Find unmet requirements
    let unmet: Vec<_> = requirements.iter().filter(|r| !r.met).collect();
    if !unmet.is_empty() {
        let missing_reqs: Vec<String> = unmet
            .iter()
            .map(|req| {
                if req.requirement_type == "tech" {
                    format!(
                        "{} niveau {} (actuel: {})",
                        req.tech_name
                            .as_ref()
                            .unwrap_or(&"Technologie".to_string()),
                        req.required_level,
                        req.current_level
                    )
                } else {
                    format!(
                        "{} niveau {} (actuel: {})",
                        req.building_name
                            .as_ref()
                            .unwrap_or(&"Bâtiment".to_string()),
                        req.required_level,
                        req.current_level
                    )
                }
            })
            .collect();

        return (
            StatusCode::FORBIDDEN,
            axum::Json(json!({
                "error": format!("Requis: {}", missing_reqs.join(", "))
            })),
        )
            .into_response();
    }

    // Calculate total cost
    let total_cost_metal = defense.base_cost_metal * quantity;
    let total_cost_crystal = defense.base_cost_crystal * quantity;
    let total_cost_deuterium = defense.base_cost_deuterium * quantity;

    // Check if planet has enough resources
    if planet.metal_amount < total_cost_metal as f64
        || planet.crystal_amount < total_cost_crystal as f64
        || planet.deuterium_amount < total_cost_deuterium as f64
    {
        return (
            StatusCode::BAD_REQUEST,
            axum::Json(json!({"error": "Insufficient resources"})),
        )
            .into_response();
    }

    // Check if already building this defense type
    let existing_build = PlanetDefense::find()
        .filter(planet_defense::Column::PlanetId.eq(planet_id))
        .filter(planet_defense::Column::DefenseTypeId.eq(defense.id))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    let is_already_building = existing_build
        .as_ref()
        .and_then(|pd| pd.building_count)
        .map(|count| count > 0)
        .unwrap_or(false);

    // Calculate build time
    let config = state.config.read().unwrap().clone();

    if !is_already_building {
        // Check per-category slot limit for defenses
        let def_slots =
            build_queue::get_category_slots(&state.db, &config, planet_id, "defenses").await;
        let active_defs =
            match build_queue::count_active_in_category(&state.db, planet_id, "defenses").await {
                Ok(c) => c,
                Err(_) => {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        axum::Json(json!({"error": "Failed to check queue"})),
                    )
                        .into_response()
                }
            };

        if active_defs >= def_slots as i64 {
            return (
                StatusCode::CONFLICT,
                axum::Json(json!({"error": format!("Slots de construction de défenses pleins ({}/{})", active_defs, def_slots)})),
            )
                .into_response();
        }
    }

    // Cost-based formula (same as ships) for consistent UI/backend sync
    let shipyard_level =
        tech_tree::get_planet_building_level(&state.db, planet_id, "shipyard")
            .await
            .unwrap_or(0);
    let cost_total = (defense.base_cost_metal + defense.base_cost_crystal) as f64;
    // Constantes alignées avec la formule d'affichage (get_defense_types_handler)
    const DEFENSE_BUILD_RATE_Q: f64 = 1800.0;
    const DEFENSE_SHIPYARD_BONUS_Q: f64 = 0.08;
    let shipyard_factor = 1.0 + shipyard_level as f64 * DEFENSE_SHIPYARD_BONUS_Q;
    // Min appliqué avant vitesse
    let raw_secs_per_unit = ((cost_total / (DEFENSE_BUILD_RATE_Q * shipyard_factor)) * 3600.0) as i64;
    let raw_secs_per_unit = raw_secs_per_unit.max(5);
    let secs_per_unit = (raw_secs_per_unit as f64 / config.ship_build_speed as f64).max(5.0) as i64;
    let additional_build_time = secs_per_unit * quantity as i64;

    // If already building, add to the existing queue
    if let Some(pd) = &existing_build {
        if pd.building_count.is_some() && pd.building_count.unwrap() > 0 {
            let now = Utc::now().naive_utc();
            if let Some(current_end_time) = pd.build_end_time {
                let remaining_seconds = (current_end_time - now).num_seconds().max(0);
                let new_end_time =
                    now + Duration::seconds(remaining_seconds + additional_build_time);
                let new_quantity = pd.building_count.unwrap() + quantity;

                // Deduct resources
                let mut active_planet: planet::ActiveModel = planet.clone().into();
                active_planet.metal_amount =
                    Set(planet.metal_amount - total_cost_metal as f64);
                active_planet.crystal_amount =
                    Set(planet.crystal_amount - total_cost_crystal as f64);
                active_planet.deuterium_amount =
                    Set(planet.deuterium_amount - total_cost_deuterium as f64);

                if let Err(_) = active_planet.update(&state.db).await {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        axum::Json(json!({"error": "Failed to deduct resources"})),
                    )
                        .into_response();
                }

                // Update the build queue
                let mut active_pd: planet_defense::ActiveModel = pd.clone().into();
                active_pd.building_count = Set(Some(new_quantity));
                active_pd.build_end_time = Set(Some(new_end_time));

                if let Err(_) = active_pd.update(&state.db).await {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        axum::Json(json!({"error": "Failed to update building queue"})),
                    )
                        .into_response();
                }

                return axum::Json(json!({
                    "success": true,
                    "defense_key": defense_key,
                    "quantity": new_quantity,
                    "added": quantity,
                    "end_time": new_end_time.format("%Y-%m-%d %H:%M:%S").to_string(),
                    "total_duration_seconds": remaining_seconds + additional_build_time
                }))
                .into_response();
            }
        }
    }

    // Deduct resources for new build
    let mut active_planet: planet::ActiveModel = planet.clone().into();
    active_planet.metal_amount = Set(planet.metal_amount - total_cost_metal as f64);
    active_planet.crystal_amount = Set(planet.crystal_amount - total_cost_crystal as f64);
    active_planet.deuterium_amount =
        Set(planet.deuterium_amount - total_cost_deuterium as f64);

    if let Err(_) = active_planet.update(&state.db).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(json!({"error": "Failed to deduct resources"})),
        )
            .into_response();
    }

    let end_time = Utc::now().naive_utc() + Duration::seconds(additional_build_time);

    if let Some(pd) = existing_build {
        let mut active_pd: planet_defense::ActiveModel = pd.into();
        active_pd.building_count = Set(Some(quantity));
        active_pd.build_end_time = Set(Some(end_time));

        if let Err(_) = active_pd.update(&state.db).await {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(json!({"error": "Failed to start building"})),
            )
                .into_response();
        }
    } else {
        let new_pd = planet_defense::ActiveModel {
            planet_id: Set(planet_id),
            defense_type_id: Set(defense.id),
            count: Set(0),
            building_count: Set(Some(quantity)),
            build_end_time: Set(Some(end_time)),
            updated_at: NotSet,
        };

        if let Err(_) = new_pd.insert(&state.db).await {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(json!({"error": "Failed to start building"})),
            )
                .into_response();
        }
    }

    axum::Json(json!({
        "success": true,
        "defense_key": defense_key,
        "quantity": quantity,
        "end_time": end_time.format("%Y-%m-%d %H:%M:%S").to_string(),
        "duration_seconds": additional_build_time
    }))
    .into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /planets/:id/build-fleet/:type/:qty  (legacy system)
// ─────────────────────────────────────────────────────────────────────────────

pub async fn build_fleet_handler(
    Path((id, type_ship, qty)): Path<(Uuid, String, i32)>,
    State(state): State<AppState>,
) -> Result<StatusCode, StatusCode> {
    use backend::entities::prelude::{ConstructionQueue, ShipType as ShipTypeEntity};
    use backend::entities::ship_type as ship_type_mod;

    let p = Planet::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    let config = state.config.read().unwrap().clone();

    if qty <= 0 {
        return Err(StatusCode::BAD_REQUEST);
    }

    let is_defense = ["missile_launcher", "plasma_turret"].contains(&type_ship.as_str());

    if !is_defense {
        let ship_slots =
            build_queue::get_category_slots(&state.db, &config, p.id, "ships").await;
        let active_ship_constructions =
            build_queue::count_active_in_category(&state.db, p.id, "ships")
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        if active_ship_constructions >= ship_slots as i64 {
            return Err(StatusCode::CONFLICT);
        }
    }

    if !is_defense {
        let all_ship_counts =
            tech_tree::get_all_planet_ship_counts(&state.db, p.id)
                .await
                .unwrap_or_default();
        let current_fleet_size: i32 = all_ship_counts.values().sum();
        let hangar_level =
            tech_tree::get_planet_building_level(&state.db, p.id, "hangar")
                .await
                .unwrap_or(0);
        let max_capacity = game_logic::get_fleet_capacity(hangar_level, &config);

        let pending_in_queue: i32 = ConstructionQueue::find()
            .filter(
                backend::entities::construction_queue::Column::PlanetId.eq(p.id),
            )
            .all(&state.db)
            .await
            .unwrap_or_default()
            .iter()
            .filter(|i| {
                [
                    "light_hunter",
                    "cruiser",
                    "transporter",
                    "colony_ship",
                    "recycler",
                    "spy_probe",
                    "heavy_hunter",
                    "battleship",
                    "bomber",
                    "destroyer",
                ]
                .contains(&i.building_type.as_str())
            })
            .map(|i| i.level)
            .sum();

        if (current_fleet_size + pending_in_queue + qty) > max_capacity {
            return Err(StatusCode::CONFLICT);
        }
    }

    // Check prerequisites using tech tree system if ship exists, otherwise use legacy system
    let ship_type_exists = ShipTypeEntity::find()
        .filter(ship_type_mod::Column::ShipKey.eq(&type_ship))
        .one(&state.db)
        .await
        .ok()
        .flatten()
        .is_some();

    if ship_type_exists {
        let can_build = tech_tree::can_build_ship(&state.db, p.id, &type_ship)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        if !can_build {
            return Err(StatusCode::FORBIDDEN);
        }
    }

    let (cost_m, cost_c) = match type_ship.as_str() {
        "light_hunter" => game_logic::get_light_hunter_stats(&config),
        "cruiser" => game_logic::get_cruiser_stats(&config),
        "recycler" => game_logic::get_recycler_stats(&config),
        "spy_probe" => game_logic::get_spy_probe_stats(&config),
        "missile_launcher" => game_logic::get_missile_launcher_stats(&config),
        "plasma_turret" => game_logic::get_plasma_turret_stats(&config),
        "colony_ship" => game_logic::get_colony_ship_stats(&config),
        "transporter" => game_logic::get_transporter_stats(&config),
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    let total_m = cost_m * qty as f64;
    let total_c = cost_c * qty as f64;

    if p.metal_amount < total_m || p.crystal_amount < total_c {
        return Err(StatusCode::BAD_REQUEST);
    }

    let shipyard_level = crate::tech_tree::get_planet_building_level(&state.db, p.id, "shipyard")
        .await
        .unwrap_or(0);
    let ship_build_rate_legacy = config.get_config("ship_build_rate", 100_000.0);
    let shipyard_bonus_legacy = config.get_config("ship_build_rate_shipyard_bonus", 0.15);
    let cost_total_legacy = cost_m + cost_c;
    let effective_rate_legacy = ship_build_rate_legacy * (1.0 + shipyard_level as f64 * shipyard_bonus_legacy);
    let secs_per_unit_legacy = ((cost_total_legacy / effective_rate_legacy * 3600.0) / config.ship_build_speed as f64) as i64;
    let secs_per_unit_legacy = secs_per_unit_legacy.max(5);
    let build_time = secs_per_unit_legacy * qty as i64;

    let mut active: planet::ActiveModel = p.clone().into();
    active.metal_amount = Set(active.metal_amount.unwrap() - total_m);
    active.crystal_amount = Set(active.crystal_amount.unwrap() - total_c);
    active
        .update(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let queue_item = backend::entities::construction_queue::ActiveModel {
        id: Set(Uuid::new_v4()),
        planet_id: Set(p.id),
        building_type: Set(type_ship),
        level: Set(qty),
        end_time: Set(Utc::now().naive_utc() + Duration::seconds(build_time)),
    };

    queue_item
        .insert(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

pub fn router(state: AppState) -> Router<AppState> {
    Router::new()
        .route(
            "/planets/:id/tech-tree",
            get(get_tech_tree_handler),
        )
        .route(
            "/planets/:id/ship-types",
            get(get_ship_types_handler),
        )
        .route(
            "/planets/:id/building-types",
            get(get_building_types_handler),
        )
        .route(
            "/planets/:id/defense-types",
            get(get_defense_types_handler),
        )
        .route(
            "/planets/:id/research/:tech_key",
            post(start_research_handler),
        )
        .route(
            "/planets/:id/build-ships/:ship_key/:quantity",
            post(build_ships_handler),
        )
        .route(
            "/planets/:id/build-defenses/:defense_key/:quantity",
            post(build_defenses_handler),
        )
        .route(
            "/planets/:id/build-fleet/:type/:qty",
            post(build_fleet_handler),
        )
        .route("/tech/:tech_key", get(get_tech_details_handler))
        .route("/ship/:ship_key", get(get_ship_details_handler))
        .with_state(state)
}
