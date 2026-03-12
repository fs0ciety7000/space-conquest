use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use sea_orm::{
    ActiveModelTrait, EntityTrait, Set, 
    QueryFilter, QueryOrder, ColumnTrait, Condition,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;
use chrono::Utc;

use crate::entities::{
    prelude::{Alliance, AllianceMember, AllianceInvitation, User, Planet},
    alliance, alliance_member, alliance_invitation, user, planet
};
use crate::tech_tree;
use sea_orm::DatabaseConnection;
// WebSocket notifications peuvent être ajoutées ici plus tard
// use crate::websocket::{WsEvent, WsState};
use crate::missions::update_achievement_progress;
use crate::AppState;

// ============================================================================
// PAYLOADS
// ============================================================================

#[derive(Deserialize)]
pub struct CreateAlliancePayload {
    pub name: String,
    pub tag: String,
    pub description: Option<String>,
    pub recruitment_policy: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateAlliancePayload {
    pub description: Option<String>,
    pub internal_message: Option<String>,
    pub recruitment_policy: Option<String>,
    pub min_level_required: Option<i32>,
}

#[derive(Deserialize)]
pub struct InvitePlayerPayload {
    pub username: String,
    pub message: Option<String>,
}

#[derive(Deserialize)]
pub struct ApplicationPayload {
    pub alliance_id: Uuid,
    pub message: Option<String>,
}

#[derive(Deserialize)]
pub struct HandleInvitationPayload {
    pub accept: bool,
}

#[derive(Deserialize)]
pub struct ChangeMemberRolePayload {
    pub role: String, // "officer" | "member"
}

// ============================================================================
// RÉPONSES
// ============================================================================

#[derive(Serialize)]
pub struct AllianceDisplay {
    pub id: Uuid,
    pub name: String,
    pub tag: String,
    pub description: Option<String>,
    pub leader_name: String,
    pub member_count: i32,
    pub total_score: i64,
    pub recruitment_policy: String,
    pub created_at: chrono::NaiveDateTime,
}

#[derive(Serialize)]
pub struct AllianceDetailDisplay {
    pub id: Uuid,
    pub name: String,
    pub tag: String,
    pub description: Option<String>,
    pub internal_message: Option<String>,
    pub leader_id: Uuid,
    pub leader_name: String,
    pub member_count: i32,
    pub total_score: i64,
    pub recruitment_policy: String,
    pub min_level_required: i32,
    pub members: Vec<MemberDisplay>,
    pub created_at: chrono::NaiveDateTime,
    pub is_member: bool,
    pub user_role: Option<String>,
}

#[derive(Serialize)]
pub struct MemberDisplay {
    pub user_id: Uuid,
    pub username: String,
    pub role: String,
    pub score: i64,
    pub joined_at: chrono::NaiveDateTime,
    pub last_active: chrono::NaiveDateTime,
}

#[derive(Serialize)]
pub struct InvitationDisplay {
    pub id: Uuid,
    pub alliance_id: Uuid,
    pub alliance_name: String,
    pub alliance_tag: String,
    pub user_id: Uuid,
    pub username: String,
    pub invitation_type: String,
    pub status: String,
    pub message: Option<String>,
    pub created_at: chrono::NaiveDateTime,
}

// ============================================================================
// HANDLERS: CRUD ALLIANCE
// ============================================================================

/// Liste toutes les alliances (avec pagination/recherche)
pub async fn list_alliances_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let search = params.get("search").cloned();
    let page: u64 = params.get("page").and_then(|p| p.parse().ok()).unwrap_or(1);
    let per_page: u64 = params.get("per_page").and_then(|p| p.parse().ok()).unwrap_or(20);

    let mut query = Alliance::find().order_by_desc(alliance::Column::TotalScore);

    if let Some(search_term) = search {
        query = query.filter(
            Condition::any()
                .add(alliance::Column::Name.contains(&search_term))
                .add(alliance::Column::Tag.contains(&search_term))
        );
    }

    let alliances = query
        .all(&state.db)
        .await
        .unwrap_or_default();

    // Paginer manuellement
    let total = alliances.len();
    let start = ((page - 1) * per_page) as usize;
    let end = (start + per_page as usize).min(total);
    let page_alliances = if start < total { &alliances[start..end] } else { &[] };

    let mut result = Vec::new();
    for a in page_alliances {
        let leader = User::find_by_id(a.leader_id)
            .one(&state.db)
            .await
            .ok()
            .flatten();
        
        result.push(AllianceDisplay {
            id: a.id,
            name: a.name.clone(),
            tag: a.tag.clone(),
            description: a.description.clone(),
            leader_name: leader.map(|l| l.username).unwrap_or_else(|| "Inconnu".into()),
            member_count: a.member_count,
            total_score: a.total_score,
            recruitment_policy: a.recruitment_policy.clone(),
            created_at: a.created_at,
        });
    }

    Json(json!({
        "alliances": result,
        "total": total,
        "page": page,
        "per_page": per_page
    })).into_response()
}

/// Créer une nouvelle alliance
pub async fn create_alliance_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<CreateAlliancePayload>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    // Vérifier que l'utilisateur n'est pas déjà dans une alliance
    let existing = AllianceMember::find()
        .filter(alliance_member::Column::UserId.eq(user_id))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    if existing.is_some() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Vous êtes déjà membre d'une alliance"}))).into_response();
    }

    // Valider le nom (3-20 caractères)
    let name = payload.name.trim();
    if name.len() < 3 || name.len() > 20 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Le nom doit faire entre 3 et 20 caractères"}))).into_response();
    }

    // Valider le tag (2-5 caractères)
    let tag = payload.tag.trim().to_uppercase();
    if tag.len() < 2 || tag.len() > 5 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Le tag doit faire entre 2 et 5 caractères"}))).into_response();
    }

    // Vérifier unicité
    let name_exists = Alliance::find()
        .filter(alliance::Column::Name.eq(name))
        .one(&state.db)
        .await
        .ok()
        .flatten()
        .is_some();

    if name_exists {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Ce nom d'alliance est déjà pris"}))).into_response();
    }

    let tag_exists = Alliance::find()
        .filter(alliance::Column::Tag.eq(&tag))
        .one(&state.db)
        .await
        .ok()
        .flatten()
        .is_some();

    if tag_exists {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Ce tag est déjà pris"}))).into_response();
    }

    // Récupérer le score de l'utilisateur (somme des scores de ses planètes)
    let user_planets = Planet::find()
        .filter(planet::Column::OwnerId.eq(user_id))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let mut user_score: i64 = 0;
    for p in &user_planets {
        user_score += calculate_planet_score(p, &state.db).await;
    }

    let now = Utc::now().naive_utc();
    let alliance_id = Uuid::new_v4();

    // Créer l'alliance
    let new_alliance = alliance::ActiveModel {
        id: Set(alliance_id),
        name: Set(name.to_string()),
        tag: Set(tag.clone()),
        description: Set(payload.description),
        internal_message: Set(None),
        leader_id: Set(user_id),
        member_count: Set(1),
        total_score: Set(user_score),
        recruitment_policy: Set(payload.recruitment_policy.unwrap_or_else(|| "invite_only".into())),
        min_level_required: Set(0),
        created_at: Set(now),
        updated_at: Set(now),
    };

    if let Err(e) = new_alliance.insert(&state.db).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Erreur création: {}", e)}))).into_response();
    }

    // Ajouter le fondateur comme membre (leader)
    let new_member = alliance_member::ActiveModel {
        id: Set(Uuid::new_v4()),
        alliance_id: Set(alliance_id),
        user_id: Set(user_id),
        role: Set("leader".into()),
        score: Set(user_score),
        joined_at: Set(now),
        last_active: Set(now),
    };

    if let Err(e) = new_member.insert(&state.db).await {
        // Rollback: supprimer l'alliance
        let _ = Alliance::delete_by_id(alliance_id).exec(&state.db).await;
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Erreur création membre: {}", e)}))).into_response();
    }

    // Déclencher l'achievement "alliance_create"
    update_achievement_progress(&state, user_id, "alliance_create", 1).await;

    (StatusCode::CREATED, Json(json!({
        "id": alliance_id,
        "name": name,
        "tag": tag,
        "message": "Alliance créée avec succès !"
    }))).into_response()
}

