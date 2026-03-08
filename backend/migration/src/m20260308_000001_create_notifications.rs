use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Notification::Table)
                    .if_not_exists()
                    .col(uuid(Notification::Id).primary_key())
                    .col(uuid(Notification::UserId).not_null())
                    // "combat" | "build" | "market" | "expedition" | "spy" | "transport"
                    .col(string(Notification::NotifType).not_null())
                    .col(string(Notification::Title).not_null())
                    .col(text(Notification::Message).not_null())
                    .col(boolean(Notification::IsRead).not_null().default(false))
                    .col(timestamp(Notification::CreatedAt).not_null())
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_notification_user_id")
                    .table(Notification::Table)
                    .col(Notification::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_notification_created_at")
                    .table(Notification::Table)
                    .col(Notification::CreatedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Notification::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Notification {
    Table,
    Id,
    UserId,
    NotifType,
    Title,
    Message,
    IsRead,
    CreatedAt,
}
