use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Suivi des streaks de connexion des utilisateurs
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "login_streak")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    
    /// ID de l'utilisateur (unique)
    #[sea_orm(unique)]
    pub user_id: Uuid,
    
    /// Streak actuel (jours consécutifs)
    #[sea_orm(default_value = 0)]
    pub current_streak: i32,
    
    /// Meilleur streak jamais atteint
    #[sea_orm(default_value = 0)]
    pub best_streak: i32,
    
    /// Total de jours de connexion
    #[sea_orm(default_value = 0)]
    pub total_login_days: i32,
    
    /// Dernière date de connexion comptabilisée
    pub last_login_date: chrono::NaiveDate,
    
    /// Récompense du jour réclamée
    #[sea_orm(default_value = false)]
    pub daily_reward_claimed: bool,
    
    /// Date de la dernière récompense réclamée
    pub last_reward_date: Option<chrono::NaiveDate>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId",
        to = "super::user::Column::Id"
    )]
    User,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
