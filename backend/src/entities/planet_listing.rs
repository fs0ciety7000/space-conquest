use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "planet_listings")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub planet_id: Uuid,
    pub seller_id: Uuid,
    pub listing_type: String,
    pub asking_price_metal: i64,
    pub asking_price_crystal: i64,
    pub asking_price_deuterium: i64,
    pub suggested_price_metal: i64,
    pub suggested_price_crystal: i64,
    pub suggested_price_deuterium: i64,
    pub is_active: bool,
    pub listed_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::planet::Entity",
        from = "Column::PlanetId",
        to = "super::planet::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    Planet,
}

impl ActiveModelBehavior for ActiveModel {}
