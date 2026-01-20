//! `SeaORM` Entity for planet_ships table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "planet_ships")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub planet_id: i32,
    #[sea_orm(primary_key, auto_increment = false)]
    pub ship_type_id: i32,
    pub count: i32,
    pub building_count: Option<i32>,
    pub build_end_time: Option<DateTime>,
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
    #[sea_orm(
        belongs_to = "super::ship_type::Entity",
        from = "Column::ShipTypeId",
        to = "super::ship_type::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    ShipType,
}

impl ActiveModelBehavior for ActiveModel {}
