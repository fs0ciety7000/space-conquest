//! `SeaORM` Entity for rapid_fire_rules table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "rapid_fire_rules")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub attacker_ship_id: i32,
    #[sea_orm(primary_key, auto_increment = false)]
    pub target_type: String,
    #[sea_orm(primary_key, auto_increment = false)]
    pub target_id: i32,
    pub rapid_fire_value: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::ship_type::Entity",
        from = "Column::AttackerShipId",
        to = "super::ship_type::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    AttackerShip,
}

impl ActiveModelBehavior for ActiveModel {}
