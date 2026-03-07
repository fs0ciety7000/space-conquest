use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260307_000007_black_market_seed"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Seed server config keys for syndicate credits (ON CONFLICT DO NOTHING = safe re-runs)
        let _ = db.execute_unprepared(
            "INSERT INTO server_config (config_key, config_value, updated_at)
             VALUES
               ('expedition_syndicate_credit_chance', '0.10', NOW()),
               ('expedition_syndicate_credit_min', '1.0', NOW()),
               ('expedition_syndicate_credit_max', '2.0', NOW())
             ON CONFLICT (config_key) DO NOTHING"
        ).await;

        manager
            .get_connection()
            .execute_unprepared(
                r#"
                INSERT INTO black_market_item
                    (name, description, image_key, effect_type, effect_params, base_price, current_price)
                VALUES
                    (
                        'Token de Frappe Orbitale',
                        'Commande secrète une flotte de pirates PNJ qui attaque anonymement une planète cible dans 12 heures. La cible peut payer pour la neutraliser ou se retourner contre vous.',
                        'orbital_strike',
                        'orbital_strike',
                        '{"flight_hours": 12, "passive_loot_percent": 0.20, "tribute_price_credits": 50, "retaliate_cost_credits": 120}',
                        200,
                        200
                    ),
                    (
                        'Accélérateur de Production',
                        'Augmente la production de toutes les mines de votre planète de 50% pendant 4 heures.',
                        'resource_boost',
                        'resource_boost',
                        '{"multiplier": 1.5, "duration_hours": 4, "resource": "all"}',
                        80,
                        80
                    ),
                    (
                        'Module Furtif',
                        'Rend vos vaisseaux invisibles aux sondes ennemies pendant 24 heures.',
                        'stealth_module',
                        'stealth',
                        '{"duration_hours": 24}',
                        120,
                        120
                    ),
                    (
                        'Brouilleur de Coordonnées',
                        'Masque votre position galactique pendant 12 heures — personne ne peut vous espionner ou vous attaquer.',
                        'jammer',
                        'coordinate_jam',
                        '{"duration_hours": 12}',
                        150,
                        150
                    ),
                    (
                        'Virus Économique',
                        'Infecte les mines d''une planète ennemie, réduisant leur production de 30% pendant 6 heures. Vous restez anonyme.',
                        'eco_virus',
                        'eco_virus',
                        '{"production_penalty": 0.30, "duration_hours": 6}',
                        180,
                        180
                    )
                ON CONFLICT DO NOTHING;
                "#,
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("DELETE FROM black_market_item WHERE effect_type IN ('orbital_strike','resource_boost','stealth','coordinate_jam','eco_virus');")
            .await?;
        Ok(())
    }
}
