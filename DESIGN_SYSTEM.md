# Space Conquest — Design System v2.0
## Cyberpunk / Modern Sci-Fi

> Ce document est la source de vérité du design system. Tout composant UI doit respecter ces règles.

---

## 1. Palette de Couleurs

### Backgrounds (fonds très sombres)

| Token CSS | Valeur HEX | Usage |
|---|---|---|
| `--bg-void` | `#020008` | Fond absolu (body, overlays) |
| `--bg-base` | `#05000f` | Fond principal des pages |
| `--bg-panel` | `#0a0520` | Cartes, panneaux, sidebars |
| `--bg-elevated` | `#10082e` | Modales, dropdowns, tooltips |
| `--bg-surface` | `#160b3a` | Éléments interactifs (inputs, selects) |
| `--bg-overlay` | `rgba(2, 0, 8, 0.85)` | Overlays semi-transparents |

### Accents Néon

| Token CSS | Valeur HEX | Nom | Usage principal |
|---|---|---|---|
| `--neon-cyan` | `#00f5ff` | Cyan Électrique | Actions primaires, focus, liens |
| `--neon-magenta` | `#ff00ff` | Magenta Vif | Alertes, badges critiques |
| `--neon-purple` | `#bf00ff` | Violet Plasma | Tech tree, recherche |
| `--neon-blue` | `#0080ff` | Bleu Cobalt | Info, états neutres |
| `--neon-green` | `#00ff88` | Vert Matrix | Succès, production, santé |
| `--neon-orange` | `#ff6600` | Orange Combustion | Métal, constructions |
| `--neon-yellow` | `#ffee00` | Jaune Énergie | Énergie, avertissements |
| `--neon-red` | `#ff003c` | Rouge Danger | Erreurs, destructions, combats |

### Accents atténués (pour textes et bordures)

| Token CSS | Valeur | Usage |
|---|---|---|
| `--cyan-dim` | `rgba(0, 245, 255, 0.15)` | Bordures subtiles |
| `--cyan-glow` | `rgba(0, 245, 255, 0.4)` | Glows de survol |
| `--magenta-dim` | `rgba(255, 0, 255, 0.12)` | Bordures secondaires |
| `--purple-dim` | `rgba(191, 0, 255, 0.15)` | Bordures tech |

### Couleurs Ressources (invariables)

| Token CSS | Valeur | Ressource |
|---|---|---|
| `--resource-metal` | `#f97316` | Métal |
| `--resource-crystal` | `#06b6d4` | Cristal |
| `--resource-deuterium` | `#22c55e` | Deutérium |
| `--resource-energy` | `#facc15` | Énergie |
| `--resource-sc` | `#a855f7` | Crédits Syndicat |

### Textes

| Token CSS | Valeur | Usage |
|---|---|---|
| `--text-primary` | `#e2e8f0` | Texte principal |
| `--text-secondary` | `#94a3b8` | Texte secondaire, labels |
| `--text-muted` | `#475569` | Texte désactivé |
| `--text-accent` | `#00f5ff` | Texte accent cyan |
| `--text-mono` | `'JetBrains Mono', 'Fira Code', monospace` | Valeurs HUD, chiffres |

---

## 2. Typographie

### Famille de polices

```css
/* Valeurs HUD et chiffres de jeu */
font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
font-variant-numeric: tabular-nums;

/* Titres de sections */
font-family: 'Orbitron', 'Exo 2', system-ui, sans-serif;
letter-spacing: 0.1em;
text-transform: uppercase;

/* Corps de texte */
font-family: system-ui, -apple-system, sans-serif;
```

### Échelle typographique

| Classe | Taille | Poids | Usage |
|---|---|---|---|
| `.text-hud-xs` | `10px` | 500 | Labels micro, compteurs |
| `.text-hud-sm` | `12px` | 500 | Labels HUD secondaires |
| `.text-hud-base` | `14px` | 600 | Valeurs HUD standard |
| `.text-hud-lg` | `18px` | 700 | Valeurs importantes |
| `.text-hud-xl` | `24px` | 800 | Titres de section |
| `.text-hud-2xl` | `32px` | 900 | Headers de page |

### Règles texte

- **Toujours** `tabular-nums` pour les chiffres de ressources
- **Toujours** `uppercase + tracking-widest` pour les labels de section
- **Jamais** de texte blanc pur (`#fff`) — utiliser `--text-primary` (`#e2e8f0`)
- Les valeurs critiques (HP, ressources faibles) utilisent le néon rouge avec glow

---

## 3. Bordures

### Règles générales

