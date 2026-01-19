// Imports pour les structures partagées
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait};
use std::sync::{Arc, RwLock};

// Modules publics
pub mod auth;
pub mod game_logic;
pub mod combat;
pub mod entities;
pub mod config;
pub mod messaging;
pub mod websocket;
pub mod alliance;

// Structures partagées - doivent être définies APRÈS entities mais AVANT admin
use entities::{prelude::ServerConfig, server_config};

#[derive(Clone)]
pub struct ServerConfigCache {
    pub speed_factor: f64,
    pub construction_speed: f64,
    pub mining_speed: f64,
}

impl Default for ServerConfigCache {
    fn default() -> Self {
        Self {
            speed_factor: game_logic::SPEED_FACTOR,
            construction_speed: 1.0,
            mining_speed: 1.0,
        }
    }
}

impl ServerConfigCache {
    pub async fn load_from_db(db: &DatabaseConnection) -> Self {
        let mut cache = Self::default();

        // Charger speed_factor
        if let Ok(Some(config)) = ServerConfig::find()
            .filter(server_config::Column::ConfigKey.eq("speed_factor"))
            .one(db)
            .await
        {
            if let Ok(val) = config.config_value.parse::<f64>() {
                cache.speed_factor = val;
            }
        }

        // Charger construction_speed_multiplier
        if let Ok(Some(config)) = ServerConfig::find()
            .filter(server_config::Column::ConfigKey.eq("construction_speed_multiplier"))
            .one(db)
            .await
        {
            if let Ok(val) = config.config_value.parse::<f64>() {
                cache.construction_speed = val;
            }
        }

        // Charger mining_speed_multiplier
        if let Ok(Some(config)) = ServerConfig::find()
            .filter(server_config::Column::ConfigKey.eq("mining_speed_multiplier"))
            .one(db)
            .await
        {
            if let Ok(val) = config.config_value.parse::<f64>() {
                cache.mining_speed = val;
            }
        }

        cache
    }
}

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub config: Arc<RwLock<ServerConfigCache>>,
    pub ws: Option<websocket::WsState>,
}

// Fonction helper pour recharger la config
pub async fn reload_server_config(state: &AppState) {
    let new_config = ServerConfigCache::load_from_db(&state.db).await;
    if let Ok(mut cache) = state.config.write() {
        *cache = new_config;
    }
}

// Admin doit être déclaré APRÈS AppState et ServerConfigCache
pub mod admin;
