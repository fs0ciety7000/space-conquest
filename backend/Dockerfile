# Build stage
FROM rustlang/rust:nightly-bookworm-slim AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier les manifests
COPY Cargo.toml Cargo.lock ./

# Créer un projet dummy pour cacher les dépendances
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Copier le code source réel
COPY . .

# Build en release avec le vrai code
RUN touch src/main.rs && \
    cargo build --release

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
