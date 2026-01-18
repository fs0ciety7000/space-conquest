use sea_orm::{DatabaseConnection, EntityTrait, IntoActiveModel};
use crate::entities::{prelude::*, server_resource_stats};
use chrono::Utc;
use uuid::Uuid;

/// Base price ratios based on production rates (3:2:1 for metal:crystal:deuterium)
pub const METAL_BASE_RATIO: f64 = 1.0;
pub const CRYSTAL_BASE_RATIO: f64 = 1.5;
pub const DEUTERIUM_BASE_RATIO: f64 = 3.0;

/// Expected resource distribution on the server
pub const METAL_EXPECTED_RATIO: f64 = 0.50; // 50% of total
pub const CRYSTAL_EXPECTED_RATIO: f64 = 0.33; // 33% of total
pub const DEUTERIUM_EXPECTED_RATIO: f64 = 0.17; // 17% of total

/// NPC margins
pub const NPC_BUY_MARGIN: f64 = 0.85; // NPC pays 85% of market price
pub const NPC_SELL_MARGIN: f64 = 1.18; // NPC sells at 118% of market price

/// Market tax
pub const MARKET_TAX_RATE: f64 = 0.02; // 2% tax on seller

/// Scarcity multiplier bounds
pub const MIN_SCARCITY_MULTIPLIER: f64 = 0.5;
pub const MAX_SCARCITY_MULTIPLIER: f64 = 2.0;

/// Resource types
#[derive(Debug, Clone, PartialEq)]
pub enum ResourceType {
    Metal,
    Crystal,
    Deuterium,
}

// Ajoutez cette fonction au début du fichier, avant vos handlers
fn extract_user_id_from_token(token: &str) -> Option<Uuid> {
    // Token format: "jwt-{uuid}"
    token.strip_prefix("jwt-")
        .and_then(|id| Uuid::parse_str(id).ok())
}


impl ResourceType {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "metal" => Some(ResourceType::Metal),
            "crystal" => Some(ResourceType::Crystal),
            "deuterium" => Some(ResourceType::Deuterium),
            _ => None,
        }
    }

    pub fn to_str(&self) -> &str {
        match self {
            ResourceType::Metal => "metal",
            ResourceType::Crystal => "crystal",
            ResourceType::Deuterium => "deuterium",
        }
    }

    pub fn base_ratio(&self) -> f64 {
        match self {
            ResourceType::Metal => METAL_BASE_RATIO,
            ResourceType::Crystal => CRYSTAL_BASE_RATIO,
            ResourceType::Deuterium => DEUTERIUM_BASE_RATIO,
        }
    }

    pub fn expected_ratio(&self) -> f64 {
        match self {
            ResourceType::Metal => METAL_EXPECTED_RATIO,
            ResourceType::Crystal => CRYSTAL_EXPECTED_RATIO,
            ResourceType::Deuterium => DEUTERIUM_EXPECTED_RATIO,
        }
    }
}

/// Resource totals on the server
#[derive(Debug, Clone)]
pub struct ServerResourceTotals {
    pub metal_total: f64,
    pub crystal_total: f64,
    pub deuterium_total: f64,
    pub total: f64,
}

/// Calculate total resources across all planets on the server
pub async fn calculate_server_resource_totals(
    db: &DatabaseConnection,
) -> Result<ServerResourceTotals, sea_orm::DbErr> {
    let planets = Planet::find().all(db).await?;

    let mut metal_total = 0.0;
    let mut crystal_total = 0.0;
    let mut deuterium_total = 0.0;

    for planet in planets {
        metal_total += planet.metal_amount;
        crystal_total += planet.crystal_amount;
        deuterium_total += planet.deuterium_amount;
    }

    let total = metal_total + crystal_total + deuterium_total;

    Ok(ServerResourceTotals {
        metal_total,
        crystal_total,
        deuterium_total,
        total,
    })
}

/// Update or create the server resource stats singleton
pub async fn update_server_resource_stats(
    db: &DatabaseConnection,
    totals: &ServerResourceTotals,
) -> Result<(), sea_orm::DbErr> {
    use sea_orm::{ActiveModelTrait, Set};

    // Fixed UUID for singleton
    let singleton_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();

    // Check if stats exist
    let existing = ServerResourceStats::find_by_id(singleton_id)
        .one(db)
        .await?;

    if let Some(stats) = existing {
        // Update existing
        let mut active_model = stats.into_active_model();
        active_model.metal_total = Set(totals.metal_total);
        active_model.crystal_total = Set(totals.crystal_total);
        active_model.deuterium_total = Set(totals.deuterium_total);
        active_model.calculated_at = Set(Utc::now().naive_utc());
        active_model.update(db).await?;
    } else {
        // Create new
        let new_stats = server_resource_stats::ActiveModel {
            id: Set(singleton_id),
            metal_total: Set(totals.metal_total),
            crystal_total: Set(totals.crystal_total),
            deuterium_total: Set(totals.deuterium_total),
            metal_traded_24h: Set(0.0),
            crystal_traded_24h: Set(0.0),
            deuterium_traded_24h: Set(0.0),
            calculated_at: Set(Utc::now().naive_utc()),
        };
        new_stats.insert(db).await?;
    }

    Ok(())
}

