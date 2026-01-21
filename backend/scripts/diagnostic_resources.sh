#!/bin/bash

# ============================================================================
# Diagnostic avancé des ressources (LOCAL)
# ============================================================================

# Charger les variables d'environnement
if [ -f "../../.env.migration" ]; then
    source ../../.env.migration
    echo "📋 Utilisation de .env.migration"
    DB_HOST="${TARGET_DB_HOST:-localhost}"
    DB_PORT="${TARGET_DB_PORT:-5432}"
    DB_NAME="${TARGET_DB_NAME:-space_db}"
    DB_USER="${TARGET_DB_USER:-user}"
    DB_PASSWORD="${TARGET_DB_PASSWORD:-password}"
elif [ -f "../../.env" ]; then
    source ../../.env
    echo "📋 Utilisation de .env"
    # Extraire les infos de DATABASE_URL si présente
    if [ -n "$DATABASE_URL" ]; then
        DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
        DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
        DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    else
        DB_HOST="localhost"
        DB_PORT="5432"
        DB_NAME="space_db"
        DB_USER="user"
        DB_PASSWORD="password"
    fi
else
    echo "❌ Erreur: Aucun fichier .env ou .env.migration trouvé"
    exit 1
fi

echo "🔍 Diagnostic des ressources..."
echo "   Base de données: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""

PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'EOF'
\echo '============================================================================'
\echo '1. TIMESTAMPS last_update - Vérifier si les dates sont correctes'
\echo '============================================================================'
SELECT
    COUNT(*) as total_planets,
    MIN(last_update) as oldest_update,
    MAX(last_update) as newest_update,
    NOW() as current_time,
    EXTRACT(EPOCH FROM (NOW() - MAX(last_update))) as seconds_since_newest_update,
    EXTRACT(EPOCH FROM (NOW() - MIN(last_update))) as seconds_since_oldest_update,
    AVG(EXTRACT(EPOCH FROM (NOW() - last_update))) as avg_seconds_since_update
FROM planet;

\echo ''
\echo '============================================================================'
\echo '2. PLANÈTES AVEC TIMESTAMPS PROBLÉMATIQUES'
\echo '============================================================================'
SELECT
    p.id,
    p.name,
    u.username,
    p.last_update,
    EXTRACT(EPOCH FROM (NOW() - p.last_update)) as seconds_ago,
    CASE
        WHEN p.last_update > NOW() THEN '⚠️  FUTUR!'
        WHEN EXTRACT(EPOCH FROM (NOW() - p.last_update)) > 86400 THEN '⚠️  >24h'
        WHEN EXTRACT(EPOCH FROM (NOW() - p.last_update)) < 1 THEN '⚠️  <1s'
        ELSE '✓ OK'
    END as status
FROM planet p
JOIN "user" u ON p.owner_id = u.id
WHERE p.last_update > NOW()
   OR EXTRACT(EPOCH FROM (NOW() - p.last_update)) > 3600
   OR EXTRACT(EPOCH FROM (NOW() - p.last_update)) < 1
ORDER BY p.last_update DESC
LIMIT 10;

\echo ''
\echo '============================================================================'
\echo '3. COMPARAISON planet_buildings vs colonnes legacy'
\echo '============================================================================'
SELECT
    p.name,
    u.username,
    -- Niveaux depuis planet_buildings
    (SELECT pb.level FROM planet_buildings pb
     JOIN building_types bt ON pb.building_type_id = bt.id
     WHERE pb.planet_id = p.id AND bt.building_key = 'metal_mine' LIMIT 1) as pb_metal_mine,
    -- Niveaux depuis colonnes legacy
    p.metal_mine_level as legacy_metal_mine,
    -- Idem pour crystal
    (SELECT pb.level FROM planet_buildings pb
     JOIN building_types bt ON pb.building_type_id = bt.id
     WHERE pb.planet_id = p.id AND bt.building_key = 'crystal_mine' LIMIT 1) as pb_crystal_mine,
    p.crystal_mine_level as legacy_crystal_mine,
    -- Status
    CASE
        WHEN p.metal_mine_level = 0
         AND EXISTS (SELECT 1 FROM planet_buildings pb
                     JOIN building_types bt ON pb.building_type_id = bt.id
                     WHERE pb.planet_id = p.id AND bt.building_key = 'metal_mine' AND pb.level > 0)
        THEN '⚠️  DESYNC!'
        ELSE '✓ OK'
    END as sync_status
FROM planet p
JOIN "user" u ON p.owner_id = u.id
ORDER BY u.username
LIMIT 10;

\echo ''
\echo '============================================================================'
\echo '4. RESSOURCES ACTUELLES'
\echo '============================================================================'
SELECT
    p.name,
    u.username,
    p.metal_mine_level,
    p.crystal_mine_level,
    p.deuterium_mine_level,
    p.solar_plant_level,
    ROUND(p.metal_amount::numeric, 0) as metal,
    ROUND(p.crystal_amount::numeric, 0) as crystal,
    ROUND(p.deuterium_amount::numeric, 0) as deuterium,
    EXTRACT(EPOCH FROM (NOW() - p.last_update)) as seconds_since_update
FROM planet p
JOIN "user" u ON p.owner_id = u.id
ORDER BY u.username
LIMIT 10;

\echo ''
\echo '============================================================================'
\echo '5. SERVER CONFIG - Multiplicateurs de vitesse'
\echo '============================================================================'
SELECT
    config_key,
    config_value,
    updated_at
FROM server_config
WHERE config_key LIKE '%speed%' OR config_key LIKE '%multiplier%'
ORDER BY config_key;

\echo ''
\echo '============================================================================'
\echo '6. ESTIMATION DE PRODUCTION (basé sur colonnes legacy)'
\echo '============================================================================'
SELECT
    p.name,
    p.metal_mine_level,
    ROUND(30 * p.metal_mine_level * POWER(1.1, p.metal_mine_level)) as metal_prod_per_hour,
    p.crystal_mine_level,
    ROUND(20 * p.crystal_mine_level * POWER(1.1, p.crystal_mine_level)) as crystal_prod_per_hour,
    p.deuterium_mine_level,
    ROUND(10 * p.deuterium_mine_level * POWER(1.1, p.deuterium_mine_level)) as deuterium_prod_per_hour
FROM planet p
JOIN "user" u ON p.owner_id = u.id
ORDER BY u.username
LIMIT 5;

EOF

echo ""
echo "✅ Diagnostic terminé!"
