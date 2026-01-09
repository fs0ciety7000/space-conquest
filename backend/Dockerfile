# Utilisation de la version Nightly pour accepter toutes les nouvelles éditions
FROM rustlang/rust:nightly-bookworm-slim

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Installation de cargo-watch
RUN cargo install cargo-watch

WORKDIR /app

# Copie et build
COPY Cargo.toml ./
# On ne copie pas le lock s'il existe pour laisser le container le générer
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build

COPY . .

EXPOSE 8080

CMD ["cargo-watch", "-x", "run"]