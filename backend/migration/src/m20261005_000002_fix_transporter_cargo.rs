use sea_orm_migration::prelude::*;

/// BALANCE-0-B — Unify transporter cargo capacity.
/// The DB seed inserted cargo_capacity=5000 but the canonical value decided in
/// BALANCE_PLAN.md is 10000. This migration aligns the DB with the code fallback
/// `cargo_transporter_base = 10000`.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            "UPDATE ship_types SET cargo_capacity = 10000 WHERE ship_key = 'transporter'"
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            "UPDATE ship_types SET cargo_capacity = 5000 WHERE ship_key = 'transporter'"
        ).await?;
        Ok(())
    }
}
