use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "market_transaction")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub seller_planet_id: Uuid,
    pub seller_user_id: Uuid,
    pub buyer_planet_id: Uuid,
    pub buyer_user_id: Uuid,
    pub resource_sold: String,
    pub resource_paid: String,
    pub quantity_sold: f64,
    pub quantity_paid: f64,
    pub price_per_unit: f64,
    pub tax_amount: f64,
    pub transaction_type: String,
    pub created_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
