use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct Config {
    pub database_url: String,
    pub backend_port: u16,
    pub frontend_url: String,
    pub jwt_secret: String,
    pub redis_url: Option<String>,
}

impl Config {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();
        
        Config {
            database_url: std::env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            backend_port: std::env::var("BACKEND_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .expect("BACKEND_PORT must be a valid port number"),
            frontend_url: std::env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:3000".to_string()),
            jwt_secret: std::env::var("JWT_SECRET")
                .expect("JWT_SECRET must be set"),
            redis_url: std::env::var("REDIS_URL").ok(),
        }
    }
    
    pub fn bind_address(&self) -> String {
        let port = std::env::var("PORT")
            .unwrap_or_else(|_| self.backend_port.to_string());
        format!("0.0.0.0:{}", port)
    }
}