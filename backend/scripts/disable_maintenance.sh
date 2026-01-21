#!/bin/bash

# ============================================================================
# Désactiver le mode maintenance
# ============================================================================

source ../.env

echo "✅ Désactivation du mode maintenance..."

PGPASSWORD=$DB_PASSWORD psql -h localhost -U user -d space_db <<EOF
-- Désactiver la maintenance
UPDATE server_config SET config_value = 'false', updated_at = NOW() WHERE config_key = 'maintenance_enabled';

-- Vérifier
SELECT config_key, config_value FROM server_config WHERE config_key = 'maintenance_enabled';
EOF

echo "✅ Mode maintenance désactivé!"
echo "   Les joueurs peuvent maintenant accéder au jeu"
