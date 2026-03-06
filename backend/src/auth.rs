use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use axum::debug_handler;

use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set, Condition};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;
use rand::Rng;

use lettre::{
    AsyncSmtpTransport, AsyncTransport, Message as EmailMessage,
    Tokio1Executor,
    message::header::ContentType,
    transport::smtp::authentication::Credentials,
};

use crate::{
    entities::{planet, user, planet_building, building_type, password_reset_token,
        prelude::{Planet, User, BuildingType, PasswordResetToken}},
    missions,
    AppState
};

#[derive(Deserialize)]
pub struct RegisterPayload {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct LoginPayload {
    pub identifier: String,
    pub password: String,
}

fn generate_random_planet_name() -> String {
    let prefixes = ["Orion", "Vega", "Terra", "Centauri", "Kepler", "Sirius", "Andromeda", "Vulcan", "Kronos"];
    let suffixes = ["Prime", "Major", "Alpha", "Beta", "Gamma", "X", "IX", "V", "Nova"];
    let mut rng = rand::thread_rng();
    let prefix = prefixes[rng.gen_range(0..prefixes.len())];
    if rng.gen_bool(0.8) {
        let suffix = suffixes[rng.gen_range(0..suffixes.len())];
        format!("{} {}", prefix, suffix)
    } else {
        let num = rng.gen_range(1..999);
        format!("{}-{}", prefix, num)
    }
}

async fn find_free_slot(db: &sea_orm::DatabaseConnection, galaxy: i32) -> (i32, i32) {
    for _ in 0..100 {
        let (system, position) = {
            let mut rng = rand::thread_rng();
            (
                rng.gen_range(1..=100),
                rng.gen_range(1..=15),
            )
        };

        let occupied = Planet::find()
            .filter(planet::Column::Galaxy.eq(galaxy))
            .filter(planet::Column::System.eq(system))
            .filter(planet::Column::Position.eq(position))
            .one(db)
            .await
            .unwrap_or(None);

        if occupied.is_none() {
            return (system, position);
        }
    }

    // fallback SAFE
    {
        let mut rng = rand::thread_rng();
        (
            rng.gen_range(1..=100),
            rng.gen_range(1..=15),
        )
    }
}


fn create_jwt(user_id: String) -> String {
    format!("jwt-{}", user_id)
}

fn generate_reset_token() -> String {
    use rand::distributions::Alphanumeric;
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(48)
        .map(char::from)
        .collect()
}

async fn send_reset_email(to_email: &str, token: &str) -> Result<(), String> {
    let smtp_host = std::env::var("SMTP_HOST").unwrap_or_default();
    let smtp_user = std::env::var("SMTP_USER").unwrap_or_default();
    let smtp_pass = std::env::var("SMTP_PASSWORD").unwrap_or_default();
    let smtp_from = std::env::var("SMTP_FROM")
        .unwrap_or_else(|_| "noreply@space-conquest.local".to_string());
    let frontend_url = std::env::var("FRONTEND_URL")
        .unwrap_or_else(|_| "http://localhost:5173".to_string());
    let smtp_port: u16 = std::env::var("SMTP_PORT")
        .ok().and_then(|p| p.parse().ok()).unwrap_or(587);

    if smtp_host.is_empty() || smtp_user.is_empty() {
        return Err("SMTP non configuré".to_string());
    }

    let reset_link = format!("{}?reset_token={}", frontend_url, token);
    let body = format!(
        "Commandant,\n\nUne demande de réinitialisation de votre mot de passe a été effectuée.\n\nCliquez sur ce lien pour définir un nouveau mot de passe (valable 1 heure) :\n{}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\n— Space Conquest",
        reset_link
    );

    let email = EmailMessage::builder()
        .from(smtp_from.parse().map_err(|e| format!("From invalide : {e}"))?)
        .to(to_email.parse().map_err(|e| format!("To invalide : {e}"))?)
        .subject("Réinitialisation de votre mot de passe - Space Conquest")
        .header(ContentType::TEXT_PLAIN)
        .body(body)
        .map_err(|e| format!("Erreur construction email : {e}"))?;

    let creds = Credentials::new(smtp_user, smtp_pass);
    let mailer = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&smtp_host)
        .map_err(|e| format!("Erreur SMTP relay : {e}"))?
        .port(smtp_port)
        .credentials(creds)
        .build();

    mailer.send(email).await.map_err(|e| format!("Erreur envoi : {e}"))?;
    Ok(())
}


fn extract_user_id_from_token(token: &str) -> Option<Uuid> {
    // Token format: "jwt-{uuid}"
    token.strip_prefix("jwt-")
        .and_then(|id| Uuid::parse_str(id).ok())
} 

