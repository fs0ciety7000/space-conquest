use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            "UPDATE server_config SET config_value = '0.35' WHERE config_key = 'expedition_syndicate_credit_chance'"
        ).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            "UPDATE server_config SET config_value = '0.10' WHERE config_key = 'expedition_syndicate_credit_chance'"
        ).await?;
        Ok(())
    }
}
