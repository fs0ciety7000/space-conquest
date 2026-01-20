//! `SeaORM` Entity for rapid_fire_rules table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "rapid_fire_rules")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub attacker_ship_type_id: i32,
    pub target_ship_type_id: i32,
    pub rapid_fire_value: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::ship_type::Entity",
        from = "Column::AttackerShipTypeId",
        to = "super::ship_type::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    AttackerShip,
    #[sea_orm(
        belongs_to = "super::ship_type::Entity",
        from = "Column::TargetShipTypeId",
        to = "super::ship_type::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    TargetShip,
}

impl ActiveModelBehavior for ActiveModel {}
