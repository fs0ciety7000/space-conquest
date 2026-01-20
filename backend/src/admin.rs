use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use sea_orm::{
    ActiveModelTrait, EntityTrait, Set, QueryFilter, ColumnTrait, PaginatorTrait
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;
use chrono::Utc;
use bcrypt;

use crate::entities::{
    prelude::{Planet, User, ServerConfig},
    planet,
    server_config,
    user,
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

// Vérification admin - vérifie le rôle dans la DB
async fn check_admin(user_id_str: &str, state: &AppState) -> Result<Uuid, StatusCode> {
    let user_id = Uuid::parse_str(user_id_str).map_err(|_| StatusCode::UNAUTHORIZED)?;

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
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").map(|s| s.as_str()).unwrap_or("");
    if check_admin(user_id_str, &state).await.is_err() {
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
    if check_admin(user_id_str, &state).await.is_err() {
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
    if check_admin(user_id_str, &state).await.is_err() {
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
    if check_admin(user_id_str, &state).await.is_err() {
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

    // Récupérer le SPEED_FACTOR depuis la DB (fallback sur la constante)
    let speed_factor = if let Ok(Some(config)) = ServerConfig::find()
        .filter(server_config::Column::ConfigKey.eq("speed_factor"))
        .one(&state.db)
        .await
    {
        config.config_value.parse::<f64>().unwrap_or(game_logic::SPEED_FACTOR)
    } else {
        game_logic::SPEED_FACTOR
    };

    let stats = ServerStats {
        total_users,
        total_planets,
        total_metal,
        total_crystal,
        total_deuterium,
        total_ships,
        total_defenses,
        speed_factor,
    };

    Json(stats).into_response()
}

// GET /admin/config - Récupérer toutes les configurations
pub async fn get_server_config_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").map(|s| s.as_str()).unwrap_or("");
    if check_admin(user_id_str, &state).await.is_err() {
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
    Query(params): Query<HashMap<String, String>>,
    Json(updates): Json<ConfigUpdate>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").map(|s| s.as_str()).unwrap_or("");
    if check_admin(user_id_str, &state).await.is_err() {
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

    // Recharger le cache de configuration depuis la DB
    let mut new_speed_factor = game_logic::SPEED_FACTOR;
    let mut new_construction_speed = 1.0;
    let mut new_mining_speed = 1.0;
    let mut all_configs = HashMap::new();

    // Recharger toutes les configs depuis la DB
    if let Ok(configs) = ServerConfig::find().all(&state.db).await {
        for config in configs {
            // Parser les valeurs numériques
            if let Ok(val) = config.config_value.parse::<f64>() {
                all_configs.insert(config.config_key.clone(), val);

                // Mettre à jour les valeurs du cache
                match config.config_key.as_str() {
                    "speed_factor" => new_speed_factor = val,
                    "construction_speed_multiplier" => new_construction_speed = val,
                    "mining_speed_multiplier" => new_mining_speed = val,
                    _ => {}
                }
            }
        }
    }

    // Mettre à jour le cache
    if let Ok(mut cache) = state.config.write() {
        cache.speed_factor = new_speed_factor;
        cache.construction_speed = new_construction_speed;
        cache.mining_speed = new_mining_speed;
        cache.configs = all_configs.clone();
        println!("🔄 Cache reloaded with {} configs", all_configs.len());
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
    Query(params): Query<HashMap<String, String>>,
    Json(update): Json<RoleUpdate>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").map(|s| s.as_str()).unwrap_or("");
    if check_admin(user_id_str, &state).await.is_err() {
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
    Query(params): Query<HashMap<String, String>>,
    Json(update): Json<UsernameUpdate>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").map(|s| s.as_str()).unwrap_or("");
    if check_admin(user_id_str, &state).await.is_err() {
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
    Query(params): Query<HashMap<String, String>>,
    Json(update): Json<EmailUpdate>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").map(|s| s.as_str()).unwrap_or("");
    if check_admin(user_id_str, &state).await.is_err() {
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
pub struct PasswordReset {
    pub new_password: String,
}

// POST /admin/user/:id/reset-password - Réinitialiser le mot de passe
pub async fn reset_password_handler(
    Path(target_user_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(reset): Json<PasswordReset>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").map(|s| s.as_str()).unwrap_or("");
    if check_admin(user_id_str, &state).await.is_err() {
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
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").map(|s| s.as_str()).unwrap_or("");

    // Vérifier que l'admin n'essaie pas de se supprimer lui-même
    if let Ok(admin_id) = Uuid::parse_str(user_id_str) {
        if admin_id == target_user_id {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "Vous ne pouvez pas supprimer votre propre compte"})))
                .into_response();
        }
    }

    if check_admin(user_id_str, &state).await.is_err() {
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
