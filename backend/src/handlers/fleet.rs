// ─────────────────────────────────────────────────────────────────────────────
// handlers/fleet.rs — Fleet mission handlers (attack, spy, recycle, transport, expedition)
//
// Extracted from main.rs (~lines 2527–2723, 3450–3728, 4292–4416, 6641–7180).
// Exposes a `router()` function to be merged into the main Axum app.
// ─────────────────────────────────────────────────────────────────────────────

use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post, put, delete},
    Router,
};
use chrono::{Duration, Utc};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, EntityTrait,
    PaginatorTrait, QueryFilter, QueryOrder, Set, TransactionTrait,
};
use sea_orm::DatabaseConnection;
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;

use backend::{combat, game_logic, missions, notifications, protection, sabotage, tech_tree, websocket, AppState};
use backend::entities::{
    prelude::{
        AcsGroup, AllianceMember, CombatLog, DebrisField, DefenseType, Flagship, FlagshipModule,
        FlagshipModuleType, FleetMission, Friendship,
        Planet, PlanetCombatZone, PlanetDefense, PlanetShip, PlanetTechnology, ShipType, Technology,
        User,
    },
    acs_group, alliance_member, combat_log, debris_field, defense_type, flagship, flagship_module,
    fleet_mission, friendship,
    planet, planet_combat_zone, planet_defense, planet_ship, planet_technology, ship_type,
    transport_log, user,
};

use crate::models::{AttackPayloadV2, DeployPayload, ExpeditionPayloadV2, RecyclePayload, SpyPayloadV2, TransportPayload};

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

pub fn router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/attack/v2", post(attack_v2_handler))
        .route("/spy/v2", post(spy_v2_handler))
        .route("/recycle", post(recycle_handler))
        .route("/transport", post(transport_handler))
        .route("/fleet/deploy", post(deploy_handler))
        .route("/fleet/missions/:mission_id/recall", delete(recall_deploy_handler))
        .route("/fleet/estimate", get(fleet_estimate_handler))
        .route("/planets/:id/expedition-v2", post(expedition_v2_handler))
        // ZAC — Zone Aérienne de Combat
        .route("/planets/:id/combat-zone", get(get_combat_zone_handler))
        .route("/planets/:id/combat-zone", put(set_combat_zone_handler))
        .route("/planets/:id/combat-zone", delete(clear_combat_zone_handler))
        // ACS — Allied Combat System (M7)
        .route("/fleet/acs/create", post(create_acs_handler))
        .route("/fleet/acs/:acs_id/join", post(join_acs_handler))
        .route("/fleet/acs/:acs_id", get(get_acs_handler))
        // M10 — Piracy mission (SC raider)
        .route("/fleet/piracy", post(piracy_handler))
        .with_state(state)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — check_attack_cooldown
// ─────────────────────────────────────────────────────────────────────────────

async fn check_attack_cooldown(
    db: &DatabaseConnection,
    attacker_user_id: Uuid,
    defender_user_id: Uuid,
    cooldown_hours: i64,
) -> Option<String> {
    let defender_user = User::find_by_id(defender_user_id).one(db).await.unwrap_or(None)?;
    let cutoff = Utc::now().naive_utc() - Duration::hours(cooldown_hours);

    let attacker_planet_ids: Vec<Uuid> = Planet::find()
        .filter(planet::Column::OwnerId.eq(attacker_user_id))
        .all(db)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|p| p.id)
        .collect();

    if attacker_planet_ids.is_empty() {
        return None;
    }

    let last_attack = CombatLog::find()
        .filter(combat_log::Column::PlanetId.is_in(attacker_planet_ids.clone()))
        .filter(combat_log::Column::OpponentUsername.eq(&defender_user.username))
        .filter(
            Condition::any()
                .add(combat_log::Column::MissionType.eq("attack"))
                .add(combat_log::Column::MissionType.eq("planet_conquered")),
        )
        .filter(combat_log::Column::Date.gt(cutoff))
        .order_by_desc(combat_log::Column::Date)
        .one(db)
        .await
        .unwrap_or(None)?;

    // Exception 1: decisive victory (0 attacker losses)
    if last_attack.result == "victory" && last_attack.ships_lost == 0 {
        return None;
    }

    // Exception 2: defender counter-attacked since last attack
    let counter = CombatLog::find()
        .filter(combat_log::Column::PlanetId.is_in(attacker_planet_ids))
        .filter(combat_log::Column::OpponentUsername.eq(&defender_user.username))
        .filter(combat_log::Column::MissionType.eq("defense"))
        .filter(combat_log::Column::Date.gt(last_attack.date))
        .count(db)
        .await
        .unwrap_or(0);

    if counter > 0 {
        return None;
    }

    let next_allowed = last_attack.date + Duration::hours(cooldown_hours);
    let remaining = next_allowed - Utc::now().naive_utc();
    let hours = remaining.num_hours().max(0);
    let minutes = (remaining.num_minutes().max(0)) % 60;

    Some(format!(
        "Délai d'attaque non écoulé. Prochain créneau dans {}h {}min. (Levé si la cible vous contre-attaque ou si victoire avec 0 pertes)",
        hours, minutes
    ))
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — flagship XP
// ─────────────────────────────────────────────────────────────────────────────

fn flagship_xp_for_level(level: i32) -> i32 {
    100 * level * level
}

