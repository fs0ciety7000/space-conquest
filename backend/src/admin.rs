use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use crate::auth::AuthUser;
use sea_orm::{
    ActiveModelTrait, EntityTrait, Set, QueryFilter, ColumnTrait, PaginatorTrait
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;
use chrono::Utc;
use bcrypt;

use crate::websocket::WsEvent;
use crate::entities::{
    prelude::{Planet, User, ServerConfig, Announcement, BuildingType, PlanetBuilding, ShipType, PlanetShip, DefenseType, PlanetDefense, Technology, PlanetTechnology},
    planet,
    server_config,
    user,
    announcement,
    planet_building,
    building_type,
    planet_ship,
    ship_type,
    planet_defense,
    defense_type,
    planet_technology,
    technology,
};
use crate::AppState;

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
    role: String,
    planets: Vec<PlanetInfo>,
    total_points: i32,
    syndicate_credits: f64,
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
    pub resource_storage_level: Option<i32>,
    pub fusion_plant_level: Option<i32>,

    // Technologies
    pub energy_tech_level: Option<i32>,
    pub laser_battery_level: Option<i32>,
    pub armour_tech_level: Option<i32>,
    pub espionage_tech_level: Option<i32>,
    pub weapons_tech_level: Option<i32>,
    pub shield_tech_level: Option<i32>,
    pub computer_tech_level: Option<i32>,
    pub hyperspace_tech_level: Option<i32>,
    pub plasma_tech_level: Option<i32>,
    pub astrophysics_level: Option<i32>,
    pub graviton_tech_level: Option<i32>,

    // Flotte
    pub light_hunter_count: Option<i32>,
    pub heavy_hunter_count: Option<i32>,
    pub cruiser_count: Option<i32>,
    pub battleship_count: Option<i32>,
    pub bomber_count: Option<i32>,
    pub destroyer_count: Option<i32>,
    pub recycler_count: Option<i32>,
    pub spy_probe_count: Option<i32>,
    pub colony_ship_count: Option<i32>,
    pub transporter_count: Option<i32>,
    pub deathstar_count: Option<i32>,
    pub grand_cargo_count: Option<i32>,

    // Défenses
    pub rocket_launcher_count: Option<i32>,
    pub light_laser_count: Option<i32>,
    pub heavy_laser_count: Option<i32>,
    pub gauss_cannon_count: Option<i32>,
    pub ion_cannon_count: Option<i32>,
    pub plasma_turret_count: Option<i32>,
    pub small_shield_count: Option<i32>,
    pub large_shield_count: Option<i32>,
    pub anti_missile_count: Option<i32>,
    pub interplanetary_missile_count: Option<i32>,
}

// Vérification admin - vérifie le rôle dans la DB (SEC-02)
// Accepts the caller UUID extracted from the JWT by the AuthUser extractor.
async fn check_admin(user_id: Uuid, state: &AppState) -> Result<Uuid, StatusCode> {
    // Récupérer l'utilisateur depuis la DB et vérifier son rôle
    let user = User::find_by_id(user_id)
        .one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::UNAUTHORIZED)?;

    if user.role != "admin" {
        return Err(StatusCode::FORBIDDEN);
    }

    Ok(user_id)
}

pub async fn get_all_players_handler(
    State(state): State<AppState>,
    auth: AuthUser,
) -> impl IntoResponse {
    if check_admin(auth.user_id, &state).await.is_err() {
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
            syndicate_credits: user.syndicate_credits,
            username: user.username,
            email: user.email,
            role: user.role,
            planets: planet_infos,
            total_points: 0,
        });
    }

    Json(result).into_response()
}

