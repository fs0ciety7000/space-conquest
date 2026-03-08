use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "server_event")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub event_type_id: Uuid,
    pub event_type_key: String,
    pub affected_galaxy: Option<i32>,
    pub affected_system: Option<i32>,
    pub radius: i32,
    /// 'incoming' | 'active' | 'resolved' | 'cancelled'
    pub status: String,
    pub announced_at: DateTimeWithTimeZone,
    pub starts_at: DateTimeWithTimeZone,
    pub ends_at: DateTimeWithTimeZone,
    pub resolved_at: Option<DateTimeWithTimeZone>,
    pub hp_max: i32,
    pub hp_current: i32,
    pub narrative: Option<String>,
    pub triggered_by: Option<Uuid>,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
