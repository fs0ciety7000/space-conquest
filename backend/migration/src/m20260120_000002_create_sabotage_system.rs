use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Créer la table sabotage_effect
        manager
            .create_table(
                Table::create()
                    .table(SabotageEffect::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SabotageEffect::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(SabotageEffect::TargetPlanetId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SabotageEffect::AttackerUserId)
                            .uuid()
                            .null(), // NULL si non détecté
                    )
                    .col(
                        ColumnDef::new(SabotageEffect::EffectType)
                            .string_len(50)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SabotageEffect::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(SabotageEffect::ExpiresAt)
                            .timestamp()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SabotageEffect::WasDetected)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(SabotageEffect::Metadata)
                            .json()
                            .null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_sabotage_planet")
                            .from(SabotageEffect::Table, SabotageEffect::TargetPlanetId)
                            .to(Planet::Table, Planet::Id)
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
                    .name("idx_sabotage_target")
                    .table(SabotageEffect::Table)
                    .col(SabotageEffect::TargetPlanetId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_sabotage_expires")
                    .table(SabotageEffect::Table)
                    .col(SabotageEffect::ExpiresAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_sabotage_type")
                    .table(SabotageEffect::Table)
                    .col(SabotageEffect::EffectType)
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
                    .name("idx_sabotage_type")
                    .table(SabotageEffect::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_sabotage_expires")
                    .table(SabotageEffect::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_sabotage_target")
                    .table(SabotageEffect::Table)
                    .to_owned(),
            )
            .await?;

        // Supprimer la table
        manager
            .drop_table(Table::drop().table(SabotageEffect::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum SabotageEffect {
    Table,
    Id,
    TargetPlanetId,
    AttackerUserId,
    EffectType,
    CreatedAt,
    ExpiresAt,
    WasDetected,
    Metadata,
}

#[derive(DeriveIden)]
enum Planet {
    Table,
    Id,
}