pub async fn get_planet_admin_handler(
    Path(planet_id): Path<Uuid>,
    State(state): State<AppState>,
    auth: AuthUser,
) -> impl IntoResponse {
    if check_admin(auth.user_id, &state).await.is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"})))
            .into_response();
    }

    let planet = Planet::find_by_id(planet_id)
        .one(&state.db)
        .await
        .unwrap_or(None);

    if let Some(p) = planet {
        let building_levels = crate::tech_tree::get_all_planet_building_levels(&state.db, p.id).await.unwrap_or_default();
        let ship_counts = crate::tech_tree::get_all_planet_ship_counts(&state.db, p.id).await.unwrap_or_default();
        let defense_counts = crate::tech_tree::get_all_planet_defense_counts(&state.db, p.id).await.unwrap_or_default();

        // Tech levels are per-planet in the DB, but technologies are effectively global
        // (the game uses max across all planets). Show max across all owner's planets.
        let owner_planets = Planet::find()
            .filter(planet::Column::OwnerId.eq(p.owner_id))
            .all(&state.db)
            .await
            .unwrap_or_default();
        let mut tech_levels: HashMap<String, i32> = HashMap::new();
        for op in &owner_planets {
            if let Ok(levels) = crate::tech_tree::get_all_planet_tech_levels(&state.db, op.id).await {
                for (key, level) in levels {
                    let entry = tech_levels.entry(key).or_insert(0);
                    if level > *entry { *entry = level; }
                }
            }
        }

        let mut planet_json = serde_json::to_value(&p).unwrap();
        if let Some(obj) = planet_json.as_object_mut() {
            obj.insert("metal_mine_level".to_string(), json!(building_levels.get("metal_mine").copied().unwrap_or(0)));
            obj.insert("crystal_mine_level".to_string(), json!(building_levels.get("crystal_mine").copied().unwrap_or(0)));
            obj.insert("deuterium_mine_level".to_string(), json!(building_levels.get("deuterium_mine").copied().unwrap_or(0)));
            obj.insert("solar_plant_level".to_string(), json!(building_levels.get("solar_plant").copied().unwrap_or(0)));
            obj.insert("shipyard_level".to_string(), json!(building_levels.get("shipyard").copied().unwrap_or(0)));
            obj.insert("research_lab_level".to_string(), json!(building_levels.get("research_lab").copied().unwrap_or(0)));
            obj.insert("hangar_level".to_string(), json!(building_levels.get("hangar").copied().unwrap_or(0)));
            obj.insert("resource_storage_level".to_string(), json!(building_levels.get("resource_storage").copied().unwrap_or(0)));
            obj.insert("fusion_plant_level".to_string(), json!(building_levels.get("fusion_plant").copied().unwrap_or(0)));
            obj.insert("energy_tech_level".to_string(), json!(tech_levels.get("energy_tech").copied().unwrap_or(0)));
            obj.insert("laser_battery_level".to_string(), json!(tech_levels.get("laser_tech").copied().unwrap_or(0)));
            obj.insert("armour_tech_level".to_string(), json!(tech_levels.get("armour_tech").copied().unwrap_or(0)));
            obj.insert("espionage_tech_level".to_string(), json!(tech_levels.get("espionage_tech").or_else(|| tech_levels.get("espionage")).copied().unwrap_or(0)));
            obj.insert("weapons_tech_level".to_string(), json!(tech_levels.get("weapons_tech").copied().unwrap_or(0)));
            obj.insert("shield_tech_level".to_string(), json!(tech_levels.get("shield_tech").copied().unwrap_or(0)));
            obj.insert("computer_tech_level".to_string(), json!(tech_levels.get("computer_tech").copied().unwrap_or(0)));
            obj.insert("hyperspace_tech_level".to_string(), json!(tech_levels.get("hyperspace_tech").copied().unwrap_or(0)));
            obj.insert("plasma_tech_level".to_string(), json!(tech_levels.get("plasma_tech").copied().unwrap_or(0)));
            obj.insert("astrophysics_level".to_string(), json!(tech_levels.get("astrophysics").copied().unwrap_or(0)));
            obj.insert("graviton_tech_level".to_string(), json!(tech_levels.get("graviton_tech").copied().unwrap_or(0)));
            obj.insert("light_hunter_count".to_string(), json!(ship_counts.get("light_hunter").copied().unwrap_or(0)));
            obj.insert("heavy_hunter_count".to_string(), json!(ship_counts.get("heavy_hunter").copied().unwrap_or(0)));
            obj.insert("cruiser_count".to_string(), json!(ship_counts.get("cruiser").copied().unwrap_or(0)));
            obj.insert("battleship_count".to_string(), json!(ship_counts.get("battleship").copied().unwrap_or(0)));
            obj.insert("bomber_count".to_string(), json!(ship_counts.get("bomber").copied().unwrap_or(0)));
            obj.insert("destroyer_count".to_string(), json!(ship_counts.get("destroyer").copied().unwrap_or(0)));
            obj.insert("recycler_count".to_string(), json!(ship_counts.get("recycler").copied().unwrap_or(0)));
            obj.insert("spy_probe_count".to_string(), json!(ship_counts.get("spy_probe").copied().unwrap_or(0)));
            obj.insert("colony_ship_count".to_string(), json!(ship_counts.get("colony_ship").copied().unwrap_or(0)));
            obj.insert("transporter_count".to_string(), json!(ship_counts.get("transporter").copied().unwrap_or(0)));
            obj.insert("deathstar_count".to_string(), json!(ship_counts.get("deathstar").copied().unwrap_or(0)));
            obj.insert("grand_cargo_count".to_string(), json!(ship_counts.get("grand_cargo").copied().unwrap_or(0)));
            obj.insert("rocket_launcher_count".to_string(), json!(defense_counts.get("rocket_launcher").copied().unwrap_or(0)));
            obj.insert("light_laser_count".to_string(), json!(defense_counts.get("light_laser").copied().unwrap_or(0)));
            obj.insert("heavy_laser_count".to_string(), json!(defense_counts.get("heavy_laser").copied().unwrap_or(0)));
            obj.insert("gauss_cannon_count".to_string(), json!(defense_counts.get("gauss_cannon").copied().unwrap_or(0)));
            obj.insert("ion_cannon_count".to_string(), json!(defense_counts.get("ion_cannon").copied().unwrap_or(0)));
            obj.insert("plasma_turret_count".to_string(), json!(defense_counts.get("plasma_turret").copied().unwrap_or(0)));
            obj.insert("small_shield_count".to_string(), json!(defense_counts.get("small_shield").copied().unwrap_or(0)));
            obj.insert("large_shield_count".to_string(), json!(defense_counts.get("large_shield").copied().unwrap_or(0)));
            obj.insert("anti_missile_count".to_string(), json!(defense_counts.get("anti_missile").copied().unwrap_or(0)));
            obj.insert("interplanetary_missile_count".to_string(), json!(defense_counts.get("interplanetary_missile").copied().unwrap_or(0)));
        }
        Json(planet_json).into_response()
    } else {
        (StatusCode::NOT_FOUND, Json(json!({"error": "Planète introuvable"})))
            .into_response()
    }
}

