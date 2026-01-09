use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "planet")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub owner_id: Uuid, // Ici : Pas de Option<>, c'est obligatoire !
    pub name: String,
    
    #[sea_orm(default_value = 1)]
    pub metal_mine_level: i32,
    #[sea_orm(default_value = 1)]
    pub crystal_mine_level: i32,
    #[sea_orm(default_value = 1)]
    pub deuterium_mine_level: i32,

    #[sea_orm(default_value = 0.0)]
    pub metal_amount: f64,
    #[sea_orm(default_value = 0.0)]
    pub crystal_amount: f64,
    #[sea_orm(default_value = 0.0)]
    pub deuterium_amount: f64,

    pub last_update: DateTime,
    pub construction_end: Option<DateTime>,
    pub construction_type: Option<String>,

    pub shipyard_construction_end: Option<DateTime>,
    pub pending_fleet_type: Option<String>,
    #[sea_orm(default_value = 0)]
    pub pending_fleet_count: i32,
    
    #[sea_orm(default_value = 0)]
    pub light_hunter_count: i32,
    #[sea_orm(default_value = 0)]
    pub cruiser_count: i32,
    #[sea_orm(default_value = 0)]
    pub recycler_count: i32,

    #[sea_orm(default_value = 0)]
    pub energy_tech_level: i32,
    #[sea_orm(default_value = 0)]
    pub research_lab_level: i32,
    #[sea_orm(default_value = 0)]
    pub laser_battery_level: i32,

    pub expedition_end: Option<DateTime>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}