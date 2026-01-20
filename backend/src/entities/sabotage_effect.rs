use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "sabotage_effect")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub target_planet_id: Uuid,
    pub attacker_user_id: Option<Uuid>, // Null si non détecté
    pub effect_type: String, // "disable_mine" ou "steal_tech"
    pub created_at: DateTime,
    pub expires_at: DateTime,
    pub was_detected: bool,
    #[sea_orm(column_type = "Json", nullable)]
    pub metadata: Option<serde_json::Value>, // Pour stocker des infos supplémentaires
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::planet::Entity",
        from = "Column::TargetPlanetId",
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
