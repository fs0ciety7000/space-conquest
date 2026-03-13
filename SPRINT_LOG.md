# Space Conquest — Sprint Log
Dernière mise à jour : 2026-03-13

---

## Sprint 1 — Critique (En cours)

| #  | Tâche                                                         | Fichier(s)                                                          | Effort  | Statut      |
|----|---------------------------------------------------------------|---------------------------------------------------------------------|---------|-------------|
| C1 | Activer `is_attack_allowed_by_points` dans `validate_attack` — protection anti-farm par ratio de points | `backend/src/main.rs` ou `backend/src/handlers/fleet.rs` (protection.rs branché) | 30 min  | En cours |
| C2 | Ajouter mission de type "deploy" / fleet save — vaisseaux maintenus en transit jusqu'à rappel joueur | `backend/src/handlers/fleet.rs`, `backend/src/tick_system.rs`       | 1 jour  | En cours |
| C3 | Implémenter les bonus d'officiers dans tick et combat — les officiers ne sont actuellement que cosmétiques | `backend/src/officers.rs`, `backend/src/tick_system.rs`, `backend/src/combat.rs` | 1 jour  | En cours |
| C4 | Corriger les descriptions de techs mensongères pour 6 techs (`plasma_tech`, `computer_tech`, `laser_tech`, `hyperspace_tech`, `ion_tech`, `graviton_tech`) | `frontend/src/components/TechTreeVisual.tsx`                        | 2h      | En cours |
| C5 | Masquer les 5 bâtiments fantômes sans effet (`nanite_factory`, `terraformer`, `alliance_depot`, `missile_silo`, `fusion_plant` partiel) via `is_available=false` en DB | AdminContentManager / table `building_type` en DB                  | 2h      | En cours |
| C6 | Corriger le mapping tech dans Shipyard.tsx — remplacer `laser_tech` par `weapons_tech` et `energy_tech` par `shield_tech` pour les bonus d'attaque et de bouclier | `frontend/src/components/Shipyard.tsx` (lignes 99-100)              | 30 min  | En cours |
| C7 | Afficher les champs de débris dans GalaxyView et ajouter l'option "Envoyer recycleurs" dans RadialMenu | `frontend/src/components/GalaxyView.tsx`, `frontend/src/components/RadialMenu.tsx` | 4h      | En cours |
| C8 | Protéger contre l'integer overflow sur le calcul du coût total de flotte (cast i64 ou checked_mul) | `backend/src/handlers/shipyard.rs` (lignes 658-660)                 | 30 min  | En cours |

---

## Sprint 2 — Haute Priorité (En cours)

