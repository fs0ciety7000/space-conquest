# Audit SEO — gm-monsyndic.be
**Date :** 13 mars 2026  
**Auditeur :** Nicolas Dessenius
**Cible :** Grace Moucheron — GM Mon Syndic, syndic de copropriété, 
**Score global estimé : 28 / 100**

---

## Résumé exécutif

Le site `gm-monsyndic.be` est un site WordPress récent (janvier 2026), propre techniquement et au contenu de qualité, mais **totalement invisible sur Google**. Il n'apparaît sur aucune requête liée au secteur du syndic en Belgique francophone. Le problème principal n'est pas une faute technique bloquante, mais la combinaison de trois facteurs : un domaine sans autorité (âge < 3 mois), une optimisation sémantique inexistante (Yoast installé mais non configuré), et une absence totale de signaux de confiance externe (backlinks, Google Business Profile, avis clients).

Le potentiel est réel : la niche locale "syndic Hainaut / Mons" est peu concurrentielle, le profil de Grace Moucheron (IPI 517.653, assurance AXA, parcours professionnel sérieux) offre d'excellents atouts E-E-A-T, et l'infrastructure technique (WordPress + Yoast + Bricks Builder) est solide. Des actions simples et rapides peuvent produire des résultats visibles en 2 à 4 mois.

---

## 1. État des lieux technique

### 1.1 Points positifs

| Élément | Statut | Détail |
|---|---|---|
| HTTPS | ✅ OK | Certificat SSL actif |
| Robots.txt | ✅ OK | Aucun blocage de crawl — seules les routes REST API sont exclues (standard WordPress) |
| Sitemap XML | ✅ OK | `sitemap_index.xml` valide, déclaré dans robots.txt, généré par Yoast SEO |
| Structure de navigation | ✅ OK | Menu principal plat : Mes services / À propos / Me contacter |
| Pages légales | ✅ OK | Mentions légales et politique de confidentialité présentes et indexées |
| Contenu IPI / assurance | ✅ OK | Numéro IPI 517.653 et police AXA visibles en pied de page |

### 1.2 Problèmes critiques

#### Domaine non indexé par Google
La commande `site:gm-monsyndic.be` ne retourne aucun résultat dans Google. Le site n'est jamais apparu dans les SERP. Cause probable : domaine trop jeune (créé le 21/01/2026) et aucune soumission à Google Search Console effectuée. Sans GSC, Google n'est pas notifié de l'existence du sitemap.

**Action :** Créer la propriété dans Google Search Console, soumettre le sitemap, et demander l'indexation manuelle des pages principales.

#### Images rendues en SVG vide — contenu invisible au crawl
Toutes les images du site (photo de Grace Moucheron, visuels de services, bannières) sont rendues par Bricks Builder sous forme de `data:image/svg+xml` inline vides. Google voit des SVG sans contenu ni texte alternatif. La photo de Grace — signal E-E-A-T majeur — est totalement absente de l'index.

**Action :** Dans Bricks Builder, désactiver le rendu SVG lazy-load ou utiliser des balises `<img>` standards avec attribut `alt` renseigné.

#### Yoast SEO installé mais non configuré
Aucune page du site n'a de `<title>` optimisé ni de meta description renseignée. Les titres actuels sont :
- Accueil : `"Accueil"`
- Services : `"Mes services"`
- À propos : `"A propos"`

Ces titres ne contiennent aucun mot-clé prioritaire (syndic, copropriété, Hainaut, Mons).

**Action :** Configurer Yoast sur chaque page — voir section 4 pour les valeurs recommandées.

#### Page /sample-page/ indexée
La page WordPress par défaut `/sample-page/` est présente dans le sitemap et sera indexée. Son contenu générique signale un site non finalisé à Google et dilue la pertinence du domaine.

**Action :** Mettre en `noindex` via Yoast et retirer du sitemap.

### 1.3 Problèmes modérés

- **Espace client hébergé sur un sous-domaine externe** (`grace4402.optipro-alpha.be`) : aucune valeur SEO transmise, lien sortant vers un domaine tiers peu lisible pour l'utilisateur.
- **Aucun balisage schema.org** : pas de `LocalBusiness`, `RealEstateAgent` ni `FAQPage`. Les rich snippets (adresse, étoiles, téléphone dans les SERP) sont impossibles sans données structurées.
- **Domaine très jeune (< 3 mois)** : Google accorde peu d'autorité aux nouveaux domaines. Un délai de confiance ("sandbox") de 3 à 6 mois est normal même avec un contenu parfait.

