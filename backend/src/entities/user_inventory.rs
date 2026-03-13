use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "user_inventory")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub item_id: Uuid,
    pub quantity: i32,
    pub acquired_at: DateTime,
    /// Set when the player activates a timed effect item.
    pub activated_at: Option<DateTime>,
    /// The UTC timestamp at which a timed effect expires (NULL = not activated).
    pub expires_at: Option<DateTime>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
