use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Planet::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Planet::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    // --- AJOUTEZ CETTE LIGNE ICI ---
                    .col(ColumnDef::new(Alias::new("owner_id")).uuid().not_null()) 
                    // -------------------------------
                    .col(ColumnDef::new(Planet::Name).string().not_null())
                    .col(ColumnDef::new(Planet::Galaxy).integer().not_null())
                    .col(ColumnDef::new(Planet::System).integer().not_null())
                    .col(ColumnDef::new(Planet::Position).integer().not_null())
                    .col(
                        ColumnDef::new(Planet::MetalMineLevel)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(Planet::CrystalMineLevel)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(Planet::DeuteriumMineLevel)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(Planet::MetalAmount)
                            .double()
                            .not_null()
                            .default(0.0),
                    )
                    .col(
                        ColumnDef::new(Planet::CrystalAmount)
                            .double()
                            .not_null()
                            .default(0.0),
                    )
                    .col(
                        ColumnDef::new(Planet::DeuteriumAmount)
                            .double()
                            .not_null()
                            .default(0.0),
                    )
                    .col(ColumnDef::new(Planet::LastUpdate).timestamp().not_null())
                    .col(ColumnDef::new(Planet::ConstructionEnd).timestamp().null())
                    .col(ColumnDef::new(Planet::ConstructionType).string().null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Planet::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Planet {
    Table,
    Id,
    Name,
    Galaxy,
    System,
    Position,
    MetalMineLevel,
    CrystalMineLevel,
    DeuteriumMineLevel,
    MetalAmount,
    CrystalAmount,
    DeuteriumAmount,
    LastUpdate,
    ConstructionEnd,
    ConstructionType,
}