/// Détails d'une alliance
pub async fn get_alliance_handler(
    Path(alliance_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id = params.get("user_id")
        .and_then(|s| Uuid::parse_str(s).ok());

    let alliance = match Alliance::find_by_id(alliance_id).one(&state.db).await {
        Ok(Some(a)) => a,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Alliance introuvable"}))).into_response(),
    };

    let leader = User::find_by_id(alliance.leader_id)
        .one(&state.db)
        .await
        .ok()
        .flatten();

    // Récupérer les membres
    let members_raw = AllianceMember::find()
        .filter(alliance_member::Column::AllianceId.eq(alliance_id))
        .order_by_desc(alliance_member::Column::Score)
        .all(&state.db)
        .await
        .unwrap_or_default();

    let mut members = Vec::new();
    let mut is_member = false;
    let mut user_role = None;

    for m in members_raw {
        let member_user = User::find_by_id(m.user_id)
            .one(&state.db)
            .await
            .ok()
            .flatten();

        if let Some(uid) = user_id {
            if m.user_id == uid {
                is_member = true;
                user_role = Some(m.role.clone());
            }
        }

        members.push(MemberDisplay {
            user_id: m.user_id,
            username: member_user.map(|u| u.username).unwrap_or_else(|| "Inconnu".into()),
            role: m.role,
            score: m.score,
            joined_at: m.joined_at,
            last_active: m.last_active,
        });
    }

    // Ne pas montrer le message interne aux non-membres
    let internal_message = if is_member {
        alliance.internal_message.clone()
    } else {
        None
    };

    Json(AllianceDetailDisplay {
        id: alliance.id,
        name: alliance.name,
        tag: alliance.tag,
        description: alliance.description,
        internal_message,
        leader_id: alliance.leader_id,
        leader_name: leader.map(|l| l.username).unwrap_or_else(|| "Inconnu".into()),
        member_count: alliance.member_count,
        total_score: alliance.total_score,
        recruitment_policy: alliance.recruitment_policy,
        min_level_required: alliance.min_level_required,
        members,
        created_at: alliance.created_at,
        is_member,
        user_role,
    }).into_response()
}

/// Modifier une alliance (leader/officier seulement)
pub async fn update_alliance_handler(
    Path(alliance_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<UpdateAlliancePayload>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    // Vérifier les permissions
    let member = AllianceMember::find()
        .filter(alliance_member::Column::AllianceId.eq(alliance_id))
        .filter(alliance_member::Column::UserId.eq(user_id))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    let role = match member {
        Some(m) => m.role,
        None => return (StatusCode::FORBIDDEN, Json(json!({"error": "Vous n'êtes pas membre de cette alliance"}))).into_response(),
    };

    if role != "leader" && role != "officer" {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Permissions insuffisantes"}))).into_response();
    }

    let alliance = match Alliance::find_by_id(alliance_id).one(&state.db).await {
        Ok(Some(a)) => a,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Alliance introuvable"}))).into_response(),
    };

    let mut active: alliance::ActiveModel = alliance.into();
    active.updated_at = Set(Utc::now().naive_utc());

    if let Some(desc) = payload.description {
        if desc.len() > 500 {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "Description trop longue (max 500 caractères)"}))).into_response();
        }
        active.description = Set(Some(desc));
    }

    if let Some(msg) = payload.internal_message {
        if msg.len() > 1000 {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "Message interne trop long (max 1000 caractères)"}))).into_response();
        }
        active.internal_message = Set(Some(msg));
    }

    if let Some(policy) = payload.recruitment_policy {
        if !["open", "invite_only", "closed"].contains(&policy.as_str()) {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "Politique de recrutement invalide"}))).into_response();
        }
        active.recruitment_policy = Set(policy);
    }

    if let Some(level) = payload.min_level_required {
        if level < 0 || level > 100 {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "Niveau minimum invalide"}))).into_response();
        }
        active.min_level_required = Set(level);
    }

    let _ = active.update(&state.db).await;

    (StatusCode::OK, Json(json!({"message": "Alliance mise à jour"}))).into_response()
}

