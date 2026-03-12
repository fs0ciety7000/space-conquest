# Changelog - Space Conquest

## [10.9.0] - 2026-03-12 - Responsive Mobile & Tech Tree

### 📱 Interface Mobile
- Tous les composants principaux passent en responsive mobile (375px → 1440px)
- Boutons orbitaux (vue Galaxie) agrandis à 44px — seuil WCAG touch target
- Panneau "Mes Planètes" adaptatif : pleine largeur sur mobile, 256px sur écrans larges
- Tables (Planètes Proches, ListView galaxie) avec défilement horizontal sur mobile
- Grille de stats vaisseaux (Chantier) : 2 colonnes sur mobile → 4 sur tablette+
- Panneau Défenses : padding et titres adaptatifs, icône décor réduite
- `overflow-x-hidden` global sur le layout principal — fin du scroll horizontal parasite

### 🔬 Tech Tree — Corrections backend
- **`laser_tech`** : désormais effectif dans le moteur de combat v5.0 (+5% attaque/niveau, était ignoré)
- **`ion_tech`** : bonus +3% attaque/niveau implémenté (était un fantôme sans effet)
- **`hyperspace_tech`** : multiplie la vitesse de vol de toutes les missions (attaque, recyclage, transport) par `1 + niveau × 15%`
- **`graviton_tech`** : perturbe les ressources affichées dans les rapports espions adverses (±5%/niveau de bruit aléatoire)
- **`plasma_tech`** : description corrigée (affichait "+5% ATK/SHD/HULL" — bonus inexistant)
- **`computer_tech`** : description corrigée (affichait "+1 slot de flotte" — système inexistant)

### 🌳 Tech Tree — Refactoring visuel
- **Arêtes corrigées** : fix race condition `useMemo→useEffect` qui empêchait l'affichage des connexions
- **Positions corrigées** : calcul via `containerRef` au lieu de `window.innerWidth` (sidebar exclue)
- Noeuds compactés : 280px → 220px, hauteur min 320px → 240px
- Espacement réduit : spacingX 350→270, spacingY 450→320 — canvas moins imposant
- Arêtes colorées : vert si tech source débloquée, gris sinon, avec flèche directionnelle
- **Vue liste mobile** : ReactFlow remplacé par une grille scrollable sur écrans < 768px
- Bouton retour fixe visible uniquement sur mobile

### 🔧 Corrections diverses
- Recyclage depuis une autre planète : fix "Erreur réseau" (mauvaise lecture de `planet.ships.recycler`)
- Création de champ de débris : notification immédiate à l'attaquant (toast + cloche) avec coordonnées et quantités

---

## [10.8.0] - 2026-03-12 - Panel Admin & Gouvernance

