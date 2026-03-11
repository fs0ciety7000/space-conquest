//! `SeaORM` Entity for defense_types table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "defense_types")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub defense_key: String,
    pub name: String,
    pub category: String,
    pub base_cost_metal: i32,
    pub base_cost_crystal: i32,
    pub base_cost_deuterium: i32,
    pub build_time_seconds: i32,
    pub attack: i32,
    pub shield: i32,
    pub hull: i32,
    pub description: Option<String>,
    pub created_at: Option<DateTime>,
    pub icon_name: String,
    pub sort_order: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
