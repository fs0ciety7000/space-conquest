// ─────────────────────────────────────────────────────────────────────────────
// handlers/mod.rs — Centralise les sous-modules de handlers HTTP
//
// TODO (antigravity): ce module est le résultat du découpage de main.rs (~8200 lignes)
// en modules autonomes. Chaque sous-module expose un `router()` renvoyant
// un `axum::Router<AppState>`. Merger dans main.rs via `.merge(handlers::X::router(...))`.
// ─────────────────────────────────────────────────────────────────────────────

pub mod galaxy;
pub mod ranking;
pub mod reports;
pub mod profile;
pub mod shipyard;
pub mod fleet;
pub mod planets;
