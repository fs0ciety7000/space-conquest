#!/bin/bash

# ============================================================================
# Activer le mode maintenance
# ============================================================================

source ../.env

TITLE="${1:-MAINTENANCE PROGRAMMÉE}"
DURATION="${2:-15-30 minutes}"

echo "🔧 Activation du mode maintenance..."
echo "   Titre: $TITLE"
echo "   Durée: $DURATION"

PGPASSWORD=$DB_PASSWORD psql -h localhost -U user -d space_db <<EOF
-- Activer la maintenance
UPDATE server_config SET config_value = 'true', updated_at = NOW() WHERE config_key = 'maintenance_enabled';

-- Mettre à jour le message
UPDATE server_config SET config_value = '$TITLE', updated_at = NOW() WHERE config_key = 'maintenance_message_title';
UPDATE server_config SET config_value = '$DURATION', updated_at = NOW() WHERE config_key = 'maintenance_estimated_duration';
UPDATE server_config SET config_value = NOW()::text, updated_at = NOW() WHERE config_key = 'maintenance_start_time';

-- Vérifier
SELECT config_key, config_value FROM server_config WHERE config_key LIKE 'maintenance_%';
EOF

echo "✅ Mode maintenance activé!"
echo "   Les joueurs verront la page de maintenance"
