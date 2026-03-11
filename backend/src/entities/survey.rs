use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "survey")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub created_by: Uuid,
    /// "yes_no" | "multiple_choice" | "rating"
    pub survey_type: String,
    pub options: Json,
    pub starts_at: DateTime,
    pub ends_at: DateTime,
    /// "active" | "closed" | "archived"
    pub status: String,
    pub created_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
