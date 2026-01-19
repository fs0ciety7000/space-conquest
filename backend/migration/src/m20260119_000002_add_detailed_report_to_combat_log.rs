use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Ajouter la colonne detailed_report (JSON, nullable)
        manager
            .alter_table(
                Table::alter()
                    .table(CombatLog::Table)
                    .add_column(
                        ColumnDef::new(CombatLog::DetailedReport)
                            .json()
                            .null()
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(CombatLog::Table)
                    .drop_column(CombatLog::DetailedReport)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum CombatLog {
    Table,
    DetailedReport,
}
