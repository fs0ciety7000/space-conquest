use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260308_000002_add_score_columns_to_user"
    }
}

/// Ajoute les colonnes de score en cache sur la table user.
/// Ces colonnes sont recalculées toutes les 5 minutes par un job background.
/// Elles permettent une pagination SQL directe sur le classement (/ranking).
#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("user"))
                    .add_column_if_not_exists(
                        ColumnDef::new(Alias::new("total_score"))
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .add_column_if_not_exists(
                        ColumnDef::new(Alias::new("economy_score"))
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .add_column_if_not_exists(
                        ColumnDef::new(Alias::new("military_score"))
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .to_owned(),
            )
            .await?;

        // Index pour accélérer ORDER BY total_score DESC sur /ranking
        manager
            .create_index(
                Index::create()
                    .name("idx_user_total_score")
                    .table(Alias::new("user"))
                    .col(Alias::new("total_score"))
                    .if_not_exists()
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .name("idx_user_total_score")
                    .table(Alias::new("user"))
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("user"))
                    .drop_column(Alias::new("total_score"))
                    .drop_column(Alias::new("economy_score"))
                    .drop_column(Alias::new("military_score"))
                    .to_owned(),
            )
            .await
    }
}