---

## 2. Analyse du contenu et sémantique

### 2.1 Inventaire des pages (sitemap)

| URL | Dernière modif. | Statut SEO |
|---|---|---|
| `/` | 13/03/2026 | Title non optimisé, H1 générique |
| `/mes-services/` | 05/03/2026 | Contenu trop court, mots-clés absents des balises |
| `/a-propos/` | 13/03/2026 | Bonne page E-E-A-T, sous-exploitée |
| `/me-contacter/` | 13/03/2026 | Page correcte |
| `/commande/` | 12/03/2026 | Utile opérationnellement, peu de valeur SEO |
| `/mentions-legales/` | 13/03/2026 | OK — à mettre en noindex |
| `/privacy-policy/` | 13/03/2026 | OK — à mettre en noindex |
| `/sample-page/` | 21/01/2026 | **À supprimer du sitemap et mettre en noindex** |

### 2.2 Problèmes de contenu

**Texte insuffisant par page.** Chaque page contient moins de 300 mots de contenu visible. Google considère 600 à 800 mots comme un minimum pour positionner une page de service sur des mots-clés compétitifs. La page `/mes-services/` est la plus pénalisée : malgré une bonne structure (3 sections : administrative, comptable, technique), le texte par section est trop condensé.

**Mots-clés absents des balises structurantes.** Les mots "syndic", "copropriété", "Hainaut" et "Mons" apparaissent dans le corps du texte mais jamais dans les H1, H2, title ou meta description. Les robots d'indexation s'appuient en priorité sur ces balises pour comprendre la thématique d'une page.

**Aucun blog ni contenu informationnel.** Le `post-sitemap.xml` est vide. Sans articles, le site ne peut pas capter le trafic des requêtes informationnelles — qui représentent généralement 60 à 70% du volume de recherche dans ce secteur (ex : "que fait un syndic en Belgique", "comment changer de syndic", "obligations légales copropriété").

**Point fort à exploiter : la page "À propos".** La présentation de Grace Moucheron (parcours, IPI, assurance, philosophie) est un excellent contenu E-E-A-T. Il faut enrichir cette page et s'en inspirer pour renforcer la crédibilité sur les autres pages.

### 2.3 Mots-clés cibles recommandés

#### Requêtes locales (priorité haute — concurrence faible)

| Mot-clé | Volume estimé (BE fr.) | Difficulté | Stratégie |
|---|---|---|---|
| syndic copropriété Hainaut | ~90/mois | Faible | Page d'accueil + page dédiée |
| syndic immeuble Mons | ~50/mois | Faible | Page dédiée /syndic-mons/ |
| gestion copropriété Hainaut | ~30/mois | Faible | Page services enrichie |
| syndic professionnel IPI Belgique | ~20/mois | Faible | Page à propos enrichie |

#### Requêtes nationales (priorité moyenne — concurrence modérée)

| Mot-clé | Volume estimé (BE fr.) | Difficulté | Stratégie |
|---|---|---|---|
| changer de syndic Belgique | ~150/mois | Moyen | Article de blog |
| assemblée générale copropriété | ~200/mois | Moyen | Article de blog |
| obligations syndic Belgique | ~120/mois | Moyen | Article de blog |

#### Requêtes nationales compétitives (long terme uniquement)

| Mot-clé | Volume estimé (BE fr.) | Difficulté | Stratégie |
|---|---|---|---|
| syndic copropriété Belgique | ~400/mois | Élevée | Long terme (6-12 mois) |

---

## 3. Autorité de domaine et Local SEO

### 3.1 Autorité (Domain Authority)

**DA estimé : ~0.** Le domaine a été créé en janvier 2026 et aucun backlink entrant n'est détectable depuis des sources tierces. Sans liens entrants de qualité, Google n'accorde aucune autorité au domaine, ce qui limite mécaniquement la capacité des pages à se positionner — même sur des mots-clés peu concurrentiels.

### 3.2 Présence dans les annuaires sectoriels

Le site est **absent de tous les annuaires belges de référence** pour le secteur syndic :

| Annuaire | Autorité | Statut |
|---|---|---|
| ipi.be (répertoire officiel IPI) | Très élevée | ❌ Absent |
| choisirunsyndic.be | Élevée | ❌ Absent |
| pagesdor.be | Élevée | ❌ Absent |
| snpc.be | Élevée | ❌ Absent |
| immobilierhainaut.be | Moyenne | ❌ Absent |

