#!/bin/bash
set -e

echo "🔄 Exécution des migrations..."
echo "DATABASE_URL: ${DATABASE_URL:0:30}..."

# Exécuter avec le chemin absolu
migration up

echo "✅ Migrations terminées !"
echo "🚀 Démarrage du backend..."
exec /app/backend
