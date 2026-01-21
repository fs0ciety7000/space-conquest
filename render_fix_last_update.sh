#!/bin/bash

# ============================================================================
# Corriger le champ last_update sur RENDER (Production)
# ============================================================================
# Ce script met à jour le champ last_update de toutes les planètes
# à NOW() pour corriger les problèmes de calcul de ressources
# après une migration de base de données.
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
echo -e "${CYAN}CORRECTION DU CHAMP LAST_UPDATE SUR RENDER${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""
echo -e "${YELLOW}Ce script va mettre à jour le champ last_update de toutes les planètes${NC}"
echo -e "${YELLOW}à NOW() pour corriger les problèmes de calcul de ressources.${NC}"
echo ""
echo -e "${YELLOW}Base de données cible:${NC}"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Confirmation
read -p "$(echo -e ${BOLD}Êtes-vous sûr de vouloir continuer? [y/N]${NC} )" -n 1 -r
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
    echo "   Please check your credentials in .env.migration"
    exit 1
fi
echo -e "${GREEN}✓ Connexion réussie${NC}"
echo ""

# Apply fix
echo -e "${YELLOW}Application de la correction...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'EOF'
BEGIN;

-- Vérifier les dates avant la correction
SELECT
    COUNT(*) as total_planets,
    MIN(last_update) as oldest_update,
    MAX(last_update) as newest_update,
    AVG(EXTRACT(EPOCH FROM (NOW() - last_update))/3600) as avg_hours_since_update
FROM planet;

-- Mettre à jour tous les last_update à NOW()
UPDATE planet
SET last_update = NOW()
WHERE last_update IS NOT NULL;

-- Vérifier après la correction
SELECT
    COUNT(*) as planets_updated,
    MIN(last_update) as oldest_update,
    MAX(last_update) as newest_update
FROM planet;

COMMIT;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}============================================================================${NC}"
    echo -e "${GREEN}✅ CORRECTION APPLIQUÉE AVEC SUCCÈS SUR RENDER!${NC}"
    echo -e "${GREEN}============================================================================${NC}"
    echo ""
    echo -e "${YELLOW}Tous les champs last_update ont été mis à jour à NOW().${NC}"
    echo -e "${YELLOW}Les ressources devraient maintenant recommencer à s'accumuler correctement.${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}❌ ERREUR: La correction n'a pas pu être appliquée!${NC}"
    exit 1
fi
