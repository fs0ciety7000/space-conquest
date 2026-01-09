use jsonwebtoken::{encode, decode, Header, EncodingKey, DecodingKey, Validation};
use serde::{Serialize, Deserialize};
use chrono::{Utc, Duration};

const JWT_SECRET: &[u8] = b"votre_cle_secrete_ultra_secure_123";

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // User ID
    pub exp: usize,
}

pub fn create_jwt(user_id: &str) -> String {
    let expiration = Utc::now() + Duration::hours(24);
    let claims = Claims {
        sub: user_id.to_owned(),
        exp: expiration.timestamp() as usize,
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(JWT_SECRET)).unwrap()
}

pub fn validate_jwt(token: &str) -> Option<String> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(JWT_SECRET),
        &Validation::default(),
    )
    .map(|data| data.claims.sub)
    .ok()
}