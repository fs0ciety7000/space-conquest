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
mod m20260112_043825_add_shipyard_level;
mod m20260112_054113_add_hangar_level;
mod m20260112_060815_create_construction_queue;

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
            Box::new(m20260112_043825_add_shipyard_level::Migration),
            Box::new(m20260112_054113_add_hangar_level::Migration),
            Box::new(m20260112_060815_create_construction_queue::Migration),
        ]
    }
}
