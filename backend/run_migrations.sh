#!/bin/bash
set -e

echo "🔄 Exécution des migrations..."
echo "DATABASE_URL: ${DATABASE_URL:0:30}..." # Affiche le début de l'URL (debug)

# Exécuter les migrations avec DATABASE_URL
DATABASE_URL="$DATABASE_URL" /app/migration up

echo "✅ Migrations terminées !"
echo "🚀 Démarrage du backend..."
exec /app/backend
