use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Table des templates d'officiers
        manager
            .create_table(
                Table::create()
                    .table(OfficerTemplate::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(OfficerTemplate::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(OfficerTemplate::Name).string().not_null())
                    .col(ColumnDef::new(OfficerTemplate::Description).text().not_null())
                    .col(ColumnDef::new(OfficerTemplate::Specialization).string().not_null())
                    .col(ColumnDef::new(OfficerTemplate::Rarity).string().not_null())
                    .col(ColumnDef::new(OfficerTemplate::BonusType).string().not_null())
                    .col(ColumnDef::new(OfficerTemplate::BaseBonusValue).double().not_null())
                    .col(ColumnDef::new(OfficerTemplate::BonusPerLevel).double().not_null())
                    .col(ColumnDef::new(OfficerTemplate::MaxLevel).integer().not_null().default(50))
                    .col(ColumnDef::new(OfficerTemplate::ImageType).string().not_null())
                    .col(ColumnDef::new(OfficerTemplate::RecruitmentCostMetal).double().not_null().default(0.0))
                    .col(ColumnDef::new(OfficerTemplate::RecruitmentCostCrystal).double().not_null().default(0.0))
                    .col(ColumnDef::new(OfficerTemplate::RecruitmentCostDeuterium).double().not_null().default(0.0))
                    .col(ColumnDef::new(OfficerTemplate::IsAvailable).boolean().not_null().default(true))
                    .to_owned(),
            )
            .await?;

        // Table des officiers recrutés par les utilisateurs
        manager
            .create_table(
                Table::create()
                    .table(UserOfficer::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(UserOfficer::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(UserOfficer::UserId).uuid().not_null())
                    .col(ColumnDef::new(UserOfficer::OfficerTemplateId).uuid().not_null())
                    .col(ColumnDef::new(UserOfficer::Level).integer().not_null().default(1))
                    .col(ColumnDef::new(UserOfficer::Experience).integer().not_null().default(0))
                    .col(ColumnDef::new(UserOfficer::IsActive).boolean().not_null().default(true))
                    .col(ColumnDef::new(UserOfficer::RecruitedAt).timestamp().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_user_officer_user")
                            .from(UserOfficer::Table, UserOfficer::UserId)
                            .to(User::Table, User::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_user_officer_template")
                            .from(UserOfficer::Table, UserOfficer::OfficerTemplateId)
                            .to(OfficerTemplate::Table, OfficerTemplate::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Index pour optimiser les requêtes
        manager
            .create_index(
                Index::create()
                    .name("idx_user_officer_user_id")
                    .table(UserOfficer::Table)
                    .col(UserOfficer::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_user_officer_active")
                    .table(UserOfficer::Table)
                    .col(UserOfficer::UserId)
                    .col(UserOfficer::IsActive)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(UserOfficer::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(OfficerTemplate::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum OfficerTemplate {
    Table,
    Id,
    Name,
    Description,
    Specialization,
    Rarity,
    BonusType,
    BaseBonusValue,
    BonusPerLevel,
    MaxLevel,
    ImageType,
    RecruitmentCostMetal,
    RecruitmentCostCrystal,
    RecruitmentCostDeuterium,
    IsAvailable,
}

#[derive(DeriveIden)]
enum UserOfficer {
    Table,
    Id,
    UserId,
    OfficerTemplateId,
    Level,
    Experience,
    IsActive,
    RecruitedAt,
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
}
