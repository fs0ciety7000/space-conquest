use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260309_000001_create_debris_field"
    }
}

/// Crée la table `debris_field` pour stocker les champs de débris post-combat.
/// Un champ de débris est généré après chaque combat (30% métal + 30% cristal des vaisseaux détruits).
/// Les recycleurs peuvent collecter ces débris via POST /fleet/recycle.
///
/// TODO (antigravity): la mécanique recycleur complète est dans CLAUDE_HANDOFF.md section Expansion 5.0.
#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Table des champs de débris par coordonnée galactique
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("debris_field"))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .uuid()
                            .not_null()
                            .primary_key()
                            .default(Expr::cust("gen_random_uuid()")),
                    )
                    .col(ColumnDef::new(Alias::new("galaxy")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("system")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("position")).integer().not_null())
                    .col(
                        ColumnDef::new(Alias::new("metal"))
                            .double()
                            .not_null()
                            .default(0.0),
                    )
                    .col(
                        ColumnDef::new(Alias::new("crystal"))
                            .double()
                            .not_null()
                            .default(0.0),
                    )
                    .col(
                        ColumnDef::new(Alias::new("updated_at"))
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::cust("NOW()")),
                    )
                    .to_owned(),
            )
            .await?;

        // Index unique sur les coordonnées (une seule entrée par position)
        manager
            .create_index(
                Index::create()
                    .name("idx_debris_field_coords")
                    .table(Alias::new("debris_field"))
                    .col(Alias::new("galaxy"))
                    .col(Alias::new("system"))
                    .col(Alias::new("position"))
                    .unique()
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Ajouter colonne recyclers_sent sur fleet_mission pour la mécanique recycleur
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("fleet_mission"))
                    .add_column_if_not_exists(
                        ColumnDef::new(Alias::new("recyclers_sent"))
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .to_owned(),
            )
            .await?;

        // Ajouter la colonne details JSONB sur combat_log pour le rapport détaillé
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("combat_log"))
                    .add_column_if_not_exists(
                        ColumnDef::new(Alias::new("details"))
                            .json_binary()
                            .null(),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Alias::new("debris_field")).to_owned())
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("fleet_mission"))
                    .drop_column(Alias::new("recyclers_sent"))
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("combat_log"))
                    .drop_column(Alias::new("details"))
                    .to_owned(),
            )
            .await
    }
}
