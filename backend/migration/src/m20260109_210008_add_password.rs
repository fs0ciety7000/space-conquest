use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Alias::new("planet"))
                .add_column(ColumnDef::new(Alias::new("password")).string().not_null().default("password_temporaire")) // Valeur par défaut pour éviter le crash des vieux comptes
                .to_owned(),
        ).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Alias::new("planet"))
                .drop_column(Alias::new("password"))
                .to_owned(),
        ).await
    }
}