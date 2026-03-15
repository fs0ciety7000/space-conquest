# BALANCE AUDIT — Space Conquest
**Date:** 2026-03-14
**Auditeur:** GameDesigner (Agent IA)
**Version codebase:** post-v9.2, Expansion 5.0 active

---

## Résumé Exécutif

Space Conquest est un jeu de stratégie spatiale persistant de type Ogame. L'architecture est data-driven et bien structurée : la majorité des constantes de gameplay sont soit en DB (`server_config`, `ship_types`, `building_types`, `defense_types`) soit en fallbacks de code configurables. Le système de combat est simultané, à 6 rounds max, avec rapid-fire DB-backed. Le moteur est solide.

**Note globale : 6.2/10**

Les fondations mathématiques sont correctes. Les problèmes majeurs identifiés sont :
- Un déséquilibre structurel dans la progression des vaisseaux (le Bombardier est une impasse ; le Croiseur est roi trop longtemps)
- Les défenses sont très faibles en rapport coût/efficacité comparées aux vaisseaux
- Le rapid-fire est lacunaire (aucune règle Croiseur → Éclaireur Lourd, Destructeur → Transporteur, etc.)
- La formule de combat mélange deux systèmes (legacy `game_logic::resolve_pvp` vs `combat::resolve_pvp_combat`) avec un risque de divergence
- Les récompenses d'expédition sont excellentes mais le système de outcomes est entièrement côté serveur avec peu de visibilité joueur sur les probabilités

---

## 1. Production & Économie

### 1.1 Formule de production des mines

```
production_horaire = base × level × growth^level × plasma_bonus × energy_tech_bonus × energy_ratio × production_speed
```

Valeurs par défaut (depuis `game_logic.rs`, config-overridable) :

| Ressource  | Base | Growth | Énergie base consommation |
|------------|------|--------|--------------------------|
| Métal      | 30   | 1.1    | 10 × level × 1.1^level   |
| Cristal    | 20   | 1.1    | 10 × level × 1.1^level   |
| Deutérium  | 15   | 1.1    | 12 × level × 1.1^level (+20% vs métal/cristal) |

**Production passive (niveau 0) :** Métal 20/h, Cristal 10/h, Deutérium 5/h — protège les débutants.

**Exemples calculés à vitesse ×1 (production_speed=1), sans tech bonus, energy_ratio=1.0 :**

| Niveau | Métal/h | Cristal/h | Deutérium/h |
|--------|---------|-----------|-------------|
| 1      | 33      | 22        | 16          |
| 5      | 488     | 325       | 244         |
| 10     | 4,781   | 3,187     | 2,391       |
| 15     | 30,479  | 20,319    | 15,239      |
| 20     | 152,000 | 101,333   | 76,000      |

**Ratio métal/cristal/deutérium : ~3:2:1.5** — légèrement différent de l'intention commentée (3:2:1). Le deutérium représente 50% du métal au lieu de 33%. Cela rend le deutérium moins scarce que prévu, ce qui atténue la tension "carburant rare".

### 1.2 Énergie

**Centrale Solaire :**
```
production = 60 × level × 1.1^level × (1 + energy_tech_level × 0.10)
```
Note : le bonus energy_tech sur la solaire est ×0.10 par niveau (10%), mais le bonus energy_tech sur la production des mines est ×0.01 (1%). C'est intentionnel : l'énergie tech booste principalement la production solaire.

**Fusion :**
```
production = 50 × level × 1.2^level
```
La fusion scale plus vite (1.2 vs 1.1) mais son coût de base (900/360/180) la rend accessible vers mine-10+.

**Consommation mines :**
```
total_consumption = metal(10×L×1.1^L) + crystal(10×L×1.1^L) + deuterium(12×L×1.1^L)
```

**Problème identifié :** À mine-10/10/10, la consommation est ~(4781 + 4781 + 5737) ≈ 15,299 unités d'énergie. La solaire-10 produit 60×10×1.1^10×(1+energy_tech×0.1) ≈ 15,562 (sans energy tech). C'est parfaitement ajusté à niveau égal, mais la mine deutérium consomme 20% de plus que les autres à même niveau — les joueurs qui over-investissent en deutérium auront des pénuries d'énergie plus fréquentes.

### 1.3 Ressources initiales

**Homeworld (inscription) :**
- Métal : 2,000 | Cristal : 1,000 | Deutérium : 500
- Bâtiments initiaux : Mine métal L1, Mine cristal L1, Mine deutérium L1, Solaire L3, Chantier L1

**Colonisation :** Resources transportées par le joueur via le vaisseau colonisateur (payload.metal/crystal/deuterium). Pas de ressources initiales fixes pour les colonies — le joueur choisit combien il transporte.

### 1.4 Storage Cap

```
capacity = 600,000 × 1.6^level   (storage_level=0 → 600,000)
```

| Niveau | Capacité      |
|--------|---------------|
| 0      | 600,000       |
| 1      | 960,000       |
| 5      | 6,553,600     |
| 10     | 109,951,163   |

**Problème :** Le stockage de niveau 0 est 600k, ce qui est extrêmement généreux pour un débutant (il faudrait ~13h de mine L10 pour le remplir). Pas de pression de collecte en early game. OGame utilise 500k au niveau 0 mais avec des mines plus fortes.

### 1.5 Bonus Plasma Tech sur production

```
plasma_bonus = 1 + plasma_tech_level × 0.01
```

+1% par niveau sur métal et cristal uniquement. Avec Plasma Tech 10 → +10% production. Raisonnable comme sink technologique avancé, mais pas transformateur.

### 1.6 Slots de ressources

Le système de resource slots ajoute jusqu'à 4 slots additionnels (positions 5-8) débloquables, chacun ajoutant 50% de bonus de production (`slot_bonus_per_slot = 0.5` par défaut). Cela peut doubler la production d'une ressource sur une planète bien aménagée. Ce système n'existe pas dans OGame et est une différenciation intéressante, mais le coût de déblocage (`get_slot_unlock_cost`) n'est pas dans les fichiers lus — à vérifier.

---

## 2. Vaisseaux

### 2.1 Tableau complet (valeurs depuis `m20260125_200002_seed_complete_expansion_data.rs`)

