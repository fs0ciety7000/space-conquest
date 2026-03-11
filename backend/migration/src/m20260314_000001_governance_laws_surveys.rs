use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260314_000001_governance_laws_surveys"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ── law_proposal ────────────────────────────────────────────────────
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("law_proposal"))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .uuid()
                            .not_null()
                            .primary_key()
                            .default(Expr::cust("gen_random_uuid()")),
                    )
                    .col(
                        ColumnDef::new(Alias::new("title"))
                            .string_len(200)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("description"))
                            .text()
                            .not_null(),
                    )
                    .col(ColumnDef::new(Alias::new("created_by")).uuid().not_null())
                    .col(
                        ColumnDef::new(Alias::new("vote_start"))
                            .timestamp()
                            .not_null()
                            .default(Expr::cust("NOW()")),
                    )
                    .col(ColumnDef::new(Alias::new("vote_end")).timestamp().not_null())
                    .col(
                        ColumnDef::new(Alias::new("status"))
                            .string_len(20)
                            .not_null()
                            .default("voting"),
                    )
                    .col(
                        ColumnDef::new(Alias::new("effects"))
                            .json_binary()
                            .not_null()
                            .default(Expr::cust("'[]'::jsonb")),
                    )
                    .col(
                        ColumnDef::new(Alias::new("yes_count"))
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(Alias::new("no_count"))
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(Alias::new("created_at"))
                            .timestamp()
                            .not_null()
                            .default(Expr::cust("NOW()")),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_law_proposal_created_by")
                            .from(Alias::new("law_proposal"), Alias::new("created_by"))
                            .to(Alias::new("user"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_law_proposal_status")
                    .table(Alias::new("law_proposal"))
                    .col(Alias::new("status"))
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_law_proposal_vote_end")
                    .table(Alias::new("law_proposal"))
                    .col(Alias::new("vote_end"))
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // ── law_vote ─────────────────────────────────────────────────────────
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("law_vote"))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .uuid()
                            .not_null()
                            .primary_key()
                            .default(Expr::cust("gen_random_uuid()")),
                    )
                    .col(ColumnDef::new(Alias::new("law_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("user_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("vote")).boolean().not_null())
                    .col(
                        ColumnDef::new(Alias::new("voted_at"))
                            .timestamp()
                            .not_null()
                            .default(Expr::cust("NOW()")),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_law_vote_law_id")
                            .from(Alias::new("law_vote"), Alias::new("law_id"))
                            .to(Alias::new("law_proposal"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_law_vote_user_id")
                            .from(Alias::new("law_vote"), Alias::new("user_id"))
                            .to(Alias::new("user"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Unique constraint: one vote per user per law
        manager
            .create_index(
                Index::create()
                    .name("idx_law_vote_unique")
                    .table(Alias::new("law_vote"))
                    .col(Alias::new("law_id"))
                    .col(Alias::new("user_id"))
                    .unique()
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // ── law_effect ───────────────────────────────────────────────────────
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("law_effect"))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .uuid()
                            .not_null()
                            .primary_key()
                            .default(Expr::cust("gen_random_uuid()")),
                    )
                    .col(ColumnDef::new(Alias::new("law_id")).uuid().not_null())
                    .col(
                        ColumnDef::new(Alias::new("config_key"))
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("operation"))
                            .string_len(10)
                            .not_null(),
                    )
                    .col(ColumnDef::new(Alias::new("delta")).double().not_null())
                    .col(
                        ColumnDef::new(Alias::new("base_value"))
                            .double()
                            .not_null(),
                    )
                    .col(ColumnDef::new(Alias::new("expires_at")).timestamp().null())
                    .col(
                        ColumnDef::new(Alias::new("applied_at"))
                            .timestamp()
                            .not_null()
                            .default(Expr::cust("NOW()")),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_law_effect_law_id")
                            .from(Alias::new("law_effect"), Alias::new("law_id"))
                            .to(Alias::new("law_proposal"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_law_effect_expires_at")
                    .table(Alias::new("law_effect"))
                    .col(Alias::new("expires_at"))
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // ── survey ───────────────────────────────────────────────────────────
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("survey"))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .uuid()
                            .not_null()
                            .primary_key()
                            .default(Expr::cust("gen_random_uuid()")),
                    )
                    .col(
                        ColumnDef::new(Alias::new("title"))
                            .string_len(200)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("description"))
                            .text()
                            .not_null(),
                    )
                    .col(ColumnDef::new(Alias::new("created_by")).uuid().not_null())
                    .col(
                        ColumnDef::new(Alias::new("survey_type"))
                            .string_len(20)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("options"))
                            .json_binary()
                            .not_null()
                            .default(Expr::cust("'[]'::jsonb")),
                    )
                    .col(
                        ColumnDef::new(Alias::new("starts_at"))
                            .timestamp()
                            .not_null()
                            .default(Expr::cust("NOW()")),
                    )
                    .col(ColumnDef::new(Alias::new("ends_at")).timestamp().not_null())
                    .col(
                        ColumnDef::new(Alias::new("status"))
                            .string_len(20)
                            .not_null()
                            .default("active"),
                    )
                    .col(
                        ColumnDef::new(Alias::new("created_at"))
                            .timestamp()
                            .not_null()
                            .default(Expr::cust("NOW()")),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_survey_created_by")
                            .from(Alias::new("survey"), Alias::new("created_by"))
                            .to(Alias::new("user"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_survey_status")
                    .table(Alias::new("survey"))
                    .col(Alias::new("status"))
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_survey_ends_at")
                    .table(Alias::new("survey"))
                    .col(Alias::new("ends_at"))
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // ── survey_response ──────────────────────────────────────────────────
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("survey_response"))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .uuid()
                            .not_null()
                            .primary_key()
                            .default(Expr::cust("gen_random_uuid()")),
                    )
                    .col(ColumnDef::new(Alias::new("survey_id")).uuid().not_null())
                    .col(ColumnDef::new(Alias::new("user_id")).uuid().not_null())
                    .col(
                        ColumnDef::new(Alias::new("answer"))
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("responded_at"))
                            .timestamp()
                            .not_null()
                            .default(Expr::cust("NOW()")),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_survey_response_survey_id")
                            .from(Alias::new("survey_response"), Alias::new("survey_id"))
                            .to(Alias::new("survey"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_survey_response_user_id")
                            .from(Alias::new("survey_response"), Alias::new("user_id"))
                            .to(Alias::new("user"), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Unique constraint: one response per user per survey
        manager
            .create_index(
                Index::create()
                    .name("idx_survey_response_unique")
                    .table(Alias::new("survey_response"))
                    .col(Alias::new("survey_id"))
                    .col(Alias::new("user_id"))
                    .unique()
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table(Alias::new("survey_response"))
                    .if_exists()
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table(Alias::new("survey"))
                    .if_exists()
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table(Alias::new("law_effect"))
                    .if_exists()
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table(Alias::new("law_vote"))
                    .if_exists()
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table(Alias::new("law_proposal"))
                    .if_exists()
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}