/// Dissoudre une alliance (leader seulement)
pub async fn dissolve_alliance_handler(
    Path(alliance_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    let alliance = match Alliance::find_by_id(alliance_id).one(&state.db).await {
        Ok(Some(a)) => a,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Alliance introuvable"}))).into_response(),
    };

    if alliance.leader_id != user_id {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Seul le leader peut dissoudre l'alliance"}))).into_response();
    }

    // Supprimer toutes les invitations
    let _ = AllianceInvitation::delete_many()
        .filter(alliance_invitation::Column::AllianceId.eq(alliance_id))
        .exec(&state.db)
        .await;

    // Supprimer tous les membres
    let _ = AllianceMember::delete_many()
        .filter(alliance_member::Column::AllianceId.eq(alliance_id))
        .exec(&state.db)
        .await;

    // Supprimer l'alliance
    let _ = Alliance::delete_by_id(alliance_id).exec(&state.db).await;

    (StatusCode::OK, Json(json!({"message": "Alliance dissoute"}))).into_response()
}

// ============================================================================
// HANDLERS: MEMBRES
// ============================================================================

/// Quitter une alliance
pub async fn leave_alliance_handler(
    Path(alliance_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    let alliance = match Alliance::find_by_id(alliance_id).one(&state.db).await {
        Ok(Some(a)) => a,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Alliance introuvable"}))).into_response(),
    };

    // Si c'est le leader, il ne peut pas quitter (doit dissoudre ou transférer)
    if alliance.leader_id == user_id {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Le leader ne peut pas quitter. Transférez le leadership ou dissolvez l'alliance."}))).into_response();
    }

    let member = AllianceMember::find()
        .filter(alliance_member::Column::AllianceId.eq(alliance_id))
        .filter(alliance_member::Column::UserId.eq(user_id))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    if member.is_none() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Vous n'êtes pas membre de cette alliance"}))).into_response();
    }

    let member = member.unwrap();

    // Supprimer le membre
    let _ = AllianceMember::delete_by_id(member.id).exec(&state.db).await;

    // Mettre à jour le compteur
    let mut alliance_active: alliance::ActiveModel = alliance.clone().into();
    alliance_active.member_count = Set(alliance.member_count - 1);
    alliance_active.total_score = Set(alliance.total_score - member.score);
    alliance_active.updated_at = Set(Utc::now().naive_utc());
    let _ = alliance_active.update(&state.db).await;

    (StatusCode::OK, Json(json!({"message": "Vous avez quitté l'alliance"}))).into_response()
}

/// Expulser un membre (leader/officier seulement)
pub async fn kick_member_handler(
    Path((alliance_id, target_user_id)): Path<(Uuid, Uuid)>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    // On ne peut pas s'expulser soi-même
    if user_id == target_user_id {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Utilisez 'Quitter l'alliance' pour partir"}))).into_response();
    }

    let alliance = match Alliance::find_by_id(alliance_id).one(&state.db).await {
        Ok(Some(a)) => a,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Alliance introuvable"}))).into_response(),
    };

    // Vérifier que l'utilisateur est leader ou officier
    let kicker = AllianceMember::find()
        .filter(alliance_member::Column::AllianceId.eq(alliance_id))
        .filter(alliance_member::Column::UserId.eq(user_id))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    let kicker_role = match kicker {
        Some(m) => m.role,
        None => return (StatusCode::FORBIDDEN, Json(json!({"error": "Vous n'êtes pas membre de cette alliance"}))).into_response(),
    };

    if kicker_role != "leader" && kicker_role != "officer" {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Permissions insuffisantes"}))).into_response();
    }

    // Récupérer la cible
    let target = AllianceMember::find()
        .filter(alliance_member::Column::AllianceId.eq(alliance_id))
        .filter(alliance_member::Column::UserId.eq(target_user_id))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    let target = match target {
        Some(t) => t,
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Membre introuvable"}))).into_response(),
    };

    // Un officier ne peut pas expulser un autre officier ou le leader
    if kicker_role == "officer" && (target.role == "officer" || target.role == "leader") {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Vous ne pouvez pas expulser un officier ou le leader"}))).into_response();
    }

    // On ne peut pas expulser le leader
    if target.role == "leader" {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Impossible d'expulser le leader"}))).into_response();
    }

    // Supprimer le membre
    let _ = AllianceMember::delete_by_id(target.id).exec(&state.db).await;

    // Mettre à jour le compteur
    let mut alliance_active: alliance::ActiveModel = alliance.clone().into();
    alliance_active.member_count = Set(alliance.member_count - 1);
    alliance_active.total_score = Set(alliance.total_score - target.score);
    alliance_active.updated_at = Set(Utc::now().naive_utc());
    let _ = alliance_active.update(&state.db).await;

    (StatusCode::OK, Json(json!({"message": "Membre expulsé"}))).into_response()
}

/// Changer le rôle d'un membre (leader seulement)
pub async fn change_role_handler(
    Path((alliance_id, target_user_id)): Path<(Uuid, Uuid)>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<ChangeMemberRolePayload>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    let alliance = match Alliance::find_by_id(alliance_id).one(&state.db).await {
        Ok(Some(a)) => a,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Alliance introuvable"}))).into_response(),
    };

    // Seul le leader peut changer les rôles
    if alliance.leader_id != user_id {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Seul le leader peut modifier les rôles"}))).into_response();
    }

    // Valider le nouveau rôle
    if !["officer", "member"].contains(&payload.role.as_str()) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Rôle invalide (officer ou member)"}))).into_response();
    }

    // Si on veut promouvoir quelqu'un leader, utiliser transfer_leadership
    if payload.role == "leader" {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Utilisez 'Transférer le leadership' pour cela"}))).into_response();
    }

    let target = AllianceMember::find()
        .filter(alliance_member::Column::AllianceId.eq(alliance_id))
        .filter(alliance_member::Column::UserId.eq(target_user_id))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    let target = match target {
        Some(t) => t,
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Membre introuvable"}))).into_response(),
    };

    // On ne peut pas modifier son propre rôle de cette façon
    if target.user_id == user_id {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Vous ne pouvez pas modifier votre propre rôle"}))).into_response();
    }

    let mut target_active: alliance_member::ActiveModel = target.into();
    target_active.role = Set(payload.role.clone());
    let _ = target_active.update(&state.db).await;

    (StatusCode::OK, Json(json!({"message": format!("Rôle changé en {}", payload.role)}))).into_response()
}

