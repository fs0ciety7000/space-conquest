use sea_orm_migration::prelude::*;

/// BALANCE-1-A — Rebalance Bomber (HIGH-001).
///
/// The Bomber was under-tuned for its role and tech gate:
///   - shield  : 75   → 300   (survivability pass, glass-cannon was non-viable)
///   - hull    : 7500 → 8500  (modest durability bump)
///   - plasma_tech requirement: level 5 → 4  (gates were too steep vs reward)
///
/// The requirement row lives in `ship_requirements` which joins
/// `ship_types(ship_key='bomber')` and `technologies(tech_key='plasma_tech')`.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // 1. Rebalance stats
        db.execute_unprepared(
            "UPDATE ship_types \
             SET shield = 300, hull = 8500 \
             WHERE ship_key = 'bomber'",
        )
        .await?;

        // 2. Lower plasma_tech prerequisite from 5 → 4
        db.execute_unprepared(
            "UPDATE ship_requirements \
             SET required_level = 4 \
             WHERE ship_type_id  = (SELECT id FROM ship_types    WHERE ship_key = 'bomber') \
               AND required_tech_id = (SELECT id FROM technologies WHERE tech_key = 'plasma_tech')",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_unprepared(
            "UPDATE ship_types \
             SET shield = 75, hull = 7500 \
             WHERE ship_key = 'bomber'",
        )
        .await?;

        db.execute_unprepared(
            "UPDATE ship_requirements \
             SET required_level = 5 \
             WHERE ship_type_id  = (SELECT id FROM ship_types    WHERE ship_key = 'bomber') \
               AND required_tech_id = (SELECT id FROM technologies WHERE tech_key = 'plasma_tech')",
        )
        .await?;

        Ok(())
    }
}
