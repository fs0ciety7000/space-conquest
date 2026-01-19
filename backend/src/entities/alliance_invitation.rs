use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "alliance_invitation")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    
    /// ID de l'alliance
    pub alliance_id: Uuid,
    
    /// ID de l'utilisateur invité/candidat
    pub user_id: Uuid,
    
    /// Type: "invitation" (de l'alliance vers le joueur) ou "application" (candidature du joueur)
    pub invitation_type: String,
    
    /// Statut: "pending", "accepted", "rejected", "cancelled"
    #[sea_orm(default_value = "pending")]
    pub status: String,
    
    /// Message optionnel (motivation pour candidature ou message d'invitation)
    #[sea_orm(column_type = "Text", nullable)]
    pub message: Option<String>,
    
    /// ID de l'utilisateur qui a créé l'invitation (officier/leader)
    pub invited_by: Option<Uuid>,
    
    /// Date de création
    pub created_at: chrono::NaiveDateTime,
    
    /// Date d'expiration (optionnelle)
    pub expires_at: Option<chrono::NaiveDateTime>,
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
