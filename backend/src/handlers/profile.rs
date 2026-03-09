// ─────────────────────────────────────────────────────────────────────────────
// handlers/profile.rs — User profile, friendship, and fleet preset handlers
//
// Extracted from main.rs (~lines 4458–7522).
// Exposes a `router()` function to be merged into the main Axum app.
// ─────────────────────────────────────────────────────────────────────────────

use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, ModelTrait, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect, Set,
};
use sea_orm::sea_query::extension::postgres::PgExpr;
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;

use backend::{game_logic, messaging, tech_tree, AppState};
use backend::entities::{
    prelude::{
        CombatLog, FleetMission, FleetPreset, Friendship, Planet, User,
    },
    combat_log, fleet_mission, fleet_preset, friendship, planet, user,
};

#[allow(unused_imports)]
use crate::models::{
    FleetPresetPayload, FriendRequestPayload, UpdateBioPayload, UpdateDisplayNamePayload,
    UpdateUsernamePayload, UserResponse,
};

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

pub fn router(state: crate::AppState) -> axum::Router<crate::AppState> {
    axum::Router::new()
        .route("/users/:id", axum::routing::get(get_user_handler))
        .route("/users/:id/username", axum::routing::patch(update_username_handler))
        .route(
            "/users/:id/avatar",
            axum::routing::post(upload_avatar_handler)
                .layer(axum::extract::DefaultBodyLimit::max(20 * 1024 * 1024)),
        )
        .route("/users/:id/bio", axum::routing::put(update_bio_handler))
        .route("/users/:id/display-name", axum::routing::put(update_display_name_handler))
        .route("/players/search", axum::routing::get(search_players_handler))
        .route("/players/online-count", axum::routing::get(get_online_count_handler))
        .route("/players/:user_id/profile", axum::routing::get(get_player_profile_handler))
        .route("/users/:id/friends", axum::routing::get(get_friends_handler))
        .route("/friends/request", axum::routing::post(send_friend_request_handler))
        .route("/friends/:friendship_id/accept", axum::routing::post(accept_friend_request_handler))
        .route("/friends/:friendship_id/decline", axum::routing::post(decline_friend_request_handler))
        .route("/friends/:friendship_id", axum::routing::delete(remove_friend_handler))
        .route("/users/:id/fleet-presets", axum::routing::get(get_fleet_presets_handler))
        .route("/users/:id/fleet-presets", axum::routing::post(create_fleet_preset_handler))
        .route("/users/:id/fleet-presets/:preset_id", axum::routing::put(update_fleet_preset_handler))
        .route("/users/:id/fleet-presets/:preset_id", axum::routing::delete(delete_fleet_preset_handler))
        .with_state(state)
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /users/:id
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_user_handler(
    Path(user_id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user = User::find_by_id(user_id)
        .one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    // Ne pas exposer le mot de passe
    let response = json!({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "syndicate_credits": user.syndicate_credits,
    });

    Ok(Json(response))
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /users/:id/username
// ─────────────────────────────────────────────────────────────────────────────

pub async fn update_username_handler(
    Path(user_id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<UpdateUsernamePayload>,
) -> impl IntoResponse {
    // Validation : username non vide et longueur raisonnable
    let new_username = payload.username.trim().to_string();
    if new_username.is_empty() || new_username.len() > 50 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Le nom d'utilisateur doit contenir entre 1 et 50 caractères"})),
        )
            .into_response();
    }

    // Vérifier que l'utilisateur existe
    let user = match User::find_by_id(user_id).one(&state.db).await {
        Ok(Some(u)) => u,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Utilisateur introuvable"})),
            )
                .into_response()
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Erreur DB"})),
            )
                .into_response()
        }
    };

    // Vérifier l'unicité du nouveau nom d'utilisateur
    if let Ok(Some(_)) = User::find()
        .filter(user::Column::Username.eq(&new_username))
        .filter(user::Column::Id.ne(user_id))
        .one(&state.db)
        .await
    {
        return (
            StatusCode::CONFLICT,
            Json(json!({"error": "Ce nom d'utilisateur est déjà utilisé"})),
        )
            .into_response();
    }

    // Mettre à jour le nom d'utilisateur
    let mut active_user: user::ActiveModel = user.into();
    active_user.username = Set(new_username.clone());

    match active_user.update(&state.db).await {
        Ok(updated) => Json(json!({
            "success": true,
            "message": "Nom d'utilisateur mis à jour",
            "username": updated.username
        }))
        .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Erreur lors de la mise à jour"})),
        )
            .into_response(),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /players/search
