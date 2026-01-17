# 🐛 Bugs Identifiés - Corrections à Appliquer

## ⚠️ Problèmes Détectés

### 1️⃣ Incohérence Production/Heure (Overview vs Resources)

**Statut** : ❌ CRITIQUE  
**Fichiers** : `PlanetOverview.tsx` + `ResourceDisplay.tsx`

#### Problème
- **Overview** : Multiplie par `speedFactor` (ligne 95-97)
- **Resources** : Multiplie par `10` fixe (ligne 50)

#### Code Actuel

**PlanetOverview.tsx** (lignes 95-97) :
```typescript
const calculateProduction = (level: number, baseFactor: number) => {
  const baseProd = baseFactor * level * Math.pow(1.1, level);
  return baseProd * speedFactor; // ✅ CORRECT (utilise speedFactor)
};
```

**ResourceDisplay.tsx** (lignes 48-52) :
```typescript
const calculateProd = (type: string, level: number, base: number) => {
    if (type === 'solar_plant') {
        const baseProd = 20 * level * Math.pow(1.1, level);
        const techLevel = planet.energy_tech_level || 0;
        return Math.floor(baseProd * (1 + (techLevel * 0.05)));
    }
    return Math.floor(base * level * Math.pow(1.1, level) * 10); // ❌ BUG : * 10 au lieu de speedFactor
};
```

#### ✅ Correction

Dans `ResourceDisplay.tsx`, **remplacer** :
```typescript
export default function ResourceDisplay({ planet, onUpgrade }: ResourceDisplayProps) {
```

Par :
```typescript
interface ResourceDisplayProps {
  planet: any;
  onUpgrade: () => void;
  speedFactor: number; // ← AJOUTER
}

export default function ResourceDisplay({ planet, onUpgrade, speedFactor }: ResourceDisplayProps) {
```

Puis **modifier la fonction** `calculateProd` :
```typescript
const calculateProd = (type: string, level: number, base: number) => {
    if (type === 'solar_plant') {
        const baseProd = 20 * level * Math.pow(1.1, level);
        const techLevel = planet.energy_tech_level || 0;
        return Math.floor(baseProd * (1 + (techLevel * 0.05)));
    }
    return Math.floor(base * level * Math.pow(1.1, level) * speedFactor); // ✅ CORRECTION
};
```

Et **dans App.tsx**, passer `speedFactor` :
```tsx
<ResourceDisplay planet={planet} onUpgrade={refreshPlanet} speedFactor={10} />
```

---

### 2️⃣ Consommation Énergie Affichée 2 Fois (Valeurs Différentes)

**Statut** : ❌ BUG  
**Fichier** : `ResourceDisplay.tsx`

#### Problème

Dans la section "Stats Panel" de chaque mine :
- **Ligne 1** : Affiche `diffEnergy` (différence entre niveau actuel et suivant)
- **Ligne 2** : Affiche `currentEnergy` puis `nextEnergy`

Exemple :
- Mine Métal Niv. 5 : Conso actuelle `-30`, Conso suivante `-136`
- Différence : `-106` (affichée en rouge)
- Mais on voit **-30** ET **-136** sur 2 lignes séparées

#### Code Actuel (lignes 127-145)

```typescript
{/* Ligne Énergie */}
<div>
    <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-500 mb-1">
        <span className="flex items-center gap-1"><Zap size={12}/> {isSolar ? 'Production Énergie' : 'Conso. Énergie'}</span>
        <span className={isSolar ? "text-green-400" : "text-red-400"}>
            {isSolar ? '+' : '-'}{Math.abs(diffEnergy).toLocaleString()}
        </span>
    </div>
    <div className="flex items-center justify-between font-mono text-xs">
        <span className="text-slate-400">{isSolar ? '+' : '-'}{currentEnergy.toLocaleString()}</span>
        <ChevronRight size={12} className="text-slate-600"/>
        <span className={isSolar ? "text-yellow-400 font-bold" : "text-red-400 font-bold"}>
            {isSolar ? '+' : '-'}{nextEnergy.toLocaleString()}
        </span>
    </div>
</div>
```

