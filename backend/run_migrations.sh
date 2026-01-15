#!/bin/bash
set -e

echo "🔄 Exécution des migrations..."
/app/migration
echo "✅ Migrations terminées !"

echo "🚀 Démarrage du backend..."
exec /app/backend
