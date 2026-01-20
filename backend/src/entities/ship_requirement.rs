//! `SeaORM` Entity for ship_requirements table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "ship_requirements")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub ship_type_id: i32,
    pub required_tech_id: i32,
    pub required_level: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::ship_type::Entity",
        from = "Column::ShipTypeId",
        to = "super::ship_type::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    ShipType,
    #[sea_orm(
        belongs_to = "super::technology::Entity",
        from = "Column::RequiredTechId",
        to = "super::technology::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    Technology,
}

impl ActiveModelBehavior for ActiveModel {}
