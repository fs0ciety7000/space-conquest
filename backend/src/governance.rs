// ============================================================================
// governance.rs — Système de gouvernance : Lois + Sondages (Sprints 1 & 2)
//
// Routes publiques:
//   GET  /laws
//   GET  /laws/:id
//   POST /laws/:id/vote
//   GET  /surveys
//   GET  /surveys/:id
//   POST /surveys/:id/respond
//
// Routes admin:
//   POST   /admin/laws
//   PATCH  /admin/laws/:id
//   DELETE /admin/laws/:id
//   POST   /admin/surveys
//   PATCH  /admin/surveys/:id
//   DELETE /admin/surveys/:id
// ============================================================================

use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Json},
    routing::{delete, get, patch, post},
    Router,
};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait,
    PaginatorTrait, QueryFilter, QueryOrder, Set,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use uuid::Uuid;

use crate::entities::{
    announcement,
    law_effect, law_proposal, law_vote,
    prelude::{
        LawEffect, LawProposal, LawVote, Survey, SurveyResponse, User,
    },
    survey, survey_response,
};
use crate::websocket::WsEvent;
use crate::{reload_server_config, AppState};

// ============================================================================
// ALLOWLIST des config_keys modifiables par les lois
// ============================================================================

const ALLOWED_CONFIG_KEYS: &[&str] = &[
    "production_speed_multiplier",
    "building_speed_multiplier",
    "research_speed_multiplier",
    "ship_build_speed_multiplier",
    "ship_build_rate",
    "defense_build_rate",
    "expedition_syndicate_credit_chance",
];

// ============================================================================
// STRUCTS DE REQUÊTES / RÉPONSES
// ============================================================================

#[derive(Deserialize)]
pub struct CreateLawBody {
    pub title: String,
    pub description: String,
    pub vote_end: String, // ISO 8601
    pub effects: Vec<EffectSpec>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct EffectSpec {
    pub config_key: String,
    pub operation: String,  // "multiply" | "add" | "set"
    pub delta: f64,
    pub duration_hours: Option<f64>,
}

#[derive(Deserialize)]
pub struct PatchLawBody {
    pub status: String, // "passed" | "failed" | "cancelled"
}

#[derive(Deserialize)]
pub struct VoteBody {
    pub vote: bool,
}

#[derive(Deserialize)]
pub struct CreateSurveyBody {
    pub title: String,
    pub description: String,
    pub survey_type: String, // "yes_no" | "multiple_choice" | "rating"
    pub options: Option<Vec<String>>,
    pub ends_at: String, // ISO 8601
}

#[derive(Deserialize)]
pub struct PatchSurveyBody {
    pub status: String, // "closed" | "archived"
}

#[derive(Deserialize)]
pub struct RespondBody {
    pub answer: Value,
}

#[derive(Deserialize)]
pub struct SurveyListQuery {
    pub include_archived: Option<bool>,
}

// ============================================================================
// HELPERS
// ============================================================================

/// Extraire le user_id depuis le header Authorization: Bearer jwt-<uuid>
fn extract_user_from_headers(headers: &HeaderMap) -> Option<Uuid> {
    let auth = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())?;
    let token = auth.strip_prefix("Bearer ")?;
    token
        .strip_prefix("jwt-")
        .and_then(|id| Uuid::parse_str(id).ok())
}

