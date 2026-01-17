# ♿ Correction des Warnings d'Accessibilité DialogContent

## 🐛 Problème

Warning dans la console :
```
Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
```

## 💡 Cause

Radix UI Dialog **exige** pour l'accessibilité :
- Soit un `<DialogDescription>` (recommandé)
- Soit `aria-describedby={undefined}` explicitement

Ceci permet aux lecteurs d'écran d'annoncer correctement le contenu de la modal.

## ✅ Solutions

### Option 1 : Ajouter une Description (Recommandé)

Dans chaque fichier utilisant `DialogContent`, ajouter :

```tsx
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription // ← IMPORTER
} from "@/components/ui/dialog";

function MyModal() {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Titre du Dialog</DialogTitle>
          
          {/* ✅ AJOUTER CETTE LIGNE */}
          <DialogDescription>
            Description accessible du contenu de cette modal
          </DialogDescription>
        </DialogHeader>
        
        {/* Reste du contenu */}
      </DialogContent>
    </Dialog>
  );
}
```

### Option 2 : Masquer Visuellement la Description

Si tu veux une description pour l'accessibilité **sans l'afficher** :

```tsx
<DialogDescription className="sr-only">
  Description pour lecteurs d'écran uniquement
</DialogDescription>
```

**Ajouter dans Tailwind config si `sr-only` n'existe pas** :
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### Option 3 : Désactiver le Warning (Non Recommandé)

Si vraiment aucune description n'est pertinente :

```tsx
<DialogContent aria-describedby={undefined}>
  {/* Contenu sans description */}
</DialogContent>
```

⚠️ **Attention** : Nuit à l'accessibilité, à éviter sauf cas spécial.

## 📝 Composants à Corriger

Rechercher tous les fichiers avec `DialogContent` :

```bash
cd frontend/src
grep -r "DialogContent" --include="*.tsx" .
```

### Liste Probable (vérifier) :

- [ ] `components/CombatModal.tsx`
- [ ] `components/AttackModal.tsx`
- [ ] `components/TransportModal.tsx`
- [ ] `components/SpyModal.tsx`
- [ ] `components/ShortcutsHelpModal.tsx` (dans useKeyboardShortcuts.tsx)
- [ ] Tout autre composant utilisant Dialog

## 🔧 Script de Correction Automatique

Exemple pour `CombatModal.tsx` :

**Avant** :
```tsx
<DialogContent className="...">
  <DialogHeader>
    <DialogTitle>Résultat du Combat</DialogTitle>
  </DialogHeader>
  {/* contenu */}
</DialogContent>
```

**Après** :
```tsx
<DialogContent className="...">
  <DialogHeader>
    <DialogTitle>Résultat du Combat</DialogTitle>
    <DialogDescription className="sr-only">
      Rapport détaillé de l'engagement militaire avec butin et pertes
    </DialogDescription>
  </DialogHeader>
  {/* contenu */}
</DialogContent>
```

## 🎯 Descriptions Suggérées

### CombatModal
```tsx
<DialogDescription className="sr-only">
  Rapport de combat avec résultats, butin et pertes de flotte
</DialogDescription>
```

### AttackModal
```tsx
<DialogDescription className="sr-only">
  Configuration de l'attaque : sélectionnez vos vaisseaux pour l'assaut
</DialogDescription>
```

### TransportModal
```tsx
<DialogDescription className="sr-only">
  Envoi de ressources vers une autre planète
</DialogDescription>
```

### SpyModal
```tsx
<DialogDescription className="sr-only">
  Rapport d'espionnage de la planète cible
</DialogDescription>
```

### ShortcutsHelpModal
```tsx
<DialogDescription className="sr-only">
  Liste complète des raccourcis clavier disponibles
</DialogDescription>
```

## ✅ Vérification

Après correction :

1. **Ouvrir la console** (F12)
2. **Déclencher chaque modal**
3. **Vérifier** que le warning a disparu

## 📚 Ressources

- [Radix UI Dialog Docs](https://www.radix-ui.com/primitives/docs/components/dialog#description)
- [WCAG 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html)
- [GitHub Issue #3007](https://github.com/radix-ui/primitives/issues/3007)

---

✨ **Note** : Ces warnings n'empêchent **pas** le fonctionnement, mais impactent l'accessibilité pour les utilisateurs de lecteurs d'écran.
