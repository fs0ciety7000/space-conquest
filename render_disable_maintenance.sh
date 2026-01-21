#!/bin/bash

# ============================================================================
# Désactiver le mode maintenance sur RENDER (Production)
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
echo -e "${CYAN}DÉSACTIVATION MAINTENANCE RENDER (PRODUCTION)${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""
echo -e "${YELLOW}Connexion à la base Render...${NC}"
echo "  Host: $SOURCE_DB_HOST"
echo "  Database: $SOURCE_DB_NAME"
echo ""

# Test connection
if ! PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Cannot connect to Render database!${NC}"
    exit 1
fi

# Deactivate maintenance
PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME <<EOF
-- Désactiver la maintenance
UPDATE server_config SET config_value = 'false', updated_at = NOW() WHERE config_key = 'maintenance_enabled';

-- Vérifier
SELECT config_key, config_value FROM server_config WHERE config_key = 'maintenance_enabled';
EOF

echo ""
echo -e "${GREEN}✅ Mode maintenance désactivé sur RENDER!${NC}"
echo -e "${YELLOW}   Les joueurs peuvent maintenant accéder au jeu${NC}"
echo ""