/// Vérifier qu'un utilisateur est admin (même logique que admin.rs::check_admin)
async fn check_admin(user_id_str: &str, state: &AppState) -> Result<Uuid, StatusCode> {
    let user_id = Uuid::parse_str(user_id_str).map_err(|_| StatusCode::UNAUTHORIZED)?;
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

/// Valider un EffectSpec: config_key dans l'allowlist, delta dans les bornes.
fn validate_effect(e: &EffectSpec) -> Result<(), String> {
    if !ALLOWED_CONFIG_KEYS.contains(&e.config_key.as_str()) {
        return Err(format!("config_key '{}' non autorisée", e.config_key));
    }
    match e.operation.as_str() {
        "multiply" => {
            if e.delta < 0.0 || e.delta > 3.0 {
                return Err(format!("delta pour 'multiply' doit être dans [0, 3.0], reçu {}", e.delta));
            }
        }
        "add" => {
            if e.delta.abs() > 500_000.0 {
                return Err(format!("delta pour 'add' doit être dans [-500000, 500000], reçu {}", e.delta));
            }
        }
        "set" => {} // Pas de borne maximale définie pour set
        _ => return Err(format!("operation '{}' invalide (multiply|add|set)", e.operation)),
    }
    Ok(())
}

// ============================================================================
// BROADCAST GOVERNANCE ANNOUNCEMENT
// ============================================================================

/// Insère une annonce en DB, broadcast WS global, et push notification à tous les users.
pub async fn broadcast_governance_announcement(
    db: &DatabaseConnection,
    ws: &crate::websocket::WsState,
    title: &str,
    message: &str,
    announcement_type: &str,
) {
    let now = Utc::now().naive_utc();

    // 1. Persister l'annonce pour les utilisateurs hors-ligne
    let ann = announcement::ActiveModel {
        id: sea_orm::NotSet,
        title: Set(title.to_string()),
        content: Set(message.to_string()),
        announcement_type: Set(announcement_type.to_string()),
        is_active: Set(true),
        created_at: Set(now),
        updated_at: Set(now),
    };
    let _ = ann.insert(db).await;

    // 2. Broadcast WebSocket global
    ws.broadcast_global(WsEvent::Notification {
        notif_type: announcement_type.to_string(),
        title: title.to_string(),
        message: message.to_string(),
    })
    .await;

    // 3. Push notification persistante à tous les utilisateurs
    if let Ok(all_users) = User::find().all(db).await {
        for user in all_users {
            ws.push_notification(
                user.id,
                announcement_type,
                title,
                message,
                None,
            )
            .await;
        }
    }
}

// ============================================================================
// APPLY LAW EFFECTS
// ============================================================================

/// Lit les effets JSON de la loi, insère des law_effect en DB, reload config, broadcast.
pub async fn apply_law_effects(
    db: &DatabaseConnection,
    law: &law_proposal::Model,
    state: &AppState,
) {
    let now = Utc::now().naive_utc();

    // Parser les EffectSpec depuis le JSON stocké dans la loi
    let specs: Vec<EffectSpec> = match serde_json::from_value(law.effects.clone()) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("Governance: impossible de parser les effets de la loi {}: {}", law.id, e);
            return;
        }
    };

    // Lire la config courante pour capturer la base_value avant modification
    let current_config = state.config.read().unwrap().clone();

    // Hardcoded defaults (miroir de ServerConfigCache::default)
    let known_defaults: HashMap<&str, f64> = [
        ("production_speed_multiplier", 250.0),
        ("building_speed_multiplier", 50.0),
        ("research_speed_multiplier", 25.0),
        ("ship_build_speed_multiplier", 100.0),
        ("ship_build_rate", 1.0),
        ("defense_build_rate", 1.0),
        ("expedition_syndicate_credit_chance", 0.35),
        ("construction_speed_multiplier", 1.0),
        ("mining_speed_multiplier", 1.0),
    ]
    .into_iter()
    .collect();

    for spec in &specs {
        // Déterminer la valeur de base actuelle
        let base_value = current_config
            .configs
            .get(&spec.config_key)
            .copied()
            .or_else(|| known_defaults.get(spec.config_key.as_str()).copied())
            .unwrap_or(0.0);

        // Calculer expires_at si une durée est spécifiée
        let expires_at = spec.duration_hours.map(|hours| {
            now + chrono::Duration::seconds((hours * 3600.0) as i64)
        });

        let effect = law_effect::ActiveModel {
            id: Set(Uuid::new_v4()),
            law_id: Set(law.id),
            config_key: Set(spec.config_key.clone()),
            operation: Set(spec.operation.clone()),
            delta: Set(spec.delta),
            base_value: Set(base_value),
            expires_at: Set(expires_at),
            applied_at: Set(now),
        };

        if let Err(e) = effect.insert(db).await {
            eprintln!("Governance: erreur insertion law_effect pour loi {}: {}", law.id, e);
        }
    }

    // Recharger la config serveur pour que les effets soient actifs immédiatement
    reload_server_config(state).await;

    // Broadcast annonce
    if let Some(ws) = &state.ws {
        broadcast_governance_announcement(
            db,
            ws,
            &format!("Loi adoptée : {}", law.title),
            &format!("La loi '{}' a été adoptée et ses effets sont maintenant actifs.", law.title),
            "law_passed",
        )
        .await;
    }
}

// ============================================================================
// GOVERNANCE TICK — appelé depuis main.rs toutes les 60 secondes
// ============================================================================

