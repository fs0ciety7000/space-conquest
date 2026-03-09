use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Zone Aérienne de Combat (ZAC) — vaisseaux pré-assignés à la défense d'une planète.
/// Si au moins un enregistrement existe pour une planète, seuls ces vaisseaux (+ défenses)
/// participent au combat de défense. Si vide, TOUS les vaisseaux défendent.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "planet_combat_zone")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub planet_id: Uuid,
    pub ship_key: String,
    pub assigned_count: i32,
    pub updated_at: chrono::DateTime<chrono::FixedOffset>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
