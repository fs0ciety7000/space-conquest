use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Conversation::Table)
                    .add_column(
                        ColumnDef::new(Conversation::User1Archived)
                            .boolean()
                            .not_null()
                            .default(false)
                    )
                    .add_column(
                        ColumnDef::new(Conversation::User2Archived)
                            .boolean()
                            .not_null()
                            .default(false)
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Conversation::Table)
                    .drop_column(Conversation::User1Archived)
                    .drop_column(Conversation::User2Archived)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Conversation {
    Table,
    User1Archived,
    User2Archived,
}
