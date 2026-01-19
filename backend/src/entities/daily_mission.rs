use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Définition des missions quotidiennes disponibles (template)
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "daily_mission")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    
    /// Identifiant unique de la mission (ex: "build_hunters_10")
    #[sea_orm(unique)]
    pub mission_key: String,
    
    /// Nom affiché de la mission
    pub name: String,
    
    /// Description détaillée
    pub description: String,
    
    /// Type de mission: "build", "attack", "spy", "transport", "expedition", "upgrade", "collect"
    pub mission_type: String,
    
    /// Cible spécifique (ex: "light_hunter", "metal", "any")
    pub target: String,
    
    /// Quantité requise pour compléter
    pub required_amount: i32,
    
    /// Difficulté: "easy", "medium", "hard"
    pub difficulty: String,
    
    /// Récompense en métal
    #[sea_orm(default_value = 0)]
    pub reward_metal: f64,
    
    /// Récompense en cristal
    #[sea_orm(default_value = 0)]
    pub reward_crystal: f64,
    
    /// Récompense en deutérium
    #[sea_orm(default_value = 0)]
    pub reward_deuterium: f64,
    
    /// Points d'XP gagnés
    #[sea_orm(default_value = 0)]
    pub reward_xp: i32,
    
    /// Actif ou non
    #[sea_orm(default_value = true)]
    pub is_active: bool,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
