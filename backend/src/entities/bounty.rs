use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "bounty")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub poster_id: Uuid,
    pub target_id: Uuid,
    pub mercenary_id: Option<Uuid>,
    pub reward_metal: f64,
    pub reward_crystal: f64,
    pub reward_deuterium: f64,
    pub reason: Option<String>,
    pub status: String, // 'open' | 'accepted' | 'completed' | 'cancelled' | 'expired'
    pub expires_at: chrono::NaiveDateTime,
    pub created_at: chrono::NaiveDateTime,
    pub completed_at: Option<chrono::NaiveDateTime>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
