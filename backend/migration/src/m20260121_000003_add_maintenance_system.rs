use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Ajouter les configurations de maintenance
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (config_key, config_value, updated_at)
             VALUES ('maintenance_enabled', 'false', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        let _ = db.execute_unprepared(
            "INSERT INTO server_config (config_key, config_value, updated_at)
             VALUES ('maintenance_message_title', 'MAINTENANCE PROGRAMMÉE', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        let _ = db.execute_unprepared(
            "INSERT INTO server_config (config_key, config_value, updated_at)
             VALUES ('maintenance_message_description',
                     'Le serveur est en maintenance pour une mise à jour majeure.|Vos comptes et ressources seront préservés.|Merci de votre patience !',
                     NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        let _ = db.execute_unprepared(
            "INSERT INTO server_config (config_key, config_value, updated_at)
             VALUES ('maintenance_estimated_duration', '15-30 minutes', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        let _ = db.execute_unprepared(
            "INSERT INTO server_config (config_key, config_value, updated_at)
             VALUES ('maintenance_start_time', '', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        let _ = db.execute_unprepared(
            "INSERT INTO server_config (config_key, config_value, updated_at)
             VALUES ('maintenance_auto_disable_at', '', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

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
