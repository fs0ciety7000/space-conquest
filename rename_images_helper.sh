#!/bin/bash

# 🎨 Script d'aide au renommage des images
# Ce script vous aide à renommer vos images selon la nomenclature correcte

echo "=========================================="
echo "  🖼️  AIDE AU RENOMMAGE D'IMAGES"
echo "=========================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les exemples de renommage
show_buildings_examples() {
    echo -e "${GREEN}📁 BÂTIMENTS${NC}"
    echo "----------------------------------------"
    echo "Si vos fichiers s'appellent :"
    echo ""
    echo "  laboratoire.png         → building-research-lab.png"
    echo "  hangar.png              → building-hangar.png"
    echo "  stockage.png            → building-resource-storage.png"
    echo "  depot.png               → building-alliance-depot.png"
    echo "  silo.png                → building-missile-silo.png"
    echo "  nanites.png             → building-nanite-factory.png"
    echo "  terraformer.png         → building-terraformer.png"
    echo ""
}

show_ships_examples() {
    echo -e "${GREEN}🚀 VAISSEAUX${NC}"
    echo "----------------------------------------"
    echo "Si vos fichiers s'appellent :"
    echo ""
    echo "  chasseur-lourd.png      → ship-heavy-hunter.png"
    echo "  vaisseau-guerre.png     → ship-battleship.png"
    echo "  destructeur.png         → ship-destroyer.png"
    echo "  bombardier.png          → ship-bomber.png"
    echo "  etoile-mort.png         → ship-deathstar.png"
    echo ""
}

# Fonction pour renommer interactivement
rename_interactive() {
    local type=$1
    local dir=$2

    echo -e "${YELLOW}Mode interactif pour ${type}${NC}"
    echo "Entrez 'q' pour quitter"
    echo ""

    cd "$dir" 2>/dev/null || {
        echo -e "${RED}Erreur : le dossier $dir n'existe pas${NC}"
        return 1
    }

    # Lister les fichiers PNG et JPG
    files=(*.png *.jpg *.jpeg)

    if [ ${#files[@]} -eq 0 ] || [ "${files[0]}" == "*.png" ]; then
        echo -e "${RED}Aucun fichier PNG/JPG trouvé dans $dir${NC}"
        return 1
    fi

    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            echo "----------------------------------------"
            echo -e "Fichier actuel : ${YELLOW}$file${NC}"
            echo -n "Nouveau nom (sans extension) : "
            read -r newname

            if [ "$newname" == "q" ]; then
                echo "Annulé."
                return 0
            fi

            if [ -n "$newname" ]; then
                extension="${file##*.}"
                mv "$file" "${newname}.${extension}"
                echo -e "${GREEN}✓ Renommé : ${newname}.${extension}${NC}"
            else
                echo "Ignoré."
            fi
        fi
    done
}

# Menu principal
echo "Que voulez-vous faire ?"
echo ""
echo "  1. Voir les exemples de renommage (bâtiments)"
echo "  2. Voir les exemples de renommage (vaisseaux)"
echo "  3. Renommer interactivement (bâtiments)"
echo "  4. Renommer interactivement (vaisseaux)"
echo "  5. Afficher la liste complète des noms attendus"
echo "  q. Quitter"
echo ""
echo -n "Votre choix : "
read -r choice

case $choice in
    1)
        show_buildings_examples
        ;;
    2)
        show_ships_examples
        ;;
    3)
        rename_interactive "bâtiments" "frontend/public/images/buildings"
        ;;
    4)
        rename_interactive "vaisseaux" "frontend/public/images/ships"
        ;;
    5)
        echo ""
        echo -e "${GREEN}BÂTIMENTS (frontend/public/images/buildings/)${NC}"
        echo "  building-research-lab.webp"
        echo "  building-hangar.webp"
        echo "  building-resource-storage.webp"
        echo "  building-alliance-depot.webp"
        echo "  building-missile-silo.webp"
        echo "  building-nanite-factory.webp"
        echo "  building-terraformer.webp"
        echo ""
        echo -e "${GREEN}VAISSEAUX (frontend/public/images/ships/)${NC}"
        echo "  ship-heavy-hunter.webp"
        echo "  ship-battleship.webp"
        echo "  ship-destroyer.webp"
        echo "  ship-bomber.webp"
        echo "  ship-deathstar.webp"
        echo ""
        ;;
    q|Q)
        echo "Au revoir !"
        exit 0
        ;;
    *)
        echo -e "${RED}Choix invalide${NC}"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "N'oubliez pas de lancer ./optimize_images.sh"
echo "après avoir renommé vos fichiers !"
echo "=========================================="