Chaque inscription dans ces annuaires génère un backlink thématique de qualité et une **citation NAP** (Nom, Adresse, Téléphone) cohérente — signal essentiel pour le référencement local.

### 3.3 Google Business Profile

Aucune fiche Google Business Profile n'est trouvable pour "GM Mon Syndic" ou "Grace Moucheron syndic Hainaut". Sans GBP, le site est **invisible dans Google Maps et dans le Local Pack** (les 3 fiches qui apparaissent en haut des résultats pour les requêtes géolocalisées). Pour un syndic de proximité, le Local Pack est souvent la première source de leads — avant même le référencement organique classique.

### 3.4 Avis clients

Zéro avis Google, Trustpilot ou autre plateforme détectée. Les concurrents directs affichent :
- `mons-syndic.be` : plusieurs avis positifs sur Google
- `easysyndic.be` : dizaines d'avis 5 étoiles
- `gemmonsyndic.fr` (France) : nombreux avis récents et détaillés

Les avis sont un signal E-E-A-T fort et influencent directement le taux de clic (CTR) dans les résultats de recherche.

### 3.5 Concurrents locaux positionnés

| Concurrent | Zone | Forces SEO |
|---|---|---|
| mons-syndic.be | Saint-Symphorien (Mons) | Bien indexé, avis positifs, ancien domaine |
| easysyndic.be | National Belgique | Blog actif, fort contenu, backlinks nombreux |
| maxi-immo.be/syndic | Mons | Liste géographique détaillée, bien positionné localement |
| bsgsi.be | Charleroi / Hainaut | Blog régulier, contenu juridique de qualité |

---

## 4. Balises recommandées — à implémenter dans Yoast

### Page d'accueil (/)
- **Title :** `Syndic de copropriété dans le Hainaut | GM Mon Syndic – IPI 517.653`
- **Meta description :** `Grace Moucheron, syndic professionnel agréé IPI à Havré (Mons). Gestion administrative, comptable et technique de votre copropriété dans le Hainaut. Proximité, transparence et rigueur.`
- **H1 :** `Syndic de copropriété dans le Hainaut`

### Page Mes services (/mes-services/)
- **Title :** `Gestion de copropriété à Mons et en Hainaut | GM Mon Syndic`
- **Meta description :** `Services de syndic professionnel : gestion administrative, comptable et technique. Assemblées générales, comptabilité, suivi des travaux. Zone : Mons, Hainaut, Belgique.`
- **H1 :** `Gestion de copropriété sur mesure à Mons et en Hainaut`

### Page À propos (/a-propos/)
- **Title :** `Grace Moucheron – Syndic professionnel agréé IPI | GM Mon Syndic`
- **Meta description :** `Syndic d'immeuble agréée IPI n°517.653, basée à Havré (Mons). Une approche fondée sur la rigueur, la transparence et la proximité avec les copropriétaires du Hainaut.`
- **H1 :** `Grace Moucheron – Votre syndic professionnel dans le Hainaut`

### Page Me contacter (/me-contacter/)
- **Title :** `Contacter GM Mon Syndic – Syndic à Mons, Hainaut`
- **Meta description :** `Prenez contact avec Grace Moucheron, syndic professionnel à Havré (Mons). Téléphone : +32 492 83 80 82 – Email : info@gm-monsyndic.be`

---

## 5. Plan d'action priorisé

### Semaine 1 — Blockers critiques (P0)

1. **Google Search Console** — Créer la propriété, vérifier via DNS ou balise meta, soumettre `https://gm-monsyndic.be/sitemap_index.xml`, demander l'indexation manuelle de /, /mes-services/, /a-propos/, /me-contacter/.

2. **Yoast SEO — title tags et meta descriptions** — Renseigner les valeurs du tableau section 4 sur chaque page. Durée estimée : 1 heure.

