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
    #[sea_orm(column_name = "name")]
    pub display_name: String,
    pub category: String,
    pub base_cost_metal: i32,
    pub base_cost_crystal: i32,
    pub base_cost_deuterium: i32,
    pub base_time_seconds: i32,
    pub cost_multiplier: f64,
    pub research_lab_required: i32,
    pub description: Option<String>,
    pub created_at: Option<DateTime>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
