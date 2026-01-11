use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "fleet_mission")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub source_planet_id: Uuid,
    pub target_planet_id: Uuid,
    pub mission_type: String,
    pub arrival_time: DateTime,
    pub metal: f64,
    pub crystal: f64,
    pub deuterium: f64,
    pub ships_count: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}