pub async fn governance_tick(state: &AppState) {
    let now = Utc::now().naive_utc();
    let db = &state.db;

    // ── 1. Expirer les lois en cours de vote dont vote_end est dépassé ────────
    let expired_laws = match LawProposal::find()
        .filter(law_proposal::Column::Status.eq("voting"))
        .filter(law_proposal::Column::VoteEnd.lt(now))
        .all(db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            eprintln!("Governance tick: erreur lecture lois expirées: {}", e);
            return;
        }
    };

    for law in expired_laws {
        // Déterminer le résultat: >50% yes = passed, sinon failed
        let total = law.yes_count + law.no_count;
        let new_status = if total > 0 && law.yes_count * 2 > total {
            "passed"
        } else {
            "failed"
        };

        let mut active: law_proposal::ActiveModel = law.clone().into();
        active.status = Set(new_status.to_string());

        if let Err(e) = active.update(db).await {
            eprintln!("Governance tick: erreur mise à jour statut loi {}: {}", law.id, e);
            continue;
        }

        if new_status == "passed" {
            // Lire le modèle frais depuis la DB
            if let Ok(Some(fresh_law)) = LawProposal::find_by_id(law.id).one(db).await {
                apply_law_effects(db, &fresh_law, state).await;
            }
        } else {
            // Notifier l'échec
            if let Some(ws) = &state.ws {
                broadcast_governance_announcement(
                    db,
                    ws,
                    &format!("Loi rejetée : {}", law.title),
                    &format!("La loi '{}' a été rejetée par vote ({} pour, {} contre).", law.title, law.yes_count, law.no_count),
                    "law_failed",
                )
                .await;
            }
        }
    }

    // ── 2. Réverter les effets de loi expirés ────────────────────────────────
    let expired_effects = match LawEffect::find()
        .filter(law_effect::Column::ExpiresAt.is_not_null())
        .filter(law_effect::Column::ExpiresAt.lt(now))
        .all(db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            eprintln!("Governance tick: erreur lecture effets expirés: {}", e);
            return;
        }
    };

    let mut needs_reload = false;
    for effect in expired_effects {
        // Écrire la valeur de base dans server_config pour réverter
        let update_result = sea_orm::ConnectionTrait::execute(
            db,
            sea_orm::Statement::from_sql_and_values(
                sea_orm::DatabaseBackend::Postgres,
                "UPDATE server_config SET config_value = $1 WHERE config_key = $2",
                [
                    sea_orm::Value::String(Some(Box::new(effect.base_value.to_string()))),
                    sea_orm::Value::String(Some(Box::new(effect.config_key.clone()))),
                ],
            ),
        )
        .await;

        if let Err(e) = update_result {
            eprintln!("Governance tick: erreur réversion effect {}: {}", effect.id, e);
        }

        // Supprimer l'effet
        let active: law_effect::ActiveModel = effect.into();
        if let Err(e) = active.delete(db).await {
            eprintln!("Governance tick: erreur suppression law_effect: {}", e);
        }

        needs_reload = true;
    }

    if needs_reload {
        reload_server_config(state).await;
        eprintln!("Governance tick: config rechargée après réversion d'effets expirés");
    }

    // ── 3. Fermer les sondages actifs dont ends_at est dépassé ────────────────
    let expired_surveys = match Survey::find()
        .filter(survey::Column::Status.eq("active"))
        .filter(survey::Column::EndsAt.lt(now))
        .all(db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            eprintln!("Governance tick: erreur lecture sondages expirés: {}", e);
            return;
        }
    };

    for s in expired_surveys {
        let mut active: survey::ActiveModel = s.clone().into();
        active.status = Set("closed".to_string());
        if let Err(e) = active.update(db).await {
            eprintln!("Governance tick: erreur fermeture sondage {}: {}", s.id, e);
        }
        if let Some(ws) = &state.ws {
            broadcast_governance_announcement(
                db,
                ws,
                &format!("Sondage clôturé : {}", s.title),
                &format!("Le sondage '{}' est maintenant terminé. Consultez les résultats.", s.title),
                "survey_closed",
            )
            .await;
        }
    }
}

// ============================================================================
// ROUTER
// ============================================================================

pub fn router(_state: AppState) -> Router<AppState> {
    Router::new()
        // ── Lois publiques ───────────────────────────────────────────────────
        .route("/laws", get(list_laws_handler))
        .route("/laws/:id", get(get_law_handler))
        .route("/laws/:id/vote", post(vote_law_handler))
        // ── Lois admin ───────────────────────────────────────────────────────
        .route("/admin/laws", post(create_law_handler))
        .route("/admin/laws/:id", patch(patch_law_handler))
        .route("/admin/laws/:id", delete(delete_law_handler))
        // ── Sondages publics ─────────────────────────────────────────────────
        .route("/surveys", get(list_surveys_handler))
        .route("/surveys/:id", get(get_survey_handler))
        .route("/surveys/:id/respond", post(respond_survey_handler))
        // ── Sondages admin ───────────────────────────────────────────────────
        .route("/admin/surveys", post(create_survey_handler))
        .route("/admin/surveys/:id", patch(patch_survey_handler))
        .route("/admin/surveys/:id", delete(delete_survey_handler))
}

