use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
};
use sea_orm::{DatabaseConnection, EntityTrait, ColumnTrait, QueryFilter};
use serde::{Deserialize, Serialize};

use crate::entities::{prelude::ServerConfig, server_config};
use crate::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct MaintenanceStatus {
    pub enabled: bool,
    pub title: String,
    pub description: Vec<String>,
    pub estimated_duration: String,
    pub start_time: String,
    pub auto_disable_at: Option<String>,
}

impl Default for MaintenanceStatus {
    fn default() -> Self {
        Self {
            enabled: false,
            title: "MAINTENANCE PROGRAMMÉE".to_string(),
            description: vec![
                "Le serveur est en maintenance.".to_string(),
                "Merci de votre patience !".to_string(),
            ],
            estimated_duration: "15-30 minutes".to_string(),
            start_time: String::new(),
            auto_disable_at: None,
        }
    }
}

/// Handler pour récupérer le statut de maintenance
pub async fn get_maintenance_status_handler(
    State(state): State<AppState>,
) -> Result<Json<MaintenanceStatus>, StatusCode> {
    let status = get_maintenance_status(&state.db).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(status))
}

/// Fonction pour récupérer le statut de maintenance depuis la base de données
pub async fn get_maintenance_status(db: &DatabaseConnection) -> Result<MaintenanceStatus, sea_orm::DbErr> {
    // Récupérer les configs de maintenance
    let configs = ServerConfig::find()
        .filter(server_config::Column::ConfigKey.starts_with("maintenance_"))
        .all(db)
        .await?;

    let mut status = MaintenanceStatus::default();

    for config in configs {
        match config.config_key.as_str() {
            "maintenance_enabled" => {
                status.enabled = config.config_value.parse::<bool>().unwrap_or(false);
            }
            "maintenance_message_title" => {
                status.title = config.config_value;
            }
            "maintenance_message_description" => {
                // La description peut être une liste séparée par des newlines
                status.description = config.config_value
                    .split('\n')
                    .map(|s| s.to_string())
                    .collect();
            }
            "maintenance_estimated_duration" => {
                status.estimated_duration = config.config_value;
            }
            "maintenance_start_time" => {
                status.start_time = config.config_value;
            }
            "maintenance_auto_disable_at" => {
                if !config.config_value.is_empty() {
                    status.auto_disable_at = Some(config.config_value);
                }
            }
            _ => {}
        }
    }

    Ok(status)
}
