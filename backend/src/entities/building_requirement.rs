//! `SeaORM` Entity for building_requirements table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "building_requirements")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub building_type_id: i32,
    pub required_tech_id: Option<i32>,
    pub required_building_id: Option<i32>,
    pub required_level: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::building_type::Entity",
        from = "Column::BuildingTypeId",
        to = "super::building_type::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    BuildingType,
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
