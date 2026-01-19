use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "officer_template")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub specialization: String, // 'economy', 'military', 'research'
    pub rarity: String,          // 'common', 'uncommon', 'rare', 'epic', 'legendary'
    pub bonus_type: String,
    pub base_bonus_value: f64,
    pub bonus_per_level: f64,
    pub max_level: i32,
    pub image_type: String,
    pub recruitment_cost_metal: f64,
    pub recruitment_cost_crystal: f64,
    pub recruitment_cost_deuterium: f64,
    pub is_available: bool,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::user_officer::Entity")]
    UserOfficer,
}

impl Related<super::user_officer::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::UserOfficer.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
