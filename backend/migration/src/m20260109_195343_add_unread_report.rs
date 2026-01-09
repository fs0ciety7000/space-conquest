use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // On ajoute la colonne "unread_report" (nullable text) à la table "planet"
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("planet"))
                    .add_column(ColumnDef::new(Alias::new("unread_report")).text())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Pour revenir en arrière : on supprime la colonne
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("planet"))
                    .drop_column(Alias::new("unread_report"))
                    .to_owned(),
            )
            .await
    }
}