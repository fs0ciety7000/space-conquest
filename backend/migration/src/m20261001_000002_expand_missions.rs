use sea_orm_migration::prelude::*;

/// Migration v10.0 — Expansion des missions quotidiennes
///
/// Ajoute 20+ nouvelles missions réparties sur les 4 tiers (combat, exploration,
/// économie, social, spécial/hebdomadaire). Les UUIDs utilisent le préfixe
/// `a000000a-` pour éviter tout conflit avec les seeds précédentes.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ── Tier 1 — Nouvelles missions Débutant ────────────────────────────
        manager.get_connection().execute_unprepared(r#"
            INSERT INTO daily_mission
                (id, mission_key, name, description, mission_type, target,
                 required_amount, difficulty, reward_metal, reward_crystal,
                 reward_deuterium, reward_xp, is_active, tier)
            VALUES
                -- Combat
                ('a000000a-0001-0000-0000-000000000001'::uuid,
                 'defend_empire_t1', 'Défense de l''Empire',
                 'Neutralisez 3 attaques entrantes sur vos planètes',
                 'defense', 'any', 3, 'medium',
                 150000.0, 75000.0, 25000.0, 30, true, 1),

                ('a000000a-0001-0000-0000-000000000002'::uuid,
                 'ships_destroyed_t1', 'Sniper Galactique',
                 'Détruisez 500 vaisseaux ennemis au combat',
                 'ships_destroyed', 'any', 500, 'hard',
                 400000.0, 200000.0, 80000.0, 60, true, 1),

                ('a000000a-0001-0000-0000-000000000003'::uuid,
                 'strategist_t1', 'Stratège Militaire',
                 'Menez 5 attaques contre des planètes ennemies',
                 'attack', 'any', 5, 'medium',
                 200000.0, 100000.0, 40000.0, 35, true, 1),

                ('a000000a-0001-0000-0000-000000000004'::uuid,
                 'conqueror_t1', 'Conquérant',
                 'Conquérez une planète ennemie',
                 'planet_conquered', 'any', 1, 'hard',
                 500000.0, 250000.0, 100000.0, 75, true, 1),

                -- Exploration
                ('a000000a-0001-0000-0000-000000000005'::uuid,
                 'debris_hunter_t1', 'Chasseur de Débris',
                 'Recyclez des champs de débris 2 fois',
                 'recycles', 'any', 2, 'easy',
                 75000.0, 50000.0, 15000.0, 15, true, 1),

                ('a000000a-0001-0000-0000-000000000006'::uuid,
                 'stellar_explorer_t1', 'Explorateur Stellaire',
                 'Effectuez 3 expéditions dans les zones inconnues',
                 'expeditions', 'any', 3, 'easy',
                 80000.0, 50000.0, 20000.0, 15, true, 1),

                ('a000000a-0001-0000-0000-000000000007'::uuid,
                 'shadow_spy_t1', 'Espion de l''Ombre',
                 'Espionnez 5 planètes ennemies',
                 'spy_missions', 'any', 5, 'easy',
                 60000.0, 80000.0, 10000.0, 15, true, 1),

                -- Economie
                ('a000000a-0001-0000-0000-000000000008'::uuid,
                 'trade_baron_t1', 'Baron du Commerce',
                 'Créez 2 routes commerciales automatisées',
                 'trade_routes_created', 'any', 2, 'medium',
                 120000.0, 120000.0, 40000.0, 30, true, 1),

                ('a000000a-0001-0000-0000-000000000009'::uuid,
                 'investor_t1', 'Investisseur',
                 'Dépensez 1 000 000 de métal en construction',
                 'resources_spent', 'metal', 1000000, 'hard',
                 300000.0, 150000.0, 60000.0, 60, true, 1),

                ('a000000a-0001-0000-0000-000000000010'::uuid,
                 'deut_producer_t1', 'Producteur Elite',
                 'Collectez 500 000 de deutérium',
                 'collect', 'deuterium', 500000, 'hard',
                 200000.0, 100000.0, 150000.0, 60, true, 1),

                ('a000000a-0001-0000-0000-000000000011'::uuid,
                 'researcher_t1', 'Chercheur',
                 'Terminez 2 recherches technologiques',
                 'research_completed', 'any', 2, 'medium',
                 100000.0, 150000.0, 50000.0, 30, true, 1),

                ('a000000a-0001-0000-0000-000000000012'::uuid,
                 'builder_t1', 'Bâtisseur',
                 'Construisez 3 bâtiments (niveaux différents acceptés)',
                 'upgrade', 'any', 3, 'easy',
                 100000.0, 50000.0, 10000.0, 15, true, 1),

                ('a000000a-0001-0000-0000-000000000013'::uuid,
                 'fleet_admiral_t1', 'Amiral de la Flotte',
                 'Construisez 100 vaisseaux',
                 'ships_built', 'any', 100, 'medium',
                 180000.0, 90000.0, 30000.0, 30, true, 1),

                ('a000000a-0001-0000-0000-000000000014'::uuid,
                 'mine_optimal_t1', 'Minière Optimale',
                 'Atteignez le niveau 10 d''une mine (métal, cristal ou deutérium)',
                 'mine_upgrade', 'any', 10, 'hard',
                 350000.0, 175000.0, 70000.0, 60, true, 1),

                -- Social
                ('a000000a-0001-0000-0000-000000000015'::uuid,
                 'ambassador_t1', 'Ambassadeur',
                 'Envoyez 3 messages à d''autres joueurs',
                 'messages', 'any', 3, 'easy',
                 50000.0, 30000.0, 10000.0, 10, true, 1),

                ('a000000a-0001-0000-0000-000000000016'::uuid,
                 'ally_t1', 'Allié',
                 'Rejoignez une alliance',
                 'alliance_join', 'any', 1, 'easy',
                 200000.0, 100000.0, 40000.0, 20, true, 1),

                ('a000000a-0001-0000-0000-000000000017'::uuid,
                 'warlord_t1', 'Chef de Guerre',
                 'Créez votre propre alliance',
                 'alliance_create', 'any', 1, 'medium',
                 500000.0, 250000.0, 100000.0, 50, true, 1),

                -- Spécial (hebdomadaire / objectifs à long terme — tier 1)
                ('a000000a-0001-0000-0000-000000000018'::uuid,
                 'top10_t1', 'Maître de l''Univers',
                 'Atteignez le top 10 du classement général',
                 'ranking_top10', 'any', 1, 'hard',
                 1000000.0, 500000.0, 200000.0, 100, true, 1),

                ('a000000a-0001-0000-0000-000000000019'::uuid,
                 'invincible_fleet_t1', 'Flotte Invincible',
                 'Possédez 1 000 vaisseaux simultanément',
                 'total_ships', 'any', 1000, 'hard',
                 800000.0, 400000.0, 150000.0, 100, true, 1),

                ('a000000a-0001-0000-0000-000000000020'::uuid,
                 'galactic_empire_t1', 'Empire Galactique',
                 'Colonisez 5 planètes',
                 'planets_owned', 'any', 5, 'hard',
                 1200000.0, 600000.0, 250000.0, 100, true, 1)

            ON CONFLICT (mission_key) DO NOTHING;
        "#).await?;

        // ── Tier 2 — Mêmes thèmes, objectifs x5, récompenses x5 ────────────
        manager.get_connection().execute_unprepared(r#"
            INSERT INTO daily_mission
                (id, mission_key, name, description, mission_type, target,
                 required_amount, difficulty, reward_metal, reward_crystal,
                 reward_deuterium, reward_xp, is_active, tier)
            VALUES
                ('a000000a-0002-0000-0000-000000000001'::uuid,
                 'defend_empire_t2', 'Défense de l''Empire II',
                 'Neutralisez 10 attaques entrantes',
                 'defense', 'any', 10, 'medium',
                 750000.0, 375000.0, 125000.0, 150, true, 2),

                ('a000000a-0002-0000-0000-000000000002'::uuid,
                 'ships_destroyed_t2', 'Sniper Galactique II',
                 'Détruisez 2 500 vaisseaux ennemis',
                 'ships_destroyed', 'any', 2500, 'hard',
                 2000000.0, 1000000.0, 400000.0, 300, true, 2),

                ('a000000a-0002-0000-0000-000000000003'::uuid,
                 'debris_hunter_t2', 'Chasseur de Débris II',
                 'Recyclez des champs de débris 8 fois',
                 'recycles', 'any', 8, 'easy',
                 375000.0, 250000.0, 75000.0, 75, true, 2),

                ('a000000a-0002-0000-0000-000000000004'::uuid,
                 'stellar_explorer_t2', 'Explorateur Stellaire II',
                 'Effectuez 15 expéditions',
                 'expeditions', 'any', 15, 'easy',
                 400000.0, 250000.0, 100000.0, 75, true, 2),

                ('a000000a-0002-0000-0000-000000000005'::uuid,
                 'shadow_spy_t2', 'Espion de l''Ombre II',
                 'Espionnez 25 planètes ennemies',
                 'spy_missions', 'any', 25, 'easy',
                 300000.0, 400000.0, 50000.0, 75, true, 2),

                ('a000000a-0002-0000-0000-000000000006'::uuid,
                 'researcher_t2', 'Chercheur II',
                 'Terminez 8 recherches technologiques',
                 'research_completed', 'any', 8, 'medium',
                 500000.0, 750000.0, 250000.0, 150, true, 2),

                ('a000000a-0002-0000-0000-000000000007'::uuid,
                 'fleet_admiral_t2', 'Amiral de la Flotte II',
                 'Construisez 500 vaisseaux',
                 'ships_built', 'any', 500, 'medium',
                 900000.0, 450000.0, 150000.0, 150, true, 2),

                ('a000000a-0002-0000-0000-000000000008'::uuid,
                 'ambassador_t2', 'Ambassadeur II',
                 'Envoyez 15 messages à d''autres joueurs',
                 'messages', 'any', 15, 'easy',
                 250000.0, 150000.0, 50000.0, 50, true, 2)

            ON CONFLICT (mission_key) DO NOTHING;
        "#).await?;

        // ── Tier 3 — Objectifs x20, récompenses x20 ─────────────────────────
        manager.get_connection().execute_unprepared(r#"
            INSERT INTO daily_mission
                (id, mission_key, name, description, mission_type, target,
                 required_amount, difficulty, reward_metal, reward_crystal,
                 reward_deuterium, reward_xp, is_active, tier)
            VALUES
                ('a000000a-0003-0000-0000-000000000001'::uuid,
                 'defend_empire_t3', 'Défense de l''Empire III',
                 'Neutralisez 30 attaques entrantes',
                 'defense', 'any', 30, 'medium',
                 3000000.0, 1500000.0, 500000.0, 600, true, 3),

                ('a000000a-0003-0000-0000-000000000002'::uuid,
                 'ships_destroyed_t3', 'Sniper Galactique III',
                 'Détruisez 10 000 vaisseaux ennemis',
                 'ships_destroyed', 'any', 10000, 'hard',
                 8000000.0, 4000000.0, 1600000.0, 1200, true, 3),

                ('a000000a-0003-0000-0000-000000000003'::uuid,
                 'stellar_explorer_t3', 'Explorateur Stellaire III',
                 'Effectuez 60 expéditions',
                 'expeditions', 'any', 60, 'easy',
                 1600000.0, 1000000.0, 400000.0, 300, true, 3),

                ('a000000a-0003-0000-0000-000000000004'::uuid,
                 'fleet_admiral_t3', 'Amiral de la Flotte III',
                 'Construisez 2 000 vaisseaux',
                 'ships_built', 'any', 2000, 'medium',
                 3600000.0, 1800000.0, 600000.0, 600, true, 3),

                ('a000000a-0003-0000-0000-000000000005'::uuid,
                 'invincible_fleet_t3', 'Flotte Invincible III',
                 'Possédez 5 000 vaisseaux simultanément',
                 'total_ships', 'any', 5000, 'hard',
                 3200000.0, 1600000.0, 600000.0, 400, true, 3)

            ON CONFLICT (mission_key) DO NOTHING;
        "#).await?;

        // ── Tier 4 — Objectifs x80, récompenses x80 ─────────────────────────
        manager.get_connection().execute_unprepared(r#"
            INSERT INTO daily_mission
                (id, mission_key, name, description, mission_type, target,
                 required_amount, difficulty, reward_metal, reward_crystal,
                 reward_deuterium, reward_xp, is_active, tier)
            VALUES
                ('a000000a-0004-0000-0000-000000000001'::uuid,
                 'conqueror_t4', 'Grand Conquérant',
                 'Conquérez 5 planètes ennemies',
                 'planet_conquered', 'any', 5, 'hard',
                 10000000.0, 5000000.0, 2000000.0, 3000, true, 4),

                ('a000000a-0004-0000-0000-000000000002'::uuid,
                 'ships_destroyed_t4', 'Dieu de la Guerre',
                 'Détruisez 40 000 vaisseaux ennemis',
                 'ships_destroyed', 'any', 40000, 'hard',
                 32000000.0, 16000000.0, 6400000.0, 4800, true, 4),

                ('a000000a-0004-0000-0000-000000000003'::uuid,
                 'galactic_empire_t4', 'Empire Stellaire',
                 'Colonisez 10 planètes',
                 'planets_owned', 'any', 10, 'hard',
                 48000000.0, 24000000.0, 10000000.0, 4000, true, 4),

                ('a000000a-0004-0000-0000-000000000004'::uuid,
                 'top10_t4', 'Suprématie Absolue',
                 'Maintenez le top 10 du classement (1 attaque = 1 point)',
                 'ranking_top10', 'any', 1, 'hard',
                 40000000.0, 20000000.0, 8000000.0, 4000, true, 4),

                ('a000000a-0004-0000-0000-000000000005'::uuid,
                 'invincible_fleet_t4', 'Armada Invincible',
                 'Possédez 10 000 vaisseaux simultanément',
                 'total_ships', 'any', 10000, 'hard',
                 12800000.0, 6400000.0, 2400000.0, 1600, true, 4)

            ON CONFLICT (mission_key) DO NOTHING;
        "#).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(r#"
            DELETE FROM daily_mission WHERE mission_key IN (
                'defend_empire_t1', 'ships_destroyed_t1', 'strategist_t1', 'conqueror_t1',
                'debris_hunter_t1', 'stellar_explorer_t1', 'shadow_spy_t1', 'trade_baron_t1',
                'investor_t1', 'deut_producer_t1', 'researcher_t1', 'builder_t1',
                'fleet_admiral_t1', 'mine_optimal_t1', 'ambassador_t1', 'ally_t1',
                'warlord_t1', 'top10_t1', 'invincible_fleet_t1', 'galactic_empire_t1',
                'defend_empire_t2', 'ships_destroyed_t2', 'debris_hunter_t2',
                'stellar_explorer_t2', 'shadow_spy_t2', 'researcher_t2',
                'fleet_admiral_t2', 'ambassador_t2',
                'defend_empire_t3', 'ships_destroyed_t3', 'stellar_explorer_t3',
                'fleet_admiral_t3', 'invincible_fleet_t3',
                'conqueror_t4', 'ships_destroyed_t4', 'galactic_empire_t4',
                'top10_t4', 'invincible_fleet_t4'
            );
        "#).await?;
        Ok(())
    }
}
