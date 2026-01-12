use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("message"))
                    .if_not_exists()
                    .col(ColumnDef::new(Alias::new("id")).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Alias::new("sender_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("receiver_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("subject")).string().not_null())
                    .col(ColumnDef::new(Alias::new("content")).text().not_null())
                    .col(ColumnDef::new(Alias::new("is_read")).boolean().not_null().default(false))
                    .col(ColumnDef::new(Alias::new("created_at")).timestamp().not_null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(Alias::new("message")).to_owned()).await
    }
}