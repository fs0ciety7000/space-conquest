use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("transport_log"))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    // CIBLE (Celui qui reçoit)
                    .col(
                        ColumnDef::new(Alias::new("target_planet_id"))
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("target_planet_name"))
                            .string()
                            .not_null(),
                    )
                    // SOURCE (Celui qui envoie)
                    .col(
                        ColumnDef::new(Alias::new("source_planet_id"))
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("source_planet_name"))
                            .string()
                            .not_null(),
                    )
                    // RESSOURCES
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
                        ColumnDef::new(Alias::new("deuterium"))
                            .double()
                            .not_null()
                            .default(0.0),
                    )
                    .col(ColumnDef::new(Alias::new("date")).date_time().not_null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Alias::new("transport_log")).to_owned())
            .await
    }
}