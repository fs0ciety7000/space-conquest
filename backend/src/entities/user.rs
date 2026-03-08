use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "user")] // <--- ICI : "user" au singulier
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    #[sea_orm(unique)]
    pub username: String,
    pub password: String,
    #[sea_orm(unique)]
    pub email: String,
    pub created_at: chrono::NaiveDateTime,
    #[sea_orm(default_value = "user")]
    pub role: String, // "user" ou "admin"
    pub protection_until: Option<chrono::NaiveDateTime>, // Beginner protection expiry date
    pub total_points: i64, // Total points for attack restrictions
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub last_login: Option<chrono::NaiveDateTime>,
    pub display_name: Option<String>,
    #[sea_orm(column_type = "Double", default_value = 0.0)]
    pub syndicate_credits: f64,
    /// Score total en cache — recalculé toutes les 5 min par le job background
    #[sea_orm(default_value = 0)]
    pub total_score: i32,
    #[sea_orm(default_value = 0)]
    pub economy_score: i32,
    #[sea_orm(default_value = 0)]
    pub military_score: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}