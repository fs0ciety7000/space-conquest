use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Tracks pirate extortion events triggered by the Orbital Strike Token.
/// status: "incoming" | "resolved_passive" | "resolved_tribute" | "resolved_retaliate"
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "pirate_extortion")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub attacker_id: Uuid,
    pub target_user_id: Uuid,
    pub target_planet_id: Uuid,
    pub arrival_time: DateTime,
    pub status: String,
    pub tribute_amount: Option<f64>,
    pub retaliate_cost: Option<f64>,
    pub resolved_at: Option<DateTime>,
    pub created_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
