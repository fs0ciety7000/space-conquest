use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set,
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

    // TODO: Vérifier que l'utilisateur a assez de ressources
    // TODO: Déduire les ressources de l'utilisateur

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

/// Calcule l'XP requis pour passer au niveau suivant
pub fn _xp_required_for_next_level(current_level: i32) -> i32 {
    // Formule exponentielle: 100 * level^2
    100 * current_level * current_level
}
