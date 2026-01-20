//! `SeaORM` Entity for technology_requirements table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "technology_requirements")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub tech_id: i32,
    #[sea_orm(primary_key, auto_increment = false)]
    pub required_tech_id: i32,
    pub required_level: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::technology::Entity",
        from = "Column::TechId",
        to = "super::technology::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    Technology,
    #[sea_orm(
        belongs_to = "super::technology::Entity",
        from = "Column::RequiredTechId",
        to = "super::technology::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    RequiredTechnology,
}

impl ActiveModelBehavior for ActiveModel {}
