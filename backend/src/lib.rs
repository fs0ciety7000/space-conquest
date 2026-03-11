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
pub mod maintenance;
pub mod protection;
pub mod trade_routes;
pub mod build_queue;
pub mod planet_market;
pub mod black_market;
pub mod economy_log;
pub mod notifications;
pub mod analytics;
pub mod server_events;
pub mod rate_limit;

// Structures partagées - doivent être définies APRÈS entities mais AVANT admin
use entities::{prelude::ServerConfig, server_config};

#[derive(Clone)]
pub struct ServerConfigCache {
    // ── Vitesses granulaires (remplacent speed_factor/100 × xxx_speed) ──────
    /// Multiplicateur de production minière (métal, cristal, deutérium).
    /// Ex: 250.0 = 250× la production de base.
    pub production_speed: f64,
    /// Diviseur du temps de construction des bâtiments.
    pub building_speed: f64,
    /// Diviseur du temps de recherche technologique.
    pub research_speed: f64,
    /// Diviseur du temps de production des vaisseaux/défenses (formule coût-dépendante).
    pub ship_build_speed: f64,
    // ── Multiplicateurs additionnels (événements admin, stacking) ────────────
    /// Bonus additionnel sur la production (stacking avec production_speed).
    pub mining_speed: f64,
    /// Bonus additionnel sur la construction (stacking avec building_speed).
    pub construction_speed: f64,
    // ── HashMap complet pour les clés dynamiques ─────────────────────────────
    pub configs: HashMap<String, f64>,
}

impl Default for ServerConfigCache {
    fn default() -> Self {
        Self {
            // Valeurs = équivalent exact de l'ancienne config DB
            // (speed_factor=500 → /100=5, mining_speed=50 → 5×50=250)
            production_speed: 250.0,
            building_speed: 50.0,
            research_speed: 25.0,
            ship_build_speed: 100.0,
            mining_speed: 1.0,
            construction_speed: 1.0,
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
                        // ── Nouvelles clés granulaires (v9.1) ────────────────
                        "production_speed_multiplier"  => cache.production_speed = val,
                        "building_speed_multiplier"    => cache.building_speed = val,
                        "research_speed_multiplier"    => cache.research_speed = val,
                        "ship_build_speed_multiplier"  => cache.ship_build_speed = val,
                        // ── Clés legacy conservées pour stacking / admin UI ──
                        "construction_speed_multiplier" => cache.construction_speed = val,
                        "mining_speed_multiplier"       => cache.mining_speed = val,
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
    /// Per-planet mutex to serialize concurrent build slot checks + inserts,
    /// preventing race conditions where multiple upgrades bypass the 1-slot limit.
    pub build_locks: Arc<dashmap::DashMap<uuid::Uuid, Arc<tokio::sync::Mutex<()>>>>,
    /// Rate limiter pour login/register : 5 tentatives / 60s par IP.
    pub rate_limit_auth: Arc<rate_limit::RateLimiter>,
    /// Rate limiter pour les attaques : 10 requêtes / 60s par IP.
    pub rate_limit_attack: Arc<rate_limit::RateLimiter>,
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
pub mod admin_content;
