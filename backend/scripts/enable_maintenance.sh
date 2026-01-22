#!/bin/bash

# ============================================================================
# Activer le mode maintenance (LOCAL)
# ============================================================================

# Usage function
usage() {
    echo "Usage:"
    echo "  $0 [TITLE] [DURATION] [DESCRIPTION]"
    echo ""
    echo "Arguments:"
    echo "  TITLE        - Titre du message de maintenance (défaut: 'MAINTENANCE PROGRAMMÉE')"
    echo "  DURATION     - Durée estimée (défaut: '15-30 minutes')"
    echo "  DESCRIPTION  - Description détaillée de la maintenance (multilignes supportées)"
    echo ""
    echo "Exemples:"
    echo "  $0"
    echo "  $0 'MISE À JOUR' '1 heure'"
    echo "  $0 'MISE À JOUR' '1 heure' 'Ajout de nouvelles fonctionnalités'"
    echo ""
    exit 0
}

# Check for help flag
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    usage
fi

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

TITLE="${1:-MAINTENANCE PROGRAMMÉE}"
DURATION="${2:-15-30 minutes}"
# Description with proper newlines instead of pipes
DESC="${3:-Le serveur est en maintenance pour une mise à jour majeure.
Vos comptes et ressources seront préservés.
Merci de votre patience !}"

echo "🔧 Activation du mode maintenance..."
echo "   Base de données: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo "   Titre: $TITLE"
echo "   Durée: $DURATION"

PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
-- Fix sequence for server_config auto-increment (in case this is first insert)
SELECT setval(pg_get_serial_sequence('server_config', 'id'),
              COALESCE((SELECT MAX(id) FROM server_config), 0) + 1,
              false);

-- Activer la maintenance (INSERT if not exists, UPDATE if exists)
INSERT INTO server_config (config_key, config_value, updated_at)
VALUES ('maintenance_enabled', 'true', NOW())
ON CONFLICT (config_key) DO UPDATE
SET config_value = 'true', updated_at = NOW();

-- Mettre à jour le message
INSERT INTO server_config (config_key, config_value, updated_at)
VALUES ('maintenance_message_title', '$TITLE', NOW())
ON CONFLICT (config_key) DO UPDATE
SET config_value = '$TITLE', updated_at = NOW();

INSERT INTO server_config (config_key, config_value, updated_at)
VALUES ('maintenance_message_description', '$DESC', NOW())
ON CONFLICT (config_key) DO UPDATE
SET config_value = '$DESC', updated_at = NOW();

INSERT INTO server_config (config_key, config_value, updated_at)
VALUES ('maintenance_estimated_duration', '$DURATION', NOW())
ON CONFLICT (config_key) DO UPDATE
SET config_value = '$DURATION', updated_at = NOW();

INSERT INTO server_config (config_key, config_value, updated_at)
VALUES ('maintenance_start_time', NOW()::text, NOW())
ON CONFLICT (config_key) DO UPDATE
SET config_value = NOW()::text, updated_at = NOW();

-- Initialiser auto_disable_at vide si n'existe pas
INSERT INTO server_config (config_key, config_value, updated_at)
VALUES ('maintenance_auto_disable_at', '', NOW())
ON CONFLICT (config_key) DO NOTHING;

-- Vérifier
SELECT config_key, config_value FROM server_config WHERE config_key LIKE 'maintenance_%' ORDER BY config_key;
EOF

echo "✅ Mode maintenance activé!"
echo "   Les joueurs verront la page de maintenance"