```css
/* Bordure subtile standard — pour panneaux */
border: 1px solid rgba(0, 245, 255, 0.12);

/* Bordure active — pour éléments sélectionnés */
border: 1px solid rgba(0, 245, 255, 0.4);

/* Bordure néon — pour éléments primaires */
border: 1px solid #00f5ff;
box-shadow: 0 0 8px rgba(0, 245, 255, 0.3), inset 0 0 8px rgba(0, 245, 255, 0.05);

/* Bordure danger */
border: 1px solid rgba(255, 0, 60, 0.4);

/* Bordure succès */
border: 1px solid rgba(0, 255, 136, 0.3);
```

### Coins biseautés (clip-path — signature Cyberpunk)

```css
/* Coin coupé haut-gauche — style standard */
clip-path: polygon(12px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 12px);

/* Coin coupé double (haut-gauche + bas-droite) — boutons importants */
clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);

/* Grand biseau — modales, cartes hero */
clip-path: polygon(20px 0%, 100% 0%, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0% 100%, 0% 20px);
```

### Bordures animées

```css
/* Bordure qui trace son contour (animation) */
.border-trace {
  background:
    linear-gradient(90deg, #00f5ff, #00f5ff) top left / 0% 1px no-repeat,
    linear-gradient(90deg, #00f5ff, #00f5ff) bottom right / 0% 1px no-repeat,
    linear-gradient(0deg, #00f5ff, #00f5ff) top right / 1px 0% no-repeat,
    linear-gradient(0deg, #00f5ff, #00f5ff) bottom left / 1px 0% no-repeat;
  animation: border-trace 0.4s ease forwards;
}
```

### Border-radius

```
--radius-sm: 2px    /* Micro éléments, badges */
--radius-md: 4px    /* Boutons, inputs */
--radius-lg: 8px    /* Cartes, modales */
--radius-xl: 12px   /* Panneaux larges */
```
> **Règle** : Préférer les coins biseautés (clip-path) aux radius ronds pour les éléments importants. Le radius est réservé aux petits éléments discrets.

---

## 4. Effets & Glassmorphism

### Panels / Cartes

```css
/* Panel standard */
background: rgba(10, 5, 32, 0.85);
backdrop-filter: blur(12px);
border: 1px solid rgba(0, 245, 255, 0.12);

/* Panel elevated (modal, important) */
background: rgba(16, 8, 46, 0.95);
backdrop-filter: blur(20px);
border: 1px solid rgba(0, 245, 255, 0.25);
box-shadow: 0 0 40px rgba(0, 245, 255, 0.08), 0 25px 50px rgba(0, 0, 0, 0.8);

/* Holo card (survol) */
background: linear-gradient(135deg, rgba(0, 245, 255, 0.05), rgba(191, 0, 255, 0.05));
backdrop-filter: blur(16px);
```

### Glow effects (box-shadow)

```css
--glow-cyan-sm:  0 0 8px rgba(0, 245, 255, 0.3);
--glow-cyan-md:  0 0 20px rgba(0, 245, 255, 0.4);
--glow-cyan-lg:  0 0 40px rgba(0, 245, 255, 0.5);
--glow-magenta:  0 0 20px rgba(255, 0, 255, 0.4);
--glow-purple:   0 0 20px rgba(191, 0, 255, 0.4);
--glow-red:      0 0 20px rgba(255, 0, 60, 0.5);
--glow-green:    0 0 20px rgba(0, 255, 136, 0.4);
```

### Scanlines (overlay texture CRT)

```css
.scanlines::after {
  content: '';
  position: absolute; inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.08) 2px,
    rgba(0, 0, 0, 0.08) 4px
  );
  pointer-events: none;
}
```

---

## 5. États de Survol (Hover) — Boutons

### Règle fondamentale

> **Le survol doit TOUJOURS provoquer 3 changements simultanés** :
> 1. Un **glow** (box-shadow néon)
> 2. Un **léger déplacement** vertical (`translateY(-2px)`)
> 3. Un **changement de bordure** (opacité ou couleur)

### Variantes de Boutons

#### `btn-primary` — Action principale
```css
/* Base */
background: linear-gradient(135deg, rgba(0, 245, 255, 0.1), rgba(0, 128, 255, 0.1));
border: 1px solid rgba(0, 245, 255, 0.4);
color: #00f5ff;
clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

/* Hover */
border-color: #00f5ff;
box-shadow: 0 0 20px rgba(0, 245, 255, 0.4), 0 0 60px rgba(0, 245, 255, 0.15), inset 0 0 20px rgba(0, 245, 255, 0.05);
transform: translateY(-2px);
background: linear-gradient(135deg, rgba(0, 245, 255, 0.2), rgba(0, 128, 255, 0.15));

/* Active */
transform: translateY(0px);
box-shadow: 0 0 10px rgba(0, 245, 255, 0.3);
```

