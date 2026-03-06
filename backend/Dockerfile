# Build stage - context must be the repo root (docker-compose sets context: .)
FROM rust:1.88-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy migration crate first (backend depends on it via path)
COPY migration ./migration

# Copy backend manifest and source
COPY backend/Cargo.toml ./backend/Cargo.toml
COPY backend/src ./backend/src

# Build backend (generates lockfile and pins problematic crates)
WORKDIR /app/backend
RUN cargo generate-lockfile && \
    cargo update -p base64ct --precise 1.6.0 && \
    cargo build --release

# Build migration binary separately
WORKDIR /app/migration
RUN cargo generate-lockfile && \
    cargo update -p home --precise 0.5.9 && \
    cargo build --release

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/backend/target/release/backend /app/backend
COPY --from=builder /app/migration/target/release/migration /app/migration
COPY run_migrations.sh /app/run_migrations.sh
RUN chmod +x /app/run_migrations.sh

EXPOSE 8080

ENTRYPOINT ["/app/run_migrations.sh"]
