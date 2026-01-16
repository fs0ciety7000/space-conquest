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

# Railway injecte PORT au runtime
ENV PORT=8080
EXPOSE 8080

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
