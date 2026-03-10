use sea_orm_migration::prelude::*;

/// Backfill resource_slots rows 5-8 for planets that were created
/// before slot initialization was added (or via colonization paths that missed it).

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // For each planet, insert slots 5-8 if they don't already exist.
        // Slots 5-8 are bonus production slots: inactive by default, resource_type=metal.
        db.execute_unprepared(
            "INSERT INTO resource_slots (planet_id, slot_number, resource_type, level, is_locked, is_active)
             SELECT p.id, s.slot_number, 'metal', 0, false, false
             FROM planet p
             CROSS JOIN (VALUES (5), (6), (7), (8)) AS s(slot_number)
             WHERE NOT EXISTS (
                 SELECT 1 FROM resource_slots rs
                 WHERE rs.planet_id = p.id AND rs.slot_number = s.slot_number
             );"
        ).await?;

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // Cannot safely reverse a backfill; leave as-is on rollback
        Ok(())
    }
}
