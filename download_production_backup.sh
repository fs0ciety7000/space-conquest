#!/bin/bash

# ============================================================================
# SPACE CONQUEST - DOWNLOAD PRODUCTION BACKUP FROM RENDER
# ============================================================================
# This script downloads a backup from the Render production database
# ============================================================================

set -e

# Load environment variables
if [ -f .env.migration ]; then
    source .env.migration
else
    echo "ERROR: .env.migration file not found!"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}SPACE CONQUEST - DOWNLOAD PRODUCTION BACKUP${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""

# Backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="production_backup_${TIMESTAMP}.sql"

echo -e "${YELLOW}Connecting to Render production database...${NC}"
echo "  Host: $SOURCE_DB_HOST"
echo "  Database: $SOURCE_DB_NAME"
echo "  User: $SOURCE_DB_USER"
echo ""

# Test connection first
echo -e "${YELLOW}Testing connection...${NC}"
if ! PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Cannot connect to production database!${NC}"
    echo "Please check:"
    echo "  - Network connectivity"
    echo "  - Database credentials in .env.migration"
    echo "  - Firewall/security group settings"
    exit 1
fi
echo -e "${GREEN}✓ Connection successful${NC}"
echo ""

# Get database statistics
echo -e "${YELLOW}Database statistics:${NC}"
USER_COUNT=$(PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME -t -A -c 'SELECT COUNT(*) FROM "user"' 2>/dev/null || echo "?")
PLANET_COUNT=$(PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME -t -A -c "SELECT COUNT(*) FROM planet" 2>/dev/null || echo "?")
echo "  Users: $USER_COUNT"
echo "  Planets: $PLANET_COUNT"
echo ""

# Check for active missions
echo -e "${YELLOW}Checking for active missions...${NC}"
ACTIVE_MISSIONS=$(PGPASSWORD=$SOURCE_DB_PASSWORD psql -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME -t -A -c \
  "SELECT COUNT(*) FROM fleet_mission WHERE arrival_time > NOW()" 2>/dev/null || echo "0")

if [ "$ACTIVE_MISSIONS" != "0" ] && [ ! -z "$ACTIVE_MISSIONS" ]; then
    echo -e "${RED}⚠ WARNING: There are $ACTIVE_MISSIONS active fleet missions!${NC}"
    echo "  These missions may be lost during migration."
    echo "  Consider waiting for them to complete."
    echo ""
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Backup cancelled."
        exit 1
    fi
fi

# Create backup
echo -e "${YELLOW}Downloading backup from production...${NC}"
echo "  This may take a few minutes depending on database size..."
echo ""

PGPASSWORD=$SOURCE_DB_PASSWORD pg_dump -h $SOURCE_DB_HOST -U $SOURCE_DB_USER -d $SOURCE_DB_NAME > "$BACKUP_FILE" 2>&1

if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup downloaded successfully${NC}"
    echo "  File: $BACKUP_FILE"
    echo "  Size: $FILE_SIZE"
    echo ""

    # Create a copy named lastbackup.sql for migration scripts
    cp "$BACKUP_FILE" lastbackup.sql
    echo -e "${GREEN}✓ Copy created as lastbackup.sql${NC}"
    echo ""

    # Verify backup integrity
    echo -e "${YELLOW}Verifying backup integrity...${NC}"
    if grep -q "PostgreSQL database dump complete" "$BACKUP_FILE"; then
        echo -e "${GREEN}✓ Backup appears to be complete${NC}"
    else
        echo -e "${RED}⚠ Warning: Backup may be incomplete${NC}"
        echo "  Check the file manually before proceeding"
    fi
    echo ""

    # Quick preview of data
    echo -e "${YELLOW}Preview of backed up data:${NC}"
    echo "  Checking for key tables..."

    if grep -q "CREATE TABLE.*users" "$BACKUP_FILE"; then
        echo -e "  ${GREEN}✓${NC} users table found"
    fi

    if grep -q "CREATE TABLE.*planet" "$BACKUP_FILE"; then
        echo -e "  ${GREEN}✓${NC} planet table found"
    fi

    if grep -q "CREATE TABLE.*fleet_mission" "$BACKUP_FILE"; then
        echo -e "  ${GREEN}✓${NC} fleet_mission table found"
    fi
    echo ""

    echo -e "${CYAN}============================================================================${NC}"
    echo -e "${GREEN}BACKUP DOWNLOADED SUCCESSFULLY${NC}"
    echo -e "${CYAN}============================================================================${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Verify backup contents: ./verify_backup.sh"
    echo "  2. Run migration to local database: ./migrate_production.sh"
    echo ""
    echo -e "${YELLOW}Important files created:${NC}"
    echo "  - $BACKUP_FILE (timestamped backup - keep this safe!)"
    echo "  - lastbackup.sql (used by migration scripts)"
    echo ""
    echo -e "${RED}⚠ IMPORTANT:${NC}"
    echo "  - Keep $BACKUP_FILE as a safety backup"
    echo "  - The migration will populate your LOCAL database"
    echo "  - Your production database on Render will NOT be modified"
    echo ""
else
    echo -e "${RED}ERROR: Backup failed!${NC}"
    echo "Check the error messages above for details."
    exit 1
fi
