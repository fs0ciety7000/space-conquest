use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    response::IntoResponse,
};
use dashmap::DashMap;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::entities::prelude::*;
use crate::entities::notification;
use crate::game_logic;
use sea_orm::{EntityTrait, DatabaseConnection, QueryFilter, ColumnTrait, ActiveModelTrait, Set};
use chrono::Utc;

// ============================================================================
// TYPES ET STRUCTURES
// ============================================================================

/// État partagé pour les connexions WebSocket
#[derive(Clone)]
pub struct WsState {
    /// Map des connexions actives: planet_id -> broadcast sender
    pub connections: Arc<DashMap<Uuid, broadcast::Sender<WsEvent>>>,
    /// Map des utilisateurs connectés: user_id -> nb de connexions actives
    pub user_connections: Arc<DashMap<Uuid, usize>>,
    /// Connexion à la base de données
    pub db: DatabaseConnection,
    /// Configuration serveur
    pub config: Arc<std::sync::RwLock<crate::ServerConfigCache>>,
}

impl WsState {
    pub fn new(db: DatabaseConnection, config: Arc<std::sync::RwLock<crate::ServerConfigCache>>) -> Self {
        Self {
            connections: Arc::new(DashMap::new()),
            user_connections: Arc::new(DashMap::new()),
            db,
            config,
        }
    }

    /// Retourne true si l'utilisateur a au moins une connexion WS active
    pub fn is_user_online(&self, user_id: Uuid) -> bool {
        self.user_connections.get(&user_id).map(|v| *v > 0).unwrap_or(false)
    }

    /// Nombre total de joueurs connectés (connexions distinctes par user)
    pub fn online_count(&self) -> usize {
        self.user_connections.iter().filter(|v| *v.value() > 0).count()
    }

    /// Envoie un événement à tous les abonnés d'une planète
    pub fn broadcast_to_planet(&self, planet_id: Uuid, event: WsEvent) {
        if let Some(sender) = self.connections.get(&planet_id) {
            let _ = sender.send(event);
        }
    }

    /// Envoie un événement à toutes les planètes d'un utilisateur
    pub async fn broadcast_to_user(&self, user_id: Uuid, event: WsEvent) {
        // Récupérer toutes les planètes de l'utilisateur
        if let Ok(planets) = Planet::find()
            .filter(crate::entities::planet::Column::OwnerId.eq(user_id))
            .all(&self.db)
            .await
        {
            for planet in planets {
                self.broadcast_to_planet(planet.id, event.clone());
            }
        }
    }

    /// Envoie un événement à toutes les connexions actives (chat galactique)
    pub async fn broadcast_global(&self, event: WsEvent) {
        for entry in self.connections.iter() {
            let _ = entry.value().send(event.clone());
        }
    }

    /// Persiste une notification en DB et l'envoie en temps réel via WS à l'utilisateur
    pub async fn push_notification(&self, user_id: Uuid, notif_type: &str, title: &str, message: &str, report_id: Option<Uuid>) {
        // Persister en DB
        let notif = notification::ActiveModel {
            id: Set(Uuid::new_v4()),
            user_id: Set(user_id),
            notif_type: Set(notif_type.to_string()),
            title: Set(title.to_string()),
            message: Set(message.to_string()),
            is_read: Set(false),
            created_at: Set(Utc::now().naive_utc()),
            report_id: Set(report_id),
        };
        let _ = notif.insert(&self.db).await;

        // Diffuser via WS
        self.broadcast_to_user(user_id, WsEvent::Notification {
            notif_type: notif_type.to_string(),
            title: title.to_string(),
            message: message.to_string(),
        }).await;
    }
}

