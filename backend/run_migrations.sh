#!/bin/bash
set -e

echo "🔄 Exécution des migrations..."
cd /app/migration
cargo run --release
echo "✅ Migrations terminées !"