| Vaisseau        | Coût M/C/D         | Attack | Shield | Hull   | Cargo  | Speed   | Fuel/u | Chantier req | Prérequis Tech                         |
|-----------------|---------------------|--------|--------|--------|--------|---------|--------|-------------|----------------------------------------|
| Chasseur Léger  | 3,000/1,000/0       | 10     | 50     | 400    | 0      | 12,500  | 10     | L1          | Combustion L1                          |
| Chasseur Lourd  | 6,000/4,000/0       | 25     | 150    | 800    | 50     | 10,000  | 25     | L3          | Impulsion L2, Armure L2                |
| Croiseur        | 20,000/7,000/2,000  | 400    | 50     | 2,700  | 800    | 15,000  | 300    | L4          | Ions L2, Impulsion L4                  |
| Vaisseau Guerre | 45,000/15,000/0     | 1,000  | 200    | 6,000  | 1,500  | 10,000  | 500    | L7          | Hyper Drive L4, Armement L6            |
| Bombardier      | 50,000/25,000/15,000| 1,000  | 75     | 7,500  | 500    | 5,000   | 700    | L8          | Plasma L5, Impulsion L6                |
| Destructeur     | 60,000/50,000/15,000| 2,000  | 500    | 11,000 | 2,000  | 50,000  | 1,000  | L6          | Hyper Drive L6, Armement L10           |
| Étoile de la M. | 5M/4M/1M            | 200,000| 1,000  | 9,000,000| 50,000| 1,000,000| 1  | L12         | Hyper Drive L7, Hyper Tech L6, Graviton L1 |
| Sonde Espion    | 0/1,000/0           | 5      | 0      | 100    | 0      | 100M    | 1      | —           | Combustion L3, Espionnage L2           |
| Transporteur    | 4,000/4,000/0       | 5      | 10     | 400    | 5,000  | 5,000   | 50     | L2          | Combustion L2                          |
| Vaisseau Colon. | 10,000/20,000/10,000| 2,500  | 50     | 3,000  | 7,500  | 2,500   | 1      | L4          | Impulsion L3                           |
| Recycleur       | 10,000/6,000/2,000  | 1,000  | 10     | 1,600  | 20,000 | 2,000   | 1      | L6          | Combustion L6, Boucliers L2            |

**Note importante :** Les stats du code `game_logic.rs` (fallbacks) divergent parfois des valeurs en DB (seed migration). Par exemple, le Croiseur a attack=400 dans `game_logic.rs` mais la DB seed insère attack=400 (cohérent). Le Recycleur a hull=1600 en DB mais hull=160 dans le fallback de `game_logic.rs` — **divergence critique** si la DB n'est pas initialisée.

### 2.2 Analyse de progression

**Chasseur Léger (CL) :** Fodder pur. Attack=10, très bas. Pour 3k métal/1k cristal, ratio coût/attaque est le pire du jeu (1 attack pour 400 ressources). Son seul intérêt est le nombre pur et le rapid-fire adverse qu'il absorbe.

**Chasseur Lourd (CH) :** Attack=25 pour 10k resources. Ratio 10k/25=400 ressources/attack. Identique au CL. Bouclier de 150 vs 50 pour le CL — sa seule vraie différence. Prérequis Impulsion L2 + Armure L2 est lourd pour si peu de gain. **PROBLÈME : le CH n'est pas un upgrade cohérent du CL en termes d'attack/coût.**

**Croiseur :** Attack=400 pour 29k resources (M+C+D). 72 ressources par point d'attack. Sauts massif vs CH (25→400 attack). RF×6 contre CL et RF×10 contre Rocket Launchers. Le Croiseur domine le mid-game complètement. Il est difficile à contrer jusqu'au Vaisseau de Guerre.

**Vaisseau de Guerre (VG) :** Attack=1000 pour 60k resources. 60 ressources/attack. Meilleur ratio brut que le Croiseur. RF×4 contre CL, RF×3 contre CH. Exige Hyper Drive L4 + Armement L6, ce qui est un gate technologique significatif.

**Bombardier :** Attack=1000, Bouclier=75 (très bas), Hull=7500. Même attaque que VG pour 90k resources. Son unique avantage : RF×20 vs Rocket Launchers et RF×10 vs Plasma Turrets. Mais il exige Plasma L5 + Impulsion L6, soit l'une des conditions les plus dures du jeu. **PROBLÈME CRITIQUE : le Bombardier n'est pas rentable comme vaisseau de combat général.** Il est un hard-counter contre défenses spécifiques mais son coût est 1.5× le VG avec les mêmes stats d'attaque et un bouclier catastrophique (75 vs 200). Personne ne construira des Bombardiers en dehors de counter-strats anti-Plasma.

**Destructeur :** Attack=2000 pour 125k resources. 62 resources/attack. Exige Armement L10 (très long à monter). RF×2 vs VG et RF×5 vs Bombardier. Fait sens comme tier ultime avant Étoile de la Mort.

**Étoile de la Mort :** Attack=200,000 — 500× le Destructeur pour 10M resources. Plausible mais inaccessible sans Graviton Tech (coût de recherche gratuit mais prérequis Tech énormes). Étoile solo vs un empire bien défendu : potentiellement invincible.

### 2.3 Problèmes Cargo

Les capacités cargo dans `game_logic.rs` (fallback) vs ce qui est stocké en DB sont incohérentes :
- `cargo_transporter` en fallback code = 25,000 (ligne 763)
- `cargo_transporter_base` config = 10,000 (ligne 700, 762)
- DB seed insère cargo=5,000 pour le Transporteur (ligne 141 migration)

**CRITIQUE : Triple définition des capacités cargo avec valeurs différentes (5k/10k/25k).**

---

## 3. Défenses

### 3.1 Tableau (valeurs DB, depuis migration seed)

| Défense              | Coût M/C/D           | Attack | Shield | Hull    | Cost/Attack ratio |
|----------------------|----------------------|--------|--------|---------|-------------------|
| Rocket Launcher      | 2,000/0/0            | 80     | 20     | 200     | 25 M/attack       |
| Laser Léger          | 1,500/500/0          | 100    | 25     | 100     | 20 M+C/attack     |
| Laser Lourd          | 6,000/2,000/0        | 250    | 100    | 800     | 32 M+C/attack     |
| Canon de Gauss       | 20,000/15,000/2,000  | 1,100  | 200    | 3,500   | 32 M+C/attack     |
| Canon à Ions         | 5,000/3,000/0        | 150    | 500    | 800     | 53 M+C/attack     |
| Tourelle Plasma      | 50,000/50,000/30,000 | 3,000  | 300    | 10,000  | 33 M+C/attack     |
| Petit Bouclier       | 10,000/10,000/0      | 1      | 2,000  | 20,000  | Shield platform   |
| Grand Bouclier       | 50,000/50,000/0      | 1      | 10,000 | 100,000 | Shield platform   |

