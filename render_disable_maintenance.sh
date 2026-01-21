#!/bin/bash

# ============================================================================
# Désactiver le mode maintenance sur RENDER (Production)
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
    echo "   Please create .env.migration with SOURCE_DB_* credentials"
    exit 1
fi

source .env.migration

# Validate required variables
if [ -z "$SOURCE_DB_HOST" ] || [ -z "$SOURCE_DB_USER" ] || [ -z "$SOURCE_DB_NAME" ]; then
    echo -e "${RED}❌ ERROR: Missing required environment variables!${NC}"
    echo "   Required: SOURCE_DB_HOST, SOURCE_DB_USER, SOURCE_DB_NAME, SOURCE_DB_PASSWORD"
    exit 1
fi

# Use defaults if not set
DB_HOST="${SOURCE_DB_HOST}"
DB_PORT="${SOURCE_DB_PORT:-5432}"
DB_NAME="${SOURCE_DB_NAME}"
DB_USER="${SOURCE_DB_USER}"
DB_PASSWORD="${SOURCE_DB_PASSWORD}"

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}DÉSACTIVATION MAINTENANCE RENDER (PRODUCTION)${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""
echo -e "${YELLOW}Connexion à la base Render...${NC}"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Test connection
echo -e "${YELLOW}Test de connexion...${NC}"
if ! PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}❌ ERROR: Cannot connect to Render database!${NC}"
    echo "   Please check your credentials in .env.migration"
    exit 1
fi
echo -e "${GREEN}✓ Connexion réussie${NC}"
echo ""

# Deactivate maintenance
echo -e "${YELLOW}Désactivation du mode maintenance...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
-- Fix sequence for server_config auto-increment (in case this is first insert)
SELECT setval(pg_get_serial_sequence('server_config', 'id'),
              COALESCE((SELECT MAX(id) FROM server_config), 0) + 1,
              false);

-- Désactiver la maintenance (INSERT if not exists, UPDATE if exists)
INSERT INTO server_config (config_key, config_value, updated_at)
VALUES ('maintenance_enabled', 'false', NOW())
ON CONFLICT (config_key) DO UPDATE
SET config_value = 'false', updated_at = NOW();

-- Vérifier
SELECT config_key, config_value FROM server_config WHERE config_key = 'maintenance_enabled';
EOF

echo ""
echo -e "${GREEN}✅ Mode maintenance désactivé sur RENDER!${NC}"
echo -e "${YELLOW}   Les joueurs peuvent maintenant accéder au jeu${NC}"
echo -e "${CYAN}   URL de production: https://your-app.onrender.com${NC}"
echo ""
