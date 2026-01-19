use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "alliance")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    
    /// Nom unique de l'alliance (3-20 caractères)
    #[sea_orm(unique)]
    pub name: String,
    
    /// Tag court affiché devant le pseudo (2-5 caractères, ex: [TAG])
    #[sea_orm(unique)]
    pub tag: String,
    
    /// Description de l'alliance (max 500 caractères)
    #[sea_orm(column_type = "Text", nullable)]
    pub description: Option<String>,
    
    /// Message interne visible uniquement par les membres
    #[sea_orm(column_type = "Text", nullable)]
    pub internal_message: Option<String>,
    
    /// ID du fondateur (leader actuel)
    pub leader_id: Uuid,
    
    /// Nombre de membres (dénormalisé pour performance)
    #[sea_orm(default_value = 1)]
    pub member_count: i32,
    
    /// Score total de l'alliance (somme des scores des membres)
    #[sea_orm(default_value = 0)]
    pub total_score: i64,
    
    /// Politique de recrutement: "open", "invite_only", "closed"
    #[sea_orm(default_value = "invite_only")]
    pub recruitment_policy: String,
    
    /// Niveau minimum requis pour rejoindre (si open)
    #[sea_orm(default_value = 0)]
    pub min_level_required: i32,
    
    /// Date de création
    pub created_at: chrono::NaiveDateTime,
    
    /// Dernière mise à jour
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::alliance_member::Entity")]
    Members,
    #[sea_orm(has_many = "super::alliance_invitation::Entity")]
    Invitations,
}

impl Related<super::alliance_member::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Members.def()
    }
}

impl Related<super::alliance_invitation::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Invitations.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