pub async fn update_planet_admin_handler(
    Path(planet_id): Path<Uuid>,
    State(state): State<AppState>,
    auth: AuthUser,
    Json(updates): Json<PlanetUpdate>,
) -> impl IntoResponse {
    if check_admin(auth.user_id, &state).await.is_err() {
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

    match active.update(&state.db).await {
        Ok(updated) => {
            // Upsert buildings into planet_buildings
            let building_updates: &[(&str, Option<i32>)] = &[
                ("metal_mine", updates.metal_mine_level),
                ("crystal_mine", updates.crystal_mine_level),
                ("deuterium_mine", updates.deuterium_mine_level),
                ("solar_plant", updates.solar_plant_level),
                ("shipyard", updates.shipyard_level),
                ("research_lab", updates.research_lab_level),
                ("hangar", updates.hangar_level),
                ("resource_storage", updates.resource_storage_level),
                ("fusion_plant", updates.fusion_plant_level),
            ];
            let now = Utc::now().naive_utc();
            for (key, level_opt) in building_updates {
                if let Some(level) = level_opt {
                    if let Ok(Some(bt)) = BuildingType::find()
                        .filter(building_type::Column::BuildingKey.eq(*key))
                        .one(&state.db).await
                    {
                        let existing = PlanetBuilding::find()
                            .filter(planet_building::Column::PlanetId.eq(planet_id))
                            .filter(planet_building::Column::BuildingTypeId.eq(bt.id))
                            .one(&state.db).await.unwrap_or(None);
                        if let Some(ex) = existing {
                            let mut a: planet_building::ActiveModel = ex.into();
                            a.level = Set(*level);
                            a.updated_at = Set(Some(now));
                            let _ = a.update(&state.db).await;
                        } else {
                            let _ = planet_building::ActiveModel {
                                planet_id: Set(planet_id),
                                building_type_id: Set(bt.id),
                                level: Set(*level),
                                upgrading_to_level: Set(None),
                                upgrade_end_time: Set(None),
                                updated_at: Set(Some(now)),
                            }.insert(&state.db).await;
                        }
                    }
                }
            }

            // Upsert technologies into planet_technologies
            let tech_updates: &[(&str, Option<i32>)] = &[
                ("energy_tech", updates.energy_tech_level),
                ("laser_tech", updates.laser_battery_level),
                ("armour_tech", updates.armour_tech_level),
                ("espionage", updates.espionage_tech_level),
                ("weapons_tech", updates.weapons_tech_level),
                ("shield_tech", updates.shield_tech_level),
                ("computer_tech", updates.computer_tech_level),
                ("hyperspace_tech", updates.hyperspace_tech_level),
                ("plasma_tech", updates.plasma_tech_level),
                ("astrophysics", updates.astrophysics_level),
                ("graviton_tech", updates.graviton_tech_level),
            ];
            for (key, level_opt) in tech_updates {
                if let Some(level) = level_opt {
                    if let Ok(Some(tech)) = Technology::find()
                        .filter(technology::Column::TechKey.eq(*key))
                        .one(&state.db).await
                    {
                        let existing = PlanetTechnology::find()
                            .filter(planet_technology::Column::PlanetId.eq(planet_id))
                            .filter(planet_technology::Column::TechId.eq(tech.id))
                            .one(&state.db).await.unwrap_or(None);
                        if let Some(ex) = existing {
                            let mut a: planet_technology::ActiveModel = ex.into();
                            a.current_level = Set(*level);
                            let _ = a.update(&state.db).await;
                        } else {
                            let _ = planet_technology::ActiveModel {
                                planet_id: Set(planet_id),
                                tech_id: Set(tech.id),
                                current_level: Set(*level),
                                researching_to_level: Set(None),
                                research_end_time: Set(None),
                            }.insert(&state.db).await;
                        }
                    }
                }
            }

            // Upsert ships into planet_ships
            let ship_updates: &[(&str, Option<i32>)] = &[
                ("light_hunter", updates.light_hunter_count),
                ("heavy_hunter", updates.heavy_hunter_count),
                ("cruiser", updates.cruiser_count),
                ("battleship", updates.battleship_count),
                ("bomber", updates.bomber_count),
                ("destroyer", updates.destroyer_count),
                ("recycler", updates.recycler_count),
                ("spy_probe", updates.spy_probe_count),
                ("colony_ship", updates.colony_ship_count),
                ("transporter", updates.transporter_count),
                ("deathstar", updates.deathstar_count),
                ("grand_cargo", updates.grand_cargo_count),
            ];
            for (key, count_opt) in ship_updates {
                if let Some(count) = count_opt {
                    if let Ok(Some(st)) = ShipType::find()
                        .filter(ship_type::Column::ShipKey.eq(*key))
                        .one(&state.db).await
                    {
                        let existing = PlanetShip::find()
                            .filter(planet_ship::Column::PlanetId.eq(planet_id))
                            .filter(planet_ship::Column::ShipTypeId.eq(st.id))
                            .one(&state.db).await.unwrap_or(None);
                        if let Some(ex) = existing {
                            let mut a: planet_ship::ActiveModel = ex.into();
                            a.count = Set(*count);
                            let _ = a.update(&state.db).await;
                        } else {
                            let _ = planet_ship::ActiveModel {
                                planet_id: Set(planet_id),
                                ship_type_id: Set(st.id),
                                count: Set(*count),
                                building_count: Set(None),
                                build_end_time: Set(None),
                            }.insert(&state.db).await;
                        }
                    }
                }
            }

            // Upsert defenses into planet_defenses
            let defense_updates: &[(&str, Option<i32>)] = &[
                ("rocket_launcher", updates.rocket_launcher_count),
                ("light_laser", updates.light_laser_count),
                ("heavy_laser", updates.heavy_laser_count),
                ("gauss_cannon", updates.gauss_cannon_count),
                ("ion_cannon", updates.ion_cannon_count),
                ("plasma_turret", updates.plasma_turret_count),
                ("small_shield", updates.small_shield_count),
                ("large_shield", updates.large_shield_count),
                ("anti_missile", updates.anti_missile_count),
                ("interplanetary_missile", updates.interplanetary_missile_count),
            ];
            for (key, count_opt) in defense_updates {
                if let Some(count) = count_opt {
                    if let Ok(Some(dt)) = DefenseType::find()
                        .filter(defense_type::Column::DefenseKey.eq(*key))
                        .one(&state.db).await
                    {
                        let existing = PlanetDefense::find()
                            .filter(planet_defense::Column::PlanetId.eq(planet_id))
                            .filter(planet_defense::Column::DefenseTypeId.eq(dt.id))
                            .one(&state.db).await.unwrap_or(None);
                        if let Some(ex) = existing {
                            let mut a: planet_defense::ActiveModel = ex.into();
                            a.count = Set(*count);
                            let _ = a.update(&state.db).await;
                        } else {
                            let _ = planet_defense::ActiveModel {
                                planet_id: Set(planet_id),
                                defense_type_id: Set(dt.id),
                                count: Set(*count),
                                building_count: Set(None),
                                build_end_time: Set(None),
                                updated_at: Set(None),
                            }.insert(&state.db).await;
                        }
                    }
                }
            }

            Json(json!({
                "success": true,
                "message": "Planète mise à jour",
                "last_update": updated.last_update
            })).into_response()
        },
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
    auth: AuthUser,
) -> impl IntoResponse {
    if check_admin(auth.user_id, &state).await.is_err() {
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
    }

    // Aggregate ship and defense counts from relational tables
    let all_ships = PlanetShip::find().all(&state.db).await.unwrap_or_default();
    for s in all_ships {
        total_ships += s.count;
    }
    let all_defenses = PlanetDefense::find().all(&state.db).await.unwrap_or_default();
    for d in all_defenses {
        total_defenses += d.count;
    }

    let production_speed = if let Ok(cache) = state.config.read() {
        cache.production_speed
    } else { 250.0 };

    let stats = ServerStats {
        total_users,
        total_planets,
        total_metal,
        total_crystal,
        total_deuterium,
        total_ships,
        total_defenses,
        speed_factor: production_speed,
    };

    Json(stats).into_response()
}

// GET /admin/config - Récupérer toutes les configurations
pub async fn get_server_config_handler(
    State(state): State<AppState>,
    auth: AuthUser,
) -> impl IntoResponse {
    if check_admin(auth.user_id, &state).await.is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"})))
            .into_response();
    }

    let configs = ServerConfig::find().all(&state.db).await.unwrap_or_default();

    // Transformer en HashMap pour faciliter l'utilisation frontend
    let mut config_map = HashMap::new();
    for config in configs {
        config_map.insert(config.config_key.clone(), config.config_value.clone());
    }

    Json(config_map).into_response()
}

#[derive(Deserialize)]
pub struct ConfigUpdate {
    #[serde(flatten)]
    pub configs: HashMap<String, String>,
}

// PATCH /admin/config - Mettre à jour une ou plusieurs configurations
pub async fn update_server_config_handler(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(updates): Json<ConfigUpdate>,
) -> impl IntoResponse {
    println!("🚀 [ADMIN CONFIG] Handler called!");
    println!("🚀 [ADMIN CONFIG] Handler called with JWT auth (user: {})", auth.user_id);

    if check_admin(auth.user_id, &state).await.is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"})))
            .into_response();
    }

    println!("🔧 [ADMIN CONFIG] Received {} config updates", updates.configs.len());

    let now = Utc::now().naive_utc();
    let mut updated_count = 0;
    let mut not_found_keys = Vec::new();

    // Mettre à jour toutes les configurations fournies
    for (config_key, config_value) in updates.configs.iter() {
        println!("  📝 Updating '{}' = '{}'", config_key, config_value);

        match ServerConfig::find()
            .filter(server_config::Column::ConfigKey.eq(config_key))
            .one(&state.db)
            .await
        {
            Ok(Some(c)) => {
                let mut active: server_config::ActiveModel = c.into();
                active.config_value = Set(config_value.clone());
                active.updated_at = Set(now);

                match active.update(&state.db).await {
                    Ok(_) => {
                        println!("    ✅ Successfully updated '{}'", config_key);
                        updated_count += 1;
                    }
                    Err(e) => {
                        println!("    ❌ Failed to update '{}': {:?}", config_key, e);
                    }
                }
            }
            Ok(None) => {
                println!("    ⚠️  Config key '{}' not found in database", config_key);
                not_found_keys.push(config_key.clone());
            }
            Err(e) => {
                println!("    ❌ Database error for '{}': {:?}", config_key, e);
            }
        }
    }

    println!("✅ Updated {}/{} configs successfully", updated_count, updates.configs.len());
    if !not_found_keys.is_empty() {
        println!("⚠️  Keys not found in DB: {:?}", not_found_keys);
    }

    // Recharger le cache complet depuis la DB (v9.1 — granular speed keys)
    let new_cache = crate::ServerConfigCache::load_from_db(&state.db).await;
    let config_count = new_cache.configs.len();
    if let Ok(mut cache) = state.config.write() {
        *cache = new_cache;
        println!("🔄 Cache reloaded with {} configs", config_count);
    } else {
        println!("❌ Failed to acquire write lock on config cache");
    }

    Json(json!({
        "success": true,
        "message": format!("✅ {} configurations mises à jour", updated_count),
        "updated_count": updated_count,
        "not_found": not_found_keys
    })).into_response()
}

