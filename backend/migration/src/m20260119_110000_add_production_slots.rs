use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Ajouter 4 colonnes pour les slots de production supplémentaires
        // null = verrouillé, "none" = débloqué mais pas assigné
        // "metal"/"crystal"/"energy"/"deuterium" = assigné à cette ressource

        manager
            .alter_table(
                Table::alter()
                    .table(Planet::Table)
                    .add_column(ColumnDef::new(Planet::Slot1).string().null())
                    .add_column(ColumnDef::new(Planet::Slot2).string().null())
                    .add_column(ColumnDef::new(Planet::Slot3).string().null())
                    .add_column(ColumnDef::new(Planet::Slot4).string().null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Planet::Table)
                    .drop_column(Planet::Slot1)
                    .drop_column(Planet::Slot2)
                    .drop_column(Planet::Slot3)
                    .drop_column(Planet::Slot4)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Planet {
    Table,
    Slot1,
    Slot2,
    Slot3,
    Slot4,
}
