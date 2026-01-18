use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ✅ Ajouter la colonne created_at (nullable temporairement)
        manager
            .alter_table(
                Table::alter()
                    .table(User::Table)
                    .add_column(
                        ColumnDef::new(User::CreatedAt)
                            .timestamp()
                            .null() // ✅ Nullable au début
                    )
                    .to_owned(),
            )
            .await?;

        // ✅ Mettre à jour UNIQUEMENT les utilisateurs existants avec la date du 17/01/2026
        manager
            .exec_stmt(
                Query::update()
                    .table(User::Table)
                    .value(User::CreatedAt, Expr::cust("'2026-01-17 00:00:00'"))
                    .and_where(Expr::col(User::CreatedAt).is_null()) // Seulement ceux qui n'ont pas de date
                    .to_owned()
            )
            .await?;

        // ✅ Rendre la colonne NOT NULL maintenant
        manager
            .alter_table(
                Table::alter()
                    .table(User::Table)
                    .modify_column(
                        ColumnDef::new(User::CreatedAt)
                            .timestamp()
                            .not_null()
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(User::Table)
                    .drop_column(User::CreatedAt)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum User {
    Table,
    CreatedAt,
}
