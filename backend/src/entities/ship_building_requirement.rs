use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "ship_building_requirements")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub ship_type_id: i32,
    pub required_building_type_id: i32,
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
        belongs_to = "super::building_type::Entity",
        from = "Column::RequiredBuildingTypeId",
        to = "super::building_type::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    BuildingType,
}

impl ActiveModelBehavior for ActiveModel {}
