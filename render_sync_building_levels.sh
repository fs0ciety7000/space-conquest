#!/bin/bash

# ============================================================================
# Synchroniser planet_buildings vers colonnes legacy de planet
# ============================================================================
# Ce script copie les niveaux de bâtiments depuis planet_buildings
# vers les colonnes legacy (metal_mine_level, etc.) dans la table planet
# pour corriger le problème de production à 0
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Load environment variables
if [ ! -f .env.migration ]; then
    echo -e "${RED}❌ ERROR: .env.migration file not found!${NC}"
    exit 1
fi

source .env.migration

DB_HOST="${SOURCE_DB_HOST}"
DB_PORT="${SOURCE_DB_PORT:-5432}"
DB_NAME="${SOURCE_DB_NAME}"
DB_USER="${SOURCE_DB_USER}"
DB_PASSWORD="${SOURCE_DB_PASSWORD}"

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}SYNCHRONISATION PLANET_BUILDINGS → PLANET (LEGACY COLUMNS)${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""
echo -e "${YELLOW}Ce script va copier les niveaux de bâtiments depuis planet_buildings${NC}"
echo -e "${YELLOW}vers les colonnes legacy de la table planet pour corriger la production.${NC}"
echo ""
echo -e "${YELLOW}Base de données cible:${NC}"
echo "  Host: $DB_HOST"
echo "  Database: $DB_NAME"
echo ""

# Confirmation
read -p "$(echo -e ${BOLD}Continuer? [y/N]${NC} )" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Opération annulée."
    exit 0
fi

echo ""
echo -e "${YELLOW}Connexion à Render...${NC}"

# Test connection
if ! PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}❌ ERROR: Cannot connect to Render database!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Connexion réussie${NC}"
echo ""

# Apply synchronization
echo -e "${YELLOW}Synchronisation en cours...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'EOF'
BEGIN;

-- Vérifier l'état avant synchronisation
\echo '============================================================================'
\echo 'AVANT SYNCHRONISATION'
\echo '============================================================================'
SELECT
    'planet_buildings' as source,
    COUNT(*) as total_records,
    SUM(CASE WHEN level > 0 THEN 1 ELSE 0 END) as non_zero_levels
FROM planet_buildings;

SELECT
    'planet (legacy)' as source,
    AVG(metal_mine_level) as avg_metal_mine,
    AVG(crystal_mine_level) as avg_crystal_mine,
    AVG(deuterium_mine_level) as avg_deuterium_mine,
    AVG(solar_plant_level) as avg_solar_plant
FROM planet;

-- Synchroniser metal_mine
UPDATE planet p
SET metal_mine_level = COALESCE(pb.level, p.metal_mine_level)
FROM planet_buildings pb
JOIN building_types bt ON pb.building_type_id = bt.id
WHERE pb.planet_id = p.id
  AND bt.building_key = 'metal_mine';

-- Synchroniser crystal_mine
UPDATE planet p
SET crystal_mine_level = COALESCE(pb.level, p.crystal_mine_level)
FROM planet_buildings pb
JOIN building_types bt ON pb.building_type_id = bt.id
WHERE pb.planet_id = p.id
  AND bt.building_key = 'crystal_mine';

-- Synchroniser deuterium_mine
UPDATE planet p
SET deuterium_mine_level = COALESCE(pb.level, p.deuterium_mine_level)
FROM planet_buildings pb
JOIN building_types bt ON pb.building_type_id = bt.id
WHERE pb.planet_id = p.id
  AND bt.building_key = 'deuterium_mine';

-- Synchroniser solar_plant
UPDATE planet p
SET solar_plant_level = COALESCE(pb.level, p.solar_plant_level)
FROM planet_buildings pb
JOIN building_types bt ON pb.building_type_id = bt.id
WHERE pb.planet_id = p.id
  AND bt.building_key = 'solar_plant';

-- Synchroniser shipyard
UPDATE planet p
SET shipyard_level = COALESCE(pb.level, p.shipyard_level)
FROM planet_buildings pb
JOIN building_types bt ON pb.building_type_id = bt.id
WHERE pb.planet_id = p.id
  AND bt.building_key = 'shipyard';

-- Synchroniser research_lab
UPDATE planet p
SET research_lab_level = COALESCE(pb.level, p.research_lab_level)
FROM planet_buildings pb
JOIN building_types bt ON pb.building_type_id = bt.id
WHERE pb.planet_id = p.id
  AND bt.building_key = 'research_lab';

-- Synchroniser hangar (resource_hangar dans building_types)
UPDATE planet p
SET hangar_level = COALESCE(pb.level, p.hangar_level)
FROM planet_buildings pb
JOIN building_types bt ON pb.building_type_id = bt.id
WHERE pb.planet_id = p.id
  AND bt.building_key = 'resource_hangar';

-- Synchroniser resource_storage
UPDATE planet p
SET resource_storage_level = COALESCE(pb.level, p.resource_storage_level)
FROM planet_buildings pb
JOIN building_types bt ON pb.building_type_id = bt.id
WHERE pb.planet_id = p.id
  AND bt.building_key = 'resource_storage';

-- Vérifier l'état après synchronisation
\echo ''
\echo '============================================================================'
\echo 'APRÈS SYNCHRONISATION'
\echo '============================================================================'
SELECT
    'planet (legacy)' as source,
    AVG(metal_mine_level) as avg_metal_mine,
    AVG(crystal_mine_level) as avg_crystal_mine,
    AVG(deuterium_mine_level) as avg_deuterium_mine,
    AVG(solar_plant_level) as avg_solar_plant,
    AVG(shipyard_level) as avg_shipyard,
    AVG(resource_storage_level) as avg_storage
FROM planet;

\echo ''
\echo 'Exemple de 5 planètes synchronisées:'
SELECT
    p.name,
    u.username,
    p.metal_mine_level,
    p.crystal_mine_level,
    p.deuterium_mine_level,
    p.solar_plant_level
FROM planet p
JOIN "user" u ON p.owner_id = u.id
ORDER BY u.username
LIMIT 5;

COMMIT;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}============================================================================${NC}"
    echo -e "${GREEN}✅ SYNCHRONISATION RÉUSSIE!${NC}"
    echo -e "${GREEN}============================================================================${NC}"
    echo ""
    echo -e "${YELLOW}Les colonnes legacy ont été synchronisées depuis planet_buildings.${NC}"
    echo -e "${YELLOW}La production de ressources devrait maintenant fonctionner correctement.${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}❌ ERREUR lors de la synchronisation!${NC}"
    exit 1
fi
