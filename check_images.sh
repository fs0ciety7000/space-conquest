#!/bin/bash

# Script de vérification des images manquantes

echo "========================================"
echo "  🔍 VÉRIFICATION DES IMAGES"
echo "========================================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SHIPS_DIR="frontend/public/images/ships"
BUILDINGS_DIR="frontend/public/images/buildings"

# Liste des vaisseaux requis
SHIPS=(
    "ship-light-hunter.webp"
    "ship-heavy-hunter.webp"
    "ship-cruiser.webp"
    "ship-battleship.webp"
    "ship-destroyer.webp"
    "ship-bomber.webp"
    "ship-deathstar.webp"
    "ship-spy-probe.webp"
    "ship-transporter.webp"
    "ship-colony-ship.webp"
    "ship-recycler.webp"
)

# Liste des bâtiments requis
BUILDINGS=(
    "building-shipyard.webp"
    "building-solar-plant.webp"
    "building-research-lab.webp"
    "building-hangar.webp"
    "building-resource-storage.webp"
    "building-alliance-depot.webp"
    "building-missile-silo.webp"
    "building-nanite-factory.webp"
    "building-terraformer.webp"
)

echo -e "${YELLOW}🚀 VAISSEAUX${NC}"
echo "----------------------------------------"
SHIP_MISSING=0
SHIP_FOUND=0

for ship in "${SHIPS[@]}"; do
    if [ -f "$SHIPS_DIR/$ship" ]; then
        echo -e "${GREEN}✅${NC} $ship"
        ((SHIP_FOUND++))
    else
        echo -e "${RED}❌${NC} $ship ${RED}(MANQUANT)${NC}"
        ((SHIP_MISSING++))
    fi
done

echo ""
echo -e "${YELLOW}🏗️  BÂTIMENTS${NC}"
echo "----------------------------------------"
BUILDING_MISSING=0
BUILDING_FOUND=0

for building in "${BUILDINGS[@]}"; do
    if [ -f "$BUILDINGS_DIR/$building" ]; then
        echo -e "${GREEN}✅${NC} $building"
        ((BUILDING_FOUND++))
    else
        echo -e "${RED}❌${NC} $building ${RED}(MANQUANT)${NC}"
        ((BUILDING_MISSING++))
    fi
done

echo ""
echo "========================================"
echo -e "${GREEN}✅ Trouvées :${NC} Vaisseaux: $SHIP_FOUND/11 | Bâtiments: $BUILDING_FOUND/9"
echo -e "${RED}❌ Manquantes :${NC} Vaisseaux: $SHIP_MISSING/11 | Bâtiments: $BUILDING_MISSING/9"
echo "========================================"

TOTAL_MISSING=$((SHIP_MISSING + BUILDING_MISSING))

if [ $TOTAL_MISSING -eq 0 ]; then
    echo -e "${GREEN}✨ Toutes les images sont présentes !${NC}"
else
    echo ""
    echo -e "${YELLOW}📝 PROCHAINES ÉTAPES :${NC}"
    echo "1. Placer vos images PNG/JPG dans les dossiers"
    echo "2. Renommer avec les noms exacts ci-dessus"
    echo "3. Lancer : ./optimize_images.sh"
    echo ""
    echo "Voir : IMAGES_A_AJOUTER.md pour plus de détails"
fi

echo ""
