// ─────────────────────────────────────────────────────────────────────────────
// models.rs — Shared serializable structs used across handler modules
//
// These were previously defined inline in main.rs. They are centralised here
// so that handler sub-modules (handlers/galaxy.rs, handlers/ranking.rs, …)
// can import them via `crate::models::*` without circular dependencies.
// ─────────────────────────────────────────────────────────────────────────────

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

// ─── Ranking ─────────────────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
pub struct PlanetInfo {
    pub id: Uuid,
    pub name: String,
    pub total_score: i32,
    pub economy_score: i32,
    pub military_score: i32,
    pub galaxy: i32,
    pub system: i32,
    pub position: i32,
}

#[derive(Serialize)]
pub struct RankItem {
    pub rank: usize,
    pub username: String,
    pub display_name: String,
    pub total_score: i32,
    pub economy_score: i32,
    pub military_score: i32,
    pub is_me: bool,
    pub owner_id: Uuid,
    pub planets: Vec<PlanetInfo>,
    pub rank_badge: String,
    pub protection_until: Option<String>,
    pub galaxy: Option<i32>,
    pub avatar_url: Option<String>,
    pub is_online: bool,
}

// ─── Galaxy view ─────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct GalaxySlot {
    pub position: i32,
    pub planet_id: Option<Uuid>,
    pub planet_name: Option<String>,
    pub owner_name: Option<String>,
    pub owner_id: Option<Uuid>,
    pub debris_metal: f64,
    pub debris_crystal: f64,
    pub is_me: bool,
    pub is_my_planet: bool,
    pub protection_until: Option<String>,
    pub total_points: i64,
    pub planet_galaxy: i32,
}

#[derive(Serialize)]
pub struct SystemSummary {
    pub system: i32,
    pub planet_count: i64,
    pub has_me: bool,
}

// ─── User / Profile ───────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub syndicate_credits: f64,
    pub role: String,
}

#[derive(Deserialize)]
pub struct UpdateUsernamePayload {
    pub username: String,
}

#[derive(Deserialize)]
pub struct UpdateBioPayload {
    pub bio: String,
}

#[derive(Deserialize)]
pub struct UpdateDisplayNamePayload {
    pub display_name: String,
}

#[derive(Deserialize)]
pub struct FriendRequestPayload {
    pub to_user_id: Uuid,
}

#[derive(Deserialize)]
pub struct FleetPresetPayload {
    pub name: String,
    pub fleet: HashMap<String, i32>,
}

// ─── Payloads shared between handlers ────────────────────────────────────────

#[derive(Deserialize)]
pub struct ScanNearbyPayload {
    pub current_planet_id: Uuid,
    pub max_results: Option<i32>,
}

#[derive(Deserialize)]
pub struct ColonizePayload {
    pub galaxy: i32,
    pub system: i32,
    pub position: i32,
    pub metal: Option<f64>,
    pub crystal: Option<f64>,
    pub deuterium: Option<f64>,
}

// ─── Fleet / Mission payloads ─────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct AttackPayloadV2 {
    pub target_planet_id: Uuid,
    pub fleet: HashMap<String, i32>,
}

#[derive(Deserialize)]
pub struct SpyPayloadV2 {
    pub target_planet_id: Uuid,
    pub fleet: HashMap<String, i32>,
}

#[derive(Deserialize)]
pub struct RecyclePayload {
    pub galaxy: i32,
    pub system: i32,
    pub position: i32,
    pub recyclers: i32,
}

#[derive(Deserialize)]
pub struct TransportPayload {
    pub target_planet_id: Uuid,
    pub transporters: i32,
    pub metal: f64,
    pub crystal: f64,
    pub deuterium: f64,
}

#[derive(Deserialize)]
pub struct ExpeditionPayloadV2 {
    pub fleet: HashMap<String, i32>,
}

/// Payload pour la mission "deploy" (Fleet Save vers une planète alliée du même joueur)
#[derive(Deserialize)]
pub struct DeployPayload {
    pub origin_planet_id: Uuid,
    pub destination_planet_id: Uuid,
    pub fleet: HashMap<String, i32>,
}
