// ─────────────────────────────────────────────────────────────────────────────
// handlers/planets.rs — Planet handlers
//
// Extracted from main.rs (~lines 1362–2083, 2135–2283, 3612–3813, 3816–3891).
// Exposes a `router()` function to be merged into the main Axum app.
// ─────────────────────────────────────────────────────────────────────────────

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{delete, get, post},
    Router,
};
use chrono::{Duration, Utc};
use rand::Rng;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, EntityTrait,
    PaginatorTrait, QueryFilter, QueryOrder, Set,
};
use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;

use backend::{build_queue, game_logic, missions, sabotage, tech_tree, websocket, AppState};
use backend::entities::{
    prelude::{
        BuildingType, ConstructionQueue, DefenseType, Planet, PlanetBuilding, PlanetDefense,
        PlanetShip, PlanetTechnology, ResourceSlot, ShipType, Technology, User,
    },
    building_type, construction_queue, defense_type, planet, planet_building, planet_defense,
    planet_ship, planet_technology, resource_slot, ship_type, technology,
};

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

pub fn router(_state: crate::AppState) -> Router<crate::AppState> {
    Router::new()
        .route("/planets/:id", get(get_planet_handler))
        .route("/planets/:id/upgrade/:type", post(upgrade_mine_handler))
        .route("/planets/:id/rename", post(rename_planet_handler))
        .route(
            "/planets/:id/cancel-construction/:queue_id",
            delete(cancel_construction_handler),
        )
        .route("/my-planets", get(get_my_planets_handler))
        .route("/planets/:id/production-details", get(get_production_details_handler))
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload structs
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct RenamePlanetPayload {
    new_name: String,
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get building level from planet_buildings table
// ─────────────────────────────────────────────────────────────────────────────

async fn get_building_level(db: &DatabaseConnection, planet_id: Uuid, building_key: &str) -> i32 {
    let building_type = BuildingType::find()
        .filter(building_type::Column::BuildingKey.eq(building_key))
        .one(db)
        .await;

    let building_type_id = match building_type {
        Ok(Some(bt)) => bt.id,
        _ => return 0,
    };

    let planet_building = PlanetBuilding::find()
        .filter(planet_building::Column::PlanetId.eq(planet_id))
        .filter(planet_building::Column::BuildingTypeId.eq(building_type_id))
        .one(db)
        .await;

    match planet_building {
        Ok(Some(building)) => building.level,
        _ => 0,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: count ALL active builds (buildings, tech, ships, defenses)
// ─────────────────────────────────────────────────────────────────────────────

async fn count_active_builds(
    db: &DatabaseConnection,
    planet_id: Uuid,
) -> Result<u64, sea_orm::DbErr> {
    let queue_count = ConstructionQueue::find()
        .filter(construction_queue::Column::PlanetId.eq(planet_id))
        .count(db)
        .await?;

    let ship_builds = PlanetShip::find()
        .filter(planet_ship::Column::PlanetId.eq(planet_id))
        .filter(planet_ship::Column::BuildingCount.is_not_null())
        .filter(planet_ship::Column::BuildEndTime.is_not_null())
        .count(db)
        .await?;

    let defense_builds = PlanetDefense::find()
        .filter(planet_defense::Column::PlanetId.eq(planet_id))
        .filter(planet_defense::Column::BuildingCount.is_not_null())
        .filter(planet_defense::Column::BuildEndTime.is_not_null())
        .count(db)
        .await?;

    let tech_research = PlanetTechnology::find()
        .filter(planet_technology::Column::PlanetId.eq(planet_id))
        .filter(planet_technology::Column::ResearchingToLevel.is_not_null())
        .filter(planet_technology::Column::ResearchEndTime.is_not_null())
        .count(db)
        .await?;

    Ok(queue_count + ship_builds + defense_builds + tech_research)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: count unread messages for a user
// ─────────────────────────────────────────────────────────────────────────────

async fn count_unread_messages(user_id: Uuid, db: &DatabaseConnection) -> i32 {
    use backend::entities::prelude::Conversation;
    use backend::entities::conversation;

    let convs = Conversation::find()
        .filter(
            Condition::any()
                .add(conversation::Column::User1Id.eq(user_id))
                .add(conversation::Column::User2Id.eq(user_id)),
        )
        .all(db)
        .await
        .unwrap_or_default();

    let mut total_unread = 0;
    for conv in convs {
        if conv.user1_id == user_id && !conv.user1_archived {
            total_unread += conv.user1_unread_count;
        } else if conv.user2_id == user_id && !conv.user2_archived {
            total_unread += conv.user2_unread_count;
        }
    }
    total_unread
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: generate a random colony name
// ─────────────────────────────────────────────────────────────────────────────

fn generate_colony_name() -> String {
    let prefixes = ["Néo", "Alpha", "Terra", "Nova", "Proxima", "Sector", "Base", "Outpost"];
    let suffixes = ["Prime", "Secundus", "X", "Y", "Z", "Major", "Minor", "Delta", "Omicron"];
    let mut rng = rand::thread_rng();
    let prefix = prefixes[rng.gen_range(0..prefixes.len())];
    let suffix = suffixes[rng.gen_range(0..suffixes.len())];
    let num = rng.gen_range(1..999);
    format!("{} {} {}", prefix, suffix, num)
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /planets/:id
// ─────────────────────────────────────────────────────────────────────────────

async fn get_planet_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    use backend::entities::prelude::{DebrisField, FleetMission};
    use backend::entities::{debris_field, fleet_mission, resource_slot as rs_mod};
    use crate::resolve_attack_mission;

    let p = Planet::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    let now = Utc::now().naive_utc();
    let mut active: planet::ActiveModel = p.clone().into();

    // Récupérer les slots bonus (5-8) depuis la table resource_slots
    let slots = ResourceSlot::find()
        .filter(resource_slot::Column::PlanetId.eq(id))
        .filter(resource_slot::Column::SlotNumber.gte(5))
        .filter(resource_slot::Column::IsActive.eq(true))
        .filter(resource_slot::Column::IsLocked.eq(false))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let slot_1: Option<String> = slots.iter().find(|s| s.slot_number == 5).map(|s| s.resource_type.clone());
    let slot_2: Option<String> = slots.iter().find(|s| s.slot_number == 6).map(|s| s.resource_type.clone());
    let slot_3: Option<String> = slots.iter().find(|s| s.slot_number == 7).map(|s| s.resource_type.clone());
    let slot_4: Option<String> = slots.iter().find(|s| s.slot_number == 8).map(|s| s.resource_type.clone());

    let config = state.config.read().unwrap().clone();
    // Get building levels from planet_buildings
    let metal_mine_level = get_building_level(&state.db, id, "metal_mine").await;
    let crystal_mine_level = get_building_level(&state.db, id, "crystal_mine").await;
    let deuterium_mine_level = get_building_level(&state.db, id, "deuterium_mine").await;
    let solar_plant_level = get_building_level(&state.db, id, "solar_plant").await;
    let resource_storage_level = get_building_level(&state.db, id, "resource_storage").await;

    // Get tech levels from planet_technologies
    let energy_tech_level = tech_tree::get_planet_tech_level(&state.db, id, "energy_tech")
        .await
        .unwrap_or(0);

    // Calculate energy ratio
    let energy_ratio = game_logic::calculate_energy_ratio(
        solar_plant_level,
        energy_tech_level,
        metal_mine_level,
        crystal_mine_level,
        deuterium_mine_level,
        &config,
    );

    let elapsed = now.signed_duration_since(p.last_update).num_seconds();
    if elapsed > 0 {
        let production_multiplier = sabotage::get_production_multiplier(&state.db, id)
            .await
            .unwrap_or(1.0);

        let plasma_tech_level = 0;

        let base_metal = game_logic::calculate_resources_with_slots(
            game_logic::ResourceType::Metal,
            metal_mine_level,
            p.metal_amount,
            p.last_update,
            energy_tech_level,
            plasma_tech_level,
            energy_ratio,
            &slot_1,
            &slot_2,
            &slot_3,
            &slot_4,
            &config,
        );
        let base_crystal = game_logic::calculate_resources_with_slots(
            game_logic::ResourceType::Crystal,
            crystal_mine_level,
            p.crystal_amount,
            p.last_update,
            energy_tech_level,
            plasma_tech_level,
            energy_ratio,
            &slot_1,
            &slot_2,
            &slot_3,
            &slot_4,
            &config,
        );
        let base_deuterium = game_logic::calculate_resources_with_slots(
            game_logic::ResourceType::Deuterium,
            deuterium_mine_level,
            p.deuterium_amount,
            p.last_update,
            energy_tech_level,
            plasma_tech_level,
            energy_ratio,
            &slot_1,
            &slot_2,
            &slot_3,
            &slot_4,
            &config,
        );

        let production_metal = base_metal - p.metal_amount;
        let production_crystal = base_crystal - p.crystal_amount;
        let production_deuterium = base_deuterium - p.deuterium_amount;

        let biome_mults = game_logic::get_biome_multipliers(p.biome.as_deref());

        active.metal_amount = Set(p.metal_amount + (production_metal * production_multiplier * biome_mults.metal));
        active.crystal_amount = Set(p.crystal_amount + (production_crystal * production_multiplier * biome_mults.crystal));
        active.deuterium_amount = Set(p.deuterium_amount + (production_deuterium * production_multiplier * biome_mults.deuterium));

        let storage_cap = game_logic::get_storage_capacity(resource_storage_level, &config);
        let new_metal = active.metal_amount.clone().unwrap();
        let new_crystal = active.crystal_amount.clone().unwrap();
        let new_deuterium = active.deuterium_amount.clone().unwrap();

        active.metal_amount = Set(if p.metal_amount >= storage_cap {
            p.metal_amount
        } else {
            new_metal.min(storage_cap)
        });

        active.crystal_amount = Set(if p.crystal_amount >= storage_cap {
            p.crystal_amount
        } else {
            new_crystal.min(storage_cap)
        });

        active.deuterium_amount = Set(if p.deuterium_amount >= storage_cap {
            p.deuterium_amount
        } else {
            new_deuterium.min(storage_cap)
        });

        active.last_update = Set(now);

        let produced_metal = active.metal_amount.clone().unwrap() - p.metal_amount;
        if produced_metal > 0.0 {
            missions::update_mission_progress(&state, p.owner_id, "collect", "metal", produced_metal as i32).await;
            missions::update_achievement_progress(&state, p.owner_id, "total_metal", produced_metal as i32).await;
        }
    }

    let finished = ConstructionQueue::find()
        .filter(construction_queue::Column::PlanetId.eq(p.id))
        .filter(construction_queue::Column::EndTime.lte(now))
        .all(&state.db)
        .await
        .unwrap_or_default();

    for item in finished {
        let is_ship_or_defense = matches!(
            item.building_type.as_str(),
            "light_hunter" | "cruiser" | "missile_launcher" | "plasma_turret" |
            "spy_probe" | "transporter" | "colony_ship" | "recycler" |
            "heavy_hunter" | "battleship" | "bomber" | "destroyer" |
            "light_laser" | "heavy_laser" | "gauss_cannon" | "ion_cannon" |
            "small_shield" | "large_shield"
        );

        let tech = Technology::find()
            .filter(technology::Column::TechKey.eq(&item.building_type))
            .one(&state.db)
            .await
            .ok()
            .flatten();

        if let Some(tech_data) = tech {
            let existing = PlanetTechnology::find()
                .filter(planet_technology::Column::PlanetId.eq(p.id))
                .filter(planet_technology::Column::TechId.eq(tech_data.id))
                .one(&state.db)
                .await
                .ok()
                .flatten();

            if let Some(existing_tech) = existing {
                let mut tech_active: planet_technology::ActiveModel = existing_tech.into();
                tech_active.current_level = Set(item.level);
                let _ = tech_active.update(&state.db).await;
            } else {
                let new_tech = planet_technology::ActiveModel {
                    planet_id: Set(p.id),
                    tech_id: Set(tech_data.id),
                    current_level: Set(item.level),
                    researching_to_level: Set(None),
                    research_end_time: Set(None),
                };
                let _ = new_tech.insert(&state.db).await;
            }
        } else if !is_ship_or_defense {
            let building = BuildingType::find()
                .filter(building_type::Column::BuildingKey.eq(&item.building_type))
                .one(&state.db)
                .await
                .ok()
                .flatten();

            if let Some(building_data) = building {
                let existing = PlanetBuilding::find()
                    .filter(planet_building::Column::PlanetId.eq(p.id))
                    .filter(planet_building::Column::BuildingTypeId.eq(building_data.id))
                    .one(&state.db)
                    .await
                    .ok()
                    .flatten();

                if let Some(existing_building) = existing {
                    let mut building_active: planet_building::ActiveModel = existing_building.into();
                    building_active.level = Set(item.level);
                    building_active.upgrading_to_level = Set(None);
                    building_active.upgrade_end_time = Set(None);
                    let _ = building_active.update(&state.db).await;
                } else {
                    let new_building = planet_building::ActiveModel {
                        planet_id: Set(p.id),
                        building_type_id: Set(building_data.id),
                        level: Set(item.level),
                        upgrading_to_level: Set(None),
                        upgrade_end_time: Set(None),
                        updated_at: Set(Some(now)),
                    };
                    let _ = new_building.insert(&state.db).await;
                }
            }
        } else {
            // Ships and Defenses
            let ship = ShipType::find()
                .filter(ship_type::Column::ShipKey.eq(&item.building_type))
                .one(&state.db)
                .await
                .ok()
                .flatten();

            if let Some(ship_data) = ship {
                let existing = PlanetShip::find()
                    .filter(planet_ship::Column::PlanetId.eq(p.id))
                    .filter(planet_ship::Column::ShipTypeId.eq(ship_data.id))
                    .one(&state.db)
                    .await
                    .ok()
                    .flatten();

                if let Some(existing_ship) = existing {
                    let mut ship_active: planet_ship::ActiveModel = existing_ship.into();
                    ship_active.count = Set(ship_active.count.unwrap() + item.level);
                    let _ = ship_active.update(&state.db).await;
                } else {
                    let new_ship = planet_ship::ActiveModel {
                        planet_id: Set(p.id),
                        ship_type_id: Set(ship_data.id),
                        count: Set(item.level),
                        building_count: Set(None),
                        build_end_time: Set(None),
                    };
                    let _ = new_ship.insert(&state.db).await;
                }
            }

            let defense = DefenseType::find()
                .filter(defense_type::Column::DefenseKey.eq(&item.building_type))
                .one(&state.db)
                .await
                .ok()
                .flatten();

            if let Some(defense_data) = defense {
                let existing = PlanetDefense::find()
                    .filter(planet_defense::Column::PlanetId.eq(p.id))
                    .filter(planet_defense::Column::DefenseTypeId.eq(defense_data.id))
                    .one(&state.db)
                    .await
                    .ok()
                    .flatten();

                if let Some(existing_defense) = existing {
                    let mut defense_active: planet_defense::ActiveModel = existing_defense.into();
                    defense_active.count = Set(defense_active.count.unwrap() + item.level);
                    let _ = defense_active.update(&state.db).await;
                } else {
                    let new_defense = planet_defense::ActiveModel {
                        planet_id: Set(p.id),
                        defense_type_id: Set(defense_data.id),
                        count: Set(item.level),
                        building_count: Set(None),
                        build_end_time: Set(None),
                        updated_at: Set(Some(now)),
                    };
                    let _ = new_defense.insert(&state.db).await;
                }
            }
        }

        // Notification WebSocket — Construction/Production terminée
        if let Some(ref ws) = state.ws {
            if is_ship_or_defense {
                websocket::notify_ship_complete(ws, p.id, &item.building_type, item.level);
                ws.push_notification(
                    p.owner_id,
                    "build",
                    "Production terminée",
                    &format!("{}x {} prêts au combat.", item.level, item.building_type),
                )
                .await;
            } else {
                websocket::notify_construction_complete(ws, p.id, &item.building_type, item.level);
                ws.push_notification(
                    p.owner_id,
                    "build",
                    "Construction terminée",
                    &format!("{} niveau {} opérationnel.", item.building_type, item.level),
                )
                .await;
            }
        }

        // Mise à jour missions quotidiennes
        if is_ship_or_defense {
            missions::update_mission_progress(&state, p.owner_id, "build", &item.building_type, item.level).await;
            missions::update_achievement_progress(&state, p.owner_id, "buildings", item.level).await;
            let is_ship = matches!(
                item.building_type.as_str(),
                "light_hunter" | "cruiser" | "spy_probe" | "transporter" | "colony_ship" |
                "recycler" | "heavy_hunter" | "battleship" | "bomber" | "destroyer"
            );
            if is_ship {
                let ship_counts = tech_tree::get_all_planet_ship_counts(&state.db, p.id)
                    .await
                    .unwrap_or_default();
                let total_ships: i32 = ship_counts.values().sum();
                missions::update_achievement_progress(&state, p.owner_id, "total_ships", total_ships).await;
            }
        } else {
            missions::update_mission_progress(&state, p.owner_id, "upgrade", "any", 1).await;
            missions::update_achievement_progress(&state, p.owner_id, "buildings", 1).await;
        }

        let _ = ConstructionQueue::delete_by_id(item.id).exec(&state.db).await;
    }

    let arrived = FleetMission::find()
        .filter(
            Condition::any()
                .add(fleet_mission::Column::TargetPlanetId.eq(id))
                .add(fleet_mission::Column::SourcePlanetId.eq(id)),
        )
        .filter(fleet_mission::Column::ArrivalTime.lte(now))
        .all(&state.db)
        .await
        .unwrap_or_default();

    for m in arrived {
        if m.mission_type == "attack" {
            let config = state.config.read().unwrap().clone();
            let _ = resolve_attack_mission(&state, m, state.ws.as_ref(), &config).await;
        } else if m.mission_type == "transport" {
            let source_planet_name =
                if let Ok(Some(sp)) = Planet::find_by_id(m.source_planet_id).one(&state.db).await {
                    sp.name.clone()
                } else {
                    "Inconnue".to_string()
                };

            if m.target_planet_id == id {
                active.metal_amount = Set(active.metal_amount.clone().unwrap() + m.metal);
                active.crystal_amount = Set(active.crystal_amount.clone().unwrap() + m.crystal);
                active.deuterium_amount = Set(active.deuterium_amount.clone().unwrap() + m.deuterium);
            } else {
                if let Ok(Some(target_planet)) = Planet::find_by_id(m.target_planet_id).one(&state.db).await {
                    let mut target_active: planet::ActiveModel = target_planet.clone().into();
                    target_active.metal_amount = Set(target_planet.metal_amount + m.metal);
                    target_active.crystal_amount = Set(target_planet.crystal_amount + m.crystal);
                    target_active.deuterium_amount = Set(target_planet.deuterium_amount + m.deuterium);
                    let _ = target_active.update(&state.db).await;
                }
            }

            if let Some(ref ws) = state.ws {
                websocket::notify_transport_arrived(
                    ws,
                    m.target_planet_id,
                    &source_planet_name,
                    m.metal,
                    m.crystal,
                    m.deuterium,
                );
            }

            let _ = tech_tree::add_ships(&state.db, m.source_planet_id, "transporter", m.ships_count).await;
            let _ = FleetMission::delete_by_id(m.id).exec(&state.db).await;
        } else if m.mission_type == "recycle" {
            // Les recycleurs reviennent à la source avec les débris collectés
            if let Some(fleet_data_str) = &m.fleet_data {
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(fleet_data_str) {
                    let tg = data["galaxy"].as_i64().unwrap_or(1) as i32;
                    let ts = data["system"].as_i64().unwrap_or(1) as i32;
                    let tp = data["position"].as_i64().unwrap_or(1) as i32;

                    if let Ok(Some(debris)) = DebrisField::find()
                        .filter(debris_field::Column::Galaxy.eq(tg))
                        .filter(debris_field::Column::System.eq(ts))
                        .filter(debris_field::Column::Position.eq(tp))
                        .one(&state.db)
                        .await
                    {
                        let capacity = m.recyclers_sent as f64 * 20000.0;
                        let mut remaining = capacity;

                        let take_m = f64::min(debris.metal, remaining);
                        remaining -= take_m;
                        let take_c = f64::min(debris.crystal, remaining);

                        let new_metal = debris.metal - take_m;
                        let new_crystal = debris.crystal - take_c;

                        if new_metal <= 0.0 && new_crystal <= 0.0 {
                            let _ = DebrisField::delete_by_id(debris.id).exec(&state.db).await;
                        } else {
                            let mut da: debris_field::ActiveModel = debris.into();
                            da.metal = Set(new_metal);
                            da.crystal = Set(new_crystal);
                            da.updated_at = Set(chrono::Utc::now().fixed_offset());
                            let _ = da.update(&state.db).await;
                        }

                        // Créditer les ressources collectées à la planète source
                        active.metal_amount = Set(active.metal_amount.clone().unwrap() + take_m);
                        active.crystal_amount = Set(active.crystal_amount.clone().unwrap() + take_c);

                        // Notification WS — recycleurs de retour
                        if let Some(ref ws) = state.ws {
                            ws.push_notification(
                                p.owner_id,
                                "fleet",
                                "Recycleurs de retour",
                                &format!(
                                    "{}x recycleur(s) de retour en [{}:{}:{}] : +{} M, +{} C",
                                    m.recyclers_sent, tg, ts, tp, take_m as i64, take_c as i64,
                                ),
                            )
                            .await;
                        }
                    } else {
                        // Débris introuvables (déjà collectés) — recycleurs reviennent vides
                        if let Some(ref ws) = state.ws {
                            ws.push_notification(
                                p.owner_id,
                                "fleet",
                                "Recycleurs de retour",
                                &format!("{}x recycleur(s) revenu(s) : débris déjà collectés.", m.recyclers_sent),
                            )
                            .await;
                        }
                    }
                }
            }
            // Retourner les recycleurs
            let _ = tech_tree::add_ships(&state.db, id, "recycler", m.recyclers_sent).await;
            let _ = FleetMission::delete_by_id(m.id).exec(&state.db).await;
        } else if m.mission_type == "colonize" {
            if let Some(fleet_data_str) = &m.fleet_data {
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(fleet_data_str) {
                    let target_galaxy = data["target_galaxy"].as_i64().unwrap_or(1) as i32;
                    let target_system = data["target_system"].as_i64().unwrap_or(1) as i32;
                    let target_position = data["target_position"].as_i64().unwrap_or(1) as i32;
                    let metal = data["metal"].as_f64().unwrap_or(0.0);
                    let crystal = data["crystal"].as_f64().unwrap_or(0.0);
                    let deuterium = data["deuterium"].as_f64().unwrap_or(0.0);
                    let owner_id_str = data["owner_id"].as_str().unwrap_or("");
                    let password = data["password"].as_str().unwrap_or("").to_string();

                    let exists = Planet::find()
                        .filter(planet::Column::Galaxy.eq(target_galaxy))
                        .filter(planet::Column::System.eq(target_system))
                        .filter(planet::Column::Position.eq(target_position))
                        .one(&state.db)
                        .await
                        .unwrap();

                    if exists.is_none() {
                        let owner_id = Uuid::parse_str(owner_id_str).unwrap_or_default();
                        let colony_name = generate_colony_name();
                        let new_id = Uuid::new_v4();

                        let colony_now = Utc::now().naive_utc();
                        let colony_biome = game_logic::random_biome();
                        let new_planet = planet::ActiveModel {
                            id: Set(new_id),
                            owner_id: Set(owner_id),
                            name: Set(colony_name.clone()),
                            password: Set(password),
                            galaxy: Set(target_galaxy),
                            system: Set(target_system),
                            position: Set(target_position),
                            metal_amount: Set(500.0 + metal),
                            crystal_amount: Set(500.0 + crystal),
                            deuterium_amount: Set(deuterium),
                            last_update: Set(colony_now),
                            created_at: Set(colony_now),
                            is_homeworld: Set(false),
                            biome: Set(Some(colony_biome.to_string())),
                            ..Default::default()
                        };
                        let _ = new_planet.insert(&state.db).await;

                        let initial_colony_buildings = vec![
                            ("metal", 1i32),
                            ("crystal", 1),
                            ("deuterium", 1),
                            ("solar_plant", 3),
                        ];
                        for (bkey, blevel) in initial_colony_buildings {
                            if let Ok(Some(bt)) = BuildingType::find()
                                .filter(building_type::Column::BuildingKey.eq(bkey))
                                .one(&state.db)
                                .await
                            {
                                let _ = planet_building::ActiveModel {
                                    planet_id: Set(new_id),
                                    building_type_id: Set(bt.id),
                                    level: Set(blevel),
                                    upgrading_to_level: Set(None),
                                    upgrade_end_time: Set(None),
                                    updated_at: Set(Some(colony_now)),
                                }
                                .insert(&state.db)
                                .await;
                            }
                        }

                        let slots_init = vec![
                            (1, "metal", 1, true),
                            (2, "crystal", 1, true),
                            (3, "deuterium", 1, true),
                            (4, "energy", 0, true),
                            (5, "metal", 0, false),
                            (6, "metal", 0, false),
                            (7, "metal", 0, false),
                            (8, "metal", 0, false),
                        ];

                        for (slot_num, res_type, level, is_locked) in slots_init {
                            let slot = rs_mod::ActiveModel {
                                planet_id: Set(new_id),
                                slot_number: Set(slot_num),
                                resource_type: Set(res_type.to_string()),
                                level: Set(level),
                                is_locked: Set(is_locked),
                                is_active: Set(is_locked),
                                ..Default::default()
                            };
                            let _ = slot.insert(&state.db).await;
                        }

                        println!(
                            "🌍 Colonisation réussie: {} en [{}:{}:{}]",
                            colony_name, target_galaxy, target_system, target_position
                        );

                        if let Some(ref ws) = state.ws {
                            let coords_str = format!(
                                "[{}:{}:{}]",
                                target_galaxy, target_system, target_position
                            );
                            websocket::notify_colony_founded(ws, owner_id, &colony_name, &coords_str).await;
                        }
                    } else {
                        println!(
                            "❌ Colonisation échouée: [{}:{}:{}] est maintenant occupé",
                            target_galaxy, target_system, target_position
                        );
                    }
                }
            }

            let _ = FleetMission::delete_by_id(m.id).exec(&state.db).await;
        }
    }

    let incoming_raw = FleetMission::find()
        .filter(fleet_mission::Column::TargetPlanetId.eq(id))
        .all(&state.db)
        .await
        .unwrap_or_default();
    let outgoing_raw = FleetMission::find()
        .filter(fleet_mission::Column::SourcePlanetId.eq(id))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let mut incoming_detailed = Vec::new();
    for m in &incoming_raw {
        let source_p = Planet::find_by_id(m.source_planet_id)
            .one(&state.db)
            .await
            .ok()
            .flatten();
        let mut val = serde_json::to_value(&m).unwrap();
        if let Some(sp) = source_p {
            if let Some(obj) = val.as_object_mut() {
                obj.insert("source_name".into(), json!(sp.name));
                obj.insert(
                    "source_coords".into(),
                    json!(format!("[{}:{}:{}]", sp.galaxy, sp.system, sp.position)),
                );
                if let Ok(Some(owner)) = User::find_by_id(sp.owner_id).one(&state.db).await {
                    obj.insert("attacker_name".into(), json!(owner.username));
                }
            }
        }
        incoming_detailed.push(val);
    }

    let mut outgoing_detailed = Vec::new();
    for m in outgoing_raw {
        let target_p = Planet::find_by_id(m.target_planet_id)
            .one(&state.db)
            .await
            .ok()
            .flatten();
        let mut val = serde_json::to_value(&m).unwrap();
        if let Some(tp) = target_p {
            if let Some(obj) = val.as_object_mut() {
                obj.insert("target_name".into(), json!(tp.name));
                obj.insert(
                    "coords".into(),
                    json!(format!("[{}:{}:{}]", tp.galaxy, tp.system, tp.position)),
                );
            }
        }
        outgoing_detailed.push(val);
    }

    let updated_model = active
        .update(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let energy_prod = game_logic::calculate_energy_production_with_slots(
        solar_plant_level,
        energy_tech_level,
        &slot_1,
        &slot_2,
        &slot_3,
        &slot_4,
        &config,
    );
    let energy_cons = game_logic::calculate_energy_consumption(
        metal_mine_level,
        crystal_mine_level,
        deuterium_mine_level,
        &config,
    );
    let energy_ratio_percent = (energy_ratio * 100.0) as i32;

    let next_slot = game_logic::get_next_slot_to_unlock(&slot_1, &slot_2, &slot_3, &slot_4);
    let next_slot_cost = next_slot.map(|slot| game_logic::get_slot_unlock_cost(slot, &config));

    let unread_messages = count_unread_messages(p.owner_id, &state.db).await;

    // Calcul de la production horaire (nécessaire pour EmpireBar)
    let plasma_tech_level = tech_tree::get_planet_tech_level(&state.db, id, "plasma_tech").await.unwrap_or(0);
    let metal_production = game_logic::calculate_resource_production(
        game_logic::ResourceType::Metal, metal_mine_level, energy_tech_level, plasma_tech_level, energy_ratio, &config,
    );
    let crystal_production = game_logic::calculate_resource_production(
        game_logic::ResourceType::Crystal, crystal_mine_level, energy_tech_level, plasma_tech_level, energy_ratio, &config,
    );
    let deuterium_production = game_logic::calculate_resource_production(
        game_logic::ResourceType::Deuterium, deuterium_mine_level, energy_tech_level, plasma_tech_level, energy_ratio, &config,
    );

    let mut json_response = serde_json::to_value(&updated_model).unwrap();
    if let Some(obj) = json_response.as_object_mut() {
        obj.insert("incoming_missions".into(), json!(incoming_detailed));
        obj.insert("outgoing_missions".into(), json!(outgoing_detailed));
        obj.insert("energy".into(), json!(energy_prod as i32 - energy_cons as i32));
        obj.insert("energy_production".into(), json!(energy_prod as i32));
        obj.insert("energy_consumption".into(), json!(energy_cons as i32));
        obj.insert("energy_ratio".into(), json!(energy_ratio_percent));
        obj.insert("metal_production".into(), json!(metal_production as i32));
        obj.insert("crystal_production".into(), json!(crystal_production as i32));
        obj.insert("deuterium_production".into(), json!(deuterium_production as i32));
        obj.insert("unread_messages".into(), json!(unread_messages));

        let active_queue = ConstructionQueue::find()
            .filter(construction_queue::Column::PlanetId.eq(p.id))
            .order_by_asc(construction_queue::Column::EndTime)
            .all(&state.db)
            .await
            .unwrap_or_default();
        obj.insert("constructions".into(), json!(active_queue));

        // Active ship builds
        let active_ship_builds = PlanetShip::find()
            .filter(planet_ship::Column::PlanetId.eq(p.id))
            .filter(planet_ship::Column::BuildingCount.is_not_null())
            .filter(planet_ship::Column::BuildEndTime.is_not_null())
            .all(&state.db)
            .await
            .unwrap_or_default();

        let mut enriched_ship_builds = Vec::new();
        for build in active_ship_builds {
            if let Some(ship_type) = ShipType::find_by_id(build.ship_type_id)
                .one(&state.db)
                .await
                .unwrap_or(None)
            {
                let end_time_str = build
                    .build_end_time
                    .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string());
                enriched_ship_builds.push(json!({
                    "ship_key": ship_type.ship_key,
                    "name": ship_type.display_name,
                    "building_count": build.building_count,
                    "build_end_time": end_time_str,
                }));
            }
        }
        obj.insert("ship_builds".into(), json!(enriched_ship_builds));

        // Active defense builds
        let active_defense_builds = PlanetDefense::find()
            .filter(planet_defense::Column::PlanetId.eq(p.id))
            .filter(planet_defense::Column::BuildingCount.is_not_null())
            .filter(planet_defense::Column::BuildEndTime.is_not_null())
            .all(&state.db)
            .await
            .unwrap_or_default();

        let mut enriched_defense_builds = Vec::new();
        for build in active_defense_builds {
            if let Some(defense_type) = DefenseType::find_by_id(build.defense_type_id)
                .one(&state.db)
                .await
                .unwrap_or(None)
            {
                let end_time_str = build
                    .build_end_time
                    .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string());
                enriched_defense_builds.push(json!({
                    "defense_key": defense_type.defense_key,
                    "name": defense_type.name,
                    "building_count": build.building_count,
                    "build_end_time": end_time_str,
                }));
            }
        }
        obj.insert("defense_builds".into(), json!(enriched_defense_builds));

        // Active research
        let active_research = PlanetTechnology::find()
            .filter(planet_technology::Column::PlanetId.eq(p.id))
            .filter(planet_technology::Column::ResearchingToLevel.is_not_null())
            .all(&state.db)
            .await
            .unwrap_or_default();

        let mut research_queue = Vec::new();
        for research in active_research {
            if let Some(tech) = Technology::find_by_id(research.tech_id)
                .one(&state.db)
                .await
                .unwrap_or(None)
            {
                research_queue.push(json!({
                    "tech_key": tech.tech_key,
                    "target_level": research.researching_to_level,
                    "end_time": research.research_end_time.map(|t| t.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string())
                }));
            }
        }
        obj.insert("research_queue".into(), json!(research_queue));

        // Slot info
        obj.insert("next_slot_to_unlock".into(), json!(next_slot));
        if let Some(cost) = next_slot_cost {
            obj.insert(
                "next_slot_cost".into(),
                json!({
                    "metal": cost.metal,
                    "crystal": cost.crystal,
                    "deuterium": cost.deuterium
                }),
            );
        }

        let metal_slots = game_logic::count_slots_for_resource(&slot_1, &slot_2, &slot_3, &slot_4, "metal");
        let crystal_slots = game_logic::count_slots_for_resource(&slot_1, &slot_2, &slot_3, &slot_4, "crystal");
        let energy_slots = game_logic::count_slots_for_resource(&slot_1, &slot_2, &slot_3, &slot_4, "energy");
        let deuterium_slots = game_logic::count_slots_for_resource(&slot_1, &slot_2, &slot_3, &slot_4, "deuterium");

        obj.insert(
            "slot_bonuses".into(),
            json!({
                "metal": format!("+{}%", metal_slots * 50),
                "crystal": format!("+{}%", crystal_slots * 50),
                "energy": format!("+{}%", energy_slots * 50),
                "deuterium": format!("+{}%", deuterium_slots * 50)
            }),
        );

        // Biome
        let biome_key = updated_model.biome.as_deref().unwrap_or("tellurique");
        let biome_mults = game_logic::get_biome_multipliers(Some(biome_key));
        obj.insert(
            "biome".into(),
            json!({
                "key": biome_key,
                "name": game_logic::biome_display_name(biome_key),
                "description": game_logic::biome_description(biome_key),
                "metal_mult": biome_mults.metal,
                "crystal_mult": biome_mults.crystal,
                "deuterium_mult": biome_mults.deuterium,
            }),
        );

        // Relational tech tree and ship data
        if let Ok(building_levels) = tech_tree::get_all_planet_building_levels(&state.db, updated_model.id).await {
            obj.insert("buildings".into(), json!(building_levels));
        }
        if let Ok(tech_levels) = tech_tree::get_all_planet_tech_levels(&state.db, updated_model.id).await {
            obj.insert("technologies".into(), json!(tech_levels));
        }
        if let Ok(ship_details) = tech_tree::get_all_planet_ship_details(&state.db, updated_model.id).await {
            obj.insert("ships".into(), json!(ship_details));
        }
        if let Ok(defense_details) = tech_tree::get_all_planet_defense_details(&state.db, updated_model.id).await {
            obj.insert("defenses".into(), json!(defense_details));
        }

        let hangar_lvl = tech_tree::get_planet_building_level(&state.db, updated_model.id, "hangar")
            .await
            .unwrap_or(0);
        let fleet_cap = game_logic::get_fleet_capacity(hangar_lvl, &config);
        obj.insert("fleet_capacity".into(), json!(fleet_cap));
    }

    Ok(Json(json_response))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /planets/:id/upgrade/:type
// ─────────────────────────────────────────────────────────────────────────────

async fn upgrade_mine_handler(
    Path((id, type_mine)): Path<(Uuid, String)>,
    State(state): State<AppState>,
) -> Result<StatusCode, StatusCode> {
    let p = Planet::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    let config = state.config.read().unwrap().clone();

    let _build_guard = build_queue::acquire_planet_build_lock_pub(&state, p.id).await;

    let bld_category = build_queue::building_category(&type_mine);
    let category_slots = build_queue::get_category_slots(&state.db, &config, p.id, bld_category).await;
    let active_in_cat = build_queue::count_active_in_category(&state.db, p.id, bld_category)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if active_in_cat >= category_slots as i64 {
        return Err(StatusCode::CONFLICT);
    }

    let in_queue_count = ConstructionQueue::find()
        .filter(construction_queue::Column::PlanetId.eq(p.id))
        .filter(construction_queue::Column::BuildingType.eq(&type_mine))
        .count(&state.db)
        .await
        .unwrap_or(0);

    let tech = Technology::find()
        .filter(technology::Column::TechKey.eq(&type_mine))
        .one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let (base_level, cost, facility_level, is_research) = if let Some(tech_data) = tech {
        let current_level = tech_tree::get_planet_tech_level(&state.db, p.id, &type_mine)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let target_level = current_level + (in_queue_count as i32) + 1;
        let _ = target_level;

        let can_research = tech_tree::can_research_tech(&state.db, p.id, &type_mine)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        if current_level == 0 && !can_research {
            return Err(StatusCode::BAD_REQUEST);
        }

        let metal = tech_tree::calculate_tech_cost(tech_data.base_cost_metal, tech_data.cost_multiplier, current_level);
        let crystal = tech_tree::calculate_tech_cost(tech_data.base_cost_crystal, tech_data.cost_multiplier, current_level);
        let deuterium = tech_tree::calculate_tech_cost(tech_data.base_cost_deuterium, tech_data.cost_multiplier, current_level);

        let cost = game_logic::Cost {
            metal: metal as f64,
            crystal: crystal as f64,
            deuterium: deuterium as f64,
        };

        let research_lab_level = tech_tree::get_planet_building_level(&state.db, p.id, "research_lab")
            .await
            .unwrap_or(0);
        (current_level, cost, research_lab_level, true)
    } else {
        let building = BuildingType::find()
            .filter(building_type::Column::BuildingKey.eq(&type_mine))
            .one(&state.db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        if let Some(building_data) = building {
            let current_level = tech_tree::get_planet_building_level(&state.db, p.id, &type_mine)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            let target_level = current_level + (in_queue_count as i32) + 1;
            let _ = target_level;

            let can_build = tech_tree::can_build_building(&state.db, p.id, &type_mine)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            if current_level == 0 && !can_build {
                return Err(StatusCode::BAD_REQUEST);
            }

            let metal = tech_tree::calculate_building_cost(
                building_data.base_cost_metal,
                building_data.cost_multiplier,
                current_level,
            );
            let crystal = tech_tree::calculate_building_cost(
                building_data.base_cost_crystal,
                building_data.cost_multiplier,
                current_level,
            );
            let deuterium = tech_tree::calculate_building_cost(
                building_data.base_cost_deuterium,
                building_data.cost_multiplier,
                current_level,
            );

            let cost = game_logic::Cost {
                metal: metal as f64,
                crystal: crystal as f64,
                deuterium: deuterium as f64,
            };

            let shipyard_level = tech_tree::get_planet_building_level(&state.db, p.id, "shipyard")
                .await
                .unwrap_or(0);
            (current_level, cost, shipyard_level, false)
        } else {
            return Err(StatusCode::BAD_REQUEST);
        }
    };

    // Block queuing the same technology multiple times
    if is_research && in_queue_count >= 1 {
        return Err(StatusCode::CONFLICT);
    }

    let target_level = base_level + (in_queue_count as i32) + 1;

    // Recalculer les ressources depuis la dernière mise à jour du tick
    // (évite les faux "ressources insuffisantes" dus aux données périmées en DB)
    let now_utc = Utc::now().naive_utc();
    let (current_metal, current_crystal, current_deuterium) = {
        let elapsed = now_utc.signed_duration_since(p.last_update).num_seconds();
        if elapsed > 0 {
            let slots = ResourceSlot::find()
                .filter(resource_slot::Column::PlanetId.eq(p.id))
                .filter(resource_slot::Column::SlotNumber.gte(5))
                .filter(resource_slot::Column::IsActive.eq(true))
                .filter(resource_slot::Column::IsLocked.eq(false))
                .all(&state.db).await.unwrap_or_default();
            let slot_1 = slots.iter().find(|s| s.slot_number == 5).map(|s| s.resource_type.clone());
            let slot_2 = slots.iter().find(|s| s.slot_number == 6).map(|s| s.resource_type.clone());
            let slot_3 = slots.iter().find(|s| s.slot_number == 7).map(|s| s.resource_type.clone());
            let slot_4 = slots.iter().find(|s| s.slot_number == 8).map(|s| s.resource_type.clone());

            let metal_lv    = get_building_level(&state.db, p.id, "metal_mine").await;
            let crystal_lv  = get_building_level(&state.db, p.id, "crystal_mine").await;
            let deut_lv     = get_building_level(&state.db, p.id, "deuterium_mine").await;
            let solar_lv    = get_building_level(&state.db, p.id, "solar_plant").await;
            let energy_tech = tech_tree::get_planet_tech_level(&state.db, p.id, "energy_tech").await.unwrap_or(0);
            let energy_ratio = game_logic::calculate_energy_ratio(solar_lv, energy_tech, metal_lv, crystal_lv, deut_lv, &config);

            let m = game_logic::calculate_resources_with_slots(
                game_logic::ResourceType::Metal, metal_lv, p.metal_amount,
                p.last_update, energy_tech, 0, energy_ratio,
                &slot_1, &slot_2, &slot_3, &slot_4, &config);
            let c = game_logic::calculate_resources_with_slots(
                game_logic::ResourceType::Crystal, crystal_lv, p.crystal_amount,
                p.last_update, energy_tech, 0, energy_ratio,
                &slot_1, &slot_2, &slot_3, &slot_4, &config);
            let d = game_logic::calculate_resources_with_slots(
                game_logic::ResourceType::Deuterium, deut_lv, p.deuterium_amount,
                p.last_update, energy_tech, 0, energy_ratio,
                &slot_1, &slot_2, &slot_3, &slot_4, &config);
            (m, c, d)
        } else {
            (p.metal_amount, p.crystal_amount, p.deuterium_amount)
        }
    };

    if current_metal < cost.metal || current_crystal < cost.crystal || current_deuterium < cost.deuterium {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Recherches : utiliser get_research_time (réduit par niveau de labo)
    // Bâtiments : utiliser get_build_time (réduit par niveau de chantier)
    let mut build_time = if is_research {
        game_logic::get_research_time(cost.metal, cost.crystal, facility_level, &config)
    } else {
        game_logic::get_build_time(cost.metal, cost.crystal, facility_level, &config)
    };

    if is_research {
        let research_bonus = sabotage::apply_research_bonus(&state.db, p.owner_id)
            .await
            .unwrap_or(1.0);
        build_time = (build_time as f64 * research_bonus) as i64;
    }

    let mut active: planet::ActiveModel = p.clone().into();
    active.metal_amount = Set(current_metal - cost.metal);
    active.crystal_amount = Set(current_crystal - cost.crystal);
    active.deuterium_amount = Set(current_deuterium - cost.deuterium);
    active.last_update = Set(now_utc);
    active
        .update(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let queue_item = construction_queue::ActiveModel {
        id: Set(Uuid::new_v4()),
        planet_id: Set(p.id),
        building_type: Set(type_mine),
        level: Set(target_level),
        end_time: Set(Utc::now().naive_utc() + Duration::seconds(build_time)),
    };

    queue_item
        .insert(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /planets/:id/rename
// ─────────────────────────────────────────────────────────────────────────────

async fn rename_planet_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<RenamePlanetPayload>,
) -> impl IntoResponse {
    let p_opt = Planet::find_by_id(id).one(&state.db).await.unwrap();
    if let Some(p) = p_opt {
        if payload.new_name.trim().is_empty() || payload.new_name.len() > 20 {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "Nom invalide"}))).into_response();
        }
        let mut active: planet::ActiveModel = p.into();
        active.name = Set(payload.new_name);
        let _ = active.update(&state.db).await;
        return StatusCode::OK.into_response();
    }
    StatusCode::NOT_FOUND.into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /planets/:id/cancel-construction/:queue_id
// ─────────────────────────────────────────────────────────────────────────────

async fn cancel_construction_handler(
    Path((planet_id, queue_id)): Path<(Uuid, Uuid)>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, StatusCode> {
    let item = ConstructionQueue::find_by_id(queue_id)
        .one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    if item.planet_id != planet_id {
        return Err(StatusCode::FORBIDDEN);
    }
    let p = Planet::find_by_id(planet_id)
        .one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    let config = state.config.read().unwrap().clone();

    // Try DB lookup for ships first, then defenses, then building/tech formula
    let (base_m, base_c, base_d, is_ship_unit, is_defense_unit) = {
        if let Ok(Some(st)) = ShipType::find()
            .filter(ship_type::Column::ShipKey.eq(&item.building_type))
            .one(&state.db)
            .await
        {
            let qty = item.level as f64;
            (st.cost_metal as f64 * qty, st.cost_crystal as f64 * qty, st.cost_deuterium as f64 * qty, true, false)
        } else if let Ok(Some(dt)) = DefenseType::find()
            .filter(defense_type::Column::DefenseKey.eq(&item.building_type))
            .one(&state.db)
            .await
        {
            let qty = item.level as f64;
            (dt.base_cost_metal as f64 * qty, dt.base_cost_crystal as f64 * qty, dt.base_cost_deuterium as f64 * qty, false, true)
        } else {
            let cost = game_logic::get_upgrade_cost(&item.building_type, item.level, &config);
            (cost.metal, cost.crystal, cost.deuterium, false, false)
        }
    };

    let is_unit = is_ship_unit || is_defense_unit;

    let total_duration = if is_unit {
        let sy_level = tech_tree::get_planet_building_level(&state.db, p.id, "shipyard")
            .await
            .unwrap_or(0);
        game_logic::get_ship_production_time(&item.building_type, item.level, sy_level, &config) as f64
    } else {
        let is_tech = Technology::find()
            .filter(backend::entities::technology::Column::TechKey.eq(&item.building_type))
            .one(&state.db)
            .await
            .ok()
            .flatten()
            .is_some();
        let facility_level = if is_tech {
            tech_tree::get_planet_building_level(&state.db, p.id, "research_lab")
                .await
                .unwrap_or(0)
        } else {
            tech_tree::get_planet_building_level(&state.db, p.id, "shipyard")
                .await
                .unwrap_or(0)
        };
        game_logic::get_build_time(base_m, base_c, facility_level, &config) as f64
    };

    let now = Utc::now().naive_utc();
    let time_left = item.end_time.signed_duration_since(now).num_seconds() as f64;
    let refund_ratio = (time_left / total_duration).clamp(0.0, 0.95);

    let refund_m = base_m * refund_ratio;
    let refund_c = base_c * refund_ratio;
    let refund_d = base_d * refund_ratio;

    let mut active: planet::ActiveModel = p.into();
    active.metal_amount = Set(active.metal_amount.unwrap() + refund_m);
    active.crystal_amount = Set(active.crystal_amount.unwrap() + refund_c);
    active.deuterium_amount = Set(active.deuterium_amount.unwrap() + refund_d);

    active
        .update(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    ConstructionQueue::delete_by_id(queue_id)
        .exec(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({
        "refund_metal": refund_m,
        "refund_crystal": refund_c,
        "refund_deuterium": refund_d,
        "ratio": refund_ratio
    })))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /my-planets
// ─────────────────────────────────────────────────────────────────────────────

async fn get_my_planets_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    use backend::entities::prelude::ResourceSlot as RS;

    let current_id_str = params
        .get("current_planet_id")
        .unwrap_or(&String::new())
        .to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();
    let current = Planet::find_by_id(current_id).one(&state.db).await.unwrap();

    if let Some(p) = current {
        let owner_id = p.owner_id;
        let mut my_planets = Planet::find()
            .filter(planet::Column::OwnerId.eq(owner_id))
            .all(&state.db)
            .await
            .unwrap_or_default();

        // Exclude planets currently listed for sale
        {
            use sea_orm::ConnectionTrait;
            let listed_ids: Vec<uuid::Uuid> = state
                .db
                .query_all(sea_orm::Statement::from_string(
                    sea_orm::DbBackend::Postgres,
                    format!(
                        "SELECT planet_id FROM planet_listings WHERE seller_id = '{}' AND is_active = true",
                        owner_id
                    ),
                ))
                .await
                .unwrap_or_default()
                .into_iter()
                .filter_map(|r| r.try_get::<uuid::Uuid>("", "planet_id").ok())
                .collect();
            if !listed_ids.is_empty() {
                my_planets.retain(|pl| !listed_ids.contains(&pl.id));
            }
        }

        let astrophysics_level =
            tech_tree::get_planet_tech_level(&state.db, current_id, "astrophysics")
                .await
                .unwrap_or(0);
        let max_colonies = std::cmp::min(astrophysics_level, 10);
        let colony_count = my_planets.iter().filter(|p| !p.is_homeworld).count();

        let config = state.config.read().unwrap().clone();
        let mut list = Vec::new();

        for mp in my_planets {
            let metal_mine_level = get_building_level(&state.db, mp.id, "metal_mine").await;
            let crystal_mine_level = get_building_level(&state.db, mp.id, "crystal_mine").await;
            let deuterium_mine_level = get_building_level(&state.db, mp.id, "deuterium_mine").await;
            let solar_plant_level = get_building_level(&state.db, mp.id, "solar_plant").await;
            let shipyard_level = get_building_level(&state.db, mp.id, "shipyard").await;
            let research_lab_level = get_building_level(&state.db, mp.id, "research").await;
            let hangar_level = get_building_level(&state.db, mp.id, "hangar").await;

            let energy_tech_level =
                tech_tree::get_planet_tech_level(&state.db, mp.id, "energy_tech")
                    .await
                    .unwrap_or(0);

            let energy_ratio = game_logic::calculate_energy_ratio(
                solar_plant_level,
                energy_tech_level,
                metal_mine_level,
                crystal_mine_level,
                deuterium_mine_level,
                &config,
            );

            let energy_prod = game_logic::calculate_energy_production(
                solar_plant_level,
                energy_tech_level,
                &config,
            );
            let energy_cons = game_logic::calculate_energy_consumption(
                metal_mine_level,
                crystal_mine_level,
                deuterium_mine_level,
                &config,
            );
            let energy_ratio_percent = (energy_ratio * 100.0) as i32;

            let plasma_tech_level =
                tech_tree::get_planet_tech_level(&state.db, mp.id, "plasma_tech")
                    .await
                    .unwrap_or(0);
            let metal_production = game_logic::calculate_resource_production(
                game_logic::ResourceType::Metal,
                metal_mine_level,
                energy_tech_level,
                plasma_tech_level,
                energy_ratio,
                &config,
            );
            let crystal_production = game_logic::calculate_resource_production(
                game_logic::ResourceType::Crystal,
                crystal_mine_level,
                energy_tech_level,
                plasma_tech_level,
                energy_ratio,
                &config,
            );
            let deuterium_production = game_logic::calculate_resource_production(
                game_logic::ResourceType::Deuterium,
                deuterium_mine_level,
                energy_tech_level,
                plasma_tech_level,
                energy_ratio,
                &config,
            );

            let ships = tech_tree::get_all_planet_ship_details(&state.db, mp.id)
                .await
                .unwrap_or_default();
            let defenses = tech_tree::get_all_planet_defense_details(&state.db, mp.id)
                .await
                .unwrap_or_default();
            let buildings = tech_tree::get_all_planet_building_levels(&state.db, mp.id)
                .await
                .unwrap_or_default();
            let technologies = tech_tree::get_all_planet_tech_levels(&state.db, mp.id)
                .await
                .unwrap_or_default();

            let (total_points, economy_points, military_points) =
                game_logic::calculate_planet_points(&mp, &state.db, &config).await;

            let construction_queue = ConstructionQueue::find()
                .filter(construction_queue::Column::PlanetId.eq(mp.id))
                .order_by_asc(construction_queue::Column::EndTime)
                .all(&state.db)
                .await
                .unwrap_or_default();

            let research_techs = PlanetTechnology::find()
                .filter(planet_technology::Column::PlanetId.eq(mp.id))
                .filter(planet_technology::Column::ResearchingToLevel.is_not_null())
                .all(&state.db)
                .await
                .unwrap_or_default();

            let mut research_queue_json = Vec::new();
            for r in research_techs {
                if let Ok(Some(tech)) = Technology::find_by_id(r.tech_id).one(&state.db).await {
                    research_queue_json.push(json!({
                        "tech_key": tech.tech_key,
                        "target_level": r.researching_to_level,
                        "end_time": r.research_end_time.map(|t| t.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string())
                    }));
                }
            }

            let resource_slots_data = RS::find()
                .filter(resource_slot::Column::PlanetId.eq(mp.id))
                .all(&state.db)
                .await
                .unwrap_or_default();

            list.push(json!({
                "id": mp.id,
                "name": mp.name,
                "galaxy": mp.galaxy,
                "system": mp.system,
                "position": mp.position,
                "is_current": mp.id == current_id,
                "is_homeworld": mp.is_homeworld,
                "metal_amount": mp.metal_amount,
                "crystal_amount": mp.crystal_amount,
                "deuterium_amount": mp.deuterium_amount,
                "metal_mine_level": metal_mine_level,
                "crystal_mine_level": crystal_mine_level,
                "deuterium_mine_level": deuterium_mine_level,
                "solar_plant_level": solar_plant_level,
                "shipyard_level": shipyard_level,
                "research_lab_level": research_lab_level,
                "hangar_level": hangar_level,
                "energy": energy_prod as i32 - energy_cons as i32,
                "energy_production": energy_prod as i32,
                "energy_consumption": energy_cons as i32,
                "energy_ratio": energy_ratio_percent,
                "metal_production": metal_production as i32,
                "crystal_production": crystal_production as i32,
                "deuterium_production": deuterium_production as i32,
                "energy_tech_level": energy_tech_level,
                "ships": ships,
                "defenses": defenses,
                "buildings": buildings,
                "technologies": technologies,
                "debris_metal": mp.debris_metal,
                "debris_crystal": mp.debris_crystal,
                "construction_queue": construction_queue,
                "research_queue": research_queue_json,
                "resource_slots": resource_slots_data,
                "points": total_points,
                "economy_points": economy_points,
                "military_points": military_points,
                "fleet_capacity": game_logic::get_fleet_capacity(hangar_level, &config),
            }));
        }

        return Json(json!({
            "planets": list,
            "colony_count": colony_count,
            "max_colonies": max_colonies,
            "astrophysics_level": astrophysics_level
        }))
        .into_response();
    }
    (StatusCode::UNAUTHORIZED, Json(json!({"error": "Planète introuvable"}))).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /planets/:id/production-details
// Returns per-resource production rates with energy modifier breakdown.
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_production_details_handler(
    State(state): State<AppState>,
    Path(planet_id): Path<String>,
) -> impl IntoResponse {
    use game_logic::ResourceType;

    let planet_uuid = match Uuid::parse_str(&planet_id) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid planet id"}))).into_response();
        }
    };

    let db = &state.db;
    let config = match state.config.read() {
        Ok(c) => c.clone(),
        Err(e) => e.into_inner().clone(),
    };

    // Load planet row (needed for ownership context; we don't read legacy columns)
    match Planet::find_by_id(planet_uuid).one(db).await {
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(json!({"error": "Planet not found"}))).into_response();
        }
        Err(e) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response();
        }
        Ok(Some(_)) => {}
    };

    // Load building levels from relational table
    let building_levels = match tech_tree::get_all_planet_building_levels(db, planet_uuid).await {
        Ok(b) => b,
        Err(e) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response();
        }
    };

    let metal_mine_level = building_levels.get("metal_mine").copied().unwrap_or(0);
    let crystal_mine_level = building_levels.get("crystal_mine").copied().unwrap_or(0);
    let deuterium_mine_level = building_levels.get("deuterium_mine").copied().unwrap_or(0);
    let solar_plant_level = building_levels.get("solar_plant").copied().unwrap_or(0);

    // Load tech levels from relational table
    let tech_levels = match tech_tree::get_all_planet_tech_levels(db, planet_uuid).await {
        Ok(t) => t,
        Err(e) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response();
        }
    };

    let energy_tech_level = tech_levels.get("energy_tech").copied().unwrap_or(0);
    let plasma_tech_level = tech_levels.get("plasma_tech").copied().unwrap_or(0);

    // Energy balance
    let energy_produced = game_logic::calculate_energy_production(solar_plant_level, energy_tech_level, &config);
    let energy_consumed = game_logic::calculate_energy_consumption(
        metal_mine_level, crystal_mine_level, deuterium_mine_level, &config,
    );
    let energy_ratio = if energy_consumed == 0.0 {
        1.0_f64
    } else {
        (energy_produced / energy_consumed).min(1.0)
    };

    // Per-resource production (energy_ratio already factored in by calculate_resource_production)
    let metal_rate = game_logic::calculate_resource_production(
        ResourceType::Metal,
        metal_mine_level,
        energy_tech_level,
        plasma_tech_level,
        energy_ratio,
        &config,
    );
    let crystal_rate = game_logic::calculate_resource_production(
        ResourceType::Crystal,
        crystal_mine_level,
        energy_tech_level,
        plasma_tech_level,
        energy_ratio,
        &config,
    );
    let deuterium_rate = game_logic::calculate_resource_production(
        ResourceType::Deuterium,
        deuterium_mine_level,
        energy_tech_level,
        plasma_tech_level,
        energy_ratio,
        &config,
    );

    Json(json!({
        "planet_id": planet_id,
        "resources": {
            "metal": {
                "mine_level": metal_mine_level,
                "hourly_rate": metal_rate,
                "energy_modifier": energy_ratio
            },
            "crystal": {
                "mine_level": crystal_mine_level,
                "hourly_rate": crystal_rate,
                "energy_modifier": energy_ratio
            },
            "deuterium": {
                "mine_level": deuterium_mine_level,
                "hourly_rate": deuterium_rate,
                "energy_modifier": energy_ratio
            }
        },
        "energy": {
            "produced": energy_produced,
            "consumed": energy_consumed,
            "ratio": energy_ratio,
            "deficit": energy_ratio < 1.0,
            "solar_plant_level": solar_plant_level,
            "energy_tech_level": energy_tech_level
        }
    })).into_response()
}
