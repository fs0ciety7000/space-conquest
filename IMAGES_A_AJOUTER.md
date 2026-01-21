# 🖼️ Images à Ajouter - Guide Complet

## 📁 Structure des Dossiers

```
frontend/public/images/
├── ships/          → Tous les vaisseaux spatiaux
├── buildings/      → Tous les bâtiments et installations
├── resources/      → Mines et centrales (optionnel)
└── defenses/       → Systèmes de défense (optionnel)
```

---

## 🏗️ BÂTIMENTS (Buildings)

Placer les images dans : `frontend/public/images/buildings/`

### Noms de fichiers exacts à créer :

| Nom du fichier | Description | Clé système |
|----------------|-------------|-------------|
| `building-research-lab.webp` | Laboratoire de Recherche | `research_lab` |
| `building-hangar.webp` | Hangar à Vaisseaux | `hangar` |
| `building-resource-storage.webp` | Stockage de Ressources | `resource_storage` |
| `building-alliance-depot.webp` | Dépôt d'Alliance | `alliance_depot` |
| `building-missile-silo.webp` | Silo à Missiles | `missile_silo` |
| `building-nanite-factory.webp` | Usine de Nanites | `nanite_factory` |
| `building-terraformer.webp` | Terraformeur | `terraformer` |

**Format de nommage** : `building-<key>.webp`
- Remplacer les underscores `_` par des tirets `-`
- Exemple : `research_lab` → `building-research-lab.webp`

---

## 🚀 VAISSEAUX (Ships)

Placer les images dans : `frontend/public/images/ships/`

### Noms de fichiers exacts à créer :

| Nom du fichier | Description | Clé système |
|----------------|-------------|-------------|
| `ship-heavy-hunter.webp` | Chasseur Lourd | `heavy_hunter` |
| `ship-battleship.webp` | Vaisseau de Guerre | `battleship` |
| `ship-destroyer.webp` | Destructeur | `destroyer` |
| `ship-bomber.webp` | Bombardier | `bomber` |
| `ship-deathstar.webp` | Étoile de la Mort | `deathstar` |

**Format de nommage** : `ship-<key>.webp`
- Remplacer les underscores `_` par des tirets `-`
- Exemple : `heavy_hunter` → `ship-heavy-hunter.webp`

---

## 📋 Processus Étape par Étape

### 1. Préparer vos images sources (PNG/JPG)

Organisez vos images sources dans un dossier temporaire :

```bash
mkdir -p /tmp/images-sources/buildings
mkdir -p /tmp/images-sources/ships

# Placer vos PNG/JPG dans ces dossiers
# Exemple :
#   /tmp/images-sources/buildings/research-lab.png
#   /tmp/images-sources/ships/heavy-hunter.png
```

### 2. Renommer selon la nomenclature

**Pour les bâtiments** :
```bash
cd /tmp/images-sources/buildings

# Renommer vos fichiers selon le format :
# building-<key>.png ou building-<key>.jpg

# Exemples :
mv "laboratoire.png" "building-research-lab.png"
mv "hangar.png" "building-hangar.png"
mv "stockage.png" "building-resource-storage.png"
mv "depot-alliance.png" "building-alliance-depot.png"
mv "silo-missiles.png" "building-missile-silo.png"
mv "nanites.png" "building-nanite-factory.png"
mv "terraformeur.png" "building-terraformer.png"
```

**Pour les vaisseaux** :
```bash
cd /tmp/images-sources/ships

# Exemples :
mv "chasseur-lourd.png" "ship-heavy-hunter.png"
mv "vaisseau-guerre.png" "ship-battleship.png"
mv "destructeur.png" "ship-destroyer.png"
mv "bombardier.png" "ship-bomber.png"
mv "etoile-mort.png" "ship-deathstar.png"
```

### 3. Copier dans le projet

```bash
# Copier toutes les images sources dans le projet
cp /tmp/images-sources/buildings/*.{png,jpg} /home/user/space-conquest/frontend/public/images/buildings/
cp /tmp/images-sources/ships/*.{png,jpg} /home/user/space-conquest/frontend/public/images/ships/
```

### 4. Lancer le script d'optimisation

```bash
cd /home/user/space-conquest
chmod +x optimize_images.sh
./optimize_images.sh
```

Le script va :
- ✅ Convertir toutes les PNG/JPG en WebP
- ✅ Redimensionner à 512x512px (ou autre taille configurée)
- ✅ Compresser avec qualité 80% (excellent compromis)
- ✅ Créer les fichiers `.webp` optimisés

### 5. Vérifier les résultats

```bash
# Lister les images converties
ls -lh frontend/public/images/buildings/*.webp
ls -lh frontend/public/images/ships/*.webp
```

Vous devriez voir :
```
building-research-lab.webp    (~50-100 Ko)
building-hangar.webp          (~50-100 Ko)
building-resource-storage.webp
...
ship-heavy-hunter.webp        (~50-100 Ko)
ship-battleship.webp
ship-destroyer.webp
...
```

