/// Rate limiting module — per-IP, sliding window, Cloudflare-aware.
///
/// Aucune dépendance externe : utilise DashMap (déjà dans le projet) + std::time.
/// Usage : appeler `RateLimiter::check(headers)` en haut des handlers sensibles.
///
/// L'IP est extraite dans l'ordre de priorité :
///   1. CF-Connecting-IP  (Cloudflare Zero Trust)
///   2. X-Forwarded-For   (proxy classique)
///   3. "unknown"         (fallback — bloqué globalement en cas d'abus)

use std::sync::Arc;
use std::time::{Duration, Instant};
use axum::http::HeaderMap;
use dashmap::DashMap;

#[derive(Clone, Debug)]
pub struct RateLimiter {
    requests: Arc<DashMap<String, Vec<Instant>>>,
    max_requests: usize,
    window: Duration,
}

impl RateLimiter {
    /// Crée un rate limiter : `max_requests` requêtes max par `window_secs` secondes.
    pub fn new(max_requests: usize, window_secs: u64) -> Self {
        Self {
            requests: Arc::new(DashMap::new()),
            max_requests,
            window: Duration::from_secs(window_secs),
        }
    }

    /// Extrait l'IP du client depuis les headers HTTP (Cloudflare-aware).
    pub fn extract_ip(headers: &HeaderMap) -> String {
        if let Some(v) = headers.get("CF-Connecting-IP").and_then(|v| v.to_str().ok()) {
            return v.trim().to_string();
        }
        if let Some(v) = headers.get("X-Forwarded-For").and_then(|v| v.to_str().ok()) {
            return v.split(',').next().unwrap_or("unknown").trim().to_string();
        }
        "unknown".to_string()
    }

    /// Vérifie si la requête est autorisée pour cette clé (IP).
    /// Retourne `true` si autorisée, `false` si limite dépassée.
    pub fn check(&self, key: &str) -> bool {
        let now = Instant::now();
        let mut entry = self.requests.entry(key.to_string()).or_default();
        // Sliding window : supprimer les timestamps hors fenêtre
        entry.retain(|&t| now.duration_since(t) < self.window);
        if entry.len() >= self.max_requests {
            return false;
        }
        entry.push(now);
        true
    }

    /// Nettoyage périodique des entrées expirées (appelable depuis un background task).
    pub fn cleanup(&self) {
        let now = Instant::now();
        self.requests.retain(|_, timestamps| {
            timestamps.retain(|&t| now.duration_since(t) < self.window);
            !timestamps.is_empty()
        });
    }
}
