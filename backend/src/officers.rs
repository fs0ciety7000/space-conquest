use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::entities::prelude::*;
use crate::AppState;

// ============================================================================
// TYPES
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct OfficerTemplateResponse {
    pub id: String,
    pub name: String,
    pub description: String,
    pub specialization: String,
    pub rarity: String,
    pub bonus_type: String,
    pub base_bonus_value: f64,
    pub bonus_per_level: f64,
    pub max_level: i32,
    pub image_type: String,
    pub recruitment_cost_metal: f64,
    pub recruitment_cost_crystal: f64,
    pub recruitment_cost_deuterium: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserOfficerResponse {
    pub id: String,
    pub template: OfficerTemplateResponse,
    pub level: i32,
    pub experience: i32,
    pub is_active: bool,
    pub recruited_at: String,
    pub current_bonus: f64,
}

#[derive(Debug, Deserialize)]
pub struct RecruitOfficerRequest {
    pub officer_template_id: String,
}

#[derive(Debug, Serialize)]
pub struct LevelUpCostResponse {
    pub metal: f64,
    pub crystal: f64,
    pub deuterium: f64,
    pub next_level: i32,
    pub next_bonus: f64,
}

// ============================================================================
// HANDLERS
// ============================================================================

/// Liste tous les templates d'officiers disponibles
pub async fn list_officer_templates_handler(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let templates = OfficerTemplate::find()
        .filter(crate::entities::officer_template::Column::IsAvailable.eq(true))
        .all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let response: Vec<OfficerTemplateResponse> = templates
        .into_iter()
        .map(|t| OfficerTemplateResponse {
            id: t.id.to_string(),
            name: t.name,
            description: t.description,
            specialization: t.specialization,
            rarity: t.rarity,
            bonus_type: t.bonus_type,
            base_bonus_value: t.base_bonus_value,
            bonus_per_level: t.bonus_per_level,
            max_level: t.max_level,
            image_type: t.image_type,
            recruitment_cost_metal: t.recruitment_cost_metal,
            recruitment_cost_crystal: t.recruitment_cost_crystal,
            recruitment_cost_deuterium: t.recruitment_cost_deuterium,
        })
        .collect();

    Ok(Json(response))
}

/// Liste les officiers d'un utilisateur
pub async fn get_user_officers_handler(
    Path(user_id): Path<String>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let user_uuid = Uuid::parse_str(&user_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid user ID".to_string()))?;

    let officers = UserOfficer::find()
        .filter(crate::entities::user_officer::Column::UserId.eq(user_uuid))
        .find_also_related(OfficerTemplate)
        .all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let response: Vec<UserOfficerResponse> = officers
        .into_iter()
        .filter_map(|(officer, template_opt)| {
            template_opt.map(|template| {
                let current_bonus = calculate_bonus(&template, officer.level);
                UserOfficerResponse {
                    id: officer.id.to_string(),
                    template: OfficerTemplateResponse {
                        id: template.id.to_string(),
                        name: template.name,
                        description: template.description,
                        specialization: template.specialization,
                        rarity: template.rarity,
                        bonus_type: template.bonus_type,
                        base_bonus_value: template.base_bonus_value,
                        bonus_per_level: template.bonus_per_level,
                        max_level: template.max_level,
                        image_type: template.image_type,
                        recruitment_cost_metal: template.recruitment_cost_metal,
                        recruitment_cost_crystal: template.recruitment_cost_crystal,
                        recruitment_cost_deuterium: template.recruitment_cost_deuterium,
                    },
                    level: officer.level,
                    experience: officer.experience,
                    is_active: officer.is_active,
                    recruited_at: officer.recruited_at.to_string(),
                    current_bonus,
                }
            })
        })
        .collect();

    Ok(Json(response))
}

/// Recrute un officier
pub async fn recruit_officer_handler(
    Path(user_id): Path<String>,
    State(state): State<AppState>,
    Json(payload): Json<RecruitOfficerRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let user_uuid = Uuid::parse_str(&user_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid user ID".to_string()))?;

    let template_uuid = Uuid::parse_str(&payload.officer_template_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid template ID".to_string()))?;

    // Vérifier que le template existe et est disponible
    let template = OfficerTemplate::find_by_id(template_uuid)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Officer template not found".to_string()))?;

    if !template.is_available {
        return Err((StatusCode::BAD_REQUEST, "Officer not available".to_string()));
    }

    // Vérifier que l'utilisateur possède au moins une planète
    let planet = Planet::find()
        .filter(crate::entities::planet::Column::OwnerId.eq(user_uuid))
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "No planet found for user".to_string()))?;

    let prod_speed = state.config.read().map(|c| c.production_speed).unwrap_or(250.0);

    // Coûts des officiers scalés avec la production (même ratio que les autres coûts)
    let actual_cost_metal = template.recruitment_cost_metal / prod_speed;
    let actual_cost_crystal = template.recruitment_cost_crystal / prod_speed;
    let actual_cost_deuterium = template.recruitment_cost_deuterium / prod_speed;

    // Vérifier que le joueur a assez de ressources
    if planet.metal_amount < actual_cost_metal {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Pas assez de métal (requis: {:.0}, disponible: {:.0})",
                actual_cost_metal, planet.metal_amount)
        ));
    }
    if planet.crystal_amount < actual_cost_crystal {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Pas assez de cristal (requis: {:.0}, disponible: {:.0})",
                actual_cost_crystal, planet.crystal_amount)
        ));
    }
    if planet.deuterium_amount < actual_cost_deuterium {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Pas assez de deutérium (requis: {:.0}, disponible: {:.0})",
                actual_cost_deuterium, planet.deuterium_amount)
        ));
    }

    // Déduire les ressources
    let mut planet_active: crate::entities::planet::ActiveModel = planet.clone().into();
    planet_active.metal_amount = Set(planet.metal_amount - actual_cost_metal);
    planet_active.crystal_amount = Set(planet.crystal_amount - actual_cost_crystal);
    planet_active.deuterium_amount = Set(planet.deuterium_amount - actual_cost_deuterium);
    planet_active.last_update = Set(chrono::Utc::now().naive_utc());
    planet_active.update(&state.db).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Créer l'officier
    let new_officer = crate::entities::user_officer::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(user_uuid),
        officer_template_id: Set(template_uuid),
        level: Set(1),
        experience: Set(0),
        is_active: Set(true),
        recruited_at: Set(chrono::Utc::now().naive_utc()),
    };

    let officer = new_officer
        .insert(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let current_bonus = calculate_bonus(&template, officer.level);

    let response = UserOfficerResponse {
        id: officer.id.to_string(),
        template: OfficerTemplateResponse {
            id: template.id.to_string(),
            name: template.name,
            description: template.description,
            specialization: template.specialization,
            rarity: template.rarity,
            bonus_type: template.bonus_type,
            base_bonus_value: template.base_bonus_value,
            bonus_per_level: template.bonus_per_level,
            max_level: template.max_level,
            image_type: template.image_type,
            recruitment_cost_metal: template.recruitment_cost_metal,
            recruitment_cost_crystal: template.recruitment_cost_crystal,
            recruitment_cost_deuterium: template.recruitment_cost_deuterium,
        },
        level: officer.level,
        experience: officer.experience,
        is_active: officer.is_active,
        recruited_at: officer.recruited_at.to_string(),
        current_bonus,
    };

    Ok((StatusCode::CREATED, Json(response)))
}

