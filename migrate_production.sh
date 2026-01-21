#!/bin/bash

# ============================================================================
# SPACE CONQUEST - PRODUCTION DATABASE MIGRATION SCRIPT
# ============================================================================
# This script migrates the production database from the old schema to the new
# tech tree system while preserving user data and averaging planet resources.
#
# Prerequisites:
# - lastbackup.sql must be in the current directory
# - PostgreSQL 15+ must be installed
# - Database credentials in .env file
#
# What this script does:
# 1. Backs up existing data (users and planets)
# 2. Drops all tables
# 3. Runs fresh migrations to create new schema
# 4. Restores user data
# 5. Creates homeworld planets with averaged resources per user
# 6. Seeds all reference data (tech tree, ships, buildings, defenses, configs)
# ============================================================================

set -e  # Exit on any error

# Load environment variables
source .env

# Database connection parameters
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="space_db"
DB_USER="user"
DB_PASSWORD="password"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}SPACE CONQUEST - PRODUCTION DATABASE MIGRATION${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""

# Step 0: Check prerequisites
echo -e "${YELLOW}Step 0: Checking prerequisites...${NC}"
if [ ! -f "lastbackup.sql" ]; then
    echo -e "${RED}ERROR: lastbackup.sql not found!${NC}"
    echo "Please place your database dump in the current directory as 'lastbackup.sql'"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo -e "${RED}ERROR: psql not found!${NC}"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Step 1: Load old backup into temporary database
echo -e "${YELLOW}Step 1: Loading old backup into temporary database...${NC}"
PGPASSWORD=$DB_PASSWORD dropdb -h $DB_HOST -U $DB_USER --if-exists space_db_old 2>/dev/null || true
PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -U $DB_USER space_db_old
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_old -f lastbackup.sql > /dev/null 2>&1
echo -e "${GREEN}✓ Old backup loaded into space_db_old${NC}"
echo ""

# Step 2: Extract and preserve user data
echo -e "${YELLOW}Step 2: Extracting user data...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_old -t -A -F"," -c \
"SELECT
    id,
    username,
    email,
    password,
    COALESCE(created_at, NOW()),
    COALESCE(role, 'player')
FROM "user"
ORDER BY created_at ASC" > /tmp/users_backup.csv

USER_COUNT=$(wc -l < /tmp/users_backup.csv)
echo -e "${GREEN}✓ Extracted $USER_COUNT users${NC}"
echo ""

# Step 3: Calculate planet resource averages per user
echo -e "${YELLOW}Step 3: Calculating planet resource averages per user...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d space_db_old -t -A -F"," -c \
"SELECT
    owner_id,
    ROUND(AVG(COALESCE(metal_amount, 0)))::bigint as avg_metal,
    ROUND(AVG(COALESCE(crystal_amount, 0)))::bigint as avg_crystal,
    ROUND(AVG(COALESCE(deuterium_amount, 0)))::bigint as avg_deuterium,
    ROUND(AVG(COALESCE(metal_mine_level, 1)))::int as avg_metal_mine,
    ROUND(AVG(COALESCE(crystal_mine_level, 1)))::int as avg_crystal_mine,
    ROUND(AVG(COALESCE(deuterium_mine_level, 1)))::int as avg_deuterium_mine,
    ROUND(AVG(COALESCE(solar_plant_level, 0)))::int as avg_solar_plant,
    MIN(name) as first_planet_name
FROM planet
GROUP BY owner_id" > /tmp/planet_averages.csv

PLANET_DATA_COUNT=$(wc -l < /tmp/planet_averages.csv)
echo -e "${GREEN}✓ Calculated averages for $PLANET_DATA_COUNT users${NC}"
echo ""

# Step 4: Drop current database and recreate
echo -e "${YELLOW}Step 4: Dropping current database and recreating...${NC}"
PGPASSWORD=$DB_PASSWORD dropdb -h $DB_HOST -U $DB_USER --if-exists $DB_NAME 2>/dev/null || true
PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -U $DB_USER $DB_NAME
echo -e "${GREEN}✓ Database recreated${NC}"
echo ""

# Step 5: Run fresh migrations
echo -e "${YELLOW}Step 5: Running fresh migrations...${NC}"
cd backend
cargo run --release --bin migration -- fresh
cd ..
echo -e "${GREEN}✓ All migrations applied${NC}"
echo ""

# Step 6: Import user data
echo -e "${YELLOW}Step 6: Importing user data...${NC}"
while IFS=',' read -r id username email password created_at role
do
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
    "INSERT INTO "user" (id, username, email, password, created_at, role)
     VALUES ('$id', '$username', '$email', '$password', '$created_at', '$role')
     ON CONFLICT (id) DO NOTHING" > /dev/null
done < /tmp/users_backup.csv
echo -e "${GREEN}✓ Imported $USER_COUNT users${NC}"
echo ""

# Step 7: Create homeworld planets with averaged resources
echo -e "${YELLOW}Step 7: Creating homeworld planets with averaged resources...${NC}"
PLANET_COUNT=0
while IFS=',' read -r owner_id avg_metal avg_crystal avg_deut avg_metal_mine avg_crystal_mine avg_deut_mine avg_solar planet_name
do
    # Generate UUID for planet
    PLANET_ID=$(uuidgen)

    # Random coordinates
    GALAXY=$((1 + RANDOM % 5))
    SYSTEM=$((1 + RANDOM % 100))
    POSITION=$((1 + RANDOM % 15))

    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
    "INSERT INTO planet (
        id, owner_id, name, password,
        metal_amount, crystal_amount, deuterium_amount,
        last_update, created_at,
        galaxy, system, position,
        is_homeworld
    ) VALUES (
        '$PLANET_ID', '$owner_id', '$planet_name (Homeworld)', '',
        $avg_metal, $avg_crystal, $avg_deut,
        NOW(), NOW(),
        $GALAXY, $SYSTEM, $POSITION,
        true
    )" > /dev/null 2>&1

    PLANET_COUNT=$((PLANET_COUNT + 1))