/// Événements envoyés du serveur vers le client
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum WsEvent {
    /// Mise à jour des ressources en temps réel
    #[serde(rename = "resources_update")]
    ResourcesUpdate {
        metal: f64,
        crystal: f64,
        deuterium: f64,
        energy_produced: f64,
        energy_consumed: f64,
        energy_ratio: f64,
    },

    /// Construction de bâtiment terminée
    #[serde(rename = "construction_complete")]
    ConstructionComplete {
        building_type: String,
        level: i32,
    },

    /// Production de vaisseaux terminée
    #[serde(rename = "ship_complete")]
    ShipComplete {
        ship_type: String,
        quantity: i32,
    },

    /// Recherche technologique terminée (Expansion 5.0)
    #[serde(rename = "research_complete")]
    ResearchComplete {
        tech_key: String,
        level: i32,
    },

    /// Attaque entrante détectée
    #[serde(rename = "attack_incoming")]
    AttackIncoming {
        attacker_name: String,
        source_coords: String,
        arrival_time: String,
        ships_count: i32,
    },

    /// Résultat de combat disponible
    #[serde(rename = "combat_result")]
    CombatResult {
        result: String, // "victory" | "defeat" | "draw"
        opponent: String,
    },

    /// Nouveau message reçu
    #[serde(rename = "message_received")]
    MessageReceived {
        from: String,
        preview: String,
    },

    /// Transport arrivé
    #[serde(rename = "transport_arrived")]
    TransportArrived {
        from_planet: String,
        metal: f64,
        crystal: f64,
        deuterium: f64,
    },

    /// Colonie fondée avec succès (Expansion 5.0)
    #[serde(rename = "colony_founded")]
    ColonyFounded {
        planet_name: String,
        coords: String,
    },

    /// Alerte espionnage
    #[serde(rename = "spy_alert")]
    SpyAlert {
        from: String,
    },

    /// Sabotage détecté sur ma planète (attaquant identifié)
    #[serde(rename = "sabotage_detected")]
    SabotageDetected {
        attacker_name: String,
        planet_name: String,
        effect_type: String, // "disable_mine" | "steal_tech"
    },

    /// Sabotage appliqué silencieusement (attaquant non identifié)
    #[serde(rename = "sabotage_applied")]
    SabotageApplied {
        planet_name: String,
        effect_type: String,
        expires_at: String,
    },

    /// Casus Belli accordé (droit d'attaque)
    #[serde(rename = "casus_belli_granted")]
    CasusBelliGranted {
        target_name: String,
        reason: String,
    },

    /// Planète conquise ou perdue
    #[serde(rename = "planet_status")]
    PlanetStatus {
        status: String, // "conquered" | "lost"
        planet_name: String,
        opponent: String,
    },

    /// Heartbeat/Pong
    #[serde(rename = "pong")]
    Pong,

    /// Erreur
    #[serde(rename = "error")]
    Error {
        message: String,
    },

    /// Connexion établie
    #[serde(rename = "connected")]
    Connected {
        planet_id: String,
    },

    /// Message du chat galactique
    #[serde(rename = "global_chat_message")]
    GlobalChatMessage {
        sender_id: Uuid,
        sender_name: String,
        content: String,
        created_at: String,
    },

    /// Nouvelle notification en temps réel
    #[serde(rename = "notification")]
    Notification {
        notif_type: String, // "combat" | "build" | "market" | "expedition" | "spy" | "transport"
        title: String,
        message: String,
    },

    /// Vente de ressources sur le marché inter-planétaire réussie (notifie le vendeur)
    #[serde(rename = "market_sale")]
    MarketSale {
        resource: String,          // "metal" | "crystal" | "deuterium"
        amount: f64,               // quantité vendue
        payment_resource: String,  // ressource reçue en paiement
        payment_amount: f64,       // montant reçu (après taxe)
        buyer_name: String,
    },

    /// Planète vendue (à un joueur ou au NPC) — notifie le vendeur
    #[serde(rename = "planet_sold")]
    PlanetSold {
        planet_name: String,
        buyer_name: String,
        price_metal: i64,
        price_crystal: i64,
        price_deuterium: i64,
    },

    // ── PVE Events ──────────────────────────────────────────────────────────

    /// Annonce d'un événement (1h avant ou dès création)
    #[serde(rename = "server_event_announced")]
    ServerEventAnnounced {
        event_id: String,
        event_type: String,
        name: String,
        icon: String,
        color: String,
        zone: String,
        starts_in_seconds: i64,
        narrative: String,
    },

    /// Événement maintenant actif
    #[serde(rename = "server_event_started")]
    ServerEventStarted {
        event_id: String,
        event_type: String,
        name: String,
        icon: String,
        color: String,
        zone: String,
        ends_at: String,
        hp_max: i32,
    },

    /// Progression de l'événement (HP réduits)
    #[serde(rename = "server_event_progress")]
    ServerEventProgress {
        event_id: String,
        hp_current: i32,
        hp_max: i32,
        top_contributors: Vec<String>,
        percent: f64,
    },

    /// Événement résolu (vaincu / expiré / annulé)
    #[serde(rename = "server_event_resolved")]
    ServerEventResolved {
        event_id: String,
        event_type: String,
        outcome: String,   // "defeated" | "expired" | "cancelled" | "admin_resolved"
        rewards_distributed: bool,
        top_contributors: Vec<String>,
    },

    /// Avertissement pendant un événement actif
    #[serde(rename = "server_event_warning")]
    ServerEventWarning {
        event_id: String,
        message: String,
    },
}

