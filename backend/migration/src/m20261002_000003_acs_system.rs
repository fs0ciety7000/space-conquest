use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20261002_000003_acs_system"
    }
}

/// M7 — ACS (Allied Combat System)
///
/// Creates `acs_group` table to coordinate multi-fleet attacks from allied players.
/// Adds nullable `acs_group_id` column to `fleet_mission` so individual missions
/// can be linked to a coordination group.
///
/// Status flow: forming -> in_flight -> holding -> resolved | expired
#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Create the acs_group table
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("acs_group"))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .uuid()
                            .not_null()
                            .primary_key()
                            .default(Expr::cust("gen_random_uuid()")),
                    )
                    .col(
                        ColumnDef::new(Alias::new("leader_user_id"))
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("target_planet_id"))
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("status"))
                            .string_len(32)
                            .not_null()
                            .default("forming"),
                    )
                    // Timestamp from which the 30-min holding window counts down.
                    // Set when the leader's fleet_mission arrival_time is reached.
                    .col(
                        ColumnDef::new(Alias::new("holding_until"))
                            .timestamp()
                            .null(),
                    )
                    // Minutes after creation during which new members can join.
                    // Once expires_at passes without a fleet being dispatched, group -> expired.
                    .col(
                        ColumnDef::new(Alias::new("max_join_minutes"))
                            .integer()
                            .not_null()
                            .default(30),
                    )
                    .col(
                        ColumnDef::new(Alias::new("expires_at"))
                            .timestamp()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("created_at"))
                            .timestamp()
                            .not_null()
                            .default(Expr::cust("NOW()")),
                    )
                    .col(
                        ColumnDef::new(Alias::new("resolved_at"))
                            .timestamp()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Index for fast lookup by leader and by status (tick system polls by status)
        manager
            .create_index(
                Index::create()
                    .name("idx_acs_group_leader")
                    .table(Alias::new("acs_group"))
                    .col(Alias::new("leader_user_id"))
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_acs_group_status")
                    .table(Alias::new("acs_group"))
                    .col(Alias::new("status"))
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // 2. Add acs_group_id column to fleet_mission
        // Nullable: NULL means a solo mission (no ACS group).
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("fleet_mission"))
                    .add_column_if_not_exists(
                        ColumnDef::new(Alias::new("acs_group_id"))
                            .uuid()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Index on acs_group_id so the tick can fetch all missions in a group in O(members)
        manager
            .create_index(
                Index::create()
                    .name("idx_fleet_mission_acs_group")
                    .table(Alias::new("fleet_mission"))
                    .col(Alias::new("acs_group_id"))
                    .if_not_exists()
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("fleet_mission"))
                    .drop_column(Alias::new("acs_group_id"))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table(Alias::new("acs_group")).to_owned())
            .await
    }
}
