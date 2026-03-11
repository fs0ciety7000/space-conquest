use sea_orm_migration::prelude::*;

/// Sprint v9.1 — Refactoring SPEED_FACTOR
///
/// Remplace le multiplicateur monolithique `speed_factor` (valeur "500 = 5×", confuse)
/// par 4 clés granulaires avec des valeurs directes (plus de /100 dans le code).
///
/// Valeurs par défaut = équivalent exact de la configuration actuelle :
///   production_speed  = speed_factor/100 × mining_speed       = 5 × 50  = 250.0
///   building_speed    = speed_factor/100 × construction_speed  = 5 × 100 = 500.0 → réduit à 50 (rebalancing)
///   research_speed    = idem                                   = 500.0 → réduit à 25 (plus stratégique)
///   ship_build_speed  = idem, nouvelle formule coût-dépendante = 100.0 (rebalancing)
///
/// Les clés `speed_factor`, `construction_speed_multiplier`, `mining_speed_multiplier`
/// sont conservées en DB pour la compatibilité admin UI mais ne sont plus lues par le code.

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_unprepared(
            "INSERT INTO server_config (config_key, config_value) VALUES
               ('production_speed_multiplier', '250.0'),
               ('building_speed_multiplier',   '50.0'),
               ('research_speed_multiplier',   '25.0'),
               ('ship_build_speed_multiplier', '100.0')
             ON CONFLICT (config_key) DO NOTHING;"
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            "DELETE FROM server_config WHERE config_key IN (
               'production_speed_multiplier',
               'building_speed_multiplier',
               'research_speed_multiplier',
               'ship_build_speed_multiplier'
             );"
        ).await?;
        Ok(())
    }
}