### 3.2 Analyse coût/efficacité

**Rocket Launcher vs Chasseur Léger :** RL coûte 2,000M pour 80 attack. 1 CL coûte 4,000 resources pour 10 attack. En termes de DPS pur, le RL est 4× plus efficient que le CL. MAIS : les défenses ne génèrent pas de débris et sont détruites définitivement. Les vaisseaux sont sauvables (fleet save). **Implication : la défense est structurellement désavantagée dans un jeu persistant car les ressources investies ne peuvent pas être mises en sécurité.**

**Canon à Ions :** 150 attack pour 8,000 resources. Mauvais DPS. Sa valeur est son bouclier de 500 — il absorbe les dégâts. Rôle de "tank" planétaire.

**Tourelle Plasma :** 3,000 attack + RF×10 vs Rocket Launchers et RF×3 vs Cruisers. En DPS pur avec RF contre une flotte de Croiseurs, une Plasma peut tirer 3× par round. Efficace mais exige Plasma Tech L7, soit le gate technologique le plus dur du jeu.

**Boucliers :** Le Grand Bouclier (10,000 shield / 100,000 hull) pour 100k resources est une plateforme défensive pure. Sans attaque, il ne sert qu'à absorber des dégâts. Sa valeur réelle dépend de la formule de dégâts — dans le système actuel (damage/total_defense = loss_ratio), les boucliers élevés réduisent le ratio de perte proportionnellement. Mais avec 1 seul point d'attaque, ils ne contribuent pas au combat offensif.

### 3.3 Rapid Fire contre défenses (legacy code, potentiellement non synchronisé avec DB)

Depuis le fallback dans `game_logic.rs` :
- Croiseur → Rocket Launcher : RF×10
- Plasma Turret → CL : RF×5 | Croiseur : RF×3
- Bombardier → Rocket Launcher : RF×20 | Plasma Turret : RF×10

**PROBLÈME :** Les rapid fire rules en DB (dans `rapid_fire_rules`) ne contiennent que les règles ship vs ship (6 règles total). Les règles ship vs defense (Croiseur vs Missile, Bombardier vs Plasma) semblent absentes de la DB seed (migration `m20260125_200002`), qui delete toutes les rules et n'insère que les ship-vs-ship. Si `resolve_pvp_combat` utilise le `RapidFireCache` DB-backed, les effets anti-défenses des Croiseurs et Bombardiers n'existent plus en production.

---

## 4. Bâtiments

### 4.1 Coûts de construction (depuis `get_upgrade_cost` dans `game_logic.rs`)

**Note :** Cette fonction est le fallback si la DB BuildingCostCache échoue. Les valeurs DB (migration seed) peuvent différer. On note une discordance : la migration insère `crystal_mine` avec cost_factor=1.6, mais le code fallback utilise 1.5 (v9.2 downgrade commenté). La DB est la source de vérité.

| Bâtiment          | Base M/C/D       | Facteur | Coût L5        | Coût L10         | Coût L20          |
|-------------------|-----------------|---------|----------------|------------------|-------------------|
| Mine Métal        | 60/15/0         | 1.5     | 456/114/0      | 3,459/865/0      | 198,907/49,727/0  |
| Mine Cristal      | 48/24/0         | 1.6 (DB) | 400/200/0     | 3,277/1,638/0    | 220,826/110,413/0 |
| Mine Deutérium    | 225/75/0        | 1.5     | 1,708/569/0    | 12,966/4,322/0   | 745,900/248,633/0 |
| Centrale Solaire  | 75/30/0         | 1.5     | 569/228/0      | 4,322/1,729/0    | 248,633/99,453/0  |
| Centrale Fusion   | 900/360/180     | 1.8     | 5,017/2,007/1,004| 23,299/9,320/4,660| 504,290/201,716/100,858 |
| Labo Recherche    | 200/400/200     | 2.0     | 3,200/6,400/3,200| 102,400/204,800/102,400| N/A        |
| Chantier Spatial  | 400/200/100     | 2.0     | 6,400/3,200/1,600| 204,800/102,400/51,200| N/A        |
| Hangar            | 200/0/50        | 2.0     | 3,200/0/800    | 102,400/0/25,600 | N/A               |
| Stockage          | 1,000/500/0     | 2.0     | 16,000/8,000/0 | 512,000/256,000/0| N/A               |
| Usine Nanites     | 1M/500k/100k   | 2.0     | Endgame uniquement                          |

### 4.2 ROI des mines

```
ROI (heures) = Coût_niveau_N / (Production_N - Production_(N-1))
```

Exemple Mine Métal (vitesse ×1, sans tech bonus) :

| Niveau | Coût M+C    | Prod/h gain | ROI (heures) |
|--------|-------------|-------------|--------------|
| 1→2    | 135         | 73-33=40    | 3.4h         |
| 4→5    | 570         | 488-326=162 | 3.5h         |
| 9→10   | 4,324       | 4,781-3,490=1,291 | 3.3h   |
| 14→15  | 27,662      | 30,479-22,221=8,258 | 3.3h |
| 19→20  | 177,635     | 152,000-110,915=41,085 | 4.3h |

**Observation :** Le ROI de la Mine Métal est remarquablement stable (~3.3-3.5h) jusqu'au niveau 19, puis monte légèrement. C'est une très bonne propriété d'équilibrage — le joueur n'est jamais découragé d'améliorer sa mine, il n'y a pas de "mur de rentabilité". En revanche, il n'y a pas non plus d'accélération de ROI — pas d'effet "boule de neige" contrôlé. La courbe est linéaire en ROI.

**Mine Deutérium :** Base coût 225/75 = 300 total vs Mine Métal 60/15 = 75 total. Le deutérium coûte 4× plus cher à construire pour ~50% de la production métal. ROI initial ~12h. Joueurs qui ignorent le deutérium sont pénalisés sur les missions de flotte (carburant) mais pas en économie pure. C'est correct.

### 4.3 Temps de construction

```
build_time = 1800 × level^1.40 × category_factor × (1 - shipyard_level × 0.08).clamp(max_reduction=60%) / building_speed / 2^nanite_level
```

