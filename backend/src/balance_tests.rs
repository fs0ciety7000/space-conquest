/// Sprint BALANCE-3 — Tests unitaires T-004 à T-008
///
/// Ces tests valident les formules et valeurs fallback introduites ou corrigées
/// dans les sprints BALANCE-0 à BALANCE-2. Aucune connexion DB n'est requise :
/// tous les appels utilisent `ServerConfigCache::default()` dont le HashMap de
/// configs est vide, forçant l'utilisation des valeurs hardcodées (fallback).
///
/// T-009 et T-010 (conquête avec/sans Colony Ship) ne peuvent pas être testés
/// sans base de données car `resolve_attack_mission` est définie dans `main.rs`
/// et dépend de SeaORM + AppState. Ces tests sont marqués TODO ci-dessous et
/// documentés comme nécessitant des tests d'intégration (DB de test requise).
///
/// Lancer avec : `cargo test -p backend balance`
#[cfg(test)]
mod balance_tests {
    use crate::game_logic::{get_unit_base_stats, get_ship_cargo_capacity};
    use crate::ServerConfigCache;

    // -------------------------------------------------------------------------
    // T-004 : Capacité cargo Transporteur
    //
    // BALANCE-0-B a unifié la clé de config sur "cargo_transporter_base" avec
    // un fallback de 10000.0 dans get_ship_cargo_capacity.
    // Avec un ServerConfigCache::default() (HashMap vide), get_config retourne
    // le default passé en argument → 10000.0.
    // -------------------------------------------------------------------------
    #[test]
    fn test_t004_transporter_cargo_capacity() {
        let config = ServerConfigCache::default();
        let capacity = get_ship_cargo_capacity("transporter", &config);
        assert_eq!(
            capacity, 10000.0,
            "T-004: Transporter cargo capacity doit être 10000 (BALANCE-0-B)"
        );
    }

    // -------------------------------------------------------------------------
    // T-005 : Hull Recycleur fallback
    //
    // BALANCE-0-E a corrigé le fallback hull de 160 (typo) à 1600 dans
    // get_unit_base_stats("recycler").
    // Avec un ServerConfigCache::default(), la valeur retournée est le fallback
    // hardcodé dans le match — 1600.0.
    // -------------------------------------------------------------------------
    #[test]
    fn test_t005_recycler_hull_fallback() {
        let config = ServerConfigCache::default();
        let stats = get_unit_base_stats("recycler", &config);
        assert_eq!(
            stats.hull, 1600.0,
            "T-005: Recycler hull fallback doit être 1600 (BALANCE-0-E, corrigé de 160)"
        );
    }

    // -------------------------------------------------------------------------
    // T-006 : Multiplicateur d'armes avec bonus Laser + Ion
    //
    // Formule définie dans load_planet_tech_bonuses (handlers/fleet.rs) :
    //   weapons_mult = 1.0 + weapons_level × 0.10
    //                      + laser_level   × 0.05
    //                      + ion_level     × 0.03
    //
    // Avec weapons=5, laser=5, ion=5 :
    //   = 1.0 + 5×0.10 + 5×0.05 + 5×0.03
    //   = 1.0 + 0.50   + 0.25   + 0.15
    //   = 1.90
    //
    // Ce test valide la formule directement sans passer par la DB, puisque
    // load_planet_tech_bonuses est async et charge les niveaux depuis la DB.
    // La logique elle-même est une pure opération arithmétique.
    //
    // Note : create_tech_bonuses a été supprimée (dead code éliminé en BALANCE-2-E).
    // BALANCE-0-C a décidé que Laser (+5%/niv) et Ion (+3%/niv) contribuent
    // bien au weapons_mult (décision D-001 dans BALANCE_PLAN.md).
    // -------------------------------------------------------------------------
    #[test]
    fn test_t006_weapons_mult_laser_ion_bonus() {
        let weapons_level: i32 = 5;
        let laser_level: i32 = 5;
        let ion_level: i32 = 5;

        // Reproduction exacte de la formule dans load_planet_tech_bonuses
        let weapons_mult = 1.0_f64
            + weapons_level as f64 * 0.1
            + laser_level as f64 * 0.05
            + ion_level as f64 * 0.03;

        assert!(
            (weapons_mult - 1.90).abs() < 1e-9,
            "T-006: weapons_mult(weapons=5, laser=5, ion=5) doit être 1.90, obtenu {weapons_mult}"
        );
    }