/// Messages reçus du client vers le serveur
#[derive(Debug, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum WsClientMessage {
    /// S'abonner aux mises à jour d'une planète
    #[serde(rename = "subscribe")]
    Subscribe { planet_id: String },

    /// Ping pour keepalive
    #[serde(rename = "ping")]
    Ping,
}

/// Paramètres de query pour la connexion WebSocket
#[derive(Debug, Deserialize)]
pub struct WsQuery {
    pub planet_id: Option<String>,
    pub token: Option<String>,
}

// ============================================================================
// HANDLER WEBSOCKET
// ============================================================================

/// Handler pour les connexions WebSocket
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    Query(params): Query<WsQuery>,
    State(state): State<WsState>,
) -> impl IntoResponse {
    // Valider les paramètres
    let planet_id = match params.planet_id {
        Some(id) => match Uuid::parse_str(&id) {
            Ok(uuid) => uuid,
            Err(_) => {
                return ws.on_upgrade(|mut socket| async move {
                    let _ = socket.send(Message::Text(
                        serde_json::to_string(&WsEvent::Error {
                            message: "Invalid planet_id".to_string(),
                        }).unwrap()
                    )).await;
                    let _ = socket.close().await;
                });
            }
        },
        None => {
            return ws.on_upgrade(|mut socket| async move {
                let _ = socket.send(Message::Text(
                    serde_json::to_string(&WsEvent::Error {
                        message: "planet_id required".to_string(),
                    }).unwrap()
                )).await;
                let _ = socket.close().await;
            });
        }
    };

    // Validate JWT token from query param or Authorization header.
    // A missing or invalid token closes the connection with policy violation (1008).
    let token_opt = params.token.as_deref();
    let user_id_from_token: Option<uuid::Uuid> = token_opt
        .and_then(|t| crate::auth::extract_user_id_from_token(t));

    if user_id_from_token.is_none() {
        return ws.on_upgrade(|mut socket| async move {
            let _ = socket.send(Message::Text(
                serde_json::to_string(&WsEvent::Error {
                    message: "Authentication required. Provide a valid JWT via ?token=".to_string(),
                }).unwrap_or_default()
            )).await;
            // Close with 1008 Policy Violation
            let _ = socket.send(Message::Close(Some(axum::extract::ws::CloseFrame {
                code: 1008,
                reason: std::borrow::Cow::Borrowed("Unauthorized"),
            }))).await;
        });
    }

    ws.on_upgrade(move |socket| handle_socket(socket, planet_id, state))
}