| Niveau | Mines (factor=1.0) | Chantier/Labo (factor=1.8) |
|--------|-------------------|---------------------------|
| 1      | 30 min (L1 chantier) | 54 min               |
| 5      | 3h 10m            | 5h 41m                     |
| 10     | 9h 29m            | 17h 5m                     |
| 20     | 37h 55m           | 68h 17m                    |

*Sans réduction chantier (à L1), sans nanite_factory, à building_speed=1*

La réduction chantier maximum de 60% (à chantier L7.5 → L8 arrondi) est cohérente avec le jeu long terme.

---

## 5. Technologies

### 5.1 Coûts et temps de recherche

**Formule :**
```
research_time = 2400 × level^1.50 × category_factor × (1 - lab_level × 0.07).clamp(max_reduction=55%) / research_speed
```

À lab L1, sans réduction :

| Technologie         | Base M/C/D       | Mult | Temps L1    | Temps L5    | Temps L10   |
|--------------------|-----------------|------|-------------|-------------|-------------|
| Energie Tech       | 0/800/400       | 2.0  | 40 min      | 3h 36m      | 12h 42m     |
| Laser Tech         | 200/100/0       | 2.0  | 40 min      | 3h 36m      | 12h 42m     |
| Armure Tech        | 1,000/0/0       | 2.0  | 40 min      | 3h 36m      | 12h 42m     |
| Boucliers          | 200/600/0       | 2.0  | 40 min      | 3h 36m      | 12h 42m     |
| Armement           | 800/200/0       | 2.0  | 40 min      | 3h 36m      | 12h 42m     |
| Espionnage         | 200/1,000/200   | 2.0  | 40 min      | 3h 36m      | 12h 42m     |
| Plasma Tech        | 2,000/4,000/1,000| 2.0 | 40 min      | 3h 36m      | 12h 42m     |
| Hyperespace Drive  | 10,000/20,000/6,000| 2.0| 40 min      | 3h 36m      | 12h 42m     |
| Astrophysique      | 4,000/8,000/4,000| 1.75| 40 min (×1.8)| 3h 36m ×1.8| —          |
| Graviton Tech      | 0/0/0           | 3.0  | 40 min (×2.5)| —          | —           |

**Problème :** Le temps de recherche de base (40 min à L1) est identique pour toutes les technologies. Seul le category_factor différencie Plasma/Hyper/Astrophysique/Graviton. Armement L10 et Laser Tech L10 ont le même temps de recherche, ce qui ne reflète pas leur importance relative dans l'arbre. En OGame, les techs importantes ont des coûts de base plus élevés qui augmentent naturellement leur temps.

**Le coût en cristal des technologies crée une forte demande de cristal en mid-game :** Energie Tech (800C), Boucliers (600C), Armement (200C+multi), Plasma (4000C), Hyper Drive (20000C). La progression vers l'Étoile de la Mort est cristal-limitée.

### 5.2 Tech Tree — Prérequis

Depuis `m20260125_200002_seed_complete_expansion_data.rs` :

```
Ions Tech     ← Laser L5 + Energie L4
Plasma Tech   ← Ions L5 + Energie L8
Boucliers     ← Energie L3
Armement      ← Energie L4
Hyper Drive   ← Hyper Tech L3 + Impulsion L5
Hyper Tech    ← Energie L5 + Boucliers L5
Astrophysique ← Impulsion L3 + Espionnage L4 + Ordi L3
Graviton      ← Hyper Drive L1 + Hyper Tech L3
```

**Analyse de cohérence :**
- La chaîne vers Plasma : Energie→Laser→Ions→Plasma exige Energie L8 pour déverrouiller Plasma. C'est un gate long mais justifié car Plasma est le prérequis du Bombardier.
- L'Astrophysique demande Espionnage L4 — logique thématique mais crée une dépendance Espionnage souvent négligée par les joueurs militaires. Ils devront quand même l'investir pour coloniser.
- Hyper Tech exige Boucliers L5 — pas intuitif d'un point de vue lore.
- **Marché Noir** : Espionnage ≥8 ET Informatique ≥6 (révisé de 13/10 à 8/6 en v9.2). C'est un gros assouplissement — la plupart des joueurs mid-game y auront accès.

### 5.3 Bonus tech en combat

```
weapons_mult = 1.0 + weapons_level × 0.1 + laser_level × 0.05 + ion_level × 0.03
shield_mult  = 1.0 + shield_level × 0.1
armour_mult  = 1.0 + armour_level × 0.1
```

**Observation cruciale :** Le calcul dans `load_planet_tech_bonuses` (fleet.rs) ajoute Laser (+5%/niveau) et Ion (+3%/niveau) à l'attaque — mais `combat.rs` définit `weapons_mult = 1.0 + weapons_tech_level × 0.1` sans mention de Laser ni Ion. Ces deux systèmes calculant les bonus différemment représentent une **divergence majeure.**

Exemple : Un joueur avec Armement L5, Laser L5, Ion L5 :
- Via `load_planet_tech_bonuses` : 1.0 + 0.5 + 0.25 + 0.15 = 1.90× (90% bonus)
- Via `create_tech_bonuses` (legacy) : 1.0 + 0.5 = 1.50× (50% bonus)

Le nouveau moteur PvP utilise `load_planet_tech_bonuses`. Le legacy utilise `create_tech_bonuses`. Le résultat: le nouveau système est plus généreux vers l'attaque (+Laser+Ion), ce qui favorise les raiders avec hauts niveaux de tech.

---

## 6. Missions & Combat

### 6.1 Attaque — Mécanique

**Loot :** 50% de chaque ressource de la planète cible (`raw_X = defender_resources.X * 0.5`), plafonné par la capacité cargo des survivants attaquants. Priorité : métal → cristal → deutérium.

**Débris :** 30% métal + 30% cristal des vaisseaux détruits des DEUX camps (`debris_factor_metal = 0.30`, `debris_factor_crystal = 0.30`). Les défenses NE génèrent PAS de débris.

**Conquête :** Si l'attaquant vole ≥99% des ressources totales, et que le défenseur a >1 planète, la planète change de propriétaire.

**Problème :** La conquête à 99% de loot est presque impossible naturellement — pour dépasser 50% de loot (cap), il faudrait que les ressources soient si faibles que 50% des ressources capturées représentent 99% du total. En pratique cette condition est quasi-inatteignable normalement. **La mécanique de conquête est morte-née.**

### 6.2 Espionnage

**Sonde destruction :** Si `def_espionage - att_espionage >= 3`, les sondes sont détruites.

