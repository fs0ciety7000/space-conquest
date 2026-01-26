use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create global_chat_message table
        manager
            .create_table(
                Table::create()
                    .table(GlobalChatMessage::Table)
                    .if_not_exists()
                    .col(uuid(GlobalChatMessage::Id).primary_key())
                    .col(uuid(GlobalChatMessage::SenderId).not_null())
                    .col(string(GlobalChatMessage::SenderName).not_null())
                    .col(text(GlobalChatMessage::Content).not_null())
                    .col(timestamp(GlobalChatMessage::CreatedAt).not_null())
                    .to_owned(),
            )
            .await?;

        // Create index on created_at for efficient ordering
        manager
            .create_index(
                Index::create()
                    .name("idx_global_chat_message_created_at")
                    .table(GlobalChatMessage::Table)
                    .col(GlobalChatMessage::CreatedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(GlobalChatMessage::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum GlobalChatMessage {
    Table,
    Id,
    SenderId,
    SenderName,
    Content,
    CreatedAt,
}
