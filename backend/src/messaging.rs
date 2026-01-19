use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use sea_orm::{
    ActiveModelTrait, EntityTrait, Set, 
    QueryFilter, QueryOrder, ColumnTrait, Condition,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;
use chrono::Utc;

use crate::entities::{
    prelude::{User, Message, Conversation},
    user, message, conversation
};
use crate::websocket::{WsEvent, WsState};
use crate::AppState;

#[derive(Serialize)]
pub struct ConversationDisplay {
    id: Uuid,
    other_user_id: Uuid,
    other_user_name: String,
    last_message_preview: String,
    last_message_at: chrono::NaiveDateTime,
    unread_count: i32,
    is_archived: bool, // ✅ AJOUT
}

#[derive(Serialize)]
pub struct ThreadMessage {
    id: Uuid,
    sender_id: Uuid,
    sender_name: String,
    content: String,
    is_read: bool,
    created_at: chrono::NaiveDateTime,
    is_mine: bool,
}

#[derive(Deserialize)]
pub struct SendMessageV2Payload {
    recipient_name: String,
    subject: Option<String>,
    content: String,
}

// ✅ NOUVEAU : Payload pour archivage
#[derive(Deserialize)]
pub struct ArchiveConversationPayload {
    archived: bool,
}

// HANDLER : Liste des conversations (exclut archivées par défaut)
pub async fn get_conversations_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid user"}))).into_response(),
    };

    // ✅ Paramètre optionnel pour afficher les conversations archivées
    let show_archived = params.get("show_archived")
        .and_then(|v| v.parse::<bool>().ok())
        .unwrap_or(false);

    let mut convs_query = Conversation::find()
        .filter(
            Condition::any()
                .add(conversation::Column::User1Id.eq(user_id))
                .add(conversation::Column::User2Id.eq(user_id))
        );

    // ✅ Filtrer les conversations archivées
    if !show_archived {
        convs_query = convs_query.filter(
            Condition::any()
                .add(
                    Condition::all()
                        .add(conversation::Column::User1Id.eq(user_id))
                        .add(conversation::Column::User1Archived.eq(false))
                )
                .add(
                    Condition::all()
                        .add(conversation::Column::User2Id.eq(user_id))
                        .add(conversation::Column::User2Archived.eq(false))
                )
        );
    }

    let convs = convs_query
        .order_by_desc(conversation::Column::LastMessageAt)
        .all(&state.db)
        .await
        .unwrap_or_default();

    let mut result = Vec::new();

    for conv in convs {
        let (other_id, unread, is_archived) = if conv.user1_id == user_id {
            (conv.user2_id, conv.user1_unread_count, conv.user1_archived)
        } else {
            (conv.user1_id, conv.user2_unread_count, conv.user2_archived)
        };

        let other_user = User::find_by_id(other_id).one(&state.db).await.ok().flatten();
        let other_name = other_user.map(|u| u.username).unwrap_or("Inconnu".into());

        let last_msg = Message::find()
            .filter(message::Column::ConversationId.eq(conv.id))
            .order_by_desc(message::Column::CreatedAt)
            .one(&state.db)
            .await
            .ok()
            .flatten();

        let preview = last_msg.map(|m| {
            if m.content.len() > 50 {
                format!("{}...", &m.content[..50])
            } else {
                m.content
            }
        }).unwrap_or("Aucun message".into());

        result.push(ConversationDisplay {
            id: conv.id,
            other_user_id: other_id,
            other_user_name: other_name,
            last_message_preview: preview,
            last_message_at: conv.last_message_at,
            unread_count: unread,
            is_archived, // ✅ AJOUT
        });
    }

    Json(result).into_response()
}

