use sea_orm_migration::prelude::*;

/// Ajoute une colonne `ui_prefs` (TEXT/JSON) sur la table `user`.
/// Stocke les préférences UI côté serveur pour éviter la perte
/// lors d'un changement de navigateur, vidage de localStorage, ou redeploy.
///
/// Format JSON : {
///   "tutorial_completed": "1.0.0",    // version du tuto vu
///   "onboarding_seen": true,           // tour d'onboarding vu
///   "dismissed_announcements": [1, 2]  // IDs annonces fermées
/// }
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(r#"
            ALTER TABLE "user"
            ADD COLUMN IF NOT EXISTS ui_prefs TEXT DEFAULT '{}' NOT NULL;
        "#).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(r#"
            ALTER TABLE "user" DROP COLUMN IF EXISTS ui_prefs;
        "#).await?;
        Ok(())
    }
}
