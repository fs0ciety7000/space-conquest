use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add building_count and build_end_time columns to planet_ships table
        // These columns track in-progress ship construction

        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("planet_ships"))
                    .add_column(
                        ColumnDef::new(Alias::new("building_count"))
                            .integer()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("planet_ships"))
                    .add_column(
                        ColumnDef::new("build_end_time")
                            .timestamp()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Also need to add updated_at column if it doesn't exist
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("planet_ships"))
                    .add_column_if_not_exists(
                        ColumnDef::new("updated_at")
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove building_count and build_end_time columns
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("planet_ships"))
                    .drop_column(Alias::new("build_end_time"))
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("planet_ships"))
                    .drop_column(Alias::new("building_count"))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}
