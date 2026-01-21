use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Fix sequence for server_config auto-increment
        // Previous migrations used hardcoded IDs, so we need to update the sequence
        db.execute_unprepared(
            "SELECT setval(pg_get_serial_sequence('server_config', 'id'),
                          COALESCE((SELECT MAX(id) FROM server_config), 0) + 1,
                          false)"
        ).await?;

        // Ajouter les configurations de maintenance
        db.execute_unprepared(
            "INSERT INTO server_config (config_key, config_value)
             VALUES ('maintenance_enabled', 'false')
             ON CONFLICT (config_key) DO NOTHING"
        ).await?;

        db.execute_unprepared(
            "INSERT INTO server_config (config_key, config_value)
             VALUES ('maintenance_message_title', 'MAINTENANCE PROGRAMMÉE')
             ON CONFLICT (config_key) DO NOTHING"
        ).await?;

        db.execute_unprepared(
            "INSERT INTO server_config (config_key, config_value)
             VALUES ('maintenance_message_description',
                     'Le serveur est en maintenance pour une mise à jour majeure.
Vos comptes et ressources seront préservés.
Merci de votre patience !')
             ON CONFLICT (config_key) DO NOTHING"
        ).await?;

        db.execute_unprepared(
            "INSERT INTO server_config (config_key, config_value)
             VALUES ('maintenance_estimated_duration', '15-30 minutes')
             ON CONFLICT (config_key) DO NOTHING"
        ).await?;

        db.execute_unprepared(
            "INSERT INTO server_config (config_key, config_value)
             VALUES ('maintenance_start_time', '')
             ON CONFLICT (config_key) DO NOTHING"
        ).await?;

        db.execute_unprepared(
            "INSERT INTO server_config (config_key, config_value)
             VALUES ('maintenance_auto_disable_at', '')
             ON CONFLICT (config_key) DO NOTHING"
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        let _ = db.execute_unprepared(
            "DELETE FROM server_config WHERE config_key IN (
                'maintenance_enabled',
                'maintenance_message_title',
                'maintenance_message_description',
                'maintenance_estimated_duration',
                'maintenance_start_time',
                'maintenance_auto_disable_at'
            )"
        ).await;

        Ok(())
    }
}
