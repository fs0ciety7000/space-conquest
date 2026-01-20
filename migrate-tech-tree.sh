#!/bin/bash

echo "🚀 Migration du système Tech Tree"
echo "=================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Étape 1: Appliquer les migrations
echo -e "${YELLOW}Étape 1: Application des migrations de base de données${NC}"
echo "--------------------------------------------------------"
cd backend/migration
cargo run -- up
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Échec de l'application des migrations${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Migrations appliquées avec succès${NC}"
echo ""

# Étape 2: Recompiler le backend
echo -e "${YELLOW}Étape 2: Recompilation du backend${NC}"
echo "-----------------------------------"
cd ../..
cd backend
cargo build --release
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Échec de la compilation${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend compilé avec succès${NC}"
echo ""

# Étape 3: Vérifier les données
echo -e "${YELLOW}Étape 3: Vérification des données migrées${NC}"
echo "------------------------------------------"
echo "Nombre de technologies:"
psql -U postgres -d space_db -t -c "SELECT COUNT(*) FROM technologies;" 2>/dev/null || echo "PostgreSQL non accessible (normal si vous utilisez Docker)"

echo ""
echo "Nombre de ship_types:"
psql -U postgres -d space_db -t -c "SELECT COUNT(*) FROM ship_types;" 2>/dev/null || echo "PostgreSQL non accessible (normal si vous utilisez Docker)"

echo ""
echo "Nombre de building_types:"
psql -U postgres -d space_db -t -c "SELECT COUNT(*) FROM building_types;" 2>/dev/null || echo "PostgreSQL non accessible (normal si vous utilisez Docker)"

echo ""
echo -e "${GREEN}✅ Vérification terminée${NC}"
echo ""

# Étape 4: Instructions finales
echo -e "${YELLOW}Étape 4: Redémarrage du backend${NC}"
echo "--------------------------------"
echo ""
echo "Si vous utilisez Docker:"
echo -e "  ${GREEN}docker-compose down${NC}"
echo -e "  ${GREEN}docker-compose up -d --build backend${NC}"
echo ""
echo "Si vous lancez directement le backend:"
echo -e "  ${GREEN}cd backend && cargo run --release${NC}"
echo ""

echo -e "${YELLOW}Étape 5: Mise à jour du frontend${NC}"
echo "----------------------------------"
echo ""
echo "Consultez le fichier ${GREEN}frontend-helper-migration.md${NC} pour:"
echo "  - Les changements dans l'API"
echo "  - Les fonctions helper de compatibilité"
echo "  - Les exemples de migration de code"
echo ""

echo -e "${GREEN}✨ Migration terminée !${NC}"
echo ""
echo "Points à vérifier :"
echo "  1. Le backend est redémarré"
echo "  2. Les endpoints /planets/:id/building-types et /defense-types fonctionnent"
echo "  3. Les technologies s'améliorent correctement"
echo "  4. Le multiplicateur de vitesse (construction_speed_multiplier) est appliqué"
