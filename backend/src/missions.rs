use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use sea_orm::{
    ActiveModelTrait, EntityTrait, Set,
    QueryFilter, QueryOrder, ColumnTrait,
};
use serde::Serialize;
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;
use chrono::{Utc, NaiveDate};
use rand::seq::SliceRandom;
use rand::prelude::IteratorRandom;

use crate::entities::{
    prelude::{DailyMission, UserDailyMission, Achievement, UserAchievement, LoginStreak, Planet},
    daily_mission, user_daily_mission, achievement, user_achievement, login_streak, planet
};
use crate::AppState;

// ============================================================================
// STRUCTURES DE RÉPONSE
// ============================================================================

#[derive(Serialize)]
pub struct MissionDisplay {
    pub id: Uuid,
    pub mission_key: String,
    pub name: String,
    pub description: String,
    pub mission_type: String,
    pub target: String,
    pub required_amount: i32,
    pub current_progress: i32,
    pub difficulty: String,
    pub reward_metal: f64,
    pub reward_crystal: f64,
    pub reward_deuterium: f64,
    pub reward_xp: i32,
    pub status: String,
    pub completed_at: Option<chrono::NaiveDateTime>,
    pub claimed_at: Option<chrono::NaiveDateTime>,
}

#[derive(Serialize)]
pub struct AchievementDisplay {
    pub id: Uuid,
    pub achievement_key: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub icon: String,
    pub color: String,
    pub condition_value: i32,
    pub current_progress: i32,
    pub points: i32,
    pub rarity: String,
    pub unlocked: bool,
    pub unlocked_at: Option<chrono::NaiveDateTime>,
    pub displayed: bool,
}

#[derive(Serialize)]
pub struct StreakInfo {
    pub current_streak: i32,
    pub best_streak: i32,
    pub total_login_days: i32,
    pub daily_reward_claimed: bool,
    pub streak_bonus_multiplier: f64,
    pub next_reward: StreakReward,
}

#[derive(Serialize)]
pub struct StreakReward {
    pub metal: f64,
    pub crystal: f64,
    pub deuterium: f64,
    pub xp: i32,
}

#[derive(Serialize)]
pub struct MissionsOverview {
    pub daily_missions: Vec<MissionDisplay>,
    pub streak: StreakInfo,
    pub total_xp: i32,
    pub missions_completed_today: i32,
    pub production_speed: f64,
    pub player_tier: i32,
    pub player_tier_name: String,
    pub missions_to_next_tier: Option<i32>,
}

// ============================================================================
// HANDLERS: MISSIONS QUOTIDIENNES
// ============================================================================

/// Récupérer les missions quotidiennes de l'utilisateur
pub async fn get_daily_missions_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    let today = Utc::now().naive_utc().date();

    // Vérifier si l'utilisateur a déjà des missions pour aujourd'hui
    let existing_missions = UserDailyMission::find()
        .filter(user_daily_mission::Column::UserId.eq(user_id))
        .filter(user_daily_mission::Column::AssignedDate.eq(today))
        .all(&state.db)
        .await
        .unwrap_or_default();

    // Calculer le tier du joueur
    let (player_tier, total_claimed) = get_player_tier(&state, user_id).await;

    // Si pas de missions, en générer
    if existing_missions.is_empty() {
        generate_daily_missions(&state, user_id, today, player_tier).await;
    }

    // Récupérer les missions avec leurs détails
    let user_missions = UserDailyMission::find()
        .filter(user_daily_mission::Column::UserId.eq(user_id))
        .filter(user_daily_mission::Column::AssignedDate.eq(today))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let mut missions = Vec::new();
    for um in user_missions {
        if let Ok(Some(mission)) = DailyMission::find_by_id(um.mission_id).one(&state.db).await {
            missions.push(MissionDisplay {
                id: um.id,
                mission_key: mission.mission_key,
                name: mission.name,
                description: mission.description,
                mission_type: mission.mission_type,
                target: mission.target,
                required_amount: mission.required_amount,
                current_progress: um.current_progress,
                difficulty: mission.difficulty,
                reward_metal: mission.reward_metal,
                reward_crystal: mission.reward_crystal,
                reward_deuterium: mission.reward_deuterium,
                reward_xp: mission.reward_xp,
                status: um.status,
                completed_at: um.completed_at,
                claimed_at: um.claimed_at,
            });
        }
    }

    // Récupérer info streak
    let streak = get_or_create_streak(&state, user_id).await;
    let streak_info = StreakInfo {
        current_streak: streak.current_streak,
        best_streak: streak.best_streak,
        total_login_days: streak.total_login_days,
        daily_reward_claimed: streak.daily_reward_claimed,
        streak_bonus_multiplier: calculate_streak_bonus(streak.current_streak),
        next_reward: calculate_streak_reward(streak.current_streak),
    };

    let completed_today = missions.iter().filter(|m| m.status == "claimed").count() as i32;
    let total_xp: i32 = missions.iter()
        .filter(|m| m.status == "claimed")
        .map(|m| m.reward_xp)
        .sum();

    let production_speed = state.config.read()
        .map(|c| c.production_speed)
        .unwrap_or(250.0);

    let (tier_name, missions_to_next) = tier_info(player_tier, total_claimed);

    Json(MissionsOverview {
        daily_missions: missions,
        streak: streak_info,
        total_xp,
        missions_completed_today: completed_today,
        production_speed,
        player_tier,
        player_tier_name: tier_name,
        missions_to_next_tier: missions_to_next,
    }).into_response()
}

