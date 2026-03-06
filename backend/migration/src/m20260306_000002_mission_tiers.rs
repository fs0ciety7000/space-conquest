use sea_orm_migration::prelude::*;

/// Système de niveaux pour les missions quotidiennes et les succès.
///
/// - Ajoute une colonne `tier` (1-4) à `daily_mission`
/// - Seed 3 nouveaux tiers de missions (Apprenti, Vétéran, Expert)
/// - Ajoute des succès Silver et Gold (variantes de niveau supérieur)
///
/// Calcul du tier joueur (dans le backend) :
///   - Tier 1 (Débutant)  : 0–9 missions réclamées historiquement
///   - Tier 2 (Apprenti)  : 10–39 missions réclamées
///   - Tier 3 (Vétéran)   : 40–99 missions réclamées
///   - Tier 4 (Expert)    : 100+ missions réclamées
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ── 1. Colonne tier sur daily_mission ────────────────────────────────
        manager.get_connection().execute_unprepared(
            "ALTER TABLE daily_mission ADD COLUMN IF NOT EXISTS tier INTEGER NOT NULL DEFAULT 1"
        ).await?;

        // ── 2. Missions Tier 2 (Apprenti) — ×5 ──────────────────────────────
        manager.get_connection().execute_unprepared(r#"
            INSERT INTO daily_mission
                (id, mission_key, name, description, mission_type, target,
                 required_amount, difficulty, reward_metal, reward_crystal,
                 reward_deuterium, reward_xp, is_active, tier)
            VALUES
                ('a0000002-0000-0000-0000-000000000001'::uuid,
                 'build_hunters_t2', 'Escadron renforcé',
                 'Construisez 30 chasseurs légers', 'build', 'light_hunter',
                 30, 'easy', 5000.0, 2500.0, 0.0, 50, true, 2),

                ('a0000002-0000-0000-0000-000000000002'::uuid,
                 'collect_metal_t2', 'Mine active',
                 'Collectez 50 000 de métal', 'collect', 'metal',
                 50000, 'easy', 10000.0, 0.0, 0.0, 50, true, 2),

                ('a0000002-0000-0000-0000-000000000003'::uuid,
                 'upgrade_building_t2', 'Constructeur confirmé',
                 'Améliorez 5 bâtiments ou technologies', 'upgrade', 'any',
                 5, 'easy', 2500.0, 2500.0, 0.0, 50, true, 2),

                ('a0000002-0000-0000-0000-000000000004'::uuid,
                 'expedition_t2', 'Explorateur confirmé',
                 'Lancez 10 expéditions', 'expedition', 'any',
                 10, 'medium', 15000.0, 10000.0, 2500.0, 125, true, 2),

                ('a0000002-0000-0000-0000-000000000005'::uuid,
                 'spy_t2', 'Agent opérationnel',
                 'Espionnez 15 planètes ennemies', 'spy', 'any',
                 15, 'medium', 10000.0, 15000.0, 0.0, 125, true, 2),

                ('a0000002-0000-0000-0000-000000000006'::uuid,
                 'build_heavy_t2', 'Chasseurs lourds',
                 'Construisez 5 chasseurs lourds', 'build', 'heavy_hunter',
                 5, 'medium', 25000.0, 15000.0, 5000.0, 125, true, 2),

                ('a0000002-0000-0000-0000-000000000007'::uuid,
                 'attack_t2', 'Offensif',
                 'Attaquez 5 planètes ennemies', 'attack', 'any',
                 5, 'hard', 50000.0, 25000.0, 10000.0, 250, true, 2),

                ('a0000002-0000-0000-0000-000000000008'::uuid,
                 'transport_t2', 'Logisticien avancé',
                 'Transportez 50 000 ressources au total', 'transport', 'any',
                 50000, 'hard', 25000.0, 25000.0, 10000.0, 250, true, 2)

            ON CONFLICT (mission_key) DO NOTHING;
        "#).await?;

        // ── 3. Missions Tier 3 (Vétéran) — ×20 ─────────────────────────────
        manager.get_connection().execute_unprepared(r#"
            INSERT INTO daily_mission
                (id, mission_key, name, description, mission_type, target,
                 required_amount, difficulty, reward_metal, reward_crystal,
                 reward_deuterium, reward_xp, is_active, tier)
            VALUES
                ('a0000003-0000-0000-0000-000000000001'::uuid,
                 'build_hunters_t3', 'Armée de chasseurs',
                 'Construisez 100 chasseurs légers', 'build', 'light_hunter',
                 100, 'easy', 20000.0, 10000.0, 0.0, 200, true, 3),

                ('a0000003-0000-0000-0000-000000000002'::uuid,
                 'collect_metal_t3', 'Extraction intensive',
                 'Collectez 200 000 de métal', 'collect', 'metal',
                 200000, 'easy', 40000.0, 0.0, 0.0, 200, true, 3),

                ('a0000003-0000-0000-0000-000000000003'::uuid,
                 'upgrade_building_t3', 'Grand constructeur',
                 'Améliorez 20 bâtiments ou technologies', 'upgrade', 'any',
                 20, 'easy', 10000.0, 10000.0, 0.0, 200, true, 3),

                ('a0000003-0000-0000-0000-000000000004'::uuid,
                 'expedition_t3', 'Pionnier galactique',
                 'Lancez 30 expéditions', 'expedition', 'any',
                 30, 'medium', 60000.0, 40000.0, 10000.0, 500, true, 3),

                ('a0000003-0000-0000-0000-000000000005'::uuid,
                 'spy_t3', 'Réseau d''espionnage',
                 'Espionnez 50 planètes ennemies', 'spy', 'any',
                 50, 'medium', 40000.0, 60000.0, 0.0, 500, true, 3),

                ('a0000003-0000-0000-0000-000000000006'::uuid,
                 'build_battleship_t3', 'Cuirassés',
                 'Construisez 5 cuirassés', 'build', 'battleship',
                 5, 'medium', 100000.0, 60000.0, 20000.0, 500, true, 3),

                ('a0000003-0000-0000-0000-000000000007'::uuid,
                 'attack_t3', 'Conquérant',
                 'Attaquez 20 planètes ennemies', 'attack', 'any',
                 20, 'hard', 200000.0, 100000.0, 40000.0, 1000, true, 3),

                ('a0000003-0000-0000-0000-000000000008'::uuid,
                 'transport_t3', 'Réseau logistique',
                 'Transportez 200 000 ressources au total', 'transport', 'any',
                 200000, 'hard', 100000.0, 100000.0, 40000.0, 1000, true, 3)

            ON CONFLICT (mission_key) DO NOTHING;
        "#).await?;

        // ── 4. Missions Tier 4 (Expert) — ×80 ───────────────────────────────
        manager.get_connection().execute_unprepared(r#"
            INSERT INTO daily_mission
                (id, mission_key, name, description, mission_type, target,
                 required_amount, difficulty, reward_metal, reward_crystal,
                 reward_deuterium, reward_xp, is_active, tier)
            VALUES
                ('a0000004-0000-0000-0000-000000000001'::uuid,
                 'build_hunters_t4', 'Légion de chasseurs',
                 'Construisez 500 chasseurs légers', 'build', 'light_hunter',
                 500, 'easy', 80000.0, 40000.0, 0.0, 800, true, 4),

                ('a0000004-0000-0000-0000-000000000002'::uuid,
                 'collect_metal_t4', 'Empire industriel',
                 'Collectez 1 000 000 de métal', 'collect', 'metal',
                 1000000, 'easy', 160000.0, 0.0, 0.0, 800, true, 4),

                ('a0000004-0000-0000-0000-000000000003'::uuid,
                 'upgrade_building_t4', 'Architecte suprême',
                 'Améliorez 50 bâtiments ou technologies', 'upgrade', 'any',
                 50, 'easy', 40000.0, 40000.0, 0.0, 800, true, 4),

                ('a0000004-0000-0000-0000-000000000004'::uuid,
                 'expedition_t4', 'Maître explorateur',
                 'Lancez 100 expéditions', 'expedition', 'any',
                 100, 'medium', 240000.0, 160000.0, 40000.0, 2000, true, 4),

                ('a0000004-0000-0000-0000-000000000005'::uuid,
                 'spy_t4', 'Maître espion',
                 'Espionnez 200 planètes ennemies', 'spy', 'any',
                 200, 'medium', 160000.0, 240000.0, 0.0, 2000, true, 4),

                ('a0000004-0000-0000-0000-000000000006'::uuid,
                 'build_destroyer_t4', 'Destroyers',
                 'Construisez 3 destroyers', 'build', 'destroyer',
                 3, 'medium', 400000.0, 240000.0, 80000.0, 2000, true, 4),

                ('a0000004-0000-0000-0000-000000000007'::uuid,
                 'attack_t4', 'Seigneur de guerre',
                 'Attaquez 50 planètes ennemies', 'attack', 'any',
                 50, 'hard', 800000.0, 400000.0, 160000.0, 4000, true, 4),

                ('a0000004-0000-0000-0000-000000000008'::uuid,
                 'transport_t4', 'Empire logistique',
                 'Transportez 1 000 000 ressources au total', 'transport', 'any',
                 1000000, 'hard', 400000.0, 400000.0, 160000.0, 4000, true, 4)

            ON CONFLICT (mission_key) DO NOTHING;
        "#).await?;

        // ── 5. Achievements Silver ────────────────────────────────────────────
        manager.get_connection().execute_unprepared(r#"
            INSERT INTO achievement
                (id, achievement_key, name, description, category, icon, color,
                 condition_type, condition_target, condition_value, points, rarity, display_order, is_active)
            VALUES
                ('b0000002-0000-0000-0000-000000000001'::uuid,
                 'attacks_100', 'Guerrier Aguerri', 'Lancez 100 attaques',
                 'combat', '⚡', '#dc2626', 'count', 'attacks', 100, 75, 'rare', 5, true),

                ('b0000002-0000-0000-0000-000000000002'::uuid,
                 'victories_10', 'Battant', 'Gagnez 10 combats',
                 'combat', '🥇', '#f59e0b', 'count', 'victories', 10, 50, 'uncommon', 6, true),

                ('b0000002-0000-0000-0000-000000000003'::uuid,
                 'victories_50', 'Champion', 'Gagnez 50 combats',
                 'combat', '🏆', '#8b5cf6', 'count', 'victories', 50, 150, 'epic', 7, true),

                ('b0000002-0000-0000-0000-000000000004'::uuid,
                 'expeditions_100', 'Explorateur Chevronné', 'Complétez 100 expéditions',
                 'exploration', '🌌', '#0ea5e9', 'count', 'expeditions', 100, 100, 'epic', 23, true),

                ('b0000002-0000-0000-0000-000000000005'::uuid,
                 'buildings_50', 'Grand Architecte', 'Construisez ou améliorez 50 bâtiments',
                 'economy', '🏛️', '#2563eb', 'count', 'buildings', 50, 75, 'rare', 16, true),

                ('b0000002-0000-0000-0000-000000000006'::uuid,
                 'spy_missions_50', 'Espion d''Élite', 'Réalisez 50 missions d''espionnage',
                 'exploration', '🕵️', '#475569', 'count', 'spy_missions', 50, 75, 'rare', 24, true)

            ON CONFLICT (achievement_key) DO NOTHING;
        "#).await?;

        // ── 6. Achievements Gold ─────────────────────────────────────────────
        manager.get_connection().execute_unprepared(r#"
            INSERT INTO achievement
                (id, achievement_key, name, description, category, icon, color,
                 condition_type, condition_target, condition_value, points, rarity, display_order, is_active)
            VALUES
                ('b0000003-0000-0000-0000-000000000001'::uuid,
                 'attacks_250', 'Seigneur de Guerre', 'Lancez 250 attaques',
                 'combat', '💀', '#7c3aed', 'count', 'attacks', 250, 200, 'legendary', 8, true),

                ('b0000003-0000-0000-0000-000000000002'::uuid,
                 'victories_100', 'Invincible Légendaire', 'Gagnez 100 combats',
                 'combat', '👑', '#d97706', 'count', 'victories', 100, 300, 'legendary', 9, true),

                ('b0000003-0000-0000-0000-000000000003'::uuid,
                 'expeditions_250', 'Pionnier Légendaire', 'Complétez 250 expéditions',
                 'exploration', '🌠', '#7c3aed', 'count', 'expeditions', 250, 200, 'legendary', 25, true),

                ('b0000003-0000-0000-0000-000000000004'::uuid,
                 'buildings_200', 'Maître Bâtisseur', 'Construisez ou améliorez 200 bâtiments',
                 'economy', '🏗️', '#1d4ed8', 'count', 'buildings', 200, 200, 'legendary', 17, true),

                ('b0000003-0000-0000-0000-000000000005'::uuid,
                 'fleet_500', 'Grand Amiral', 'Possédez 500 vaisseaux simultanément',
                 'special', '🚀', '#4f46e5', 'threshold', 'total_ships', 500, 300, 'legendary', 43, true),

                ('b0000003-0000-0000-0000-000000000006'::uuid,
                 'crystal_1m', 'Mineur de cristal légendaire', 'Collectez 1 000 000 de cristal',
                 'economy', '💎', '#06b6d4', 'threshold', 'total_metal', 1000000, 150, 'epic', 12, true)

            ON CONFLICT (achievement_key) DO NOTHING;
        "#).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Supprimer les missions et achievements seedés
        manager.get_connection().execute_unprepared(r#"
            DELETE FROM daily_mission WHERE mission_key IN (
                'build_hunters_t2','collect_metal_t2','upgrade_building_t2',
                'expedition_t2','spy_t2','build_heavy_t2','attack_t2','transport_t2',
                'build_hunters_t3','collect_metal_t3','upgrade_building_t3',
                'expedition_t3','spy_t3','build_battleship_t3','attack_t3','transport_t3',
                'build_hunters_t4','collect_metal_t4','upgrade_building_t4',
                'expedition_t4','spy_t4','build_destroyer_t4','attack_t4','transport_t4'
            );
            DELETE FROM achievement WHERE achievement_key IN (
                'attacks_100','victories_10','victories_50','expeditions_100',
                'buildings_50','spy_missions_50','attacks_250','victories_100',
                'expeditions_250','buildings_200','fleet_500','crystal_1m'
            );
            ALTER TABLE daily_mission DROP COLUMN IF EXISTS tier;
        "#).await?;
        Ok(())
    }
}
