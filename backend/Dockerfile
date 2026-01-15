# Build stage - Rust stable 1.83
FROM rust:1.83-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier TOUT (backend + migration)
COPY backend/Cargo.toml ./backend/
COPY migration ./migration/

# Créer un projet dummy pour le backend
RUN mkdir -p backend/src && echo "fn main() {}" > backend/src/main.rs

# Générer Cargo.lock avec downgrade des crates problématiques
WORKDIR /app/backend
RUN cargo generate-lockfile && \
    cargo update -p base64ct --precise 1.6.0 && \
    cargo update -p home --precise 0.5.9

# Build les dépendances backend
RUN cargo build --release && rm -rf src target

# Copier le code source réel du backend
COPY backend/src ./src

# Build final du backend
RUN cargo build --release

# Build le binaire de migration
WORKDIR /app/migration
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier le binaire backend
COPY --from=builder /app/backend/target/release/backend /app/backend

# Copier le binaire de migration
COPY --from=builder /app/migration/target/release/migration /app/migration

# Copier le script de migration
COPY backend/run_migrations.sh /app/run_migrations.sh
RUN chmod +x /app/run_migrations.sh

EXPOSE 8080

# Exécuter les migrations puis démarrer le backend
CMD /app/migration && /app/backend