// ============================================================================
// HANDLERS — LOIS PUBLIQUES
// ============================================================================

/// GET /laws — Liste toutes les lois avec statut, décomptes de votes, résumé des effets.
/// Si un token Bearer est fourni, indique le vote de l'utilisateur connecté.
async fn list_laws_handler(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let caller_id = extract_user_from_headers(&headers);

    let laws = match LawProposal::find()
        .order_by_desc(law_proposal::Column::CreatedAt)
        .all(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    // Charger les votes de l'utilisateur si authentifié
    let my_votes: HashMap<Uuid, bool> = if let Some(uid) = caller_id {
        LawVote::find()
            .filter(law_vote::Column::UserId.eq(uid))
            .all(&state.db)
            .await
            .unwrap_or_default()
            .into_iter()
            .map(|v| (v.law_id, v.vote))
            .collect()
    } else {
        HashMap::new()
    };

    let result: Vec<Value> = laws
        .into_iter()
        .map(|law| {
            let my_vote = my_votes.get(&law.id).copied();
            json!({
                "id": law.id,
                "title": law.title,
                "description": law.description,
                "created_by": law.created_by,
                "vote_start": law.vote_start,
                "vote_end": law.vote_end,
                "status": law.status,
                "effects": law.effects,
                "yes_count": law.yes_count,
                "no_count": law.no_count,
                "created_at": law.created_at,
                "my_vote": my_vote,
            })
        })
        .collect();

    (StatusCode::OK, Json(json!({"laws": result}))).into_response()
}

/// GET /laws/:id — Détail complet d'une loi avec effets et ventilation des votes.
async fn get_law_handler(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(law_id_str): Path<String>,
) -> impl IntoResponse {
    let law_id = match Uuid::parse_str(&law_id_str) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "ID de loi invalide"})),
            )
                .into_response();
        }
    };

    let law = match LawProposal::find_by_id(law_id).one(&state.db).await {
        Ok(Some(l)) => l,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(json!({"error": "Loi introuvable"}))).into_response();
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    let caller_id = extract_user_from_headers(&headers);
    let my_vote: Option<bool> = if let Some(uid) = caller_id {
        LawVote::find()
            .filter(law_vote::Column::LawId.eq(law_id))
            .filter(law_vote::Column::UserId.eq(uid))
            .one(&state.db)
            .await
            .ok()
            .flatten()
            .map(|v| v.vote)
    } else {
        None
    };

    let active_effects = LawEffect::find()
        .filter(law_effect::Column::LawId.eq(law_id))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let total_votes = law.yes_count + law.no_count;
    let yes_pct = if total_votes > 0 {
        (law.yes_count as f64 / total_votes as f64 * 100.0).round()
    } else {
        0.0
    };

    (
        StatusCode::OK,
        Json(json!({
            "id": law.id,
            "title": law.title,
            "description": law.description,
            "created_by": law.created_by,
            "vote_start": law.vote_start,
            "vote_end": law.vote_end,
            "status": law.status,
            "effects": law.effects,
            "yes_count": law.yes_count,
            "no_count": law.no_count,
            "yes_pct": yes_pct,
            "total_votes": total_votes,
            "created_at": law.created_at,
            "my_vote": my_vote,
            "active_effects": active_effects,
        })),
    )
        .into_response()
}