/// Transférer le leadership (leader seulement)
pub async fn transfer_leadership_handler(
    Path((alliance_id, target_user_id)): Path<(Uuid, Uuid)>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    let alliance = match Alliance::find_by_id(alliance_id).one(&state.db).await {
        Ok(Some(a)) => a,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Alliance introuvable"}))).into_response(),
    };

    if alliance.leader_id != user_id {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Seul le leader peut transférer le leadership"}))).into_response();
    }

    if target_user_id == user_id {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Vous êtes déjà le leader"}))).into_response();
    }

    // Vérifier que la cible est membre
    let target = AllianceMember::find()
        .filter(alliance_member::Column::AllianceId.eq(alliance_id))
        .filter(alliance_member::Column::UserId.eq(target_user_id))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    let target = match target {
        Some(t) => t,
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Membre introuvable"}))).into_response(),
    };

    // Récupérer l'ancien leader
    let old_leader = AllianceMember::find()
        .filter(alliance_member::Column::AllianceId.eq(alliance_id))
        .filter(alliance_member::Column::UserId.eq(user_id))
        .one(&state.db)
        .await
        .ok()
        .flatten()
        .unwrap();

    // Mettre à jour les rôles
    let mut old_active: alliance_member::ActiveModel = old_leader.into();
    old_active.role = Set("officer".into()); // L'ancien leader devient officier
    let _ = old_active.update(&state.db).await;

    let mut target_active: alliance_member::ActiveModel = target.into();
    target_active.role = Set("leader".into());
    let _ = target_active.update(&state.db).await;

    // Mettre à jour l'alliance
    let mut alliance_active: alliance::ActiveModel = alliance.into();
    alliance_active.leader_id = Set(target_user_id);
    alliance_active.updated_at = Set(Utc::now().naive_utc());
    let _ = alliance_active.update(&state.db).await;

    (StatusCode::OK, Json(json!({"message": "Leadership transféré"}))).into_response()
}

