FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2-alpine
COPY --from=builder /app/dist /srv
COPY <<EOF /etc/caddy/Caddyfile
:3000 {
    root * /srv
    try_files {path} /index.html
    file_server
    encode gzip
}
EOF