/// POST /laws/:id/vote — Body: {vote: bool}
/// Auth requise. Statut doit être "voting" et vote_end > maintenant.
async fn vote_law_handler(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(law_id_str): Path<String>,
    Json(payload): Json<VoteBody>,
) -> impl IntoResponse {
    let user_id = match extract_user_from_headers(&headers) {
        Some(id) => id,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({"error": "Authentification requise"})),
            )
                .into_response();
        }
    };

    let law_id = match Uuid::parse_str(&law_id_str) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "ID de loi invalide"})),
            )
                .into_response();
        }
    };

    let law = match LawProposal::find_by_id(law_id).one(&state.db).await {
        Ok(Some(l)) => l,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(json!({"error": "Loi introuvable"}))).into_response();
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    // Vérifier que le vote est encore ouvert
    let now = Utc::now().naive_utc();
    if law.status != "voting" || law.vote_end <= now {
        return (
            StatusCode::CONFLICT,
            Json(json!({"error": "Cette loi n'est plus en cours de vote"})),
        )
            .into_response();
    }

    // Tenter d'insérer le vote — la contrainte UNIQUE (law_id, user_id) génère une erreur en cas de doublon
    let new_vote = law_vote::ActiveModel {
        id: Set(Uuid::new_v4()),
        law_id: Set(law_id),
        user_id: Set(user_id),
        vote: Set(payload.vote),
        voted_at: Set(now),
    };

    match new_vote.insert(&state.db).await {
        Ok(_) => {}
        Err(sea_orm::DbErr::Exec(sea_orm::RuntimeErr::SqlxError(ref e)))
            if e.to_string().contains("duplicate key") || e.to_string().contains("unique") =>
        {
            return (
                StatusCode::CONFLICT,
                Json(json!({"error": "Vous avez déjà voté pour cette loi"})),
            )
                .into_response();
        }
        Err(e) => {
            // Attraper aussi les erreurs de contrainte unique formulées autrement (DbErr::Query)
            let msg = e.to_string();
            if msg.contains("duplicate key") || msg.contains("unique") || msg.contains("23505") {
                return (
                    StatusCode::CONFLICT,
                    Json(json!({"error": "Vous avez déjà voté pour cette loi"})),
                )
                    .into_response();
            }
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": msg})),
            )
                .into_response();
        }
    }

    // Mettre à jour les compteurs atomiquement via SQL
    let col = if payload.vote { "yes_count" } else { "no_count" };
    let sql = format!("UPDATE law_proposal SET {} = {} + 1 WHERE id = $1", col, col);
    let _ = sea_orm::ConnectionTrait::execute(
        &state.db,
        sea_orm::Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            &sql,
            [sea_orm::Value::Uuid(Some(Box::new(law_id)))],
        ),
    )
    .await;

    (
        StatusCode::CREATED,
        Json(json!({
            "status": "ok",
            "message": if payload.vote { "Vote POUR enregistré" } else { "Vote CONTRE enregistré" }
        })),
    )
        .into_response()
}

// ============================================================================
// HANDLERS — LOIS ADMIN
// ============================================================================

/// POST /admin/laws
async fn create_law_handler(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<CreateLawBody>,
) -> impl IntoResponse {
    let user_id_str = headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .or_else(|| {
            headers
                .get("authorization")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.strip_prefix("Bearer jwt-"))
        })
        .unwrap_or("");

    if let Err(status) = check_admin(user_id_str, &state).await {
        return (status, Json(json!({"error": "Accès refusé"}))).into_response();
    }

    // Valider les effets
    for effect in &payload.effects {
        if let Err(msg) = validate_effect(effect) {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": msg}))).into_response();
        }
    }

    // Parser vote_end
    let vote_end = match chrono::DateTime::parse_from_rfc3339(&payload.vote_end) {
        Ok(dt) => dt.naive_utc(),
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "vote_end doit être un ISO 8601 valide"})),
            )
                .into_response();
        }
    };

    let now = Utc::now().naive_utc();
    if vote_end <= now {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "vote_end doit être dans le futur"})),
        )
            .into_response();
    }

    let admin_id = Uuid::parse_str(user_id_str).unwrap_or_else(|_| Uuid::nil());

    let effects_json =
        serde_json::to_value(&payload.effects).unwrap_or_else(|_| json!([]));

    let new_law = law_proposal::ActiveModel {
        id: Set(Uuid::new_v4()),
        title: Set(payload.title.clone()),
        description: Set(payload.description.clone()),
        created_by: Set(admin_id),
        vote_start: Set(now),
        vote_end: Set(vote_end),
        status: Set("voting".to_string()),
        effects: Set(effects_json),
        yes_count: Set(0),
        no_count: Set(0),
        created_at: Set(now),
    };

    let law = match new_law.insert(&state.db).await {
        Ok(l) => l,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    // Annoncer l'ouverture du vote
    if let Some(ws) = &state.ws {
        broadcast_governance_announcement(
            &state.db,
            ws,
            &format!("Nouveau vote de loi : {}", law.title),
            &format!(
                "Une nouvelle loi '{}' est soumise au vote. Exprime-toi avant le {}.",
                law.title, payload.vote_end
            ),
            "law_vote_open",
        )
        .await;
    }

    (StatusCode::CREATED, Json(json!({"law": law}))).into_response()
}

