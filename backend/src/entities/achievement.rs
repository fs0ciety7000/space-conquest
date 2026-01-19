use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Définition des achievements permanents
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "achievement")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    
    /// Identifiant unique (ex: "first_attack", "fleet_100")
    #[sea_orm(unique)]
    pub achievement_key: String,
    
    /// Nom affiché
    pub name: String,
    
    /// Description
    pub description: String,
    
    /// Catégorie: "combat", "economy", "exploration", "social", "special"
    pub category: String,
    
    /// Icône/emoji du badge
    pub icon: String,
    
    /// Couleur du badge (hex)
    pub color: String,
    
    /// Type de condition: "count", "threshold", "unique"
    pub condition_type: String,
    
    /// Cible de la condition (ex: "attacks", "buildings_total", "alliance_join")
    pub condition_target: String,
    
    /// Valeur requise pour débloquer
    pub condition_value: i32,
    
    /// Points accordés
    #[sea_orm(default_value = 0)]
    pub points: i32,
    
    /// Rareté: "common", "uncommon", "rare", "epic", "legendary"
    pub rarity: String,
    
    /// Ordre d'affichage
    #[sea_orm(default_value = 0)]
    pub display_order: i32,
    
    /// Actif ou non
    #[sea_orm(default_value = true)]
    pub is_active: bool,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
