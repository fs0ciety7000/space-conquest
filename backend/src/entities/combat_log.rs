use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "combat_log")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub planet_id: Uuid,
    pub target_name: String,
    pub opponent_username: Option<String>,
    pub mission_type: String,
    pub result: String,
    #[sea_orm(column_type = "Double")]
    pub loot_metal: f64,
    #[sea_orm(column_type = "Double")]
    pub loot_crystal: f64,
    pub ships_lost: i32,
    pub date: DateTime,
    #[sea_orm(column_type = "Json", nullable)]
    pub detailed_report: Option<serde_json::Value>,
    /// Rapport de combat détaillé structuré (Expansion 5.0 — DetailedCombatReport sérialisé)
    /// Remplace/complète detailed_report avec des données round-by-round
    #[sea_orm(column_type = "Json", nullable)]
    pub details: Option<serde_json::Value>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::planet::Entity",
        from = "Column::PlanetId",
        to = "super::planet::Column::Id",
        on_update = "NoAction",
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