**Niveaux de révélation :**
- `tech_diff_eff >= -1` : Ressources visibles
- `tech_diff_eff >= 1` : Flotte visible
- `tech_diff_eff >= 2` : Défenses visibles

**Bonus sonde :** `probe_bonus = floor(log2(probe_count))` — envoyer 2 sondes = +1 niveau effectif, 4 sondes = +2, 8 sondes = +3.

**Graviton Tech défensif :** ±5% par niveau de bruit sur les ressources rapportées. Avec Graviton L10 → ±50% de bruit. Défense efficace contre l'espionnage économique.

### 6.3 Expéditions (v2)

**Durée de base :** `expedition_base_duration = 600s` / `production_speed × 2`. À production_speed=1 → 5 minutes. Très court.

**Slots simultanés :** `1 + floor(computer_tech / 4)`, maximum 4.

**Outcomes pondérés :**
| Outcome          | Probabilité | Récompense                                     |
|-----------------|-------------|------------------------------------------------|
| Espace Vide      | 10%         | 25% du base_calm, perte aléatoire 0-1 vaisseau |
| Ressources Flott. | 25%         | 100% base_calm + recycler_bonus                |
| Pirates Faibles  | 20%         | combat_reward × 0.5 si victoire, 0 si défaite |
| Pirates Moyens   | 25%         | combat_reward × 1.0 si victoire, 0 si défaite |
| Pirates Forts    | 15%         | combat_reward × 2.0 si victoire, 0 si défaite |
| Découverte       | 5%          | SC + ressources bonus                          |

**base_calm** = `total_capacity × 800 × calm_bonus × rand(0.75-1.25)` où capacity est une somme pondérée par vaisseau (CL=1.0, Croiseur=2.5, Battleship=3.0, Transporteur=3.5).

**Problème de carburant :** Consommation = `sum(count × fuel_per_ship) × 5000 / 1000`. Pour une expédition de 10 CL (fuel=10 chacun) : 10×10×5 = 500 deutérium. Raisonnable.

**Problème de récompense :** Les transporteurs ont `capacity=3.5` — le plus haut après l'Étoile de la Mort. Envoyer une flotte d'expédition composée uniquement de transporteurs rapporte plus de ressources calmes qu'une flotte de Croiseurs (capacity=2.5). C'est contre-intuitif et exploitable.

### 6.4 Transport

**Carburant consommé :** Non implémenté dans le code lu — le transport ne semble pas déduire de deutérium selon le code de `transport_handler`. À vérifier.

**Capacité :** `cargo_transporter_base × (1 + hangar_level × 0.05) × (1 + computer_tech × 0.10)`.

### 6.5 Recyclage

**Carburant :** `recyclers × fuel_per_recycler × distance / 1000` — correctement calculé depuis la DB.

**Vitesse :** Utilise le même `calculate_flight_time` que les attaques. Avec Hyperspace Drive boost.

### 6.6 Combat — Analyse du moteur

**Dégâts simultanés** : Les deux camps calculent leurs dégâts sur le snapshot début de round, puis les appliquent simultanément. Correct.

**Formule de perte :**
```
loss_ratio = (damage / (sum_of_ships(shield × shield_mult + hull × armour_mult))).clamp(0.0, 1.0)
ships_remaining = floor(initial_count × (1 - loss_ratio))
```

**Problème :** La distribution des pertes est **proportionnelle** à tous les vaisseaux — si loss_ratio=0.3, 30% de chaque type est perdu. Il n'y a pas de logique de ciblage prioritaire (tuer les plus fragiles d'abord). En OGame, les unités les moins résistantes absorbent les dégâts en premier (tirage individuel). Le système actuel sur-protège les ships fragiles quand ils sont mélangés à des navires costauds.

**Rapid-fire dans le nouveau système :** Le RF est appliqué comme multiplicateur de dégâts proportionnel à la présence de la cible dans la flotte ennemie :
```
effective_damage += base_attack × rapid_fire_mult × (target_count / total_target_units)
```
Ce n'est pas le système OGame qui tire plusieurs fois par round — ici le RF est un multiplicateur de dégâts. C'est une simplification qui change radicalement les mathématiques. Un Croiseur vs 100 CL avec RF=6 devrait tirer 6 fois, infligeant 6× ses dégâts de base. Avec la formule actuelle, si les CL représentent 100% de la flotte adverse, effective_damage = 400 × 6 × 1.0 = 2400 — équivalent. Si les CL ne sont que 50% de la flotte, dégâts = 400 × 6 × 0.5 = 1200. La logique est approximative mais fonctionnelle.

**Rounds maximum = 6** : Identique à OGame. Après 6 rounds sans vainqueur → draw, l'attaquant repart sans butin.

---

## 7. Progression Joueur

### 7.1 Jour 1 (Homeworld : 2k/1k/500 + Mines L1/1/1 + Solaire L3 + Chantier L1)

**Production horaire initiale (production_speed=1) :**
- Métal : 33/h (mine L1)
- Cristal : 22/h (mine L1)
- Deutérium : 16/h (mine L1)

**Premier objectif réaliste : Chasseur Léger (3,000M/1,000C)**

Avec les ressources initiales (2k/1k/500) : Il manque 1,000M. Délai : 1,000M / 33/h ≈ **30 minutes**. Premier CL construit en **~1h** (temps construction : ~24 min à Chantier L1 à ×1 vitesse).

**Améliorer Mine Métal à L2 :** Coût 90M/22C. ~3h de production. **Accessible dès les premières heures.**

**Premier Espionnage :** Sonde (0M/1000C). Disponible avec Combustion L3 + Espionnage L2. Combustion L3 = 400M×2^2 = 1600M, temps ~40min de recherche. Espionnage L2 = 200M×2 + 1000C×2 = 400M/2000C + Computer L1 d'abord = 0M/400C/600D. **Prend plusieurs jours à vitesse ×1.**

### 7.2 Semaine 1

**Cible réaliste à ×1 vitesse serveur :**
- Mine Métal L5-7
- Mine Cristal L5
- Mine Deutérium L3-4
- Chantier L3-4
- Labo L2-3
- Fleet : 20-50 CL, quelques Transporteurs
- Tech : Combustion L2-3, Energie L2, début Espionnage

