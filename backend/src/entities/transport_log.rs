use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "transport_log")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub target_planet_id: Uuid,
    pub target_planet_name: String,
    pub source_planet_id: Uuid,
    pub source_planet_name: String,
    #[sea_orm(column_type = "Double")]
    pub metal: f64,
    #[sea_orm(column_type = "Double")]
    pub crystal: f64,
    #[sea_orm(column_type = "Double")]
    pub deuterium: f64,
    pub date: DateTime,

    // --- AJOUTS ---
    pub source_owner_name: Option<String>,
    pub target_owner_name: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}