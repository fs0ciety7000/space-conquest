# Changelog - Space Conquest

## [2.0.0] - 2026-01-19 - Refonte graphique Sci-Fi Spatiale complète

### 🎨 Refonte Design System

#### 🚀 Nouveau système de design sci-fi immersif
**Feature**: Transformation complète de l'interface avec un style spatial dynamique, vibrant et performant

**Framer Motion** - Animations fluides et performantes:
- Transitions de page animées avec `AnimatePresence`
- Animations de survol sophistiquées sur les boutons du menu
- Effets d'entrée progressifs avec stagger sur les éléments
- Composants `PageTransition`, `SlideWrapper`, `ScaleWrapper`, `HoverGlow`

**Nouveau système CSS** (`index.css`):
- **Palette de couleurs néon vibrante** : cyan (#00f5ff), magenta (#ff00ff), purple (#a855f7), orange (#ff6b35)
- **Variables CSS personnalisées** pour les ressources : `--color-metal`, `--color-crystal`, `--color-deuterium`, `--color-energy`
- **Fond spatial profond** : `--space-void`, `--space-nebula`, `--space-deep`
- **Effets de glow multiples** : `.glow-cyan`, `.glow-purple`, `.glow-orange`, `.glow-green`, `.glow-red`
- **Glassmorphism avancé** : `.glass-card`, `.glass-panel`, `.holo-card`
- **Scrollbar personnalisée** avec dégradé cyan/purple

**Animations avancées** (`animations.css`):
- **Particules cosmiques** : `particle-float`, `star-drift`
- **Effets d'énergie** : `energy-flow`, `electric-arc`, `plasma-pulse`
- **Hologrammes** : `hologram-flicker`, `hologram-glitch`, `scan-line`
- **Vaisseaux** : `ship-hover`, `ship-warp`, `engine-glow`
- **Combat** : `laser-fire`, `explosion`, `shield-ripple`
- **Interface** : `typing-cursor`, `data-flow`, `status-blink`
- **Notifications** : `notification-pop`, `alert-flash`, `success-shine`
- **Chargement** : `orbit`, `pulse-ring`, `loading-dots`
- **Texte** : `text-reveal`, `text-glitch`, `gradient-text`

---

#### ✨ Nouveaux composants d'effets visuels

**SpaceBackground** - Fond spatial animé:
- **StarField** : Champ d'étoiles scintillantes (100+ étoiles animées)
- **Nebulae** : 3 nébuleuses colorées (violet, cyan, magenta) avec animations de respiration
- **FloatingParticles** : Particules flottantes multicolores montantes
- **ScanLine** : Ligne de scan holographique traversante
- **TechGrid** : Grille technique subtile en arrière-plan
- Configuration flexible via props (`showStars`, `showNebulae`, `showParticles`, etc.)

**SpaceLoader** - Indicateur de chargement spatial:
- Anneaux orbitaux animés
- Point central pulsant
- Orbes en orbite avec délais différés
- Texte de chargement avec effet de respiration

**GlowOrb** - Orbes lumineux décoratifs:
- Couleur, taille, position personnalisables
- Animation de pulsation optionnelle
- Effet de flou configurable

**Motion Wrappers** - Composants d'animation réutilisables:
- `PageTransition` : Transition de page fluide
- `FadeWrapper`, `SlideWrapper`, `ScaleWrapper` : Animations d'entrée
- `StaggerList` : Liste avec animation séquentielle
- `HoverScale`, `HoverGlow` : Effets au survol
- `Pulse`, `Floating` : Animations continues
- `TypingText` : Effet machine à écrire
- `AnimatedCounter` : Compteur animé

---

#### 🎯 Composants UI améliorés

**Card** - Nouvelles variantes:
- `glass` : Effet glassmorphism avec blur
- `holo` : Style holographique avec scan animé
- `glow` : Effet de lueur au survol
- `cyber` : Bordure animée cyberpunk
- Support des couleurs de glow : cyan, purple, orange, green, red, blue

**Button** - Nouvelles variantes sci-fi:
- `neon` : Bordure cyan lumineuse avec effet de balayage
- `cyber` : Style purple avec glow au survol
- `hologram` : Dégradé cyan/purple avec backdrop blur
- `danger`, `success`, `warning` : Variantes colorées avec glow

**Input** - Styles améliorés:
- `glass` : Fond transparent avec blur
- `cyber` : Bordure purple avec effet de focus
- Glow effect au focus

**Progress** - Barre de progression animée:
- Variantes : default, gradient, glow, cyber
- Couleurs : cyan, purple, orange, green, red, blue
- Effet shimmer animé
- Point lumineux pulsant au bout

**Badge** - Nouvelles variantes:
- `neon` : Style cyan lumineux
- `cyber` : Style purple
- `glow` : Dégradé animé
- `pulse` : Animation pulsante rouge
- Statuts : `online`, `offline`, `busy`

**Tooltip** - Style holographique:
- Fond glassmorphism sombre
- Bordure cyan subtile
- Ligne décorative en haut
- Ombre avec glow

**Dialog/Modal** - Effets glassmorphism:
- Fond avec backdrop blur
- Bordure cyan/purple
- Coins décoratifs lumineux
- Ligne décorative en haut
- Ombre avec glow cyan

---

#### 🖥️ Pages mises à jour

**Page de Login** redesignée:
- Fond spatial animé avec scan line
- Carte avec effets holographiques
- Coins décoratifs lumineux
- Logo avec effet glow pulsant
- Inputs avec effets de focus cyan
- Bouton "neon" avec effet de balayage
- Badge "SECURE CHANNEL" animé

**App.tsx** - Layout principal:
- Fond `SpaceBackground` animé remplace l'image statique
- Transitions de page avec `AnimatePresence` et `motion.div`
- Sidebar avec ligne lumineuse décorative
- Boutons du menu avec animations de survol et indicateur actif lumineux
- Écran de chargement avec `SpaceLoader`

---

### 📦 Dépendances ajoutées

```json
{
  "framer-motion": "^11.x"
}
```

### 📁 Fichiers créés/modifiés

**Nouveaux fichiers**:
- `frontend/src/components/ui/space-background.tsx` - Composants d'effets visuels
- `frontend/src/components/ui/motion-wrappers.tsx` - Wrappers d'animation Framer Motion

**Fichiers modifiés**:
- `frontend/src/index.css` - Système de design complet refait
- `frontend/src/styles/animations.css` - 30+ nouvelles animations
- `frontend/src/components/ui/card.tsx` - Variantes glass, holo, glow, cyber
- `frontend/src/components/ui/button.tsx` - Variantes neon, cyber, hologram
- `frontend/src/components/ui/input.tsx` - Variantes glass, cyber
- `frontend/src/components/ui/progress.tsx` - Animations et couleurs
- `frontend/src/components/ui/badge.tsx` - Variantes neon, cyber, glow, pulse
- `frontend/src/components/ui/tooltip.tsx` - Style holographique
- `frontend/src/components/ui/dialog.tsx` - Glassmorphism et coins décoratifs
- `frontend/src/components/Login.tsx` - Redesign complet
- `frontend/src/App.tsx` - Intégration SpaceBackground et transitions

---

### 🚀 Déploiement

**Migrations**: Aucune (modifications frontend uniquement)

**Installation**:
```bash
cd frontend
npm install framer-motion
```

**Tests recommandés**:
1. ✅ Vérifier le fond spatial animé sur toutes les pages
2. ✅ Tester les transitions de page fluides
3. ✅ Vérifier les effets de survol sur les cartes et boutons
4. ✅ Tester la page de login redesignée
5. ✅ Vérifier les animations ne causent pas de lag (60fps)
6. ✅ Tester sur mobile (responsive)

---

### ⚠️ Breaking Changes

Aucun breaking change. Toutes les modifications sont des améliorations visuelles rétrocompatibles.

---

## [1.10.0] - 2026-01-19 - Refonte design globale et optimisations expéditions

### 🎯 Nouvelles fonctionnalités

#### 🎨 Refonte design globale - Interface dynamique et vibrante
**Feature**: Transformation complète de l'interface avec animations modernes, colorée et épurée

**Nouveau système d'animations** (`animations.css`):
- **9 animations keyframe**: glow-pulse, shine, float, gradient-shift, scale-pulse, slide-up, fade-in, bounce-subtle, spin-slow
- **Classes utilitaires** réutilisables pour application facile
- **Gradients personnalisés** par ressource (métal: orange, cristal: cyan, deutérium: emerald)
- **Effets glass morphism** et depth pour profondeur visuelle
- **Custom scrollbar** stylisé avec transparence

**Composants refondus**:

1. **ResourceDisplay.tsx** - Gestion des ressources
   - Cards avec hover effects (translate-y, shadow-3xl)
   - Progress bars animées avec gradient flow
   - Timers avec glow-pulse et rotation lente
   - Slots bonus avec scale-pulse
   - Background icons flottants au survol

2. **PlanetOverview.tsx** - Vue d'ensemble planète
   - Cards avec slide-up/fade-in entrance
   - Progress bars militaires gradient animées
   - Infrastructure items avec hover scale
   - Production bars avec bounce-subtle sur icons
   - Resource cards avec depth et transitions
   - Energy card avec glow-pulse si critique

3. **Facilities.tsx** - Bâtiments
   - Cards avec hover-scale et card-depth
   - Icons qui grossissent au survol
   - Stats avec glass-card effect
   - Background icons animés (float)
   - Top border avec shine effect

4. **TechTree.tsx** - Technologies
   - Cards avec glow-pulse pendant recherche active
   - Progress bars gradient animées
   - Icons en rotation (spin-slow) pendant recherche
   - Bonus avec scale-pulse
   - Glass-card effects sur panels info

5. **Shipyard.tsx** - Chantier spatial
   - Cards vaisseaux avec animations complètes
   - Hangar capacity avec shine effect
   - Hover animations fluides

**Impact visuel**:
- ✅ Interface **dynamique** et engageante
- ✅ Feedback visuel **riche** pour les interactions
- ✅ Animations **cohérentes** sur toute l'application
- ✅ Expérience utilisateur **premium** et moderne
- ✅ Thème spatial futuriste **vibrant** et **coloré**

**Fichiers**:
- `frontend/src/styles/animations.css` (nouveau fichier)
- `frontend/src/main.tsx` (import animations)
- `frontend/src/components/ResourceDisplay.tsx` (enhanced)
- `frontend/src/components/PlanetOverview.tsx` (enhanced)
- `frontend/src/components/Facilities.tsx` (enhanced)
- `frontend/src/components/TechTree.tsx` (enhanced)
- `frontend/src/components/Shipyard.tsx` (enhanced)

---

#### ⚔️ Réduction des pertes d'expéditions
**Feature**: Rééquilibrage des pertes de vaisseaux pour rendre les expéditions plus rentables

**Anciennes valeurs**:
- Victoire: 5-25% base avec variation ±20% → final 1-45% (max 40% après clamp)
- Défaite: 50-90% base avec variation ±20% → final 40-100%

**Nouvelles valeurs**:
- Victoire: **3-15% base** avec variation ±10% → final 1-20% (max 20% après clamp)
- Défaite: **30-60% base** avec variation ±15% → final 25-70% (max 70% après clamp)

**Impact**:
- Réduction moyenne de **40-60%** des pertes en cas de victoire
- Réduction de **20-30%** des pertes en cas de défaite
- Expéditions beaucoup plus rentables et moins punitives
- Exemple: 30 vaisseaux → avant 7 perdus, maintenant 3-4 perdus

**Code**:
```rust
// Victoire - Pertes réduites (3-15% avec variation ±10%)
let base_loss_rate = rng.gen_range(0.03..0.15);
let variation = rng.gen_range(-0.1..0.1);
let loss_rate = (base_loss_rate * (1.0_f64 + variation)).clamp(0.01_f64, 0.20_f64);

// Défaite - Pertes modérées (30-60% avec variation ±15%)
let base_loss_rate = rng.gen_range(0.30..0.60);
let variation = rng.gen_range(-0.15..0.15);
let loss_rate = (base_loss_rate * (1.0_f64 + variation)).clamp(0.25_f64, 0.70_f64);
```

**Fichiers**:
- `backend/src/game_logic.rs` (fonction `simulate_combat`, lignes 545-573)

---

#### 🎯 Correction affichage victoires + Raffinement logique expéditions
**Feature**: Correction bug d'affichage des victoires et refonte complète des règles de pertes

**Problème 1 - Victoires non affichées**:
- Backend stockait "player"/"pirates" mais frontend attendait "victory"/"defeat"
- Les rapports de victoire n'apparaissaient jamais dans les logs
- **Solution**: Backend stocke maintenant "victory", "defeat" ou "calm"

**Problème 2 - Logique expéditions incohérente**:
Refonte complète des règles de pertes avec 3 scénarios distincts

**Nouvelle règle 1 vaisseau** (TOUJOURS perdu):
```
Si flotte = 1 vaisseau :
  ├─ Victoire → 1 perdu (expédition risquée)
  ├─ Défaite → 1 perdu (destruction complète)
  └─ Secteur calme → 1 perdu (usure exploration)
```

**Nouvelles règles plusieurs vaisseaux**:

1. **Victoire** (logique existante conservée):
   - 3-15% base avec variation ±10%
   - Max 20% après clamp
   - Exemple: 30 vaisseaux → 1-6 perdus

2. **Défaite** (logique existante conservée):
   - 30-60% base avec variation ±15%
   - Max 70% après clamp
   - Exemple: 30 vaisseaux → 7-21 perdus

3. **Secteur calme** (NOUVEAU):
   - **1-5% base** avec variation ±0.5%
   - **Minimum 1 vaisseau perdu**
   - Exemple: 30 vaisseaux → 1-2 perdus
   - Message: "PERTES MINIMES (usure normale)"

**Code**:
```rust
// Secteur calme - Pertes minimales (1-5%)
let base_loss_rate: f64 = rng.gen_range(0.01..0.05);
let variation: f64 = rng.gen_range(-0.005..0.005);
let loss_rate = (base_loss_rate + variation).clamp(0.005, 0.06);
let total_losses = ((total_ships as f64 * loss_rate).ceil() as i32).max(1);
```

**Impact**:
- ✅ Rapports de victoire maintenant visibles
- ✅ Expéditions avec 1 vaisseau = risque maximal (toujours perdu)
- ✅ Secteur calme n'est plus 100% sûr (équilibrage)
- ✅ Risk/reward plus cohérent et prévisible

**Types de résultats**:
- `"victory"` → Combat gagné avec pertes réduites
- `"defeat"` → Combat perdu avec pertes lourdes
- `"calm"` → Secteur calme avec pertes minimales

**Fichiers**:
- `backend/src/main.rs` (lignes 1011, 1060, 1096, 1028-1184)
- `frontend/src/components/ReportsTerminal.tsx` (ligne 104)

---

#### 🛡️ Correction affichage Combat Modal
**Problème**: Le contenu des rapports de combat était coupé avec un fond noir, empêchant de voir toute l'information

**Cause**: Layout flexbox incorrect avec compression du header et absence de gestion du scroll

**Solution**:
- Ajout `shrink-0` sur le header pour empêcher la compression
- Changement du content div: `flex-1 min-h-0` pour comportement flexbox correct
- Ajout de styles custom scrollbar inline
- Maximum height: 95vh avec overflow-y-auto

**Résultat**:
- ✅ Tout le contenu est visible et scrollable
- ✅ Header fixe en haut
- ✅ Scrollbar stylisée qui s'intègre au design
- ✅ Responsive sur tous les écrans

**Fichiers**:
- `frontend/src/components/CombatModal.tsx` (lignes 139-165)

---

### 🔧 Modifications techniques

#### Frontend

**Nouvelles animations CSS**:
```css
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 5px currentColor, 0 0 10px currentColor; }
  50% { box-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor; }
}

@keyframes shine {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes scale-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes bounce-subtle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

**Classes utilitaires**:
```css
.animate-glow-pulse { animation: glow-pulse 2s ease-in-out infinite; }
.animate-shine { /* ... */ }
.animate-float { animation: float 3s ease-in-out infinite; }
.animate-gradient { animation: gradient-shift 3s ease infinite; }
.animate-scale-pulse { animation: scale-pulse 2s ease-in-out infinite; }
.animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
.animate-fade-in { animation: fade-in 0.3s ease-in forwards; }
.animate-bounce-subtle { animation: bounce-subtle 1.5s ease-in-out infinite; }
.animate-spin-slow { animation: spin-slow 3s linear infinite; }
```

**Effets spéciaux**:
```css
.glass-card {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.card-depth {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3);
}

.card-depth-hover {
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4);
}

