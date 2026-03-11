use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260312_000003_enhance_casus_belli"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("casus_belli"))
                    .add_column(
                        ColumnDef::new(Alias::new("tension_level"))
                            .integer()
                            .not_null()
                            .default(1),
                    )
                    .add_column(
                        ColumnDef::new(Alias::new("cb_type"))
                            .string_len(30)
                            .not_null()
                            .default("sabotage_detected"),
                    )
                    .add_column(
                        ColumnDef::new(Alias::new("is_multi_use"))
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .add_column(
                        ColumnDef::new(Alias::new("uses_remaining"))
                            .integer()
                            .not_null()
                            .default(1),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("casus_belli"))
                    .drop_column(Alias::new("tension_level"))
                    .drop_column(Alias::new("cb_type"))
                    .drop_column(Alias::new("is_multi_use"))
                    .drop_column(Alias::new("uses_remaining"))
                    .to_owned(),
            )
            .await
    }
}
