use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create market_offers table
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("market_offers"))
                    .if_not_exists()
                    .col(ColumnDef::new(Alias::new("id")).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Alias::new("user_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("planet_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("resource_type")).string().not_null())
                    .col(ColumnDef::new(Alias::new("quantity")).big_integer().not_null())
                    .col(ColumnDef::new(Alias::new("price_per_unit")).big_integer().not_null())
                    .col(ColumnDef::new(Alias::new("offer_type")).string().not_null()) // "buy" or "sell"
                    .col(ColumnDef::new(Alias::new("created_at")).timestamp().not_null())
                    .col(ColumnDef::new(Alias::new("expires_at")).timestamp())
                    .to_owned(),
            )
            .await?;

        // Create market_transactions table
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("market_transactions"))
                    .if_not_exists()
                    .col(ColumnDef::new(Alias::new("id")).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Alias::new("offer_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("buyer_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("seller_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("resource_type")).string().not_null())
                    .col(ColumnDef::new(Alias::new("quantity")).big_integer().not_null())
                    .col(ColumnDef::new(Alias::new("total_price")).big_integer().not_null())
                    .col(ColumnDef::new(Alias::new("created_at")).timestamp().not_null())
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Alias::new("market_transactions")).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(Alias::new("market_offers")).to_owned())
            .await?;

        Ok(())
    }
}