#### `btn-secondary` — Action secondaire
```css
/* Base */
background: transparent;
border: 1px solid rgba(148, 163, 184, 0.2);
color: #94a3b8;
clip-path: polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px);

/* Hover */
border-color: rgba(0, 245, 255, 0.3);
color: #00f5ff;
box-shadow: 0 0 12px rgba(0, 245, 255, 0.2);
transform: translateY(-1px);
```

#### `btn-danger` — Action destructrice
```css
/* Base */
background: rgba(255, 0, 60, 0.1);
border: 1px solid rgba(255, 0, 60, 0.35);
color: #ff6680;

/* Hover */
background: rgba(255, 0, 60, 0.2);
border-color: #ff003c;
box-shadow: 0 0 20px rgba(255, 0, 60, 0.4), inset 0 0 20px rgba(255, 0, 60, 0.05);
transform: translateY(-2px);
color: #ff003c;
```

#### `btn-success` — Confirmation
```css
/* Base */
background: rgba(0, 255, 136, 0.08);
border: 1px solid rgba(0, 255, 136, 0.3);
color: #00ff88;

/* Hover */
background: rgba(0, 255, 136, 0.15);
border-color: #00ff88;
box-shadow: 0 0 20px rgba(0, 255, 136, 0.35);
transform: translateY(-2px);
```

#### `btn-ghost` — Action discrète
```css
/* Base */
background: transparent;
border: 1px solid transparent;
color: #475569;

/* Hover */
background: rgba(0, 245, 255, 0.05);
border-color: rgba(0, 245, 255, 0.15);
color: #94a3b8;
transform: translateY(-1px);
```

#### `btn-icon` — Bouton icône seul
```css
/* Base */
background: rgba(10, 5, 32, 0.6);
border: 1px solid rgba(0, 245, 255, 0.1);
color: #475569;
border-radius: 4px;
width: 36px; height: 36px;

/* Hover */
background: rgba(0, 245, 255, 0.08);
border-color: rgba(0, 245, 255, 0.3);
color: #00f5ff;
box-shadow: 0 0 10px rgba(0, 245, 255, 0.2);
```

### Animation de brillance (shine — optionnel sur les CTA)

```css
@keyframes btn-shine {
  from { transform: translateX(-150%) skewX(-20deg); }
  to   { transform: translateX(350%) skewX(-20deg); }
}

.btn-primary::after {
  content: '';
  position: absolute;
  inset-block: 0;
  width: 30%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
  animation: btn-shine 2.5s ease infinite;
}
```

---

## 6. Inputs & Formulaires

```css
/* Input de base */
background: rgba(5, 0, 15, 0.8);
border: 1px solid rgba(0, 245, 255, 0.12);
color: #e2e8f0;
border-radius: 4px;
padding: 8px 12px;
font-family: 'JetBrains Mono', monospace;
transition: all 0.2s ease;

/* Focus */
border-color: rgba(0, 245, 255, 0.5);
box-shadow: 0 0 0 2px rgba(0, 245, 255, 0.1), 0 0 12px rgba(0, 245, 255, 0.15);
outline: none;

/* Placeholder */
color: rgba(71, 85, 105, 0.8);
```

---

## 7. Badges & Tags

```css
/* Badge standard */
padding: 2px 8px;
border-radius: 2px;
font-size: 10px;
font-weight: 600;
letter-spacing: 0.1em;
text-transform: uppercase;

/* Variantes */
.badge-cyan    { background: rgba(0,245,255,0.1); border: 1px solid rgba(0,245,255,0.3); color: #00f5ff; }
.badge-purple  { background: rgba(191,0,255,0.1); border: 1px solid rgba(191,0,255,0.3); color: #bf00ff; }
.badge-red     { background: rgba(255,0,60,0.1);  border: 1px solid rgba(255,0,60,0.3);  color: #ff003c; }
.badge-green   { background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.3); color: #00ff88; }
.badge-orange  { background: rgba(255,102,0,0.1); border: 1px solid rgba(255,102,0,0.3); color: #ff6600; }
```

---

## 8. Progress Bars