/// PATCH /admin/laws/:id — Body: {status: "passed"|"failed"|"cancelled"}
async fn patch_law_handler(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(law_id_str): Path<String>,
    Json(payload): Json<PatchLawBody>,
) -> impl IntoResponse {
    let user_id_str = headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .or_else(|| {
            headers
                .get("authorization")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.strip_prefix("Bearer jwt-"))
        })
        .unwrap_or("");

    if let Err(status) = check_admin(user_id_str, &state).await {
        return (status, Json(json!({"error": "Accès refusé"}))).into_response();
    }

    let law_id = match Uuid::parse_str(&law_id_str) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "ID de loi invalide"})),
            )
                .into_response();
        }
    };

    let allowed_statuses = ["passed", "failed", "cancelled"];
    if !allowed_statuses.contains(&payload.status.as_str()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Statut invalide: passed|failed|cancelled attendu"})),
        )
            .into_response();
    }

    let law = match LawProposal::find_by_id(law_id).one(&state.db).await {
        Ok(Some(l)) => l,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(json!({"error": "Loi introuvable"}))).into_response();
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    let mut active: law_proposal::ActiveModel = law.clone().into();
    active.status = Set(payload.status.clone());

    let updated = match active.update(&state.db).await {
        Ok(l) => l,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    // Si on passe manuellement à "passed", appliquer les effets
    if payload.status == "passed" {
        apply_law_effects(&state.db, &updated, &state).await;
    } else if payload.status == "failed" {
        if let Some(ws) = &state.ws {
            broadcast_governance_announcement(
                &state.db,
                ws,
                &format!("Loi rejetée : {}", law.title),
                &format!("La loi '{}' a été rejetée par l'administration.", law.title),
                "law_failed",
            )
            .await;
        }
    }

    (StatusCode::OK, Json(json!({"law": updated}))).into_response()
}

/// DELETE /admin/laws/:id — Seulement si status != "passed"
async fn delete_law_handler(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(law_id_str): Path<String>,
) -> impl IntoResponse {
    let user_id_str = headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .or_else(|| {
            headers
                .get("authorization")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.strip_prefix("Bearer jwt-"))
        })
        .unwrap_or("");

    if let Err(status) = check_admin(user_id_str, &state).await {
        return (status, Json(json!({"error": "Accès refusé"}))).into_response();
    }

    let law_id = match Uuid::parse_str(&law_id_str) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "ID de loi invalide"})),
            )
                .into_response();
        }
    };

    let law = match LawProposal::find_by_id(law_id).one(&state.db).await {
        Ok(Some(l)) => l,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(json!({"error": "Loi introuvable"}))).into_response();
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    if law.status == "passed" {
        return (
            StatusCode::CONFLICT,
            Json(json!({"error": "Impossible de supprimer une loi adoptée"})),
        )
            .into_response();
    }

    let active: law_proposal::ActiveModel = law.into();
    match active.delete(&state.db).await {
        Ok(_) => (StatusCode::OK, Json(json!({"status": "deleted"}))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        )
            .into_response(),
    }
}

// ============================================================================
// HANDLERS — SONDAGES PUBLICS
// ============================================================================

/// GET /surveys — Liste les sondages actifs et fermés (pas archivés sauf ?include_archived=true)
async fn list_surveys_handler(
    State(state): State<AppState>,
    Query(params): Query<SurveyListQuery>,
) -> impl IntoResponse {
    let include_archived = params.include_archived.unwrap_or(false);

    let mut query = Survey::find().order_by_desc(survey::Column::CreatedAt);
    if !include_archived {
        query = query.filter(survey::Column::Status.ne("archived"));
    }

    let surveys = match query.all(&state.db).await {
        Ok(v) => v,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    // Pour chaque sondage, compter les réponses
    let mut result = Vec::new();
    for s in surveys {
        let response_count = SurveyResponse::find()
            .filter(survey_response::Column::SurveyId.eq(s.id))
            .count(&state.db)
            .await
            .unwrap_or(0);

        result.push(json!({
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "survey_type": s.survey_type,
            "options": s.options,
            "starts_at": s.starts_at,
            "ends_at": s.ends_at,
            "status": s.status,
            "created_at": s.created_at,
            "response_count": response_count,
        }));
    }

    (StatusCode::OK, Json(json!({"surveys": result}))).into_response()
}

/// GET /surveys/:id — Détail + résultats (toujours visibles)
async fn get_survey_handler(
    State(state): State<AppState>,
    Path(survey_id_str): Path<String>,
) -> impl IntoResponse {
    let survey_id = match Uuid::parse_str(&survey_id_str) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "ID de sondage invalide"})),
            )
                .into_response();
        }
    };

    let s = match Survey::find_by_id(survey_id).one(&state.db).await {
        Ok(Some(s)) => s,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Sondage introuvable"})),
            )
                .into_response();
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    // Charger toutes les réponses pour construire la ventilation
    let responses = SurveyResponse::find()
        .filter(survey_response::Column::SurveyId.eq(survey_id))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let total = responses.len();

    // Construire la ventilation selon le type de sondage
    let breakdown = build_results_breakdown(&s.survey_type, &s.options, &responses);

    (
        StatusCode::OK,
        Json(json!({
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "survey_type": s.survey_type,
            "options": s.options,
            "starts_at": s.starts_at,
            "ends_at": s.ends_at,
            "status": s.status,
            "created_at": s.created_at,
            "total_responses": total,
            "results": breakdown,
        })),
    )
        .into_response()
}

