#!/bin/bash

# ============================================================================
# Désactiver le mode maintenance (LOCAL)
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

echo "✅ Désactivation du mode maintenance..."
echo "   Base de données: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
-- Fix sequence for server_config auto-increment (in case this is first insert)
SELECT setval(pg_get_serial_sequence('server_config', 'id'),
              COALESCE((SELECT MAX(id) FROM server_config), 0) + 1,
              false);

-- Désactiver la maintenance (INSERT if not exists, UPDATE if exists)
INSERT INTO server_config (config_key, config_value, updated_at)
VALUES ('maintenance_enabled', 'false', NOW())
ON CONFLICT (config_key) DO UPDATE
SET config_value = 'false', updated_at = NOW();

-- Vérifier
SELECT config_key, config_value FROM server_config WHERE config_key = 'maintenance_enabled';
EOF

echo "✅ Mode maintenance désactivé!"
echo "   Les joueurs peuvent maintenant accéder au jeu"
