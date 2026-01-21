#!/bin/bash

# ============================================================================
# Activer le mode maintenance sur RENDER (Production)
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Usage function
usage() {
    echo -e "${CYAN}Usage:${NC}"
    echo "  $0 [TITLE] [DURATION] [DESCRIPTION]"
    echo ""
    echo -e "${CYAN}Arguments:${NC}"
    echo "  TITLE        - Titre du message de maintenance (défaut: 'MAINTENANCE PROGRAMMÉE')"
    echo "  DURATION     - Durée estimée (défaut: '15-30 minutes')"
    echo "  DESCRIPTION  - Description détaillée de la maintenance (multilignes supportées)"
    echo ""
    echo -e "${CYAN}Exemples:${NC}"
    echo "  $0"
    echo "  $0 'MISE À JOUR' '1 heure'"
    echo "  $0 'MISE À JOUR' '1 heure' 'Ajout de nouvelles fonctionnalités'"
    echo ""
    exit 0
}

# Check for help flag
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    usage
fi

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

TITLE="${1:-MAINTENANCE PROGRAMMÉE}"
DURATION="${2:-15-30 minutes}"
# Description with proper newlines instead of pipes
DESC="${3:-Le serveur est en maintenance pour une mise à jour majeure.
Vos comptes et ressources seront préservés.
Merci de votre patience !}"

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}ACTIVATION MAINTENANCE RENDER (PRODUCTION)${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""
echo -e "${YELLOW}Connexion à la base Render...${NC}"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Titre: $TITLE"
echo "  Durée: $DURATION"
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

# Activate maintenance
echo -e "${YELLOW}Activation du mode maintenance...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
-- Fix sequence for server_config auto-increment (in case this is first insert)
SELECT setval(pg_get_serial_sequence('server_config', 'id'),
              COALESCE((SELECT MAX(id) FROM server_config), 0) + 1,
              false);

-- Activer la maintenance (INSERT if not exists, UPDATE if exists)
INSERT INTO server_config (config_key, config_value, updated_at)
VALUES ('maintenance_enabled', 'true', NOW())
ON CONFLICT (config_key) DO UPDATE
SET config_value = 'true', updated_at = NOW();

-- Mettre à jour le message
INSERT INTO server_config (config_key, config_value, updated_at)
VALUES ('maintenance_message_title', '$TITLE', NOW())
ON CONFLICT (config_key) DO UPDATE
SET config_value = '$TITLE', updated_at = NOW();

INSERT INTO server_config (config_key, config_value, updated_at)
VALUES ('maintenance_message_description', '$DESC', NOW())
ON CONFLICT (config_key) DO UPDATE
SET config_value = '$DESC', updated_at = NOW();

INSERT INTO server_config (config_key, config_value, updated_at)
VALUES ('maintenance_estimated_duration', '$DURATION', NOW())
ON CONFLICT (config_key) DO UPDATE
SET config_value = '$DURATION', updated_at = NOW();

INSERT INTO server_config (config_key, config_value, updated_at)
VALUES ('maintenance_start_time', NOW()::text, NOW())
ON CONFLICT (config_key) DO UPDATE
SET config_value = NOW()::text, updated_at = NOW();

-- Initialiser auto_disable_at vide si n'existe pas
INSERT INTO server_config (config_key, config_value, updated_at)
VALUES ('maintenance_auto_disable_at', '', NOW())
ON CONFLICT (config_key) DO NOTHING;

-- Vérifier
SELECT config_key, config_value FROM server_config WHERE config_key LIKE 'maintenance_%' ORDER BY config_key;
EOF

echo ""
echo -e "${GREEN}✅ Mode maintenance activé sur RENDER!${NC}"
echo -e "${YELLOW}   Les joueurs verront la page de maintenance${NC}"
echo -e "${CYAN}   URL de production: https://your-app.onrender.com${NC}"
echo ""
