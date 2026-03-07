use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "black_market_item")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub image_key: String,
    /// Effect type key: "orbital_strike", "resource_boost", "stealth", "coordinate_jam", "eco_virus"
    pub effect_type: String,
    /// Flexible parameters (JSONB in DB), serialized as serde_json::Value
    pub effect_params: Json,
    pub base_price: f64,
    pub current_price: f64,
    pub price_last_updated: DateTime,
    pub is_active: bool,
    pub created_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
