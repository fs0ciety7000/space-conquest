#!/bin/bash
set -e

echo "🔄 Starting deployment..."
echo "📊 Environment:"
env | grep -E '(DATABASE_URL|REDIS_URL|PORT)'

echo ""
echo "🔄 Running database migrations..."

# Test connexion DB
echo "🧪 Testing DB connection..."
timeout 10s psql $DATABASE_URL -c "SELECT 1" || echo "⚠️ DB connection test failed"

# Exécuter les migrations avec logs détaillés
./migration 2>&1 | tee migration.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ Migrations completed successfully"
else
    echo "❌ Migrations failed - check migration.log"
    cat migration.log
    exit 1
fi

echo "🚀 Starting backend server on $(./backend --help | head -1)..."
echo "📡 PORT: $PORT"
echo "🌐 BIND: 0.0.0.0"

# Démarrer le serveur
exec ./backend
