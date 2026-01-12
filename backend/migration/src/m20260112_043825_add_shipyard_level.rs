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
                        ColumnDef::new(Planet::ShipyardLevel)
                            .integer()
                            .not_null()
                            .default(0), // Important : commence au niveau 0
                    )
                    .to_owned(),
            )
            .await
    }

    // RETOUR EN ARRIÈRE (ROLLBACK)
    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Planet::Table)
                    .drop_column(Planet::ShipyardLevel)
                    .to_owned(),
            )
            .await
    }
}

// DÉFINITION DES NOMS SQL
#[derive(DeriveIden)]
enum Planet {
    Table,          // Mappe vers "planet"
    ShipyardLevel,  // Mappe vers "shipyard_level"
}