```css
/* Track */
background: rgba(0, 245, 255, 0.05);
border: 1px solid rgba(0, 245, 255, 0.1);
border-radius: 2px;
height: 6px;

/* Fill cyan */
background: linear-gradient(90deg, #0080ff, #00f5ff);
box-shadow: 0 0 8px rgba(0, 245, 255, 0.5);
border-radius: 2px;

/* Fill danger */
background: linear-gradient(90deg, #ff003c, #ff6680);
box-shadow: 0 0 8px rgba(255, 0, 60, 0.5);
```

---

## 9. Sections / Headers de panel

```css
/* Header de section */
display: flex; align-items: center; gap: 8px;
padding-bottom: 8px;
border-bottom: 1px solid rgba(0, 245, 255, 0.1);
margin-bottom: 16px;

/* Accent line verticale */
.section-accent {
  width: 3px;
  height: 16px;
  background: linear-gradient(to bottom, #00f5ff, rgba(0,245,255,0));
  border-radius: 2px;
}

/* Titre */
font-family: 'Orbitron', monospace;
font-size: 11px;
font-weight: 700;
letter-spacing: 0.15em;
text-transform: uppercase;
color: rgba(0, 245, 255, 0.7);
```

---

## 10. Composants Spéciaux

### `<DataCard>` — Carte de donnée HUD
- Fond glassmorphism dark
- Coin biseauté haut-gauche
- Header avec accent vertical cyan
- Valeur en mono grand
- Label en caps petit
- Hover : glow léger + translateY(-2px)

### `<NeonButton>` — Bouton CTA néon
- clip-path double biseau
- Shine animation intégrée
- Glow progressif au hover
- Ripple effect au click (Framer Motion)

### `<CyberModal>` — Modal cyberpunk
- Backdrop blur noir intense
- Coins décorés (brackets)
- Ligne de scan animée en header
- Bordure trace au mount (animation)
- Close button avec rotation

### `<StatusBadge>` — Badge état
- Pill avec dot animé (pulse)
- Couleurs selon état : online/offline/warning/danger

### `<ResourceRow>` — Ligne ressource
- Icône colorée (orange métal, cyan cristal, etc.)
- Valeur mono tabular-nums
- Progress bar fine sous la valeur
- Delta (+/-) en petit avec couleur

---

## 11. Animations — Durées & Easings

```css
--duration-instant:  80ms
--duration-fast:     150ms
--duration-normal:   250ms
--duration-slow:     400ms
--duration-xslow:    600ms

--ease-snap:   cubic-bezier(0.4, 0, 0.2, 1)   /* Fluide standard */
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1) /* Entrée avec rebond */
--ease-out:    cubic-bezier(0, 0, 0.2, 1)        /* Sortie douce */
--ease-in:     cubic-bezier(0.4, 0, 1, 1)        /* Entrée rapide */
```

### Règles Framer Motion

- **Entrée composant** : `initial={{ opacity: 0, y: 10 }}` → `animate={{ opacity: 1, y: 0 }}` — duration 0.3s
- **Sortie composant** : `exit={{ opacity: 0, y: -5 }}` — duration 0.2s
- **Hover bouton** : `whileHover={{ scale: 1.02 }}` + `whileTap={{ scale: 0.98 }}`
- **Stagger liste** : `staggerChildren: 0.05` sur le container
- **Modal** : `initial={{ opacity: 0, scale: 0.95 }}` → `animate={{ opacity: 1, scale: 1 }}`

---

## 12. Guidelines d'Implémentation

### À faire (DO)
- ✅ Utiliser `cn()` de `lib/utils.ts` pour toutes les classes conditionnelles
- ✅ Wrapper tous les composants interactifs avec `motion.div` ou `motion.button`
- ✅ Utiliser Radix UI pour l'accessibilité (Dialog, Tooltip, DropdownMenu, etc.)
- ✅ Ajouter `aria-label` sur tous les boutons icônes
- ✅ Respecter les tokens CSS (`var(--neon-cyan)`) plutôt que les valeurs hardcodées
- ✅ Clip-path sur les boutons primaires et cartes importantes
- ✅ `tabular-nums` sur tous les chiffres de jeu

### À éviter (DON'T)
- ❌ Pas de `rounded-full` ou `rounded-xl` sur les éléments de jeu principaux
- ❌ Pas de blanc pur `#ffffff` — utiliser `#e2e8f0`
- ❌ Pas de transitions > 400ms sur les interactions utilisateur
- ❌ Pas de `border-gray-*` tailwind par défaut — tout passe par les tokens néon
- ❌ Pas de `bg-white` ou fonds clairs dans les panels de jeu
- ❌ Ne jamais créer un bouton sans état hover explicite
