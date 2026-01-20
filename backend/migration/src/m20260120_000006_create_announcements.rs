use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Announcements::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Announcements::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Announcements::Title).string().not_null())
                    .col(ColumnDef::new(Announcements::Content).text().not_null())
                    .col(
                        ColumnDef::new(Announcements::Type)
                            .string()
                            .not_null()
                            .default("info"), // info, warning, success, error
                    )
                    .col(
                        ColumnDef::new(Announcements::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(Announcements::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Announcements::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on is_active for faster queries
        manager
            .create_index(
                Index::create()
                    .name("idx_announcements_is_active")
                    .table(Announcements::Table)
                    .col(Announcements::IsActive)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Announcements::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum Announcements {
    Table,
    Id,
    Title,
    Content,
    Type,
    IsActive,
    CreatedAt,
    UpdatedAt,
}