async fn award_flagship_xp(db: &DatabaseConnection, user_id: Uuid, xp_gain: i32) {
    let fs = match Flagship::find()
        .filter(flagship::Column::UserId.eq(user_id))
        .one(db)
        .await
        .unwrap_or(None)
    {
        Some(f) => f,
        None => return,
    };

    let mut new_xp = fs.xp + xp_gain;
    let mut new_level = fs.level;

    loop {
        let xp_needed = flagship_xp_for_level(new_level + 1);
        if new_xp >= xp_needed {
            new_xp -= xp_needed;
            new_level += 1;
        } else {
            break;
        }
    }

    let mut active: flagship::ActiveModel = fs.into();
    active.xp = Set(new_xp);
    active.level = Set(new_level);
    active.updated_at = Set(Utc::now().naive_utc());
    let _ = active.update(db).await;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /attack/v2
// ─────────────────────────────────────────────────────────────────────────────

async fn attack_v2_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<AttackPayloadV2>,
) -> impl IntoResponse {
    // Rate limiting : 10 lancements / 60s par IP (anti-flood)
    let ip = backend::rate_limit::RateLimiter::extract_ip(&headers);
    if !state.rate_limit_attack.check(&ip) {
        return (StatusCode::TOO_MANY_REQUESTS, Json(json!({"error": "Trop de requêtes. Attendez avant de relancer une attaque."}))).into_response();
    }

    let attacker_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let attacker_id = match Uuid::parse_str(&attacker_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "ID Attaquant invalide"}))).into_response(),
    };

    let att_planet = match Planet::find_by_id(attacker_id).one(&state.db).await {
        Ok(Some(p)) => p,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Attaquant introuvable"}))).into_response(),
    };

    let target_planet = match Planet::find_by_id(payload.target_planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Cible introuvable"}))).into_response(),
    };

    if payload.fleet.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "No ships selected"}))).into_response();
    }
    if payload.fleet.values().any(|&v| v <= 0) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Ship counts must be positive"}))).into_response();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BEGINNER PROTECTION - Validate attack is allowed
    // ═══════════════════════════════════════════════════════════════════════════
    let attacker_owner_id = att_planet.owner_id;
    let defender_owner_id = target_planet.owner_id;

    let config_clone = state.config.read().unwrap_or_else(|e| e.into_inner()).clone();
    if let Err(error_msg) = protection::validate_attack(
        &state.db,
        attacker_owner_id,
        defender_owner_id,
        payload.target_planet_id,
        &config_clone,
    ).await {
        return (StatusCode::FORBIDDEN, Json(json!({"error": error_msg}))).into_response();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COOLDOWN ATTAQUE - Anti-flood par paire attaquant/défenseur
    // ═══════════════════════════════════════════════════════════════════════════
    let attack_cooldown_hours = config_clone.get_config("attack_cooldown_hours", 2.0) as i64;
    if let Some(cooldown_msg) = check_attack_cooldown(&state.db, attacker_owner_id, defender_owner_id, attack_cooldown_hours).await {
        return (StatusCode::TOO_MANY_REQUESTS, Json(json!({"error": cooldown_msg}))).into_response();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CASUS BELLI - Vérifier et consommer le droit d'attaque légitime
    // ═══════════════════════════════════════════════════════════════════════════
    let mut used_casus_belli = false;
    if let Ok(has_cb) = sabotage::has_casus_belli(&state.db, attacker_owner_id, defender_owner_id).await {
        if has_cb {
            if let Ok(_) = sabotage::consume_casus_belli(&state.db, attacker_owner_id, defender_owner_id).await {
                used_casus_belli = true;
                println!("⚔️ Casus Belli consommé: attacker {} vs defender {}", attacker_owner_id, defender_owner_id);
            }
        }
    }

    // Verify planet has all requested ships
    let mut total_ships = 0;
    let mut total_fuel_per_unit: f64 = 0.0;
    for (ship_key, &count) in &payload.fleet {
        if count <= 0 {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Invalid count for {}", ship_key)}))).into_response();
        }

        let ship = match ShipType::find()
            .filter(ship_type::Column::ShipKey.eq(ship_key))
            .one(&state.db)
            .await
        {
            Ok(Some(s)) => s,
            Ok(None) => return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Unknown ship type: {}", ship_key)}))).into_response(),
            Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Database error"}))).into_response(),
        };

        let planet_ship_count = match PlanetShip::find()
            .filter(planet_ship::Column::PlanetId.eq(attacker_id))
            .filter(planet_ship::Column::ShipTypeId.eq(ship.id))
            .one(&state.db)
            .await
        {
            Ok(Some(ps)) => ps.count,
            Ok(None) => 0,
            Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Database error"}))).into_response(),
        };

        if count > planet_ship_count {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Not enough {}", ship.display_name)}))).into_response();
        }

        total_ships += count;
        total_fuel_per_unit += (count as f64) * (ship.fuel_consumption as f64);
    }

    let dist = game_logic::calculate_distance(
        (att_planet.galaxy, att_planet.system, att_planet.position),
        (target_planet.galaxy, target_planet.system, target_planet.position),
    );

    let fuel_needed = (total_fuel_per_unit * dist / 35000.0).ceil().max(1.0);
    if att_planet.deuterium_amount < fuel_needed {
        return (StatusCode::BAD_REQUEST, Json(json!({
            "error": format!("Deutérium insuffisant ({} requis, {} disponible)",
                fuel_needed as i64, att_planet.deuterium_amount as i64)
        }))).into_response();
    }

    let attack_base_speed = {
        let config = state.config.read().unwrap_or_else(|e| e.into_inner());
        config.get_config("flight_speed_multiplier", 5.0)
    };
    let attack_hyperspace_level = tech_tree::get_planet_tech_level(&state.db, attacker_id, "hyperspace_tech").await.unwrap_or(0);
    let travel_time = game_logic::calculate_flight_time(dist, attack_base_speed * (1.0 + attack_hyperspace_level as f64 * 0.15));
    let arrival = Utc::now().naive_utc() + Duration::seconds(travel_time);

    let fleet_json = match serde_json::to_string(&payload.fleet) {
        Ok(json) => json,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to serialize fleet"}))).into_response(),
    };

    let new_mission = fleet_mission::ActiveModel {
        id: Set(Uuid::new_v4()),
        source_planet_id: Set(attacker_id),
        target_planet_id: Set(payload.target_planet_id),
        mission_type: Set("attack".to_string()),
        arrival_time: Set(arrival),
        metal: Set(0.0),
        crystal: Set(0.0),
        deuterium: Set(0.0),
        ships_count: Set(total_ships),
        fleet_data: Set(Some(fleet_json)),
        recyclers_sent: Set(0),
        departure_time: Set(Utc::now().naive_utc()),
        acs_group_id: Set(None),
    };

    // Transaction atomique : déduction vaisseaux + deutérium + création mission
    // Les trois opérations sont atomiques pour éviter tout TOCTOU (double-spend
    // si deux requêtes simultanées passent la validation avant déduction).
    let att_deut_remaining = (att_planet.deuterium_amount - fuel_needed).max(0.0);
    let fleet_clone = payload.fleet.clone();
    if let Err(e) = state.db.transaction::<_, (), sea_orm::DbErr>(|txn| {
        let fleet_clone = fleet_clone.clone();
        let new_mission = new_mission.clone();
        let att_planet = att_planet.clone();
        Box::pin(async move {
            for (ship_key, &count) in &fleet_clone {
                tech_tree::deduct_ships(txn, attacker_id, ship_key, count).await?;
            }
            let mut att_active: planet::ActiveModel = att_planet.into();
            att_active.deuterium_amount = Set(att_deut_remaining);
            att_active.update(txn).await?;
            new_mission.insert(txn).await?;
            Ok(())
        })
    }).await {
        eprintln!("[ATTACK TXN FAILED] attacker={attacker_id}: {e:?}");
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur lors du lancement de la flotte"}))).into_response();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NOTIFICATION WEBSOCKET - Alerter le défenseur de l'attaque entrante
    // ═══════════════════════════════════════════════════════════════════════════
    if let Ok(Some(attacker_planet)) = Planet::find_by_id(attacker_id).one(&state.db).await {
        let attacker_owner_id = attacker_planet.owner_id;

        missions::update_mission_progress(&state, attacker_owner_id, "attack", "any", 1).await;
        missions::update_achievement_progress(&state, attacker_owner_id, "attacks", 1).await;

        if let Some(ref ws) = state.ws {
            if let Ok(Some(attacker_user)) = User::find_by_id(attacker_owner_id).one(&state.db).await {
                let source_coords = format!(
                    "[{}:{}:{}]",
                    attacker_planet.galaxy, attacker_planet.system, attacker_planet.position
                );
                websocket::notify_attack_incoming(
                    ws,
                    payload.target_planet_id,
                    &attacker_user.username,
                    &source_coords,
                    &arrival.to_string(),
                    total_ships,
                );

                // Persister la notification pour le défenseur
                if let Ok(Some(target_planet)) = Planet::find_by_id(payload.target_planet_id).one(&state.db).await {
                    let flight_mins = travel_time / 60;
                    ws.push_notification(
                        target_planet.owner_id,
                        "incoming_attack",
                        "Attaque entrante !",
                        &format!(
                            "Flotte ennemie en approche sur {} — arrivée dans ~{}min",
                            target_planet.name, flight_mins
                        ),
                        None,
                    ).await;
                }
            }
        }
    }

    (StatusCode::OK, Json(json!({
        "status": "success",
        "message": "Flotte en route",
        "arrival": arrival,
        "used_casus_belli": used_casus_belli
    }))).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /spy/v2
// ─────────────────────────────────────────────────────────────────────────────

async fn spy_v2_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<SpyPayloadV2>,
) -> impl IntoResponse {
    let attacker_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let attacker_id = Uuid::parse_str(&attacker_id_str).unwrap_or_default();

    let att_planet_opt = Planet::find_by_id(attacker_id).one(&state.db).await.unwrap_or(None);
    let def_planet_opt = Planet::find_by_id(payload.target_planet_id).one(&state.db).await.unwrap_or(None);

    let att_planet = match att_planet_opt {
        Some(p) => p,
        None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Attaquant inconnu"}))).into_response(),
    };
    let def_planet = match def_planet_opt {
        Some(p) => p,
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Cible inconnue"}))).into_response(),
    };

    if payload.fleet.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "No ships selected"}))).into_response();
    }
    if payload.fleet.values().any(|&v| v <= 0) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Ship counts must be positive"}))).into_response();
    }

    // BE-1 : Compter les sondes envoyées (somme de toutes les valeurs de la flotte)
    let probe_count = payload.fleet.values().copied().sum::<i32>().max(1);

    let mut total_fuel_spy: f64 = 0.0;
    for (ship_key, &count) in &payload.fleet {
        if count <= 0 {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Invalid count for {}", ship_key)}))).into_response();
        }

        let ship = match ShipType::find()
            .filter(ship_type::Column::ShipKey.eq(ship_key))
            .one(&state.db)
            .await
        {
            Ok(Some(s)) => s,
            Ok(None) => return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Unknown ship type: {}", ship_key)}))).into_response(),
            Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Database error"}))).into_response(),
        };

        let planet_ship_count = match PlanetShip::find()
            .filter(planet_ship::Column::PlanetId.eq(attacker_id))
            .filter(planet_ship::Column::ShipTypeId.eq(ship.id))
            .one(&state.db)
            .await
        {
            Ok(Some(ps)) => ps.count,
            Ok(None) => 0,
            Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Database error"}))).into_response(),
        };

        if count > planet_ship_count {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Not enough {}", ship.display_name)}))).into_response();
        }

        total_fuel_spy += (count as f64) * (ship.fuel_consumption as f64);
    }

    let spy_dist = game_logic::calculate_distance(
        (att_planet.galaxy, att_planet.system, att_planet.position),
        (def_planet.galaxy, def_planet.system, def_planet.position),
    );
    let spy_fuel_needed = (total_fuel_spy * spy_dist / 35000.0).ceil().max(1.0);
    if att_planet.deuterium_amount < spy_fuel_needed {
        return (StatusCode::BAD_REQUEST, Json(json!({
            "error": format!("Deutérium insuffisant ({} requis, {} disponible)",
                spy_fuel_needed as i64, att_planet.deuterium_amount as i64)
        }))).into_response();
    }

    // Wrap ship deduction + fuel deduction in a single transaction to prevent
    // a partial deduction if either step fails (race condition guard).
    {
        let txn = match state.db.begin().await {
            Ok(t) => t,
            Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Transaction error"}))).into_response(),
        };
        for (ship_key, &count) in &payload.fleet {
            if let Err(_) = tech_tree::deduct_ships(&txn, att_planet.id, ship_key, count).await {
                let _ = txn.rollback().await;
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Failed to deduct {}", ship_key)}))).into_response();
            }
        }
        {
            let mut att_active: planet::ActiveModel = att_planet.clone().into();
            att_active.deuterium_amount = Set((att_planet.deuterium_amount - spy_fuel_needed).max(0.0));
            if let Err(_) = att_active.update(&txn).await {
                let _ = txn.rollback().await;
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to deduct fuel"}))).into_response();
            }
        }
        if let Err(_) = txn.commit().await {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Transaction commit failed"}))).into_response();
        }
    }

    let att_data = match tech_tree::PlanetData::load(&state.db, att_planet.id).await {
        Ok(data) => data,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to load attacker data"}))).into_response(),
    };
    let def_data = match tech_tree::PlanetData::load(&state.db, def_planet.id).await {
        Ok(data) => data,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to load defender data"}))).into_response(),
    };

    let att_espionage = att_data.tech_level("espionage_tech");
    let def_espionage = def_data.tech_level("espionage_tech");
    let tech_diff = att_espionage - def_espionage;

    // BE-1 : Bonus sonde — log2(probe_count) niveaux d'espionnage supplémentaires
    let probe_bonus = (probe_count as f64).log2().floor() as i32;
    let tech_diff_eff = tech_diff + probe_bonus;

    // BE-1 : Destruction de sonde si défenseur est largement supérieur
    if def_espionage - att_espionage >= 3 {
        return (StatusCode::OK, Json(json!({
            "success": false,
            "probe_destroyed": true,
            "was_detected": false,
            "message": "Vos sondes ont été interceptées et détruites par les défenses ennemies.",
            "probe_count": probe_count,
            "tech_diff_eff": tech_diff_eff,
        }))).into_response();
    }

    // Perturbation graviton : le défenseur brouille ses ressources réelles
    let def_graviton = tech_tree::get_planet_tech_level(&state.db, def_planet.id, "graviton_tech").await.unwrap_or(0);
    let (report_metal, report_crystal, report_deut) = if def_graviton > 0 {
        let noise_factor = def_graviton as f64 * 0.05; // ±5% par niveau
        let m_noise = 1.0 + (rand::random::<f64>() - 0.5) * 2.0 * noise_factor;
        let c_noise = 1.0 + (rand::random::<f64>() - 0.5) * 2.0 * noise_factor;
        let d_noise = 1.0 + (rand::random::<f64>() - 0.5) * 2.0 * noise_factor;
        (
            (def_planet.metal_amount * m_noise).round(),
            (def_planet.crystal_amount * c_noise).round(),
            (def_planet.deuterium_amount * d_noise).round(),
        )
    } else {
        (def_planet.metal_amount, def_planet.crystal_amount, def_planet.deuterium_amount)
    };

    let mut detection = "none";
    let mut resources = None;
    let mut fleet_report = None;
    let mut defense = None;

    // Utiliser tech_diff_eff pour les seuils de révélation (BE-1, BE-4)
    if tech_diff_eff >= -1 {
        detection = "resources";
        resources = Some(game_logic::Cost {
            metal: report_metal,
            crystal: report_crystal,
            deuterium: report_deut,
        });
    }

    if tech_diff_eff >= 1 {
        detection = "fleet";
        fleet_report = Some(def_data.ships.clone());
    }

    if tech_diff_eff >= 2 {
        detection = "full";
        let total_defense: i32 = def_data.defenses.values().sum();
        defense = Some(total_defense);
    }

    // BE-4 : Score de menace et recommandation tactique
    let mut threat_score: f64 = 0.0;
    let mut att_score: f64 = 0.0;
    let mut recommendation: Option<&str> = None;

    if tech_diff_eff >= 1 {
        let config = state.config.read().unwrap().clone();

        for (ship_key, &count) in &def_data.ships {
            if count > 0 {
                let stats = game_logic::get_unit_base_stats(ship_key, &config);
                threat_score += count as f64 * (stats.attack + stats.shield / 2.0 + stats.hull / 10.0);
            }
        }
        if tech_diff_eff >= 2 {
            for (def_key, &count) in &def_data.defenses {
                if count > 0 {
                    let stats = game_logic::get_unit_base_stats(def_key, &config);
                    threat_score += count as f64 * (stats.attack + stats.shield / 2.0 + stats.hull / 10.0);
                }
            }
        }
        threat_score /= 1000.0;

        for (ship_key, &count) in &att_data.ships {
            if count > 0 {
                let stats = game_logic::get_unit_base_stats(ship_key, &config);
                att_score += count as f64 * (stats.attack + stats.shield / 2.0 + stats.hull / 10.0);
            }
        }
        att_score /= 1000.0;

        let ratio = if threat_score > 0.0 { att_score / threat_score } else { f64::MAX };
        recommendation = Some(match ratio {
            r if r > 2.0 => "ATTAQUE_RECOMMANDEE",
            r if r > 1.2 => "AVANTAGE_LEGER",
            r if r > 0.8 => "EQUILIBRE",
            r if r > 0.5 => "DESAVANTAGE",
            _             => "RETRAITE_CONSEILLEE",
        });
    }

    let mut def_active: planet::ActiveModel = def_planet.clone().into();
    def_active.unread_report = Set(Some(json!({
        "type": "spy_alert",
        "message": "Votre planète a été espionnée !"
    }).to_string()));
    let _ = def_active.update(&state.db).await;

    let att_user = User::find_by_id(att_planet.owner_id).one(&state.db).await.unwrap_or(None);
    let def_user = User::find_by_id(def_planet.owner_id).one(&state.db).await.unwrap_or(None);
    let attacker_username = att_user.map(|u| u.username.clone()).unwrap_or("Inconnu".to_string());
    let defender_username = def_user.map(|u| u.username.clone()).unwrap_or("Inconnu".to_string());

    let spy_report_details = json!({
        "type": "spy_report",
        "target_planet": def_planet.name,
        "target_planet_id": def_planet.id.to_string(),
        "target_player": defender_username,
        "coordinates": format!("[{}:{}:{}]", def_planet.galaxy, def_planet.system, def_planet.position),
        "tech_difference": tech_diff,
        "tech_diff_eff": tech_diff_eff,
        "probe_count": probe_count,
        "detection_level": detection,
        "resources": resources,
        "fleet": fleet_report,
        "defense": defense,
        "threat_score": threat_score,
        "recommendation": recommendation,
    });

    let spy_log_attacker = combat_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        planet_id: Set(att_planet.id),
        target_name: Set(def_planet.name.clone()),
        opponent_username: Set(Some(defender_username.clone())),
        mission_type: Set("spy_attack".to_string()),
        result: Set("success".to_string()),
        loot_metal: Set(0.0),
        loot_crystal: Set(0.0),
        ships_lost: Set(1),
        date: Set(Utc::now().naive_utc()),
        detailed_report: Set(Some(spy_report_details)),
        details: Set(None),
    };
    let _ = spy_log_attacker.insert(&state.db).await;

    let spy_log_defender = combat_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        planet_id: Set(def_planet.id),
        target_name: Set(att_planet.name.clone()),
        opponent_username: Set(Some(attacker_username.clone())),
        mission_type: Set("spy_defense".to_string()),
        result: Set("alert".to_string()),
        loot_metal: Set(0.0),
        loot_crystal: Set(0.0),
        ships_lost: Set(0),
        date: Set(Utc::now().naive_utc()),
        detailed_report: Set(Some(json!({
            "type": "spy_alert",
            "attacker_planet": att_planet.name,
            "attacker_player": attacker_username,
            "coordinates": format!("[{}:{}:{}]", att_planet.galaxy, att_planet.system, att_planet.position)
        }))),
        details: Set(None),
    };
    let _ = spy_log_defender.insert(&state.db).await;

    // BE-2 : CB harcèlement espionnage — compter les espionnages des 24h
    let recent_spy_count = CombatLog::find()
        .filter(combat_log::Column::PlanetId.eq(def_planet.id))
        .filter(combat_log::Column::MissionType.eq("spy_defense"))
        .filter(combat_log::Column::OpponentUsername.eq(&attacker_username))
        .filter(combat_log::Column::Date.gt(Utc::now().naive_utc() - Duration::hours(24)))
        .count(&state.db)
        .await
        .unwrap_or(0);

    if recent_spy_count >= 4 {
        // La 5e fois déclenche le CB harcèlement (on vient d'insérer le log défenseur)
        sabotage::grant_casus_belli(
            &state.db,
            def_planet.owner_id,
            att_planet.owner_id,
            "spy_harassment",
        ).await.ok();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NOTIFICATION WEBSOCKET
    // ═══════════════════════════════════════════════════════════════════════════
    if let Some(ref ws) = state.ws {
        websocket::notify_spy_alert(ws, def_planet.id, &attacker_username);
    }

    missions::update_mission_progress(&state, att_planet.owner_id, "spy", "any", 1).await;
    missions::update_achievement_progress(&state, att_planet.owner_id, "spy_missions", 1).await;

    (StatusCode::OK, Json(json!({
        "status": "success",
        "report": {
            "success": true,
            "probe_destroyed": false,
            "was_detected": false,
            "probe_count": probe_count,
            "tech_difference": tech_diff,
            "tech_diff_eff": tech_diff_eff,
            "detection_level": detection,
            "resources": resources,
            "fleet": fleet_report,
            "defense": defense,
            "threat_score": threat_score,
            "recommendation": recommendation,
        }
    }))).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /recycle
// ─────────────────────────────────────────────────────────────────────────────

async fn recycle_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<RecyclePayload>,
) -> impl IntoResponse {
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();

    let source_planet = match Planet::find_by_id(current_id).one(&state.db).await.unwrap_or(None) {
        Some(p) => p,
        None => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Planète inconnue"}))).into_response(),
    };

    if payload.recyclers <= 0 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Nombre de recycleurs invalide"}))).into_response();
    }
    let current_recyclers = tech_tree::get_planet_ship_count(&state.db, current_id, "recycler").await.unwrap_or(0);
    if payload.recyclers > current_recyclers {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Recycleurs insuffisants"}))).into_response();
    }

    // Vérifier qu'il y a des débris aux coordonnées cibles
    let debris_opt = DebrisField::find()
        .filter(debris_field::Column::Galaxy.eq(payload.galaxy))
        .filter(debris_field::Column::System.eq(payload.system))
        .filter(debris_field::Column::Position.eq(payload.position))
        .one(&state.db)
        .await
        .unwrap_or(None);

    let debris = match debris_opt {
        Some(d) if d.metal + d.crystal > 0.0 => d,
        _ => return (StatusCode::OK, Json(json!({ "status": "empty", "message": "Aucun débris à recycler à cette position." }))).into_response(),
    };

    // Calculer distance et carburant
    let dist = game_logic::calculate_distance(
        (source_planet.galaxy, source_planet.system, source_planet.position),
        (payload.galaxy, payload.system, payload.position),
    );

    let recycler_fuel = ShipType::find()
        .filter(ship_type::Column::ShipKey.eq("recycler"))
        .one(&state.db)
        .await
        .ok()
        .flatten()
        .map(|s| s.fuel_consumption as f64)
        .unwrap_or(300.0);

    let fuel_needed = (payload.recyclers as f64 * recycler_fuel * dist / 35000.0).ceil().max(1.0);
    if source_planet.deuterium_amount < fuel_needed {
        return (StatusCode::BAD_REQUEST, Json(json!({
            "error": format!("Deutérium insuffisant ({} requis, {} disponible)",
                fuel_needed as i64, source_planet.deuterium_amount as i64)
        }))).into_response();
    }

    // Déduire les recycleurs et le deutérium atomiquement
    let fuel_after_recycle = (source_planet.deuterium_amount - fuel_needed).max(0.0);
    let src_id_for_txn = current_id;
    let recyclers_count = payload.recyclers;
    if let Err(_) = state.db.transaction::<_, (), sea_orm::DbErr>(|txn| {
        Box::pin(async move {
            tech_tree::deduct_ships(txn, src_id_for_txn, "recycler", recyclers_count).await?;
            let src = planet::ActiveModel {
                id: Set(src_id_for_txn),
                deuterium_amount: Set(fuel_after_recycle),
                ..Default::default()
            };
            src.update(txn).await?;
            Ok(())
        })
    }).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Impossible de déduire les recycleurs"}))).into_response();
    }

    // Temps de trajet aller-retour
    let recycle_base_speed = {
        let config = state.config.read().unwrap_or_else(|e| e.into_inner());
        config.get_config("flight_speed_multiplier", 5.0)
    };
    let recycle_hyperspace_level = tech_tree::get_planet_tech_level(&state.db, current_id, "hyperspace_tech").await.unwrap_or(0);
    let travel_time = game_logic::calculate_flight_time(dist, recycle_base_speed * (1.0 + recycle_hyperspace_level as f64 * 0.15));
    let arrival = Utc::now().naive_utc() + Duration::seconds(travel_time * 2);

    let fleet_data = json!({
        "galaxy": payload.galaxy,
        "system": payload.system,
        "position": payload.position,
        "debris_metal": debris.metal,
        "debris_crystal": debris.crystal,
    });

    let new_mission = fleet_mission::ActiveModel {
        id: Set(Uuid::new_v4()),
        source_planet_id: Set(current_id),
        target_planet_id: Set(current_id), // retour à la base
        mission_type: Set("recycle".to_string()),
        arrival_time: Set(arrival),
        metal: Set(0.0),
        crystal: Set(0.0),
        deuterium: Set(0.0),
        ships_count: Set(payload.recyclers),
        fleet_data: Set(Some(fleet_data.to_string())),
        recyclers_sent: Set(payload.recyclers),
        departure_time: Set(Utc::now().naive_utc()),
        acs_group_id: Set(None),
    };
    let _ = new_mission.insert(&state.db).await;

    (StatusCode::OK, Json(json!({
        "status": "sent",
        "message": format!("{} recycleur(s) en route. Arrivée prévue : {}", payload.recyclers,
            arrival.format("%Y-%m-%dT%H:%M:%SZ")),
        "arrival_time": arrival.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
        "recyclers": payload.recyclers,
    }))).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /transport
