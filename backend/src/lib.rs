pub mod auth;
pub mod game_logic;
pub mod combat;
pub mod entities;
pub mod config;
pub mod admin;

// Export AppState pour utilisation dans les modules
use sea_orm::DatabaseConnection;

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
}
