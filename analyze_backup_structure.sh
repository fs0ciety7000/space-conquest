#!/bin/bash

# ============================================================================
# SPACE CONQUEST - BACKUP STRUCTURE ANALYZER
# ============================================================================
# This script analyzes the structure of the backup database
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Database connection parameters
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="user"
DB_PASSWORD="password"

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}DATABASE STRUCTURE ANALYZER${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""

# Check if backup file exists
if [ ! -f "lastbackup.sql" ]; then
    echo -e "${RED}ERROR: lastbackup.sql not found!${NC}"
    exit 1
fi

# Load backup into temporary database
echo -e "${YELLOW}Loading backup into temporary database...${NC}"
PGPASSWORD=$DB_PASSWORD dropdb -h $DB_HOST -U $DB_USER --if-exists space_db_analyze 2>/dev/null || true
PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -U $DB_USER space_db_analyze
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_analyze -f lastbackup.sql > /dev/null 2>&1
echo -e "${GREEN}✓ Backup loaded${NC}"
echo ""

# List all tables
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}TABLES IN DATABASE${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_analyze -c "\dt"
echo ""

# Find user-related tables
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}USER TABLE ANALYSIS${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Try different table names
for TABLE in "users" "user" "\"user\"" "player" "account"; do
    echo -e "${YELLOW}Checking table: $TABLE${NC}"
    COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_analyze -t -A -c \
        "SELECT COUNT(*) FROM $TABLE" 2>/dev/null || echo "0")

    if [ "$COUNT" != "0" ]; then
        echo -e "${GREEN}✓ Found $COUNT records in $TABLE${NC}"
        echo ""
        echo -e "${YELLOW}Columns in $TABLE:${NC}"
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_analyze -c \
            "SELECT column_name, data_type
             FROM information_schema.columns
             WHERE table_name = '$TABLE'
             ORDER BY ordinal_position"
        echo ""
        echo -e "${YELLOW}Sample data from $TABLE:${NC}"
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_analyze -c \
            "SELECT * FROM $TABLE LIMIT 3" 2>/dev/null || echo "Could not retrieve data"
        echo ""
        break
    else
        echo -e "${RED}✗ Table $TABLE not found or empty${NC}"
    fi
done

# Find planet-related tables
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}PLANET TABLE ANALYSIS${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

for TABLE in "planets" "planet" "world"; do
    echo -e "${YELLOW}Checking table: $TABLE${NC}"
    COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_analyze -t -A -c \
        "SELECT COUNT(*) FROM $TABLE" 2>/dev/null || echo "0")

    if [ "$COUNT" != "0" ]; then
        echo -e "${GREEN}✓ Found $COUNT records in $TABLE${NC}"
        echo ""
        echo -e "${YELLOW}Columns in $TABLE:${NC}"
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_analyze -c \
            "SELECT column_name, data_type
             FROM information_schema.columns
             WHERE table_name = '$TABLE'
             ORDER BY ordinal_position"
        echo ""
        echo -e "${YELLOW}Sample data from $TABLE (first 2 rows):${NC}"
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_analyze -c \
            "SELECT * FROM $TABLE LIMIT 2" 2>/dev/null || echo "Could not retrieve data"
        echo ""
        break
    else
        echo -e "${RED}✗ Table $TABLE not found or empty${NC}"
    fi
done

# Check for fleet/mission tables
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}OTHER IMPORTANT TABLES${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

for TABLE in "fleet_mission" "mission" "fleet" "ships"; do
    COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_analyze -t -A -c \
        "SELECT COUNT(*) FROM $TABLE" 2>/dev/null || echo "")

    if [ ! -z "$COUNT" ]; then
        echo -e "${GREEN}✓ $TABLE: $COUNT records${NC}"
    fi
done
echo ""

# Cleanup
echo -e "${YELLOW}Cleaning up temporary database...${NC}"
PGPASSWORD=$DB_PASSWORD dropdb -h $DB_HOST -U $DB_USER --if-exists space_db_analyze 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

echo -e "${CYAN}============================================================================${NC}"
echo -e "${GREEN}ANALYSIS COMPLETE${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""
echo "Use this information to understand the database structure and adapt"
echo "the migration scripts accordingly."
echo ""
