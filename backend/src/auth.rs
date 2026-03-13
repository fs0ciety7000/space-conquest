use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use axum::debug_handler;

use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation, errors::Error as JwtError};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set, Condition};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;
use rand::Rng;

// ── JWT constants ────────────────────────────────────────────────────────────

/// Fallback dev secret — in production JWT_SECRET env var must be set.
const DEV_JWT_SECRET: &str = "space-conquest-dev-secret-32-bytes-min-required-for-hmac-sha256";

/// Token validity: 7 days expressed in seconds.
const JWT_EXPIRY_SECS: i64 = 7 * 24 * 3600;

/// JWT claims payload.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    /// Subject — the user UUID as a string.
    pub sub: String,
    /// Issued-at timestamp (Unix seconds).
    pub iat: usize,
    /// Expiry timestamp (Unix seconds).
    pub exp: usize,
}

fn jwt_secret() -> String {
    std::env::var("JWT_SECRET").unwrap_or_else(|_| DEV_JWT_SECRET.to_string())
}

/// Encode a signed HMAC-SHA256 JWT for `user_id`.
pub fn generate_jwt(user_id: Uuid) -> Result<String, JwtError> {
    let now = Utc::now().timestamp() as usize;
    let claims = Claims {
        sub: user_id.to_string(),
        iat: now,
        exp: now + JWT_EXPIRY_SECS as usize,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret().as_bytes()),
    )
}

/// Decode and validate a JWT. Returns the Claims on success.
pub fn validate_jwt(token: &str) -> Result<Claims, JwtError> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret().as_bytes()),
        &Validation::default(),
    )?;
    Ok(token_data.claims)
}

/// Extract a user UUID from a Bearer token in the Authorization header.
/// Accepts both the new signed JWT format and the legacy `jwt-{uuid}` format
/// to avoid breaking existing sessions during the migration window.
pub fn extract_user_id_from_bearer(headers: &axum::http::HeaderMap) -> Option<Uuid> {
    let header = headers.get("Authorization")?.to_str().ok()?;
    let token = header.strip_prefix("Bearer ")?;
    extract_user_id_from_token(token)
}

/// Extract user UUID from a raw token string.
/// Tries real JWT first, then falls back to legacy `jwt-{uuid}` format.
pub fn extract_user_id_from_token(token: &str) -> Option<Uuid> {
    // Try real JWT first
    if let Ok(claims) = validate_jwt(token) {
        return Uuid::parse_str(&claims.sub).ok();
    }
    // Legacy fallback: "jwt-{uuid}"
    token.strip_prefix("jwt-")
        .and_then(|id| Uuid::parse_str(id).ok())
}


use crate::{
    entities::{planet, user, planet_building, building_type, password_reset_token,
        prelude::{Planet, User, BuildingType, PasswordResetToken}},
    missions,
    rate_limit::RateLimiter,
    AppState,
};

/// Valide un nom d'utilisateur : 3–20 caractères, lettres/chiffres/underscore/tiret.
fn validate_username(username: &str) -> Result<(), &'static str> {
    let len = username.len();
    if len < 3 { return Err("Le nom d'utilisateur doit faire au moins 3 caractères"); }
    if len > 20 { return Err("Le nom d'utilisateur ne peut pas dépasser 20 caractères"); }
    if !username.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
        return Err("Le nom d'utilisateur ne peut contenir que des lettres, chiffres, _ et -");
    }
    Ok(())
}

/// Valide un mot de passe : 8 caractères minimum.
fn validate_password(password: &str) -> Result<(), &'static str> {
    if password.len() < 8 {
        return Err("Le mot de passe doit faire au moins 8 caractères");
    }
    Ok(())
}

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
    let uuid = Uuid::parse_str(&user_id).unwrap_or_else(|_| Uuid::nil());
    generate_jwt(uuid).unwrap_or_else(|_| format!("jwt-{}", user_id))
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
    let api_key = std::env::var("RESEND_API_KEY")
        .map_err(|_| "RESEND_API_KEY non configuré".to_string())?;
    let from = std::env::var("SMTP_FROM")
        .unwrap_or_else(|_| "Space Conquest <noreply@fs0ciety.org>".to_string());
    let frontend_url = std::env::var("FRONTEND_URL")
        .unwrap_or_else(|_| "http://localhost:5173".to_string());

    let reset_link = format!("{}?reset_token={}", frontend_url, token);
    let body = format!(
        "Commandant,\n\nUne demande de réinitialisation de votre mot de passe a été effectuée.\n\nCliquez sur ce lien pour définir un nouveau mot de passe (valable 1 heure) :\n{}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\n— Space Conquest",
        reset_link
    );

    let client = reqwest::Client::new();
    let res = client
        .post("https://api.resend.com/emails")
        .bearer_auth(&api_key)
        .json(&serde_json::json!({
            "from": from,
            "to": [to_email],
            "subject": "Réinitialisation de votre mot de passe - Space Conquest",
            "text": body
        }))
        .send()
        .await
        .map_err(|e| format!("Erreur réseau Resend : {e}"))?;

    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        return Err(format!("Resend erreur {status} : {text}"));
    }

    Ok(())
}



#[debug_handler]
pub async fn register_handler(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<RegisterPayload>,
) -> impl IntoResponse {
    // Rate limiting : 5 tentatives / 60s par IP
    let ip = RateLimiter::extract_ip(&headers);
    if !state.rate_limit_auth.check(&ip) {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            Json(json!({"error": "Trop de tentatives. Réessayez dans quelques minutes."}))
        );
    }

    // Validation des champs
    if payload.email.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "L'email est requis"})));
    }
    if let Err(e) = validate_username(&payload.username) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": e})));
    }
    if let Err(e) = validate_password(&payload.password) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": e})));
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
        display_name: Set(None),
        syndicate_credits: Set(0.0),
        total_score: Set(0),
        economy_score: Set(0),
        military_score: Set(0),
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
            "email": payload.email,
            "role": "user"
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
    headers: axum::http::HeaderMap,
    Json(payload): Json<LoginPayload>,
) -> impl IntoResponse {
    // Rate limiting : 5 tentatives / 60s par IP (anti brute-force)
    let ip = RateLimiter::extract_ip(&headers);
    if !state.rate_limit_auth.check(&ip) {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            Json(json!({"error": "Trop de tentatives. Réessayez dans quelques minutes."}))
        );
    }

    let user = match User::find()
        .filter(
            Condition::any()
                .add(user::Column::Username.eq(&payload.identifier))
                .add(user::Column::Email.eq(&payload.identifier))
        )
        .one(&state.db)
        .await
        .unwrap_or(None)
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
        .unwrap_or(None);
    
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
            "email": user.email,
            "role": user.role
        }))
    )
}

