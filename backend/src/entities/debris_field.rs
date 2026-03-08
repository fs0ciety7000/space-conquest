use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Champ de débris créé après un combat PvP.
/// 30% métal + 30% cristal des vaisseaux détruits (les deux camps).
/// Les défenses détruites NE génèrent PAS de débris.
///
/// Les recycleurs collectent ces débris via POST /fleet/recycle.
/// TODO (antigravity): endpoint GET /galaxy/:g/system/:s/debris à créer dans handlers/galaxy.rs
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "debris_field")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub galaxy: i32,
    pub system: i32,
    pub position: i32,
    #[sea_orm(column_type = "Double", default_value = 0.0)]
    pub metal: f64,
    #[sea_orm(column_type = "Double", default_value = 0.0)]
    pub crystal: f64,
    pub updated_at: chrono::DateTime<chrono::FixedOffset>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