#### ✅ Explication

C'est **NORMAL** ! Il y a 2 lignes **distinctes** :

1. **Ligne du haut** : Différence (gain/perte supplémentaire au prochain niveau)
   - Exemple : `-106` = augmentation de la consommation

2. **Ligne du bas** : Valeurs absolues actuelles vs suivantes
   - Exemple : `-30` → `-136`

Ce n'est **pas un bug**, c'est un **design intentionnel**. Si tu veux simplifier, tu peux **supprimer la ligne du haut** (différence) :

```typescript
{/* Ligne Énergie - VERSION SIMPLIFIÉE */}
<div>
    <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-500 mb-1">
        <span className="flex items-center gap-1"><Zap size={12}/> {isSolar ? 'Production Énergie' : 'Conso. Énergie'}</span>
    </div>
    <div className="flex items-center justify-between font-mono text-xs">
        <span className="text-slate-400">{isSolar ? '+' : '-'}{currentEnergy.toLocaleString()}</span>
        <ChevronRight size={12} className="text-slate-600"/>
        <span className={isSolar ? "text-yellow-400 font-bold" : "text-red-400 font-bold"}>
            {isSolar ? '+' : '-'}{nextEnergy.toLocaleString()}
        </span>
    </div>
</div>
```

---

### 3️⃣ Afficher Production dans EmpireBar (Hover)

**Statut** : 🛠️ AMÉLIORATION  
**Fichier** : `EmpireBar.tsx`

#### Objectif
Ajouter un tooltip au survol des ressources montrant la production/heure.

#### ✅ Solution (Utiliser Radix Tooltip)

Dans `EmpireBar.tsx`, importer Tooltip :

```typescript
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
```

Modifier la fonction `ResourceItem` (lignes 213-225) :

```typescript
function ResourceItem({ icon: Icon, value, label, color, production }: any) {
    const format = (n: number) => {
        if(n >= 1000000) return (n/1000000).toFixed(2) + 'M';
        if(n >= 1000) return (n/1000).toFixed(1) + 'k';
        return Math.floor(n).toLocaleString();
    }
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-3 group cursor-help">
                        <Icon size={18} className={`${color} transition-transform group-hover:scale-110`} />
                        <span className="font-mono text-sm font-bold text-white min-w-[60px] text-right">
                            {format(value)}
                        </span>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-900 border-white/10">
                    <div className="text-xs space-y-1">
                        <p className="text-slate-400">{label}</p>
                        <p className="text-green-400 font-mono font-bold">
                            +{format(production)}/h
                        </p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
```

Et modifier les appels dans le JSX (lignes 113-115) :

```typescript
<ResourceItem icon={Stone} value={planet.metal_amount} label="Métal" color="text-orange-300" production={prodMetal} />
<ResourceItem icon={Gem} value={planet.crystal_amount} label="Cristal" color="text-cyan-300" production={prodCrystal} />
<ResourceItem icon={Droplets} value={planet.deuterium_amount} label="Deutérium" color="text-green-300" production={prodDeut} />
```

**MAIS** il faut calculer `prodMetal`, `prodCrystal`, `prodDeut` dans EmpireBar ! Ajouter :

```typescript
export default function EmpireBar({ planet, onSwitchPlanet, unreadMessages = 0, onOpenMessages, onToggleSidebar, onNavigateToGalaxy, onNavigateToOverview, speedFactor = 10 }: EmpireBarProps) {
  
  // ... code existant ...

  // Calculs production (AJOUTER AVANT LE RETURN)
  const calculateProduction = (level: number, baseFactor: number) => {
    const baseProd = baseFactor * level * Math.pow(1.1, level);
    return Math.floor(baseProd * speedFactor);
  };

  const prodMetal = calculateProduction(planet.metal_mine_level || 0, 30);
  const prodCrystal = calculateProduction(planet.crystal_mine_level || 0, 20);
  const prodDeut = calculateProduction(planet.deuterium_mine_level || 0, 10);
```

