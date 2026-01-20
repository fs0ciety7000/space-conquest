//! `SeaORM` Entity for technologies table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "technologies")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub tech_key: String,
    pub display_name: String,
    pub description: Option<String>,
    pub base_cost_metal: i32,
    pub base_cost_crystal: i32,
    pub base_cost_deuterium: i32,
    pub base_time_seconds: i32,
    pub cost_multiplier: f64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
