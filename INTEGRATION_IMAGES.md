# 🎨 Guide d'Intégration des Images

## 📝 Table des Matières
1. [Installation des Dépendances](#installation)
2. [Optimisation des Images](#optimisation)
3. [Intégration dans les Composants](#integration)
4. [Exemples Complets](#exemples)

---

## 1️⃣ Installation des Dépendances {#installation}

```bash
# Installer ImageMagick (pour la conversion)
sudo apt-get update
sudo apt-get install imagemagick webp -y
```

---

## 2️⃣ Optimisation des Images {#optimisation}

### Étapes :

1. **Placer vos images PNG/JPG** dans les bons dossiers :
   ```
   frontend/public/images/
   ├── ships/          → Vaisseaux
   ├── buildings/      → Bâtiments
   ├── resources/      → Mines
   └── defenses/       → Défenses
   ```

2. **Lancer le script d'optimisation** :
   ```bash
   ./optimize-images.sh
   ```

3. **Vérifier les résultats** :
   - Images converties en WebP (512x512px)
   - Réduction de ~95% de la taille
   - Qualité 80% (imperceptible à l'œil)

---

## 3️⃣ Intégration dans les Composants {#integration}

### A. Import des helpers

```tsx
// En haut du fichier
import { GameImage } from '@/components/ui/game-image';
import { getShipImage, getBuildingImage, getResourceImage, getDefenseImage } from '@/lib/images';
```

### B. Utilisation dans une Card

```tsx
// Exemple : Card de vaisseau
<Card className="...">
  <CardContent className="...">

    {/* AVANT : Juste une icône */}
    <div className="p-3 rounded-lg bg-red-600">
      <Crosshair size={24} />
    </div>

    {/* APRÈS : Image + icône en fallback */}
    <GameImage
      src={getShipImage('light_hunter')}
      alt="Chasseur Léger"
      className="w-full h-32 mb-4"
      fallbackIcon={<Crosshair className="w-16 h-16 text-red-400" />}
      loading="lazy"
    />

    <h3>Chasseur Léger</h3>
    {/* ... reste du contenu */}
  </CardContent>
</Card>
```

---

## 4️⃣ Exemples Complets par Composant {#exemples}

### 🚀 A. Shipyard.tsx

**Modifications à apporter :**

```tsx
// 1. Imports (en haut du fichier)
import { GameImage } from '@/components/ui/game-image';
import { getShipImage } from '@/lib/images';

// 2. Dans le rendu de chaque ship card (ligne ~170)
<Card key={ship.id} className={`...`}>
  <CardContent className="p-4">

    {/* AJOUTER : Image du vaisseau */}
    <GameImage
      src={getShipImage(ship.id)}
      alt={ship.name}
      className="w-full h-40 mb-4 rounded-xl"
      fallbackIcon={<ship.icon className="w-20 h-20" />}
    />

    {/* Badge Type */}
    <span className={`...`}>{ship.type}</span>

    {/* Nom du vaisseau */}
    <h3>{ship.name}</h3>

    {/* Stats, coûts, boutons... */}
  </CardContent>
</Card>
```

---

### ⛏️ B. ResourceDisplay.tsx (Mines)

```tsx
// 1. Imports
import { GameImage } from '@/components/ui/game-image';
import { getResourceImage } from '@/lib/images';

// 2. Dans le rendu de chaque mine (ligne ~280)
<Card key={b.id} className={`...`}>

  {/* AJOUTER : Image de la mine */}
  <GameImage
    src={getResourceImage(b.id)}
    alt={b.name}
    className="w-full h-32 rounded-t-xl"
    fallbackIcon={<theme.icon className="w-16 h-16" />}
  />

  <CardContent className="p-4">
    <h3>{b.name}</h3>
    <p>Niveau {b.lv}</p>
    {/* ... stats de production */}
  </CardContent>
</Card>
```

---

### 🏗️ C. Facilities.tsx (Bâtiments)

```tsx
// 1. Imports
import { GameImage } from '@/components/ui/game-image';
import { getBuildingImage } from '@/lib/images';

// 2. Dans le rendu de chaque facility (ligne ~134)
<Card key={fac.id} className={`...`}>
  <CardContent className="p-6">

    {/* AJOUTER : Image du bâtiment */}
    <GameImage
      src={getBuildingImage(fac.id)}
      alt={fac.name}
      className="w-full h-40 mb-4 rounded-xl"
      fallbackIcon={<Icon size={80} />}
    />

    <h3>{fac.name}</h3>
    <p>{fac.desc}</p>
    {/* ... stats et boutons */}
  </CardContent>
</Card>
```

---

### 🛡️ D. Defenses.tsx (Défenses)

```tsx
// 1. Imports
import { GameImage } from '@/components/ui/game-image';
import { getDefenseImage } from '@/lib/images';

// 2. Dans le rendu de chaque défense
<Card key={def.id} className={`...`}>

  {/* AJOUTER : Image de la défense */}
  <GameImage
    src={getDefenseImage(def.id)}
    alt={def.name}
    className="w-full h-36 mb-4 rounded-xl"
    fallbackIcon={<def.icon className="w-16 h-16" />}
  />

  <CardContent>
    <h3>{def.name}</h3>
    {/* ... stats et construction */}
  </CardContent>
</Card>
```

---

### 🔬 E. TechTree.tsx (Technologies)

```tsx
// 1. Imports
import { GameImage } from '@/components/ui/game-image';
import { getTechImage } from '@/lib/images';

// 2. Dans le rendu de chaque tech
<Card key={tech.id} className={`...`}>

  {/* AJOUTER : Image de la techno */}
  <GameImage
    src={getTechImage(tech.id)}
    alt={tech.name}
    className="w-full h-36 mb-4"
    fallbackIcon={<tech.icon className="w-16 h-16" />}
  />

  <CardContent>
    <h3>{tech.name}</h3>
    {/* ... description et upgrade */}
  </CardContent>
</Card>
```

---

## 💡 Conseils de Design

### Layout Recommandé pour les Cards

```tsx
<Card className="...">
  {/* 1. Image en pleine largeur en haut */}
  <GameImage
    src={getShipImage('light_hunter')}
    alt="Chasseur Léger"
    className="w-full h-40"
  />

  <CardContent className="p-4">
    {/* 2. Badge/Tag */}
    <span className="badge">OFFENSIF</span>

    {/* 3. Titre */}
    <h3 className="text-xl font-black">Chasseur Léger</h3>

    {/* 4. Description courte */}
    <p className="text-sm text-slate-400">Intercepteur rapide</p>

    {/* 5. Stats */}
    <div className="grid grid-cols-3 gap-2">
      <Stat label="ATK" value={50} />
      <Stat label="DEF" value={400} />
      <Stat label="FRET" value={50} />
    </div>

    {/* 6. Coûts */}
    <div className="costs">...</div>

    {/* 7. Actions */}
    <Button>Construire</Button>
  </CardContent>
</Card>
```

---

## 🎯 Checklist d'Intégration

- [ ] Installer ImageMagick et WebP
- [ ] Créer les dossiers `ships/`, `buildings/`, `resources/`, `defenses/`
- [ ] Placer les images PNG/JPG dans les bons dossiers
- [ ] Lancer `./optimize-images.sh`
- [ ] Importer `GameImage` dans chaque composant
- [ ] Importer les helpers (`getShipImage`, etc.)
- [ ] Remplacer les icônes par `<GameImage />`
- [ ] Tester avec et sans images (fallback)
- [ ] Vérifier les performances (lazy loading)
- [ ] Commit et push ! 🚀

---

## 📊 Avant/Après

### Avant (Sans images)
```tsx
<div className="p-3 bg-red-600 rounded-lg">
  <Crosshair size={24} />
</div>
<h3>Chasseur Léger</h3>
```

### Après (Avec images optimisées)
```tsx
<GameImage
  src={getShipImage('light_hunter')}
  alt="Chasseur Léger"
  className="w-full h-40 mb-4 rounded-xl"
  fallbackIcon={<Crosshair className="w-16 h-16" />}
/>
<h3>Chasseur Léger</h3>
```

**Résultat** :
- ✅ Cards beaucoup plus visuelles et immersives
- ✅ Images optimisées (WebP 512x512, ~50-100 Ko)
- ✅ Fallback automatique si image manquante
- ✅ Lazy loading pour les performances
- ✅ Skeleton loading pendant le chargement

---

## 🚨 Important

**NE PAS OUBLIER** de créer une image `placeholder.webp` dans `/images/misc/` pour les fallbacks génériques !

```bash
# Créer un placeholder simple (carré gris avec icône)
convert -size 512x512 xc:'#1e293b' \
  -gravity center \
  -fill '#475569' \
  -draw 'circle 256,256 256,128' \
  frontend/public/images/misc/placeholder.webp
```

---

Voilà ! Tout est prêt pour intégrer les images. 🎨✨
