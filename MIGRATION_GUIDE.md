# Space Conquest - Production Database Migration Guide

## Overview

This guide explains how to migrate your production database from the old schema to the new tech tree system while preserving user data.

## What This Migration Does

### Preserved Data
- ✅ **All user accounts** - usernames, emails, passwords, roles
- ✅ **Average resources** - combined from all user's planets
- ✅ **Average mine levels** - calculated per user
- ✅ **User creation dates** - preserved for historical tracking

### Lost Data (Intentional)
- ❌ **Multiple planets** - each user will have 1 homeworld
- ❌ **Old ship counts** - will be replaced by new tech tree system
- ❌ **Active constructions** - must complete before migration
- ❌ **Fleet missions in flight** - must complete before migration
- ❌ **Combat logs and messages** - will start fresh
- ❌ **Market offers and alliances** - will be recreated

### Created Data
- 🆕 **Complete tech tree system** - 15+ technologies with dependencies
- 🆕 **New ship types** - 10+ ship types with stats and requirements
- 🆕 **New building system** - 10+ buildings with upgrade paths
- 🆕 **Defense system** - 8+ defense types
- 🆕 **Server configuration** - 80+ customizable game settings
- 🆕 **Homeworld planets** - one per user with averaged resources

## Prerequisites

1. **Database backup file**: Place your dump as `lastbackup.sql` in the project root
2. **PostgreSQL client tools**: `psql` and `pg_dump` must be installed
3. **Running database**: PostgreSQL server must be running on localhost:5432
4. **No active players**: Ensure all players are logged out and missions completed

## Migration Steps

### Step 1: Create Database Backup

```bash
# If your database is not already backed up, create a dump
PGPASSWORD=password pg_dump -h localhost -U user space_db > lastbackup.sql
```

### Step 2: Verify Backup Contents

Run the verification script to see what will be migrated:

```bash
./verify_backup.sh
```

This will show you:
- How many users will be migrated
- Average resources per user
- What data will be preserved vs lost
- Any warnings about active missions

**Example Output:**
```
============================================================================
SPACE CONQUEST - BACKUP VERIFICATION
============================================================================

✓ Backup file found: lastbackup.sql
  File size: 2.3M

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER DATA ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total users to migrate: 5

User details:
 username    |       email        |  role  |  created
-------------+--------------------+--------+------------
 phantomhex  | phantom@test.com   | admin  | 2026-01-15
 player1     | player1@test.com   | player | 2026-01-16
 player2     | player2@test.com   | player | 2026-01-17

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLANET DATA ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total planets in backup: 12

Resource averages per user (what will be migrated):
  username   | planet_count | avg_metal | avg_crystal | avg_deuterium
-------------+--------------+-----------+-------------+---------------
 phantomhex  |           3  |   50000   |    25000    |     10000
 player1     |           2  |   30000   |    15000    |      5000
 player2     |           2  |   28000   |    14000    |      4500
```

### Step 3: Run Migration

Once you've verified the backup contents, run the migration:

```bash
./migrate_production.sh
```

**Migration Process:**
1. Loads backup into temporary database
2. Extracts user data
3. Calculates resource averages per user
4. Drops and recreates main database
5. Runs all fresh migrations
6. Imports user accounts
7. Creates homeworld planets with averaged resources
8. Sets up initial buildings
9. Verifies migration success

**Expected Duration:** 2-5 minutes depending on data size

### Step 4: Verify Migration

The script will automatically verify the migration and show:

```
✓ Migration verification:
  - Users: 5
  - Homeworld planets: 5
  - Technologies: 15
  - Ship types: 12
  - Building types: 11
  - Defense types: 8
  - Server configs: 85

============================================================================
MIGRATION COMPLETED SUCCESSFULLY!
============================================================================
```

### Step 5: Start Backend

```bash
cd backend
cargo run --release
```

### Step 6: Test the Application

1. **Test user login**: Verify existing users can log in with their credentials
2. **Check homeworld**: Each user should have one planet marked as "Homeworld"
3. **Verify resources**: Check that resources match the averaged amounts
4. **Test tech tree**: Open the tech tree and verify all technologies are available
5. **Test building**: Try upgrading a mine or building
6. **Test ship building**: Try building ships from the new ship types

## New Game Systems

### Tech Tree System

The new system includes 15+ technologies organized by category:

- **Energy & Resources**: Energy Tech, Laser Tech, Ion Tech, Plasma Tech
- **Defense**: Shield Tech, Armour Tech
- **Propulsion**: Combustion Drive, Impulse Drive, Hyperspace Drive
- **Research**: Espionage Tech, Computer Tech, Astrophysics
- **Weapons**: Weapons Tech
- **Advanced**: Hyperspace Tech, Graviton Tech

Each technology has:
- Base costs (metal, crystal, deuterium)
- Research time
- Cost multiplier for each level
- Requirements (other techs needed)
- Description

### Ship Types

New ship system with proper stats:

- **Light Hunter**: Fast attack fighter
- **Cruiser**: Heavy combat ship
- **Battleship**: Capital ship
- **Destroyer**: Anti-capital ship
- **Death Star**: Ultimate weapon
- **Recycler**: Debris collection
- **Spy Probe**: Reconnaissance
- **Colony Ship**: Planet colonization
- **Transporter**: Resource transport

Each ship has:
- Attack, shield, hull points
- Cargo capacity
- Speed
- Fuel consumption
- Build requirements
- Rapid fire bonuses

### Building Types

Organized building system:

- **Mines**: Metal Mine, Crystal Mine, Deuterium Mine
- **Energy**: Solar Plant, Fusion Reactor
- **Production**: Shipyard, Hangar
- **Research**: Research Lab
- **Storage**: Resource Storage
- **Defenses**: Various turrets and batteries