// ─────────────────────────────────────────────────────────────────────────────

async fn transport_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<TransportPayload>,
) -> impl IntoResponse {
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let current_id = Uuid::parse_str(&current_id_str).unwrap_or_default();
    if current_id == payload.target_planet_id {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Impossible de transporter vers la même planète"}))).into_response();
    }

    let source_model = match Planet::find_by_id(current_id).one(&state.db).await {
        Ok(Some(p)) => p,
        Ok(None) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Planète source inconnue"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response(),
    };
    let target_model = match Planet::find_by_id(payload.target_planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète cible inconnue"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response(),
    };

    let source_user = match User::find_by_id(source_model.owner_id).one(&state.db).await {
        Ok(Some(u)) => u,
        _ => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Propriétaire source introuvable"}))).into_response(),
    };
    let target_user = match User::find_by_id(target_model.owner_id).one(&state.db).await {
        Ok(Some(u)) => u,
        _ => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Propriétaire cible introuvable"}))).into_response(),
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // VÉRIFICATION ALLIANCE / AMITIÉ - Transfer vers autre joueur
    // ═══════════════════════════════════════════════════════════════════════════
    if source_model.owner_id != target_model.owner_id {
        let source_member = AllianceMember::find()
            .filter(alliance_member::Column::UserId.eq(source_model.owner_id))
            .one(&state.db)
            .await
            .unwrap_or(None);
        let target_member = AllianceMember::find()
            .filter(alliance_member::Column::UserId.eq(target_model.owner_id))
            .one(&state.db)
            .await
            .unwrap_or(None);
        let same_alliance = matches!(
            (source_member, target_member),
            (Some(src), Some(tgt)) if src.alliance_id == tgt.alliance_id
        );

        let friendship_exists = Friendship::find()
            .filter(
                Condition::any()
                    .add(
                        Condition::all()
                            .add(friendship::Column::SenderId.eq(source_model.owner_id))
                            .add(friendship::Column::ReceiverId.eq(target_model.owner_id)),
                    )
                    .add(
                        Condition::all()
                            .add(friendship::Column::SenderId.eq(target_model.owner_id))
                            .add(friendship::Column::ReceiverId.eq(source_model.owner_id)),
                    ),
            )
            .filter(friendship::Column::Status.eq("accepted"))
            .one(&state.db)
            .await
            .unwrap_or(None)
            .is_some();

        if !same_alliance && !friendship_exists {
            return (
                StatusCode::FORBIDDEN,
                Json(json!({
                    "error": "Transfer impossible : Vous devez être dans la même alliance ou ami avec le destinataire pour envoyer des ressources."
                })),
            ).into_response();
        }
    }

    let source_name = source_model.name.clone();
    let source_id = source_model.id;
    let target_name = target_model.name.clone();
    let target_id = target_model.id;

    let available_transporters = tech_tree::get_planet_ship_count(&state.db, source_id, "transporter").await.unwrap_or(0);
    if payload.transporters > available_transporters || payload.transporters <= 0 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Transporteurs insuffisants"}))).into_response();
    }
    if payload.metal > source_model.metal_amount || payload.crystal > source_model.crystal_amount || payload.deuterium > source_model.deuterium_amount {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Ressources insuffisantes"}))).into_response();
    }

    let total_load = payload.metal + payload.crystal + payload.deuterium;
    let config_clone = state.config.read().unwrap_or_else(|e| e.into_inner()).clone();
    let hangar_level_transport = tech_tree::get_planet_building_level(&state.db, source_id, "hangar").await.unwrap_or(0);
    let computer_tech_level = tech_tree::get_planet_tech_level(&state.db, source_id, "computer_tech").await.unwrap_or(0);
    let transporter_capacity = game_logic::get_transporter_capacity_with_tech(hangar_level_transport, computer_tech_level, &config_clone);
    let capacity = payload.transporters as f64 * transporter_capacity;
    if total_load > capacity {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Surcharge ! Capacité max: {:.0}", capacity)}))).into_response();
    }

    let dist = game_logic::calculate_distance(
        (source_model.galaxy, source_model.system, source_model.position),
        (target_model.galaxy, target_model.system, target_model.position),
    );
    let hyperspace_level_transport = tech_tree::get_planet_tech_level(&state.db, source_id, "hyperspace_tech").await.unwrap_or(0);
    let flight_speed = config_clone.get_config("flight_speed_multiplier", 5.0) * (1.0 + hyperspace_level_transport as f64 * 0.15);
    let flight_duration = game_logic::calculate_flight_time(dist, flight_speed);
    let arrival = Utc::now().naive_utc() + Duration::seconds(flight_duration);

    // Snapshot des valeurs avant conversion en ActiveModel
    let metal_before = source_model.metal_amount;
    let crystal_before = source_model.crystal_amount;
    let deuterium_before = source_model.deuterium_amount;
    let owner_id = source_model.owner_id;

    let mut source: planet::ActiveModel = source_model.into();
    source.metal_amount = Set(metal_before - payload.metal);
    source.crystal_amount = Set(crystal_before - payload.crystal);
    source.deuterium_amount = Set(deuterium_before - payload.deuterium);

    let mission = fleet_mission::ActiveModel {
        id: Set(Uuid::new_v4()),
        source_planet_id: Set(source_id),
        target_planet_id: Set(target_id),
        mission_type: Set("transport".to_string()),
        arrival_time: Set(arrival),
        metal: Set(payload.metal),
        crystal: Set(payload.crystal),
        deuterium: Set(payload.deuterium),
        ships_count: Set(payload.transporters),
        fleet_data: Set(None),
        recyclers_sent: Set(0),
        departure_time: Set(Utc::now().naive_utc()),
        acs_group_id: Set(None),
    };

    let log = transport_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        target_planet_id: Set(target_id),
        target_planet_name: Set(target_name),
        target_owner_name: Set(Some(target_user.username)),
        source_planet_id: Set(source_id),
        source_planet_name: Set(source_name),
        source_owner_name: Set(Some(source_user.username)),
        metal: Set(payload.metal),
        crystal: Set(payload.crystal),
        deuterium: Set(payload.deuterium),
        date: Set(Utc::now().naive_utc()),
    };

    // Transaction atomique : déduction vaisseaux + ressources + création mission
    let transporters = payload.transporters;
    if let Err(e) = state.db.transaction::<_, (), sea_orm::DbErr>(|txn| {
        let source = source.clone();
        let mission = mission.clone();
        let log = log.clone();
        Box::pin(async move {
            tech_tree::deduct_ships(txn, source_id, "transporter", transporters).await?;
            source.update(txn).await?;
            mission.insert(txn).await?;
            log.insert(txn).await?;
            Ok(())
        })
    }).await {
        eprintln!("[TRANSPORT TXN FAILED] source={source_id}: {e:?}");
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur lors du lancement du transport"}))).into_response();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MISE À JOUR MISSIONS QUOTIDIENNES
    // ═══════════════════════════════════════════════════════════════════════════
    let total_resources = (payload.metal + payload.crystal + payload.deuterium) as i32;
    missions::update_mission_progress(&state, owner_id, "transport", "any", total_resources).await;

    (StatusCode::OK, Json(json!({ "status": "success", "message": format!("Flotte lancée ! Arrivée dans {}s", flight_duration) }))).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// Expedition helpers
// ─────────────────────────────────────────────────────────────────────────────

async fn run_dynamic_expedition_combat(
    db: &DatabaseConnection,
    _planet_id: Uuid,
    fleet: HashMap<String, i32>,
) -> Result<(combat::CombatReport, f64, f64, f64), String> {
    let combat_report = combat::resolve_expedition_combat(db, fleet)
        .await
        .map_err(|e| format!("Combat error: {:?}", e))?;

    let (metal, crystal, deuterium) = if combat_report.winner == "player" {
        let metal = combat_report.loot_metal;
        let crystal = metal * 0.4;
        let deuterium = metal * 0.2;
        (metal, crystal, deuterium)
    } else {
        (0.0, 0.0, 0.0)
    };

    Ok((combat_report, metal, crystal, deuterium))
}

pub(crate) async fn load_planet_ships_for_combat(
    db: &DatabaseConnection,
    planet_id: Uuid,
) -> Result<HashMap<String, i32>, String> {
    let planet_ships = PlanetShip::find()
        .filter(planet_ship::Column::PlanetId.eq(planet_id))
        .all(db)
        .await
        .map_err(|e| format!("DB error: {:?}", e))?;

    let mut fleet = HashMap::new();
    for ps in planet_ships {
        if ps.count > 0 {
            let ship_type_record = ShipType::find_by_id(ps.ship_type_id)
                .one(db)
                .await
                .map_err(|e| format!("DB error: {:?}", e))?
                .ok_or_else(|| format!("Ship type {} not found", ps.ship_type_id))?;

            fleet.insert(ship_type_record.ship_key, ps.count);
        }
    }

    Ok(fleet)
}

pub(crate) async fn update_planet_ships_after_combat(
    db: &DatabaseConnection,
    planet_id: Uuid,
    sent_fleet: &HashMap<String, i32>,
    remaining_fleet: &HashMap<String, i32>,
) -> Result<(), String> {
    for (ship_key, &sent_count) in sent_fleet {
        let remaining_count = remaining_fleet.get(ship_key).copied().unwrap_or(0);
        let lost = sent_count - remaining_count;

        if lost > 0 {
            let ship = ShipType::find()
                .filter(ship_type::Column::ShipKey.eq(ship_key))
                .one(db)
                .await
                .map_err(|e| format!("DB error: {:?}", e))?
                .ok_or_else(|| format!("Ship type {} not found", ship_key))?;

            if let Some(planet_ship_record) = PlanetShip::find()
                .filter(planet_ship::Column::PlanetId.eq(planet_id))
                .filter(planet_ship::Column::ShipTypeId.eq(ship.id))
                .one(db)
                .await
                .map_err(|e| format!("DB error: {:?}", e))?
            {
                let mut active: planet_ship::ActiveModel = planet_ship_record.into();
                let new_count = active.count.as_ref().saturating_sub(lost).max(0);
                active.count = Set(new_count);
                active.update(db).await.map_err(|e| format!("Update error: {:?}", e))?;
            }
        }
    }

    Ok(())
}

pub(crate) async fn add_ships_to_planet(
    db: &DatabaseConnection,
    planet_id: Uuid,
    ships_to_add: &HashMap<String, i32>,
) -> Result<(), String> {
    for (ship_key, &count) in ships_to_add {
        if count <= 0 {
            continue;
        }

        let ship = ShipType::find()
            .filter(ship_type::Column::ShipKey.eq(ship_key))
            .one(db)
            .await
            .map_err(|e| format!("DB error: {:?}", e))?
            .ok_or_else(|| format!("Ship type {} not found", ship_key))?;

        if let Some(planet_ship_record) = PlanetShip::find()
            .filter(planet_ship::Column::PlanetId.eq(planet_id))
            .filter(planet_ship::Column::ShipTypeId.eq(ship.id))
            .one(db)
            .await
            .map_err(|e| format!("DB error: {:?}", e))?
        {
            let mut active: planet_ship::ActiveModel = planet_ship_record.into();
            let new_count = active.count.as_ref() + count;
            active.count = Set(new_count);
            active.update(db).await.map_err(|e| format!("Update error: {:?}", e))?;
        } else {
            let new_record = planet_ship::ActiveModel {
                planet_id: Set(planet_id),
                ship_type_id: Set(ship.id),
                count: Set(count),
                building_count: Set(None),
                build_end_time: Set(None),
            };
            new_record.insert(db).await.map_err(|e| format!("Insert error: {:?}", e))?;
        }
    }

    Ok(())
}

pub(crate) async fn set_planet_ships(
    db: &DatabaseConnection,
    planet_id: Uuid,
    ships: &HashMap<String, i32>,
) -> Result<(), String> {
    for (ship_key, &count) in ships {
        let ship = ShipType::find()
            .filter(ship_type::Column::ShipKey.eq(ship_key))
            .one(db)
            .await
            .map_err(|e| format!("DB error: {:?}", e))?
            .ok_or_else(|| format!("Ship type {} not found", ship_key))?;

        if let Some(planet_ship_record) = PlanetShip::find()
            .filter(planet_ship::Column::PlanetId.eq(planet_id))
            .filter(planet_ship::Column::ShipTypeId.eq(ship.id))
            .one(db)
            .await
            .map_err(|e| format!("DB error: {:?}", e))?
        {
            let mut active: planet_ship::ActiveModel = planet_ship_record.into();
            active.count = Set(count);
            active.update(db).await.map_err(|e| format!("Update error: {:?}", e))?;
        } else if count > 0 {
            let new_record = planet_ship::ActiveModel {
                planet_id: Set(planet_id),
                ship_type_id: Set(ship.id),
                count: Set(count),
                building_count: Set(None),
                build_end_time: Set(None),
            };
            new_record.insert(db).await.map_err(|e| format!("Insert error: {:?}", e))?;
        }
    }

    Ok(())
}

pub(crate) async fn load_planet_tech_bonuses(
    db: &DatabaseConnection,
    planet_id: Uuid,
) -> combat::CombatBonuses {
    let planet_techs = PlanetTechnology::find()
        .filter(planet_technology::Column::PlanetId.eq(planet_id))
        .all(db)
        .await
        .unwrap_or_default();

    let all_techs = Technology::find()
        .all(db)
        .await
        .unwrap_or_default();

    let tech_key_map: HashMap<i32, String> = all_techs.iter()
        .map(|t| (t.id, t.tech_key.clone()))
        .collect();

    let mut weapons_level = 0i32;
    let mut shield_level = 0i32;
    let mut armour_level = 0i32;
    let mut laser_level = 0i32;
    let mut ion_level = 0i32;

    for pt in &planet_techs {
        match tech_key_map.get(&pt.tech_id).map(|s| s.as_str()) {
            Some("weapons_tech") => weapons_level = pt.current_level,
            Some("shield_tech")  => shield_level  = pt.current_level,
            Some("armour_tech")  => armour_level  = pt.current_level,
            Some("laser_tech")   => laser_level   = pt.current_level,
            Some("ion_tech")     => ion_level      = pt.current_level,
            _ => {}
        }
    }

    combat::CombatBonuses {
        weapons_mult: 1.0 + weapons_level as f64 * 0.1 + laser_level as f64 * 0.05 + ion_level as f64 * 0.03,
        shield_mult:  1.0 + shield_level as f64 * 0.1,
        armour_mult:  1.0 + armour_level as f64 * 0.1,
    }
}

/// Charge les bonus du vaisseau amiral d'un utilisateur et les convertit en CombatBonuses.
/// Scaling : total_stat / 10000 → multiplicateur additionnel (ex: 500 → +5%)
pub(crate) async fn load_flagship_combat_bonus(
    db: &DatabaseConnection,
    user_id: Uuid,
) -> combat::CombatBonuses {
    let fs = match Flagship::find()
        .filter(flagship::Column::UserId.eq(user_id))
        .one(db)
        .await
        .unwrap_or(None)
    {
        Some(f) => f,
        None => return combat::CombatBonuses { weapons_mult: 1.0, shield_mult: 1.0, armour_mult: 1.0 },
    };

    let modules = FlagshipModule::find()
        .filter(flagship_module::Column::FlagshipId.eq(fs.id))
        .all(db)
        .await
        .unwrap_or_default();

    let mut total_attack = fs.base_attack;
    let mut total_shield = fs.base_shield;
    let mut total_hull = fs.base_hull;

    for m in &modules {
        if let Ok(Some(mtype)) = FlagshipModuleType::find_by_id(m.module_type_id).one(db).await {
            total_attack += mtype.bonus_attack;
            total_shield += mtype.bonus_shield;
            total_hull += mtype.bonus_hull;
        }
    }

    combat::CombatBonuses {
        weapons_mult: 1.0 + total_attack as f64 / 10000.0,
        shield_mult:  1.0 + total_shield as f64 / 10000.0,
        armour_mult:  1.0 + total_hull   as f64 / 10000.0,
    }
}

pub(crate) async fn load_planet_defenses_for_combat(
    db: &DatabaseConnection,
    planet_id: Uuid,
) -> HashMap<String, i32> {
    let planet_defenses = PlanetDefense::find()
        .filter(planet_defense::Column::PlanetId.eq(planet_id))
        .all(db)
        .await
        .unwrap_or_default();

    let mut defenses = HashMap::new();
    for pd in planet_defenses {
        if pd.count > 0 {
            if let Ok(Some(def_type)) = DefenseType::find_by_id(pd.defense_type_id).one(db).await {
                defenses.insert(format!("def_{}", def_type.defense_key), pd.count);
            }
        }
    }
    defenses
}

pub(crate) async fn set_planet_defenses_after_combat(
    db: &DatabaseConnection,
    planet_id: Uuid,
    initial_defenses: &HashMap<String, i32>,
    remaining: &HashMap<String, i32>,
) {
    for key in initial_defenses.keys() {
        let defense_key = match key.strip_prefix("def_") {
            Some(k) => k,
            None => continue,
        };

        let surviving = remaining.get(key).copied().unwrap_or(0).max(0);

        if let Ok(Some(def_type)) = DefenseType::find()
            .filter(defense_type::Column::DefenseKey.eq(defense_key))
            .one(db)
            .await
        {
            if let Ok(Some(pd)) = PlanetDefense::find()
                .filter(planet_defense::Column::PlanetId.eq(planet_id))
                .filter(planet_defense::Column::DefenseTypeId.eq(def_type.id))
                .one(db)
                .await
            {
                let mut active: planet_defense::ActiveModel = pd.into();
                active.count = Set(surviving);
                let _ = active.update(db).await;
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /planets/:id/expedition-v2
// ─────────────────────────────────────────────────────────────────────────────

async fn expedition_v2_handler(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<ExpeditionPayloadV2>,
) -> impl IntoResponse {
    let mut planet = match Planet::find_by_id(id).one(&state.db).await {
        Ok(Some(p)) => p,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planet not found"}))).into_response(),
    };

    // M3 — Multiple expedition slots based on computer_tech level.
    // Max simultaneous expeditions = 1 + floor(computer_tech_level / 4).
    // (lvl 0-3 → 1 slot, lvl 4-7 → 2 slots, lvl 8-11 → 3 slots, lvl 12+ → 4 slots)
    let owner_id = planet.owner_id;
    let computer_tech_level = tech_tree::get_planet_tech_level(&state.db, id, "computer_tech")
        .await
        .unwrap_or(0);
    let max_expeditions = (1 + (computer_tech_level / 4)).min(4);

    // Count active expedition fleet_missions for this player (all their planets)
    let player_planet_ids: Vec<Uuid> = Planet::find()
        .filter(planet::Column::OwnerId.eq(owner_id))
        .all(&state.db)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|p| p.id)
        .collect();

    let now_for_check = Utc::now().naive_utc();
    let active_expedition_count = if player_planet_ids.is_empty() {
        0i64
    } else {
        use sea_orm::PaginatorTrait;
        FleetMission::find()
            .filter(fleet_mission::Column::SourcePlanetId.is_in(player_planet_ids))
            .filter(fleet_mission::Column::MissionType.eq("expedition"))
            .filter(fleet_mission::Column::ArrivalTime.gt(now_for_check))
            .count(&state.db)
            .await
            .unwrap_or(0) as i64
    };

    if active_expedition_count >= max_expeditions as i64 {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            Json(json!({
                "error": format!(
                    "Nombre maximum d'expéditions simultanées atteint ({}/{}). Améliorez Technologie Informatique pour débloquer plus de slots.",
                    active_expedition_count, max_expeditions
                ),
                "active": active_expedition_count,
                "max": max_expeditions,
                "computer_tech_level": computer_tech_level,
            })),
        ).into_response();
    }

    if payload.fleet.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "No ships selected"}))).into_response();
    }
    if payload.fleet.values().any(|&v| v <= 0) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Ship counts must be positive"}))).into_response();
    }

    let mut expedition_fuel_per_unit: f64 = 0.0;
    for (ship_key, &count) in &payload.fleet {
        if count <= 0 {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Invalid count for {}", ship_key)}))).into_response();
        }

        let ship = match ShipType::find()
            .filter(ship_type::Column::ShipKey.eq(ship_key))
            .one(&state.db)
            .await
        {
            Ok(Some(s)) => s,
            Ok(None) => return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Unknown ship type: {}", ship_key)}))).into_response(),
            Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Database error"}))).into_response(),
        };

        let planet_ship_count = match PlanetShip::find()
            .filter(planet_ship::Column::PlanetId.eq(id))
            .filter(planet_ship::Column::ShipTypeId.eq(ship.id))
            .one(&state.db)
            .await
        {
            Ok(Some(ps)) => ps.count,
            Ok(None) => 0,
            Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Database error"}))).into_response(),
        };

        if count > planet_ship_count {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Not enough {}", ship.display_name)}))).into_response();
        }

        expedition_fuel_per_unit += (count as f64) * (ship.fuel_consumption as f64);
    }

    let expedition_fuel_needed = (expedition_fuel_per_unit * 5000.0 / 35000.0).ceil().max(1.0);
    if planet.deuterium_amount < expedition_fuel_needed {
        return (StatusCode::BAD_REQUEST, Json(json!({
            "error": format!("Deutérium insuffisant pour l'expédition ({} requis, {} disponible)",
                expedition_fuel_needed as i64, planet.deuterium_amount as i64)
        }))).into_response();
    }

    {
        let fuel_after = (planet.deuterium_amount - expedition_fuel_needed).max(0.0);
        let planet_id_fuel = planet.id;
        if let Err(_) = state.db.transaction::<_, (), sea_orm::DbErr>(|txn| {
            Box::pin(async move {
                let planet_active = planet::ActiveModel {
                    id: Set(planet_id_fuel),
                    deuterium_amount: Set(fuel_after),
                    ..Default::default()
                };
                planet_active.update(txn).await?;
                Ok(())
            })
        }).await {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Échec de la déduction de carburant"}))).into_response();
        }
        // Update local planet state to reflect the deduction
        planet.deuterium_amount = fuel_after;
    }

    let config = state.config.read().unwrap_or_else(|e| e.into_inner()).clone();
    let base_duration = config.get_config("expedition_base_duration", 600.0);
    let speed_factor = config.production_speed * 2.0;
    let calm_bonus = config.get_config("expedition_calm_sector_bonus", 1.2);
    let recycler_mult = config.get_config("expedition_recycler_bonus_multiplier", 2.0);

    // ─── Config par type de vaisseau (capacity, combat_power, vulnerability) ─
    struct ShipExpedCfg { capacity: f64, combat_power: f64, vulnerability: f64 }
    // BALANCE-1-C: capacity weights revised (HIGH-003).
    // Transporter dropped from 3.5 → 1.5 to prevent trivial reward inflation by
    // massing cheap unarmed haulers.  Heavy Hunter and Bomber weights also aligned
    // with the full recommended table.
    let ship_cfg: HashMap<&str, ShipExpedCfg> = [
        ("light_hunter",  ShipExpedCfg { capacity: 1.0,  combat_power: 1.0,  vulnerability: 1.0 }),
        ("heavy_hunter",  ShipExpedCfg { capacity: 1.5,  combat_power: 2.0,  vulnerability: 0.8 }),
        ("cruiser",       ShipExpedCfg { capacity: 2.5,  combat_power: 3.0,  vulnerability: 0.5 }),
        ("battleship",    ShipExpedCfg { capacity: 3.0,  combat_power: 5.0,  vulnerability: 0.3 }),
        ("bomber",        ShipExpedCfg { capacity: 2.0,  combat_power: 4.0,  vulnerability: 0.4 }),
        ("destroyer",     ShipExpedCfg { capacity: 3.5,  combat_power: 6.0,  vulnerability: 0.3 }),
        ("death_star",    ShipExpedCfg { capacity: 8.0,  combat_power: 20.0, vulnerability: 0.1 }),
        ("transporter",   ShipExpedCfg { capacity: 1.5,  combat_power: 0.0,  vulnerability: 1.5 }),
        ("spy_probe",     ShipExpedCfg { capacity: 0.1,  combat_power: 0.0,  vulnerability: 2.5 }),
        ("recycler",      ShipExpedCfg { capacity: 1.0,  combat_power: 0.0,  vulnerability: 0.8 }),
        ("colony_ship",   ShipExpedCfg { capacity: 1.5,  combat_power: 0.0,  vulnerability: 0.7 }),
    ].into_iter().collect();

    let fleet = &payload.fleet;
    let total_ships: i32 = fleet.values().sum();
    let recyclers = fleet.get("recycler").copied().unwrap_or(0);
    let recycler_bonus = 1.0 + (recyclers as f64 * recycler_mult);

    let combat_power: f64 = fleet.iter()
        .map(|(k, &v)| v as f64 * ship_cfg.get(k.as_str()).map(|c| c.combat_power).unwrap_or(1.0))
        .sum();

    let total_capacity: f64 = fleet.iter()
        .map(|(k, &v)| v as f64 * ship_cfg.get(k.as_str()).map(|c| c.capacity).unwrap_or(1.0))
        .sum();

    // ─── RÉCOMPENSES BASÉES SUR LA PUISSANCE, PAS LE SPEED_FACTOR ──────────
    // Valeur par unité de combat_power pirate vaincu (ressources pillées)
    // Cela assure que plus les pirates sont forts → plus la récompense est grande.
    // Pour les outcomes pacifiques, on utilise la capacité de transport.
    let value_per_cp   = 5000.0_f64;   // ressources par point de combat_power pirate vaincu
    let value_per_cap  = 800.0_f64;    // ressources par unité de capacité (outcomes calmes)
    let rand_variance  = || 0.75 + rand::random::<f64>() * 0.5; // multiplicateur ×0.75–1.25

    // Base calme (floating resources, empty space)
    let base_calm_metal   = (total_capacity.max(5.0) * value_per_cap * calm_bonus * rand_variance()).floor();
    let base_calm_crystal = (base_calm_metal * (0.40 + rand::random::<f64>() * 0.15)).floor();
    let base_calm_deut    = if rand::random::<f64>() < 0.5 {
        (base_calm_metal * (0.15 + rand::random::<f64>() * 0.10)).floor()
    } else { 0.0 };

    let ship_names: HashMap<&str, &str> = [
        ("light_hunter","Chasseur Léger"), ("cruiser","Croiseur"),
        ("battleship","Cuirassé"), ("destroyer","Destructeur"),
        ("death_star","Étoile de la Mort"), ("transporter","Transporteur"),
        ("spy_probe","Sonde"), ("recycler","Recycleur"), ("colony_ship","Vaisseau Colonisation"),
    ].into_iter().collect();

    // Répartit n pertes selon vulnérabilité par type
    let split_losses_fleet = |n: i32| -> HashMap<String, i32> {
        let total_vuln: f64 = fleet.iter()
            .map(|(k, &v)| v as f64 * ship_cfg.get(k.as_str()).map(|c| c.vulnerability).unwrap_or(1.0))
            .sum();
        if total_vuln <= 0.0 || n == 0 { return HashMap::new(); }
        let mut result: HashMap<String, i32> = HashMap::new();
        let mut remaining = n;
        let mut entries: Vec<_> = fleet.iter().filter(|(_, &v)| v > 0).collect();
        entries.sort_by_key(|(k, _)| k.to_string());
        for (i, (key, &count)) in entries.iter().enumerate() {
            if remaining <= 0 { break; }
            let vuln = ship_cfg.get(key.as_str()).map(|c| c.vulnerability).unwrap_or(1.0);
            let share = if i == entries.len() - 1 {
                remaining.min(count)
            } else {
                ((n as f64 * count as f64 * vuln / total_vuln).round() as i32).clamp(0, count.min(remaining))
            };
            if share > 0 { result.insert(key.to_string(), share); remaining -= share; }
        }
        result
    };

    let push_loss_msg = |losses: &HashMap<String, i32>, prefix: &str, logs: &mut Vec<String>| {
        let parts: Vec<String> = losses.iter()
            .filter(|(_, &v)| v > 0)
            .map(|(k, &v)| format!("{} {}", v, ship_names.get(k.as_str()).copied().unwrap_or(k.as_str())))
            .collect();
        if !parts.is_empty() { logs.push(format!("{} : {}", prefix, parts.join(", "))); }
    };

    // ─── TIRAGE OUTCOME PONDÉRÉ ──────────────────────────────────────────────
    // EmptySpace=10% | FloatingResources=25% | PiratesWeak=20% |
    // PiratesMedium=25% | PiratesStrong=15% | Discovery=5%
    let outcome_roll: f64 = rand::random();
    let mut logs: Vec<String> = Vec::new();
    let mut lost_ships: HashMap<String, i32> = HashMap::new();
    let mut syndicate_credits_earned: f64 = 0.0;
    let winner: &str;

    // ── Formule de récompense au combat ─────────────────────────────────────
    // reward_metal = pirate_str × value_per_cp × tier_mult × loss_mult × rand × recycler
    // loss_mult = 1.0 + (pertes / total_ships) × 2.0  — plus tu perds, plus tu gagnes
    // Crystal ≈ 45-60% du métal | Deutérium ≈ 20-30% (selon tirage)
    let combat_reward = |pirate_str: i32, tier_mult: f64, n_losses: i32| -> (f64, f64, f64) {
        let loss_mult = 1.0 + (n_losses as f64 / total_ships as f64) * 2.0;
        let m = (pirate_str as f64 * value_per_cp * tier_mult * loss_mult
            * rand_variance() * recycler_bonus).floor();
        let c = (m * (0.45 + rand::random::<f64>() * 0.15)).floor();
        let d = if rand::random::<f64>() < 0.55 { (m * (0.18 + rand::random::<f64>() * 0.12) * rand_variance()).floor() } else { 0.0 };
        (m, c, d)
    };

    let (final_metal, final_crystal, final_deuterium) = if outcome_roll < 0.10 {
        // ── ESPACE VIDE (10%) ──────────────────────────────────────────────
        winner = "calm";
        let m = (base_calm_metal * 0.25).floor();
        let c = (base_calm_crystal * 0.25).floor();
        logs.push("SCAN : Secteur complètement désert. Aucune activité dans ce quadrant.".to_string());
        if m > 1.0 { logs.push(format!("DECOUVERTE : Micrométéorites récupérées. +{:.0} M, +{:.0} C.", m, c)); }
        if total_ships > 1 && rand::random::<f64>() < 0.30 {
            let lss = split_losses_fleet(1);
            push_loss_msg(&lss, "PERTES", &mut logs);
            lost_ships = lss;
        }
        logs.push("RESULTAT : Retour sans incident notable.".to_string());
        (m, c, 0.0)

    } else if outcome_roll < 0.35 {
        // ── RESSOURCES FLOTTANTES (25%) ────────────────────────────────────
        winner = "calm";
        let m = (base_calm_metal * recycler_bonus).floor();
        let c = (base_calm_crystal * recycler_bonus).floor();
        let d = (base_calm_deut * recycler_bonus).floor();
        logs.push("SCAN : Épave ancienne détectée. Récupération en cours.".to_string());
        if d > 0.0 { logs.push(format!("DECOUVERTE : +{:.0} Métal, +{:.0} Cristal, +{:.0} Deutérium.", m, c, d)); }
        else { logs.push(format!("DECOUVERTE : +{:.0} Métal, +{:.0} Cristal.", m, c)); }
        let total_losses = (total_ships as f64 * (rand::random::<f64>() * 0.02)).floor() as i32;
        if total_losses > 0 {
            let lss = split_losses_fleet(total_losses);
            push_loss_msg(&lss, "PERTES MINIMES", &mut logs);
            lost_ships = lss;
        }
        logs.push("RESULTAT : Mission accomplie.".to_string());
        (m, c, d)

    } else if outcome_roll < 0.55 {
        // ── PIRATES FAIBLES (20%) — tier_mult = 0.5 ───────────────────────
        logs.push("⚠️ RADAR : Pirates amateurs détectés. La flotte engage le combat.".to_string());
        let pirate_str = (combat_power * (0.15 + rand::random::<f64>() * 0.30)) as i32;
        if combat_power as i32 > pirate_str || combat_power >= 3.0 {
            winner = "victory";
            let n = ((total_ships as f64 * (0.03 + rand::random::<f64>() * 0.07)).ceil() as i32)
                .max(0).min(total_ships);
            let lss = split_losses_fleet(n);
            let (m, c, d) = combat_reward(pirate_str.max(1), 0.5, n);
            logs.push(format!("RESULTAT : Victoire ! Pirates dispersés (force estimée : {}).", pirate_str));
            push_loss_msg(&lss, "PERTES", &mut logs);
            if d > 0.0 { logs.push(format!("PILLAGE : +{:.0} M, +{:.0} C, +{:.0} D.", m, c, d)); }
            else { logs.push(format!("PILLAGE : +{:.0} Métal, +{:.0} Cristal.", m, c)); }
            lost_ships = lss;
            (m, c, d)
        } else {
            winner = "defeat";
            let n = ((total_ships as f64 * (0.40 + rand::random::<f64>() * 0.30)).ceil() as i32).max(1).min(total_ships);
            let lss = split_losses_fleet(n);
            logs.push(format!("RESULTAT : Défaite. Retraite d'urgence. (pirates : {})", pirate_str));
            push_loss_msg(&lss, "PERTES LOURDES", &mut logs);
            lost_ships = lss;
            (0.0, 0.0, 0.0)
        }

    } else if outcome_roll < 0.80 {
        // ── PIRATES MOYENS (25%) — tier_mult = 1.0 ────────────────────────
        logs.push("⚠️ RADAR : Escadron pirate en approche. Combat inévitable.".to_string());
        let pirate_str = (combat_power * (0.45 + rand::random::<f64>() * 0.45)) as i32;
        if combat_power as i32 > pirate_str {
            winner = "victory";
            let n = ((total_ships as f64 * (0.08 + rand::random::<f64>() * 0.14)).ceil() as i32)
                .max(0).min(total_ships);
            let lss = split_losses_fleet(n);
            let (m, c, d) = combat_reward(pirate_str.max(1), 1.0, n);
            logs.push(format!("RESULTAT : Victoire acharnée. Escadron neutralisé (force : {}).", pirate_str));
            push_loss_msg(&lss, "PERTES", &mut logs);
            if d > 0.0 { logs.push(format!("PILLAGE : +{:.0} M, +{:.0} C, +{:.0} D.", m, c, d)); }
            else { logs.push(format!("PILLAGE : +{:.0} Métal, +{:.0} Cristal.", m, c)); }
            lost_ships = lss;
            (m, c, d)
        } else {
            winner = "defeat";
            let n = ((total_ships as f64 * (0.35 + rand::random::<f64>() * 0.30)).ceil() as i32).max(1).min(total_ships);
            let lss = split_losses_fleet(n);
            logs.push(format!("RESULTAT : Défaite. Surpassés en nombre (pirates : {}).", pirate_str));
            push_loss_msg(&lss, "PERTES LOURDES", &mut logs);
            lost_ships = lss;
            (0.0, 0.0, 0.0)
        }

    } else if outcome_roll < 0.95 {
        // ── PIRATES FORTS (15%) — tier_mult = 2.0 ─────────────────────────
        logs.push("⚠️ RADAR : ALERTE — Flotte pirate redoutable. Combat critique.".to_string());
        let pirate_str = (combat_power * (0.85 + rand::random::<f64>() * 0.65)) as i32;
        if combat_power as i32 > pirate_str {
            winner = "victory";
            let n = ((total_ships as f64 * (0.15 + rand::random::<f64>() * 0.25)).ceil() as i32)
                .max(0).min(total_ships);
            let lss = split_losses_fleet(n);
            let (m, c, d) = combat_reward(pirate_str.max(1), 2.0, n);
            logs.push(format!("RESULTAT : Victoire héroïque ! Flotte ennemie détruite (force : {}).", pirate_str));
            push_loss_msg(&lss, "PERTES", &mut logs);
            if d > 0.0 { logs.push(format!("PILLAGE : +{:.0} M, +{:.0} C, +{:.0} D.", m, c, d)); }
            else { logs.push(format!("PILLAGE : +{:.0} Métal, +{:.0} Cristal.", m, c)); }
            lost_ships = lss;
            (m, c, d)
        } else {
            winner = "defeat";
            let n = ((total_ships as f64 * (0.50 + rand::random::<f64>() * 0.30)).ceil() as i32).max(1).min(total_ships);
            let lss = split_losses_fleet(n);
            logs.push(format!("RESULTAT : DESTRUCTION MUTUELLE. Pertes catastrophiques. (pirates : {})", pirate_str));
            push_loss_msg(&lss, "PERTES CATASTROPHIQUES", &mut logs);
            lost_ships = lss;
            (0.0, 0.0, 0.0)
        }

    } else {
        // ── DÉCOUVERTE (5%) ────────────────────────────────────────────────
        winner = "calm";
        let m = (base_calm_metal * recycler_bonus).floor();
        let c = (base_calm_crystal * recycler_bonus).floor();
        let d = (base_calm_deut * 0.5 * recycler_bonus).floor();
        // SC : base + aléatoire + bonus puissance flotte (capped)
        syndicate_credits_earned = (5.0 + (rand::random::<f64>() * 10.0).round()
            + (combat_power * 0.05_f64).min(8.0)).floor();
        logs.push("SCAN : Signal d'origine inconnue capté. Artefacts extraterrestres détectés.".to_string());
        if d > 0.0 { logs.push(format!("DECOUVERTE : +{:.0} M, +{:.0} C, +{:.0} D.", m, c, d)); }
        else { logs.push(format!("DECOUVERTE : +{:.0} Métal, +{:.0} Cristal.", m, c)); }
        logs.push(format!("DÉCOUVERTE : +{:.0} Crédit(s) Syndicat récupérés dans l'artefact.", syndicate_credits_earned));
        logs.push("RESULTAT : Données scientifiques transmises au Syndicat.".to_string());
        (m, c, d)
    };

    // BALANCE-1-E: Clamp each resource reward to the configured per-slot cap
    // (MED-003).  The config key `max_expedition_reward_per_slot` is seeded by
    // migration m20261005_000006.  Default 500_000 if the key is absent.
    let max_reward = config.get_config("max_expedition_reward_per_slot", 500_000.0);
    let final_metal     = final_metal.min(max_reward);
    let final_crystal   = final_crystal.min(max_reward);
    let final_deuterium = final_deuterium.min(max_reward);

    // Déduire les vaisseaux perdus
    for (ship_key, &count) in &lost_ships {
        if count > 0 {
            let _ = tech_tree::deduct_ships(&state.db, id, ship_key, count).await;
        }
    }

    // Crédits syndicat (découverte)
    if syndicate_credits_earned > 0.0 {
        if let Ok(Some(owner)) = User::find_by_id(planet.owner_id).one(&state.db).await {
            let new_total = owner.syndicate_credits + syndicate_credits_earned;
            let mut user_active: user::ActiveModel = owner.into();
            user_active.syndicate_credits = Set(new_total);
            let _ = user_active.update(&state.db).await;
        }
    }

    let total_ships_lost: i32 = lost_ships.values().sum();

    let expedition_report = json!({
        "winner": winner,
        "result": winner,
        "log": logs,
        "loot": {
            "metal": final_metal,
            "crystal": final_crystal,
            "deuterium": final_deuterium
        },
        "attacker_losses": total_ships_lost,
        "lost_ships": lost_ships,
        "syndicate_credits_earned": syndicate_credits_earned,
        "mission_type": "expedition"
    });

    let mut active: planet::ActiveModel = planet.clone().into();
    active.metal_amount = Set(planet.metal_amount + final_metal);
    active.crystal_amount = Set(planet.crystal_amount + final_crystal);
    active.deuterium_amount = Set((planet.deuterium_amount - expedition_fuel_needed + final_deuterium).max(0.0));

    let duration = std::cmp::max(1, (base_duration / speed_factor) as i64);
    active.expedition_end = Set(Some(Utc::now().naive_utc() + Duration::seconds(duration)));
    active.unread_report = Set(Some(serde_json::to_string(&expedition_report).unwrap_or_default()));

    if active.update(&state.db).await.is_err() {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to update planet"}))).into_response();
    }

    let updated_planet = Planet::find_by_id(id).one(&state.db).await.unwrap_or(None);

    let exp_log = combat_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        planet_id: Set(id),
        target_name: Set("Secteur Inconnu".to_string()),
        opponent_username: Set(None),
        mission_type: Set("expedition".to_string()),
        result: Set(winner.to_string()),
        loot_metal: Set(final_metal),
        loot_crystal: Set(final_crystal),
        ships_lost: Set(total_ships_lost),
        date: Set(Utc::now().naive_utc()),
        detailed_report: Set(Some(expedition_report.clone())),
        details: Set(None),
    }.insert(&state.db).await.ok();

    if let Some(ref ws) = state.ws {
        let exp_report_id = exp_log.as_ref().map(|l| l.id);
        ws.push_notification(
            planet.owner_id,
            "expedition",
            "Expédition terminée",
            &format!(
                "Loot: {}M {}C {}D",
                final_metal as i64, final_crystal as i64, final_deuterium as i64
            ),
            exp_report_id,
        ).await;
    }

    missions::update_mission_progress(&state, planet.owner_id, "expedition", "any", 1).await;
    missions::update_achievement_progress(&state, planet.owner_id, "expeditions", 1).await;

    let flagship_xp = if winner == "victory" || winner == "calm" { 10 } else { 5 };
    award_flagship_xp(&state.db, planet.owner_id, flagship_xp).await;

    Json(json!({
        "planet": updated_planet,
        "report": expedition_report
    })).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// ZAC — Zone Aérienne de Combat
