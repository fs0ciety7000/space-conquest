use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "planet")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub owner_id: Uuid,
    pub name: String,
    #[serde(skip)]
    pub password: String,

    // Coordonnées
    #[sea_orm(default_value = 1)]
    pub galaxy: i32,
    #[sea_orm(default_value = 1)]
    pub system: i32,
    #[sea_orm(default_value = 1)]
    pub position: i32,

    // Ressources
    #[sea_orm(column_type = "Double", default_value = 0.0)]
    pub metal_amount: f64,
    #[sea_orm(column_type = "Double", default_value = 0.0)]
    pub crystal_amount: f64,
    #[sea_orm(column_type = "Double", default_value = 0.0)]
    pub deuterium_amount: f64,

    pub last_update: DateTime,

    // Débris
    #[sea_orm(column_type = "Double", default_value = 0.0)]
    pub debris_metal: f64,
    #[sea_orm(column_type = "Double", default_value = 0.0)]
    pub debris_crystal: f64,

    // Expédition
    pub expedition_end: Option<DateTime>,

    pub unread_report: Option<String>,

    pub created_at: DateTime,

    #[sea_orm(default_value = false)]
    pub is_homeworld: bool,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
