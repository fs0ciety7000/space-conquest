use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Achievements débloqués par les utilisateurs
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "user_achievement")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    
    /// ID de l'utilisateur
    pub user_id: Uuid,
    
    /// ID de l'achievement
    pub achievement_id: Uuid,
    
    /// Progression actuelle (pour achievements progressifs)
    #[sea_orm(default_value = 0)]
    pub current_progress: i32,
    
    /// Débloqué ou non
    #[sea_orm(default_value = false)]
    pub unlocked: bool,
    
    /// Date de déblocage
    pub unlocked_at: Option<chrono::NaiveDateTime>,
    
    /// Affiché sur le profil
    #[sea_orm(default_value = false)]
    pub displayed: bool,
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
        belongs_to = "super::achievement::Entity",
        from = "Column::AchievementId",
        to = "super::achievement::Column::Id"
    )]
    Achievement,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl Related<super::achievement::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Achievement.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
