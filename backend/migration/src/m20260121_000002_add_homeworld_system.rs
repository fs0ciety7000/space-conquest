use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add is_homeworld column to planet table
        manager
            .alter_table(
                Table::alter()
                    .table(Planet::Table)
                    .add_column(
                        ColumnDef::new(Planet::IsHomeworld)
                            .boolean()
                            .not_null()
                            .default(false)
                    )
                    .to_owned(),
            )
            .await?;

        // Mark the oldest planet for each user as homeworld
        // This SQL query finds the first planet created by each user and marks it as homeworld
        let db = manager.get_connection();
        db.execute_unprepared(
            r#"
            UPDATE planet p1
            SET is_homeworld = true
            WHERE id IN (
                SELECT id FROM (
                    SELECT id, owner_id,
                           ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at ASC) as rn
                    FROM planet
                ) as ranked
                WHERE rn = 1
            )
            "#
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Planet::Table)
                    .drop_column(Planet::IsHomeworld)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum Planet {
    Table,
    IsHomeworld,
}