#[debug_handler]
pub async fn register_handler(
    State(state): State<AppState>,
    Json(payload): Json<RegisterPayload>,
) -> impl IntoResponse {
    // Validation
    if payload.username.is_empty() || payload.password.is_empty() || payload.email.is_empty() {
        return (
            StatusCode::BAD_REQUEST, 
            Json(json!({"error": "Tous les champs sont requis"}))
        );
    }

    // Vérifier si l'utilisateur existe déjà
    let existing_user = User::find()
        .filter(user::Column::Username.eq(&payload.username))
        .one(&state.db)
        .await
        .unwrap_or(None);

    if existing_user.is_some() {
        return (
            StatusCode::CONFLICT, 
            Json(json!({"error": "Nom d'utilisateur déjà pris"}))
        );
    }

    // Hasher le mot de passe
    let hashed = match hash(&payload.password, DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Erreur de hashage"}))
        ),
    };
    
    let user_id = Uuid::new_v4();
    let now = Utc::now().naive_utc();

    // Créer l'utilisateur avec created_at = maintenant et protection de 3 jours
    let new_user = user::ActiveModel {
        id: Set(user_id),
        username: Set(payload.username.clone()),
        password: Set(hashed),
        email: Set(payload.email.clone()),
        created_at: Set(now),
        role: Set("user".to_string()),
        protection_until: Set(Some(now + chrono::Duration::days(3))),
        total_points: Set(0),
        avatar_url: Set(None),
        bio: Set(None),
        last_login: Set(Some(now)),
    };

    if new_user.insert(&state.db).await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR, 
            Json(json!({"error": "Erreur lors de la création du compte"}))
        );
    }

    // Générer coordonnées aléatoires
    let galaxy = 1;

let (system, position) = {
    let mut rng = rand::thread_rng();
    (
        rng.gen_range(1..=100),
        rng.gen_range(1..=15),
    )
};

    // Vérifier disponibilité
    let occupied = Planet::find()
        .filter(planet::Column::Galaxy.eq(galaxy))
        .filter(planet::Column::System.eq(system))
        .filter(planet::Column::Position.eq(position))
        .one(&state.db)
        .await
        .unwrap_or(None);

    let (final_system, final_position) = if occupied.is_some() {
        find_free_slot(&state.db, galaxy).await
    } else {
        (system, position)
    };

    // Créer la planète (première planète = planète mère)
    let planet_id = Uuid::new_v4();
    let now = Utc::now().naive_utc();
    let homeworld_biome = crate::game_logic::random_biome();
    let new_planet = planet::ActiveModel {
        id: Set(planet_id),
        owner_id: Set(user_id),
        name: Set(generate_random_planet_name()),
        password: Set("".to_string()),
        galaxy: Set(galaxy),
        system: Set(final_system),
        position: Set(final_position),
        metal_amount: Set(2000.0),
        crystal_amount: Set(1000.0),
        deuterium_amount: Set(500.0),
        last_update: Set(now),
        created_at: Set(now),
        is_homeworld: Set(true),
        biome: Set(Some(homeworld_biome.to_string())),
        ..Default::default()
    };

    if new_planet.insert(&state.db).await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Erreur lors de la création de la planète"}))
        );
    }

    // Initialiser les bâtiments de départ dans planet_buildings
    let initial_buildings = vec![
        ("metal", 1i32),
        ("crystal", 1),
        ("deuterium", 1),
        ("solar_plant", 3),
        ("shipyard", 1),
    ];
    for (building_key, level) in initial_buildings {
        if let Ok(Some(bt)) = BuildingType::find()
            .filter(building_type::Column::BuildingKey.eq(building_key))
            .one(&state.db)
            .await
        {
            let _ = planet_building::ActiveModel {
                planet_id: Set(planet_id),
                building_type_id: Set(bt.id),
                level: Set(level),
                upgrading_to_level: Set(None),
                upgrade_end_time: Set(None),
                updated_at: Set(Some(now)),
            }
            .insert(&state.db)
            .await;
        }
    }

    // Créer les 8 slots de ressources pour la nouvelle planète
    use crate::entities::resource_slot;

    let slots_init = vec![
        (1, "metal", 1, true),
        (2, "crystal", 1, true),
        (3, "deuterium", 1, true),
        (4, "energy", 1, true),
        (5, "metal", 0, false),
        (6, "metal", 0, false),
        (7, "metal", 0, false),
        (8, "metal", 0, false),
    ];

    for (slot_num, res_type, level, is_locked) in slots_init {
        let slot = resource_slot::ActiveModel {
            planet_id: Set(planet_id),
            slot_number: Set(slot_num),
            resource_type: Set(res_type.to_string()),
            level: Set(level),
            is_locked: Set(is_locked),
            is_active: Set(is_locked), // Les slots locked sont actifs, les autres non
            ..Default::default()
        };
        let _ = slot.insert(&state.db).await;
    }

    // Générer JWT
    let token = create_jwt(user_id.to_string());

    (
        StatusCode::CREATED, 
        Json(json!({
            "token": token,
            "user_id": user_id,
            "username": payload.username,
            "planet_id": planet_id,
            "email": payload.email
        }))
    )
}

