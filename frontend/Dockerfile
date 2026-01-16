# Stage 1: Build Vite
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json yarn.lock* ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve avec Caddy
FROM caddy:alpine
COPY --from=builder /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

# Expose le port Railway
EXPOSE $PORT
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
