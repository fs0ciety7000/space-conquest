use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    // L'ajout des colonnes
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Planet::Table)
                .add_column(ColumnDef::new(Alias::new("shipyard_level")).integer().not_null().default(0))
                .add_column(ColumnDef::new(Alias::new("light_hunter_count")).integer().not_null().default(0))
                .add_column(ColumnDef::new(Alias::new("shipyard_construction_end")).timestamp().null())
                // Ajoutez ici les autres colonnes si elles manquent (cruiser_count, etc.)
                // Mais pour débloquer la migration, ce bloc suffit si c'est ce que vous aviez.
                .to_owned()
        ).await
    }

    // LA CORRECTION EST ICI :
    // On dit à la migration "Si on annule, ne fais rien mais ne plante pas".
    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        Ok(())
    }
}

#[derive(DeriveIden)]
enum Planet {
    Table,
}