---

## 🎨 Recommandations pour les Images Sources

### Résolution & Format
- **Format source** : PNG (avec transparence) ou JPG
- **Résolution recommandée** : 1024x1024px minimum (sera redimensionné à 512x512)
- **Ratio** : Carré (1:1) de préférence
- **Fond** : Transparent (PNG) ou noir spatial (JPG)

### Style visuel
- **Ambiance** : Spatial, futuriste, sci-fi
- **Couleurs** : Dominante bleue/cyan pour vaisseaux, gris métal pour bâtiments
- **Éclairage** : Effet néon, lueurs énergétiques
- **Angle de vue** : 3/4 isométrique ou vue de face
- **Détails** : Panels, antennes, réacteurs visibles

### Exemples de prompt pour génération IA

**Bâtiments** :
```
"Futuristic space station [BUILDING_NAME], isometric view, dark metal and blue neon lights,
sci-fi architecture, detailed panels and structures, space background,
high-tech facility, cinematic lighting, 4K quality"
```

**Vaisseaux** :
```
"Sci-fi spaceship [SHIP_NAME], side view, metallic hull with blue energy trails,
advanced weapons systems, glowing engines, space combat vessel,
cinematic lighting, detailed design, 4K quality"
```

---

## 🔍 Exemples Spécifiques

### Laboratoire de Recherche
**Prompt suggéré** :
```
"Futuristic research laboratory space station, holographic displays,
scientists working, blue glowing screens, advanced technology,
isometric view, sci-fi, dark metal structure"
```

**Fichier** : `building-research-lab.webp`

---

### Chasseur Lourd
**Prompt suggéré** :
```
"Heavy fighter spaceship, aggressive design, dual engines with blue flames,
mounted weapons, armored hull, side profile view, space combat vessel,
cinematic lighting"
```

**Fichier** : `ship-heavy-hunter.webp`

---

### Étoile de la Mort
**Prompt suggéré** :
```
"Massive spherical space station, planet destroyer weapon,
detailed surface with trenches and structures, ominous and powerful,
death star inspired, cinematic space scene, enormous scale"
```

**Fichier** : `ship-deathstar.webp`

---

## ✅ Checklist Finale

Avant de commit :

- [ ] Toutes les images sont en format `.webp`
- [ ] Noms de fichiers respectent la nomenclature exacte
- [ ] Taille des fichiers < 150 Ko chacun
- [ ] Les images sont carrées (512x512px recommandé)
- [ ] Testé dans le jeu (vérifier l'affichage)
- [ ] Pas d'erreurs 404 dans la console

---

## 🚨 Troubleshooting

### Problème : Images ne s'affichent pas
**Solution** : Vérifier le nom exact du fichier
```bash
# Doit être exactement :
building-research-lab.webp  # ✅ Correct
building-research_lab.webp  # ❌ Incorrect (underscore)
research-lab.webp           # ❌ Incorrect (manque "building-")
```

### Problème : Images trop lourdes
**Solution** : Réduire la qualité dans le script
```bash
# Modifier optimize_images.sh
# Changer -quality 80 → -quality 70
```

### Problème : Script d'optimisation ne fonctionne pas
**Solution** : Installer les dépendances
```bash
sudo apt-get update
sudo apt-get install imagemagick webp -y
```

---

## 📚 Référence Complète des Clés

### Tous les bâtiments existants
```
metal_mine          → Mine de Métal
crystal_mine        → Mine de Cristal
deuterium_mine      → Synthétiseur de Deutérium
solar_plant         → Centrale Solaire
fusion_plant        → Centrale à Fusion
research_lab        → Laboratoire de Recherche ⭐ NOUVEAU
shipyard            → Chantier Spatial
hangar              → Hangar ⭐ NOUVEAU
resource_storage    → Stockage de Ressources ⭐ NOUVEAU
alliance_depot      → Dépôt d'Alliance ⭐ NOUVEAU
missile_silo        → Silo à Missiles ⭐ NOUVEAU
nanite_factory      → Usine de Nanites ⭐ NOUVEAU
terraformer         → Terraformeur ⭐ NOUVEAU
```

### Tous les vaisseaux existants
```
light_hunter        → Chasseur Léger
heavy_hunter        → Chasseur Lourd ⭐ NOUVEAU
cruiser             → Croiseur
battleship          → Vaisseau de Guerre ⭐ NOUVEAU
destroyer           → Destructeur ⭐ NOUVEAU
bomber              → Bombardier ⭐ NOUVEAU
deathstar           → Étoile de la Mort ⭐ NOUVEAU
spy_probe           → Sonde d'Espionnage
transporter         → Transporteur
colony_ship         → Vaisseau de Colonisation
recycler            → Recycleur
```

---

**Bon courage pour la création de vos images ! 🎨✨**
