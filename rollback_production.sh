#!/bin/bash

# ============================================================================
# SPACE CONQUEST - ROLLBACK PRODUCTION DATABASE
# ============================================================================
# This script restores production from the backup created before migration
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Load environment
if [ ! -f .env.migration ]; then
    echo -e "${RED}ERROR: .env.migration file not found!${NC}"
    exit 1
fi

source .env.migration

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}PRODUCTION DATABASE ROLLBACK${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""

# Find the most recent backup
BACKUP_FILE=$(ls -t production_backup_BEFORE_MIGRATION_*.sql 2>/dev/null | head -1)

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}ERROR: No backup file found!${NC}"
    echo "Looking for: production_backup_BEFORE_MIGRATION_*.sql"
    echo ""
    echo "Available backups:"
    ls -lh production_backup_*.sql 2>/dev/null || echo "  (none found)"
    exit 1
fi

echo -e "${GREEN}Found backup: $BACKUP_FILE${NC}"
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
FILE_DATE=$(stat -c %y "$BACKUP_FILE" | cut -d'.' -f1)
echo "  Size: $FILE_SIZE"
echo "  Created: $FILE_DATE"
echo ""

echo -e "${YELLOW}This will:${NC}"
echo "  1. Drop current production database"
echo "  2. Restore from backup: $BACKUP_FILE"
echo "  3. Revert to OLD schema (before migration)"
echo ""
echo -e "${RED}${BOLD}All changes since migration will be LOST!${NC}"
echo ""

read -p "$(echo -e ${BOLD}Are you sure you want to rollback? [y/N]${NC} )" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Rollback cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}Step 1: Terminating active connections...${NC}"
PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d postgres -c \
"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$SOURCE_DB_NAME' AND pid <> pg_backend_pid();" > /dev/null 2>&1 || true

echo -e "${YELLOW}Step 2: Dropping current database...${NC}"
PGPASSWORD=$SOURCE_DB_PASSWORD dropdb -h $SOURCE_DB_HOST -U $SOURCE_DB_USER --if-exists $SOURCE_DB_NAME

echo -e "${YELLOW}Step 3: Creating fresh database...${NC}"
PGPASSWORD=$SOURCE_DB_PASSWORD createdb -h $SOURCE_DB_HOST -U $SOURCE_DB_USER $SOURCE_DB_NAME

echo -e "${YELLOW}Step 4: Restoring from backup...${NC}"
echo "  This may take several minutes..."
PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME -f "$BACKUP_FILE" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Rollback completed successfully${NC}"
    echo ""
    echo -e "${YELLOW}Verification:${NC}"
    USER_COUNT=$(PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME -t -A -c 'SELECT COUNT(*) FROM "user"' 2>/dev/null)
    echo "  Users restored: $USER_COUNT"
    echo ""
    echo -e "${GREEN}Production database has been restored to pre-migration state.${NC}"
    echo -e "${YELLOW}Don't forget to restart your backend!${NC}"
else
    echo -e "${RED}ERROR: Rollback failed!${NC}"
    exit 1
fi
