use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add build_time_seconds to ship_types table
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("ship_types"))
                    .add_column(
                        ColumnDef::new(Alias::new("build_time_seconds"))
                            .integer()
                            .not_null()
                            .default(300), // 5 minutes default
                    )
                    .to_owned(),
            )
            .await?;

        // Add base_time_seconds to technologies table
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("technologies"))
                    .add_column(
                        ColumnDef::new(Alias::new("base_time_seconds"))
                            .integer()
                            .not_null()
                            .default(600), // 10 minutes default
                    )
                    .to_owned(),
            )
            .await?;

        // Update ship_types with calculated build times based on costs
        manager.exec_stmt(
            Query::update()
                .table(Alias::new("ship_types"))
                .value(
                    Alias::new("build_time_seconds"),
                    Expr::cust("CAST((base_cost_metal + base_cost_crystal) / 2500.0 * 3600.0 AS INTEGER)"),
                )
                .to_owned(),
        ).await?;

        // Update technologies with calculated base times based on costs
        manager.exec_stmt(
            Query::update()
                .table(Alias::new("technologies"))
                .value(
                    Alias::new("base_time_seconds"),
                    Expr::cust("CAST((base_cost_metal + base_cost_crystal) / 2500.0 * 3600.0 AS INTEGER)"),
                )
                .to_owned(),
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove build_time_seconds from ship_types
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("ship_types"))
                    .drop_column(Alias::new("build_time_seconds"))
                    .to_owned(),
            )
            .await?;

        // Remove base_time_seconds from technologies
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("technologies"))
                    .drop_column(Alias::new("base_time_seconds"))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}
