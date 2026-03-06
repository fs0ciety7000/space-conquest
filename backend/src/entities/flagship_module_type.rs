use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "flagship_module_type")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub module_key: String,
    pub display_name: String,
    pub description: Option<String>,
    pub slot_type: String,
    pub bonus_attack: i32,
    pub bonus_shield: i32,
    pub bonus_hull: i32,
    pub bonus_cargo: i32,
    pub bonus_speed_pct: f64,
    pub cost_metal: f64,
    pub cost_crystal: f64,
    pub cost_deuterium: f64,
    pub required_flagship_level: i32,
    pub created_at: chrono::NaiveDateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
