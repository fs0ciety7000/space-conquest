use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "message")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub conversation_id: Option<Uuid>,
    /// NULL pour les messages système (is_system = true)
    pub sender_id: Option<Uuid>,
    pub receiver_id: Uuid,
    pub subject: String,
    pub content: String,
    pub is_read: bool,
    /// true = message généré automatiquement par le serveur
    pub is_system: bool,
    /// "Système" ou nom d'un joueur pour les messages non-conversationnels
    pub sender_display_name: Option<String>,
    /// "player" | "market" | "planet" | "black_market" | "pve" | "system"
    pub message_category: String,
    pub created_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
