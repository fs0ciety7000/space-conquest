pub use sea_orm_migration::prelude::*;

mod m20220101_000001_create_table;
mod m20260109_001344_add_construction_time;
mod m20260109_002654_add_other_resources;
mod m20260109_003719_add_construction_type;
mod m20260109_005503_add_fleet_and_shipyard;
mod m20260109_013834_update_planet_table;
mod m20260109_014709_create_user_table;
mod m20260109_023850_add_ships_and_pending_system;
mod m20260109_195343_add_unread_report;
mod m20260109_200503_create_combat_log;
mod m20260109_202322_add_espionage;
mod m20260109_210008_add_password;
mod m20260109_211546_add_defenses;
mod m20260109_220528_add_debris;
mod m20260109_222210_add_coordinates;
mod m20260111_210917_add_colony_ship;
mod m20260111_213610_add_transporter;
mod m20260111_222219_create_fleet_mission;
mod m20260111_223746_create_transport_log;
mod m20260112_004006_create_message_table;
mod m20260112_032740_add_solar_plant;
mod m20260112_054113_add_hangar_level;
mod m20260112_060815_create_construction_queue;
mod m20260112_072815_add_usernames_to_logs;
mod m20260112_152510_add_armour_tech;
mod m20260118_000001_create_conversation_system;
mod m20260118_000002_add_conversation_archived;
mod m20260118_000003_add_created_at_to_users;
mod m20260118_200000_create_market_system;
mod m20260119_000001_add_created_at_to_planets;
mod m20260119_000002_add_detailed_report_to_combat_log;
mod m20260119_000003_create_server_config;
mod m20260119_000004_create_resource_slots;
mod m20260119_100000_add_role_to_users;
mod m20260119_200000_create_alliance_system;
mod m20260119_300000_create_missions_achievements;
mod m20260119_400000_create_officers_system;
mod m20260119_400001_seed_officers;
mod m20260120_000001_add_resource_storage;
mod m20260120_000002_create_sabotage_system;
mod m20260120_000003_create_casus_belli;
mod m20260120_000004_populate_server_config;
mod m20260120_000005_add_game_mechanics_config;
mod m20260120_000006_create_announcements;
mod m20260125_000001_expansion_update;
mod m20260125_000002_expansion_config;
mod m20260125_100001_create_tech_tree_system;
mod m20260125_100002_seed_tech_tree_data;
mod m20260125_100003_migrate_planet_data;
mod m20260125_100004_add_research_tracking_columns;
mod m20260125_100005_add_build_time_columns;
mod m20260125_100006_add_ship_building_columns;
mod m20260125_200001_create_complete_expansion_system;
mod m20260125_200002_seed_complete_expansion_data;
mod m20260125_200003_fix_missing_time_columns;
mod m20260126_000001_add_fleet_data_column;
mod m20260121_000001_add_flight_speed_config;
mod m20260121_000002_add_homeworld_system;
mod m20260121_000003_add_maintenance_system;
mod m20260127_000001_create_beginner_protection;
mod m20260127_000002_fix_graviton_costs;
mod m20260128_000001_create_global_chat;
mod m20260306_000001_drop_legacy_planet_columns;
mod m20260306_000002_mission_tiers;
mod m20260306_000003_user_profile_and_friends;
mod m20260306_000004_fleet_presets;
mod m20260306_000005_planetary_biomes;
mod m20260306_000006_bounty_board;
mod m20260306_000007_flagship;
mod m20260306_000008_password_reset;
mod m20260306_000009_add_display_name;
mod m20260307_000001_trade_routes;
mod m20260307_000002_build_queue;
mod m20260307_000003_planet_market;
mod m20260307_000004_ship_building_requirements;
mod m20260307_000005_syndicate_credits;
mod m20260307_000006_black_market;
mod m20260307_000007_black_market_seed;
mod m20260307_000008_economy_log;
mod m20260307_000009_sc_chance_update;
mod m20260308_000001_create_notifications;
mod m20260308_000002_add_score_columns_to_user;
mod m20260309_000001_create_debris_field;
mod m20260309_000002_system_messages_and_pve;
mod m20260309_000003_planet_combat_zone;
mod m20260310_000001_backfill_resource_slots;
mod m20260312_000001_refactor_speed_config;
mod m20260312_000002_entity_metadata;
mod m20260312_000003_enhance_casus_belli;
mod m20260313_000001_notification_report_id_mission_departure;
mod m20260314_000001_governance_laws_surveys;
mod m20260314_000002_set_phantomhex_admin;
mod m20261001_000001_rebalance_officer_costs;
mod m20261001_000002_expand_missions;
mod m20261002_000001_fix_building_descriptions;
mod m20261002_000002_black_market_active_items;
mod m20261002_000003_acs_system;
mod m20261002_000004_user_ui_prefs;
mod m20260313_000002_disable_phantom_buildings;
mod m20261005_000001_rapid_fire_defense_rules;
mod m20261005_000002_fix_transporter_cargo;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20220101_000001_create_table::Migration),
            Box::new(m20260109_001344_add_construction_time::Migration),
            Box::new(m20260109_002654_add_other_resources::Migration),
            Box::new(m20260109_003719_add_construction_type::Migration),
            Box::new(m20260109_005503_add_fleet_and_shipyard::Migration),
            Box::new(m20260109_013834_update_planet_table::Migration),
            Box::new(m20260109_014709_create_user_table::Migration),
            Box::new(m20260109_023850_add_ships_and_pending_system::Migration),
            Box::new(m20260109_195343_add_unread_report::Migration),
            Box::new(m20260109_200503_create_combat_log::Migration),
            Box::new(m20260109_202322_add_espionage::Migration),
            Box::new(m20260109_210008_add_password::Migration),
            Box::new(m20260109_211546_add_defenses::Migration),
            Box::new(m20260109_220528_add_debris::Migration),
            Box::new(m20260109_222210_add_coordinates::Migration),
            Box::new(m20260111_210917_add_colony_ship::Migration),
            Box::new(m20260111_213610_add_transporter::Migration),
            Box::new(m20260111_222219_create_fleet_mission::Migration),
            Box::new(m20260111_223746_create_transport_log::Migration),
            Box::new(m20260112_004006_create_message_table::Migration),
            Box::new(m20260112_032740_add_solar_plant::Migration),
            Box::new(m20260112_054113_add_hangar_level::Migration),
            Box::new(m20260112_060815_create_construction_queue::Migration),
            Box::new(m20260112_072815_add_usernames_to_logs::Migration),
            Box::new(m20260112_152510_add_armour_tech::Migration),
            Box::new(m20260118_000001_create_conversation_system::Migration),
            Box::new(m20260118_000002_add_conversation_archived::Migration),
            Box::new(m20260118_000003_add_created_at_to_users::Migration),
            Box::new(m20260118_200000_create_market_system::Migration),
            Box::new(m20260119_000001_add_created_at_to_planets::Migration),
            Box::new(m20260119_000002_add_detailed_report_to_combat_log::Migration),
            Box::new(m20260119_000003_create_server_config::Migration),
            Box::new(m20260119_000004_create_resource_slots::Migration),
            Box::new(m20260119_100000_add_role_to_users::Migration),
            Box::new(m20260119_200000_create_alliance_system::Migration),
            Box::new(m20260119_300000_create_missions_achievements::Migration),
            Box::new(m20260119_400000_create_officers_system::Migration),
            Box::new(m20260119_400001_seed_officers::Migration),
            Box::new(m20260120_000001_add_resource_storage::Migration),
            Box::new(m20260120_000002_create_sabotage_system::Migration),
            Box::new(m20260120_000003_create_casus_belli::Migration),
            Box::new(m20260120_000004_populate_server_config::Migration),
            Box::new(m20260120_000005_add_game_mechanics_config::Migration),
            Box::new(m20260120_000006_create_announcements::Migration),
            Box::new(m20260125_000001_expansion_update::Migration),
            Box::new(m20260125_000002_expansion_config::Migration),
            Box::new(m20260125_100001_create_tech_tree_system::Migration),
            Box::new(m20260125_100002_seed_tech_tree_data::Migration),
            Box::new(m20260125_100003_migrate_planet_data::Migration),
            Box::new(m20260125_100004_add_research_tracking_columns::Migration),
            Box::new(m20260125_100005_add_build_time_columns::Migration),
            Box::new(m20260125_100006_add_ship_building_columns::Migration),
            Box::new(m20260125_200001_create_complete_expansion_system::Migration),
            Box::new(m20260125_200002_seed_complete_expansion_data::Migration),
            Box::new(m20260125_200003_fix_missing_time_columns::Migration),
            Box::new(m20260126_000001_add_fleet_data_column::Migration),
            Box::new(m20260121_000001_add_flight_speed_config::Migration),
            Box::new(m20260121_000002_add_homeworld_system::Migration),
            Box::new(m20260121_000003_add_maintenance_system::Migration),
            Box::new(m20260127_000001_create_beginner_protection::Migration),
            Box::new(m20260127_000002_fix_graviton_costs::Migration),
            Box::new(m20260128_000001_create_global_chat::Migration),
            Box::new(m20260306_000001_drop_legacy_planet_columns::Migration),
            Box::new(m20260306_000002_mission_tiers::Migration),
            Box::new(m20260306_000003_user_profile_and_friends::Migration),
            Box::new(m20260306_000004_fleet_presets::Migration),
            Box::new(m20260306_000005_planetary_biomes::Migration),
            Box::new(m20260306_000006_bounty_board::Migration),
            Box::new(m20260306_000007_flagship::Migration),
            Box::new(m20260306_000008_password_reset::Migration),
            Box::new(m20260306_000009_add_display_name::Migration),
            Box::new(m20260307_000001_trade_routes::Migration),
            Box::new(m20260307_000002_build_queue::Migration),
            Box::new(m20260307_000003_planet_market::Migration),
            Box::new(m20260307_000004_ship_building_requirements::Migration),
            Box::new(m20260307_000005_syndicate_credits::Migration),
            Box::new(m20260307_000006_black_market::Migration),
            Box::new(m20260307_000007_black_market_seed::Migration),
            Box::new(m20260307_000008_economy_log::Migration),
            Box::new(m20260307_000009_sc_chance_update::Migration),
            Box::new(m20260308_000001_create_notifications::Migration),
            Box::new(m20260308_000002_add_score_columns_to_user::Migration),
            Box::new(m20260309_000001_create_debris_field::Migration),
            Box::new(m20260309_000002_system_messages_and_pve::Migration),
            Box::new(m20260309_000003_planet_combat_zone::Migration),
            Box::new(m20260310_000001_backfill_resource_slots::Migration),
            Box::new(m20260312_000001_refactor_speed_config::Migration),
            Box::new(m20260312_000002_entity_metadata::Migration),
            Box::new(m20260312_000003_enhance_casus_belli::Migration),
            Box::new(m20260313_000001_notification_report_id_mission_departure::Migration),
            Box::new(m20260314_000001_governance_laws_surveys::Migration),
            Box::new(m20260314_000002_set_phantomhex_admin::Migration),
            Box::new(m20261001_000001_rebalance_officer_costs::Migration),
            Box::new(m20261001_000002_expand_missions::Migration),
            Box::new(m20261002_000001_fix_building_descriptions::Migration),
            Box::new(m20261002_000002_black_market_active_items::Migration),
            Box::new(m20261002_000003_acs_system::Migration),
            Box::new(m20260313_000002_disable_phantom_buildings::Migration),
            Box::new(m20261002_000004_user_ui_prefs::Migration),
            Box::new(m20261005_000001_rapid_fire_defense_rules::Migration),
            Box::new(m20261005_000002_fix_transporter_cargo::Migration),
        ]
    }
}