// ─────────────────────────────────────────────────────────────────────────────

pub async fn search_players_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let q = params.get("q").map(|s| s.trim().to_string()).unwrap_or_default();
    if q.len() < 2 {
        return Json(json!([])).into_response();
    }
    let exclude_id = params.get("exclude").and_then(|s| Uuid::parse_str(s).ok());

    // Case-insensitive prefix search using ILIKE (PostgreSQL)
    let users = User::find()
        .filter(
            sea_orm::sea_query::Expr::col(user::Column::Username).ilike(format!("{}%", q)),
        )
        .limit(10)
        .all(&state.db)
        .await
        .unwrap_or_default();

    let results: Vec<serde_json::Value> = users
        .into_iter()
        .filter(|u| exclude_id.map(|ex| u.id != ex).unwrap_or(true))
        .map(|u| {
            json!({
                "user_id": u.id,
                "username": u.username,
                "avatar_url": u.avatar_url,
            })
        })
        .collect();

    Json(results).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /players/online-count
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_online_count_handler(State(state): State<AppState>) -> impl IntoResponse {
    let count = state.ws.as_ref().map(|ws| ws.online_count()).unwrap_or(0);
    Json(json!({ "count": count }))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /players/:user_id/profile
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_player_profile_handler(
    Path(user_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let config = state.config.read().unwrap().clone();
    use backend::entities::{prelude::*, planet, fleet_mission};

    // Récupérer l'ID de l'utilisateur qui consulte (viewer)
    let viewer_id = params
        .get("viewer_id")
        .and_then(|s| Uuid::parse_str(s).ok());

    let is_own_profile = viewer_id.map(|v| v == user_id).unwrap_or(false);

    // Calculer le niveau d'espionnage du viewer (utilise tech_tree system)
    let espionage_level = if !is_own_profile && viewer_id.is_some() {
        let viewer_planets = Planet::find()
            .filter(planet::Column::OwnerId.eq(viewer_id.unwrap()))
            .all(&state.db)
            .await
            .unwrap_or_default();

        let mut max_espionage = 0;
        for planet in &viewer_planets {
            // Utilise get_all_planet_tech_levels pour récupérer toutes les clés en une fois
            // Cherche "espionage_tech" (clé active) ou "espionage" (clé legacy)
            if let Ok(levels) = tech_tree::get_all_planet_tech_levels(&state.db, planet.id).await {
                let level = levels.get("espionage_tech")
                    .or_else(|| levels.get("espionage"))
                    .copied()
                    .unwrap_or(0);
                if level > max_espionage {
                    max_espionage = level;
                }
            }
        }
        max_espionage
    } else {
        999 // Niveau infini pour son propre profil
    };

    // Récupérer l'utilisateur
    let user = User::find_by_id(user_id)
        .one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    // Récupérer toutes les planètes du joueur
    let planets = Planet::find()
        .filter(planet::Column::OwnerId.eq(user_id))
        .all(&state.db)
        .await
        .unwrap_or_default();

    // Calculer les points de toutes les planètes
    let mut total_points = 0;
    let mut total_economy = 0;
    let mut total_military = 0;

    for p in &planets {
        let (pts, eco, mil) =
            game_logic::calculate_planet_points(p, &state.db, &config).await;
        total_points += pts;
        total_economy += eco;
        total_military += mil;
    }

    let planet_count = planets.len();

    // Fonctions helper pour masquer les données
    fn mask_value(value: serde_json::Value, condition: bool) -> serde_json::Value {
        if condition {
            value
        } else {
            json!("█████")
        }
    }

    fn mask_number(value: i32, condition: bool) -> serde_json::Value {
        if condition {
            json!(value)
        } else {
            json!("███")
        }
    }

    // Déterminer ce qui est visible selon le niveau d'espionnage
    let show_basic = espionage_level >= 0;
    let show_points = espionage_level >= 3;
    let show_economy = espionage_level >= 5;
    let show_military = espionage_level >= 7;
    let show_fleet = espionage_level >= 10;
    let show_defenses = espionage_level >= 12;
    let show_buildings = espionage_level >= 15;
    let show_techs = espionage_level >= 18;
    let show_all = is_own_profile;

    // Flotte totale (depuis tables relationnelles)
    let mut total_fleet = 0;
    let mut total_defenses = 0;
    for p in &planets {
        let ship_counts = tech_tree::get_all_planet_ship_counts(&state.db, p.id)
            .await
            .unwrap_or_default();
        total_fleet += ship_counts.values().sum::<i32>();

        let defense_counts = tech_tree::get_all_planet_defense_counts(&state.db, p.id)
            .await
            .unwrap_or_default();
        total_defenses += defense_counts.values().sum::<i32>();
    }

    // Compter missions accomplies
    let planet_ids: Vec<Uuid> = planets.iter().map(|p| p.id).collect();
    let completed_missions = if !planet_ids.is_empty() {
        FleetMission::find()
            .filter(fleet_mission::Column::SourcePlanetId.is_in(planet_ids.clone()))
            .filter(fleet_mission::Column::ArrivalTime.lt(chrono::Utc::now().naive_utc()))
            .count(&state.db)
            .await
            .unwrap_or(0) as i32
    } else {
        0
    };

    // Statistiques de combat (72 dernières heures)
    use backend::entities::{combat_log, prelude::CombatLog};
    let (combat_victories, combat_defeats, combat_total, combat_win_rate) =
        if !planet_ids.is_empty() {
            let now = chrono::Utc::now().naive_utc();
            let seventy_two_hours_ago = now - chrono::Duration::hours(72);

            let combat_logs = CombatLog::find()
                .filter(combat_log::Column::PlanetId.is_in(planet_ids.clone()))
                .filter(combat_log::Column::Date.gte(seventy_two_hours_ago))
                .all(&state.db)
                .await
                .unwrap_or_default();

            let total = combat_logs.len();
            let victories = combat_logs
                .iter()
                .filter(|log| log.result == "victory" || log.result == "player")
                .count();
            let defeats = combat_logs
                .iter()
                .filter(|log| log.result == "defeat" || log.result == "defender")
                .count();
            let win_rate = if total > 0 {
                (victories as f64 / total as f64 * 100.0) as i32
            } else {
                0
            };

            (victories as i32, defeats as i32, total as i32, win_rate)
        } else {
            (0, 0, 0, 0)
        };

    // Score combat all-time : victoires × 100 − défaites × 25 (min 0)
    // Ajouté au score militaire pour récompenser l'activité PvP
    let (all_time_victories, all_time_defeats, combat_score) = if !planet_ids.is_empty() {
        let all_logs = CombatLog::find()
            .filter(combat_log::Column::PlanetId.is_in(planet_ids.clone()))
            .all(&state.db)
            .await
            .unwrap_or_default();
        let v = all_logs.iter()
            .filter(|l| l.result == "victory" || l.result == "player")
            .count() as i32;
        let d = all_logs.iter()
            .filter(|l| l.result == "defeat" || l.result == "defender")
            .count() as i32;
        (v, d, (v * 100 - d * 25).max(0))
    } else {
        (0, 0, 0)
    };
    total_military += combat_score;
    total_points += combat_score;

    // Planète principale (= la plus ancienne, planète mère)
    let mut planet_points_list = Vec::new();
    for p in &planets {
        let (pts, eco, mil) =
            game_logic::calculate_planet_points(p, &state.db, &config).await;
        planet_points_list.push((p, pts, eco, mil));
    }
    let main_planet_with_points: Option<(&backend::entities::planet::Model, i32, i32, i32)> =
        planet_points_list
            .iter()
            .min_by_key(|(p, _, _, _)| p.created_at)
            .map(|(p, pts, eco, mil)| (*p, *pts, *eco, *mil));

    // Badge de rang
    let rank_badge = game_logic::get_rank_badge(total_points);

    // Fetch main planet's tech levels using tech_tree system
    let main_planet_techs = if let Some((main_planet, _, _, _)) = main_planet_with_points {
        let levels = tech_tree::get_all_planet_tech_levels(&state.db, main_planet.id)
            .await
            .unwrap_or_default();
        let get = |k: &str| levels.get(k).copied().unwrap_or(0);
        Some(serde_json::json!({
            "energy":    get("energy_tech"),
            "laser":     get("laser_tech"),
            "espionage": get("espionage_tech").max(get("espionage")),
            "armour":    get("armour_tech"),
            "weapons":   get("weapons_tech"),
            "shield":    get("shield_tech"),
            "plasma":    get("plasma_tech"),
            "computer":  get("computer_tech"),
            "hyperspace": get("hyperspace_tech"),
            "astrophysics": get("astrophysics"),
            "graviton":  get("graviton_tech"),
        }))
    } else {
        None
    };

    // Fetch main planet building levels for top_buildings
    let main_planet_buildings = if let Some((main_planet, _, _, _)) = main_planet_with_points {
        let levels = tech_tree::get_all_planet_building_levels(&state.db, main_planet.id)
            .await
            .unwrap_or_default();
        let get = |k: &str| levels.get(k).copied().unwrap_or(0);
        Some((
            get("metal_mine"),
            get("crystal_mine"),
            get("deuterium_mine"),
            get("solar_plant"),
            get("shipyard"),
            get("research_lab"),
            get("hangar"),
        ))
    } else {
        None
    };

    // Formater created_at en ISO 8601 avec Z pour UTC
    let created_at_utc = user.created_at.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    // Préparer les données des planètes (déjà calculé dans planet_points_list)
    let planets_json: Vec<serde_json::Value> = planet_points_list
        .iter()
        .map(|(p, points, _, _)| {
            json!({
                "name": p.name,
                "coords": format!("[{}:{}:{}]", p.galaxy, p.system, p.position),
                "points": mask_number(*points, show_points || show_all),
            })
        })
        .collect();

    // Construire la réponse avec masquage progressif
    let is_online = state
        .ws
        .as_ref()
        .map(|ws| ws.is_user_online(user_id))
        .unwrap_or(false);

    let response = json!({
        "user_id": user.id,
        "username": user.username,
        "display_name": user.display_name.as_deref().unwrap_or(&user.username),
        "is_admin": user.role == "admin",
        "is_online": is_online,
        "avatar_url": user.avatar_url,
        "bio": if show_basic || show_all { json!(user.bio) } else { json!(null) },
        "last_login": if show_all { user.last_login.map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string()) } else { None },
        "created_at": if show_all { json!(created_at_utc) } else { json!(null) },
        "is_own_profile": is_own_profile,
        "espionage_level": espionage_level,

        // Protection data
        "protection_until": if show_all || show_basic {
            user.protection_until.map(|dt| dt.to_string())
        } else {
            None
        },
        "galaxy": main_planet_with_points.map(|(p, _, _, _)| p.galaxy),

        // Points (selon niveau)
        "total_points": mask_number(total_points, show_points || show_all),
        "economy_points": mask_number(total_economy, show_economy || show_all),
        "military_points": mask_number(total_military, show_military || show_all),
        "rank_badge": if show_points || show_all { json!(rank_badge) } else { json!("CLASSIFIÉ") },

        // Statistiques de base
        "planet_count": planet_count,
        "total_fleet": mask_number(total_fleet, show_fleet || show_all),
        "total_defenses": mask_number(total_defenses, show_all),
        "completed_missions": mask_number(completed_missions, show_military || show_all),

        // Statistiques de combat (72h)
        "combat_stats_72h": if show_military || show_all {
            json!({
                "total_battles": combat_total,
                "victories": combat_victories,
                "defeats": combat_defeats,
                "win_rate": combat_win_rate
            })
        } else {
            json!({
                "total_battles": "███",
                "victories": "███",
                "defeats": "███",
                "win_rate": "███"
            })
        },

        // Statistiques de combat all-time + contribution au score
        "combat_stats_alltime": if show_military || show_all {
            json!({
                "victories": all_time_victories,
                "defeats": all_time_defeats,
                "combat_score": combat_score
            })
        } else {
            json!({
                "victories": "███",
                "defeats": "███",
                "combat_score": "███"
            })
        },

        // Planète principale
        "main_planet": main_planet_with_points.map(|(p, points, _, _)| json!({
            "name": p.name,
            "galaxy": p.galaxy,
            "system": p.system,
            "position": p.position,
            "points": mask_number(points, show_points || show_all),
        })),

        // Bâtiments (niveau 15+)
        "top_buildings": if show_buildings || show_all {
            main_planet_buildings.map(|(metal, crystal, deuterium, solar, shipyard, research, hangar)| json!({
                "metal_mine": metal,
                "crystal_mine": crystal,
                "deuterium_mine": deuterium,
                "solar_plant": solar,
                "shipyard": shipyard,
                "research_lab": research,
                "hangar": hangar,
            }))
        } else {
            Some(json!({
                "metal_mine": "███",
                "crystal_mine": "███",
                "deuterium_mine": "███",
                "solar_plant": "███",
                "shipyard": "███",
                "research_lab": "███",
                "hangar": "███",
            }))
        },

        // Technologies (niveau 18+) - Uses tech_tree system
        "top_techs": if show_techs || show_all {
            main_planet_techs
        } else {
            Some(json!({
                "energy": "███", "laser": "███", "espionage": "███", "armour": "███",
                "weapons": "███", "shield": "███", "plasma": "███", "computer": "███",
                "hyperspace": "███", "astrophysics": "███", "graviton": "███",
            }))
        },

        // Liste des planètes
        "planets": planets_json,

        // Message d'information sur le niveau requis
        "access_info": if !show_all {
            json!({
                "message": "Certaines informations sont classifiées. Améliorez votre technologie d'espionnage pour en savoir plus.",
                "unlocks": {
                    "level_3": "Points totaux et rang",
                    "level_5": "Points économie",
                    "level_7": "Points militaire et missions",
                    "level_10": "Taille de la flotte",
                    "level_12": "Défenses",
                    "level_15": "Détails des bâtiments",
                    "level_18": "Détails des technologies"
                }
            })
        } else {
            json!(null)
        },
    });

    Ok(Json(response))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /users/:id/avatar
// ─────────────────────────────────────────────────────────────────────────────

pub async fn upload_avatar_handler(
    Path(user_id): Path<Uuid>,
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let uploads_dir =
        std::env::var("UPLOADS_DIR").unwrap_or_else(|_| "./uploads".to_string());
    let avatars_dir = format!("{}/avatars", uploads_dir);

    while let Ok(Some(field)) = multipart.next_field().await {
        let content_type = field.content_type().unwrap_or("").to_string();
        let allowed = ["image/webp", "image/png", "image/jpeg"];
        if !allowed.contains(&content_type.as_str()) {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": "Format non autorisé. Utilisez PNG, JPG ou WebP."
                })),
            )
                .into_response();
        }

        let ext = match content_type.as_str() {
            "image/webp" => "webp",
            "image/png" => "png",
            _ => "jpg",
        };

        let data = match field.bytes().await {
            Ok(d) => d,
            Err(_) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({"error": "Fichier invalide"})),
                )
                    .into_response()
            }
        };

        // Limit to 20 MB
        if data.len() > 20 * 1024 * 1024 {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": "Fichier trop volumineux (max 20 Mo)."
                })),
            )
                .into_response();
        }

        let filename = format!("{}.{}", user_id, ext);
        let path = format!("{}/{}", avatars_dir, filename);
        if std::fs::write(&path, &data).is_err() {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Erreur de sauvegarde"})),
            )
                .into_response();
        }

        let avatar_url = format!("/avatars/{}", filename);
        let user = match User::find_by_id(user_id).one(&state.db).await.unwrap() {
            Some(u) => u,
            None => {
                return (
                    StatusCode::NOT_FOUND,
                    Json(json!({"error": "Utilisateur introuvable"})),
                )
                    .into_response()
            }
        };
        let mut active: user::ActiveModel = user.into();
        active.avatar_url = Set(Some(avatar_url.clone()));
        if active.update(&state.db).await.is_err() {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Erreur de mise à jour"})),
            )
                .into_response();
        }

        return (StatusCode::OK, Json(json!({"avatar_url": avatar_url}))).into_response();
    }

    (
        StatusCode::BAD_REQUEST,
        Json(json!({"error": "Aucun fichier reçu"})),
    )
        .into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /users/:id/bio
