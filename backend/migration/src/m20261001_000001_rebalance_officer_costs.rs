use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::{Statement, ConnectionTrait};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Rebalance base recruitment costs for officer_template by rarity.
        // IMPORTANT: only officer_type base costs are updated — user_officer records are untouched.
        let updates: &[(&str, f64, f64, f64)] = &[
            ("common",    500_000.0,   250_000.0,  50_000.0),
            ("uncommon",  2_000_000.0, 1_000_000.0, 250_000.0),
            ("rare",      8_000_000.0, 4_000_000.0, 1_000_000.0),
            ("epic",      30_000_000.0, 15_000_000.0, 5_000_000.0),
            ("legendary", 100_000_000.0, 50_000_000.0, 20_000_000.0),
        ];

        for (rarity, metal, crystal, deuterium) in updates {
            db.execute(Statement::from_sql_and_values(
                manager.get_database_backend(),
                "UPDATE officer_template SET recruitment_cost_metal = $1, recruitment_cost_crystal = $2, recruitment_cost_deuterium = $3 WHERE rarity = $4",
                [(*metal).into(), (*crystal).into(), (*deuterium).into(), (*rarity).into()],
            ))
            .await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Restore original seed costs from m20260119_400001_seed_officers
        let updates: &[(&str, f64, f64, f64)] = &[
            ("common",    1_000.0, 500.0, 100.0),
            ("uncommon",  3_000.0, 1_500.0, 500.0),
            ("rare",      8_000.0, 4_000.0, 1_500.0),
            ("epic",      15_000.0, 8_000.0, 3_000.0),
            ("legendary", 25_000.0, 25_000.0, 15_000.0),
        ];

        for (rarity, metal, crystal, deuterium) in updates {
            db.execute(Statement::from_sql_and_values(
                manager.get_database_backend(),
                "UPDATE officer_template SET recruitment_cost_metal = $1, recruitment_cost_crystal = $2, recruitment_cost_deuterium = $3 WHERE rarity = $4",
                [(*metal).into(), (*crystal).into(), (*deuterium).into(), (*rarity).into()],
            ))
            .await?;
        }

        Ok(())
    }
}
