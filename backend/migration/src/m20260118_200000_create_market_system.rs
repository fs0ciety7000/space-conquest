use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create market_listing table
        manager
            .create_table(
                Table::create()
                    .table(MarketListing::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(MarketListing::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(MarketListing::SellerPlanetId).uuid().not_null())
                    .col(ColumnDef::new(MarketListing::SellerUserId).uuid().not_null())
                    .col(
                        ColumnDef::new(MarketListing::ResourceType)
                            .string_len(20)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MarketListing::Quantity)
                            .double()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MarketListing::PricePerUnit)
                            .double()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MarketListing::TargetResource)
                            .string_len(20)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MarketListing::CreatedAt)
                            .timestamp()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MarketListing::ExpiresAt)
                            .timestamp()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MarketListing::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes for market_listing
        manager
            .create_index(
                Index::create()
                    .name("idx_market_listing_resource_active")
                    .table(MarketListing::Table)
                    .col(MarketListing::ResourceType)
                    .col(MarketListing::IsActive)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_market_listing_seller_planet")
                    .table(MarketListing::Table)
                    .col(MarketListing::SellerPlanetId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_market_listing_expires")
                    .table(MarketListing::Table)
                    .col(MarketListing::ExpiresAt)
                    .to_owned(),
            )
            .await?;

        // Create market_transaction table
        manager
            .create_table(
                Table::create()
                    .table(MarketTransaction::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(MarketTransaction::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(MarketTransaction::SellerPlanetId).uuid().not_null())
                    .col(ColumnDef::new(MarketTransaction::SellerUserId).uuid().not_null())
                    .col(ColumnDef::new(MarketTransaction::BuyerPlanetId).uuid().not_null())
                    .col(ColumnDef::new(MarketTransaction::BuyerUserId).uuid().not_null())
                    .col(
                        ColumnDef::new(MarketTransaction::ResourceSold)
                            .string_len(20)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MarketTransaction::ResourcePaid)
                            .string_len(20)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MarketTransaction::QuantitySold)
                            .double()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MarketTransaction::QuantityPaid)
                            .double()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MarketTransaction::PricePerUnit)
                            .double()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MarketTransaction::TaxAmount)
                            .double()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MarketTransaction::TransactionType)
                            .string_len(10)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MarketTransaction::CreatedAt)
                            .timestamp()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes for market_transaction
        manager
            .create_index(
                Index::create()
                    .name("idx_market_transaction_created")
                    .table(MarketTransaction::Table)
                    .col(MarketTransaction::CreatedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_market_transaction_seller")
                    .table(MarketTransaction::Table)
                    .col(MarketTransaction::SellerUserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_market_transaction_buyer")
                    .table(MarketTransaction::Table)
                    .col(MarketTransaction::BuyerUserId)
                    .to_owned(),
            )
            .await?;

        // Create server_resource_stats table (singleton)
        manager
            .create_table(
                Table::create()
                    .table(ServerResourceStats::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ServerResourceStats::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ServerResourceStats::MetalTotal)
                            .double()
                            .not_null()
                            .default(0.0),
                    )
                    .col(
                        ColumnDef::new(ServerResourceStats::CrystalTotal)
                            .double()
                            .not_null()
                            .default(0.0),
                    )
                    .col(
                        ColumnDef::new(ServerResourceStats::DeuteriumTotal)
                            .double()
                            .not_null()
                            .default(0.0),
                    )
                    .col(
                        ColumnDef::new(ServerResourceStats::MetalTraded24h)
                            .double()
                            .not_null()
                            .default(0.0),
                    )
                    .col(
                        ColumnDef::new(ServerResourceStats::CrystalTraded24h)
                            .double()
                            .not_null()
                            .default(0.0),
                    )
                    .col(
                        ColumnDef::new(ServerResourceStats::DeuteriumTraded24h)
                            .double()
                            .not_null()
                            .default(0.0),
                    )
                    .col(
                        ColumnDef::new(ServerResourceStats::CalculatedAt)
                            .timestamp()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Create market_price_history table
        manager
            .create_table(
                Table::create()
                    .table(MarketPriceHistory::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(MarketPriceHistory::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(MarketPriceHistory::ResourceType)
                            .string_len(20)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MarketPriceHistory::NpcBuyPrice)
                            .double()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MarketPriceHistory::NpcSellPrice)
                            .double()
                            .not_null(),
                    )
                    .col(ColumnDef::new(MarketPriceHistory::AvgPlayerPrice).double())
                    .col(
                        ColumnDef::new(MarketPriceHistory::PlayerListingsCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(MarketPriceHistory::RecordedAt)
                            .timestamp()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes for market_price_history
        manager
            .create_index(
                Index::create()
                    .name("idx_market_price_history_resource_recorded")
                    .table(MarketPriceHistory::Table)
                    .col(MarketPriceHistory::ResourceType)
                    .col(MarketPriceHistory::RecordedAt)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop tables in reverse order
        manager
            .drop_table(Table::drop().table(MarketPriceHistory::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(ServerResourceStats::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(MarketTransaction::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(MarketListing::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum MarketListing {
    Table,
    Id,
    SellerPlanetId,
    SellerUserId,
    ResourceType,
    Quantity,
    PricePerUnit,
    TargetResource,
    CreatedAt,
    ExpiresAt,
    IsActive,
}

#[derive(Iden)]
enum MarketTransaction {
    Table,
    Id,
    SellerPlanetId,
    SellerUserId,
    BuyerPlanetId,
    BuyerUserId,
    ResourceSold,
    ResourcePaid,
    QuantitySold,
    QuantityPaid,
    PricePerUnit,
    TaxAmount,
    TransactionType,
    CreatedAt,
}

#[derive(Iden)]
enum ServerResourceStats {
    Table,
    Id,
    MetalTotal,
    CrystalTotal,
    DeuteriumTotal,
    MetalTraded24h,
    CrystalTraded24h,
    DeuteriumTraded24h,
    CalculatedAt,
}

#[derive(Iden)]
enum MarketPriceHistory {
    Table,
    Id,
    ResourceType,
    NpcBuyPrice,
    NpcSellPrice,
    AvgPlayerPrice,
    PlayerListingsCount,
    RecordedAt,
}
