use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Progression des missions quotidiennes par utilisateur
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "user_daily_mission")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    
    /// ID de l'utilisateur
    pub user_id: Uuid,
    
    /// ID de la mission (template)
    pub mission_id: Uuid,
    
    /// Date d'attribution (pour savoir si c'est la mission du jour)
    pub assigned_date: chrono::NaiveDate,
    
    /// Progression actuelle
    #[sea_orm(default_value = 0)]
    pub current_progress: i32,
    
    /// Statut: "active", "completed", "claimed"
    #[sea_orm(default_value = "active")]
    pub status: String,
    
    /// Date de complétion
    pub completed_at: Option<chrono::NaiveDateTime>,
    
    /// Date de réclamation de la récompense
    pub claimed_at: Option<chrono::NaiveDateTime>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId",
        to = "super::user::Column::Id"
    )]
    User,
    #[sea_orm(
        belongs_to = "super::daily_mission::Entity",
        from = "Column::MissionId",
        to = "super::daily_mission::Column::Id"
    )]
    Mission,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl Related<super::daily_mission::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Mission.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
