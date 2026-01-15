# Build stage - Rust stable 1.83
FROM rust:1.83-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier Cargo.toml
COPY Cargo.toml ./

# Créer un projet dummy
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Générer Cargo.lock avec downgrade des crates problématiques
RUN cargo generate-lockfile && \
    cargo update -p base64ct --precise 1.6.0 && \
    cargo update -p home --precise 0.5.9

# Build les dépendances
RUN cargo build --release && rm -rf src target

# Copier le code source réel
COPY . .

# Build final
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/backend /app/backend

EXPOSE 8080

CMD ["./backend"]