/// Gère une connexion WebSocket individuelle
async fn handle_socket(socket: WebSocket, planet_id: Uuid, state: WsState) {
    println!("🔌 WebSocket: Nouvelle connexion pour planet_id={}", planet_id);

    // Récupérer l'owner_id pour tracker l'utilisateur en ligne
    let owner_id: Option<Uuid> = match crate::entities::prelude::Planet::find_by_id(planet_id)
        .one(&state.db)
        .await
    {
        Ok(Some(p)) => Some(p.owner_id),
        _ => None,
    };
    if let Some(uid) = owner_id {
        *state.user_connections.entry(uid).or_insert(0) += 1;
    }

    let (mut sender, mut receiver) = socket.split();

    // Créer ou récupérer le canal broadcast pour cette planète
    let tx = state.connections
        .entry(planet_id)
        .or_insert_with(|| broadcast::channel(100).0)
        .clone();

    let mut rx = tx.subscribe();

    // Envoyer la confirmation de connexion
    let connected_msg = serde_json::to_string(&WsEvent::Connected {
        planet_id: planet_id.to_string(),
    }).unwrap();

    if sender.send(Message::Text(connected_msg)).await.is_err() {
        eprintln!("❌ WebSocket: Erreur lors de l'envoi du message 'connected' pour planet_id={}", planet_id);
        return;
    }
    println!("✅ WebSocket: Message 'connected' envoyé pour planet_id={}", planet_id);

    // Envoyer les ressources initiales
    match Planet::find_by_id(planet_id).one(&state.db).await {
        Ok(Some(planet)) => {
            println!("✅ WebSocket: Planète trouvée: {}", planet.name);
            let config = state.config.read().unwrap().clone();
            let resources = calculate_current_resources(&planet, &state.db, &config).await;
            let msg = serde_json::to_string(&resources).unwrap();
            if sender.send(Message::Text(msg)).await.is_err() {
                eprintln!("❌ WebSocket: Erreur lors de l'envoi des ressources initiales");
                return;
            }
            println!("✅ WebSocket: Ressources initiales envoyées");
        }
        Ok(None) => {
            eprintln!("⚠️ WebSocket: Planète {} non trouvée dans la DB", planet_id);
            let error_msg = serde_json::to_string(&WsEvent::Error {
                message: format!("Planet {} not found", planet_id),
            }).unwrap();
            let _ = sender.send(Message::Text(error_msg)).await;
            return;
        }
        Err(e) => {
            eprintln!("❌ WebSocket: Erreur DB lors de la recherche de la planète: {:?}", e);
            return;
        }
    }

    // Spawner la tâche de mise à jour périodique des ressources
    let db_clone = state.db.clone();
    let config_clone = state.config.clone();
    let tx_clone = tx.clone();
    let update_task = tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(5));
        loop {
            interval.tick().await;

            if let Ok(Some(planet)) = Planet::find_by_id(planet_id).one(&db_clone).await {
                let config = config_clone.read().unwrap().clone();
                let resources = calculate_current_resources(&planet, &db_clone, &config).await;
                let _ = tx_clone.send(resources);
            }
        }
    });

    // Tâche pour envoyer les messages du broadcast au client
    let send_task = tokio::spawn(async move {
        while let Ok(event) = rx.recv().await {
            let msg = serde_json::to_string(&event).unwrap();
            if sender.send(Message::Text(msg)).await.is_err() {
                eprintln!("❌ WebSocket: Erreur lors de l'envoi d'un message au client");
                break;
            }
        }
        println!("🔌 WebSocket: Tâche d'envoi terminée pour planet_id={}", planet_id);
    });

    // Tâche pour recevoir les messages du client
    let state_clone = state.clone();
    let planet_id_clone = planet_id;
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    if let Ok(client_msg) = serde_json::from_str::<WsClientMessage>(&text) {
                        match client_msg {
                            WsClientMessage::Ping => {
                                state_clone.broadcast_to_planet(planet_id_clone, WsEvent::Pong);
                            }
                            WsClientMessage::Subscribe { planet_id: new_id } => {
                                // Changer de planète (pas implémenté pour l'instant)
                                // Le client devrait se reconnecter avec un nouveau planet_id
                                let _ = new_id;
                            }
                        }
                    }
                }
                Message::Close(_) => {
                    println!("🔌 WebSocket: Client a fermé la connexion pour planet_id={}", planet_id_clone);
                    break;
                }
                _ => {}
            }
        }
        println!("🔌 WebSocket: Tâche de réception terminée pour planet_id={}", planet_id_clone);
    });

    println!("🔌 WebSocket: Tâches lancées, en attente de messages pour planet_id={}", planet_id);

    // Attendre que l'une des tâches se termine
    tokio::select! {
        _ = send_task => {
            println!("🔌 WebSocket: send_task terminée en premier pour planet_id={}", planet_id);
        }
        _ = recv_task => {
            println!("🔌 WebSocket: recv_task terminée en premier pour planet_id={}", planet_id);
        }
    }

    // Cleanup
    update_task.abort();
    println!("🔌 WebSocket: Cleanup effectué pour planet_id={}", planet_id);
    
    // Supprimer la connexion si plus personne n'écoute
    if tx.receiver_count() == 0 {
        state.connections.remove(&planet_id);
    }

    // Décrémenter le compteur utilisateur
    if let Some(uid) = owner_id {
        let mut entry = state.user_connections.entry(uid).or_insert(0);
        if *entry > 0 {
            *entry -= 1;
        }
        if *entry == 0 {
            drop(entry);
            state.user_connections.remove(&uid);
        }
    }
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/// Calcule les ressources actuelles d'une planète
async fn calculate_current_resources(
    planet: &crate::entities::planet::Model,
    db: &DatabaseConnection,
    config: &crate::ServerConfigCache,
) -> WsEvent {
    // Load relational data (buildings, techs, ships, defenses)
    let planet_data = match crate::tech_tree::PlanetData::load(db, planet.id).await {
        Ok(data) => data,
        Err(_) => {
            // Fallback to empty data if load fails
            crate::tech_tree::PlanetData {
                buildings: std::collections::HashMap::new(),
                technologies: std::collections::HashMap::new(),
                ships: std::collections::HashMap::new(),
                defenses: std::collections::HashMap::new(),
            }
        }
    };

    // Récupérer les slots de ressources
    let slots = ResourceSlot::find()
        .filter(crate::entities::resource_slot::Column::PlanetId.eq(planet.id))
        .all(db)
        .await
        .unwrap_or_default();

    // Construire les options de slots
    let mut slot_1: Option<String> = None;
    let mut slot_2: Option<String> = None;
    let mut slot_3: Option<String> = None;
    let mut slot_4: Option<String> = None;

    for slot in slots {
        match slot.slot_number {
            5 => slot_1 = Some(slot.resource_type),
            6 => slot_2 = Some(slot.resource_type),
            7 => slot_3 = Some(slot.resource_type),
            8 => slot_4 = Some(slot.resource_type),
            _ => {}
        }
    }

    // Calculer le ratio énergétique (solar + fusion)
    let energy_produced = game_logic::calculate_energy_production_with_slots(
        planet_data.building_level("solar_plant"),
        planet_data.tech_level("energy_tech"),
        &slot_1, &slot_2, &slot_3, &slot_4,
        config,
    ) + game_logic::calculate_fusion_energy(planet_data.building_level("fusion_plant"), config);

    let energy_consumed = game_logic::calculate_energy_consumption(
        planet_data.building_level("metal_mine"),
        planet_data.building_level("crystal_mine"),
        planet_data.building_level("deuterium_mine"),
        config,
    );

    // Calculer le ratio énergétique pour l'affichage (en pourcentage 0-100)
    let energy_ratio_percent = if energy_consumed > 0.0 {
        (energy_produced / energy_consumed).min(1.0) * 100.0
    } else {
        100.0
    };

    // Ratio énergétique pour les calculs (en décimal 0.0-1.0)
    let energy_ratio_decimal = energy_ratio_percent / 100.0;

    // Calculer les ressources actuelles avec le config
    let plasma_tech_level = planet_data.tech_level("plasma_tech");

    let metal = game_logic::calculate_resources_with_slots(
        game_logic::ResourceType::Metal,
        planet_data.building_level("metal_mine"),
        planet.metal_amount,
        planet.last_update,
        planet_data.tech_level("energy_tech"),
        plasma_tech_level,
        energy_ratio_decimal,
        &slot_1, &slot_2, &slot_3, &slot_4,
        config,
    );

    let crystal = game_logic::calculate_resources_with_slots(
        game_logic::ResourceType::Crystal,
        planet_data.building_level("crystal_mine"),
        planet.crystal_amount,
        planet.last_update,
        planet_data.tech_level("energy_tech"),
        plasma_tech_level,
        energy_ratio_decimal,
        &slot_1, &slot_2, &slot_3, &slot_4,
        config,
    );

    let deuterium = game_logic::calculate_resources_with_slots(
        game_logic::ResourceType::Deuterium,
        planet_data.building_level("deuterium_mine"),
        planet.deuterium_amount,
        planet.last_update,
        planet_data.tech_level("energy_tech"),
        plasma_tech_level,
        energy_ratio_decimal,
        &slot_1, &slot_2, &slot_3, &slot_4,
        config,
    );

    WsEvent::ResourcesUpdate {
        metal,
        crystal,
        deuterium,
        energy_produced,
        energy_consumed,
        energy_ratio: energy_ratio_percent,
    }
}