3. **Supprimer /sample-page/** — Via Yoast → Réglages avancés → `noindex`, puis la retirer du sitemap. Option alternative : supprimer la page définitivement.

4. **Corriger le rendu des images** — Dans Bricks Builder, s'assurer que les images sont servies en `<img>` standard avec attribut `alt` descriptif. La photo de Grace Moucheron doit notamment être crawlable (alt : "Grace Moucheron, syndic professionnel IPI Hainaut").

5. **Pages légales en noindex** — Mettre `/mentions-legales/` et `/privacy-policy/` en noindex via Yoast (elles n'ont pas vocation à être positionnées).

### Mois 1-2 — Local SEO et autorité (P1)

6. **Créer la fiche Google Business Profile** — Catégorie : "Administrateur de biens" ou "Agent immobilier". Adresse : Havré, Mons. Description avec mots-clés. Photos professionnelles. Horaires. Lien vers le site. C'est le levier local SEO n°1.

7. **S'inscrire dans les annuaires sectoriels** — Par ordre de priorité : ipi.be, choisirunsyndic.be, pagesdor.be, snpc.be, immobilierhainaut.be. Assurer la cohérence NAP (même nom, adresse, téléphone partout).

8. **Balisage schema.org LocalBusiness** — Via Yoast Premium ou un plugin dédié (ex. Schema Pro). Inclure : `name`, `address`, `telephone`, `email`, `areaServed` (Hainaut, Mons), `hasCredential` (IPI 517.653), `memberOf` (IPI).

9. **Retravailler les H1/H2 avec les mots-clés géolocalisés** — Voir section 4 pour les valeurs exactes.

10. **Enrichir le contenu des pages services** — Passer chaque section (administrative, comptable, technique) de ~80 mots à ~250 mots en incluant naturellement les mots-clés cibles.

### Mois 3-6 — Contenu et notoriété (P2)

11. **Lancer un blog avec 4 à 6 articles cibles**
    - *"Comment changer de syndic en Belgique : guide étape par étape"*
    - *"Obligations légales du syndic en copropriété belge (2026)"*
    - *"Que se passe-t-il lors d'une assemblée générale de copropriété ?"*
    - *"Syndic professionnel vs syndic bénévole : quelles différences ?"*
    - *"Gestion de copropriété dans le Hainaut : ce que vous devez savoir"*

12. **Créer des pages locales dédiées** — `/syndic-mons/`, `/syndic-hainaut/`, `/syndic-havre/`. Pages courtes (400 mots) mais hyper-localisées. Concurrence quasi nulle sur ces requêtes.

13. **Collecter des avis Google** — Envoyer un email aux copropriétaires actuels avec lien direct vers la fiche GBP. Objectif : 5 à 10 avis en 3 mois. Intégrer un widget d'avis sur la page d'accueil.

14. **Présence sur les réseaux sociaux** — Créer au minimum un profil LinkedIn pour Grace Moucheron et une page Facebook professionnelle. Lier ces profils depuis le site. Signaux de marque pris en compte par Google.

---

## 6. Bilan et projection

### Sans actions : situation actuelle à 6 mois
Le site continuera à être invisible. Le domaine gagnera lentement en autorité avec le temps, mais sans contenu optimisé ni backlinks, aucun positionnement significatif ne sera atteint.

### Avec les actions P0 + P1 : situation estimée à 3 mois
- Site indexé sur les requêtes de marque ("GM Mon Syndic", "Grace Moucheron syndic")
- Apparition dans Google Maps et le Local Pack pour "syndic Mons" et "syndic Hainaut"
- Premières positions sur les requêtes longue traîne locales (faible concurrence)

### Avec les actions P0 + P1 + P2 : situation estimée à 6 mois
- Positions 3-10 sur "syndic copropriété Hainaut", "syndic immeuble Mons"
- Trafic organique estimé : 50 à 150 visites/mois
- Génération des premiers leads organiques (formulaire de contact)

---

## Annexe — Informations techniques du site

| Paramètre | Valeur |
|---|---|
| CMS | WordPress |
| Constructeur | Bricks Builder |
| SEO Plugin | Yoast SEO |
| Domaine créé | ~21 janvier 2026 |
| HTTPS | Oui |
| Sitemap | `https://gm-monsyndic.be/sitemap_index.xml` |
| Pages indexées (sitemap) | 8 |
| Articles de blog | 0 |
| Numéro IPI | 517.653 |
| Numéro BCE | 0663.875.126 |
| Adresse | Havré (Mons), Hainaut, Belgique |
| Téléphone | +32 492 83 80 82 |
| Email | info@gm-monsyndic.be |

---

*Rapport généré le 13 mars 2026 — Données basées sur l'analyse SERP, le contenu public du site, et les signaux de visibilité externe. Les volumes de recherche sont des estimations pour la Belgique francophone.*