// ─────────────────────────────────────────────────────────────────────────────

/// GET /planets/:id/combat-zone
/// Retourne les vaisseaux assignés à la ZAC pour une planète.
/// Inclut également le total disponible par type depuis planet_ships.
async fn get_combat_zone_handler(
    Path(planet_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let db = &state.db;

    // ZAC entries
    let zac_entries = PlanetCombatZone::find()
        .filter(planet_combat_zone::Column::PlanetId.eq(planet_id))
        .all(db)
        .await
        .unwrap_or_default();

    let zac_map: HashMap<String, i32> = zac_entries.iter()
        .map(|e| (e.ship_key.clone(), e.assigned_count))
        .collect();

    // Total fleet on planet
    let fleet = load_planet_ships_for_combat(db, planet_id).await.unwrap_or_default();

    Json(json!({
        "combat_zone": zac_map,
        "fleet": fleet,
    })).into_response()
}

#[derive(serde::Deserialize)]
struct ZacPayload {
    assignments: HashMap<String, i32>,
}

/// PUT /planets/:id/combat-zone
/// Remplace intégralement les assignations ZAC pour la planète.
/// assignments: { ship_key: count } — count 0 supprime l'entrée.
async fn set_combat_zone_handler(
    Path(planet_id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<ZacPayload>,
) -> impl IntoResponse {
    let db = &state.db;

    // Vérifier que la planète existe
    if Planet::find_by_id(planet_id).one(db).await.ok().flatten().is_none() {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "Planet not found"}))).into_response();
    }

    // Charger la flotte disponible pour valider les quantités
    let fleet = load_planet_ships_for_combat(db, planet_id).await.unwrap_or_default();

    for (ship_key, &count) in &payload.assignments {
        let available = fleet.get(ship_key).copied().unwrap_or(0);
        if count < 0 {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Negative count for {}", ship_key)}))).into_response();
        }
        if count > available {
            return (StatusCode::BAD_REQUEST, Json(json!({
                "error": format!("Not enough {}: {} requested but only {} available", ship_key, count, available)
            }))).into_response();
        }
    }

    // Supprimer toutes les anciennes entrées ZAC pour cette planète
    PlanetCombatZone::delete_many()
        .filter(planet_combat_zone::Column::PlanetId.eq(planet_id))
        .exec(db)
        .await
        .ok();

    // Insérer les nouvelles assignations (count > 0 uniquement)
    for (ship_key, &count) in &payload.assignments {
        if count > 0 {
            let _ = planet_combat_zone::ActiveModel {
                id: Set(Uuid::new_v4()),
                planet_id: Set(planet_id),
                ship_key: Set(ship_key.clone()),
                assigned_count: Set(count),
                updated_at: Set(Utc::now().fixed_offset()),
            }.insert(db).await;
        }
    }

    let updated: HashMap<String, i32> = payload.assignments.iter()
        .filter(|(_, &v)| v > 0)
        .map(|(k, &v)| (k.clone(), v))
        .collect();

    Json(json!({ "combat_zone": updated })).into_response()
}