// ============================================================================
// FONCTIONS DE BROADCAST POUR LES AUTRES MODULES
// ============================================================================

/// Notifie qu'une construction est terminée
pub fn notify_construction_complete(state: &WsState, planet_id: Uuid, building_type: &str, level: i32) {
    state.broadcast_to_planet(planet_id, WsEvent::ConstructionComplete {
        building_type: building_type.to_string(),
        level,
    });
}

/// Notifie qu'une production de vaisseaux est terminée
pub fn notify_ship_complete(state: &WsState, planet_id: Uuid, ship_type: &str, quantity: i32) {
    state.broadcast_to_planet(planet_id, WsEvent::ShipComplete {
        ship_type: ship_type.to_string(),
        quantity,
    });
}

/// Notifie qu'une recherche technologique est terminée (Expansion 5.0)
pub fn notify_research_complete(state: &WsState, planet_id: Uuid, tech_key: &str, level: i32) {
    state.broadcast_to_planet(planet_id, WsEvent::ResearchComplete {
        tech_key: tech_key.to_string(),
        level,
    });
}

/// Notifie une attaque entrante
pub fn notify_attack_incoming(
    state: &WsState,
    target_planet_id: Uuid,
    attacker_name: &str,
    source_coords: &str,
    arrival_time: &str,
    ships_count: i32,
) {
    state.broadcast_to_planet(target_planet_id, WsEvent::AttackIncoming {
        attacker_name: attacker_name.to_string(),
        source_coords: source_coords.to_string(),
        arrival_time: arrival_time.to_string(),
        ships_count,
    });
}

