#!/bin/bash
set -e

echo "🔄 Running database migrations..."

# Exécuter les migrations
./migration

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully"
else
    echo "❌ Migrations failed"
    exit 1
fi

echo "🚀 Starting backend server..."

# Démarrer le serveur backend
exec ./backend