/// DELETE /planets/:id/combat-zone
/// Vide la ZAC — tous les vaisseaux de la planète défendront (comportement par défaut).
async fn clear_combat_zone_handler(
    Path(planet_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    PlanetCombatZone::delete_many()
        .filter(planet_combat_zone::Column::PlanetId.eq(planet_id))
        .exec(&state.db)
        .await
        .ok();

    Json(json!({ "message": "Combat zone cleared" })).into_response()
}

/// Charge les vaisseaux assignés à la ZAC pour la défense.
/// Retourne HashMap vide si aucune assignation → l'appelant doit alors utiliser TOUS les vaisseaux.
pub(crate) async fn load_zac_ships_for_combat(
    db: &sea_orm::DatabaseConnection,
    planet_id: Uuid,
) -> HashMap<String, i32> {
    let entries = PlanetCombatZone::find()
        .filter(planet_combat_zone::Column::PlanetId.eq(planet_id))
        .all(db)
        .await
        .unwrap_or_default();

    entries.into_iter()
        .filter(|e| e.assigned_count > 0)
        .map(|e| (e.ship_key, e.assigned_count))
        .collect()
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /fleet/deploy — Fleet Save (C2)
// ─────────────────────────────────────────────────────────────────────────────
//
// Envoie une flotte en "déploiement" vers une autre planète du même joueur.
// Les vaisseaux sont immédiatement déduits de la planète source et ne peuvent
// pas être attaqués pendant le transit.
// La mission est résolue dans planets.rs quand arrival_time est dépassé.

async fn deploy_handler(
    State(state): State<AppState>,
    Json(payload): Json<DeployPayload>,
) -> impl IntoResponse {
    // ── Validation de base ──────────────────────────────────────────────────
    if payload.fleet.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Aucun vaisseau sélectionné"}))).into_response();
    }
    if payload.origin_planet_id == payload.destination_planet_id {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "La destination doit être différente de l'origine"}))).into_response();
    }
    if payload.fleet.values().any(|&v| v <= 0) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Les quantités de vaisseaux doivent être positives"}))).into_response();
    }

    // ── Vérifier que les deux planètes appartiennent au même joueur ─────────
    let origin = match Planet::find_by_id(payload.origin_planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète source introuvable"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response(),
    };
    let destination = match Planet::find_by_id(payload.destination_planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète destination introuvable"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response(),
    };

    if origin.owner_id != destination.owner_id {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Vous ne pouvez déployer que vers vos propres planètes"}))).into_response();
    }

    // ── Calculer le temps de transit ────────────────────────────────────────
    let dist = game_logic::calculate_distance(
        (origin.galaxy, origin.system, origin.position),
        (destination.galaxy, destination.system, destination.position),
    );
    let config_clone = state.config.read().unwrap_or_else(|e| e.into_inner()).clone();
    let base_speed = config_clone.get_config("flight_speed_multiplier", 5.0);
    let hyperspace_level = tech_tree::get_planet_tech_level(&state.db, payload.origin_planet_id, "hyperspace_tech")
        .await
        .unwrap_or(0);
    // Vitesse de déploiement = 10% de la vitesse normale (transit lent, protection longue)
    let deploy_speed = base_speed * (1.0 + hyperspace_level as f64 * 0.15) * 0.1;
    let travel_time = game_logic::calculate_flight_time(dist, deploy_speed);
    let arrival = Utc::now().naive_utc() + Duration::seconds(travel_time);

    // ── Sérialiser la flotte avant la transaction ────────────────────────────
    let fleet_json = match serde_json::to_string(&payload.fleet) {
        Ok(j) => j,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur sérialisation flotte"}))).into_response(),
    };

    let total_ships: i32 = payload.fleet.values().sum();
    let origin_planet_id = payload.origin_planet_id;
    let destination_planet_id = payload.destination_planet_id;
    let fleet_clone = payload.fleet.clone();

    // ── Transaction atomique : validation + déduction + création mission ─────
    // Validation et déduction sont dans la même transaction pour éviter tout
    // TOCTOU (double-spend si deux requêtes passent la validation en parallèle).
    let new_mission = fleet_mission::ActiveModel {
        id: Set(Uuid::new_v4()),
        source_planet_id: Set(origin_planet_id),
        target_planet_id: Set(destination_planet_id),
        mission_type: Set("deploy".to_string()),
        arrival_time: Set(arrival),
        metal: Set(0.0),
        crystal: Set(0.0),
        deuterium: Set(0.0),
        ships_count: Set(total_ships),
        fleet_data: Set(Some(fleet_json)),
        recyclers_sent: Set(0),
        departure_time: Set(Utc::now().naive_utc()),
        acs_group_id: Set(None),
    };

    if let Err(e) = state.db.transaction::<_, (), sea_orm::DbErr>(|txn| {
        let fleet_clone = fleet_clone.clone();
        let new_mission = new_mission.clone();
        Box::pin(async move {
            // Validation dans la transaction — la lecture est visible par rapport aux
            // autres transactions concurrentes qui auraient déjà déduisé.
            for (ship_key, &count) in &fleet_clone {
                let current = tech_tree::get_planet_ship_count(txn, origin_planet_id, ship_key)
                    .await
                    .unwrap_or(0);
                if count > current {
                    return Err(sea_orm::DbErr::Custom(format!(
                        "Vaisseaux insuffisants : {} requis mais {} disponibles pour {}",
                        count, current, ship_key
                    )));
                }
            }
            for (ship_key, &count) in &fleet_clone {
                tech_tree::deduct_ships(txn, origin_planet_id, ship_key, count).await?;
            }
            new_mission.insert(txn).await?;
            Ok(())
        })
    }).await {
        let msg = e.to_string();
        if msg.contains("Vaisseaux insuffisants") {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": msg}))).into_response();
        }
        eprintln!("[DEPLOY TXN FAILED] origin={origin_planet_id}: {e:?}");
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur lors du déploiement"}))).into_response();
    }

    (StatusCode::OK, Json(json!({
        "status": "success",
        "message": format!("{} vaisseaux en route vers {} (arrivée dans {}s)", total_ships, destination.name, travel_time),
        "arrival": arrival.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
        "travel_time_seconds": travel_time,
    }))).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /fleet/missions/:mission_id/recall — Rappel d'une mission de déploiement (C2)
