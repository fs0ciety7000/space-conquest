// Imports pour les structures partagées
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait, Condition};
use chrono::Utc;
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
pub mod governance;

#[cfg(test)]
mod balance_tests;

// Structures partagées - doivent être définies APRÈS entities mais AVANT admin
use entities::{prelude::{ServerConfig, LawEffect}, law_effect};

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

        // ── Apply active law effects on top of base config ───────────────────
        // Active = expires_at IS NULL (permanent) or expires_at > NOW()
        let now_naive = Utc::now().naive_utc();
        if let Ok(active_effects) = LawEffect::find()
            .filter(
                Condition::any()
                    .add(law_effect::Column::ExpiresAt.is_null())
                    .add(law_effect::Column::ExpiresAt.gt(now_naive)),
            )
            .all(db)
            .await
        {
            // Hardcoded defaults for known config keys (mirrors ServerConfigCache::default)
            let known_defaults: std::collections::HashMap<&str, f64> = [
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

            for effect in active_effects {
                let base = cache.configs.get(&effect.config_key).copied()
                    .or_else(|| known_defaults.get(effect.config_key.as_str()).copied())
                    .unwrap_or(effect.base_value);

                let new_val = match effect.operation.as_str() {
                    "multiply" => base * effect.delta,
                    "add"      => base + effect.delta,
                    "set"      => effect.delta,
                    _          => base,
                };

                cache.configs.insert(effect.config_key.clone(), new_val);

                // Also propagate to named fields for immediate effect
                match effect.config_key.as_str() {
                    "production_speed_multiplier"   => cache.production_speed = new_val,
                    "building_speed_multiplier"     => cache.building_speed = new_val,
                    "research_speed_multiplier"     => cache.research_speed = new_val,
                    "ship_build_speed_multiplier"   => cache.ship_build_speed = new_val,
                    "construction_speed_multiplier" => cache.construction_speed = new_val,
                    "mining_speed_multiplier"       => cache.mining_speed = new_val,
                    _ => {}
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
    /// Rate limiter pour les constructions (vaisseaux, défenses, recherches) : 10 requêtes / 10s par IP.
    pub rate_limit_build: Arc<rate_limit::RateLimiter>,
    /// Data-driven building costs loaded from `building_types` table at startup.
    /// Replaces the hardcoded match in game_logic::get_upgrade_cost.
    pub building_cost_cache: Arc<game_logic::BuildingCostCache>,
    /// Rapid-fire rules loaded from `rapid_fire_rule` table at startup.
    /// Single source of truth so spy reports and combat use identical RF values.
    pub rapid_fire_cache: Arc<combat::RapidFireCache>,
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
