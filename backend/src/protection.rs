use chrono::Utc;
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait};
use uuid::Uuid;

use crate::entities::{prelude::*, user, planet};

/// Check if a user is currently under beginner protection
/// Protection is active if:
/// - protection_until is not null AND still in the future
pub async fn is_user_protected(
    db: &DatabaseConnection,
    user_id: Uuid,
) -> Result<bool, sea_orm::DbErr> {
    let user_model = User::find_by_id(user_id)
        .one(db)
        .await?;

    match user_model {
        Some(user) => {
            if let Some(protection_until) = user.protection_until {
                let now = Utc::now().naive_utc();
                Ok(protection_until > now)
            } else {
                Ok(false)
            }
        },
        None => Ok(false),
    }
}

/// Check if a planet is in the beginner zone
/// A planet is in the beginner zone if its galaxy is <= beginner_zone_galaxy_max
pub async fn is_planet_in_beginner_zone(
    db: &DatabaseConnection,
    planet_id: Uuid,
    beginner_zone_galaxy_max: i32,
) -> Result<bool, sea_orm::DbErr> {
    let planet_model = Planet::find_by_id(planet_id)
        .one(db)
        .await?;

    match planet_model {
        Some(planet) => Ok(planet.galaxy <= beginner_zone_galaxy_max),
        None => Ok(false),
    }
}

/// Check if attack is allowed based on points ratio
/// Returns true if attack is allowed, false otherwise
pub fn is_attack_allowed_by_points(
    attacker_points: i64,
    defender_points: i64,
    min_ratio: f64,
    max_ratio: f64,
) -> bool {
    // If attacker has 0 points, they can attack anyone (edge case for new players)
    if attacker_points == 0 {
        return true;
    }

    // If defender has 0 points, they can be attacked (no protection)
    if defender_points == 0 {
        return true;
    }

    let ratio = defender_points as f64 / attacker_points as f64;
    ratio >= min_ratio && ratio <= max_ratio
}

/// Calculate total points for a user based on their resources, buildings, ships, etc.
/// This is a simplified calculation that can be expanded later
pub async fn calculate_user_points(
    db: &DatabaseConnection,
    user_id: Uuid,
) -> Result<i64, sea_orm::DbErr> {
    // Get all planets owned by this user
    let planets = Planet::find()
        .filter(planet::Column::OwnerId.eq(user_id))
        .all(db)
        .await?;

    let mut total_points = 0i64;

    for planet in planets {
        // Resources (divided by 1000 to avoid huge numbers)
        total_points += (planet.metal_amount / 1000.0) as i64;
        total_points += (planet.crystal_amount / 1000.0) as i64;
        total_points += (planet.deuterium_amount / 1000.0) as i64;

        // Buildings (1000 points per level)
        total_points += (planet.metal_mine_level as i64) * 1000;
        total_points += (planet.crystal_mine_level as i64) * 1000;
        total_points += (planet.deuterium_mine_level as i64) * 1000;
        total_points += (planet.solar_plant_level as i64) * 1000;
        total_points += (planet.shipyard_level as i64) * 2000;
        total_points += (planet.research_lab_level as i64) * 3000;

        // Ships (from legacy columns - TODO: update when using ship_types table)
        total_points += (planet.light_hunter_count as i64) * 3000;
        total_points += (planet.cruiser_count as i64) * 27000;
        total_points += (planet.transporter_count as i64) * 4000;
    }

    Ok(total_points)
}

/// Update the total_points field for a user
pub async fn update_user_points(
    db: &DatabaseConnection,
    user_id: Uuid,
) -> Result<(), sea_orm::DbErr> {
    use sea_orm::ActiveModelTrait;
    use sea_orm::Set;

    let points = calculate_user_points(db, user_id).await?;

    let user_model = User::find_by_id(user_id)
        .one(db)
        .await?;

    if let Some(user) = user_model {
        let mut user_active: user::ActiveModel = user.into();
        user_active.total_points = Set(points);
        user_active.update(db).await?;
    }

    Ok(())
}

/// Check if an attack is valid considering all protection rules
/// Returns Ok(()) if attack is allowed, Err with reason if not
pub async fn validate_attack(
    db: &DatabaseConnection,
    attacker_user_id: Uuid,
    defender_user_id: Uuid,
    defender_planet_id: Uuid,
    config: &crate::ServerConfigCache,
) -> Result<(), String> {
    // Don't allow self-attack
    if attacker_user_id == defender_user_id {
        return Err("Vous ne pouvez pas attaquer vos propres planètes".to_string());
    }

    // Check if protection is enabled
    let protection_enabled = config.get_config("beginner_protection_enabled", 1.0) >= 1.0;

    if !protection_enabled {
        return Ok(()); // Protection disabled, all attacks allowed
    }

    // Check if defender is under time-based protection (3 day shield)
    if is_user_protected(db, defender_user_id).await.unwrap_or(false) {
        return Err("Ce joueur est sous protection débutant (bouclier 3 jours)".to_string());
    }

    // Check if defender is in beginner zone
    let beginner_zone_enabled = config.get_config("beginner_zone_protection_enabled", 1.0) >= 1.0;

    if beginner_zone_enabled {
        let beginner_zone_galaxy_max = config.get_config("beginner_zone_galaxy_max", 1.0) as i32;

        if is_planet_in_beginner_zone(db, defender_planet_id, beginner_zone_galaxy_max).await.unwrap_or(false) {
            return Err(format!("Cette planète est dans la zone débutant (galaxie ≤ {})", beginner_zone_galaxy_max));
        }
    }

    // Check points ratio
    let attacker_user = User::find_by_id(attacker_user_id).one(db).await
        .map_err(|_| "Impossible de charger les données de l'attaquant".to_string())?
        .ok_or("Attaquant introuvable".to_string())?;

    let defender_user = User::find_by_id(defender_user_id).one(db).await
        .map_err(|_| "Impossible de charger les données du défenseur".to_string())?
        .ok_or("Défenseur introuvable".to_string())?;

    let min_ratio = config.get_config("attack_min_points_ratio", 0.2);
    let max_ratio = config.get_config("attack_max_points_ratio", 5.0);

    if !is_attack_allowed_by_points(attacker_user.total_points, defender_user.total_points, min_ratio, max_ratio) {
        let ratio = if attacker_user.total_points > 0 {
            defender_user.total_points as f64 / attacker_user.total_points as f64
        } else {
            0.0
        };

        if ratio < min_ratio {
            return Err(format!(
                "Ce joueur a trop peu de points ({} pts vs vos {} pts). Ratio minimum: {:.0}%",
                defender_user.total_points,
                attacker_user.total_points,
                min_ratio * 100.0
            ));
        } else {
            return Err(format!(
                "Ce joueur a trop de points ({} pts vs vos {} pts). Ratio maximum: {:.0}x",
                defender_user.total_points,
                attacker_user.total_points,
                max_ratio
            ));
        }
    }

    Ok(())
}
