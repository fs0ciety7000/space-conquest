/// Analytics — historique de production et statistiques pour le Dashboard
///
/// Endpoint:
///   GET /analytics?user_id=<uuid>
///
/// Retourne :
///   - weekly_production : 7 derniers jours × {day, label, metal, crystal, deuterium}
///     (production journalière calculée depuis les niveaux de mines actuels × 24h)
///   - stats : energy_efficiency, victories_7d, military_score, economy_score

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use chrono::{Datelike, Duration, Utc};
use sea_orm::ConnectionTrait;
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;

use crate::game_logic::{self, ResourceType};
use crate::AppState;

// ── Jours de la semaine en français ──────────────────────────────────────────

fn weekday_fr(d: chrono::Weekday) -> &'static str {
    match d {
        chrono::Weekday::Mon => "Lun",
        chrono::Weekday::Tue => "Mar",
        chrono::Weekday::Wed => "Mer",
        chrono::Weekday::Thu => "Jeu",
        chrono::Weekday::Fri => "Ven",
        chrono::Weekday::Sat => "Sam",
        chrono::Weekday::Sun => "Dim",
    }
}

// ── Handler ───────────────────────────────────────────────────────────────────

pub async fn get_analytics_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = match params.get("user_id") {
        Some(id) => id.clone(),
        None => return (StatusCode::BAD_REQUEST, Json(json!({"error":"user_id required"}))).into_response(),
    };
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error":"Invalid user_id"}))).into_response(),
    };

    let config = state.config.read().unwrap().clone();

    // ── 1. Récupérer toutes les planètes de l'utilisateur ─────────────────────
    let planet_rows = state.db.query_all(sea_orm::Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Postgres,
        r#"SELECT p.id::text,
                  COALESCE(MAX(CASE WHEN bt.building_key = 'metal_mine'     THEN pb.level ELSE 0 END), 0) AS metal_mine,
                  COALESCE(MAX(CASE WHEN bt.building_key = 'crystal_mine'   THEN pb.level ELSE 0 END), 0) AS crystal_mine,
                  COALESCE(MAX(CASE WHEN bt.building_key = 'deuterium_mine' THEN pb.level ELSE 0 END), 0) AS deuterium_mine,
                  COALESCE(MAX(CASE WHEN bt.building_key = 'solar_plant'    THEN pb.level ELSE 0 END), 0) AS solar_plant,
                  COALESCE(MAX(CASE WHEN t.tech_key = 'energy_tech'         THEN pt.current_level ELSE 0 END), 0) AS energy_tech,
                  COALESCE(MAX(CASE WHEN t.tech_key IN ('plasma_tech')      THEN pt.current_level ELSE 0 END), 0) AS plasma_tech
           FROM planet p
           LEFT JOIN planet_building pb ON pb.planet_id = p.id
           LEFT JOIN building_type bt ON bt.id = pb.building_type_id
           LEFT JOIN planet_technology pt ON pt.planet_id = p.id
           LEFT JOIN technology t ON t.id = pt.tech_id
           WHERE p.owner_id = $1
           GROUP BY p.id"#,
        [user_id.into()],
    )).await.unwrap_or_default();

    // ── 2. Calculer la production horaire totale ──────────────────────────────
    let mut total_metal_hour: f64 = 0.0;
    let mut total_crystal_hour: f64 = 0.0;
    let mut total_deut_hour: f64 = 0.0;
    let mut energy_ratios: Vec<f64> = Vec::new();

    for row in &planet_rows {
        let metal_mine: i32 = row.try_get("", "metal_mine").unwrap_or(0);
        let crystal_mine: i32 = row.try_get("", "crystal_mine").unwrap_or(0);
        let deuterium_mine: i32 = row.try_get("", "deuterium_mine").unwrap_or(0);
        let solar_plant: i32 = row.try_get("", "solar_plant").unwrap_or(0);
        let energy_tech: i32 = row.try_get("", "energy_tech").unwrap_or(0);
        let plasma_tech: i32 = row.try_get("", "plasma_tech").unwrap_or(0);

        let energy_ratio = game_logic::calculate_energy_ratio(
            solar_plant, energy_tech, metal_mine, crystal_mine, deuterium_mine, &config,
        );
        energy_ratios.push(energy_ratio);

        total_metal_hour += game_logic::calculate_resource_production(
            ResourceType::Metal, metal_mine, energy_tech, plasma_tech, energy_ratio, &config,
        );
        total_crystal_hour += game_logic::calculate_resource_production(
            ResourceType::Crystal, crystal_mine, energy_tech, plasma_tech, energy_ratio, &config,
        );
        total_deut_hour += game_logic::calculate_resource_production(
            ResourceType::Deuterium, deuterium_mine, energy_tech, plasma_tech, energy_ratio, &config,
        );
    }

    // Production journalière = production horaire × 24
    let metal_day = (total_metal_hour * 24.0).round() as i64;
    let crystal_day = (total_crystal_hour * 24.0).round() as i64;
    let deut_day = (total_deut_hour * 24.0).round() as i64;

    // ── 3. Générer les 7 derniers jours ───────────────────────────────────────
    let today = Utc::now().date_naive();
    let weekly_production: Vec<serde_json::Value> = (0..7i64)
        .rev()
        .map(|offset| {
            let date = today - Duration::days(offset);
            json!({
                "day":   weekday_fr(date.weekday()),
                "label": date.format("%Y-%m-%d").to_string(),
                "metal":     metal_day,
                "crystal":   crystal_day,
                "deuterium": deut_day,
            })
        })
        .collect();

    // ── 4. Stats – efficacité énergie ─────────────────────────────────────────
    let energy_efficiency = if energy_ratios.is_empty() {
        100
    } else {
        let avg = energy_ratios.iter().copied().sum::<f64>() / energy_ratios.len() as f64;
        (avg * 100.0).min(100.0).round() as i32
    };

    // ── 5. Stats – victoires des 7 derniers jours ─────────────────────────────
    let victories_row = state.db.query_one(sea_orm::Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Postgres,
        r#"SELECT COUNT(*) AS cnt
           FROM combat_log cl
           JOIN planet p ON p.id = cl.planet_id
           WHERE p.owner_id = $1
             AND cl.result = 'victory'
             AND cl.date >= NOW() - INTERVAL '7 days'"#,
        [user_id.into()],
    )).await.unwrap_or(None);

    let victories_7d: i64 = victories_row
        .as_ref()
        .and_then(|r| r.try_get::<i64>("", "cnt").ok())
        .unwrap_or(0);

    // ── 6. Stats – scores joueur ──────────────────────────────────────────────
    let user_row = state.db.query_one(sea_orm::Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Postgres,
        r#"SELECT total_score, economy_score, military_score FROM "user" WHERE id = $1"#,
        [user_id.into()],
    )).await.unwrap_or(None);

    let total_score: i32 = user_row.as_ref().and_then(|r| r.try_get("", "total_score").ok()).unwrap_or(0);
    let economy_score: i32 = user_row.as_ref().and_then(|r| r.try_get("", "economy_score").ok()).unwrap_or(0);
    let military_score: i32 = user_row.as_ref().and_then(|r| r.try_get("", "military_score").ok()).unwrap_or(0);

    Json(json!({
        "weekly_production": weekly_production,
        "stats": {
            "energy_efficiency": energy_efficiency,
            "victories_7d": victories_7d,
            "total_score": total_score,
            "economy_score": economy_score,
            "military_score": military_score,
        }
    })).into_response()
}
