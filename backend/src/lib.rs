// Imports pour les structures partagées
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait};
use std::sync::{Arc, RwLock};
use std::collections::HashMap;

// Modules publics
pub mod auth;
pub mod game_logic;
pub mod combat;
pub mod entities;
pub mod config;
pub mod messaging;
pub mod websocket;
pub mod alliance;
pub mod market;
pub mod missions;
pub mod officers;
pub mod sabotage;
pub mod tech_tree;
pub mod tick_system;

// Structures partagées - doivent être définies APRÈS entities mais AVANT admin
use entities::{prelude::ServerConfig, server_config};

#[derive(Clone)]
pub struct ServerConfigCache {
    pub speed_factor: f64,
    pub construction_speed: f64,
    pub mining_speed: f64,
    pub configs: HashMap<String, f64>,
}

impl Default for ServerConfigCache {
    fn default() -> Self {
        Self {
            speed_factor: game_logic::SPEED_FACTOR,
            construction_speed: 1.0,
            mining_speed: 1.0,
            configs: HashMap::new(),
        }
    }
}

impl ServerConfigCache {
    pub async fn load_from_db(db: &DatabaseConnection) -> Self {
        let mut cache = Self::default();

        // Charger TOUS les configs de la base de données
        if let Ok(all_configs) = ServerConfig::find().all(db).await {
            for config in all_configs {
                if let Ok(val) = config.config_value.parse::<f64>() {
                    // Stocker dans le HashMap
                    cache.configs.insert(config.config_key.clone(), val);

                    // Extraire les configs critiques dans les champs dédiés
                    match config.config_key.as_str() {
                        "speed_factor" => cache.speed_factor = val,
                        "construction_speed_multiplier" => cache.construction_speed = val,
                        "mining_speed_multiplier" => cache.mining_speed = val,
                        _ => {}
                    }
                }
            }
        }

        cache
    }

    /// Helper pour récupérer une config dynamique avec valeur par défaut
    pub fn get_config(&self, key: &str, default: f64) -> f64 {
        self.configs.get(key).copied().unwrap_or(default)
    }

    /// Helper pour récupérer le coût d'un vaisseau/défense
    pub fn get_unit_cost(&self, unit_type: &str) -> (f64, f64) {
        let metal_key = format!("ship_{}_metal", unit_type);
        let crystal_key = format!("ship_{}_crystal", unit_type);

        let metal = self.get_config(&metal_key, 0.0);
        let crystal = self.get_config(&crystal_key, 0.0);

        // Si pas trouvé en tant que ship, essayer en tant que defense
        if metal == 0.0 && crystal == 0.0 {
            let metal_key = format!("defense_{}_metal", unit_type);
            let crystal_key = format!("defense_{}_crystal", unit_type);
            let metal = self.get_config(&metal_key, 0.0);
            let crystal = self.get_config(&crystal_key, 0.0);
            return (metal, crystal);
        }

        (metal, crystal)
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