/// Mettre à jour la progression d'une mission (appelé par les autres handlers)
pub async fn update_mission_progress(
    state: &AppState,
    user_id: Uuid,
    mission_type: &str,
    target: &str,
    amount: i32,
) {
    let today = Utc::now().naive_utc().date();

    // Trouver les missions actives correspondantes
    let user_missions = UserDailyMission::find()
        .filter(user_daily_mission::Column::UserId.eq(user_id))
        .filter(user_daily_mission::Column::AssignedDate.eq(today))
        .filter(user_daily_mission::Column::Status.eq("active"))
        .all(&state.db)
        .await
        .unwrap_or_default();

    for um in user_missions {
        if let Ok(Some(mission)) = DailyMission::find_by_id(um.mission_id).one(&state.db).await {
            // Vérifier si la mission correspond
            let type_match = mission.mission_type == mission_type;
            let target_match = mission.target == target || mission.target == "any";

            if type_match && target_match {
                let new_progress = um.current_progress + amount;
                let mut active: user_daily_mission::ActiveModel = um.into();
                active.current_progress = Set(new_progress);

                if new_progress >= mission.required_amount {
                    active.status = Set("completed".into());
                    active.completed_at = Set(Some(Utc::now().naive_utc()));
                }

                let _ = active.update(&state.db).await;
            }
        }
    }
}

