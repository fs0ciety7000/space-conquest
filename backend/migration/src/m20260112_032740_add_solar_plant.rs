use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    // AJOUT DE LA COLONNE
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Planet::Table)
                    .add_column(
                        ColumnDef::new(Planet::SolarPlantLevel)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .to_owned(),
            )
            .await
    }

    // SUPPRESSION (ROLLBACK)
    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Planet::Table)
                    .drop_column(Planet::SolarPlantLevel)
                    .to_owned(),
            )
            .await
    }
}

// DÉFINITION DES NOMS SQL
#[derive(DeriveIden)]
enum Planet {
    Table,
    SolarPlantLevel,
}