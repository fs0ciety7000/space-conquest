#!/bin/bash

# ============================================================================
# SPACE CONQUEST - PUSH MIGRATED DATABASE TO PRODUCTION
# ============================================================================
# ⚠️  DANGER: This script will REPLACE your production database!
# ============================================================================
# This script:
# 1. Creates a backup of current production (safety)
# 2. Dumps the local migrated database
# 3. Pushes it to Render production
# 4. Verifies the migration
# ============================================================================

set -e

# Load environment variables
if [ ! -f .env.migration ]; then
    echo "ERROR: .env.migration file not found!"
    exit 1
fi

source .env.migration

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${RED}${BOLD}============================================================================${NC}"
echo -e "${RED}${BOLD}⚠️  WARNING: PRODUCTION DATABASE REPLACEMENT ⚠️${NC}"
echo -e "${RED}${BOLD}============================================================================${NC}"
echo ""
echo -e "${YELLOW}This script will REPLACE your production database on Render!${NC}"
echo -e "${YELLOW}All current production data will be OVERWRITTEN!${NC}"
echo ""
echo -e "${CYAN}Source (what will be pushed):${NC}"
echo "  Database: ${TARGET_DB_NAME} @ ${TARGET_DB_HOST}"
echo ""
echo -e "${CYAN}Destination (what will be replaced):${NC}"
echo "  Database: ${SOURCE_DB_NAME} @ ${SOURCE_DB_HOST}"
echo ""
echo -e "${RED}Before proceeding:${NC}"
echo "  1. Ensure all players are logged out"
echo "  2. Stop your backend application on Render"
echo "  3. Announce maintenance to your players"
echo ""

# Confirmation 1
read -p "$(echo -e ${BOLD}Have you stopped the backend and announced maintenance? [y/N]${NC} )" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted. Please stop the backend first."
    exit 1
fi

# Confirmation 2
echo ""
echo -e "${RED}${BOLD}FINAL WARNING: This is your last chance to abort!${NC}"
read -p "$(echo -e ${BOLD}Type 'YES' in capital letters to confirm: ${NC})" CONFIRM
if [ "$CONFIRM" != "YES" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}STEP 1: BACKUP CURRENT PRODUCTION${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PROD_BACKUP="production_backup_BEFORE_MIGRATION_${TIMESTAMP}.sql"

echo -e "${YELLOW}Creating safety backup of current production...${NC}"
echo "  This may take several minutes..."
PGPASSWORD=$SOURCE_DB_PASSWORD pg_dump -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME > "$PROD_BACKUP"

if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$PROD_BACKUP" | cut -f1)
    echo -e "${GREEN}✓ Production backup created: $PROD_BACKUP ($FILE_SIZE)${NC}"
    echo -e "${GREEN}  KEEP THIS FILE SAFE! You can use it to rollback if needed.${NC}"
else
    echo -e "${RED}ERROR: Failed to backup production!${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}STEP 2: DUMP LOCAL MIGRATED DATABASE${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""

LOCAL_DUMP="migrated_db_${TIMESTAMP}.sql"

echo -e "${YELLOW}Creating dump of local migrated database...${NC}"
PGPASSWORD=$TARGET_DB_PASSWORD pg_dump -h $TARGET_DB_HOST -U $TARGET_DB_USER -d $TARGET_DB_NAME > "$LOCAL_DUMP"

if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$LOCAL_DUMP" | cut -f1)
    echo -e "${GREEN}✓ Local dump created: $LOCAL_DUMP ($FILE_SIZE)${NC}"
else
    echo -e "${RED}ERROR: Failed to dump local database!${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}STEP 3: DROP PRODUCTION DATABASE${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Terminating active connections on production...${NC}"
PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d postgres -c \
"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$SOURCE_DB_NAME' AND pid <> pg_backend_pid();" > /dev/null 2>&1 || true

echo -e "${YELLOW}Dropping production database...${NC}"
PGPASSWORD=$SOURCE_DB_PASSWORD dropdb -h $SOURCE_DB_HOST -U $SOURCE_DB_USER --if-exists $SOURCE_DB_NAME

echo -e "${YELLOW}Creating fresh production database...${NC}"
PGPASSWORD=$SOURCE_DB_PASSWORD createdb -h $SOURCE_DB_HOST -U $SOURCE_DB_USER $SOURCE_DB_NAME

echo -e "${GREEN}✓ Production database recreated${NC}"

echo ""
echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}STEP 4: RESTORE MIGRATED DATA TO PRODUCTION${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Restoring migrated data to production...${NC}"
echo "  This may take several minutes..."

PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME -f "$LOCAL_DUMP" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Data restored to production${NC}"
else
    echo -e "${RED}ERROR: Failed to restore data!${NC}"
    echo -e "${RED}Your production database is now EMPTY!${NC}"
    echo -e "${YELLOW}To rollback, run:${NC}"
    echo "  PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME -f $PROD_BACKUP"
    exit 1
fi

echo ""
echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}STEP 5: VERIFICATION${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""

echo -e "${YELLOW}Verifying production database...${NC}"

USER_COUNT=$(PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME -t -A -c 'SELECT COUNT(*) FROM "user"' 2>/dev/null)
PLANET_COUNT=$(PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME -t -A -c "SELECT COUNT(*) FROM planet WHERE is_homeworld = true" 2>/dev/null)
TECH_COUNT=$(PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME -t -A -c "SELECT COUNT(*) FROM technologies" 2>/dev/null)
SHIP_COUNT=$(PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME -t -A -c "SELECT COUNT(*) FROM ship_types" 2>/dev/null)

echo -e "${GREEN}Production database verification:${NC}"
echo "  Users: $USER_COUNT"
echo "  Homeworld planets: $PLANET_COUNT"
echo "  Technologies: $TECH_COUNT"
echo "  Ship types: $SHIP_COUNT"
echo ""

if [ "$USER_COUNT" -gt 0 ] && [ "$TECH_COUNT" -gt 0 ] && [ "$SHIP_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Verification passed${NC}"
else
    echo -e "${RED}⚠ Warning: Some data may be missing!${NC}"
fi

echo ""
echo -e "${CYAN}============================================================================${NC}"
echo -e "${GREEN}${BOLD}MIGRATION TO PRODUCTION COMPLETED!${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Start your backend application on Render"
echo "  2. Test user login and basic functionality"
echo "  3. Announce to players that the game is back online"
echo "  4. Monitor for any issues"
echo ""
echo -e "${YELLOW}Files created:${NC}"
echo "  📦 Production backup (KEEP SAFE!): $PROD_BACKUP"
echo "  📦 Local dump: $LOCAL_DUMP"
echo ""
echo -e "${YELLOW}To rollback to old production (if needed):${NC}"
echo "  1. Stop the backend"
echo "  2. Run: PGPASSWORD=$SOURCE_DB_PASSWORD dropdb -h $SOURCE_DB_HOST -U $SOURCE_DB_USER $SOURCE_DB_NAME"
echo "  3. Run: PGPASSWORD=$SOURCE_DB_PASSWORD createdb -h $SOURCE_DB_HOST -U $SOURCE_DB_USER $SOURCE_DB_NAME"
echo "  4. Run: PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME -f $PROD_BACKUP"
echo ""
