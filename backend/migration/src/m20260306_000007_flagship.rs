use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260306_000007_flagship"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                -- One flagship per player
                CREATE TABLE IF NOT EXISTS flagship (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
                    name VARCHAR(64) NOT NULL DEFAULT 'Vaisseau Amiral',
                    xp INTEGER NOT NULL DEFAULT 0,
                    level INTEGER NOT NULL DEFAULT 1,
                    -- Base combat stats (modified by modules)
                    -- Construction cost: 5 000 000 métal / 2 000 000 cristal / 500 000 deutérium
                    base_attack INTEGER NOT NULL DEFAULT 500,
                    base_shield INTEGER NOT NULL DEFAULT 300,
                    base_hull INTEGER NOT NULL DEFAULT 2000,
                    base_cargo INTEGER NOT NULL DEFAULT 5000,
                    -- Current planet location (NULL = same as homeworld)
                    current_planet_id UUID REFERENCES planet(id) ON DELETE SET NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                );

                -- Module type definitions (seeded by the server, expandable later)
                CREATE TABLE IF NOT EXISTS flagship_module_type (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    module_key VARCHAR(64) NOT NULL UNIQUE,
                    display_name VARCHAR(128) NOT NULL,
                    description TEXT,
                    slot_type VARCHAR(32) NOT NULL,
                    -- slot_type: 'weapon' | 'shield' | 'engine' | 'utility' | 'special'
                    -- Stat bonuses (additive, stack with other modules)
                    bonus_attack INTEGER NOT NULL DEFAULT 0,
                    bonus_shield INTEGER NOT NULL DEFAULT 0,
                    bonus_hull INTEGER NOT NULL DEFAULT 0,
                    bonus_cargo INTEGER NOT NULL DEFAULT 0,
                    bonus_speed_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
                    -- Cost to equip
                    cost_metal DOUBLE PRECISION NOT NULL DEFAULT 0,
                    cost_crystal DOUBLE PRECISION NOT NULL DEFAULT 0,
                    cost_deuterium DOUBLE PRECISION NOT NULL DEFAULT 0,
                    -- XP required on the flagship to unlock
                    required_flagship_level INTEGER NOT NULL DEFAULT 1,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                );

                -- Equipped modules on a flagship (up to N slots per slot_type)
                CREATE TABLE IF NOT EXISTS flagship_module (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    flagship_id UUID NOT NULL REFERENCES flagship(id) ON DELETE CASCADE,
                    module_type_id UUID NOT NULL REFERENCES flagship_module_type(id) ON DELETE RESTRICT,
                    slot_index INTEGER NOT NULL DEFAULT 0,
                    equipped_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    UNIQUE(flagship_id, module_type_id, slot_index)
                );

                -- Seed initial module types
                INSERT INTO flagship_module_type (module_key, display_name, description, slot_type, bonus_attack, bonus_shield, bonus_hull, bonus_cargo, bonus_speed_pct, cost_metal, cost_crystal, cost_deuterium, required_flagship_level)
                VALUES
                    ('laser_mk2',        'Laser Mk. II',            'Canon laser amélioré, augmente considérablement la puissance de feu.',  'weapon',  200,   0,    0,    0,    0,    50000,  30000,  10000, 1),
                    ('plasma_cannon',    'Canon à Plasma',          'Arme de prestige : dommages massifs contre les boucliers ennemis.',      'weapon',  500,   0,    0,    0,    0,    120000, 80000,  40000, 5),
                    ('graviton_beam',    'Rayon Graviton',          'Déchire la coque adverse. Arme de destruction maximale.',                'weapon',  1000,  0,    0,    0,    0,    250000, 180000, 90000, 10),
                    ('deflector_v2',     'Deflecteur V2',           'Bouclier renforcé, absorbe les premières volées ennemies.',             'shield',  0,     300,  0,    0,    0,    40000,  60000,  5000,  1),
                    ('plasma_shield',    'Bouclier Plasma',         'Barrière énergétique avancée contre les tirs plasma.',                  'shield',  0,     700,  0,    0,    0,    100000, 140000, 20000, 5),
                    ('titan_armor',      'Blindage Titane',         'Coque ultra-résistante — le vaisseau encaisse beaucoup plus.',          'shield',  0,     0,    800,  0,    0,    80000,  40000,  15000, 3),
                    ('ion_engine',       'Propulseur Ionique',      'Améliore la vitesse de déplacement inter-systèmes.',                    'engine',  0,     0,    0,    0,    15.0, 30000,  20000,  50000, 1),
                    ('warp_drive',       'Moteur Warp',             'Propulsion de distorsion — traversées galactiques accélérées.',         'engine',  0,     0,    0,    0,    35.0, 70000,  50000,  120000, 7),
                    ('tractor_beam',     'Rayon Tracteur',          'Augmente massivement la capacité de fret — récupère plus de débris.',   'utility', 0,     0,    0,    10000, 0,   25000,  40000,  8000,  1),
                    ('spy_array',        'Réseau Espion',           'Améliore la portée et la précision des sondes d''espionnage.',          'utility', 0,     0,    200,  2000,  0,   20000,  35000,  5000,  2),
                    ('nano_repair',      'Nano-réparation',         'Système d''autoréparation : récupère une partie de la coque en combat.', 'special', 0,    0,    400,  0,    0,    60000,  80000,  30000, 4),
                    ('command_bridge',   'Passerelle de Commandement', 'Galvanise les flottes alliées proches — bonus de combat temporaire.', 'special', 100,  100,  100,  0,    5.0,  90000,  90000,  50000, 8)
                ON CONFLICT (module_key) DO NOTHING;
                "#,
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                DROP TABLE IF EXISTS flagship_module;
                DROP TABLE IF EXISTS flagship_module_type;
                DROP TABLE IF EXISTS flagship;
                "#,
            )
            .await?;
        Ok(())
    }
}
