use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "market_listing")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub seller_planet_id: Uuid,
    pub seller_user_id: Uuid,
    pub resource_type: String,
    pub quantity: f64,
    pub price_per_unit: f64,
    pub target_resource: String,
    pub created_at: DateTime,
    pub expires_at: DateTime,
    pub is_active: bool,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
