use sea_orm::entity::prelude::*;
use serde::Serialize;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize)]
#[sea_orm(table_name = "planet")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub owner_id: Option<Uuid>,
    #[sea_orm(column_type = "Double")]
    pub metal_amount: f64,
    pub metal_mine_level: i32,
    #[sea_orm(column_type = "Double")]
    pub crystal_amount: f64,
    pub crystal_mine_level: i32,
    #[sea_orm(column_type = "Double")]
    pub deuterium_amount: f64,
    pub deuterium_mine_level: i32,
    pub last_update: DateTime,
    pub construction_end: Option<DateTime>,
    pub construction_type: Option<String>,
    pub shipyard_level: i32,
    pub light_hunter_count: i32,
    
    // CHAMPS AJOUTÉS MANUELLEMENT (Correction des erreurs E0609)
    pub cruiser_count: i32,
    pub recycler_count: i32,
    pub pending_fleet_count: i32,
    pub pending_fleet_type: Option<String>,

    pub shipyard_construction_end: Option<DateTime>,
    pub research_lab_level: i32,
    pub laser_battery_level: i32,
    pub energy_tech_level: i32,
    pub expedition_end: Option<DateTime>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}