### Planet Limit System

The new homeworld system includes:
- **1 homeworld** (cannot be lost)
- **Up to 10 colonies** based on Astrophysics technology
- **Formula**: 1 homeworld + min(astrophysics_level, 10) colonies
- **Example**: With Astrophysics level 5, you can have 1 homeworld + 5 colonies = 6 total planets

## Troubleshooting

### "Connection refused" Error

If you see `connection to server at "localhost" (127.0.0.1), port 5432 failed`:

```bash
# Start PostgreSQL service
sudo systemctl start postgresql

# Or using Docker
docker-compose up -d db
```

### "lastbackup.sql not found" Error

Make sure the backup file is in the project root directory:

```bash
ls -lh lastbackup.sql
```

### Migration Failed Midway

If the migration fails:

1. Check the error message
2. The old backup is preserved in the temporary database
3. You can manually restore: `psql -d space_db -f lastbackup.sql`
4. Fix the issue and re-run the migration

### Users Can't Log In

Verify passwords were migrated correctly:

```bash
PGPASSWORD=password psql -h localhost -U user -d space_db -c \
  "SELECT username, email FROM users LIMIT 5"
```

If users are present but can't log in, the password hash format should be compatible. The migration preserves the exact password hash from the old database.

### Resources Don't Match

The migration averages resources across all planets. To see the calculation:

```bash
# In the old backup:
SELECT owner_id, AVG(metal_amount), AVG(crystal_amount), AVG(deuterium_amount)
FROM planet
GROUP BY owner_id
```

## Rollback Plan

If you need to rollback:

1. **Stop the backend server**
2. **Drop the migrated database**: `PGPASSWORD=password dropdb -h localhost -U user space_db`
3. **Restore from backup**: `PGPASSWORD=password createdb -h localhost -U user space_db && psql -d space_db -f lastbackup.sql`

## Post-Migration Checklist

- [ ] All users can log in
- [ ] Homeworld planets display correctly
- [ ] Resources match expectations
- [ ] Tech tree loads and displays all technologies
- [ ] Building upgrades work
- [ ] Ship building works
- [ ] Research works
- [ ] Fleet missions work
- [ ] Admin panel accessible (for admin users)
- [ ] Server config loaded (80+ settings)

## Communicating with Players

**Recommended announcement:**

> Hello players! We're performing a major database migration to introduce a new tech tree system with 15+ technologies, 12+ ship types, and many new features.
>
> **What you'll keep:**
> - Your account and credentials
> - Your averaged resources from all planets
> - Your averaged mine levels
>
> **What changes:**
> - You'll have 1 homeworld instead of multiple planets
> - New tech tree system to unlock ships and buildings
> - New ship types and combat system
> - Ability to colonize up to 10 additional planets via Astrophysics tech
>
> **Downtime:** Approximately 5-10 minutes
>
> Thank you for your patience!

## Support

If you encounter issues during migration:

1. Check the error message in terminal
2. Review the verification output from `verify_backup.sh`
3. Check PostgreSQL logs: `tail -f /var/log/postgresql/postgresql-15-main.log`
4. Verify database connection: `PGPASSWORD=password psql -h localhost -U user -d space_db -c "\\dt"`

## Advanced Options

### Custom Resource Allocation

If you want to give users a starting bonus instead of just averaging:

Edit `migrate_production.sh` around line 150 and modify the metal/crystal/deuterium values:

```bash
# Add 50% bonus to averaged resources
NEW_METAL=$((avg_metal * 150 / 100))
NEW_CRYSTAL=$((avg_crystal * 150 / 100))
NEW_DEUTERIUM=$((avg_deut * 150 / 100))
```

### Keeping Fleet Data

To preserve ship counts (they will be added to the homeworld):

1. Modify the query in Step 3 to include fleet counts
2. After creating planets, insert into `planet_ships` table
3. Note: Only works for ships that exist in both old and new systems

### Custom Starting Technology

To give all users a tech boost:

Add after Step 8 in `migrate_production.sh`:

```bash
# Give all users Energy Tech level 3
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
"INSERT INTO planet_technologies (planet_id, technology_id, level)
SELECT p.id, t.id, 3
FROM planet p
CROSS JOIN technologies t
WHERE p.is_homeworld = true AND t.tech_key = 'energy_tech'"
```

## Migration Log Example

```
============================================================================
SPACE CONQUEST - PRODUCTION DATABASE MIGRATION
============================================================================

Step 0: Checking prerequisites...
✓ All prerequisites met

Step 1: Loading old backup into temporary database...
✓ Old backup loaded into space_db_old

Step 2: Extracting user data...
✓ Extracted 5 users

Step 3: Calculating planet resource averages per user...
✓ Calculated averages for 5 users

Step 4: Dropping current database and recreating...
✓ Database recreated

Step 5: Running fresh migrations...
✓ All migrations applied

Step 6: Importing user data...
✓ Imported 5 users

Step 7: Creating homeworld planets with averaged resources...
✓ Created 5 homeworld planets

Step 8: Setting up initial buildings for homeworlds...
✓ Initial buildings configured

Step 9: Cleaning up temporary files...
✓ Cleanup complete

Step 10: Verifying migration...
✓ Migration verification:
  - Users: 5
  - Homeworld planets: 5
  - Technologies: 15
  - Ship types: 12
  - Building types: 11
  - Defense types: 8
  - Server configs: 85

============================================================================
MIGRATION COMPLETED SUCCESSFULLY!
============================================================================
```

---

**Last Updated:** 2026-01-21
**Version:** 1.0
**Tested On:** PostgreSQL 15+
