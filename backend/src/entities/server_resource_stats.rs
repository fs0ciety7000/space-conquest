use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use chrono::NaiveDateTime;
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "server_resource_stats")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub metal_total: f64,
    pub crystal_total: f64,
    pub deuterium_total: f64,
    #[sea_orm(column_name = "metal_traded24h")]    // ← Correction ici
    pub metal_traded_24h: f64,
    #[sea_orm(column_name = "crystal_traded24h")]  // ← Correction ici
    pub crystal_traded_24h: f64,
    #[sea_orm(column_name = "deuterium_traded24h")] // ← Correction ici
    pub deuterium_traded_24h: f64,
    pub calculated_at: NaiveDateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