### 🛡️ Panel Admin — Fonctionnalités réelles
- **Gestion des rôles** : bouton par joueur pour promouvoir/rétrograder admin avec confirmation
- **Broadcast global** : formulaire titre/message/type envoyé à tous les joueurs (WS + notification cloche persistante)
- **Mode maintenance** : toggle activé/désactivé via `PATCH /admin/config`
- **Badge ADMIN** visible sur les profils (DB-driven, remplace l'ancienne détection par username)

### 🏛️ Sénat Galactique — Corrections
- Chargement des lois et sondages corrigé (mauvais endpoint + mauvais unwrap JSON)
- Dates dans les annonces en format lisible (ex: "17 mars 2026 à 23h00")
- Sondages Oui/Non : valeurs `"yes"/"non"` correctement transmises au backend
- Résultats de sondage : fix crash React (mauvaise shape de données)
- Doublon de réponse (409) : message clair "Vous avez déjà répondu" au lieu d'une erreur générique
- `user_answered` retourné par le backend : le formulaire reste masqué après rechargement de page

### 🗑️ Champs de débris — Alertes
- Après chaque combat générant des débris, l'attaquant reçoit une notification WS immédiate
- Toast `♻️ Champ de débris créé` avec coordonnées et quantités métal/cristal

---

## [10.7.0] - 2026-03-11 - Sénat Galactique : Lois, Sondages & Annonces

### 🏛️ Sénat Galactique (nouveau)
Nouvelle section accessible depuis la navigation principale.

#### Système de Lois
- L'admin propose des lois avec effets configurables (production, construction, recherche, vaisseaux, crédits Syndicat)
- Les joueurs votent POUR ou CONTRE pendant la période de vote
- Si majorité POUR → loi adoptée → effets appliqués automatiquement sur le serveur
- Lois temporaires (ex: "Production ×1.5 pendant 48h") ou permanentes
- Barre de vote live visible par tous pendant le scrutin
- Archive de toutes les lois passées avec résultats

#### Système de Sondages
- L'admin crée des sondages non-contraignants (Oui/Non, choix multiple, notation 1-5)
- Les joueurs répondent une seule fois (UNIQUE en DB)
- Résultats visibles après vote avec barres de progression et pourcentages
- Archive des sondages passés

#### Annonces automatiques
- Loi soumise au vote → annonce broadcast + notification cloche à tous les joueurs
- Loi adoptée/rejetée → annonce automatique avec résultats
- Sondage ouvert/fermé → annonce automatique
- Visibles dans l'AnnouncementBanner pour les joueurs hors-ligne

### 🛠️ Panel Admin — Gouvernance
- Créer une loi avec builder d'effets (sélection clé config, opérateur ×/+, valeur, durée)
- Forcer le passage / Annuler / Supprimer une loi
- Créer un sondage avec type et options
- Fermer / Archiver / Supprimer un sondage

### ⚙️ DB (migration `m20260314_000001`)
- 5 nouvelles tables : `law_proposal`, `law_vote`, `law_effect`, `survey`, `survey_response`
- UNIQUE constraints : un vote par joueur par loi, une réponse par joueur par sondage
- `ServerConfigCache` applique les `law_effect` actifs au-dessus de la config de base
- Tick gouvernance (60s) : résolution automatique des votes expirés + revert des lois temporaires

---

## [10.6.0] - 2026-03-11 - Rapports, Notifications & Alertes Militaires

### 📋 Notifications liées aux rapports
- Toutes les actions (combat, expédition, espionnage, pirates) génèrent une notification clochette persistante liée au rapport détaillé
- Attaque entrante → notification persistante pour le défenseur (en plus du WS temps-réel)
- Pirates marché noir → notification à la victime après déduction des ressources
- `report_id` dans les notifications → clic navigue directement vers le rapport concerné

### 🎯 Section Militaire — PlanetOverview
- Barres de progression corrigées : calcul réel `departure_time → arrival_time` (les formules hardcodées étaient erronées)
- Badges de type : ATTAQUE, ESPIONNAGE, EXPÉDITION, TRANSPORT, RECYCLAGE, COLONISATION avec couleurs distinctes

### 🪟 Modales de confirmation
- Tous les `window.confirm()` remplacés par `ConfirmModal` (Dialog shadcn)
- Variante `danger` (rouge) pour les actions destructives
- 13 callsites remplacés dans 8 composants

### ⚙️ DB (migration `m20260313_000001`)
- `notification.report_id` — lien FK vers `combat_log`
- `fleet_mission.departure_time` — timestamp de lancement

---

## [10.5.0] - 2026-03-11 - Rééquilibrage Temps de Construction & Recherche

### ⚙️ Temps de production des vaisseaux
- **Correction majeure** : les vaisseaux ont maintenant des durées visiblement différentes selon leur coût — plus de "5s pour tout le monde"
- Nouveau taux de base `BUILD_RATE = 3 600 res/h` (était 100 000), bonus chantier naval `0,10/niveau` (était 0,15)
- Exemples au chantier naval L20 : Chasseur Léger **13s**, Croiseur **1m 30s**, Vaisseau de Guerre **3m 20s**, Destructeur **6m 06s**, Étoile de la Mort **8h 20m**

### 🛡️ Temps de production des défenses
- Même correction appliquée aux défenses : `defense_build_rate 2 500 → 1 800`, `defense_shipyard_bonus 0,50 → 0,08`
- Les défenses bon marché restent rapides à déployer, les grosses installations (Tourelle Plasma, etc.) prennent quelques minutes

### 🔬 Temps de recherche technologique
- **Correction critique** : la formule exponentielle `base × multiplicateur^niveau` (sans diviseur de vitesse) pouvait donner des centaines de jours pour les hauts niveaux
- Remplacement par une formule polynomiale `level^1.5` avec le diviseur `research_speed` correctement appliqué
- Exemples (Labo L7) : Armement L10 **~26 min**, Armement L20 **~1h 13min**, Plasma L10 **~38 min**, Graviton L5 **~22 min**
- Annulation de recherche : le remboursement est maintenant calculé correctement (était ~0% à cause du même bug)

---

## [10.4.0] - 2026-03-11 - Intelligence : Sélection de cible sans UUID

### 🎯 Ciblage des missions d'espionnage/sabotage
- Suppression du champ UUID dans l'onglet Opérations — le joueur ne manipule plus jamais d'UUID
- **Depuis la Galaxie** : cliquer "Espionner" sur une planète pré-remplit automatiquement la cible dans la vue Intelligence
- **Accès direct** : nouveau picker en 2 étapes — rechercher un joueur par nom → sélectionner une de ses planètes (`[G:S:P]`)
- Le rapport de sabotage (Tab 2) reste affiché après une action, permettant d'enchaîner plusieurs sabotages sans re-espionner
- Nouveau bouton "Effacer le rapport" pour réinitialiser manuellement

### ⚙️ Backend
- Nouveau endpoint `GET /players/:user_id/planets` — retourne les planètes d'un joueur (nom + coordonnées uniquement)
- Endpoint `GET /players/search?q=` désormais correctement enregistré

---

## [10.3.0] - 2026-03-11 - Équilibrage Production & Temps de Construction

### ⚙️ Temps de production des vaisseaux
- Correction majeure : tous les vaisseaux (Étoile de la Mort, Bombardier, Grand Cargo, etc.) utilisent désormais leurs coûts réels depuis la DB pour calculer le temps de construction — plus de blocage à 5s
- Death Star (Chantier Lv12) : ~1.3 jour | Destroyer : ~24 min | Battleship : ~13 min
- Les taux de construction (`ship_build_rate`, `ship_build_rate_shipyard_bonus`, `defense_build_rate`, `defense_build_rate_shipyard_bonus`) sont maintenant configurables via le panel admin sans recompilation

### 🔵 Rééquilibrage Deutérium
- Production de base augmentée : coefficient `10` → `15` (+50%)
- Plasma Tech s'applique désormais aussi au Deutérium (comme Métal et Cristal)
- Consommation énergie réduite : coefficient `20` → `12` (plus pénalisant d'avoir une mine deutérium)
- Impact net : +57% de production deutérium à niveau égal, énergie -40% par niveau de mine

### 🛠️ Panel Admin
- Nouvelles clés configurables : `ship_build_rate`, `ship_build_rate_shipyard_bonus`, `defense_build_rate`, `defense_build_rate_shipyard_bonus`
- Valeurs par défaut deutérium mises à jour dans le panel

---

## [10.2.0] - 2026-03-11 - Refonte Intelligence & Espionnage

### 🕵️ Nouveau système Intelligence

Le système d'Espionnage / Sabotage / Casus Belli a été entièrement refondu avec une logique de progression cohérente et une nouvelle interface unifiée.

#### Vue Intelligence
Les 4 modales éparpillées (Espionnage, Sabotages déployés, Sabotages subis, Casus Belli) sont remplacées par une **vue complète à 4 onglets** accessible depuis la sidebar :
- **Opérations** — Lancer une mission d'espionnage avec sélection du nombre de sondes
- **Rapport Actif** — Rapport détaillé avec score de menace, recommandation tactique et boutons sabotage
- **Mes Opérations** — Sabotages déployés actifs et historique
- **Sécurité** — Sabotages subis + Casus Belli avec niveaux de tension

#### Espionnage — Mécanique de sondes
- Envoyer plus de sondes compense un désavantage technologique : `+⌊log₂(N)⌋` bonus de tech_diff
- Si le défenseur a 3+ niveaux d'avantage : sondes interceptées et détruites
- Score de menace calculé depuis la flotte + défenses révélées
- Recommandation tactique automatique (de "Attaque recommandée" à "Retraite conseillée")

#### Sabotage — Détection dynamique
- Probabilité de détection calculée selon le niveau tech : `P_base × (1 - tech_diff × 0.12)` entre 5% et 95%
- `disable_mine` : durée portée à 2h, choix de la mine ciblée (métal/cristal/deutérium)
- **5 nouveaux effets** :
  - `Bloquer Construction` — bloque la file de construction 1h (détection 20%)
  - `Vol de Crédits` — vole 10-30% des crédits Syndicat (instantané, détection 35%)
  - `Corruption Escadron` — détruit 5-15% d'une escadrille (instantané, détection 40%)
  - `Saboter Recherche` — ralentit la recherche active de 40% pendant 4h (détection 30%)
  - `Verrouillage Planétaire` — gèle toutes les mines 1h (détection 60%)

#### Casus Belli — Escalade diplomatique
- Système de tension par paire de joueurs sur 7 jours :
  - **Niveau 1 — Tension** : 1 usage, 48h
  - **Niveau 2 — Conflit** : 3 usages, 72h
  - **Niveau 3 — Guerre** : usages illimités, 7 jours
- Nouveau déclencheur : 5 espionnages en 24h → Casus Belli "Harcèlement"

---

## [10.1.0] - 2026-03-11 - Rééquilibrage temps de construction & Correctifs

### ⚖️ Rééquilibrage — Temps de construction

Les temps de construction étaient calculés à partir du coût des ressources, ce qui créait une progression exponentielle incontrôlable (ex : mine métal niveau 30 = des années). Les formules ont été refondues pour être basées sur le **niveau** de la construction, garantissant des temps raisonnables à tous les stades du jeu.

- **Bâtiments** : formule `L^1.4 × 30 min` — maximum ~21h à niveau 30, même sans chantier
- **Vaisseaux & Défenses** : taux de production ×5 plus élevé — 100 chasseurs légers ≈ 52 min à chantier niveau 8
- **Technologies** : formule `L^1.5 × 40 min` avec facteurs par catégorie (techs de fin de jeu comme Graviton ×2.5)
- Le niveau du Chantier Spatial et du Laboratoire de Recherche réduit toujours le temps (jusqu'à -60%)

### 🐛 Correctifs

- **Transport de ressources** : corrigé un bug où le transport était systématiquement refusé ("Pas de cargo disponible") même si la planète possédait des transporteurs. La validation envoyait le total de tous les vaisseaux sélectionnés au lieu du seul compte de transporteurs.
- **File de construction** : corrigé la barre de progression qui affichait des valeurs incorrectes (>100% ou négatives). Elle affiche désormais une animation "En cours" — le countdown reste le vrai indicateur.

---

## [10.0.0] - 2026-03-11 - Refonte UI Cyberpunk / Modern Sci-Fi

### 🎨 Nouveau Design System v2.0 — Cyberpunk / Modern Sci-Fi

Space Conquest passe à un design system unifié inspiré du cyberpunk et du sci-fi moderne. L'ensemble de l'interface a été refondu de A à Z avec une cohérence visuelle totale.

#### Palette de couleurs

- **Fonds ultra-sombres** : nouvelle gamme de fonds quasi-noirs (`#020008` → `#160b3a`) remplaçant les anciens gris ardoise. Chaque surface a sa profondeur propre — void, base, panel, elevated, surface.
- **Accents néon** : 8 couleurs néon codifiées par usage — **cyan électrique** (`#00f5ff`) pour les actions primaires, **magenta** pour les alertes critiques, **violet plasma** pour les technologies, **vert matrix** (`#00ff88`) pour les succès, **rouge danger** (`#ff003c`) pour les destructions, **orange combustion** (`#ff6600`) pour le métal.
- **Ressources** : couleurs immuables et sémantiques — métal `orange`, cristal `cyan`, deutérium `vert`, énergie `jaune`, crédits syndicat `violet`.

#### Effets visuels

- **Glassmorphism** : tous les panneaux utilisent `backdrop-blur` avec des fonds semi-transparents (`rgba`), donnant une profondeur de verre teinté.
- **Glow néon** : les éléments actifs, boutons primaires et valeurs importantes émettent un halo lumineux (box-shadow multicouche).
- **Coins biseautés** (clip-path) : signature visuelle cyberpunk — les boutons et cartes importants ont un coin coupé à 45° plutôt que des bords arrondis.
- **Scanlines** : texture CRT subtile sur les panneaux HUD pour l'ambiance rétro-futuriste.

#### Typographie

- **Valeurs de jeu** : police monospace (`JetBrains Mono` / `Fira Code`) avec `tabular-nums` sur tous les chiffres — ressources, scores, coordonnées, timers.
- **Labels de section** : `UPPERCASE` + `letter-spacing` large + taille réduite (11px) — style terminal.
- **Hiérarchie** : les titres de section ont un accent vertical coloré (barre de 3px dégradée) à leur gauche.

#### Composants UI refondus

- **Boutons** : 11 variantes cyberpunk (`default`, `secondary`, `destructive`, `success`, `cyber`, `hologram`, `neon`, `warning`, `ghost`, `outline`, `link`). Chaque bouton a un état hover avec glow + `translateY(-2px)` + changement de bordure simultanés. Framer Motion `whileHover/whileTap` intégré.
- **Cartes** : nouveau composant `<CyberCard>` avec bevel clip-path et 5 accents couleur. Hover : élévation + glow subtil.
- **Badges** : flat, uppercase, `rounded-[2px]`, bordure fine colorée. Prop `dot` pour indicateur pulsant.
- **Inputs** : fond très sombre, bordure cyan subtile, focus ring + glow cyan.
- **Progress bars** : 7 variantes sémantiques (metal/crystal/deuterium/energy/success/danger/default) avec gradient néon et box-shadow lumineux.
- **Dialogs/Modales** : backdrop noir blur intense, bevel clip-path, ligne de scan animée en header, corner brackets décoratifs.

#### Nouveaux composants

- **`<DataCard>`** : carte de donnée HUD avec accent couleur, bevel, indicateur de tendance (▲/▼), valeur mono.
- **`<StatusBadge>`** : badge d'état `online/offline/warning/danger/idle` avec dot pulsant.
- **`<SectionHeader>`** : header de section standardisé avec barre accent verticale et slot action.

#### Animations (Framer Motion)

- **Entrées** : tous les composants principaux ont une animation d'apparition (`opacity 0→1` + `y 10→0`, 300ms).
- **Listes** : stagger `staggerChildren: 0.04–0.05s` sur les grilles de vaisseaux, défenses, bâtiments, listings.
- **Tech tree** : animation spring sur chaque nœud technologique.
- **Messages** : `AnimatePresence` sur les bulles de conversation.

### 🔄 Composants migrés (41 fichiers)

**Vague 1 — Chrome permanent**
`Sidebar`, `EmpireBar`, `PlanetOverview`

**Vague 2 — Gameplay core**
`Shipyard`, `Defenses`, `Facilities`, `BuildQueue`, `BuildQueueManager`, `FleetDispatcher`, `AttackModal`, `SpyModal`, `ColonizeModal`, `GalaxyView`, `TechTree`, `TechTreeVisual`, `Dashboard`

**Vague 3 — Secondaire**
`ReportsTerminal`, `Leaderboard`, `StatsPage`, `EconomyLog`, `ProductionStats`, `Marketplace`, `BuyView`, `SellView`, `ListingCard`, `NpcTradeCard`, `CreateListingModal`, `TransactionHistory`, `TradeRoutesView`, `UndergroundMarket`, `Achievements`, `MissionsView`, `Officers`, `CombatSimulator`, `BountyBoard`, `Settings`, `MessagesView`, `NotificationCenter`, `FriendsView`, `Alliances`, `AllianceView`

### 🟣 Marché Underground — thème violet

Le marché underground adopte un thème **violet plasma** exclusif (`#bf00ff`) pour le distinguer visuellement du reste du jeu. L'écran de verrouillage (accès refusé) utilise un glassmorphism violet sombre évocateur d'une zone interdite.

### 💬 Messages & Social — bulles cyber

Les bulles de conversation utilisent désormais le style cyberpunk : messages propres en `bg-cyan-500/15` avec bordure cyan, messages reçus en glassmorphism sombre. Les notifications ont des accents couleur par type (rouge combat, vert construction, ambre marché).

---

## [9.1.0] - 2026-03-11 - Refactoring vitesses & Rééquilibrage du jeu

### ⚙️ Backend — Refactoring SPEED_FACTOR (breaking change interne)

- **Suppression de `SPEED_FACTOR`** : la constante monolithique `SPEED_FACTOR = 500` est supprimée. Elle est remplacée par 4 multiplicateurs granulaires configurables depuis l'administration :
  - `production_speed_multiplier` (250) — vitesse de production des mines
  - `building_speed_multiplier` (50) — vitesse de construction des bâtiments
  - `research_speed_multiplier` (25) — vitesse de recherche technologique
  - `ship_build_speed_multiplier` (100) — vitesse de production des vaisseaux

### 🚀 Temps de production des vaisseaux (nouvelle formule)

- **Formule basée sur le coût** : le temps de production d'un vaisseau est maintenant proportionnel à son coût total (métal + cristal). Un Destructeur prend bien plus longtemps à produire qu'un Chasseur Léger.
- **Formule** : `coût_total / (2500 × niveau_chantier × 0.5) × 3600 / ship_build_speed`
- **Niveau du chantier spatial** : chaque niveau de chantier accélère la production de 50%.

### 💰 Coûts des unités

- **Suppression du diviseur de coût** : les coûts de vaisseaux et défenses n'étaient pas divisés par le bon facteur. Les coûts sont maintenant ceux définis dans la base de données sans modification artificielle.

### 🎯 Combat & Butin

- **Butin sans plafond arbitraire** : le plafond sur le butin par ressource (`combat_loot_cap_per_resource`) est supprimé. La seule limite est la capacité cargo des vaisseaux attaquants survivants.

---

## [8.8.0] - 2026-03-10 - Statistiques unifiées & Corrections slots

### 🎯 Interface

- **Statistiques unifiées** : les pages "Tableau de Bord" et "Statistiques" sont fusionnées en une seule page **Statistiques** avec deux onglets — *Production* (stats détaillées par planète) et *Analytique* (vue globale de l'empire avec graphique de production hebdomadaire).
- **Slots de production bonus** : les 4 slots bonus (5-8) s'affichent désormais toujours, même sans données en base — cartes "Non disponible" pour les nouvelles planètes.

### 🔧 Corrections

- **Slots bonus invisibles** : les routes API `/planets/:id/resource-slots` n'étaient pas enregistrées dans le routeur backend — les 3 endpoints (GET, PATCH, POST toggle) sont maintenant actifs.
- **Migration de backfill** : les planètes créées avant la mise en place des slots reçoivent automatiquement leurs 4 lignes de slots bonus (5-8) en base via une migration dédiée.
- **Statistiques de production erronées** : la page statistiques affichait une production calculée côté client (~1,1M/h) au lieu d'utiliser les valeurs réelles du serveur (~7M/h). Corrigé — les valeurs métal, cristal et deutérium proviennent désormais directement du backend.
- **Recycleurs** : ajout d'une notification WebSocket lorsque les recycleurs rentrent à la base (avec ou sans débris). Le jeu se rafraîchit automatiquement toutes les 60 secondes pour résoudre les missions arrivées même sans action du joueur.

---

## [8.7.4] - 2026-03-10 - Corrections de bugs

### 🔧 Corrections

- **Boucle à la connexion** : après login, la page n'affichait rien et nécessitait un rafraîchissement manuel. Corrigé — le contexte de planète se synchronise maintenant correctement après authentification.
- **Temps de recherche erratique** : lancer une amélioration du Laboratoire affichait un temps correct puis sautait à plusieurs jours. Corrigé — la formule de durée utilise désormais le niveau de laboratoire (et non le chantier spatial) pour les recherches.
- **Ressources insuffisantes (faux positif)** : améliorer une mine ou une technologie retournait une erreur "ressources manquantes" malgré des ressources suffisantes. Corrigé — le serveur recalcule maintenant les ressources produites depuis la dernière mise à jour avant de vérifier le coût.
- **Slots de production disparus** : la section "Slots de Production Bonus" n'apparaissait plus sur la page des mines. Corrigé — la section est désormais toujours visible. Les slots sont et restaient actifs côté serveur.

---

## [8.7.3] - 2026-03-09 - Formule de score & pastilles de notifications

### 🎯 Interface

- **Formule de score visible** : la page Classement affiche désormais un panneau dépliable **"Formule de calcul des points"** détaillant chaque composante (bâtiments, technos, défenses, combat) avec les coefficients exacts.
- **Pastilles de notifications corrigées** : les badges sur la cloche (notifications) et l'enveloppe (messages) dans l'EmpireBar affichent correctement l'animation `pulse` + le compteur. Affichage `9+` au-delà de 9 éléments non lus.

---

## [8.7.2] - 2026-03-09 - Refonte du Classement

### 🏆 Nouveau Système de Score

- **Stabilité du classement** : les vaisseaux sont retirés du calcul de score de classement. Les flottes en mission ne font plus chuter votre rang !
- **Défenses toujours comptées** : les défenses planétaires restent incluses dans le score militaire — construire des défenses fait monter votre rang.
- **Bonus de combat** : chaque **victoire** en combat PvP rapporte **+100 points de classement**. Chaque **défaite** coûte **−25 points** (plancher à 0). Le ratio V/D est ainsi récompensé sur toute la durée de vie du compte.
- **Transparence** : la fiche profil d'un joueur affiche désormais une section **Historique de Combat** avec victoires, défaites et score de combat all-time (visible dès espionnage niveau 7).
- **Flotte visible mais hors classement** : le nombre de vaisseaux reste affiché sur le profil comme "Puissance de flotte" — il n'influence plus le rang.

### 📊 Détail des composantes du score

| Composante | Incluse classement |
|---|---|
| Bâtiments (niveau²) | ✅ |
| Technologies (niveau²) | ✅ |
| Défenses planétaires | ✅ |
| Victoires PvP (×100 pts) | ✅ |
| Vaisseaux courants | ❌ (affiché "Flotte" sur profil) |

---

## [8.7.1] - 2026-03-09 - Alliances unifiées

### 🔧 Interface
- **Alliances fusionnées** : les tabs "Mon Alliance" et "Réseau Alliances" ne font plus doublon — un seul tab **Alliances** regroupe la recherche de guildes, la gestion de la vôtre, les candidatures et invitations.

---

## [8.7.0] - 2026-03-09 - ZAC & Journal de Combat Détaillé

### ⚔️ Zone Aérienne de Combat (ZAC)

- **Nouvelle installation** : la ZAC vous permet de pré-assigner des vaisseaux à la défense de chaque planète. Accessible directement depuis la vue Planète (colonne droite).
- **Défense ciblée** : uniquement les vaisseaux assignés à la ZAC (+ toutes vos défenses planétaires) participent au combat en cas d'attaque. Si la ZAC est vide, seules les défenses planétaires combattent — les vaisseaux restent au hangar.
- **Interface intuitive** : slider par type de vaisseau avec barre de progression, boutons "Tout assigner" / "Tout retirer", badge **ACTIVE** visible en un coup d'œil.
- **Validation serveur** : impossible d'assigner plus de vaisseaux que vous n'en possédez — les quantités ZAC sont plafonnées aux vaisseaux réellement présents au moment de l'attaque.

### 📋 Journal de Combat Par Unité

- **Rapport détaillé round par round** : chaque round du rapport de combat affiche désormais le détail des pertes par type d'unité (vaisseaux et défenses).
- **Événements narratifs** : `⚔️ Attaquant: 5 Croiseurs détruits`, `🛡️ Défenseur: 3 Tourelles Plasma neutralisées` — chaque élimination est retranscrite.
- **Affichage enrichi** : dégâts échangés, pertes totales attaquant/défenseur, et liste complète des événements par camp (rouge = attaquant, bleu = défenseur).

### 🛡️ Vaisseau Amiral — Bonus Actifs

- Les statistiques du Vaisseau Amiral (attaque, bouclier, blindage des modules équipés) sont désormais appliquées comme **multiplicateurs de combat** sur toutes vos planètes.
- Les deux camps (attaquant et défenseur) bénéficient du bonus de leur propre vaisseau amiral.

---

## [8.6.0] - 2026-03-08 - Événements Serveur PVE

### ⚔️ Nouvelles Fonctionnalités

- **Événements collectifs** : des phénomènes cosmiques frappent la galaxie ! Invasions pirates ☠️, nuages radioactifs ☢️, pluies de météorites ☄️, tempêtes solaires 🌩️ et artefacts anciens 🏺.
- **Participation collective** : tous les joueurs de la zone contribuent ensemble pour neutraliser l'événement et réduire ses PV collectifs.
- **Récompenses proportionnelles** : les meilleurs contributeurs reçoivent des récompenses dans leur messagerie, proportionnelles à leur contribution.
- **Effets en zone** : les événements actifs affectent la production de ressources et peuvent bloquer l'espionnage dans la zone concernée.
- **Bandeau d'alerte** : une barre fixe en haut de l'écran annonce les événements entrants et actifs avec leur barre de PV en temps réel.
- **Vue galaxie** : des overlays visuels distinctifs par type d'événement (teinte rouge invasion, brume verte radioactive, éclairs jaunes tempête solaire...) s'affichent sur la carte du système.
- **Messages système** : les récompenses et annonces importantes arrivent directement dans la messagerie, distinguées visuellement des messages joueurs.

---

## [8.5.0] - 2026-03-08 - Performance & Pagination

### ⚡ Optimisations

- **Classement SQL** : le classement utilise désormais une pagination SQL directe au lieu de charger tous les joueurs en mémoire. Les scores sont recalculés toutes les 5 minutes en arrière-plan.
- **Rapports paginés** : les rapports de combat et de transport supportent maintenant `?page&limit`. Chargement à la demande, plus léger.
- **Marché paginé** : les annonces du marché retournent maintenant `total` pour un vrai "afficher plus" côté frontend.

---

## [8.4.0] - 2026-03-08 - Alertes Temps Réel : Marché, Planète, Attaque, Espionnage, Sabotage

### ✨ Nouvelles Fonctionnalités

- **Alerte Vente Marché** : le vendeur reçoit désormais une notification en temps réel (toast + notification persistante) lorsque son annonce de ressources est achetée par un autre joueur.
- **Alerte Planète Vendue** : notification instantanée lors de la vente d'une planète (à un joueur ou au PNJ).
- **Alerte Attaque Imminente améliorée** : flash rouge sur l'écran + toast durée infinie lors d'une attaque entrante (coordonnées, nombre de vaisseaux, heure d'arrivée).
- **Alerte Espionnage améliorée** : toast contextualisé indiquant l'origine de la sonde détectée.
- **Alerte Sabotage améliorée** : distinction entre sabotage identifié (attaquant nommé) et sabotage silencieux ("Agents inconnus"), avec détail de la cible (mine ou recherche).

### 🔧 Architecture

- Le hook `useGameNotifications` devient la source unique des toasts "alertes critiques" — plus de duplication entre `useWebSocket` et le hook.
- Nouveaux types WS backend : `market_sale` et `planet_sold` avec payloads complets.

---

## [8.3.0] - 2026-03-08 - Succès & Hall of Fame

### ✨ Nouvelles Fonctionnalités

- **Hall of Fame** : vue Succès entièrement branchée sur le backend (`GET /achievements?user_id=X`).
  - Icônes et couleurs issues de la base de données.
  - Barre de progression réelle, rareté traduite (Commun → Légendaire), date de déverrouillage.
  - Les succès non débloqués sont en niveaux de gris et révèlent leur contenu au survol.

---

## [8.2.0] - 2026-03-08 - Réseau d'Alliances

### ✨ Nouvelles Fonctionnalités

- **Réseau d'Alliances** : vue alliances branchée sur le backend (`GET /alliances?search=&per_page=30`).
  - Recherche en temps réel avec debounce 300 ms.
  - Affiche : chef d'alliance, membres, score global, politique de recrutement.
  - Bouton "Rejoindre" ou "Voir" selon la politique (ouverte / sur invitation).

---

## [8.1.0] - 2026-03-08 - Tableau de Bord Analytique

### ✨ Nouvelles Fonctionnalités

- **Tableau de Bord** : vue analytique entièrement branchée sur le backend (`GET /analytics?user_id=X`).
  - Graphique de production journalière (métal, cristal, deutérium) sur 7 jours (capacité actuelle × 24h).
  - Cartes de stats : Score Total, Efficacité Énergétique (ratio solaire moyen), Score Militaire, Victoires sur 7 jours.

---

## [8.0.0] - 2026-03-08 - Centre de Notifications

### ✨ Nouvelles Fonctionnalités

- **Centre de Notifications** : cloche dans la barre d'empire affichant les dernières notifications du jeu (combats, constructions, marché, expéditions).
  - Les notifications non lues sont mises en évidence avec un badge rouge.
  - Bouton "Tout marquer lu" (appel API + mise à jour locale instantanée).
  - Les nouvelles notifications arrivent en temps réel via WebSocket sans rechargement.
- **Persistance** : les notifications sont stockées en base de données et survivent aux reconnexions.

---

## [7.4.0] - 2026-03-07 - Routes Commerciales & Marché Underground : Corrections & Améliorations

### ✨ Nouvelles Fonctionnalités

- **Édition des routes commerciales** : chaque route dispose désormais d'un bouton crayon permettant de modifier directement — nom, nombre de Grands Cargos, ratios de ressources et fréquence d'exécution — sans avoir à supprimer et recréer la route.
- **PlanetOverview — Réseau Électrique en haut à droite** : le widget "Réseau Électrique" occupe désormais le haut de la colonne droite, au-dessus des routes commerciales actives.
- **PlanetOverview — Routes commerciales compactes** : le widget des routes commerciales est maintenant défilable (hauteur max 480 px) et s'affiche en format réduit.
- **Marché Underground — articles non implémentés** : les objets *Brouilleur de Coordonnées*, *Virus Économique* et *Module Furtif* sont désormais affichés dans le catalogue mais leur bouton d'achat est remplacé par un badge **"Bientôt"** — ils seront activés dans une prochaine mise à jour.
- **SC dans les expéditions — affichage** : les Crédits du Syndicat gagnés lors d'une expédition apparaissent maintenant dans le rapport de résultat et dans la notification toast (`+X SC`).

### 🔧 Corrections

- **Routes commerciales — POST 500** : la création d'une route renvoyait un corps JSON vide (erreur 500). Cause : SeaORM ne pouvait pas décoder les colonnes UUID PostgreSQL via `try_get::<String>`. La réponse de création est maintenant construite directement depuis les variables en mémoire — plus aucun aller-retour en base après l'INSERT.
- **Marché Underground — Espionnage 0/13** : le niveau de Technologie d'Espionnage affiché dans les prérequis d'accès était toujours 0 malgré un niveau réel élevé. Cause : deux clés coexistaient en base (`"espionage"` legacy et `"espionage_tech"` actif) ; la fonction de lecture ne lisait que l'ancienne. Les deux clés sont maintenant acceptées.
- **Fréquence des SC en expédition** : la probabilité de récompense en Crédits du Syndicat passe de **10 %** à **35 %** (config serveur `expedition_syndicate_credit_chance`).

---

## [7.2.0] - 2026-03-07 - Journal Économique

### ✨ Nouvelles Fonctionnalités

- **Journal Économique** : nouvel onglet "Économie" dans les Rapports, retraçant l'intégralité des mouvements de ressources et de monnaie :
  - **Constructions** : chaque mise en file (bâtiment, installation, technologie, vaisseau, défense) est loguée avec le coût en métal/cristal/deutérium, le nom de la planète et le type de construction.
  - **Marché de ressources** : historique des achats et ventes avec le partenaire commercial, les ressources échangées et le prix unitaire.
  - **Marché planétaire** : transactions de vente/achat de planètes.
  - **Marché Underground** : chaque dépense en Crédits du Syndicat est tracée avec le détail de l'objet acheté.
- **Filtres** : affichage par catégorie — Tout / Constructions / Marché / Underground.
- Les montants sont affichés avec signe +/− et code couleur (orange=métal, cyan=cristal, bleu=deutérium, jaune=SC). Les entrées sont triées par date décroissante (timestamp relatif en FR).

---

## [7.1.0] - 2026-03-07 - Marché Underground & Crédits du Syndicat

### ✨ Nouvelles Fonctionnalités

- **Crédits du Syndicat (SC)** : nouvelle monnaie secrète gagnée aléatoirement lors des expéditions (10% de chance, configurable dans le panel admin). Affichée dans la barre d'empire.
- **Marché Underground** : accessible aux joueurs ayant Technologie d'Espionnage ≥ 13 et Informatique ≥ 10. Marché secret avec objets spéciaux achetables en SC. Les prix fluctuent toutes les 6 heures (±30% à +50% du prix de base).
- **Inventaire** : vos objets achetés sont accessibles depuis le marché underground. Utilisez-les directement depuis l'interface.
- **Frappe Orbitale Anonyme** : objet spécial qui envoie une flotte de pirates PNJ vers n'importe quelle planète ennemie en 12h. L'identité de l'instigateur reste secrète.
- **Modal d'Extorsion Pirates** : lorsqu'une flotte pirate approche, un écran d'alerte s'affiche avec 3 choix :
  - *Laisser faire* — les pirates pillent ~20% des ressources (gratuit)
  - *Payer un tribut* — les pirates repartent et l'identité de l'instigateur est révélée (50 SC)
  - *Contre-attaque* — les pirates font demi-tour et attaquent la planète mère de l'instigateur (120 SC)
- **Panel Admin — Marché Underground** : nouvel onglet permettant de créer, modifier et supprimer les objets du marché (nom, description, type d'effet, paramètres JSON, prix de base, statut actif/inactif).
- **Config serveur** : 3 nouvelles clés configurables dans le panel admin : `expedition_syndicate_credit_chance` (défaut 0.10), `expedition_syndicate_credit_min` (défaut 1.0), `expedition_syndicate_credit_max` (défaut 2.0).

---

## [7.0.0] - 2026-03-07 - File de Construction : Séquentialité des Niveaux

### 🔧 Corrections

- **Niveaux d'un même bâtiment désormais séquentiels** : si vous planifiez Usine Nanite niv. 4, 5, 6 et 7 avec plusieurs slots libres, chaque niveau attend maintenant que le précédent soit terminé avant de démarrer — plus de "Niv. 4 / 4h13m — Niv. 5 / 4h13m" simultanés. Les slots supplémentaires (Nanite Factory, Chantier…) permettent toujours de construire plusieurs **bâtiments différents** en parallèle.

---

## [6.9.0] - 2026-03-07 - Marché : Corrections Majeures

### 🔧 Corrections

- **Suppression d'offre** (`/market/listings`) : les offres de ressources peuvent désormais être supprimées sans erreur 403 — l'identifiant utilisateur est transmis explicitement.
- **Achat d'offre joueur** : la route `/market/listings/:id/buy` est maintenant correctement câblée côté backend (404 corrigé).
- **Marché Planétaire — détails** : le champ `id` des annonces de planètes était sérialisé en `null` (UUID → String impossible) — toutes les annonces planétaires ont maintenant des identifiants valides. Corrige "Impossible de charger les détails", l'URL `/listings/null` et les erreurs de suppression d'annonce.
- **Planètes en vente visibles dans les colonies** : les planètes actuellement mises en vente sur le marché planétaire n'apparaissent plus dans la liste des colonies (bug de conversion UUID identique).
- **Erreur JSON vide** : une réponse d'erreur sans corps ne génère plus de crash `SyntaxError: JSON.parse`.

---

## [6.8.0] - 2026-03-07 - File de Construction : Intégrité & Corrections

### 🔧 Corrections

- **Stockage de Ressources** (`resource_storage`) correctement catégorisé en **Installations** (et non Ressources), côté backend et frontend.
- **Centrale à Fusion** (`fusion_plant`) correctement catégorisée en **Ressources** dans toute la chaîne (BuildQueueManager, Facilities, ResourceDisplay).
- **File d'attente — slot protection** : correction d'une race condition côté serveur — deux requêtes simultanées ne peuvent plus contourner la limite de slot en arrivant simultanément (mutex par planète ajouté dans le backend).
- **Drag & drop** : protection contre la réorganisation invalide — impossible de placer un niveau supérieur avant un niveau inférieur pour le même bâtiment/technologie.

---

## [6.7.0] - 2026-03-07 - Chaîne de Production Améliorée & Catégorisation

### ✨ Nouveautés

#### 🏭 Chaîne de Production — Couleurs par catégorie
- Chaque construction dans la file affiche désormais la **couleur de sa catégorie** :
  - 🟣 **Violet** — Installations (chantier, hangar, stockage, etc.)
  - 🟠 **Orange** — Ressources (mines, centrales)
  - 🔵 **Cyan** — Vaisseaux
  - 🔴 **Rouge** — Défenses
  - 🟣 **Indigo/Violet** — Recherche

#### 📜 Scroll dans la Chaîne de Production
- Le module "Chaîne de Production" est maintenant **défilable** (hauteur max 420px) — il ne grandit plus indéfiniment quand la file est longue.

### 🔧 Corrections

- **Chaîne de Production** : les recherches (ex. Tech. Industrielle) apparaissent maintenant correctement dans la catégorie **Recherche** et non dans Installations.
- **File de Construction** : le "Hangar à Ressources" (`resource_storage`) apparaît désormais dans la catégorie **Installations** (et non Ressources).
- **Labels complets** : tous les vaisseaux (`heavy_hunter`, `bomber`, `grand_cargo`, `deathstar`), technologies (`ion_tech`, `combustion_drive`, `impulse_drive`, `hyperspace_drive`, `industrial_tech`, `graviton_tech`), défenses (`anti_missile`, `interplanetary_missile`, `small_shield`, `large_shield`) et bâtiments (`nanite_factory`, `logistics_hub`, `terraformer`, etc.) ont désormais un nom lisible dans la file de construction.
- **Centrale à Fusion** (`fusion_plant`) correctement catégorisée en Ressources.

---

## [6.6.0] - 2026-03-07 - File de Construction Universelle

### ✨ Nouveautés

#### 🏗️ File d'attente pour toutes les constructions
- Les boutons de construction/amélioration ne sont **plus jamais bloqués** par une file pleine.
- Si tous les slots actifs sont occupés, l'action est automatiquement **mise en attente** dans la file de construction.
- Fonctionne pour : mines, installations, recherches, vaisseaux et défenses.
- La file d'attente démarre automatiquement dès qu'un slot se libère.

### 🔧 Corrections

- **File de Construction** : les recherches actives (slots 2/2, etc.) s'affichent désormais correctement dans la section "Constructions actives" (bug lié à un `end_time` null).

---

## [6.5.0] - 2026-03-07 - Routes en Transit, Annulation Recherche & Correctifs Marché

### ✨ Nouveautés

#### 🚚 Flottes de Routes Commerciales en transit
- Les routes commerciales affichent désormais l'état de la **flotte en transit** en temps réel.
- **Temps de trajet calculé** selon la distance réelle entre les planètes (même formule que les missions de flotte), avec bonus de vitesse selon le niveau de **Technologie Hyperespace** (+10% par niveau).
- Dans **Routes Commerciales** : barre de progression animée (ambre = aller, cyan = retour) avec ETA à la seconde près.
- Dans **Vue Planète** : widget compact "Routes Commerciales" affichant les routes actives depuis cette planète, avec barre de transit et compteur jusqu'à la prochaine collecte.
- **Rapport Logistique** automatique dans la messagerie après chaque exécution de route (ressources transférées, éventuels dégâts de piraterie).

#### 🔬 Annulation de Recherche
- Il est désormais possible d'**annuler une recherche en cours** depuis la Chaîne de Production.
- **Remboursement au prorata** du temps restant (jusqu'à 95% si annulé immédiatement).
- Le bouton d'annulation est visible pour tous les types de construction : bâtiments, recherches, vaisseaux et défenses.

#### 📬 Notifications Marché Planétaire
- Lors d'un achat inter-joueur : **message automatique** à l'acheteur et au vendeur avec les détails de la transaction (planète, prix, ressources reçues).
- Lors d'une vente au PNJ : **message de confirmation** au vendeur avec les ressources obtenues.

### 🔧 Corrections

- **Marché Planétaire** : correction de l'erreur "Not your planet" / "Not your listing" sur toutes les opérations (bug lié à la lecture UUID depuis PostgreSQL).
- **Routes Commerciales** : correction du bug "Not your route" lors de la suppression.
- **SQL Jointures** : correction des jointures `planet_ships` et `planet_defenses` dans le calcul de prix suggéré et la fiche détaillée (colonnes `ship_type_id`/`defense_type_id` au lieu de colonnes inexistantes).

---

## [6.4.0] - 2026-03-07 - Marché Planétaire & Correctifs

### ✨ Nouveautés

#### 🌍 Marché Planétaire
- Nouvelle section **Planètes** dans le Marché Galactique.
- Vendez n'importe quelle colonie (sauf planète mère) au **marché PNJ** (40% de la valeur estimée) ou entre **joueurs** (prix libre, 70% suggéré).
- La **valeur estimée** tient compte des bâtiments, technologies, vaisseaux, défenses et ressources stockées.
- La planète est **masquée de vos vues** dès la mise en vente, et réapparaît si vous retirez l'annonce.
- Les acheteurs voient une **fiche détaillée** : bâtiments, techs, vaisseaux et défenses listés avant achat.
- **Transfert complet** à l'achat : ressources, bâtiments, technologies, vaisseaux et défenses passent au nouveau propriétaire.
- Vente au PNJ : la planète est **supprimée** et le slot galactique libéré. Irréversible.
- Modification du prix de vente possible à tout moment avant achat.

### 🔧 Corrections

- **Chaîne de Production** (PlanetOverview) : les items **en file d'attente** (build-queue) sont désormais visibles directement dans la section.
- **Compteur de slots** : affiche maintenant les slots réels par catégorie (somme des catégories actives) au lieu d'une limite fixe de 3.
- **Routes Commerciales** : bouton "Nouvelle Route" désactivé (avec tooltip) si les prérequis du Hub Logistique ne sont pas remplis.

---

## [6.3.0] - 2026-03-07 - Routes Commerciales, File de Construction & Grands Cargos

### ✨ Nouveautés

#### 🚚 Routes Commerciales automatisées
- Nouveau bâtiment : **Hub Logistique** (prérequis : Hangar 20 + Stockage Ressources 15 + Tech Industrielle 3).
- Nouvelle technologie : **Technologie Industrielle** (prérequis : Tech Informatique 4, Blindage 5, Hyperespace 1).
- Nouveau vaisseau : **Grand Cargo** — 1 000 000 unités de capacité par unité, dédié aux routes auto (prérequis : Chantier 10 + Tech Industrielle 2 + Propulsion Hyperespace 3).
- Créez des **routes commerciales** depuis l'onglet **ÉCONOMIE → Routes Commerciales** :
  - Planète source → destination, nombre de Grands Cargos, ratios par ressource (0–100%).
  - **Fréquence au choix** : toutes les N heures (1h, 2h, 4h… 72h) ou **chaque jour à heure fixe UTC**.
  - Historique des transferts par route (ressources transférées, statut, piraterie).
- Jusqu'à **12 routes actives** selon le niveau du Hub Logistique (niv. 1 → 2, niv. 3 → 6, niv. 5 → 12).
- Risque de **piraterie** : une flotte ennemie en mission piraterie dans le système cible peut intercepter les cargos (chance configurable par l'admin).
- Stats du Grand Cargo configurables depuis le panneau admin (capacité, attaque, bouclier, coque, vitesse).

#### 🗂️ File de Construction par catégorie
- Nouveau système de **file d'attente de construction** accessible via **ÉCONOMIE → File de Construction** :
  - 5 catégories indépendantes : **Recherche, Vaisseaux, Défenses, Ressources, Installations**.
  - Chaque catégorie possède ses propres **slots** (base configurable + bonus tech/bâtiment).
  - **Slots évolutifs** : Labo Recherche débloque des slots recherche (+1 tous les 10 niveaux), Chantier Spatial des slots vaisseaux (+1 tous les 5 niveaux), Usine Nanite des slots installations (+1/niveau).
  - Les items s'ajoutent automatiquement en file si tous les slots sont occupés.
  - **Réorganisation par glisser-déposer** pour prioriser vos constructions.
  - **Annulation** d'un item en attente avec remboursement des ressources.
  - Démarrage automatique des items suivants dès qu'un slot se libère (intégré au tick).

---

## [6.2.0] - 2026-03-06 - Nom d'affichage, Cargo amélioré, Corrections sabotage & Persistance avatars

### ✨ Nouveautés

#### 🏷️ Nom d'affichage personnalisé
- Les joueurs peuvent définir un **nom d'affichage** distinct de leur identifiant de connexion.
- Modifiable depuis son propre profil (bouton ✏️ Modifier sous le nom).
- Affiché dans le classement et les profils — l'identifiant `@username` reste visible en sous-titre si différent.

#### 📦 Cargo Transporteur — Bonus Tech Informatique
- La capacité de cargo des transporteurs dépend désormais aussi du **niveau de Tech Informatique** (+10% par niveau, configurable).
- Formule : `base × (1 + hangar×5%) × (1 + computer_tech×10%)`
- Extensible : d'autres bonus pourront être ajoutés via les clefs de config admin.

#### 🖼️ Persistance des Avatars
- Les avatars uploadés sont maintenant stockés dans un volume Docker persistant (`/opt/space-conquest/uploads`).
- Plus de perte d'avatar lors des redéploiements Coolify.

### 🐛 Corrections

#### 💀 Sabotages
- **Cooldown markers** ne sont plus visibles dans "Mes Sabotages" ni dans "Sabotages Subis" — seuls les vrais sabotages s'affichent.
- **Notification WebSocket sabotage subi** : envoyée à toutes les planètes de la victime (pas uniquement la planète ciblée).
- **Sabotage silencieux réussi** : une alerte discrète est envoyée à la victime (sans révéler l'attaquant).

#### 🏰 Hangar / Capacité de flotte
- La capacité max du hangar est désormais calculée par le serveur (valeur config `hangar_capacity_base` + `hangar_capacity_per_level`) et incluse dans la réponse planet.
- Tous les composants (Vue planète, Chantier, Mes Planètes) utilisent maintenant cette valeur serveur au lieu d'une formule hardcodée.

#### ⚔️ Attaques — Restriction de points supprimée
- La protection basée sur le ratio de points (min/max) est retirée.
- Seuls restent : protection anti-débutant (bouclier 3j), zone débutante, et anti-flood (cooldown 2h configurable).

---

## [6.1.0] - 2026-03-06 - Présence en ligne, XP Vaisseau Amiral & Anti-flood

### ✨ Nouveautés

#### 🟢 Joueurs en ligne
- **Pastille verte pulsante** sur l'avatar de chaque joueur connecté dans le classement.
- Badge **"En ligne"** visible sur les profils joueurs.
- **Compteur de joueurs connectés** affiché dans la barre d'empire (rafraîchi toutes les 30s).

#### ⭐ XP Vaisseau Amiral
- Le Vaisseau Amiral gagne désormais de l'expérience au fil des batailles.
- **Combat PvP** : +20 XP en cas de victoire, +5 XP en cas de défaite.
- **Expédition** : +10 XP en cas de succès ou secteur calme, +5 XP en cas de défaite.
- **Level-up automatique** : plusieurs niveaux peuvent être franchis d'un coup si l'XP est suffisante.

#### 🛡️ Anti-flood Attaques & Sabotages
- Délai minimum entre deux attaques sur le même joueur (défaut : 2h), configurable depuis le panel admin.
- Délai minimum entre deux sabotages sur la même planète (défaut : 2h), configurable depuis le panel admin.
- **Exceptions** : délai levé si la cible vous contre-attaque, ou si victoire décisive (0 perte).
- La vérification d'avantage technologique pour le sabotage est supprimée — seul le cooldown s'applique.

### ⚙️ Panel Admin
- Nouveau groupe **"Cooldowns & Anti-flood"** : `attack_cooldown_hours` et `sabotage_cooldown_hours`.

---

## [6.0.0] - 2026-03-06 - Biomes, Tableau des Primes, Vaisseau Amiral & Réinitialisation de mot de passe

### ✨ Nouveautés

#### 🪐 Biomes Planétaires
- Chaque planète (homeworld + colonies) reçoit un **biome aléatoire** à la création : tellurique, volcanique, glaciaire, désertique, océanique ou aride.
- Les biomes appliquent des **multiplicateurs de production** sur métal, cristal et deutérium.
- Badge coloré visible dans la vue de la planète avec description au survol.

#### 🎯 Tableau des Primes
- Les joueurs peuvent **placer une prime** sur un agresseur (ressources bloquées en escrow jusqu'à résolution).
- Les mercenaires peuvent **accepter un contrat** et réclamer la prime après avoir attaqué la cible.
- Annulation possible avec **remboursement automatique** sur le monde natal.
- Trois statuts : ouvertes, en cours, complétées.
- Nouveau composant **Tableau des Primes** accessible depuis le menu.

#### ⭐ Vaisseau Amiral
- Un seul **Vaisseau Amiral** par joueur, construction payante (5 000 000 métal / 2 000 000 cristal / 500 000 deutérium).
- Système d'**XP et de niveaux** (100 × niveau² XP par palier).
- Stats de base : 500 attaque / 300 bouclier / 2 000 coque / 5 000 cargo.
- Système de **modules équipables** par slot : weapon×3, shield×3, engine×2, utility×2, special×1.
- 12 modules disponibles : Laser Mk.II, Canon Plasma, Rayon Graviton, Déflecteur V2, Bouclier Plasma, Blindage Titane, Propulseur Ionique, Moteur Warp, Rayon Tracteur, Réseau Espion, Nano-réparation, Passerelle de Commandement.
- Interface **fitting EVE-style** avec boutique de modules et barre de progression XP.

#### 🔍 Recherche d'Amis Améliorée
- L'ajout d'ami utilise désormais une **recherche autocomplete par préfixe** (debounced 300 ms).
- Dropdown avec fermeture au clic extérieur et bouton × pour réinitialiser.

#### 🔐 Réinitialisation de Mot de Passe
- Lien **"Mot de passe oublié"** sur la page de connexion.
- Envoi d'un **email de réinitialisation** sécurisé (token 48 caractères, expiration 1h, usage unique).
- Détection automatique du lien de réinitialisation → affichage direct du formulaire.
- Flux **multi-vues animé** (connexion → oubli → réinitialisation) sans rechargement de page.

---

## [5.0.0] - 2026-03-06 - Système social & profils joueurs

### ✨ Nouveautés

#### 👤 Mon Profil (nouvelle page)
- Nouvelle section "Mon Profil" dans le menu (catégorie SYSTÈME).
- **Upload d'avatar** : formats PNG, JPG, WebP, max 2 Mo. L'avatar est visible par tous les joueurs.
- **Biographie** : texte libre de 500 caractères, modifiable depuis son propre profil.
- Affichage de la dernière connexion et de l'ancienneté du compte.

#### 🤝 Système d'amitié (nouvelle page)
- Nouvelle section "Amis" dans le menu (catégorie COMMUNICATION).
- **Envoyer une demande** par nom d'utilisateur exact.
- **Accepter / Décliner** les demandes reçues.
- **Notifications** : un message privé automatique est envoyé lors d'une demande et lors d'une acceptation.
- Les amis peuvent s'envoyer des ressources **sans être dans la même alliance** (même avantage que les membres d'alliance).

#### 🖼️ Avatars dans le classement
- Les avatars (ou avatars générés) s'affichent à côté de chaque joueur dans le classement.

#### 📋 Fiche profil enrichie
- Les fiches profil affichent l'avatar personnalisé et la biographie du joueur.
- **Bouton ami** : ajouter, accepter ou retirer un ami directement depuis la fiche profil.

---

## [4.2.0] - 2026-03-06 - Badge Admin / Développeur

### ✨ Nouveautés

#### 👑 Profil joueur — badge Admin / Développeur
- Les utilisateurs ayant le rôle `admin` affichent désormais un badge **Admin / Développeur** dans leur profil public (visible dans le classement), en plus du badge de rang habituel.
- Le champ `is_admin` est exposé par l'API `/players/:id/profile`.

---

## [4.1.0] - 2026-03-06 - Performances & corrections système

### ⚡ Performances

#### 🎨 Fond spatial — refonte animations CSS
- Remplacement des 100+ `motion.div` Framer Motion (boucles JS, 60fps par élément) par des **animations CSS pures** (compositing GPU, zéro JavaScript).
- Suppression du `boxShadow` sur les particules flottantes (opération de repaint coûteuse).
- Nombre de particules réduit (25 → 0 dans App, 30 → 15 dans le composant).
- Nombre d'étoiles réduit (100 → 60). La nébuleuse tertiaire est désormais statique.
- Résultat : utilisation GPU fortement réduite.

### 🐛 Corrections

#### 🔗 Sabotages / Casus Belli — CORS et URL hardcodées
- `SabotagesDashboard`, `SabotagesSufferedDashboard` et `CasusBelliList` utilisaient `http://localhost:8080` au lieu de l'import `apiUrl`. Corrigé.

#### 🔢 ResourceDisplay — bonus énergie incohérent
- Le fallback `energy_tech_bonus || 0.01` (1%/niveau) ne correspondait pas à la valeur par défaut `0.10` (10%/niveau). Corrigé en `|| 0.10`.

---

## [4.0.0] - 2026-03-06 - Ressources par planète

### 🐛 Corrections

#### 🪐 Ressources — partage entre planètes corrigé
- **Race condition critique** : lors d'un changement de planète, une réponse en cours de route pour l'ancienne planète pouvait écraser les données de la nouvelle planète, affichant les ressources de l'ancienne.
- Ajout d'un garde dans `fetchPlanet` : les réponses d'API dont l'`id` ne correspond pas à la planète active sont ignorées.
- Réinitialisation du `prevServerRef` dans `useRealtimeResources` lors d'un changement d'identité de planète, évitant que la logique anti-oscillation utilise des valeurs de l'ancienne planète.

---

## [3.9.0] - 2026-03-06 - Hangar & classement

### 🐛 Corrections

#### 🚀 Capacité Hangar — vaisseaux expansion non comptés
- `getTotalFleetCount` (PlanetOverview) et `getTotalFleet` (MyPlanets) ne comptaient que les 6 vaisseaux de base. Les 5 vaisseaux expansion (`heavy_hunter`, `battleship`, `bomber`, `destroyer`, `deathstar`) sont maintenant inclus dans l'occupation hangar.
- Les deux composants utilisent désormais la même fonction `getTotalFleetCount` — plus de divergence possible.

#### 🏆 Classement — badge "Zone Débutant" supprimé
- Le badge s'affichait pour tous les joueurs (tous en galaxie 1). Retiré du classement.

---

## [3.8.0] - 2026-03-06 - Admin refact & durée de construction

### ✨ Améliorations

#### ⏱️ Mines — durée d'amélioration affichée
- La section coût des mines (page Ressources) affiche maintenant la durée de construction pour le niveau suivant avant de valider l'amélioration.

### 🐛 Corrections

#### 🛠️ Page Admin — refactoring complet de la gestion des planètes
- **Bâtiments** : clés DB corrigées — `"metal"/"crystal"/"deuterium"/"research"` remplacées par `"metal_mine"/"crystal_mine"/"deuterium_mine"/"research_lab"` dans le backend et le frontend.
- **Vaisseaux** : 11 vaisseaux couverts — ajout de Chasseur Lourd, Cuirassé, Bombardier, Destroyer, **Étoile de la Mort** (`deathstar`).
- **Défenses** : 10 types couverts — clé `missile_launcher` corrigée en `rocket_launcher` ; ajout de Laser Léger, Laser Lourd, Canon Gauss, Canon Ions, Petit Bouclier, Grand Bouclier, **Anti-Missile**, **Missile IP**.
- **Technologies** : ajout des techs Armes (`weapons_tech`) et Bouclier (`shield_tech`) dans le panneau d'édition.
- **Backend** : `PlanetUpdate`, `get_planet_admin_handler` et `update_planet_admin_handler` mis à jour pour refléter toutes les nouvelles entités.
- **Score alliance** : clé `death_star` corrigée en `deathstar` dans le calcul de points militaires (`alliance.rs`).

---

## [3.7.0] - 2026-03-06 - Succès & ressources

### 🐛 Corrections

#### 🏆 Succès — progrès jamais sauvegardé (bug critique)
- **Bug** : `update_achievement_progress` appelait `.update()` pour les *nouveaux* enregistrements car `active.id.is_set()` retourne `true` dans les deux cas (Sea-ORM encode `Model::into()` en `Set(...)`). Résultat : toute progression (expéditions, attaques, bâtiments...) restait éternellement à 0/N.
- **Fix** : suivi explicite d'un booléen `is_new` pour choisir `.insert()` vs `.update()`.

#### 📊 Barre de ressources — déductions invisibles
- **Bug** : la protection anti-oscillation (`Math.max`) dans `useRealtimeResources` empêchait les déductions de ressources de s'afficher dans la barre en haut — après construction de défenses/vaisseaux/recherches, les ressources semblaient ne pas diminuer.
- **Fix** : comparaison avec la valeur serveur *précédente* pour distinguer une déduction (valeur serveur en baisse) d'un simple lag de polling.

#### 🔬 Temps de recherche — niveau labo ignoré
- La clé `"research"` ne correspondait pas à la clé DB `"research_lab"` → le bonus de réduction de temps du labo de recherche était ignoré pour tous les calculs de durée.

---

## [3.6.0] - 2026-03-06 - Score, énergie & défenses

### 🐛 Corrections

#### ⚡ Énergie
- **Bug critique** : la consommation énergétique des mines affichait toujours 0 — les clés de bâtiment `"metal"/"crystal"/"deuterium"` corrigées en `"metal_mine"/"crystal_mine"/"deuterium_mine"` dans les deux endpoints planet

#### 📊 Classement — Score militaire entièrement revu
- Ancien calcul : valeurs hardcodées (Death Star = 500 pts) — incohérent et sous-estimé
- **Nouveau calcul** : basé sur les stats réelles de combat depuis la DB : `(attack + shield/2 + hull/10) / 1000` par unité
- Toutes les technologies désormais reconnues (`espionage_tech`, `hyperspace_tech`, `graviton_tech`...)
- Clés de mines corrigées dans le calcul de production (`metal_mine`, `crystal_mine`, `deuterium_mine`)
- **Ressources stockées** désormais incluses dans le score économique (1 pt / 50k métal, /33k cristal, /25k deutérium)

#### 🛡️ Bouclier Orbital (Vue Planète)
- Tous les types de défenses s'affichent maintenant en permanence (même à 0)
- Les défenses non construites apparaissent en grisé pour donner une vue complète de l'arsenal

#### 🚀 Persistance base de données
- Résolution définitive : `PGDATA=/var/lib/postgresql/data` forcé explicitement pour bypasser le chemin par défaut de postgres 18 (`/var/lib/postgresql/18/docker`)
- Bind mount sur `/opt/space-conquest/pgdata` — hors de contrôle de Coolify

---

## [3.5.0] - 2026-03-06 - Système de Tiers Missions & Succès

### ✨ Nouvelles Fonctionnalités

#### 🎯 Missions — Système de Niveaux (Tiers)
- Les missions quotidiennes s'adaptent automatiquement au niveau du joueur
- **4 tiers** basés sur le nombre de missions réclamées historiquement :
  - ⚪ **Tier 1 — Débutant** : 0–9 missions (objectifs de base)
  - 🔵 **Tier 2 — Apprenti** : 10–39 missions (×5 exigences & récompenses)
  - 💎 **Tier 3 — Vétéran** : 40–99 missions (×20 exigences & récompenses)
  - ⭐ **Tier 4 — Expert** : 100+ missions (×80 exigences & récompenses)
- 24 nouvelles missions seedées (3 tiers × 8 types)
- Badge de tier visible dans l'interface avec progression vers le tier suivant

#### 🏆 Succès — Variantes Silver & Gold
- **6 succès Silver** ajoutés : Guerrier Aguerri (100 attaques), Battant (10 victoires), Champion (50 victoires), Explorateur Chevronné (100 expéditions), Grand Architecte (50 bâtiments), Espion d'Élite (50 missions espionnage)
- **6 succès Gold** ajoutés : Seigneur de Guerre (250 attaques), Invincible Légendaire (100 victoires), Pionnier Légendaire (250 expéditions), Maître Bâtisseur (200 bâtiments), Grand Amiral (500 vaisseaux), Mineur Légendaire (1M cristal)

---

## [3.4.0] - 2026-03-06 - Missions & Succès opérationnels

### 🐛 Corrections

#### 🎯 Missions Quotidiennes
- **Bug critique** : les vaisseaux d'expansion (`heavy_hunter`, `battleship`, `bomber`, `destroyer`) et toutes les défenses expansions (`light_laser`, `heavy_laser`, `gauss_cannon`, `ion_cannon`, `small_shield`, `large_shield`) ne déclenchaient aucune progression sur les missions de construction
- Mission **"Mineur assidu"** (collecter 10 000 métal) : aucune progression ne s'accumulait — hook ajouté dans le tick de production

#### 🏆 Succès / Achievements
- Achievement **"Invincible"** (25 victoires) : les victoires en combat n'étaient jamais comptabilisées
- Achievement **"Conquérant suprême"** (conquérir une planète) : jamais déclenché — désormais tracké à la résolution du combat
- Achievement **"Amiral"** (100 vaisseaux simultanément) : jamais mis à jour — comptage réel de la flotte après chaque construction

---

## [3.3.0] - 2026-03-06 - Corrections Score & Construction

### 🐛 Corrections

#### 🏆 Classement / Score Militaire
- **Bug corrigé** : les défenses (lasers, canons, tourelles, boucliers) ne contribuaient pas au score militaire — seuls `missile_launcher` et `plasma_turret` étaient comptés
- Désormais toutes les défenses contribuent au score proportionnellement à leur coût de construction
- 500 lasers lourds construits = +4 000 points militaires

#### 🏗️ Temps de Construction Infrastructures
- Réduit le multiplicateur de coût des bâtiments d'infrastructure (hangar, chantier spatial, laboratoire, silo) de `×2.0^niveau` à `×1.5^niveau`
- Au niveau 25, les coûts sont divisés par ~541 — un hangar 25→26 passe de plusieurs millénaires à quelques jours

#### 🚀 Capacité Hangar — Nouveaux Vaisseaux
- Les vaisseaux d'expansion (`heavy_hunter`, `battleship`, `bomber`, `destroyer`) bypas­saient la limite de capacité du hangar
- Ils sont maintenant correctement comptabilisés dans le check de capacité

---

## [3.2.0] - 2026-03-06 - Corrections Sécurité & Infrastructure

### 🐛 Corrections

#### ⚔️ Combat
- Correction du test unitaire `test_simultaneous_damage_defender_fires_back` : valeur d'attaque du cache de test corrigée (200→100), le test valide maintenant correctement les dégâts simultanés

#### 🔬 Recherche Technologique (Exploit Fix)
- **Exploit bloqué** : il n'est plus possible de mettre en file d'attente plusieurs niveaux de la même technologie simultanément
- Empêche le schéma : lancer niv 8 + niv 9, annuler niv 8, tech passe de 7 → 9 directement
- Protection double : handler (`upgrade_mine_handler`) bloque le second ajout en queue + tick system ne peut avancer un niveau que de +1 à la fois

#### 🗄️ Infrastructure Docker/Coolify
- Volumes Docker avec noms explicites globaux (`space_conquest_pgdata`, `space_conquest_redisdata`, `space_conquest_pgadmin_data`)
- Empêche la création de nouveaux volumes vides lors d'un redéploiement Coolify si le nom du projet Compose change

---

## [3.1.0] - 2026-03-06 - Aperçu Coût/Temps/Gain avant Construction

### ✨ Nouvelles Fonctionnalités UI

#### 🚀 Chantier Spatial (Shipyard)
- Affichage du **temps de production total** adaptatif selon la quantité choisie
- Le temps est calculé en temps réel en tenant compte du `speed_factor` et du `construction_speed` serveur

#### 🛡️ Défenses
- Affichage du **coût en Deutérium** (était absent — bug corrigé)
- La vérification `canAfford` inclut désormais le deutérium
- Affichage du **temps de construction total** adaptatif selon la quantité
- Le temps tient compte du `speed_factor` serveur

#### 🔬 Arbre Technologique (TechTree)
- Affichage de la **durée de recherche** pour le prochain niveau (déjà calculée côté serveur, maintenant exposée en frontend)
- Affichage du **gain par niveau** pour chaque technologie (ex: `+10% attaque des vaisseaux`, `+1 slot de colonie`, etc.)

---

## [3.0.0] - 2026-03-06 - Suppression Colonnes Legacy & Refactoring Base de Données

### 🏗️ Refactoring Architecture

#### 🗄️ Suppression des Colonnes Legacy de la Table `planet`
**Breaking Change (interne)**: Toutes les colonnes directes de niveaux/compteurs ont été supprimées de la table `planet`.

**Colonnes supprimées**:
- Niveaux de bâtiments: `metal_mine_level`, `crystal_mine_level`, `deuterium_mine_level`, `solar_plant_level`, `shipyard_level`, `research_lab_level`, `hangar_level`, `resource_storage_level`
- Niveaux de technologies: `energy_tech_level`, `laser_battery_level`, `espionage_tech_level`, `armour_tech_level`
- Compteurs de vaisseaux: `light_hunter_count`, `cruiser_count`, `recycler_count`, `spy_probe_count`, `colony_ship_count`, `transporter_count`
- Compteurs de défenses: `missile_launcher_count`, `plasma_turret_count`
- Champs legacy de construction: `construction_end`, `construction_type`, `shipyard_construction_end`, `pending_fleet_type`, `pending_fleet_count`

**Remplacement**: Toutes les données vivent exclusivement dans les tables relationnelles:
- `planet_buildings` — niveaux de bâtiments
- `planet_technologies` — niveaux de technologies
- `planet_ships` — compteurs de vaisseaux
- `planet_defenses` — compteurs de défenses

**Impact utilisateur**: Aucun — les interfaces et calculs restent identiques.

---

#### 🔧 Corrections Backend
- `admin.rs`: L'endpoint `/admin/planet/:id` retourne maintenant les données complètes (bâtiments, techs, vaisseaux, défenses) issues des tables relationnelles
- `game_logic.rs`: `calculate_planet_points` utilise les tables relationnelles
- `tick_system.rs`: Suppression des mises à jour de colonnes legacy (rétrocompatibilité)
- `auth.rs`: Création de planète initialise les bâtiments dans `planet_buildings`
- Bug fix: `AdminPanel` — champ `research_level` corrigé en `research_lab_level`
- Bug fix: `GalaxyView` — `colony_ship_count` lit correctement `ships.colony_ship.count`

---

## [2.4.0] - 2026-01-26 - Amélioration des Tables Relationnelles & Missions de Colonisation

### 🛠️ Corrections & Améliorations

#### ⏱️ Timer de Recherche TechTree
**Fix**: Le timer dans l'arbre technologique fonctionne maintenant correctement

**Détails**:
- Utilise maintenant `research_queue` au lieu de `construction_queue`
- Ajout de `end_time` dans la réponse API `research_queue`
- Affichage du temps restant en temps réel

---

#### 📊 Cohérence des Tables Relationnelles
**Fix**: Tous les composants utilisent maintenant les helpers de tables relationnelles

**Composants mis à jour**:
- `PlanetOverview.tsx` - Utilise `getBuildingLevel()` pour tous les niveaux
- `MyPlanets.tsx` - Points de planète depuis l'API backend
- `EmpireBar.tsx` - Production calculée avec niveaux relationnels
- `ProductionStats.tsx` - Statistiques cohérentes
- `Shipyard.tsx` - Capacité hangar depuis `getBuildingLevel()`
- Profil/Statistiques - Flotte et défenses depuis tables relationnelles

**Helpers utilisés**:
- `getBuildingLevel(planet, 'building_key')` - Niveau de bâtiment
- `getShipCount(planet, 'ship_key')` - Comptage de vaisseaux
- `getTechLevel(planet, 'tech_key')` - Niveau de technologie

---

#### 🚀 Système de Points Amélioré
**Feature**: Calcul des points côté backend avec formule complète

**Détails**:
- Points économiques (bâtiments, production)
- Points militaires (vaisseaux, défenses)
- Points de recherche (technologies)
- API `/my-planets` retourne `points`, `economy_points`, `military_points`

---

#### 🛸 Affichage Complet des Vaisseaux
**Feature**: Tous les types de vaisseaux sont maintenant visibles

**Nouveaux vaisseaux affichés**:
- Chasseurs Lourds (`heavy_hunter`)
- Vaisseaux de Guerre (`battleship`)
- Destructeurs (`destroyer`)
- Bombardiers (`bomber`)
- Étoile de la Mort (`deathstar`)

Les vaisseaux avancés s'affichent uniquement si le joueur en possède.

---

#### 🌍 Missions de Colonisation avec Temps de Trajet
**Feature**: La colonisation est maintenant une mission avec temps de voyage

**Détails**:
- Calcul de la distance source → cible
- Temps de trajet basé sur la distance (1.5x plus lent que vaisseaux normaux)
- Création d'une `fleet_mission` de type "colonize"
- La planète est créée à l'arrivée de la mission
- Vérification de l'emplacement libre à l'arrivée
- Affichage du temps d'arrivée estimé

---

#### 💬 Chat Galactique
**Feature**: Canal de discussion pour tous les joueurs

**Détails**:
- Nouvel onglet "Galactique" dans la messagerie
- Messages en temps réel via WebSocket
- Historique des 100 derniers messages
- Interface similaire à un chat (pas email)

**Fichiers**:
- `backend/src/entities/global_chat_message.rs` - Entité message
- `backend/src/messaging.rs` - Handlers chat global
- `frontend/src/components/MessagesView.tsx` - Interface UI

---

### 📝 Notes Techniques

- Le temps de construction minimum est de 10 secondes (configurable via `construction_speed_multiplier`)
- Les défenses utilisent `getShipCount()` qui vérifie aussi `planet.defenses`
- Le chat galactique utilise `broadcast_global()` pour envoyer à tous les clients connectés

---

## [2.3.0] - 2026-01-21 - Système de Protection Débutant & Panel Admin

### 🛡️ Nouvelles Fonctionnalités

#### 🆕 Système de Protection Débutant
**Feature**: Protection automatique pour les nouveaux joueurs

**Détails**:
- **Bouclier de 3 jours**: Tous les nouveaux comptes bénéficient d'une protection automatique de 3 jours
  - Impossible d'être attaqué pendant cette période
  - Compte à rebours visible dans l'interface
  - Badge animé indiquant la protection active
- **Zone Débutant**: La galaxie 1 est désormais une zone protégée
  - Les planètes dans cette galaxie ne peuvent pas être attaquées
  - Badge "Zone Débutant" visible sur les planètes concernées
- **Restrictions d'attaque par points**:
  - Ratio minimum: 0.2 (impossible d'attaquer un joueur avec moins de 20% de vos points)
  - Ratio maximum: 5.0 (impossible d'attaquer un joueur avec plus de 500% de vos points)
  - Système équitable encourageant les combats équilibrés

**Visibilité**:
- Badges de protection affichés dans:
  - Vue galaxie (carte et liste)
  - Classement des joueurs
  - Profils des joueurs
- Affichage des points totaux et du temps de protection restant
- Animations et indicateurs visuels clairs

**Fichiers**:
- `backend/src/protection.rs` - Logique de protection
- `frontend/src/components/BeginnerProtectionBadge.tsx` - Badge UI
- Migration base de données pour les nouveaux champs

---

#### ⚙️ Panel Admin - Gestion du Contenu
**Feature**: Interface d'administration complète pour gérer le contenu du jeu

**Détails**:
- **Gestion des vaisseaux**:
  - Créer, modifier, supprimer des types de vaisseaux
  - Configuration des coûts, statistiques, prérequis
  - Temps de construction personnalisables
- **Gestion des bâtiments**:
  - CRUD complet pour tous les types de bâtiments
  - Configuration des bonus de production
  - Gestion des prérequis et dépendances
- **Gestion des défenses**:
  - Ajout/modification des systèmes défensifs
  - Statistiques de combat personnalisables
- **Interface intuitive**:
  - Édition en ligne
  - Confirmations de suppression
  - Onglets organisés (Vaisseaux, Bâtiments, Défenses)

**Accès**: Réservé aux administrateurs avec rôle "admin"

**Fichiers**:
- `backend/src/admin_content.rs` - API CRUD
- `frontend/src/components/AdminContentManager.tsx` - Interface UI

---

#### 📊 Mise à Jour Automatique des Points
**Feature**: Calcul et mise à jour périodique des points des joueurs

**Détails**:
- Recalcul automatique après chaque construction/recherche
- Prise en compte de:
  - Ressources stockées (divisées par 1000)
  - Niveaux des bâtiments (multiplicateurs selon le type)
  - Flottes (valeur des vaisseaux × quantité)
  - Technologies
- Mise à jour dans le système de tick (toutes les 10 secondes)
- Garantit des restrictions d'attaque toujours à jour

**Fichiers**:
- `backend/src/tick_system.rs` - Fonction update_all_user_points

---

### 🐛 Corrections

#### 🔧 Correction du Mot Réservé "protected"
**Problème**: Erreur de build causée par l'utilisation du mot réservé JavaScript "protected"

**Solution**: Renommé en "hasProtection" dans le composant BeginnerProtectionBadge

---

## [2.2.1] - 2026-01-21 - Rapports de Combat Améliorés & Système d'Attaque Dynamique

### 🎯 Nouvelles Fonctionnalités

#### 🎬 Intégration du Replay de Combat
**Feature**: Visualisation animée des combats avec le composant CombatReplay

**Détails**:
- Bouton "Voir le replay" ajouté dans tous les rapports de combat détaillés
- Compatible avec tous les types de rapports:
  - Combats PvP (attaque/défense)
  - Expéditions
  - Conquêtes de planètes
- Affichage modal remplaçant le rapport détaillé lors du visionnage

**Fichiers**:
- `frontend/src/components/CombatModal.tsx` - Ajout bouton replay et logique d'affichage

---

#### 📊 Composition Détaillée des Flottes dans les Rapports
**Feature**: Affichage complet de la composition des flottes engagées dans les combats

**Détails**:
- Nouvelle section "Composition des flottes" dans CombatModal
- Affichage pour chaque vaisseau:
  - Nombre initial
  - Nombre restant (affiché en grand)
  - Pertes avec pourcentage
  - Nom français du vaisseau (Chasseur Léger, Croiseur, etc.)
- Deux colonnes: Flotte Attaquante (rouge) et Flotte Défensive (bleue)
- Mapping complet des noms de vaisseaux et défenses en français

**Backend**:
- Ajout de `attacker_initial`, `defender_initial` dans `PvpCombatReport`
- Inclusion des flottes initiales dans `detailed_report` JSON

**Fichiers**:
- `backend/src/combat.rs` - Structure PvpCombatReport étendue
- `backend/src/main.rs` - Inclusion des flottes dans les rapports
- `frontend/src/components/CombatModal.tsx` - Composant FleetComposition

---

#### ⚔️ Système d'Attaque PvP Dynamique
**Feature**: Attaque avec tous les types de vaisseaux disponibles

**Avant**: Limité à Chasseurs Légers, Croiseurs et Transporteurs

**Maintenant**: Sélection dynamique de TOUS les types de vaisseaux
- Cuirassés
- Destroyers
- Sondes d'Espionnage
- Recycleurs
- Vaisseaux de Colonisation
- Et tous les futurs vaisseaux ajoutés au jeu

**Interface AttackModalV2**:
- Chargement dynamique depuis `/planets/:id/ship-types`
- Contrôles +/- et bouton MAX pour chaque type
- Affichage de:
  - Nombre de vaisseaux total
  - Puissance de feu totale
  - Capacité cargo totale
- Envoi vers `/attack/v2` avec format `{fleet: {ship_key: count}}`

**Fichiers**:
- `frontend/src/components/AttackModalV2.tsx` (nouveau)
- `frontend/src/App.tsx` - Utilisation d'AttackModalV2

---

### 🐛 Corrections

#### ⏱️ Correction des Timers de Construction
**Problème**: Les timers affichaient "0s" au lieu du temps restant réel

**Cause**: Problème de fuseau horaire - `build_end_time` n'avait pas le suffixe 'Z' pour UTC

**Solution**:
```typescript
const buildEndTime = activeItem.build_end_time.endsWith('Z')
  ? activeItem.build_end_time
  : activeItem.build_end_time + 'Z';
```

**Composants corrigés**:
- `frontend/src/components/Shipyard.tsx` - Timers de vaisseaux
- `frontend/src/components/Defenses.tsx` - Timers de défenses

---

#### 📋 Rapports d'Expédition dans le Listing
**Problème**: Les rapports d'expédition V2 n'apparaissaient pas dans le listing des rapports

**Solution**: Ajout de la création de `combat_log` dans `expedition_v2_handler`

**Détails**:
- Insertion dans la table `combat_log` avec:
  - `mission_type: "expedition"`
  - `result: "victory" | "defeat" | "calm"`
  - `detailed_report` contenant logs, loot, pertes
- Calcul des pertes de vaisseaux (initial vs restant)

**Fichiers**:
- `backend/src/main.rs` - expedition_v2_handler

---

#### 🔢 Calcul des Pertes de Vaisseaux
**Amélioration**: Calcul précis des pertes dans les expéditions

**Avant**: `ships_lost: 0` (hardcodé)

**Maintenant**: Calcul réel par comparaison:
```rust
for (ship_key, &initial_count) in &payload.fleet {
    let remaining = combat_report.remaining_ships.get(ship_key).unwrap_or(0);
    ships_lost_total += initial_count - remaining;
}
```

**Fichiers**:
- `backend/src/main.rs` - expedition_v2_handler

---

### 🎨 Améliorations Visuelles

#### Noms de Vaisseaux en Français
Mapping complet ajouté dans CombatModal:
- Chasseur Léger
- Croiseur
- Transporteur
- Sonde d'Espionnage
- Recycleur
- Vaisseau de Colonisation
- Cuirassé
- Destructeur
- Étoile de la Mort
- Lanceur de Missiles
- Tourelle à Plasma
- Canon Laser
- Canon à Ions
- Canon de Gauss

---

## [2.2.0] - 2026-01-20 - Configuration Serveur Complète & Correctifs Production

### 🎯 Nouvelles Fonctionnalités

#### ⚙️ Configuration complète des mécaniques de jeu
**Feature**: 48 nouvelles valeurs configurables via le panel admin pour personnaliser toutes les mécaniques du jeu

**Paramètres configurables ajoutés**:

**Combat** (12 valeurs):
- Statistiques de combat (attaque, bouclier, coque) pour :
  - Chasseurs Légers : 50 / 10 / 400
  - Croiseurs : 400 / 50 / 2700
  - Lanceurs de Missiles : 80 / 20 / 200
  - Tourelles Plasma : 3000 / 300 / 10000
- Tir rapide (Rapid Fire) :
  - Croiseur vs Chasseur : 6 tirs
  - Croiseur vs Lanceur : 10 tirs
  - Plasma vs Chasseur : 5 tirs
  - Plasma vs Croiseur : 3 tirs
- Bonus technologiques :
  - Laser : +10% par niveau
  - Blindage : +10% par niveau

**Pillage & Débris** (3 valeurs):
- Pourcentage pillable : 50%
- Maximum par ressource : 50,000
- Pourcentage en débris : 30%

**Capacités Cargo** (4 valeurs):
- Chasseur Léger : 50 unités
- Croiseur : 800 unités
- Transporteur base : 5,000 unités
- Transporteur bonus/niveau hangar : +2,500 unités

**Expéditions** (29 valeurs):
- Chance de combat : 30%
- Rounds maximum : 6
- Récompenses Chasseurs (min/max) :
  - Métal : 50-200
  - Cristal : 25-100
  - Deutérium : 0-50
- Récompenses Croiseurs (min/max) :
  - Métal : 200-600
  - Cristal : 100-400
  - Deutérium : 0-150
- Pirates :
  - Scaling min/max : 10-100
  - Loot base : 50
  - Loot multiplier : 1.1

**Interface Admin**:
- 11 sections organisées dans le panel admin
- Édition en temps réel avec validation
- Interface colorée et organisée par catégorie
- Composant `ConfigInput` réutilisable pour cohérence visuelle

**Fichiers**:
- `backend/migration/src/m20260120_000005_add_game_mechanics_config.rs` (nouveau)
- `backend/src/game_logic.rs` (lecture config pour tous calculs)
- `backend/src/main.rs` (exposition via GET /config et expéditions)
- `frontend/src/components/AdminPanel.tsx` (7 nouvelles sections UI)

---

### 🔧 Corrections Critiques

#### 🐛 Correction erreurs NaN dans l'affichage des ressources
**Problème**: Les ressources affichaient "NaN" dans EmpireBar, ProductionStats et PlanetOverview

**Causes identifiées**:
1. Frontend calculait la production avant le chargement de la config
2. Valeurs `undefined` passées aux calculs mathématiques
3. Pas de protection contre les valeurs manquantes

**Solutions appliquées**:

**Protection Number() + fallbacks** dans tous les composants:
```typescript
// Protection contre NaN
const safeBaseFactor = Number(baseFactor) || 0;
const safeGrowthFactor = Number(growthFactor) || 1;
if (safeBaseFactor === 0) return 0;

// Appels avec valeurs par défaut
calculateProduction(
  planet.metal_mine_level || 0,
  config.production_metal_base || 30,  // fallback
  config.production_metal_growth || 1.1 // fallback
);
```

**Composants corrigés**:
- `EmpireBar.tsx` - Protection calculateProduction + fallbacks
- `ProductionStats.tsx` - Protection calculateProduction + early return
- `useRealtimeResources.ts` - Protection Number() sur tous paramètres

**Fichiers**:
- `frontend/src/components/EmpireBar.tsx` (lignes 122-150)
- `frontend/src/components/ProductionStats.tsx` (lignes 95-140)
- `frontend/src/hooks/useRealtimeResources.ts` (lignes 70-90)

---

#### 🔄 Synchronisation des noms de clés config (Backend ↔ DB)
**Problème**: Les noms de clés dans `game_logic.rs` ne correspondaient pas à ceux dans la base de données

**Clés corrigées**:
| Ancien (incorrect) | Nouveau (correct) |
|-------------------|-------------------|
| `combat_tech_laser_bonus` | `combat_laser_tech_bonus` |
| `combat_tech_armour_bonus` | `combat_armour_tech_bonus` |
| `loot_percentage` | `combat_loot_percentage` |
| `loot_max_per_resource` | `combat_loot_cap_per_resource` |
| `debris_percentage` | `combat_debris_percentage` |
| `expedition_pirate_strength_*` | `expedition_pirate_scaling_*` |

**Clés supprimées** (n'existent pas dans DB):
- `combat_tech_energy_bonus` - Pas de tech énergie pour boucliers implémentée
- Tous les paramètres d'expédition non utilisés (pertes victoire/défaite, vulnérabilités, etc.)

**Impact**: Les mécaniques de combat et d'expédition utilisent maintenant les bonnes valeurs configurables

**Fichiers**:
- `backend/src/game_logic.rs` (lignes 530-531, 614-615, 652, 674-675)

---

#### 🎨 Correction Admin Panel - Clés UI synchronisées
**Problème**: L'interface admin utilisait des noms de clés différents de ceux en DB, empêchant la sauvegarde

**Corrections**:
- Renommage de 9 clés pour correspondre au schéma DB
- Suppression de Section 12 (capacités structures) - champs non existants en DB
- Simplification section Expéditions - seulement les champs DB
- Suppression champ "Bonus Énergie" des bonus technologiques

**Exemple de correction**:
```typescript
// Avant (incorrect)
configKey="cargo_light_hunter_capacity"

// Après (correct)
configKey="cargo_light_hunter"
```

**Résultat**: Toutes les 43 valeurs configurables peuvent maintenant être sauvegardées

**Fichiers**:
- `frontend/src/components/AdminPanel.tsx` (sections 6-11)

---

### 📝 Notes techniques

**Hiérarchie des fallbacks**:
```typescript
// Ordre de priorité
1. editedConfig[key]        // Valeur en cours d'édition
2. config[key]              // Valeur DB chargée
3. hardcoded default        // Fallback si rien trouvé
```

**Calcul production avec protection**:
```typescript
// Protection complète
const safeBaseFactor = Number(baseFactor) || 0;
const safeGrowthFactor = Number(growthFactor) || 1;
const safeTechBonus = Number(techBonus) || 1;
const safeSlotBonus = Number(slotBonus) || 1;

// Early return si invalide
if (safeBaseFactor === 0) return 0;

// Calcul normal ensuite
let prod = safeBaseFactor * level * Math.pow(safeGrowthFactor, level);
prod *= safeTechBonus * energyRatio * safeSlotBonus * speedFactor;
```

**Migration des valeurs config**:
- IDs 60-107 : 48 nouvelles configurations game mechanics
- IDs 1-59 : Configurations existantes (speed, coûts, production, énergie)

---

### 🚀 Déploiement

**Migrations**: **OUI - OBLIGATOIRE**
```bash
cd migration
cargo run  # Applique m20260120_000005_add_game_mechanics_config
```

**Tests recommandés**:
1. ✅ Panel admin → Modifier combat stats → Sauvegarder → Vérifier DB
2. ✅ EmpireBar → Vérifier production affichée (pas de NaN)
3. ✅ ProductionStats → Vérifier graphiques (pas de NaN)
4. ✅ PlanetOverview → Vérifier calculs ressources (pas de NaN)
5. ✅ Expédition → Vérifier gains correspondent aux valeurs config
6. ✅ Combat PvP → Vérifier dégâts/débris/butin utilisent config

---

### 📦 Fichiers modifiés (9 fichiers)

#### Backend (5 fichiers)
- ➕ `backend/migration/src/m20260120_000005_add_game_mechanics_config.rs` - 48 nouvelles configs
- ✏️ `backend/migration/src/lib.rs` - Enregistrement migration
- ✏️ `backend/src/game_logic.rs` - Correction noms clés + lecture config
- ✏️ `backend/src/main.rs` - Exposition configs via GET /config

#### Frontend (4 fichiers)
- ✏️ `frontend/src/components/AdminPanel.tsx` - 7 sections + correction clés
- ✏️ `frontend/src/components/EmpireBar.tsx` - Protection NaN + fallbacks
- ✏️ `frontend/src/components/ProductionStats.tsx` - Protection NaN + fallbacks
- ✏️ `frontend/src/hooks/useRealtimeResources.ts` - Protection NaN complète

---

### ⚠️ Breaking Changes

**IMPORTANT**: Cette version nécessite l'exécution de la migration pour fonctionner correctement.

**Valeurs par défaut**:
- Sans migration : Le jeu continue de fonctionner avec valeurs hardcodées
- Après migration : Les valeurs deviennent configurables via panel admin

**Impact**:
- Aucun impact sur gameplay existant (valeurs par défaut identiques)
- Nouvelle capacité : Personnalisation complète des mécaniques
- Rétrocompatible : Fallback sur constantes si clé manquante

---

### 🐛 Bugs corrigés

- ✅ NaN dans EmpireBar pour métal/cristal/deutérium
- ✅ NaN dans ProductionStats pour graphiques production
- ✅ NaN dans PlanetOverview pour calculs ressources
- ✅ Config admin ne sauvegardait pas (clés incorrectes)
- ✅ Backend utilisait mauvaises clés config (incohérence DB)
- ✅ Bonus tech énergie appliqué alors que non implémenté

---

### 🔮 Améliorations futures

**Panel Admin** :
- Export/Import configuration complète (JSON)
- Presets de configuration (Vitesse normale, Rapide, Ultra-rapide)
- Historique des modifications config avec rollback
- Validation des valeurs (min/max cohérents)

**Gameplay**:
- Événements serveur avec multiplicateurs temporaires
- Configuration dynamique selon heure (Happy Hour ressources)
- Presets par alliance (configurations personnalisées)

---

**Commits**: `c5b00c0`, `2a69bd4`
**Branche**: `claude/fix-admin-config-save-WhPrq`
**Fichiers**: 9 modifiés, 1 créé

---

## [2.1.0] - 2026-01-20 - Fonctionnalités Avancées UX & Gameplay

### 🎨 Nouvelles Fonctionnalités UI

#### 📊 Calculateur de Rentabilité (ROI)
**Description**: Affichage du temps de retour sur investissement pour chaque amélioration de mine

**Détails**:
- Calcul automatique basé sur le coût et le gain de production
- Affichage du ROI en minutes, heures ou jours
- Interface cohérente avec le design global (indigo, subtle)
- Aide les joueurs à prioriser leurs constructions

**Exemple**:
- Mine Métal Niv. 5 → 6: Coût 3000M + 750C, Gain +150/h → **ROI: 6h 15min**

**Fichiers**:
- `frontend/src/components/ResourceDisplay.tsx` (fonction `calculateROI`, UI panel)

---

#### 🌳 Arbre Technologique Visuel (ReactFlow)
**Description**: Vue interactive des technologies avec dépendances visuelles

**Features**:
- Graphe interactif avec ReactFlow (zoom, pan, drag)
- Noeuds personnalisés pour chaque technologie
- Flèches animées montrant les dépendances
- Technologies grisées si prérequis non satisfaits
- Toggle entre vue arbre et vue grille classique

**Dépendances**:
- Labo de Recherche → Énergie, Laser, Espionnage
- Flèches colorées et animées selon l'état

**Fichiers**:
- `frontend/src/components/TechTreeVisual.tsx` (composant ReactFlow)
- `frontend/src/components/TechTree.tsx` (ajout toggle vue)
- `package.json` (ajout reactflow ^11.x)

---

#### 🎬 Replay de Combat Animé
**Description**: Visualisation animée des combats avec barres de vie et explosions

**Features**:
- Parser automatique des logs de combat
- Barres de vie animées pour joueur et ennemi
- Explosions et effets visuels (Framer Motion)
- Timeline d'événements avec icônes contextuelles
- Contrôles Play/Pause/Replay
- Background spatial avec étoiles animées

**Types d'événements**:
- Rounds de combat
- Attaques (lasers animés)
- Dégâts infligés
- Vaisseaux détruits
- Fin de combat (victoire/défaite)

**Fichiers**:
- `frontend/src/components/CombatReplay.tsx` (composant principal)
- Utilise `framer-motion` pour animations fluides

---

#### 🕵️ Système de Sabotage (Espionnage Avancé)
**Description**: Actions clandestines après espionnage réussi

**Nouvelles Actions**:
1. **Saboter Infrastructure**
   - Désactive temporairement une mine
   - Baisse de production: -50% pendant 1h
   - Risque modéré de détection

2. **Espionnage Industriel**
   - Vole des données techniques
   - Bonus: -20% temps recherche suivante
   - Risque élevé de détection

**Mécaniques de Risque**:
- Si détecté: sonde détruite
- Casus Belli accordé à la victime (droit d'attaque sans pénalité)
- Chances basées sur différence de niveau tech espionnage

**Conditions d'accès**:
- Espionnage réussi (detection_level !== 'none')
- Avantage tech minimal (tech_difference >= 1)

**Fichiers**:
- `frontend/src/components/SpyModal.tsx` (UI sabotage)
- **Backend TODO**: Endpoints `/sabotage/disable_mine` et `/sabotage/steal_tech`

---

### 🎯 Améliorations UX

- **Cohérence Design**: Toutes les nouvelles features suivent la charte graphique (PlanetOverview style)
- **Animations Fluides**: Utilisation intensive de Framer Motion
- **Feedback Visuel**: Tooltips, hover effects, transitions harmonisées
- **Responsive**: Mobile-friendly pour toutes les nouvelles interfaces

---

### 📦 Dépendances Ajoutées

```json
{
  "reactflow": "^11.x" // Tech tree interactif
}
```

---

### 🚀 Prochaines Étapes (Backend)

**Système de Sabotage** (à implémenter):
```rust
// Endpoints à créer
POST /planets/{id}/sabotage/disable_mine
POST /planets/{id}/sabotage/steal_tech

// Mécaniques
- Vérification tech_difference >= 1
- Calcul probabilité détection
- Application des effets (debuff mines, bonus recherche)
- Notification victime si détecté
- Attribution Casus Belli
```

---

## [2.0.5] - 2026-01-20 - Corrections gameplay et équilibrage

### 🔧 Corrections critiques

#### 🛠️ Système de capacité cargo pour les attaques
**Problème**: Les joueurs pouvaient piller plus de ressources que leurs vaisseaux ne pouvaient transporter

**Solution implémentée**:
- Ajout d'un système de capacité cargo pour tous les vaisseaux:
  - **Chasseurs Légers**: 50 unités de cargo
  - **Croiseurs**: 800 unités de cargo
  - **Transporteurs**: 10,000 unités de base (+5% par niveau hangar)
- Le butin est maintenant limité par la capacité totale des vaisseaux **survivants**
- Message d'alerte si la capacité cargo est insuffisante pour tout récupérer
- Les transporteurs ne participent pas au combat et survivent toujours

**Impact**: Empêche le pillage excessif, encourage l'envoi de transporteurs en attaque

**Fichiers**:
- `backend/src/game_logic.rs` (fonctions `get_ship_cargo_capacity()`, `resolve_pvp()`)
- `backend/src/main.rs` (payload `AttackPayload`, handler `resolve_attack_mission`)

---

#### 🚀 Support des transporteurs et recycleurs

**Feature**: Possibilité d'envoyer des transporteurs en attaque et des recycleurs en expédition

**Transporteurs en attaque**:
- Augmentent massivement la capacité de pillage (10k+ par transporteur)
- Ne participent pas au combat (toujours survivent)
- Interface mise à jour avec sélection et affichage cargo

**Recycleurs en expédition**:
- **Bonus x2** aux ressources collectées (par recycleur)
- Ne participent pas au combat
- Parfait pour maximiser les gains d'exploration

**Fichiers**:
- `backend/src/main.rs` (payloads, handlers attack & expedition)
- `frontend/src/components/AttackModal.tsx` (UI transporteurs + cargo)
- `frontend/src/components/ExpeditionZone.tsx` (UI recycleurs)
- `frontend/src/App.tsx` (handlers mis à jour)

---

#### ⏱️ Refonte calcul temps de vol

**Problème**: Voyage galaxie 1→2 prenait seulement 15 secondes (irréaliste)

**Solution**: Nouvelle formule tiered par distance
- **Même système** (< 1000): ~30s à 2 minutes
- **Même galaxie** (1000-10000): ~5-15 minutes
- **Galaxies différentes** (> 10000): ~30 minutes à 1h+

**Exemple concret** (avec SPEED_FACTOR=500):
- Galaxie 1→2: **15s → ~35 minutes**
- Système différent: ~8-12 minutes
- Position adjacente: ~45-90 secondes

**Formule**:
```rust
let base_time = if dist < 1000.0 {
    dist / 10.0 + 30.0
} else if dist < 10000.0 {
    dist / 5.0 + 200.0
} else {
    dist / 2.0 + 500.0
};
let seconds = (base_time * 100.0) / speed_factor;
```

**Fichier**: `backend/src/game_logic.rs` (fonction `calculate_flight_time`)

---

#### ⚡ Énergie minimale nouvelles planètes

**Problème**: Les nouvelles planètes (colonie + première planète) n'avaient pas assez d'énergie pour faire fonctionner les mines de base

**Solution**:
- **Solar Plant niveau 3** par défaut (~240 énergie produite)
- Garantit un minimum de 150 énergie disponible
- Consommation 3 mines niveau 1: ~44 énergie
- Ratio énergétique optimal dès le départ (100%)

**Fichiers**:
- `backend/src/main.rs` (création colonie)
- `backend/src/auth.rs` (création première planète)

---

#### 🎯 Expéditions - compteurs par défaut

**Problème**: Les compteurs de vaisseaux commençaient à 1, causant des lancements accidentels

**Solution**:
- Tous les compteurs démarrent à **0** par défaut
- Chasseurs, croiseurs et recycleurs à 0
- L'utilisateur doit explicitement sélectionner ses vaisseaux
- Évite les lancements d'expédition involontaires

**Fichier**: `frontend/src/components/ExpeditionZone.tsx`

---

#### 🌍 Transport de ressources lors colonisation

**Feature**: Possibilité d'envoyer des ressources avec le vaisseau de colonisation

**Nouvelle interface**:
- Modal de sélection des ressources au lieu de colonisation directe
- Sliders pour choisir métal, cristal et deutérium à transporter
- Affichage des ressources disponibles sur la planète d'origine
- Calcul en temps réel des ressources totales à l'arrivée :
  - **500 métal** (base) + métal transporté
  - **500 cristal** (base) + cristal transporté
  - **0 deutérium** (base) + deutérium transporté
- Validation des montants (ne peut pas dépasser les ressources disponibles)

**Impact**: Les nouvelles colonies peuvent démarrer avec bien plus de ressources, accélérant leur développement initial

**Fichiers**:
- `frontend/src/components/ColonizeModal.tsx` (nouveau composant modal)
- `frontend/src/components/GalaxyView.tsx` (intégration du modal)
- `backend/src/main.rs` (handler colonize déjà prêt)

---

#### 📦 Hangar à Ressources + Caps de stockage

**Feature**: Nouveau bâtiment infrastructure avec système de caps exponentiels

**Fonctionnement**:
- **Niveau 0 (base)**: 600 000 unités de stockage par ressource
- **Niveau 1**: 960 000 (600k × 1.6)
- **Niveau 2**: 1 536 000 (600k × 1.6²)
- **Niveau 3**: 2 457 600 (600k × 1.6³)
- Formule: `600 000 × 1.6^niveau`

**Coûts de construction**:
- Métal: 1000 × 2^niveau
- Cristal: 500 × 2^niveau
- Deutérium: 0
- Multiplicateur exponentiel (x2 par niveau comme autres infrastructures)

**Interface utilisateur**:
- Nouveau bâtiment dans l'onglet Installations (thème jaune)
- Barre de progression dans EmpireBar montrant remplissage actuel/max
- Code couleur: vert < 75%, orange 75-90%, jaune > 90%
- Animation pulse sur l'icône quand proche de la limite (>90%)
- Tooltip détaillé: "Stockage: 450k / 600k (75%)"

**Protection production (SOFT CAP)**:
- **IMPORTANT** : Les ressources existantes ne sont JAMAIS réduites (protection des joueurs)
- Si ressources < cap : production normale plafonnée au cap
- Si ressources >= cap : production ARRÊTÉE (garde les ressources actuelles)
- Permet de dépenser au-dessus du cap, mais pas de produire plus
- Encourage l'upgrade du Hangar pour reprendre la production
- **Exemple** : Joueur avec 2M métal et cap 600k → garde 2M, mais ne produit plus jusqu'à upgrade hangar

**Fichiers backend**:
- `backend/migration/src/m20260120_000001_add_resource_storage.rs` (nouvelle migration)
- `backend/src/entities/planet.rs` (champ `resource_storage_level`)
- `backend/src/game_logic.rs` (fonction `get_storage_capacity()`, coûts, caps)
- `backend/src/main.rs` (handlers upgrade & completion, validation caps)

**Fichiers frontend**:
- `frontend/src/components/Facilities.tsx` (UI bâtiment)
- `frontend/src/components/EmpireBar.tsx` (affichage caps avec barre)
- `frontend/src/components/PlanetOverview.tsx` (label)

---

#### 🚚 Bouton Ravitailler dans Mes Planètes

**Feature**: Accès rapide au transport de ressources depuis la page Mes Planètes

**Fonctionnement**:
- Nouveau bouton "Ravitailler" à côté de "Naviguer" sur chaque planète
- Visible uniquement sur les planètes qui ne sont pas la planète actuelle
- Click ouvre directement le modal de transport avec la planète sélectionnée
- Utilise le système de transport existant (transporteurs)
- Design cohérent avec le thème logistique (vert émeraude)

**Amélioration UX**:
- Plus besoin d'aller dans la galaxie pour ravitailler une colonie
- Accès direct depuis la page de gestion des planètes
- Workflow simplifié: Mes Planètes → Ravitailler → Envoyer ressources

**Fichiers**:
- `frontend/src/components/MyPlanets.tsx` (UI + callback)
- `frontend/src/App.tsx` (passage du callback onNavigateTransport)

---

### 📝 Notes techniques

**Capacité cargo combat**:
```rust
// Capacité totale = vaisseaux survivants uniquement
let total_cargo = (surviving_hunters * 50.0)
                + (surviving_cruisers * 800.0)
                + (transporters * 10000.0);

// Butin limité par cargo
if potential_loot > total_cargo {
    loot = potential_loot * (total_cargo / potential_loot);
}
```

**Bonus recycleurs expédition**:
```rust
let recycler_bonus = 1.0 + (recyclers as f64 * 2.0);
let metal = base_metal * recycler_bonus * speed_factor;
```

---

### 🚀 Déploiement

**Migrations**: Aucune (modifications logique gameplay uniquement)

**Redémarrage**: Backend + Frontend recommandé

**Tests recommandés**:
1. ✅ Attaque avec peu de vaisseaux → vérifier cargo insuffisant
2. ✅ Attaque avec transporteurs → cargo augmenté, butin maximum
3. ✅ Expédition avec recycleurs → gains x2+
4. ✅ Transport galaxies → vérifier temps réaliste (~30min+)
5. ✅ Nouvelle colonie → vérifier 150+ énergie disponible
6. ✅ Expéditions → compteurs démarrent à 0

---

### 📦 Fichiers modifiés (15 fichiers)

#### Backend (6 fichiers)
- ✏️ `backend/src/game_logic.rs` - Cargo capacity, flight time, storage capacity, resource caps
- ✏️ `backend/src/main.rs` - Attack/expedition handlers, colonization, resource_storage upgrade/completion
- ✏️ `backend/src/auth.rs` - Solar plant level 3 for first planet
- ✏️ `backend/src/missions.rs` - Dynamic speed_factor in response
- ✏️ `backend/src/entities/planet.rs` - Field resource_storage_level
- ➕ `backend/migration/src/m20260120_000001_add_resource_storage.rs` - NEW: Migration resource storage
- ✏️ `backend/migration/src/lib.rs` - Register new migration

#### Frontend (8 fichiers)
- ✏️ `frontend/src/components/AttackModal.tsx` - Transporters selection + cargo display
- ✏️ `frontend/src/components/ExpeditionZone.tsx` - Recyclers selection + defaults to 0
- ✏️ `frontend/src/components/GalaxyView.tsx` - Colonization modal integration
- ✏️ `frontend/src/App.tsx` - Updated handlers, transport callback to MyPlanets
- ➕ `frontend/src/components/ColonizeModal.tsx` - NEW: Resource selection modal for colonization
- ✏️ `frontend/src/components/Facilities.tsx` - Resource storage building UI
- ✏️ `frontend/src/components/EmpireBar.tsx` - Storage caps display with progress bar
- ✏️ `frontend/src/components/PlanetOverview.tsx` - Resource storage label
- ✏️ `frontend/src/components/MyPlanets.tsx` - Supply button to transport resources

---

**Commits**: `d6c52ba`, `978e447`, `a0a444a`, `21fdcee`
**Branche**: `claude/fix-websocket-error-7nGya`

---

## [2.0.4] - 2026-01-19 - Page Mes Planètes et corrections UI

### ✨ Nouvelles Fonctionnalités

#### Page "Mes Planètes"
- Nouvelle page accessible depuis la sidebar (catégorie COMMANDEMENT)
- Liste détaillée de toutes les planètes du joueur avec :
  - Ressources actuelles (métal, cristal, deutérium)
  - Niveaux des bâtiments (mines, chantier, labo, hangar)
  - Composition de la flotte et défenses
  - Score de chaque planète
- Vue extensible avec détails de la flotte au clic
- Navigation rapide vers n'importe quelle planète
- Statistiques globales de l'empire (planètes, flotte totale, défenses, score)
- Design cohérent avec le reste du jeu (cards dynamiques, animations)

### 🔧 Corrections

#### Card Baie de Stationnement (PlanetOverview)
- Remplacement des emojis par des icônes Lucide :
  - Chasseurs Légers : Target (rouge)
  - Croiseurs : Ship (violet)
  - Recycleurs : Recycle (vert)
  - Sondes : Satellite (cyan)
  - Vaisseaux Colons : Globe (émeraude)
  - Transporteurs : Truck (ambre)
- Badges de statut également mis à jour (icônes au lieu d'emojis)

#### Paramètres - Calcul "Commandant depuis X jours"
- Correction du bug qui affichait ~20472 jours au lieu de la vraie durée
- Cause : le paramètre `viewer_id` n'était pas passé à l'API, retournant `null`
- Solution : ajout de `viewer_id` dans l'appel API et validation null-safe

---

## [2.0.3] - 2026-01-19 - Corrections combat, transport et alertes attaque

### 🔧 Corrections Backend

#### Correction bug de pillage (ressources surévaluées)
- **resolve_attack_mission** : Utilisation de `calculate_resources_with_energy` au lieu de `calculate_resources`
  - Le calcul des ressources du défenseur prend maintenant en compte le ratio énergétique
  - Avant : Les ressources étaient calculées à 100% d'efficacité (sans ratio énergie)
  - Après : Les ressources sont calculées avec le ratio énergétique réel
  - Résultat : Le pillage correspond maintenant aux ressources réellement disponibles

#### Amélioration des missions entrantes
- Les missions entrantes (attaques) contiennent maintenant les infos sur l'attaquant :
  - Nom de la planète source (`source_name`)
  - Coordonnées de la source (`source_coords`)
  - Nom du joueur attaquant (`attacker_name`)

### 🔧 Corrections Frontend

#### Temps de vol Transport
- **TransportModal.tsx** : Calcul du temps de vol corrigé
  - Utilisation de la formule identique au backend (distance 3D + SPEED_FACTOR)
  - Le temps affiché après envoi utilise maintenant le temps réel du backend
  - Coordonnées complètes (galaxy, system, position) transmises pour le calcul

#### Capacité Transporteur
- **Shipyard.tsx** : Correction de l'affichage de la capacité cargo
  - Avant : 5000 (incorrect)
  - Après : 10000 (+5%/niveau hangar) - correspond au backend

### 🚨 Alertes Attaque

#### Système de notification des attaques entrantes
- **PlanetOverview.tsx** : Nouveau système d'alertes
  - Toast d'urgence quand une attaque entrante est détectée
  - Son d'alerte joué automatiquement (`/sounds/alert.wav`)
  - Affichage amélioré des missions entrantes :
    - Nom de l'attaquant
    - Coordonnées d'origine
    - Timer avec barre de progression
    - Style visuel d'urgence (rouge pulsant)
  - Les alertes ne sont déclenchées qu'une fois par mission

---

## [2.0.2] - 2026-01-19 - Harmonisation calcul production (tous les slots)

### 🔧 Corrections

#### Harmonisation complète des calculs de production
- **Tous les composants** utilisent maintenant TOUS les slots pour le calcul de production
  - EmpireBar, PlanetOverview, ProductionStats, ResourceDisplay : calcul identique
  - Suppression du filtrage `>= 5` dans le calcul de production
  - L'affichage des "Slots Bonus" dans ResourceDisplay reste filtré sur les slots 5-8

---

## [2.0.1] - 2026-01-19 - Corrections UI/UX et Graphiques Statistiques

### 🔧 Corrections

#### Harmonisation des calculs de production
- **ResourceDisplay.tsx** : Correction du calcul du ratio énergétique
  - Utilisation cohérente de `planet.energy_ratio` du backend
  - Les calculs sont maintenant identiques entre `EmpireBar`, `ResourceDisplay`, `ProductionStats` et `PlanetOverview`

#### Correction CombatModal (Rapports)
- Résolution du problème de masquage du contenu
- Meilleure structure de layout avec scroll interne
- Bouton "Archiver le rapport" fixé en bas, toujours visible
- Amélioration du responsive design pour mobile
- Logs de combat avec scroll dédié (max 200px)

### 🎨 Améliorations Design

#### Refonte cards PlanetOverview (style Réseau Électrique)
- **Infrastructures** : 
  - Nouveau design avec effets de fond lumineux
  - Icônes colorées avec bordures assorties
  - Barre de niveau d'industrialisation global
  
- **Hangar (Baie de Stationnement)** :
  - Design immersif avec jauges animées style voltmètre
  - Indicateur de capacité avec glow dynamique
  - Grille des vaisseaux avec icônes emoji
  - Alertes visuelles si hangar plein
  
- **Défenses planétaires (Bouclier Orbital)** :
  - Barres verticales style voltmètre pour missiles/plasma
  - Indicateur de puissance défensive
  - Stats dégâts/round et points coque
  - Alerte si planète vulnérable

#### Réduction des glows blancs excessifs
- Remplacement des effets `via-white/30` par des couleurs adaptées
- Shimmer effects plus subtils (`via-indigo-400/15`)
- Meilleure lisibilité générale

### 📊 Nouveaux graphiques (ProductionStats)

**Installation de Recharts** pour des visualisations vibrantes :

- **Projection 24h (AreaChart)** :
  - Graphique d'aire avec dégradés colorés
  - Affichage à 6h, 12h, 18h, 24h
  - Tooltips personnalisés style sci-fi
  
- **Répartition production (PieChart)** :
  - Camembert avec trou central
  - Couleurs métal/cristal/deutérium
  
- **Taux de victoire (PieChart)** :
  - Graphique victoires/défaites
  - Pourcentage central animé
  
- **Pillage total (BarChart)** :
  - Barres colorées par ressource
  - Formatage automatique k/M

### 📦 Dépendances ajoutées
- `recharts` : Librairie de graphiques React

---

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
