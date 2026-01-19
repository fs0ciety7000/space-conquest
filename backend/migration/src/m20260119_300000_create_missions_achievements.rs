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
        // SEED: Missions quotidiennes de base (using raw SQL for UUID support)
        // ═══════════════════════════════════════════════════════════════════════════
        manager.get_connection().execute_unprepared(
            r#"
            INSERT INTO daily_mission (id, mission_key, name, description, mission_type, target, required_amount, difficulty, reward_metal, reward_crystal, reward_deuterium, reward_xp, is_active) VALUES
            ('a0000001-0000-0000-0000-000000000001'::uuid, 'build_hunters_5', 'Escadron de chasse', 'Construisez 5 chasseurs légers', 'build', 'light_hunter', 5, 'easy', 1000.0, 500.0, 0.0, 10, true),
            ('a0000001-0000-0000-0000-000000000002'::uuid, 'collect_metal_10k', 'Mineur assidu', 'Collectez 10 000 de métal', 'collect', 'metal', 10000, 'easy', 2000.0, 0.0, 0.0, 10, true),
            ('a0000001-0000-0000-0000-000000000003'::uuid, 'upgrade_building_1', 'Constructeur', 'Améliorez n''importe quel bâtiment', 'upgrade', 'any', 1, 'easy', 500.0, 500.0, 0.0, 10, true),
            ('a0000001-0000-0000-0000-000000000004'::uuid, 'expedition_2', 'Explorateur', 'Lancez 2 expéditions', 'expedition', 'any', 2, 'medium', 3000.0, 2000.0, 500.0, 25, true),
            ('a0000001-0000-0000-0000-000000000005'::uuid, 'spy_3', 'Agent secret', 'Espionnez 3 planètes ennemies', 'spy', 'any', 3, 'medium', 2000.0, 3000.0, 0.0, 25, true),
            ('a0000001-0000-0000-0000-000000000006'::uuid, 'build_cruisers_3', 'Flotte de croisière', 'Construisez 3 croiseurs', 'build', 'cruiser', 3, 'medium', 5000.0, 3000.0, 1000.0, 25, true),
            ('a0000001-0000-0000-0000-000000000007'::uuid, 'attack_1', 'Conquérant', 'Attaquez une planète ennemie', 'attack', 'any', 1, 'hard', 10000.0, 5000.0, 2000.0, 50, true),
            ('a0000001-0000-0000-0000-000000000008'::uuid, 'transport_5k', 'Logisticien', 'Transportez 5 000 ressources au total', 'transport', 'any', 5000, 'hard', 5000.0, 5000.0, 2000.0, 50, true)
            ON CONFLICT (mission_key) DO NOTHING;
            "#
        ).await?;

        // ═══════════════════════════════════════════════════════════════════════════
        // SEED: Achievements de base (using raw SQL for UUID support)
        // ═══════════════════════════════════════════════════════════════════════════
        let _ = manager.get_connection().execute_unprepared(
            r#"
            INSERT INTO achievement (id, achievement_key, name, description, category, icon, color, condition_type, condition_target, condition_value, points, rarity, display_order, is_active) VALUES
            ('b0000001-0000-0000-0000-000000000001'::uuid, 'first_attack', 'Premier sang', 'Lancez votre première attaque', 'combat', '⚔️', '#ef4444', 'count', 'attacks', 1, 10, 'common', 1, true),
            ('b0000001-0000-0000-0000-000000000002'::uuid, 'attacks_10', 'Guerrier', 'Lancez 10 attaques', 'combat', '🗡️', '#f97316', 'count', 'attacks', 10, 25, 'uncommon', 2, true),
            ('b0000001-0000-0000-0000-000000000003'::uuid, 'attacks_50', 'Commandant', 'Lancez 50 attaques', 'combat', '⚡', '#8b5cf6', 'count', 'attacks', 50, 50, 'rare', 3, true),
            ('b0000001-0000-0000-0000-000000000004'::uuid, 'victories_25', 'Invincible', 'Gagnez 25 combats', 'combat', '🏆', '#eab308', 'count', 'victories', 25, 100, 'epic', 4, true),
            ('b0000001-0000-0000-0000-000000000005'::uuid, 'metal_100k', 'Mineur de bronze', 'Collectez 100 000 de métal au total', 'economy', '🪨', '#78716c', 'threshold', 'total_metal', 100000, 10, 'common', 10, true),
            ('b0000001-0000-0000-0000-000000000006'::uuid, 'metal_1m', 'Mineur d''argent', 'Collectez 1 000 000 de métal au total', 'economy', '⛏️', '#a8a29e', 'threshold', 'total_metal', 1000000, 50, 'rare', 11, true),
            ('b0000001-0000-0000-0000-000000000007'::uuid, 'buildings_10', 'Architecte', 'Construisez 10 bâtiments', 'economy', '🏗️', '#3b82f6', 'count', 'buildings', 10, 25, 'uncommon', 15, true),
            ('b0000001-0000-0000-0000-000000000008'::uuid, 'expeditions_10', 'Explorateur', 'Complétez 10 expéditions', 'exploration', '🚀', '#06b6d4', 'count', 'expeditions', 10, 25, 'uncommon', 20, true),
            ('b0000001-0000-0000-0000-000000000009'::uuid, 'expeditions_50', 'Pionnier', 'Complétez 50 expéditions', 'exploration', '🌟', '#8b5cf6', 'count', 'expeditions', 50, 75, 'rare', 21, true),
            ('b0000001-0000-0000-0000-000000000010'::uuid, 'spy_missions_20', 'Maître espion', 'Réalisez 20 missions d''espionnage', 'exploration', '🕵️', '#1e293b', 'count', 'spy_missions', 20, 50, 'rare', 22, true),
            ('b0000001-0000-0000-0000-000000000011'::uuid, 'join_alliance', 'Diplomate', 'Rejoignez une alliance', 'social', '🤝', '#22c55e', 'unique', 'alliance_join', 1, 15, 'common', 30, true),
            ('b0000001-0000-0000-0000-000000000012'::uuid, 'create_alliance', 'Fondateur', 'Créez votre propre alliance', 'social', '👑', '#eab308', 'unique', 'alliance_create', 1, 50, 'rare', 31, true),
            ('b0000001-0000-0000-0000-000000000013'::uuid, 'messages_50', 'Communicateur', 'Envoyez 50 messages', 'social', '💬', '#64748b', 'count', 'messages', 50, 25, 'uncommon', 32, true),
            ('b0000001-0000-0000-0000-000000000014'::uuid, 'streak_7', 'Habitué', 'Connectez-vous 7 jours consécutifs', 'special', '🔥', '#f97316', 'threshold', 'login_streak', 7, 30, 'uncommon', 40, true),
            ('b0000001-0000-0000-0000-000000000015'::uuid, 'streak_30', 'Vétéran', 'Connectez-vous 30 jours consécutifs', 'special', '💎', '#06b6d4', 'threshold', 'login_streak', 30, 100, 'epic', 41, true),
            ('b0000001-0000-0000-0000-000000000016'::uuid, 'fleet_100', 'Amiral', 'Possédez 100 vaisseaux simultanément', 'special', '🛸', '#8b5cf6', 'threshold', 'total_ships', 100, 75, 'rare', 42, true),
            ('b0000001-0000-0000-0000-000000000017'::uuid, 'conquer_planet', 'Conquérant suprême', 'Conquérez une planète ennemie', 'special', '🌍', '#dc2626', 'unique', 'planet_conquered', 1, 150, 'legendary', 50, true)
            ON CONFLICT (achievement_key) DO NOTHING;
            "#
        ).await?;

        Ok(())
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