.progress-bar-animated {
  position: relative;
  overflow: hidden;
}

.progress-bar-animated::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  animation: shimmer 2s infinite;
}
```

**Gradients ressources**:
```css
.gradient-metal { background: linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%); }
.gradient-crystal { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%); }
.gradient-deuterium { background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%); }
.gradient-energy { background: linear-gradient(135deg, #facc15 0%, #eab308 50%, #ca8a04 100%); }
```

#### Backend

**Combat simulation - Pertes réduites**:
```rust
pub fn simulate_combat(
    hunters: i32,
    cruisers: i32,
    rng: &mut impl Rng,
) -> (i32, i32, Vec<String>) {
    // ... calcul puissance ...

    if player_strength > pirate_strength {
        // VICTOIRE : Pertes réduites (3-15% avec variation ±10%)
        let base_loss_rate = rng.gen_range(0.03..0.15);
        let variation = rng.gen_range(-0.1..0.1);
        let loss_rate = (base_loss_rate * (1.0_f64 + variation)).clamp(0.01_f64, 0.20_f64);
    } else {
        // DÉFAITE : Pertes modérées (30-60% avec variation ±15%)
        let base_loss_rate = rng.gen_range(0.30..0.60);
        let variation = rng.gen_range(-0.15..0.15);
        let loss_rate = (base_loss_rate * (1.0_f64 + variation)).clamp(0.25_f64, 0.70_f64);
    }

    // ... répartition pertes ...
}
```

---

### 📝 Notes techniques

**Ordre de chargement CSS**:
1. `index.css` (Tailwind base)
2. `animations.css` (animations custom)

**Compatibilité navigateurs**:
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (webkit-backdrop-filter)

**Performance**:
- Animations CSS optimisées (GPU-accelerated)
- Pas d'impact sur les performances
- Utilisation de `transform` et `opacity` pour smooth 60fps

**Accessibilité**:
- `prefers-reduced-motion` pris en compte
- Contraste maintenu pour lisibilité
- Focus states préservés

---

### 🚀 Déploiement

**Migrations**: Aucune (modifications frontend + backend logic uniquement)

**Compilation backend**:
```bash
cd backend
cargo build --release
```

**Tests recommandés**:
1. ✅ Vérifier animations sur toutes les pages principales
2. ✅ Tester hover effects sur cards
3. ✅ Lancer une expédition → vérifier pertes réduites
4. ✅ Cliquer sur rapport de combat → vérifier affichage complet
5. ✅ Tester responsive design (mobile/tablette/desktop)
6. ✅ Vérifier performance (60fps maintenu)

---

### ⚠️ Breaking Changes

Aucun breaking change. Toutes les modifications sont des améliorations visuelles et de gameplay.

---

## [1.9.0] - 2026-01-19 - Refonte interface : Production, Énergie et Rapports

### 🎯 Nouvelles fonctionnalités

#### 📊 Module Production Industrielle amélioré
**Feature**: Refonte complète du module de production avec visualisation graphique

**Améliorations**:
- Graphiques en barres comparatifs pour la production /h (Métal, Cristal, Deutérium)
- Barres proportionnelles avec dégradés colorés
- Affichage production par heure ET par jour
- Indicateur de bonus slots actifs
- Total journalier récapitulatif

**Design**:
- Barres avec animations de transition fluides
- Couleurs distinctives : orange (métal), cyan (cristal), vert (deutérium)
- Indicateur d'efficacité énergétique intégré

**Fichiers**:
- `frontend/src/components/PlanetOverview.tsx` (refonte section Production)

---

#### ⚡ Module Réseau Électrique redesigné
**Feature**: Design "électrique" vibrant avec graphiques de flux énergétique

**Nouveaux éléments visuels**:
- **Effets de fond électriques** : Lueurs animées, lignes de courant horizontales
- **Graphique Production vs Consommation** : Barres verticales style voltmètre
- **Jauge d'efficacité** : Style compteur électrique avec graduations
- **Animations dynamiques** : Pulse, shimmer, glow selon l'état du réseau

**États visuels**:
| État | Couleurs | Animations | Badge |
|------|----------|------------|-------|
| Optimal (≥100%) | Vert/Cyan/Jaune | Calmes, glow doux | ⚡ OPTIMAL |
| Ralenti (50-99%) | Orange/Jaune | Pulse léger | ⚠️ RALENTI |
| Critique (<50%) | Rouge vif | Pulse urgent, ping | 🔴 CRITIQUE |

**Composants du graphique**:
- Barre Production (dégradé emerald→cyan) avec effet shimmer
- Barre Consommation (dégradé selon état) avec glow
- Indicateur central avec flèche directionnelle et flux net
- Point lumineux pulsant au bout de la jauge

**Fichiers**:
- `frontend/src/components/PlanetOverview.tsx` (section Réseau Électrique)

---

#### 📜 Page Changelog avec rendu Markdown
**Feature**: Affichage du changelog avec rendu Markdown complet

**Améliorations**:
- Installation de `react-markdown` et `remark-gfm`
- Support complet GitHub-Flavored Markdown (tables, code blocks, listes)
- Plugin `@tailwindcss/typography` pour le styling prose

**Styles appliqués**:
- Titres colorés (H1 indigo, H2 purple, H3 cyan, H4 orange)
- Code blocks avec fond sombre et texte emerald
- Tables stylisées avec bordures et alternance de couleurs
- Listes avec markers indigo
- Séparateurs subtils

**Fichiers**:
- `frontend/src/components/Changelog.tsx` (ReactMarkdown + styles)
- `frontend/src/index.css` (plugin typography)
- `frontend/package.json` (dépendances react-markdown, remark-gfm)

---

#### 🎯 Modal de rapports de combat améliorée
**Feature**: Gestion robuste des différents types de rapports

**Corrections**:
- Gestion des erreurs backend (rapport non disponible)
- Support unifié des formats (expéditions, combats PvP, défenses)
- Normalisation des champs `winner`/`result` pour tous les types
- Fallback si aucun log détaillé disponible

**Améliorations pour les expéditions**:
- Affichage "Pirates Galactiques" comme adversaire
- Icône fusée (Rocket) au lieu de trophée
- Badge "ZONE D'EXPÉDITION" / "EXPÉDITION RÉUSSIE/ÉCHOUÉE"

**Gestion d'erreurs**:
- Modal d'erreur dédiée si rapport non disponible
- Message explicatif avec bouton de fermeture
- Icône AlertCircle pour signaler l'erreur

**Fichiers**:
- `frontend/src/components/CombatModal.tsx`

---

### 🔧 Modifications techniques

#### Frontend

**Nouvelles dépendances**:
```json
{
  "react-markdown": "^10.1.0",
  "remark-gfm": "^4.0.1",
  "@tailwindcss/typography": "^0.5.19"
}
```

**Configuration Tailwind v4**:
```css
@plugin "@tailwindcss/typography";
```

**Composants modifiés**:
- `PlanetOverview.tsx` - Production avec graphiques + Énergie électrique
- `Changelog.tsx` - Rendu Markdown complet
- `CombatModal.tsx` - Robustesse et support expéditions

---

### 📝 Notes techniques

**Animations CSS utilisées**:
- `animate-pulse` - Pulsation douce
- `animate-ping` - Effet ping pour alertes critiques
- `animate-shimmer` - Effet brillance traversante
- `drop-shadow-[0_0_Xpx_color]` - Glow personnalisés

**Classes Tailwind Typography**:
```
prose prose-invert prose-sm
prose-h1:text-indigo-400
prose-code:text-emerald-400
prose-table:text-slate-300
```

---

### 🚀 Déploiement

**Migrations**: Aucune (modifications frontend uniquement)

**Installation dépendances**:
```bash
cd frontend
npm install react-markdown remark-gfm @tailwindcss/typography
```

**Tests recommandés**:
1. ✅ PlanetOverview → Vérifier graphiques de production
2. ✅ PlanetOverview → Tester module énergie (optimal/ralenti/critique)
3. ✅ Changelog → Vérifier rendu markdown (tables, code, titres)
4. ✅ Rapports → Cliquer sur rapport d'expédition → modal s'affiche
5. ✅ Rapports → Cliquer sur ancien rapport sans détails → message d'erreur

---

### ⚠️ Breaking Changes

Aucun breaking change. Toutes les modifications sont des améliorations visuelles.

---

## [1.8.0] - 2026-01-19 - Rôles utilisateurs, slots de production, améliorations commerce et expéditions

### 🎯 Nouvelles fonctionnalités

#### 👤 Système de rôles utilisateurs
**Feature**: Gestion des permissions admin/user avec vérification en base de données

**Implémentation**:
- Nouvelle migration `m20260119_100000_add_role_to_users.rs` ajoutant colonne `role` (VARCHAR, default "user")
- Vérification asynchrone des rôles dans `admin.rs` via `check_admin()`
- Nouvel endpoint `PATCH /admin/user/:id/role` pour modifier les rôles
- Création d'utilisateurs avec role "user" par défaut

**Rôles disponibles**:
- `admin`: Accès complet au panel d'administration
- `user`: Joueur standard (défaut)

**Fichiers**:
- `backend/migration/src/m20260119_100000_add_role_to_users.rs` (nouveau)
- `backend/src/entities/user.rs` (ajout champ `role`)
- `backend/src/admin.rs` (check_admin async + endpoint)
- `backend/src/auth.rs` (role par défaut à la création)

---

#### 🔧 Système de slots de production bonus
**Feature**: 4 slots supplémentaires (slots 5-8) pour booster la production de ressources

**Fonctionnement**:
- 4 slots de base (mines métal, cristal, deutérium, énergie)
- 4 slots bonus débloquables par le joueur
- Chaque slot bonus donne **+50% de production** à la ressource assignée
- Coût progressif pour débloquer les slots

**Coûts de déblocage**:
| Slot | Métal | Cristal | Deutérium |
|------|-------|---------|-----------|
| 5 | 10,000 | 5,000 | 2,500 |
| 6 | 25,000 | 12,500 | 6,250 |
| 7 | 50,000 | 25,000 | 12,500 |
| 8 | 100,000 | 50,000 | 25,000 |

**Interface**: Intégrée dans la page "Ressources" sous les 4 mines de base

**Fichiers**:
- `backend/migration/src/m20260119_000004_create_resource_slots.rs`
- `backend/src/entities/resource_slot.rs` (nouveau)
- `backend/src/game_logic.rs` (fonctions de calcul slots)
- `frontend/src/components/ResourceDisplay.tsx` (affichage slots 5-8)

---

#### 💱 Commerce NPC bidirectionnel
**Feature**: Saisie bidirectionnelle des quantités dans les échanges NPC

**Améliorations**:
- Labels explicites avec nom de ressource ("Quantité de Métal à vendre")
- Champ "Quantité à obtenir" éditable
- Calcul automatique bidirectionnel:
  - Modifier quantité vendue → recalcule quantité obtenue
  - Modifier quantité obtenue → recalcule quantité à vendre
- Indicateur visuel du champ actif (bordure indigo)
- Récapitulatif avec taux d'échange et marge NPC (15%)

**Fichiers**:
- `frontend/src/components/market/NpcTradeCard.tsx`
  - Ajout `resourceLabels` pour noms français
  - États `buyQuantity` et `lastEdited`
  - Handlers bidirectionnels

---

#### 🌌 Gains de deutérium en expédition
**Feature**: Possibilité de trouver du deutérium lors des expéditions

**Balance**:
- **50% de chance** de trouver du deutérium
- Chasseurs: 10-25 deutérium par vaisseau
- Croiseurs: 30-60 deutérium par vaisseau
- Bonus secteur calme: ×1.2

**Affichage**:
- Logs d'expédition incluent le deutérium trouvé
- Scout affiche estimation deutérium (0 - max possible)
- Note "50% de chance de trouver du deutérium"

**Fichiers**:
- `backend/src/main.rs` (expedition_handler, scout_expedition_handler)
- `frontend/src/components/ExpeditionZone.tsx` (interface + affichage)

---

#### 🏆 Coordonnées dans le classement
**Feature**: Affichage des coordonnées des planètes dans le classement

**Implémentation**:
- Ajout coordonnées (galaxy, system, position) dans `PlanetInfo`
- Format d'affichage: `[G:S:P]` (ex: `[1:45:7]`)
- Couleur cyan pour les coordonnées

**Fichiers**:
- `backend/src/main.rs` (struct PlanetInfo + ranking handler)
- `frontend/src/components/Leaderboard.tsx` (interface + affichage)

---

### 🔧 Modifications techniques

#### Backend

**Migrations**:
1. `m20260119_100000_add_role_to_users.rs` - Rôles utilisateurs
2. `m20260119_000004_create_resource_slots.rs` - Slots de ressources

**Entités modifiées**:
- `user.rs`: Ajout `role: String`
- `resource_slot.rs`: Nouvelle entité pour slots

**Endpoints modifiés/ajoutés**:
- `PATCH /admin/user/:id/role` - Modification rôle utilisateur
- `GET /ranking` - Inclut maintenant les coordonnées des planètes
- `POST /planets/:id/expedition` - Gains deutérium
- `POST /planets/:id/expedition/scout` - Estimation deutérium

#### Frontend

**Composants modifiés**:
- `ResourceDisplay.tsx` - Intégration slots 5-8
- `NpcTradeCard.tsx` - Commerce bidirectionnel
- `ExpeditionZone.tsx` - Estimation/affichage deutérium
- `Leaderboard.tsx` - Coordonnées planètes

---

### 📝 Notes techniques

**Calcul production avec slots**:
```typescript
// Bonus par slot actif = +50%
production_finale = production_base * (1 + nb_slots_actifs * 0.5)
```

**Échange NPC bidirectionnel**:
```typescript
// Taux d'échange avec marge 15%
exchangeRate = (sellPrice / buyPrice) * 0.85

// Vente → Achat
buyQuantity = sellQuantity * exchangeRate

// Achat → Vente
sellQuantity = buyQuantity / exchangeRate
```

**Deutérium expédition**:
```rust
// 50% de chance
let found_deuterium = rng.gen_bool(0.5);

// Gains par vaisseau
let base_deut_per_hunter = 10.0 + rng.gen_range(0.0..=15.0);  // 10-25
let base_deut_per_cruiser = 30.0 + rng.gen_range(0.0..=30.0); // 30-60
```

---

### 🚀 Déploiement

**Migrations**: **OUI - OBLIGATOIRE**
```bash
cd migration
cargo run
```

**Tests recommandés**:
1. ✅ Créer un nouvel utilisateur → role = "user"
2. ✅ Modifier role via panel admin
3. ✅ Débloquer un slot bonus → vérifier coût et production
4. ✅ Commerce NPC → saisir quantité obtenue → vérifier calcul inverse
5. ✅ Expédition → vérifier gains deutérium (50% des fois)
6. ✅ Classement → développer joueur → voir coordonnées planètes

---

### ⚠️ Breaking Changes

Aucun breaking change. Toutes les modifications sont rétrocompatibles.

---

## [1.7.0] - 2026-01-19 - Configuration dynamique du serveur (SPEED_FACTOR modifiable)

### 🎯 Nouvelles fonctionnalités

#### ⚙️ Configuration serveur dynamique (Panel Admin)
**Feature**: Modification en temps réel des paramètres de vitesse du jeu depuis le panel admin

**Paramètres éditables**:
- **SPEED_FACTOR**: Multiplicateur de vitesse général du jeu (construction, recherche, production)
- **Construction Speed Multiplier**: Multiplicateur spécifique pour la vitesse de construction
- **Mining Speed Multiplier**: Multiplicateur spécifique pour la vitesse de production des ressources

**Fonctionnement**:
- Valeurs stockées en base de données (table `server_config`)
- Modification via interface admin avec inputs numériques
- Application immédiate pour toutes les nouvelles opérations
- Fallback sur les valeurs par défaut si DB inaccessible

**Accès**: Panel Admin → Onglet "Statistiques Serveur" → Section "Paramètres Serveur (Éditable)"

---

### 🔧 Modifications techniques

#### Backend

**Migration SeaORM** (`m20260119_000003_create_server_config.rs`):
```sql
CREATE TABLE server_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key VARCHAR UNIQUE NOT NULL,
  config_value VARCHAR NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Valeurs par défaut
INSERT INTO server_config VALUES
  ('speed_factor', '500.0'),
  ('construction_speed_multiplier', '1.0'),
  ('mining_speed_multiplier', '1.0');
```

**Entité** (`entities/server_config.rs`):
- Model avec `config_key` (unique), `config_value`, `updated_at`
- Ajouté dans `mod.rs` et `prelude.rs`

**Endpoints admin** (`admin.rs`):
- `GET /admin/config` - Récupérer toutes les configurations
- `PATCH /admin/config` - Mettre à jour une ou plusieurs configurations
- Struct `ConfigUpdate` pour gérer les mises à jour partielles
- Fonction `get_server_stats_handler` modifiée pour lire le SPEED_FACTOR depuis la DB

**Routes** (`main.rs`):
- Ajout des routes `/admin/config` (GET et PATCH)

#### Frontend

**AdminPanel.tsx**:
- Nouvelle interface `ServerConfig` pour typer les configurations
- États `config`, `editedConfig`, `loadingConfig`
- Fonctions `fetchConfig()` et `updateConfig()` pour gérer les configurations
- Section éditable avec 3 inputs numériques (step 0.1)
- Boutons "Enregistrer" et "Annuler"
- Toast de confirmation après modification
- Avertissement sur l'application immédiate des changements

**App.tsx**:
- Ajout import `FileText` manquant pour l'icône Changelog

---

### 📝 Notes techniques

**Application des modifications**:
- Les changements prennent effet **immédiatement** pour toutes les nouvelles opérations
- Les opérations en cours (constructions, recherches) conservent leur vitesse d'origine
- Le SPEED_FACTOR est lu depuis la DB à chaque calcul de durée

**Valeurs par défaut**:
- `speed_factor`: 500.0 (×5.0 de vitesse)
- `construction_speed_multiplier`: 1.0 (vitesse normale)
- `mining_speed_multiplier`: 1.0 (vitesse normale)

**Sécurité**:
- Vérification admin (`check_admin`) obligatoire
- user_id requis dans les paramètres de requête

---

### 🚀 Déploiement

**Migrations**: **OUI - OBLIGATOIRE**
```bash
cd migration
cargo run
```

**Tests recommandés**:
1. ✅ Exécuter la migration pour créer la table `server_config`
2. ✅ Vérifier que les valeurs par défaut sont insérées
3. ✅ Accéder au panel admin → Statistiques Serveur
4. ✅ Modifier le SPEED_FACTOR (ex: 1000.0 pour ×10)
5. ✅ Enregistrer et vérifier que la valeur est mise à jour
6. ✅ Vérifier que les nouvelles constructions utilisent la nouvelle vitesse

---

### ⚠️ Breaking Changes

**IMPORTANT**: Cette version nécessite l'exécution de la migration pour fonctionner correctement. Sans la table `server_config`, le système utilisera les valeurs hardcodées par défaut (fallback).

**Impact**:
- Aucun impact sur les données existantes
- Ajout d'une nouvelle table uniquement
- Rétrocompatible (fallback sur constantes)

---

## [1.6.0] - 2026-01-19 - Améliorations panel admin (statistiques serveur)

### 🎯 Nouvelles fonctionnalités

#### 📊 Tableau de bord statistiques serveur (Panel Admin)
**Feature**: Onglet "Statistiques Serveur" dans le panel admin pour surveiller l'état global du jeu

**Statistiques affichées**:
- Nombre total de joueurs
- Nombre total de planètes
- Total de vaisseaux (toutes flottes combinées)
- Total de défenses (missiles + plasma)
- Ressources totales du serveur (métal, cristal, deutérium)
- Paramètres serveur (SPEED_FACTOR actuel)

**Design**:
- Interface en onglets (Statistiques / Gestion Joueurs)
- Cartes colorées avec dégradés pour chaque métrique
- Mise à jour en temps réel lors du changement d'onglet
- Responsive (adapté mobile/tablette/desktop)

**Accès**: Panel Admin → Onglet "Statistiques Serveur"

**Fichiers backend**:
- `backend/src/admin.rs` (lignes 224-280)
  - Nouveau endpoint `GET /admin/stats`
  - Structure `ServerStats` avec toutes les métriques
  - Import `PaginatorTrait` pour count()
- `backend/src/main.rs` (ligne 223)
  - Route `/admin/stats` enregistrée

**Fichiers frontend**:
- `frontend/src/components/AdminPanel.tsx`
  - Système d'onglets (stats/players)
  - Interface `ServerStats` (lignes 69-78)
  - Type `AdminTab` pour gérer les onglets
  - Fonction `fetchStats()` pour charger les statistiques
  - Cartes visuelles pour chaque métrique
  - Section SPEED_FACTOR en lecture seule

---

### 📝 Notes techniques

**Calculs backend**:
- Total utilisateurs: `User::find().count()`
- Total planètes: `Planet::find().count()`
- Ressources/flottes/défenses: Somme sur toutes les planètes

**Performances**:
- Chargement à la demande (uniquement quand onglet activé)
- Cache côté client tant que l'onglet reste actif

**SPEED_FACTOR**:
- Actuellement en lecture seule (constante dans `game_logic.rs`)
- Valeur actuelle: 500.0 (×5.0)
- Modification dynamique nécessiterait table config en DB (amélioration future)

---

### 🚀 Déploiement

**Migrations**: Aucune (nouvelle fonctionnalité sans modification schéma)

**Tests recommandés**:
1. ✅ Accéder au panel admin en tant qu'administrateur
2. ✅ Vérifier que l'onglet "Statistiques Serveur" s'affiche
3. ✅ Vérifier les valeurs affichées correspondent aux données réelles
4. ✅ Tester la navigation entre onglets
5. ✅ Vérifier l'onglet "Gestion Joueurs" fonctionne toujours correctement

---

## [1.5.0] - 2026-01-19 - Correction bug timer tourelles plasma

### 🔧 Corrections critiques

#### 🛡️ Correction construction tourelles plasma (timer manquant)
**Problème**: Le timer de construction ne s'affichait pas pour les tourelles plasma, alors que les missiles fonctionnaient correctement

**Cause identifiée**: Incohérence prérequis frontend ↔ backend
- **Frontend** (`gameRules.ts`):
  - Chantier Spatial niveau 6
  - Tech. Laser niveau 3
- **Backend** (`game_logic.rs`):
  - Chantier Spatial niveau 8 ❌
  - Tech. Laser niveau 5 ❌

**Impact du bug**:
- Utilisateurs avec Chantier 6-7 ou Laser 3-4 pouvaient cliquer "Construire"
- Ressources déduites côté client
- Backend rejetait la requête (403 Forbidden)
- Absence de gestion d'erreur → aucun feedback utilisateur
- Pas de construction ajoutée → pas de timer affiché

**Solutions appliquées**:

1. **Alignement des prérequis** (frontend → backend):
   ```typescript
   // frontend/src/lib/gameRules.ts
   case 'plasma_turret':
     check("Chantier Spatial (8)", ...shipyard_level >= 8);  // 6 → 8
     check("Tech. Énergie (6)", ...energy_tech_level >= 6);  // ✓ déjà bon
     check("Tech. Laser (5)", ...laser_battery_level >= 5);  // 3 → 5
   ```

2. **Gestion d'erreurs complète** dans `Defenses.tsx`:
   - Import `toast` (notifications Sonner)
   - Import `checkPrerequisites` (validation frontend)
   - Codes HTTP traités:
     - `200 OK` → Succès avec notification
     - `403 Forbidden` → "Prérequis non satisfaits"
     - `400 Bad Request` → "Ressources insuffisantes"
     - `409 Conflict` → "File de construction pleine"
   - Erreurs réseau → "Erreur de connexion"

3. **Améliorations UX**:
   - Affichage des prérequis avec statut (✓/✗)
   - Désactivation du bouton si prérequis manquants
   - Styles visuels distincts (orange pour prérequis, rouge pour ressources)
   - Toast de confirmation lors de la construction réussie

4. **Correction compilation Rust** (ambiguïté type):
   ```rust
   // backend/src/game_logic.rs (lignes 524, 538)
   (base_loss_rate * (1.0_f64 + variation)).clamp(0.01_f64, 0.4_f64)
   ```

**Fichiers modifiés**:
- `frontend/src/lib/gameRules.ts` (lignes 65-67)
- `frontend/src/components/Defenses.tsx` (imports + startBuild + UI)
- `frontend/src/components/Changelog.tsx` (import Card corrigé)
- `backend/src/game_logic.rs` (types explicites)

---

### 📝 Notes techniques

**Prérequis tourelles plasma (validés)**:
- Chantier Spatial niveau 8
- Technologie Énergie niveau 6
- Technologie Laser niveau 5

**Prérequis lanceurs missiles**:
- Chantier Spatial niveau 1
- (Aucun prérequis tech)

**Système de notifications**: Sonner (déjà intégré)

---

### 🚀 Déploiement

**Migrations**: Aucune (correction frontend + backend logique)

**Tests recommandés**:
1. ✅ Vérifier prérequis affichés correctement pour plasma_turret
2. ✅ Tester construction avec prérequis non satisfaits → toast erreur
3. ✅ Tester construction avec prérequis OK → timer s'affiche
4. ✅ Vérifier que missiles fonctionnent toujours (aucune régression)

---

## [1.4.0] - 2026-01-19 - Rééquilibrage énergétique et améliorations marché

### 🔧 Corrections critiques

#### ⚡ Rééquilibrage énergétique majeur
**Problème**: Production d'énergie toujours insuffisante → mines constamment dans le rouge
**Cause**: Croissance exponentielle des mines (1.1^niveau) dépassait rapidement la production solaire

**Solutions appliquées**:
- ✅ Production centrale solaire **×3** (60.0 au lieu de 20.0 par niveau)
- ✅ Bonus tech énergie **+10% par niveau** (au lieu de +5%)
- ✅ Système de réduction automatique déjà implémenté
  - Production mines réduite proportionnellement au ratio énergétique
  - Ex: 50% d'énergie disponible → 50% de production des mines

**Formules mises à jour**:
```rust
// Production énergie
base = 60 * level * 1.1^level * (1 + energy_tech * 0.10)

// Réduction production ressources
production_effective = production_base * energy_ratio
```

**Impact**: Meilleur équilibre énergie/production, moins de micro-gestion

**Fichiers**: `backend/src/game_logic.rs` (lignes 176-184)

---

#### 💰 Correction affichage prix marché NPC
**Problème**: Tous les prix affichés à "1.00" malgré système dynamique fonctionnel

**Cause**: Désynchronisation format backend ↔ frontend
- Backend renvoyait `npc_prices` (tableau)
- Frontend cherchait `prices.metal` (objet)

**Solution**: Transformation tableau → objet dans `PriceOverview.tsx`
```typescript
const prices: Record<string, {buy, sell, market}> = {};
for (const npcPrice of stats.npc_prices) {
  prices[npcPrice.resource_type] = {
    buy: npcPrice.npc_buy_price,
    sell: npcPrice.npc_sell_price,
    market: npcPrice.market_price
  };
}
```

**Système de prix dynamiques** (déjà implémenté côté backend):
- Calcul basé sur rareté des ressources serveur
- Formule: `scarcity = expected_ratio / actual_ratio`
- Bornes: 0.5× à 2.0× le prix de base
- Mise à jour temps réel (toutes les 5s)

**Fichiers**: `frontend/src/components/market/PriceOverview.tsx` (lignes 8-18, 53)

---

#### 🛠️ Corrections compilation Rust
**Erreurs corrigées**:
1. **Types ambigus pour `clamp()`**:
   - Erreur: `can't call method clamp on ambiguous numeric type {float}`
   - Solution: Explicitation types `0.01_f64`, `0.4_f64`

2. **Imports non utilisés**:
   - Suppression `Serialize`, `Deserialize` dans `server_resource_stats.rs`

**Fichiers**:
- `backend/src/game_logic.rs` (lignes 523, 537)
- `backend/src/entities/server_resource_stats.rs` (ligne 2)

---

### 🎯 Nouvelles fonctionnalités

#### 📋 Page Changelog intégrée
**Feature**: Consultation du changelog depuis le jeu

**Backend**:
- Endpoint `GET /changelog` lit `CHANGELOG.md`
- Retourne contenu brut markdown

**Frontend**:
- Composant `Changelog.tsx` avec design cohérent
- Affichage préformaté + gestion chargement/erreurs
- Ajout menu SYSTÈME (icône FileText)

**Accès**: Menu → SYSTÈME → Changelog

**Fichiers**:
- `backend/src/main.rs` (ligne 218, 2705-2711)
- `frontend/src/components/Changelog.tsx` (nouveau)
- `frontend/src/App.tsx` (imports + routing)

---

### 📝 Notes techniques

**Production d'énergie** (exemple niveau 10):
```
Avant: 20 * 10 * 1.1^10 * 1.5 = 777 unités
Après:  60 * 10 * 1.1^10 * 2.0 = 3108 unités (+300%)
```

**Consommation 3 mines niveau 10**:
```
(10*10 + 10*10 + 20*10) * 1.1^10 = ~1036 unités
Ratio: 3108 / 1036 = 300% → Production à 100%
```

**Prix marché dynamiques**:
- Métal: base 1.0 × scarcity
- Cristal: base 1.5 × scarcity
- Deutérium: base 3.0 × scarcity
- Scarcity calculée: `expected / actual`

---

### 🚀 Déploiement

**Aucune migration** requise pour cette version.

**Redémarrage backend** recommandé pour appliquer les nouveaux calculs d'énergie.

---

### 📦 Fichiers modifiés (8 fichiers)

#### Backend (4 fichiers)
- ✏️ `backend/src/game_logic.rs` - Production énergie ×3, tech bonus +10%
- ✏️ `backend/src/entities/server_resource_stats.rs` - Suppression imports inutilisés
- ✏️ `backend/src/main.rs` - Endpoint /changelog

#### Frontend (4 fichiers)
- ✏️ `frontend/src/components/market/PriceOverview.tsx` - Fix affichage prix
- ➕ `frontend/src/components/Changelog.tsx` - Nouveau composant
- ✏️ `frontend/src/App.tsx` - Routing changelog

---

### ✅ Tests recommandés

- [ ] **Énergie**: Vérifier production > consommation pour planètes niveau moyen
- [ ] **Marché**: Confirmer affichage prix variables (≠ 1.00)
- [ ] **Changelog**: Accès via menu SYSTÈME → contenu affiché correctement

---

### 🐛 Bugs connus

**Timer construction défenses**: Investigation en cours
- Les missiles se construisent correctement
- Les tourelles plasma : timer parfois ne s'affiche pas
- Nécessite debugging approfondi (frontend + backend)

---

### 🔮 Améliorations futures identifiées

- **Panel Admin**: Stats serveur, gestion users, modifier SPEED_FACTOR
- **Système de rôles**: Admin/User avec permissions
- **Changement username**: Dans paramètres utilisateur
- **Empire Bar**: Amélioration visuelle pour nombreuses planètes
- **Système de slots**: Mines modulaires (8 slots configurables)
- **Timer défenses**: Investigation et correction complète

---

**Commits**: `ee49fbe`, `5521fcc`, `d7e1b62`
**Branche**: `claude/responsive-ranking-npc-costs-iIrjT`
**Fichiers**: 8 modifiés, 1 créé

---

## [1.3.0] - 2026-01-19 - Session de corrections et améliorations majeures

### 🎯 Nouveautés

#### 🚀 Système de capacité évolutive des transporteurs
- **Backend**: Fonction `get_transporter_capacity(hangar_level)` dans `game_logic.rs`
  - Capacité de base: 10 000 unités
  - Bonus progressif: **+5% par niveau de hangar**
  - Exemple: Hangar Niveau 10 = 15 000 unités (+50%), Niveau 20 = 20 000 unités (+100%)
- **Frontend**: Fonction `getTransporterCapacity()` dans `gameRules.ts`
- **API**: Handler `/transport` applique automatiquement le bonus
- **Interface**: `TransportModal` affiche la capacité exacte en temps réel

**Fichiers**:
- `backend/src/game_logic.rs` (lignes 338-343)
- `frontend/src/lib/gameRules.ts` (lignes 75-81)
- `frontend/src/components/TransportModal.tsx` (ligne 27)

---

#### 📋 Rapports de combat détaillés et cliquables
- **Migration**: `m20260119_000002_add_detailed_report_to_combat_log.rs`
  - Nouvelle colonne `detailed_report` (JSON, nullable) dans table `combat_log`
- **Sauvegarde automatique** des rapports complets pour:
  - ⚔️ Attaques PvP (attaquant + défenseur)
  - 🛡️ Défenses (avec pertes missiles/tourelles)
  - 🌌 Expéditions (logs de combat détaillés)
  - 🏴 Conquêtes de planètes

- **Nouveau endpoint**: `GET /combat-reports/:id/detail`
  - Récupère le JSON complet d'un rapport
  - Codes: `200 OK` | `404 NOT FOUND`

- **Interface interactive**:
  - ✅ Tous les rapports de combat sont **cliquables** (`cursor-pointer`)
  - ✅ Clic → ouverture de `CombatModal` avec détails complets
  - ✅ Affichage des pertes, butin, débris et logs round-par-round
  - ⚠️ Rapports d'espionnage non cliquables (pas de combat)

**Fichiers**:
- `backend/migration/src/m20260119_000002_add_detailed_report_to_combat_log.rs` (nouveau)
- `backend/src/entities/combat_log.rs` (ligne 20-21)
- `backend/src/main.rs` (endpoint ligne 181, handler ligne 1158-1181)
- `frontend/src/components/ReportsTerminal.tsx` (lignes 54-64, 100-102, 137-140, 205-208)

---

#### 🏆 Badges de rang dans le classement
- **Backend**: Champ `rank_badge: String` dans structure `RankItem`
- **Calcul**: `game_logic::get_rank_badge(total_score)` automatique
- **Affichage**: Badge sous le nom du joueur (jaune, uppercase)
  - Exemples: "RECRUE", "CAPORAL", "COMMANDANT", "EMPEREUR GALACTIQUE"

**Fichiers**:
- `backend/src/main.rs` (lignes 62-73)
- `frontend/src/components/Leaderboard.tsx` (lignes 16-26, 108-125)

---

#### 🌍 Système d'âge des planètes
- **Migration**: `m20260119_000001_add_created_at_to_planets.rs`
  - Colonne `created_at` (TIMESTAMP NOT NULL)
  - Initialisation `NOW()` pour planètes existantes
  - Processus sécurisé: nullable → update → NOT NULL

- **Planète mère stable**: Basée sur `created_at` (la plus ancienne)
  - ❌ Avant: planète avec + de points (changeait après batailles)
  - ✅ Après: planète la + ancienne (fixe pour toujours)

**Fichiers**:
- `backend/migration/src/m20260119_000001_add_created_at_to_planets.rs` (nouveau)
- `backend/src/entities/planet.rs` (ligne 111-113)
- `backend/src/auth.rs` (ligne 195)
- `backend/src/main.rs` (ligne 1847-1853)

---

### 🔧 Corrections de bugs critiques

#### ⚔️ Expéditions - Pertes nulles corrigées
**Problème**: Avec 1 vaisseau → `(1 * 0.9).floor() = 0` pertes

**Solution complète**:
- ✅ Utilisation de `ceil()` → garantit minimum 1 perte
- ✅ Niveau pirate aléatoire: 10-100 (forte variation)
- ✅ Taux de pertes variable ±20%
  - Victoire: 5-25% base ± 20% variation → final 1-45%
  - Défaite: 50-90% base ± 20% variation → final 40-100%
- ✅ **Résistance différenciée**:
  - Chasseurs: vulnérabilité 1.0 (normale)
  - Croiseurs: vulnérabilité 0.5 (2× plus résistants)
- ✅ Logs détaillés: "PERTES: X Chasseur(s), Y Croiseur(s)"

**Code**:
```rust
// Répartition proportionnelle des pertes
let hunter_vulnerability = hunters as f64 * 1.0;
let cruiser_vulnerability = cruisers as f64 * 0.5;
let total_vulnerability = hunter_vulnerability + cruiser_vulnerability;

lost_hunters = (total_losses * hunter_ratio).ceil() as i32;
lost_cruisers = (total_losses * cruiser_ratio).floor() as i32;
```

**Fichiers**: `backend/src/game_logic.rs` (512-539), `backend/src/main.rs` (909-963)

---

#### ♻️ Recyclage débris - Quantité hard-codée
**Problème**: Toujours 50 recycleurs envoyés (ignorait disponibilité)

**Solution**:
- ✅ Vérification `planet.recycler_count`
- ✅ Envoi de tous disponibles (max 50 pour perf)
- ✅ Toast d'erreur si 0 recycleurs

**Fichier**: `frontend/src/components/GalaxyView.tsx` (75-89)

---

#### 👤 Profil - "Commandant depuis X jours"
**Problème**: 20472 jours au lieu de 3 jours

**Cause**: `NaiveDateTime` sans timezone → parsing JS incorrect

**Solution**: Format ISO 8601 avec `Z`
```rust
let created_at_utc = user.created_at
    .format("%Y-%m-%dT%H:%M:%S%.3fZ")
    .to_string();
```

**Fichier**: `backend/src/main.rs` (1858-1863)

---

#### 🎓 Tutoriel - Boucle infinie
**Problème**: `useEffect([])` se déclenchait en boucle

**Solution**:
- ✅ État `hasChecked: boolean`
- ✅ Early return si déjà vérifié
- ✅ Dépendance `[hasChecked]` au lieu de `[]`

**Fichier**: `frontend/src/components/Tutorial.tsx` (238-272)

---

#### ⏱️ Temps de déplacement flotte
**Problème**: Temps affiché ≠ temps réel (fonction locale incorrecte)

**Solution**:
- ❌ Suppression fonction locale (utilisait que distance système)
- ✅ Utilisation `game_logic::calculate_distance` (coordonnées 3D complètes)
- ✅ Cohérence frontend ↔ backend

**Impact**: Temps estimé = temps effectif de vol

---

### 🗄️ Base de données

#### Migrations
1. **`m20260119_000001_add_created_at_to_planets.rs`**
   - Colonne `created_at TIMESTAMP NOT NULL`
   - Init avec `NOW()` pour anciennes planètes

2. **`m20260119_000002_add_detailed_report_to_combat_log.rs`**
   - Colonne `detailed_report JSON NULL`
   - Stocke JSON complet des combats

#### Tables modifiées
| Table | Nouvelle colonne | Type | Description |
|-------|------------------|------|-------------|
| `planets` | `created_at` | TIMESTAMP | Date de création (planète mère = + ancienne) |
| `combat_log` | `detailed_report` | JSON (nullable) | Rapport complet avec logs, pertes, butin |

---

### 📊 API - Nouveaux endpoints

| Méthode | Route | Description | Codes |
|---------|-------|-------------|-------|
| `GET` | `/combat-reports/:id/detail` | Récupère rapport détaillé JSON | 200, 404 |

---

### 🎨 Interface utilisateur

#### Leaderboard
- Badge de rang sous le nom (`text-yellow-500/80`, uppercase)
- Exemples: RECRUE, SOLDAT, CAPORAL, SERGENT, LIEUTENANT...

#### Modal de Transport
- Capacité dynamique affichée en temps réel
- Calcul: `nb_transporteurs × capacité_unitaire(niveau_hangar)`
- Validation surcharge côté serveur

#### Journal de Bord
- **Rapports cliquables**: `cursor-pointer` + `hover:bg-*`
- **Clic** → `CombatModal` avec:
  - En-tête Victoire/Défaite
  - Nom adversaire + type mission
  - Butin (Métal/Cristal/Deutérium)
  - Pertes séparées (attaquant/défenseur/défenses)
  - Logs animés round-par-round

---

### 📝 Notes techniques

#### Formules clés

**Capacité transporteur**:
```typescript
capacity = 10000 * (1 + hangarLevel * 0.05)
```

**Pertes expédition**:
```rust
// Garantir minimum 1 perte
let lost = (fleet_size as f64 * loss_rate).ceil() as i32;

// Variation aléatoire ±20%
let variation = rng.gen_range(-0.2..0.2);
let final_rate = base_rate * (1.0 + variation);
```

**Date UTC**:
```rust
format!("%Y-%m-%dT%H:%M:%S%.3fZ")  // ISO 8601 avec Z
```

---

### 🚀 Déploiement

**Migrations à exécuter**:
```bash
# Toutes les migrations en attente
sea-orm-cli migrate up

# Ou une par une
sea-orm-cli migrate up -n 1  # created_at
sea-orm-cli migrate up -n 1  # detailed_report
```

---

### 📦 Fichiers modifiés (8 fichiers)

#### Backend (6 fichiers)
- ✏️ `backend/src/game_logic.rs` - Combat expéditions + capacité transporteur
- ✏️ `backend/src/main.rs` - Endpoints, handlers, sélection planète mère
- ✏️ `backend/src/auth.rs` - Init `created_at` à création planète
- ✏️ `backend/src/entities/planet.rs` - Champ `created_at`
- ✏️ `backend/src/entities/combat_log.rs` - Champ `detailed_report`
- ✏️ `backend/migration/src/lib.rs` - Enregistrement migrations
- ➕ `backend/migration/src/m20260119_000001_add_created_at_to_planets.rs` (nouveau)
- ➕ `backend/migration/src/m20260119_000002_add_detailed_report_to_combat_log.rs` (nouveau)

#### Frontend (3 fichiers)
- ✏️ `frontend/src/components/ReportsTerminal.tsx` - Clics + modal
- ✏️ `frontend/src/components/TransportModal.tsx` - Capacité dynamique
- ✏️ `frontend/src/lib/gameRules.ts` - Fonction `getTransporterCapacity()`

---

### ✅ Checklist de test

- [x] **Expéditions**: 1 vaisseau → pertes > 0
- [x] **Expéditions**: Mix chasseurs/croiseurs → répartition correcte
- [x] **Transport**: Capacité = 10k à hangar 0, 15k à hangar 10
- [x] **Transport**: Surcharge → erreur avec capacité max affichée
- [x] **Classement**: Badge de rang affiché sous nom
- [x] **Rapports**: Clic sur rapport → modal s'ouvre
- [x] **Rapports**: Détails complets (pertes, butin, logs)
- [x] **Planète mère**: Reste fixe après conquête nouvelle planète
- [x] **Tutoriel**: S'affiche 1× puis jamais (sauf clear localStorage)
- [x] **Profil**: "Commandant depuis X jours" correct
- [x] **Recyclage**: 0 recycleurs → toast d'erreur

---

### 🐛 Bugs connus
Aucun bug connu à ce stade.

---

### 🔮 Améliorations futures
- Modules de protection pour expéditions (réduction pertes)
- Bonus de commandement (général d'expédition)
- Filtrage rapports (attaques/défenses/expéditions)
- Statistiques graphiques (évolution points)
- Export rapports en JSON/PDF
- Pagination anciens rapports

---

**Commit**: `d0fb500` - Améliorations transports, rapports combat et capacités évolutives
**Branche**: `claude/responsive-ranking-npc-costs-iIrjT`
**Fichiers**: 8 modifiés, 2 créés

---

## [1.2.0] - 2026-01-18

### 🐛 Corrections de Bugs
- **Production incohérente**: Ajout de `Math.floor()` dans `PlanetOverview.tsx` pour éviter l'écart entre Overview (+318/h) et Resources (+91/h)
- **Username manquant**: Settings.tsx affiche maintenant le vrai username depuis `localStorage` au lieu de "Commandant"
- **Barre progression**: `PlayerRankBadge` avec `showProgress={true}` déjà fonctionnel (calcul automatique vers prochain rang)

### 🆕 Fonctionnalités Admin
- **Backend Rust** (`backend/src/admin.rs`):
  - `GET /admin/players` - Liste tous les joueurs
  - `GET /admin/planet/:id` - Détails planète
  - `PATCH /admin/planet/:id` - Modification planète
  - **Gestion automatique `last_update`**: Update timestamp si ressources modifiées (prévient bugs production)

- **Frontend React** (`frontend/src/components/AdminPanel.tsx`):
  - Accès réservé à `username === 'phantomhex'`
  - Édition complète: Ressources, Mines, Installations, Technologies, Flotte, Défenses
  - Recherche joueurs avec affichage ID/username/points

- **Intégration App.tsx**:
  - Onglet "Admin Panel" visible uniquement si `isAdmin === true`
  - Catégorie "SYSTÈME" dans menu sidebar

### 🛡️ Sécurité
- Vérification double (frontend + backend)
- Protection routes admin avec `check_admin()` (Rust)
- Update automatique `last_update = NOW()` pour cohérence production

### 📝 Architecture
```
backend/src/
  ├── main.rs (routes admin ajoutées)
  ├── admin.rs (nouveau module)
  └── lib.rs (export admin)

frontend/src/
  ├── App.tsx (intégration onglet Admin)
  ├── components/AdminPanel.tsx (nouveau composant)
  ├── components/PlanetOverview.tsx (Math.floor fix)
  └── components/Settings.tsx (username fix)
```

### ⚠️ Notes Importantes
- **CRITICAL**: Toujours mettre à jour `last_update` lors de modification manuelle ressources
- Backend est **Rust uniquement** (pas de fichiers Python)
- Admin Panel accessible uniquement avec compte `phantomhex`

---

## [1.1.0] - Versions précédentes
- Système de messagerie
- Explo spatiale et combat PvP
- Classement multi-catégories
- Tutoriel interactif
