#!/bin/bash

# ============================================================================
# Corriger le champ last_update (LOCAL)
# ============================================================================

# Charger les variables d'environnement
if [ -f "../../.env.migration" ]; then
    source ../../.env.migration
    echo "📋 Utilisation de .env.migration"
    DB_HOST="${TARGET_DB_HOST:-localhost}"
    DB_PORT="${TARGET_DB_PORT:-5432}"
    DB_NAME="${TARGET_DB_NAME:-space_db}"
    DB_USER="${TARGET_DB_USER:-user}"
    DB_PASSWORD="${TARGET_DB_PASSWORD:-password}"
elif [ -f "../../.env" ]; then
    source ../../.env
    echo "📋 Utilisation de .env"
    # Extraire les infos de DATABASE_URL si présente
    if [ -n "$DATABASE_URL" ]; then
        DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
        DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
        DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    else
        DB_HOST="localhost"
        DB_PORT="5432"
        DB_NAME="space_db"
        DB_USER="user"
        DB_PASSWORD="password"
    fi
else
    echo "❌ Erreur: Aucun fichier .env ou .env.migration trouvé"
    exit 1
fi

echo "🔧 Correction des timestamps last_update..."
echo "   Base de données: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""

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

echo ""
echo "✅ Timestamps corrigés!"
echo "   Tous les last_update ont été mis à jour à NOW()"
