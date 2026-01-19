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
use crate::game_logic;
use sea_orm::{EntityTrait, DatabaseConnection, QueryFilter, ColumnTrait};

// ============================================================================
// TYPES ET STRUCTURES
// ============================================================================

/// État partagé pour les connexions WebSocket
#[derive(Clone)]
pub struct WsState {
    /// Map des connexions actives: planet_id -> broadcast sender
    pub connections: Arc<DashMap<Uuid, broadcast::Sender<WsEvent>>>,
    /// Connexion à la base de données
    pub db: DatabaseConnection,
}

impl WsState {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            connections: Arc::new(DashMap::new()),
            db,
        }
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

    /// Alerte espionnage
    #[serde(rename = "spy_alert")]
    SpyAlert {
        from: String,
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

    // TODO: Valider le token JWT si fourni
    // Pour l'instant, on accepte toutes les connexions avec un planet_id valide

    ws.on_upgrade(move |socket| handle_socket(socket, planet_id, state))
}

/// Gère une connexion WebSocket individuelle
async fn handle_socket(socket: WebSocket, planet_id: Uuid, state: WsState) {
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
        return;
    }

    // Envoyer les ressources initiales
    if let Ok(Some(planet)) = Planet::find_by_id(planet_id).one(&state.db).await {
        let resources = calculate_current_resources(&planet, &state.db).await;
        let msg = serde_json::to_string(&resources).unwrap();
        let _ = sender.send(Message::Text(msg)).await;
    }

    // Spawner la tâche de mise à jour périodique des ressources
    let db_clone = state.db.clone();
    let tx_clone = tx.clone();
    let update_task = tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(5));
        loop {
            interval.tick().await;
            
            if let Ok(Some(planet)) = Planet::find_by_id(planet_id).one(&db_clone).await {
                let resources = calculate_current_resources(&planet, &db_clone).await;
                let _ = tx_clone.send(resources);
            }
        }
    });

    // Tâche pour envoyer les messages du broadcast au client
    let send_task = tokio::spawn(async move {
        while let Ok(event) = rx.recv().await {
            let msg = serde_json::to_string(&event).unwrap();
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // Tâche pour recevoir les messages du client
    let state_clone = state.clone();
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    if let Ok(client_msg) = serde_json::from_str::<WsClientMessage>(&text) {
                        match client_msg {
                            WsClientMessage::Ping => {
                                state_clone.broadcast_to_planet(planet_id, WsEvent::Pong);
                            }
                            WsClientMessage::Subscribe { planet_id: new_id } => {
                                // Changer de planète (pas implémenté pour l'instant)
                                // Le client devrait se reconnecter avec un nouveau planet_id
                                let _ = new_id;
                            }
                        }
                    }
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
    });

    // Attendre que l'une des tâches se termine
    tokio::select! {
        _ = send_task => {}
        _ = recv_task => {}
    }

    // Cleanup
    update_task.abort();
    
    // Supprimer la connexion si plus personne n'écoute
    if tx.receiver_count() == 0 {
        state.connections.remove(&planet_id);
    }
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/// Calcule les ressources actuelles d'une planète
async fn calculate_current_resources(
    planet: &crate::entities::planet::Model,
    db: &DatabaseConnection,
) -> WsEvent {
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

    // Calculer le ratio énergétique
    let energy_produced = game_logic::calculate_energy_production_with_slots(
        planet.solar_plant_level,
        planet.energy_tech_level,
        &slot_1, &slot_2, &slot_3, &slot_4,
    );
    
    let energy_consumed = game_logic::calculate_energy_consumption(
        planet.metal_mine_level,
        planet.crystal_mine_level,
        planet.deuterium_mine_level,
    );

    let energy_ratio = if energy_consumed > 0.0 {
        (energy_produced / energy_consumed).min(1.0)
    } else {
        1.0
    };

    // Calculer les ressources actuelles avec le speed_factor par défaut
    // TODO: Récupérer le speed_factor depuis server_config
    let speed_factor = game_logic::SPEED_FACTOR;

    let metal = game_logic::calculate_resources_with_slots(
        game_logic::ResourceType::Metal,
        planet.metal_mine_level,
        planet.metal_amount,
        planet.last_update,
        planet.energy_tech_level,
        energy_ratio,
        &slot_1, &slot_2, &slot_3, &slot_4,
        speed_factor,
    );

    let crystal = game_logic::calculate_resources_with_slots(
        game_logic::ResourceType::Crystal,
        planet.crystal_mine_level,
        planet.crystal_amount,
        planet.last_update,
        planet.energy_tech_level,
        energy_ratio,
        &slot_1, &slot_2, &slot_3, &slot_4,
        speed_factor,
    );

    let deuterium = game_logic::calculate_resources_with_slots(
        game_logic::ResourceType::Deuterium,
        planet.deuterium_mine_level,
        planet.deuterium_amount,
        planet.last_update,
        planet.energy_tech_level,
        energy_ratio,
        &slot_1, &slot_2, &slot_3, &slot_4,
        speed_factor,
    );

    WsEvent::ResourcesUpdate {
        metal,
        crystal,
        deuterium,
        energy_produced,
        energy_consumed,
        energy_ratio,
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

/// Notifie une alerte espionnage
pub fn notify_spy_alert(state: &WsState, planet_id: Uuid, from: &str) {
    state.broadcast_to_planet(planet_id, WsEvent::SpyAlert {
        from: from.to_string(),
    });
}

/// Notifie un changement de statut de planète (conquise/perdue)
pub fn notify_planet_status(state: &WsState, planet_id: Uuid, status: &str, planet_name: &str, opponent: &str) {
    state.broadcast_to_planet(planet_id, WsEvent::PlanetStatus {
        status: status.to_string(),
        planet_name: planet_name.to_string(),
        opponent: opponent.to_string(),
    });
}
