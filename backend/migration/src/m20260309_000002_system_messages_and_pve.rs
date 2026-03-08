use sea_orm_migration::prelude::*;

/// Migration combinée :
/// 1. Ajouter is_system + sender_display_name à la table message (messagerie système)
/// 2. Créer les 4 tables PVE events + seeds

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // ─────────────────────────────────────────────────────────────────
        // 1. Table message — colonnes système
        // ─────────────────────────────────────────────────────────────────
        db.execute_unprepared(
            "ALTER TABLE \"message\"
             ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false,
             ADD COLUMN IF NOT EXISTS sender_display_name VARCHAR(100),
             ADD COLUMN IF NOT EXISTS message_category VARCHAR(50) NOT NULL DEFAULT 'player';
             ALTER TABLE \"message\" ALTER COLUMN sender_id DROP NOT NULL;"
        ).await?;

        // ─────────────────────────────────────────────────────────────────
        // 2. server_event_type
        // ─────────────────────────────────────────────────────────────────
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS server_event_type (
                id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                type_key              VARCHAR(50) UNIQUE NOT NULL,
                name                  VARCHAR(100) NOT NULL,
                description           TEXT,
                icon                  VARCHAR(10),
                color                 VARCHAR(20),
                default_duration_hours INT NOT NULL DEFAULT 24,
                cooldown_hours         INT NOT NULL DEFAULT 168,
                effects               JSONB NOT NULL DEFAULT '{}',
                rewards               JSONB NOT NULL DEFAULT '{}',
                is_active             BOOLEAN NOT NULL DEFAULT true,
                created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );"
        ).await?;

        // ─────────────────────────────────────────────────────────────────
        // 3. server_event
        // ─────────────────────────────────────────────────────────────────
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS server_event (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                event_type_id   UUID NOT NULL REFERENCES server_event_type(id),
                event_type_key  VARCHAR(50) NOT NULL,
                affected_galaxy INT,
                affected_system INT,
                radius          INT NOT NULL DEFAULT 0,
                status          VARCHAR(20) NOT NULL DEFAULT 'incoming',
                announced_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                starts_at       TIMESTAMPTZ NOT NULL,
                ends_at         TIMESTAMPTZ NOT NULL,
                resolved_at     TIMESTAMPTZ,
                hp_max          INT NOT NULL DEFAULT 1000,
                hp_current      INT NOT NULL DEFAULT 1000,
                narrative       TEXT,
                triggered_by    UUID,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_server_event_status ON server_event(status);
            CREATE INDEX IF NOT EXISTS idx_server_event_zone ON server_event(affected_galaxy, affected_system);"
        ).await?;

        // ─────────────────────────────────────────────────────────────────
        // 4. server_event_participation
        // ─────────────────────────────────────────────────────────────────
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS server_event_participation (
                id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                event_id      UUID NOT NULL REFERENCES server_event(id) ON DELETE CASCADE,
                user_id       UUID NOT NULL,
                planet_id     UUID NOT NULL,
                contribution  INT NOT NULL DEFAULT 0,
                rewarded      BOOLEAN NOT NULL DEFAULT false,
                created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(event_id, user_id)
            );"
        ).await?;

        // ─────────────────────────────────────────────────────────────────
        // 5. server_event_action
        // ─────────────────────────────────────────────────────────────────
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS server_event_action (
                id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                event_id    UUID NOT NULL REFERENCES server_event(id) ON DELETE CASCADE,
                user_id     UUID NOT NULL,
                action_type VARCHAR(50) NOT NULL,
                value       INT NOT NULL DEFAULT 0,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );"
        ).await?;

        // ─────────────────────────────────────────────────────────────────
        // 6. Seeds — 5 types d'événements
        // ─────────────────────────────────────────────────────────────────
        db.execute_unprepared(
            r#"INSERT INTO server_event_type (type_key, name, description, icon, color, default_duration_hours, cooldown_hours, effects, rewards)
            VALUES
            (
                'pirate_invasion',
                'Invasion Pirate',
                'Des flottes pirates surgissent de la nébuleuse. Coordonnez vos forces pour repousser l''invasion avant qu''elles dévastent vos planètes.',
                '☠️', '#ef4444', 24, 168,
                '{"combat_multiplier": 1.5, "defense_multiplier": 0.8}',
                '{"metal": 5000, "crystal": 2500, "deuterium": 1000, "syndicate_credits": 10}'
            ),
            (
                'radioactive_cloud',
                'Nuage Radioactif',
                'Un nuage de particules radioactives envahit le secteur. La production énergétique est sévèrement perturbée.',
                '☢️', '#22c55e', 12, 72,
                '{"energy_reduction": 0.5}',
                '{"metal": 2000, "crystal": 1000, "deuterium": 500}'
            ),
            (
                'meteor_shower',
                'Pluie de Météorites',
                'Un essaim de météorites traverse le système solaire, laissant d''immenses champs de débris à récupérer.',
                '☄️', '#f97316', 6, 48,
                '{"debris_multiplier": 10.0}',
                '{"metal": 8000, "crystal": 4000}'
            ),
            (
                'solar_storm',
                'Tempête Solaire',
                'Une éruption solaire massive perturbe toutes les communications et les systèmes d''espionnage dans la galaxie.',
                '🌩️', '#eab308', 8, 96,
                '{"spy_blocked": true, "comms_blocked": true}',
                '{"metal": 1000, "crystal": 500}'
            ),
            (
                'ancient_artifact',
                'Artefact Ancien',
                'Des capteurs détectent une signature énergétique d''origine inconnue. Le premier à atteindre ces coordonnées découvrira un trésor technologique.',
                '🏺', '#a855f7', 4, 120,
                '{"tech_bonus": 1.0}',
                '{"syndicate_credits": 50, "metal": 3000, "crystal": 1500}'
            )
            ON CONFLICT (type_key) DO NOTHING;"#
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            "DROP TABLE IF EXISTS server_event_action;
             DROP TABLE IF EXISTS server_event_participation;
             DROP TABLE IF EXISTS server_event;
             DROP TABLE IF EXISTS server_event_type;"
        ).await?;
        Ok(())
    }
}
