use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // On modifie la table 'planet' pour ajouter la colonne
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("planet"))
                    .add_column(
                        ColumnDef::new(Alias::new("armour_tech_level"))
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // On retire la colonne en cas de rollback
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("planet"))
                    .drop_column(Alias::new("armour_tech_level"))
                    .to_owned(),
            )
            .await
    }
}