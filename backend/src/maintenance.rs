use serde::{Deserialize, Serialize};

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
