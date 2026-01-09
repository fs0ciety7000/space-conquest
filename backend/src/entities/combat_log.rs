use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "combat_log")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub planet_id: Uuid,
    pub target_name: String,
    pub mission_type: String, // "attack", "defense", "expedition"
    pub result: String,       // "victory", "defeat"
    pub loot_metal: f64,
    pub loot_crystal: f64,
    pub ships_lost: i32,
    pub date: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}