/// Notifie un résultat de combat
pub fn notify_combat_result(state: &WsState, planet_id: Uuid, result: &str, opponent: &str) {
    state.broadcast_to_planet(planet_id, WsEvent::CombatResult {
        result: result.to_string(),
        opponent: opponent.to_string(),
    });
}

/// Notifie un nouveau message
pub fn notify_message_received(state: &WsState, planet_id: Uuid, from: &str, preview: &str) {
    state.broadcast_to_planet(planet_id, WsEvent::MessageReceived {
        from: from.to_string(),
        preview: preview.to_string(),
    });
}

/// Notifie un transport arrivé
pub fn notify_transport_arrived(
    state: &WsState,
    planet_id: Uuid,
    from_planet: &str,
    metal: f64,
    crystal: f64,
    deuterium: f64,
) {
    state.broadcast_to_planet(planet_id, WsEvent::TransportArrived {
        from_planet: from_planet.to_string(),
        metal,
        crystal,
        deuterium,
    });
}

/// Notifie qu'une colonisation a réussi (Expansion 5.0)
pub async fn notify_colony_founded(state: &WsState, owner_id: Uuid, planet_name: &str, coords: &str) {
    state.broadcast_to_user(owner_id, WsEvent::ColonyFounded {
        planet_name: planet_name.to_string(),
        coords: coords.to_string(),
    }).await;
}

