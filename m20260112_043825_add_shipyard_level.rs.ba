use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    // AJOUT DE LA COLONNE
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    // Utiliser add_column_if_not_exists si disponible
    // Ou ignorer l'erreur si la colonne existe déjà
    match manager
        .alter_table(
            Table::alter()
                .table(Planet::Table)
                .add_column(
                    ColumnDef::new(Planet::ShipyardLevel)
                        .integer()
                        .not_null()
                        .default(0),
                )
                .to_owned(),
        )
        .await
    {
        Ok(_) => Ok(()),
        Err(e) if e.to_string().contains("already exists") => Ok(()),
        Err(e) => Err(e),
    }
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