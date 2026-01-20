#!/bin/bash

# 🎨 Script d'optimisation des images pour Space Conquest
# Convertit PNG/JPG → WebP avec redimensionnement et compression

set -e

IMAGES_DIR="frontend/public/images"
TARGET_SIZE=512
QUALITY=80

echo "🎨 ====================================="
echo "   OPTIMISATION DES IMAGES"
echo "====================================="
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Vérifier si ImageMagick est installé
if ! command -v convert &> /dev/null; then
    echo -e "${RED}❌ ImageMagick n'est pas installé${NC}"
    echo "Installation: sudo apt-get install imagemagick"
    exit 1
fi

# Vérifier si cwebp est installé
if ! command -v cwebp &> /dev/null; then
    echo -e "${YELLOW}⚠️  cwebp n'est pas installé, installation...${NC}"
    sudo apt-get update && sudo apt-get install -y webp
fi

echo -e "${BLUE}📁 Dossier de travail: $IMAGES_DIR${NC}"
echo -e "${BLUE}🎯 Taille cible: ${TARGET_SIZE}x${TARGET_SIZE}px${NC}"
echo -e "${BLUE}💎 Qualité WebP: ${QUALITY}%${NC}"
echo ""

# Statistiques
total_original_size=0
total_optimized_size=0
count=0

# Fonction d'optimisation
optimize_image() {
    local input=$1
    local filename=$(basename "$input")
    local name="${filename%.*}"
    local dir=$(dirname "$input")

    # Déterminer le sous-dossier de destination
    local subdir=""
    if [[ "$dir" == *"/ships"* ]]; then
        subdir="ships"
    elif [[ "$dir" == *"/buildings"* ]]; then
        subdir="buildings"
    elif [[ "$dir" == *"/resources"* ]]; then
        subdir="resources"
    elif [[ "$dir" == *"/defenses"* ]]; then
        subdir="defenses"
    else
        subdir="misc"
    fi

    local output="$IMAGES_DIR/$subdir/${name}.webp"

    # Obtenir la taille originale
    local original_size=$(stat -f%z "$input" 2>/dev/null || stat -c%s "$input")

    echo -e "${YELLOW}🔄 Optimisation: $filename${NC}"

    # Conversion PNG/JPG → WebP avec redimensionnement
    convert "$input" \
        -resize "${TARGET_SIZE}x${TARGET_SIZE}^" \
        -gravity center \
        -extent "${TARGET_SIZE}x${TARGET_SIZE}" \
        -quality $QUALITY \
        "$output"

    # Obtenir la taille optimisée
    local optimized_size=$(stat -f%z "$output" 2>/dev/null || stat -c%s "$output")

    # Calculer la réduction
    local reduction=$(echo "scale=1; (($original_size - $optimized_size) / $original_size) * 100" | bc)

    # Affichage des résultats
    echo -e "  ${GREEN}✓${NC} ${original_size} bytes → ${optimized_size} bytes (${GREEN}-${reduction}%${NC})"
    echo -e "  ${GREEN}✓${NC} Sauvegardé: ${BLUE}$output${NC}"
    echo ""

    # Mettre à jour les statistiques
    total_original_size=$((total_original_size + original_size))
    total_optimized_size=$((total_optimized_size + optimized_size))
    count=$((count + 1))
}

# Traiter tous les PNG et JPG dans le dossier images
echo -e "${BLUE}🔍 Recherche des images PNG et JPG...${NC}"
echo ""

# Traiter les images dans le dossier racine
for img in "$IMAGES_DIR"/*.{png,PNG,jpg,JPG,jpeg,JPEG} 2>/dev/null; do
    [ -f "$img" ] && optimize_image "$img"
done

# Traiter les images dans les sous-dossiers
for subdir in ships buildings resources defenses misc; do
    for img in "$IMAGES_DIR/$subdir"/*.{png,PNG,jpg,JPG,jpeg,JPEG} 2>/dev/null; do
        [ -f "$img" ] && optimize_image "$img"
    done
done

# Afficher les statistiques finales
echo ""
echo -e "${GREEN}====================================="
echo "   OPTIMISATION TERMINÉE !"
echo "=====================================${NC}"
echo ""
echo -e "${BLUE}📊 Statistiques:${NC}"
echo -e "  Images optimisées: ${GREEN}$count${NC}"
echo -e "  Taille originale: ${YELLOW}$(numfmt --to=iec $total_original_size 2>/dev/null || echo $total_original_size bytes)${NC}"
echo -e "  Taille optimisée: ${GREEN}$(numfmt --to=iec $total_optimized_size 2>/dev/null || echo $total_optimized_size bytes)${NC}"

if [ $total_original_size -gt 0 ]; then
    reduction=$(echo "scale=1; (($total_original_size - $total_optimized_size) / $total_original_size) * 100" | bc)
    echo -e "  Réduction totale: ${GREEN}-${reduction}%${NC}"
fi

echo ""
echo -e "${GREEN}✨ Terminé ! Vos images sont prêtes pour la production.${NC}"
echo ""
