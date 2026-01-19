use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Créer la table server_config
        manager
            .create_table(
                Table::create()
                    .table(ServerConfig::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ServerConfig::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key()
                    )
                    .col(
                        ColumnDef::new(ServerConfig::ConfigKey)
                            .string()
                            .not_null()
                            .unique_key()
                    )
                    .col(
                        ColumnDef::new(ServerConfig::ConfigValue)
                            .string()
                            .not_null()
                    )
                    .col(
                        ColumnDef::new(ServerConfig::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp())
                    )
                    .to_owned(),
            )
            .await?;

        // Insérer les valeurs par défaut
        manager
            .exec_stmt(
                Query::insert()
                    .into_table(ServerConfig::Table)
                    .columns([
                        ServerConfig::ConfigKey,
                        ServerConfig::ConfigValue,
                    ])
                    .values_panic([
                        "speed_factor".into(),
                        "500.0".into(),
                    ])
                    .to_owned()
            )
            .await?;

        manager
            .exec_stmt(
                Query::insert()
                    .into_table(ServerConfig::Table)
                    .columns([
                        ServerConfig::ConfigKey,
                        ServerConfig::ConfigValue,
                    ])
                    .values_panic([
                        "construction_speed_multiplier".into(),
                        "1.0".into(),
                    ])
                    .to_owned()
            )
            .await?;

        manager
            .exec_stmt(
                Query::insert()
                    .into_table(ServerConfig::Table)
                    .columns([
                        ServerConfig::ConfigKey,
                        ServerConfig::ConfigValue,
                    ])
                    .values_panic([
                        "mining_speed_multiplier".into(),
                        "1.0".into(),
                    ])
                    .to_owned()
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(ServerConfig::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum ServerConfig {
    Table,
    Id,
    ConfigKey,
    ConfigValue,
    UpdatedAt,
}