| #   | Tâche                                                                                                         | Fichier(s)                                                                                   | Effort  | Statut      |
|-----|---------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|---------|-------------|
| H1  | Déplacer le recalcul des scores utilisateur d'un intervalle 2s vers 5 minutes minimum pour réduire la charge DB | `backend/src/tick_system.rs` (`update_all_user_points`)                                      | 2h      | En cours |
| H2  | Fusionner les deux systèmes de coûts de bâtiments — faire lire `get_upgrade_cost()` depuis la table `building_type` en DB plutôt que le `match` hardcodé | `backend/src/game_logic.rs` (lignes 364-490), table `building_type`                          | 2 jours | En cours |
| H4  | Brancher `laser_tech` (vitesse) et `hyperspace_tech` dans fleet v5 — actuellement jamais lus par `attack_v2` | `backend/src/handlers/fleet.rs` (lignes 1180-1182)                                           | 4h      | En cours |
| H5  | Récupérer le `speed_factor` depuis la config serveur dans FleetDispatcher — la valeur 500 hardcodée fausse l'ETA affiché | `frontend/src/components/FleetDispatcher.tsx` (ligne 114)                                    | 1h      | A revoir — speed_factor supprime, ETA a recalculer sans config globale |
| H6  | Ajouter une modale de confirmation avant lancement d'attaque dans FleetDispatcher — action actuellement irréversible sans avertissement | `frontend/src/components/FleetDispatcher.tsx`                                                | 1h      | En cours |
| H7  | Réduire le seuil d'accès au Marché Noir (Esp ≥ 8, Comp ≥ 6) et ajouter des sources de Syndicate Credits (daily missions, streak, victoires PvP) | `backend/src/black_market.rs`, `backend/src/missions.rs`                                     | 4h      | En cours |
| H8  | Passer la Fusion Plant en formule exponentielle (`base * level * 1.2^level`) pour en faire un sink de deutérium viable | `backend/src/game_logic.rs` (`calculate_fusion_energy`)                                      | 30 min  | En cours |
| H9  | Corriger le déséquilibre de la Crystal Mine — passer le facteur d'exponentiation de 1.6 à 1.5 ou augmenter la production de base de 20 à 22 | `backend/src/game_logic.rs`                                                                  | 30 min  | En cours |
| H10 | Réduire le `category_factor` d'Astrophysics de 2.5 à 1.8 pour débloquer l'expansion multi-planètes plus tôt | `backend/src/game_logic.rs`                                                                  | 30 min  | En cours |
| H11 | Intégrer `apply_storage_cap` dans le tick et le lazy eval — les ressources s'accumulent actuellement au-delà du cap silencieusement | `backend/src/tick_system.rs`, `backend/src/handlers/shipyard.rs`                             | 2h      | En cours |
| H12 | Créer la vue "Flottes en transit" avec ETA en temps réel pour toutes les missions actives (attaque, transport, expédition, recyclage) | `frontend/src/components/ActiveMissions.tsx` (nouveau composant)                             | 1 jour  | En cours |
| H13 | Ajouter `React.memo` sur les composants lourds pour éviter les re-renders complets sur chaque poll | `frontend/src/components/Shipyard.tsx`, `Defenses.tsx`, `Facilities.tsx`, `TechTree.tsx`     | 4h      | En cours |
| H14 | Remplacer la table statique hardcodée de Rapid Fire pour l'évaluation de menace spy par une lecture depuis la table `rapid_fire_rule` en DB | `backend/src/game_logic.rs` (lignes 793-799)                                                 | 2h      | En cours |
| H15 | Unifier le bonus de vitesse `hyperspace_tech` — 15% dans fleet.rs vs 10% dans trade_routes.rs — choisir une valeur canonique et l'appliquer partout | `backend/src/handlers/fleet.rs` (ligne 312), `backend/src/trade_routes.rs` (ligne 84)        | 1h      | En cours |
| H16 | Corriger la valeur de base de la mine de deutérium dans le frontend de 10 à 15 pour correspondre au backend | `frontend/src/components/ResourceDisplay.tsx`                                                | 30 min  | En cours |

---

## Décisions Architecturales

| Date       | Décision                                      | Impact                                                                                                   |
|------------|-----------------------------------------------|----------------------------------------------------------------------------------------------------------|
| 2026-03-13 | Speed Factor supprimé du jeu                  | Le multiplicateur global `speedFactor`/`speed_factor` est eliminé. L'ETA des flottes repose uniquement sur le champ `speed` par vaisseau dans `ship_type` + bonus `hyperspace_tech`. H5 marqué "A revoir" — l'implémentation frontend agent (fetch `/config`) est incorrecte, à corriger après clarification Game Designer. |

---

## Notes

- **H3 (score militaire frontend) : ANNULÉ** — La formule `atk/50 + shd/10 + hul/400` dans `frontend/src/utils/techTreeCompat.ts` (ligne 344) est conservée intentionnellement. L'utilisateur préfère le calcul frontend existant. Ne pas modifier cette formule.
- Les items B1-B5 (bloquants sécurité) doivent être traités avant toute ouverture publique mais ne font pas partie de ces sprints — les suivre séparément.
- Sprint 3+ couvre les items M1-M16 (moyenne priorité) non listés ici.