/// Réclamer la récompense d'une mission complétée
pub async fn claim_mission_reward_handler(
    Path(mission_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    let planet_id_str = params.get("planet_id").unwrap_or(&String::new()).to_string();
    let planet_id = match Uuid::parse_str(&planet_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Planète invalide"}))).into_response(),
    };

    // Récupérer la mission utilisateur
    let user_mission = match UserDailyMission::find_by_id(mission_id).one(&state.db).await {
        Ok(Some(um)) => um,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Mission introuvable"}))).into_response(),
    };

    if user_mission.user_id != user_id {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Cette mission ne vous appartient pas"}))).into_response();
    }

    if user_mission.status != "completed" {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Mission non complétée"}))).into_response();
    }

    // Récupérer les détails de la mission
    let mission = match DailyMission::find_by_id(user_mission.mission_id).one(&state.db).await {
        Ok(Some(m)) => m,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Définition de mission introuvable"}))).into_response(),
    };

    // Récupérer le streak pour le bonus
    let streak = get_or_create_streak(&state, user_id).await;
    let bonus = calculate_streak_bonus(streak.current_streak);

    let prod_speed = state.config.read().map(|c| c.production_speed).unwrap_or(250.0);

    // Appliquer le bonus de streak ET le multiplicateur de vitesse aux récompenses
    let metal = mission.reward_metal * bonus * prod_speed;
    let crystal = mission.reward_crystal * bonus * prod_speed;
    let deuterium = mission.reward_deuterium * bonus * prod_speed;

    // Créditer la planète
    let planet = match Planet::find_by_id(planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète introuvable"}))).into_response(),
    };

    let mut planet_active: planet::ActiveModel = planet.clone().into();
    planet_active.metal_amount = Set(planet.metal_amount + metal);
    planet_active.crystal_amount = Set(planet.crystal_amount + crystal);
    planet_active.deuterium_amount = Set(planet.deuterium_amount + deuterium);
    let _ = planet_active.update(&state.db).await;

    // Marquer la mission comme réclamée
    let mut mission_active: user_daily_mission::ActiveModel = user_mission.into();
    mission_active.status = Set("claimed".into());
    mission_active.claimed_at = Set(Some(Utc::now().naive_utc()));
    let _ = mission_active.update(&state.db).await;

    (StatusCode::OK, Json(json!({
        "message": "Récompense réclamée !",
        "rewards": {
            "metal": metal,
            "crystal": crystal,
            "deuterium": deuterium,
            "xp": mission.reward_xp,
            "bonus_applied": format!("{}%", ((bonus - 1.0) * 100.0) as i32)
        }
    }))).into_response()
}

// ============================================================================
// HANDLERS: ACHIEVEMENTS
// ============================================================================

/// Récupérer tous les achievements avec la progression de l'utilisateur
pub async fn get_achievements_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    let category = params.get("category").cloned();

    // Récupérer tous les achievements
    let mut query = Achievement::find()
        .filter(achievement::Column::IsActive.eq(true))
        .order_by_asc(achievement::Column::DisplayOrder);

    if let Some(cat) = category {
        query = query.filter(achievement::Column::Category.eq(cat));
    }

    let achievements = query.all(&state.db).await.unwrap_or_default();

    // Récupérer la progression de l'utilisateur
    let user_achievements = UserAchievement::find()
        .filter(user_achievement::Column::UserId.eq(user_id))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let user_map: HashMap<Uuid, user_achievement::Model> = user_achievements
        .into_iter()
        .map(|ua| (ua.achievement_id, ua))
        .collect();

    let mut result: Vec<AchievementDisplay> = achievements.into_iter().map(|a| {
        let user_progress = user_map.get(&a.id);
        AchievementDisplay {
            id: a.id,
            achievement_key: a.achievement_key,
            name: a.name,
            description: a.description,
            category: a.category,
            icon: a.icon,
            color: a.color,
            condition_value: a.condition_value,
            current_progress: user_progress.map(|up| up.current_progress).unwrap_or(0),
            points: a.points,
            rarity: a.rarity,
            unlocked: user_progress.map(|up| up.unlocked).unwrap_or(false),
            unlocked_at: user_progress.and_then(|up| up.unlocked_at),
            displayed: user_progress.map(|up| up.displayed).unwrap_or(false),
        }
    }).collect();

    // Trier: débloqués d'abord, puis par progression
    result.sort_by(|a, b| {
        match (a.unlocked, b.unlocked) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => b.current_progress.cmp(&a.current_progress),
        }
    });

    Json(result).into_response()
}

/// Récupérer les achievements affichés sur le profil d'un utilisateur
pub async fn get_user_displayed_achievements_handler(
    Path(target_user_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let user_achievements = UserAchievement::find()
        .filter(user_achievement::Column::UserId.eq(target_user_id))
        .filter(user_achievement::Column::Unlocked.eq(true))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let mut result = Vec::new();
    for ua in user_achievements {
        if let Ok(Some(a)) = Achievement::find_by_id(ua.achievement_id).one(&state.db).await {
            result.push(json!({
                "id": a.id,
                "name": a.name,
                "icon": a.icon,
                "color": a.color,
                "rarity": a.rarity,
                "unlocked_at": ua.unlocked_at
            }));
        }
    }

    Json(result).into_response()
}

/// Définir quels achievements afficher sur le profil
pub async fn set_displayed_achievements_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(achievement_ids): Json<Vec<Uuid>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    // Maximum 5 achievements affichés
    if achievement_ids.len() > 5 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Maximum 5 achievements affichables"}))).into_response();
    }

    // D'abord, désactiver tous les displayed
    let all_user_achievements = UserAchievement::find()
        .filter(user_achievement::Column::UserId.eq(user_id))
        .all(&state.db)
        .await
        .unwrap_or_default();

    for ua in all_user_achievements {
        let mut active: user_achievement::ActiveModel = ua.clone().into();
        active.displayed = Set(achievement_ids.contains(&ua.achievement_id) && ua.unlocked);
        let _ = active.update(&state.db).await;
    }

    (StatusCode::OK, Json(json!({"message": "Achievements mis à jour"}))).into_response()
}