#[derive(Deserialize)]
pub struct RoleUpdate {
    pub role: String, // "user" ou "admin"
}

// PATCH /admin/user/:id/role - Modifier le rôle d'un utilisateur
pub async fn update_user_role_handler(
    Path(target_user_id): Path<Uuid>,
    State(state): State<AppState>,
    auth: AuthUser,
    Json(update): Json<RoleUpdate>,
) -> impl IntoResponse {
    if check_admin(auth.user_id, &state).await.is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"})))
            .into_response();
    }

    // Vérifier que le rôle est valide
    if update.role != "user" && update.role != "admin" {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Rôle invalide. Utilisez 'user' ou 'admin'"})))
            .into_response();
    }

    // Récupérer l'utilisateur cible
    let target_user = User::find_by_id(target_user_id)
        .one(&state.db)
        .await
        .unwrap_or(None);

    if target_user.is_none() {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "Utilisateur introuvable"})))
            .into_response();
    }

    let mut active: user::ActiveModel = target_user.unwrap().into();
    active.role = Set(update.role.clone());

    match active.update(&state.db).await {
        Ok(updated) => Json(json!({
            "success": true,
            "message": format!("Rôle de l'utilisateur mis à jour: {}", update.role),
            "user_id": updated.id,
            "new_role": updated.role
        })).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"})))
            .into_response(),
    }
}

