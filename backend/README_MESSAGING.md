# Système de Messagerie avec Conversations

## Anciennes routes (à supprimer)

Remplacer dans `main.rs` :

```rust
// Messagerie (ANCIEN)
.route("/messages", get(get_messages_handler))
.route("/messages/send", post(send_message_handler))
.route("/messages/:id", delete(delete_message_handler))
.route("/messages/:id/read", post(mark_message_read_handler))
```

## Nouvelles routes (à ajouter)

```rust
// Messagerie (NOUVEAU - Système de conversations)
.route("/conversations", get(messaging::get_conversations_handler))
.route("/conversations/:id/messages", get(messaging::get_thread_messages_handler))
.route("/conversations/send", post(messaging::send_message_v2_handler))
.route("/conversations/:id/mark-read", post(messaging::mark_conversation_read_handler))
.route("/conversations/:id", delete(messaging::delete_conversation_handler))
```

## Import requis

Ajouter en haut de `main.rs` après les autres modules :

```rust
mod messaging;
```

Ou utiliser directement depuis lib.rs (recommandé) :

```rust
use backend::messaging;
```

## Changements dans main.rs

### 1. Imports

Mettre à jour la ligne des imports :

```rust
use entities::{
    prelude::{Planet, User, CombatLog, FleetMission, TransportLog, Message, ConstructionQueue, Conversation},
    planet, user, combat_log, fleet_mission, transport_log, message, construction_queue, conversation
};
```

### 2. Supprimer les anciens handlers

Supprimer ces fonctions du main.rs (lignes ~230-330) :
- `get_messages_handler`
- `send_message_handler`
- `mark_message_read_handler`
- `delete_message_handler`

## API Endpoints

### GET /conversations?user_id={uuid}

Récupère la liste des conversations pour un utilisateur.

**Réponse** :
```json
[
  {
    "id": "uuid",
    "other_user_id": "uuid",
    "other_user_name": "string",
    "last_message_preview": "string",
    "last_message_at": "timestamp",
    "unread_count": 0
  }
]
```

### GET /conversations/:id/messages?user_id={uuid}

Récupère tous les messages d'une conversation.

**Réponse** :
```json
[
  {
    "id": "uuid",
    "sender_id": "uuid",
    "sender_name": "string",
    "content": "string",
    "is_read": false,
    "created_at": "timestamp",
    "is_mine": false
  }
]
```

### POST /conversations/send?user_id={uuid}

Envoie un message (crée automatiquement une conversation si nécessaire).

**Body** :
```json
{
  "recipient_name": "string",
  "subject": "string (optionnel)",
  "content": "string"
}
```

**Réponse** :
```json
{
  "conversation_id": "uuid"
}
```

### POST /conversations/:id/mark-read?user_id={uuid}

Marque tous les messages d'une conversation comme lus.

### DELETE /conversations/:id

Supprime une conversation complète (et tous ses messages).

## Frontend

Remplacer le composant `MessagesView.tsx` complet avec la nouvelle version fournie.

## Migration

La migration `m20260118_000001_create_conversation_system` sera exécutée automatiquement au démarrage du backend.

**Note** : Les anciens messages sans `conversation_id` resteront accessibles mais ne seront pas groupés en conversations. Pour migrer les anciens messages, exécutez le script SQL suivant :

```sql
-- TODO: Script de migration des anciens messages vers le système de conversations
```