// ============================================================================
// HELPERS
// ============================================================================

/// Calcule le bonus actuel d'un officier en fonction de son niveau
fn calculate_bonus(template: &crate::entities::officer_template::Model, level: i32) -> f64 {
    template.base_bonus_value + (template.bonus_per_level * (level - 1) as f64)
}

/// Calcule le coût pour level up un officier
/// Formule exponentielle: coût_recrutement × 1.5^niveau_actuel
/// Exemples: L1→L2 = 1.5× la base, L10→L11 = 1.5^10 ≈ 57× la base
fn calculate_levelup_cost(template: &crate::entities::officer_template::Model, current_level: i32) -> (f64, f64, f64) {
    let multiplier = (1.5_f64).powi(current_level as i32);
    (
        template.recruitment_cost_metal * multiplier,
        template.recruitment_cost_crystal * multiplier,
        template.recruitment_cost_deuterium * multiplier,
    )
}

/// Récupère le coût de level up d'un officier
pub async fn get_officer_levelup_cost_handler(
    Path((user_id, officer_id)): Path<(String, String)>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let user_uuid = Uuid::parse_str(&user_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid user ID".to_string()))?;
    let officer_uuid = Uuid::parse_str(&officer_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid officer ID".to_string()))?;

    // Récupérer l'officier avec son template
    let officer = UserOfficer::find_by_id(officer_uuid)
        .filter(crate::entities::user_officer::Column::UserId.eq(user_uuid))
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Officer not found".to_string()))?;

    let template = OfficerTemplate::find_by_id(officer.officer_template_id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Officer template not found".to_string()))?;

    // Vérifier que l'officier n'est pas au niveau max
    if officer.level >= template.max_level {
        return Err((StatusCode::BAD_REQUEST, "Officer is already at max level".to_string()));
    }

    let prod_speed = state.config.read().map(|c| c.production_speed).unwrap_or(250.0);

    let (base_metal, base_crystal, base_deuterium) = calculate_levelup_cost(&template, officer.level);
    let next_level = officer.level + 1;
    let next_bonus = calculate_bonus(&template, next_level);

    Ok(Json(LevelUpCostResponse {
        metal: base_metal / prod_speed,
        crystal: base_crystal / prod_speed,
        deuterium: base_deuterium / prod_speed,
        next_level,
        next_bonus,
    }))
}

/// Level up un officier
pub async fn levelup_officer_handler(
    Path((user_id, officer_id)): Path<(String, String)>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let user_uuid = Uuid::parse_str(&user_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid user ID".to_string()))?;
    let officer_uuid = Uuid::parse_str(&officer_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid officer ID".to_string()))?;

    // Récupérer l'officier
    let officer = UserOfficer::find_by_id(officer_uuid)
        .filter(crate::entities::user_officer::Column::UserId.eq(user_uuid))
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Officer not found".to_string()))?;

    // Récupérer le template
    let template = OfficerTemplate::find_by_id(officer.officer_template_id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Officer template not found".to_string()))?;

    // Vérifier que l'officier n'est pas au niveau max
    if officer.level >= template.max_level {
        return Err((StatusCode::BAD_REQUEST, format!(
            "L'officier {} est déjà au niveau maximum ({})",
            template.name, template.max_level
        )));
    }

    // Récupérer la planète principale du joueur
    let planet = Planet::find()
        .filter(crate::entities::planet::Column::OwnerId.eq(user_uuid))
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "No planet found for user".to_string()))?;

    let prod_speed = state.config.read().map(|c| c.production_speed).unwrap_or(250.0);

    let (base_metal, base_crystal, base_deuterium) = calculate_levelup_cost(&template, officer.level);
    let actual_cost_metal = base_metal / prod_speed;
    let actual_cost_crystal = base_crystal / prod_speed;
    let actual_cost_deuterium = base_deuterium / prod_speed;

    // Vérifier les ressources
    if planet.metal_amount < actual_cost_metal {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Pas assez de métal (requis: {:.0}, disponible: {:.0})",
                actual_cost_metal, planet.metal_amount)
        ));
    }
    if planet.crystal_amount < actual_cost_crystal {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Pas assez de cristal (requis: {:.0}, disponible: {:.0})",
                actual_cost_crystal, planet.crystal_amount)
        ));
    }
    if planet.deuterium_amount < actual_cost_deuterium {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Pas assez de deutérium (requis: {:.0}, disponible: {:.0})",
                actual_cost_deuterium, planet.deuterium_amount)
        ));
    }

    // Déduire les ressources
    let mut planet_active: crate::entities::planet::ActiveModel = planet.clone().into();
    planet_active.metal_amount = Set(planet.metal_amount - actual_cost_metal);
    planet_active.crystal_amount = Set(planet.crystal_amount - actual_cost_crystal);
    planet_active.deuterium_amount = Set(planet.deuterium_amount - actual_cost_deuterium);
    planet_active.last_update = Set(chrono::Utc::now().naive_utc());
    planet_active.update(&state.db).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Level up l'officier
    let new_level = officer.level + 1;
    let mut officer_active: crate::entities::user_officer::ActiveModel = officer.into();
    officer_active.level = Set(new_level);
    let updated_officer = officer_active.update(&state.db).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let current_bonus = calculate_bonus(&template, new_level);

    let response = UserOfficerResponse {
        id: updated_officer.id.to_string(),
        template: OfficerTemplateResponse {
            id: template.id.to_string(),
            name: template.name,
            description: template.description,
            specialization: template.specialization,
            rarity: template.rarity,
            bonus_type: template.bonus_type,
            base_bonus_value: template.base_bonus_value,
            bonus_per_level: template.bonus_per_level,
            max_level: template.max_level,
            image_type: template.image_type,
            recruitment_cost_metal: template.recruitment_cost_metal,
            recruitment_cost_crystal: template.recruitment_cost_crystal,
            recruitment_cost_deuterium: template.recruitment_cost_deuterium,
        },
        level: updated_officer.level,
        experience: updated_officer.experience,
        is_active: updated_officer.is_active,
        recruited_at: updated_officer.recruited_at.to_string(),
        current_bonus,
    };

    Ok((StatusCode::OK, Json(response)))
}
