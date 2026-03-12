use sea_orm_migration::prelude::*;

/// Migration — Corriger les descriptions des bâtiments shipyard, hangar et alliance_depot
///
/// - shipyard : précise la réduction du temps de construction des bâtiments (-8%/niveau)
/// - hangar   : précise le bonus cargo des transporteurs (+5%/niveau)
/// - alliance_depot : explique son rôle dans le dépôt partagé d'alliance
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(r#"
            UPDATE building_types
            SET description = 'Permet la construction de vaisseaux et réduit les temps de construction de -8% par niveau (max -60%)'
            WHERE building_key = 'shipyard';

            UPDATE building_types
            SET description = 'Augmente la capacité de flotte (500 + 500/niveau) et le cargo des transporteurs (+5% par niveau)'
            WHERE building_key = 'hangar';

            UPDATE building_types
            SET description = 'Permet le partage de ressources avec l''alliance. Le niveau maximal parmi les membres détermine la capacité du dépôt commun.'
            WHERE building_key = 'alliance_depot';
        "#).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(r#"
            UPDATE building_types
            SET description = 'Permet la construction des vaisseaux'
            WHERE building_key = 'shipyard';

            UPDATE building_types
            SET description = 'Augmente la limite de vaisseaux en orbite'
            WHERE building_key = 'hangar';

            UPDATE building_types
            SET description = 'Dépôt de ressources pour l''alliance'
            WHERE building_key = 'alliance_depot';
        "#).await?;

        Ok(())
    }
}
