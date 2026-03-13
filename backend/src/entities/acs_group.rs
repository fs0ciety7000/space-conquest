use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// ACS (Allied Combat System) coordination group.
///
/// Lifecycle: forming -> in_flight -> holding -> resolved | expired
///
/// - `forming`   : group created, awaiting fleet dispatches from members
/// - `in_flight` : at least the leader's fleet is en route
/// - `holding`   : leader's fleet has arrived; waiting 30 min for other fleets
/// - `resolved`  : combined combat executed
/// - `expired`   : group was never launched before expires_at
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "acs_group")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub leader_user_id: Uuid,
    pub target_planet_id: Uuid,
    /// Status: forming | in_flight | holding | resolved | expired
    pub status: String,
    /// When the holding window ends (set when leader's fleet arrives).
    pub holding_until: Option<DateTime>,
    /// Minutes after creation during which members can join.
    pub max_join_minutes: i32,
    /// Group auto-expires if no fleet is dispatched before this time.
    pub expires_at: DateTime,
    pub created_at: DateTime,
    pub resolved_at: Option<DateTime>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