/// Notifie une alerte espionnage
pub fn notify_spy_alert(state: &WsState, planet_id: Uuid, from: &str) {
    state.broadcast_to_planet(planet_id, WsEvent::SpyAlert {
        from: from.to_string(),
    });
}

/// Notifie qu'un sabotage a été détecté (attaquant révélé)
pub async fn notify_sabotage_detected(state: &WsState, owner_id: Uuid, attacker_name: &str, planet_name: &str, effect_type: &str) {
    state.broadcast_to_user(owner_id, WsEvent::SabotageDetected {
        attacker_name: attacker_name.to_string(),
        planet_name: planet_name.to_string(),
        effect_type: effect_type.to_string(),
    }).await;
}

/// Notifie qu'un sabotage a été appliqué silencieusement (attaquant non identifié)
pub async fn notify_sabotage_applied(state: &WsState, owner_id: Uuid, planet_name: &str, effect_type: &str, expires_at: &str) {
    state.broadcast_to_user(owner_id, WsEvent::SabotageApplied {
        planet_name: planet_name.to_string(),
        effect_type: effect_type.to_string(),
        expires_at: expires_at.to_string(),
    }).await;
}

/// Notifie qu'un Casus Belli a été accordé à un utilisateur
pub async fn notify_casus_belli_granted(state: &WsState, user_id: Uuid, target_name: &str, reason: &str) {
    state.broadcast_to_user(user_id, WsEvent::CasusBelliGranted {
        target_name: target_name.to_string(),
        reason: reason.to_string(),
    }).await;
}

/// Notifie un changement de statut de planète (conquise/perdue)
pub fn notify_planet_status(state: &WsState, planet_id: Uuid, status: &str, planet_name: &str, opponent: &str) {
    state.broadcast_to_planet(planet_id, WsEvent::PlanetStatus {
        status: status.to_string(),
        planet_name: planet_name.to_string(),
        opponent: opponent.to_string(),
    });
}

/// Notifie le vendeur qu'une vente de ressources sur le marché a été réalisée
pub async fn notify_market_sale(
    state: &WsState,
    seller_user_id: Uuid,
    resource: &str,
    amount: f64,
    payment_resource: &str,
    payment_amount: f64,
    buyer_name: &str,
) {
    state.broadcast_to_user(seller_user_id, WsEvent::MarketSale {
        resource: resource.to_string(),
        amount,
        payment_resource: payment_resource.to_string(),
        payment_amount,
        buyer_name: buyer_name.to_string(),
    }).await;
}

/// Notifie le vendeur qu'une de ses planètes a été vendue
pub async fn notify_planet_sold(
    state: &WsState,
    seller_user_id: Uuid,
    planet_name: &str,
    buyer_name: &str,
    price_metal: i64,
    price_crystal: i64,
    price_deuterium: i64,
) {
    state.broadcast_to_user(seller_user_id, WsEvent::PlanetSold {
        planet_name: planet_name.to_string(),
        buyer_name: buyer_name.to_string(),
        price_metal,
        price_crystal,
        price_deuterium,
    }).await;
}