#[derive(Deserialize)]
pub struct ForgotPasswordPayload {
    pub email: String,
}

#[derive(Deserialize)]
pub struct ResetPasswordPayload {
    pub token: String,
    pub new_password: String,
}

pub async fn forgot_password_handler(
    State(state): State<AppState>,
    Json(payload): Json<ForgotPasswordPayload>,
) -> impl IntoResponse {
    let email = payload.email.trim().to_lowercase();
    if email.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Email requis"})));
    }

    // On cherche l'utilisateur mais on retourne toujours OK pour ne pas divulguer les emails
    let user = User::find()
        .filter(user::Column::Email.eq(&email))
        .one(&state.db)
        .await
        .unwrap_or(None);

    if let Some(user) = user {
        let token = generate_reset_token();
        let expires_at = Utc::now().naive_utc() + chrono::Duration::hours(1);

        let record = password_reset_token::ActiveModel {
            id: Set(Uuid::new_v4()),
            user_id: Set(user.id),
            token: Set(token.clone()),
            expires_at: Set(expires_at),
            used: Set(false),
            created_at: Set(Utc::now().naive_utc()),
        };

        if record.insert(&state.db).await.is_err() {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur serveur"})));
        }

        if let Err(e) = send_reset_email(&user.email, &token).await {
            eprintln!("[forgot_password] Erreur envoi email : {}", e);
            // On ne retourne pas d'erreur au client pour éviter la fuite d'info
        }
    }

    (StatusCode::OK, Json(json!({"message": "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé."})))
}

pub async fn reset_password_handler(
    State(state): State<AppState>,
    Json(payload): Json<ResetPasswordPayload>,
) -> impl IntoResponse {
    if payload.new_password.len() < 6 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Le mot de passe doit contenir au moins 6 caractères"})));
    }

    let record = PasswordResetToken::find()
        .filter(password_reset_token::Column::Token.eq(&payload.token))
        .one(&state.db)
        .await
        .unwrap_or(None);

    let record = match record {
        Some(r) => r,
        None => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Lien invalide ou expiré"}))),
    };

    if record.used {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Ce lien a déjà été utilisé"})));
    }

    if Utc::now().naive_utc() > record.expires_at {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Lien expiré. Veuillez effectuer une nouvelle demande."})));
    }

    let hashed = match hash(&payload.new_password, DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur serveur"}))),
    };

    // Mettre à jour le mot de passe
    let user = match User::find_by_id(record.user_id).one(&state.db).await.unwrap_or(None) {
        Some(u) => u,
        None => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Utilisateur introuvable"}))),
    };

    let mut user_active: user::ActiveModel = user.into();
    user_active.password = Set(hashed);
    if user_active.update(&state.db).await.is_err() {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Erreur mise à jour"})));
    }

    // Marquer le token comme utilisé
    let mut token_active: password_reset_token::ActiveModel = record.into();
    token_active.used = Set(true);
    let _ = token_active.update(&state.db).await;

    (StatusCode::OK, Json(json!({"message": "Mot de passe mis à jour avec succès. Vous pouvez maintenant vous connecter."})))
}

pub async fn login_handler(
    State(state): State<AppState>,
    Json(payload): Json<LoginPayload>,
) -> impl IntoResponse {
    let user = match User::find()
        .filter(
            Condition::any()
                .add(user::Column::Username.eq(&payload.identifier))
                .add(user::Column::Email.eq(&payload.identifier))
        )
        .one(&state.db)
        .await
        .unwrap() 
    {
        Some(u) => u,
        None => return (
            StatusCode::UNAUTHORIZED, 
            Json(json!({"error": "Identifiants incorrects"}))
        ),
    };

    if !verify(&payload.password, &user.password).unwrap_or(false) {
        return (
            StatusCode::UNAUTHORIZED, 
            Json(json!({"error": "Identifiants incorrects"}))
        );
    }

    let planet = Planet::find()
        .filter(planet::Column::OwnerId.eq(user.id))
        .one(&state.db)
        .await
        .unwrap();
    
    let planet_id = match planet {
        Some(p) => p.id,
        None => return (
            StatusCode::INTERNAL_SERVER_ERROR, 
            Json(json!({"error": "Aucune planète trouvée"}))
        ),
    };

    let token = create_jwt(user.id.to_string());

    // ═══════════════════════════════════════════════════════════════════════════
    // MISE À JOUR DU LOGIN STREAK + LAST LOGIN
    // ═══════════════════════════════════════════════════════════════════════════
    missions::update_login_streak(&state, user.id).await;
    let mut user_active: user::ActiveModel = user.clone().into();
    user_active.last_login = Set(Some(Utc::now().naive_utc()));
    let _ = user_active.update(&state.db).await;

    (
        StatusCode::OK, 
        Json(json!({
            "token": token,
            "planet_id": planet_id,
            "user_id": user.id, 
            "username": user.username,
            "email": user.email
        }))
    )
}