// ─────────────────────────────────────────────────────────────────────────────

pub async fn update_bio_handler(
    Path(user_id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<UpdateBioPayload>,
) -> impl IntoResponse {
    let user = match User::find_by_id(user_id).one(&state.db).await.unwrap() {
        Some(u) => u,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Utilisateur introuvable"})),
            )
                .into_response()
        }
    };
    // Clamp bio to 500 chars
    let bio: Option<String> = if payload.bio.is_empty() {
        None
    } else {
        Some(payload.bio.chars().take(500).collect())
    };
    let mut active: user::ActiveModel = user.into();
    active.bio = Set(bio.clone());
    if active.update(&state.db).await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Erreur de mise à jour"})),
        )
            .into_response();
    }
    (StatusCode::OK, Json(json!({"bio": bio}))).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /users/:id/display-name
// ─────────────────────────────────────────────────────────────────────────────

pub async fn update_display_name_handler(
    Path(user_id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<UpdateDisplayNamePayload>,
) -> impl IntoResponse {
    let display_name = payload.display_name.trim().to_string();
    if display_name.is_empty() || display_name.chars().count() > 32 {
        return (
            StatusCode::BAD_REQUEST,
            Json(
                json!({"error": "Le nom d'affichage doit faire entre 1 et 32 caractères"}),
            ),
        )
            .into_response();
    }
    let display_name_opt = if display_name.is_empty() {
        None
    } else {
        Some(display_name.clone())
    };
    let user = match User::find_by_id(user_id).one(&state.db).await.unwrap() {
        Some(u) => u,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Utilisateur introuvable"})),
            )
                .into_response()
        }
    };
    let mut active: user::ActiveModel = user.into();
    active.display_name = Set(display_name_opt.clone());
    if active.update(&state.db).await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Erreur de mise à jour"})),
        )
            .into_response();
    }
    (StatusCode::OK, Json(json!({"display_name": display_name_opt}))).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /users/:id/friends
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_friends_handler(
    Path(user_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    // Fetch all friendships where user is sender or receiver
    let friendships = Friendship::find()
        .filter(
            sea_orm::Condition::any()
                .add(friendship::Column::SenderId.eq(user_id))
                .add(friendship::Column::ReceiverId.eq(user_id)),
        )
        .all(&state.db)
        .await
        .unwrap_or_default();

    let mut result = Vec::new();
    for f in friendships {
        let other_id = if f.sender_id == user_id {
            f.receiver_id
        } else {
            f.sender_id
        };
        let other_user = User::find_by_id(other_id)
            .one(&state.db)
            .await
            .unwrap_or(None);
        if let Some(u) = other_user {
            result.push(json!({
                "friendship_id": f.id,
                "user_id": u.id,
                "username": u.username,
                "avatar_url": u.avatar_url,
                "status": f.status,
                "is_sender": f.sender_id == user_id,
                "created_at": f.created_at,
            }));
        }
    }
    Json(result).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /friends/request
// ─────────────────────────────────────────────────────────────────────────────

// Wire type matching the original main.rs API contract (sender_id + receiver_username).
// crate::models::FriendRequestPayload has a different shape, so we use a local struct.
#[derive(serde::Deserialize)]
struct SendFriendRequestWire {
    sender_id: Uuid,
    receiver_username: String,
}

pub async fn send_friend_request_handler(
    State(state): State<AppState>,
    Json(payload): Json<SendFriendRequestWire>,
) -> impl IntoResponse {
    // Find receiver by username
    let receiver = match User::find()
        .filter(user::Column::Username.eq(&payload.receiver_username))
        .one(&state.db)
        .await
        .unwrap()
    {
        Some(u) => u,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Joueur introuvable"})),
            )
                .into_response()
        }
    };

    if receiver.id == payload.sender_id {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Impossible de s'ajouter soi-même"})),
        )
            .into_response();
    }

    // Check existing friendship
    let existing = Friendship::find()
        .filter(
            sea_orm::Condition::any()
                .add(
                    sea_orm::Condition::all()
                        .add(friendship::Column::SenderId.eq(payload.sender_id))
                        .add(friendship::Column::ReceiverId.eq(receiver.id)),
                )
                .add(
                    sea_orm::Condition::all()
                        .add(friendship::Column::SenderId.eq(receiver.id))
                        .add(friendship::Column::ReceiverId.eq(payload.sender_id)),
                ),
        )
        .one(&state.db)
        .await
        .unwrap();

    if existing.is_some() {
        return (
            StatusCode::CONFLICT,
            Json(json!({"error": "Demande déjà existante ou déjà ami"})),
        )
            .into_response();
    }

    let now = Utc::now().naive_utc();
    let new_friendship = friendship::ActiveModel {
        id: Set(Uuid::new_v4()),
        sender_id: Set(payload.sender_id),
        receiver_id: Set(receiver.id),
        status: Set("pending".to_string()),
        created_at: Set(now),
        updated_at: Set(now),
    };
    if new_friendship.insert(&state.db).await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Erreur lors de l'envoi"})),
        )
            .into_response();
    }

    // Send a notification message via messaging system
    let sender = User::find_by_id(payload.sender_id)
        .one(&state.db)
        .await
        .unwrap();
    let sender_name = sender
        .as_ref()
        .map(|u| u.username.clone())
        .unwrap_or_default();
    let _ = messaging::send_system_message(
        &state.db,
        payload.sender_id,
        receiver.id,
        &format!("Demande d'amitie de {}", sender_name),
        &format!(
            "{} vous a envoye une demande d'amitie. Rendez-vous dans votre liste d'amis pour accepter ou decliner.",
            sender_name
        ),
    )
    .await;

    (
        StatusCode::CREATED,
        Json(json!({
            "success": true,
            "receiver_id": receiver.id,
            "receiver_username": receiver.username
        })),
    )
        .into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /friends/:friendship_id/accept