// ─────────────────────────────────────────────────────────────────────────────
//
// Annule une mission "deploy" en cours et restitue la flotte à la planète source.
// Seul le propriétaire de la mission peut la rappeler.

async fn recall_deploy_handler(
    Path(mission_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    // On identifie le joueur appelant via le current_planet_id (même pattern que les autres handlers)
    let caller_planet_id_str = params.get("current_planet_id").cloned().unwrap_or_default();
    let caller_planet_id = match Uuid::parse_str(&caller_planet_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Paramètre current_planet_id invalide"}))).into_response(),
    };

    let caller_planet = match Planet::find_by_id(caller_planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        _ => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Planète introuvable"}))).into_response(),
    };

    // Charger la mission
    let mission = match FleetMission::find_by_id(mission_id).one(&state.db).await {
        Ok(Some(m)) => m,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Mission introuvable"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response(),
    };

    // Vérifier que la mission appartient bien à ce joueur (via planète source)
    let source_planet = match Planet::find_by_id(mission.source_planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        _ => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Planète source introuvable"}))).into_response(),
    };

    if source_planet.owner_id != caller_planet.owner_id {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Vous ne pouvez rappeler que vos propres missions"}))).into_response();
    }

    // Seule une mission "deploy" peut être rappelée via cet endpoint
    if mission.mission_type != "deploy" {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Seules les missions de déploiement peuvent être rappelées"}))).into_response();
    }

    // Restituer les vaisseaux à la planète source
    if let Some(fleet_json) = &mission.fleet_data {
        if let Ok(fleet_map) = serde_json::from_str::<HashMap<String, i32>>(fleet_json) {
            for (ship_key, count) in &fleet_map {
                if *count > 0 {
                    let _ = tech_tree::add_ships(&state.db, mission.source_planet_id, ship_key, *count).await;
                }
            }
        }
    }

    // Supprimer la mission
    if let Err(e) = FleetMission::delete_by_id(mission_id).exec(&state.db).await {
        eprintln!("[RECALL] Erreur suppression mission {mission_id}: {e:?}");
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur lors du rappel"}))).into_response();
    }

    (StatusCode::OK, Json(json!({
        "status": "recalled",
        "message": "Flotte rappelée avec succès. Les vaisseaux ont été restitués à la planète source.",
    }))).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// M10 — POST /fleet/piracy?current_planet_id=X
// Syndicate-Credits piracy mission using spy_probes.
// Success chance: attacker_espionage / (attacker_espionage + target_computer).
//   Clamped to [10%, 90%] so both outcomes are always possible.
// On success: steal 10-30% of target SC (cap 100), consume 1 probe (operative burned).
// On failure: consume 5 probes (squad intercepted).
// Cooldown: 4 hours per attacker→target pair (stored as combat_log "piracy" entry).
// ─────────────────────────────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct PiracyPayload {
    target_user_id: Uuid,
}

// Check whether the attacker has already run a piracy op against this target
// within the last `cooldown_hours` hours.
async fn check_piracy_cooldown(
    db: &DatabaseConnection,
    attacker_user_id: Uuid,
    target_user_id: Uuid,
    cooldown_hours: i64,
) -> Option<String> {
    let target_user = User::find_by_id(target_user_id).one(db).await.unwrap_or(None)?;
    let cutoff = Utc::now().naive_utc() - Duration::hours(cooldown_hours);

    let attacker_planet_ids: Vec<Uuid> = Planet::find()
        .filter(planet::Column::OwnerId.eq(attacker_user_id))
        .all(db)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|p| p.id)
        .collect();

    if attacker_planet_ids.is_empty() {
        return None;
    }

    let last_piracy = CombatLog::find()
        .filter(combat_log::Column::PlanetId.is_in(attacker_planet_ids))
        .filter(combat_log::Column::OpponentUsername.eq(&target_user.username))
        .filter(combat_log::Column::MissionType.eq("piracy"))
        .filter(combat_log::Column::Date.gt(cutoff))
        .order_by_desc(combat_log::Column::Date)
        .one(db)
        .await
        .unwrap_or(None)?;

    let next_allowed = last_piracy.date + Duration::hours(cooldown_hours);
    let remaining = next_allowed - Utc::now().naive_utc();
    let hours = remaining.num_hours().max(0);
    let minutes = (remaining.num_minutes().max(0)) % 60;

    Some(format!(
        "Piratage en cooldown. Prochain créneau contre ce joueur dans {}h {}min.",
        hours, minutes
    ))
}

