use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub redis_url: String,
    pub backend_port: u16,
    pub backend_host: String,
    pub frontend_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        // Charge .env en développement seulement
        #[cfg(debug_assertions)]
        {
            dotenvy::dotenv().ok();
        }

        Self {
            database_url: env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            redis_url: env::var("REDIS_URL")
                .expect("REDIS_URL must be set"),
            backend_port: env::var("BACKEND_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .expect("BACKEND_PORT must be a valid port number"),
            backend_host: env::var("BACKEND_HOST")
                .unwrap_or_else(|_| "0.0.0.0".to_string()),
            frontend_url: env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:5173".to_string()),
        }
    }

    pub fn bind_address(&self) -> String {
        format!("{}:{}", self.backend_host, self.backend_port)
    }
}