// HANDLER : Messages d'une conversation (thread)
pub async fn get_thread_messages_handler(
    Path(conv_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = Uuid::parse_str(&user_id_str).unwrap_or_default();

    let messages = Message::find()
        .filter(message::Column::ConversationId.eq(conv_id))
        .order_by_asc(message::Column::CreatedAt)
        .all(&state.db)
        .await
        .unwrap_or_default();

    let sender_ids: Vec<Uuid> = messages.iter().map(|m| m.sender_id).collect();
    let users = User::find()
        .filter(user::Column::Id.is_in(sender_ids))
        .all(&state.db)
        .await
        .unwrap_or_default();

    let user_map: HashMap<Uuid, String> = users.into_iter().map(|u| (u.id, u.username)).collect();

    let thread: Vec<ThreadMessage> = messages.into_iter().map(|m| {
        ThreadMessage {
            id: m.id,
            sender_id: m.sender_id,
            sender_name: user_map.get(&m.sender_id).cloned().unwrap_or("Inconnu".into()),
            content: m.content,
            is_read: m.is_read,
            created_at: m.created_at,
            is_mine: m.sender_id == user_id,
        }
    }).collect();

    Json(thread).into_response()
}

// HANDLER : Envoi de message (crée conversation si nécessaire + ✅ désarchive automatiquement)
pub async fn send_message_v2_handler(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<SendMessageV2Payload>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let sender_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid sender"}))).into_response(),
    };

    let recipient = User::find()
        .filter(user::Column::Username.eq(&payload.recipient_name))
        .one(&state.db)
        .await
        .unwrap_or(None);

    let recipient_id = match recipient {
        Some(u) => u.id,
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "User not found"}))).into_response(),
    };

    // Chercher conversation existante (normalisée : user1 < user2)
    let (u1, u2) = if sender_id < recipient_id {
        (sender_id, recipient_id)
    } else {
        (recipient_id, sender_id)
    };

    let existing_conv = Conversation::find()
        .filter(conversation::Column::User1Id.eq(u1))
        .filter(conversation::Column::User2Id.eq(u2))
        .one(&state.db)
        .await
        .ok()
        .flatten();

    let conv_id = if let Some(conv) = existing_conv {
        let mut active: conversation::ActiveModel = conv.clone().into();
        active.last_message_at = Set(Utc::now().naive_utc());
        
        // ✅ Désarchiver automatiquement pour les deux utilisateurs lors d'un nouveau message
        active.user1_archived = Set(false);
        active.user2_archived = Set(false);
        
        if sender_id == conv.user1_id {
            active.user2_unread_count = Set(conv.user2_unread_count + 1);
        } else {
            active.user1_unread_count = Set(conv.user1_unread_count + 1);
        }
        
        active.update(&state.db).await.unwrap();
        conv.id
    } else {
        let new_conv = conversation::ActiveModel {
            id: Set(Uuid::new_v4()),
            user1_id: Set(u1),
            user2_id: Set(u2),
            last_message_at: Set(Utc::now().naive_utc()),
            user1_unread_count: Set(if sender_id == u1 { 0 } else { 1 }),
            user2_unread_count: Set(if sender_id == u2 { 0 } else { 1 }),
            user1_archived: Set(false), // ✅ AJOUT
            user2_archived: Set(false), // ✅ AJOUT
        };
        let inserted = new_conv.insert(&state.db).await.unwrap();
        inserted.id
    };

    let new_message = message::ActiveModel {
        id: Set(Uuid::new_v4()),
        conversation_id: Set(Some(conv_id)),
        sender_id: Set(sender_id),
        receiver_id: Set(recipient_id),
        subject: Set(payload.subject.unwrap_or_default()),
        content: Set(payload.content.clone()),
        created_at: Set(Utc::now().naive_utc()),
        is_read: Set(false),
    };

    new_message.insert(&state.db).await.unwrap();

    // ═══════════════════════════════════════════════════════════════════════════
    // NOTIFICATION WEBSOCKET - Notifier le destinataire du nouveau message
    // ═══════════════════════════════════════════════════════════════════════════
    if let Some(ref ws) = state.ws {
        // Récupérer le nom de l'expéditeur
        let sender_name = User::find_by_id(sender_id)
            .one(&state.db)
            .await
            .ok()
            .flatten()
            .map(|u| u.username)
            .unwrap_or_else(|| "Inconnu".to_string());

        // Créer un aperçu du message (max 50 caractères)
        let preview = if payload.content.len() > 50 {
            format!("{}...", &payload.content[..50])
        } else {
            payload.content
        };

        // Notifier le destinataire sur toutes ses planètes
        let event = WsEvent::MessageReceived {
            from: sender_name,
            preview,
        };
        ws.broadcast_to_user(recipient_id, event).await;
    }

    (StatusCode::OK, Json(json!({"conversation_id": conv_id}))).into_response()
}

// HANDLER : Marquer une conversation comme lue
pub async fn mark_conversation_read_handler(
    Path(conv_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = Uuid::parse_str(&user_id_str).unwrap_or_default();

    let conv = Conversation::find_by_id(conv_id).one(&state.db).await.ok().flatten();
    
    if let Some(c) = conv {
        let mut active: conversation::ActiveModel = c.clone().into();
        
        if c.user1_id == user_id {
            active.user1_unread_count = Set(0);
        } else if c.user2_id == user_id {
            active.user2_unread_count = Set(0);
        }
        
        active.update(&state.db).await.unwrap();

        // Marquer tous les messages comme lus
        let messages = Message::find()
            .filter(message::Column::ConversationId.eq(conv_id))
            .filter(message::Column::ReceiverId.eq(user_id))
            .all(&state.db)
            .await
            .unwrap_or_default();

        for msg in messages {
            let mut msg_active: message::ActiveModel = msg.into();
            msg_active.is_read = Set(true);
            let _ = msg_active.update(&state.db).await;
        }
    }

    StatusCode::OK.into_response()
}

// ✅ NOUVEAU HANDLER : Archiver/Désarchiver une conversation
pub async fn toggle_archive_conversation_handler(
    Path(conv_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    Json(payload): Json<ArchiveConversationPayload>,
) -> impl IntoResponse {
    let user_id_str = params.get("user_id").unwrap_or(&String::new()).to_string();
    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid user"}))).into_response(),
    };

    let conv = Conversation::find_by_id(conv_id).one(&state.db).await.ok().flatten();
    
    if let Some(c) = conv {
        let mut active: conversation::ActiveModel = c.clone().into();
        
        // Archiver/désarchiver seulement pour l'utilisateur concerné
        if c.user1_id == user_id {
            active.user1_archived = Set(payload.archived);
        } else if c.user2_id == user_id {
            active.user2_archived = Set(payload.archived);
        } else {
            return (StatusCode::FORBIDDEN, Json(json!({"error": "Not your conversation"}))).into_response();
        }
        
        active.update(&state.db).await.unwrap();
        
        (StatusCode::OK, Json(json!({"archived": payload.archived}))).into_response()
    } else {
        (StatusCode::NOT_FOUND, Json(json!({"error": "Conversation not found"}))).into_response()
    }
}

// HANDLER : Supprimer conversation complète
pub async fn delete_conversation_handler(
    Path(conv_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    // Supprimer tous les messages de la conversation
    let _ = Message::delete_many()
        .filter(message::Column::ConversationId.eq(conv_id))
        .exec(&state.db)
        .await;
    
    // Supprimer la conversation
    let _ = Conversation::delete_by_id(conv_id).exec(&state.db).await;
    
    StatusCode::OK.into_response()
}
