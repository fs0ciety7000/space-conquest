use sea_orm::entity::prelude::*;

/// Ship-vs-defense rapid fire rules.
/// Keyed by (attacker_ship_type_id, target_defense_type_id).
/// BALANCE-0-A: New table to support Croiseur/Bombardier rapid fire vs planetary defenses.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "rapid_fire_defense_rules")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub attacker_ship_type_id: i32,
    pub target_defense_type_id: i32,
    pub rapid_fire_value: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
