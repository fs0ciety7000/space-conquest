use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Créer la table conversation
        manager
            .create_table(
                Table::create()
                    .table(Conversation::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Conversation::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Conversation::User1Id).uuid().not_null())
                    .col(ColumnDef::new(Conversation::User2Id).uuid().not_null())
                    .col(
                        ColumnDef::new(Conversation::LastMessageAt)
                            .timestamp()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Conversation::User1UnreadCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(Conversation::User2UnreadCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .to_owned(),
            )
            .await?;

        // Ajouter la colonne conversation_id à la table message
        manager
            .alter_table(
                Table::alter()
                    .table(Message::Table)
                    .add_column(ColumnDef::new(Message::ConversationId).uuid())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Supprimer la colonne conversation_id de message
        manager
            .alter_table(
                Table::alter()
                    .table(Message::Table)
                    .drop_column(Message::ConversationId)
                    .to_owned(),
            )
            .await?;

        // Supprimer la table conversation
        manager
            .drop_table(Table::drop().table(Conversation::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum Conversation {
    Table,
    Id,
    User1Id,
    User2Id,
    LastMessageAt,
    User1UnreadCount,
    User2UnreadCount,
}

#[derive(Iden)]
enum Message {
    Table,
    ConversationId,
}
