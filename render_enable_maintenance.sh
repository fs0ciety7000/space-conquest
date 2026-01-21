#!/bin/bash

# ============================================================================
# Activer le mode maintenance sur RENDER (Production)
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
NC='\033[0m'

TITLE="${1:-MAINTENANCE PROGRAMMÉE}"
DURATION="${2:-15-30 minutes}"
DESC="${3:-Le serveur est en maintenance pour une mise à jour majeure.|Vos comptes et ressources seront préservés.|Merci de votre patience !}"

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}ACTIVATION MAINTENANCE RENDER (PRODUCTION)${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""
echo -e "${YELLOW}Connexion à la base Render...${NC}"
echo "  Host: $SOURCE_DB_HOST"
echo "  Database: $SOURCE_DB_NAME"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Titre: $TITLE"
echo "  Durée: $DURATION"
echo ""

# Test connection
if ! PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Cannot connect to Render database!${NC}"
    exit 1
fi

# Activate maintenance
PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME <<EOF
-- Activer la maintenance
UPDATE server_config SET config_value = 'true', updated_at = NOW() WHERE config_key = 'maintenance_enabled';

-- Mettre à jour le message
UPDATE server_config SET config_value = '$TITLE', updated_at = NOW() WHERE config_key = 'maintenance_message_title';
UPDATE server_config SET config_value = '$DESC', updated_at = NOW() WHERE config_key = 'maintenance_message_description';
UPDATE server_config SET config_value = '$DURATION', updated_at = NOW() WHERE config_key = 'maintenance_estimated_duration';
UPDATE server_config SET config_value = NOW()::text, updated_at = NOW() WHERE config_key = 'maintenance_start_time';

-- Vérifier
SELECT config_key, config_value FROM server_config WHERE config_key LIKE 'maintenance_%' ORDER BY config_key;
EOF

echo ""
echo -e "${GREEN}✅ Mode maintenance activé sur RENDER!${NC}"
echo -e "${YELLOW}   Les joueurs verront la page de maintenance${NC}"
echo ""
