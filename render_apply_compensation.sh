#!/bin/bash

# ============================================================================
# Appliquer le patch de compensation sur RENDER (Production)
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
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}APPLICATION DU PATCH DE COMPENSATION SUR RENDER${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""
echo -e "${YELLOW}Ce patch va appliquer les bonus suivants à TOUS les joueurs:${NC}"
echo "  ✅ +250,000 Métal"
echo "  ✅ +125,000 Cristal"
echo "  ✅ +75,000 Deutérium"
echo "  ✅ +2 niveaux à toutes les mines"
echo "  ✅ +5 niveaux à la centrale solaire"
echo "  ✅ Vitesse de construction x300"
echo ""
echo -e "${YELLOW}Base de données cible:${NC}"
echo "  Host: $SOURCE_DB_HOST"
echo "  Database: $SOURCE_DB_NAME"
echo ""

# Confirmation
read -p "$(echo -e ${BOLD}Êtes-vous sûr de vouloir appliquer ces bonus? [y/N]${NC} )" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Opération annulée."
    exit 0
fi

echo ""
echo -e "${YELLOW}Connexion à Render...${NC}"

# Test connection
if ! PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Cannot connect to Render database!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Connecté${NC}"
echo ""
echo -e "${YELLOW}Application du patch...${NC}"

# Apply compensation patch
PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME <<'EOF'
BEGIN;

-- Create a temporary view to identify homeworlds (oldest planet per player)
CREATE TEMP VIEW homeworld_planets AS
SELECT id, owner_id FROM (
    SELECT id, owner_id,
           ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at ASC) as rn
    FROM planet
) as ranked
WHERE rn = 1;

-- 1. Ajouter des ressources à toutes les planètes homeworld
UPDATE planet
SET
    metal_amount = metal_amount + 250000,
    crystal_amount = crystal_amount + 125000,
    deuterium_amount = deuterium_amount + 75000
WHERE id IN (SELECT id FROM homeworld_planets);

-- 2. Augmenter les niveaux de mines dans planet_buildings (+2 niveaux)
UPDATE planet_buildings pb
SET level = level + 2
FROM building_types bt
WHERE pb.building_type_id = bt.id
  AND bt.building_key IN ('metal_mine', 'crystal_mine', 'deuterium_mine')
  AND pb.planet_id IN (SELECT id FROM homeworld_planets);

-- 2b. Augmenter les niveaux de mines dans les colonnes legacy de planet (+2 niveaux)
UPDATE planet
SET
    metal_mine_level = metal_mine_level + 2,
    crystal_mine_level = crystal_mine_level + 2,
    deuterium_mine_level = deuterium_mine_level + 2
WHERE id IN (SELECT id FROM homeworld_planets);

-- 3. Augmenter la centrale solaire dans planet_buildings (+5 niveaux)
UPDATE planet_buildings pb
SET level = level + 5
FROM building_types bt
WHERE pb.building_type_id = bt.id
  AND bt.building_key = 'solar_plant'
  AND pb.planet_id IN (SELECT id FROM homeworld_planets);

-- 3b. Augmenter la centrale solaire dans les colonnes legacy de planet (+5 niveaux)
UPDATE planet
SET solar_plant_level = solar_plant_level + 5
WHERE id IN (SELECT id FROM homeworld_planets);

-- 4. Ajuster la vitesse de construction à 300
INSERT INTO server_config (config_key, config_value, updated_at)
VALUES ('construction_speed_multiplier', '300.0', NOW())
ON CONFLICT (config_key) DO UPDATE
SET config_value = '300.0', updated_at = NOW();

-- Vérification
SELECT '✓ Patch appliqué avec succès!' as message;

SELECT
    COUNT(DISTINCT p.owner_id) as joueurs_affectés
FROM planet p
WHERE p.id IN (SELECT id FROM homeworld_planets);

-- Afficher quelques résultats (niveaux depuis colonnes legacy)
SELECT
    u.username,
    p.name,
    p.metal_amount,
    p.crystal_amount,
    p.deuterium_amount,
    p.metal_mine_level,
    p.crystal_mine_level,
    p.deuterium_mine_level,
    p.solar_plant_level
FROM planet p
JOIN "user" u ON p.owner_id = u.id
WHERE p.id IN (SELECT id FROM homeworld_planets)
ORDER BY u.username
LIMIT 10;

COMMIT;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}============================================================================${NC}"
    echo -e "${GREEN}✅ PATCH APPLIQUÉ AVEC SUCCÈS SUR RENDER!${NC}"
    echo -e "${GREEN}============================================================================${NC}"
    echo ""
    echo -e "${YELLOW}Tous les joueurs ont reçu les bonus de compensation.${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}❌ ERREUR: Le patch n'a pas pu être appliqué!${NC}"
    exit 1
fi
