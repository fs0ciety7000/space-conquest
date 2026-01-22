#!/bin/bash

# 🎨 Template de renommage en batch
# Modifiez ce fichier selon vos noms de fichiers actuels
# Puis lancez : bash batch_rename_template.sh

echo "🖼️ Renommage des images en batch..."

# ==================== BÂTIMENTS ====================
cd frontend/public/images/buildings/

# Décommentez et adaptez selon vos noms de fichiers :

# Exemple si vos fichiers sont en français :
# mv "laboratoire.png" "building-research-lab.png"
# mv "hangar.png" "building-hangar.png"
# mv "stockage.png" "building-resource-storage.png"
# mv "depot.png" "building-alliance-depot.png"
# mv "silo.png" "building-missile-silo.png"
# mv "nanites.png" "building-nanite-factory.png"
# mv "terraformeur.png" "building-terraformer.png"

# Exemple si vos fichiers sont numérotés :
# mv "building_01.png" "building-research-lab.png"
# mv "building_02.png" "building-hangar.png"
# mv "building_03.png" "building-resource-storage.png"
# mv "building_04.png" "building-alliance-depot.png"
# mv "building_05.png" "building-missile-silo.png"
# mv "building_06.png" "building-nanite-factory.png"
# mv "building_07.png" "building-terraformer.png"

cd ../../../..

# ==================== VAISSEAUX ====================
cd frontend/public/images/ships/

# Décommentez et adaptez selon vos noms de fichiers :

# Exemple si vos fichiers sont en français :
# mv "chasseur-lourd.png" "ship-heavy-hunter.png"
# mv "vaisseau-guerre.png" "ship-battleship.png"
# mv "destructeur.png" "ship-destroyer.png"
# mv "bombardier.png" "ship-bomber.png"
# mv "etoile-mort.png" "ship-deathstar.png"

# Exemple si vos fichiers sont numérotés :
# mv "ship_01.png" "ship-heavy-hunter.png"
# mv "ship_02.png" "ship-battleship.png"
# mv "ship_03.png" "ship-destroyer.png"
# mv "ship_04.png" "ship-bomber.png"
# mv "ship_05.png" "ship-deathstar.png"

cd ../../../..

echo ""
echo "✅ Renommage terminé !"
echo ""
echo "Prochaine étape : ./optimize_images.sh"
