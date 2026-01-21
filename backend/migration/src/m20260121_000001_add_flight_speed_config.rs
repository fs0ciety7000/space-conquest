use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add flight_speed_multiplier to server_config
        let insert = Query::insert()
            .into_table(Alias::new("server_config"))
            .columns([Alias::new("key"), Alias::new("value")])
            .values_panic([
                "flight_speed_multiplier".into(),
                5.0.into(), // Default: 5x speed (same as original speed_factor effect)
            ])
            .to_owned();

        manager.exec_stmt(insert).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove flight_speed_multiplier from server_config
        let delete = Query::delete()
            .from_table(Alias::new("server_config"))
            .and_where(Expr::col(Alias::new("key")).eq("flight_speed_multiplier"))
            .to_owned();

        manager.exec_stmt(delete).await?;

        Ok(())
    }
}
