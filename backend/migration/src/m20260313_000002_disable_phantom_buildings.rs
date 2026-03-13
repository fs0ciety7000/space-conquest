use sea_orm_migration::prelude::*;

/// Migration — Marquer les bâtiments fantômes comme indisponibles
///
/// Les bâtiments suivants n'ont pas d'implémentation backend active
/// et ne doivent pas être visibles dans le tech tree :
/// - nanite_factory   : accélérateur de construction (non implémenté)
/// - terraformer      : extension de slots planétaires (non implémenté)
/// - alliance_depot   : dépôt alliance (non implémenté)
/// - missile_silo     : silo à missiles (non implémenté)
///
/// Note : fusion_plant reste disponible (intégration partielle active).
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
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

        Ok(())
    }
}
