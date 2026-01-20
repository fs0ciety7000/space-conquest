//! `SeaORM` Entity for planet_technologies table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "planet_technologies")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub planet_id: Uuid,
    #[sea_orm(primary_key, auto_increment = false)]
    pub tech_id: i32,
    pub current_level: i32,
    pub researching_to_level: Option<i32>,
    pub research_end_time: Option<DateTime>,
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
        belongs_to = "super::technology::Entity",
        from = "Column::TechId",
        to = "super::technology::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    Technology,
}

impl ActiveModelBehavior for ActiveModel {}
