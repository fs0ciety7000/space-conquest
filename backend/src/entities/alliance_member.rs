use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "alliance_member")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    
    /// ID de l'alliance
    pub alliance_id: Uuid,
    
    /// ID de l'utilisateur membre
    pub user_id: Uuid,
    
    /// Rôle dans l'alliance: "leader", "officer", "member"
    /// - leader: tous les droits (1 seul par alliance)
    /// - officer: peut inviter, accepter candidatures, kick membres
    /// - member: membre de base
    #[sea_orm(default_value = "member")]
    pub role: String,
    
    /// Score du membre au moment du calcul (pour classement interne)
    #[sea_orm(default_value = 0)]
    pub score: i64,
    
    /// Date d'entrée dans l'alliance
    pub joined_at: chrono::NaiveDateTime,
    
    /// Dernière activité
    pub last_active: chrono::NaiveDateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::alliance::Entity",
        from = "Column::AllianceId",
        to = "super::alliance::Column::Id"
    )]
    Alliance,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId",
        to = "super::user::Column::Id"
    )]
    User,
}

impl Related<super::alliance::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Alliance.def()
    }
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