// ─────────────────────────────────────────────────────────────────────────────

pub async fn accept_friend_request_handler(
    Path(friendship_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id = match params.get("user_id").and_then(|s| Uuid::parse_str(s).ok()) {
        Some(id) => id,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "user_id requis"})),
            )
                .into_response()
        }
    };

    let f = match Friendship::find_by_id(friendship_id)
        .one(&state.db)
        .await
        .unwrap()
    {
        Some(f) => f,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Demande introuvable"})),
            )
                .into_response()
        }
    };

    if f.receiver_id != user_id {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({"error": "Non autorisé"})),
        )
            .into_response();
    }
    if f.status != "pending" {
        return (
            StatusCode::CONFLICT,
            Json(json!({"error": "Cette demande n'est plus en attente"})),
        )
            .into_response();
    }

    let now = Utc::now().naive_utc();
    let mut active: friendship::ActiveModel = f.clone().into();
    active.status = Set("accepted".to_string());
    active.updated_at = Set(now);
    if active.update(&state.db).await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Erreur"})),
        )
            .into_response();
    }

    // Notify sender
    let accepter = User::find_by_id(user_id).one(&state.db).await.unwrap();
    let accepter_name = accepter
        .as_ref()
        .map(|u| u.username.clone())
        .unwrap_or_default();
    let _ = messaging::send_system_message(
        &state.db,
        user_id,
        f.sender_id,
        "Demande d'amitie acceptee",
        &format!(
            "{} a accepte votre demande d'amitie. Vous pouvez maintenant vous envoyer des ressources !",
            accepter_name
        ),
    )
    .await;

    (StatusCode::OK, Json(json!({"success": true}))).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /friends/:friendship_id/decline