async fn piracy_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<PiracyPayload>,
) -> impl IntoResponse {
    // ── Resolve attacker planet ────────────────────────────────────────────────
    let current_id_str = params.get("current_planet_id").unwrap_or(&String::new()).to_string();
    let attacker_planet_id = match Uuid::parse_str(&current_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error": "current_planet_id invalide"}))).into_response(),
    };

    let attacker_planet = match Planet::find_by_id(attacker_planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète attaquante introuvable"}))).into_response(),
    };
    let attacker_user_id = attacker_planet.owner_id;

    if attacker_user_id == payload.target_user_id {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Vous ne pouvez pas vous pirater vous-même"}))).into_response();
    }

    // ── Per-target cooldown: 4 hours ───────────────────────────────────────────
    const PIRACY_COOLDOWN_HOURS: i64 = 4;
    if let Some(cooldown_msg) = check_piracy_cooldown(
        &state.db, attacker_user_id, payload.target_user_id, PIRACY_COOLDOWN_HOURS
    ).await {
        return (StatusCode::TOO_MANY_REQUESTS, Json(json!({"error": cooldown_msg}))).into_response();
    }

    // ── Require at least 5 spy_probes on attacker planet ──────────────────────
    // On success: 1 probe burned (operative spent).
    // On failure: the ENTIRE fleet on the planet is lost (intercepted and destroyed).
    // This is the core risk/reward of the piracy mechanic — M10 design spec.
    const MIN_PROBES: i32 = 5;
    const PROBES_ON_SUCCESS: i32 = 1;
    let probe_count = tech_tree::get_planet_ship_count(&state.db, attacker_planet_id, "spy_probe")
        .await
        .unwrap_or(0);
    if probe_count < MIN_PROBES {
        return (StatusCode::BAD_REQUEST, Json(json!({
            "error": format!("Mission de piratage requiert au moins {} sondes d'espionnage (disponibles: {}). Succès: 1 sonde consommée. Échec: toute la flotte sur la planète est perdue.",
                MIN_PROBES, probe_count)
        }))).into_response();
    }

    // ── Snapshot the full fleet on this planet before the roll ────────────────
    // Needed so that on failure we can report what was lost.
    let full_fleet_snapshot = tech_tree::get_all_planet_ship_counts(&state.db, attacker_planet_id)
        .await
        .unwrap_or_default();

    // ── Fetch target user and verify they exist ────────────────────────────────
    let target_user = match User::find_by_id(payload.target_user_id).one(&state.db).await {
        Ok(Some(u)) => u,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Joueur cible introuvable"}))).into_response(),
    };

    // ── Fetch attacker's espionage_tech level (from attacker planet) ───────────
    let attacker_espionage = tech_tree::get_planet_tech_level(&state.db, attacker_planet_id, "espionage_tech")
        .await
        .unwrap_or(0)
        .max(tech_tree::get_planet_tech_level(&state.db, attacker_planet_id, "espionage")
            .await
            .unwrap_or(0));
    // Ensure at least 1 so the formula doesn't collapse to 0%
    let attacker_esp = attacker_espionage.max(1);

    // ── Fetch target's computer_tech level (from their homeworld) ─────────────
    let target_homeworld = Planet::find()
        .filter(planet::Column::OwnerId.eq(payload.target_user_id))
        .filter(planet::Column::IsHomeworld.eq(true))
        .one(&state.db)
        .await
        .unwrap_or(None);

    let target_computer = if let Some(hw) = &target_homeworld {
        tech_tree::get_planet_tech_level(&state.db, hw.id, "computer_tech")
            .await
            .unwrap_or(0)
    } else {
        0
    };
    let target_comp = target_computer.max(1);

    // ── Success probability: attacker_esp / (attacker_esp + target_comp) ──────
    // Clamped to [10%, 90%] to guarantee both outcomes are always possible.
    let raw_chance = attacker_esp as f64 / (attacker_esp + target_comp) as f64;
    let success_chance = raw_chance.clamp(0.10, 0.90);

    let roll: f64 = rand::random();
    let success = roll < success_chance;

    // ── Helper: write cooldown log entry (records the attempt for rate-limiting) ─
    // Written regardless of outcome so the 4h cooldown always applies.
    let target_username_for_log = target_user.username.clone();
    let piracy_log = combat_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        planet_id: Set(attacker_planet_id),
        target_name: Set(target_user.username.clone()),
        opponent_username: Set(Some(target_username_for_log)),
        mission_type: Set("piracy".to_string()),
        result: Set(if success { "success".to_string() } else { "failure".to_string() }),
        loot_metal: Set(0.0),
        loot_crystal: Set(0.0),
        ships_lost: Set(if success { PROBES_ON_SUCCESS } else { full_fleet_snapshot.values().sum::<i32>() }),
        date: Set(Utc::now().naive_utc()),
        detailed_report: Set(None),
        details: Set(None),
    };
    let _ = piracy_log.insert(&state.db).await;

    if success {
        // ── Burn 1 probe (the infiltrator is always consumed on success) ───────
        let _ = tech_tree::deduct_ships(&state.db, attacker_planet_id, "spy_probe", PROBES_ON_SUCCESS).await;

        // ── Steal SC ──────────────────────────────────────────────────────────
        // Steal between 10 % and 30 % of target's SC, capped at 100.
        let steal_pct = 0.10 + rand::random::<f64>() * 0.20; // 10–30 %
        let credits_stolen = (target_user.syndicate_credits * steal_pct).min(100.0).floor();

        if credits_stolen > 0.0 && target_user.syndicate_credits >= credits_stolen {
            // Atomic debit from target + credit to attacker via transaction
            let txn = match state.db.begin().await {
                Ok(t) => t,
                Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Transaction error"}))).into_response(),
            };

            // Debit target
            let mut target_active: user::ActiveModel = target_user.clone().into();
            target_active.syndicate_credits = Set(target_user.syndicate_credits - credits_stolen);
            if let Err(e) = target_active.update(&txn).await {
                eprintln!("piracy debit target error: {:?}", e);
                let _ = txn.rollback().await;
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB (débit)"}))).into_response();
            }

            // Credit attacker
            let attacker_user = match User::find_by_id(attacker_user_id).one(&txn).await {
                Ok(Some(u)) => u,
                _ => {
                    let _ = txn.rollback().await;
                    return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Attaquant introuvable"}))).into_response();
                }
            };
            let mut att_active: user::ActiveModel = attacker_user.into();
            att_active.syndicate_credits = Set({
                let prev = match att_active.syndicate_credits {
                    sea_orm::ActiveValue::Set(v) | sea_orm::ActiveValue::Unchanged(v) => v,
                    _ => 0.0,
                };
                prev + credits_stolen
            });
            if let Err(e) = att_active.update(&txn).await {
                eprintln!("piracy credit attacker error: {:?}", e);
                let _ = txn.rollback().await;
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB (crédit)"}))).into_response();
            }

            if let Err(e) = txn.commit().await {
                eprintln!("piracy commit error: {:?}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur commit"}))).into_response();
            }

            // Notify target (fire-and-forget)
            {
                let db_clone = state.db.clone();
                let target_uid = payload.target_user_id;
                let stolen_rounded = credits_stolen as i32;
                tokio::spawn(async move {
                    notifications::create_notification(
                        &db_clone,
                        target_uid,
                        "piracy",
                        "Piratage Syndicat",
                        &format!(
                            "Des pirates ont siphonné {} Crédits Syndicat depuis vos comptes. (Cooldown : 4h)",
                            stolen_rounded
                        ),
                        None,
                    ).await;
                });
            }

            missions::update_mission_progress(&state, attacker_user_id, "spy", "any", 1).await;

            (StatusCode::OK, Json(json!({
                "success": true,
                "credits_stolen": credits_stolen,
                "probes_consumed": PROBES_ON_SUCCESS,
                "attacker_espionage": attacker_espionage,
                "target_computer": target_computer,
                "success_chance": (success_chance * 100.0).round(),
                "cooldown_hours": PIRACY_COOLDOWN_HOURS,
            }))).into_response()
        } else {
            // Target had 0 SC — success but nothing to steal
            (StatusCode::OK, Json(json!({
                "success": true,
                "credits_stolen": 0.0,
                "probes_consumed": PROBES_ON_SUCCESS,
                "attacker_espionage": attacker_espionage,
                "target_computer": target_computer,
                "success_chance": (success_chance * 100.0).round(),
                "cooldown_hours": PIRACY_COOLDOWN_HOURS,
                "message": "Mission réussie, mais la cible n'a pas de Crédits Syndicat.",
            }))).into_response()
        }
    } else {
        // ── Failure: the ENTIRE fleet on the attacker planet is destroyed ─────
        // The syndicate security forces intercept and annihilate the operation.
        // This is the original M10 design intent: "Échec = perte de la flotte."
        let mut destroyed_ships: HashMap<String, i32> = HashMap::new();
        for (ship_key, count) in &full_fleet_snapshot {
            if *count > 0 {
                let _ = tech_tree::deduct_ships(
                    &state.db,
                    attacker_planet_id,
                    ship_key.as_str(),
                    *count,
                ).await;
                destroyed_ships.insert(ship_key.clone(), *count);
            }
        }

        (StatusCode::OK, Json(json!({
            "success": false,
            "credits_stolen": 0.0,
            "attacker_espionage": attacker_espionage,
            "target_computer": target_computer,
            "success_chance": (success_chance * 100.0).round(),
            "cooldown_hours": PIRACY_COOLDOWN_HOURS,
            "fleet_destroyed": destroyed_ships,
            "message": "Opération interceptée. La sécurité du Syndicat a neutralisé toute la flotte engagée.",
        }))).into_response()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACS — Allied Combat System (M7)
// Design document: ACS_DESIGN.md
// ─────────────────────────────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct CreateAcsPayload {
    leader_planet_id: Uuid,
    target_planet_id: Uuid,
    #[serde(default = "acs_default_max_join_minutes")]
    max_join_minutes: i32,
}

fn acs_default_max_join_minutes() -> i32 { 30 }

#[derive(serde::Deserialize)]
struct JoinAcsPayload {
    source_planet_id: Uuid,
    fleet: HashMap<String, i32>,
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /fleet/acs/create
// Creates an ACS coordination group. The leader must subsequently call
// /fleet/acs/:id/join to dispatch their own fleet into the group.
// ─────────────────────────────────────────────────────────────────────────────

async fn create_acs_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<CreateAcsPayload>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").map(|s| s.as_str()).unwrap_or("");
    let user_id = match Uuid::parse_str(user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "user_id invalide"}))).into_response(),
    };

    // Verify leader planet belongs to this user
    let leader_planet = match Planet::find_by_id(payload.leader_planet_id).one(&state.db).await {
        Ok(Some(p)) if p.owner_id == user_id => p,
        Ok(Some(_)) => return (StatusCode::FORBIDDEN, Json(json!({"error": "Cette planète ne vous appartient pas"}))).into_response(),
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète leader introuvable"}))).into_response(),
    };

    // Cannot self-attack
    let target_planet = match Planet::find_by_id(payload.target_planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète cible introuvable"}))).into_response(),
    };
    if target_planet.owner_id == user_id {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Impossible d'attaquer votre propre planète"}))).into_response();
    }

    // Anti-farm and beginner protection apply to the leader (same as solo attack)
    let config_clone = state.config.read().unwrap_or_else(|e| e.into_inner()).clone();
    if let Err(error_msg) = backend::protection::validate_attack(
        &state.db,
        user_id,
        target_planet.owner_id,
        payload.target_planet_id,
        &config_clone,
    ).await {
        return (StatusCode::FORBIDDEN, Json(json!({"error": error_msg}))).into_response();
    }

    // Check user doesn't already have an active ACS group
    let existing = AcsGroup::find()
        .filter(acs_group::Column::LeaderUserId.eq(user_id))
        .filter(
            sea_orm::Condition::any()
                .add(acs_group::Column::Status.eq("forming"))
                .add(acs_group::Column::Status.eq("in_flight")),
        )
        .count(&state.db)
        .await
        .unwrap_or(0);

    if existing > 0 {
        return (StatusCode::CONFLICT, Json(json!({
            "error": "Vous avez déjà un groupe ACS actif. Résolvez-le avant d'en créer un nouveau."
        }))).into_response();
    }

    let max_join = payload.max_join_minutes.clamp(5, 120);
    let now = Utc::now().naive_utc();
    let expires_at = now + Duration::minutes(max_join as i64);
    let group_id = Uuid::new_v4();

    let new_group = acs_group::ActiveModel {
        id: Set(group_id),
        leader_user_id: Set(user_id),
        target_planet_id: Set(payload.target_planet_id),
        status: Set("forming".to_string()),
        holding_until: Set(None),
        max_join_minutes: Set(max_join),
        expires_at: Set(expires_at),
        created_at: Set(now),
        resolved_at: Set(None),
    };

    if let Err(e) = new_group.insert(&state.db).await {
        eprintln!("[ACS CREATE] DB error: {e:?}");
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur lors de la création du groupe ACS"}))).into_response();
    }

    let target_coords = format!("[{}:{}:{}]", target_planet.galaxy, target_planet.system, target_planet.position);
    let leader_coords = format!("[{}:{}:{}]", leader_planet.galaxy, leader_planet.system, leader_planet.position);

    (StatusCode::CREATED, Json(json!({
        "acs_group_id": group_id,
        "target_planet_id": payload.target_planet_id,
        "target_coords": target_coords,
        "leader_coords": leader_coords,
        "expires_at": expires_at,
        "max_join_minutes": max_join,
        "instructions": format!(
            "Groupe ACS créé. Partagez l'ID '{}' avec vos alliés. Chacun doit rejoindre via POST /fleet/acs/{}/join avant la date d'expiration.",
            group_id, group_id
        )
    }))).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /fleet/acs/:acs_id/join