**Premier Croiseur :** Exige Ions L2 + Impulsion L4. Impulsion L4 exige Energie L1 d'abord. Chaîne : Energie L1 → Impulsion L1-4 → Ions L1-2. Ions L2 exige Laser L5 + Energie L4 au préalable. **La chaîne technologique vers le Croiseur prend 1-2 semaines à ×1.** C'est l'un des gates les plus frustrants du jeu — les joueurs passent 2 semaines avec des CL comme seul outil de combat.

### 7.3 Mois 1

**Cible réaliste à ×1 vitesse serveur :**
- Mines L10-12
- Recherche principale : Energie L5, Laser L5, Ions L2, Impulsion L4
- Croiseur débloqué
- Fleet : 10-50 Croiseurs
- Première expédition lancée
- Colonie possible (Impulsion L3 + Astrophysique L... → Astrophysique exige Impulsion L3 + Espionnage L4 + Ordi L3)

**Première Colonie :** Le Colony Ship exige Impulsion L3. L'Astrophysique (pour 2 planètes) exige Espionnage L4 et Ordi L3. En pratique : **colonisation vers la fin du mois 1 ou début mois 2** à vitesse ×1.

### 7.4 Long terme (3+ mois à ×1)

- Battleship : Hyper Drive L4 + Armement L6. Hyper Drive exige Hyper Tech L3 + Impulsion L5. Hyper Tech exige Energie L5 + Boucliers L5. Long chemin.
- Étoile de la Mort : Graviton + Hyper Drive L7 + Hyper Tech L6. Objectif de fin de partie.
- Multiple colonies (Astrophysique L4+)
- Domination : clusters d'alliances, ACS défensif, marché noir activé

**Comparaison avec OGame vitesse ×1 :** La progression semble bien alignée. OGame à ×1 est notoire pour sa lenteur — 2-3 semaines avant le premier Croiseur. Space Conquest suit le même rythme.

---

## 8. Comparaison OGame

| Critère                     | OGame ×1          | Space Conquest ×1 | Écart |
|-----------------------------|-------------------|--------------------|-------|
| Formule production mine     | base×L×1.1^L      | base×L×growth^L    | Identique |
| Coût facteur mines          | 1.5 (métal)       | 1.5 (métal)        | Identique |
| ROI mine stable             | ~3-4h             | ~3.5h              | Bon |
| Rounds de combat            | 6                 | 6                  | Identique |
| Loot attaquant              | 50%               | 50%                | Identique |
| Débris                      | 30%               | 30%                | Identique |
| Capacité cargo CL           | 50                | 50 (fallback)      | Identique |
| Storage L0                  | 500k              | 600k               | +20% SC |
| Time de base construction   | Formule différente| 30min × L^1.4      | Différent |
| Rapid fire CL vs Sonde      | n/a               | n/a                | Absent dans les 2 |
| Croiseur RF vs LF           | ×6                | ×6                 | Identique |
| Rapid fire en DB             | Non               | Oui (bonne idée)   | SC mieux |
| Étoile de la Mort           | Attack=200,000    | Attack=200,000     | Identique |
| Espionnage détection        | Par seuil         | Par seuil (différent)| Légèrement différent |
| Fleet Save mécanisme        | Via expédition    | Via missions       | Présent |

**Différences notables :**
1. **Biomes planétaires** : absent dans OGame, bonne innovation de SC qui crée des choix stratégiques de colonisation.
2. **Resource Slots** : absent dans OGame, ajoute de la profondeur.
3. **Marché Noir / Crédits Syndicat** : absent dans OGame, bon pour la rétention.
4. **ACS** (Alliance Combat System) : présent dans les deux, bien.
5. **Flagship** : absent dans OGame, différenciant intéressant.

---

## 9. Problèmes Identifiés

### CRITIQUE

**CRIT-001 : Rapid fire manquant en DB pour ship-vs-defense**
- Fichier : `migration/src/m20260125_200002_seed_complete_expansion_data.rs` lignes 14-26 + 630-681
- La migration seed delete toutes les rapid fire rules et n'insère QUE 6 règles ship-vs-ship. Les règles Croiseur×10 vs Rocket Launcher, Bombardier×20 vs Rocket Launcher, Bombardier×10 vs Plasma Turret sont absentes de la DB.
- Le moteur `resolve_pvp_combat` utilise le RapidFireCache chargé depuis la DB — ces effets anti-défenses n'existent donc PAS en production.
- Impact : Le Bombardier (vaisseau anti-défenses) n'a aucun avantage en combat réel contre les défenses. Le Croiseur ne nettoie pas les Rocket Launchers rapidement.

**CRIT-002 : Triple définition de la capacité cargo Transporteur**
- Fichier : `backend/src/game_logic.rs` lignes 662, 700, 763 + migration seed ligne 141
- DB seed : 5,000 | Config `cargo_transporter_base` : 10,000 | Fallback `cargo_transporter` : 25,000
- La fonction `get_ship_cargo_capacity("transporter")` lit `cargo_transporter_base` (10k). La fonction `get_transporter_capacity()` lit aussi `cargo_transporter_base` (10k). Mais `get_unit_base_stats("transporter")` lit `cargo_transporter` (25k).
- Impact : Incohérence entre le cargo affiché et le cargo utilisé pour le calcul de loot lors d'une attaque.

**CRIT-003 : Divergence des calculs de bonus tech entre les deux moteurs de combat**
- Fichier : `backend/src/handlers/fleet.rs` lignes 1253-1257 vs `backend/src/game_logic.rs` lignes 862-872
- `load_planet_tech_bonuses` (nouveau) inclut Laser (+5%/niv) et Ion (+3%/niv) dans weapons_mult
- `create_tech_bonuses` (legacy) n'inclut que weapons_tech (+10%/niv)
- Impact : Les niveaux Laser et Ion ont un effet non documenté en combat PvP via le nouveau système, mais zéro effet via l'ancien. L'UI frontend affiche probablement l'ancien bonus uniquement.

**CRIT-004 : Mécanique de conquête quasi-inaccessible**
- Fichier : `backend/src/main.rs` lignes 896-911
- Condition : loot ≥ 99% des ressources totales. Le loot est cappé à 50% de chaque ressource.
- Mathématiquement : impossible d'atteindre 99% via une seule attaque avec loot_cap=50%. Il faudrait des ressources si petites que même 50% de chaque = 99%+ du total — soit une planète avec ~0 ressources.
- Impact : La conquête de planète est une feature morte.

**CRIT-005 : Divergence Hull Recycleur (160 fallback vs 1600 DB)**
- Fichier : `backend/src/game_logic.rs` ligne 768 vs migration seed ligne 143
- Si la DB n'est pas initialisée correctement, les recycleurs ont 10× moins de HP, rendant l'expédition et le recyclage trivials à contrer.

