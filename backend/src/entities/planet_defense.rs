//! `SeaORM` Entity for planet_defenses table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "planet_defenses")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub planet_id: Uuid,
    #[sea_orm(primary_key, auto_increment = false)]
    pub defense_type_id: i32,
    pub count: i32,
    pub building_count: Option<i32>,
    pub build_end_time: Option<DateTime>,
    pub updated_at: Option<DateTime>,
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
        belongs_to = "super::defense_type::Entity",
        from = "Column::DefenseTypeId",
        to = "super::defense_type::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    DefenseType,
}

impl ActiveModelBehavior for ActiveModel {}