#[derive(Deserialize)]
pub struct UsernameUpdate {
    pub username: String,
}

// PATCH /admin/user/:id/username - Modifier le nom d'utilisateur
pub async fn update_username_handler(
    Path(target_user_id): Path<Uuid>,
    State(state): State<AppState>,
    auth: AuthUser,
    Json(update): Json<UsernameUpdate>,
) -> impl IntoResponse {
    if check_admin(auth.user_id, &state).await.is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"})))
            .into_response();
    }

    // Vérifier que le nouveau username n'est pas vide
    if update.username.trim().is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Le nom d'utilisateur ne peut pas être vide"})))
            .into_response();
    }

    // Vérifier que le username n'est pas déjà pris
    let existing_user = User::find()
        .filter(user::Column::Username.eq(&update.username))
        .filter(user::Column::Id.ne(target_user_id))
        .one(&state.db)
        .await
        .unwrap_or(None);

    if existing_user.is_some() {
        return (StatusCode::CONFLICT, Json(json!({"error": "Ce nom d'utilisateur est déjà pris"})))
            .into_response();
    }

    // Récupérer l'utilisateur cible
    let target_user = User::find_by_id(target_user_id)
        .one(&state.db)
        .await
        .unwrap_or(None);

    if target_user.is_none() {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "Utilisateur introuvable"})))
            .into_response();
    }

    let mut active: user::ActiveModel = target_user.unwrap().into();
    active.username = Set(update.username.clone());

    match active.update(&state.db).await {
        Ok(updated) => Json(json!({
            "success": true,
            "message": format!("Nom d'utilisateur mis à jour: {}", update.username),
            "user_id": updated.id,
            "new_username": updated.username
        })).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"})))
            .into_response(),
    }
}

