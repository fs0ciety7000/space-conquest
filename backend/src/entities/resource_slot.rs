use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "resource_slots")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub planet_id: Uuid,
    pub slot_number: i32,
    pub resource_type: String, // "metal", "crystal", "deuterium", "energy"
    pub level: i32,
    pub is_locked: bool,
    pub is_active: bool,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::planet::Entity",
        from = "Column::PlanetId",
        to = "super::planet::Column::Id",
        on_delete = "Cascade"
    )]
    Planet,
}

impl Related<super::planet::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Planet.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
