use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ═══════════════════════════════════════════════════════════════════════════
        // TABLE: daily_mission (templates de missions quotidiennes)
        // ═══════════════════════════════════════════════════════════════════════════
        manager
            .create_table(
                Table::create()
                    .table(DailyMission::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(DailyMission::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(DailyMission::MissionKey).string_len(50).not_null().unique_key())
                    .col(ColumnDef::new(DailyMission::Name).string_len(100).not_null())
                    .col(ColumnDef::new(DailyMission::Description).text().not_null())
                    .col(ColumnDef::new(DailyMission::MissionType).string_len(30).not_null())
                    .col(ColumnDef::new(DailyMission::Target).string_len(50).not_null())
                    .col(ColumnDef::new(DailyMission::RequiredAmount).integer().not_null())
                    .col(ColumnDef::new(DailyMission::Difficulty).string_len(20).not_null())
                    .col(ColumnDef::new(DailyMission::RewardMetal).double().not_null().default(0.0))
                    .col(ColumnDef::new(DailyMission::RewardCrystal).double().not_null().default(0.0))
                    .col(ColumnDef::new(DailyMission::RewardDeuterium).double().not_null().default(0.0))
                    .col(ColumnDef::new(DailyMission::RewardXp).integer().not_null().default(0))
                    .col(ColumnDef::new(DailyMission::IsActive).boolean().not_null().default(true))
                    .to_owned(),
            )
            .await?;

        // ═══════════════════════════════════════════════════════════════════════════
        // TABLE: user_daily_mission (progression des joueurs)
        // ═══════════════════════════════════════════════════════════════════════════
        manager
            .create_table(
                Table::create()
                    .table(UserDailyMission::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(UserDailyMission::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(UserDailyMission::UserId).uuid().not_null())
                    .col(ColumnDef::new(UserDailyMission::MissionId).uuid().not_null())
                    .col(ColumnDef::new(UserDailyMission::AssignedDate).date().not_null())
                    .col(ColumnDef::new(UserDailyMission::CurrentProgress).integer().not_null().default(0))
                    .col(ColumnDef::new(UserDailyMission::Status).string_len(20).not_null().default("active"))
                    .col(ColumnDef::new(UserDailyMission::CompletedAt).timestamp())
                    .col(ColumnDef::new(UserDailyMission::ClaimedAt).timestamp())
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_user_daily_mission_user_date")
                    .table(UserDailyMission::Table)
                    .col(UserDailyMission::UserId)
                    .col(UserDailyMission::AssignedDate)
                    .to_owned(),
            )
            .await?;

        // ═══════════════════════════════════════════════════════════════════════════
        // TABLE: achievement (définitions des achievements)
        // ═══════════════════════════════════════════════════════════════════════════
        manager
            .create_table(
                Table::create()
                    .table(Achievement::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Achievement::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Achievement::AchievementKey).string_len(50).not_null().unique_key())
                    .col(ColumnDef::new(Achievement::Name).string_len(100).not_null())
                    .col(ColumnDef::new(Achievement::Description).text().not_null())
                    .col(ColumnDef::new(Achievement::Category).string_len(30).not_null())
                    .col(ColumnDef::new(Achievement::Icon).string_len(10).not_null())
                    .col(ColumnDef::new(Achievement::Color).string_len(10).not_null())
                    .col(ColumnDef::new(Achievement::ConditionType).string_len(30).not_null())
                    .col(ColumnDef::new(Achievement::ConditionTarget).string_len(50).not_null())
                    .col(ColumnDef::new(Achievement::ConditionValue).integer().not_null())
                    .col(ColumnDef::new(Achievement::Points).integer().not_null().default(0))
                    .col(ColumnDef::new(Achievement::Rarity).string_len(20).not_null())
                    .col(ColumnDef::new(Achievement::DisplayOrder).integer().not_null().default(0))
                    .col(ColumnDef::new(Achievement::IsActive).boolean().not_null().default(true))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_achievement_category")
                    .table(Achievement::Table)
                    .col(Achievement::Category)
                    .to_owned(),
            )
            .await?;

        // ═══════════════════════════════════════════════════════════════════════════
        // TABLE: user_achievement (achievements débloqués)
        // ═══════════════════════════════════════════════════════════════════════════
        manager
            .create_table(
                Table::create()
                    .table(UserAchievement::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(UserAchievement::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(UserAchievement::UserId).uuid().not_null())
                    .col(ColumnDef::new(UserAchievement::AchievementId).uuid().not_null())
                    .col(ColumnDef::new(UserAchievement::CurrentProgress).integer().not_null().default(0))
                    .col(ColumnDef::new(UserAchievement::Unlocked).boolean().not_null().default(false))
                    .col(ColumnDef::new(UserAchievement::UnlockedAt).timestamp())
                    .col(ColumnDef::new(UserAchievement::Displayed).boolean().not_null().default(false))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_user_achievement_user")
                    .table(UserAchievement::Table)
                    .col(UserAchievement::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_user_achievement_unique")
                    .table(UserAchievement::Table)
                    .col(UserAchievement::UserId)
                    .col(UserAchievement::AchievementId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // ═══════════════════════════════════════════════════════════════════════════
        // TABLE: login_streak (streaks de connexion)
        // ═══════════════════════════════════════════════════════════════════════════
        manager
            .create_table(
                Table::create()
                    .table(LoginStreak::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(LoginStreak::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(LoginStreak::UserId).uuid().not_null().unique_key())
                    .col(ColumnDef::new(LoginStreak::CurrentStreak).integer().not_null().default(0))
                    .col(ColumnDef::new(LoginStreak::BestStreak).integer().not_null().default(0))
                    .col(ColumnDef::new(LoginStreak::TotalLoginDays).integer().not_null().default(0))
                    .col(ColumnDef::new(LoginStreak::LastLoginDate).date().not_null())
                    .col(ColumnDef::new(LoginStreak::DailyRewardClaimed).boolean().not_null().default(false))
                    .col(ColumnDef::new(LoginStreak::LastRewardDate).date())
                    .to_owned(),
            )
            .await?;

        // ═══════════════════════════════════════════════════════════════════════════
        // SEED: Missions quotidiennes de base
        // ═══════════════════════════════════════════════════════════════════════════
        let insert_missions = Query::insert()
            .into_table(DailyMission::Table)
            .columns([
                DailyMission::Id, DailyMission::MissionKey, DailyMission::Name, DailyMission::Description,
                DailyMission::MissionType, DailyMission::Target, DailyMission::RequiredAmount,
                DailyMission::Difficulty, DailyMission::RewardMetal, DailyMission::RewardCrystal,
                DailyMission::RewardDeuterium, DailyMission::RewardXp, DailyMission::IsActive
            ])
            // Easy missions
            .values_panic(["a0000001-0000-0000-0000-000000000001".into(), "build_hunters_5".into(), "Escadron de chasse".into(), "Construisez 5 chasseurs légers".into(), "build".into(), "light_hunter".into(), 5.into(), "easy".into(), 1000.0.into(), 500.0.into(), 0.0.into(), 10.into(), true.into()])
            .values_panic(["a0000001-0000-0000-0000-000000000002".into(), "collect_metal_10k".into(), "Mineur assidu".into(), "Collectez 10 000 de métal".into(), "collect".into(), "metal".into(), 10000.into(), "easy".into(), 2000.0.into(), 0.0.into(), 0.0.into(), 10.into(), true.into()])
            .values_panic(["a0000001-0000-0000-0000-000000000003".into(), "upgrade_building_1".into(), "Constructeur".into(), "Améliorez n'importe quel bâtiment".into(), "upgrade".into(), "any".into(), 1.into(), "easy".into(), 500.0.into(), 500.0.into(), 0.0.into(), 10.into(), true.into()])
            // Medium missions
            .values_panic(["a0000001-0000-0000-0000-000000000004".into(), "expedition_2".into(), "Explorateur".into(), "Lancez 2 expéditions".into(), "expedition".into(), "any".into(), 2.into(), "medium".into(), 3000.0.into(), 2000.0.into(), 500.0.into(), 25.into(), true.into()])
            .values_panic(["a0000001-0000-0000-0000-000000000005".into(), "spy_3".into(), "Agent secret".into(), "Espionnez 3 planètes ennemies".into(), "spy".into(), "any".into(), 3.into(), "medium".into(), 2000.0.into(), 3000.0.into(), 0.0.into(), 25.into(), true.into()])
            .values_panic(["a0000001-0000-0000-0000-000000000006".into(), "build_cruisers_3".into(), "Flotte de croisière".into(), "Construisez 3 croiseurs".into(), "build".into(), "cruiser".into(), 3.into(), "medium".into(), 5000.0.into(), 3000.0.into(), 1000.0.into(), 25.into(), true.into()])
            // Hard missions
            .values_panic(["a0000001-0000-0000-0000-000000000007".into(), "attack_1".into(), "Conquérant".into(), "Attaquez une planète ennemie".into(), "attack".into(), "any".into(), 1.into(), "hard".into(), 10000.0.into(), 5000.0.into(), 2000.0.into(), 50.into(), true.into()])
            .values_panic(["a0000001-0000-0000-0000-000000000008".into(), "transport_5k".into(), "Logisticien".into(), "Transportez 5 000 ressources au total".into(), "transport".into(), "any".into(), 5000.into(), "hard".into(), 5000.0.into(), 5000.0.into(), 2000.0.into(), 50.into(), true.into()])
            .to_owned();

        manager.exec_stmt(insert_missions).await?;

        // ═══════════════════════════════════════════════════════════════════════════
        // SEED: Achievements de base
        // ═══════════════════════════════════════════════════════════════════════════
        let insert_achievements = Query::insert()
            .into_table(Achievement::Table)
            .columns([
                Achievement::Id, Achievement::AchievementKey, Achievement::Name, Achievement::Description,
                Achievement::Category, Achievement::Icon, Achievement::Color, Achievement::ConditionType,
                Achievement::ConditionTarget, Achievement::ConditionValue, Achievement::Points,
                Achievement::Rarity, Achievement::DisplayOrder, Achievement::IsActive
            ])
            // Combat achievements
            .values_panic(["b0000001-0000-0000-0000-000000000001".into(), "first_attack".into(), "Premier sang".into(), "Lancez votre première attaque".into(), "combat".into(), "⚔️".into(), "#ef4444".into(), "count".into(), "attacks".into(), 1.into(), 10.into(), "common".into(), 1.into(), true.into()])
            .values_panic(["b0000001-0000-0000-0000-000000000002".into(), "attacks_10".into(), "Guerrier".into(), "Lancez 10 attaques".into(), "combat".into(), "🗡️".into(), "#f97316".into(), "count".into(), "attacks".into(), 10.into(), 25.into(), "uncommon".into(), 2.into(), true.into()])
            .values_panic(["b0000001-0000-0000-0000-000000000003".into(), "attacks_50".into(), "Commandant".into(), "Lancez 50 attaques".into(), "combat".into(), "⚡".into(), "#8b5cf6".into(), "count".into(), "attacks".into(), 50.into(), 50.into(), "rare".into(), 3.into(), true.into()])
            .values_panic(["b0000001-0000-0000-0000-000000000004".into(), "victories_25".into(), "Invincible".into(), "Gagnez 25 combats".into(), "combat".into(), "🏆".into(), "#eab308".into(), "count".into(), "victories".into(), 25.into(), 100.into(), "epic".into(), 4.into(), true.into()])
            // Economy achievements
            .values_panic(["b0000001-0000-0000-0000-000000000005".into(), "metal_100k".into(), "Mineur de bronze".into(), "Collectez 100 000 de métal au total".into(), "economy".into(), "🪨".into(), "#78716c".into(), "threshold".into(), "total_metal".into(), 100000.into(), 10.into(), "common".into(), 10.into(), true.into()])
            .values_panic(["b0000001-0000-0000-0000-000000000006".into(), "metal_1m".into(), "Mineur d'argent".into(), "Collectez 1 000 000 de métal au total".into(), "economy".into(), "⛏️".into(), "#a8a29e".into(), "threshold".into(), "total_metal".into(), 1000000.into(), 50.into(), "rare".into(), 11.into(), true.into()])
            .values_panic(["b0000001-0000-0000-0000-000000000007".into(), "buildings_10".into(), "Architecte".into(), "Construisez 10 bâtiments".into(), "economy".into(), "🏗️".into(), "#3b82f6".into(), "count".into(), "buildings".into(), 10.into(), 25.into(), "uncommon".into(), 15.into(), true.into()])
            // Exploration achievements
            .values_panic(["b0000001-0000-0000-0000-000000000008".into(), "expeditions_10".into(), "Explorateur".into(), "Complétez 10 expéditions".into(), "exploration".into(), "🚀".into(), "#06b6d4".into(), "count".into(), "expeditions".into(), 10.into(), 25.into(), "uncommon".into(), 20.into(), true.into()])
            .values_panic(["b0000001-0000-0000-0000-000000000009".into(), "expeditions_50".into(), "Pionnier".into(), "Complétez 50 expéditions".into(), "exploration".into(), "🌟".into(), "#8b5cf6".into(), "count".into(), "expeditions".into(), 50.into(), 75.into(), "rare".into(), 21.into(), true.into()])
            .values_panic(["b0000001-0000-0000-0000-000000000010".into(), "spy_missions_20".into(), "Maître espion".into(), "Réalisez 20 missions d'espionnage".into(), "exploration".into(), "🕵️".into(), "#1e293b".into(), "count".into(), "spy_missions".into(), 20.into(), 50.into(), "rare".into(), 22.into(), true.into()])
            // Social achievements
            .values_panic(["b0000001-0000-0000-0000-000000000011".into(), "join_alliance".into(), "Diplomate".into(), "Rejoignez une alliance".into(), "social".into(), "🤝".into(), "#22c55e".into(), "unique".into(), "alliance_join".into(), 1.into(), 15.into(), "common".into(), 30.into(), true.into()])
            .values_panic(["b0000001-0000-0000-0000-000000000012".into(), "create_alliance".into(), "Fondateur".into(), "Créez votre propre alliance".into(), "social".into(), "👑".into(), "#eab308".into(), "unique".into(), "alliance_create".into(), 1.into(), 50.into(), "rare".into(), 31.into(), true.into()])
            .values_panic(["b0000001-0000-0000-0000-000000000013".into(), "messages_50".into(), "Communicateur".into(), "Envoyez 50 messages".into(), "social".into(), "💬".into(), "#64748b".into(), "count".into(), "messages".into(), 50.into(), 25.into(), "uncommon".into(), 32.into(), true.into()])
            // Special achievements
            .values_panic(["b0000001-0000-0000-0000-000000000014".into(), "streak_7".into(), "Habitué".into(), "Connectez-vous 7 jours consécutifs".into(), "special".into(), "🔥".into(), "#f97316".into(), "threshold".into(), "login_streak".into(), 7.into(), 30.into(), "uncommon".into(), 40.into(), true.into()])
            .values_panic(["b0000001-0000-0000-0000-000000000015".into(), "streak_30".into(), "Vétéran".into(), "Connectez-vous 30 jours consécutifs".into(), "special".into(), "💎".into(), "#06b6d4".into(), "threshold".into(), "login_streak".into(), 30.into(), 100.into(), "epic".into(), 41.into(), true.into()])
            .values_panic(["b0000001-0000-0000-0000-000000000016".into(), "fleet_100".into(), "Amiral".into(), "Possédez 100 vaisseaux simultanément".into(), "special".into(), "🛸".into(), "#8b5cf6".into(), "threshold".into(), "total_ships".into(), 100.into(), 75.into(), "rare".into(), 42.into(), true.into()])
            .values_panic(["b0000001-0000-0000-0000-000000000017".into(), "conquer_planet".into(), "Conquérant suprême".into(), "Conquérez une planète ennemie".into(), "special".into(), "🌍".into(), "#dc2626".into(), "unique".into(), "planet_conquered".into(), 1.into(), 150.into(), "legendary".into(), 50.into(), true.into()])
            .to_owned();

        manager.exec_stmt(insert_achievements).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(LoginStreak::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(UserAchievement::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(Achievement::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(UserDailyMission::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(DailyMission::Table).to_owned()).await
    }
}

#[derive(Iden)]
enum DailyMission {
    Table,
    Id,
    MissionKey,
    Name,
    Description,
    MissionType,
    Target,
    RequiredAmount,
    Difficulty,
    RewardMetal,
    RewardCrystal,
    RewardDeuterium,
    RewardXp,
    IsActive,
}

#[derive(Iden)]
enum UserDailyMission {
    Table,
    Id,
    UserId,
    MissionId,
    AssignedDate,
    CurrentProgress,
    Status,
    CompletedAt,
    ClaimedAt,
}

#[derive(Iden)]
enum Achievement {
    Table,
    Id,
    AchievementKey,
    Name,
    Description,
    Category,
    Icon,
    Color,
    ConditionType,
    ConditionTarget,
    ConditionValue,
    Points,
    Rarity,
    DisplayOrder,
    IsActive,
}

#[derive(Iden)]
enum UserAchievement {
    Table,
    Id,
    UserId,
    AchievementId,
    CurrentProgress,
    Unlocked,
    UnlockedAt,
    Displayed,
}

#[derive(Iden)]
enum LoginStreak {
    Table,
    Id,
    UserId,
    CurrentStreak,
    BestStreak,
    TotalLoginDays,
    LastLoginDate,
    DailyRewardClaimed,
    LastRewardDate,
}
