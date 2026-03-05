# Stage 1: Build Vite
FROM node:20-alpine AS builder

# VITE_API_URL is baked in at build time
ARG VITE_API_URL=https://backend.fs0ciety.org
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app
COPY package*.json yarn.lock* ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve avec Caddy
FROM caddy:alpine
COPY --from=builder /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

ENV PORT=80
EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
