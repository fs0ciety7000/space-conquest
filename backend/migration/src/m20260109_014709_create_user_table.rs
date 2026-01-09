use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Créer la table User
        manager
            .create_table(
                Table::create()
                    .table(User::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(User::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(User::Username).string().not_null().unique_key())
                    .col(ColumnDef::new(User::PasswordHash).string().not_null())
                    .to_owned(),
            )
            .await?;

        // 2. Ajouter owner_id à la table Planet
        manager
            .alter_table(
                Table::alter()
                    .table(Planet::Table)
                    .add_column(ColumnDef::new(Alias::new("owner_id")).uuid().null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Planet::Table)
                    .drop_column(Alias::new("owner_id"))
                    .to_owned(),
            )
            .await?;
            
        manager
            .drop_table(Table::drop().table(User::Table).to_owned())
            .await
    }
}

/// Identifiants de la table User
#[derive(DeriveIden)]
enum User {
    Table,
    Id,
    Username,
    PasswordHash,
}

/// On définit Planet ici juste pour la référence au nom de la table
#[derive(DeriveIden)]
enum Planet {
    Table,
}