done < /tmp/planet_averages.csv
echo -e "${GREEN}✓ Created $PLANET_COUNT homeworld planets${NC}"
echo ""

# Step 8: Create initial buildings for each homeworld
echo -e "${YELLOW}Step 8: Setting up initial buildings for homeworlds...${NC}"
while IFS=',' read -r owner_id avg_metal avg_crystal avg_deut avg_metal_mine avg_crystal_mine avg_deut_mine avg_solar planet_name
do
    # Get planet ID
    PLANET_ID=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -A -c \
        "SELECT id FROM planet WHERE owner_id = '$owner_id' AND is_homeworld = true LIMIT 1")

    if [ ! -z "$PLANET_ID" ]; then
        # Insert building levels
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME > /dev/null 2>&1 <<EOF
        INSERT INTO planet_buildings (planet_id, building_type_id, level)
        SELECT '$PLANET_ID', id, CASE
            WHEN building_key = 'metal_mine' THEN $avg_metal_mine
            WHEN building_key = 'crystal_mine' THEN $avg_crystal_mine
            WHEN building_key = 'deuterium_mine' THEN $avg_deut_mine
            WHEN building_key = 'solar_plant' THEN $avg_solar
            WHEN building_key = 'shipyard' THEN 1
            WHEN building_key = 'research_lab' THEN 1
            ELSE 0
        END
        FROM building_types
        WHERE building_key IN ('metal_mine', 'crystal_mine', 'deuterium_mine', 'solar_plant', 'shipyard', 'research_lab');
EOF
    fi
done < /tmp/planet_averages.csv
echo -e "${GREEN}✓ Initial buildings configured${NC}"
echo ""

# Step 9: Cleanup temporary files
echo -e "${YELLOW}Step 9: Cleaning up temporary files...${NC}"
rm -f /tmp/users_backup.csv
rm -f /tmp/planet_averages.csv
PGPASSWORD=$DB_PASSWORD dropdb -h $DB_HOST -U $DB_USER --if-exists space_db_old 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

# Step 10: Verification
echo -e "${YELLOW}Step 10: Verifying migration...${NC}"
FINAL_USER_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -A -c "SELECT COUNT(*) FROM "user"")
FINAL_PLANET_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -A -c "SELECT COUNT(*) FROM planet WHERE is_homeworld = true")
TECH_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -A -c "SELECT COUNT(*) FROM technologies")
SHIP_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -A -c "SELECT COUNT(*) FROM ship_types")
BUILDING_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -A -c "SELECT COUNT(*) FROM building_types")
DEFENSE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -A -c "SELECT COUNT(*) FROM defense_types")
CONFIG_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -A -c "SELECT COUNT(*) FROM server_config")

echo -e "${GREEN}✓ Migration verification:${NC}"
echo "  - Users: $FINAL_USER_COUNT"
echo "  - Homeworld planets: $FINAL_PLANET_COUNT"
echo "  - Technologies: $TECH_COUNT"
echo "  - Ship types: $SHIP_COUNT"
echo "  - Building types: $BUILDING_COUNT"
echo "  - Defense types: $DEFENSE_COUNT"
echo "  - Server configs: $CONFIG_COUNT"
echo ""

echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}MIGRATION COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Start the backend server: cd backend && cargo run --release"
echo "2. Verify user logins work correctly"
echo "3. Check that homeworld planets display properly"
echo "4. Test tech tree, building, and ship systems"
echo ""
echo "Users can now log in with their existing credentials."
echo "Each user has a homeworld planet with averaged resources from their old planets."
echo ""
