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
    #[sea_orm(column_name = "name")]
    pub display_name: String,
    pub category: String,
    #[sea_orm(column_name = "base_cost_metal")]
    pub cost_metal: i32,
    #[sea_orm(column_name = "base_cost_crystal")]
    pub cost_crystal: i32,
    #[sea_orm(column_name = "base_cost_deuterium")]
    pub cost_deuterium: i32,
    pub build_time_seconds: i32,
    pub attack: i32,
    pub shield: i32,
    pub hull: i32,
    pub cargo_capacity: i32,
    #[sea_orm(column_name = "speed")]
    pub base_speed: i32,
    pub fuel_consumption: i32,
    pub shipyard_required: i32,
    pub description: Option<String>,
    pub created_at: Option<DateTime>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
