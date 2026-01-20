# 🎨 Structure des Images - Space Conquest

## 📁 Organisation des Dossiers

```
frontend/public/images/
├── ships/          # Vaisseaux de guerre
├── buildings/      # Bâtiments et installations
├── resources/      # Mines et ressources
├── defenses/       # Systèmes de défense
└── misc/          # Divers (planètes, effets, etc.)
```

## 📝 Convention de Nommage

### Format : `{categorie}-{nom}.webp`

**Exemples :**
- `ship-light-hunter.webp`
- `ship-cruiser.webp`
- `building-shipyard.webp`
- `resource-metal-mine.webp`

### Taille Recommandée
- **Cards** : 512x512px (optimal pour affichage)
- **Format** : WebP (meilleure compression)
- **Qualité** : 80% (bon compromis taille/qualité)

---

## 🚀 Liste Complète des Images à Créer

### 🛸 SHIPS (Vaisseaux)
```
ship-light-hunter.webp          # Chasseur Léger
ship-cruiser.webp                # Croiseur
ship-recycler.webp               # Recycleur
ship-spy-probe.webp              # Sonde d'Espionnage
ship-colony-ship.webp            # Vaisseau de Colonisation
ship-transporter.webp            # Transporteur
```

### 🏗️ BUILDINGS (Bâtiments/Installations)
```
building-shipyard.webp           # Chantier Spatial
building-research-lab.webp       # Laboratoire de Recherche
building-hangar.webp             # Hangar à Vaisseaux
building-resource-storage.webp   # Hangar à Ressources
building-solar-plant.webp        # Centrale Solaire
```

### ⛏️ RESOURCES (Mines)
```
resource-metal-mine.webp         # Mine de Métal
resource-crystal-mine.webp       # Mine de Cristal
resource-deuterium-synth.webp    # Synthétiseur de Deutérium
```

### 🛡️ DEFENSES (Défenses)
```
defense-missile-launcher.webp    # Lanceur de Missiles
defense-plasma-turret.webp       # Tourelle Plasma
```

### 🔬 TECHNOLOGIES (Optionnel)
```
tech-energy.webp                 # Technologie Énergie
tech-laser.webp                  # Technologie Laser
tech-armour.webp                 # Technologie Protection
tech-espionage.webp              # Technologie Espionnage
```

---

## 🎯 Nommage Actuel → Nouveau

| Fichier Actuel | Nouveau Nom |
|----------------|-------------|
| `light-hunter.jpg` | `ship-light-hunter.webp` |

---

## 🔧 Script d'Optimisation

Voir `optimize-images.sh` pour l'optimisation automatique :
- Redimensionnement à 512x512
- Conversion PNG/JPG → WebP
- Compression intelligente (qualité 80%)
- Réduction ~70-85% de la taille

---

## 💡 Utilisation dans le Code

```tsx
// Import simple
<img src="/images/ships/ship-light-hunter.webp" alt="Chasseur Léger" />

// Avec lazy loading
<img
  src="/images/ships/ship-light-hunter.webp"
  alt="Chasseur Léger"
  loading="lazy"
  className="w-full h-full object-cover"
/>
```

---

## 📊 Estimations de Taille

### Avant Optimisation (PNG 1024x1024)
- 1 image : ~1.7 Mo
- 20 images : ~34 Mo

### Après Optimisation (WebP 512x512)
- 1 image : ~50-100 Ko
- 20 images : ~1-2 Mo

**Économie : ~95% de réduction !** 🎉
