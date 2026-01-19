use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Ajouter la colonne role (nullable temporairement)
        manager
            .alter_table(
                Table::alter()
                    .table(User::Table)
                    .add_column(
                        ColumnDef::new(User::Role)
                            .string()
                            .null()
                    )
                    .to_owned(),
            )
            .await?;

        // Mettre à jour les utilisateurs existants avec le rôle "user" par défaut
        manager
            .exec_stmt(
                Query::update()
                    .table(User::Table)
                    .value(User::Role, Expr::cust("'user'"))
                    .and_where(Expr::col(User::Role).is_null())
                    .to_owned()
            )
            .await?;

        // Rendre la colonne NOT NULL avec valeur par défaut
        manager
            .alter_table(
                Table::alter()
                    .table(User::Table)
                    .modify_column(
                        ColumnDef::new(User::Role)
                            .string()
                            .not_null()
                            .default("user")
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
                    .drop_column(User::Role)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum User {
    Table,
    Role,
}
