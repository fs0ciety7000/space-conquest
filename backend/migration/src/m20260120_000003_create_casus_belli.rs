use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Créer la table casus_belli pour suivre les droits d'attaque
        manager
            .create_table(
                Table::create()
                    .table(CasusBelli::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(CasusBelli::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(CasusBelli::VictimUserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(CasusBelli::AggressorUserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(CasusBelli::Reason)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(CasusBelli::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(CasusBelli::ExpiresAt)
                            .timestamp()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(CasusBelli::WasUsed)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_casus_belli_victim")
                            .from(CasusBelli::Table, CasusBelli::VictimUserId)
                            .to(User::Table, User::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::NoAction),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_casus_belli_aggressor")
                            .from(CasusBelli::Table, CasusBelli::AggressorUserId)
                            .to(User::Table, User::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::NoAction),
                    )
                    .to_owned(),
            )
            .await?;

        // Créer les index pour optimiser les performances
        manager
            .create_index(
                Index::create()
                    .name("idx_casus_belli_victim")
                    .table(CasusBelli::Table)
                    .col(CasusBelli::VictimUserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_casus_belli_aggressor")
                    .table(CasusBelli::Table)
                    .col(CasusBelli::AggressorUserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_casus_belli_expires")
                    .table(CasusBelli::Table)
                    .col(CasusBelli::ExpiresAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Supprimer les index d'abord
        manager
            .drop_index(
                Index::drop()
                    .name("idx_casus_belli_expires")
                    .table(CasusBelli::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_casus_belli_aggressor")
                    .table(CasusBelli::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_casus_belli_victim")
                    .table(CasusBelli::Table)
                    .to_owned(),
            )
            .await?;

        // Supprimer la table
        manager
            .drop_table(Table::drop().table(CasusBelli::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum CasusBelli {
    Table,
    Id,
    VictimUserId,
    AggressorUserId,
    Reason,
    CreatedAt,
    ExpiresAt,
    WasUsed,
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
}
