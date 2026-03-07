use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add display_name column to user table
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("user"))
                    .add_column(
                        ColumnDef::new(Alias::new("display_name"))
                            .string()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Add cargo tech bonus config key
        let insert = Query::insert()
            .into_table(Alias::new("server_config"))
            .columns([Alias::new("config_key"), Alias::new("config_value")])
            .values_panic(["cargo_transporter_bonus_per_computer_tech".into(), "0.1".into()])
            .to_owned();
        manager.exec_stmt(insert).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("user"))
                    .drop_column(Alias::new("display_name"))
                    .to_owned(),
            )
            .await
    }
}
