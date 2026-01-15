# Build stage - Rust stable 1.83
FROM rust:1.83-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier le dossier migration
COPY migration ./migration

# Build le binaire de migration AVEC downgrade
WORKDIR /app/migration
RUN cargo generate-lockfile && \
    cargo update -p base64ct --precise 1.6.0 && \
    cargo update -p home --precise 0.5.9 && \
    cargo build --release

# Revenir à la racine pour le backend
WORKDIR /app/backend

# Copier le Cargo.toml du backend
COPY Cargo.toml ./

# Créer un projet dummy
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Générer Cargo.lock avec downgrade des crates problématiques
RUN cargo generate-lockfile && \
    cargo update -p base64ct --precise 1.6.0 && \
    cargo update -p home --precise 0.5.9

# Build les dépendances du backend
RUN cargo build --release && rm -rf src target

# Copier tout le code source du backend
COPY src ./src

# Build final du backend
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier les DEUX binaires
COPY --from=builder /app/backend/target/release/backend /app/backend
COPY --from=builder /app/migration/target/release/migration /app/migration

# Copier le script d'entrée
COPY run_migrations.sh /app/run_migrations.sh
RUN chmod +x /app/run_migrations.sh

EXPOSE 8080

CMD ["/app/run_migrations.sh"]
