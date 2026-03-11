use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "law_proposal")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub created_by: Uuid,
    pub vote_start: DateTime,
    pub vote_end: DateTime,
    /// "voting" | "passed" | "failed" | "expired" | "cancelled"
    pub status: String,
    pub effects: Json,
    pub yes_count: i32,
    pub no_count: i32,
    pub created_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
