use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // ==================== BUILD QUEUE ITEM TABLE ====================
        // Stores pending (not-yet-started) build tasks per planet per category.
        // Active builds stay in their existing tables (planet_ship, planet_defense,
        // planet_technology, construction_queue). This table is the waiting room.
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("build_queue_item"))
                    .if_not_exists()
                    .col(ColumnDef::new(Alias::new("id")).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Alias::new("planet_id")).uuid().not_null())
                    // 'research', 'ships', 'defenses', 'resources', 'facilities'
                    .col(ColumnDef::new(Alias::new("category")).string().not_null())
                    // tech_key / ship_key / defense_key / building_key
                    .col(ColumnDef::new(Alias::new("item_key")).string().not_null())
                    // For ships/defenses: quantity to build. For buildings/research: 1 (target_level used)
                    .col(ColumnDef::new(Alias::new("quantity")).integer().not_null().default(1))
                    // For buildings/research: the level to upgrade to
                    .col(ColumnDef::new(Alias::new("target_level")).integer().null())
                    // Position in queue (lower = higher priority). Drag/drop updates this.
                    .col(ColumnDef::new(Alias::new("queue_position")).integer().not_null().default(0))
                    .col(ColumnDef::new(Alias::new("created_at")).timestamp().not_null())
                    .to_owned(),
            )
            .await?;

        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_build_queue_planet ON build_queue_item(planet_id, category, queue_position)"
        ).await?;

        // ==================== SLOT CONFIG KEYS ====================
        // Default slots per category. Can be overridden via admin panel.
        // Actual effective slots = config value + tech/building bonuses.
        let configs = [
            // Base slots (without tech bonuses)
            ("queue_slots_research_base", "1"),
            ("queue_slots_ships_base", "1"),
            ("queue_slots_defenses_base", "1"),
            ("queue_slots_resources_base", "1"),
            ("queue_slots_facilities_base", "1"),
            // Tech bonus scaling factors:
            // Research: +1 slot every N Research Lab levels
            ("queue_research_lab_levels_per_slot", "10"),
            // Ships: +1 slot every N Shipyard levels
            ("queue_shipyard_levels_per_slot", "5"),
            // Facilities: +1 slot per Nanite Factory level
            ("queue_nanite_factory_per_slot", "1"),
        ];

        for (key, value) in configs {
            db.execute_unprepared(&format!(
                "INSERT INTO server_config (config_key, config_value) VALUES ('{}', '{}') ON CONFLICT (config_key) DO NOTHING",
                key, value
            )).await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(Alias::new("build_queue_item")).if_exists().to_owned()).await
    }
}