// ─────────────────────────────────────────────────────────────────────────────

pub async fn decline_friend_request_handler(
    Path(friendship_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id = match params.get("user_id").and_then(|s| Uuid::parse_str(s).ok()) {
        Some(id) => id,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "user_id requis"})),
            )
                .into_response()
        }
    };

    let f = match Friendship::find_by_id(friendship_id)
        .one(&state.db)
        .await
        .unwrap()
    {
        Some(f) => f,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Demande introuvable"})),
            )
                .into_response()
        }
    };

    if f.receiver_id != user_id && f.sender_id != user_id {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({"error": "Non autorisé"})),
        )
            .into_response();
    }

    let mut active: friendship::ActiveModel = f.clone().into();
    active.status = Set("declined".to_string());
    active.updated_at = Set(Utc::now().naive_utc());
    if active.update(&state.db).await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Erreur"})),
        )
            .into_response();
    }

    (StatusCode::OK, Json(json!({"success": true}))).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /friends/:friendship_id
// ─────────────────────────────────────────────────────────────────────────────

pub async fn remove_friend_handler(
    Path(friendship_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id = match params.get("user_id").and_then(|s| Uuid::parse_str(s).ok()) {
        Some(id) => id,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "user_id requis"})),
            )
                .into_response()
        }
    };

    let f = match Friendship::find_by_id(friendship_id)
        .one(&state.db)
        .await
        .unwrap()
    {
        Some(f) => f,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Amitié introuvable"})),
            )
                .into_response()
        }
    };

    if f.sender_id != user_id && f.receiver_id != user_id {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({"error": "Non autorisé"})),
        )
            .into_response();
    }

    if f.delete(&state.db).await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Erreur"})),
        )
            .into_response();
    }

    (StatusCode::OK, Json(json!({"success": true}))).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /users/:id/fleet-presets
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_fleet_presets_handler(
    Path(user_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let presets = FleetPreset::find()
        .filter(fleet_preset::Column::UserId.eq(user_id))
        .order_by_asc(fleet_preset::Column::CreatedAt)
        .all(&state.db)
        .await
        .unwrap_or_default();

    Json(presets).into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /users/:id/fleet-presets
// ─────────────────────────────────────────────────────────────────────────────

pub async fn create_fleet_preset_handler(
    Path(user_id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<FleetPresetPayload>,
) -> impl IntoResponse {
    let name = payload.name.trim().to_string();
    if name.is_empty() || name.len() > 64 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Nom invalide (1-64 caractères)"})),
        )
            .into_response();
    }

    // Max 10 presets per user
    let count = FleetPreset::find()
        .filter(fleet_preset::Column::UserId.eq(user_id))
        .count(&state.db)
        .await
        .unwrap_or(0);

    if count >= 10 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Maximum 10 presets autorisés"})),
        )
            .into_response();
    }

    let now = Utc::now().naive_utc();
    let composition = serde_json::to_value(&payload.fleet).unwrap_or(serde_json::json!({}));
    let new_preset = fleet_preset::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(user_id),
        name: Set(name),
        composition: Set(composition),
        created_at: Set(now),
        updated_at: Set(now),
    };

    match new_preset.insert(&state.db).await {
        Ok(preset) => (StatusCode::CREATED, Json(json!(preset))).into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Erreur de création"})),
        )
            .into_response(),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /users/:id/fleet-presets/:preset_id
