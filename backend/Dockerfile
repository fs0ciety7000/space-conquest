# Build stage - context must be the repo root (docker-compose sets context: .)
FROM rust:1.83-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy migration crate (relative to repo root)
COPY migration ./migration

# Build the migration binary
WORKDIR /app/migration
RUN cargo generate-lockfile && \
    cargo update -p home --precise 0.5.9 && \
    cargo build --release

# Back to root for backend
WORKDIR /app/backend

COPY backend/Cargo.toml ./

# Dummy build to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo generate-lockfile && \
    cargo update -p base64ct --precise 1.6.0 && \
    cargo update -p home --precise 0.5.9
RUN cargo build --release && rm -rf src target

# Copy full source
COPY backend/src ./src

RUN cargo build --release

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