/// Mettre à jour la progression d'un achievement
pub async fn update_achievement_progress(
    state: &AppState,
    user_id: Uuid,
    condition_target: &str,
    amount: i32,
) {
    // Trouver les achievements correspondants
    let achievements = Achievement::find()
        .filter(achievement::Column::ConditionTarget.eq(condition_target))
        .filter(achievement::Column::IsActive.eq(true))
        .all(&state.db)
        .await
        .unwrap_or_default();

    for achievement in achievements {
        // Récupérer ou créer la progression utilisateur
        let user_ach = UserAchievement::find()
            .filter(user_achievement::Column::UserId.eq(user_id))
            .filter(user_achievement::Column::AchievementId.eq(achievement.id))
            .one(&state.db)
            .await
            .ok()
            .flatten();

        let (mut active, current, is_new) = if let Some(ua) = user_ach {
            if ua.unlocked {
                continue; // Déjà débloqué, passer
            }
            let current = ua.current_progress;
            (ua.into(), current, false)
        } else {
            let new_ua = user_achievement::ActiveModel {
                id: Set(Uuid::new_v4()),
                user_id: Set(user_id),
                achievement_id: Set(achievement.id),
                current_progress: Set(0),
                unlocked: Set(false),
                unlocked_at: Set(None),
                displayed: Set(false),
            };
            (new_ua, 0, true)
        };

        let new_progress = match achievement.condition_type.as_str() {
            "count" => current + amount,
            "threshold" => amount.max(current),
            "unique" => 1,
            _ => current + amount,
        };

        active.current_progress = Set(new_progress);

        if new_progress >= achievement.condition_value {
            active.unlocked = Set(true);
            active.unlocked_at = Set(Some(Utc::now().naive_utc()));
        }

        // Insérer ou mettre à jour
        if is_new {
            let _ = active.insert(&state.db).await;
        } else {
            let _ = active.update(&state.db).await;
        }
    }
}

// ============================================================================
// HANDLERS: LOGIN STREAK
// ============================================================================

/// Récupérer le streak de l'utilisateur
pub async fn get_streak_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    let streak = get_or_create_streak(&state, user_id).await;
    
    Json(StreakInfo {
        current_streak: streak.current_streak,
        best_streak: streak.best_streak,
        total_login_days: streak.total_login_days,
        daily_reward_claimed: streak.daily_reward_claimed,
        streak_bonus_multiplier: calculate_streak_bonus(streak.current_streak),
        next_reward: calculate_streak_reward(streak.current_streak),
    }).into_response()
}

/// Réclamer la récompense quotidienne du streak
pub async fn claim_daily_reward_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    let planet_id_str = params.get("planet_id").unwrap_or(&String::new()).to_string();
    let planet_id = match Uuid::parse_str(&planet_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Planète invalide"}))).into_response(),
    };

    let streak = get_or_create_streak(&state, user_id).await;
    let today = Utc::now().naive_utc().date();

    if streak.daily_reward_claimed && streak.last_reward_date == Some(today) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Récompense déjà réclamée aujourd'hui"}))).into_response();
    }

    let reward = calculate_streak_reward(streak.current_streak);

    let prod_speed = state.config.read().map(|c| c.production_speed).unwrap_or(250.0);

    // Appliquer le multiplicateur de production aux récompenses
    let metal = reward.metal * prod_speed;
    let crystal = reward.crystal * prod_speed;
    let deuterium = reward.deuterium * prod_speed;

    // Créditer la planète
    let planet = match Planet::find_by_id(planet_id).one(&state.db).await {
        Ok(Some(p)) => p,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Planète introuvable"}))).into_response(),
    };

    let mut planet_active: planet::ActiveModel = planet.clone().into();
    planet_active.metal_amount = Set(planet.metal_amount + metal);
    planet_active.crystal_amount = Set(planet.crystal_amount + crystal);
    planet_active.deuterium_amount = Set(planet.deuterium_amount + deuterium);
    let _ = planet_active.update(&state.db).await;

    // Marquer comme réclamé
    let mut streak_active: login_streak::ActiveModel = streak.into();
    streak_active.daily_reward_claimed = Set(true);
    streak_active.last_reward_date = Set(Some(today));

    // Save current streak before update consumes streak_active
    let current_streak = streak_active.current_streak.clone().unwrap();

    let _ = streak_active.update(&state.db).await;

    // Mettre à jour les achievements de streak
    update_achievement_progress(&state, user_id, "login_streak", current_streak).await;

    (StatusCode::OK, Json(json!({
        "message": "Récompense quotidienne réclamée !",
        "rewards": {
            "metal": metal,
            "crystal": crystal,
            "deuterium": deuterium,
            "xp": reward.xp
        }
    }))).into_response()
}