#[derive(Deserialize)]
pub struct EmailUpdate {
    pub email: String,
}

// PATCH /admin/user/:id/email - Modifier l'email d'un utilisateur
pub async fn update_email_handler(
    Path(target_user_id): Path<Uuid>,
    State(state): State<AppState>,
    auth: AuthUser,
    Json(update): Json<EmailUpdate>,
) -> impl IntoResponse {
    if check_admin(auth.user_id, &state).await.is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"})))
            .into_response();
    }

    // Vérifier que l'email n'est pas vide et a un format valide (basique)
    if update.email.trim().is_empty() || !update.email.contains('@') {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Email invalide"})))
            .into_response();
    }

    // Vérifier que l'email n'est pas déjà pris
    let existing_user = User::find()
        .filter(user::Column::Email.eq(&update.email))
        .filter(user::Column::Id.ne(target_user_id))
        .one(&state.db)
        .await
        .unwrap_or(None);

    if existing_user.is_some() {
        return (StatusCode::CONFLICT, Json(json!({"error": "Cet email est déjà utilisé"})))
            .into_response();
    }

    // Récupérer l'utilisateur cible
    let target_user = User::find_by_id(target_user_id)
        .one(&state.db)
        .await
        .unwrap_or(None);

    if target_user.is_none() {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "Utilisateur introuvable"})))
            .into_response();
    }

    let mut active: user::ActiveModel = target_user.unwrap().into();
    active.email = Set(update.email.clone());

    match active.update(&state.db).await {
        Ok(updated) => Json(json!({
            "success": true,
            "message": format!("Email mis à jour: {}", update.email),
            "user_id": updated.id,
            "new_email": updated.email
        })).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"})))
            .into_response(),
    }
}

#[derive(Deserialize)]
pub struct SyndicateCreditsUpdate {
    pub syndicate_credits: f64,
}

