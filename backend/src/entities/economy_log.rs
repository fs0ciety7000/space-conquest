use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "economy_log")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    /// 'construction' | 'market' | 'black_market'
    pub category: String,
    /// 'build' | 'cancel' | 'sc_purchase' | 'sc_activate'
    pub action: String,
    pub description: String,
    #[sea_orm(column_type = "Double", default_value = 0.0)]
    pub metal: f64,
    #[sea_orm(column_type = "Double", default_value = 0.0)]
    pub crystal: f64,
    #[sea_orm(column_type = "Double", default_value = 0.0)]
    pub deuterium: f64,
    #[sea_orm(column_type = "Double", default_value = 0.0)]
    pub syndicate_credits: f64,
    pub planet_name: Option<String>,
    pub counterparty_username: Option<String>,
    pub item_key: Option<String>,
    pub created_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