### HIGH

**HIGH-001 : Bombardier — Impasse d'équilibrage**
- Même attack que le Vaisseau de Guerre (1,000), bouclier catastrophique (75 vs 200), coût supérieur (90k vs 60k M+C), prérequis plus difficile (Plasma L5 vs Hyper Drive L4).
- Sans RF fonctionnel contre défenses (CRIT-001), le Bombardier n'a aucune utilité. À corriger avec CRIT-001.

**HIGH-002 : Espionnage — Gate technologique trop élevé pour la détection défenses**
- `tech_diff_eff >= 2` pour voir les défenses. Avec 1 sonde, nécessite att_esp > def_esp + 2. La détection des défenses est vitale pour préparer une attaque — forcer l'envoi de 4 sondes (log2=2) en compensation est un workaround boiteux.

**HIGH-003 : Transporteurs trop efficaces en expédition**
- Capacité d'expédition du Transporteur = 3.5 vs Croiseur = 2.5. Les Transporteurs génèrent plus de ressources calmes par unité. Un joueur rationnel envoie des Transporteurs en expédition au lieu de vaisseaux de combat — mais les Transporteurs ont combat_power=0, les exposant totalement aux pirates.

**HIGH-004 : Aucun système de "Fleet Save" explicite**
- Le fleet save dans OGame (envoyer sa flotte en expédition ou en transport pour la soustraire aux attaques) est implicite dans SC. Il n'y a pas de UI dédiée ni de mécanique "Ghosting" clairement documentée. Un joueur novice perdra tout en dormant.

**HIGH-005 : Ratio de victoire structurellement favorable à l'attaquant**
- L'attaquant choisit sa cible, son timing, sa composition. Le défenseur doit avoir ses vaisseaux en ZAC (Zone Active Combat) et des défenses permanentes. Les défenses ne génèrent pas de débris → investissement non récupérable. L'attaquant génère 30% débris récupérables. Le ratio coût-risque penche structurellement vers le raider.

**HIGH-006 : Building types seed — Crystal Mine a cost_factor=1.6 mais game_logic.rs fallback = 1.5**
- Fichier : migration seed ligne 217 (`"crystal_mine"... 1.6`) vs `game_logic.rs` ligne 448 (commentaire v9.2 réduit à 1.5)
- Si la DB est rechargée (via migration up/down), crystal_mine coûtera 1.6× — mais si la DB cache est vide et le fallback actif, elle coûte 1.5×. Source de confusion.

### MEDIUM

**MED-001 : Énergie — Mine Deutérium consomme 20% de plus**
- Intention déclarée (ratio 3:2:1) mais deuterium produit ~50% du métal (base 15/30 = 50%). Un joueur qui égalise ses niveaux de mines aura des déficits énergétiques côté deutérium avant de manquer d'énergie pour métal/cristal.

**MED-002 : Production Solar vs Mines — calibrage Energy Tech déséquilibré**
- Le bonus Energy Tech sur la production solaire est +10% par niveau, mais sur la production des mines c'est +1% par niveau. Un joueur qui maxe Energy Tech améliore massivement sa solaire mais peu ses mines. L'intention de "Energy Tech = production d'énergie" est claire mais crée une tech très spécialisée.

**MED-003 : Récompenses d'expédition non plafonnées**
- `combat_reward` pour pirates forts × tier_mult=2.0 + loss_mult + recycler_bonus peut générer des montants très élevés. Avec une flotte de Croiseurs (combat_power élevé), une victoire contre pirates forts peut rapporter des centaines de milliers de ressources — supérieur au loot d'une attaque PvP sur un joueur moyen.

**MED-004 : Graviton Tech — Coût de recherche 0/0/0**
- Fichier : migration seed ligne 65 (`"graviton_tech"... 0, 0, 0`)
- La Graviton Tech est gratuite à rechercher (0 ressources), seul le time_seconds est calculé. Avec suffisamment de niveaux de labo, elle peut être recherchée très rapidement pour un prérequis de l'Étoile de la Mort.

**MED-005 : Pas de deutérium dans les débris de combat**
- Les débris = 30% métal + 30% cristal uniquement. Le deutérium n'est jamais dans les débris. Dans OGame c'est identique, mais SC a un ratio deutérium plus élevé dans les coûts de vaisseaux (Croiseur = 2,000D, Destroyer = 15,000D). Perdre ce deutérium sans débris rend la perte de gros vaisseaux encore plus punitive.

**MED-006 : Cannon à Ions — mauvais rapport coût/DPS**
- 150 attack pour 8,000 resources. Tous les autres vaisseaux de défense ont un meilleur DPS/coût. Le Canon à Ions est supposé avoir un rôle "tank" (shield=500) mais la formule de combat actuelle calcule les pertes par loss_ratio sur toute la flotte — un seul Ion Canon avec beaucoup de shield ne protège pas les autres unités. Sa valeur réelle est quasi-nulle dans le système actuel.

**MED-007 : `get_upgrade_cost` est un fallback ignorant la DB**
- Fichier : `backend/src/game_logic.rs` ligne 438
- Cette fonction hardcode les coûts sans lire la DB. `get_upgrade_cost_from_cache` est la version data-driven. Si le fallback est appelé quelque part (par inadvertance), les coûts affichés ne correspondent pas aux coûts réels.

**MED-008 : Temps research_time ignoré par seed migration**
- Fichier : migration seed ligne 69 : `let time = ((metal + crystal) as f64 / 2500.0 * 3600.0) as i32`
- Le temps de recherche inséré en DB est calculé depuis le coût M+C uniquement, sans deutérium. Technologies deutérium-lourdes (Plasma Tech : 1000D) ont des temps artificiellement courts. La formule `get_research_time` en code (qui utilise level^1.5) remplace cela dynamiquement, donc l'impact est limité — mais la valeur en DB est incorrecte.

---

## 10. Recommandations Prioritaires

### Priorité 1 — Correctifs Critiques (bloquants)

**REC-01 : Insérer les rapid fire defense rules manquantes dans la DB**
- Ajouter dans une nouvelle migration :
  - Croiseur → Rocket Launcher : RF=10
  - Bombardier → Rocket Launcher : RF=20
  - Bombardier → Plasma Turret : RF=10
  - Plasma Turret → Chasseur Léger : RF=5
  - Plasma Turret → Croiseur : RF=3