// PATCH /admin/user/:id/syndicate-credits - Modifier les SC d'un joueur
pub async fn update_syndicate_credits_handler(
    Path(target_user_id): Path<Uuid>,
    State(state): State<AppState>,
    auth: AuthUser,
    Json(update): Json<SyndicateCreditsUpdate>,
) -> impl IntoResponse {
    if check_admin(auth.user_id, &state).await.is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"}))).into_response();
    }
    let target_user = match User::find_by_id(target_user_id).one(&state.db).await.unwrap_or(None) {
        Some(u) => u,
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Utilisateur introuvable"}))).into_response(),
    };
    let new_credits = update.syndicate_credits.max(0.0);
    let mut active: user::ActiveModel = target_user.into();
    active.syndicate_credits = Set(new_credits);
    match active.update(&state.db).await {
        Ok(u) => Json(json!({"success": true, "syndicate_credits": u.syndicate_credits})).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response(),
    }
}

#[derive(Deserialize)]
pub struct PasswordReset {
    pub new_password: String,
}

// POST /admin/user/:id/reset-password - Réinitialiser le mot de passe
pub async fn reset_password_handler(
    Path(target_user_id): Path<Uuid>,
    State(state): State<AppState>,
    auth: AuthUser,
    Json(reset): Json<PasswordReset>,
) -> impl IntoResponse {
    if check_admin(auth.user_id, &state).await.is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"})))
            .into_response();
    }

    // Vérifier que le mot de passe n'est pas trop court
    if reset.new_password.len() < 6 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Le mot de passe doit contenir au moins 6 caractères"})))
            .into_response();
    }

    // Récupérer l'utilisateur cible
    let target_user = User::find_by_id(target_user_id)
        .one(&state.db)
        .await
        .unwrap_or(None);

    if target_user.is_none() {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "Utilisateur introuvable"})))
            .into_response();
    }

    // Hasher le nouveau mot de passe
    let hashed = match bcrypt::hash(&reset.new_password, bcrypt::DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur lors du hash du mot de passe"})))
            .into_response(),
    };

    let mut active: user::ActiveModel = target_user.unwrap().into();
    active.password = Set(hashed);

    match active.update(&state.db).await {
        Ok(updated) => Json(json!({
            "success": true,
            "message": format!("Mot de passe réinitialisé pour l'utilisateur {}", updated.username),
            "user_id": updated.id
        })).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"})))
            .into_response(),
    }
}

// DELETE /admin/user/:id - Supprimer un utilisateur et ses données
pub async fn delete_user_handler(
    Path(target_user_id): Path<Uuid>,
    State(state): State<AppState>,
    auth: AuthUser,
) -> impl IntoResponse {
    // Vérifier que l'admin n'essaie pas de se supprimer lui-même
    if auth.user_id == target_user_id {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Vous ne pouvez pas supprimer votre propre compte"})))
            .into_response();
    }

    if check_admin(auth.user_id, &state).await.is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"})))
            .into_response();
    }

    // Récupérer l'utilisateur cible pour vérifier qu'il existe
    let target_user = User::find_by_id(target_user_id)
        .one(&state.db)
        .await
        .unwrap_or(None);

    if target_user.is_none() {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "Utilisateur introuvable"})))
            .into_response();
    }

    let username = target_user.as_ref().unwrap().username.clone();

    // Supprimer toutes les planètes de l'utilisateur
    // Note: Les contraintes de clé étrangère CASCADE devraient gérer le reste
    let _ = Planet::delete_many()
        .filter(planet::Column::OwnerId.eq(target_user_id))
        .exec(&state.db)
        .await;

    // Supprimer l'utilisateur
    match User::delete_by_id(target_user_id).exec(&state.db).await {
        Ok(_) => Json(json!({
            "success": true,
            "message": format!("Utilisateur {} supprimé avec succès", username)
        })).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur lors de la suppression"})))
            .into_response(),
    }
}

// ==================== ANNOUNCEMENT SYSTEM ====================

// GET /announcements/active - Public endpoint for active announcements (no admin required)
pub async fn get_active_announcements_handler(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let announcements = Announcement::find()
        .filter(announcement::Column::IsActive.eq(true))
        .all(&state.db)
        .await
        .unwrap_or_default();

    Json(announcements).into_response()
}

#[derive(Deserialize)]
pub struct CreateAnnouncement {
    pub title: String,
    pub content: String,
    #[serde(rename = "type")]
    pub announcement_type: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Deserialize)]
pub struct UpdateAnnouncement {
    pub title: Option<String>,
    pub content: Option<String>,
    #[serde(rename = "type")]
    pub announcement_type: Option<String>,
    pub is_active: Option<bool>,
}

// GET /admin/announcements - List all announcements
pub async fn get_announcements_handler(
    State(state): State<AppState>,
    auth: AuthUser,
) -> impl IntoResponse {
    if check_admin(auth.user_id, &state).await.is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"})))
            .into_response();
    }

    let announcements = Announcement::find()
        .all(&state.db)
        .await
        .unwrap_or_default();

    Json(announcements).into_response()
}

