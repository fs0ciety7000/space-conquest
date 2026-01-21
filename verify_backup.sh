#!/bin/bash

# ============================================================================
# SPACE CONQUEST - BACKUP VERIFICATION SCRIPT
# ============================================================================
# This script analyzes the backup file and shows what data will be migrated
# Run this BEFORE running migrate_production.sh to verify the data
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Database connection parameters
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="user"
DB_PASSWORD="password"

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}SPACE CONQUEST - BACKUP VERIFICATION${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""

# Check if backup file exists
if [ ! -f "lastbackup.sql" ]; then
    echo -e "${RED}ERROR: lastbackup.sql not found!${NC}"
    echo "Please place your database dump in the current directory as 'lastbackup.sql'"
    exit 1
fi

echo -e "${GREEN}✓ Backup file found: lastbackup.sql${NC}"
FILE_SIZE=$(du -h lastbackup.sql | cut -f1)
echo -e "  File size: ${YELLOW}$FILE_SIZE${NC}"
echo ""

# Load backup into temporary database
echo -e "${YELLOW}Loading backup into temporary database...${NC}"
PGPASSWORD=$DB_PASSWORD dropdb -h $DB_HOST -U $DB_USER --if-exists space_db_verify 2>/dev/null || true
PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -U $DB_USER space_db_verify
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_verify -f lastbackup.sql > /dev/null 2>&1
echo -e "${GREEN}✓ Backup loaded${NC}"
echo ""

# Analyze users
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}USER DATA ANALYSIS${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

USER_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_verify -t -A -c 'SELECT COUNT(*) FROM "user"')
echo -e "${GREEN}Total users to migrate: $USER_COUNT${NC}"
echo ""

echo -e "${YELLOW}User details:${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_verify -c \
"SELECT
    username,
    email,
    COALESCE(role, 'player') as role,
    COALESCE(created_at::date::text, 'Unknown') as created
FROM \"user\"
ORDER BY created_at ASC
LIMIT 10" 2>/dev/null || \
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_verify -c \
'SELECT username, email FROM "user" LIMIT 10'

if [ $USER_COUNT -gt 10 ]; then
    echo -e "${BLUE}... and $((USER_COUNT - 10)) more users${NC}"
fi
echo ""

# Analyze planets
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}PLANET DATA ANALYSIS${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

PLANET_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_verify -t -A -c "SELECT COUNT(*) FROM planet")
echo -e "${GREEN}Total planets in backup: $PLANET_COUNT${NC}"
echo ""

echo -e "${YELLOW}Resource averages per user (what will be migrated):${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_verify -c \
"SELECT
    u.username,
    COUNT(p.id) as planet_count,
    ROUND(AVG(COALESCE(p.metal_amount, 0)))::bigint as avg_metal,
    ROUND(AVG(COALESCE(p.crystal_amount, 0)))::bigint as avg_crystal,
    ROUND(AVG(COALESCE(p.deuterium_amount, 0)))::bigint as avg_deuterium,
    ROUND(AVG(COALESCE(p.metal_mine_level, 1)))::int as avg_metal_mine,
    ROUND(AVG(COALESCE(p.crystal_mine_level, 1)))::int as avg_crystal_mine,
    ROUND(AVG(COALESCE(p.deuterium_mine_level, 1)))::int as avg_deut_mine
FROM planet p
JOIN \"user\" u ON p.owner_id = u.id
GROUP BY u.id, u.username
ORDER BY u.username
LIMIT 10" 2>/dev/null || echo "Could not calculate averages - table structure may differ"
echo ""

# Analyze fleets
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}FLEET DATA ANALYSIS${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}Total fleet counts per user:${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_verify -c \
"SELECT
    u.username,
    SUM(COALESCE(p.light_hunter_count, 0)) as light_hunters,
    SUM(COALESCE(p.cruiser_count, 0)) as cruisers,
    SUM(COALESCE(p.recycler_count, 0)) as recyclers,
    SUM(COALESCE(p.spy_probe_count, 0)) as spy_probes,
    SUM(COALESCE(p.colony_ship_count, 0)) as colony_ships,
    SUM(COALESCE(p.transporter_count, 0)) as transporters
FROM planet p
JOIN \"user\" u ON p.owner_id = u.id
GROUP BY u.id, u.username
ORDER BY u.username
LIMIT 10" 2>/dev/null || echo "Could not analyze fleet data - columns may not exist"
echo ""

# Check for missions/fleets in flight
MISSION_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_verify -t -A -c \
"SELECT COUNT(*) FROM fleet_mission WHERE arrival_time > NOW()" 2>/dev/null || echo "0")

if [ "$MISSION_COUNT" != "0" ] && [ ! -z "$MISSION_COUNT" ]; then
    echo -e "${RED}⚠ WARNING: There are $MISSION_COUNT active fleet missions!${NC}"
    echo -e "${RED}  These will be LOST during migration.${NC}"
    echo -e "${RED}  Consider waiting for missions to complete or manually handling them.${NC}"
    echo ""
fi

# Analyze technology levels
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}TECHNOLOGY LEVELS${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}Average technology levels per user:${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_verify -c \
"SELECT
    u.username,
    MAX(COALESCE(p.energy_tech_level, 0)) as energy_tech,
    MAX(COALESCE(p.research_lab_level, 0)) as research_lab,
    MAX(COALESCE(p.espionage_tech_level, 0)) as espionage_tech,
    MAX(COALESCE(p.armour_tech_level, 0)) as armour_tech
FROM planet p
JOIN \"user\" u ON p.owner_id = u.id
GROUP BY u.id, u.username
ORDER BY u.username
LIMIT 10" 2>/dev/null || echo "Could not analyze technology data"
echo ""

# Data loss warnings
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}MIGRATION IMPACT${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${GREEN}✓ WILL BE PRESERVED:${NC}"
echo "  - All user accounts ($USER_COUNT users)"
echo "  - Usernames, emails, passwords, roles"
echo "  - Average resources per user (combined from all planets)"
echo "  - Average mine levels per user"
echo ""

echo -e "${RED}✗ WILL BE LOST:${NC}"
echo "  - Multiple planets (each user gets 1 homeworld)"
echo "  - Specific planet names and coordinates"
echo "  - Active constructions in progress"
echo "  - Fleet ships (will be converted to tech tree system)"
echo "  - Active fleet missions"
echo "  - Combat logs and messages"
echo "  - Market offers and alliances"
echo ""

echo -e "${YELLOW}→ WILL BE CREATED:${NC}"
echo "  - One homeworld planet per user with averaged resources"
echo "  - Complete tech tree system (15+ technologies)"
echo "  - New ship system (10+ ship types)"
echo "  - New building system (10+ buildings)"
echo "  - Defense system (8+ defense types)"
echo "  - Server configuration (80+ settings)"
echo ""

# Cleanup
PGPASSWORD=$DB_PASSWORD dropdb -h $DB_HOST -U $DB_USER --if-exists space_db_verify 2>/dev/null || true

echo -e "${CYAN}============================================================================${NC}"
echo -e "${GREEN}VERIFICATION COMPLETE${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""
echo -e "${YELLOW}To proceed with migration, run:${NC}"
echo -e "  ${BLUE}./migrate_production.sh${NC}"
echo ""
echo -e "${RED}⚠ WARNING: Migration is irreversible!${NC}"
echo -e "${RED}  Make sure you have a backup of lastbackup.sql${NC}"
echo ""