/// Construit la ventilation des résultats selon le type du sondage
fn build_results_breakdown(
    survey_type: &str,
    options_json: &Value,
    responses: &[survey_response::Model],
) -> Value {
    match survey_type {
        "yes_no" => {
            let yes = responses
                .iter()
                .filter(|r| r.answer == json!(true) || r.answer == json!("yes"))
                .count();
            let no = responses.len() - yes;
            json!({"yes": yes, "no": no})
        }
        "multiple_choice" => {
            let options: Vec<String> = options_json
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default();

            let mut counts: HashMap<String, usize> = options.iter().map(|o| (o.clone(), 0)).collect();
            for r in responses {
                if let Some(s) = r.answer.as_str() {
                    *counts.entry(s.to_string()).or_insert(0) += 1;
                }
            }
            serde_json::to_value(counts).unwrap_or_else(|_| json!({}))
        }
        "rating" => {
            let ratings: Vec<f64> = responses
                .iter()
                .filter_map(|r| r.answer.as_f64())
                .collect();
            let total = ratings.len();
            let avg = if total > 0 {
                ratings.iter().sum::<f64>() / total as f64
            } else {
                0.0
            };
            json!({"average": avg, "count": total})
        }
        _ => json!({}),
    }
}

/// POST /surveys/:id/respond — Body: {answer: <value>}
async fn respond_survey_handler(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(survey_id_str): Path<String>,
    Json(payload): Json<RespondBody>,
) -> impl IntoResponse {
    let user_id = match extract_user_from_headers(&headers) {
        Some(id) => id,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({"error": "Authentification requise"})),
            )
                .into_response();
        }
    };

    let survey_id = match Uuid::parse_str(&survey_id_str) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "ID de sondage invalide"})),
            )
                .into_response();
        }
    };

    let s = match Survey::find_by_id(survey_id).one(&state.db).await {
        Ok(Some(s)) => s,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Sondage introuvable"})),
            )
                .into_response();
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    if s.status != "active" {
        return (
            StatusCode::CONFLICT,
            Json(json!({"error": "Ce sondage est fermé"})),
        )
            .into_response();
    }

    // Valider le format de la réponse selon le type
    if let Err(msg) = validate_survey_answer(&s.survey_type, &s.options, &payload.answer) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": msg}))).into_response();
    }

    let now = Utc::now().naive_utc();
    let new_response = survey_response::ActiveModel {
        id: Set(Uuid::new_v4()),
        survey_id: Set(survey_id),
        user_id: Set(user_id),
        answer: Set(payload.answer),
        responded_at: Set(now),
    };

    match new_response.insert(&state.db).await {
        Ok(_) => {}
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("duplicate key") || msg.contains("unique") || msg.contains("23505") {
                return (
                    StatusCode::CONFLICT,
                    Json(json!({"error": "Vous avez déjà répondu à ce sondage"})),
                )
                    .into_response();
            }
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": msg})),
            )
                .into_response();
        }
    }

    (
        StatusCode::CREATED,
        Json(json!({"status": "ok", "message": "Réponse enregistrée"})),
    )
        .into_response()
}

/// Valide qu'une réponse est cohérente avec le type de sondage
fn validate_survey_answer(
    survey_type: &str,
    options_json: &Value,
    answer: &Value,
) -> Result<(), String> {
    match survey_type {
        "yes_no" => {
            if answer.as_bool().is_none()
                && answer.as_str() != Some("yes")
                && answer.as_str() != Some("no")
            {
                return Err("Réponse yes_no: attendu true/false ou 'yes'/'no'".to_string());
            }
        }
        "multiple_choice" => {
            let answer_str = answer
                .as_str()
                .ok_or_else(|| "Réponse multiple_choice: attendu une chaîne".to_string())?;
            let options: Vec<String> = options_json
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default();
            if !options.contains(&answer_str.to_string()) {
                return Err(format!(
                    "Réponse '{}' non valide, options disponibles: {:?}",
                    answer_str, options
                ));
            }
        }
        "rating" => {
            let val = answer
                .as_f64()
                .ok_or_else(|| "Réponse rating: attendu un nombre".to_string())?;
            if !(1.0..=10.0).contains(&val) {
                return Err(format!("Rating doit être entre 1 et 10, reçu {}", val));
            }
        }
        _ => return Err(format!("Type de sondage inconnu: {}", survey_type)),
    }
    Ok(())
}

// ============================================================================
// HANDLERS — SONDAGES ADMIN
// ============================================================================

