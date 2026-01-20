//! `SeaORM` Entity for defense_requirements table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "defense_requirements")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub defense_type_id: i32,
    pub required_tech_id: Option<i32>,
    pub required_building_id: Option<i32>,
    pub required_level: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::defense_type::Entity",
        from = "Column::DefenseTypeId",
        to = "super::defense_type::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    DefenseType,
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
