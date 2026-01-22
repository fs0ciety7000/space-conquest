#!/bin/bash

# ============================================================================
# Diagnostic avancé des ressources sur RENDER
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Load environment variables
if [ ! -f .env.migration ]; then
    echo -e "${RED}❌ ERROR: .env.migration file not found!${NC}"
    exit 1
fi

source .env.migration

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}DIAGNOSTIC AVANCÉ DES RESSOURCES SUR RENDER${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""

# Test connection
if ! PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Cannot connect to Render database!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Connecté à Render${NC}"
echo ""

# Run diagnostic queries
PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME <<'EOF'
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
\echo '3. NIVEAUX DE MINES ET RESSOURCES ACTUELLES'
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
\echo '4. SERVER CONFIG - Multiplicateurs de vitesse'
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
\echo '5. ESTIMATION DE PRODUCTION (basé sur niveaux de mines)'
\echo '============================================================================'
-- Production théorique avec formule simplifiée
-- Base: métal=30, cristal=20, deutérium=10
-- Formule: base * level * (1.1^level)
SELECT
    p.name,
    p.metal_mine_level,
    ROUND(30 * p.metal_mine_level * POWER(1.1, p.metal_mine_level)) as metal_prod_per_hour,
    p.crystal_mine_level,
    ROUND(20 * p.crystal_mine_level * POWER(1.1, p.crystal_mine_level)) as crystal_prod_per_hour,
    p.deuterium_mine_level,
    ROUND(10 * p.deuterium_mine_level * POWER(1.1, p.deuterium_mine_level)) as deuterium_prod_per_hour,
    EXTRACT(EPOCH FROM (NOW() - p.last_update)) / 3600 as hours_since_update
FROM planet p
JOIN "user" u ON p.owner_id = u.id
ORDER BY u.username
LIMIT 5;

EOF

echo ""
echo -e "${GREEN}✅ Diagnostic terminé!${NC}"
echo ""