// A player (including the leader) dispatches their fleet to join the ACS group.
// Ships are immediately deducted atomically. Creates a fleet_mission with acs_group_id.
// ─────────────────────────────────────────────────────────────────────────────

async fn join_acs_handler(
    Path(acs_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<JoinAcsPayload>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").map(|s| s.as_str()).unwrap_or("");
    let user_id = match Uuid::parse_str(user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "user_id invalide"}))).into_response(),
    };

    // Fetch and validate ACS group
    let group = match AcsGroup::find_by_id(acs_id).one(&state.db).await {
        Ok(Some(g)) => g,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Groupe ACS introuvable"}))).into_response(),
    };

    if group.status != "forming" && group.status != "in_flight" {
        return (StatusCode::CONFLICT, Json(json!({
            "error": format!("Ce groupe ACS ne peut plus accepter de membres (statut: {})", group.status)
        }))).into_response();
    }

    let now = Utc::now().naive_utc();
    if now > group.expires_at {
        return (StatusCode::GONE, Json(json!({"error": "Ce groupe ACS a expiré"}))).into_response();
    }

    // Verify source planet belongs to this user
    let source_planet = match Planet::find_by_id(payload.source_planet_id).one(&state.db).await {
        Ok(Some(p)) if p.owner_id == user_id => p,
        Ok(Some(_)) => return (StatusCode::FORBIDDEN, Json(json!({"error": "Cette planète ne vous appartient pas"}))).into_response(),
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète source introuvable"}))).into_response(),
    };

    // Prevent duplicate join from same source planet
    let already_joined = FleetMission::find()
        .filter(fleet_mission::Column::AcsGroupId.eq(acs_id))
        .filter(fleet_mission::Column::SourcePlanetId.eq(payload.source_planet_id))
        .count(&state.db)
        .await
        .unwrap_or(0);

    if already_joined > 0 {
        return (StatusCode::CONFLICT, Json(json!({"error": "Cette planète a déjà rejoint ce groupe ACS"}))).into_response();
    }

    if payload.fleet.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Aucun vaisseau sélectionné"}))).into_response();
    }
    if payload.fleet.values().any(|&v| v <= 0) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Les quantités doivent être positives"}))).into_response();
    }

    // Fetch target planet for distance calculation
    let target_planet = match Planet::find_by_id(group.target_planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        _ => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Planète cible ACS introuvable"}))).into_response(),
    };

    // Validate ships available and compute fuel
    let mut total_ships = 0;
    let mut total_fuel: f64 = 0.0;

    for (ship_key, &count) in &payload.fleet {
        let ship = match ShipType::find()
            .filter(ship_type::Column::ShipKey.eq(ship_key))
            .one(&state.db)
            .await
        {
            Ok(Some(s)) => s,
            Ok(None) => return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Type de vaisseau inconnu: {}", ship_key)}))).into_response(),
            Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur DB"}))).into_response(),
        };

        let available = PlanetShip::find()
            .filter(planet_ship::Column::PlanetId.eq(payload.source_planet_id))
            .filter(planet_ship::Column::ShipTypeId.eq(ship.id))
            .one(&state.db)
            .await
            .ok()
            .flatten()
            .map(|ps| ps.count)
            .unwrap_or(0);

        if count > available {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Vaisseaux insuffisants: {}", ship.display_name)}))).into_response();
        }

        total_ships += count;
        total_fuel += (count as f64) * (ship.fuel_consumption as f64);
    }

    let dist = game_logic::calculate_distance(
        (source_planet.galaxy, source_planet.system, source_planet.position),
        (target_planet.galaxy, target_planet.system, target_planet.position),
    );

    let fuel_needed = (total_fuel * dist / 35000.0).ceil().max(1.0);
    if source_planet.deuterium_amount < fuel_needed {
        return (StatusCode::BAD_REQUEST, Json(json!({
            "error": format!("Deutérium insuffisant ({} requis, {} disponible)",
                fuel_needed as i64, source_planet.deuterium_amount as i64)
        }))).into_response();
    }

    // Compute arrival time (each joining fleet uses its own distance and hyperspace level)
    let speed_mult = {
        let cfg = state.config.read().unwrap_or_else(|e| e.into_inner());
        cfg.get_config("flight_speed_multiplier", 5.0)
    };
    let hyperspace_level = tech_tree::get_planet_tech_level(&state.db, payload.source_planet_id, "hyperspace_tech")
        .await
        .unwrap_or(0);
    let travel_time = game_logic::calculate_flight_time(dist, speed_mult * (1.0 + hyperspace_level as f64 * 0.15));
    let arrival = now + Duration::seconds(travel_time);

    let fleet_json = match serde_json::to_string(&payload.fleet) {
        Ok(j) => j,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur de sérialisation"}))).into_response(),
    };

    let mission_id = Uuid::new_v4();
    let att_deut_remaining = (source_planet.deuterium_amount - fuel_needed).max(0.0);
    let fleet_for_txn = payload.fleet.clone();
    let sp_for_txn = source_planet.clone();
    let fleet_json_for_txn = fleet_json.clone();
    let group_target = group.target_planet_id;

    // Atomic transaction: deduct ships + deduct deuterium + create fleet_mission
    if let Err(e) = state.db.transaction::<_, (), sea_orm::DbErr>(|txn| {
        let fleet_for_txn = fleet_for_txn.clone();
        let sp_for_txn = sp_for_txn.clone();
        let fleet_json_inner = fleet_json_for_txn.clone();
        Box::pin(async move {
            for (ship_key, &count) in &fleet_for_txn {
                tech_tree::deduct_ships(txn, sp_for_txn.id, ship_key, count).await?;
            }
            let mut sp_active: planet::ActiveModel = sp_for_txn.into();
            sp_active.deuterium_amount = Set(att_deut_remaining);
            sp_active.update(txn).await?;

            let new_mission = fleet_mission::ActiveModel {
                id: Set(mission_id),
                source_planet_id: Set(payload.source_planet_id),
                target_planet_id: Set(group_target),
                mission_type: Set("attack".to_string()),
                arrival_time: Set(arrival),
                metal: Set(0.0),
                crystal: Set(0.0),
                deuterium: Set(0.0),
                ships_count: Set(total_ships),
                fleet_data: Set(Some(fleet_json_inner)),
                recyclers_sent: Set(0),
                departure_time: Set(now),
                acs_group_id: Set(Some(acs_id)),
            };
            new_mission.insert(txn).await?;
            Ok(())
        })
    }).await {
        eprintln!("[ACS JOIN TXN FAILED] group={acs_id} planet={}: {e:?}", payload.source_planet_id);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur lors de l'intégration au groupe ACS"}))).into_response();
    }

    // If the leader is joining for the first time, transition group forming -> in_flight
    let is_leader = user_id == group.leader_user_id;
    if is_leader && group.status == "forming" {
        let mut active_group: acs_group::ActiveModel = group.into();
        active_group.status = Set("in_flight".to_string());
        let _ = active_group.update(&state.db).await;
    }

    (StatusCode::OK, Json(json!({
        "status": "joined",
        "fleet_mission_id": mission_id,
        "acs_group_id": acs_id,
        "arrival_time": arrival,
        "ships_sent": payload.fleet,
        "fuel_consumed": fuel_needed,
        "is_leader_fleet": is_leader,
        "message": "Flotte en route vers le point de rendez-vous ACS."
    }))).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /fleet/acs/:acs_id
// Returns ACS group status and member list (fleet composition + ETA per member).
// ─────────────────────────────────────────────────────────────────────────────

async fn get_acs_handler(
    Path(acs_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let group = match AcsGroup::find_by_id(acs_id).one(&state.db).await {
        Ok(Some(g)) => g,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Groupe ACS introuvable"}))).into_response(),
    };

    let missions = FleetMission::find()
        .filter(fleet_mission::Column::AcsGroupId.eq(acs_id))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let target_planet = Planet::find_by_id(group.target_planet_id)
        .one(&state.db)
        .await
        .unwrap_or(None);
    let target_coords = target_planet
        .as_ref()
        .map(|p| format!("[{}:{}:{}]", p.galaxy, p.system, p.position))
        .unwrap_or_default();

    let mut members = Vec::new();
    for mission in &missions {
        let source_planet = Planet::find_by_id(mission.source_planet_id)
            .one(&state.db)
            .await
            .unwrap_or(None);

        let member_user_id = source_planet.as_ref().map(|p| p.owner_id).unwrap_or(Uuid::nil());
        let username = match User::find_by_id(member_user_id).one(&state.db).await {
            Ok(Some(u)) => u.username,
            _ => "Inconnu".to_string(),
        };

        let fleet: HashMap<String, i32> = mission.fleet_data.as_deref()
            .and_then(|s| serde_json::from_str(s).ok())
            .unwrap_or_default();

        members.push(json!({
            "user_id": member_user_id,
            "username": username,
            "is_leader": member_user_id == group.leader_user_id,
            "fleet_mission_id": mission.id,
            "ships_sent": fleet,
            "arrival_time": mission.arrival_time,
        }));
    }

    (StatusCode::OK, Json(json!({
        "id": group.id,
        "status": group.status,
        "target_planet_id": group.target_planet_id,
        "target_coords": target_coords,
        "expires_at": group.expires_at,
        "holding_until": group.holding_until,
        "max_join_minutes": group.max_join_minutes,
        "created_at": group.created_at,
        "resolved_at": group.resolved_at,
        "member_count": members.len(),
        "members": members,
    }))).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /fleet/estimate?planet_id=X&target_galaxy=1&target_system=5&target_position=3&speed_percent=100
// P2-1.4 — Returns flight_time_seconds and deuterium_cost for a hypothetical
//           fleet dispatch so the frontend can display travel info before
//           committing to the mission. Read-only, no state mutation.
// ─────────────────────────────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct FleetEstimateQuery {
    planet_id: Uuid,
    target_galaxy: i32,
    target_system: i32,
    target_position: i32,
    /// Speed as a percentage of maximum (1–100). Defaults to 100.
    speed_percent: Option<i32>,
    /// Optional fleet composition as JSON-encoded map {"light_hunter": 5, ...}.
    /// Used to compute deuterium cost from per-ship fuel_consumption.
    fleet: Option<String>,
}

async fn fleet_estimate_handler(
    State(state): State<AppState>,
    Query(params): Query<FleetEstimateQuery>,
) -> impl IntoResponse {
    let planet = match Planet::find_by_id(params.planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        Ok(None) => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planet not found"}))).into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Database error"}))).into_response(),
    };

    let dist = game_logic::calculate_distance(
        (planet.galaxy, planet.system, planet.position),
        (params.target_galaxy, params.target_system, params.target_position),
    );

    let config = state.config.read().unwrap().clone();
    let base_speed = config.get_config("flight_speed_multiplier", 5.0);
    let hyperspace_level = tech_tree::get_planet_tech_level(&state.db, params.planet_id, "hyperspace_tech")
        .await
        .unwrap_or(0);

    // Apply speed_percent: 100% = full speed, lower values scale down the multiplier.
    let speed_pct = params.speed_percent.unwrap_or(100).clamp(1, 100) as f64 / 100.0;
    let effective_speed = base_speed * (1.0 + hyperspace_level as f64 * 0.15) * speed_pct;

    let flight_time_seconds = game_logic::calculate_flight_time(dist, effective_speed);

    // Deuterium cost: sum of (count × fuel_consumption) × distance / 1000
    // Ship types are pre-loaded in a single query to avoid N+1.
    let deuterium_cost = if let Some(fleet_json) = &params.fleet {
        let fleet_map: HashMap<String, i32> = serde_json::from_str(fleet_json).unwrap_or_default();
        if fleet_map.is_empty() {
            0.0
        } else {
            let all_ships = ShipType::find().all(&state.db).await.unwrap_or_default();
            let fuel_by_key: HashMap<String, i32> = all_ships
                .iter()
                .map(|s| (s.ship_key.clone(), s.fuel_consumption))
                .collect();
            let total_fuel_per_unit: f64 = fleet_map
                .iter()
                .map(|(key, &count)| {
                    let fuel = fuel_by_key.get(key).copied().unwrap_or(0);
                    count as f64 * fuel as f64
                })
                .sum();
            (total_fuel_per_unit * dist / 35000.0).ceil().max(1.0)
        }
    } else {
        0.0
    };

    (StatusCode::OK, Json(json!({
        "flight_time_seconds": flight_time_seconds,
        "deuterium_cost": deuterium_cost as i64,
        "distance": dist as i64,
    }))).into_response()
}
