use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::{Statement, ConnectionTrait};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Officiers Économie
        let economy_officers = vec![
            // Commun
            (
                "gen_random_uuid()",
                "'Ingénieur Minier'",
                "'Spécialiste de l''extraction minière, augmente la production de métal.'",
                "'economy'",
                "'common'",
                "'metal_production'",
                "5.0",
                "0.5",
                "50",
                "'engineer'",
                "1000.0",
                "500.0",
                "100.0"
            ),
            (
                "gen_random_uuid()",
                "'Géologue Cristallin'",
                "'Expert en cristallographie, améliore l''extraction de cristal.'",
                "'economy'",
                "'common'",
                "'crystal_production'",
                "5.0",
                "0.5",
                "50",
                "'scientist'",
                "500.0",
                "1000.0",
                "100.0"
            ),
            // Peu commun
            (
                "gen_random_uuid()",
                "'Chef des Opérations'",
                "'Gestionnaire efficace, améliore toute la production de ressources.'",
                "'economy'",
                "'uncommon'",
                "'all_production'",
                "3.0",
                "0.3",
                "50",
                "'manager'",
                "2000.0",
                "2000.0",
                "500.0"
            ),
            (
                "gen_random_uuid()",
                "'Ingénieur Énergétique'",
                "'Optimise la production et consommation d''énergie.'",
                "'economy'",
                "'uncommon'",
                "'energy_efficiency'",
                "8.0",
                "0.8",
                "50",
                "'engineer'",
                "1500.0",
                "1500.0",
                "1000.0"
            ),
            // Rare
            (
                "gen_random_uuid()",
                "'Maître Économiste'",
                "'Réduit les coûts de construction et amélioration.'",
                "'economy'",
                "'rare'",
                "'construction_cost_reduction'",
                "10.0",
                "1.0",
                "50",
                "'economist'",
                "5000.0",
                "5000.0",
                "2000.0"
            ),
            // Épique
            (
                "gen_random_uuid()",
                "'Baron Industriel'",
                "'Magnat de l''industrie, bonus massif à la production.'",
                "'economy'",
                "'epic'",
                "'all_production'",
                "15.0",
                "1.5",
                "50",
                "'noble'",
                "10000.0",
                "10000.0",
                "5000.0"
            ),
            // Légendaire
            (
                "gen_random_uuid()",
                "'Empereur du Commerce'",
                "'Légende vivante du commerce interstellaire.'",
                "'economy'",
                "'legendary'",
                "'all_production'",
                "25.0",
                "2.5",
                "50",
                "'emperor'",
                "25000.0",
                "25000.0",
                "15000.0"
            ),
        ];

        // Officiers Militaires
        let military_officers = vec![
            // Commun
            (
                "gen_random_uuid()",
                "'Sergent d''Infanterie'",
                "'Augmente légèrement la puissance d''attaque de la flotte.'",
                "'military'",
                "'common'",
                "'fleet_attack'",
                "5.0",
                "0.5",
                "50",
                "'soldier'",
                "1000.0",
                "500.0",
                "250.0"
            ),
            (
                "gen_random_uuid()",
                "'Capitaine Défensif'",
                "'Renforce les défenses planétaires.'",
                "'military'",
                "'common'",
                "'defense_power'",
                "5.0",
                "0.5",
                "50",
                "'soldier'",
                "1000.0",
                "500.0",
                "250.0"
            ),
            // Peu commun
            (
                "gen_random_uuid()",
                "'Tacticien de Flotte'",
                "'Améliore les capacités de combat spatial.'",
                "'military'",
                "'uncommon'",
                "'fleet_attack'",
                "8.0",
                "0.8",
                "50",
                "'tactician'",
                "2000.0",
                "1000.0",
                "800.0"
            ),
            (
                "gen_random_uuid()",
                "'Ingénieur de Combat'",
                "'Augmente la résistance des vaisseaux.'",
                "'military'",
                "'uncommon'",
                "'fleet_defense'",
                "8.0",
                "0.8",
                "50",
                "'engineer'",
                "1500.0",
                "1500.0",
                "500.0"
            ),
            // Rare
            (
                "gen_random_uuid()",
                "'Commandant d''Escadre'",
                "'Bonus significatif à l''attaque et à la défense.'",
                "'military'",
                "'rare'",
                "'fleet_power'",
                "10.0",
                "1.0",
                "50",
                "'commander'",
                "5000.0",
                "3000.0",
                "2000.0"
            ),
            // Épique
            (
                "gen_random_uuid()",
                "'Amiral de Guerre'",
                "'Vétéran de mille batailles, puissance militaire accrue.'",
                "'military'",
                "'epic'",
                "'fleet_power'",
                "15.0",
                "1.5",
                "50",
                "'admiral'",
                "10000.0",
                "8000.0",
                "5000.0"
            ),
            // Légendaire
            (
                "gen_random_uuid()",
                "'Grand Stratège'",
                "'Génie militaire légendaire, maître de la guerre.'",
                "'military'",
                "'legendary'",
                "'fleet_power'",
                "25.0",
                "2.5",
                "50",
                "'strategist'",
                "25000.0",
                "20000.0",
                "15000.0"
            ),
        ];

        // Officiers Recherche
        let research_officers = vec![
            // Commun
            (
                "gen_random_uuid()",
                "'Assistant de Recherche'",
                "'Accélère légèrement les recherches technologiques.'",
                "'research'",
                "'common'",
                "'research_speed'",
                "5.0",
                "0.5",
                "50",
                "'scientist'",
                "800.0",
                "1200.0",
                "200.0"
            ),
            // Peu commun
            (
                "gen_random_uuid()",
                "'Chercheur Senior'",
                "'Scientifique expérimenté, bonus de recherche amélioré.'",
                "'research'",
                "'uncommon'",
                "'research_speed'",
                "8.0",
                "0.8",
                "50",
                "'scientist'",
                "1500.0",
                "2500.0",
                "1000.0"
            ),
            (
                "gen_random_uuid()",
                "'Spécialiste Armement'",
                "'Accélère les recherches en technologies d''armes.'",
                "'research'",
                "'uncommon'",
                "'weapon_research_speed'",
                "10.0",
                "1.0",
                "50",
                "'weaponsmith'",
                "2000.0",
                "2000.0",
                "800.0"
            ),
            // Rare
            (
                "gen_random_uuid()",
                "'Professeur de Physique'",
                "'Expert en physique quantique et propulsion.'",
                "'research'",
                "'rare'",
                "'research_speed'",
                "12.0",
                "1.2",
                "50",
                "'professor'",
                "4000.0",
                "6000.0",
                "2000.0"
            ),
            // Épique
            (
                "gen_random_uuid()",
                "'Savant Fou'",
                "'Génie excentrique aux découvertes révolutionnaires.'",
                "'research'",
                "'epic'",
                "'research_speed'",
                "18.0",
                "1.8",
                "50",
                "'genius'",
                "8000.0",
                "12000.0",
                "6000.0"
            ),
            // Légendaire
            (
                "gen_random_uuid()",
                "'Archiviste Galactique'",
                "'Détient les connaissances ancestrales de l''univers.'",
                "'research'",
                "'legendary'",
                "'research_speed'",
                "30.0",
                "3.0",
                "50",
                "'archivist'",
                "20000.0",
                "30000.0",
                "18000.0"
            ),
        ];

        // Insérer les officiers
        for officer in economy_officers.iter().chain(military_officers.iter()).chain(research_officers.iter()) {
            let sql = format!(
                "INSERT INTO officer_template (id, name, description, specialization, rarity, bonus_type, base_bonus_value, bonus_per_level, max_level, image_type, recruitment_cost_metal, recruitment_cost_crystal, recruitment_cost_deuterium, is_available) VALUES ({}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, true)",
                officer.0, officer.1, officer.2, officer.3, officer.4, officer.5, officer.6, officer.7, officer.8, officer.9, officer.10, officer.11, officer.12
            );
            db.execute(Statement::from_string(
                manager.get_database_backend(),
                sql,
            ))
            .await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute(Statement::from_string(
            manager.get_database_backend(),
            "DELETE FROM officer_template".to_string(),
        ))
        .await?;

        Ok(())
    }
}
