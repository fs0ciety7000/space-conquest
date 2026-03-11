use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "casus_belli")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub victim_user_id: Uuid,
    pub aggressor_user_id: Uuid,
    pub reason: String,
    pub created_at: DateTime,
    pub expires_at: DateTime,
    pub was_used: bool,
    // Sprint 2 — escalade tension
    pub tension_level: i32,
    pub cb_type: String,
    pub is_multi_use: bool,
    pub uses_remaining: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
