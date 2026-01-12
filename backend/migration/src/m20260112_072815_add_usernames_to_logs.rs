use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Ajouter opponent_username à combat_log
        manager
            .alter_table(
                Table::alter()
                    .table(CombatLog::Table)
                    .add_column(ColumnDef::new(CombatLog::OpponentUsername).string().null()) // Nullable car les anciens logs n'ont pas de nom
                    .to_owned(),
            )
            .await?;

        // 2. Ajouter les noms à transport_log
        manager
            .alter_table(
                Table::alter()
                    .table(TransportLog::Table)
                    .add_column(ColumnDef::new(TransportLog::SourceOwnerName).string().null())
                    .add_column(ColumnDef::new(TransportLog::TargetOwnerName).string().null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Rollback : On supprime les colonnes
        manager
            .alter_table(
                Table::alter()
                    .table(CombatLog::Table)
                    .drop_column(CombatLog::OpponentUsername)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(TransportLog::Table)
                    .drop_column(TransportLog::SourceOwnerName)
                    .drop_column(TransportLog::TargetOwnerName)
                    .to_owned(),
            )
            .await
    }
}

// Définition des noms de tables et colonnes pour SeaORM
#[derive(DeriveIden)]
enum CombatLog {
    Table,
    OpponentUsername,
}

#[derive(DeriveIden)]
enum TransportLog {
    Table,
    SourceOwnerName,
    TargetOwnerName,
}