// ============================================================================
// HANDLERS: INVITATIONS ET CANDIDATURES
// ============================================================================

/// Inviter un joueur (leader/officier)
pub async fn invite_player_handler(
    Path(alliance_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<InvitePlayerPayload>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    // Vérifier les permissions
    let member = AllianceMember::find()
        .filter(alliance_member::Column::AllianceId.eq(alliance_id))
        .filter(alliance_member::Column::UserId.eq(user_id))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    let role = match member {
        Some(m) => m.role,
        None => return (StatusCode::FORBIDDEN, Json(json!({"error": "Vous n'êtes pas membre de cette alliance"}))).into_response(),
    };

    if role != "leader" && role != "officer" {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Permissions insuffisantes"}))).into_response();
    }

    // Trouver le joueur cible
    let target_user = User::find()
        .filter(user::Column::Username.eq(&payload.username))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    let target_user = match target_user {
        Some(u) => u,
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Joueur introuvable"}))).into_response(),
    };

    // Vérifier que le joueur n'est pas déjà dans une alliance
    let already_member = AllianceMember::find()
        .filter(alliance_member::Column::UserId.eq(target_user.id))
        .one(&state.db)
        .await
        .ok()
        .flatten()
        .is_some();

    if already_member {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Ce joueur est déjà dans une alliance"}))).into_response();
    }

    // Vérifier qu'il n'y a pas déjà une invitation en cours
    let existing = AllianceInvitation::find()
        .filter(alliance_invitation::Column::AllianceId.eq(alliance_id))
        .filter(alliance_invitation::Column::UserId.eq(target_user.id))
        .filter(alliance_invitation::Column::Status.eq("pending"))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    if existing.is_some() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Une invitation est déjà en cours pour ce joueur"}))).into_response();
    }

    let now = Utc::now().naive_utc();

    let invitation = alliance_invitation::ActiveModel {
        id: Set(Uuid::new_v4()),
        alliance_id: Set(alliance_id),
        user_id: Set(target_user.id),
        invitation_type: Set("invitation".into()),
        status: Set("pending".into()),
        message: Set(payload.message),
        invited_by: Set(Some(user_id)),
        created_at: Set(now),
        expires_at: Set(Some(now + chrono::Duration::days(7))),
    };

    let _ = invitation.insert(&state.db).await;

    // TODO: Notification WebSocket

    (StatusCode::OK, Json(json!({"message": "Invitation envoyée"}))).into_response()
}