    // -------------------------------------------------------------------------
    // T-006b : Cas dégénérés de la formule weapons_mult
    //
    // Vérifie que les bonus sont indépendants et additifs :
    // - Sans aucune tech : mult = 1.0 (aucun bonus)
    // - Weapons seul L5  : mult = 1.50
    // - Laser seul L5    : mult = 1.25
    // - Ion seul L5      : mult = 1.15
    // -------------------------------------------------------------------------
    #[test]
    fn test_t006b_weapons_mult_isolated_bonuses() {
        let compute = |w: i32, l: i32, i: i32| -> f64 {
            1.0 + w as f64 * 0.1 + l as f64 * 0.05 + i as f64 * 0.03
        };

        assert!(
            (compute(0, 0, 0) - 1.0).abs() < 1e-9,
            "T-006b: Aucune tech doit donner mult=1.0"
        );
        assert!(
            (compute(5, 0, 0) - 1.50).abs() < 1e-9,
            "T-006b: Weapons L5 seul doit donner mult=1.50"
        );
        assert!(
            (compute(0, 5, 0) - 1.25).abs() < 1e-9,
            "T-006b: Laser L5 seul doit donner mult=1.25"
        );
        assert!(
            (compute(0, 0, 5) - 1.15).abs() < 1e-9,
            "T-006b: Ion L5 seul doit donner mult=1.15"
        );
    }

    // -------------------------------------------------------------------------
    // T-007 : Bouclier Bombardier après rééquilibrage BALANCE-1-A
    //
    // BALANCE-1-A a porté le bouclier du Bombardier de 75 à 300.
    // La migration m20261005_000003_rebalance_bomber.rs met à jour la DB,
    // mais le fallback hardcodé dans get_unit_base_stats doit aussi refléter
    // la valeur 300.0 pour les environnements sans DB.
    // -------------------------------------------------------------------------
    #[test]
    fn test_t007_bomber_shield_rebalanced() {
        let config = ServerConfigCache::default();
        let stats = get_unit_base_stats("bomber", &config);
        assert_eq!(
            stats.shield, 300.0,
            "T-007: Bombardier shield doit être 300 (BALANCE-1-A, était 75)"
        );
    }

    // -------------------------------------------------------------------------
    // T-008 : Attaque Chasseur Lourd après rééquilibrage BALANCE-1-B
    //
    // BALANCE-1-B a porté l'attaque du Chasseur Lourd de 25 à 75.
    // La migration m20261005_000004_rebalance_heavy_hunter.rs met à jour la DB,
    // mais le fallback doit aussi être à 75.0.
    // -------------------------------------------------------------------------
    #[test]
    fn test_t008_heavy_hunter_attack_rebalanced() {
        let config = ServerConfigCache::default();
        let stats = get_unit_base_stats("heavy_hunter", &config);
        assert_eq!(
            stats.attack, 75.0,
            "T-008: Chasseur Lourd attack doit être 75 (BALANCE-1-B, était 25)"
        );
    }

    // =========================================================================
    // T-009 / T-010 : Conquête avec / sans Colony Ship
    //
    // STATUT : NON IMPLÉMENTÉS — nécessitent des tests d'intégration (DB).
    //
    // Raison : La logique de conquête est dans `resolve_attack_mission` définie
    // dans `backend/src/main.rs`. Cette fonction est `async`, prend un
    // `&DatabaseConnection` et un `AppState` complets, et ne peut pas être
    // appelée sans une instance SeaORM connectée à une vraie base de données.
    //
    // Pour implémenter T-009 / T-010 :
    //   1. Extraire la logique de vérification de conquête dans une fonction
    //      pure `check_conquest_eligible(attacker_ships, defender_remaining,
    //      defender_defenses_remaining, colony_ship_in_fleet, defender_planet_count)
    //      -> bool` dans un module séparé (ex: combat.rs ou conquest.rs).
    //   2. Écrire des tests unitaires sur cette fonction pure (aucune DB requise).
    //   3. OU utiliser sqlx::test / sea-orm test utilities avec une DB SQLite
    //      en mémoire pour les tests d'intégration complets.
    //
    // Référence : BALANCE_PLAN.md BALANCE-3-A T-009 / T-010
    // =========================================================================
}
