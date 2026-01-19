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
                    .table(Planet::Table)
                    .add_column(
                        ColumnDef::new(Planet::CreatedAt)
                            .timestamp()
                            .null() // ✅ Nullable au début
                    )
                    .to_owned(),
            )
            .await?;

        // ✅ Mettre à jour UNIQUEMENT les planètes existantes avec NOW()
        // Les planètes les plus anciennes auront des dates proches
        manager
            .exec_stmt(
                Query::update()
                    .table(Planet::Table)
                    .value(Planet::CreatedAt, Expr::cust("NOW()"))
                    .and_where(Expr::col(Planet::CreatedAt).is_null()) // Seulement celles qui n'ont pas de date
                    .to_owned()
            )
            .await?;

        // ✅ Rendre la colonne NOT NULL maintenant
        manager
            .alter_table(
                Table::alter()
                    .table(Planet::Table)
                    .modify_column(
                        ColumnDef::new(Planet::CreatedAt)
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
                    .table(Planet::Table)
                    .drop_column(Planet::CreatedAt)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Planet {
    Table,
    CreatedAt,
}