// POST /admin/announcements - Create a new announcement
pub async fn create_announcement_handler(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(new_announcement): Json<CreateAnnouncement>,
) -> impl IntoResponse {
    if check_admin(auth.user_id, &state).await.is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"})))
            .into_response();
    }

    if new_announcement.title.trim().is_empty() || new_announcement.content.trim().is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Le titre et le contenu sont requis"})))
            .into_response();
    }

    let now = Utc::now().naive_utc();
    let active_announcement = announcement::ActiveModel {
        id: sea_orm::ActiveValue::NotSet,
        title: Set(new_announcement.title),
        content: Set(new_announcement.content),
        announcement_type: Set(new_announcement.announcement_type.unwrap_or_else(|| "info".to_string())),
        is_active: Set(new_announcement.is_active.unwrap_or(true)),
        created_at: Set(now),
        updated_at: Set(now),
    };

    match active_announcement.insert(&state.db).await {
        Ok(created) => Json(json!({
            "success": true,
            "message": "Annonce créée avec succès",
            "announcement": created
        })).into_response(),
        Err(e) => {
            eprintln!("❌ Error creating announcement: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur lors de la création"})))
                .into_response()
        }
    }
}

// PATCH /admin/announcements/:id - Update an announcement
pub async fn update_announcement_handler(
    Path(announcement_id): Path<i32>,
    State(state): State<AppState>,
    auth: AuthUser,
    Json(updates): Json<UpdateAnnouncement>,
) -> impl IntoResponse {
    if check_admin(auth.user_id, &state).await.is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"})))
            .into_response();
    }

    let announcement = Announcement::find_by_id(announcement_id)
        .one(&state.db)
        .await
        .unwrap_or(None);

    if announcement.is_none() {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "Annonce introuvable"})))
            .into_response();
    }

    let mut active: announcement::ActiveModel = announcement.unwrap().into();

    if let Some(title) = updates.title {
        if !title.trim().is_empty() {
            active.title = Set(title);
        }
    }

    if let Some(content) = updates.content {
        if !content.trim().is_empty() {
            active.content = Set(content);
        }
    }

    if let Some(announcement_type) = updates.announcement_type {
        active.announcement_type = Set(announcement_type);
    }

    if let Some(is_active) = updates.is_active {
        active.is_active = Set(is_active);
    }

    active.updated_at = Set(Utc::now().naive_utc());

    match active.update(&state.db).await {
        Ok(updated) => Json(json!({
            "success": true,
            "message": "Annonce mise à jour",
            "announcement": updated
        })).into_response(),
        Err(e) => {
            eprintln!("❌ Error updating announcement: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur lors de la mise à jour"})))
                .into_response()
        }
    }
}

// DELETE /admin/announcements/:id - Delete an announcement
pub async fn delete_announcement_handler(
    Path(announcement_id): Path<i32>,
    State(state): State<AppState>,
    auth: AuthUser,
) -> impl IntoResponse {
    if check_admin(auth.user_id, &state).await.is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"})))
            .into_response();
    }

    match Announcement::delete_by_id(announcement_id).exec(&state.db).await {
        Ok(_) => Json(json!({
            "success": true,
            "message": "Annonce supprimée avec succès"
        })).into_response(),
        Err(e) => {
            eprintln!("❌ Error deleting announcement: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur lors de la suppression"})))
                .into_response()
        }
    }
}

// POST /admin/broadcast - Global broadcast to all connected players
#[derive(Debug, Deserialize)]
pub struct BroadcastRequest {
    pub title: String,
    pub message: String,
    pub notif_type: Option<String>,
}

pub async fn admin_broadcast_handler(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(body): Json<BroadcastRequest>,
) -> impl IntoResponse {
    if check_admin(auth.user_id, &state).await.is_err() {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Accès refusé"})))
            .into_response();
    }

    let notif_type = body.notif_type.as_deref().unwrap_or("system").to_string();

    if let Some(ws) = &state.ws {
        // WebSocket broadcast global (joueurs connectés)
        ws.broadcast_global(WsEvent::Notification {
            notif_type: notif_type.clone(),
            title: body.title.clone(),
            message: body.message.clone(),
        }).await;

        // Notification persistante pour tous les joueurs
        if let Ok(all_users) = User::find().all(&state.db).await {
            for u in all_users {
                ws.push_notification(u.id, &notif_type, &body.title, &body.message, None).await;
            }
        }
    }

    Json(json!({
        "success": true,
        "message": "Broadcast envoyé à tous les joueurs"
    })).into_response()
}
