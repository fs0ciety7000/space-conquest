use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ========== ADD RESEARCH TRACKING COLUMNS TO planet_technologies ==========

        // 1. Rename 'level' to 'current_level'
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("planet_technologies"))
                    .rename_column(Alias::new("level"), Alias::new("current_level"))
                    .to_owned(),
            )
            .await?;

        // 2. Add 'researching_to_level' column (nullable)
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("planet_technologies"))
                    .add_column(
                        ColumnDef::new(Alias::new("researching_to_level"))
                            .integer()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        // 3. Add 'research_end_time' column (nullable)
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("planet_technologies"))
                    .add_column(
                        ColumnDef::new(Alias::new("research_end_time"))
                            .timestamp()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove added columns
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("planet_technologies"))
                    .drop_column(Alias::new("research_end_time"))
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("planet_technologies"))
                    .drop_column(Alias::new("researching_to_level"))
                    .to_owned(),
            )
            .await?;

        // Rename back
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("planet_technologies"))
                    .rename_column(Alias::new("current_level"), Alias::new("level"))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}
