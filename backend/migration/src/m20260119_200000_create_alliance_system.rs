use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ═══════════════════════════════════════════════════════════════════════════
        // TABLE: alliance
        // ═══════════════════════════════════════════════════════════════════════════
        manager
            .create_table(
                Table::create()
                    .table(Alliance::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alliance::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Alliance::Name)
                            .string_len(20)
                            .not_null()
                            .unique_key(),
                    )
                    .col(
                        ColumnDef::new(Alliance::Tag)
                            .string_len(5)
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Alliance::Description).text())
                    .col(ColumnDef::new(Alliance::InternalMessage).text())
                    .col(ColumnDef::new(Alliance::LeaderId).uuid().not_null())
                    .col(
                        ColumnDef::new(Alliance::MemberCount)
                            .integer()
                            .not_null()
                            .default(1),
                    )
                    .col(
                        ColumnDef::new(Alliance::TotalScore)
                            .big_integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(Alliance::RecruitmentPolicy)
                            .string_len(20)
                            .not_null()
                            .default("invite_only"),
                    )
                    .col(
                        ColumnDef::new(Alliance::MinLevelRequired)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(Alliance::CreatedAt)
                            .timestamp()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Alliance::UpdatedAt)
                            .timestamp()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Index sur le nom et le tag pour recherche rapide
        manager
            .create_index(
                Index::create()
                    .name("idx_alliance_name")
                    .table(Alliance::Table)
                    .col(Alliance::Name)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_alliance_score")
                    .table(Alliance::Table)
                    .col(Alliance::TotalScore)
                    .to_owned(),
            )
            .await?;

        // ═══════════════════════════════════════════════════════════════════════════
        // TABLE: alliance_member
        // ═══════════════════════════════════════════════════════════════════════════
        manager
            .create_table(
                Table::create()
                    .table(AllianceMember::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AllianceMember::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(AllianceMember::AllianceId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AllianceMember::UserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AllianceMember::Role)
                            .string_len(20)
                            .not_null()
                            .default("member"),
                    )
                    .col(
                        ColumnDef::new(AllianceMember::Score)
                            .big_integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(AllianceMember::JoinedAt)
                            .timestamp()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AllianceMember::LastActive)
                            .timestamp()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Contrainte unique: un utilisateur ne peut être que dans une alliance
        manager
            .create_index(
                Index::create()
                    .name("idx_alliance_member_user_unique")
                    .table(AllianceMember::Table)
                    .col(AllianceMember::UserId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_alliance_member_alliance")
                    .table(AllianceMember::Table)
                    .col(AllianceMember::AllianceId)
                    .to_owned(),
            )
            .await?;

        // ═══════════════════════════════════════════════════════════════════════════
        // TABLE: alliance_invitation
        // ═══════════════════════════════════════════════════════════════════════════
        manager
            .create_table(
                Table::create()
                    .table(AllianceInvitation::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AllianceInvitation::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(AllianceInvitation::AllianceId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AllianceInvitation::UserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AllianceInvitation::InvitationType)
                            .string_len(20)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AllianceInvitation::Status)
                            .string_len(20)
                            .not_null()
                            .default("pending"),
                    )
                    .col(ColumnDef::new(AllianceInvitation::Message).text())
                    .col(ColumnDef::new(AllianceInvitation::InvitedBy).uuid())
                    .col(
                        ColumnDef::new(AllianceInvitation::CreatedAt)
                            .timestamp()
                            .not_null(),
                    )
                    .col(ColumnDef::new(AllianceInvitation::ExpiresAt).timestamp())
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_alliance_invitation_user")
                    .table(AllianceInvitation::Table)
                    .col(AllianceInvitation::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_alliance_invitation_alliance")
                    .table(AllianceInvitation::Table)
                    .col(AllianceInvitation::AllianceId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_alliance_invitation_status")
                    .table(AllianceInvitation::Table)
                    .col(AllianceInvitation::Status)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop tables in reverse order (respect foreign key constraints)
        manager
            .drop_table(Table::drop().table(AllianceInvitation::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(AllianceMember::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(Alliance::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum Alliance {
    Table,
    Id,
    Name,
    Tag,
    Description,
    InternalMessage,
    LeaderId,
    MemberCount,
    TotalScore,
    RecruitmentPolicy,
    MinLevelRequired,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum AllianceMember {
    Table,
    Id,
    AllianceId,
    UserId,
    Role,
    Score,
    JoinedAt,
    LastActive,
}

#[derive(Iden)]
enum AllianceInvitation {
    Table,
    Id,
    AllianceId,
    UserId,
    InvitationType,
    Status,
    Message,
    InvitedBy,
    CreatedAt,
    ExpiresAt,
}
