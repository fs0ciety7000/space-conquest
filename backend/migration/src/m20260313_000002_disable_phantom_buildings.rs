use sea_orm_migration::prelude::*;

/// Migration — Ajouter `is_available` à `building_types` et désactiver les bâtiments fantômes
///
/// Les bâtiments suivants n'ont pas d'implémentation backend active
/// et ne doivent pas être visibles dans le tech tree :
/// - nanite_factory   : accélérateur de construction (implémenté en Sprint 3)
/// - terraformer      : extension de slots planétaires (non implémenté)
/// - alliance_depot   : dépôt alliance (non implémenté)
/// - missile_silo     : silo à missiles (non implémenté)
///
/// Note : fusion_plant reste disponible (intégration active).
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Ajouter la colonne is_available (défaut true = tous visibles sauf exceptions)
        manager.get_connection().execute_unprepared(r#"
            ALTER TABLE building_types
            ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true;
        "#).await?;

        // 2. Désactiver les bâtiments fantômes
        manager.get_connection().execute_unprepared(r#"
            UPDATE building_types
            SET is_available = false
            WHERE building_key IN ('nanite_factory', 'terraformer', 'alliance_depot', 'missile_silo');
        "#).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(r#"
            UPDATE building_types
            SET is_available = true
            WHERE building_key IN ('nanite_factory', 'terraformer', 'alliance_depot', 'missile_silo');
        "#).await?;

        manager.get_connection().execute_unprepared(r#"
            ALTER TABLE building_types DROP COLUMN IF EXISTS is_available;
        "#).await?;

        Ok(())
    }
}