/// Postuler à une alliance (joueur)
pub async fn apply_to_alliance_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<ApplicationPayload>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    // Vérifier que l'utilisateur n'est pas déjà dans une alliance
    let already_member = AllianceMember::find()
        .filter(alliance_member::Column::UserId.eq(user_id))
        .one(&state.db)
        .await
        .ok()
        .flatten()
        .is_some();

    if already_member {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Vous êtes déjà dans une alliance"}))).into_response();
    }

    let alliance = match Alliance::find_by_id(payload.alliance_id).one(&state.db).await {
        Ok(Some(a)) => a,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Alliance introuvable"}))).into_response(),
    };

    if alliance.recruitment_policy == "closed" {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Cette alliance n'accepte pas de nouvelles candidatures"}))).into_response();
    }

    // Si l'alliance est ouverte, rejoindre directement
    if alliance.recruitment_policy == "open" {
        return join_alliance_directly(&state, user_id, &alliance).await;
    }

    // Vérifier qu'il n'y a pas déjà une candidature en cours
    let existing = AllianceInvitation::find()
        .filter(alliance_invitation::Column::AllianceId.eq(payload.alliance_id))
        .filter(alliance_invitation::Column::UserId.eq(user_id))
        .filter(alliance_invitation::Column::Status.eq("pending"))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    if existing.is_some() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Vous avez déjà une candidature en cours"}))).into_response();
    }

    let now = Utc::now().naive_utc();

    let application = alliance_invitation::ActiveModel {
        id: Set(Uuid::new_v4()),
        alliance_id: Set(payload.alliance_id),
        user_id: Set(user_id),
        invitation_type: Set("application".into()),
        status: Set("pending".into()),
        message: Set(payload.message),
        invited_by: Set(None),
        created_at: Set(now),
        expires_at: Set(Some(now + chrono::Duration::days(30))),
    };

    let _ = application.insert(&state.db).await;

    (StatusCode::OK, Json(json!({"message": "Candidature envoyée"}))).into_response()
}

/// Récupérer les invitations/candidatures d'un utilisateur
pub async fn get_my_invitations_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    let invitations = AllianceInvitation::find()
        .filter(alliance_invitation::Column::UserId.eq(user_id))
        .filter(alliance_invitation::Column::Status.eq("pending"))
        .order_by_desc(alliance_invitation::Column::CreatedAt)
        .all(&state.db)
        .await
        .unwrap_or_default();

    let mut result = Vec::new();
    for inv in invitations {
        let alliance = Alliance::find_by_id(inv.alliance_id)
            .one(&state.db)
            .await
            .ok()
            .flatten();

        let user = User::find_by_id(inv.user_id)
            .one(&state.db)
            .await
            .ok()
            .flatten();

        if let Some(a) = alliance {
            result.push(InvitationDisplay {
                id: inv.id,
                alliance_id: inv.alliance_id,
                alliance_name: a.name,
                alliance_tag: a.tag,
                user_id: inv.user_id,
                username: user.map(|u| u.username).unwrap_or_else(|| "Inconnu".into()),
                invitation_type: inv.invitation_type,
                status: inv.status,
                message: inv.message,
                created_at: inv.created_at,
            });
        }
    }

    Json(result).into_response()
}

