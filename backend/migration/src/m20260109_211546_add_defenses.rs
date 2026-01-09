use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Alias::new("planet"))
                .add_column(ColumnDef::new(Alias::new("missile_launcher_count")).integer().not_null().default(0))
                .add_column(ColumnDef::new(Alias::new("plasma_turret_count")).integer().not_null().default(0))
                .to_owned(),
        ).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Alias::new("planet"))
                .drop_column(Alias::new("missile_launcher_count"))
                .drop_column(Alias::new("plasma_turret_count"))
                .to_owned(),
        ).await
    }
}