- Fichier cible : créer `migration/src/m20261002_000005_add_defense_rapid_fire_rules.rs`

**REC-02 : Unifier la capacité cargo Transporteur**
- Décider d'une valeur unique : 10,000 recommandé (milieu de gamme)
- Supprimer `cargo_transporter` de `get_unit_base_stats` fallback, ne conserver que `cargo_transporter_base`
- Mettre à jour la DB seed pour que `cargo_capacity` du Transporteur = 10,000

**REC-03 : Corriger la divergence Laser/Ion dans les bonus combat**
- Documenter explicitement si Laser et Ion doivent donner un bonus d'attaque en plus de Armement
- Si oui : unifier dans `combat::CombatBonuses` avec les 5 tech levels
- Si non : retirer le bonus Laser/Ion de `load_planet_tech_bonuses`

**REC-04 : Rebalancer la condition de conquête**
- Option A : Permettre la conquête si l'attaquant a un Colony Ship dans sa flotte + victoire complète (0 défenses, 0 vaisseaux défenseurs)
- Option B : Réduire le seuil à 75% de ressources volées (encore atteignable avec combo 50% loot + ressources faibles)
- La solution Colony Ship est la plus fidèle à OGame (Rip-off mission)

### Priorité 2 — Balance Ajustements (high impact)

**REC-05 : Rebalancer le Bombardier**
- Augmenter le bouclier à 300 minimum (actuellement 75 — il meurt avant de tirer)
- Ou réduire son prérequis (Plasma L4 au lieu de L5)
- Le Bombardier doit être viable même sans RF vs défenses fonctionnel

**REC-06 : Différencier les temps de recherche par importance**
- Armement et Armure devraient avoir des temps de base 1.2-1.5× les techs de base (Laser, Energie)
- Actuellement tous identiques (category_factor=1.0) sauf les techs explicitement listées

**REC-07 : Limiter la capacité d'expédition des Transporteurs**
- Réduire `capacity` de Transporteur de 3.5 à 1.5 (ou 2.0)
- Les vaisseaux de combat devraient être plus efficaces en expédition
- Ou créer un différentiel de risque : les Transporteurs subissent ×2 les pertes pirates (vulnerability actuelle = 1.5, déjà partiellement implémenté)

**REC-08 : Ajouter une UI de Fleet Save dédiée**
- Mission type "ghost" ou "en transit" avec destination propre planète à long terme
- Actuellement les joueurs expérimentés savent utiliser les missions, les novices perdent tout

### Priorité 3 — Améliorations d'Équilibrage

**REC-09 : Réévaluer le Chasseur Lourd**
- Actuellement sans avantage clair vs CL en cost/attack ratio
- Suggestion : Augmenter attack à 75 (vs 25 actuels) et réduire prérequis à Impulsion L1, Armure L1
- Le CH devrait clairement remplacer le CL dans la composition de flotte mid-early

**REC-10 : Créer un deutérium sink pour les miners purs**
- Les joueurs orientés économie accumulent du deutérium sans l'utiliser
- Suggestion : la Fusion Plant consomme du deutérium comme carburant (1D par tick d'énergie produite)
- Ou : une technologie "Réacteur à Neutrons" qui consomme du deutérium pour booster la production d'énergie/ressources

**REC-11 : Unifier la Crystal Mine cost_factor**
- Choisir 1.5 ou 1.6 et aligner DB + code fallback
- Recommandation : 1.5 (aligné sur la note v9.2 du code)

**REC-12 : Ajouter RF Destroyer → Transporteur/Recycleur**
- Le Destroyer (vaisseau anti-capital) devrait également nettoyer les vaisseaux utilitaires rapidement
- Suggestion : Destroyer → Transporteur : RF=5, Destroyer → Recycleur : RF=3

**REC-13 : Plafonner les récompenses d'expédition**
- Ajouter un `max_expedition_loot` par slot (ex: 5× production horaire planète source)
- Empêche les expéditions de devenir la source de revenus dominante vs économie minière

**REC-14 : Ajouter le deutérium dans les débris (optionnel)**
- Taux réduit : 10% du deutérium détruit
- Rend la perte de vaisseaux lourds moins catastrophique et augmente l'utilité des Recycleurs

---

## Annexe — Formules Clés Résumées

### Production (par heure)
```
mine_production(base, level, growth=1.1, plasma_bonus) = base × level × growth^level × plasma_bonus
energy_tech_bonus = 1 + energy_tech_level × 0.01   (mines)
energy_tech_bonus_solar = 1 + energy_tech_level × 0.10  (solaire)
final_production = mine_production × energy_tech_bonus × energy_ratio × production_speed
```

### Construction Bâtiment
```
build_time(seconds) = 1800 × level^1.40 × category_factor × reduction_shipyard / building_speed / 2^nanite
category_factor = 1.0 (mines) | 1.8 (shipyard, lab, hangar, storage)
reduction_shipyard = max(1 - shipyard_level × 0.08, 0.40)
```

### Recherche Technologique
```
research_time(seconds) = 2400 × level^1.50 × category_factor × reduction_lab / research_speed
reduction_lab = max(1 - lab_level × 0.07, 0.45)
category_factor = 1.0 (base) | 1.5 (plasma, hyperspace, computer, espionage) | 1.8 (astrophysics) | 2.5 (graviton)
```

### Construction Vaisseaux
```
build_time(seconds) = (metal + crystal) / (2500 × (1 + shipyard_level × 0.10)) × 3600 / ship_build_speed
```

### Vol/Distance
```
distance(same system) = |position_diff| × 5 + 1000
distance(different system, same galaxy) = |system_diff| × 2000 + 2700
distance(different galaxy) = min(|galaxy_diff|, total_galaxies - |galaxy_diff|) × 20000
flight_time(seconds) = (35 × sqrt(distance) + 30) / flight_speed_multiplier
```

### Combat
```
damage_to_fleet = sum_of_attacker_ships(attack × weapons_mult × rapid_fire_vs_target × target_proportion)
loss_ratio = min(damage / sum_defenders(shield × shield_mult + hull × armour_mult), 1.0)
ships_remaining = floor(initial × (1 - loss_ratio))
```

### Loot & Débris
```
loot = 50% de chaque ressource défenseur, plafonné par cargo_capacity_survivants
debris_metal = sum_ships_lost(cost_metal × 0.30)
debris_crystal = sum_ships_lost(cost_crystal × 0.30)
```
