#!/bin/bash

# ============================================================================
# Synchroniser planet_buildings vers colonnes legacy de planet (LOCAL)
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

echo "🔄 Synchronisation planet_buildings → planet (colonnes legacy)..."
echo "   Base de données: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""

PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'EOF'
BEGIN;

-- Vérifier l'état avant synchronisation
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
SELECT
    'planet (legacy) - APRÈS' as source,
    AVG(metal_mine_level) as avg_metal_mine,
    AVG(crystal_mine_level) as avg_crystal_mine,
    AVG(deuterium_mine_level) as avg_deuterium_mine,
    AVG(solar_plant_level) as avg_solar_plant,
    AVG(shipyard_level) as avg_shipyard,
    AVG(resource_storage_level) as avg_storage
FROM planet;

COMMIT;
EOF

echo ""
echo "✅ Synchronisation terminée!"
echo "   Les colonnes legacy ont été mises à jour depuis planet_buildings"