// ─────────────────────────────────────────────────────────────────────────────

pub async fn update_fleet_preset_handler(
    Path((user_id, preset_id)): Path<(Uuid, Uuid)>,
    State(state): State<AppState>,
    Json(payload): Json<FleetPresetPayload>,
) -> impl IntoResponse {
    let preset = match FleetPreset::find_by_id(preset_id)
        .one(&state.db)
        .await
        .unwrap_or(None)
    {
        Some(p) => p,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Preset introuvable"})),
            )
                .into_response()
        }
    };

    if preset.user_id != user_id {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({"error": "Non autorisé"})),
        )
            .into_response();
    }

    let name = payload.name.trim().to_string();
    if name.is_empty() || name.len() > 64 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Nom invalide (1-64 caractères)"})),
        )
            .into_response();
    }

    let composition = serde_json::to_value(&payload.fleet).unwrap_or(serde_json::json!({}));
    let mut active: fleet_preset::ActiveModel = preset.into();
    active.name = Set(name);
    active.composition = Set(composition);
    active.updated_at = Set(Utc::now().naive_utc());

    match active.update(&state.db).await {
        Ok(updated) => Json(json!(updated)).into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Erreur de mise à jour"})),
        )
            .into_response(),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /users/:id/fleet-presets/:preset_id
// ─────────────────────────────────────────────────────────────────────────────

pub async fn delete_fleet_preset_handler(
    Path((user_id, preset_id)): Path<(Uuid, Uuid)>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let preset = match FleetPreset::find_by_id(preset_id)
        .one(&state.db)
        .await
        .unwrap_or(None)
    {
        Some(p) => p,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Preset introuvable"})),
            )
                .into_response()
        }
    };

    if preset.user_id != user_id {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({"error": "Non autorisé"})),
        )
            .into_response();
    }

    if preset.delete(&state.db).await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Erreur de suppression"})),
        )
            .into_response();
    }

    (StatusCode::OK, Json(json!({"success": true}))).into_response()
}
