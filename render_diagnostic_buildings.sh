#!/bin/bash

# ============================================================================
# Script de diagnostic pour les bâtiments sur RENDER
# ============================================================================

set -e

# Load environment variables
if [ ! -f .env.migration ]; then
    echo "ERROR: .env.migration file not found!"
    exit 1
fi

source .env.migration

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}DIAGNOSTIC DES BÂTIMENTS SUR RENDER${NC}"
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
-- 1. Vérifier si building_types existe et contient des données
\echo '============================================================================'
\echo '1. BUILDING TYPES - Types de bâtiments disponibles'
\echo '============================================================================'
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'building_types'
) as building_types_exists;

SELECT COUNT(*) as building_types_count FROM building_types;

\echo ''
\echo 'Building keys pour les mines et centrale:'
SELECT id, building_key, name FROM building_types
WHERE building_key IN ('metal_mine', 'crystal_mine', 'deuterium_mine', 'solar_plant')
ORDER BY building_key;

-- 2. Vérifier si planet_buildings existe et contient des données
\echo ''
\echo '============================================================================'
\echo '2. PLANET_BUILDINGS - Bâtiments construits sur les planètes'
\echo '============================================================================'
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'planet_buildings'
) as planet_buildings_exists;

SELECT COUNT(*) as planet_buildings_count FROM planet_buildings;

-- 3. Identifier les homeworlds
\echo ''
\echo '============================================================================'
\echo '3. HOMEWORLDS - Planètes principales des joueurs'
\echo '============================================================================'
CREATE TEMP VIEW homeworld_planets AS
SELECT id, owner_id, name FROM (
    SELECT id, owner_id, name,
           ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at ASC) as rn
    FROM planet
) as ranked
WHERE rn = 1;

SELECT COUNT(*) as homeworld_count FROM homeworld_planets;

\echo ''
\echo 'Liste des homeworlds:'
SELECT h.name as planet_name, u.username
FROM homeworld_planets h
JOIN "user" u ON h.owner_id = u.id
ORDER BY u.username;

-- 4. Vérifier les bâtiments sur les homeworlds
\echo ''
\echo '============================================================================'
\echo '4. BÂTIMENTS SUR LES HOMEWORLDS'
\echo '============================================================================'
SELECT
    COUNT(DISTINCT pb.planet_id) as homeworlds_with_buildings,
    COUNT(*) as total_building_entries
FROM planet_buildings pb
WHERE pb.planet_id IN (SELECT id FROM homeworld_planets);

\echo ''
\echo 'Détail des mines sur les homeworlds:'
SELECT
    h.name as planet_name,
    u.username,
    bt.building_key,
    COALESCE(pb.level, 0) as level
FROM homeworld_planets h
JOIN "user" u ON h.owner_id = u.id
LEFT JOIN planet_buildings pb ON pb.planet_id = h.id
LEFT JOIN building_types bt ON pb.building_type_id = bt.id
WHERE bt.building_key IN ('metal_mine', 'crystal_mine', 'deuterium_mine', 'solar_plant')
   OR bt.building_key IS NULL
ORDER BY u.username, bt.building_key;

-- 5. Vérifier les colonnes legacy dans planet
\echo ''
\echo '============================================================================'
\echo '5. COLONNES LEGACY - Niveaux de mines dans la table planet'
\echo '============================================================================'
SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'planet' AND column_name = 'metal_mine_level'
) as has_legacy_columns;

\echo ''
\echo 'Niveaux de mines (colonnes legacy) sur les homeworlds:'
SELECT
    h.name as planet_name,
    u.username,
    p.metal_mine_level,
    p.crystal_mine_level,
    p.deuterium_mine_level,
    p.solar_plant_level
FROM homeworld_planets h
JOIN "user" u ON h.owner_id = u.id
JOIN planet p ON p.id = h.id
ORDER BY u.username;

EOF

echo ""
echo -e "${GREEN}✅ Diagnostic terminé!${NC}"
echo ""
