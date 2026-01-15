# Build stage - Utiliser nightly sans date spécifique
FROM rustlang/rust:nightly-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier seulement Cargo.toml (sans le lock)
COPY Cargo.toml ./

# Créer un projet dummy et générer un nouveau Cargo.lock
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src target

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

# Copier le binaire depuis le builder
COPY --from=builder /app/target/release/backend /app/backend

EXPOSE 8080

CMD ["./backend"]