/// Récupérer les candidatures d'une alliance (leader/officier)
pub async fn get_alliance_applications_handler(
    Path(alliance_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    // Vérifier les permissions
    let member = AllianceMember::find()
        .filter(alliance_member::Column::AllianceId.eq(alliance_id))
        .filter(alliance_member::Column::UserId.eq(user_id))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    let role = match member {
        Some(m) => m.role,
        None => return (StatusCode::FORBIDDEN, Json(json!({"error": "Vous n'êtes pas membre de cette alliance"}))).into_response(),
    };

    if role != "leader" && role != "officer" {
        return (StatusCode::FORBIDDEN, Json(json!({"error": "Permissions insuffisantes"}))).into_response();
    }

    let invitations = AllianceInvitation::find()
        .filter(alliance_invitation::Column::AllianceId.eq(alliance_id))
        .filter(alliance_invitation::Column::Status.eq("pending"))
        .order_by_desc(alliance_invitation::Column::CreatedAt)
        .all(&state.db)
        .await
        .unwrap_or_default();

    let alliance = Alliance::find_by_id(alliance_id)
        .one(&state.db)
        .await
        .ok()
        .flatten();

    let mut result = Vec::new();
    for inv in invitations {
        let user = User::find_by_id(inv.user_id)
            .one(&state.db)
            .await
            .ok()
            .flatten();

        if let Some(a) = &alliance {
            result.push(InvitationDisplay {
                id: inv.id,
                alliance_id: inv.alliance_id,
                alliance_name: a.name.clone(),
                alliance_tag: a.tag.clone(),
                user_id: inv.user_id,
                username: user.map(|u| u.username).unwrap_or_else(|| "Inconnu".into()),
                invitation_type: inv.invitation_type,
                status: inv.status,
                message: inv.message,
                created_at: inv.created_at,
            });
        }
    }

    Json(result).into_response()
}

/// Répondre à une invitation (accepter/refuser)
pub async fn respond_to_invitation_handler(
    Path(invitation_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<HandleInvitationPayload>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    let invitation = match AllianceInvitation::find_by_id(invitation_id).one(&state.db).await {
        Ok(Some(i)) => i,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"error": "Invitation introuvable"}))).into_response(),
    };

    if invitation.status != "pending" {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Cette invitation n'est plus valide"}))).into_response();
    }

    // Si c'est une invitation (de l'alliance vers le joueur)
    if invitation.invitation_type == "invitation" {
        if invitation.user_id != user_id {
            return (StatusCode::FORBIDDEN, Json(json!({"error": "Cette invitation ne vous est pas destinée"}))).into_response();
        }

        if payload.accept {
            // Vérifier que le joueur n'est pas déjà dans une alliance
            let already_member = AllianceMember::find()
                .filter(alliance_member::Column::UserId.eq(user_id))
                .one(&state.db)
                .await
                .ok()
                .flatten()
                .is_some();

            if already_member {
                return (StatusCode::BAD_REQUEST, Json(json!({"error": "Vous êtes déjà dans une alliance"}))).into_response();
            }

            // Rejoindre l'alliance
            let alliance = Alliance::find_by_id(invitation.alliance_id)
                .one(&state.db)
                .await
                .ok()
                .flatten();

            if let Some(a) = alliance {
                let result = join_alliance_directly(&state, user_id, &a).await;
                
                // Marquer l'invitation comme acceptée
                let mut inv_active: alliance_invitation::ActiveModel = invitation.into();
                inv_active.status = Set("accepted".into());
                let _ = inv_active.update(&state.db).await;

                return result;
            }
        }
    }
    // Si c'est une candidature (du joueur vers l'alliance)
    else if invitation.invitation_type == "application" {
        // Vérifier que l'utilisateur est leader/officier
        let member = AllianceMember::find()
            .filter(alliance_member::Column::AllianceId.eq(invitation.alliance_id))
            .filter(alliance_member::Column::UserId.eq(user_id))
            .one(&state.db)
            .await
            .ok()
            .flatten();

        let role = match member {
            Some(m) => m.role,
            None => return (StatusCode::FORBIDDEN, Json(json!({"error": "Vous n'êtes pas autorisé à gérer les candidatures"}))).into_response(),
        };

        if role != "leader" && role != "officer" {
            return (StatusCode::FORBIDDEN, Json(json!({"error": "Permissions insuffisantes"}))).into_response();
        }

        if payload.accept {
            // Vérifier que le candidat n'est pas déjà dans une alliance
            let already_member = AllianceMember::find()
                .filter(alliance_member::Column::UserId.eq(invitation.user_id))
                .one(&state.db)
                .await
                .ok()
                .flatten()
                .is_some();

            if already_member {
                return (StatusCode::BAD_REQUEST, Json(json!({"error": "Ce joueur est déjà dans une alliance"}))).into_response();
            }

            let alliance = Alliance::find_by_id(invitation.alliance_id)
                .one(&state.db)
                .await
                .ok()
                .flatten();

            if let Some(a) = alliance {
                let result = join_alliance_directly(&state, invitation.user_id, &a).await;
                
                // Marquer l'invitation comme acceptée
                let mut inv_active: alliance_invitation::ActiveModel = invitation.into();
                inv_active.status = Set("accepted".into());
                let _ = inv_active.update(&state.db).await;

                return result;
            }
        }
    }

    // Si on arrive ici, c'est un refus
    let mut inv_active: alliance_invitation::ActiveModel = invitation.into();
    inv_active.status = Set("rejected".into());
    let _ = inv_active.update(&state.db).await;

    (StatusCode::OK, Json(json!({"message": "Invitation refusée"}))).into_response()
}

