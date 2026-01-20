#!/bin/bash

echo "🔄 Migration automatique du frontend - Tech Tree"
echo "================================================"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Fonction pour ajouter l'import si nécessaire
add_import_if_needed() {
    file=$1
    # Vérifier si l'import existe déjà
    if ! grep -q "from.*utils/techTreeCompat" "$file"; then
        # Trouver la ligne d'import React
        if grep -q "from 'react'" "$file"; then
            # Ajouter l'import après les imports React
            sed -i "/from 'react'/a import { getTechLevel, getShipCount } from '@/utils/techTreeCompat';" "$file"
            echo -e "${GREEN}✓${NC} Ajout import dans $(basename $file)"
        fi
    fi
}

# Fonction pour remplacer les anciennes variables
replace_old_vars() {
    file=$1
    echo -e "${YELLOW}Traitement:${NC} $(basename $file)"

    # Remplacer energy_tech_level
    sed -i 's/planet\.energy_tech_level || 0/getTechLevel(planet, '\''energy_tech'\'')/g' "$file"
    sed -i 's/planet\.energy_tech_level/getTechLevel(planet, '\''energy_tech'\'')/g' "$file"
    sed -i 's/p\.energy_tech_level ?? 0/getTechLevel(p, '\''energy_tech'\'')/g' "$file"
    sed -i 's/p\.energy_tech_level/getTechLevel(p, '\''energy_tech'\'')/g' "$file"

    # Remplacer laser_battery_level
    sed -i 's/planet\.laser_battery_level || 0/getTechLevel(planet, '\''laser_tech'\'')/g' "$file"
    sed -i 's/planet\.laser_battery_level/getTechLevel(planet, '\''laser_tech'\'')/g' "$file"

    # Remplacer armour_tech_level
    sed -i 's/planet\.armour_tech_level || 0/getTechLevel(planet, '\''armour_tech'\'')/g' "$file"
    sed -i 's/planet\.armour_tech_level/getTechLevel(planet, '\''armour_tech'\'')/g' "$file"

    # Remplacer espionage_tech_level
    sed -i 's/planet\.espionage_tech_level || 0/getTechLevel(planet, '\''espionage'\'')/g' "$file"
    sed -i 's/planet\.espionage_tech_level/getTechLevel(planet, '\''espionage'\'')/g' "$file"

    # Remplacer ship counts
    sed -i 's/planet\.light_hunter_count || 0/getShipCount(planet, '\''light_hunter'\'')/g' "$file"
    sed -i 's/planet\.light_hunter_count/getShipCount(planet, '\''light_hunter'\'')/g' "$file"
    sed -i 's/p\.light_hunter_count ?? 0/getShipCount(p, '\''light_hunter'\'')/g' "$file"
    sed -i 's/p\.light_hunter_count/getShipCount(p, '\''light_hunter'\'')/g' "$file"

    sed -i 's/planet\.cruiser_count || 0/getShipCount(planet, '\''cruiser'\'')/g' "$file"
    sed -i 's/planet\.cruiser_count/getShipCount(planet, '\''cruiser'\'')/g' "$file"
    sed -i 's/p\.cruiser_count ?? 0/getShipCount(p, '\''cruiser'\'')/g' "$file"
    sed -i 's/p\.cruiser_count/getShipCount(p, '\''cruiser'\'')/g' "$file"

    sed -i 's/planet\.transporter_count || 0/getShipCount(planet, '\''transporter'\'')/g' "$file"
    sed -i 's/planet\.transporter_count/getShipCount(planet, '\''transporter'\'')/g' "$file"

    sed -i 's/planet\.recycler_count || 0/getShipCount(planet, '\''recycler'\'')/g' "$file"
    sed -i 's/planet\.recycler_count/getShipCount(planet, '\''recycler'\'')/g' "$file"
    sed -i 's/p\.recycler_count/getShipCount(p, '\''recycler'\'')/g' "$file"

    sed -i 's/planet\.spy_probe_count || 0/getShipCount(planet, '\''spy_probe'\'')/g' "$file"
    sed -i 's/planet\.spy_probe_count/getShipCount(planet, '\''spy_probe'\'')/g' "$file"
    sed -i 's/p\.spy_probe_count/getShipCount(p, '\''spy_probe'\'')/g' "$file"

    sed -i 's/planet\.colony_ship_count || 0/getShipCount(planet, '\''colony_ship'\'')/g' "$file"
    sed -i 's/planet\.colony_ship_count/getShipCount(planet, '\''colony_ship'\'')/g' "$file"
    sed -i 's/p\.colony_ship_count/getShipCount(p, '\''colony_ship'\'')/g' "$file"

    sed -i 's/planet\.missile_launcher_count || 0/getShipCount(planet, '\''missile_launcher'\'')/g' "$file"
    sed -i 's/planet\.missile_launcher_count/getShipCount(planet, '\''missile_launcher'\'')/g' "$file"

    sed -i 's/planet\.plasma_turret_count || 0/getShipCount(planet, '\''plasma_turret'\'')/g' "$file"
    sed -i 's/planet\.plasma_turret_count/getShipCount(planet, '\''plasma_turret'\'')/g' "$file"

    echo -e "${GREEN}✓${NC} Remplacements effectués"
}

# Trouver tous les fichiers TSX/TS qui utilisent les anciennes variables
files=$(grep -rl "\.energy_tech_level\|\.laser_battery_level\|\.armour_tech_level\|\.light_hunter_count\|\.cruiser_count" frontend/src --include="*.tsx" --include="*.ts" | grep -v "techTreeCompat.ts")

echo ""
echo "Fichiers à migrer:"
echo "$files"
echo ""

for file in $files; do
    add_import_if_needed "$file"
    replace_old_vars "$file"
    echo ""
done

echo -e "${GREEN}✨ Migration terminée!${NC}"
echo ""
echo "Vérifiez les fichiers suivants:"
for file in $files; do
    echo "  - $(basename $file)"
done