/// Mettre à jour le streak lors de la connexion
pub async fn update_login_streak(state: &AppState, user_id: Uuid) {
    let today = Utc::now().naive_utc().date();
    let streak = get_or_create_streak(state, user_id).await;

    let days_diff = (today - streak.last_login_date).num_days();

    let mut active: login_streak::ActiveModel = streak.clone().into();

    if days_diff == 0 {
        // Même jour, rien à faire
        return;
    } else if days_diff == 1 {
        // Jour consécutif
        let new_streak = streak.current_streak + 1;
        active.current_streak = Set(new_streak);
        active.best_streak = Set(new_streak.max(streak.best_streak));
        active.total_login_days = Set(streak.total_login_days + 1);
    } else {
        // Streak cassé
        active.current_streak = Set(1);
        active.total_login_days = Set(streak.total_login_days + 1);
    }

    active.last_login_date = Set(today);
    active.daily_reward_claimed = Set(false); // Reset pour le nouveau jour

    let _ = active.update(&state.db).await;
}

// ============================================================================
// HELPERS
// ============================================================================

/// Calcule le tier du joueur basé sur le nombre total de missions réclamées.
/// Retourne (tier, total_claimed).
///   Tier 1 (Débutant)  : 0–9 missions
///   Tier 2 (Apprenti)  : 10–39 missions
///   Tier 3 (Vétéran)   : 40–99 missions
///   Tier 4 (Expert)    : 100+ missions
pub async fn get_player_tier(state: &AppState, user_id: Uuid) -> (i32, i32) {
    let total_claimed = UserDailyMission::find()
        .filter(user_daily_mission::Column::UserId.eq(user_id))
        .filter(user_daily_mission::Column::Status.eq("claimed"))
        .all(&state.db)
        .await
        .unwrap_or_default()
        .len() as i32;

    let tier = match total_claimed {
        0..=9   => 1,
        10..=39 => 2,
        40..=99 => 3,
        _       => 4,
    };
    (tier, total_claimed)
}

/// Retourne (nom du tier, missions restantes avant le tier suivant ou None si max)
fn tier_info(tier: i32, total_claimed: i32) -> (String, Option<i32>) {
    match tier {
        1 => ("Débutant".into(),  Some((10 - total_claimed).max(0))),
        2 => ("Apprenti".into(),  Some((40 - total_claimed).max(0))),
        3 => ("Vétéran".into(),   Some((100 - total_claimed).max(0))),
        _ => ("Expert".into(),    None),
    }
}

async fn generate_daily_missions(state: &AppState, user_id: Uuid, date: NaiveDate, tier: i32) {
    // Récupérer les missions actives du tier du joueur
    let all_missions = DailyMission::find()
        .filter(daily_mission::Column::IsActive.eq(true))
        .filter(daily_mission::Column::Tier.eq(tier))
        .all(&state.db)
        .await
        .unwrap_or_default();

    // Séparer par difficulté
    let easy: Vec<_> = all_missions.iter().filter(|m| m.difficulty == "easy").collect();
    let medium: Vec<_> = all_missions.iter().filter(|m| m.difficulty == "medium").collect();
    let hard: Vec<_> = all_missions.iter().filter(|m| m.difficulty == "hard").collect();

    // Sélectionner les missions (dans un bloc pour que RNG soit dropped avant les await)
    let selected = {
        let mut rng = rand::thread_rng();
        let mut selected = Vec::new();

        // Sélectionner 2 easy, 2 medium, 1 hard
        if let Some(m) = easy.choose(&mut rng) { selected.push(*m); }
        if let Some(m) = easy.iter().filter(|x| !selected.contains(x)).choose(&mut rng) { selected.push(*m); }
        if let Some(m) = medium.choose(&mut rng) { selected.push(*m); }
        if let Some(m) = medium.iter().filter(|x| !selected.contains(x)).choose(&mut rng) { selected.push(*m); }
        if let Some(m) = hard.choose(&mut rng) { selected.push(*m); }

        selected
    };

    // Créer les entrées utilisateur
    for mission in selected {
        let user_mission = user_daily_mission::ActiveModel {
            id: Set(Uuid::new_v4()),
            user_id: Set(user_id),
            mission_id: Set(mission.id),
            assigned_date: Set(date),
            current_progress: Set(0),
            status: Set("active".into()),
            completed_at: Set(None),
            claimed_at: Set(None),
        };
        let _ = user_mission.insert(&state.db).await;
    }
}