/// POST /admin/surveys
async fn create_survey_handler(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<CreateSurveyBody>,
) -> impl IntoResponse {
    let user_id_str = headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .or_else(|| {
            headers
                .get("authorization")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.strip_prefix("Bearer jwt-"))
        })
        .unwrap_or("");

    if let Err(status) = check_admin(user_id_str, &state).await {
        return (status, Json(json!({"error": "Accès refusé"}))).into_response();
    }

    let valid_types = ["yes_no", "multiple_choice", "rating"];
    if !valid_types.contains(&payload.survey_type.as_str()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "survey_type invalide: yes_no|multiple_choice|rating"})),
        )
            .into_response();
    }

    let ends_at = match chrono::DateTime::parse_from_rfc3339(&payload.ends_at) {
        Ok(dt) => dt.naive_utc(),
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "ends_at doit être un ISO 8601 valide"})),
            )
                .into_response();
        }
    };

    let now = Utc::now().naive_utc();
    if ends_at <= now {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "ends_at doit être dans le futur"})),
        )
            .into_response();
    }

    let admin_id = Uuid::parse_str(user_id_str).unwrap_or_else(|_| Uuid::nil());
    let options_json = match &payload.options {
        Some(opts) => serde_json::to_value(opts).unwrap_or_else(|_| json!([])),
        None => json!([]),
    };

    let new_survey = survey::ActiveModel {
        id: Set(Uuid::new_v4()),
        title: Set(payload.title.clone()),
        description: Set(payload.description.clone()),
        created_by: Set(admin_id),
        survey_type: Set(payload.survey_type.clone()),
        options: Set(options_json),
        starts_at: Set(now),
        ends_at: Set(ends_at),
        status: Set("active".to_string()),
        created_at: Set(now),
    };

    let survey_model = match new_survey.insert(&state.db).await {
        Ok(s) => s,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    // Annoncer l'ouverture du sondage
    if let Some(ws) = &state.ws {
        broadcast_governance_announcement(
            &state.db,
            ws,
            &format!("Nouveau sondage : {}", survey_model.title),
            &format!(
                "Un nouveau sondage '{}' est disponible. Participez avant le {}.",
                survey_model.title, payload.ends_at
            ),
            "survey_open",
        )
        .await;
    }

    (
        StatusCode::CREATED,
        Json(json!({"survey": survey_model})),
    )
        .into_response()
}

/// PATCH /admin/surveys/:id — Body: {status: "closed"|"archived"}
async fn patch_survey_handler(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(survey_id_str): Path<String>,
    Json(payload): Json<PatchSurveyBody>,
) -> impl IntoResponse {
    let user_id_str = headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .or_else(|| {
            headers
                .get("authorization")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.strip_prefix("Bearer jwt-"))
        })
        .unwrap_or("");

    if let Err(status) = check_admin(user_id_str, &state).await {
        return (status, Json(json!({"error": "Accès refusé"}))).into_response();
    }

    let survey_id = match Uuid::parse_str(&survey_id_str) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "ID de sondage invalide"})),
            )
                .into_response();
        }
    };

    let allowed = ["closed", "archived"];
    if !allowed.contains(&payload.status.as_str()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Statut invalide: closed|archived attendu"})),
        )
            .into_response();
    }

    let s = match Survey::find_by_id(survey_id).one(&state.db).await {
        Ok(Some(s)) => s,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Sondage introuvable"})),
            )
                .into_response();
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    let mut active: survey::ActiveModel = s.into();
    active.status = Set(payload.status.clone());

    match active.update(&state.db).await {
        Ok(updated) => (StatusCode::OK, Json(json!({"survey": updated}))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        )
            .into_response(),
    }
}

/// DELETE /admin/surveys/:id
async fn delete_survey_handler(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(survey_id_str): Path<String>,
) -> impl IntoResponse {
    let user_id_str = headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .or_else(|| {
            headers
                .get("authorization")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.strip_prefix("Bearer jwt-"))
        })
        .unwrap_or("");

    if let Err(status) = check_admin(user_id_str, &state).await {
        return (status, Json(json!({"error": "Accès refusé"}))).into_response();
    }

    let survey_id = match Uuid::parse_str(&survey_id_str) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "ID de sondage invalide"})),
            )
                .into_response();
        }
    };

    let s = match Survey::find_by_id(survey_id).one(&state.db).await {
        Ok(Some(s)) => s,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Sondage introuvable"})),
            )
                .into_response();
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    let active: survey::ActiveModel = s.into();
    match active.delete(&state.db).await {
        Ok(_) => (StatusCode::OK, Json(json!({"status": "deleted"}))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        )
            .into_response(),
    }
}