/// Récupérer l'alliance de l'utilisateur connecté
pub async fn get_my_alliance_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Utilisateur invalide"}))).into_response(),
    };

    let member = AllianceMember::find()
        .filter(alliance_member::Column::UserId.eq(user_id))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    match member {
        Some(m) => {
            // Rediriger vers get_alliance_handler
            let alliance = Alliance::find_by_id(m.alliance_id)
                .one(&state.db)
                .await
                .ok()
                .flatten();

            if let Some(a) = alliance {
                Json(json!({
                    "has_alliance": true,
                    "alliance_id": a.id,
                    "alliance_name": a.name,
                    "alliance_tag": a.tag,
                    "user_role": m.role
                })).into_response()
            } else {
                Json(json!({ "has_alliance": false })).into_response()
            }
        },
        None => Json(json!({ "has_alliance": false })).into_response(),
    }
}

// ============================================================================
// HELPERS
// ============================================================================

async fn join_alliance_directly(
    state: &AppState,
    user_id: Uuid,
    alliance: &alliance::Model,
) -> axum::response::Response {
    let now = Utc::now().naive_utc();

    // Calculer le score de l'utilisateur
    let user_planets = Planet::find()
        .filter(planet::Column::OwnerId.eq(user_id))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let mut user_score: i64 = 0;
    for p in &user_planets {
        user_score += calculate_planet_score(p, &state.db).await;
    }

    // Créer le membre
    let new_member = alliance_member::ActiveModel {
        id: Set(Uuid::new_v4()),
        alliance_id: Set(alliance.id),
        user_id: Set(user_id),
        role: Set("member".into()),
        score: Set(user_score),
        joined_at: Set(now),
        last_active: Set(now),
    };

    if let Err(e) = new_member.insert(&state.db).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Erreur: {}", e)}))).into_response();
    }

    // Mettre à jour l'alliance
    let mut alliance_active: alliance::ActiveModel = alliance.clone().into();
    alliance_active.member_count = Set(alliance.member_count + 1);
    alliance_active.total_score = Set(alliance.total_score + user_score);
    alliance_active.updated_at = Set(now);
    let _ = alliance_active.update(&state.db).await;

    // Déclencher l'achievement "alliance_join"
    update_achievement_progress(state, user_id, "alliance_join", 1).await;

    (StatusCode::OK, Json(json!({
        "message": format!("Bienvenue dans [{}] {} !", alliance.tag, alliance.name),
        "alliance_id": alliance.id
    }))).into_response()
}

async fn calculate_planet_score(planet: &planet::Model, db: &DatabaseConnection) -> i64 {
    // Load all relational data at once
    let planet_data = match tech_tree::PlanetData::load(db, planet.id).await {
        Ok(data) => data,
        Err(_) => return 0, // Return 0 score if data load fails
    };

    // Calculate building score from relational data
    let building_types = vec![
        "metal_mine", "crystal_mine", "deuterium_mine", "solar_plant",
        "shipyard", "research_lab", "hangar", "resource_storage",
        "alliance_depot", "missile_silo", "nanite_factory", "terraformer",
        "fusion_plant",
    ];

    let building_score: i64 = building_types.iter()
        .map(|&building| planet_data.building_level(building) as i64)
        .sum::<i64>() * 100;

    // Calculate tech score from all technologies
    let tech_score = planet_data.technologies.values().sum::<i32>() as i64 * 150;

    // Calculate fleet score with dynamic ship values
    let ship_base_points: std::collections::HashMap<&str, i64> = [
        ("light_hunter", 10),
        ("cruiser", 50),
        ("recycler", 20),
        ("transporter", 5),
        ("spy_probe", 1),
        ("colony_ship", 100),
        ("heavy_hunter", 25),
        ("battleship", 150),
        ("bomber", 200),
        ("destroyer", 250),
        ("deathstar", 1000),
        ("solar_satellite", 3),
    ].iter().copied().collect();

    let fleet_score: i64 = planet_data.ships.iter()
        .map(|(ship_key, count)| {
            let base = ship_base_points.get(ship_key.as_str()).unwrap_or(&15);
            (*count as i64) * base
        })
        .sum();

    // Calculate defense score from all defenses
    let defense_base_points: std::collections::HashMap<&str, i64> = [
        ("rocket_launcher", 2),
        ("light_laser", 3),
        ("heavy_laser", 8),
        ("gauss_cannon", 20),
        ("ion_cannon", 50),
        ("plasma_turret", 100),
        ("small_shield", 50),
        ("large_shield", 200),
        ("anti_missile", 20),
        ("interplanetary_missile", 120),
        ("missile_launcher", 5), // Legacy compatibility
    ].iter().copied().collect();

    let defense_score: i64 = planet_data.defenses.iter()
        .map(|(defense_key, count)| {
            let base = defense_base_points.get(defense_key.as_str()).unwrap_or(&10);
            (*count as i64) * base
        })
        .sum();

    building_score + tech_score + fleet_score + defense_score
}
