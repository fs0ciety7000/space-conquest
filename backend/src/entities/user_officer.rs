use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "user_officer")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub officer_template_id: Uuid,
    pub level: i32,
    pub experience: i32,
    pub is_active: bool,
    pub recruited_at: DateTime,
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
        belongs_to = "super::officer_template::Entity",
        from = "Column::OfficerTemplateId",
        to = "super::officer_template::Column::Id"
    )]
    OfficerTemplate,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl Related<super::officer_template::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::OfficerTemplate.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
