//! `SeaORM` Entity for planet_buildings table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "planet_buildings")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub planet_id: Uuid,
    pub building_type_id: i32,
    pub current_level: i32,
    pub upgrading_to_level: Option<i32>,
    pub upgrade_end_time: Option<DateTime>,
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
        belongs_to = "super::building_type::Entity",
        from = "Column::BuildingTypeId",
        to = "super::building_type::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    BuildingType,
}

impl ActiveModelBehavior for ActiveModel {}