async fn get_or_create_streak(state: &AppState, user_id: Uuid) -> login_streak::Model {
    let existing = LoginStreak::find()
        .filter(login_streak::Column::UserId.eq(user_id))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    if let Some(streak) = existing {
        return streak;
    }

    // Créer un nouveau streak
    let today = Utc::now().naive_utc().date();
    let new_streak = login_streak::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(user_id),
        current_streak: Set(1),
        best_streak: Set(1),
        total_login_days: Set(1),
        last_login_date: Set(today),
        daily_reward_claimed: Set(false),
        last_reward_date: Set(None),
    };

    new_streak.insert(&state.db).await.unwrap()
}

fn calculate_streak_bonus(streak: i32) -> f64 {
    // Bonus: +5% par jour de streak, max +50%
    let bonus = (streak as f64 * 0.05).min(0.5);
    1.0 + bonus
}

fn calculate_streak_reward(streak: i32) -> StreakReward {
    // Récompenses qui augmentent avec le streak
    let base_metal = 500.0;
    let base_crystal = 300.0;
    let base_deuterium = 100.0;
    let base_xp = 5;

    let multiplier = 1.0 + (streak as f64 * 0.1).min(2.0); // Max x3

    StreakReward {
        metal: base_metal * multiplier,
        crystal: base_crystal * multiplier,
        deuterium: base_deuterium * multiplier,
        xp: (base_xp as f64 * multiplier) as i32,
    }
}

// ============================================================================
// M4 — REST-style daily reward endpoints
// GET  /users/:id/daily-reward/status
// POST /users/:id/daily-reward/claim
// ============================================================================

/// Reward table keyed by (streak_day mod 7), giving milestone rewards.
/// Default (no match): 500 metal.
#[derive(Serialize, Clone)]
pub struct ResourceReward {
    pub metal: f64,
    pub crystal: f64,
    pub deuterium: f64,
    pub syndicate_credits: f64,
}

fn daily_reward_for_streak(streak: i32) -> ResourceReward {
    // streak is 1-based. Cycle repeats every 7 days.
    match streak % 7 {
        1 => ResourceReward { metal: 1000.0, crystal: 0.0,    deuterium: 0.0,   syndicate_credits: 0.0 },
        2 => ResourceReward { metal: 0.0,    crystal: 1000.0, deuterium: 0.0,   syndicate_credits: 0.0 },
        3 => ResourceReward { metal: 0.0,    crystal: 0.0,    deuterium: 500.0, syndicate_credits: 0.0 },
        4 => ResourceReward { metal: 2000.0, crystal: 1000.0, deuterium: 0.0,   syndicate_credits: 0.0 },
        5 => ResourceReward { metal: 0.0,    crystal: 0.0,    deuterium: 0.0,   syndicate_credits: 1000.0 },
        6 => ResourceReward { metal: 0.0,    crystal: 0.0,    deuterium: 0.0,   syndicate_credits: 0.0 },
        // 0 = day 7 (or multiples thereof)
        0 => ResourceReward { metal: 5000.0, crystal: 5000.0, deuterium: 2000.0, syndicate_credits: 2000.0 },
        _ => ResourceReward { metal: 500.0,  crystal: 0.0,    deuterium: 0.0,   syndicate_credits: 0.0 },
    }
}

