//! `SeaORM` Entity for ship_types table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "ship_types")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub ship_key: String,
    pub display_name: String,
    pub description: Option<String>,
    pub cost_metal: i32,
    pub cost_crystal: i32,
    pub cost_deuterium: i32,
    pub build_time_seconds: i32,
    pub attack: i32,
    pub shield: i32,
    pub hull: i32,
    pub cargo_capacity: i32,
    pub base_speed: i32,
    pub fuel_consumption: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
