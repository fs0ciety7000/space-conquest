use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ==================== ADD PROTECTION FIELDS TO USER TABLE ====================

        // Add protection_until field (timestamp when beginner protection expires)
        manager
            .alter_table(
                Table::alter()
                    .table(User::Table)
                    .add_column(
                        ColumnDef::new(User::ProtectionUntil)
                            .timestamp()
                            .null() // Nullable - only set for new users
                    )
                    .to_owned(),
            )
            .await?;

        // Add total_points field for attack restrictions
        manager
            .alter_table(
                Table::alter()
                    .table(User::Table)
                    .add_column(
                        ColumnDef::new(User::TotalPoints)
                            .big_integer()
                            .not_null()
                            .default(0)
                    )
                    .to_owned(),
            )
            .await?;

        // ==================== ADD BEGINNER PROTECTION CONFIG TO SERVER_CONFIG ====================

        // Beginner protection duration in days (3 days default)
        manager
            .exec_stmt(
                Query::insert()
                    .into_table(ServerConfig::Table)
                    .columns([
                        ServerConfig::ConfigKey,
                        ServerConfig::ConfigValue,
                    ])
                    .values_panic([
                        "beginner_protection_days".into(),
                        "3".into(),
                    ])
                    .on_conflict(
                        OnConflict::column(ServerConfig::ConfigKey)
                            .do_nothing()
                            .to_owned()
                    )
                    .to_owned()
            )
            .await?;

        // Beginner zone - maximum galaxy number for protected zone
        manager
            .exec_stmt(
                Query::insert()
                    .into_table(ServerConfig::Table)
                    .columns([
                        ServerConfig::ConfigKey,
                        ServerConfig::ConfigValue,
                    ])
                    .values_panic([
                        "beginner_zone_galaxy_max".into(),
                        "1".into(),
                    ])
                    .on_conflict(
                        OnConflict::column(ServerConfig::ConfigKey)
                            .do_nothing()
                            .to_owned()
                    )
                    .to_owned()
            )
            .await?;

        // Minimum points ratio for attacks (can't attack players with less than X% of your points)
        manager
            .exec_stmt(
                Query::insert()
                    .into_table(ServerConfig::Table)
                    .columns([
                        ServerConfig::ConfigKey,
                        ServerConfig::ConfigValue,
                    ])
                    .values_panic([
                        "attack_min_points_ratio".into(),
                        "0.2".into(),
                    ])
                    .on_conflict(
                        OnConflict::column(ServerConfig::ConfigKey)
                            .do_nothing()
                            .to_owned()
                    )
                    .to_owned()
            )
            .await?;

        // Maximum points ratio for attacks (can't attack players with more than X times your points)
        manager
            .exec_stmt(
                Query::insert()
                    .into_table(ServerConfig::Table)
                    .columns([
                        ServerConfig::ConfigKey,
                        ServerConfig::ConfigValue,
                    ])
                    .values_panic([
                        "attack_max_points_ratio".into(),
                        "5.0".into(),
                    ])
                    .on_conflict(
                        OnConflict::column(ServerConfig::ConfigKey)
                            .do_nothing()
                            .to_owned()
                    )
                    .to_owned()
            )
            .await?;

        // Enable/disable beginner protection system
        manager
            .exec_stmt(
                Query::insert()
                    .into_table(ServerConfig::Table)
                    .columns([
                        ServerConfig::ConfigKey,
                        ServerConfig::ConfigValue,
                    ])
                    .values_panic([
                        "beginner_protection_enabled".into(),
                        "true".into(),
                    ])
                    .on_conflict(
                        OnConflict::column(ServerConfig::ConfigKey)
                            .do_nothing()
                            .to_owned()
                    )
                    .to_owned()
            )
            .await?;

        // Duration of protection in beginner zone (independent of registration date)
        manager
            .exec_stmt(
                Query::insert()
                    .into_table(ServerConfig::Table)
                    .columns([
                        ServerConfig::ConfigKey,
                        ServerConfig::ConfigValue,
                    ])
                    .values_panic([
                        "beginner_zone_protection_enabled".into(),
                        "true".into(),
                    ])
                    .on_conflict(
                        OnConflict::column(ServerConfig::ConfigKey)
                            .do_nothing()
                            .to_owned()
                    )
                    .to_owned()
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove protection fields from user table
        manager
            .alter_table(
                Table::alter()
                    .table(User::Table)
                    .drop_column(User::TotalPoints)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(User::Table)
                    .drop_column(User::ProtectionUntil)
                    .to_owned(),
            )
            .await?;

        // Remove config entries
        manager
            .exec_stmt(
                Query::delete()
                    .from_table(ServerConfig::Table)
                    .and_where(Expr::col(ServerConfig::ConfigKey).is_in([
                        "beginner_protection_days",
                        "beginner_zone_galaxy_max",
                        "attack_min_points_ratio",
                        "attack_max_points_ratio",
                        "beginner_protection_enabled",
                        "beginner_zone_protection_enabled",
                    ]))
                    .to_owned()
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum User {
    Table,
    ProtectionUntil,
    TotalPoints,
}

#[derive(Iden)]
enum ServerConfig {
    Table,
    ConfigKey,
    ConfigValue,
}
