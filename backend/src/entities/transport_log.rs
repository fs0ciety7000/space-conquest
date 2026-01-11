use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "transport_log")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub target_planet_id: Uuid,
    pub target_planet_name: String, // <--- Nouveau
    pub source_planet_id: Uuid,     // <--- Nouveau
    pub source_planet_name: String,
    pub metal: f64,
    pub crystal: f64,
    pub deuterium: f64,
    pub date: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}