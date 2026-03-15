use sea_orm_migration::prelude::*;

/// BALANCE-0-A — Create rapid_fire_defense_rules table for ship-vs-defense rapid fire.
/// Seeds initial rules:
///   - cruiser   → rocket_launcher : RF=10
///   - bomber    → rocket_launcher : RF=20
///   - bomber    → plasma_turret   : RF=10
///
/// Also seeds missing ship-vs-ship rules into the existing rapid_fire_rules table:
///   - destroyer → transporter : RF=5
///   - destroyer → recycler    : RF=3
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ── 1. Create the table ────────────────────────────────────────────────
        manager.create_table(
            Table::create()
                .table(RapidFireDefenseRule::Table)
                .if_not_exists()
                .col(
                    ColumnDef::new(RapidFireDefenseRule::Id)
                        .integer()
                        .not_null()
                        .auto_increment()
                        .primary_key(),
                )
                .col(
                    ColumnDef::new(RapidFireDefenseRule::AttackerShipTypeId)
                        .integer()
                        .not_null(),
                )
                .col(
                    ColumnDef::new(RapidFireDefenseRule::TargetDefenseTypeId)
                        .integer()
                        .not_null(),
                )
                .col(
                    ColumnDef::new(RapidFireDefenseRule::RapidFireValue)
                        .integer()
                        .not_null()
                        .default(0),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(
                            RapidFireDefenseRule::Table,
                            RapidFireDefenseRule::AttackerShipTypeId,
                        )
                        .to(Alias::new("ship_types"), Alias::new("id"))
                        .on_delete(ForeignKeyAction::Cascade),
                )
                .foreign_key(
                    ForeignKey::create()
                        .from(
                            RapidFireDefenseRule::Table,
                            RapidFireDefenseRule::TargetDefenseTypeId,
                        )
                        .to(Alias::new("defense_types"), Alias::new("id"))
                        .on_delete(ForeignKeyAction::Cascade),
                )
                .to_owned(),
        )
        .await?;

        // ── 2. Unique index on (attacker_ship_type_id, target_defense_type_id) ──
        manager
            .create_index(
                Index::create()
                    .table(RapidFireDefenseRule::Table)
                    .col(RapidFireDefenseRule::AttackerShipTypeId)
                    .col(RapidFireDefenseRule::TargetDefenseTypeId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        let db = manager.get_connection();

        // ── 3. Seed ship-vs-defense rules ─────────────────────────────────────
        let defense_rf_rules = vec![
            ("cruiser",  "rocket_launcher", 10),
            ("bomber",   "rocket_launcher", 20),
            ("bomber",   "plasma_turret",   10),
        ];

        for (ship_key, defense_key, rf_value) in defense_rf_rules {
            db.execute_unprepared(&format!(
                "INSERT INTO rapid_fire_defense_rules \
                    (attacker_ship_type_id, target_defense_type_id, rapid_fire_value) \
                 SELECT s.id, d.id, {rf_value} \
                 FROM ship_types s, defense_types d \
                 WHERE s.ship_key = '{ship_key}' AND d.defense_key = '{defense_key}' \
                 ON CONFLICT DO NOTHING"
            ))
            .await?;
        }

        // ── 4. Seed missing ship-vs-ship destroyer rules ───────────────────────
        db.execute_unprepared(
            "INSERT INTO rapid_fire_rules \
                (attacker_ship_type_id, target_ship_type_id, rapid_fire_value) \
             SELECT a.id, t.id, 5 \
             FROM ship_types a, ship_types t \
             WHERE a.ship_key = 'destroyer' AND t.ship_key = 'transporter' \
             ON CONFLICT DO NOTHING",
        )
        .await?;

        db.execute_unprepared(
            "INSERT INTO rapid_fire_rules \
                (attacker_ship_type_id, target_ship_type_id, rapid_fire_value) \
             SELECT a.id, t.id, 3 \
             FROM ship_types a, ship_types t \
             WHERE a.ship_key = 'destroyer' AND t.ship_key = 'recycler' \
             ON CONFLICT DO NOTHING",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove destroyer ship-vs-ship rules (only the ones we added)
        let db = manager.get_connection();
        db.execute_unprepared(
            "DELETE FROM rapid_fire_rules \
             WHERE attacker_ship_type_id = (SELECT id FROM ship_types WHERE ship_key = 'destroyer') \
               AND target_ship_type_id IN ( \
                 SELECT id FROM ship_types WHERE ship_key IN ('transporter', 'recycler') \
               )",
        )
        .await?;

        manager
            .drop_table(
                Table::drop()
                    .table(RapidFireDefenseRule::Table)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum RapidFireDefenseRule {
    Table,
    Id,
    AttackerShipTypeId,
    TargetDefenseTypeId,
    RapidFireValue,
}