/// GET /users/:id/daily-reward/status
/// Returns whether the player can claim today's reward and what it is.
pub async fn daily_reward_status_handler(
    Path(user_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let streak = get_or_create_streak(&state, user_id).await;
    let today = Utc::now().naive_utc().date();

    let can_claim = !streak.daily_reward_claimed || streak.last_reward_date != Some(today);
    let next_streak = if can_claim { streak.current_streak + 1 } else { streak.current_streak };
    let next_reward = daily_reward_for_streak(next_streak);

    Json(serde_json::json!({
        "can_claim": can_claim,
        "streak": streak.current_streak,
        "best_streak": streak.best_streak,
        "total_login_days": streak.total_login_days,
        "last_reward_date": streak.last_reward_date.map(|d| d.to_string()),
        "next_reward": {
            "metal": next_reward.metal,
            "crystal": next_reward.crystal,
            "deuterium": next_reward.deuterium,
            "syndicate_credits": next_reward.syndicate_credits,
        },
    })).into_response()
}

/// POST /users/:id/daily-reward/claim
/// Claims today's daily login reward for the given user.
/// Body (JSON): { "planet_id": "<uuid>" }
pub async fn daily_reward_claim_handler(
    Path(user_id): Path<Uuid>,
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    use crate::entities::prelude::User as UserEntity;
    use crate::entities::user;

    let streak = get_or_create_streak(&state, user_id).await;
    let today = Utc::now().naive_utc().date();

    if streak.daily_reward_claimed && streak.last_reward_date == Some(today) {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Récompense déjà réclamée aujourd'hui"}))).into_response();
    }

    let planet_id = match body.get("planet_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(id) => id,
        None => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "planet_id requis"}))).into_response(),
    };

    let planet = match Planet::find_by_id(planet_id).one(&state.db).await {
        Ok(Some(p)) if p.owner_id == user_id => p,
        Ok(Some(_)) => return (StatusCode::FORBIDDEN, Json(serde_json::json!({"error": "Planète non possédée"}))).into_response(),
        _ => return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Planète introuvable"}))).into_response(),
    };

    // New streak value for day being claimed
    let new_streak = streak.current_streak + 1;
    let reward = daily_reward_for_streak(new_streak);

    // Apply speed multiplier to resource rewards
    let prod_speed = state.config.read().map(|c| c.production_speed).unwrap_or(250.0);
    let metal = reward.metal * prod_speed;
    let crystal = reward.crystal * prod_speed;
    let deuterium = reward.deuterium * prod_speed;
    let sc = reward.syndicate_credits;

    // Credit planet resources
    let mut planet_active: planet::ActiveModel = planet.clone().into();
    planet_active.metal_amount = Set(planet.metal_amount + metal);
    planet_active.crystal_amount = Set(planet.crystal_amount + crystal);
    planet_active.deuterium_amount = Set(planet.deuterium_amount + deuterium);
    if let Err(e) = planet_active.update(&state.db).await {
        eprintln!("daily_reward_claim planet update error: {:?}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Erreur DB (planète)"}))).into_response();
    }

    // Credit SC if any
    if sc > 0.0 {
        if let Ok(Some(user_row)) = UserEntity::find_by_id(user_id).one(&state.db).await {
            let mut user_active: user::ActiveModel = user_row.clone().into();
            user_active.syndicate_credits = Set(user_row.syndicate_credits + sc);
            let _ = user_active.update(&state.db).await;
        }
    }

    // Mark streak as claimed and advance
    let mut streak_active: login_streak::ActiveModel = streak.into();
    streak_active.current_streak = Set(new_streak);
    streak_active.best_streak = Set(match streak_active.best_streak.clone() {
        sea_orm::ActiveValue::Set(v) | sea_orm::ActiveValue::Unchanged(v) => v.max(new_streak),
        _ => new_streak,
    });
    streak_active.total_login_days = Set(match streak_active.total_login_days.clone() {
        sea_orm::ActiveValue::Set(v) | sea_orm::ActiveValue::Unchanged(v) => v + 1,
        _ => 1,
    });
    streak_active.daily_reward_claimed = Set(true);
    streak_active.last_reward_date = Set(Some(today));
    streak_active.last_login_date = Set(today);
    let _ = streak_active.update(&state.db).await;

    (StatusCode::OK, Json(serde_json::json!({
        "success": true,
        "streak": new_streak,
        "rewards": {
            "metal": metal,
            "crystal": crystal,
            "deuterium": deuterium,
            "syndicate_credits": sc,
        },
    }))).into_response()
}
