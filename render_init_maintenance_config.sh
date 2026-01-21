#!/bin/bash

# ============================================================================
# Initialiser les configurations de maintenance sur RENDER (Production)
# ============================================================================
# Ce script initialise la table server_config avec les clés de maintenance
# nécessaires si elles n'existent pas encore. Il est idempotent et peut
# être exécuté plusieurs fois sans risque.
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
echo -e "${CYAN}INITIALISATION DES CONFIGURATIONS DE MAINTENANCE SUR RENDER${NC}"
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

# Initialize maintenance config
echo -e "${YELLOW}Initialisation des configurations de maintenance...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'EOF'
-- Fix sequence for server_config auto-increment
SELECT setval(pg_get_serial_sequence('server_config', 'id'),
              COALESCE((SELECT MAX(id) FROM server_config), 0) + 1,
              false);

-- Ajouter les configurations de maintenance (idempotent avec ON CONFLICT)
INSERT INTO server_config (config_key, config_value)
VALUES ('maintenance_enabled', 'false')
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO server_config (config_key, config_value)
VALUES ('maintenance_message_title', 'MAINTENANCE PROGRAMMÉE')
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO server_config (config_key, config_value)
VALUES ('maintenance_message_description',
        'Le serveur est en maintenance pour une mise à jour majeure.
Vos comptes et ressources seront préservés.
Merci de votre patience !')
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO server_config (config_key, config_value)
VALUES ('maintenance_estimated_duration', '15-30 minutes')
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO server_config (config_key, config_value)
VALUES ('maintenance_start_time', '')
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO server_config (config_key, config_value)
VALUES ('maintenance_auto_disable_at', '')
ON CONFLICT (config_key) DO NOTHING;

-- Vérifier que tout a été créé
SELECT config_key, config_value FROM server_config WHERE config_key LIKE 'maintenance_%' ORDER BY config_key;
EOF

echo ""
echo -e "${GREEN}✅ Configurations de maintenance initialisées sur RENDER!${NC}"
echo -e "${YELLOW}   Vous pouvez maintenant utiliser render_enable_maintenance.sh${NC}"
echo ""