Et ajouter `speedFactor` dans les props :

```typescript
interface EmpireBarProps {
  planet: any;
  onSwitchPlanet: (id: string) => void;
  unreadMessages?: number;
  onOpenMessages?: () => void;
  onToggleSidebar?: () => void;
  onNavigateToGalaxy?: () => void;
  onNavigateToOverview?: () => void;
  speedFactor?: number; // ← AJOUTER
}
```

Dans `App.tsx`, passer `speedFactor={10}` à `<EmpireBar />` :

```tsx
<EmpireBar 
  planet={planet} 
  onSwitchPlanet={handleSwitchPlanet}
  unreadMessages={unreadCount}
  onOpenMessages={handleOpenMessages}
  onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
  onNavigateToGalaxy={() => setActiveComponent('galaxy')}
  onNavigateToOverview={() => setActiveComponent('overview')}
  speedFactor={10}
/>
```

---

### 4️⃣ Notification Messages (Pulse) Non Fonctionnelle

**Statut** : ❌ BUG  
**Fichiers** : `EmpireBar.tsx` + `App.tsx` (probablement)

#### Problème

Le pulse animation existe déjà dans `EmpireBar.tsx` (lignes 174-180) :

```tsx
{unreadMessages > 0 && (
    <span className="absolute top-0 right-0 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-slate-950"></span>
    </span>
)}
```

#### Diagnostic

1. **Vérifier que `unreadMessages` est bien passée depuis App.tsx**
2. **Vérifier que le compteur est mis à jour**

#### ✅ Solution

Dans `App.tsx`, il faut :

1. **Fetcher le nombre de messages non lus** régulièrement
2. **Passer `unreadMessages` à EmpireBar**

Exemple :

```typescript
const [unreadCount, setUnreadCount] = useState(0);

// Fetcher les messages non lus toutes les 10s
useEffect(() => {
  const fetchUnread = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(apiUrl('/messages?unread_only=true'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.length || 0);
      }
    } catch (e) {
      console.error('Erreur fetch messages', e);
    }
  };

  fetchUnread();
  const interval = setInterval(fetchUnread, 10000); // Toutes les 10s
  return () => clearInterval(interval);
}, []);
```

Et passer à EmpireBar :

```tsx
<EmpireBar 
  planet={planet}
  unreadMessages={unreadCount} // ← ICI
  onOpenMessages={() => setActiveComponent('messages')}
  ...
/>
```

**NOTE** : Vérifie aussi que l'onglet **Messages** met à jour les messages comme "lus" quand on les ouvre.

---

## 📋 Résumé des Actions

| Bug | Fichier | Priorité | Complexité | Status |
|-----|---------|-----------|-------------|--------|
| Production incohérente | `ResourceDisplay.tsx` | 🔴 HAUTE | 🟢 Facile | ❌ À corriger |
| Conso énergie 2x | `ResourceDisplay.tsx` | 🟡 BASSE | 🟢 Facile | ✅ Design intentionnel |
| Tooltip production | `EmpireBar.tsx` | 🟠 MOYENNE | 🟡 Moyen | 🛠️ Amélioration |
| Notif messages | `App.tsx` + `EmpireBar.tsx` | 🔴 HAUTE | 🟡 Moyen | ❌ À corriger |

---

## 🚀 Ordre de Correction Recommandé

1. **Production incohérente** (5 min)
2. **Notifications messages** (10 min)
3. **Tooltip production** (15 min)
4. **Conso énergie** (optionnel, décision design)

---

Veux-tu que je génère les fichiers corrigés directement ?
