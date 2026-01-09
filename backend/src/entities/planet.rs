use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "planet")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub owner_id: Uuid,
    pub name: String,
    #[serde(skip)] // IMPORTANT : Ne jamais renvoyer le hash du mdp au frontend
    pub password: String,

    // Niveaux Mines
    #[sea_orm(default_value = 1)]
    pub metal_mine_level: i32,
    #[sea_orm(default_value = 1)]
    pub crystal_mine_level: i32,
    #[sea_orm(default_value = 1)]
    pub deuterium_mine_level: i32,

    // Ressources
    #[sea_orm(default_value = 0.0)]
    pub metal_amount: f64,
    #[sea_orm(default_value = 0.0)]
    pub crystal_amount: f64,
    #[sea_orm(default_value = 0.0)]
    pub deuterium_amount: f64,

    // Timers
    pub last_update: DateTime,
    pub construction_end: Option<DateTime>,
    pub construction_type: Option<String>,
    pub shipyard_construction_end: Option<DateTime>,
    pub pending_fleet_type: Option<String>,
    #[sea_orm(default_value = 0)]
    pub pending_fleet_count: i32,
    
    // Flotte
    #[sea_orm(default_value = 0)]
    pub light_hunter_count: i32,
    #[sea_orm(default_value = 0)]
    pub cruiser_count: i32,
    #[sea_orm(default_value = 0)]
    pub recycler_count: i32,

    // AJOUT
    #[sea_orm(default_value = 0)]
    pub spy_probe_count: i32, // <--- ICI

    // Tech
    #[sea_orm(default_value = 0)]
    pub energy_tech_level: i32,
    #[sea_orm(default_value = 0)]
    pub research_lab_level: i32,
    #[sea_orm(default_value = 0)]
    pub laser_battery_level: i32,

    // DÉFENSES (Nouveaux champs)
    #[sea_orm(default_value = 0)]
    pub missile_launcher_count: i32,
    #[sea_orm(default_value = 0)]
    pub plasma_turret_count: i32,

// NOUVEAUX CHAMPS DÉBRIS
    #[sea_orm(column_type = "Double", default_value = 0.0)]
    pub debris_metal: f64,
    #[sea_orm(column_type = "Double", default_value = 0.0)]
    pub debris_crystal: f64,
    
    // COORDONNÉES
    #[sea_orm(default_value = 1)]
    pub galaxy: i32,
    #[sea_orm(default_value = 1)]
    pub system: i32,
    #[sea_orm(default_value = 1)]
    pub position: i32,
    
    // AJOUT
    #[sea_orm(default_value = 0)]
    pub espionage_tech_level: i32, // <--- ICI

    // Expédition
    pub expedition_end: Option<DateTime>,

    // --- NOUVEAU CHAMP ---
    pub unread_report: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}