#!/bin/bash

# ============================================================================
# SPACE CONQUEST - CREATE DATABASE BACKUP
# ============================================================================
# This script creates a backup of the current production database
# Run this BEFORE starting the migration process
# ============================================================================

set -e

# Database connection parameters
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-space_db}"
DB_USER="${DB_USER:-user}"
DB_PASSWORD="${DB_PASSWORD:-password}"

# Backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="spacedb_backup_${TIMESTAMP}.sql"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}SPACE CONQUEST - DATABASE BACKUP${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""

# Check if database exists
echo -e "${YELLOW}Checking database connection...${NC}"
if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Cannot connect to database $DB_NAME${NC}"
    echo "Please check:"
    echo "  - Database server is running"
    echo "  - Database name is correct: $DB_NAME"
    echo "  - Connection parameters in .env file"
    exit 1
fi
echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# Get database statistics
echo -e "${YELLOW}Database statistics:${NC}"
USER_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -A -c "SELECT COUNT(*) FROM users" 2>/dev/null || echo "?")
PLANET_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -A -c "SELECT COUNT(*) FROM planet" 2>/dev/null || echo "?")
echo "  Users: $USER_COUNT"
echo "  Planets: $PLANET_COUNT"
echo ""

# Check for active missions
ACTIVE_MISSIONS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -A -c \
  "SELECT COUNT(*) FROM fleet_mission WHERE arrival_time > NOW()" 2>/dev/null || echo "0")

if [ "$ACTIVE_MISSIONS" != "0" ] && [ ! -z "$ACTIVE_MISSIONS" ]; then
    echo -e "${RED}⚠ WARNING: There are $ACTIVE_MISSIONS active fleet missions!${NC}"
    echo "  These missions may be lost during migration."
    echo ""
fi

# Create backup
echo -e "${YELLOW}Creating backup...${NC}"
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup created successfully${NC}"
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
    fi
    echo ""

    echo -e "${GREEN}============================================================================${NC}"
    echo -e "${GREEN}BACKUP COMPLETED SUCCESSFULLY${NC}"
    echo -e "${GREEN}============================================================================${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Verify backup: ./verify_backup.sh"
    echo "  2. Run migration: ./migrate_production.sh"
    echo ""
    echo -e "${YELLOW}Keep both files safe:${NC}"
    echo "  - $BACKUP_FILE (timestamped backup)"
    echo "  - lastbackup.sql (used by migration scripts)"
    echo ""
else
    echo -e "${RED}ERROR: Backup failed!${NC}"
    exit 1
fi