/// Calculate scarcity multiplier for a resource
pub fn calculate_scarcity_multiplier(
    resource_type: &ResourceType,
    totals: &ServerResourceTotals,
) -> f64 {
    if totals.total == 0.0 {
        return 1.0; // Default if no resources exist
    }

    let actual_ratio = match resource_type {
        ResourceType::Metal => totals.metal_total / totals.total,
        ResourceType::Crystal => totals.crystal_total / totals.total,
        ResourceType::Deuterium => totals.deuterium_total / totals.total,
    };

    let expected_ratio = resource_type.expected_ratio();

    // If actual < expected → scarce → higher price
    // If actual > expected → abundant → lower price
    let scarcity = if actual_ratio > 0.0 {
        expected_ratio / actual_ratio
    } else {
        MAX_SCARCITY_MULTIPLIER
    };

    scarcity.clamp(MIN_SCARCITY_MULTIPLIER, MAX_SCARCITY_MULTIPLIER)
}

/// Calculate market price for a resource (before NPC margins)
pub fn calculate_market_price(
    resource_type: &ResourceType,
    totals: &ServerResourceTotals,
) -> f64 {
    let base_ratio = resource_type.base_ratio();
    let scarcity = calculate_scarcity_multiplier(resource_type, totals);
    base_ratio * scarcity
}

/// NPC prices for a resource
#[derive(Debug, Clone)]
pub struct NpcPrices {
    pub resource_type: ResourceType,
    pub market_price: f64,
    pub buy_price: f64,  // What NPC pays when buying from players
    pub sell_price: f64, // What NPC charges when selling to players
}

/// Calculate NPC buy and sell prices for a resource
pub async fn calculate_npc_prices(
    db: &DatabaseConnection,
    resource_type: ResourceType,
) -> Result<NpcPrices, sea_orm::DbErr> {
    let totals = calculate_server_resource_totals(db).await?;
    let market_price = calculate_market_price(&resource_type, &totals);

    Ok(NpcPrices {
        resource_type: resource_type.clone(),
        market_price,
        buy_price: market_price * NPC_BUY_MARGIN,
        sell_price: market_price * NPC_SELL_MARGIN,
    })
}

/// Calculate exchange rate between two resources
/// Returns how much of target_resource you get for 1 unit of source_resource
pub async fn calculate_exchange_rate(
    db: &DatabaseConnection,
    source_resource: ResourceType,
    target_resource: ResourceType,
) -> Result<f64, sea_orm::DbErr> {
    let totals = calculate_server_resource_totals(db).await?;

    let source_price = calculate_market_price(&source_resource, &totals);
    let target_price = calculate_market_price(&target_resource, &totals);

    // How much target you get for 1 source
    Ok(source_price / target_price)
}

/// Apply market tax to an amount (subtracts tax from amount)
pub fn apply_market_tax(amount: f64) -> (f64, f64) {
    let tax = amount * MARKET_TAX_RATE;
    let net_amount = amount - tax;
    (net_amount, tax)
}

/// Calculate what the seller receives after tax
pub fn calculate_seller_receives(gross_amount: f64) -> f64 {
    let (net, _) = apply_market_tax(gross_amount);
    net
}

/// Get all NPC prices for all resources
pub async fn get_all_npc_prices(
    db: &DatabaseConnection,
) -> Result<Vec<NpcPrices>, sea_orm::DbErr> {
    let resources = vec![
        ResourceType::Metal,
        ResourceType::Crystal,
        ResourceType::Deuterium,
    ];

    let mut prices = Vec::new();
    for resource in resources {
        let npc_prices = calculate_npc_prices(db, resource).await?;
        prices.push(npc_prices);
    }

    Ok(prices)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resource_type_conversion() {
        assert_eq!(ResourceType::from_str("metal"), Some(ResourceType::Metal));
        assert_eq!(ResourceType::from_str("CRYSTAL"), Some(ResourceType::Crystal));
        assert_eq!(ResourceType::from_str("Deuterium"), Some(ResourceType::Deuterium));
        assert_eq!(ResourceType::from_str("invalid"), None);
    }

    #[test]
    fn test_base_ratios() {
        assert_eq!(ResourceType::Metal.base_ratio(), 1.0);
        assert_eq!(ResourceType::Crystal.base_ratio(), 1.5);
        assert_eq!(ResourceType::Deuterium.base_ratio(), 3.0);
    }

    #[test]
    fn test_scarcity_multiplier() {
        let totals = ServerResourceTotals {
            metal_total: 500.0,
            crystal_total: 300.0,
            deuterium_total: 200.0,
            total: 1000.0,
        };

        // Metal is 50% of total (expected 50%) → scarcity = 1.0
        let metal_scarcity = calculate_scarcity_multiplier(&ResourceType::Metal, &totals);
        assert!((metal_scarcity - 1.0).abs() < 0.01);

        // Crystal is 30% of total (expected 33%) → slightly scarce
        let crystal_scarcity = calculate_scarcity_multiplier(&ResourceType::Crystal, &totals);
        assert!(crystal_scarcity > 1.0);

        // Deuterium is 20% of total (expected 17%) → slightly abundant
        let deut_scarcity = calculate_scarcity_multiplier(&ResourceType::Deuterium, &totals);
        assert!(deut_scarcity < 1.0);
    }

    #[test]
    fn test_market_tax() {
        let amount = 1000.0;
        let (net, tax) = apply_market_tax(amount);
        assert_eq!(tax, 20.0); // 2% of 1000
        assert_eq!(net, 980.0);
    }

    #[test]
    fn test_scarcity_bounds() {
        // Test extreme scarcity (should clamp to 2.0)
        let totals = ServerResourceTotals {
            metal_total: 10.0,
            crystal_total: 990.0,
            deuterium_total: 0.0,
            total: 1000.0,
        };

        let metal_scarcity = calculate_scarcity_multiplier(&ResourceType::Metal, &totals);
        assert!(metal_scarcity >= MIN_SCARCITY_MULTIPLIER);
        assert!(metal_scarcity <= MAX_SCARCITY_MULTIPLIER);
    }
}
